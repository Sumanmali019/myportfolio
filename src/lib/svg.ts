/** DOM/SVG helpers. Everything here writes only when a value actually changes. */
import { r2 } from './math';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const qs = <T extends Element = SVGGraphicsElement>(
  root: ParentNode,
  sel: string,
): T | null => root.querySelector<T>(sel);

export const qsa = <T extends Element = SVGGraphicsElement>(root: ParentNode, sel: string): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

type Attrs = Record<string, string | number | undefined>;

/** Create an SVG element with attributes, optionally appending it to `parent`. */
export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
}

/** Create an SVG <text> node. Uses the DM Mono UI face unless a class overrides it. */
export function svgText(
  parent: Element,
  x: number,
  y: number,
  text: string,
  attrs: Attrs = {},
): SVGTextElement {
  const t = svgEl('text', { x, y, class: 'ui-text', ...attrs }, parent);
  t.textContent = text;
  return t;
}

/** Set an attribute only when its value changed. */
export function setAttr(el: Element, name: string, value: string | number): void {
  const v = String(value);
  if (el.getAttribute(name) !== v) el.setAttribute(name, v);
}

export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

type Styled = Element & ElementCSSInlineStyle;

/** Scale an element about its own centre (requires transform-box: fill-box — see global.css). */
export function setScale(el: Styled, s: number, sy = s): void {
  const tf = s === 1 && sy === 1 ? '' : `scale(${r2(s)}, ${r2(sy)})`;
  if (el.style.transform !== tf) el.style.transform = tf;
  const vis = s <= 0.001 || sy <= 0.001 ? 'hidden' : '';
  if (el.style.visibility !== vis) el.style.visibility = vis;
}

export function setTransform(el: Styled, tf: string): void {
  if (el.style.transform !== tf) el.style.transform = tf;
}

export function setVisible(el: Styled, visible: boolean): void {
  const v = visible ? '' : 'hidden';
  if (el.style.visibility !== v) el.style.visibility = v;
}

export function setOpacity(el: Styled, o: number): void {
  const v = o >= 1 ? '' : String(r2(o));
  if (el.style.opacity !== v) el.style.opacity = v;
}

const lengths = new WeakMap<SVGGeometryElement, number>();

/** getTotalLength(), cached — it forces layout and is expensive. */
export function pathLength(el: SVGGeometryElement): number {
  let len = lengths.get(el);
  if (len === undefined) {
    try {
      len = el.getTotalLength();
    } catch {
      len = 0;
    }
    lengths.set(el, len);
  }
  return len;
}

/** Stroke draw-on: 0 = nothing drawn, 1 = fully drawn. */
export function drawOn(el: SVGGeometryElement, t: number): void {
  const len = pathLength(el) || 1;
  const dash = String(r2(len));
  if (el.style.strokeDasharray !== dash) el.style.strokeDasharray = dash;
  const off = String(r2(len * (1 - t)));
  if (el.style.strokeDashoffset !== off) el.style.strokeDashoffset = off;
}

/** Box of an element: x/y/width/height attributes for rects, getBBox() otherwise. */
export function boxOf(el: Element): Box {
  if (el instanceof SVGRectElement) {
    return {
      x: el.x.baseVal.value,
      y: el.y.baseVal.value,
      w: el.width.baseVal.value,
      h: el.height.baseVal.value,
    };
  }
  try {
    const b = (el as SVGGraphicsElement).getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  } catch {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
}

/**
 * Box of an element in the root SVG's user space (accounts for transforms on ancestors),
 * so boxes from two scenes with the same viewBox can be compared and interpolated.
 */
export function userBox(el: SVGGraphicsElement, root: SVGSVGElement): Box {
  const b = boxOf(el);
  const m = el.getCTM();
  const rm = root.getCTM();
  if (!m || !rm) return b;
  const rel = rm.inverse().multiply(m);
  const pts = [
    new DOMPoint(b.x, b.y),
    new DOMPoint(b.x + b.w, b.y),
    new DOMPoint(b.x, b.y + b.h),
    new DOMPoint(b.x + b.w, b.y + b.h),
  ].map((p) => p.matrixTransform(rel));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/**
 * Map a box from one root SVG's user space into another's, through the screen. Needed when
 * two scenes frame the viewBox differently (e.g. bottom- vs centre-anchored slice).
 */
export function mapBox(b: Box, from: SVGSVGElement | null, to: SVGSVGElement | null): Box {
  if (!from || !to || from === to) return b;
  const fm = from.getScreenCTM();
  const tm = to.getScreenCTM();
  if (!fm || !tm) return b;
  const m = tm.inverse().multiply(fm);
  const a = new DOMPoint(b.x, b.y).matrixTransform(m);
  const c = new DOMPoint(b.x + b.w, b.y + b.h).matrixTransform(m);
  return {
    x: Math.min(a.x, c.x),
    y: Math.min(a.y, c.y),
    w: Math.abs(c.x - a.x),
    h: Math.abs(c.y - a.y),
  };
}

/** Screen-space rect of an element, or null if it has no size. */
export function screenRect(el: Element): DOMRect | null {
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0 ? null : r;
}

/** Remove all children. */
export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export interface ScreenFrame {
  /** Clipped group drawn just above the screen rect. */
  g: SVGGElement;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 1% of the screen width — size everything in these units so desktop and mobile scale. */
  u: number;
}

let clipSeq = 0;

/** Prepare a screen: a clipped <g> sitting directly above `rect`, in the same coordinates. */
export function screenFrame(rect: SVGGraphicsElement): ScreenFrame {
  const b = boxOf(rect);
  const svg = rect.ownerSVGElement;
  const g = svgEl('g', { class: 'screen' });
  if (svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = svgEl('defs');
      svg.prepend(defs);
    }
    const id = `screen-clip-${++clipSeq}`;
    const cp = svgEl('clipPath', { id }, defs);
    svgEl(
      'rect',
      { x: b.x, y: b.y, width: b.w, height: b.h, rx: rect.getAttribute('rx') ?? 0 },
      cp,
    );
    g.setAttribute('clip-path', `url(#${id})`);
  }
  rect.after(g);
  return { g, x: b.x, y: b.y, w: b.w, h: b.h, u: b.w / 100 };
}

/** Theme colours for on-screen UI (dark, high-contrast). */
export const UI = {
  bg: '#1d2133',
  panel: '#272c42',
  line: '#3a405c',
  text: '#ece6d9',
  muted: '#a3a9c2',
  green: '#5cc38a',
  amber: '#f2b84b',
  purple: '#a68cf0',
  red: '#ef6a5f',
  blue: '#6aa7e0',
  paper: '#fbf6ee',
} as const;
