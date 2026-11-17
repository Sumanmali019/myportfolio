/**
 * A phone screen showing one app: generic, original UI — the app's own logo when Suman supplied
 * one (content/showcase.ts), otherwise an initials tile — the app name, a one-line summary and
 * an optional downloads badge that stamps in.
 * Used on the phones in chapters 03, 05, 08 and 12.
 */
import type { App } from '../content/schema';
import { showcase } from '../content/showcase';
import type { Screen } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { screenFrame, setTransform, svgEl, svgText, UI } from '../lib/svg';
import { wrap } from './sse-vs-ws';

export const APP_COLORS: Record<string, string> = {
  qomix: '#3f8f8b',
  ten90: '#4f7cb8',
  beworld: '#c8674a',
  cadgk: '#c48b26',
  docpharma: '#3f8f6a',
  'klass-online': '#5b5aa8',
  ayantra: '#b5578a',
};

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export interface AppCardOptions {
  /** Hold window [start, end] in which the badge stamps in. */
  badgeAt?: [number, number];
}

export function appCard(rect: SVGGraphicsElement, app: App, opts: AppCardOptions = {}): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  const color = APP_COLORS[app.key] ?? UI.blue;
  const fs = Math.min(u * 7.5, h / 14);
  svgEl('rect', { x, y, width: w, height: h, fill: UI.paper }, g);
  svgEl('rect', { x, y, width: w, height: h * 0.34, fill: color }, g);
  // Status bar.
  svgText(g, x + u * 6, y + fs * 1.2, '', {
    'font-size': fs * 0.6,
    fill: UI.paper,
    'data-date': '',
  });
  // Initials tile.
  const tile = fs * 3.2;
  svgEl(
    'rect',
    {
      x: x + w / 2 - tile / 2,
      y: y + h * 0.34 - tile / 2,
      width: tile,
      height: tile,
      rx: tile * 0.24,
      fill: UI.paper,
    },
    g,
  );
  svgEl(
    'rect',
    {
      x: x + w / 2 - tile / 2 + fs * 0.25,
      y: y + h * 0.34 - tile / 2 + fs * 0.25,
      width: tile - fs * 0.5,
      height: tile - fs * 0.5,
      rx: tile * 0.2,
      fill: color,
    },
    g,
  );
  const logo = showcase.find((s) => s.key === app.key)?.logo;
  if (logo)
    svgEl(
      'image',
      {
        href: logo,
        x: x + w / 2 - tile / 2 + fs * 0.25,
        y: y + h * 0.34 - tile / 2 + fs * 0.25,
        width: tile - fs * 0.5,
        height: tile - fs * 0.5,
      },
      g,
    );
  else
    svgText(g, x + w / 2, y + h * 0.34 + fs * 0.45, initials(app.name), {
      'font-size': fs * 1.2,
      fill: UI.paper,
      'text-anchor': 'middle',
      class: 'title-text',
    });
  const nameSize = app.name.length > 14 ? fs * 0.78 : fs;
  svgText(g, x + w / 2, y + h * 0.34 + tile * 0.5 + fs * 1.4, app.name, {
    'font-size': nameSize,
    fill: '#2a2438',
    'text-anchor': 'middle',
  });
  const cols = Math.max(10, Math.floor((w - u * 12) / (fs * 0.62 * 0.72)));
  wrap(app.summary, cols)
    .slice(0, 3)
    .forEach((line, i) =>
      svgText(g, x + w / 2, y + h * 0.34 + tile * 0.5 + fs * (2.6 + i * 0.95), line, {
        'font-size': fs * 0.62,
        fill: '#5d566f',
        'text-anchor': 'middle',
      }),
    );
  // "Open" button.
  svgEl(
    'rect',
    {
      x: x + w * 0.25,
      y: y + h - fs * 4.4,
      width: w * 0.5,
      height: fs * 1.6,
      rx: fs * 0.8,
      fill: color,
    },
    g,
  );
  svgText(g, x + w / 2, y + h - fs * 3.3, app.role ? app.role : 'Open', {
    'font-size': fs * 0.7,
    fill: UI.paper,
    'text-anchor': 'middle',
  });

  let badge: SVGGElement | null = null;
  if (app.badge) {
    badge = svgEl('g', { class: 'app-badge' }, g);
    const bw = w * 0.82;
    const by = y + h - fs * 2.2;
    svgEl(
      'rect',
      { x: x + (w - bw) / 2, y: by, width: bw, height: fs * 1.5, rx: fs * 0.3, fill: '#2a2438' },
      badge,
    );
    svgText(badge, x + w / 2, by + fs * 1.05, `★ ${app.badge}`, {
      'font-size': fs * 0.66,
      fill: UI.amber,
      'text-anchor': 'middle',
    });
    badge.style.transformOrigin = `${x + w / 2}px ${by + fs * 0.75}px`;
  }
  const [a, b] = opts.badgeAt ?? [0.3, 0.45];
  return {
    update({ hold }) {
      if (!badge) return;
      const k = easeOut(progress(hold, a, b), 1.8);
      setTransform(badge, k >= 1 ? '' : `scale(${k.toFixed(3)})`);
      badge.style.visibility = k <= 0 ? 'hidden' : '';
    },
  };
}
