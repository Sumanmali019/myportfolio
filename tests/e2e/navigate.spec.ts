import { expect, test } from '@playwright/test';
import { profile } from '../../src/content/profile';
import { gotoScene, openJourney } from './helpers';

test.describe('getting around', () => {
  test('first and last screens can skip the animation and show the CV', async ({ page }) => {
    await openJourney(page);
    const cv = page.locator('#cv-open');
    await expect(cv).toBeVisible();
    await cv.click();
    const dialog = page.locator('#skip');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 1, name: profile.name })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Experience' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Not in the middle of the journey…
    await gotoScene(page, 3, 0.5);
    await expect(cv).toBeHidden();
    // …but again on the last screen.
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    await gotoScene(page, ids.length - 1, 0.5);
    await expect(cv).toBeVisible();
  });

  test('seek to the end on the progress bar, and back to the top', async ({ page }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    const bar = page.locator('[data-player-seek]');
    const box = (await bar.boundingBox())!;
    await bar.click({ position: { x: box.width - 2, y: box.height / 2 } });
    await page.waitForFunction((last) => window.dayEngine.frame()?.index === last, ids.length - 1, {
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Move to the top' }).click();
    await page.waitForFunction(() => window.dayEngine.frame()?.index === 0, null, {
      timeout: 10_000,
    });
    // Next chapter.
    await page.getByRole('button', { name: 'Next chapter' }).click();
    await page.waitForFunction(() => window.dayEngine.frame()?.index === 1, null, {
      timeout: 10_000,
    });
  });

  test('live shelves link to the exact Play Store listings', async ({ page }) => {
    await openJourney(page);
    for (const key of ['qomix', 'ten90', 'beworld', 'cadgk', 'klass-online', 'ayantra']) {
      const href = await page.locator(`[data-live-key="${key}"]`).getAttribute('href');
      expect(href, key).toMatch(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=/);
    }
  });
});
