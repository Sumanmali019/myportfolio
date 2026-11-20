/**
 * 03 · Kolkata office, 2022 — Cloudcraftz. On the monitor Suman's first two apps, Tan90 then
 * QOMIX, each with a description and its real screens one at a time, each named (see
 * screens/app-build.ts and content/showcase.ts), then live on the Play Store; the Tan90 card is
 * on the desk's first phone from the start and QOMIX's builds in beside it when QOMIX is
 * introduced. The art draws QOMIX on the first phone and Tan90 on the late one, so the two
 * phones swap names here (prepare).
 *
 * While he learns (monitor: Dart, Flutter, Testing, Firebase, React) we see Suman from behind,
 * centred at the desk; then his view hands over to his own eyes: as the lessons end (SWAP) his
 * back sinks out of the frame and his hands (the typing Lottie,
 * `src/assets/lottie/typing-top-view.json`) rise onto the keyboard and keep typing on the
 * shared idle clock — fingers tapping, keys flashing. Scroll-driven, so it reverses too.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeInOut, easeOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr, setScale } from '../lib/svg';
import { appCard } from '../screens/app-card';
import { appBuild, appWindows, liveAt } from '../screens/app-build';
import { doneAt, SECONDS as chapter } from '../content/pacing';
import { learning, showcase } from '../content/showcase';
import motionJson from '../assets/lottie/typing-top-view.motion.json';
import { mountApps, mountScreen, screenCtx } from './shared';

const TYPING = motionJson as unknown as LottieAnimation;
/**
 * The chapter in seconds at 1× (weight in content/scenes.ts = SECONDS × AUTO_SPEED): the
 * lessons, then Tan90 and QOMIX one after the other, done before the "see them live" shelf
 * (content/live.ts).
 */
const SECONDS = chapter['03-kolkata'];
const LEARN = 4 / SECONDS;
const BUILD = { learnEnd: LEARN, end: doneAt(SECONDS) };
/** Hand-over window, in hold progress: at the end of the lessons. */
const SWAP: [number, number] = [LEARN * 0.6, LEARN];
/** The second app's card (QOMIX) builds in on the desk as it is introduced. */
const SECOND = appWindows(showcase, BUILD.learnEnd, BUILD.end)[1]!;

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
    // Tan90 plays first: the art's first phone becomes Tan90's, its late-arriving one QOMIX's.
    const first = qs(svg, '[data-screen="app-qomix"]');
    const second = qs(svg, '[data-screen="app-ten90"]');
    first?.setAttribute('data-screen', 'app-ten90');
    second?.setAttribute('data-screen', 'app-qomix');
    screens = [
      mountScreen(svg, 'app-build', (rect) => appBuild(rect, showcase, learning, BUILD)),
      ...mountApps(svg, data, appCard, {
        ten90: liveAt(showcase, 'ten90', BUILD.learnEnd, BUILD.end),
        qomix: liveAt(showcase, 'qomix', BUILD.learnEnd, BUILD.end),
      }),
    ].filter((s): s is Screen => !!s);
    late = qs(svg, '[data-late-card]');
    back = innerWrap(svg.querySelector('[data-id="me"]'));
    hands = qs(svg, '[data-typing]');
    typing = hands ? bindLottie(hands, TYPING) : null;
  },
  update(state) {
    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);
    if (late)
      setScale(late, easeOut(progress(state.hold, SECOND.a, SECOND.a + 0.5 * SECOND.k), 1.6));

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
