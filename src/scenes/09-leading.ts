/**
 * 09 · Leading the team at Neura Dynamics — one whole working day on the big monitor.
 *   0 → 0.30     10:00 AM, the team sync: Suman on screen as "You | Tech Lead" asks the team
 *                what they're working on today, and they answer one by one;
 *   0.29 → 0.35  the call hands over to his desk and his hands rise onto the keyboard (the
 *                typing Lottie, as in chapters 03 and 05) and keep typing all day;
 *   0.35 → 0.56  11:30 AM, Jira: first the lesson UI of chapter 03 (a syllabus ticking off,
 *                the topic's notes typing out, screens/lead-learning.ts), then the sprint
 *                board, tickets moving across it one at a time;
 *   0.56 → 0.77  3:15 PM, Docker: the lesson, then Docker Desktop: the image builds step by
 *                step, then the stack comes up container by container;
 *   0.77 → 0.89  7:40 PM, the backend: the lesson, then VS Code: the SSE chat endpoint types
 *                out, reloads, tests pass;
 *   0.89 → 1     10:20 PM, GitHub: a teammate's PR reviewed, checks pass, approved, merged.
 * Each app's status strip names it and the time (in the artwork); the desk clock tells the
 * same day (`clock`), so the window and the room light follow it (engine/daylight.ts):
 * afternoon, a sunset, then night with the lamp on. Scroll-driven, so the whole day reverses.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr, setText } from '../lib/svg';
import { callGrid } from '../screens/call-grid';
import { leadLearning } from '../screens/lead-learning';
import { backendEditor, dockerPanel, prReview, type Window } from '../screens/lead-workday';
import { standupBoard } from '../screens/standup-board';
import { leadLearning as lessons } from '../content/showcase';
import motionJson from '../assets/lottie/typing-top-view.motion.json';
import { mountScreen, screenCtx } from './shared';

const TYPING = motionJson as unknown as LottieAnimation;
/** The team sync. */
const CALL: Window = [0, 0.3];
/** Call → desk, and his hands rising (hold progress). */
const SWAP: Window = [0.29, 0.35];
/** Each app's time on screen, in order. */
const APPS: Array<[string, Window]> = [
  ['jira-board', [0.35, 0.56]],
  ['docker', [0.56, 0.77]],
  ['backend', [0.77, 0.89]],
  ['github', [0.89, 1]],
];
/** The apps shown as lessons (content/showcase.ts `leadLearning`), in syllabus order. */
const LESSON_APPS = ['jira-board', 'docker', 'backend'];
/** Crossfade between apps. */
const FADE = 0.015;
/** The day's clock: [hold, minutes] — each app arrives at the time on its status strip. */
const DAY: Array<[number, number]> = [
  [0, 600], // 10:00 AM, the sync
  [0.3, 650],
  [0.35, 690], // 11:30 AM, Jira
  [0.56, 915], // 3:15 PM, Docker
  [0.77, 1180], // 7:40 PM, VS Code
  [0.89, 1340], // 10:20 PM, GitHub
  [1, 1385],
];

let screens: Screen[] = [];
let call: Element | null = null;
let work: Element | null = null;
let panes: Array<{ el: Element | null; win: Window }> = [];
let hands: SVGGraphicsElement | null = null;
let typing: ((frame: number) => void) | null = null;

const win = (key: string): Window => APPS.find(([k]) => k === key)![1];
/** An app's own animation plays inside its time on screen. */
const inner = (key: string): Window => {
  const [a, b] = win(key);
  return [a + FADE, b - FADE];
};

/** The share of each of those apps' time spent learning it, before it is shown at work. */
const LEARN_SHARE = 0.38;
const splitAt = (key: string): number => {
  const [a, b] = inner(key);
  return a + (b - a) * LEARN_SHARE;
};
const learnWin = (key: string): Window => [inner(key)[0], splitAt(key)];
const actionWin = (key: string): Window => [splitAt(key), inner(key)[1]];
/** The status strip's name for each, while learning and then at work (the strip is in the art). */
const STRIP: Record<string, [string, string]> = {
  'jira-board': ['Learning Jira', 'Jira  ·  Sprint 24'],
  docker: ['Learning Docker', 'Docker Desktop'],
  backend: ['Learning Backend', 'VS Code  ·  neura-backend'],
};
let strips: Array<{ el: Element; key: string }> = [];

const scene: SceneModule = {
  id: '09-leading',
  prepare(svg) {
    screens = [
      mountScreen(svg, 'call-grid', (r) => callGrid(r, CALL)),
      // Jira, Docker and the backend: first as a lesson, as in chapter 03 (a syllabus that ticks
      // on, the notes typing out), then the app at work. The first screen mounted sits on top,
      // so the lesson goes first and clears itself when its window ends.
      ...LESSON_APPS.map((key, i) =>
        mountScreen(svg, key, (r) => leadLearning(r, lessons, i, learnWin(key))),
      ),
      mountScreen(svg, 'jira-board', (r) =>
        standupBoard(r, 'JIRA · SPRINT 24', actionWin('jira-board')),
      ),
      mountScreen(svg, 'docker', (r) => dockerPanel(r, actionWin('docker'))),
      mountScreen(svg, 'backend', (r) => backendEditor(r, actionWin('backend'))),
      mountScreen(svg, 'github', (r) => prReview(r, inner('github'))),
    ].filter((s): s is Screen => !!s);
    call = svg.querySelector('[data-phase="call"]');
    work = svg.querySelector('[data-phase="work"]');
    panes = APPS.map(([key, w]) => ({ el: svg.querySelector(`[data-pane="${key}"]`), win: w }));
    // Each pane's status strip: its first text is the app's name.
    strips = LESSON_APPS.flatMap((key) => {
      const el = svg.querySelector(`[data-pane="${key}"] text`);
      return el ? [{ el, key }] : [];
    });
    hands = qs(svg, '[data-typing]');
    typing = hands ? bindLottie(hands, TYPING) : null;
  },
  clock(hold) {
    for (let i = 1; i < DAY.length; i++) {
      const [h1, m1] = DAY[i]!;
      const [h0, m0] = DAY[i - 1]!;
      if (hold <= h1) return lerp(m0, m1, progress(hold, h0, h1));
    }
    return DAY[DAY.length - 1]![1];
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

    for (const { el, key } of strips) setText(el, STRIP[key]![hold < splitAt(key) ? 0 : 1]);

    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);
  },
};

export default scene;
