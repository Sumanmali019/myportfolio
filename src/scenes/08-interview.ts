/**
 * 08 · Kolkata, 2024 — the Neura Dynamics interview. Same story as chapter 04 on the desk
 * monitor (his Lottie, `src/assets/lottie/interview-offer-mail-neura.json`): the video call,
 * then the offer mail and its PDF. Scrubbed by scroll; only the motion keyframes ship
 * (`interview-offer-mail-neura.motion.json`).
 */
import type { SceneModule } from '../engine/types';
import { progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs } from '../lib/svg';
import motionJson from '../assets/lottie/interview-offer-mail-neura.motion.json';

const INTERVIEW = motionJson as unknown as LottieAnimation;

let play: ((frame: number) => void) | null = null;

const scene: SceneModule = {
  id: '08-interview',
  prepare(svg) {
    const el = qs(svg, '[data-lottie="interview"]');
    play = el ? bindLottie(el, INTERVIEW) : null;
  },
  update({ hold }) {
    play?.(progress(hold, 0.04, 0.94) * (INTERVIEW.op - 1));
  },
};

export default scene;
