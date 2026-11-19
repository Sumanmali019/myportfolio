/**
 * Objects and their parts.
 *
 * An object is a top-level `<g data-id>` of a scene. Its parts are its sub-shapes in drawing
 * order (back → front): the children of its innermost wrapper (single-child groups are looked
 * through), each wrapped once in `<g class="pt">` so it can be scaled without touching the
 * shape's own attributes. Each part's box is measured once and fixes how it grows:
 *   'v'     tall (h > 2.4 w): scales vertically from its top edge
 *   'h'     wide (w > 2.4 h): scales horizontally from its left edge
 *   'c'     otherwise: scales evenly about its centre
 *   'line'  an unfilled stroke (a wire, a line, an outline): drawn along its length
 *
 * Within an object the parts are staggered: with n parts, each takes a window
 * w = min(.5, max(.05, 3 / n)) of the object's progress, part k starting at k / (n − 1) × (1 − w).
 * Building runs back → front; taking apart front → back (shelves and book stacks: in a seeded
 * shuffle). Every write is cached, so a part that doesn't change costs nothing.
 *
 * Suman (the avatar: `data-view`, or an id `me…`) is never split into parts: he stays whole
 * through every transition (transition.ts moves him, or slides him in and out, in one piece).
 */
import { userBox, type Box } from '../lib/svg';
import { backSoft, easeIn, easeOut, map } from './easing';

export type Mode = 'c' | 'h' | 'v' | 'line';

export interface Pt {
  el: SVGGElement;
  mode: Mode;
  /** Scale origin (user units of the part's parent). */
  ox: number;
  oy: number;
  /** A wide panel inside a small screen: builds without overshoot, staying inside the frame. */
  flat: boolean;
  /** 'line' parts: the stroke and its dash length. */
  stroke: SVGGeometryElement | null;
  len: number;
  /** Last applied state (rounded), to skip unchanged writes. */
  key: string;
}

export interface Obj {
  el: SVGGraphicsElement;
  id: string;
  /** What pairs it with an object in the next scene: `data-morph`, else `data-id`. */
  key: string;
  /** Avatar view (`data-view`: front / back), if any. */
  view: string | null;
  /** Suman: always whole, never taken apart. */
  avatar: boolean;
  /** Box in the scene's root user units. */
  box: Box;
  parts: Pt[];
  /** Slot of each part when taking apart (front → back, or shuffled). */
  apart: number[];
}

const NOT_DRAWN = new Set([
  'defs',
  'title',
  'desc',
  'style',
  'script',
  'metadata',
  'linearGradient',
  'radialGradient',
  'clipPath',
  'mask',
  'filter',
  'pattern',
  'symbol',
]);
const LOOK_THROUGH = new Set(['g', 'svg', 'a']);
const SCREEN = /monitor|phone|screen|laptop|tablet/;
const SHUFFLED = /shelf|book/;

const drawn = (el: Element): Element[] =>
  Array.from(el.children).filter((c) => !NOT_DRAWN.has(c.localName));

/** The elements that become an object's parts. */
function partElements(obj: Element): Element[] {
  let node = obj;
  let kids = drawn(node);
  while (kids.length === 1 && LOOK_THROUGH.has(kids[0]!.localName)) {
    node = kids[0]!;
    kids = drawn(node);
  }
  return kids;
}

function wrap(el: Element): SVGGElement {
  const parent = el.parentElement;
  if (el.localName === 'g' && el.classList.contains('pt')) return el as SVGGElement;
  if (parent?.localName === 'g' && parent.classList.contains('pt'))
    return parent as unknown as SVGGElement;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'pt');
  el.before(g);
  g.appendChild(el);
  return g;
}

const isLine = (el: Element): el is SVGGeometryElement => {
  if (!['path', 'line', 'polyline'].includes(el.localName)) return false;
  if (el.localName !== 'line' && (el.getAttribute('fill') ?? getComputedStyle(el).fill) !== 'none')
    return false;
  const stroke = el.getAttribute('stroke') ?? getComputedStyle(el).stroke;
  return !!stroke && stroke !== 'none';
};

function measure(g: SVGGElement, screen: boolean): Pt {
  const child = g.firstElementChild;
  let b: DOMRect | { x: number; y: number; width: number; height: number };
  try {
    b = g.getBBox();
  } catch {
    b = { x: 0, y: 0, width: 0, height: 0 };
  }
  const line = child && isLine(child) ? child : null;
  let len = 0;
  if (line) {
    try {
      len = line.getTotalLength() * 1.04 + 4;
    } catch {
      len = 0;
    }
  }
  const mode: Mode =
    line && len > 4
      ? 'line'
      : b.height > 2.4 * b.width
        ? 'v'
        : b.width > 2.4 * b.height
          ? 'h'
          : 'c';
  return {
    el: g,
    mode,
    ox: mode === 'h' ? b.x : b.x + b.width / 2,
    oy: mode === 'v' ? b.y : b.y + b.height / 2,
    flat: screen && b.width > 50,
    stroke: mode === 'line' ? line : null,
    len,
    key: '',
  };
}

/** A small seeded shuffle (mulberry32), so the same object always comes apart the same way. */
function shuffled(n: number, seedText: string): number[] {
  let seed = 0;
  for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Wrap and measure a scene's objects (top-level `[data-id]`, minus `[data-static]`). */
export function collectObjects(svg: SVGSVGElement): Obj[] {
  return Array.from(svg.querySelectorAll<SVGGraphicsElement>('[data-id]'))
    .filter((el) => !el.parentElement?.closest('[data-id]') && !el.hasAttribute('data-static'))
    .map((el) => {
      const id = el.dataset.id ?? '';
      const screen = SCREEN.test(id);
      const avatar = el.hasAttribute('data-view') || id === 'me' || id.startsWith('me-');
      const parts = avatar ? [] : partElements(el).map((c) => measure(wrap(c), screen));
      const n = parts.length;
      const apart = SHUFFLED.test(id) ? shuffled(n, id) : parts.map((_, k) => n - 1 - k);
      return {
        el,
        id,
        key: el.dataset.morph ?? id,
        view: el.dataset.view ?? null,
        avatar,
        box: userBox(el, svg),
        parts,
        apart,
      };
    });
}

/** Window and start of slot `k` of `n` (object progress units). */
export function slot(k: number, n: number): [number, number] {
  const w = Math.min(0.5, Math.max(0.05, 3 / n));
  const start = n > 1 ? (k / (n - 1)) * (1 - w) : 0;
  return [start, start + w];
}

function setPart(pt: Pt, s: number): void {
  const key = s <= 0.002 ? 'x' : Math.abs(s - 1) < 0.0005 ? '1' : s.toFixed(3);
  if (key === pt.key) return;
  pt.key = key;
  const el = pt.el;
  if (key === 'x') {
    el.style.display = 'none';
    return;
  }
  if (el.style.display) el.style.display = '';
  if (key === '1') {
    el.removeAttribute('transform');
    return;
  }
  const sx = pt.mode === 'v' ? 1 : s;
  const sy = pt.mode === 'h' ? 1 : s;
  const r = (v: number) => Math.round(v * 1000) / 1000;
  el.setAttribute(
    'transform',
    `matrix(${r(sx)} 0 0 ${r(sy)} ${r(pt.ox * (1 - sx))} ${r(pt.oy * (1 - sy))})`,
  );
}

function setLine(pt: Pt, f: number): void {
  const key = f <= 0.002 ? 'x' : f >= 0.9995 ? '1' : `L${f.toFixed(3)}`;
  if (key === pt.key) return;
  pt.key = key;
  const el = pt.el;
  const st = pt.stroke!.style;
  if (key === 'x') {
    el.style.display = 'none';
    return;
  }
  if (el.style.display) el.style.display = '';
  if (key === '1') {
    st.strokeDasharray = '';
    st.strokeDashoffset = '';
    return;
  }
  st.strokeDasharray = `${pt.len} ${pt.len}`;
  st.strokeDashoffset = String(Math.round(pt.len * (1 - f) * 100) / 100);
}

/**
 * Build an object to progress `v` (0 = nothing, 1 = whole), or take it apart (`building`
 * false: 0 = whole, 1 = gone).
 */
export function applyObject(o: Obj, v: number, building: boolean): void {
  const n = o.parts.length;
  for (let k = 0; k < n; k++) {
    const pt = o.parts[k]!;
    const [a, b] = slot(building ? k : o.apart[k]!, n);
    const l = map(v, a, b);
    if (pt.mode === 'line') setLine(pt, building ? easeOut(l) : 1 - easeIn(l));
    else setPart(pt, building ? (pt.flat ? easeOut(l) : backSoft(l)) : 1 - easeIn(l));
  }
}

/** Whole, as drawn. */
export const wholeObject = (o: Obj): void => applyObject(o, 1, true);

/** Fully taken apart. */
export const hideObject = (o: Obj): void => applyObject(o, 0, true);
