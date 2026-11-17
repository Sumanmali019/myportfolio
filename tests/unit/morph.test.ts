import { describe, expect, it } from 'vitest';
import {
  ENTER_WINDOW,
  enterScale,
  EXIT_WINDOW,
  exitScale,
  orderParts,
  staggerWindow,
} from '../../src/engine/morph';

describe('build order', () => {
  const parts = [
    { k: 2, cx: 100 }, // 0
    { k: 0, cx: 500 }, // 1 (back wall)
    { k: 2, cx: 50 }, // 2
    { k: 5, cx: 10 }, // 3 (front)
    { k: 0, cx: 100 }, // 4
  ];

  it('builds back → front, left → right on even transitions', () => {
    expect(orderParts(parts, 1)).toEqual([4, 1, 2, 0, 3]);
  });

  it('alternates direction within a depth on odd transitions', () => {
    expect(orderParts(parts, -1)).toEqual([1, 4, 0, 2, 3]);
  });

  it('is stable for identical parts', () => {
    const same = [
      { k: 1, cx: 0 },
      { k: 1, cx: 0 },
      { k: 1, cx: 0 },
    ];
    expect(orderParts(same, 1)).toEqual([0, 1, 2]);
  });
});

describe('stagger windows', () => {
  it('spreads windows across the range, in order, inside it', () => {
    const n = 6;
    let lastStart = -1;
    for (let j = 0; j < n; j++) {
      const [s, e] = staggerWindow(j, n, ...ENTER_WINDOW);
      expect(s).toBeGreaterThanOrEqual(ENTER_WINDOW[0]);
      expect(e).toBeLessThanOrEqual(ENTER_WINDOW[1] + 1e-9);
      expect(s).toBeGreaterThan(lastStart);
      lastStart = s;
    }
  });

  it('takes the old scene apart completely before the new one starts building', () => {
    expect(EXIT_WINDOW[0]).toBeLessThan(ENTER_WINDOW[0]);
    expect(EXIT_WINDOW[1]).toBeLessThanOrEqual(ENTER_WINDOW[0]);
  });

  it('grows from 0 with overshoot and shrinks to exactly 0', () => {
    expect(enterScale(0, 0.4, 0.7)).toBe(0);
    expect(enterScale(1, 0.4, 0.7)).toBe(1);
    const samples = Array.from({ length: 100 }, (_, i) =>
      enterScale(0.4 + (i / 100) * 0.3, 0.4, 0.7),
    );
    expect(Math.max(...samples)).toBeGreaterThan(1); // pops past full size, then settles
    expect(exitScale(0, 0, 0.3)).toBe(1);
    expect(exitScale(1, 0, 0.3)).toBe(0);
  });
});
