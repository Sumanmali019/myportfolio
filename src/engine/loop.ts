/**
 * The one requestAnimationFrame loop. Owns the shared idle clock that drives every ambient
 * loop (cloud drift, steam, fan, curtains, cursor blink) so they stay in sync and all stop
 * together when the tab is hidden or motion is reduced.
 */
import { mod } from '../lib/math';
import { qsa, setTransform, setVisible } from '../lib/svg';
import { clockText, dayPart } from './daylight';

export interface LoopTick {
  now: number;
  dt: number;
  /** Seconds on the idle clock. */
  idle: number;
}

export interface Loop {
  stop(): void;
  /** Enable or freeze the idle clock (reduced motion). */
  setIdle(enabled: boolean): void;
  /** Ask for a frame even if nothing would otherwise change. */
  invalidate(): void;
}

export function startLoop(tick: (t: LoopTick) => void): Loop {
  let raf = 0;
  let last = 0;
  let idle = 0;
  let idleEnabled = true;
  let running = true;

  const frame = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (idleEnabled) idle += dt;
    tick({ now, dt, idle });
    if (running) raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (running && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    },
    setIdle(enabled) {
      idleEnabled = enabled;
    },
    invalidate() {
      if (running && !raf && !document.hidden) raf = requestAnimationFrame(frame);
    },
  };
}

/**
 * Ambient loops, by class name in the scene SVGs:
 *   .idle-cloud   drifts horizontally (data-drift = px span, default 120)
 *   .idle-steam   rises and sways
 *   .idle-fan     spins about its own centre
 *   .idle-curtain sways
 *   .idle-blink   blinks (cursor)
 *   .idle-bob     bobs up and down (scroll hint)
 *   .idle-twinkle twinkles (stars)
 *   .idle-sway    trees sway from the base
 *   .idle-bird    birds fly across (data-drift = span) flapping their wings
 *   .idle-leaf    leaves flutter down and loop (data-fall = drop in px)
 *   .idle-walk    a passer-by walks across (data-drift = span) with a step bob
 */
export interface IdleSet {
  clouds: SVGGraphicsElement[];
  steam: SVGGraphicsElement[];
  fans: SVGGraphicsElement[];
  curtains: SVGGraphicsElement[];
  blinks: SVGGraphicsElement[];
  bobs: SVGGraphicsElement[];
  twinkles: SVGGraphicsElement[];
  sways: SVGGraphicsElement[];
  birds: SVGGraphicsElement[];
  leaves: SVGGraphicsElement[];
  walkers: SVGGraphicsElement[];
}

const idleCache = new WeakMap<ParentNode, IdleSet>();

export function collectIdle(root: ParentNode): IdleSet {
  let set = idleCache.get(root);
  if (!set) {
    set = {
      clouds: qsa(root, '.idle-cloud'),
      steam: qsa(root, '.idle-steam'),
      fans: qsa(root, '.idle-fan'),
      curtains: qsa(root, '.idle-curtain'),
      blinks: qsa(root, '.idle-blink'),
      bobs: qsa(root, '.idle-bob'),
      twinkles: qsa(root, '.idle-twinkle'),
      sways: qsa(root, '.idle-sway'),
      birds: qsa(root, '.idle-bird'),
      leaves: qsa(root, '.idle-leaf'),
      walkers: qsa(root, '.idle-walk'),
    };
    idleCache.set(root, set);
  }
  return set;
}

export function applyIdle(root: ParentNode, idle: number, reduced: boolean): void {
  const set = collectIdle(root);
  const t = reduced ? 0 : idle;
  set.clouds.forEach((el, i) => {
    const span = Number(el.dataset.drift ?? 120);
    const speed = 6 + (i % 3) * 3;
    const x = t ? mod(t * speed + i * 37, span * 2) - span : 0;
    setTransform(el, x ? `translate(${x.toFixed(1)}px, 0)` : '');
  });
  set.steam.forEach((el, i) => {
    const phase = mod(t * 0.6 + i * 0.33, 1);
    const y = -phase * 26;
    const x = Math.sin((t + i) * 2.2) * 4;
    const s = 0.7 + phase * 0.6;
    setTransform(
      el,
      t ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(2)})` : '',
    );
    setVisible(el, !t || phase < 0.92);
  });
  set.fans.forEach((el) => setTransform(el, t ? `rotate(${mod(t * 260, 360).toFixed(0)}deg)` : ''));
  set.curtains.forEach((el, i) => {
    const a = Math.sin(t * 0.9 + i * 1.3) * 1.6;
    setTransform(el, t ? `skewX(${a.toFixed(2)}deg)` : '');
  });
  set.blinks.forEach((el) => setVisible(el, !t || mod(t, 1.06) < 0.6));
  set.bobs.forEach((el) => {
    const y = Math.sin(t * 2.4) * 5;
    setTransform(el, t ? `translate(0, ${y.toFixed(1)}px)` : '');
  });
  set.twinkles.forEach((el, i) => {
    const s = 0.75 + 0.25 * Math.sin(t * 1.7 + i * 2.1);
    setTransform(el, t ? `scale(${s.toFixed(2)})` : '');
  });
  set.sways.forEach((el, i) => {
    const a = Math.sin(t * 0.8 + i * 1.7) * 2.2;
    setTransform(el, t ? `skewX(${a.toFixed(2)}deg)` : '');
  });
  set.birds.forEach((el, i) => {
    const span = Number(el.dataset.drift ?? 400);
    const x = mod(t * (38 + i * 9) + i * 260, span * 2) - span;
    const y = Math.sin(t * 1.4 + i * 2) * 10;
    const flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 8 + i * 1.3));
    setTransform(
      el,
      t ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(1, ${flap.toFixed(2)})` : '',
    );
  });
  set.leaves.forEach((el, i) => {
    const fall = Number(el.dataset.fall ?? 200);
    const phase = mod(t * 0.12 + i * 0.29, 1);
    const x = Math.sin(phase * 7 + i) * 22 + phase * 30;
    const y = phase * fall;
    setTransform(
      el,
      t
        ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(phase * 420).toFixed(0)}deg)`
        : '',
    );
    setVisible(el, !t || phase < 0.94);
  });
  set.walkers.forEach((el, i) => {
    const span = Number(el.dataset.drift ?? 600);
    const x = mod(t * 34 + i * 400, span * 2) - span;
    const bob = -Math.abs(Math.sin(t * 6 + i)) * 4;
    setTransform(el, t ? `translate(${x.toFixed(1)}px, ${bob.toFixed(1)}px)` : '');
  });
}

/**
 * Things that follow the journey's position rather than the clock (scripts/art/kit.mjs):
 *   [data-clock="d|ap"] digital desk clock (HH:MM, AM/PM): the time moves on as it plays or scrolls
 *   [data-sway]         a desk plant's leaves sway with the motion
 *   [data-parallax=k]   drifts sideways (k px) across the scene's hold
 */
interface ScrolledSet {
  digits: Element[];
  ampm: Element[];
  sways: Element[];
  drifts: Array<{ el: Element; k: number }>;
}
const scrolledCache = new WeakMap<ParentNode, ScrolledSet>();

/**
 * `minutes`: the time on the desk clock (engine/daylight.ts). The scene SVG's `data-daypart`
 * follows it, so the window and the room light always match the clock.
 */
export function applyScrolled(root: SVGSVGElement, u: number, hold: number, minutes: number): void {
  let set = scrolledCache.get(root);
  if (!set) {
    set = {
      digits: qsa(root, '[data-clock="d"]'),
      ampm: qsa(root, '[data-clock="ap"]'),
      sways: qsa(root, '[data-sway]'),
      drifts: qsa(root, '[data-parallax]').map((el) => ({
        el,
        k: Number(el.getAttribute('data-parallax')) || 0,
      })),
    };
    scrolledCache.set(root, set);
  }
  const set2 = (el: Element, v: string) => {
    if (el.getAttribute('transform') !== v) el.setAttribute('transform', v);
  };
  const [time, ap] = clockText(minutes);
  const part = dayPart(minutes);
  if (root.dataset.daypart !== part) root.dataset.daypart = part;
  for (const el of set.digits) if (el.textContent !== time) el.textContent = time;
  for (const el of set.ampm) if (el.textContent !== ap) el.textContent = ap;
  for (const el of set.sways) set2(el, `rotate(${(Math.sin(u * 5) * 7).toFixed(2)})`);
  for (const { el, k } of set.drifts) set2(el, `translate(${((0.5 - hold) * k).toFixed(1)} 0)`);
}

const yearCache = new WeakMap<ParentNode, Element[]>();

/**
 * The desk calendar's year (`[data-desk-year]`, scripts/art/kit.mjs deskCalendar): always the
 * year of the scene on screen. When it changes it flips in (styles/global.css `.is-flip`).
 */
export function applyYear(root: ParentNode, year: number): void {
  let els = yearCache.get(root);
  if (!els) {
    els = qsa(root, '[data-desk-year]');
    yearCache.set(root, els);
  }
  const text = String(year);
  for (const el of els) {
    if (el.textContent === text) continue;
    // The first time (the authored placeholder) it is just set.
    const first = !el.hasAttribute('data-year-set');
    el.textContent = text;
    el.setAttribute('data-year-set', '');
    if (first) continue;
    // Restart the flip.
    el.classList.remove('is-flip');
    void (el as SVGGraphicsElement).getBoundingClientRect();
    el.classList.add('is-flip');
  }
}
