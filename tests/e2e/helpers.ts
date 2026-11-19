import type { Page } from '@playwright/test';

declare global {
  interface Window {
    dayEngine: {
      goto(index: number, frac?: number): void;
      transition(index: number, t?: number): void;
      scenes: string[];
      frame(): {
        index: number;
        id: string;
        beat: number;
        transitioning: boolean;
        u: number;
      } | null;
    };
  }
}

/** Load the page and wait until the engine has booted. */
export async function openJourney(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => document.documentElement.dataset.engine === 'ready');
}

/** Jump to a point in a scene's hold and wait for its SVG to be on stage. */
export async function gotoScene(page: Page, index: number, frac = 0.5): Promise<string> {
  await page.evaluate(([i, f]) => window.dayEngine.goto(i!, f!), [index, frac]);
  const id = await page.evaluate((i) => window.dayEngine.scenes[i]!, index);
  await page.waitForFunction((sceneId) => {
    const host = document.querySelector(`.scene.is-on[data-scene-id="${sceneId}"]`);
    return !!host?.querySelector('svg') && document.documentElement.dataset.scene === sceneId;
  }, id);
  // Let the frame settle (bubble placement, link positioning).
  await page.waitForTimeout(400);
  return id;
}
