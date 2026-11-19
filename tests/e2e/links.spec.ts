import { expect, test } from '@playwright/test';
import { profile } from '../../src/content/profile';
import { scenes } from '../../src/content/scenes';
import { buildLinks } from '../../src/content/schema';
import { gotoScene, openJourney } from './helpers';

const links = buildLinks(profile as Parameters<typeof buildLinks>[0]);

test.describe('links', () => {
  test('every content link is in the page as a real <a>', async ({ page }) => {
    await openJourney(page);
    const hrefs = [
      ...Object.values(links).map((l) => l.href),
      ...profile.projects.map((p) => p.url),
      profile.contact.linkedin,
      profile.contact.github,
      profile.contact.resume,
    ];
    for (const href of new Set(hrefs)) {
      await expect(page.locator(`a[href="${href}"]`).first(), href).toBeAttached();
    }
  });

  test('external links open safely', async ({ page }) => {
    await openJourney(page);
    // All at once (there are many: the CV's links too).
    const unsafe = await page
      .locator('a[target="_blank"]')
      .evaluateAll((els) =>
        els
          .filter(
            (el) =>
              !/noopener/.test(el.getAttribute('rel') ?? '') ||
              !/noreferrer/.test(el.getAttribute('rel') ?? ''),
          )
          .map((el) => el.getAttribute('href')),
      );
    expect(unsafe).toEqual([]);
  });

  test('stage links are keyboard-focusable and bring their scene on stage', async ({ page }) => {
    await openJourney(page);
    const stageLinks = page.locator('.link-layer [data-link]');
    const count = await stageLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const link = stageLinks.nth(i);
      const sceneIndex = Number(await link.getAttribute('data-scene-index'));
      await link.focus();
      await expect(link).toBeFocused();
      await page.waitForFunction((idx) => window.dayEngine.frame()?.index === idx, sceneIndex);
    }
  });

  test('the open-source PR link sits over the monitor', async ({ page }) => {
    await openJourney(page);
    const index = scenes.findIndex((s) => (s.links as readonly string[]).includes('flutter-pr'));
    await gotoScene(page, index, 0.5);
    const link = page.locator('.link-layer [data-link="flutter-pr"]');
    await expect(link).not.toHaveClass(/is-parked/);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', links['flutter-pr']!.href);
  });

  test('departures board: real links, the email copies, See my CV opens the CV', async ({
    page,
  }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await openJourney(page);
    const index = scenes.findIndex((s) => s.id === '15-departures');
    await gotoScene(page, index, 0.95);
    for (const key of ['email', 'linkedin', 'github', 'resume', 'cta-cv', 'restart']) {
      await expect(
        page.locator(`.link-layer [data-scene-index="${index}"][data-link="${key}"]`),
        key,
      ).not.toHaveClass(/is-parked/);
    }
    // The email row copies the address.
    const copy = page.getByRole('button', { name: /Copy email address/ });
    await copy.click();
    await expect(copy).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(profile.contact.email);
    // See my CV opens the CV.
    await page.locator(`.link-layer [data-link="cta-cv"]`).click();
    await expect(page.locator('#skip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#skip')).toBeHidden();
    await page.getByRole('link', { name: 'Replay the journey' }).click();
    await page.waitForFunction(() => window.dayEngine.frame()?.index === 0);
  });
});
