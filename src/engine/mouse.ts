/**
 * The click card: Suman's hand on the mouse, from above (his Lottie,
 * `src/assets/lottie/mouse-top-view.json`), in a small card at the bottom right of the picture.
 * It pops in shortly before each on-screen click (the 'click' cues in engine/sound.ts), the
 * hand presses as the click sounds (Lottie frame 40, its ripple until 52), and it goes again.
 * Driven by position, not time, so it follows scrolling both ways and stops when paused.
 */
import { bindLottie, type LottieAnimation } from '../lib/lottie';
import { clamp, easeOut, lerp, progress } from '../lib/math';
import motionJson from '../assets/lottie/mouse-top-view.motion.json';
import { CUES } from './sound';

const MOUSE = motionJson as unknown as LottieAnimation;
/** Lottie frames: the hand at rest, the press, the ripple gone. */
const READY = 0;
const PRESS = 40;
const DONE = 52;
/** Around a click, in screens of travel: card in, hand moves, press, ripple, card out. */
const IN: [number, number] = [-0.38, -0.26];
/** The hand moves onto the button from when the card starts to show. */
const AIM = IN[0];
const RIPPLE = 0.14;
const OUT: [number, number] = [0.2, 0.32];

export interface ClickCard {
  /** `id`: the scene on screen (null in a transition); `hold` 0..1; `len`: its hold in screens. */
  update(id: string | null, hold: number, len: number): void;
}

export function clickCard(el: HTMLElement | null): ClickCard {
  const play = el ? bindLottie(el, MOUSE) : null;
  const clicks = new Map(
    Object.entries(CUES).map(([id, cues]) => [
      id,
      cues.filter(([, s]) => s === 'click').map(([at]) => at),
    ]),
  );
  let shown = -1;
  return {
    update(id, hold, len) {
      if (!el || !play) return;
      // The nearest click, in screens from here (negative: still to come).
      let d = Infinity;
      for (const at of (id && clicks.get(id)) || []) {
        const x = (hold - at) * len;
        if (Math.abs(x) < Math.abs(d)) d = x;
      }
      const v = Number.isFinite(d)
        ? Math.min(progress(d, IN[0], IN[1]), 1 - progress(d, OUT[0], OUT[1]))
        : 0;
      if (v !== shown) {
        shown = v;
        el.style.opacity = v ? v.toFixed(3) : '';
        el.style.transform = v
          ? `translateY(${((1 - easeOut(v)) * 24).toFixed(1)}px) scale(${lerp(0.9, 1, easeOut(v)).toFixed(3)})`
          : '';
        el.classList.toggle('is-on', v > 0);
      }
      if (v > 0)
        play(
          d < 0
            ? lerp(READY, PRESS, clamp((d - AIM) / -AIM))
            : lerp(PRESS, DONE, clamp(d / RIPPLE)),
        );
    },
  };
}
