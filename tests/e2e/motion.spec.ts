import { expect, test } from '@playwright/test';
import { gotoScene, openJourney } from './helpers';

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('uses native scroll, freezes idle loops and shows bubbles fully typed', async ({ page }) => {
    await openJourney(page);
    await expect(page.locator('html')).toHaveClass(/reduced-motion/);

    // Jadavpur (scene 1) has the journey's one bubble after the intro.
    await gotoScene(page, 1, 0.5);
    const bubble = page.locator('.bubble');
    await expect(bubble).toBeVisible();
    const words = bubble.locator('.tw-word');
    const total = await words.count();
    expect(total).toBeGreaterThan(0);
    await expect(bubble.locator('.tw-word.is-on')).toHaveCount(total);
    // Fully shown immediately, no pop transform.
    expect(await bubble.evaluate((el) => (el as HTMLElement).style.transform)).toBe('');

    // Idle loops are frozen: the steam on the mug has no transform.
    const steam = page.locator('.scene.is-on .idle-steam').first();
    if (await steam.count())
      expect(await steam.evaluate((el) => (el as SVGElement).style.transform)).toBe('');
  });

  test('scenes crossfade at the midpoint instead of building part by part', async ({ page }) => {
    await openJourney(page);
    const host = page.locator('.scene[data-scene-id="03-kolkata"]');
    const opacity = () => host.evaluate((el) => Number(getComputedStyle(el).opacity));
    await page.evaluate(() => window.dayEngine.transition(3, 0.3));
    await page.waitForFunction(() => window.dayEngine.frame()?.transitioning === true);
    await page.waitForTimeout(500);
    await expect.poll(opacity, { timeout: 5000 }).toBe(0);
    await page.evaluate(() => window.dayEngine.transition(3, 0.7));
    await page.waitForTimeout(500);
    await expect.poll(opacity, { timeout: 5000 }).toBe(1);
    // Nothing is taken apart or built.
    const scaled = await page
      .locator('.scene.is-on .pt[transform], .scene.is-on .pt[style*="none"]')
      .count();
    expect(scaled).toBe(0);
  });
});
