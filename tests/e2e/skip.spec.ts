import { expect, test } from '@playwright/test';
import { profile } from '../../src/content/profile';
import { openJourney } from './helpers';

test.describe('Static content', () => {
  test('no calendar and no Skip button on the page', async ({ page }) => {
    await openJourney(page);
    await expect(page.locator('#skip-open')).toHaveCount(0);
    await expect(page.locator('#skip')).toBeHidden();
    await expect(page.locator('.hud-cal, #hud-month, #hud-year')).toHaveCount(0);
    await page.evaluate(() => window.dayEngine.goto(3, 0.5));
    await page.waitForFunction(() => document.documentElement.dataset.scene === '03-kolkata');
    await expect(page.locator('.stage [data-id="calendar"]')).toHaveCount(0);
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
