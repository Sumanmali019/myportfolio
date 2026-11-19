/** The transition easings (pure, allocation-free). */

export const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Where `v` is between `a` and `b`, as 0…1. */
export const map = (v: number, a: number, b: number): number =>
  a === b ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a));

/** Cubic in-out. */
export const ease = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export const easeOut = (u: number): number => 1 - (1 - u) ** 3;

export const easeIn = (u: number): number => u * u * u;

/** A gentle overshoot, for parts building in: 0 → ~1.07 → 1. */
export const backSoft = (u: number): number => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
