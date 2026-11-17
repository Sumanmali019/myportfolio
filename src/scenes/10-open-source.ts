/**
 * 10 · ★ Highlight — open source. Double-length hold under a spotlight; the Flutter PR plays
 * slowly (see screens/pr-merge). "View the PR →" is a real link over the screen.
 */
import type { Screen, SceneModule } from '../engine/types';
import { prMerge } from '../screens/pr-merge';
import { mountScreen, screenCtx } from './shared';

let pr: Screen | null = null;

const scene: SceneModule = {
  id: '10-open-source',
  prepare(svg) {
    pr = mountScreen(svg, 'pr-merge', prMerge);
  },
  update(state) {
    pr?.update(screenCtx(state));
  },
};

export default scene;
