/**
 * A desk chapter that builds on the big monitor (chapters 09b, 11a and 11b): Suman's back view hands over to his hands on the keyboard (the typing Lottie),
 * and the monitor shows the product being built (screens/app-build.ts: its code file by file,
 * its real pages sliding through a browser window, a production build, then the deployed site).
 * `extra` can take the monitor afterwards (e.g. Khyaati's Razorpay checkout). Scroll-driven.
 */
import type { EngineData, Screen, SceneModule } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr } from '../lib/svg';
import type { Showcase } from '../content/showcase';
import { appBuild, type AppBuildOptions } from '../screens/app-build';
import motionJson from '../assets/lottie/typing-top-view.motion.json';
import { screenCtx, smoothDaylight } from './shared';

const TYPING = motionJson as unknown as LottieAnimation;
/** Back view → hands on the keyboard (hold progress), while the first project is introduced. */
const SWAP: [number, number] = [0.005, 0.03];

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

export function deskBuildScene(opts: {
  id: string;
  apps: Showcase[];
  build: AppBuildOptions;
  extra?: (monitor: SVGGraphicsElement) => Screen | null;
  /** More screens in the room (e.g. the desk phones). */
  more?: (svg: SVGSVGElement, data: EngineData) => Array<Screen | null>;
  /**
   * The chapter's own day: [hold, minutes] stops for the desk clock. The window and the room's
   * light then go smoothly from morning to night with it (smoothDaylight).
   */
  day?: Array<[number, number]>;
}): SceneModule {
  const day = opts.day;
  const minutesAt = (hold: number) => {
    if (!day) return 0;
    for (let i = 1; i < day.length; i++) {
      const [h0, m0] = day[i - 1]!;
      const [h1, m1] = day[i]!;
      if (hold <= h1) return lerp(m0, m1, progress(hold, h0, h1));
    }
    return day[day.length - 1]![1];
  };
  let daylight: ((minutes: number) => void) | null = null;
  let screens: Screen[] = [];
  let back: SVGGElement | null = null;
  let hands: SVGGraphicsElement | null = null;
  let typing: ((frame: number) => void) | null = null;
  return {
    id: opts.id,
    prepare(svg, { data }) {
      const monitor = qs(svg, '[data-screen="app-build"]');
      screens = [
        monitor ? appBuild(monitor, opts.apps, [], opts.build) : null,
        monitor && opts.extra ? opts.extra(monitor) : null,
        ...(opts.more?.(svg, data) ?? []),
      ].filter((s): s is Screen => !!s);
      daylight = day ? smoothDaylight(svg) : null;
      back = innerWrap(svg.querySelector('[data-id="me"]'));
      hands = qs(svg, '[data-typing]');
      typing = hands ? bindLottie(hands, TYPING) : null;
    },
    ...(day ? { clock: minutesAt } : {}),
    update(state) {
      daylight?.(minutesAt(state.hold));
      const ctx = screenCtx(state);
      for (const s of screens) s.update(ctx);
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
}
