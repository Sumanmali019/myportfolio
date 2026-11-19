import { describe, expect, it } from 'vitest';
import {
  BEAT,
  buildTimeline,
  holdLength,
  LEAD,
  progressAt,
  progressAtBeat,
  resolve,
  TRANSITION,
} from '../../src/engine/timeline';

const tl = buildTimeline([
  { id: 'a', weight: 1, beats: 0 },
  { id: 'b', weight: 2, beats: 2 },
  { id: 'c', weight: 0.6, beats: 3 },
]);

describe('timeline', () => {
  it('lays out holds and transitions back to back', () => {
    const [a, b, c] = tl.segments;
    expect(a!.enterStart).toBe(0);
    expect(a!.enterEnd).toBe(0); // the first scene has no enter transition
    expect(b!.enterStart).toBe(a!.holdEnd);
    expect(b!.enterEnd - b!.enterStart).toBe(TRANSITION);
    expect(c!.holdEnd).toBe(tl.total);
  });

  it('stretches holds to fit their bubbles', () => {
    expect(holdLength(0.6, 3)).toBeCloseTo(3 * BEAT + 2 * LEAD);
    expect(holdLength(2, 2)).toBe(2);
  });

  it('resolves the start, a transition and the end', () => {
    expect(resolve(tl, 0)).toMatchObject({
      index: 0,
      prev: -1,
      transitioning: false,
      enter: 1,
      hold: 0,
    });
    const mid = resolve(tl, (tl.segments[1]!.enterStart + TRANSITION / 2) / tl.total);
    expect(mid).toMatchObject({ index: 1, prev: 0, transitioning: true, beat: -1 });
    expect(mid.enter).toBeCloseTo(0.5);
    expect(resolve(tl, 1)).toMatchObject({ index: 2, hold: 1 });
  });

  it('clamps out-of-range progress', () => {
    expect(resolve(tl, -1).p).toBe(0);
    expect(resolve(tl, 2).p).toBe(1);
  });

  it('finds beats inside the hold, in order', () => {
    const p0 = progressAtBeat(tl, 1, 0, 0.5);
    const p1 = progressAtBeat(tl, 1, 1, 0.5);
    expect(resolve(tl, p0)).toMatchObject({ index: 1, beat: 0 });
    expect(resolve(tl, p0).beatT).toBeCloseTo(0.5);
    expect(resolve(tl, p1)).toMatchObject({ index: 1, beat: 1 });
  });

  it('progressAt round-trips to the same scene and hold fraction', () => {
    for (let i = 0; i < tl.segments.length; i++) {
      const f = resolve(tl, progressAt(tl, i, 0.4));
      expect(f.index).toBe(i);
      expect(f.hold).toBeCloseTo(0.4);
    }
  });

  it('never goes back a scene as progress increases', () => {
    let last = 0;
    for (let p = 0; p <= 1; p += 0.01) {
      const { index } = resolve(tl, p);
      expect(index).toBeGreaterThanOrEqual(last);
      last = index;
    }
  });
});
