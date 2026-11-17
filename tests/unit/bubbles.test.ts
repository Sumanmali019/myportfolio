import { describe, expect, it } from 'vitest';
import { placeBubble, scallopPath } from '../../src/bubbles/bubble';
import { wordsVisible } from '../../src/bubbles/typewriter';
import { wrap } from '../../src/screens/sse-vs-ws';

describe('bubbles', () => {
  it('reveals words monotonically, all of them by t = 1', () => {
    expect(wordsVisible(5, 0)).toBe(0);
    expect(wordsVisible(5, 1)).toBe(5);
    let last = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const n = wordsVisible(5, t);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });

  it('keeps bubbles inside the viewport', () => {
    const anchors = [
      { left: 0, top: 0, width: 40, height: 40 },
      { left: 360, top: 800, width: 30, height: 30 },
      { left: 150, top: 400, width: 100, height: 60 },
    ];
    for (const anchor of anchors) {
      const p = placeBubble(anchor, 300, 90, 390, 844, 'speech');
      expect(p.x).toBeGreaterThanOrEqual(16);
      expect(p.x + 300).toBeLessThanOrEqual(390 - 16 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(16);
      expect(p.y + 90).toBeLessThanOrEqual(844);
    }
  });

  it('draws a closed scalloped outline', () => {
    const d = scallopPath(200, 80);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect((d.match(/A/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  it('wraps text to the column width', () => {
    for (const line of wrap('one two three four five six seven eight nine ten', 12)) {
      expect(line.length).toBeLessThanOrEqual(12);
    }
  });
});
