/** 09 · Leading the team — video-call grid, sprint board, PR reviews, a mentoring 1:1. */
import type { Screen, SceneModule } from '../engine/types';
import { callGrid } from '../screens/call-grid';
import { standupBoard } from '../screens/standup-board';
import { mountScreen, screenCtx } from './shared';

let screens: Screen[] = [];

const scene: SceneModule = {
  id: '09-leading',
  prepare(svg) {
    screens = [
      mountScreen(svg, 'call-grid', callGrid),
      mountScreen(svg, 'standup-board', standupBoard),
    ].filter((s): s is Screen => !!s);
  },
  update(state) {
    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);
  },
};

export default scene;
