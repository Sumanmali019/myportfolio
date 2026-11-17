/**
 * Bubbles. One at a time, driven entirely by the beat's progress t (0..1), so scrolling
 * backwards plays everything in reverse:
 *
 *   0.00–0.14  trigger plays on the anchor (steam, buzz, CI check…)
 *   0.10–0.24  bubble pops from its tail with overshoot
 *   0.22–0.68  text types word by word
 *   0.68–0.86  rest
 *   0.86–1.00  bubble shrinks back into the tail ("hands back")
 *
 * Kinds: speech (rounded, solid tail), thought (scalloped cloud, trailing dots),
 * screen (flat card with uppercase WHO label and a connector line).
 *
 * Bubbles are aria-hidden: the same lines are in SceneText and the Skip-the-day overlay.
 */
import type { Beat } from '../content/schema';
import { clamp, easeIn, easeOut, lerp, progress } from '../lib/math';
import { setTransform, svgEl } from '../lib/svg';
import { createTrigger, type TriggerFx } from './triggers';
import { revealWords, splitWords } from './typewriter';

export const PHASES = {
  trigger: [0, 0.14],
  pop: [0.1, 0.24],
  type: [0.22, 0.68],
  out: [0.86, 1],
} as const;

const MARGIN = 16;
const GAP = 22;

/** Scalloped cloud outline around a w×h box (arcs bulge outward). */
export function scallopPath(w: number, h: number, bump = 14): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const n = Math.max(8, Math.round(perimeter / (bump * 1.8)));
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // Superellipse: boxy, so text fits; exponent < 1 pushes points to the corners.
    const px = cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 0.55);
    const py = cy + ry * Math.sign(s) * Math.pow(Math.abs(s), 0.55);
    pts.push([px, py]);
  }
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i % n]!;
    const r = (Math.hypot(bx - ax, by - ay) / 2) * 1.08;
    d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  return `${d} Z`;
}

/** Where to put a bubble of size w×h for an anchor rect, inside a vw×vh viewport. */
export function placeBubble(
  anchor: { left: number; top: number; width: number; height: number },
  w: number,
  h: number,
  vw: number,
  vh: number,
  kind: Beat['kind'],
): { x: number; y: number; above: boolean; tipX: number; tipY: number } {
  const ax = anchor.left + anchor.width / 2;
  const spaceAbove = anchor.top;
  const spaceBelow = vh - (anchor.top + anchor.height);
  const above = spaceAbove >= h + GAP + MARGIN || spaceAbove > spaceBelow;
  // Thoughts drift up and to one side; speech/screen sit centred over the anchor.
  const shift = kind === 'thought' ? (ax > vw / 2 ? -w * 0.25 : w * 0.25) : 0;
  const x = clamp(ax - w / 2 + shift, MARGIN, Math.max(MARGIN, vw - w - MARGIN));
  const rawY = above ? anchor.top - GAP - h : anchor.top + anchor.height + GAP;
  const y = clamp(rawY, MARGIN + 44, Math.max(MARGIN, vh - h - MARGIN - 40));
  const tipX = clamp(ax, anchor.left + 4, anchor.left + Math.max(4, anchor.width - 4));
  const tipY = above
    ? anchor.top + Math.min(10, anchor.height * 0.2)
    : anchor.top + anchor.height - Math.min(10, anchor.height * 0.2);
  return { x, y, above, tipX, tipY };
}

interface Active {
  key: string;
  beat: Beat;
  el: HTMLDivElement;
  words: HTMLSpanElement[];
  tail: SVGGElement;
  trigger: TriggerFx | null;
  /** Tail base point relative to the bubble (transform-origin for the pop). */
  ox: number;
  oy: number;
}

export class BubbleLayer {
  private active: Active | null = null;
  private readonly cues: SVGGElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly fx: SVGSVGElement,
  ) {
    this.cues = svgEl('g', { class: 'fx-cues' }, fx);
  }

  /**
   * @param key   unique per scene+beat; a new key replaces the bubble
   * @param beat  the beat, or null for none
   * @param t     beat progress 0..1
   */
  update(
    key: string,
    beat: Beat | null,
    t: number,
    svg: SVGSVGElement | null,
    reduced: boolean,
  ): void {
    if (!beat || !svg) return this.clear();
    if (!this.active || this.active.key !== key) {
      this.clear();
      this.active = this.create(key, beat, svg, reduced);
      if (!this.active) return;
    }
    this.render(this.active, t, reduced);
  }

  /** Re-measure on resize. */
  relayout(): void {
    if (this.active) this.active.key = '';
  }

  clear(): void {
    if (!this.active) return;
    this.active.trigger?.dispose();
    this.active.el.remove();
    this.active.tail.remove();
    this.active = null;
  }

  private create(key: string, beat: Beat, svg: SVGSVGElement, reduced: boolean): Active | null {
    const anchor = svg.querySelector<SVGGraphicsElement>(`[data-anchor="${beat.anchor}"]`);
    const rect = anchor?.getBoundingClientRect();
    if (!anchor || !rect || (rect.width === 0 && rect.height === 0)) return null;

    const el = document.createElement('div');
    el.className = `bubble bubble--${beat.kind}`;
    if (beat.kind === 'screen' && beat.who) {
      const who = document.createElement('span');
      who.className = 'bubble__who';
      who.textContent = beat.who;
      el.appendChild(who);
    }
    const text = document.createElement('p');
    text.className = 'bubble__text';
    el.appendChild(text);
    const words = splitWords(text, beat.text);
    el.style.visibility = 'hidden';
    this.root.appendChild(el);

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pos = placeBubble(rect, w, h, vw, vh, beat.kind);
    el.style.left = `${Math.round(pos.x)}px`;
    el.style.top = `${Math.round(pos.y)}px`;

    if (beat.kind === 'thought') {
      const pad = 16;
      const shape = svgEl('svg', {
        class: 'bubble__shape',
        width: w + pad * 2,
        height: h + pad * 2,
        viewBox: `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`,
        'aria-hidden': 'true',
      });
      svgEl('path', { d: scallopPath(w, h) }, shape);
      el.prepend(shape);
    }

    // Tail, in viewport coordinates on the fx layer.
    const baseX = clamp(pos.tipX, pos.x + 24, pos.x + w - 24);
    const baseY = pos.above ? pos.y + h : pos.y;
    const tail = svgEl('g', { class: `bubble-tail bubble-tail--${beat.kind}` }, this.fx);
    const tipX = pos.tipX;
    const tipY = pos.tipY;
    if (beat.kind === 'speech') {
      svgEl(
        'path',
        { d: `M${baseX - 12} ${baseY} L${tipX} ${tipY} L${baseX + 12} ${baseY} Z` },
        tail,
      );
    } else if (beat.kind === 'thought') {
      [0.3, 0.6, 0.85].forEach((f, i) => {
        svgEl(
          'circle',
          { cx: lerp(baseX, tipX, f), cy: lerp(baseY, tipY, f), r: [9, 6, 4][i] },
          tail,
        );
      });
    } else {
      svgEl('line', { x1: baseX, y1: baseY, x2: tipX, y2: tipY }, tail);
      svgEl('circle', { cx: tipX, cy: tipY, r: 4 }, tail);
    }
    tail.style.transformOrigin = `${tipX}px ${tipY}px`;

    const ox = baseX - pos.x;
    const oy = baseY - pos.y;
    el.style.transformOrigin = `${ox}px ${oy}px`;
    el.style.visibility = '';

    const trigger =
      beat.trigger && !reduced ? createTrigger(beat.trigger, anchor, this.cues, rect) : null;
    return { key, beat, el, words, tail, trigger, ox, oy };
  }

  private render(a: Active, t: number, reduced: boolean): void {
    if (reduced) {
      const on = t > 0.02 && t < 0.98;
      setTransform(a.el, on ? '' : 'scale(0)');
      a.el.style.visibility = on ? '' : 'hidden';
      a.tail.style.visibility = on ? '' : 'hidden';
      revealWords(a.words, 1);
      return;
    }
    a.trigger?.update(progress(t, PHASES.trigger[0], PHASES.trigger[1]));
    const pop = easeOut(progress(t, PHASES.pop[0], PHASES.pop[1]), 1.7);
    const out = 1 - easeIn(progress(t, PHASES.out[0], PHASES.out[1]));
    const s = Math.max(0, Math.min(pop, out));
    setTransform(a.el, s >= 0.999 && s <= 1.001 ? '' : `scale(${s.toFixed(3)})`);
    a.el.style.visibility = s <= 0.001 ? 'hidden' : '';
    const tailS = clamp(Math.min(progress(t, PHASES.pop[0] - 0.04, PHASES.pop[0] + 0.04), out));
    setTransform(a.tail, tailS >= 1 ? '' : `scale(${tailS.toFixed(3)})`);
    a.tail.style.visibility = tailS <= 0.001 ? 'hidden' : '';
    revealWords(a.words, progress(t, PHASES.type[0], PHASES.type[1]));
  }
}
