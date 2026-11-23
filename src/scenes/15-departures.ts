/**
 * 15 · Departures — a split-flap board flips letter by letter to LET'S CONNECT.
 * Its rows are the real contact links: each row is a `[data-link]` rect, so LinkLayer puts a
 * focusable control exactly over it. The first row is his email address itself, in capitals
 * (its button copies it). "See my CV" and "Replay the journey" grow in.
 */
import type { SceneModule } from '../engine/types';
import { clamp, easeOut, progress } from '../lib/math';
import { boxOf, qs, qsa, setScale, setText, svgEl, svgText } from '../lib/svg';

const FLAPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ROWS: Array<[key: string, label: string]> = [
  // The email row shows the address (data.profile.contact.email, in capitals, set in prepare).
  ['email', ''],
  ['linkedin', 'LINKEDIN'],
  ['github', 'GITHUB'],
  ['resume', 'RESUME'],
];

interface Flap {
  el: SVGTextElement;
  final: string;
  at: number;
  seed: number;
}

let flaps: Flap[] = [];
let ctas: SVGGraphicsElement[] = [];

function flapRow(
  parent: Element,
  x: number,
  y: number,
  cell: number,
  text: string,
  at: number,
  cols: number,
  size: number,
): Flap[] {
  const out: Flap[] = [];
  const chars = text.padEnd(cols, ' ').slice(0, cols);
  for (let i = 0; i < cols; i++) {
    svgEl(
      'rect',
      {
        x: x + i * cell,
        y: y - size * 1.05,
        width: cell - 2,
        height: size * 1.4,
        rx: 2,
        fill: '#22263b',
      },
      parent,
    );
    svgEl(
      'rect',
      { x: x + i * cell, y: y - size * 0.36, width: cell - 2, height: 1.2, fill: '#14172a' },
      parent,
    );
    const el = svgText(parent, x + i * cell + (cell - 2) / 2, y, '', {
      'font-size': size,
      fill: '#f2b84b',
      'text-anchor': 'middle',
    });
    out.push({ el, final: chars[i]!, at: at + i * 0.012, seed: i * 7 + text.length });
  }
  return out;
}

const scene: SceneModule = {
  id: '15-departures',
  prepare(svg, { layout, data }) {
    flaps = [];
    ctas = qsa(svg, '[data-cta]');
    const board = qs(svg, '[data-board]');
    if (!board) return;
    const b = boxOf(board);
    const parent = board.parentElement!;
    const small = layout === 'mobile';
    const cols = small ? 13 : 16;
    const cell = (b.w - (small ? 24 : 48)) / cols;
    const size = cell * 0.78;
    const x = b.x + (small ? 12 : 24);
    flaps.push(
      ...flapRow(
        parent,
        x,
        b.y + size * (small ? 3.9 : 2.5),
        cell,
        "LET'S CONNECT",
        0.04,
        cols,
        size,
      ),
    );
    const rowSize = size * 0.62;
    const rowCell = cell * 0.62;
    const rowCols = 9;
    const email = data.profile.contact.email;
    // Room for the row's text left of its button.
    const rowRoom = b.w - (small ? 12 : 36) - (small ? 84 : 120);
    ROWS.forEach(([key, label], i) => {
      const text = key === 'email' ? email.toUpperCase() : label;
      const cols = key === 'email' ? text.length : rowCols;
      const c = key === 'email' ? Math.min(rowCell, rowRoom / text.length) : rowCell;
      const sz = rowSize * (c / rowCell);
      const ry = b.y + size * (small ? 5.6 : 4.2) + i * rowSize * 2.3;
      svgEl(
        'rect',
        {
          x: x - 6,
          y: ry - rowSize * 0.4,
          width: b.w - (small ? 12 : 36),
          height: rowSize * 2,
          rx: 6,
          fill: '#1b1f33',
          'data-link': key,
        },
        parent,
      );
      flaps.push(...flapRow(parent, x, ry + rowSize * 1.05, c, text, 0.3 + i * 0.06, cols, sz));
    });
  },
  update({ hold, reduced }) {
    for (const f of flaps) {
      const k = reduced ? 1 : clamp(progress(hold, f.at, f.at + 0.1));
      if (k >= 1 || f.final === ' ') {
        setText(f.el, k > 0 || reduced ? f.final : '');
      } else if (k <= 0) {
        setText(f.el, '');
      } else {
        setText(f.el, FLAPS[(f.seed + Math.floor(k * 23)) % FLAPS.length]!);
      }
    }
    ctas.forEach((c, i) =>
      setScale(c, reduced ? 1 : easeOut(progress(hold, 0.55 + i * 0.06, 0.65 + i * 0.06), 1.6)),
    );
  },
};

export default scene;
