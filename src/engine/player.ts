/**
 * The journey as a video (components/Player.astro). "Playing" is the pace's auto mode
 * (engine/pace.ts): the timeline advances by itself at AUTO_SPEED × the playback speed, so the
 * video clock is simply position ÷ AUTO_SPEED. Pause hands it back to the scroll.
 *
 *   play / pause      button, Space or K, a click on the big centre icon
 *   seek              click or drag the progress bar; ← → (5 s), J L (10 s), Home / End
 *   chapters          the bar is split per chapter; hovering shows its name and time;
 *                     ⏮ back to the start, ⏭ the next chapter
 *   speed             0.5× … 2×
 *   fullscreen        button or F
 *
 * The controls are always on screen. Scrolling the journey yourself shows as playing while it
 * moves and as paused when you stop.
 */
import { clamp } from '../lib/math';
import { AUTO_SPEED, type Pace } from './pace';
import type { Timeline } from './timeline';

/** Milliseconds without movement before scrolling counts as stopped (paused). */
const SCROLL_REST = 260;

export interface PlayerDeps {
  root: HTMLElement;
  travel: Pace;
  tl: Timeline;
  titles: string[];
  /** Jump the view to `u` (screens) at once. */
  seek(u: number): void;
  /** Glide to the start of chapter `index`. */
  gotoChapter(index: number): void;
}

export interface Player {
  /** Refresh the UI for the view at `u` (screens) in chapter `index`. */
  update(u: number, index: number): void;
}

const fmt = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function player(deps: PlayerDeps): Player | null {
  const { root, travel, tl, titles } = deps;
  const el = root.querySelector<HTMLElement>('[data-player]');
  if (!el) return null;
  const q = <T extends Element>(sel: string) => el.querySelector<T>(sel);
  const bar = q<HTMLElement>('[data-player-seek]')!;
  const knob = q<HTMLElement>('[data-player-knob]')!;
  const tip = q<HTMLElement>('[data-player-tip]')!;
  const tipTitle = q<HTMLElement>('[data-player-tip-title]')!;
  const tipTime = q<HTMLElement>('[data-player-tip-time]')!;
  const playBtn = q<HTMLButtonElement>('[data-player-play]')!;
  const nowEl = q<HTMLElement>('[data-player-now]')!;
  const totalEl = q<HTMLElement>('[data-player-total]')!;
  const titleEl = q<HTMLElement>('[data-player-title]')!;
  const speedBtn = q<HTMLButtonElement>('[data-player-speed]')!;
  const speedLabel = q<HTMLElement>('[data-player-speed-label]')!;
  const menu = q<HTMLElement>('[data-player-menu]')!;
  const flash = q<HTMLElement>('[data-player-flash]')!;
  const flashIcon = q<HTMLElement>('[data-player-flash-icon]')!;
  const chapters = Array.from(el.querySelectorAll<HTMLElement>('.player__chapter'));

  const total = tl.total;
  const duration = total / AUTO_SPEED;
  totalEl.textContent = fmt(duration);

  // Chapters: consecutive scenes with the same title are one chapter. Each is as wide as its
  // share of the timeline.
  const groups: Array<{ title: string; first: number; last: number }> = [];
  titles.forEach((title, i) => {
    const g = groups[groups.length - 1];
    if (g && g.title === title) g.last = i;
    else groups.push({ title, first: i, last: i });
  });
  const groupOf = (scene: number) =>
    Math.max(
      0,
      groups.findIndex((g) => scene <= g.last),
    );
  groups.forEach((g, i) => {
    const from = tl.segments[g.first]!.enterStart;
    const end = tl.segments[g.last + 1]?.enterStart ?? total;
    const c = chapters[i];
    if (!c) return;
    c.style.flexGrow = String(Math.max(0.001, end - from));
    c.dataset.from = String(from / total);
    c.dataset.to = String(end / total);
  });
  /** The scene at position f (0…1). */
  const sceneAt = (f: number) => {
    const u = f * total;
    let i = 0;
    while (i < tl.segments.length - 1 && u >= tl.segments[i + 1]!.enterStart) i++;
    return i;
  };

  /* ---------- play / pause ---------- */

  let viewU = 0;
  const isPlaying = () => travel.mode() === 'auto';
  const showFlash = (playing: boolean) => {
    flashIcon.textContent = playing ? '▶' : '❚❚';
    flash.classList.remove('is-on');
    void flash.offsetWidth; // restart the animation
    flash.classList.add('is-on');
  };
  const setPlaying = (play: boolean, flashIt = true) => {
    if (play && viewU >= total - 0.01) deps.seek(0);
    travel.setMode(play ? 'auto' : 'manual', play ? viewU : undefined);
    if (flashIt) showFlash(play);
  };
  const toggle = () => setPlaying(!isPlaying());
  // Scrolling it yourself also plays it: the player shows as playing while the view moves under
  // your scroll, and as paused once you stop (SCROLL_REST after the last movement).
  let scrolling = false;
  let movedAt = -Infinity;
  let lastU = -1;
  const reflect = () => {
    const playing = isPlaying() || scrolling;
    el.classList.toggle('is-playing', playing);
    root.dataset.travel = isPlaying() ? 'auto' : 'manual';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playBtn.setAttribute('aria-pressed', String(playing));
  };
  travel.onChange(reflect);
  reflect();
  playBtn.addEventListener('click', toggle);
  flash.addEventListener('click', toggle);

  q<HTMLButtonElement>('[data-player-start]')!.addEventListener('click', () => {
    deps.seek(0);
    travel.syncAuto(0);
  });
  q<HTMLButtonElement>('[data-player-next]')!.addEventListener('click', () => {
    const next = groups[groupOf(sceneAt(viewU / total)) + 1];
    if (next) deps.gotoChapter(next.first);
  });

  /* ---------- seek ---------- */

  const seekTo = (f: number) => {
    const u = clamp(f) * total;
    deps.seek(u);
    if (isPlaying()) travel.syncAuto(u);
  };
  const fracAt = (x: number) => {
    const r = bar.getBoundingClientRect();
    return clamp((x - r.left) / (r.width || 1));
  };
  let dragging = false;
  bar.addEventListener('pointerdown', (e) => {
    dragging = true;
    bar.setPointerCapture(e.pointerId);
    el.classList.add('is-seeking');
    seekTo(fracAt(e.clientX));
  });
  bar.addEventListener('pointermove', (e) => {
    const f = fracAt(e.clientX);
    tipTitle.textContent = groups[groupOf(sceneAt(f))]?.title ?? '';
    tipTime.textContent = fmt(f * duration);
    tip.style.left = `${(f * 100).toFixed(2)}%`;
    bar.style.setProperty('--hover', f.toFixed(4));
    if (dragging) seekTo(f);
  });
  const endDrag = () => {
    dragging = false;
    el.classList.remove('is-seeking');
  };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);
  bar.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -5, ArrowRight: 5, PageDown: -30, PageUp: 30 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      seekTo(viewU / total + step / duration);
    }
  });

  /* ---------- speed ---------- */

  const openMenu = (open: boolean) => {
    menu.hidden = !open;
    speedBtn.setAttribute('aria-expanded', String(open));
    el.classList.toggle('is-menu', open);
  };
  speedBtn.addEventListener('click', () => openMenu(menu.hidden));
  for (const item of menu.querySelectorAll<HTMLButtonElement>('[data-rate]'))
    item.addEventListener('click', () => {
      const r = Number(item.dataset.rate);
      travel.setRate(r);
      speedLabel.textContent = `${r}×`;
      for (const o of menu.querySelectorAll('[data-rate]'))
        o.setAttribute('aria-checked', String(o === item));
      openMenu(false);
    });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !(e.target as Element).closest('.player__speed')) openMenu(false);
  });

  /* ---------- fullscreen ---------- */

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  q<HTMLButtonElement>('[data-player-full]')!.addEventListener('click', fullscreen);

  /* ---------- keyboard ---------- */

  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, dialog[open], [contenteditable]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = !!t?.closest('button, a, [role="slider"]');
    if ((e.key === ' ' && !onButton) || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'f' || e.key === 'F') fullscreen();
    else if (e.key === 'j' || e.key === 'J') seekTo(viewU / total - 10 / duration);
    else if (e.key === 'l' || e.key === 'L') seekTo(viewU / total + 10 / duration);
    else if (e.key === 'ArrowLeft' && !onButton) seekTo(viewU / total - 5 / duration);
    else if (e.key === 'ArrowRight' && !onButton) seekTo(viewU / total + 5 / duration);
  });

  let shownChapter = -1;
  let shownSec = -1;
  return {
    update(u, index) {
      viewU = u;
      const t = performance.now();
      if (lastU >= 0 && Math.abs(u - lastU) > 1e-4) movedAt = t;
      lastU = u;
      const moving = !isPlaying() && t - movedAt < SCROLL_REST;
      if (moving !== scrolling) {
        scrolling = moving;
        reflect();
      }
      const f = clamp(u / total);
      el.style.setProperty('--played', f.toFixed(5));
      knob.style.left = `${(f * 100).toFixed(3)}%`;
      const sec = Math.round(f * duration);
      if (sec !== shownSec) {
        shownSec = sec;
        nowEl.textContent = fmt(sec);
        bar.setAttribute('aria-valuenow', String(Math.round(f * 100)));
        bar.setAttribute('aria-valuetext', `${fmt(sec)} of ${fmt(duration)}`);
      }
      if (index !== shownChapter) {
        shownChapter = index;
        const gi = groupOf(index);
        titleEl.textContent = groups[gi]?.title ?? '';
        chapters.forEach((c, i) => c.classList.toggle('is-current', i === gi));
      }
      // Per-chapter fill (played part of each segment).
      for (const c of chapters) {
        const a = Number(c.dataset.from);
        const b = Number(c.dataset.to);
        const fill = clamp((f - a) / (b - a || 1));
        c.style.setProperty('--fill', fill.toFixed(4));
      }
    },
  };
}
