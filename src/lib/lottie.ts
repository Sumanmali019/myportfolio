/**
 * A tiny Lottie → SVG renderer for the subset our animations use (shape layers with groups,
 * paths, ellipses, rounded rects, fills, strokes (with dashes), gradient fills, trim paths,
 * static additive masks, animated fill / stroke colours,
 * image layers (embedded data URIs), parenting (null layers too), layer in/out points, eased and hold keyframes on layer opacity /
 * rotation / scale / position, and animated group opacity and transforms). ~2 KB, versus ~40 KB gzipped
 * for a full player — so the intro stays inside the JS budget.
 *
 * - `renderLottie()` returns static SVG markup for a frame (used by the art generator so the
 *   first frame is in the inline intro SVG before any JS runs).
 * - `bindLottie()` takes that markup in the DOM and animates it frame by frame.
 *
 * Erasable TypeScript only (no enums etc.), so Node can also load this file with
 * `--experimental-strip-types`.
 */

type Vec = number[];
interface Keyframe {
  t: number;
  s: Vec;
  /** Hold keyframe: keep `s` until the next keyframe (no interpolation). */
  h?: number;
  i?: { x: Vec | number; y: Vec | number };
  o?: { x: Vec | number; y: Vec | number };
  /**
   * Compact ease written into `*.motion.json`: `1` is the usual ease
   * (out 0.45 → in 0.55); a tuple is `[outX, outY, inX, inY]`.
   * Absent `e` / `i` / `o` stays linear, which is what full Lottie files use.
   */
  e?: 1 | number[];
}
interface Prop {
  a?: number;
  k: number | Vec | Keyframe[] | Record<string, unknown>;
}
interface Item {
  ty: string;
  [key: string]: unknown;
}
interface Layer {
  ind: number;
  ty: number;
  parent?: number;
  /** Image layers (ty 2): the asset they show. */
  refId?: string;
  /** In / out frames: the layer only shows while ip <= frame < op. */
  ip?: number;
  op?: number;
  ks: { o?: Prop; r?: Prop; p?: Prop; a?: Prop; s?: Prop };
  shapes?: Item[];
  /** Layer masks: static, additive ones (the common "show only inside this shape") are drawn. */
  hasMask?: boolean;
  masksProperties?: Array<{ mode?: string; inv?: boolean; pt: Prop }>;
}
export interface LottieAnimation {
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  layers: Layer[];
  /** Embedded images (data URIs), for image layers. */
  assets?: Array<{ id: string; w?: number; h?: number; p?: string; u?: string }>;
}

const num = (v: number) => Math.round(v * 100) / 100;
const first = (v: Vec | number | undefined, d = 0): number =>
  Array.isArray(v) ? (v[0] ?? d) : (v ?? d);

/** Cubic-bezier easing (CSS semantics), solved by Newton iterations. */
function bezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  let u = t;
  for (let n = 0; n < 6; n++) {
    const x = ((ax * u + bx) * u + cx) * u - t;
    const dx = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(x) < 1e-5 || dx === 0) break;
    u -= x / dx;
  }
  return ((ay * u + by) * u + cy) * u;
}

const isKeyframes = (k: Prop['k']): k is Keyframe[] =>
  Array.isArray(k) && typeof k[0] === 'object' && k[0] !== null && 't' in (k[0] as object);

/** Value of a (possibly animated) property at `frame`. */
export function valueAt(p: Prop | undefined, frame: number, fallback: Vec): Vec {
  if (!p) return fallback;
  const k = p.k;
  if (!isKeyframes(k))
    return Array.isArray(k) ? (k as Vec) : typeof k === 'number' ? [k] : fallback;
  if (frame <= k[0]!.t) return k[0]!.s;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]!;
    const b = k[i + 1]!;
    if (frame < b.t) {
      if (a.h === 1) return a.s;
      const lin = (frame - a.t) / (b.t - a.t || 1);
      const e = Array.isArray(a.e)
        ? bezier(a.e[0] ?? 0, a.e[1] ?? 0, a.e[2] ?? 1, a.e[3] ?? 1, lin)
        : a.e === 1
          ? bezier(0.45, 0, 0.55, 1, lin)
          : a.o && a.i
            ? bezier(first(a.o.x), first(a.o.y), first(a.i.x, 1), first(a.i.y, 1), lin)
            : lin;
      return a.s.map((v, j) => v + ((b.s[j] ?? v) - v) * e);
    }
  }
  return k[k.length - 1]!.s;
}

/** SVG transform for a Lottie transform (layer `ks` or group `tr`). */
function transformOf(ks: { p?: Prop; a?: Prop; s?: Prop; r?: Prop }, frame: number): string {
  const [px = 0, py = 0] = valueAt(ks.p, frame, [0, 0]);
  const [ax = 0, ay = 0] = valueAt(ks.a, frame, [0, 0]);
  const [sx = 100, sy = 100] = valueAt(ks.s, frame, [100, 100]);
  const [r = 0] = valueAt(ks.r, frame, [0]);
  const parts: string[] = [];
  if (px || py) parts.push(`translate(${num(px)} ${num(py)})`);
  if (r) parts.push(`rotate(${num(r)})`);
  if (sx !== 100 || sy !== 100) parts.push(`scale(${num(sx / 100)} ${num(sy / 100)})`);
  if (ax || ay) parts.push(`translate(${num(-ax)} ${num(-ay)})`);
  return parts.join(' ');
}

const rgb = (c: Vec) =>
  `rgb(${Math.round((c[0] ?? 0) * 255)},${Math.round((c[1] ?? 0) * 255)},${Math.round((c[2] ?? 0) * 255)})`;

function pathData(k: { i: Vec[]; o: Vec[]; v: Vec[]; c: boolean }): string {
  const { i, o, v, c } = k;
  if (!v.length) return '';
  const pt = (p: Vec) => `${num(p[0]!)} ${num(p[1]!)}`;
  const add = (a: Vec, b: Vec): Vec => [a[0]! + b[0]!, a[1]! + b[1]!];
  let d = `M${pt(v[0]!)}`;
  const zero = (p: Vec | undefined) => !p || (!p[0] && !p[1]);
  const seg = (a: number, b: number) => {
    // Straight segments (no tangents) as lines: much smaller for text set as outlines.
    if (zero(o[a]) && zero(i[b])) d += `L${pt(v[b]!)}`;
    else d += `C${pt(add(v[a]!, o[a]!))} ${pt(add(v[b]!, i[b]!))} ${pt(v[b]!)}`;
  };
  for (let j = 1; j < v.length; j++) seg(j - 1, j);
  if (c) {
    seg(v.length - 1, 0);
    d += ' Z';
  }
  return d;
}

function geometry(item: Item): string | null {
  const p = (key: string) => valueAt(item[key] as Prop, 0, [0, 0]);
  switch (item.ty) {
    case 'sh':
      return `<path d="${pathData((item.ks as Prop).k as never)}"`;
    case 'el': {
      const [cx = 0, cy = 0] = p('p');
      const [w = 0, h = 0] = p('s');
      return `<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(w / 2)}" ry="${num(h / 2)}"`;
    }
    case 'rc': {
      const [cx = 0, cy = 0] = p('p');
      const [w = 0, h = 0] = p('s');
      const [r = 0] = valueAt(item.r as Prop, 0, [0]);
      return `<rect x="${num(cx - w / 2)}" y="${num(cy - h / 2)}" width="${num(w)}" height="${num(h)}"${r ? ` rx="${num(r)}"` : ''}`;
    }
    default:
      return null;
  }
}

interface Ctx {
  id: string;
  defs: string[];
  seq: number;
  frame: number;
}

function paint(item: Item, ctx: Ctx): string | null {
  const opacity = first(valueAt(item.o as Prop, 0, [100])) / 100;
  // Animated colours (e.g. status lights): keyframes ride along on the element.
  const cp = item.c as Prop | undefined;
  const ck = cp && isKeyframes(cp.k) ? JSON.stringify(cp.k).replace(/"/g, '&quot;') : '';
  if (item.ty === 'fl') {
    const c = valueAt(cp, ctx.frame, [0, 0, 0, 1]);
    return ` fill="${rgb(c)}"${opacity < 1 ? ` fill-opacity="${num(opacity)}"` : ''}${ck ? ` data-lcf="${ck}"` : ''}`;
  }
  if (item.ty === 'st') {
    const c = valueAt(cp, ctx.frame, [0, 0, 0, 1]);
    const w = first(valueAt(item.w as Prop, 0, [1]));
    const cap = ['butt', 'butt', 'round', 'square'][Number(item.lc ?? 1)];
    const join = ['miter', 'miter', 'round', 'bevel'][Number(item.lj ?? 1)];
    const dashes = ((item.d as Array<{ n: string; v: Prop }> | undefined) ?? [])
      .filter((d) => d.n !== 'o')
      .map((d) => num(first(valueAt(d.v, 0, [0]))));
    return ` fill="none" stroke="${rgb(c)}" stroke-width="${num(w)}" stroke-linecap="${cap}" stroke-linejoin="${join}"${opacity < 1 ? ` stroke-opacity="${num(opacity)}"` : ''}${dashes.length ? ` stroke-dasharray="${dashes.join(' ')}"` : ''}${ck ? ` data-lcs="${ck}"` : ''}`;
  }
  if (item.ty === 'gf') {
    const g = item.g as { p: number; k: Prop };
    const stops = valueAt(g.k, 0, []);
    const [sx = 0, sy = 0] = valueAt(item.s as Prop, 0, [0, 0]);
    const [ex = 0, ey = 0] = valueAt(item.e as Prop, 0, [0, 0]);
    const id = `${ctx.id}-g${++ctx.seq}`;
    let s = '';
    for (let j = 0; j < g.p; j++) {
      const o = stops.slice(j * 4, j * 4 + 4);
      s += `<stop offset="${num(o[0] ?? 0)}" stop-color="${rgb(o.slice(1))}"/>`;
    }
    ctx.defs.push(
      Number(item.t) === 2
        ? `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(sx)}" cy="${num(sy)}" r="${num(Math.hypot(ex - sx, ey - sy))}">${s}</radialGradient>`
        : `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(sx)}" y1="${num(sy)}" x2="${num(ex)}" y2="${num(ey)}">${s}</linearGradient>`,
    );
    return ` fill="url(#${id})"${opacity < 1 ? ` fill-opacity="${num(opacity)}"` : ''}`;
  }
  return null;
}

const attrJson = (v: unknown) => JSON.stringify(v).replace(/"/g, '&quot;');

/** Trim (start, end in %) as dash attributes on a path with pathLength="100". */
function trimDash(tm: Item, frame: number): { dash: string; offset: string; hidden: boolean } {
  const s0 = first(valueAt(tm.s as Prop, frame, [0]));
  const e0 = first(valueAt(tm.e as Prop, frame, [100]));
  const o = first(valueAt(tm.o as Prop, frame, [0])) / 3.6;
  const start = Math.min(s0, e0) + o;
  const len = Math.abs(e0 - s0);
  return { dash: `${num(len)} 200`, offset: `${num(-start)}`, hidden: len < 0.01 };
}

const isAnimated = (p: unknown): boolean => !!p && isKeyframes((p as Prop).k);

/** A shape group: items earlier in the list are drawn on top, as in Lottie. */
function group(items: Item[], ctx: Ctx): string {
  const geoms: Array<{ ty: string; svg: string }> = [];
  const paints: Array<{ ty: string; attrs: string; item: Item }> = [];
  const children: string[] = [];
  let tr = '';
  let trOpacity = 1;
  let trOpacityKeys = '';
  let trKeys = '';
  const tm = items.find((it) => it.ty === 'tm');
  for (const it of items) {
    if (it.ty === 'gr') children.push(group(it.it as Item[], ctx));
    // Not Lottie: build-time markup patched in by the art generator (e.g. replaced text).
    else if (it.ty === 'raw') children.push(String(it.svg));
    else if (it.ty === 'tr') {
      tr = transformOf(it as never, ctx.frame);
      const o = it.o as Prop | undefined;
      trOpacity = first(valueAt(o, ctx.frame, [100])) / 100;
      // Animated group opacity (e.g. key flashes): the keyframes ride along on the element.
      if (o && isKeyframes(o.k)) trOpacityKeys = attrJson(o.k);
      // Animated group transform (e.g. confetti pieces): same idea.
      if (['p', 'a', 's', 'r'].some((k) => isAnimated(it[k])))
        trKeys = attrJson({ p: it.p, a: it.a, s: it.s, r: it.r });
    } else if (it.ty !== 'tm') {
      const g = geometry(it);
      if (g) geoms.push({ ty: it.ty, svg: g });
      else {
        const p = paint(it, ctx);
        if (p) paints.push({ ty: it.ty, attrs: p, item: it });
      }
    }
  }
  let body = children.reverse().join('');
  // Last paint is drawn first (bottom), so the first paint ends up on top.
  for (const p of [...paints].reverse()) {
    const paths = geoms.filter((g) => g.ty === 'sh');
    if (p.ty !== 'st' && paths.length > 1) {
      // Fills treat all paths of a group as one compound shape (letter counters, rings…):
      // drawn separately, the inner contours would be filled instead of cut out.
      const d = paths.map((g) => /d="([^"]*)"/.exec(g.svg)?.[1] ?? '').join('');
      const rule = Number(p.item.r) === 2 ? ' fill-rule="evenodd"' : '';
      for (const g of geoms) if (g.ty !== 'sh') body += `${g.svg}${p.attrs}/>`;
      body += `<path d="${d}"${p.attrs}${rule}/>`;
      continue;
    }
    for (const g of geoms) {
      if (!tm || p.ty !== 'st' || g.ty !== 'sh') {
        body += `${g.svg}${p.attrs}/>`;
        continue;
      }
      const t = trimDash(tm, ctx.frame);
      const keys = attrJson({ s: tm.s, e: tm.e, o: tm.o });
      const trim = ` pathLength="100" stroke-dasharray="${t.dash}" stroke-dashoffset="${t.offset}" data-ltm="${keys}"${t.hidden ? ' visibility="hidden"' : ''}`;
      if (!p.item.d) {
        body += `${g.svg}${p.attrs}${trim}/>`;
        continue;
      }
      // Dashed and trimmed: dash the visible stroke, trim it with a mask of the same path.
      const id = `${ctx.id}-m${++ctx.seq}`;
      const w = first(valueAt(p.item.w as Prop, 0, [1]));
      ctx.defs.push(
        `<mask id="${id}" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="10000" height="10000">${g.svg} fill="none" stroke="#fff" stroke-width="${num(w + 4)}"${trim}/></mask>`,
      );
      body += `${g.svg}${p.attrs} mask="url(#${id})"/>`;
    }
  }
  const attrs = `${tr ? ` transform="${tr}"` : ''}${trOpacity < 1 ? ` opacity="${num(trOpacity)}"` : ''}${trOpacityKeys ? ` data-lgo="${trOpacityKeys}"` : ''}${trKeys ? ` data-lgt="${trKeys}"` : ''}`;
  return attrs ? `<g${attrs}>${body}</g>` : body;
}

/**
 * Static markup for `frame`, in the animation's own coordinates (0 0 w h).
 * Layer wrappers carry `data-ltr` (transform) and `data-lop` (opacity) so bindLottie can
 * animate them; parents wrap their children, so parenting works as in Lottie.
 */
export interface RenderOptions {
  /** Drop the animation's own background (a top-level group with a gradient fill). */
  transparent?: boolean;
}

const isBackground = (s: Item): boolean =>
  s.ty === 'gr' && ((s.it as Item[] | undefined) ?? []).some((i) => i.ty === 'gf');

export function renderLottie(
  anim: LottieAnimation,
  idPrefix: string,
  frame = 0,
  { transparent = false }: RenderOptions = {},
): string {
  const ctx: Ctx = { id: idPrefix, defs: [], seq: 0, frame };
  const byInd = new Map(anim.layers.map((l) => [l.ind, l]));
  const wrap = (layer: Layer, inner: string): string => {
    const tf = transformOf(layer.ks, frame);
    const out = `<g data-ltr="${layer.ind}"${tf ? ` transform="${tf}"` : ''}>${inner}</g>`;
    const parent = layer.parent !== undefined ? byInd.get(layer.parent) : undefined;
    return parent ? wrap(parent, out) : out;
  };
  let body = '';
  for (const layer of [...anim.layers].reverse()) {
    if (layer.ty !== 4 && layer.ty !== 2) continue;
    const o = first(valueAt(layer.ks.o, frame, [100])) / 100;
    // In / out points narrower than the animation: shown only inside them.
    const io =
      layer.ip !== undefined &&
      layer.op !== undefined &&
      (layer.ip > anim.ip || layer.op < anim.op);
    const shown = !io || (frame >= layer.ip! && frame < layer.op!);
    let image = '';
    if (layer.ty === 2) {
      // Each image once in <defs>; layers showing it (the same photo twice) <use> it.
      const asset = anim.assets?.find((a) => a.id === layer.refId);
      if (!asset?.p) continue;
      const id = `${ctx.id}-i-${asset.id}`;
      if (!ctx.defs.some((d) => d.includes(`id="${id}"`)))
        ctx.defs.push(
          `<image id="${id}" width="${asset.w ?? 0}" height="${asset.h ?? 0}" href="${(asset.u ?? '') + asset.p}"/>`,
        );
      image = `<use href="#${id}"/>`;
    }
    const shapes = (layer.shapes ?? [])
      .filter((s) => !(transparent && isBackground(s)))
      .reverse()
      .map((s) => group((s.it as Item[]) ?? [s], ctx))
      .join('');
    // Masks live in layer space (inside the layer transform), as in lottie-web.
    const masks = (layer.hasMask ? (layer.masksProperties ?? []) : []).filter(
      (m) => (m.mode ?? 'a') === 'a' && !m.inv && !isKeyframes(m.pt.k),
    );
    let clip = '';
    if (masks.length) {
      const id = `${ctx.id}-k${++ctx.seq}`;
      const d = masks.map((m) => pathData(m.pt.k as never)).join('');
      ctx.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
      clip = ` clip-path="url(#${id})"`;
    }
    body += wrap(
      layer,
      `<g data-lop="${layer.ind}"${clip}${o < 1 ? ` opacity="${num(o)}"` : ''}${io ? ` data-lio="${layer.ip} ${layer.op}"` : ''}${shown ? '' : ' display="none"'}>${image}${shapes}</g>`,
    );
  }
  return `${ctx.defs.length ? `<defs>${ctx.defs.join('')}</defs>` : ''}${body}`;
}

/** Animate markup produced by renderLottie. Returns a function taking a frame number. */
export function bindLottie(root: ParentNode, anim: LottieAnimation): (frame: number) => void {
  // Null layers (ty 3) only move their children; shape (4) and image (2) layers also fade.
  const layers = anim.layers.filter((l) => l.ty === 4 || l.ty === 3 || l.ty === 2);
  const animated = (p?: Prop) => !!p && isKeyframes(p.k);
  const moving = layers.filter(
    (l) => animated(l.ks.p) || animated(l.ks.r) || animated(l.ks.s) || animated(l.ks.a),
  );
  const fading = layers.filter((l) => (l.ty === 4 || l.ty === 2) && animated(l.ks.o));
  const tfEls = new Map(
    moving.map((l) => [l, Array.from(root.querySelectorAll(`[data-ltr="${l.ind}"]`))]),
  );
  const opEls = new Map(
    fading.map((l) => [l, Array.from(root.querySelectorAll(`[data-lop="${l.ind}"]`))]),
  );
  function all<T>(attr: string): Array<{ el: SVGElement; v: T }> {
    return Array.from(root.querySelectorAll<SVGElement>(`[${attr}]`)).map((el) => ({
      el,
      v: JSON.parse(el.getAttribute(attr) ?? 'null') as T,
    }));
  }
  const groupFades = all<Keyframe[]>('data-lgo').map(({ el, v }) => ({
    el,
    prop: { a: 1, k: v } as Prop,
  }));
  const groupMoves = all<{ p?: Prop; a?: Prop; s?: Prop; r?: Prop }>('data-lgt');
  const trims = all<Item>('data-ltm');
  const colours = [
    ...all<Keyframe[]>('data-lcf').map(({ el, v }) => ({
      el,
      attr: 'fill',
      prop: { a: 1, k: v } as Prop,
    })),
    ...all<Keyframe[]>('data-lcs').map(({ el, v }) => ({
      el,
      attr: 'stroke',
      prop: { a: 1, k: v } as Prop,
    })),
  ];
  const inOut = Array.from(root.querySelectorAll<SVGElement>('[data-lio]')).map((el) => {
    const [a = 0, b = 0] = (el.getAttribute('data-lio') ?? '').split(' ').map(Number);
    return { el, a, b };
  });
  const set = (el: Element, name: string, v: string) => {
    if (el.getAttribute(name) !== v) el.setAttribute(name, v);
  };
  return (frame: number) => {
    const f = Math.max(anim.ip, Math.min(anim.op - 1, frame));
    for (const { el, a, b } of inOut) set(el, 'display', f >= a && f < b ? 'inline' : 'none');
    for (const { el, prop } of groupFades)
      set(el, 'opacity', String(num(first(valueAt(prop, f, [100])) / 100)));
    for (const { el, v } of groupMoves) set(el, 'transform', transformOf(v, f));
    for (const { el, attr, prop } of colours) set(el, attr, rgb(valueAt(prop, f, [0, 0, 0])));
    for (const { el, v } of trims) {
      const t = trimDash(v, f);
      set(el, 'stroke-dasharray', t.dash);
      set(el, 'stroke-dashoffset', t.offset);
      set(el, 'visibility', t.hidden ? 'hidden' : 'visible');
    }
    for (const [layer, els] of tfEls) {
      const tf = transformOf(layer.ks, f);
      for (const el of els) set(el, 'transform', tf);
    }
    for (const [layer, els] of opEls) {
      const o = String(num(first(valueAt(layer.ks.o, f, [100])) / 100));
      for (const el of els) set(el, 'opacity', o);
    }
  };
}
