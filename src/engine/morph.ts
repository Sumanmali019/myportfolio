/**
 * Scene transitions. Nothing fades, and the two scenes never share the screen:
 *   - first half (t 0 → 0.5): the outgoing scene comes apart front→back, every part
 *     shrinking into its own centre, staggered;
 *   - second half (t 0.5 → 1): the incoming scene builds back→front, parts growing from
 *     their centres; strokes marked `.draw` draw on as their part builds;
 *   - the avatar shown from the other side (same `data-id`, different `data-view`, e.g.
 *     front → back) turns round in place: the old view narrows to edge-on in the first half,
 *     the new one widens out of edge-on in the second.
 * Nothing glides across from one scene into the other. Stagger direction alternates every
 * transition (left→right, then right→left).
 *
 * Every function here is a pure function of `t`, so scrolling backwards un-builds exactly.
 */
import { clamp, easeIn, easeOut, progress, r2 } from '../lib/math';
import type { Box } from '../lib/svg';
import { drawOn, mapBox, qsa, setScale, setTransform, setVisible, userBox } from '../lib/svg';

export interface Part {
  el: SVGGraphicsElement;
  id: string;
  k: number;
  box: Box;
  morph: string | null;
  draws: SVGGeometryElement[];
}

export interface Timed {
  part: Part;
  start: number;
  end: number;
}

/** A turn, with each side's box mapped into the other scene's user space. */
export interface Turn {
  out: Part;
  inn: Part;
  /** inn.box in the outgoing scene's coordinates. */
  innInOut: Box;
  /** out.box in the incoming scene's coordinates. */
  outInIn: Box;
}

export interface TransitionPlan {
  enters: Timed[];
  exits: Timed[];
  /** Same part shown from the other side (avatar front ↔ back): glide while turning round. */
  turns: Array<Turn>;
  dir: 1 | -1;
}

/** The scene swap point: before it only the outgoing scene shows, after it only the new one. */
export const HANDOVER = 0.5;
export const ENTER_WINDOW: [number, number] = [HANDOVER, 1];
export const EXIT_WINDOW: [number, number] = [0, HANDOVER];
const PART_DURATION = 0.26;

/** Top-level parts of a scene: `[data-id]` not nested in another part, minus `[data-static]`. */
export function collectParts(svg: SVGSVGElement): Part[] {
  return qsa<SVGGraphicsElement>(svg, '[data-id]')
    .filter((el) => !el.parentElement?.closest('[data-id]') && !el.hasAttribute('data-static'))
    .map((el) => ({
      el,
      id: el.dataset.id ?? '',
      k: Number(el.dataset.k ?? 5),
      box: userBox(el, svg),
      morph: el.dataset.morph ?? null,
      draws: qsa<SVGGeometryElement>(el, '.draw'),
    }));
}

/**
 * Build order: by depth `k` (back → front); within a depth, by horizontal centre in the
 * direction `dir`. Returns indices into `parts`. Stable.
 */
export function orderParts(parts: ReadonlyArray<{ k: number; cx: number }>, dir: 1 | -1): number[] {
  return parts
    .map((p, i) => ({ i, k: p.k, cx: p.cx }))
    .sort((a, b) => a.k - b.k || (a.cx - b.cx) * dir || a.i - b.i)
    .map((p) => p.i);
}

/** Spread `n` windows of `dur` across [from, to]; returns [start, end] for slot `j`. */
export function staggerWindow(
  j: number,
  n: number,
  from: number,
  to: number,
  dur = PART_DURATION,
): [number, number] {
  const d = Math.min(dur, to - from);
  if (n <= 1) return [from, from + d];
  const step = (to - from - d) / (n - 1);
  return [from + step * j, from + step * j + d];
}

const cx = (p: Part) => p.box.x + p.box.w / 2;

export function planTransition(
  outParts: Part[],
  inParts: Part[],
  transitionIndex: number,
): TransitionPlan {
  const dir: 1 | -1 = transitionIndex % 2 === 0 ? 1 : -1;
  const outById = new Map(outParts.map((p) => [p.id, p]));
  const used = new Set<Part>();
  const plan: TransitionPlan = {
    enters: [],
    exits: [],
    turns: [],
    dir,
  };
  const entering: Part[] = [];
  const outSvg = outParts[0]?.el.ownerSVGElement ?? null;
  const inSvg = inParts[0]?.el.ownerSVGElement ?? null;
  const toIn = (b: Box) => mapBox(b, outSvg, inSvg);
  const toOut = (b: Box) => mapBox(b, inSvg, outSvg);

  for (const inn of inParts) {
    // Only the avatar turning round links the two scenes; everything else exits and enters.
    const same = outById.get(inn.id);
    const views = [same?.el.dataset.view, inn.el.dataset.view];
    if (same && !used.has(same) && views[0] && views[1] && views[0] !== views[1]) {
      used.add(same);
      plan.turns.push({ out: same, inn, innInOut: toOut(inn.box), outInIn: toIn(same.box) });
      continue;
    }
    entering.push(inn);
  }
  const exiting = outParts.filter((p) => !used.has(p));

  const inOrder = orderParts(
    entering.map((p) => ({ k: p.k, cx: cx(p) })),
    dir,
  );
  inOrder.forEach((idx, j) => {
    const [start, end] = staggerWindow(j, inOrder.length, ...ENTER_WINDOW);
    plan.enters.push({ part: entering[idx]!, start, end });
  });
  // Take apart in reverse build order: front first.
  const outOrder = orderParts(
    exiting.map((p) => ({ k: p.k, cx: cx(p) })),
    dir === 1 ? -1 : 1,
  ).reverse();
  outOrder.forEach((idx, j) => {
    const [start, end] = staggerWindow(j, outOrder.length, ...EXIT_WINDOW);
    plan.exits.push({ part: exiting[idx]!, start, end });
  });
  return plan;
}

/** CSS transform that maps box `src` onto box `dst` (in root user units). */
export function boxTransform(src: Box, dst: Box): string {
  const sx = dst.w / (src.w || 1);
  const sy = dst.h / (src.h || 1);
  const tx = dst.x - src.x * sx;
  const ty = dst.y - src.y * sy;
  return `translate(${r2(tx)}px, ${r2(ty)}px) scale(${r2(sx * 1000) / 1000}, ${r2(sy * 1000) / 1000})`;
}

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
  setVisible(el, true);
}

function setDraws(part: Part, t: number): void {
  for (const d of part.draws) {
    if (t >= 1) {
      if (d.style.strokeDasharray) {
        d.style.strokeDasharray = '';
        d.style.strokeDashoffset = '';
      }
    } else drawOn(d, t);
  }
}

/** Value of a part's build scale at transition time `t`. */
export function enterScale(t: number, start: number, end: number): number {
  return easeOut(progress(t, start, end), 1.5);
}

export function exitScale(t: number, start: number, end: number): number {
  return 1 - easeIn(progress(t, start, end));
}

export function applyTransition(plan: TransitionPlan, t: number): void {
  for (const turn of plan.turns) applyTurn(turn, t);
  for (const { part, start, end } of plan.exits) setScale(part.el, exitScale(t, start, end));
  for (const { part, start, end } of plan.enters) {
    setScale(part.el, enterScale(t, start, end));
    setDraws(part, clamp(progress(t, (start + end) / 2, end + 0.12)));
  }
}

/** Box squeezed horizontally about its centre (`f` = 1 full width, 0 edge-on). */
export function squeezeBox(b: Box, f: number): Box {
  const w = Math.max(0.001, b.w * f);
  return { x: b.x + (b.w - w) / 2, y: b.y, w, h: b.h };
}

/**
 * Turn round in place — a card flip split across the handover: the old view narrows to
 * edge-on in the outgoing scene, then the new view widens out of edge-on in the incoming one.
 */
export function applyTurn({ out, inn }: Turn, t: number): void {
  if (t < HANDOVER) {
    const f = Math.cos((Math.PI / 2) * easeIn(progress(t, 0.05, HANDOVER)));
    setGlide(out.el, f >= 1 ? '' : boxTransform(out.box, squeezeBox(out.box, f)));
    setVisible(inn.el, false);
  } else {
    const f = Math.sin((Math.PI / 2) * easeOut(progress(t, HANDOVER, 0.95)));
    setGlide(out.el, '');
    setVisible(out.el, false);
    setGlide(inn.el, f >= 1 ? '' : boxTransform(inn.box, squeezeBox(inn.box, f)));
  }
}

/** Put every part back to its authored state (fully built, no transforms). */
export function resetParts(parts: Part[]): void {
  for (const p of parts) {
    setGlide(p.el, '');
    setScale(p.el, 1);
    setDraws(p, 1);
  }
}

/** Fully take apart (used when a scene is mounted mid-transition before its turn). */
export function hideParts(parts: Part[]): void {
  for (const p of parts) setScale(p.el, 0);
}
