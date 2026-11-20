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
 *   0.74 → 1      dusk to night: the lamp comes on and, on the same big monitor, he studies
 *                 with Scaler — the curriculum ticks off module by module (DSA, LLD, HLD,
 *                 System Design, Databases, Concurrency, Capstone): each one's lecture video
 *                 plays, then he reads its notes (screens/scaler-study.ts).
 *                 The Lottie's own small laptop is hidden: the monitor stays on instead.
 * The stops above are in the scene's own 0–1 (`inner`); the real hold maps onto them in
 * seconds (STAGES), so the builds get the time they need. After the
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
import { qs, qsa, setAttr, svgEl } from '../lib/svg';
import scalerLogo from '../assets/apps/scaler-logo.webp?url';
import { beworldShowcase, scalerModules } from '../content/showcase';
import { appBuild, liveAt } from '../screens/app-build';
import { appCard } from '../screens/app-card';
import { scalerStudy } from '../screens/scaler-study';
import motionJson from '../assets/lottie/day-night-hyd.motion.json';
import typingJson from '../assets/lottie/typing-top-view.motion.json';
import { mountApps, screenCtx } from './shared';

const DAY_NIGHT = motionJson as unknown as LottieAnimation;
const TYPING = typingJson as unknown as LottieAnimation;
/** Back view → hands on the keyboard, and back again (hold progress). */
/**
 * The chapter in seconds at 1× (weight in content/scenes.ts = SECONDS × AUTO_SPEED), and how
 * the real hold maps onto the stops below: [hold, inner] pairs — the pipeline, the builds (one
 * project after the other, at their own pace), dusk and night, then the rest for the shelf.
 */
const SECONDS = 42;
const PIPELINE = 2.5;
/** Dusk and night: studying with Scaler, module by module, on the monitor. */
const NIGHT = 14;
/** Both apps; then dusk, night, and the rest for the shelf (from 0.86). */
const BUILDS = SECONDS * 0.855 - PIPELINE - NIGHT;
const STAGES: Array<[number, number]> = [
  [0, 0],
  [PIPELINE / SECONDS, 0.32],
  [(PIPELINE + BUILDS) / SECONDS, 0.74],
  [(PIPELINE + BUILDS + NIGHT) / SECONDS, 1],
];
/** The real hold → the scene's own 0–1 (the stops below). */
function inner(hold: number): number {
  for (let i = 1; i < STAGES.length; i++) {
    const [h0, v0] = STAGES[i - 1]!;
    const [h1, v1] = STAGES[i]!;
    if (hold <= h1) return lerp(v0, v1, progress(hold, h0, h1));
  }
  return 1;
}
const SWAP_IN: [number, number] = [0.28, 0.33];
const SWAP_OUT: [number, number] = [0.74, 0.78];

/**
 * The room runs on two timelines. The story's (FRAMES, by hold): the "DAY · WORKING" /
 * "NIGHT · STUDYING" labels, the day props and the phones, which switch when he starts
 * studying. The rest — sky, sun, moon, clouds, lamp, darkness, the wall clock — follows the
 * desk clock, so the window goes from morning through the afternoon and sunset into night.
 */
const STORY_LAYERS = new Set([1, 2, 5, 6, 7]);
const MINUTE_HAND = 14;
const HOUR_HAND = 15;
/** Desk clock (minutes) → the sky's frame: day until 4 PM, warming to sunset, then night. */
const SKY: Array<[number, number]> = [
  [0, 119],
  [960, 119],
  [1110, 148],
  [1170, 180],
  [1410, 290],
];
/** The wall clock's hands turn about (720, 150). */
const handAt = (deg: number) => `translate(720 150) rotate(${deg.toFixed(1)}) translate(-720 -150)`;
/**
 * The sun across the day window by the clock, as fractions of its sky: low on the right in the
 * morning, high at midday, sinking to where the sunset window paints its sun (0.35, 0.4), so
 * the sunset version fades in over it.
 */
function sunAt(minutes: number): [number, number] {
  const t = progress(minutes, 600, 1050);
  const x = lerp(0.78, 0.35, t);
  const y =
    t < 0.4 ? lerp(0.45, 0.14, easeOut(t / 0.4)) : lerp(0.14, 0.4, easeInOut((t - 0.4) / 0.6));
  return [x, y];
}
/** Sunset window: a first warmth through the afternoon, then the sunset from 4:30 to 6 PM. */
const EVENING: Array<[number, number]> = [
  [0, 0],
  [870, 0],
  [990, 0.25],
  [1080, 1],
];
/** Night window: from 6:30 PM, fully dark by 7:50. */
const NIGHT_SKY: Array<[number, number]> = [
  [0, 0],
  [1110, 0],
  [1190, 1],
];
const piecewise = (stops: Array<[number, number]>, v: number) => {
  for (let i = 1; i < stops.length; i++) {
    const [a0, b0] = stops[i - 1]!;
    const [a1, b1] = stops[i]!;
    if (v <= a1) return lerp(b0, b1, progress(v, a0, a1));
  }
  return stops[stops.length - 1]![1];
};

/** Hold → Lottie frame, piecewise: [hold, frame] stops. */
const FRAMES: Array<[number, number]> = [
  [0, 0],
  [0.3, 110],
  [0.74, 118],
  [0.9, 180],
  [1, 299],
];
/** App builds and store listings on the monitor: each project in turn. */
const BUILD = { start: 0.32, end: 0.74, stop: 0.745 };
/** Then Scaler on the same monitor, to the end of the night. */
const STUDY: [number, number] = [0.745, 0.995];
/**
 * At night the big monitor covers the left of the desk, so on desktop the lamp moves to the
 * right of it, where the phones were by day (svg units).
 */
const LAMP_DX = 690;
/** The Lottie's small laptop (and its glow) sits right of the lamp in its night layer. */
const LAPTOP_MIN_X = 560;
const badge = (key: string) => liveAt(beworldShowcase, key, BUILD.start, BUILD.end);
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
/** Confetti burst: as BeWorld goes live on the Play Store. */
const BURST: [number, number] = [badge('beworld')[0], badge('beworld')[0] + 0.05];

let screens: Screen[] = [];
let play: ((frame: number) => void) | null = null;
let playSky: ((frame: number) => void) | null = null;
/** The tall window's sunset and night versions (layer 950), faded by the clock. */
let dlEvening: SVGGraphicsElement | null = null;
let dlNight: SVGGraphicsElement | null = null;
/** A sun crossing the day window's sky, and that sky's box. */
let daySun: SVGGElement | null = null;
let skyBox: [number, number, number, number] = [0, 0, 0, 0];
let minuteHand: Element | null = null;
let hourHand: Element | null = null;
let playMe: ((frame: number) => void) | null = null;
let playPipe: ((frame: number) => void) | null = null;
let typing: ((frame: number) => void) | null = null;
let back: SVGGElement | null = null;
let hands: SVGGraphicsElement | null = null;
let darkness: Element | null = null;
let sink = 260;
let rise = 160;
let fades: Array<{ el: SVGGraphicsElement; from: Element | null }> = [];
/** The monitor (its overlay follows no layer: it stays on from day into the night). */
let monitorEl: Element | null = null;
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
    play = room ? bindLottie(room, DAY_NIGHT, (ind) => STORY_LAYERS.has(ind)) : null;
    playSky = room
      ? bindLottie(
          room,
          DAY_NIGHT,
          (ind) => !STORY_LAYERS.has(ind) && ind !== MINUTE_HAND && ind !== HOUR_HAND,
        )
      : null;
    // The window you see is the tall one (layer 950, scripts/art/generate-scenes.mjs) over the
    // Lottie's own. Its sunset and night versions follow the clock here, gradually, instead of
    // switching with the part of the day (styles/global.css .dl).
    const tall = room?.querySelector('[data-ltr="950"]') ?? null;
    dlEvening = tall?.querySelector<SVGGraphicsElement>('.dl-evening') ?? null;
    dlNight = tall?.querySelector<SVGGraphicsElement>('.dl-night') ?? null;
    for (const el of [dlEvening, dlNight]) if (el) el.style.transition = 'none';
    const skyRect = tall
      ? Array.from(tall.querySelectorAll('rect')).find(
          (r) => /-sky\)$/.test(r.getAttribute('fill') ?? '') && !r.closest('.dl'),
        )
      : undefined;
    daySun = null;
    if (skyRect) {
      const n = (k: string) => Number(skyRect.getAttribute(k) ?? 0);
      skyBox = [n('x'), n('y'), n('width'), n('height')];
      daySun = svgEl('g', { 'data-day-sun': '' });
      svgEl('circle', { cx: 0, cy: 0, r: 44, fill: '#ffe08a', 'fill-opacity': 0.3 }, daySun);
      svgEl('circle', { cx: 0, cy: 0, r: 30, fill: '#ffd66b' }, daySun);
      skyRect.after(daySun);
    }
    minuteHand = room?.querySelector(`[data-ltr="${MINUTE_HAND}"]`) ?? null;
    hourHand = room?.querySelector(`[data-ltr="${HOUR_HAND}"]`) ?? null;
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
    monitorEl = svg.querySelector('[data-anchor="monitor"]');
    // The night layer's laptop and its glow: hidden, the big monitor is the desk at night too.
    for (const el of qsa<SVGGraphicsElement>(svg, '[data-lottie="day-night"] [data-lop="3"] > *')) {
      try {
        const b = el.getBBox();
        if (b.width && b.x + b.width / 2 > LAPTOP_MIN_X) el.style.display = 'none';
      } catch {
        /* not rendered */
      }
    }
    if (!mobile) {
      // Scale from svg units to an element's own (its parent's transforms).
      const root = svg.getScreenCTM()?.a || 1;
      const local = (el: Element, dx: number) =>
        dx / (((el.parentNode as SVGGraphicsElement | null)?.getScreenCTM?.()?.a || root) / root);
      for (const el of qsa<SVGGraphicsElement>(
        svg,
        '[data-lottie="day-night"] [data-lop="3"] > *',
      )) {
        if (el.style.display === 'none') continue;
        el.setAttribute('transform', `translate(${local(el, LAMP_DX).toFixed(1)} 0)`);
      }
    }
    const scalerBar = qs(svg, '[data-screen="scaler"]');
    if (scalerBar) scalerBar.style.display = 'none';
    screens = [
      monitor ? appBuild(monitor, beworldShowcase, [], BUILD) : null,
      monitor
        ? scalerStudy(monitor, scalerModules, STUDY, scalerLogo, {
            kicker: 'NOW LEARNING · BY NIGHT',
            title: 'Scaler Academy',
            about:
              'After work at BeWorld, Suman studies software engineering with Scaler (Dec 2023 – Feb 2025): data structures and algorithms, low- and high-level design, system design, databases, concurrency, and a capstone project.',
          })
        : null,
      // Badges stamp in as each Play Store listing goes live.
      ...mountApps(svg, data, appCard, { beworld: badge('beworld'), cadgk: badge('cadgk') }),
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
    return piecewise(DAY, inner(hold));
  },
  update(st) {
    const state = { ...st, hold: inner(st.hold) };
    const frame = frameAt(state.hold);
    const minutes = piecewise(DAY, state.hold);
    const sky = piecewise(SKY, minutes);
    play?.(frame);
    playSky?.(sky);
    playMe?.(sky);
    playPipe?.(frame);
    // The sun crosses the window by the clock; the sunset, then the night, fade in over it.
    if (daySun) {
      const [fx, fy] = sunAt(minutes);
      const [bx, by, bw, bh] = skyBox;
      setAttr(
        daySun,
        'transform',
        `translate(${(bx + fx * bw).toFixed(1)} ${(by + fy * bh).toFixed(1)})`,
      );
    }
    const ev = piecewise(EVENING, minutes).toFixed(3);
    const nt = piecewise(NIGHT_SKY, minutes).toFixed(3);
    if (dlEvening && dlEvening.style.opacity !== ev) dlEvening.style.opacity = ev;
    if (dlNight && dlNight.style.opacity !== nt) dlNight.style.opacity = nt;
    // The wall clock shows the desk clock's time.
    if (hourHand) setAttr(hourHand, 'transform', handAt(((minutes / 60) % 12) * 30));
    if (minuteHand) setAttr(minuteHand, 'transform', handAt((minutes % 60) * 6));
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
    for (const { el, from } of fades)
      setAttr(el, 'opacity', el === monitorEl ? '1' : (from?.getAttribute('opacity') ?? '1'));
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
