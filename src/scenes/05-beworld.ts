/**
 * 05 · Hyderabad, 2023 — BeWorld, day to night. The room is a Lottie
 * (`src/assets/lottie/day-night-hyd.json`) scrubbed by scroll:
 *   0 → 0.30      day: the release pipeline on the monitor lights up stage by stage;
 *   0.30 → 0.74   still day: on the monitor Suman builds BeWorld, then Current Affairs Daily GK
 *                 (code, their real screens on a phone carousel, release build) and each goes
 *                 live on its Play Store listing (screens/app-build.ts, content/showcase.ts);
 *                 the desk phones show the real app cards, whose downloads badges stamp in
 *                 with a burst of confetti as each listing goes live;
 *   0.74 → 0.90   dusk falls; the monitor, phones and day props fade;
 *   0.90 → 1      night: the lamp, and the laptop with Scaler on screen (its logo and the
 *                 module, DSA through to the capstone) as the skill graph lights up.
 * The whole animation (the stops above) plays over the first ANIM_END of the hold; after the
 * night studying has finished, the room rests while its "see them live" shelf comes in
 * (content/live.ts), so the links never show while it is still playing.
 * The overlays (monitor, phones) take their opacity from the Lottie layers under them.
 * The monitor is drawn bigger than the Lottie's (as in chapter 03); its screen shows the
 * Lottie's pipeline scaled up, then the builds. Suman sits centred at the desk, seen from behind (the Lottie's own 'me' layers, drawn on their
 * own over the desk things and dimmed with the room at night). While the code types (SWAP_IN →
 * SWAP_OUT) his back sinks away and his hands rise onto the keyboard and type — the typing Lottie,
 * as in chapter 03 — then he sits back up for the store listings and the night.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeInOut, easeOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, qsa, screenFrame, setAttr, setText, svgEl, svgText } from '../lib/svg';
import scalerLogo from '../assets/apps/scaler-logo.webp?url';
import { beworldShowcase } from '../content/showcase';
import { appBuild } from '../screens/app-build';
import { appCard } from '../screens/app-card';
import motionJson from '../assets/lottie/day-night-hyd.motion.json';
import typingJson from '../assets/lottie/typing-top-view.motion.json';
import { mountApps, screenCtx } from './shared';

const DAY_NIGHT = motionJson as unknown as LottieAnimation;
const TYPING = typingJson as unknown as LottieAnimation;
/** Back view → hands on the keyboard, and back again (hold progress). */
/** The hold progress by which everything has played (the stops below are in 0–1 of this). */
const ANIM_END = 0.84;
const SWAP_IN: [number, number] = [0.28, 0.36];
const SWAP_OUT: [number, number] = [0.62, 0.7];

/** Hold → Lottie frame, piecewise: [hold, frame] stops. */
const FRAMES: Array<[number, number]> = [
  [0, 0],
  [0.3, 110],
  [0.74, 118],
  [0.9, 180],
  [1, 299],
];
/** App builds and store listings on the monitor. */
const BUILD: { start: number; buildEnd: number; end: number } = {
  start: 0.32,
  buildEnd: 0.58,
  end: 0.74,
};
/**
 * The desk clock's day, matching the room's: [stop, minutes] in the same 0–1 as the stops above
 * — 10 AM, the afternoon of builds, dusk at 5 PM, night from 7:30, studying till late.
 */
const DAY: Array<[number, number]> = [
  [0, 600],
  [0.3, 690],
  [0.74, 1020],
  [0.9, 1170],
  [1, 1410],
];
/** Confetti burst: while the store listings go live. */
const BURST: [number, number] = [0.62, 0.8];

let screens: Screen[] = [];
let play: ((frame: number) => void) | null = null;
let playMe: ((frame: number) => void) | null = null;
let playPipe: ((frame: number) => void) | null = null;
let typing: ((frame: number) => void) | null = null;
let back: SVGGElement | null = null;
let hands: SVGGraphicsElement | null = null;
let darkness: Element | null = null;
let sink = 260;
let rise = 160;
let fades: Array<{ el: SVGGraphicsElement; from: Element | null }> = [];
let confetti: Array<{ el: SVGGraphicsElement; vx: number; vy: number; spin: number }> = [];
let origin: [number, number] = [0, 0];

const COLORS = ['#c8674a', '#3f8f8b', '#e3a83b', '#5b5aa8', '#b5578a', '#5cc38a'];

function frameAt(hold: number): number {
  for (let i = 1; i < FRAMES.length; i++) {
    const [h0, f0] = FRAMES[i - 1]!;
    const [h1, f1] = FRAMES[i]!;
    if (hold <= h1) return lerp(f0, f1, progress(hold, h0, h1));
  }
  return FRAMES[FRAMES.length - 1]![1];
}

/** Scaler, studied at night (Dec 2023 – Feb 2025): its modules, in order. */
const SCALER_MODULES = [
  'DSA',
  'LLD',
  'HLD',
  'System Design',
  'Databases',
  'Concurrency',
  'Capstone',
];

/** The laptop's header bar at night: Scaler's logo and the module on screen. */
function scalerHeader(rect: SVGGraphicsElement): Screen {
  const { g, x, y, w, h } = screenFrame(rect);
  svgEl('rect', { x, y, width: w, height: h, fill: '#262b40' }, g);
  const tile = h - 6;
  svgEl('rect', { x: x + 5, y: y + 3, width: tile, height: tile, rx: 2, fill: '#ffffff' }, g);
  svgEl('image', { href: scalerLogo, x: x + 5, y: y + 3, width: tile, height: tile }, g);
  const title = svgText(g, x + 10 + tile, y + h / 2 + h * 0.17, '', {
    'font-size': h * 0.46,
    fill: '#e8eaf2',
  });
  return {
    update({ hold }) {
      const k = progress(hold, 0.88, 1);
      const i = Math.min(SCALER_MODULES.length - 1, Math.floor(k * SCALER_MODULES.length));
      setText(title, `SCALER · Module ${i + 1} · ${SCALER_MODULES[i]}`);
    },
  };
}

/** Wrap a part's children so the scene can move them without touching the part itself. */
function innerWrap(part: Element | null): SVGGElement | null {
  if (!part) return null;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-hand-over', '');
  while (part.firstChild) g.appendChild(part.firstChild);
  part.appendChild(g);
  return g;
}

const scene: SceneModule = {
  id: '05-hyderabad',
  prepare(svg, { data, layout }) {
    const room = qs(svg, '[data-lottie="day-night"]');
    play = room ? bindLottie(room, DAY_NIGHT) : null;
    darkness = room?.querySelector('[data-lop="4"]') ?? null;
    const me = qs(svg, '[data-lottie="day-night-me"]');
    playMe = me ? bindLottie(me, DAY_NIGHT) : null;
    const pipe = qs(svg, '[data-lottie="day-night-pipe"]');
    playPipe = pipe ? bindLottie(pipe, DAY_NIGHT) : null;
    back = innerWrap(svg.querySelector('[data-id="me-desk"]'));
    hands = qs(svg, '[data-typing]');
    typing = hands ? bindLottie(hands, TYPING) : null;
    const mobile = layout === 'mobile';
    sink = mobile ? 150 : 260;
    rise = 160;
    // Each overlay follows the opacity of the Lottie layer it sits on.
    fades = qsa<SVGGraphicsElement>(svg, '[data-day]').map((el) => ({
      el,
      from: room?.querySelector(`[data-lop="${el.getAttribute('data-day')}"]`) ?? null,
    }));

    const monitor = qs(svg, '[data-screen="pipeline"]');
    const laptop = qs(svg, '[data-screen="scaler"]');
    screens = [
      monitor ? appBuild(monitor, beworldShowcase, [], BUILD) : null,
      laptop ? scalerHeader(laptop) : null,
      // Badges stamp in as each Play Store listing goes live.
      ...mountApps(svg, data, appCard, { beworld: [0.62, 0.66], cadgk: [0.7, 0.74] }),
    ].filter((s): s is Screen => !!s);

    const layer = qs(svg, '[data-confetti]');
    confetti = [];
    if (!layer) return;
    origin = (layer.getAttribute('data-c') ?? '0 0').split(' ').map(Number) as [number, number];
    const size = layout === 'mobile' ? 6 : 10;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.3;
      const speed = (layout === 'mobile' ? 120 : 260) * (0.6 + ((i * 37) % 10) / 20);
      const fill = COLORS[i % COLORS.length];
      const shape =
        i % 3 === 0
          ? svgEl('circle', { cx: 0, cy: 0, r: size / 2, fill }, layer)
          : i % 3 === 1
            ? svgEl(
                'rect',
                { x: -size / 2, y: -size / 4, width: size, height: size / 2, fill },
                layer,
              )
            : svgEl(
                'path',
                { d: `M0 ${-size / 2} L${size / 2} ${size / 2} L${-size / 2} ${size / 2} Z`, fill },
                layer,
              );
      confetti.push({
        el: shape,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - speed * 0.4,
        spin: (i % 2 ? 1 : -1) * 360,
      });
    }
  },
  clock(hold) {
    const h = Math.min(1, hold / ANIM_END);
    for (let i = 1; i < DAY.length; i++) {
      const [h1, m1] = DAY[i]!;
      const [h0, m0] = DAY[i - 1]!;
      if (h <= h1) return lerp(m0, m1, progress(h, h0, h1));
    }
    return DAY[DAY.length - 1]![1];
  },
  update(st) {
    const state = { ...st, hold: Math.min(1, st.hold / ANIM_END) };
    const frame = frameAt(state.hold);
    play?.(frame);
    playMe?.(frame);
    playPipe?.(frame);
    // The room's night veil is drawn under him now: dim him to match.
    const dark = Number(darkness?.getAttribute('opacity') ?? 0);
    if (back) back.style.filter = dark > 0.01 ? `brightness(${(1 - 0.9 * dark).toFixed(3)})` : '';

    // Back view ↔ hands on the keyboard while the code types.
    const k =
      easeInOut(progress(state.hold, ...SWAP_IN)) *
      (1 - easeInOut(progress(state.hold, ...SWAP_OUT)));
    if (back) {
      setAttr(back, 'transform', k > 0 ? `translate(0 ${(k * sink).toFixed(1)})` : '');
      setAttr(back, 'opacity', (1 - progress(k, 0.4, 1)).toFixed(3));
    }
    if (hands) {
      setAttr(hands, 'transform', `translate(0 ${lerp(rise, 0, k).toFixed(1)})`);
      setAttr(hands, 'opacity', progress(k, 0, 0.6).toFixed(3));
    }
    if (k > 0) typing?.(state.reduced ? 0 : (state.idle * TYPING.fr) % (TYPING.op - TYPING.ip));
    for (const { el, from } of fades) setAttr(el, 'opacity', from?.getAttribute('opacity') ?? '1');
    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);

    const burst = progress(state.hold, ...BURST);
    const gravity = 420;
    for (const c of confetti) {
      const on = burst > 0 && burst < 1 && !state.reduced;
      c.el.style.visibility = on ? '' : 'hidden';
      if (!on) continue;
      const e = easeOut(burst);
      const x = origin[0] + c.vx * e;
      const y = origin[1] + c.vy * e + gravity * burst * burst;
      const s = 1 - Math.max(0, (burst - 0.7) / 0.3);
      setAttr(
        c.el,
        'transform',
        `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(c.spin * burst).toFixed(0)}) scale(${s.toFixed(2)})`,
      );
    }
  },
};

export default scene;
