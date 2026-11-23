import { describe, expect, it } from 'vitest';
import { beats } from '../../src/content/beats';
import { liveTrays } from '../../src/content/live';
import { doneAt, SECONDS, shelfAt, SHELF_SECONDS } from '../../src/content/pacing';
import { scenes } from '../../src/content/scenes';
import { neuraShowcase } from '../../src/content/showcase';
import { appSeconds, appWindows } from '../../src/screens/app-build';
import { AUTO_SPEED } from '../../src/engine/pace';
import { buildTimeline, resolve } from '../../src/engine/timeline';

const tl = buildTimeline(
  scenes.map((s) => ({
    id: s.id,
    weight: s.weight,
    enter: 'enter' in s ? s.enter : undefined,
    beats: beats[s.id]?.length ?? 0,
  })),
);

describe('pacing', () => {
  it('runs about four minutes (with the Neura lessons and the CI/CD chapter)', () => {
    const seconds = tl.total / AUTO_SPEED;
    expect(seconds).toBeGreaterThan(241);
    expect(seconds).toBeLessThan(248);
  });

  it('starts the flights without a build-up transition', () => {
    for (const id of ['04-flight-hyd', '07-flight-home']) {
      const seg = tl.segments.find((s) => s.id === id)!;
      expect(seg.enterEnd - seg.enterStart, id).toBe(0);
      expect(resolve(tl, (seg.holdStart + 0.01) / tl.total).transitioning, id).toBe(false);
      expect(resolve(tl, (seg.holdStart + 0.01) / tl.total).enter, id).toBe(1);
    }
  });

  it('gives every timed chapter the weight of its seconds', () => {
    for (const [id, seconds] of Object.entries(SECONDS)) {
      const scene = scenes.find((s) => s.id === id);
      expect(scene?.weight, id).toBeCloseTo(seconds * AUTO_SPEED, 1);
    }
  });

  it('keeps each shelf a fixed few seconds, ending before its chapter does', () => {
    expect(liveTrays.length).toBeGreaterThan(0);
    for (const tray of liveTrays) {
      const seconds = SECONDS[tray.scene as keyof typeof SECONDS];
      expect(seconds, tray.scene).toBeGreaterThan(0);
      expect(tray.span * seconds).toBeCloseTo(SHELF_SECONDS, 5);
      expect(tray.from + tray.span).toBeLessThan(1);
      expect(doneAt(seconds)).toBeLessThan(shelfAt(seconds).from);
    }
  });

  it('splits a chapter between its projects by their screens, with no code phase', () => {
    const windows = appWindows(neuraShowcase, 0, 1);
    expect(windows).toHaveLength(neuraShowcase.length);
    windows.forEach((w, i) => {
      expect(w.a).toBeLessThan(w.live);
      expect(w.live).toBeLessThan(w.b);
      if (i > 0) expect(w.a).toBeCloseTo(windows[i - 1]!.b, 10);
      expect((w.b - w.a) / w.k).toBeCloseTo(appSeconds(neuraShowcase[i]!), 6);
    });
    expect(windows.at(-1)!.b).toBeCloseTo(1, 10);
  });
});
