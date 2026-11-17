/**
 * 05 · Hyderabad, 2023 — BeWorld. The CI/CD pipeline lights up, metric cards build in, then
 * the BeWorld (500K+) and Current Affairs Daily GK (10K+) cards arrive — with a short burst
 * of flat-shape confetti as the odometer races up.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { qs, setAttr, svgEl } from '../lib/svg';
import { appCard } from '../screens/app-card';
import { pipeline } from '../screens/pipeline';
import { mountApps, mountScreen, screenCtx } from './shared';

let screens: Screen[] = [];
let confetti: Array<{ el: SVGGraphicsElement; vx: number; vy: number; spin: number }> = [];
let origin: [number, number] = [0, 0];

const COLORS = ['#c8674a', '#3f8f8b', '#e3a83b', '#5b5aa8', '#b5578a', '#5cc38a'];

const scene: SceneModule = {
  id: '05-hyderabad',
  prepare(svg, { data, layout }) {
    const beworld = data.profile.experience.find((e) => e.company === 'BeWorld');
    screens = [
      mountScreen(svg, 'pipeline', (r) => pipeline(r, beworld?.highlights ?? [])),
      ...mountApps(svg, data, appCard, { beworld: [0.5, 0.62], cadgk: [0.58, 0.68] }),
    ].filter((s): s is Screen => !!s);

    const layer = qs(svg, '[data-confetti]');
    confetti = [];
    if (!layer) return;
    origin = (layer.getAttribute('data-c') ?? '0 0').split(' ').map(Number) as [number, number];
    const size = layout === 'mobile' ? 6 : 10;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.3;
      const speed = (layout === 'mobile' ? 120 : 260) * (0.6 + ((i * 37) % 10) / 20);
      const shape =
        i % 3 === 0
          ? svgEl('circle', { cx: 0, cy: 0, r: size / 2, fill: COLORS[i % COLORS.length] }, layer)
          : i % 3 === 1
            ? svgEl(
                'rect',
                {
                  x: -size / 2,
                  y: -size / 4,
                  width: size,
                  height: size / 2,
                  fill: COLORS[i % COLORS.length],
                },
                layer,
              )
            : svgEl(
                'path',
                {
                  d: `M0 ${-size / 2} L${size / 2} ${size / 2} L${-size / 2} ${size / 2} Z`,
                  fill: COLORS[i % COLORS.length],
                },
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
  update(state) {
    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);
    const k = progress(state.hold, 0.5, 0.72);
    const gravity = 420;
    for (const c of confetti) {
      const on = k > 0 && k < 1 && !state.reduced;
      c.el.style.visibility = on ? '' : 'hidden';
      if (!on) continue;
      const e = easeOut(k);
      const x = origin[0] + c.vx * e;
      const y = origin[1] + c.vy * e + gravity * k * k;
      const s = 1 - Math.max(0, (k - 0.7) / 0.3);
      setAttr(
        c.el,
        'transform',
        `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(c.spin * k).toFixed(0)}) scale(${s.toFixed(2)})`,
      );
    }
  },
};

export default scene;
