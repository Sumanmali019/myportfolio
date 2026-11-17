/**
 * 12 · The numbers — phones light up across the skyline like a city at night, one cluster
 * per app (bigger clusters for bigger download counts). The odometer rolls to the total,
 * BeWorld's 500K+ gets a callout, and teammates cheer.
 */
import type { SceneModule } from '../engine/types';
import { formatCount } from '../engine/clock';
import { clamp, easeInOut, easeOut, progress } from '../lib/math';
import { boxOf, qs, qsa, setAttr, setScale, setText, svgEl, svgText } from '../lib/svg';
import { APP_COLORS } from '../screens/app-card';

let phones: Array<{ screen: SVGGraphicsElement; at: number }> = [];
let odometer: SVGTextElement[] = [];
let callout: SVGGraphicsElement | null = null;
let cheer: SVGGraphicsElement[] = [];
let total = 0;

const scene: SceneModule = {
  id: '12-numbers',
  prepare(svg, { data, layout }) {
    phones = [];
    total = data.profile.apps.reduce((n, a) => n + (a.downloads ?? 0), 0);
    const apps = new Map(data.profile.apps.map((a) => [a.key, a]));
    const small = layout === 'mobile';
    qsa(svg, '[data-cluster]').forEach((area, ci) => {
      const key = area.getAttribute('data-cluster') ?? '';
      const app = apps.get(key);
      const b = boxOf(area);
      const pw = small ? 10 : 16;
      const ph = small ? 17 : 28;
      const gap = small ? 4 : 6;
      const cols = Math.floor(b.w / (pw + gap));
      const rows = Math.floor((b.h - (small ? 16 : 24)) / (ph + gap));
      // Bigger download counts → more phones (log scale), at least a handful.
      const count = clamp(
        Math.round(Math.log10(Math.max(app?.downloads ?? 2000, 2000)) * 4 - 8),
        5,
        cols * rows,
      );
      const color = APP_COLORS[key] ?? '#f2b84b';
      for (let i = 0; i < count; i++) {
        const x = b.x + (i % cols) * (pw + gap);
        const y = b.y + b.h - (small ? 16 : 24) - (Math.floor(i / cols) + 1) * (ph + gap);
        svgEl(
          'rect',
          { x, y, width: pw, height: ph, rx: pw * 0.2, fill: '#2a2438' },
          area.parentElement!,
        );
        const screen = svgEl(
          'rect',
          {
            x: x + pw * 0.12,
            y: y + ph * 0.1,
            width: pw * 0.76,
            height: ph * 0.8,
            rx: 1.5,
            fill: color,
            class: 'pop',
          },
          area.parentElement!,
        );
        phones.push({ screen, at: 0.04 + ci * 0.07 + (i / count) * 0.18 });
      }
      svgText(area.parentElement!, b.x, b.y + b.h - (small ? 3 : 4), app?.name ?? key, {
        'font-size': small ? 9 : 12,
        fill: '#c9cbe0',
      });
    });
    odometer = qsa<SVGTextElement>(svg, '[data-odometer]');
    callout = qs(svg, '[data-callout]');
    cheer = qsa(svg, '[data-cheer]');
  },
  update({ hold, idle, reduced }) {
    for (const p of phones) setScale(p.screen, hold >= p.at ? 1 : 0);
    // The engine writes the running total; here it rolls up from 60% to the full count.
    const roll = easeInOut(progress(hold, 0.1, 0.6));
    for (const o of odometer) setText(o, formatCount(total * (0.6 + 0.4 * roll)));
    if (callout) setScale(callout, easeOut(progress(hold, 0.6, 0.7), 1.8));
    cheer.forEach((c, i) => {
      const on = hold > 0.65 && !reduced;
      const y = on ? -Math.abs(Math.sin(idle * 5 + i)) * 14 : 0;
      setAttr(c, 'transform', y ? `translate(0 ${y.toFixed(1)})` : '');
    });
  },
};

export default scene;
