/**
 * 00 · Hello — Suman's waving avatar (his Lottie, `src/assets/lottie/avatar-hand-wave.json`)
 * on the night sky, with a "Hi! Welcome to my portfolio" bubble.
 *
 * The wave plays on the shared idle clock (first frame only with reduced motion). The bubble
 * pops away as soon as you scroll; the stars set as the hold advances. The avatar is the `me`
 * part, so the transition glides it into its place at the Jadavpur gate (chapter 01).
 */
import type { SceneModule } from '../engine/types';
import { easeIn, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr, setScale } from '../lib/svg';
import waveJson from '../assets/lottie/avatar-hand-wave.json';
import { takeOver } from './shared';

const WAVE = waveJson as unknown as LottieAnimation;

let wave: ((frame: number) => void) | null = null;
let bubble: SVGGraphicsElement | null = null;
let stars: SVGGraphicsElement | null = null;

const scene: SceneModule = {
  id: '00-intro',
  prepare(svg) {
    takeOver(svg);
    const lottie = qs(svg, '[data-lottie="avatar-wave"]');
    wave = lottie ? bindLottie(lottie, WAVE) : null;
    bubble = qs(svg, '[data-greeting-bubble]');
    stars = qs(svg, '[data-stars]');
  },
  update({ hold, idle, reduced }) {
    wave?.(reduced ? 0 : (idle * WAVE.fr) % (WAVE.op - WAVE.ip));
    if (bubble) setScale(bubble, 1 - easeIn(progress(hold, 0.15, 0.3)));
    if (stars) setAttr(stars, 'transform', `translate(0 ${(easeIn(hold) * 120).toFixed(1)})`);
  },
};

export default scene;
