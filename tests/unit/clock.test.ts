import { describe, expect, it } from 'vitest';
import {
  downloadsAt,
  formatCount,
  formatMonth,
  monthAt,
  monthIndex,
  odometerStart,
  yearOf,
} from '../../src/engine/clock';
import { buildTimeline } from '../../src/engine/timeline';

describe('calendar', () => {
  it('parses and formats months', () => {
    expect(monthIndex('2017-07')).toBe(2017 * 12 + 6);
    expect(formatMonth(monthIndex('2017-07'))).toBe('JUL 2017');
    expect(formatMonth(monthIndex('2023-12'))).toBe('DEC 2023');
    expect(yearOf(monthIndex('2024-01'))).toBe(2024);
  });

  const tl = buildTimeline([
    { id: 'a', weight: 1, beats: 0 },
    { id: 'b', weight: 1, beats: 0 },
    { id: 'c', weight: 1, beats: 0 },
  ]);
  const months = ['2017-07', '2021-06', '2023-09'].map(monthIndex);

  it('hits each scene date at the start of its hold', () => {
    tl.segments.forEach((s, i) => expect(monthAt(tl, months, s.holdStart)).toBeCloseTo(months[i]!));
  });

  it('interpolates between scenes and never runs backwards', () => {
    let last = -Infinity;
    for (let u = 0; u <= tl.total; u += 0.05) {
      const m = monthAt(tl, months, u);
      expect(m).toBeGreaterThanOrEqual(last);
      last = m;
    }
    expect(monthAt(tl, months, tl.total + 5)).toBe(months[2]);
  });
});

describe('odometer', () => {
  const added = [0, 0, 10_000, 0, 510_000];

  it('starts where the first downloads are added', () => {
    expect(odometerStart(added)).toBe(2);
    expect(odometerStart([0, 0])).toBe(Infinity);
  });

  it('counts up during the adding hold and keeps earlier totals', () => {
    expect(downloadsAt(added, { index: 2, hold: 0, transitioning: false })).toBe(0);
    expect(downloadsAt(added, { index: 2, hold: 1, transitioning: false })).toBe(10_000);
    expect(downloadsAt(added, { index: 3, hold: 0, transitioning: true })).toBe(10_000);
    expect(downloadsAt(added, { index: 4, hold: 1, transitioning: false })).toBe(520_000);
    const mid = downloadsAt(added, { index: 4, hold: 0.45, transitioning: false });
    expect(mid).toBeGreaterThan(10_000);
    expect(mid).toBeLessThan(520_000);
  });

  it('formats counts with separators', () => {
    expect(formatCount(520000)).toBe('520,000');
  });
});
