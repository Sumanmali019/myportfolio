import { expect, test } from '@playwright/test';
import { profile } from '../../src/content/profile';
import { openJourney } from './helpers';

test.describe('Skip the journey', () => {
  test('opens, traps focus, closes on Esc and restores focus', async ({ page }) => {
    await openJourney(page);
    const open = page.locator('#skip-open');
    const dialog = page.locator('#skip');

    // On the intro the button is invisible to pointer users but appears on keyboard focus.
    await expect(open).toHaveCSS('opacity', '0');
    await expect(page.locator('.hud')).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(open).toBeFocused();
    await expect(open).toHaveCSS('opacity', '1');

    // Once the journey starts it is a normal visible button.
    await page.evaluate(() => window.dayEngine.goto(1, 0.3));
    await page.waitForFunction(() => document.documentElement.dataset.scene !== '00-intro');
    await expect(page.locator('.hud')).toBeVisible();
    await open.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 1, name: profile.name })).toBeVisible();

    // Tab well past the number of focusable items: focus must never leave the dialog.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('#skip'))).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#skip'))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('contains all the portfolio content as HTML in the static page', async ({ request }) => {
    const html = await (await request.get('/')).text();
    for (const text of [
      profile.name,
      profile.about,
      ...profile.experience.map((e) => e.company),
      ...profile.apps.map((a) => a.name),
      ...profile.projects.map((p) => p.name),
      ...profile.education.map((e) => e.school),
    ]) {
      expect(html, text).toContain(text.replace(/&/g, '&amp;'));
    }
    expect(html).toContain('application/ld+json');
  });

  test('shows the content instead of a blank stage if a scene fails to load', async ({ page }) => {
    await page.route(/_astro\/03-kolkata.*\.svg$/, (route) =>
      route.fulfill({ status: 500, body: 'nope' }),
    );
    await openJourney(page);
    await page.evaluate(() => window.dayEngine.goto(2, 0.5));
    await page.waitForFunction(() => document.documentElement.dataset.stage === 'failed');
    await expect(page.locator('#skip')).toBeVisible();
    await expect(page.locator('#stage')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();
  });
});
