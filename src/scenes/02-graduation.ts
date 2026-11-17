/**
 * 02 · Graduation, 2021 — in the convocation hall, Suman tosses his cap (his Lottie,
 * `src/assets/lottie/graduation-cap-toss.json`) and then holds up the offer letter.
 * Driven by hold progress, so it plays backwards when you scroll up:
 *
 *   0.04–0.62  the cap-toss Lottie, frame by frame: he blinks, swings his arm, throws the cap;
 *              the camera zooms in and follows it up past the roof into the sky (clouds,
 *              confetti), then back down as it lands on his head again
 *   0.62–0.72  the offer letter rises into view (role and start date from profile.ts)
 *   0.72–0.82  the signature draws on · 0.82–0.88 "ACCEPTED" stamps in
 *
 * The Lottie's camera layer is applied here to the hall and the graduate together (the
 * `[data-cam]` groups), so the whole scene moves as one shot. Only the motion keyframes ship
 * to the browser (`graduation-cap-toss.motion.json`, written by `pnpm art`).
 * The hall is drawn softly blurred so Suman stays in focus.
 */
import type { SceneModule } from '../engine/types';
import { clamp, easeOut, lerp, progress } from '../lib/math';
import { bindLottie, valueAt, type LottieAnimation } from '../lib/lottie';
import { drawOn, qs, qsa, setAttr, setScale, svgText } from '../lib/svg';
import { wrap } from '../screens/sse-vs-ws';
import motionJson from '../assets/lottie/graduation-cap-toss.motion.json';

const TOSS = motionJson as unknown as LottieAnimation;
const CAMERA = TOSS.layers.find((l) => l.ty === 3)!;
/** The camera's largest zoom in the Lottie (215%): sets how far the focus point blends in. */
const MAX_ZOOM = 2.15;
/** Last frame that moves (the cap has settled by 136). */
const END_FRAME = 136;

let lottie: ((frame: number) => void) | null = null;
let cams: SVGGraphicsElement[] = [];
let tossSky: SVGGraphicsElement | null = null;
/** Lottie placement in the scene (translate x y, scale k) and the zoomed camera's focus. */
let place = { x: 0, y: 0, k: 1 };
let focus: [number, number] = [200, 200];
let letter: SVGGraphicsElement | null = null;
let sign: SVGPathElement | null = null;
let stamp: SVGGraphicsElement | null = null;

/**
 * The Lottie camera (translate(p) scale(s) translate(-a), in Lottie units) as a transform in
 * scene units for the [data-cam] groups. While zoomed, the camera's centre moves from the
 * Lottie's own centre to `focus`, so the cap flies through the middle of a wide frame too.
 */
function cameraTransform(frame: number): { tf: string; zoom: number } {
  const [ax = 200, ay = 200] = valueAt(CAMERA.ks.a, frame, [200, 200]);
  const [sx = 100] = valueAt(CAMERA.ks.s, frame, [100, 100]);
  const [px0 = 200, py0 = 200] = valueAt(CAMERA.ks.p, frame, [200, 200]);
  const s = sx / 100;
  const zoom = clamp((s - 1) / (MAX_ZOOM - 1));
  const px = lerp(px0, focus[0], zoom);
  const py = lerp(py0, focus[1], zoom);
  const { x, y, k } = place;
  const tx = x + k * px - s * k * ax - s * x;
  const ty = y + k * py - s * k * ay - s * y;
  const idle = Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05 && Math.abs(s - 1) < 1e-4;
  return {
    tf: idle ? '' : `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(4)})`,
    zoom,
  };
}

const scene: SceneModule = {
  id: '02-graduation',
  prepare(svg, { data }) {
    const me = qs(svg, '[data-lottie="cap-toss"]');
    lottie = me ? bindLottie(svg, TOSS) : null;
    const [x = 0, y = 0, k = 1] = (me?.getAttribute('data-toss-at') ?? '0 0 1')
      .split(' ')
      .map(Number);
    place = { x, y, k };
    // Zoomed, the cap sits mid-width over his head and ~40% down the frame.
    const h = svg.viewBox.baseVal?.height || 900;
    focus = [200, (h * 0.4 - y) / k];
    cams = qsa(svg, '[data-cam]');
    tossSky = qs(svg, '[data-toss-sky]');
    letter = qs(svg, '[data-letter]');
    sign = qs<SVGPathElement>(svg, '[data-sign]');
    stamp = qs(svg, '[data-stamp]');

    // The letter's words come from the first job in profile.ts (Cloudcraftz).
    const body = qs(svg, '[data-letter-body]');
    const job = [...data.profile.experience].sort((a, b) => a.start - b.start)[0];
    if (body && job) {
      qsa(body.parentElement!, '.letter-line').forEach((el) => el.remove());
      const bx = Number(body.getAttribute('x'));
      const by = Number(body.getAttribute('y'));
      const start = job.period.split('–')[0]?.trim() ?? String(job.start);
      const lines = [
        'Dear Suman,',
        ...wrap(`We are pleased to offer you the role of ${job.role}`, 24),
        ...wrap(`in ${job.location}, from ${start}.`, 24),
        'Welcome aboard!',
      ];
      lines.slice(0, 8).forEach((l, i) =>
        svgText(body.parentElement!, bx, by + 12 + i * 14.5, l, {
          'font-size': 10.5,
          fill: i === 0 ? '#2a2438' : '#3b3550',
          class: 'ui-text letter-line',
        }),
      );
    }
  },
  update({ hold }) {
    // 1 · The cap toss, scrubbed by scroll; the camera moves hall and graduate together.
    const frame = progress(hold, 0.04, 0.62) * END_FRAME;
    lottie?.(frame);
    const { tf, zoom } = cameraTransform(frame);
    for (const c of cams) setAttr(c, 'transform', tf);
    if (tossSky) setAttr(tossSky, 'opacity', zoom.toFixed(3));

    // 2 · The offer letter rises into view, then is signed and stamped.
    if (letter) setScale(letter, easeOut(progress(hold, 0.62, 0.72), 1.4));
    if (sign) drawOn(sign, progress(hold, 0.72, 0.82));
    if (stamp) setScale(stamp, easeOut(progress(hold, 0.82, 0.88), 2.2));
  },
};

export default scene;
