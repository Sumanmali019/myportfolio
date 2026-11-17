/**
 * Helpers shared by several scenes (not a scene itself — scenes are looked up by the
 * `module` names in src/content/scenes.ts).
 */
import { bell, easeIn, easeInOut, easeOut, progress } from '../lib/math';
import type { App } from '../content/schema';
import type { EngineData, Screen, ScreenContext } from '../engine/types';
import { drawOn, pathLength, qs, qsa, setAttr, setScale } from '../lib/svg';

/** Elements authored with class `pre-hidden` start at scale(0) for first paint; JS takes over. */
export function takeOver(svg: SVGSVGElement): void {
  for (const el of qsa(svg, '.pre-hidden')) el.classList.remove('pre-hidden');
}

const viewH = (svg: SVGSVGElement) => svg.viewBox.baseVal?.height || 900;

/**
 * Eyelids: two `[data-lid]` groups authored fully closed (top half / bottom half).
 * `closed` = 1 covers the screen, 0 is fully open.
 */
export function bindLids(svg: SVGSVGElement): (closed: number) => void {
  const top = qs(svg, '[data-lid="top"]');
  const bottom = qs(svg, '[data-lid="bottom"]');
  const h = viewH(svg) / 2 + 40;
  return (closed) => {
    const off = ((1 - closed) * h).toFixed(1);
    if (top) setAttr(top, 'transform', `translate(0 ${closed >= 1 ? 0 : `-${off}`})`);
    if (bottom) setAttr(bottom, 'transform', `translate(0 ${closed >= 1 ? 0 : off})`);
    const vis = closed <= 0 ? 'hidden' : '';
    if (top && top.style.visibility !== vis) top.style.visibility = vis;
    if (bottom && bottom.style.visibility !== vis) bottom.style.visibility = vis;
  };
}

/** Waking: lids open in the first 20% of a hold, with one blink. Returns closed 0..1. */
export function wakeLids(hold: number): number {
  if (hold < 0.04) return 1;
  if (hold < 0.09) return 1 - 0.55 * easeOut(progress(hold, 0.04, 0.09));
  if (hold < 0.12) return 0.45 + 0.4 * progress(hold, 0.09, 0.12);
  return 0.85 * (1 - easeOut(progress(hold, 0.12, 0.2)));
}

export interface Dial {
  /** Marker angle in degrees (0 = midnight at the top, 15° per hour). */
  setMarker(deg: number): void;
  /** Stars and moons: `gone(angleOfStar)` → 0..1 how far it has disappeared. */
  setStars(gone: (angle: number) => number): void;
  setSun(scale: number): void;
  /** 0 = closed slit, 1 = wide open. */
  setEye(open: number): void;
}

/**
 * The 24-hour radial dial with the eye (scenes 00 and 99):
 *   [data-dial data-c="cx cy"], [data-marker], .star[data-angle], [data-sun],
 *   [data-eye-open data-cy]
 */
export function bindDial(svg: SVGSVGElement): Dial {
  const dial = qs(svg, '[data-dial]');
  const c = dial?.getAttribute('data-c') ?? '0 0';
  const marker = qs(svg, '[data-marker]');
  const stars = qsa(svg, '.star').map((el) => ({
    el,
    a: Number(el.getAttribute('data-angle') ?? 0),
  }));
  const sun = qs(svg, '[data-sun]');
  const eye = qs(svg, '[data-eye-open]');
  const eyeCy = Number(eye?.getAttribute('data-cy') ?? 0);
  return {
    setMarker(deg) {
      if (marker) setAttr(marker, 'transform', `rotate(${deg.toFixed(1)} ${c})`);
    },
    setStars(gone) {
      for (const s of stars) setScale(s.el, 1 - easeIn(gone(s.a)));
    },
    setSun(scale) {
      if (sun) setScale(sun, scale);
    },
    setEye(open) {
      if (!eye) return;
      const o = Math.max(0.06, open);
      setAttr(
        eye,
        'transform',
        `translate(0 ${(eyeCy * (1 - o)).toFixed(1)}) scale(1 ${o.toFixed(3)})`,
      );
    },
  };
}

/** Blink: multiplies openness by a quick dip over [a, b] of t. */
export const blink = (t: number, a: number, b: number): number =>
  1 - 0.94 * bell(progress(t, a, b));

/** Mount a screen if its rect exists in the SVG. */
export function mountScreen(
  svg: SVGSVGElement,
  name: string,
  factory: (rect: SVGGraphicsElement) => Screen,
): Screen | null {
  const rect = qs(svg, `[data-screen="${name}"]`);
  return rect ? factory(rect) : null;
}

export const screenCtx = (s: { hold: number; idle: number; reduced: boolean }): ScreenContext => ({
  hold: s.hold,
  idle: s.idle,
  reduced: s.reduced,
});

/**
 * Flights (transit chapters): the takeoff plane climbs off the runway, then the route arc
 * draws across the map inside the plane window with a small plane riding its tip.
 *   [data-takeoff]  [data-route] (path)  [data-plane]
 */
export function bindFlight(svg: SVGSVGElement): (hold: number) => void {
  const takeoff = qs(svg, '[data-takeoff]');
  const route = qs<SVGPathElement>(svg, '[data-route]');
  const plane = qs(svg, '[data-plane]');
  const len = route ? pathLength(route) : 0;
  return (hold) => {
    const k = easeInOut(progress(hold, 0, 0.3));
    if (takeoff) {
      setAttr(
        takeoff,
        'transform',
        k > 0
          ? `translate(${(k * 420).toFixed(1)} ${(-k * 260).toFixed(1)}) rotate(${(-14 * Math.min(1, k * 3)).toFixed(1)})`
          : '',
      );
      takeoff.style.visibility = k >= 1 ? 'hidden' : '';
    }
    if (!route || !plane || !len) return;
    const r = easeInOut(progress(hold, 0.25, 0.85));
    drawOn(route, r);
    const p = route.getPointAtLength(len * r);
    const q = route.getPointAtLength(Math.min(len, len * r + 1));
    const a = r >= 1 ? 0 : (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    setAttr(
      plane,
      'transform',
      `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${a.toFixed(1)})`,
    );
  };
}

/**
 * Mount an app card on every `[data-screen="app-<key>"]` rect, using the apps in profile.ts.
 * `badgeAt` sets when each app's downloads badge stamps in.
 */
export function mountApps(
  svg: SVGSVGElement,
  data: EngineData,
  factory: (rect: SVGGraphicsElement, app: App, opts: { badgeAt?: [number, number] }) => Screen,
  badgeAt: Record<string, [number, number]> = {},
): Screen[] {
  const out: Screen[] = [];
  for (const app of data.profile.apps) {
    const rect = qs(svg, `[data-screen="app-${app.key}"]`);
    if (rect) out.push(factory(rect, app, { badgeAt: badgeAt[app.key] }));
  }
  return out;
}
