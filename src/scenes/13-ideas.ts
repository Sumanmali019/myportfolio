/** 13 · Ideas — the sun sinks behind the Kolkata skyline while post lines drift up as thoughts. */
import type { SceneModule } from '../engine/types';
import { lerp } from '../lib/math';
import { qs, setAttr } from '../lib/svg';

let sun: SVGGraphicsElement | null = null;

const scene: SceneModule = {
  id: '13-ideas',
  prepare(svg) {
    sun = qs(svg, '[data-sunset]');
  },
  update({ hold }) {
    if (sun) setAttr(sun, 'transform', `translate(0 ${lerp(-30, 120, hold).toFixed(1)})`);
  },
};

export default scene;
