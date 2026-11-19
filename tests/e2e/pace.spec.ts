import { expect, test } from '@playwright/test';
import { gotoScene, openJourney } from './helpers';

test.describe('pace', () => {
  test('plays like a video: play, pause, speed, time', async ({ page }) => {
    await openJourney(page);
    const player = page.locator('[data-player]');
    await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(player.locator('[data-player-total]')).not.toHaveText('0:00');
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-travel', 'auto');
    await page.waitForFunction(() => window.scrollY > 200, null, { timeout: 10_000 });
    await expect(player.locator('[data-player-now]')).not.toHaveText('0:00', { timeout: 5000 });
    // Speed: 2×.
    await player.getByRole('button', { name: 'Playback speed' }).click();
    await player.getByRole('menuitemradio', { name: '2×' }).click();
    await expect(player.locator('[data-player-speed-label]')).toHaveText('2×');
    // Pause.
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-travel', 'manual');
  });

  test('your own scroll pauses playback', async ({ page }) => {
    await openJourney(page);
    await page.keyboard.press('k');
    await expect(page.locator('html')).toHaveAttribute('data-travel', 'auto');
    await page.waitForFunction(() => document.documentElement.dataset.scene !== '00-intro', null, {
      timeout: 15_000,
    });
    // A wheel (or, on a phone, a touch) of your own.
    if (test.info().project.name === 'mobile') await page.touchscreen.tap(200, 300);
    else {
      await page.mouse.move(400, 400);
      await page.mouse.wheel(0, 200);
    }
    await expect(page.locator('html')).toHaveAttribute('data-travel', 'manual');
  });

  test('however fast you scroll, the story moves at a steady pace', async ({ page }) => {
    await openJourney(page);
    // One huge flick: the scroll jumps far ahead, the view follows at its top speed.
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 20_000);
    // Sample the view on the page's own clock for a second.
    const samples = await page.evaluate(
      () =>
        new Promise<Array<[number, number]>>((done) => {
          const out: Array<[number, number]> = [];
          const t0 = performance.now();
          const tick = (now: number) => {
            out.push([now, window.dayEngine.frame()?.u ?? 0]);
            if (now - t0 < 1000) requestAnimationFrame(tick);
            else done(out);
          };
          requestAnimationFrame(tick);
        }),
    );
    const [t0, u0] = samples[0]!;
    const [t1, u1] = samples[samples.length - 1]!;
    const speed = (u1 - u0) / ((t1 - t0) / 1000);
    // It moves, smoothly, but never faster than ~2.4 screens a second.
    expect(u1).toBeGreaterThan(u0);
    expect(speed).toBeLessThan(2.5);
    // Frame to frame, no jumps (a sample can span two engine frames: they are separate rAFs).
    for (let i = 1; i < samples.length; i++) {
      const dt = (samples[i]![0] - samples[i - 1]![0]) / 1000;
      expect(samples[i]![1] - samples[i - 1]![1]).toBeLessThanOrEqual(
        2.4 * 2 * Math.min(dt, 0.1) + 0.01,
      );
    }
  });

  test('waits at each live-projects shelf until you choose to carry on', async ({ page }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    const index = ids.indexOf('03-kolkata');
    await gotoScene(page, index, 0.8);
    // Scroll hard past the shelf: the journey stops there and asks.
    await page.mouse.move(400, 400);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 3000);
    const shelf = page.locator(`.shelf[data-live-scene="${index}"]`);
    await expect(shelf).toHaveClass(/is-asking/, { timeout: 8000 });
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.dayEngine.frame()?.index)).toBe(index);
    await expect(shelf.getByRole('link', { name: /QOMIX/ })).toBeVisible();
    // "No thanks": now it moves on to the next chapter.
    await shelf.getByRole('button', { name: /No thanks, continue/ }).click();
    await page.mouse.wheel(0, 3000);
    await page.waitForFunction((i) => (window.dayEngine.frame()?.index ?? 0) > i, index, {
      timeout: 10_000,
    });
  });

  test('counts down 15 s at a shelf, and opening a project stops the countdown', async ({
    page,
  }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    const index = ids.indexOf('03-kolkata');
    await gotoScene(page, index, 0.8);
    await page.mouse.move(400, 400);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 3000);
    const shelf = page.locator(`.shelf[data-live-scene="${index}"]`);
    await expect(shelf).toHaveClass(/is-asking/, { timeout: 8000 });
    const count = shelf.locator('[data-live-count]');
    // It counts down from 15 s (read it, wait, read again: it has gone down by ~2–3 s).
    await expect(count).toHaveText(/^\d+s$/);
    const secs = async () => Number((await count.textContent())?.replace('s', ''));
    const first = await secs();
    expect(first).toBeLessThanOrEqual(15);
    await page.waitForTimeout(2500);
    const later = await secs();
    expect(first - later).toBeGreaterThanOrEqual(1);
    expect(first - later).toBeLessThanOrEqual(4);
    const left = await shelf.evaluate((el) => Number(el.style.getPropertyValue('--ask-left')));
    expect(left).toBeLessThan(0.95);
    // A yes (opening one) stops the countdown: it waits for you.
    const popup = page.waitForEvent('popup');
    await shelf.getByRole('link', { name: /QOMIX/ }).click();
    await (await popup).close();
    await expect(shelf).toHaveClass(/is-chosen/);
    await expect(count).toBeHidden();
  });

  test('scrolling yourself shows as playing, and as paused when you stop', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'mouse wheel only');
    await openJourney(page);
    const play = page.locator('[data-player-play]');
    await expect(play).toHaveAttribute('aria-label', 'Play');
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 900);
    await expect(play).toHaveAttribute('aria-label', 'Pause', { timeout: 2000 });
    await expect(page.locator('[data-player]')).toHaveClass(/is-playing/);
    // Stop scrolling: it settles, then shows as paused.
    await expect(play).toHaveAttribute('aria-label', 'Play', { timeout: 5000 });
    await expect(page.locator('html')).toHaveAttribute('data-travel', 'manual');
  });
});
