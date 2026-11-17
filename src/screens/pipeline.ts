/**
 * Chapter 05 monitor: a CI/CD pipeline lighting up stage by stage, then metric cards
 * building in (from BeWorld's highlights in profile.ts).
 */
import type { Screen } from '../engine/types';
import { clamp, easeOut, progress } from '../lib/math';
import { drawOn, screenFrame, setTransform, svgEl, svgText, UI } from '../lib/svg';

const STAGES = ['commit', 'test', 'build', 'sign', 'store'];

export function pipeline(rect: SVGGraphicsElement, metrics: string[]): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  const fs = Math.min(u * 2.8, h / 16);
  svgEl('rect', { x, y, width: w, height: h, fill: UI.bg }, g);
  svgText(g, x + u * 3, y + fs * 1.8, 'CODEMAGIC · release pipeline', {
    'font-size': fs * 0.9,
    fill: UI.muted,
  });

  const py = y + h * 0.32;
  const px0 = x + u * 8;
  const px1 = x + w - u * 8;
  svgEl('line', { x1: px0, y1: py, x2: px1, y2: py, stroke: UI.line, 'stroke-width': fs * 0.3 }, g);
  const flow = svgEl(
    'line',
    { x1: px0, y1: py, x2: px1, y2: py, stroke: UI.green, 'stroke-width': fs * 0.3 },
    g,
  );
  const nodes = STAGES.map((s, i) => {
    const nx = px0 + (i / (STAGES.length - 1)) * (px1 - px0);
    const c = svgEl('circle', { cx: nx, cy: py, r: fs * 0.9, fill: UI.line }, g);
    svgText(g, nx, py + fs * 2.4, s, {
      'font-size': fs * 0.8,
      fill: UI.text,
      'text-anchor': 'middle',
    });
    return c;
  });
  svgText(g, px1, py - fs * 1.7, 'App Store · Play Store', {
    'font-size': fs * 0.7,
    fill: UI.amber,
    'text-anchor': 'end',
  });

  const cards = metrics.slice(0, 3).map((m, i) => {
    const cw = (w - u * 12) / 3;
    const cx = x + u * 3 + i * (cw + u * 3);
    const cy = y + h * 0.56;
    const cg = svgEl('g', { class: 'metric-card' }, g);
    svgEl('rect', { x: cx, y: cy, width: cw, height: h * 0.34, rx: u, fill: UI.panel }, cg);
    const [big, ...rest] = m.split(' ');
    const isNumber = /^[−+-]?\d/.test(big ?? '');
    svgText(cg, cx + cw / 2, cy + h * 0.16, isNumber ? big! : '✓', {
      'font-size': fs * 2.2,
      fill: [UI.green, UI.blue, UI.amber][i]!,
      'text-anchor': 'middle',
    });
    svgText(cg, cx + cw / 2, cy + h * 0.26, (isNumber ? rest.join(' ') : m).slice(0, 22), {
      'font-size': fs * 0.75,
      fill: UI.muted,
      'text-anchor': 'middle',
    });
    cg.style.transformOrigin = `${cx + cw / 2}px ${cy + h * 0.17}px`;
    return cg;
  });

  return {
    update({ hold }) {
      const k = progress(hold, 0.04, 0.36);
      drawOn(flow, k);
      nodes.forEach((n, i) =>
        n.setAttribute(
          'fill',
          clamp(k * (STAGES.length - 1) + 0.01 - i) > 0 || (i === 0 && k > 0) ? UI.green : UI.line,
        ),
      );
      cards.forEach((c, i) => {
        const s = easeOut(progress(hold, 0.38 + i * 0.05, 0.46 + i * 0.05), 1.7);
        setTransform(c, s >= 1 ? '' : `scale(${s.toFixed(3)})`);
        c.style.visibility = s <= 0 ? 'hidden' : '';
      });
    },
  };
}
