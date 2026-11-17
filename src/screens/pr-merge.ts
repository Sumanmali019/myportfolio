/**
 * Chapter 10 (★ highlight) monitor: the Flutter PR, played slowly through the hold —
 *   review requested → reviewer comments → checks pass one by one → a large "Merged" stamp
 *   → "Merged into the official Flutter repository" types out.
 * Pure function of hold progress, so it plays backwards when you scroll up.
 */
import type { Screen } from '../engine/types';
import { clamp, easeOut, progress } from '../lib/math';
import { drawOn, screenFrame, setText, setTransform, svgEl, svgText, UI } from '../lib/svg';

const CHECKS = ['analyze', 'framework tests', 'build'];
const COMMENTS = [
  ['reviewer', 'Can you add a regression test?'],
  ['you', 'Added — covers the rotate case.'],
];
const FINAL = 'Merged into the official Flutter repository';

export function prMerge(rect: SVGGraphicsElement): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  const fs = Math.min(u * 3, h / 22);
  const left = x + u * 3;
  svgEl('rect', { x, y, width: w, height: h, fill: UI.bg }, g);
  svgEl('rect', { x, y, width: w, height: fs * 2.6, fill: UI.panel }, g);
  svgText(g, left, y + fs * 1.7, 'flutter/flutter  ·  pull request', {
    'font-size': fs * 0.9,
    fill: UI.muted,
  });
  svgText(g, left, y + fs * 4.3, 'fix: sample app crash on rotate', {
    'font-size': fs * 1.15,
    fill: UI.text,
  });

  const pill = svgEl(
    'rect',
    { x: left, y: y + fs * 5.4, width: fs * 10, height: fs * 1.8, rx: fs * 0.9, fill: UI.amber },
    g,
  );
  const pillText = svgText(g, left + fs * 0.8, y + fs * 6.65, 'Review requested', {
    'font-size': fs * 0.85,
    fill: '#1d2133',
  });

  // Reviewer comments.
  const comments = COMMENTS.map(([who, text], i) => {
    const cy = y + fs * (8.4 + i * 2.6);
    const cg = svgEl('g', { class: 'pr-comment' }, g);
    svgEl(
      'circle',
      { cx: left + fs * 0.8, cy: cy + fs * 0.9, r: fs * 0.8, fill: i ? UI.green : UI.blue },
      cg,
    );
    svgEl(
      'rect',
      {
        x: left + fs * 2,
        y: cy,
        width: w - u * 6 - fs * 2,
        height: fs * 2,
        rx: fs * 0.3,
        fill: UI.panel,
      },
      cg,
    );
    svgText(cg, left + fs * 2.6, cy + fs * 1.35, `${who}: ${text}`, {
      'font-size': fs * 0.8,
      fill: UI.text,
    });
    cg.style.transformOrigin = 'left center';
    return cg;
  });

  // Checks.
  const checkTop = y + fs * 14.4;
  const checks = CHECKS.map((name, i) => {
    const cy = checkTop + i * fs * 2;
    const cx = left + fs * 0.7;
    const ring = svgEl(
      'circle',
      { cx, cy, r: fs * 0.55, fill: 'none', stroke: UI.amber, 'stroke-width': fs * 0.18 },
      g,
    );
    const tick = svgEl(
      'path',
      {
        d: `M${cx - fs * 0.3} ${cy} l${fs * 0.22} ${fs * 0.24} l${fs * 0.4} ${-fs * 0.48}`,
        fill: 'none',
        stroke: UI.green,
        'stroke-width': fs * 0.2,
        'stroke-linecap': 'round',
      },
      g,
    );
    svgText(g, cx + fs * 1.2, cy + fs * 0.3, `ci / ${name}`, {
      'font-size': fs * 0.8,
      fill: UI.text,
    });
    const status = svgText(g, x + w - u * 4, cy + fs * 0.3, 'queued', {
      'font-size': fs * 0.75,
      fill: UI.muted,
      'text-anchor': 'end',
    });
    return { ring, tick, status };
  });

  // Final line, typed.
  const final = svgText(g, left, y + h - fs * 1.4, '', { 'font-size': fs * 0.95, fill: UI.purple });

  // Big stamp.
  const sx = x + w * 0.62;
  const sy = y + h * 0.5;
  const stamp = svgEl('g', { class: 'pr-stamp' }, g);
  svgEl(
    'rect',
    {
      x: sx - fs * 6,
      y: sy - fs * 1.8,
      width: fs * 12,
      height: fs * 3.6,
      rx: fs * 0.5,
      fill: 'none',
      stroke: UI.purple,
      'stroke-width': fs * 0.35,
    },
    stamp,
  );
  svgText(stamp, sx, sy + fs * 0.75, 'MERGED', {
    'font-size': fs * 2.2,
    fill: UI.purple,
    'text-anchor': 'middle',
    'letter-spacing': fs * 0.2,
  });
  stamp.style.transformOrigin = `${sx}px ${sy}px`;

  let stage = -1;
  return {
    update({ hold }) {
      comments.forEach((c, i) => {
        const k = easeOut(progress(hold, 0.12 + i * 0.08, 0.18 + i * 0.08), 1.6);
        setTransform(c, k >= 1 ? '' : `scale(${k.toFixed(3)})`);
        c.style.visibility = k <= 0 ? 'hidden' : '';
      });
      const checksT = progress(hold, 0.32, 0.6);
      checks.forEach((c, i) => {
        const k = clamp(checksT * CHECKS.length - i);
        drawOn(c.tick, k);
        c.ring.setAttribute('stroke', k >= 1 ? UI.green : UI.amber);
        setText(c.status, k >= 1 ? 'passed' : k > 0 ? 'running…' : 'queued');
      });
      const merged = hold >= 0.64;
      const next = merged ? 3 : checksT > 0 ? 2 : hold >= 0.12 ? 1 : 0;
      if (next !== stage) {
        stage = next;
        pill.setAttribute('fill', [UI.amber, UI.blue, UI.blue, UI.purple][next]!);
        setText(
          pillText,
          ['Review requested', 'Changes discussed', 'Checks running', 'Merged'][next]!,
        );
      }
      const st = easeOut(progress(hold, 0.62, 0.7), 2.2);
      setTransform(stamp, `rotate(-8deg) scale(${(st ? 2.2 - 1.2 * st : 0).toFixed(3)})`);
      stamp.style.visibility = st > 0 ? '' : 'hidden';
      const n = Math.round(progress(hold, 0.72, 0.92) * FINAL.length);
      setText(final, FINAL.slice(0, n));
    },
  };
}
