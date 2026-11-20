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

  test('every scene loads without errors', async ({ page }) => {
    // It visits every scene: give it time when the suite runs in parallel.
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openJourney(page);
    for (let i = 0; i < scenes.length; i++) await gotoScene(page, i, 0.5);
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

  test('the window and room light follow the desk clock', async ({ page }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    const lead = ids.indexOf('09-leading');
    const svg = page.locator('.scene[data-scene-id="09-leading"] > svg');
    const check = async (hold: number, part: string) => {
      await gotoScene(page, lead, hold);
      await expect(svg).toHaveAttribute('data-daypart', part);
    };
    await check(0.1, 'morning');
    await check(0.6, 'afternoon');
    await check(0.8, 'night');
    // At night the night window is shown (faded in), the day light is not.
    await page.waitForTimeout(1500);
    const op = (sel: string) =>
      svg
        .locator(sel)
        .first()
        .evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await op('.dl-night')).toBe(1);
    expect(await op('.dl-afternoon')).toBe(0);
  });

  test('the desk calendar shows the year of the scene on screen', async ({ page }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    for (const [id, year] of [
      ['03-kolkata', '2022'],
      ['09-neura-apps', '2025'],
    ] as const) {
      await gotoScene(page, ids.indexOf(id), 0.5);
      await expect(page.locator(`.scene[data-scene-id="${id}"] > svg [data-desk-year]`)).toHaveText(
        year,
      );
    }
  });
});
