/**
 * 09c · MeritHyre's Twilio refund, right after the A2P 10DLC onboarding. The room is his
 * Lottie (`src/assets/lottie/twilio-a2p-refund.json`), Suman at the desk under the monitor:
 * Twilio billing shows an unexpected −$300 charge, he files a support ticket, Twilio Support
 * replies and approves, the camera zooms into the +$300.00 credit, then the banner and confetti.
 * Scrubbed by scroll, so it reverses too. On mobile the room pans and scales with the camera
 * zoom (`data-pan`, from the artwork), as in chapter 10. Only the motion keyframes ship
 * (`twilio-a2p-refund.motion.json`).
 */
import type { SceneModule } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr } from '../lib/svg';
import motionJson from '../assets/lottie/twilio-a2p-refund.motion.json';

const REFUND = motionJson as unknown as LottieAnimation;
/** The camera's zoom into the credit, in Lottie frames. */
const ZOOM: [number, number] = [246, 276];

let play: ((frame: number) => void) | null = null;
let pan: SVGGraphicsElement | null = null;
let panFrom: number[] = [];
let panTo: number[] = [];

const scene: SceneModule = {
  id: '09-twilio-refund',
  prepare(svg) {
    const el = qs(svg, '[data-lottie="refund"]');
    play = el ? bindLottie(el, REFUND) : null;
    pan = qs(svg, '[data-pan]');
    const v = (pan?.getAttribute('data-pan') ?? '').split(' ').map(Number);
    panFrom = v.slice(0, 3);
    panTo = v.slice(3, 6);
  },
  update({ hold }) {
    // Done by 0.78: the credit and banner then stay, before the Neura live shelf comes up.
    const frame = progress(hold, 0.04, 0.78) * (REFUND.op - 1);
    play?.(frame);
    if (pan && panTo.length === 3) {
      const z = easeInOut(progress(frame, ...ZOOM));
      const [x, y, s] = panFrom.map((a, i) => lerp(a, panTo[i]!, z));
      setAttr(
        pan,
        'transform',
        `translate(${x!.toFixed(1)} ${y!.toFixed(1)}) scale(${s!.toFixed(4)})`,
      );
    }
  },
};

export default scene;
