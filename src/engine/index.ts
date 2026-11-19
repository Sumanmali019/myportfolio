/**
 * Boot. Reads the serialised content, picks a layout, mounts scenes and runs one rAF loop:
 *
 *   scroll → P → timeline frame → { transitions, palette, calendar, scene modules,
 *                                   idle loops, bubbles, links }
 *
 * If anything fails (bad data, a scene SVG 404s) the Skip-the-day content (the static page,
 * also what search engines and no-JS visitors get) is shown instead of an empty stage.
 */
import { BubbleLayer } from '../bubbles/bubble';
import { clamp } from '../lib/math';
import { setOpacity } from '../lib/svg';
import { calendar } from './calendar';
import { pace } from './pace';
import { player } from './player';
import { shelves, SPAN as SHELF_SPAN } from './shelf';
import { CUES, sound } from './sound';
import { clickCard } from './mouse';

/** How long a shelf waits for an answer before the journey carries on by itself. */
const ASK_SECONDS = 15;
import { applyCounters, downloadsAt, monthIndex } from './clock';
import { currentLayout, watchLayout, type Layout } from './layout';
import { SceneLoader, type Mounted } from './loader';
import { applyIdle, applyScrolled, startLoop, type Loop } from './loop';
import {
  applyTransition,
  HANDOVER,
  paletteAt,
  planBetween,
  restObjects,
  type Transition,
} from '../transitions';
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

/**
 * The CV (Skip-the-day content): the fallback page, and what "Skip the animation · see my CV"
 * opens on the first and last screens, as a modal over the journey (Esc or Close returns).
 */
function setupSkip(): Skip {
  const dialog = $<HTMLDialogElement>('#skip');
  const openers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-cv-open]'));
  let opener: HTMLElement | null = null;
  const close = $<HTMLButtonElement>('#skip-close');
  const listeners: Array<(open: boolean) => void> = [];
  if (dialog && openers.length) {
    for (const open of openers)
      open.addEventListener('click', () => {
        opener = open;
        dialog.showModal();
        close?.focus();
        listeners.forEach((l) => l(true));
      });
    close?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      listeners.forEach((l) => l(false));
      if (document.documentElement.dataset.stage !== 'failed') opener?.focus();
    });
    // A click on the backdrop closes it.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog && document.documentElement.dataset.stage !== 'failed')
        dialog.close();
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
  track.style.setProperty('--screens', String(tl.total + 1));

  const palette = new PaletteBlender(scenes.map((s) => s.palette));
  scroller = new Scroller();
  const bubbles = new BubbleLayer(bubbleRoot, fx);
  const cal = calendar($<HTMLElement>('#hud-cal'));
  const clicks = clickCard($<HTMLElement>('#click-card'));

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

  /* ---------- links ---------- */

  const linkEls = Array.from(document.querySelectorAll<HTMLElement>('.link-layer [data-link]'));
  // "See it live" shelves: the chapter's projects fly onto a shelf of links (engine/shelf.ts).
  const shelf = shelves(document);
  // Each shelf is a stop: once its projects are on it, the journey waits and asks whether you
  // want to open one; it moves on only when you say no (its "continue" button).
  const gates = Array.from(document.querySelectorAll<HTMLElement>('[data-live-scene]')).map(
    (el) => {
      const index = Number(el.dataset.liveScene);
      const frac = Math.min(0.99, Number(el.dataset.liveFrom) + SHELF_SPAN + 0.01);
      return {
        el,
        index,
        u: progressAt(tl, index, frac) * tl.total,
        passed: false,
        /** When it started asking (ms), for the countdown; 0 while not asking. */
        since: 0,
        /** Opened one of the projects: the countdown stops, it waits for you. */
        chose: false,
        count: el.querySelector<HTMLElement>('[data-live-count]'),
        shown: -1,
      };
    },
  );
  const passGate = (g: (typeof gates)[number]) => {
    g.passed = true;
    g.since = 0;
    g.el.classList.remove('is-asking', 'is-chosen');
    lastU = -1;
    // On to the next chapter: auto-scroll just carries on; scrolling yourself, it glides there.
    if (travel.mode() !== 'auto' && g.index + 1 < scenes.length) goto(g.index + 1, 0, false);
  };
  for (const g of gates) {
    g.el.querySelector('[data-live-continue]')?.addEventListener('click', () => passGate(g));
    // Opening a project is a yes: the countdown stops and it waits until you continue.
    for (const a of g.el.querySelectorAll('[data-live-key]'))
      a.addEventListener('click', () => {
        g.chose = true;
        g.el.classList.add('is-chosen');
      });
  }

  const goto = (index: number, frac = 0, immediate = reduced) => {
    scroller?.toScroll(
      index === 0 && frac === 0 ? 0 : progressAt(tl, index, frac) + 0.0005,
      immediate,
    );
  };

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

  // The picture frame on screen (scenes are fitted, not cropped): the player bar sits on it.
  let frameSig = '';
  const fitFrame = (cur: Mounted | undefined) => {
    const sig = `${resizeGen}|${layout}|${cur ? 1 : 0}`;
    if (!cur || sig === frameSig) return;
    const r = cur.svg.getBoundingClientRect();
    if (r.width <= 0) return;
    frameSig = sig;
    const s = root.style;
    s.setProperty('--frame-l', `${Math.round(r.left)}px`);
    s.setProperty('--frame-r', `${Math.round(window.innerWidth - r.right)}px`);
    s.setProperty('--frame-b', `${Math.round(window.innerHeight - r.bottom)}px`);
  };

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

  /* ---------- per-frame render ---------- */

  // Plans hold measured boxes, so they are rebuilt after a resize.
  let plans = new WeakMap<Mounted, { from: Mounted | null; plan: Transition }>();
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
      // Through a transition both scenes are on stage, the incoming one on top.
      if (m.host.style.visibility) m.host.style.visibility = '';
      const z = m === cur && frame.transitioning ? '2' : '';
      if (m.host.style.zIndex !== z) m.host.style.zIndex = z;
    });

    // Build / take apart.
    if (frame.transitioning && cur) {
      settled.delete(cur);
      if (prev) settled.delete(prev);
      if (reduced) {
        // No piece-by-piece build: a plain 300 ms crossfade as the midpoint is crossed.
        restObjects(cur.parts);
        if (prev) restObjects(prev.parts);
        if (prev) setOpacity(prev.host, 1);
        const show = frame.enter >= HANDOVER ? 1 : 0;
        if (cur.host.style.opacity !== (show ? '' : '0')) {
          setOpacity(cur.host, show);
          cur.host.animate([{ opacity: 1 - show }, { opacity: show }], { duration: 300 });
        }
      } else {
        setOpacity(cur.host, 1);
        if (prev) setOpacity(prev.host, 1);
        let entry = plans.get(cur);
        if (!entry || entry.from !== (prev ?? null)) {
          entry = {
            from: prev ?? null,
            plan: planBetween(
              prev?.parts ?? [],
              cur.parts,
              frame.index,
              scenes[frame.prev]?.id ?? '',
              scenes[frame.index]!.id,
            ),
          };
          plans.set(cur, entry);
        }
        applyTransition(entry.plan, frame.enter);
      }
    } else if (cur && !settled.has(cur)) {
      restObjects(cur.parts);
      setOpacity(cur.host, 1);
      settled.add(cur);
    }

    // Palette.
    const curPal = scenes[frame.index]!.palette;
    if (frame.transitioning)
      palette.apply(scenes[frame.prev]!.palette, curPal, paletteAt(frame.enter));
    else palette.apply(curPal);

    // The calendar (top right) shows the date of the screen on stage: its page turns only when
    // the screen changes (at the handover, mid-transition), not while scrolling inside one.
    const showing =
      frame.transitioning && frame.enter < HANDOVER && frame.prev >= 0 ? frame.prev : frame.index;
    const month = months[showing] ?? months[0]!;
    const city = scenes[frame.index]!.city;
    const downloads = downloadsAt(added, frame);
    cal.set(month, reduced);

    const base = { idle, month, downloads, reduced, layout: loader.layout, data };
    if (prev) {
      applyCounters(prev.svg, month, scenes[prev.index]!.city, downloads);
      applyIdle(prev.svg, idle, reduced);
      applyScrolled(prev.svg, frame.u, 1, frame.p);
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
      applyScrolled(cur.svg, frame.u, frame.hold, frame.p);
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
    fitFrame(cur);
    shelf.update(frame.index, frame.hold, frame.transitioning, cur?.svg ?? null, resizeGen);

    if (root.dataset.scene !== frame.id) root.dataset.scene = frame.id;
    const phase = frame.transitioning ? 'transition' : 'hold';
    if (root.dataset.phase !== phase) root.dataset.phase = phase;
    lastFrame = frame;
  };

  /* ---------- loop, resize, motion ---------- */

  let lastU = -1;
  let lastIdle = -1;
  /* ---------- pace: the view chases the scroll; auto or manual travel ---------- */

  const travel = pace();
  let viewU = 0;
  /* ---------- sound ---------- */

  const sfx = sound();
  let cueScene = -1;
  let cueHold = 0;
  let lastView = 0;
  let movedAt = 0;
  const muteBtn = $<HTMLButtonElement>('[data-player-mute]');
  const showMute = () => {
    const m = sfx.muted();
    muteBtn?.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
    muteBtn?.setAttribute('aria-pressed', String(m));
    $('[data-player]')?.classList.toggle('is-muted', m);
  };
  showMute();
  muteBtn?.addEventListener('click', () => {
    sfx.setMuted(!sfx.muted());
    showMute();
  });
  // A click for every button or link you press.
  document.addEventListener(
    'click',
    (e) => {
      if ((e.target as Element | null)?.closest?.('button, a')) sfx.play('click');
    },
    true,
  );

  const video = player({
    root: document.documentElement,
    travel,
    tl,
    titles: scenes.map((s) => s.section),
    seek: (u) => scroller?.toScroll(u / tl.total, true),
    gotoChapter: (i) => {
      const u = progressAt(tl, i, 0) * tl.total + 0.001;
      scroller?.toScroll(u / tl.total, true);
      travel.syncAuto(u);
    },
  });
  // It starts playing, like a video (not under test automation, nor with reduced motion).
  if (!reduced && !navigator.webdriver) window.setTimeout(() => travel.setMode('auto', viewU), 700);
  // The CV over the journey: everything holds still while it is open.
  skip.onToggle((open) => {
    if (open) {
      travel.setMode('manual');
      scroller?.stop();
    } else scroller?.start();
  });
  // Any input of your own while it plays hands the journey back to you.
  const takeOver = (e: Event) => {
    if (travel.mode() !== 'auto') return;
    if (
      e instanceof KeyboardEvent &&
      !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)
    )
      return;
    travel.setMode('manual');
  };
  window.addEventListener('wheel', takeOver, { passive: true });
  window.addEventListener('touchstart', takeOver, { passive: true });
  window.addEventListener('keydown', takeOver);

  loop = startLoop(({ now, dt, idle }) => {
    const total = tl.total;
    // A jump (seek, link) while playing: playback carries on from there.
    const snap = scroller?.takeJump() ?? true;
    if (snap && scroller && travel.mode() === 'auto') travel.syncAuto(scroller.progress() * total);
    const auto = travel.autoTarget(dt, total);
    if (auto !== null && scroller) scroller.scrollToPx((auto / total) * scroller.max);
    scroller?.raf();
    let target = (scroller?.progress() ?? 0) * total;
    // Waiting at a shelf: no further forward until you answer (scroll and auto-scroll hold).
    const gate = snap
      ? undefined
      : gates.find((g) => !g.passed && viewU <= g.u + 1e-3 && target > g.u);
    if (gate && scroller) {
      target = gate.u;
      scroller.scrollToPx((gate.u / total) * scroller.max);
      travel.holdAt(gate.u);
    }
    viewU = travel.step(target, dt, { snap, reduced });
    for (const g of gates) {
      const asking = !g.passed && Math.abs(viewU - g.u) < 0.02;
      if (g.el.classList.contains('is-asking') !== asking)
        g.el.classList.toggle('is-asking', asking);
      // No answer in ASK_SECONDS: it carries on by itself (a bar and a count show the time).
      if (!asking || g.chose) {
        g.since = 0;
        continue;
      }
      if (!g.since) g.since = now;
      const left = Math.max(0, ASK_SECONDS - (now - g.since) / 1000);
      g.el.style.setProperty('--ask-left', (left / ASK_SECONDS).toFixed(4));
      const secs = Math.ceil(left);
      if (g.count && secs !== g.shown) {
        g.shown = secs;
        g.count.textContent = `${secs}s`;
      }
      if (left <= 0) passGate(g);
    }
    const frame = resolve(tl, viewU / total);
    video?.update(
      viewU,
      frame.transitioning && frame.enter < HANDOVER && frame.prev >= 0 ? frame.prev : frame.index,
    );
    // Sound: the on-screen moments passed going forward, and typing while his hands are on the
    // keyboard and the journey moves.
    if (!snap && !frame.transitioning && frame.index === cueScene)
      for (const [at, name] of CUES[frame.id] ?? [])
        if (cueHold < at && frame.hold >= at) sfx.play(name);
    cueScene = frame.transitioning ? -1 : frame.index;
    cueHold = frame.hold;
    if (Math.abs(viewU - lastView) > 1e-4) movedAt = now;
    lastView = viewU;
    const keys = frame.transitioning
      ? null
      : loader.get(frame.index)?.svg.querySelector('[data-typing]');
    const handsOnKeys = !!keys && Number(keys.getAttribute('opacity') ?? 0) > 0.5;
    sfx.loop('typing', handsOnKeys && now - movedAt < 300);
    // The mouse close-up as those clicks happen (not while his hands are on the keyboard: the
    // clicks still sound, the typing hands are already on screen).
    const seg = tl.segments[frame.index]!;
    clicks.update(
      frame.transitioning || handsOnKeys ? null : frame.id,
      frame.hold,
      seg.holdEnd - seg.holdStart,
    );
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
    lastU = -1;
  });

  onMotionChange((next) => {
    reduced = next;
    root.classList.toggle('reduced-motion', reduced);
    loop?.setIdle(!reduced);
    lastU = -1;
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
