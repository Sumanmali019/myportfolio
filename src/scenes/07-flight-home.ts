/**
 * Transit · Hyderabad → Kolkata: the seat-back screen plays the return in-flight map (his
 * Lottie, `src/assets/lottie/india-flight-hyd-ccu.json`): India draws in, the pins drop, the
 * camera zooms to the route and the plane flies home, then the laptop gets a REMOTE sticker.
 * Scrubbed by scroll; only the motion keyframes ship (`india-flight-hyd-ccu.motion.json`).
 */
import type { SceneModule } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setScale } from '../lib/svg';
import motionJson from '../assets/lottie/india-flight-hyd-ccu.motion.json';
import { bindFlight } from './shared';

const MAP = motionJson as unknown as LottieAnimation;

let fly: ((hold: number) => void) | null = null;
let play: ((frame: number) => void) | null = null;
let sticker: SVGGraphicsElement | null = null;

const scene: SceneModule = {
  id: '07-flight-home',
  prepare(svg) {
    // No [data-route] here: bindFlight only drives the takeoff outside.
    fly = bindFlight(svg);
    const el = qs(svg, '[data-lottie="flight-map"]');
    play = el ? bindLottie(el, MAP) : null;
    sticker = qs(svg, '[data-sticker]');
  },
  update({ hold }) {
    fly?.(hold);
    play?.(progress(hold, 0.04, 0.8) * (MAP.op - 1));
    if (sticker) setScale(sticker, easeOut(progress(hold, 0.8, 0.9), 2.2));
  },
};

export default scene;
