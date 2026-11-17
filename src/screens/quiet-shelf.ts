/**
 * Scene 05 phone: The Quiet Shelf. Books slide between Currently Reading, Read Later and
 * Completed as the hold progresses.
 */
import type { Screen } from '../engine/types';
import { easeInOut, lerp, progress } from '../lib/math';
import { screenFrame, svgEl, svgText, UI } from '../lib/svg';

const LISTS = ['Currently Reading', 'Read Later', 'Completed'];
const SPINES = [
  '#c8674a',
  '#3f8f8b',
  '#e3a83b',
  '#5b5aa8',
  '#b5578a',
  '#6f8f5a',
  '#4f7cb8',
  '#a4513a',
];

// Each book: list index and slot at the start, and where it moves (if it moves) + when.
const BOOKS: Array<{ from: [number, number]; to?: [number, number]; when?: [number, number] }> = [
  { from: [0, 0], to: [2, 2], when: [0.5, 0.8] },
  { from: [0, 1] },
  { from: [1, 0], to: [0, 0], when: [0.2, 0.5] },
  { from: [1, 1] },
  { from: [1, 2] },
  { from: [2, 0] },
  { from: [2, 1] },
];

export function quietShelf(rect: SVGGraphicsElement): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  const fs = u * 5.6;
  svgEl('rect', { x, y, width: w, height: h, fill: '#f6efe2' }, g);
  svgEl('rect', { x, y, width: w, height: fs * 3.4, fill: '#2f2c57' }, g);
  svgText(g, x + u * 6, y + fs * 2.2, 'The Quiet Shelf', {
    'font-size': fs * 1.05,
    fill: UI.paper,
    class: 'title-text',
  });

  const top = y + fs * 4.6;
  const rowH = (h - (top - y) - fs * 3.5) / 3;
  const bookW = u * 13;
  const bookH = rowH * 0.55;
  const slot = (list: number, i: number) => ({
    x: x + u * 7 + i * (bookW + u * 4),
    y: top + list * rowH + fs * 1.6,
  });
  LISTS.forEach((name, i) => {
    svgText(g, x + u * 6, top + i * rowH + fs * 0.9, name.toUpperCase(), {
      'font-size': fs * 0.62,
      fill: '#5d566f',
      'letter-spacing': u * 0.4,
    });
    svgEl(
      'rect',
      {
        x: x + u * 5,
        y: top + i * rowH + fs * 1.6 + bookH,
        width: w - u * 10,
        height: u * 1.6,
        fill: '#c9b99d',
      },
      g,
    );
  });

  const books = BOOKS.map((b, i) => {
    const bg = svgEl('g', {}, g);
    const tilt = i % 3 === 1 ? 0.9 : 1;
    svgEl(
      'rect',
      {
        x: 0,
        y: bookH * (1 - tilt),
        width: bookW,
        height: bookH * tilt,
        rx: u,
        fill: SPINES[i % SPINES.length],
      },
      bg,
    );
    svgEl(
      'rect',
      {
        x: u * 2.5,
        y: bookH * 0.25,
        width: bookW - u * 5,
        height: u * 1.4,
        fill: 'rgba(255,255,255,.55)',
      },
      bg,
    );
    return { ...b, g: bg };
  });

  // "Recommended for you" strip.
  const ry = y + h - fs * 3;
  svgEl(
    'rect',
    { x: x + u * 5, y: ry, width: w - u * 10, height: fs * 2.2, rx: u * 2, fill: '#ece2cf' },
    g,
  );
  svgText(g, x + u * 9, ry + fs * 1.4, '★ recommended for you', {
    'font-size': fs * 0.62,
    fill: '#5d566f',
  });

  return {
    update({ hold }) {
      for (const b of books) {
        const a = slot(...b.from);
        let p = a;
        if (b.to && b.when) {
          const k = easeInOut(progress(hold, b.when[0], b.when[1]));
          const d = slot(...b.to);
          // Lift up, across, then down — so books visibly travel between shelves.
          const lift = Math.sin(Math.PI * k) * bookH * 0.6;
          p = { x: lerp(a.x, d.x, k), y: lerp(a.y, d.y, k) - lift };
        }
        b.g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      }
    },
  };
}
