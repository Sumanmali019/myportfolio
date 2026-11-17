/**
 * Boot. Reads the serialised content, picks a layout, mounts scenes and runs one rAF loop:
 *
 *   scroll → P → timeline frame → { transitions, palette, clocks, scene modules,
 *                                   idle loops, bubbles, links, dots }
 *
 * If anything fails (bad data, a scene SVG 404s) the Skip-the-day content is shown as a
 * plain page instead of an empty stage.
 */
import { BubbleLayer } from '../bubbles/bubble';
import { clamp } from '../lib/math';
import { setOpacity } from '../lib/svg';
import {
  applyCounters,
  downloadsAt,
  formatCount,
  formatMonth,
  monthAt,
  monthIndex,
  odometerStart,
} from './clock';
import { currentLayout, watchLayout, type Layout } from './layout';
import { SceneLoader, type Mounted } from './loader';
import { applyIdle, startLoop, type Loop } from './loop';
import {
  applyTransition,
  HANDOVER,
  planTransition,
  resetParts,
  type TransitionPlan,
} from './morph';
import { onMotionChange, prefersReducedMotion } from './motion';
import { PaletteBlender } from './palette';
import { Scroller } from './scroll';
import { buildTimeline, progressAt, resolve, type Frame } from './timeline';
import type { EngineData, SceneModule, SceneState } from './types';

const sceneModules = import.meta.glob<{ default: SceneModule }>('../scenes/*.ts', { eager: true });

function moduleFor(name: string): SceneModule | undefined {
  return sceneModules[`../scenes/${name}.ts`]?.default;
}

const $ = <T extends Element>(sel: string): T | null => document.querySelector<T>(sel);

/* ------------------------------------------------------------------ Skip the day */

interface Skip {
  showStatic(): void;
  onToggle(cb: (open: boolean) => void): void;
}

function focusables(root: Element): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);
}

function setupSkip(): Skip {
  const dialog = $<HTMLDialogElement>('#skip');
  const openBtn = $<HTMLButtonElement>('#skip-open');
  const closeBtn = $<HTMLButtonElement>('#skip-close');
  const listeners: Array<(open: boolean) => void> = [];
  let opener: HTMLElement | null = null;

  if (dialog && openBtn) {
    openBtn.addEventListener('click', () => {
      opener = document.activeElement as HTMLElement | null;
      dialog.showModal();
      closeBtn?.focus();
      listeners.forEach((l) => l(true));
    });
    closeBtn?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      listeners.forEach((l) => l(false));
      (opener ?? openBtn).focus();
    });
    // Click on the backdrop closes.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog && document.documentElement.dataset.stage !== 'failed')
        dialog.close();
    });
    // Explicit focus trap (showModal already makes the page inert; this also wraps Tab).
    dialog.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables(dialog);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  return {
    showStatic() {
      document.documentElement.dataset.stage = 'failed';
      if (dialog && !dialog.open) dialog.show();
    },
    onToggle(cb) {
      listeners.push(cb);
    },
  };
}

/* ------------------------------------------------------------------ Engine */

function boot(): void {
  const skip = setupSkip();
  let loop: Loop | null = null;
  let scroller: Scroller | null = null;
  const fail = (err: unknown) => {
    console.error('[day] falling back to Skip-the-day:', err);
    loop?.stop();
    scroller?.destroy();
    skip.showStatic();
  };

  const dataEl = $<HTMLScriptElement>('#engine-data');
  const stage = $<HTMLElement>('#stage');
  const track = $<HTMLElement>('#track');
  const bubbleRoot = $<HTMLElement>('#bubbles');
  const fx = $<SVGSVGElement>('#fx');
  if (!dataEl || !stage || !track || !bubbleRoot || !fx)
    return fail(new Error('page is missing engine mount points'));

  let data: EngineData;
  try {
    data = JSON.parse(dataEl.textContent ?? '') as EngineData;
  } catch (err) {
    return fail(err);
  }

  const scenes = data.scenes;
  const modules = scenes.map((s) => moduleFor(s.module));
  const missing = scenes.filter((_, i) => !modules[i]).map((s) => s.module);
  if (missing.length) console.warn('[day] no scene module for', missing.join(', '));

  let reduced = prefersReducedMotion();
  let layout: Layout = currentLayout();
  const root = document.documentElement;
  root.classList.toggle('reduced-motion', reduced);

  const tl = buildTimeline(
    scenes.map((s) => ({ id: s.id, weight: s.weight, beats: data.beats[s.id]?.length ?? 0 })),
  );
  const months = scenes.map((s) => monthIndex(s.date));
  const added = data.downloads;
  const odoFrom = odometerStart(added);
  track.style.setProperty('--screens', String(tl.total + 1));

  const palette = new PaletteBlender(scenes.map((s) => s.palette));
  scroller = new Scroller(reduced);
  const bubbles = new BubbleLayer(bubbleRoot, fx);
  const hudDate = $<HTMLElement>('#hud-date');
  const hudCity = $<HTMLElement>('#hud-city');
  const hudOdo = $<HTMLElement>('#hud-odo');
  const hudOdoWrap = $<HTMLElement>('#hud-odometer');
  const setHud = (el: HTMLElement | null, text: string) => {
    if (el && el.textContent !== text) el.textContent = text;
  };

  const loader = new SceneLoader({
    stage,
    scenes,
    layout,
    prepare: (svg, i) => {
      try {
        modules[i]?.prepare(svg, { data, layout: loader.layout, reduced });
      } catch (err) {
        console.error(`[day] prepare failed for ${scenes[i]?.id}`, err);
      }
    },
    onError: fail,
    // A scene that finishes loading after a jump must be drawn even if scroll is still.
    onMount: () => {
      lastU = -1;
    },
  });

  /* ---------- links and dots ---------- */

  const linkEls = Array.from(document.querySelectorAll<HTMLElement>('.link-layer [data-link]'));
  const dots = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dot]'));

  const goto = (index: number, frac = 0, immediate = reduced) => {
    scroller?.toScroll(
      index === 0 && frac === 0 ? 0 : progressAt(tl, index, frac) + 0.0005,
      immediate,
    );
  };

  dots.forEach((dot) => {
    dot.addEventListener('click', () => goto(Number(dot.dataset.dot), 0));
  });

  for (const a of linkEls) {
    if (a.dataset.action === 'restart') {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        goto(0, 0, reduced);
      });
    }
    // Keyboard users can tab to any scene's links: focusing one brings its scene on stage.
    a.addEventListener('focus', () => {
      const idx = Number(a.dataset.sceneIndex);
      if (Number.isFinite(idx) && idx !== lastFrame?.index) goto(idx, 0.12, true);
    });
  }

  let linkSig = '';
  const placeLinks = (frame: Frame, cur: Mounted | undefined) => {
    const showing = !!cur && !frame.transitioning;
    // Re-measure as the hold advances too: some link targets grow in mid-hold.
    const sig = `${frame.index}|${showing}|${resizeGen}|${layout}|${Math.floor(frame.hold * 24)}`;
    if (sig === linkSig) return;
    linkSig = sig;
    for (const a of linkEls) {
      const mine = Number(a.dataset.sceneIndex) === frame.index;
      const target =
        mine && showing ? cur!.svg.querySelector(`[data-link="${a.dataset.link}"]`) : null;
      const r = target?.getBoundingClientRect();
      if (r && r.width > 0) {
        a.classList.remove('is-parked');
        a.style.left = `${Math.round(r.left)}px`;
        a.style.top = `${Math.round(r.top)}px`;
        a.style.width = `${Math.round(r.width)}px`;
        a.style.height = `${Math.round(r.height)}px`;
      } else {
        a.classList.add('is-parked');
      }
    }
  };

  const route = $<HTMLElement>('#route');
  let routeP = '';
  let dotIndex = -1;
  const markDots = (index: number) => {
    if (index === dotIndex) return;
    dotIndex = index;
    dots.forEach((d) => {
      if (Number(d.dataset.dot) === index) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
  };

  /* ---------- per-frame render ---------- */

  // Plans hold measured boxes, so they are rebuilt after a resize.
  let plans = new WeakMap<Mounted, { from: Mounted | null; plan: TransitionPlan }>();
  const settled = new WeakSet<Mounted>();
  let lastFrame: Frame | null = null;
  let resizeGen = 0;

  const render = (frame: Frame, idle: number) => {
    loader.ensure(frame.index);
    const cur = loader.get(frame.index);
    const prev = frame.prev >= 0 ? loader.get(frame.prev) : undefined;

    loader.each((m) => {
      const on = m === cur || m === prev;
      if (m.host.classList.contains('is-on') !== on) m.host.classList.toggle('is-on', on);
      // Never two scenes at once: before the handover only the outgoing one is drawn, after
      // it only the incoming one (reduced motion crossfades instead, so both stay).
      const hidden =
        frame.transitioning && !reduced
          ? (m === prev && frame.enter >= HANDOVER) || (m === cur && frame.enter < HANDOVER)
          : false;
      const vis = hidden ? 'hidden' : '';
      if (m.host.style.visibility !== vis) m.host.style.visibility = vis;
    });

    // Build / take apart.
    if (frame.transitioning && cur) {
      settled.delete(cur);
      if (prev) settled.delete(prev);
      if (reduced) {
        resetParts(cur.parts);
        if (prev) resetParts(prev.parts);
        setOpacity(cur.host, frame.enter);
      } else {
        setOpacity(cur.host, 1);
        let entry = plans.get(cur);
        if (!entry || entry.from !== (prev ?? null)) {
          entry = {
            from: prev ?? null,
            plan: planTransition(prev?.parts ?? [], cur.parts, frame.index),
          };
          plans.set(cur, entry);
        }
        applyTransition(entry.plan, frame.enter);
      }
    } else if (cur && !settled.has(cur)) {
      resetParts(cur.parts);
      setOpacity(cur.host, 1);
      settled.add(cur);
    }

    // Palette.
    const curPal = scenes[frame.index]!.palette;
    if (frame.transitioning) palette.apply(scenes[frame.prev]!.palette, curPal, frame.enter);
    else palette.apply(curPal);

    // Counters: calendar, city, downloads odometer.
    const month = monthAt(tl, months, frame.u);
    const city = scenes[frame.index]!.city;
    const downloads = downloadsAt(added, frame);
    setHud(hudDate, formatMonth(month));
    setHud(hudCity, city);
    setHud(hudOdo, formatCount(downloads));
    if (hudOdoWrap) {
      const show = frame.index >= odoFrom;
      if (hudOdoWrap.hidden === show) hudOdoWrap.hidden = !show;
    }

    const base = { idle, month, downloads, reduced, layout: loader.layout, data };
    if (prev) {
      applyCounters(prev.svg, month, scenes[prev.index]!.city, downloads);
      applyIdle(prev.svg, idle, reduced);
      const st: SceneState = {
        ...base,
        svg: prev.svg,
        enter: 1,
        hold: 1,
        exit: frame.enter,
        active: false,
        beat: -1,
        beatT: 0,
      };
      modules[prev.index]?.update(st);
    }
    if (cur) {
      applyCounters(cur.svg, month, city, downloads);
      applyIdle(cur.svg, idle, reduced);
      const st: SceneState = {
        ...base,
        svg: cur.svg,
        enter: frame.enter,
        hold: frame.hold,
        exit: 0,
        active: true,
        beat: frame.beat,
        beatT: frame.beatT,
      };
      modules[cur.index]?.update(st);
    }

    // Bubbles.
    const beat = cur && frame.beat >= 0 ? (data.beats[cur.scene.id]?.[frame.beat] ?? null) : null;
    bubbles.update(
      `${frame.index}:${frame.beat}:${resizeGen}`,
      beat,
      frame.beatT,
      cur?.svg ?? null,
      reduced,
    );

    placeLinks(frame, cur);
    markDots(frame.index);
    // Route line fill: how far along the journey we are.
    const rp = frame.p.toFixed(3);
    if (route && rp !== routeP) {
      routeP = rp;
      route.style.setProperty('--route', rp);
    }

    if (root.dataset.scene !== frame.id) root.dataset.scene = frame.id;
    const phase = frame.transitioning ? 'transition' : 'hold';
    if (root.dataset.phase !== phase) root.dataset.phase = phase;
    lastFrame = frame;
  };

  /* ---------- loop, resize, motion, dialog ---------- */

  let lastU = -1;
  let lastIdle = -1;
  loop = startLoop(({ now, idle }) => {
    scroller?.raf(now);
    const frame = resolve(tl, scroller?.progress() ?? 0);
    // With reduced motion nothing moves on its own: skip frames where scroll didn't change.
    if (frame.u === lastU && (reduced ? true : idle === lastIdle) && lastFrame) return;
    lastU = frame.u;
    lastIdle = idle;
    try {
      render(frame, idle);
    } catch (err) {
      fail(err);
    }
  });
  loop.setIdle(!reduced);

  watchLayout((next, changed) => {
    resizeGen++;
    if (changed) {
      layout = next;
      loader.setLayout(next);
    }
    bubbles.relayout();
    plans = new WeakMap();
    scroller?.resize();
    lastU = -1;
  });

  onMotionChange((next) => {
    reduced = next;
    root.classList.toggle('reduced-motion', reduced);
    scroller?.setReduced(reduced);
    loop?.setIdle(!reduced);
    lastU = -1;
  });

  skip.onToggle((open) => {
    if (open) scroller?.stop();
    else scroller?.start();
  });

  // Small, stable hook for e2e tests and debugging.
  (window as unknown as { dayEngine: unknown }).dayEngine = {
    goto: (index: number, frac = 0.5) => goto(clamp(index, 0, scenes.length - 1), frac, true),
    /** Jump to `t` (0…1) through the transition into scene `index`. */
    transition: (index: number, t = 0.5) => {
      const seg = tl.segments[clamp(index, 1, scenes.length - 1)]!;
      const u = seg.enterStart + clamp(t) * (seg.enterEnd - seg.enterStart);
      scroller?.toScroll(u / tl.total, true);
    },
    scenes: scenes.map((s) => s.id),
    frame: () => lastFrame,
  };
  root.dataset.engine = 'ready';
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
