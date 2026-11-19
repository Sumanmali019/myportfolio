/**
 * Pace: how the view follows the scroll, and the two ways to travel (chosen on the first
 * screen, components/ScrollMode.astro).
 *
 * The view does not jump to wherever the scroll is: it chases it every frame, easing in and
 * out, with a top speed (in screen-heights per second). However hard the wheel or touchpad
 * flicks, the story plays through every frame at a steady pace — smooth at the display's
 * frame rate (60 fps and up) — and catches up with the scroll. Immediate jumps (links,
 * restart) land at once.
 *
 * Manual: you scroll; the view follows at that pace.
 * Auto: the page scrolls itself at a gentle, constant speed; any wheel, touch or key input
 * hands control back to you (manual).
 *
 * Either way the journey waits at each "see it live" shelf (engine/index.ts) until you say
 * you want to move on.
 */
import { clamp } from '../lib/math';

/** Top speed of the view, screen-heights per second. */
const MAX_SPEED = 2.4;
/** How quickly the view closes the gap (per second): the easing of the chase. */
const CHASE = 7;
/** Playback (auto) speed at 1×, screen-heights per second: the journey's "video" clock. */
export const AUTO_SPEED = 0.4;

export type Mode = 'manual' | 'auto';

export interface Pace {
  /** Advance one frame: returns the view position (screens) to draw. */
  step(target: number, dt: number, opts: { snap: boolean; reduced: boolean }): number;
  /** Auto mode: where the scroll should be after `dt` (screens), or null when not auto. */
  autoTarget(dt: number, total: number): number | null;
  /** Auto mode waits at `u` (screens): it does not run past it until released. */
  holdAt(u: number): void;
  /** Auto mode carries on from `u` (after a seek or a jump). */
  syncAuto(u: number): void;
  /** Playback speed multiplier (0.5× … 2×). */
  rate(): number;
  setRate(rate: number): void;
  mode(): Mode;
  setMode(mode: Mode, from?: number): void;
  onChange(cb: (mode: Mode) => void): void;
}

export function pace(): Pace {
  let view = -1;
  let mode: Mode = 'manual';
  let autoAt = 0;
  let speed = 1;
  const listeners: Array<(m: Mode) => void> = [];

  return {
    step(target, dt, { snap, reduced }) {
      if (view < 0 || snap || reduced || dt <= 0) {
        view = target;
        return view;
      }
      const gap = target - view;
      if (Math.abs(gap) < 1e-4) {
        view = target;
        return view;
      }
      const eased = gap * (1 - Math.exp(-CHASE * dt));
      const max = MAX_SPEED * dt;
      view += clamp(eased, -max, max);
      return view;
    },
    autoTarget(dt, total) {
      if (mode !== 'auto') return null;
      autoAt = Math.min(total, autoAt + AUTO_SPEED * speed * dt);
      if (autoAt >= total) this.setMode('manual');
      return autoAt;
    },
    holdAt(u) {
      autoAt = Math.min(autoAt, u);
    },
    syncAuto(u) {
      autoAt = u;
    },
    rate: () => speed,
    setRate(r) {
      speed = clamp(r, 0.25, 4);
    },
    mode: () => mode,
    setMode(next, from) {
      if (next === 'auto') autoAt = Math.max(from ?? view, 0);
      if (next === mode) return;
      mode = next;
      for (const cb of listeners) cb(mode);
    },
    onChange(cb) {
      listeners.push(cb);
    },
  };
}
