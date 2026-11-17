/**
 * Scene 06 monitor: Khyaati Prakashan's three portals side by side (stacked on narrow screens):
 * Author (manuscript upload), Admin (orders ticking), Marketplace (cart → checkout).
 */
import type { Screen } from '../engine/types';
import { clamp, mod, progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText, UI } from '../lib/svg';

export function khyaatiPortals(rect: SVGGraphicsElement): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  svgEl('rect', { x, y, width: w, height: h, fill: UI.bg }, g);
  const stacked = h > w * 0.9;
  const pad = u * 2.5;
  const n = 3;
  const pw = stacked ? w - pad * 2 : (w - pad * (n + 1)) / n;
  const ph = stacked ? (h - pad * (n + 1)) / n : h - pad * 2;
  const fs = Math.min(pw / 13, ph / 9);
  const panel = (i: number) => ({
    px: stacked ? x + pad : x + pad + i * (pw + pad),
    py: stacked ? y + pad + i * (ph + pad) : y + pad,
  });
  const titles = ['AUTHOR PORTAL', 'ADMIN PORTAL', 'BOOK STORE'];
  titles.forEach((t, i) => {
    const { px, py } = panel(i);
    svgEl('rect', { x: px, y: py, width: pw, height: ph, rx: u, fill: UI.panel }, g);
    svgText(g, px + fs * 0.8, py + fs * 1.5, t, {
      'font-size': fs * 0.75,
      fill: UI.muted,
      'letter-spacing': fs * 0.08,
    });
  });

  // Author: manuscript upload.
  const a = panel(0);
  svgEl(
    'rect',
    {
      x: a.px + fs * 0.8,
      y: a.py + fs * 2.4,
      width: fs * 2.4,
      height: fs * 3,
      rx: fs * 0.2,
      fill: UI.paper,
    },
    g,
  );
  svgEl(
    'path',
    {
      d: `M${a.px + fs * 2.4} ${a.py + fs * 2.4} v${fs * 0.8} h${fs * 0.8}`,
      fill: 'none',
      stroke: '#c9b99d',
      'stroke-width': fs * 0.12,
    },
    g,
  );
  svgText(g, a.px + fs * 3.8, a.py + fs * 3.6, 'manuscript.docx', {
    'font-size': fs * 0.8,
    fill: UI.text,
  });
  svgEl(
    'rect',
    {
      x: a.px + fs * 0.8,
      y: a.py + fs * 6.2,
      width: pw - fs * 1.6,
      height: fs * 0.7,
      rx: fs * 0.35,
      fill: UI.line,
    },
    g,
  );
  const bar = svgEl(
    'rect',
    {
      x: a.px + fs * 0.8,
      y: a.py + fs * 6.2,
      width: 0,
      height: fs * 0.7,
      rx: fs * 0.35,
      fill: UI.green,
    },
    g,
  );
  const upText = svgText(g, a.px + fs * 0.8, a.py + fs * 7.8, 'uploading 0%', {
    'font-size': fs * 0.7,
    fill: UI.muted,
  });

  // Admin: orders today.
  const b = panel(1);
  svgText(g, b.px + fs * 0.8, b.py + fs * 3.1, 'orders today', {
    'font-size': fs * 0.7,
    fill: UI.muted,
  });
  const count = svgText(g, b.px + fs * 0.8, b.py + fs * 5.2, '12', {
    'font-size': fs * 2.2,
    fill: UI.amber,
  });
  svgText(g, b.px + pw - fs * 0.8, b.py + fs * 3.1, 'role: admin', {
    'font-size': fs * 0.65,
    fill: UI.purple,
    'text-anchor': 'end',
  });
  const bars = Array.from({ length: 6 }, (_, i) =>
    svgEl(
      'rect',
      {
        x: b.px + fs * (4.6 + i * 1.2),
        y: b.py + ph - fs,
        width: fs * 0.8,
        height: 0,
        fill: UI.blue,
      },
      g,
    ),
  );

  // Store: cart → checkout.
  const c = panel(2);
  [0, 1].forEach((i) => {
    svgEl(
      'rect',
      {
        x: c.px + fs * (0.8 + i * 2.2),
        y: c.py + fs * 2.3,
        width: fs * 1.8,
        height: fs * 2.6,
        rx: fs * 0.15,
        fill: ['#c8674a', '#3f8f8b'][i],
      },
      g,
    );
  });
  svgText(g, c.px + fs * 5.6, c.py + fs * 3.4, '2 books', { 'font-size': fs * 0.8, fill: UI.text });
  svgText(g, c.px + fs * 5.6, c.py + fs * 4.5, '₹ 598', { 'font-size': fs * 0.8, fill: UI.amber });
  const steps = ['Cart', 'Address', 'Pay'];
  const dots = steps.map((s, i) => {
    const sx = c.px + fs * 0.8 + i * ((pw - fs * 1.6) / 2.4);
    const sy = c.py + fs * 6.6;
    const d = svgEl('circle', { cx: sx + fs * 0.4, cy: sy, r: fs * 0.4, fill: UI.line }, g);
    svgText(g, sx, sy + fs * 1.4, s, { 'font-size': fs * 0.62, fill: UI.muted });
    return d;
  });

  let lastCount = -1;
  return {
    update({ hold, idle, reduced }) {
      const up = reduced ? clamp(hold * 1.6) : mod(idle / 4, 1.25);
      const k = clamp(up);
      bar.setAttribute('width', ((pw - fs * 1.6) * k).toFixed(1));
      setText(upText, k >= 1 ? 'submitted for review ✓' : `uploading ${Math.round(k * 100)}%`);

      const orders =
        12 + Math.floor(progress(hold, 0, 1) * 6) + (reduced ? 0 : Math.floor(idle / 3) % 3);
      if (orders !== lastCount) {
        lastCount = orders;
        setText(count, String(orders));
      }
      bars.forEach((r, i) => {
        const bh = fs * (0.8 + ((i * 7 + orders) % 5) * 0.55);
        r.setAttribute('height', bh.toFixed(1));
        r.setAttribute('y', (b.py + ph - fs * 0.8 - bh).toFixed(1));
      });

      const step = reduced ? Math.min(2, Math.floor(hold * 3)) : Math.floor(mod(idle / 1.4, 3));
      dots.forEach((d, i) => d.setAttribute('fill', i <= step ? UI.green : UI.line));
    },
  };
}
