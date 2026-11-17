import { expect, test } from '@playwright/test';
import { scenes } from '../../src/content/scenes';
import { openJourney } from './helpers';

/** [scaleX, scaleY] from a CSS transform string like "translate(…) scale(0.6, 1.01)". */
const scaleOf = (tf: string): [number, number] => {
  const m = /scale\(([\d.]+),\s*([\d.]+)\)/.exec(tf);
  return m ? [Number(m[1]), Number(m[2])] : [1, 1];
};

// Back (Today, at the desk) → front (Departures): the avatar turns round to face you.
const turnInto = scenes.findIndex((s) => s.id === '15-departures');

test.describe('avatar', () => {
  test('turns round from back to front going into Departures', async ({ page }) => {
    await openJourney(page);
    const outgoing = page.locator(
      '.scene[data-scene-id="14-today"] [data-id="me"][data-view="back"]',
    );
    const incoming = page.locator(
      '.scene[data-scene-id="15-departures"] [data-id="me"][data-view="front"]',
    );

    // First half: the back view narrows towards edge-on; the front view is not shown yet.
    await page.evaluate((i) => window.dayEngine.transition(i, 0.35), turnInto);
    await page.waitForFunction(() => window.dayEngine.frame()?.transitioning === true);
    await page.waitForTimeout(300);
    await expect(incoming).toBeHidden();
    const [ox, oy] = scaleOf(await outgoing.evaluate((el) => (el as SVGElement).style.transform));
    expect(ox).toBeLessThan(oy * 0.9); // squeezed horizontally = turning

    // Second half: the front view widens out of edge-on; the back view is gone.
    await page.evaluate((i) => window.dayEngine.transition(i, 0.65), turnInto);
    await page.waitForTimeout(300);
    await expect(outgoing).toBeHidden();
    await expect(incoming).toBeVisible();
    const [ix, iy] = scaleOf(await incoming.evaluate((el) => (el as SVGElement).style.transform));
    expect(ix).toBeLessThan(iy * 0.9);
  });

  test('is a bust on the bottom edge of the frame, never a full body', async ({ page }) => {
    await openJourney(page);
    await page.evaluate(() => window.dayEngine.goto(1, 0.3));
    await page.waitForFunction(() => document.documentElement.dataset.scene === '01-jadavpur');
    await page.waitForTimeout(400);
    const box = await page
      .locator('.scene[data-scene-id="01-jadavpur"] [data-id="me"]')
      .boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box).not.toBeNull();
    expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(vh - 2);
  });
});
