/**
 * One transition, A → B, as a pure function of its progress m (0 → 1), so scrolling back plays
 * it in reverse exactly. Both scenes are on stage (B's layer above A's); nothing fades as a
 * whole. Every object gets a task with a delay d and a length len (in m); its own progress is
 * u = map(m, d, min(1, d + len)):
 *
 *   KEEP   same id, same place and size in A and B: A's copy until m = .5, then B's
 *   MOVE   same (or paired) object somewhere else: d = .18 + i × .08, len = .3. It travels
 *          (eased, on a small upward arc) from A's place to B's; A's copy carries it the first
 *          half, B's copy (in B's layer, so it sits right among B's objects) the second. An
 *          avatar seen from the other side turns round on the way (edge-on at the swap).
 *   MORPH  (from a plan) A objects become B objects: d = min(delay × 1.1, .52), len = .48;
 *          A's come apart over u ∈ [0, .38], then B's build one after another, left → right
 *   OUT    A's leftovers: len = .22, d = .02 + .22 × (1 − x): A clears right → left
 *   IN     B's leftovers: len = .3, d = .4 + .3 × (.65 x + .35 y): B assembles left → right,
 *          top → bottom, mostly after A has cleared
 *
 * x and y are an object's normalised centre; every second transition mirrors x, so
 * consecutive transitions sweep one way, then the other.
 *
 * Backdrops (an object over 40% of the frame: a room, a hall, a sky) when both scenes have
 * one: B's builds early (d = .25, len = .3) over A's, and A's comes apart only after that
 * (d = .55, len = .2) beneath it — so the frame is never empty in the middle.
 */
import { mapBox, setTransform, setVisible, type Box } from '../lib/svg';
import { ease, easeIn, easeOut, map } from './easing';
import { applyObject, wholeObject, type Obj } from './parts';
import { planFor, type TransitionPlanSpec } from './plan';

interface Task {
  o: Obj;
  building: boolean;
  d: number;
  len: number;
  /** The object's own progress runs over [a, b] of the task's. */
  a: number;
  b: number;
}

interface Move {
  a: Obj;
  b: Obj;
  d: number;
  len: number;
  /** B's box in A's user space, and A's box in B's. */
  aTo: Box;
  bFrom: Box;
  /** Arc height in each scene's user units. */
  arcA: number;
  arcB: number;
  /** Seen from the other side (front ↔ back): turns round on the way. */
  turn: boolean;
}

export interface Transition {
  keeps: Array<[Obj, Obj]>;
  moves: Move[];
  tasks: Task[];
}

const center = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];

function frameOf(o: Obj | undefined): { x: number; y: number; w: number; h: number } {
  const vb = o?.el.ownerSVGElement?.viewBox.baseVal;
  return vb && vb.width
    ? { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
    : { x: 0, y: 0, w: 1, h: 1 };
}

const lerpBox = (a: Box, b: Box, f: number): Box => ({
  x: a.x + (b.x - a.x) * f,
  y: a.y + (b.y - a.y) * f,
  w: a.w + (b.w - a.w) * f,
  h: a.h + (b.h - a.h) * f,
});

const near = (a: Box, b: Box, frameW: number): boolean => {
  const [ax, ay] = center(a);
  const [bx, by] = center(b);
  const tol = frameW * 0.01;
  return (
    Math.abs(ax - bx) <= tol &&
    Math.abs(ay - by) <= tol &&
    Math.abs(a.w - b.w) <= Math.max(a.w, b.w) * 0.03 + 1 &&
    Math.abs(a.h - b.h) <= Math.max(a.h, b.h) * 0.03 + 1
  );
};

export function planTransition(
  A: Obj[],
  B: Obj[],
  index: number,
  spec: TransitionPlanSpec = {},
): Transition {
  const mirror = index % 2 === 1;
  const svgA = A[0]?.el.ownerSVGElement ?? null;
  const svgB = B[0]?.el.ownerSVGElement ?? null;
  const fa = frameOf(A[0]);
  const fb = frameOf(B[0]);
  const nx = (o: Obj, f: typeof fa) => {
    const x = (center(o.box)[0] - f.x) / f.w;
    return mirror ? 1 - x : x;
  };
  const ny = (o: Obj, f: typeof fa) => (center(o.box)[1] - f.y) / f.h;
  const usedA = new Set<Obj>();
  const usedB = new Set<Obj>();
  const t: Transition = { keeps: [], moves: [], tasks: [] };
  const byId = (list: Obj[], id: string, used: Set<Obj>) =>
    list.find((o) => !used.has(o) && (o.id === id || o.key === id));

  const pairs: Array<[Obj, Obj]> = [];
  for (const [ai, bi] of spec.move ?? []) {
    const a = byId(A, ai, usedA);
    const b = byId(B, bi, usedB);
    if (a && b) {
      usedA.add(a);
      usedB.add(b);
      pairs.push([a, b]);
    }
  }

  // Morphs: A's objects come apart, B's build one after another in their place.
  for (const [aIds, bIds, delay] of spec.morph ?? []) {
    const d = Math.min(delay * 1.1, 0.52);
    for (const id of aIds) {
      const a = byId(A, id, usedA);
      if (!a) continue;
      usedA.add(a);
      t.tasks.push({ o: a, building: false, d, len: 0.48, a: 0, b: 0.38 });
    }
    const bs = bIds
      .map((id) => {
        const b = byId(B, id, usedB);
        if (b) usedB.add(b);
        return b;
      })
      .filter((b): b is Obj => !!b)
      .sort((p, q) => nx(p, fb) - nx(q, fb));
    bs.forEach((b, i) => {
      const n = bs.length;
      const s = n > 1 ? 0.38 + (0.42 * i) / (n - 1) : 0.38;
      t.tasks.push({
        o: b,
        building: true,
        d,
        len: 0.48,
        a: s,
        b: Math.min(1, s + (n > 1 ? 0.2 : 0.62)),
      });
    });
  }

  // The same object in both scenes: kept, or moved.
  if (spec.keep !== false)
    for (const b of B) {
      if (usedB.has(b) || !b.box.w) continue;
      const a = A.find((o) => !usedA.has(o) && o.key === b.key && o.box.w > 0);
      if (!a) continue;
      usedA.add(a);
      usedB.add(b);
      const same = a.view === b.view && near(mapBox(a.box, svgA, svgB), b.box, fb.w);
      if (same) t.keeps.push([a, b]);
      else pairs.push([a, b]);
    }
  pairs.forEach(([a, b], i) => {
    const aTo = mapBox(b.box, svgB, svgA);
    const bFrom = mapBox(a.box, svgA, svgB);
    const dist = (from: Box, to: Box) => {
      const [x0, y0] = center(from);
      const [x1, y1] = center(to);
      return Math.hypot(x1 - x0, y1 - y0);
    };
    t.moves.push({
      a,
      b,
      d: 0.18 + i * 0.08,
      len: 0.3,
      aTo,
      bFrom,
      arcA: Math.min(0.06 * fa.h, 0.3 * dist(a.box, aTo)),
      arcB: Math.min(0.06 * fb.h, 0.3 * dist(bFrom, b.box)),
      turn: !!a.view && !!b.view && a.view !== b.view,
    });
  });

  // Backdrops: B's over A's, so there is always a room on screen.
  const backdrop = (o: Obj, f: typeof fa) => o.box.w * o.box.h > 0.4 * f.w * f.h;
  const backA = A.filter((o) => !usedA.has(o) && backdrop(o, fa));
  const backB = B.filter((o) => !usedB.has(o) && backdrop(o, fb));
  if (backA.length && backB.length) {
    for (const a of backA) {
      usedA.add(a);
      t.tasks.push({ o: a, building: false, d: 0.55, len: 0.2, a: 0, b: 1 });
    }
    for (const b of backB) {
      usedB.add(b);
      t.tasks.push({ o: b, building: true, d: 0.25, len: 0.3, a: 0, b: 1 });
    }
  }

  for (const a of A)
    if (!usedA.has(a))
      t.tasks.push({
        o: a,
        building: false,
        d: 0.02 + 0.22 * (1 - nx(a, fa)),
        len: 0.22,
        a: 0,
        b: 1,
      });
  for (const b of B)
    if (!usedB.has(b))
      t.tasks.push({
        o: b,
        building: true,
        d: 0.4 + 0.3 * (0.65 * nx(b, fb) + 0.35 * ny(b, fb)),
        len: 0.3,
        a: 0,
        b: 1,
      });
  return t;
}

export const planBetween = (A: Obj[], B: Obj[], index: number, from: string, to: string) =>
  planTransition(A, B, index, planFor(from, to));

/** Move an object (CSS, in its scene's root user units). '' puts it back. */
function setGlide(el: SVGGraphicsElement, tf: string): void {
  if (tf) {
    if (el.style.transformBox !== 'view-box') {
      el.style.transformBox = 'view-box';
      el.style.transformOrigin = '0px 0px';
    }
  } else if (el.style.transformBox) {
    el.style.transformBox = '';
    el.style.transformOrigin = '';
  }
  setTransform(el, tf);
}

/**
 * CSS transform that puts box `src` on the centre of `dst`, scaled evenly (area to area, so
 * nothing stretches), squeezed horizontally by `fx` (turning round).
 */
export function fitTransform(src: Box, dst: Box, fx = 1): string {
  const s = Math.sqrt((dst.w * dst.h) / (src.w * src.h || 1));
  const [scx, scy] = center(src);
  const [dcx, dcy] = center(dst);
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return `translate(${r(dcx)}px, ${r(dcy)}px) scale(${r(s * fx)}, ${r(s)}) translate(${r(-scx)}px, ${r(-scy)}px)`;
}

/** Shown (moved by `tf`, else in place) and whole, or hidden. */
function rest(o: Obj, shown = true, tf = ''): void {
  setGlide(o.el, shown ? tf : '');
  setVisible(o.el, shown);
  if (shown) wholeObject(o);
}

const taskProgress = (m: number, d: number, len: number) => map(m, d, Math.min(1, d + len));

export function applyTransition(t: Transition, m: number): void {
  for (const [a, b] of t.keeps) {
    rest(a, m < 0.5);
    rest(b, m >= 0.5);
  }
  for (const mv of t.moves) {
    const u = taskProgress(m, mv.d, mv.len);
    const e = ease(u);
    if (u <= 0 || u >= 1) {
      rest(mv.a, u <= 0);
      rest(mv.b, u >= 1);
      continue;
    }
    const lift = Math.sin(Math.PI * e);
    if (e < 0.5) {
      const f = mv.turn ? Math.cos((Math.PI / 2) * easeIn(map(e, 0, 0.5))) : 1;
      const box = lerpBox(mv.a.box, mv.aTo, e);
      box.y -= lift * mv.arcA;
      rest(mv.a, true, fitTransform(mv.a.box, box, f));
      rest(mv.b, false);
    } else {
      const f = mv.turn ? Math.sin((Math.PI / 2) * easeOut(map(e, 0.5, 1))) : 1;
      const box = lerpBox(mv.bFrom, mv.b.box, e);
      box.y -= lift * mv.arcB;
      rest(mv.b, true, fitTransform(mv.b.box, box, f));
      rest(mv.a, false);
    }
  }
  for (const k of t.tasks) {
    setGlide(k.o.el, '');
    setVisible(k.o.el, true);
    applyObject(k.o, map(taskProgress(m, k.d, k.len), k.a, k.b), k.building);
  }
}

/** A scene at rest: every object in place and whole. */
export function restObjects(objs: Obj[]): void {
  for (const o of objs) rest(o);
}
