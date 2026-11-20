/**
 * Flat-vector object kit for the scene generator. Every function returns an SVG string.
 * Style rules: no outlines, shading = a darker shade of the fill, palette-driven surfaces use
 * `p-*` classes (see src/styles/palettes.css), strokes that should draw on get class "draw".
 */

import { readFileSync } from 'node:fs';

/** Jadavpur University's seal, embedded (128 px WebP). */
const JU_LOGO = `data:image/webp;base64,${readFileSync(new URL('./assets/ju-logo.webp', import.meta.url)).toString('base64')}`;

export const n = (v) => Math.round(v * 10) / 10;

export const C = {
  ink: '#2a2438',
  paper: '#fbf6ee',
  cream: '#f3e7d3',
  creamD: '#e2d2b8',
  wood: '#b9774a',
  woodD: '#9c6239',
  terra: '#c8674a',
  terraD: '#a4513a',
  sage: '#9db59a',
  sageD: '#7f9a7c',
  mustard: '#e3a83b',
  mustardD: '#c48b26',
  teal: '#3f8f8b',
  tealD: '#2f716e',
  indigo: '#2f2c57',
  metal: '#5d566f',
  metalD: '#4a4459',
  dark: '#3b3550',
  skin: '#c68a62',
  skinD: '#a8714d',
  screen: '#1d2133',
  leaf: '#5f8f5a',
  leafD: '#4b7547',
};

const attrs = (o = {}) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}=""` : ` ${k}="${typeof v === 'number' ? n(v) : v}"`))
    .join('');

export const rect = (x, y, w, h, fill, a = {}) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${fill ? ` fill="${fill}"` : ''}${attrs(a)}/>`;
export const circle = (cx, cy, r, fill, a = {}) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${fill ? ` fill="${fill}"` : ''}${attrs(a)}/>`;
export const ellipse = (cx, cy, rx, ry, fill, a = {}) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${attrs(a)}/>`;
export const path = (d, fill, a = {}) =>
  `<path d="${d}"${fill ? ` fill="${fill}"` : ''}${attrs(a)}/>`;
export const line = (x1, y1, x2, y2, stroke, w, a = {}) =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${n(w)}" stroke-linecap="round"${attrs(a)}/>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const text = (x, y, s, size, fill, a = {}) =>
  `<text x="${n(x)}" y="${n(y)}" font-size="${n(size)}" fill="${fill}"${attrs({ class: 'ui-text', ...a })}>${esc(s)}</text>`;
export const g = (inner, a = {}) => `<g${attrs(a)}>${inner}</g>`;
export const at = (x, y, s, inner, a = {}) =>
  `<g transform="translate(${n(x)} ${n(y)})${s !== 1 ? ` scale(${Math.round(s * 1000) / 1000})` : ''}"${attrs(a)}>${inner}</g>`;
/** A scene part: shrinks/grows from its centre during transitions. */
export const part = (id, k, inner, a = {}) =>
  `<g data-id="${id}" data-k="${k}"${attrs(a)}>${inner}</g>`;

/** Deterministic pseudo-random. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ surfaces */

export const skyGradient = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-top"/><stop offset="1" class="s-bot"/></linearGradient>`;

export const wall = (W, H, floorY) =>
  rect(0, 0, W, floorY, null, { class: 'p-wall' }) +
  rect(0, floorY - 14, W, 14, null, { class: 'p-wall-d' });
export const floor = (W, H, floorY) =>
  rect(0, floorY, W, H - floorY, null, { class: 'p-floor' }) +
  rect(0, floorY, W, 10, null, { class: 'p-floor-d' });

export function cloud(x, y, s, drift = 80) {
  return g(
    at(
      x,
      y,
      s,
      path('M0 30 Q0 10 22 12 Q30 -6 52 4 Q72 -4 80 16 Q100 16 98 32 Z', '#ffffff', {
        opacity: 0.85,
      }),
    ),
    { class: 'idle-cloud', 'data-drift': drift },
  );
}

export function rooftops(
  x,
  y,
  w,
  h,
  seed = 7,
  palette = ['#d9c3a5', '#c9a98a', '#b9a08a', '#e0cdb3', '#cdb497'],
) {
  const r = rng(seed);
  let out = '';
  let cx = x - 10;
  let i = 0;
  while (cx < x + w) {
    const bw = 40 + r() * 70;
    const bh = h * (0.35 + r() * 0.5);
    const c = palette[i % palette.length];
    out += rect(cx, y + h - bh, bw, bh + 2, c);
    out += rect(cx + bw - 8, y + h - bh, 8, bh + 2, 'rgba(0,0,0,.08)');
    // windows
    for (let wy = y + h - bh + 14; wy < y + h - 12; wy += 22)
      for (let wx = cx + 10; wx < cx + bw - 16; wx += 20)
        out += rect(wx, wy, 8, 10, 'rgba(60,50,70,.25)');
    if (r() > 0.45) {
      // water tank on the roof
      const tx = cx + 10 + r() * (bw - 34);
      const ty = y + h - bh - 22;
      out += rect(tx, ty, 22, 22, '#3b3a4a') + ellipse(tx + 11, ty, 11, 4, '#55536a');
      out += rect(tx + 4, ty + 22, 3, 4, '#3b3a4a') + rect(tx + 15, ty + 22, 3, 4, '#3b3a4a');
    }
    cx += bw + 2;
    i++;
  }
  return out;
}

/** Kolkata skyline: rooftops plus a generic cantilever bridge silhouette. */
export function skyline(x, y, w, h, color = '#4a3f5c') {
  const towerX1 = x + w * 0.22;
  const towerX2 = x + w * 0.62;
  const deckY = y + h * 0.72;
  let out = rect(x, deckY, w, 6, color);
  for (const tx of [towerX1, towerX2]) {
    out += path(
      `M${n(tx - 16)} ${n(deckY)} L${n(tx - 6)} ${n(y + h * 0.15)} L${n(tx + 6)} ${n(y + h * 0.15)} L${n(tx + 16)} ${n(deckY)} Z`,
      color,
    );
  }
  out += path(
    `M${n(x)} ${n(deckY)} Q${n((x + towerX1) / 2)} ${n(deckY - h * 0.1)} ${n(towerX1)} ${n(y + h * 0.2)} Q${n((towerX1 + towerX2) / 2)} ${n(deckY - h * 0.05)} ${n(towerX2)} ${n(y + h * 0.2)} Q${n((towerX2 + x + w) / 2)} ${n(deckY - h * 0.1)} ${n(x + w * 0.85)} ${n(deckY)}`,
    'none',
    { stroke: color, 'stroke-width': 5, class: 'draw' },
  );
  const r = rng(3);
  let bx = x;
  while (bx < x + w) {
    const bw = 30 + r() * 50;
    const bh = h * (0.12 + r() * 0.3);
    out += rect(bx, y + h - bh, bw, bh, color);
    bx += bw + 4;
  }
  return out;
}

/* ------------------------------------------------------------------ furniture & objects */

/**
 * Window with a view. `view`: rooftops | night | campus | city. `city`: kolkata adds Howrah
 * Bridge behind the rooftops (lit at night) and, by day, kites over them.
 */
export function windowObj(
  pfx,
  w,
  h,
  { view = 'rooftops', sun = null, grill = true, arch = false, city = null } = {},
) {
  const clip = `${pfx}-wclip`;
  const inset = 12;
  const shape = arch
    ? `M${inset} ${h - inset} V${w / 2} A${w / 2 - inset} ${w / 2 - inset} 0 0 1 ${w - inset} ${w / 2} V${h - inset} Z`
    : null;
  let inner = rect(0, 0, w, h, 'url(#' + pfx + '-sky)');
  // The view (city, bridge, rooftops, trees) keeps its proportions: in a tall window it sits
  // in a band of the original shape at the bottom, and the sky fills the rest above it.
  const vh = Math.min(h, w * 0.85);
  const vy = h - vh;
  if (sun === 'sunrise')
    inner += g(circle(w * 0.7, h * 0.55, 34, '#ffd27a'), { 'data-sunrise': true });
  if (sun === 'sunset')
    inner += g(circle(w * 0.35, h * 0.4, 40, '#ff9a4a'), { 'data-sunset': true });
  if (view === 'night') {
    inner +=
      circle(w * 0.72, h * 0.25, 22, '#f4efe4') +
      circle(w * 0.76, h * 0.22, 20, 'url(#' + pfx + '-sky)');
    const r = rng(11);
    for (let i = 0; i < 9; i++) inner += circle(r() * w, r() * h * 0.6, 1.6, '#f4efe4');
  } else {
    inner += cloud(w * 0.1, h * 0.12, 0.7, 60) + cloud(w * 0.55, h * 0.28, 0.5, 50);
  }
  if (view === 'campus') {
    inner +=
      ellipse(w * 0.2, vy + vh * 0.8, 70, 60, C.leaf) +
      ellipse(w * 0.75, vy + vh * 0.85, 80, 55, C.leafD);
  } else if (view === 'city') {
    inner += skyline(0, vy + vh * 0.45, w, vh * 0.55, '#6b5a78');
  } else {
    if (city === 'kolkata')
      inner += howrahBridge(
        w * 0.08,
        vy + vh * 0.3,
        w * 0.84,
        vh * 0.36,
        view === 'night' ? '#4d4870' : '#9a8aa0',
        {
          lights: view === 'night',
        },
      );
    inner += rooftops(
      0,
      vy + vh * 0.5,
      w,
      vh * 0.5,
      w + vh,
      view === 'night' ? ['#3d3a5c', '#35324f', '#433f63'] : undefined,
    );
  }
  // Hyderabad: the Charminar in front of the rooftops, its base on the bottom of the view.
  if (city === 'hyderabad' && view !== 'campus' && view !== 'city')
    inner += at(
      w * 0.64,
      h,
      (vh * 0.62) / 180,
      view === 'night' ? charminar(1, '#5d5577', '#4c4566') : charminar(),
    );
  if (city === 'kolkata' && view !== 'night')
    inner += kite(w * 0.22, h * 0.2, 0.9, C.terra) + kite(w * 0.7, h * 0.12, 0.7, C.teal, C.terra);
  let out = `<defs><clipPath id="${clip}">${shape ? path(shape, '#000') : rect(inset, inset, w - inset * 2, h - inset * 2, '#000')}</clipPath></defs>`;
  out += shape
    ? path(`M0 ${h} V${w / 2} A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2} V${h} Z`, '#f4ead8')
    : rect(0, 0, w, h, '#f4ead8', { rx: 6 });
  out += g(inner, { 'clip-path': `url(#${clip})` });
  if (grill) {
    for (let gx = inset + (w - inset * 2) / 4; gx < w - inset; gx += (w - inset * 2) / 4)
      out += line(gx, arch ? w / 2 : inset, gx, h - inset, '#7a6a58', 3, { class: 'draw' });
    out += line(inset, h * 0.55, w - inset, h * 0.55, '#7a6a58', 3, { class: 'draw' });
  }
  out += rect(-10, h - 4, w + 20, 14, '#e2d2b8', { rx: 3 });
  return out;
}

export function curtain(h, color = C.terra) {
  return g(
    rect(0, 0, 46, h, color) +
      rect(10, 0, 6, h, 'rgba(0,0,0,.12)') +
      rect(28, 0, 5, h, 'rgba(0,0,0,.1)'),
    { class: 'idle-curtain' },
  );
}

/** Wall calendar: the journey's "clock". Month, year and city are filled in by the engine. */
export function calendar(w, h) {
  return (
    rect(0, 0, w, h, C.paper, { rx: 6 }) +
    rect(0, 0, w, h * 0.3, C.terra, { rx: 6 }) +
    rect(0, h * 0.24, w, h * 0.06, C.terra) +
    circle(w * 0.3, 0, 5, C.dark) +
    circle(w * 0.7, 0, 5, C.dark) +
    text(w / 2, h * 0.21, 'JAN', h * 0.14, C.paper, {
      'text-anchor': 'middle',
      'data-month': true,
    }) +
    text(w / 2, h * 0.66, '2017', h * 0.28, C.ink, {
      'text-anchor': 'middle',
      'data-year': true,
      class: 'title-text',
    }) +
    text(w / 2, h * 0.88, 'KOLKATA', h * 0.09, '#5d566f', {
      'text-anchor': 'middle',
      'data-city': true,
    })
  );
}

/** A desk in the room's colours (palette `--desk` / `--desk-d`). */
export function desk(w, top = 22) {
  const d = { class: 'p-desk' };
  const dd = { class: 'p-desk-d' };
  return (
    rect(0, 0, w, top, null, { ...d, rx: 4 }) +
    rect(0, top - 6, w, 6, null, dd) +
    rect(24, top, 18, 150, null, dd) +
    rect(w - 42, top, 18, 150, null, dd) +
    rect(w * 0.6, top, w * 0.3, 90, null, d) +
    rect(w * 0.6, top + 40, w * 0.3, 4, null, dd) +
    circle(w * 0.75, top + 22, 4, null, dd)
  );
}

/** Monitor at origin; the screen rect gets `screenAttrs` (data-screen, data-link…). */
export function monitor(w, h, screenAttrs = {}) {
  return (
    rect(w / 2 - 14, h, 28, 46, C.dark) +
    rect(w / 2 - 70, h + 42, 140, 12, C.dark, { rx: 6 }) +
    rect(0, 0, w, h, C.ink, { rx: 12 }) +
    rect(12, 12, w - 24, h - 24, C.screen, { rx: 4, ...screenAttrs })
  );
}

/** Laptop at origin. With no screen attrs it shows static code with a blinking cursor. */
export function laptop(w, screenAttrs = null, { sticker = false } = {}) {
  const h = w * 0.62;
  let out = rect(0, 0, w, h, C.dark, { rx: 8 });
  out += rect(10, 10, w - 20, h - 20, C.screen, { rx: 3, ...(screenAttrs ?? {}) });
  if (!screenAttrs) {
    const cols = ['#a68cf0', '#6aa7e0', '#5cc38a', '#f2b84b', '#ece6d9'];
    for (let i = 0; i < 7; i++) {
      const indent = [0, 1, 2, 2, 1, 2, 0][i] * 14;
      out += rect(24 + indent, 24 + i * 15, 40 + ((i * 37) % 90), 7, cols[i % cols.length], {
        rx: 3,
      });
    }
    out += rect(24, 24 + 7 * 15, 8, 10, '#5cc38a', { class: 'idle-blink' });
  }
  out += path(`M${-18} ${h} L${w + 18} ${h} L${w + 6} ${h + 16} L${-6} ${h + 16} Z`, '#8d86a0');
  out += rect(w / 2 - 28, h, 56, 5, '#6f6886');
  if (sticker) {
    out += g(
      rect(w * 0.55, h * 0.62, w * 0.36, h * 0.2, C.mustard, {
        rx: 4,
        transform: `rotate(-6 ${n(w * 0.73)} ${n(h * 0.72)})`,
      }) +
        text(w * 0.73, h * 0.76, 'REMOTE', h * 0.11, C.ink, {
          'text-anchor': 'middle',
          transform: `rotate(-6 ${n(w * 0.73)} ${n(h * 0.72)})`,
        }),
      { 'data-sticker': true },
    );
  }
  return out;
}

/** Phone at origin. */
export function phone(w, h, screenAttrs = {}, { status = false } = {}) {
  return (
    rect(0, 0, w, h, C.ink, { rx: w * 0.14 }) +
    rect(w * 0.07, h * 0.06, w * 0.86, h * 0.88, C.paper, { rx: w * 0.06, ...screenAttrs }) +
    rect(w * 0.38, h * 0.025, w * 0.24, h * 0.015, '#4a4459', { rx: 2 }) +
    (status ? text(w * 0.15, h * 0.12, '', h * 0.045, C.ink, { 'data-date': true }) : '')
  );
}

export function plant(s = 1) {
  return at(
    0,
    0,
    s,
    ellipse(-22, -70, 16, 42, C.leaf, { transform: 'rotate(-25 -22 -70)' }) +
      ellipse(22, -74, 15, 44, C.leafD, { transform: 'rotate(22 22 -74)' }) +
      ellipse(0, -92, 14, 50, C.leaf) +
      path('M-34 -40 L34 -40 L26 0 L-26 0 Z', null, { class: 'p-pot' }) +
      rect(-36, -46, 72, 10, 'rgba(0,0,0,.18)', { rx: 3 }),
  );
}

/** A mug; without `color` it takes the room's (palette `--mug`). */
export function mug(s = 1, color = null) {
  return at(
    0,
    0,
    s,
    rect(-18, -40, 36, 40, color, { rx: 5, class: color ? undefined : 'p-mug' }) +
      path('M18 -32 q16 0 16 12 q0 12 -16 12', 'none', {
        stroke: color ?? undefined,
        class: color ? undefined : 'p-mug-s',
        'stroke-width': 6,
      }) +
      rect(-18, -40, 36, 6, 'rgba(0,0,0,.12)') +
      g(
        path('M-6 -48 q-6 -10 0 -20 q6 -10 0 -20', 'none', {
          stroke: '#ffffff',
          'stroke-width': 4,
          'stroke-linecap': 'round',
          opacity: 0.7,
        }),
        { class: 'idle-steam' },
      ) +
      g(
        path('M8 -48 q-6 -10 0 -20 q6 -10 0 -18', 'none', {
          stroke: '#ffffff',
          'stroke-width': 4,
          'stroke-linecap': 'round',
          opacity: 0.6,
        }),
        { class: 'idle-steam' },
      ),
  );
}

export function lamp(s = 1, { light = true } = {}) {
  return at(
    0,
    0,
    s,
    (light
      ? g(path('M-40 -150 L40 -150 L130 40 L-130 40 Z', '#ffe9a8', { opacity: 0.35 }), {
          'data-lamp-light': true,
          // On in the evening and at night (engine/daylight.ts).
          class: 'dl dl-lamp',
        })
      : '') +
      rect(-30, -8, 60, 10, C.dark, { rx: 4 }) +
      rect(-4, -110, 8, 104, C.dark) +
      path('M-44 -150 L44 -150 L26 -190 L-26 -190 Z', C.mustard) +
      rect(-44, -154, 88, 6, C.mustardD),
  );
}

/* ------------------------------------------------------------------ the avatar ("me") */

/**
 * Suman's avatar, from his reference drawings (avatar_casual.svg, avatar_back.svg). Both are
 * busts in a 400×400 box that end at the chest, so the avatar is always placed with its
 * bottom edge on the bottom of the frame — never as a full body.
 * Gradients and patterns are flattened (ids would collide between inline SVGs).
 */
export const AV = {
  skin: '#b67d52',
  skinD: '#9c6842',
  ear: '#a87249',
  hair: '#17120f',
  curl: '#3a2c24',
  beard: '#1c1612',
  stache: '#120d0b',
  lips: '#7a3e33',
  frame: '#0c0c0c',
  suit: '#1f2536',
  suitD: '#161b29',
  check: '#2f5f9e',
  checkD: '#24497a',
  checkLine: '#e8c860',
  tee: '#f4f1ea',
  teeD: '#d6d0c4',
};

const FRONT_CURLS = [
  [160, 66, 18],
  [190, 54, 20],
  [222, 56, 19],
  [250, 70, 17],
  [140, 88, 15],
  [264, 94, 14],
];

/** Glasses, front view (shared by the casual bust). */
const glasses = () =>
  rect(138, 146, 56, 38, '#ffffff', {
    rx: 7,
    'fill-opacity': 0.12,
    stroke: AV.frame,
    'stroke-width': 5,
  }) +
  rect(206, 146, 56, 38, '#ffffff', {
    rx: 7,
    'fill-opacity': 0.12,
    stroke: AV.frame,
    'stroke-width': 5,
  }) +
  path('M194 158 Q200 153 206 158', 'none', { stroke: AV.frame, 'stroke-width': 4 }) +
  path('M138 156 L126 160 M262 156 L274 160', 'none', {
    stroke: AV.frame,
    'stroke-width': 4,
    'stroke-linecap': 'round',
  }) +
  path('M146 152 L156 152 M214 152 L224 152', 'none', {
    stroke: '#ffffff',
    'stroke-opacity': 0.6,
    'stroke-width': 2.5,
    'stroke-linecap': 'round',
  });

/** Front bust (avatar_casual.svg): open check shirt over a white tee, smiling. */
/**
 * The raised right arm and open hand, from Suman's waving Lottie (avatar_hand_wave.json),
 * in the bust's 400×400 coordinates. The fingertips are at about (335, 195) — where the
 * graduation cap is held and the offer letter appears.
 */
export const HAND_POINT = [335, 175];
function raisedArm() {
  const skin = '#b47e53';
  const line = { stroke: AV.skinD, 'stroke-width': 1.8 };
  return (
    path('M300 402 L358 402 L352 292 L318 292 Z', AV.check) +
    [326.5, 358.5, 388.5]
      .map((y, i) => rect(330 - (29 + i), y, 58 + i * 2, 7, AV.checkD))
      .join('') +
    rect(338.75, 290, 2.5, 110, AV.checkLine, { opacity: 0.7 }) +
    rect(315, 283.5, 40, 13, AV.checkD, { rx: 4 }) +
    rect(322, 264, 26, 24, AV.skinD, { rx: 6 }) +
    ellipse(336, 250, 23, 24, skin, line) +
    ellipse(310, 252, 6.5, 16, skin, { ...line, transform: 'rotate(-38 310 252)' }) +
    [
      [312.5, 207, 11, 34],
      [324.5, 195, 11, 42],
      [336.5, 197, 11, 40],
      [348, 209, 10, 32],
    ]
      .map(([x, y, w, h]) => rect(x, y, w, h, skin, { rx: 5.5, ...line }))
      .join('') +
    path('M324 258 C330 255 340 253 346 256', 'none', {
      stroke: AV.skinD,
      'stroke-width': 1.6,
      'stroke-linecap': 'round',
    })
  );
}

function frontBust({ anchor, cap, armUp = false }) {
  const body =
    path('M168 225 L232 225 L238 298 Q200 318 162 298 Z', AV.skinD) +
    path('M30 400 C40 325 105 300 160 288 L240 288 C295 300 360 325 370 400 Z', AV.check) +
    // the check: darker bands and a thin yellow line, drawn inside the shirt outline
    path('M60 352 C100 330 140 318 160 314 L240 314 C260 318 300 330 340 352', 'none', {
      stroke: AV.checkD,
      'stroke-width': 7,
    }) +
    path('M44 380 C90 356 130 344 160 340 M240 340 C270 344 310 356 356 380', 'none', {
      stroke: AV.checkD,
      'stroke-width': 7,
    }) +
    path('M96 322 L84 400 M304 322 L316 400', 'none', { stroke: AV.checkD, 'stroke-width': 7 }) +
    path('M110 316 L100 400 M290 316 L300 400', 'none', {
      stroke: AV.checkLine,
      'stroke-width': 2,
      opacity: 0.7,
    }) +
    path('M150 290 L250 290 L236 400 L164 400 Z', AV.tee) +
    path('M164 292 Q200 322 236 292', 'none', {
      stroke: AV.teeD,
      'stroke-width': 6,
      'stroke-linecap': 'round',
    }) +
    path('M150 288 L176 320 L164 400 L140 400 L128 330 L146 322 L132 300 Z', AV.checkD) +
    path('M250 288 L224 320 L236 400 L260 400 L272 330 L254 322 L268 300 Z', AV.checkD) +
    circle(270, 360, 3, '#e8e3d6') +
    circle(268, 388, 3, '#e8e3d6');
  const head =
    ellipse(129, 172, 13, 22, AV.ear) +
    ellipse(271, 172, 13, 22, AV.ear) +
    ellipse(200, 162, 72, 88, AV.skin) +
    path('M246 100 C268 120 274 150 271 180 C262 150 254 128 240 112 Z', AV.skinD) +
    path(
      'M127 155 C112 95 145 48 200 46 C258 46 290 92 274 155 C270 128 262 112 246 104 C222 92 178 92 156 102 C140 110 131 128 127 155 Z',
      AV.hair,
    ) +
    FRONT_CURLS.map(([x, y, r]) => circle(x, y, r, AV.hair)).join('') +
    path('M175 70 q12 -8 22 2 M210 66 q12 -6 20 4', 'none', {
      stroke: AV.curl,
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
    }) +
    path(
      'M129 170 C130 232 160 266 200 268 C240 266 270 232 271 170 C266 198 256 214 242 220 C226 210 174 210 158 220 C144 214 134 198 129 170 Z',
      AV.beard,
    ) +
    path(
      'M168 214 C178 202 194 204 200 209 C206 204 222 202 232 214 C220 218 208 216 200 214 C192 216 180 218 168 214 Z',
      AV.stache,
    ) +
    path('M182 221 Q200 233 218 221 Q200 226 182 221 Z', AV.lips) +
    path('M186 224 Q200 236 214 224', 'none', {
      stroke: '#f4e6dc',
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }) +
    path('M144 140 Q166 128 190 138 M210 138 Q234 128 256 140', 'none', {
      stroke: AV.stache,
      'stroke-width': 7,
      'stroke-linecap': 'round',
    }) +
    ellipse(167, 164, 10, 6.5, '#ffffff') +
    ellipse(233, 164, 10, 6.5, '#ffffff') +
    circle(167, 164, 5, '#2a1a12') +
    circle(233, 164, 5, '#2a1a12') +
    circle(169, 162, 1.6, '#ffffff') +
    circle(235, 162, 1.6, '#ffffff') +
    path('M200 168 Q196 186 190 194 Q200 202 210 194', 'none', {
      stroke: '#8a5a38',
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }) +
    glasses() +
    (cap
      ? g(
          path('M120 44 L200 10 L280 44 L200 78 Z', C.ink) +
            rect(156, 44, 88, 26, C.ink) +
            g(line(272, 46, 280, 96, C.mustard, 4) + circle(280, 98, 5, C.mustard), {
              'data-tassel': true,
            }),
          {
            'data-cap': true,
          },
        )
      : '');
  return body + g(head, anchor ? { 'data-anchor': anchor } : {}) + (armUp ? raisedArm() : '');
}

const BACK_CURLS = [
  [150, 66, 19],
  [176, 50, 20],
  [206, 44, 21],
  [236, 52, 20],
  [260, 72, 18],
  [135, 92, 16],
  [272, 100, 15],
];

/** Curl texture rows from avatar_back.svg (kept inside the hair outline). */
function curlTexture() {
  const rows = [56, 78, 98, 117, 138, 159, 177, 197];
  let d = '';
  rows.forEach((y, r) => {
    for (let x = 130 + (r % 2) * 11; x < 262; x += 22) {
      const inset = y > 180 ? 18 : y < 70 ? 22 : 0;
      if (x < 124 + inset || x > 266 - inset) continue;
      d += `M${x} ${y} q6 -8 12 0 `;
    }
  });
  return path(d.trim(), 'none', {
    stroke: AV.curl,
    'stroke-width': 2.4,
    'stroke-linecap': 'round',
    opacity: 0.55,
  });
}

/** Back bust (avatar_back.svg): navy suit, white collar, curly hair, glasses arms over the ears. */
function backBust({ anchor }) {
  const body =
    path('M166 222 L234 222 L238 298 Q200 312 162 298 Z', AV.ear) +
    path('M176 240 Q200 250 224 240', 'none', {
      stroke: AV.skinD,
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }) +
    path('M30 400 C40 325 105 300 160 288 L240 288 C295 300 360 325 370 400 Z', AV.suit) +
    path('M156 284 Q200 300 244 284 L248 298 Q200 316 152 298 Z', '#ffffff') +
    path('M150 300 Q200 322 250 300 L262 318 Q200 340 138 318 Z', AV.suitD) +
    path('M200 336 L200 400', 'none', { stroke: AV.suitD, 'stroke-width': 3 }) +
    path('M95 330 Q110 370 108 400 M305 330 Q290 370 292 400', 'none', {
      stroke: AV.suitD,
      'stroke-width': 3,
    });
  const head =
    ellipse(200, 162, 72, 88, AV.skin) +
    path(
      'M124 160 C110 92 145 40 200 38 C258 40 292 92 276 160 C273 184 262 200 246 206 Q200 218 154 206 C138 200 127 184 124 160 Z',
      AV.hair,
    ) +
    BACK_CURLS.map(([x, y, r]) => circle(x, y, r, AV.hair)).join('') +
    curlTexture() +
    path(
      'M145 60 q5 -7 10 0 M171 44 q5 -7 10 0 M201 38 q5 -7 10 0 M231 46 q5 -7 10 0 M255 66 q5 -7 10 0',
      'none',
      {
        stroke: AV.curl,
        'stroke-width': 2.2,
        'stroke-linecap': 'round',
        opacity: 0.85,
      },
    ) +
    path(
      'M140 196 Q200 214 260 196 Q252 206 246 208 Q200 222 154 208 Q146 204 140 196 Z',
      '#3b2c22',
      { opacity: 0.7 },
    ) +
    ellipse(128, 172, 12, 21, AV.skinD) +
    ellipse(272, 172, 12, 21, AV.skinD) +
    path('M131 158 Q127 172 132 186 M269 158 Q273 172 268 186', 'none', {
      stroke: '#8a5a38',
      'stroke-width': 2,
    }) +
    path('M118 160 Q126 154 136 158 M282 160 Q274 154 264 158', 'none', {
      stroke: AV.frame,
      'stroke-width': 4,
      'stroke-linecap': 'round',
    });
  return body + g(head, anchor ? { 'data-anchor': anchor } : {});
}

/**
 * Place the avatar bust: `cx` = horizontal centre, `bottom` = the frame's bottom edge it sits
 * on, `k` = scale (1 → 400px tall). The bust is cut at the chest, exactly like the drawings.
 */
export function avatarBust(
  view,
  cx,
  bottom,
  k,
  { anchor = 'head', cap = false, armUp = false, young = false } = {},
) {
  const inner =
    view === 'back'
      ? backBust({ anchor })
      : young
        ? youngBust({ anchor })
        : frontBust({ anchor, cap, armUp });
  return at(cx - 200 * k, bottom - 400 * k, k, inner);
}

/**
 * Young Suman (chapter 01, the Jadavpur years): beardless, red T-shirt, green backpack —
 * from his drawing `assets/avatar_young.svg`, 400×400 like the other busts. Its own
 * backdrop is dropped and the skin gradient flattened (no ids to clash between scenes);
 * the head (ears up) is the bubble anchor.
 */
const YOUNG = readFileSync(new URL('./assets/avatar_young.svg', import.meta.url), 'utf8')
  .replace(/^[\s\S]*?<\/defs>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/<rect width="400" height="400"[^>]*\/>/, '')
  .replace(/url\(#skin\)/g, '#bd8657')
  .replace(/<!--[\s\S]*?-->/g, (c) => (c.includes('Ears') ? '@@HEAD@@' : ''));
export function youngBust({ anchor = 'head' } = {}) {
  const [body, head] = YOUNG.split('@@HEAD@@');
  return body + g(head, anchor ? { 'data-anchor': anchor } : {});
}

/**
 * A graduation cap on its own (chapter 02's hero), centred on the origin, ~240 wide.
 * The tassel is its own [data-tassel] group so it can swing about the button (0, -20).
 */
export function gradCap() {
  return (
    path('M-70 2 L-70 44 Q0 74 70 44 L70 2 Z', '#2a2438') +
    path('M30 8 L70 2 L70 44 Q52 54 30 60 Z', '#1c1828') +
    path('M-124 -18 L0 -70 L124 -18 L0 34 Z', '#2f2a40') +
    path('M0 34 L124 -18 L124 -10 L0 42 Z', '#1c1828') +
    path('M-124 -18 L0 34 L0 42 L-124 -10 Z', '#24203a') +
    circle(0, -18, 7, C.mustard) +
    g(
      path('M0 -18 L96 -2 L100 46', 'none', {
        stroke: C.mustard,
        'stroke-width': 4,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }) +
        path('M92 44 L108 44 L112 74 L88 74 Z', C.mustard) +
        path('M96 52 L96 72 M100 52 L100 72 M104 52 L104 72', 'none', {
          stroke: C.mustardD,
          'stroke-width': 1.5,
        }),
      { 'data-tassel': true },
    )
  );
}

/* ------------------------------------------------------------------ friends (other people) */

/**
 * Other people, drawn in the same illustration style as Suman's avatar: the same head
 * construction (ellipse face, ears, shaded cheek, eye whites + pupils + highlights, brows,
 * nose line), each with their own hair, skin and clothes. Full figures, standing.
 */
export const FRIENDS = {
  student: {
    skin: '#c68a62',
    skinD: '#a8714d',
    hair: 'side',
    hairC: '#2a1d14',
    shirt: '#3f8f8b',
    shirtD: '#2f716e',
    pants: '#3b3550',
    bag: '#c8674a',
  },
  colleague: {
    skin: '#c48c62',
    skinD: '#a06a44',
    hair: 'side',
    hairC: '#1b1410',
    shirt: '#e3a83b',
    shirtD: '#c48b26',
    pants: '#2f2c57',
    glasses: true,
  },
  gradA: {
    skin: '#d9a27a',
    skinD: '#b98258',
    hair: 'long',
    hairC: '#1a120d',
    shirt: '#9db59a',
    shirtD: '#7f9a7c',
    pants: '#3b3550',
  },
  gradB: {
    skin: '#a8714d',
    skinD: '#8a5a38',
    hair: 'crop',
    hairC: '#120d0b',
    shirt: '#5b5aa8',
    shirtD: '#47468a',
    pants: '#2a2438',
    stubble: true,
  },
  teamA: {
    skin: '#b97c55',
    skinD: '#9a6440',
    hair: 'side',
    hairC: '#1b1410',
    shirt: '#3f8f8b',
    shirtD: '#2f716e',
    pants: '#2a2438',
  },
  teamB: {
    skin: '#d9a27a',
    skinD: '#b98258',
    hair: 'bun',
    hairC: '#2a1d14',
    shirt: '#c8674a',
    shirtD: '#a4513a',
    pants: '#3b3550',
  },
  teamC: {
    skin: '#8d5a3b',
    skinD: '#6f4630',
    hair: 'crop',
    hairC: '#0f0b09',
    shirt: '#e3a83b',
    shirtD: '#c48b26',
    pants: '#2f2c57',
    glasses: true,
  },
  teamD: {
    skin: '#c68a62',
    skinD: '#a8714d',
    hair: 'long',
    hairC: '#120d0b',
    shirt: '#5b5aa8',
    shirtD: '#47468a',
    pants: '#2a2438',
  },
  teamE: {
    skin: '#a8714d',
    skinD: '#8a5a38',
    hair: 'side',
    hairC: '#2a1d14',
    shirt: '#b5578a',
    shirtD: '#93436f',
    pants: '#3b3550',
    stubble: true,
  },
  walker: {
    skin: '#b97c55',
    skinD: '#9a6440',
    hair: 'crop',
    hairC: '#1b1410',
    shirt: '#f3e7d3',
    shirtD: '#e2d2b8',
    pants: '#5d566f',
  },
};

/** Head in the avatar's 400×400 source coordinates (face centred at 200,162). */
function friendHead(f) {
  const back =
    f.hair === 'long'
      ? path(
          'M118 150 C108 70 160 52 200 52 C246 52 296 72 284 150 L290 270 Q200 292 110 270 Z',
          f.hairC,
        )
      : f.hair === 'bun'
        ? circle(200, 40, 34, f.hairC)
        : '';
  const top =
    f.hair === 'crop'
      ? path(
          'M130 140 C124 88 156 62 200 62 C246 62 278 88 270 140 C262 112 246 98 200 96 C156 98 138 112 130 140 Z',
          f.hairC,
        )
      : f.hair === 'long' || f.hair === 'bun'
        ? path(
            'M128 150 C118 86 156 58 200 58 C248 58 284 86 272 150 C262 112 236 96 214 100 C200 118 168 104 150 112 C138 120 130 134 128 150 Z',
            f.hairC,
          )
        : // side part
          path(
            'M126 152 C114 88 152 56 202 56 C252 56 286 88 274 150 C268 120 252 104 232 100 C196 92 176 112 150 106 C136 116 128 132 126 152 Z',
            f.hairC,
          ) +
          path('M150 106 C170 84 210 78 236 96', 'none', {
            stroke: '#3a2c24',
            'stroke-width': 3,
            'stroke-linecap': 'round',
          });
  return (
    back +
    ellipse(129, 172, 13, 22, f.skinD) +
    ellipse(271, 172, 13, 22, f.skinD) +
    ellipse(200, 162, 72, 88, f.skin) +
    path('M246 100 C268 120 274 150 271 180 C262 150 254 128 240 112 Z', f.skinD) +
    (f.stubble
      ? path(
          'M134 186 C140 236 168 262 200 264 C232 262 260 236 266 186 C258 214 240 230 200 232 C160 230 142 214 134 186 Z',
          f.hairC,
          { opacity: 0.35 },
        )
      : '') +
    top +
    path('M148 140 Q166 132 188 138 M212 138 Q234 132 252 140', 'none', {
      stroke: f.hairC,
      'stroke-width': 6,
      'stroke-linecap': 'round',
    }) +
    ellipse(167, 164, 10, 6.5, '#ffffff') +
    ellipse(233, 164, 10, 6.5, '#ffffff') +
    circle(167, 164, 5, '#2a1a12') +
    circle(233, 164, 5, '#2a1a12') +
    circle(169, 162, 1.6, '#ffffff') +
    circle(235, 162, 1.6, '#ffffff') +
    path('M200 170 Q197 186 191 194 Q200 201 209 194', 'none', {
      stroke: f.skinD,
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }) +
    path('M180 222 Q200 238 220 222', 'none', {
      stroke: '#7a3e33',
      'stroke-width': 4,
      'stroke-linecap': 'round',
    }) +
    (f.glasses
      ? circle(167, 165, 22, '#ffffff', {
          'fill-opacity': 0.1,
          stroke: '#3a2c24',
          'stroke-width': 4,
        }) +
        circle(233, 165, 22, '#ffffff', {
          'fill-opacity': 0.1,
          stroke: '#3a2c24',
          'stroke-width': 4,
        }) +
        path('M189 162 Q200 156 211 162', 'none', { stroke: '#3a2c24', 'stroke-width': 3.5 })
      : '')
  );
}

/**
 * A standing friend (origin = feet centre, ~300 units tall like personFront).
 * `look`: a key of FRIENDS or an object of the same shape.
 */
export function friend(
  s = 1,
  look = 'student',
  { anchor = null, armsUp = false, cap = false } = {},
) {
  const f = typeof look === 'string' ? FRIENDS[look] : look;
  const arms = armsUp
    ? path('M-38 -186 L-62 -250 L-50 -256 L-26 -190 Z', f.shirtD) +
      path('M38 -186 L62 -250 L50 -256 L26 -190 Z', f.shirtD) +
      circle(-57, -258, 8, f.skin) +
      circle(57, -258, 8, f.skin)
    : rect(-52, -186, 14, 84, f.shirtD, { rx: 7 }) +
      rect(38, -186, 14, 84, f.shirtD, { rx: 7 }) +
      circle(-45, -100, 7.5, f.skin) +
      circle(45, -100, 7.5, f.skin);
  const head = at(0, -240, 0.4, at(-200, -162, 1, friendHead(f)));
  return at(
    0,
    0,
    s,
    rect(-28, -96, 24, 92, f.pants, { rx: 5 }) +
      rect(4, -96, 24, 92, f.pants, { rx: 5 }) +
      rect(-31, -8, 29, 9, '#2a2438', { rx: 4 }) +
      rect(2, -8, 29, 9, '#2a2438', { rx: 4 }) +
      arms +
      path('M-40 -96 L-40 -172 Q-40 -194 -18 -196 L18 -196 Q40 -194 40 -172 L40 -96 Z', f.shirt) +
      path('M22 -194 Q40 -192 40 -172 L40 -96 L28 -96 Z', f.shirtD) +
      path('M-12 -196 Q0 -182 12 -196', 'none', {
        stroke: f.shirtD,
        'stroke-width': 4,
        'stroke-linecap': 'round',
      }) +
      (f.bag
        ? path('M-30 -192 L24 -100', 'none', {
            stroke: f.bag,
            'stroke-width': 6,
            'stroke-linecap': 'round',
          })
        : '') +
      rect(-8, -210, 16, 16, f.skinD) +
      g(
        head +
          (cap
            ? g(
                path('M-34 -284 L0 -298 L34 -284 L0 -270 Z', C.ink) +
                  rect(-18, -284, 36, 10, C.ink),
                {
                  'data-cap': true,
                },
              )
            : ''),
        anchor ? { 'data-anchor': anchor } : {},
      ),
  );
}

/** Standing person from the front (origin = feet centre). */
export function personFront(
  s = 1,
  {
    shirt = C.terra,
    shirtD = C.terraD,
    anchor = null,
    skin = C.skin,
    hair = C.ink,
    armsUp = false,
    cap = false,
  } = {},
) {
  const arms = armsUp
    ? path('M-38 -186 L-62 -250 L-50 -256 L-26 -190 Z', shirtD) +
      path('M38 -186 L62 -250 L50 -256 L26 -190 Z', shirtD)
    : rect(-52, -186, 14, 84, shirtD, { rx: 6 }) + rect(38, -186, 14, 84, shirtD, { rx: 6 });
  return at(
    0,
    0,
    s,
    rect(-28, -96, 24, 96, '#3b3550', { rx: 4 }) +
      rect(4, -96, 24, 96, '#3b3550', { rx: 4 }) +
      arms +
      path('M-40 -96 L-40 -172 Q-40 -194 -18 -196 L18 -196 Q40 -194 40 -172 L40 -96 Z', shirt) +
      rect(-8, -210, 16, 16, C.skinD) +
      g(
        circle(0, -234, 27, skin) +
          path('M-28 -236 A28 28 0 0 1 28 -236 Q14 -250 -6 -246 Q-20 -244 -28 -236 Z', hair) +
          circle(-9, -232, 3, C.ink) +
          circle(9, -232, 3, C.ink) +
          path('M-8 -220 Q0 -214 8 -220', 'none', {
            stroke: C.ink,
            'stroke-width': 2.5,
            'stroke-linecap': 'round',
          }) +
          (cap
            ? g(
                path('M-34 -258 L0 -272 L34 -258 L0 -244 Z', C.ink) +
                  rect(-18, -258, 36, 10, C.ink),
                { 'data-cap': true },
              )
            : ''),
        anchor ? { 'data-anchor': anchor } : {},
      ),
  );
}

/** Gear centred at origin. */
export function gear(r, teeth, color = '#8d86a0') {
  const pts = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.82 : r;
    const a1 = a - Math.PI / (teeth * 2) / 2;
    const a2 = a + Math.PI / (teeth * 2) / 2;
    pts.push(
      `${n(Math.cos(a1) * rr)} ${n(Math.sin(a1) * rr)}`,
      `${n(Math.cos(a2) * rr)} ${n(Math.sin(a2) * rr)}`,
    );
  }
  return (
    path(`M${pts.join(' L')} Z`, color) +
    circle(0, 0, r * 0.5, 'rgba(0,0,0,.12)') +
    circle(0, 0, r * 0.2, C.ink)
  );
}

export function shelf(w) {
  return (
    rect(0, 0, w, 12, C.wood, { rx: 3 }) +
    rect(0, 9, w, 3, C.woodD) +
    rect(16, 12, 8, 24, C.woodD) +
    rect(w - 24, 12, 8, 24, C.woodD)
  );
}

export function books(x, y, count, h = 60, seed = 5) {
  const r = rng(seed);
  const cols = [C.terra, C.teal, C.mustard, '#5b5aa8', '#b5578a', C.sage, '#4f7cb8'];
  let out = '';
  let bx = x;
  for (let i = 0; i < count; i++) {
    const bw = 12 + r() * 10;
    const bh = h * (0.7 + r() * 0.3);
    out +=
      rect(bx, y - bh, bw, bh, cols[i % cols.length], { rx: 2 }) +
      rect(bx + 3, y - bh + 8, bw - 6, 3, 'rgba(255,255,255,.5)');
    bx += bw + 2;
  }
  return out;
}

/**
 * The convocation hall (roof trusses, banners, the seated audience in orange kurtas), from
 * Suman's reference drawing `assets/convocation_cartoon.svg`, in its source coordinates
 * (1480×830). Returns `{ defs, body }`: the gradients are renamed `${idPrefix}-cv-*` so two
 * layouts on one page never clash; `defs` goes inside the body (a <defs> anywhere works).
 */
const CONVOCATION = readFileSync(
  new URL('./assets/convocation_cartoon.svg', import.meta.url),
  'utf8',
);
export const CONVOCATION_SIZE = [1480, 830];
export function convocationHall(idPrefix) {
  const inner = CONVOCATION.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return inner
    .replace(/id="(sky|roof|floor)"/g, (_, k) => `id="${idPrefix}-cv-${k}"`)
    .replace(/url\(#(sky|roof|floor)\)/g, (_, k) => `url(#${idPrefix}-cv-${k})`);
}

/**
 * Jadavpur University main gate, from Suman's reference drawing, in its source coordinates
 * (800×420 box; the gate stands on y = 392). Place it with `at(x, y, k, juGate())`.
 * Flat fills (gradients flattened to a base colour plus darker shade strips); grill bars
 * draw on as the part builds. Sky, trees and ground come from the scene, not from here.
 */
export function juGate() {
  const pillar = (x, w) =>
    rect(x, 86, w, 304, '#9a4d4a') +
    rect(x, 86, w * 0.22, 304, '#7d3b3b') +
    rect(x + w * 0.82, 86, w * 0.18, 304, '#6e3333');
  const bars = (x0, x1, step, y0, y1, w) => {
    let out = '';
    for (let x = x0; x <= x1; x += step) out += line(x, y0, x, y1, '#f4f4f4', w, { class: 'draw' });
    return out;
  };
  return (
    // Beam with the name.
    rect(0, 0, 760, 58, '#e9e3d6') +
    rect(0, 54, 760, 10, '#cfc6b4') +
    path('M0 18 L760 18 M0 36 L760 36', 'none', { stroke: '#d8d0c0', 'stroke-width': 2 }) +
    // Centred on the beam (x 380) so the lamp pole never cuts through the name.
    text(380, 44, 'JADAVPUR  UNIVERSITY', 32, '#2b2b2b', {
      'text-anchor': 'middle',
      'font-weight': 'bold',
      'letter-spacing': 6,
      class: 'serif-text',
    }) +
    rect(0, 64, 760, 22, '#a9a091') +
    // Left pillar.
    pillar(0, 130) +
    rect(0, 380, 134, 14, '#5c2b2b') +
    path('M30 120 L30 370 M70 120 L70 370 M105 120 L105 370', 'none', {
      stroke: '#8a4444',
      'stroke-width': 2,
      opacity: 0.6,
    }) +
    // Left gate with the university's seal (scripts/art/assets/ju-logo.webp) as its medallion.
    rect(125, 226, 164, 160, '#2a2a2a') +
    bars(140, 278, 13.8, 234, 378, 5) +
    circle(205, 306, 33, '#ffffff', { stroke: '#8a1010', 'stroke-width': 2 }) +
    `<image href="${JU_LOGO}" x="175" y="276" width="60" height="60"/>` +
    // Folded middle gate.
    rect(400, 230, 44, 152, '#f1ede6', { stroke: '#3a3a3a', 'stroke-width': 3 }) +
    path('M408 234 L408 378 M416 234 L416 378 M424 234 L424 378 M432 234 L432 378', 'none', {
      stroke: '#cfc8bc',
      'stroke-width': 2,
    }) +
    ellipse(418, 306, 10, 27, '#c98a52', { stroke: '#8a4a22', 'stroke-width': 2 }) +
    // Security booth.
    rect(440, 160, 160, 230, '#c79f76') +
    rect(440, 160, 30, 230, '#d9b48c') +
    rect(560, 160, 40, 230, '#a98060') +
    rect(430, 160, 185, 14, '#e3c39e') +
    rect(455, 86, 40, 78, '#b98f69') +
    rect(530, 86, 22, 78, '#b98f69') +
    rect(460, 246, 54, 80, '#f5f0e6', { stroke: '#8a6a4c', 'stroke-width': 3 }) +
    path(
      'M460 258 H514 M460 270 H514 M460 282 H514 M460 294 H514 M460 306 H514 M460 318 H514 M487 246 V326',
      'none',
      { stroke: '#b8ad9b', 'stroke-width': 2 },
    ) +
    text(544, 218, '4', 34, '#3a3a3a', { 'text-anchor': 'middle', 'font-weight': 'bold' }) +
    rect(440, 380, 160, 12, '#8f6c4f') +
    // Right gate and pillar.
    rect(600, 234, 68, 150, '#2a2a2a') +
    bars(610, 658, 12, 240, 378, 4) +
    pillar(668, 92) +
    rect(664, 380, 100, 14, '#5c2b2b') +
    // Lamp pole.
    rect(706, 0, 9, 392, '#e8e8e8') +
    rect(712, 0, 3, 392, '#9a9a9a')
  );
}

/** Simplified arched gate (generic — no emblem). Origin = bottom centre. */
export function gate(w, h) {
  const pw = w * 0.18;
  const r = w / 2 - pw;
  return (
    rect(-w / 2, -h, pw, h, '#efe2c8') +
    rect(w / 2 - pw, -h, pw, h, '#efe2c8') +
    rect(-w / 2 + pw - 10, -h, 10, h, '#d8c6a5') +
    rect(w / 2 - pw, -h, 10, h, '#d8c6a5') +
    path(
      `M${n(-w / 2)} ${n(-h)} L${n(-w / 2)} ${n(-h - r * 0.9)} Q0 ${n(-h - r * 2.1)} ${n(w / 2)} ${n(-h - r * 0.9)} L${n(w / 2)} ${n(-h)} Z`,
      '#efe2c8',
    ) +
    path(`M${n(-r)} ${n(-h)} A${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-h)} Z`, '#efe2c8') +
    path(
      `M${n(-r)} ${n(-h + 2)} L${n(-r)} ${n(-h)} A${n(r)} ${n(r * 0.8)} 0 0 1 ${n(r)} ${n(-h)} L${n(r)} ${n(-h + 2)} Z`,
      '#d8c6a5',
    ) +
    rect(-w / 2 - 12, -h - r * 0.9 - 14, w + 24, 16, C.terra, { rx: 4 }) +
    rect(-w / 2 - 6, -12, pw + 6, 12, '#d8c6a5') +
    rect(w / 2 - pw, -12, pw + 6, 12, '#d8c6a5')
  );
}

export function cycle(s = 1) {
  return at(
    0,
    0,
    s,
    circle(-40, -26, 26, 'none', { stroke: C.ink, 'stroke-width': 5 }) +
      circle(40, -26, 26, 'none', { stroke: C.ink, 'stroke-width': 5 }) +
      path(
        'M-40 -26 L-8 -26 L16 -62 L-18 -62 Z M16 -62 L40 -26 M-18 -62 L-24 -72 M16 -62 L12 -76 L26 -78',
        'none',
        {
          stroke: C.terra,
          'stroke-width': 5,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
        },
      ) +
      rect(-32, -78, 20, 6, C.ink, { rx: 3 }),
  );
}

/** Roadside chai stall (origin = bottom left). */
export function chaiStall(w, h) {
  return (
    rect(0, -h * 0.55, w, h * 0.55, C.wood) +
    rect(0, -h * 0.55, w, 10, C.woodD) +
    rect(8, -h, 8, h * 0.45, C.woodD) +
    rect(w - 16, -h, 8, h * 0.45, C.woodD) +
    path(
      `M-14 ${n(-h)} L${n(w + 14)} ${n(-h)} L${n(w)} ${n(-h + 30)} L0 ${n(-h + 30)} Z`,
      C.terra,
    ) +
    text(w / 2, -h + 22, 'CHA', 18, C.paper, { 'text-anchor': 'middle', class: 'title-text' }) +
    rect(w * 0.15, -h * 0.55 - 34, 34, 34, '#4a4459', { rx: 4 }) +
    g(
      path(`M${n(w * 0.15 + 10)} ${n(-h * 0.55 - 40)} q-6 -10 0 -20 q6 -10 0 -18`, 'none', {
        stroke: '#fff',
        'stroke-width': 4,
        opacity: 0.7,
        'stroke-linecap': 'round',
      }),
      { class: 'idle-steam' },
    ) +
    [0, 1, 2]
      .map((i) =>
        path(`M${n(w * 0.55 + i * 22)} ${n(-h * 0.55 - 26)} l16 0 l-3 26 l-10 0 Z`, '#b5643f'),
      )
      .join('')
  );
}

/** Rounded plane window, origin top-left. Content clipped inside. */
export function planeWindow(pfx, w, h, inner) {
  const clip = `${pfx}-pclip`;
  return (
    `<defs><clipPath id="${clip}">${rect(18, 18, w - 36, h - 36, '#000', { rx: (w - 36) * 0.42 })}</clipPath></defs>` +
    rect(0, 0, w, h, '#e9e4da', { rx: w * 0.46 }) +
    rect(8, 8, w - 16, h - 16, '#d5cfc2', { rx: w * 0.44 }) +
    g(rect(0, 0, w, h, `url(#${pfx}-sky)`) + inner, { 'clip-path': `url(#${clip})` })
  );
}

/** Simplified outline of India in a 100×100 box (generic, not survey-accurate). */
export const INDIA = [
  [35, 0],
  [45, 4],
  [43, 12],
  [50, 18],
  [58, 26],
  [70, 30],
  [80, 33],
  [86, 29],
  [98, 28],
  [95, 37],
  [88, 42],
  [84, 39],
  [80, 45],
  [74, 53],
  [66, 61],
  [60, 71],
  [56, 82],
  [52, 95],
  [46, 85],
  [42, 71],
  [38, 58],
  [33, 51],
  [22, 47],
  [23, 40],
  [30, 36],
  [26, 27],
  [34, 18],
  [30, 10],
];
export const CITIES = { kolkata: [78, 46], hyderabad: [52, 63], delhi: [44, 26], mumbai: [36, 58] };

export function india(x, y, w, h, fill = '#e9dcc3') {
  const d =
    INDIA.map(
      ([px, py], i) => `${i ? 'L' : 'M'}${n(x + (px / 100) * w)} ${n(y + (py / 100) * h)}`,
    ).join(' ') + ' Z';
  return path(d, fill);
}

export const cityPt = (x, y, w, h, key) => [
  x + (CITIES[key][0] / 100) * w,
  y + (CITIES[key][1] / 100) * h,
];

export function planeIcon(s = 1, color = C.ink) {
  return at(
    0,
    0,
    s,
    path(
      'M-22 0 L8 -4 L18 -18 L24 -18 L18 -3 L26 -2 L30 -8 L34 -8 L32 0 L34 8 L30 8 L26 2 L18 3 L24 18 L18 18 L8 4 L-22 0 Z',
      color,
    ),
  );
}

/** Departures / info board at origin. */
export function infoBoard(w, h, rows, anchor = 'board') {
  let out = rect(0, 0, w, h, '#1b1e2e', { rx: 8 }) + rect(0, 0, w, h * 0.22, '#272c42', { rx: 8 });
  out += text(14, h * 0.15, rows[0], h * 0.1, '#f2b84b', { 'letter-spacing': 2 });
  rows.slice(1).forEach((r, i) => {
    out += text(14, h * (0.4 + i * 0.2), r, h * 0.09, '#ece6d9');
  });
  return g(out, { 'data-anchor': anchor });
}

export function spotlightOverlay(W, H, cx, cy, rx, ry) {
  return (
    path(
      `M0 0 H${W} V${H} H0 Z M${n(cx - rx)} ${n(cy)} a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0 a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0 Z`,
      '#0b0a18',
      { 'fill-rule': 'evenodd', opacity: 0.74 },
    ) +
    ellipse(cx, cy, rx * 1.02, ry * 1.02, 'none', {
      stroke: '#fff3c4',
      'stroke-width': 3,
      opacity: 0.25,
    })
  );
}

export function biryani(s = 1) {
  return at(
    0,
    0,
    s,
    path('M-50 -40 Q-54 0 -30 6 L30 6 Q54 0 50 -40 Z', '#8a5a3c') +
      ellipse(0, -40, 52, 12, '#6f4630') +
      ellipse(0, -44, 44, 9, '#f2c76b') +
      circle(-14, -46, 5, '#c8674a') +
      circle(12, -47, 4, '#7a9a4f') +
      rect(-58, -36, 10, 6, '#6f4630', { rx: 3 }) +
      rect(48, -36, 10, 6, '#6f4630', { rx: 3 }) +
      g(
        path('M-10 -56 q-6 -10 0 -20 q6 -10 0 -20', 'none', {
          stroke: '#fff',
          'stroke-width': 4,
          'stroke-linecap': 'round',
          opacity: 0.7,
        }),
        { class: 'idle-steam' },
      ) +
      g(
        path('M12 -56 q-6 -10 0 -20 q6 -10 0 -18', 'none', {
          stroke: '#fff',
          'stroke-width': 4,
          'stroke-linecap': 'round',
          opacity: 0.6,
        }),
        { class: 'idle-steam' },
      ),
  );
}

export function printingPress(w, h) {
  return (
    rect(0, h * 0.3, w, h * 0.7, C.metal, { rx: 10 }) +
    rect(0, h * 0.3, w, 12, C.metalD) +
    circle(w * 0.3, h * 0.55, h * 0.16, C.dark) +
    circle(w * 0.3, h * 0.55, h * 0.06, '#8d86a0') +
    circle(w * 0.7, h * 0.55, h * 0.16, C.dark) +
    circle(w * 0.7, h * 0.55, h * 0.06, '#8d86a0') +
    rect(w * 0.1, h * 0.05, w * 0.8, h * 0.25, C.paper, { rx: 3 }) +
    [0, 1, 2, 3]
      .map((i) => rect(w * 0.16, h * (0.1 + i * 0.045), w * 0.6 - i * 20, 5, '#c9b99d'))
      .join('') +
    rect(w * 0.05, h * 0.92, w * 0.9, 10, C.metalD)
  );
}

/* ------------------------------------------------------------------ logos */

/** Google's "G" in a white disc, an avatar of radius r centred at (cx, cy) (the google-cla bot). */
export function googleAvatar(cx, cy, r = 12) {
  const s = (r * 1.4) / 48;
  return (
    circle(cx, cy, r, '#ffffff', { stroke: '#dadce0', 'stroke-width': 0.8 }) +
    at(
      cx - 24 * s,
      cy - 24 * s,
      s,
      path(
        'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z',
        '#EA4335',
      ) +
        path(
          'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z',
          '#4285F4',
        ) +
        path(
          'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z',
          '#FBBC05',
        ) +
        path(
          'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z',
          '#34A853',
        ),
    )
  );
}

/** Twilio's mark (a ring with four dots), outer radius r, centred at (cx, cy). */
export function twilioMark(cx, cy, r, color = '#f22f46') {
  return (
    circle(cx, cy, r * 0.867, 'none', { stroke: color, 'stroke-width': n(r * 0.265) }) +
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]
      .map(([dx, dy]) => circle(cx + dx * r * 0.25, cy + dy * r * 0.25, r * 0.208, color))
      .join('')
  );
}

/* ------------------------------------------------------------------ city views & window nook */

/** Howrah Bridge, a silhouette across (x, y, w, h): cantilever towers, truss, deck. */
export function howrahBridge(x, y, w, h, color = '#8b7a8e', { lights = false } = {}) {
  const deck = y + h * 0.82;
  const t1 = x + w * 0.24;
  const t2 = x + w * 0.76;
  const top = y + h * 0.04;
  const mid = y + h * 0.4;
  const end = y + h * 0.62;
  // Top chord: end → tower → dip in the suspended span → tower → end.
  const chord = `M${n(x)} ${n(end)} L${n(t1)} ${n(top)} Q${n(x + w * 0.5)} ${n(mid + h * 0.08)} ${n(t2)} ${n(top)} L${n(x + w)} ${n(end)}`;
  let out = path(chord, 'none', { stroke: color, 'stroke-width': 3.2, 'stroke-linejoin': 'round' });
  out += rect(x, deck, w, 4, color);
  // Towers.
  for (const tx of [t1, t2]) out += rect(tx - 3, top, 6, deck - top + 4, color);
  // Truss: verticals and diagonals between deck and chord.
  const chordY = (px) => {
    if (px <= t1) return end + ((top - end) * (px - x)) / (t1 - x || 1);
    if (px >= t2) return top + ((end - top) * (px - t2)) / (x + w - t2 || 1);
    const u = (px - t1) / (t2 - t1);
    // Quadratic from tower top to tower top through the control point.
    const cy = mid + h * 0.08;
    return (1 - u) * (1 - u) * top + 2 * (1 - u) * u * cy + u * u * top;
  };
  const steps = 16;
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const px = x + (w * i) / steps;
    const py = chordY(px);
    out += line(px, py, px, deck, color, 1.4);
    if (prev) out += line(prev[0], prev[1], px, deck, color, 1.2);
    prev = [px, py];
  }
  if (lights)
    for (let i = 0; i <= steps; i += 2)
      out += circle(x + (w * i) / steps, deck - 2, 1.6, '#ffd27a');
  return g(out, { class: 'howrah' });
}

/** A paper kite with its tail and string (Kolkata rooftops), at (x, y). */
export function kite(x, y, s = 1, color = C.terra, tail = C.mustard) {
  return g(
    at(
      x,
      y,
      s,
      path('M0 -14 L11 0 L0 18 L-11 0 Z', color) +
        line(0, -14, 0, 18, 'rgba(0,0,0,.18)', 1) +
        line(-11, 0, 11, 0, 'rgba(0,0,0,.18)', 1) +
        path('M0 18 Q-6 26 2 32 Q8 38 0 46', 'none', { stroke: tail, 'stroke-width': 2 }) +
        path('M0 18 Q40 70 120 120', 'none', {
          stroke: 'rgba(60,50,70,.35)',
          'stroke-width': 0.8,
        }),
    ),
    { class: 'idle-kite' },
  );
}

/** Charminar, Hyderabad: four minarets with balconies and domes, the arched gate, (0, 0) = base centre. */
export function charminar(s = 1, color = '#c9a48a', shade = '#b38d73') {
  const minaret = (mx) =>
    rect(mx - 6, -150, 12, 150, color) +
    [-118, -86, -56].map((by) => rect(mx - 9, by, 18, 5, shade)).join('') +
    path(`M${mx - 7} -150 Q${mx} -172 ${mx + 7} -150 Z`, shade) +
    rect(mx - 1, -180, 2, 10, shade);
  return at(
    0,
    0,
    s,
    rect(-52, -70, 104, 70, color) +
      // Gallery and screen on top of the gate.
      rect(-50, -84, 100, 14, shade) +
      [...Array(9)].map((_, i) => rect(-44 + i * 11, -82, 5, 10, color)).join('') +
      // The great arch.
      path('M-24 0 V-34 Q-24 -60 0 -62 Q24 -60 24 -34 V0 Z', shade) +
      path('M-17 0 V-32 Q-17 -50 0 -52 Q17 -50 17 -32 V0 Z', 'rgba(40,30,50,.35)') +
      minaret(-50) +
      minaret(50),
  );
}

/** A marigold garland (genda phool) hanging in a swag across `w`, with strands at the ends. */
export function marigoldGarland(w, sag = 26, seed = 21) {
  const r = rng(seed);
  const colors = ['#f2a20c', '#e8780c', '#f6c419'];
  let out = '';
  const count = Math.max(10, Math.round(w / 12));
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const x = u * w;
    const y = 4 * sag * u * (1 - u);
    out += circle(x, y, 5.2 + r() * 1.2, colors[i % 3]);
  }
  for (const sx of [0, w]) {
    for (let j = 1; j <= 5; j++) out += circle(sx, j * 10, 5, colors[(j + (sx ? 1 : 0)) % 3]);
    out += path(`M${sx - 4} 58 L${sx} 66 L${sx + 4} 58 Z`, C.leafD);
  }
  return g(out, { class: 'garland' });
}

/** A terracotta pot with a little tulsi plant, base centre at (0, 0). */
export function tulsiPot(s = 1) {
  return at(
    0,
    0,
    s,
    ellipse(-8, -34, 6, 12, C.leaf, { transform: 'rotate(-28 -8 -34)' }) +
      ellipse(8, -36, 6, 13, C.leafD, { transform: 'rotate(24 8 -36)' }) +
      ellipse(0, -44, 5, 13, C.leaf) +
      path('M-16 -22 L16 -22 L12 0 L-12 0 Z', C.terra) +
      rect(-18, -26, 36, 6, C.terraD, { rx: 2 }),
  );
}

/** Two books, base at (0, 0). */
export function sillStill(s = 1) {
  return at(
    0,
    0,
    s,
    rect(-30, -10, 40, 10, C.teal, { rx: 2 }) + rect(-26, -18, 34, 8, C.mustard, { rx: 2 }),
  );
}

/**
 * Around a window of (w × h) at its own origin: curtains at both sides, a marigold garland
 * over the top, and on the sill a tulsi pot and books. `k` scales the trims.
 */
export function windowNook(w, h, { k = 1, curtainColor = C.terra } = {}) {
  const cw = 46 * k;
  return (
    at(-cw * 0.7, -10 * k, k, curtain(h / k + 26, curtainColor)) +
    at(w - cw * 0.3, -10 * k, k, curtain(h / k + 26, curtainColor)) +
    rect(-cw, -16 * k, w + cw * 2, 8 * k, C.woodD, { rx: 3 }) +
    at(0, -6 * k, k, marigoldGarland(w / k, 26)) +
    at(w * 0.16, h - 4, k, tulsiPot()) +
    at(w * 0.8, h - 4, k, sillStill())
  );
}

/* ------------------------------------------------------------------ desk things that follow the scroll */

/**
 * A small digital desk clock, base centre at (0, 0). Its time (`data-clock="d"`, HH:MM) is set by
 * the engine as the journey plays or scrolls (engine/loop.ts).
 */
export function deskClock(s = 1) {
  const mono = { 'font-family': 'ui-monospace, Consolas, Menlo, monospace', 'font-weight': 700 };
  return at(
    0,
    0,
    s,
    rect(-42, -4, 10, 4, '#2a2438', { rx: 2 }) +
      rect(32, -4, 10, 4, '#2a2438', { rx: 2 }) +
      rect(-52, -48, 104, 45, '#3b3550', { rx: 9 }) +
      rect(-46, -42, 92, 33, '#141019', { rx: 5 }) +
      text(-7, -18, '88:88', 22, '#3a1d1d', { ...mono, 'text-anchor': 'middle' }) +
      text(-7, -18, '08:00', 22, '#ff6f4f', {
        ...mono,
        'text-anchor': 'middle',
        'data-clock': 'd',
      }) +
      text(42, -15, 'AM', 8, '#ff6f4f', { ...mono, 'text-anchor': 'end', 'data-clock': 'ap' }) +
      circle(44, -44, 1.6, '#7be0a0'),
  );
}

/**
 * A calendar hanging on the wall from a nail (top centre at (0, 0)), in the desk clock's style:
 * the year in the same LED digits (`data-desk-year`, set by the engine from the scene on
 * screen — engine/loop.ts applyYear — with a short flip when it changes).
 */
export function wallCalendar(s = 1) {
  const mono = { 'font-family': 'ui-monospace, Consolas, Menlo, monospace', 'font-weight': 700 };
  return at(
    0,
    0,
    s,
    // The string from the nail to the two rings.
    path('M-30 30 L0 2 L30 30', 'none', {
      stroke: '#5d566f',
      'stroke-width': 1.6,
      'stroke-linejoin': 'round',
    }) +
      circle(0, 2, 3.4, '#2a2438') +
      rect(-60, 26, 120, 98, '#3b3550', { rx: 10 }) +
      rect(-34, 20, 7, 15, '#2a2438', { rx: 3.5 }) +
      rect(27, 20, 7, 15, '#2a2438', { rx: 3.5 }) +
      rect(-51, 40, 102, 74, '#141019', { rx: 6 }) +
      text(0, 57, 'YEAR', 9, '#ff6f4f', { ...mono, 'text-anchor': 'middle', opacity: 0.75 }) +
      text(0, 96, '2017', 30, '#ff6f4f', {
        ...mono,
        'text-anchor': 'middle',
        'data-desk-year': true,
      }),
  );
}

/** A little succulent in a pot, base centre at (0, 0); its leaves (`data-sway`) sway with the scroll. */
export function deskSucculent(s = 1) {
  return at(
    0,
    0,
    s,
    g(
      ellipse(-9, -30, 6, 14, C.leaf, { transform: 'rotate(-30 -9 -30)' }) +
        ellipse(9, -30, 6, 14, C.leafD, { transform: 'rotate(30 9 -30)' }) +
        ellipse(0, -36, 6, 16, C.leaf) +
        ellipse(-4, -24, 5, 9, C.leafD, { transform: 'rotate(-60 -4 -24)' }) +
        ellipse(4, -24, 5, 9, C.leaf, { transform: 'rotate(60 4 -24)' }),
      { 'data-sway': true },
    ) +
      path('M-16 -20 L16 -20 L12 0 L-12 0 Z', null, { class: 'p-pot' }) +
      rect(-17, -23, 34, 5, 'rgba(0,0,0,.18)', { rx: 2 }),
  );
}

/** A wall bookshelf of two shelves, top-left at (0, 0), `w` wide; it drifts with the scroll. */
export function wallBookshelf(w = 220, seed = 3) {
  return g(
    rect(0, 70, w, 12, C.wood, { rx: 3 }) +
      rect(0, 79, w, 3, C.woodD) +
      rect(0, 168, w, 12, C.wood, { rx: 3 }) +
      rect(0, 177, w, 3, C.woodD) +
      rect(18, 82, 8, 22, C.woodD) +
      rect(w - 26, 82, 8, 22, C.woodD) +
      rect(18, 180, 8, 22, C.woodD) +
      rect(w - 26, 180, 8, 22, C.woodD) +
      books(12, 70, Math.floor(w / 24), 62, seed) +
      books(16, 168, Math.floor(w / 26), 58, seed + 5),
    { 'data-parallax': 26 },
  );
}
