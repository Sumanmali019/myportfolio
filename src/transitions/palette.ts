/**
 * How far the colours have moved from A's palette to B's at transition progress m: mostly in
 * the middle of the build. A "same scene, colour only" transition (day → dusk) blends evenly
 * over almost all of it.
 */
import { ease, map } from './easing';

export const paletteAt = (m: number, colourOnly = false): number =>
  colourOnly ? ease(map(m, 0.02, 0.98)) : ease(map(m, 0.12, 0.58));
