/**
 * 08 · Remote from Kolkata, 2024 — Neura Dynamics. Three phones (DocPharma, Klass Online with
 * a Kolkata → Doha arc, Ayantra) and the SSE vs WebSocket streaming chat on the monitor.
 */
import type { Screen, SceneModule } from '../engine/types';
import { progress } from '../lib/math';
import { boxOf, drawOn, qs, svgEl, svgText } from '../lib/svg';
import { appCard } from '../screens/app-card';
import { sseVsWs } from '../screens/sse-vs-ws';
import { mountApps, mountScreen, screenCtx } from './shared';

let screens: Screen[] = [];
let arc: SVGPathElement | null = null;

const scene: SceneModule = {
  id: '08-remote',
  prepare(svg, { data }) {
    screens = [mountScreen(svg, 'sse-vs-ws', sseVsWs), ...mountApps(svg, data, appCard)].filter(
      (s): s is Screen => !!s,
    );
    arc = null;
    const klass = qs(svg, '[data-screen="app-klass-online"]');
    if (!klass) return;
    const { x, y, w, h } = boxOf(klass);
    const g = svgEl('g', { class: 'route-arc' }, klass.parentElement!);
    const ay = y + h * 0.13;
    const fs = w * 0.1;
    arc = svgEl(
      'path',
      {
        d: `M${x + w * 0.16} ${ay} Q${x + w * 0.5} ${ay - h * 0.1} ${x + w * 0.84} ${ay}`,
        fill: 'none',
        stroke: '#fbf6ee',
        'stroke-width': w * 0.025,
        'stroke-linecap': 'round',
      },
      g,
    );
    svgEl('circle', { cx: x + w * 0.16, cy: ay, r: w * 0.03, fill: '#fbf6ee' }, g);
    svgEl('circle', { cx: x + w * 0.84, cy: ay, r: w * 0.03, fill: '#fbf6ee' }, g);
    svgText(g, x + w * 0.16, ay + fs * 1.1, 'KOL', {
      'font-size': fs * 0.7,
      fill: '#fbf6ee',
      'text-anchor': 'middle',
    });
    svgText(g, x + w * 0.84, ay + fs * 1.1, 'DOH', {
      'font-size': fs * 0.7,
      fill: '#fbf6ee',
      'text-anchor': 'middle',
    });
  },
  update(state) {
    const ctx = screenCtx(state);
    for (const s of screens) s.update(ctx);
    if (arc) drawOn(arc, progress(state.hold, 0.25, 0.55));
  },
};

export default scene;
