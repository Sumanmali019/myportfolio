/**
 * 09 · Leading the team at Neura Dynamics — one whole working day on the big monitor.
 *   0 → 0.28     10:00 AM, the team sync: Suman on screen as "You | Tech Lead", laughing;
 *   0.27 → 0.34  the call hands over to his desk and his hands rise onto the keyboard (the
 *                typing Lottie, as in chapters 03 and 05) and keep typing all day;
 *   0.33 → 0.49  11:30 AM, Jira: the sprint board, a card moving to DONE;
 *   0.49 → 0.65  3:15 PM, Docker Desktop: the stack comes up container by container;
 *   0.65 → 0.81  7:40 PM, VS Code: the SSE chat endpoint types out, reloads, tests pass;
 *   0.81 → 1     10:20 PM, GitHub: a teammate's PR reviewed, checks pass, approved, merged.
 * Each app's status strip names it and the time (in the artwork). Outside, the light follows
 * the clock: afternoon gold, dusk with a setting sun, then night and the desk lamp.
 * Scroll-driven, so the whole day reverses.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr } from '../lib/svg';
import { callGrid } from '../screens/call-grid';
import { backendEditor, dockerPanel, prReview, type Window } from '../screens/lead-workday';
import { standupBoard } from '../screens/standup-board';
import motionJson from '../assets/lottie/typing-top-view.motion.json';
import { mountScreen, screenCtx } from './shared';

const TYPING = motionJson as unknown as LottieAnimation;
/** Call → desk, and his hands rising (hold progress). */
const SWAP: Window = [0.27, 0.34];
/** Each app's time on screen, in order. */
const APPS: Array<[string, Window]> = [
  ['jira-board', [0.33, 0.49]],
  ['docker', [0.49, 0.65]],
  ['backend', [0.65, 0.81]],
  ['github', [0.81, 1]],
];
/** Crossfade between apps. */
const FADE = 0.02;

let screens: Screen[] = [];
let call: Element | null = null;
let work: Element | null = null;
let panes: Array<{ el: Element | null; win: Window }> = [];
let hands: SVGGraphicsElement | null = null;
let typing: ((frame: number) => void) | null = null;
let dusk: Element | null = null;
let night: Element | null = null;
let gold: Element | null = null;
let veil: Element | null = null;
let lampLight: Element | null = null;

const win = (key: string): Window => APPS.find(([k]) => k === key)![1];
/** An app's own animation plays inside its time on screen. */
const inner = (key: string): Window => {
  const [a, b] = win(key);
  return [a + FADE, b - FADE];
};

const scene: SceneModule = {
  id: '09-leading',
  prepare(svg) {
    screens = [
      mountScreen(svg, 'call-grid', callGrid),
      mountScreen(svg, 'jira-board', (r) => standupBoard(r, 'JIRA · SPRINT 24')),
      mountScreen(svg, 'docker', (r) => dockerPanel(r, inner('docker'))),
      mountScreen(svg, 'backend', (r) => backendEditor(r, inner('backend'))),
      mountScreen(svg, 'github', (r) => prReview(r, inner('github'))),
    ].filter((s): s is Screen => !!s);
    call = svg.querySelector('[data-phase="call"]');
    work = svg.querySelector('[data-phase="work"]');
    panes = APPS.map(([key, w]) => ({ el: svg.querySelector(`[data-pane="${key}"]`), win: w }));
    hands = qs(svg, '[data-typing]');
    typing = hands ? bindLottie(hands, TYPING) : null;
    dusk = svg.querySelector('[data-dusk]');
    night = svg.querySelector('[data-night]');
    gold = svg.querySelector('[data-afternoon]');
    veil = svg.querySelector('[data-veil]');
    lampLight = svg.querySelector('[data-id="lamp"] [data-lamp-light]');
  },
  update(state) {
    const { hold } = state;
    const k = easeInOut(progress(hold, ...SWAP));
    if (call) setAttr(call, 'opacity', (1 - k).toFixed(3));
    if (work) setAttr(work, 'opacity', k.toFixed(3));
    panes.forEach(({ el, win: [a, b] }, i) => {
      if (!el) return;
      // The first app arrives with the desk; the last stays to the end.
      const fadeIn = i === 0 ? 1 : progress(hold, a - FADE, a + FADE);
      const fadeOut = i === panes.length - 1 ? 0 : progress(hold, b - FADE, b + FADE);
      const o = Math.min(fadeIn, 1 - fadeOut);
      setAttr(el, 'opacity', o.toFixed(3));
      (el as SVGElement).style.visibility = o <= 0 ? 'hidden' : '';
    });

    if (hands) {
      setAttr(hands, 'transform', `translate(0 ${lerp(160, 0, k).toFixed(1)})`);
      setAttr(hands, 'opacity', progress(k, 0, 0.6).toFixed(3));
    }
    if (k > 0) typing?.(state.reduced ? 0 : (state.idle * TYPING.fr) % (TYPING.op - TYPING.ip));

    // The light through the day, following the clock on screen.
    const afternoon =
      0.16 * easeInOut(progress(hold, 0.44, 0.54)) * (1 - easeInOut(progress(hold, 0.6, 0.7)));
    const eve = easeInOut(progress(hold, 0.6, 0.7));
    const dark = easeInOut(progress(hold, 0.76, 0.86));
    if (gold) setAttr(gold, 'opacity', afternoon.toFixed(3));
    if (dusk) setAttr(dusk, 'opacity', eve.toFixed(3));
    if (night) setAttr(night, 'opacity', dark.toFixed(3));
    if (veil) setAttr(veil, 'opacity', (0.22 * eve + 0.3 * dark).toFixed(3));
    if (lampLight) setAttr(lampLight, 'opacity', progress(hold, 0.66, 0.76).toFixed(3));
    // His hands sit in front of the room: dim them with it.
    if (hands)
      hands.style.filter =
        eve > 0.01 ? `brightness(${(1 - 0.18 * eve - 0.2 * dark).toFixed(3)})` : '';

    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);
  },
};

export default scene;
