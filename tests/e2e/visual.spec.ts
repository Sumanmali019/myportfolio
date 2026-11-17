/**
 * Visual snapshots at the middle of each scene's hold. Off by default (baselines are
 * platform-specific); run with `pnpm test:visual`, and `--update-snapshots` to (re)record.
 */
import { expect, test } from '@playwright/test';
import { scenes } from '../../src/content/scenes';
import { gotoScene, openJourney } from './helpers';

test.skip(!process.env.VISUAL, 'set VISUAL=1 to run visual snapshots');

test.describe('visual', () => {
  // Freeze idle loops so screenshots are deterministic.
  test.use({ reducedMotion: 'reduce' });

  for (const [i, scene] of scenes.entries()) {
    test(scene.id, async ({ page }) => {
      await openJourney(page);
      await gotoScene(page, i, 0.5);
      await expect(page).toHaveScreenshot(`${scene.id}.png`, { fullPage: false });
    });
  }
});
