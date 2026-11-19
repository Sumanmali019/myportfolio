import { expect, test } from '@playwright/test';
import { scenes } from '../../src/content/scenes';
import { openJourney } from './helpers';

/** [scaleX, scaleY] from a CSS transform string like "translate(…) scale(0.6, 1.01)". */
const scaleOf = (tf: string): [number, number] => {
  const m = /scale\(([\d.]+),\s*([\d.]+)\)/.exec(tf);
  return m ? [Number(m[1]), Number(m[2])] : [1, 1];
};

// Front (graduation) → back (Cloudcraftz desk): the avatar moves to its new place and turns
// round on the way: the front view narrows to edge-on, then the back view widens out of it.
const turnInto = scenes.findIndex((s) => s.id === '03-kolkata');

test.describe('avatar', () => {
  test('turns round from front to back going into Cloudcraftz', async ({ page }) => {
    await openJourney(page);
    const outgoing = page.locator(
      '.scene[data-scene-id="02-graduation"] [data-id="me"][data-view="front"]',
    );
    const incoming = page.locator(
      '.scene[data-scene-id="03-kolkata"] [data-id="me"][data-view="back"]',
    );
    // Step through the transition: first the front view turning (back view hidden), then the
    // back view turning (front view hidden).
    const seen = { front: false, back: false };
    for (let t = 0.1; t <= 0.7 && !seen.back; t += 0.02) {
      await page.evaluate(([i, tt]) => window.dayEngine.transition(i!, tt!), [turnInto, t]);
      await page.waitForTimeout(120);
      const [ox, oy] = scaleOf(await outgoing.evaluate((el) => (el as SVGElement).style.transform));
      const [ix, iy] = scaleOf(await incoming.evaluate((el) => (el as SVGElement).style.transform));
      if (!seen.front && ox < oy * 0.9 && ox > 0 && !(await incoming.isVisible()))
        seen.front = true;
      if (seen.front && ix < iy * 0.9 && ix > 0 && !(await outgoing.isVisible())) seen.back = true;
    }
    expect(seen).toEqual({ front: true, back: true });
  });

  test('is a bust on the bottom edge of the frame, never a full body', async ({ page }) => {
    await openJourney(page);
    await page.evaluate(() => window.dayEngine.goto(1, 0.3));
    await page.waitForFunction(() => document.documentElement.dataset.scene === '01-jadavpur');
    await page.waitForTimeout(400);
    const box = await page
      .locator('.scene[data-scene-id="01-jadavpur"] [data-id="me"]')
      .boundingBox();
    // The scene is a framed picture: its bottom edge is the frame's, not the window's.
    const frame = await page.locator('.scene[data-scene-id="01-jadavpur"] > svg').boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(
      Math.floor(frame!.y + frame!.height) - 2,
    );
  });
});
