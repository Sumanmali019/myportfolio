import { expect, test } from '@playwright/test';
import { gotoScene, openJourney } from './helpers';

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('uses native scroll, freezes idle loops and shows bubbles fully typed', async ({ page }) => {
    await openJourney(page);
    await expect(page.locator('html')).toHaveClass(/reduced-motion/);
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);

    // Scene 03 has a speech bubble in its first beat.
    await gotoScene(page, 3, 0.3);
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

  test('scenes crossfade instead of building part by part', async ({ page }) => {
    await openJourney(page);
    await gotoScene(page, 2, 0.5);
    // Halfway through scene 3's enter transition: half a screen before its hold starts.
    await page.evaluate(() => {
      window.dayEngine.goto(3, 0);
      scrollTo(0, Math.max(0, scrollY - innerHeight * 0.5));
    });
    await page.waitForFunction(() => window.dayEngine.frame()?.transitioning === true);
    const opacity = await page
      .locator('.scene[data-scene-id="03-kolkata"]')
      .evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    // Parts are not scaled during the crossfade.
    const scaled = await page
      .locator('.scene[data-scene-id="03-kolkata"] [data-id]')
      .evaluateAll(
        (els) => els.filter((e) => (e as SVGElement).style.transform.includes('scale')).length,
      );
    expect(scaled).toBe(0);
  });
});

test.describe('full motion', () => {
  test('bubbles type word by word', async ({ page }) => {
    await openJourney(page);
    await gotoScene(page, 3, 0.2);
    const bubble = page.locator('.bubble');
    await expect(bubble).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/\blenis\b/);
  });
});
