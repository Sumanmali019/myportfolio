/**
 * Palette blending. Palettes live in src/styles/palettes.css as blocks of CSS custom
 * properties under `[data-palette="name"]`. We read each block once (via a hidden probe
 * element), then blend between two palettes by writing the mixed values onto <html>.
 */
import { lerp } from '../lib/math';

export const PALETTE_VARS = [
  '--sky-top',
  '--sky-bot',
  '--wall',
  '--wall-d',
  '--floor',
  '--floor-d',
  '--light',
  '--accent',
  '--stage',
  '--desk',
  '--desk-d',
  '--mug',
  '--pot',
] as const;

type RGB = [number, number, number];

export function parseColor(value: string): RGB | null {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

export const mixColor = (a: RGB, b: RGB, t: number): string =>
  `rgb(${Math.round(lerp(a[0], b[0], t))} ${Math.round(lerp(a[1], b[1], t))} ${Math.round(lerp(a[2], b[2], t))})`;

export class PaletteBlender {
  private table = new Map<string, Array<RGB | null>>();
  private last = '';

  constructor(keys: string[]) {
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.display = 'none';
    document.body.appendChild(probe);
    for (const key of new Set(keys)) {
      probe.dataset.palette = key;
      const cs = getComputedStyle(probe);
      this.table.set(
        key,
        PALETTE_VARS.map((v) => parseColor(cs.getPropertyValue(v))),
      );
    }
    probe.remove();
  }

  /** Apply palette `a` blended toward `b` by `t`. */
  apply(a: string, b: string = a, t = 0): void {
    const sig = `${a}|${b}|${t.toFixed(3)}`;
    if (sig === this.last) return;
    this.last = sig;
    const pa = this.table.get(a);
    const pb = this.table.get(b) ?? pa;
    if (!pa || !pb) return;
    const root = document.documentElement.style;
    PALETTE_VARS.forEach((name, i) => {
      const ca = pa[i];
      const cb = pb[i];
      if (ca && cb) root.setProperty(name, mixColor(ca, cb, t));
    });
    document.documentElement.dataset.palette = t < 0.5 ? a : b;
  }
}
