/**
 * Maps scroll progress P (0 → 1) onto the day.
 *
 * Scroll is measured in "screens" (one viewport height). Each scene has:
 *   - an enter transition of TRANSITION screens (none for the first scene), during which the
 *     previous scene is taken apart and this one is built,
 *   - a hold of `weight` screens (at least BEAT per bubble), during which bubbles play.
 *
 *   | intro hold | T | 01 hold ......... | T | 02 hold ......... | …
 */
import { clamp } from '../lib/math';

/**
 * Screens of scroll per transition: the scene is taken apart and the next one built piece by
 * piece (transitions/). At 0.4 screens a second that is 2½ s, which keeps the whole journey to
 * about 3½ minutes.
 */
export const TRANSITION = 1;
export const BEAT = 0.6;
export const LEAD = 0.25;

export interface TimelineSceneInput {
  id: string;
  weight: number;
  beats: number;
  /** Screens of scroll for the transition into this scene (default TRANSITION). */
  enter?: number;
}

export interface Segment {
  index: number;
  id: string;
  enterStart: number;
  enterEnd: number;
  holdStart: number;
  holdEnd: number;
  /** [start, end] of each bubble beat, in screens. */
  beats: Array<[number, number]>;
}

export interface Timeline {
  segments: Segment[];
  /** Total length in screens. */
  total: number;
}

export interface Frame {
  p: number;
  /** Position in screens. */
  u: number;
  index: number;
  id: string;
  /** Previous scene being taken apart, or -1 when not transitioning. */
  prev: number;
  transitioning: boolean;
  enter: number;
  hold: number;
  beat: number;
  beatT: number;
}

export const holdLength = (weight: number, beats: number): number =>
  Math.max(weight, beats * BEAT + 2 * LEAD);

export function buildTimeline(scenes: TimelineSceneInput[]): Timeline {
  const segments: Segment[] = [];
  let u = 0;
  scenes.forEach((s, index) => {
    const enterStart = u;
    const enterEnd = index === 0 ? u : u + (s.enter ?? TRANSITION);
    const holdStart = enterEnd;
    const hold = holdLength(s.weight, s.beats);
    const holdEnd = holdStart + hold;
    const spacing = s.beats > 0 ? (hold - 2 * LEAD) / s.beats : 0;
    const beats: Array<[number, number]> = [];
    for (let j = 0; j < s.beats; j++) {
      const start = holdStart + LEAD + j * spacing;
      beats.push([start, start + spacing]);
    }
    segments.push({ index, id: s.id, enterStart, enterEnd, holdStart, holdEnd, beats });
    u = holdEnd;
  });
  return { segments, total: u };
}

export function segmentAt(tl: Timeline, u: number): Segment {
  const segs = tl.segments;
  let i = segs.length - 1;
  while (i > 0 && u < segs[i]!.enterStart) i--;
  return segs[i]!;
}

export function resolve(tl: Timeline, p: number): Frame {
  const pc = clamp(p);
  const u = pc * tl.total;
  const seg = segmentAt(tl, u);
  const transitioning = seg.index > 0 && u < seg.enterEnd;
  // The first scene, and one with no transition into it, are already fully entered.
  const enter =
    seg.index === 0 || seg.enterEnd === seg.enterStart
      ? 1
      : clamp((u - seg.enterStart) / (seg.enterEnd - seg.enterStart));
  const holdSpan = seg.holdEnd - seg.holdStart || 1;
  const hold = clamp((u - seg.holdStart) / holdSpan);
  let beat = -1;
  let beatT = 0;
  if (!transitioning) {
    for (let j = 0; j < seg.beats.length; j++) {
      const [s, e] = seg.beats[j]!;
      if (u >= s && u < e) {
        beat = j;
        beatT = (u - s) / (e - s);
        break;
      }
    }
  }
  return {
    p: pc,
    u,
    index: seg.index,
    id: seg.id,
    prev: transitioning ? seg.index - 1 : -1,
    transitioning,
    enter,
    hold,
    beat,
    beatT,
  };
}

/** Scroll progress for a point inside a scene's hold (`frac` 0 → 1). */
export function progressAt(tl: Timeline, index: number, frac = 0.5): number {
  const seg = tl.segments[clamp(index, 0, tl.segments.length - 1)]!;
  if (tl.total === 0) return 0;
  return (seg.holdStart + frac * (seg.holdEnd - seg.holdStart)) / tl.total;
}

/** Progress at the middle of a beat — used by tests and visual snapshots. */
export function progressAtBeat(tl: Timeline, index: number, beat: number, frac = 0.5): number {
  const seg = tl.segments[index]!;
  const b = seg.beats[beat];
  if (!b) return progressAt(tl, index, frac);
  return (b[0] + frac * (b[1] - b[0])) / tl.total;
}
