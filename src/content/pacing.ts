/**
 * How long each chapter plays, in seconds at 1× (the journey's "video" clock). This is the one
 * place to tune the running time: a chapter's `weight` in content/scenes.ts is its seconds ×
 * AUTO_SPEED, the scene modules split the same seconds between their parts, and the "see it
 * live" shelf (content/live.ts) takes the last few seconds of its chapter.
 *
 * The whole journey is meant to run about 4 minutes (see tests/unit/pacing.test.ts).
 */
import { AUTO_SPEED } from '../engine/pace';

export const SECONDS = {
  '03-kolkata': 26,
  '05-hyderabad': 31,
  '09-leading': 24,
  '09-cicd': 24,
  '09-neura-apps': 34,
  '11-quiet-shelf': 14,
  '11-khyaati': 13.5,
} as const;

/** A chapter's hold in screens of scroll. */
export const weightOf = (scene: keyof typeof SECONDS): number =>
  Math.round(SECONDS[scene] * AUTO_SPEED * 100) / 100;

/** How long the shelf takes to come up and have every project land on it. */
export const SHELF_SECONDS = 2.6;

/**
 * The shelf's window in a chapter of `seconds`, in hold progress: it starts at `from` and its
 * projects are all on it `span` later, just before the end of the hold (where the journey waits
 * for your answer).
 */
export const shelfAt = (seconds: number): { from: number; span: number } => {
  const span = SHELF_SECONDS / seconds;
  return { from: 0.985 - span, span };
};

/** Hold progress by which a chapter's own content is done, just before its shelf comes up. */
export const doneAt = (seconds: number): number => shelfAt(seconds).from - 0.005;
