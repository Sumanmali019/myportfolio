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
 * It opens on GitHub: he browses flutter/samples' open issues and clicks the RenderFlex
 * overflow bug (a mouse click sounds); then the editor, and the fix is typed.
 * While the fix is typed into the editor (Lottie frames 5–90) Suman's back view slides away for
 * his hands on the keyboard from above (`typing-top-view`, as at the other desks), typing as the
 * code appears; the engine plays the typing sound only then. After it, he is back at the desk.
 * "View the PR →" is a real link over the monitor's screen. Only the motion keyframes ship
 * (`flutter-oss-contributor.motion.json`).
 */
import type { SceneModule, Screen } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { qs, setAttr } from '../lib/svg';
import { githubIssues } from '../screens/github-issues';
import { mountScreen, screenCtx } from './shared';
import motionJson from '../assets/lottie/flutter-oss-contributor.motion.json';
import typingJson from '../assets/lottie/typing-top-view.motion.json';

const OSS = motionJson as unknown as LottieAnimation;
const TYPING = typingJson as unknown as LottieAnimation;
/** The camera's zoom into the contributors, in Lottie frames. */
const ZOOM: [number, number] = [184, 216];
/**
 * First he browses flutter/samples' open issues and opens the overflow bug (hold 0.02 → 0.2,
 * screens/github-issues.ts, over the monitor); the Lottie (the editor and the fix being typed,
 * the review, the merge, the zoom) starts once it has.
 */
const ISSUES: [number, number] = [0.02, 0.2];
/** Hold progress where the zoom has landed. */
const ZOOMED = 0.52;
/** Lottie frames in which the code is being typed. */
const CODE: [number, number] = [5, 90];

let play: ((frame: number) => void) | null = null;
let pan: SVGGraphicsElement | null = null;
let panFrom: number[] = [];
let panTo: number[] = [];
let me: SVGGraphicsElement | null = null;
let hands: SVGGraphicsElement | null = null;
let typing: ((frame: number) => void) | null = null;
let issues: Screen | null = null;
let issuesLayer: SVGGraphicsElement | null = null;
let deskClock: SVGGraphicsElement | null = null;

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
    issues = mountScreen(svg, 'gh-issues', (r) => githubIssues(r, ISSUES));
    issuesLayer = qs(svg, '[data-issues]');
    deskClock = qs(svg, '[data-oss-clock]');
  },
  update(state) {
    const { hold } = state;
    const end = OSS.op - 1;
    const frame =
      hold < ZOOMED
        ? progress(hold, ISSUES[1], ZOOMED) * ZOOM[1]
        : lerp(ZOOM[1], end, progress(hold, ZOOMED, 0.94));
    play?.(frame);
    // The issue list, then it fades to the editor as the fix begins.
    issues?.update(screenCtx(state));
    if (issuesLayer) {
      const o = 1 - progress(hold, ISSUES[1] - 0.012, ISSUES[1]);
      setAttr(issuesLayer, 'opacity', o.toFixed(3));
      issuesLayer.style.visibility = o <= 0 ? 'hidden' : '';
    }
    // Back view (browsing) → his hands on the keyboard while the code is typed, then back.
    const k = easeInOut(
      Math.min(
        progress(hold, ISSUES[1] - 0.02, ISSUES[1] + 0.01),
        1 - progress(frame, CODE[1], CODE[1] + 14),
      ),
    );
    // As the camera zooms into the contributors page, Suman and the desk clock fade away
    // (on a tall phone frame they would float under the page).
    const zoomed = progress(frame, ZOOM[0], ZOOM[0] + 16);
    if (me) {
      setAttr(me, 'transform', k > 0 ? `translate(0 ${(k * 300).toFixed(1)})` : '');
      setAttr(me, 'opacity', ((1 - progress(k, 0.4, 1)) * (1 - zoomed)).toFixed(3));
    }
    if (deskClock) setAttr(deskClock, 'opacity', (1 - zoomed).toFixed(3));
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
