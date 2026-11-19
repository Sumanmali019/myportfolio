/**
 * The team's sprint board (chapter 09). Given a hold window, its tickets move across the board
 * one at a time, slowly enough to read: "GenAI ext" TO DO → DOING, then "Release 2.4" DOING →
 * DONE, then "API review" TO DO → DOING (a pure function of hold, so it reverses). Without a
 * window, one card slides DOING → DONE on a loop.
 */
import type { Screen } from '../engine/types';
import { easeInOut, lerp, mod, progress } from '../lib/math';
import { screenFrame, svgEl, svgText, UI } from '../lib/svg';
import type { Window } from './lead-workday';

const CARDS = [
  { title: 'API review', tag: UI.blue, col: 0 },
  { title: 'GenAI ext', tag: UI.purple, col: 0 },
  { title: '16KB .so audit', tag: UI.green, col: 1 },
  { title: 'Release 2.4', tag: UI.amber, col: 1 },
  { title: 'Mentor 1:1', tag: UI.red, col: 2 },
  { title: 'CI to Codemagic', tag: UI.green, col: 2 },
];
const COLUMNS = ['TO DO', 'DOING', 'DONE'];
const MOVER = 3; // "Release 2.4"
/** With a window: [card, to column, to row, start, end] (in the window's 0–1). */
const MOVES: Array<[number, number, number, number, number]> = [
  [1, 1, 2, 0.08, 0.32], // GenAI ext → DOING
  [3, 2, 2, 0.4, 0.64], // Release 2.4 → DONE
  [0, 1, 1, 0.72, 0.94], // API review → DOING, where Release 2.4 was
];

export function standupBoard(
  rect: SVGGraphicsElement,
  title = 'STANDUP · THU',
  win?: Window,
): Screen {
  const f = screenFrame(rect);
  const { g, x, y, w, h, u } = f;
  svgEl('rect', { x, y, width: w, height: h, fill: UI.bg }, g);
  svgEl('rect', { x, y, width: w, height: u * 9, fill: UI.panel }, g);
  svgText(g, x + u * 3, y + u * 6, title, { 'font-size': u * 3.6, fill: UI.text });
  svgEl(
    'circle',
    { cx: x + w - u * 5, cy: y + u * 4.5, r: u * 1.6, fill: UI.green, class: 'idle-blink' },
    g,
  );

  const pad = u * 3;
  const colW = (w - pad * 4) / 3;
  const top = y + u * 13;
  // With moving tickets a column may hold three cards.
  const cardH = win ? Math.min(u * 11, (h - u * 29) / 3) : Math.min(u * 13, (h - u * 20) / 2.6);
  COLUMNS.forEach((name, c) => {
    const cx = x + pad + c * (colW + pad);
    svgEl(
      'rect',
      { x: cx, y: top, width: colW, height: h - (top - y) - pad, rx: u, fill: UI.panel },
      g,
    );
    svgText(g, cx + u * 2, top + u * 4.5, name, {
      'font-size': u * 2.8,
      fill: UI.muted,
      'letter-spacing': u * 0.3,
    });
  });

  const slot = (col: number, row: number) => ({
    x: x + pad + col * (colW + pad) + u * 1.5,
    y: top + u * 7 + row * (cardH + u * 2),
  });

  const rows = [0, 0, 0];
  const cards = CARDS.map((c) => {
    const row = rows[c.col]!++;
    const home = slot(c.col, row);
    const cg = svgEl('g', {}, g);
    svgEl(
      'rect',
      { x: 0, y: 0, width: colW - u * 3, height: cardH, rx: u * 0.8, fill: UI.paper },
      cg,
    );
    svgEl('rect', { x: 0, y: 0, width: u * 1.2, height: cardH, rx: u * 0.6, fill: c.tag }, cg);
    // Long titles shrink to fit the card.
    const size = Math.min(u * 2.9, (colW - u * 6) / (c.title.length * 0.62));
    svgText(cg, u * 3, cardH * 0.45, c.title, { 'font-size': size, fill: '#2a2438' });
    svgEl('circle', { cx: colW - u * 7, cy: cardH * 0.72, r: u * 1.8, fill: c.tag }, cg);
    svgEl(
      'rect',
      {
        x: u * 3,
        y: cardH * 0.65,
        width: colW * 0.4,
        height: u * 1.2,
        rx: u * 0.6,
        fill: '#d9d0c0',
      },
      cg,
    );
    cg.setAttribute('transform', `translate(${home.x} ${home.y})`);
    return { g: cg, home };
  });
  // The mover's destination: below the DONE cards.
  const done = slot(2, 2);

  // Moving cards travel over the others.
  if (win) for (const [i] of MOVES) g.appendChild(cards[i]!.g);

  return {
    update({ idle, reduced, hold }) {
      if (win) {
        const t = progress(hold, win[0], win[1]);
        for (const [i, col, row, a, b] of MOVES) {
          const c = cards[i]!;
          const to = slot(col, row);
          const k = easeInOut(progress(t, a, b));
          const px = lerp(c.home.x, to.x, k);
          const py = lerp(c.home.y, to.y, k);
          c.g.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)})`);
        }
        return;
      }
      const m = cards[MOVER]!;
      // Loop: 0–0.35 waits in DOING, 0.35–0.6 slides to DONE, then rests; wraps every 5 s.
      const phase = reduced ? (hold > 0.5 ? 1 : 0) : mod(idle / 5, 1);
      const k = easeInOut(progress(phase, 0.35, 0.6));
      const px = lerp(m.home.x, done.x, k);
      const py = lerp(m.home.y, done.y, k);
      m.g.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)})`);
    },
  };
}
