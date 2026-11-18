/**
 * Transit · Kolkata → Hyderabad: a plane takes off outside while the seat-back screen plays
 * the in-flight map (his Lottie, `src/assets/lottie/india-flight-ccu-hyd.json`): India draws in,
 * the pins drop, the camera zooms to the route and the plane flies Kolkata → Hyderabad.
 * Scrubbed by scroll; only the motion keyframes ship (`india-flight-ccu-hyd.motion.json`).
 */
import type { SceneModule } from '../engine/types';
import { progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs } from '../lib/svg';
import motionJson from '../assets/lottie/india-flight-ccu-hyd.motion.json';
import { bindFlight } from './shared';

const MAP = motionJson as unknown as LottieAnimation;

let fly: ((hold: number) => void) | null = null;
let play: ((frame: number) => void) | null = null;

const scene: SceneModule = {
  id: '04-flight-hyd',
  prepare(svg) {
    // No [data-route] here: bindFlight only drives the takeoff outside.
    fly = bindFlight(svg);
    const el = qs(svg, '[data-lottie="flight-map"]');
    play = el ? bindLottie(el, MAP) : null;
  },
  update({ hold }) {
    fly?.(hold);
    play?.(progress(hold, 0.04, 0.94) * (MAP.op - 1));
  },
};

export default scene;
