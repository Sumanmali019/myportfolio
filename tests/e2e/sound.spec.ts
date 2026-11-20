import { expect, test } from '@playwright/test';
import { gotoScene, openJourney } from './helpers';

declare global {
  interface Window {
    __played: string[];
  }
}

test.describe('sound', () => {
  test.beforeEach(async ({ page }) => {
    // Record which sounds the page plays (the engine announces each one as a `day:sound` event),
    // without needing real audio output.
    await page.addInitScript(() => {
      window.__played = [];
      window.addEventListener('day:sound', (e) => {
        window.__played.push(String((e as CustomEvent).detail));
      });
    });
  });

  test('clicks, typing while it plays, and a mute button', async ({ page }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    await gotoScene(page, ids.indexOf('09-neura-apps'), 0.3);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(() => window.__played.some((s) => s === 'click'));
    await page.waitForFunction(() => window.__played.some((s) => s === 'typing'), null, {
      timeout: 8000,
    });

    // Mute: remembered after a reload.
    const mute = page.locator('[data-player-mute]');
    await mute.click();
    await expect(mute).toHaveAttribute('aria-label', 'Unmute');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.engine === 'ready');
    await expect(page.locator('[data-player-mute]')).toHaveAttribute('aria-label', 'Unmute');
    await page.locator('[data-player-mute]').click();
    await expect(page.locator('[data-player-mute]')).toHaveAttribute('aria-label', 'Mute');
  });

  test('the mail bell rings as the offer mail arrives', async ({ page }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    await gotoScene(page, ids.indexOf('04-interview'), 0.5);
    await page.keyboard.press('k');
    await page.waitForFunction(() => window.__played.some((s) => s === 'mail'), null, {
      timeout: 15000,
    });
  });

  test('open source: typing sounds only while the code is being written', async ({ page }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    const oss = ids.indexOf('10-open-source');
    // Past the GitHub issue list (0.02 → 0.2): the fix being typed.
    await gotoScene(page, oss, 0.21);
    await page.keyboard.press('k');
    await page.waitForFunction(() => window.__played.some((s) => s === 'typing'));
    await page.keyboard.press('k');
    // Past the editor (the PR review, the zoom): no typing.
    await gotoScene(page, oss, 0.45);
    await page.evaluate(() => (window.__played = []));
    await page.keyboard.press('k');
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__played.filter((s) => s === 'typing'))).toEqual([]);
  });

  test('the mouse close-up shows at a click, but not while his hands are on the keyboard', async ({
    page,
  }) => {
    await openJourney(page);
    const ids = await page.evaluate(() => window.dayEngine.scenes);
    const card = page.locator('#click-card');
    // Leaving the interview call (his hands on the mouse, not the keyboard): the close-up.
    await gotoScene(page, ids.indexOf('04-interview'), 0.483);
    await expect(card).toBeVisible();
    expect(Number(await card.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
    // Twilio onboarding's Test connection, typing hands on screen: no close-up.
    await gotoScene(page, ids.indexOf('09-neura-apps'), 0.9);
    await expect(card).toBeHidden();
  });
});
