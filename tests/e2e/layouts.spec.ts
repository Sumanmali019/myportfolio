import { expect, test } from '@playwright/test';
import { scenes } from '../../src/content/scenes';
import { gotoScene, openJourney } from './helpers';

test.describe('layouts', () => {
  test('picks the art set that matches the viewport', async ({ page }, info) => {
    await openJourney(page);
    const mobile = info.project.name === 'mobile';
    await expect(page.locator('[data-intro="desktop"]')).toBeVisible({ visible: !mobile });
    await expect(page.locator('[data-intro="mobile"]')).toBeVisible({ visible: mobile });

    await gotoScene(page, 3);
    const viewBox = await page
      .locator('.scene.is-on[data-scene-id="03-kolkata"] svg[data-scene]')
      .getAttribute('viewBox');
    expect(viewBox).toBe(mobile ? '0 0 390 844' : '0 0 1440 900');
  });

  test('every scene loads and the counters move forward', async ({ page }) => {
    // It visits every scene: give it time when the suite runs in parallel.
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openJourney(page);
    let lastYear = 0;
    for (let i = 0; i < scenes.length; i++) {
      await gotoScene(page, i, 0.5);
      const year = Number((await page.locator('#hud-year').textContent()) ?? '');
      expect(year, `scene ${scenes[i]!.id}`).toBeGreaterThanOrEqual(lastYear);
      lastYear = year;
    }
    expect(errors).toEqual([]);
  });

  test('keeps at most the current scene and a few neighbours mounted', async ({ page }) => {
    await openJourney(page);
    await gotoScene(page, 8);
    const mounted = await page.locator('.stage > .scene:not([data-intro])').count();
    expect(mounted).toBeLessThanOrEqual(4);
  });

  test('no horizontal scroll', async ({ page }) => {
    await openJourney(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
