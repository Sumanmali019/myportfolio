/**
 * 03 · Kolkata office, 2022 — Cloudcraftz. On the monitor Suman builds his first two apps,
 * QOMIX then Tan90 (code, emulator with their real screens, release build — see
 * screens/app-build.ts and content/showcase.ts); the QOMIX card lands on a phone with its
 * downloads badge (the odometer starts), then Tan90 builds in.
 *
 * While he learns (monitor: Dart, Flutter, Testing, Firebase, React) we see Suman from behind,
 * centred at the desk; then his view hands over to his own eyes: as the hold reaches 0.22–0.36 his
 * back sinks out of the frame and his hands (the typing Lottie,
 * `src/assets/lottie/typing-top-view.json`) rise onto the keyboard and keep typing on the
 * shared idle clock — fingers tapping, keys flashing. Scroll-driven, so it reverses too.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeInOut, easeOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr, setScale } from '../lib/svg';
import { appCard } from '../screens/app-card';
import { appBuild } from '../screens/app-build';
import { learning, showcase } from '../content/showcase';
import motionJson from '../assets/lottie/typing-top-view.motion.json';
import { mountApps, mountScreen, screenCtx } from './shared';

const TYPING = motionJson as unknown as LottieAnimation;
/** Hand-over window, in hold progress. */
const SWAP: [number, number] = [0.22, 0.36];

let screens: Screen[] = [];
let late: SVGGraphicsElement | null = null;
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

const scene: SceneModule = {
  id: '03-kolkata',
  prepare(svg, { data }) {
    screens = [
      mountScreen(svg, 'app-build', (rect) => appBuild(rect, showcase, learning)),
      ...mountApps(svg, data, appCard, { qomix: [0.2, 0.35] }),
    ].filter((s): s is Screen => !!s);
    late = qs(svg, '[data-late-card]');
    back = innerWrap(svg.querySelector('[data-id="me"]'));
    hands = qs(svg, '[data-typing]');
    typing = hands ? bindLottie(hands, TYPING) : null;
  },
  update(state) {
    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);
    if (late) setScale(late, easeOut(progress(state.hold, 0.42, 0.52), 1.6));

    // Back view → his hands on the keyboard.
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
