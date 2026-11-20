/**
 * 04 · Kolkata, 2023 — the BeWorld interview. On the desk monitor (his Lottie,
 * `src/assets/lottie/interview-offer-mail.json`): a video call with the interviewer, captions
 * as they talk, he smiles and leaves the call; then a new mail lands, he opens it, and the
 * offer letter PDF zooms in with confetti. Scrubbed by scroll, so it plays backwards too.
 * Only the motion keyframes ship to the browser (`interview-offer-mail.motion.json`).
 */
import type { SceneModule } from '../engine/types';
import { progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs } from '../lib/svg';
import motionJson from '../assets/lottie/interview-offer-mail.motion.json';

const INTERVIEW = motionJson as unknown as LottieAnimation;

let play: ((frame: number) => void) | null = null;

const scene: SceneModule = {
  id: '04-interview',
  prepare(svg) {
    const el = qs(svg, '[data-lottie="interview"]');
    play = el ? bindLottie(el, INTERVIEW) : null;
  },
  update({ hold }) {
    play?.(progress(hold, 0, 0.94) * (INTERVIEW.op - 1));
  },
};

export default scene;
