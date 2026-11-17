/**
 * Cues that play just before a bubble pops, so every line has a cause:
 *   steam  — the anchor (kettle, cups) swells
 *   buzz   — the anchor (phone) shakes
 *   ci     — a check mark draws on beside the anchor
 *   rings  — sound rings spread from the anchor
 *   burst  — burst lines flash round the anchor
 * Each is a pure function of t (0..1 through the trigger window); t ≥ 1 is the rest state.
 */
import type { Trigger } from '../content/schema';
import { bell, clamp, lerp, progress } from '../lib/math';
import { drawOn, setTransform, svgEl } from '../lib/svg';

export interface TriggerFx {
  update(t: number): void;
  dispose(): void;
}

type Styled = SVGGraphicsElement;

function transformFx(anchor: Styled, make: (t: number) => string, origin = 'center'): TriggerFx {
  anchor.style.transformOrigin = origin;
  return {
    update(t) {
      setTransform(anchor, t > 0 && t < 1 ? make(t) : '');
    },
    dispose() {
      setTransform(anchor, '');
      anchor.style.transformOrigin = '';
    },
  };
}

export function createTrigger(
  kind: Trigger,
  anchor: Styled,
  fx: SVGGElement,
  rect: DOMRect,
): TriggerFx {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const reach = clamp(Math.max(rect.width, rect.height) * 0.6, 40, 140);

  switch (kind) {
    case 'steam':
      return transformFx(
        anchor,
        (t) => `scale(${(1 + 0.18 * bell(t)).toFixed(3)})`,
        'center bottom',
      );
    case 'buzz':
      return transformFx(anchor, (t) => {
        const a = Math.sin(t * Math.PI * 14) * bell(t);
        return `translate(${(a * 5).toFixed(2)}px, 0) rotate(${(a * 3).toFixed(2)}deg)`;
      });
    case 'ci': {
      const x = rect.right - 6;
      const y = rect.top + 6;
      const g = svgEl('g', { class: 'fx-ci' }, fx);
      const ring = svgEl('circle', { cx: x, cy: y, r: 16, class: 'fx-ci__ring' }, g);
      const tick = svgEl('path', { d: `M${x - 7} ${y} l5 5 l9 -10`, class: 'fx-ci__tick' }, g);
      return {
        update(t) {
          drawOn(ring, clamp(progress(t, 0, 0.6)));
          drawOn(tick, clamp(progress(t, 0.5, 1)));
        },
        dispose: () => g.remove(),
      };
    }
    case 'rings': {
      const g = svgEl('g', { class: 'fx-rings' }, fx);
      const rings = [0, 1, 2].map(() => svgEl('circle', { cx, cy, r: 0 }, g));
      return {
        update(t) {
          rings.forEach((c, i) => {
            const k = clamp(progress(t, i * 0.18, 0.64 + i * 0.18));
            c.setAttribute('r', lerp(rect.width * 0.2, reach, k).toFixed(1));
            c.setAttribute('stroke-width', (k > 0 && k < 1 ? 4 * (1 - k) : 0).toFixed(2));
          });
        },
        dispose: () => g.remove(),
      };
    }
    case 'burst': {
      const g = svgEl('g', { class: 'fx-burst' }, fx);
      const n = 10;
      const lines = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return { a, el: svgEl('line', {}, g) };
      });
      const r0 = Math.max(rect.width, rect.height) / 2 + 6;
      return {
        update(t) {
          const head = clamp(progress(t, 0, 0.6));
          const tail = clamp(progress(t, 0.35, 1));
          for (const { a, el } of lines) {
            const r1 = r0 + tail * 30;
            const r2 = r0 + head * 30;
            el.setAttribute('x1', (cx + Math.cos(a) * r1).toFixed(1));
            el.setAttribute('y1', (cy + Math.sin(a) * r1).toFixed(1));
            el.setAttribute('x2', (cx + Math.cos(a) * r2).toFixed(1));
            el.setAttribute('y2', (cy + Math.sin(a) * r2).toFixed(1));
          }
        },
        dispose: () => g.remove(),
      };
    }
  }
}
