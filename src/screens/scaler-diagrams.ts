/**
 * The diagram in each Scaler lecture video (screens/scaler-study.ts): one per kind of module,
 * drawn into a box. Each returns its pieces in order; the lecture reveals them one by one.
 */
import { svgEl, svgText } from '../lib/svg';

export type DiagramKind =
  'binary-search' | 'uml' | 'architecture' | 'token-bucket' | 'tables' | 'threads' | 'pipeline';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const INK = '#ece6d9';
const MUTED = '#a3a9c2';
const PANEL = '#1d2233';
const LINE = '#3a405c';
const OK = '#5cc38a';
const BAD = '#ef6a5f';

interface Kit {
  piece(): SVGGElement;
  box(parent: Element, x: number, y: number, w: number, h: number, stroke?: string): void;
  label(parent: Element, x: number, y: number, s: string, size?: number, fill?: string): void;
  arrow(parent: Element, x1: number, y1: number, x2: number, y2: number, color?: string): void;
}

function kit(root: Element, fs: number, color: string): Kit {
  return {
    piece: () => svgEl('g', {}, root),
    box(parent, x, y, w, h, stroke = color) {
      svgEl(
        'rect',
        { x, y, width: w, height: h, rx: fs * 0.3, fill: PANEL, stroke, 'stroke-width': fs * 0.1 },
        parent,
      );
    },
    label(parent, x, y, s, size = fs * 0.62, fill = INK) {
      svgText(parent, x, y, s, { 'font-size': size, fill, 'text-anchor': 'middle' });
    },
    arrow(parent, x1, y1, x2, y2, c = color) {
      svgEl(
        'line',
        { x1, y1, x2, y2, stroke: c, 'stroke-width': fs * 0.12, 'stroke-linecap': 'round' },
        parent,
      );
      const a = Math.atan2(y2 - y1, x2 - x1);
      const k = fs * 0.45;
      const p = (d: number) =>
        `${(x2 - k * Math.cos(a + d)).toFixed(1)} ${(y2 - k * Math.sin(a + d)).toFixed(1)}`;
      svgEl('path', { d: `M${x2} ${y2}L${p(0.45)}L${p(-0.45)}Z`, fill: c }, parent);
    },
  };
}

/** Draw a module's diagram into `b`; returns its pieces, in the order they appear. */
export function drawDiagram(
  root: Element,
  kind: DiagramKind,
  b: Box,
  fs: number,
  color: string,
): SVGGElement[] {
  const K = kit(root, fs, color);
  const out: SVGGElement[] = [];
  const add = () => {
    const p = K.piece();
    out.push(p);
    return p;
  };
  const X = (f: number) => b.x + f * b.w;
  const Y = (f: number) => b.y + f * b.h;

  switch (kind) {
    case 'binary-search': {
      // search(a, 26) over a sorted array: the window halves until it lands.
      const vals = [3, 8, 12, 17, 21, 26, 30, 34, 41];
      const n = vals.length;
      const cw = b.w / n;
      const ch = Math.min(cw * 0.9, b.h * 0.28);
      const cy = Y(0.3);
      const cell = (i: number) => b.x + i * cw;
      const p0 = add();
      K.label(p0, X(0.5), Y(0.12), 'search(a, 26) · sorted array', fs * 0.62, MUTED);
      vals.forEach((v, i) => {
        K.box(p0, cell(i) + cw * 0.06, cy, cw * 0.88, ch, LINE);
        K.label(p0, cell(i) + cw / 2, cy + ch * 0.62, String(v));
      });
      const step = (mid: number, from: number, to: number, note: string) => {
        const p = add();
        svgEl(
          'rect',
          {
            x: cell(from) + cw * 0.06,
            y: cy,
            width: (to - from + 1) * cw - cw * 0.12,
            height: ch,
            fill: '#0b0d14',
            opacity: 0.7,
          },
          p,
        );
        K.arrow(p, cell(mid) + cw / 2, cy + ch + fs * 1.4, cell(mid) + cw / 2, cy + ch + fs * 0.2);
        K.label(p, cell(mid) + cw / 2, cy + ch + fs * 2.1, note, fs * 0.55, color);
      };
      step(4, 0, 4, 'mid 21 < 26');
      step(6, 6, 8, 'mid 30 > 26');
      const p3 = add();
      svgEl(
        'rect',
        {
          x: cell(5) + cw * 0.06,
          y: cy,
          width: cw * 0.88,
          height: ch,
          rx: fs * 0.3,
          fill: 'none',
          stroke: OK,
          'stroke-width': fs * 0.2,
        },
        p3,
      );
      K.label(p3, X(0.5), Y(0.95), 'found at index 5 · 3 steps, O(log n)', fs * 0.6, OK);
      break;
    }
    case 'uml': {
      // Strategy: Cart depends on the interface; two payment classes implement it.
      const bw = b.w * 0.34;
      const bh = b.h * 0.26;
      const ix = X(0.55) - bw / 2;
      const iy = Y(0.04);
      const p0 = add();
      K.box(p0, ix, iy, bw, bh);
      K.label(p0, ix + bw / 2, iy + bh * 0.35, '«interface»', fs * 0.5, MUTED);
      K.label(p0, ix + bw / 2, iy + bh * 0.62, 'PaymentStrategy', fs * 0.6);
      K.label(p0, ix + bw / 2, iy + bh * 0.88, 'pay(amount)', fs * 0.5, MUTED);
      const impl = (fx: number, name: string) => {
        const p = add();
        const x = X(fx) - bw / 2;
        const y = Y(0.68);
        K.box(p, x, y, bw, bh, LINE);
        K.label(p, x + bw / 2, y + bh * 0.45, name, fs * 0.6);
        K.label(p, x + bw / 2, y + bh * 0.8, 'pay(amount)', fs * 0.5, MUTED);
        K.arrow(p, x + bw / 2, y, ix + bw / 2 + (fx < 0.55 ? -bw * 0.2 : bw * 0.2), iy + bh);
      };
      impl(0.32, 'UpiPay');
      impl(0.8, 'CardPay');
      const p3 = add();
      const cx = b.x;
      const cy = iy + bh * 0.1;
      K.box(p3, cx, cy, bw * 0.6, bh * 0.8, LINE);
      K.label(p3, cx + bw * 0.3, cy + bh * 0.5, 'Cart', fs * 0.6);
      K.arrow(p3, cx + bw * 0.6, cy + bh * 0.4, ix, iy + bh * 0.5);
      break;
    }
    case 'architecture': {
      // A request through the system: client → CDN → load balancer → API → cache / DB.
      const nodes: Array<[string, number, number]> = [
        ['Client', 0.07, 0.45],
        ['CDN', 0.27, 0.45],
        ['Load bal.', 0.48, 0.45],
        ['API ×3', 0.69, 0.45],
        ['Redis', 0.91, 0.18],
        ['DB shards', 0.91, 0.75],
      ];
      const nw = b.w * 0.17;
      const nh = b.h * 0.22;
      nodes.forEach(([name, fx, fy], i) => {
        const p = add();
        const x = X(fx) - nw / 2;
        const y = Y(fy) - nh / 2;
        K.box(p, x, y, nw, nh, i === 3 ? color : LINE);
        K.label(p, X(fx), Y(fy) + fs * 0.22, name, fs * 0.55);
        if (i === 0) return;
        const [, px, py] = nodes[i >= 4 ? 3 : i - 1]!;
        K.arrow(p, X(px) + nw / 2, Y(py), x, Y(fy));
      });
      break;
    }
    case 'token-bucket': {
      // A bucket of 5 tokens: each request takes one; the sixth is refused (429).
      const bx = X(0.04);
      const bw = b.w * 0.3;
      const top = Y(0.18);
      const bot = Y(0.88);
      const p0 = add();
      svgEl(
        'path',
        {
          d: `M${bx} ${top}L${bx + bw * 0.1} ${bot}H${bx + bw * 0.9}L${bx + bw} ${top}`,
          fill: 'none',
          stroke: color,
          'stroke-width': fs * 0.16,
        },
        p0,
      );
      K.label(p0, bx + bw / 2, Y(0.1), 'bucket · 5 tokens', fs * 0.55, MUTED);
      const r = Math.min(bw * 0.09, (bot - top) * 0.11);
      const tokens = Array.from({ length: 5 }, (_, i) => {
        const cx = bx + bw * (0.22 + (i % 3) * 0.28);
        const cy = bot - r * 1.4 - Math.floor(i / 3) * r * 2.4;
        svgEl('circle', { cx, cy, r, fill: '#f2b84b' }, p0);
        return [cx, cy] as const;
      });
      const rx = X(0.45);
      const rowH = (bot - top) / 6;
      for (let i = 0; i < 6; i++) {
        const p = add();
        const y = top + rowH * (i + 0.7);
        const ok = i < 5;
        K.arrow(p, rx, y - fs * 0.2, rx + b.w * 0.1, y - fs * 0.2, ok ? OK : BAD);
        svgText(
          p,
          rx + b.w * 0.14,
          y,
          ok ? `request ${i + 1} · 200 OK` : 'request 6 · 429 slow down',
          {
            'font-size': fs * 0.55,
            fill: ok ? INK : BAD,
          },
        );
        if (ok) {
          const [cx, cy] = tokens[4 - i]!;
          svgEl('circle', { cx, cy, r: r * 1.05, fill: '#0b0d14' }, p);
          svgEl('circle', { cx, cy, r, fill: 'none', stroke: LINE, 'stroke-dasharray': '2 2' }, p);
        }
      }
      break;
    }
    case 'tables': {
      // users ⋈ orders on user_id, then counted per user.
      const tw = b.w * 0.36;
      const rh = b.h * 0.13;
      const table = (x: number, title: string, head: string, rows: string[]) => {
        const p = add();
        K.label(p, x + tw / 2, Y(0.08), title, fs * 0.6, color);
        [head, ...rows].forEach((row, i) => {
          const y = Y(0.14) + i * rh;
          K.box(p, x, y, tw, rh, i ? LINE : color);
          K.label(p, x + tw / 2, y + rh * 0.68, row, fs * 0.52, i ? INK : MUTED);
        });
        return p;
      };
      table(b.x, 'users', 'id | name', ['1 | Asha', '2 | Ravi', '3 | Meera']);
      table(X(0.62), 'orders', 'id | user_id', ['10 | 1', '11 | 1', '12 | 3', '13 | 2']);
      const p2 = add();
      for (const [u, o] of [
        [1, 1],
        [1, 2],
        [3, 3],
        [2, 4],
      ] as const)
        K.arrow(p2, b.x + tw, Y(0.14) + (u + 0.5) * rh, X(0.62), Y(0.14) + (o + 0.5) * rh);
      const p3 = add();
      K.label(p3, X(0.5), Y(0.97), 'JOIN on user_id → Asha 2 · Ravi 1 · Meera 1', fs * 0.56, OK);
      break;
    }
    case 'threads': {
      // A pool of 4 threads picking up tasks as they free up.
      const lanes = 4;
      const lx = X(0.12);
      const lw = b.w * 0.86;
      const lh = b.h / (lanes + 0.6);
      const p0 = add();
      for (let i = 0; i < lanes; i++) {
        const y = b.y + lh * (i + 0.3);
        K.label(p0, b.x + b.w * 0.05, y + lh * 0.6, `T${i + 1}`, fs * 0.55, MUTED);
        svgEl('rect', { x: lx, y, width: lw, height: lh * 0.7, rx: fs * 0.2, fill: '#141826' }, p0);
      }
      // [lane, start, length] in fractions of the lane.
      const tasks: Array<[number, number, number]> = [
        [0, 0, 0.3],
        [1, 0, 0.45],
        [2, 0, 0.2],
        [3, 0, 0.35],
        [2, 0.22, 0.4],
        [0, 0.32, 0.38],
        [3, 0.37, 0.5],
        [1, 0.47, 0.3],
        [2, 0.64, 0.3],
        [0, 0.72, 0.25],
      ];
      tasks.forEach(([lane, s, l], k) => {
        const p = add();
        const y = b.y + lh * (lane + 0.3);
        svgEl(
          'rect',
          {
            x: lx + s * lw + fs * 0.1,
            y: y + lh * 0.1,
            width: l * lw - fs * 0.2,
            height: lh * 0.5,
            rx: fs * 0.2,
            fill: color,
            opacity: 0.55 + (k % 3) * 0.15,
          },
          p,
        );
        svgText(p, lx + s * lw + fs * 0.5, y + lh * 0.48, `fetch #${k + 1}`, {
          'font-size': fs * 0.45,
          fill: '#0b0d14',
        });
      });
      break;
    }
    case 'pipeline': {
      // The capstone, start to finish.
      const stages = ['Design', 'Build', 'Test', 'Deploy'];
      const sw = b.w * 0.19;
      const sh = b.h * 0.3;
      const sy = Y(0.3);
      stages.forEach((name, i) => {
        const p = add();
        const x = b.x + i * (b.w / 4) + (b.w / 4 - sw) / 2;
        K.box(p, x, sy, sw, sh, i === 3 ? OK : color);
        K.label(p, x + sw / 2, sy + sh * 0.6, name, fs * 0.6);
        if (i) K.arrow(p, x - (b.w / 4 - sw) + fs * 0.2, sy + sh / 2, x - fs * 0.15, sy + sh / 2);
        K.label(
          p,
          x + sw / 2,
          sy + sh + fs * 1.3,
          ['LLD · schema', 'REST API', 'unit + e2e', 'Docker · CI'][i]!,
          fs * 0.5,
          MUTED,
        );
      });
      const p = add();
      K.label(p, X(0.5), Y(0.95), '✓ capstone reviewed', fs * 0.62, OK);
      break;
    }
  }
  return out;
}
