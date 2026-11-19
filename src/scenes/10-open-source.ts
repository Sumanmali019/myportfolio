/**
 * 10 · ★ Highlight — open source. The room is his Lottie
 * (`src/assets/lottie/flutter-oss-contributor.json`), Suman at the desk in the middle, under
 * the monitor: the editor types the fix, the pull request is reviewed, checks pass and it
 * merges into flutter/flutter, the camera zooms into the contributors with his photo, then the
 * "Official Flutter Contributor" banner and confetti. Scrubbed by scroll, so it reverses too.
 *
 * The story up to the end of the zoom plays during the first beat (the reviewer's "LGTM" over
 * the monitor), so the second, his thought, is placed against the zoomed-in room it stays on.
 * On mobile the room also pans and scales with the zoom (`data-pan`, from the artwork): the
 * monitor across the width first, then the whole contributors page and banner.
 * While the fix is typed into the editor (Lottie frames 5–90) Suman's back view slides away for
 * his hands on the keyboard from above (`typing-top-view`, as at the other desks), typing as the
 * code appears; the engine plays the typing sound only then. After it, he is back at the desk.
 * "View the PR →" is a real link over the monitor's screen. Only the motion keyframes ship
 * (`flutter-oss-contributor.motion.json`).
 */
import type { SceneModule } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr } from '../lib/svg';
import motionJson from '../assets/lottie/flutter-oss-contributor.motion.json';
import typingJson from '../assets/lottie/typing-top-view.motion.json';

const OSS = motionJson as unknown as LottieAnimation;
const TYPING = typingJson as unknown as LottieAnimation;
/** The camera's zoom into the contributors, in Lottie frames. */
const ZOOM: [number, number] = [184, 216];
/** Hold progress where the zoom has landed (just before the second beat starts at ~0.5). */
const ZOOMED = 0.46;
/** Lottie frames in which the code is being typed. */
const CODE: [number, number] = [5, 90];

let play: ((frame: number) => void) | null = null;
let pan: SVGGraphicsElement | null = null;
let panFrom: number[] = [];
let panTo: number[] = [];
let me: SVGGraphicsElement | null = null;
let hands: SVGGraphicsElement | null = null;
let typing: ((frame: number) => void) | null = null;

const scene: SceneModule = {
  id: '10-open-source',
  prepare(svg) {
    const el = qs(svg, '[data-lottie="oss"]');
    play = el ? bindLottie(el, OSS) : null;
    pan = qs(svg, '[data-pan]');
    const v = (pan?.getAttribute('data-pan') ?? '').split(' ').map(Number);
    panFrom = v.slice(0, 3);
    panTo = v.slice(3, 6);
    me = qs(svg, '[data-oss-me]');
    hands = qs(svg, '[data-typing]');
    typing = hands ? bindLottie(hands, TYPING) : null;
  },
  update({ hold }) {
    const end = OSS.op - 1;
    const frame =
      hold < ZOOMED
        ? progress(hold, 0.04, ZOOMED) * ZOOM[1]
        : lerp(ZOOM[1], end, progress(hold, ZOOMED, 0.94));
    play?.(frame);
    // Back view → his hands on the keyboard while the code is typed, then back again.
    const k = easeInOut(
      Math.min(progress(hold, 0, 0.04), 1 - progress(frame, CODE[1], CODE[1] + 14)),
    );
    if (me) {
      setAttr(me, 'transform', k > 0 ? `translate(0 ${(k * 300).toFixed(1)})` : '');
      setAttr(me, 'opacity', (1 - progress(k, 0.4, 1)).toFixed(3));
    }
    if (hands) {
      setAttr(hands, 'transform', `translate(0 ${lerp(160, 0, k).toFixed(1)})`);
      setAttr(hands, 'opacity', progress(k, 0, 0.6).toFixed(3));
    }
    // The fingers move with the code (so they stop when the journey does), only while typing.
    if (k > 0 && frame > CODE[0] && frame < CODE[1])
      typing?.((frame * 1.5) % (TYPING.op - TYPING.ip));
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
