/** Transit · Hyderabad → Kolkata: the arc returns home; the laptop gets a REMOTE sticker. */
import type { SceneModule } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { qs, setScale } from '../lib/svg';
import { bindFlight } from './shared';

let fly: ((hold: number) => void) | null = null;
let sticker: SVGGraphicsElement | null = null;

const scene: SceneModule = {
  id: '07-flight-home',
  prepare(svg) {
    fly = bindFlight(svg);
    sticker = qs(svg, '[data-sticker]');
  },
  update({ hold }) {
    fly?.(hold);
    if (sticker) setScale(sticker, easeOut(progress(hold, 0.72, 0.82), 2.2));
  },
};

export default scene;
