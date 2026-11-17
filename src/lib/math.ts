/** Small, allocation-free maths helpers shared by the engine, scenes and tests. */

export const clamp = (v: number, min = 0, max = 1): number => (v < min ? min : v > max ? max : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Map `v` from [inA, inB] to [outA, outB]. Clamped by default. */
export function map(
  v: number,
  inA: number,
  inB: number,
  outA = 0,
  outB = 1,
  clamped = true,
): number {
  if (inA === inB) return v >= inB ? outB : outA;
  const t = (v - inA) / (inB - inA);
  return lerp(outA, outB, clamped ? clamp(t) : t);
}

/** Progress of `t` through the window [start, end], clamped to 0..1. */
export const progress = (t: number, start: number, end: number): number => map(t, start, end);

export const easeIn = (t: number): number => t * t * t;

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Ease out. With `overshoot` > 0 this is a "back" ease that passes 1 and settles —
 * used for objects and bubbles that pop into place.
 */
export function easeOut(t: number, overshoot = 0): number {
  const u = t - 1;
  if (overshoot <= 0) return 1 + u * u * u;
  const c3 = overshoot + 1;
  return 1 + c3 * u * u * u + overshoot * u * u;
}

/** 0 → 1 → 0 hump over t ∈ [0, 1]. */
export const bell = (t: number): number => Math.sin(Math.PI * clamp(t));

/** Positive modulo. */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Round for stable attribute strings (avoids 1e-17 noise and needless DOM writes). */
export const r2 = (v: number): number => Math.round(v * 100) / 100;
