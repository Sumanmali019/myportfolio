/**
 * Every bubble on the journey, per scene, in order. Only the start of the journey talks: the
 * intro's greeting is in its artwork, and Jadavpur has one thought. The chapters after that
 * tell their story on their screens, without bubbles.
 *
 *   kind     speech  — a rounded bubble from an object or person
 *            thought — a scalloped cloud
 *            screen  — a flat card with an uppercase WHO label
 *   anchor   the `data-anchor` of the element the tail points at (must exist in both SVGs)
 *   trigger  optional cue played before the bubble pops: steam | buzz | ci | rings | burst
 */
import type { Beat } from './schema';

export const beats: Record<string, Beat[]> = {
  '01-jadavpur': [
    {
      kind: 'thought',
      anchor: 'head',
      text: 'Production engineering. Machines make sense… mostly.',
    },
  ],
};
