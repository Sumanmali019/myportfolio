/**
 * 01 · Jadavpur, 2017 — Suman at the main gate. The background lives on the shared idle
 * clock (clouds, birds, swaying trees, falling leaves — see engine/loop.ts), so this module
 * has nothing to drive itself.
 */
import type { SceneModule } from '../engine/types';

const scene: SceneModule = {
  id: '01-jadavpur',
  prepare() {},
  update() {},
};

export default scene;
