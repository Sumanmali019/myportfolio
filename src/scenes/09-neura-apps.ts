/**
 * 09b · Neura Dynamics, the work — in the same format as chapters 03 and 05. Suman's back view
 * hands over to his hands on the keyboard (the typing Lottie), and on the big monitor he builds
 * what he shipped as Tech Lead (content/showcase.ts → `neuraShowcase`, screens/app-build.ts):
 *   0 → 0.48      Klass Online and Ayantra (Flutter, then their Python backend and Docker
 *                 files, their real screens on the phone carousel, release build), then
 *                 DocPharma and MeritHyre (React / Next.js, Python, Docker; their pages sliding
 *                 through a browser window, production build);
 *   0.48 → 0.74   each goes live — the two apps on their Play Store listings (their desk
 *                 phones stamp the downloads badge), the two sites deployed;
 *   0.76 → 1      MeritHyre's Twilio SMS integration: the A2P 10DLC onboarding ticks off step by
 *                 step, the connection tests OK and saves (screens/twilio-10dlc.ts). The
 *                 refund that followed is the next chapter (09-twilio-refund).
 * Scroll-driven, so it all reverses.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr } from '../lib/svg';
import { neuraShowcase } from '../content/showcase';
import { appBuild } from '../screens/app-build';
import { appCard } from '../screens/app-card';
import { twilio10dlc } from '../screens/twilio-10dlc';
import motionJson from '../assets/lottie/typing-top-view.motion.json';
import { mountApps, screenCtx } from './shared';

const TYPING = motionJson as unknown as LottieAnimation;
/** Back view → hands on the keyboard (hold progress). */
const SWAP: [number, number] = [0.03, 0.12];
/** Building, then the releases; then the Twilio onboarding takes the monitor. */
const BUILD = { start: 0, buildEnd: 0.48, end: 0.74, stop: 0.76 };
const TWILIO: [number, number] = [0.76, 1];

let screens: Screen[] = [];
let back: SVGGElement | null = null;
let hands: SVGGraphicsElement | null = null;
let typing: ((frame: number) => void) | null = null;

/** Wrap a part's children so the scene can move them without touching the part itself. */
function innerWrap(part: Element | null): SVGGElement | null {
  if (!part) return null;
  const existing = part.querySelector(':scope > g[data-hand-over]');
  if (existing) return existing as SVGGElement;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-hand-over', '');
  while (part.firstChild) g.appendChild(part.firstChild);
  part.appendChild(g);
  return g;
}

/** When an app's downloads badge stamps in: with the LIVE stamp of its store listing. */
const badgeAt = (key: string): [number, number] => {
  const i = neuraShowcase.findIndex((s) => s.key === key);
  const span = (BUILD.end - BUILD.buildEnd) / neuraShowcase.length;
  const a = BUILD.buildEnd + span * i;
  return [a + span * 0.55, a + span * 0.7];
};

const scene: SceneModule = {
  id: '09-neura-apps',
  prepare(svg, { data }) {
    const monitor = qs(svg, '[data-screen="app-build"]');
    screens = [
      monitor ? appBuild(monitor, neuraShowcase, [], BUILD) : null,
      monitor ? twilio10dlc(monitor, TWILIO) : null,
      ...mountApps(svg, data, appCard, {
        'klass-online': badgeAt('klass-online'),
        ayantra: badgeAt('ayantra'),
      }),
    ].filter((s): s is Screen => !!s);
    back = innerWrap(svg.querySelector('[data-id="me"]'));
    hands = qs(svg, '[data-typing]');
    typing = hands ? bindLottie(hands, TYPING) : null;
  },
  update(state) {
    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);

    // Back view → his hands on the keyboard, typing for the rest of the chapter.
    const k = easeInOut(progress(state.hold, ...SWAP));
    if (back) {
      setAttr(back, 'transform', k > 0 ? `translate(0 ${(k * 260).toFixed(1)})` : '');
      setAttr(back, 'opacity', (1 - progress(k, 0.4, 1)).toFixed(3));
    }
    if (hands) {
      setAttr(hands, 'transform', `translate(0 ${lerp(160, 0, k).toFixed(1)})`);
      setAttr(hands, 'opacity', progress(k, 0, 0.6).toFixed(3));
    }
    if (k > 0) typing?.(state.reduced ? 0 : (state.idle * TYPING.fr) % (TYPING.op - TYPING.ip));
  },
};

export default scene;
