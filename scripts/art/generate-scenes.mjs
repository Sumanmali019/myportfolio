#!/usr/bin/env node
/**
 * Generates the starting artwork for every chapter, desktop (1440×900) and mobile (390×844),
 * into src/assets/scenes/{desktop,mobile}. The SVG files are the source of truth — edit
 * them by hand freely; re-running this script OVERWRITES them.
 *
 *   node scripts/art/generate-scenes.mjs            # all scenes
 *   node scripts/art/generate-scenes.mjs 05 10      # only ids starting with these prefixes
 *
 * Conventions the engine relies on (see README → "Scene SVG conventions"):
 *   [data-id][data-k]    parts that build/take apart (k = depth, back → front)
 *   [data-morph]         parts that morph into the same key in the next scene
 *   [data-anchor]        bubble tail targets        [data-screen]  screen rects
 *   [data-link]          rects real <a> links sit over
 *   [data-year] [data-month] [data-date] [data-city] [data-odometer]   counters
 *   .idle-*              ambient loops               .draw          strokes that draw on
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import * as K from './kit.mjs';
// Loaded with --experimental-strip-types (see `pnpm art`): the same renderer the browser uses.
import { renderLottie } from '../../src/lib/lottie.ts';

const { C, rect, circle, path, line, text, g, at, part, n } = K;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const LAYOUTS = {
  desktop: { W: 1440, H: 900, m: false, key: 'd' },
  mobile: { W: 390, H: 844, m: true, key: 'm' },
};

/**
 * The avatar as a bust on the bottom edge of the frame (never a full body). `data-view` lets
 * the engine turn it around (front ↔ back) when consecutive chapters show different sides.
 */
const me = (L, view, k, { d, m, ...opts }) =>
  part(
    'me',
    view === 'back' ? 7 : 6,
    L.m ? K.avatarBust(view, m, 844, k.m, opts) : K.avatarBust(view, d, 900, k.d, opts),
    {
      'data-view': view,
    },
  );

/* ------------------------------------------------------------------ shared rooms */

/** The desk rooms' window (x, y, w, h): big, on the left wall. */
/**
 * The desk rooms' window: tall, from near the top of the wall down to just above the floor
 * (desktop); on mobile it fills the wall above the monitor.
 */
const windowBox = (L) => (L.m ? [18, 26, 196, 146] : [44, 40, 390, 652]);

/**
 * Around the window, Kolkata touches (K.windowNook): curtains, a marigold garland over the
 * top, a tulsi pot and a chai cup with books on the sill. A part of its own, so it glides
 * from room to room with the window.
 */
const windowNook = (L) => {
  const [wx, wy, ww, wh] = windowBox(L);
  return part('window-nook', 2, at(wx, wy, 1, K.windowNook(ww, wh, { k: L.m ? 0.5 : 1 })));
};

/**
 * The room's light follows the desk clock (engine/daylight.ts): over the day window, the same
 * window at sunset and at night, and glows over the room — each shown by the scene SVG's
 * `data-daypart` (classes `dl dl-<part>`; styles/global.css fades them in and out).
 */
const DUSK_SKY = [
  [0, '#5b4a8a'],
  [0.55, '#e2796a'],
  [1, '#f6b56b'],
];
const NIGHT_SKY = [
  [0, '#141432'],
  [1, '#2a2756'],
];
function laterWindow(L, pfx, id, stops, opts, cls) {
  const [wx, wy, ww, wh] = windowBox(L);
  const sky =
    `<defs><linearGradient id="${pfx}-${id}-sky" x1="0" y1="0" x2="0" y2="1">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') +
    '</linearGradient></defs>';
  return part(
    `${id}-window`,
    1,
    sky + at(wx, wy, 1, K.windowObj(`${pfx}-${id}`, ww, wh, { ...opts, city: 'kolkata' })),
    { class: cls },
  );
}
function roomLight(L, pfx) {
  const glow = (id, color, o) =>
    part(id, 3, rect(0, 0, L.W, L.H, color, { opacity: o }), {
      class: `dl dl-${id.split('-')[0]}`,
    });
  return [
    glow('morning-light', '#fff7e0', 0.1),
    glow('afternoon-light', '#f2a94a', 0.16),
    glow('evening-light', '#ff7a3d', 0.14),
    // Night: the room lights are on — a warm pool of light from the ceiling.
    part(
      'night-light',
      3,
      `<defs><radialGradient id="${pfx}-room-light" cx="0.5" cy="0" r="0.95"><stop offset="0" stop-color="#ffe2a0" stop-opacity="0.5"/><stop offset="0.6" stop-color="#ffd27a" stop-opacity="0.18"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>` +
        rect(0, 0, L.W, L.H, `url(#${pfx}-room-light)`),
      { class: 'dl dl-night' },
    ),
  ];
}

/**
 * Wall, floor, window, desk, me and a plant — the desk-scene backbone (no calendar anywhere).
 */
function deskRoom(
  L,
  pfx,
  {
    windowId = 'office-window',
    morph = 'window',
    view = 'rooftops',
    plant = true,
    withMe = true,
    /** Where the back-view bust stands (centre x per layout). */
    meAt = { d: 300, m: 82 },
    /** Curtains, garland and sill things round the window (off when windows go on top). */
    nook = true,
    /** A wall bookshelf (off where the room has its own). */
    shelf = true,
  } = {},
) {
  const parts = [];
  const floorY = L.m ? 700 : 720;
  parts.push(part('wall', 0, K.wall(L.W, L.H, floorY)));
  parts.push(part('floor', 0, K.floor(L.W, L.H, floorY)));
  const [wx, wy, ww, wh] = windowBox(L);
  parts.push(
    part(
      windowId,
      1,
      at(wx, wy, 1, K.windowObj(`${pfx}-${windowId}`, ww, wh, { view, city: 'kolkata' })),
      morph ? { 'data-morph': morph } : {},
    ),
  );
  parts.push(
    laterWindow(L, pfx, 'dusk', DUSK_SKY, { view, sun: 'sunset' }, 'dl dl-evening'),
    laterWindow(L, pfx, 'night', NIGHT_SKY, { view: 'night' }, 'dl dl-night'),
  );
  if (nook) parts.push(windowNook(L));
  parts.push(part('desk', 2, L.m ? at(-10, 478, 1, K.desk(410)) : at(360, 600, 1, K.desk(1040))));
  if (plant)
    parts.push(
      part('plant', 3, L.m ? at(352, 700, 0.55, K.plant()) : at(130, 720, 1.1, K.plant())),
    );
  // Things that follow the journey: a desk clock whose hands turn as it plays or scrolls, a
  // succulent that sways, and a wall bookshelf that drifts (engine/loop.ts applyScrolled).
  parts.push(
    part('desk-clock', 3, L.m ? at(44, 478, 0.55, K.deskClock()) : at(410, 600, 1, K.deskClock())),
    // On the wall, top right: a calendar showing the year of the scene on screen.
    wallCalendarAt(L),
  );
  if (!L.m) parts.push(part('desk-succulent', 3, at(1060, 600, 1, K.deskSucculent())));
  if (shelf && !L.m) parts.push(part('wall-books', 1, at(1150, 196, 1, K.wallBookshelf(230))));
  parts.push(...roomLight(L, pfx));
  if (withMe) parts.push(me(L, 'back', { d: 0.9, m: 0.48 }, meAt));
  return parts;
}

/** The year calendar hanging on the wall, top right (the same place in every room). */
const wallCalendarAt = (L) =>
  part(
    'wall-calendar',
    1,
    L.m ? at(318, 22, 0.72, K.wallCalendar()) : at(1268, 44, 1, K.wallCalendar()),
  );

const monitorAt = (L, attrs, dims) => {
  const [x, y, w, h] = dims ?? (L.m ? [20, 220, 350, 200] : [560, 250, 520, 300]);
  return at(x, y, 1, K.monitor(w, h, attrs));
};

const phoneAt = (x, y, w, h, attrs, opt) => at(x, y, 1, K.phone(w, h, attrs, opt));

function sky(L, extra = '') {
  return part('sky', 0, rect(0, 0, L.W, L.H, `url(#PFX-sky)`) + extra);
}

function stars(L, count, seed) {
  const r = K.rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = r() * L.W;
    const y = r() * L.H * 0.85;
    const s = 0.6 + r() * 1.1;
    // The twinkle wrapper must not carry the transform attribute (CSS transforms replace it).
    out += g(
      g(
        at(
          x,
          y,
          s,
          path('M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z', '#f4efe4'),
        ),
        { class: 'idle-twinkle' },
      ),
      {
        class: 'star',
      },
    );
  }
  return out;
}

/**
 * The offer letter (chapter 02), in local coordinates (paper at 10..190 × 10..240). It grows
 * out of Suman's hand as the cap lands. Hooks for scenes/02-graduation.ts:
 *   [data-letter] scales in · [data-letter-body] text from profile.ts
 *   [data-sign] signature draws on (no stamp)
 */
function offerLetter() {
  return g(
    g(
      rect(10, 10, 180, 230, C.paper, { rx: 4 }) +
        rect(10, 10, 180, 6, C.terra, { rx: 3 }) +
        rect(186, 16, 4, 224, '#e2d2b8') +
        text(100, 40, 'OFFER LETTER', 16, C.ink, { 'text-anchor': 'middle', class: 'title-text' }) +
        line(30, 50, 170, 50, '#e2d2b8', 1.5) +
        rect(24, 58, 152, 118, 'none', { 'data-letter-body': true }) +
        path('M26 208 q9 -16 17 0 t17 0 t15 -7 q8 9 20 -3', 'none', {
          stroke: C.ink,
          'stroke-width': 1.8,
          'stroke-linecap': 'round',
          'data-sign': true,
        }),
      { 'data-anchor': 'letter' },
    ),
    { 'data-letter': true },
  );
}

/**
 * Graduation: Suman's cap-toss Lottie (`src/assets/lottie/graduation-cap-toss.json`).
 * Its camera layer is taken out here and applied by scenes/02-graduation.ts to the hall and
 * the graduate together, so the whole scene follows the cap up into the sky and back.
 * `at` places the 400×400 Lottie (bust on the bottom edge); `focus` is the Lottie point the
 * zoomed camera centres on, so the cap peaks mid-frame.
 */
const TOSS = JSON.parse(
  readFileSync(
    new URL('../../src/assets/lottie/graduation-cap-toss.json', import.meta.url),
    'utf8',
  ),
);
const tossLayers = (names) => ({
  ...TOSS,
  layers: TOSS.layers.filter((l) => names.includes(l.nm)).map(({ parent: _parent, ...l }) => l),
});
const GRAD = {
  d: { x: 340, y: 540, k: 0.9, letter: [640, 610], letterK: 1 },
  m: { x: 45, y: 544, k: 0.75, letter: [220, 640], letterK: 0.65 },
};
/**
 * Cloudcraftz: Suman's typing Lottie (`src/assets/lottie/typing-top-view.json`), his hands on
 * the keyboard seen from his own eyes. Its desk top, wood grain and mug are dropped (the
 * scene's own desk is behind it); keyboard, key flashes, arms and fingers stay.
 */
const TYPING = (() => {
  const anim = JSON.parse(
    readFileSync(new URL('../../src/assets/lottie/typing-top-view.json', import.meta.url), 'utf8'),
  );
  const desk = anim.layers.find((l) => l.nm === 'desk & keyboard');
  // Groups 0–5 are the keyboard (marks, legends, key tops, keys, body, shadow).
  desk.shapes = desk.shapes.slice(0, 6);
  return anim;
})();
/** Where the typing hands sit: keyboard on the desk under the monitor, arms from the bottom. */
const TYPING_AT = { d: { x: 590, y: 447, k: 1.1 }, m: { x: 55, y: 613, k: 0.7 } };

/**
 * Interview at BeWorld (`src/assets/lottie/interview-offer-mail.json`, 640×400): the video
 * interview, then the offer mail and its PDF. Shown on the desk monitor in chapter 04.
 */
const INTERVIEW = JSON.parse(
  readFileSync(
    new URL('../../src/assets/lottie/interview-offer-mail.json', import.meta.url),
    'utf8',
  ),
);
// The offer letter PDF's company line is outlined glyphs reading "ACME TECH" (light, centred
// under OFFER LETTER): swap them for live text naming BeWorld, in the same colour and size.
(() => {
  const pdf = INTERVIEW.layers.find((l) => l.nm === 'offer letter pdf');
  const grp = pdf?.shapes[15];
  if (!grp || grp.ty !== 'gr' || grp.it.filter((i) => i.ty === 'sh').length !== 9)
    throw new Error('interview Lottie: offer letter company line not where expected');
  grp.it = [
    {
      ty: 'raw',
      svg: '<text x="0" y="-100" fill="#c9d4e3" font-family="Arial, Helvetica, sans-serif" font-size="8.4" font-weight="700" letter-spacing="0.8" text-anchor="middle">BEWORLD</text>',
    },
    ...grp.it.filter((i) => i.ty === 'tr'),
  ];
})();
/**
 * Interview at Neura Dynamics (`src/assets/lottie/interview-offer-mail-neura.json`, 640×400):
 * the same video call → offer mail → PDF story, branded for Neura Dynamics. Chapter 08.
 */
const INTERVIEW_NEURA = JSON.parse(
  readFileSync(
    new URL('../../src/assets/lottie/interview-offer-mail-neura.json', import.meta.url),
    'utf8',
  ),
);
// No date on the offer letters: the PDF's "Start date: 01 Dec 2026" line (grey outlined
// glyphs, under the role) goes from both interviews.
for (const anim of [INTERVIEW, INTERVIEW_NEURA]) {
  const pdf = anim.layers.find((l) => l.nm === 'offer letter pdf');
  const grp = pdf?.shapes[12];
  const fill = grp?.it?.find((i) => i.ty === 'fl')?.c?.k;
  if (!grp || grp.ty !== 'gr' || !fill || Math.abs(fill[0] - 0.294) > 0.01)
    throw new Error('interview Lottie: offer letter start date line not where expected');
  grp.it = grp.it.filter((i) => i.ty === 'tr');
}
/**
 * Kolkata → Hyderabad (`src/assets/lottie/india-flight-ccu-hyd.json`, 600×700): the map,
 * route and plane, shown on the seat-back screen in the flight chapter.
 */
const FLIGHT_MAP = JSON.parse(
  readFileSync(
    new URL('../../src/assets/lottie/india-flight-ccu-hyd.json', import.meta.url),
    'utf8',
  ),
);
/** Hyderabad → Kolkata (`src/assets/lottie/india-flight-hyd-ccu.json`): the flight home. */
const FLIGHT_HOME = JSON.parse(
  readFileSync(
    new URL('../../src/assets/lottie/india-flight-hyd-ccu.json', import.meta.url),
    'utf8',
  ),
);

/**
 * Hyderabad, day to night (`src/assets/lottie/day-night-hyd.json`, 1440×900): the whole room —
 * window, desk, monitor with the release pipeline, the BeWorld and Current Affairs phones, Suman
 * from behind — working by day, then dusk, then studying by lamplight. Chapter 05.
 */
/**
 * A tall window (as in the desk rooms) over a room Lottie's own small one (its glass is about
 * 82–388 × 122–398 in all three rooms): from near the top of the wall to just above the floor.
 * Its sunset and night versions show by the desk clock (engine/daylight.ts, the dl classes).
 * Inserted just above the file's window layers, so the plant, desk and the rest stay in front;
 * parented like them (to the camera, where there is one), so it zooms with the room.
 */
function tallWindowLayer(anim, city, key) {
  const mullions = anim.layers.findIndex((l) => l.nm === 'window mullions');
  if (mullions < 0) throw new Error(`${key} Lottie: no window layers`);
  const parent = anim.layers[mullions].parent;
  const [wx, wy, ww, wh] = [58, 40, 366, 652];
  const skyDefs = (id, stops) =>
    `<defs><linearGradient id="${key}-${id}-sky" x1="0" y1="0" x2="0" y2="1">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') +
    '</linearGradient></defs>';
  const tallWindow = (id, stops, opts, cls) =>
    g(
      skyDefs(id, stops) + at(wx, wy, 1, K.windowObj(`${key}-${id}`, ww, wh, { ...opts, city })),
      cls ? { class: cls } : {},
    );
  anim.layers.splice(mullions, 0, {
    ddd: 0,
    ind: 950,
    ty: 4,
    nm: 'tall window',
    sr: 1,
    ao: 0,
    ip: anim.ip,
    op: anim.op,
    st: 0,
    bm: 0,
    ...(parent !== undefined ? { parent } : {}),
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    shapes: [
      {
        ty: 'gr',
        it: [
          {
            ty: 'raw',
            svg:
              tallWindow('day', [
                [0, '#8ec5ea'],
                [1, '#e3f0f4'],
              ]) +
              tallWindow('dusk', DUSK_SKY, { sun: 'sunset' }, 'dl dl-evening') +
              tallWindow('night', NIGHT_SKY, { view: 'night' }, 'dl dl-night'),
          },
        ],
      },
    ],
  });
}

const DAY_NIGHT = (() => {
  const anim = JSON.parse(
    readFileSync(new URL('../../src/assets/lottie/day-night-hyd.json', import.meta.url), 'utf8'),
  );
  // Suman (the 'me head' / 'me body' layers) stands at x≈300 in the file: move him to the
  // centre of the desk, in front of the monitor by day and the laptop by night.
  const dx = 460;
  for (const l of anim.layers) {
    if (l.nm !== 'me head' && l.nm !== 'me body') continue;
    // Position, not anchor: the head still nods about the base of its neck.
    l.ks.p.k[0] += dx;
  }
  // Hyderabad through a tall window, the Charminar in the view.
  tallWindowLayer(anim, 'hyderabad', 'hyd');
  return anim;
})();
const isMe = (l) => l.nm === 'me head' || l.nm === 'me body';
/** The room without Suman, and Suman on his own: drawn on top so he sits in front of the desk. */
/** Bounds of every path vertex in a shape item (recursing into groups). */
function shapeBounds(item, b = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (item.ty === 'gr') for (const it of item.it) shapeBounds(it, b);
  if (item.ty === 'sh')
    for (const [x, y] of item.ks.k.v) {
      b[0] = Math.min(b[0], x);
      b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x);
      b[3] = Math.max(b[3], y);
    }
  return b;
}
/** Is this group the Lottie's monitor (body, stand, screen and the pipeline on it)? */
const onLottieMonitor = (item) => {
  const [x0, y0, x1, y1] = shapeBounds(item);
  return x0 >= 555 && x1 <= 1085 && y0 >= 245 && y1 <= 610;
};
/**
 * The file's own food (a biryani pot by day, a mug at night) goes: the desk's dish follows the
 * clock instead, as on every table (kit deskMeal).
 */
const BIRYANI = [405, 495, 535, 610];
const NIGHT_MUG = [975, 505, 1040, 605];
/** Bounds of paths, ellipses and rectangles in a shape item (recursing into groups). */
function itemBounds(item, r = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (item.ty === 'gr') for (const it of item.it) itemBounds(it, r);
  const grow = (x, y) => {
    r[0] = Math.min(r[0], x);
    r[1] = Math.min(r[1], y);
    r[2] = Math.max(r[2], x);
    r[3] = Math.max(r[3], y);
  };
  if (item.ty === 'sh') for (const [x, y] of item.ks.k.v) grow(x, y);
  if ((item.ty === 'el' || item.ty === 'rc') && Array.isArray(item.p.k)) {
    const [x, y] = item.p.k;
    const [w, h] = item.s.k;
    grow(x - w / 2, y - h / 2);
    grow(x + w / 2, y + h / 2);
  }
  return r;
}
const within = (item, [x0, y0, x1, y1]) => {
  const [a, b, c, d] = itemBounds(item);
  return Number.isFinite(a) && a >= x0 && b >= y0 && c <= x1 && d <= y1;
};
/** The room without Suman and without the Lottie's monitor (the bigger one replaces it). */
const DAY_NIGHT_ROOM = {
  ...DAY_NIGHT,
  layers: DAY_NIGHT.layers
    // No calendars in the journey.
    .filter((l) => !isMe(l) && l.nm !== 'calendar')
    .map((l) =>
      l.nm === 'day props'
        ? { ...l, shapes: l.shapes.filter((g) => !onLottieMonitor(g) && !within(g, BIRYANI)) }
        : l.nm === 'night shelves & mug'
          ? { ...l, shapes: l.shapes.filter((g) => !within(g, NIGHT_MUG)) }
          : l,
    ),
};
const DAY_NIGHT_ME = { ...DAY_NIGHT, layers: DAY_NIGHT.layers.filter(isMe) };
/** Just the day things: their monitor screen (the pipeline) is shown on the bigger monitor. */
const DAY_NIGHT_PIPE = {
  ...DAY_NIGHT,
  layers: DAY_NIGHT.layers.filter((l) => l.nm === 'day props'),
};
/** The Lottie's own monitor screen, in its coordinates. */
const DAY_NIGHT_SCREEN = { x: 572, y: 262, w: 496, h: 276, fill: '#1d2133' };
/** The bigger monitor, near chapter 03's size, clear of the phones (room coordinates). */
const DAY_NIGHT_MONITOR = { x: 430, y: 96, w: 660, h: 450 };
/** The typing hands: keyboard under the monitor (chapter 03's, shifted to this monitor's centre). */
const DAY_NIGHT_TYPING_AT = { ...TYPING_AT.d, x: TYPING_AT.d.x - 50 };

/**
 * Flutter contributor (`src/assets/lottie/flutter-oss-contributor.json`, 1440×900): the whole
 * room — the editor types the fix, the pull request is reviewed, checks pass and it merges,
 * then the camera zooms into flutter/flutter's contributors with his photo, and the
 * "Official Flutter Contributor" banner and confetti. Chapter 10.
 * Patched in, inside its camera (so it zooms with the room): Suman from behind in the middle of the desk, under the monitor, with the
 * monitor's screen as the beat anchor and the PR link.
 */
/** Chapter 10's heading, over the room. */
const ossLabel = (L) =>
  part(
    'label',
    6,
    text(L.W / 2, L.m ? 46 : 64, '★  HIGHLIGHT · OPEN SOURCE', L.m ? 13 : 20, C.mustard, {
      'text-anchor': 'middle',
      'letter-spacing': L.m ? 2 : 4,
    }),
  );
const OSS = (() => {
  const anim = JSON.parse(
    readFileSync(
      new URL('../../src/assets/lottie/flutter-oss-contributor.json', import.meta.url),
      'utf8',
    ),
  );
  const still = (shapes, nm) => ({
    ddd: 0,
    ind: 900 + anim.layers.length,
    ty: 4,
    nm,
    sr: 1,
    ao: 0,
    ip: anim.ip,
    op: anim.op,
    st: 0,
    bm: 0,
    parent: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    shapes: [{ ty: 'gr', it: [{ ty: 'raw', svg: shapes }] }],
  });
  const cal = anim.layers.find((l) => l.nm === 'calendar');
  const screen = anim.layers.findIndex((l) => l.nm.startsWith('screen:'));
  if (!cal || screen < 0 || anim.layers[0].nm !== 'camera')
    throw new Error('flutter Lottie: calendar / screens / camera not where expected');
  // Its wall calendar goes: no calendars in the journey.
  cal.shapes = [];
  // The google-cla bot's comment on the PR: Google's logo as its avatar, over the CLA badge.
  const pr = anim.layers.find((l) => l.nm === 'screen: pull request');
  if (!pr) throw new Error('flutter Lottie: no pull request screen');
  pr.shapes.unshift({ ty: 'gr', it: [{ ty: 'raw', svg: K.googleAvatar(601, 398, 12.5) }] });
  // The contributions graph: the commit bar and its label at the merge date, May 28, 2024
  // (gridlines every 50 units a year, 2024 at x = 868, so x ≈ 888.5; drawn at 876).
  const graph = anim.layers.find((l) => l.nm === 'screen: contributors');
  const [label, bar] = graph?.shapes ?? [];
  const barTr = bar?.it?.find((i) => i.ty === 'tr');
  const labelTr = label?.it?.find((i) => i.ty === 'tr');
  if (!barTr || !labelTr || barTr.p.k[0] !== 876)
    throw new Error('flutter Lottie: contributions bar not where expected');
  const shift = 12.5;
  barTr.p.k[0] += shift;
  labelTr.p.k[0] += shift;
  // Over the monitor and desk, under the screens' toast, banner and confetti (drawn later).
  anim.layers.splice(
    screen,
    0,
    still(
      // Suman from behind (scenes/10-open-source.ts swaps him for his typing hands while the
      // code is written).
      // The desk clock, on the left of the desk (zooms with the room; fades as the camera
      // zooms into the contributors page, with Suman).
      g(at(600, 597, 1, K.deskClock()), { 'data-oss-clock': true }) +
        // Over the editor, under his head: GitHub's issue list, which he browses before the fix
        // (scenes/10-open-source.ts, screens/github-issues.ts).
        g(rect(572, 262, 496, 276, 'none', { 'data-screen': 'gh-issues' }), {
          'data-issues': true,
        }) +
        g(K.avatarBust('back', 820, 900, 0.9), { 'data-oss-me': true }) +
        rect(572, 262, 496, 276, 'none', { 'data-anchor': 'monitor', 'data-link': 'flutter-pr' }),
      'me',
    ),
  );
  // A tall window, as in the other rooms.
  tallWindowLayer(anim, 'kolkata', 'oss');
  return anim;
})();

/**
 * MeritHyre's Twilio refund (`src/assets/lottie/twilio-a2p-refund.json`, 1440×900, same room
 * as the Flutter one): Twilio billing shows an unexpected −$300 A2P 10DLC charge, a support
 * ticket is filed, Twilio replies and approves, the camera zooms into the +$300.00 credit, then
 * a banner and confetti. Chapter 09c. As in chapter 10: its calendar goes, and Suman from
 * behind is patched in under the monitor (its screen is the beat anchor).
 */
const REFUND = (() => {
  const anim = JSON.parse(
    readFileSync(
      new URL('../../src/assets/lottie/twilio-a2p-refund.json', import.meta.url),
      'utf8',
    ),
  );
  const cal = anim.layers.find((l) => l.nm === 'calendar');
  const screen = anim.layers.findIndex((l) => l.nm.startsWith('screen:'));
  if (!cal || screen < 0 || anim.layers[0].nm !== 'camera')
    throw new Error('refund Lottie: calendar / screens / camera not where expected');
  cal.shapes = [];
  const me = structuredClone(OSS.layers.find((l) => l.nm === 'me'));
  me.ind = 900 + anim.layers.length;
  me.ip = anim.ip;
  me.op = anim.op;
  me.shapes = [
    {
      ty: 'gr',
      it: [
        {
          ty: 'raw',
          svg:
            // The desk clock and Suman fade as the camera zooms into the credit.
            g(at(600, 597, 1, K.deskClock()) + K.avatarBust('back', 820, 900, 0.9), {
              'data-zoom-fade': true,
            }) + rect(572, 262, 496, 276, 'none', { 'data-anchor': 'monitor' }),
        },
      ],
    },
  ];
  anim.layers.splice(screen, 0, me);
  // Twilio's own mark (ring and four dots) for the red dots: the console header on every
  // screen, and Twilio Support's avatar on its reply.
  const isRed = (it) => {
    const c = it.find((x) => x.ty === 'fl')?.c?.k;
    return Array.isArray(c) && typeof c[0] === 'number' && c[0] > 0.85 && c[1] < 0.35;
  };
  const bounds = (it) => {
    const xs = [];
    const ys = [];
    JSON.stringify(it, (k, v) => {
      if (k === 'v' && Array.isArray(v))
        for (const p of v) {
          if (!Array.isArray(p)) continue;
          xs.push(p[0]);
          ys.push(p[1]);
        }
      return v;
    });
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  };
  let marks = 0;
  const swap = (items) => {
    for (const x of items) {
      if (x.ty !== 'gr') continue;
      if (isRed(x.it)) {
        const [x0, x1, y0, y1] = bounds(x.it);
        if (x1 - x0 < 20 && y1 - y0 < 20) {
          const r = Math.max(x1 - x0, y1 - y0) / 2 + 0.5;
          x.it = [
            { ty: 'raw', svg: K.twilioMark((x0 + x1) / 2, (y0 + y1) / 2, r) },
            ...x.it.filter((i) => i.ty === 'tr'),
          ];
          marks++;
          continue;
        }
      }
      swap(x.it);
    }
  };
  for (const l of anim.layers) if (l.nm.startsWith('screen:')) swap(l.shapes);
  if (marks !== 5) throw new Error(`refund Lottie: expected 5 Twilio dots, found ${marks}`);
  // A tall window, as in the other rooms.
  tallWindowLayer(anim, 'kolkata', 'rfd');
  return anim;
})();

/** A Lottie's first frame in a nested <svg> filling (x, y, w, h); the scene animates it. */
const lottieBox = (anim, id, pfx, x, y, w, h, fit = 'xMidYMid slice') =>
  `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${anim.w} ${anim.h}" preserveAspectRatio="${fit}" data-lottie="${id}">` +
  renderLottie(anim, `${pfx}-${id}`, 0) +
  `</svg>`;

const head = (v) => (Array.isArray(v) ? v[0] : v);

/** Drop a trailing 0 on position / scale triples; x and y are all the player reads. */
const trimVec = (v) => (Array.isArray(v) && v.length === 3 && v[2] === 0 ? v.slice(0, 2) : v);

function slimKeyframe(kf) {
  const out = { t: kf.t, s: trimVec(kf.s) };
  if (kf.h === 1) {
    out.h = 1;
    return out;
  }
  if (kf.e !== undefined) {
    out.e = kf.e;
    return out;
  }
  if (!kf.o || !kf.i) return out;
  const ox = head(kf.o.x);
  const oy = head(kf.o.y);
  const ix = head(kf.i.x);
  const iy = head(kf.i.y);
  const linear = ox === 0 && oy === 0 && ix === 1 && iy === 1;
  const standard = ox === 0.45 && oy === 0 && ix === 0.55 && iy === 1;
  if (linear) return out;
  out.e = standard ? 1 : [ox, oy, ix, iy];
  return out;
}

function slimLayer({ ind, ty, ks = {} }) {
  const next = {};
  for (const [key, prop] of Object.entries(ks)) {
    if (!prop || prop.a !== 1) {
      const k = prop?.k;
      if (key === 'o' && k === 100) continue;
      if (key === 'r' && k === 0) continue;
      if (key === 's' && Array.isArray(k) && k[0] === 100 && k[1] === 100) continue;
      if ((key === 'p' || key === 'a') && Array.isArray(k) && k[0] === 0 && k[1] === 0) continue;
      if (k === undefined) continue;
      next[key] = { k: trimVec(k) };
    } else next[key] = { a: 1, k: prop.k.map(slimKeyframe) };
  }
  return { ind, ty, ks: next };
}

/**
 * Only the motion (no shapes, no layer names) goes to the browser.
 * Static identity transforms are dropped, and the usual ease is `e: 1`
 * instead of a full in/out bezier (see `valueAt` in src/lib/lottie.ts).
 */
function writeMotion(anim, name) {
  const motion = {
    fr: anim.fr,
    ip: anim.ip,
    op: anim.op,
    layers: anim.layers.map(slimLayer),
  };
  writeFileSync(
    resolve(root, `src/assets/lottie/${name}.motion.json`),
    // Two decimals is far below a pixel: smaller to ship.
    `${JSON.stringify(motion, (_, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v))}
`,
  );
}

/* ------------------------------------------------------------------ scenes */

/* ------------------------------------------------------------------ intro */

const WAVE = JSON.parse(
  readFileSync(new URL('../../src/assets/lottie/avatar-hand-wave.json', import.meta.url), 'utf8'),
);

const GREETING = [
  'I’m Suman — Tech Lead / SDE II.',
  'I turn ideas into products across',
  'mobile, web & backend, and lead teams',
  'from idea to launch. Always curious,',
  'always learning.',
];

/**
 * A desk where one product is built on the big monitor (chapters 11a, 11b; as 09b): the room,
 * the monitor (`app-build` screen, the beat anchor, and a link to the live site), a mug, Suman
 * from behind and his typing hands (shown by the scene module).
 */
function buildDesk(L, pfx, link, room = {}) {
  const m = L.m;
  const mon = m ? [10, 172, 370, 252] : [440, 96, 740, 450];
  return [
    ...deskRoom(L, pfx, { withMe: false, ...room }),
    part(
      'monitor',
      4,
      g(monitorAt(L, { 'data-screen': 'app-build' }, mon), { 'data-anchor': 'monitor' }) +
        rect(mon[0], mon[1], mon[2], mon[3], 'none', { 'data-link': link }),
    ),
    part('meal', 6, m ? '' : at(545, 600, 1.35, K.deskMeal())),
    me(L, 'back', { d: 0.9, m: 0.48 }, { d: 810, m: 195 }),
    part(
      'typing',
      7,
      g(
        (({ x, y, k }) => at(x, y, k, renderLottie(TYPING, `${pfx}-type`, 0)))(
          m ? TYPING_AT.m : TYPING_AT.d,
        ),
        { 'data-typing': true, opacity: 0, transform: 'translate(0 160)' },
      ),
    ),
  ];
}

const SCENES = {
  /* 00 — Hello: Suman's waving avatar (his Lottie) on the night sky, with a greeting bubble.
     The avatar is the `me` part, so it glides straight into its place at the Jadavpur gate. */
  '00-intro'(L, pfx) {
    const m = L.m;
    // The avatar at the bottom centre (his bust ends ~385 units down its 400 box, so it sits
    // on the frame's bottom edge); the greeting bubble above him on mobile, beside his face on
    // desktop.
    const P = m
      ? {
          box: [20, n(L.H - 385 * 0.875), 350],
          bubble: [40, 322, 310, 156],
          tip: [190, 532],
        }
      : {
          box: [485, n(L.H - 385 * 1.175), 470],
          bubble: [975, 440, 405, 228],
          tip: [862, 560],
        };
    const [bx, by, bs] = P.box;
    const [qx, qy, qw, qh] = P.bubble;
    const parts = [];
    parts.push(sky(L));
    parts.push(
      part(
        'stars',
        1,
        g(
          stars(L, m ? 40 : 80, 21) + circle(m ? 330 : 1250, m ? 50 : 120, m ? 16 : 26, '#f4efe4'),
          {
            'data-stars': true,
          },
        ),
      ),
    );
    // The avatar: first frame rendered here (no background — it stands on the sky);
    // scenes/00-install.ts animates the wave.
    parts.push(
      part(
        'me',
        6,
        `<svg x="${bx}" y="${by}" width="${bs}" height="${bs}" viewBox="0 0 400 400" data-lottie="avatar-wave">` +
          renderLottie(WAVE, `${pfx}-wave`, 0, { transparent: true }) +
          `</svg>`,
        { 'data-view': 'front' },
      ),
    );
    // Tail: down from the bubble's bottom edge to his head (mobile), or from its left edge to
    // just beside his face (desktop).
    const tail = m
      ? `M${qx + qw / 2 - 30} ${qy + qh - 2} L${P.tip[0]} ${P.tip[1]} L${qx + qw / 2 + 2} ${qy + qh - 2} Z`
      : `M${qx + 2} ${qy + 60} L${qx + 2} ${qy + 104} L${P.tip[0]} ${P.tip[1]} Z`;
    const pad = m ? 12 : 30;
    const title = ['Hi! Welcome to my portfolio.'];
    const lines = m
      ? [
          'I’m Suman — Tech Lead / SDE II.',
          'I turn ideas into products across',
          'mobile, web & backend, and lead teams',
          'from idea to launch.',
          'Always curious, always learning.',
        ]
      : GREETING;
    const bubble =
      rect(qx, qy, qw, qh, C.paper, { rx: m ? 14 : 22 }) +
      path(tail, C.paper) +
      title
        .map((t, i) =>
          text(qx + pad, qy + (m ? 26 : 48) + i * 18, t, m ? 14 : 24, C.ink, {
            class: 'title-text',
          }),
        )
        .join('') +
      lines
        .map((l, i) =>
          text(qx + pad, qy + (m ? 68 : 88) + i * (m ? 17 : 28), l, m ? 12 : 16, '#3b3550'),
        )
        .join('');
    parts.push(part('greeting', 5, g(bubble, { 'data-greeting-bubble': true })));
    // "Scroll or play to begin" is the page's own hint at the bottom (components/Stage.astro).
    return parts;
  },

  /* 01 — Jadavpur main gate at dawn, through the gate into a hostel desk; gears → code. */
  '01-jadavpur'(L) {
    const m = L.m;
    // Desktop: the campus sits lower, so the whole gate shows even when a wide screen crops the
    // top (bottom-anchored); no road — the ground runs to the bottom, Suman at the gate.
    const D = m ? 0 : 80;
    // Background life: drifting clouds, birds, swaying trees, falling leaves, a passer-by.
    const bird = (x, y, sc) =>
      g(
        at(
          x,
          y,
          sc,
          path('M-12 0 Q-6 -8 0 0 Q6 -8 12 0', 'none', {
            stroke: '#5a4668',
            'stroke-width': 2.5,
            'stroke-linecap': 'round',
          }),
        ),
        { class: 'idle-bird', 'data-drift': n(L.W * 0.65) },
      );
    const leaves = (
      m
        ? [
            [40, 430],
            [150, 420],
            [300, 440],
            [360, 425],
          ]
        : [
            [150, 530],
            [430, 520],
            [800, 535],
            [1150, 525],
            [1350, 540],
            [610, 510],
          ]
    )
      .map(([x, y], i) =>
        g(
          K.ellipse(x, y, m ? 4 : 6, m ? 2.5 : 3.5, i % 2 ? '#7da35a' : '#c99a3b', {
            transform: `rotate(${i * 40} ${x} ${y})`,
          }),
          {
            class: 'idle-leaf',
            'data-fall': m ? 170 : 260,
          },
        ),
      )
      .join('');
    return [
      sky(
        L,
        circle(m ? 300 : 1110, m ? 150 : 200, m ? 34 : 60, '#ffe0a8') +
          K.cloud(L.W * 0.08, m ? 70 : 90, m ? 0.6 : 1.1, m ? 60 : 160) +
          K.cloud(L.W * 0.45, m ? 120 : 140, m ? 0.45 : 0.8, m ? 50 : 140) +
          K.cloud(L.W * 0.7, m ? 40 : 60, m ? 0.5 : 0.9, m ? 50 : 150) +
          bird(L.W * 0.3, m ? 200 : 260, m ? 0.7 : 1) +
          bird(L.W * 0.36, m ? 220 : 290, m ? 0.55 : 0.8) +
          bird(L.W * 0.6, m ? 190 : 240, m ? 0.6 : 0.9),
      ),
      part(
        'campus-wall',
        1,
        [0.1, 0.3, 0.55, 0.8, 0.95]
          .map((f, i) =>
            g(
              K.ellipse(
                L.W * f,
                (m ? 455 : 470) + D,
                m ? 50 : 110,
                m ? 40 : 70,
                i % 2 ? C.leaf : C.leafD,
              ),
              {
                class: 'idle-sway',
              },
            ),
          )
          .join('') +
          rect(0, (m ? 470 : 500) + D, L.W, m ? 80 : 130, '#c97f5c') +
          rect(0, (m ? 466 : 494) + D, L.W, 10, '#a4513a'),
      ),
      part('ground', 0, rect(0, (m ? 545 : 625) + D, L.W, L.H, '#d6c2a3')),
      part('leaves', 2, leaves),
      part('gate', 3, m ? at(13, 432, 0.48, K.juGate()) : at(302, 209 + D, 1.1, K.juGate())),
      // Only Suman at the gate.
      me(L, 'front', { d: 0.8, m: 0.5 }, { d: 680, m: 190, young: true }),
    ];
  },

  /* 02 — graduation: Suman throws his cap; it comes back down as the offer letter in his hand. */
  '02-graduation'(L, pfx) {
    const m = L.m;
    const G = m ? GRAD.m : GRAD.d;
    // The convocation hall (Suman's drawing) covers the frame, sitting on the bottom edge;
    // on mobile it is cropped to its centre.
    const [hw, hh] = K.CONVOCATION_SIZE;
    const hk = Math.max(L.W / hw, L.H / hh);
    const hx = m ? L.W / 2 - (hw / 2) * hk : (L.W - hw * hk) / 2;
    const T = G; // placement of the cap-toss Lottie and the letter
    const lottieAt = (inner) => at(T.x, T.y, T.k, inner);
    // [data-cam]: scenes/02-graduation.ts applies the Lottie camera to both groups.
    const cam = (inner) => g(inner, { 'data-cam': true });
    return [
      part(
        'hall',
        0,
        cam(
          // Open sky above the roof, for when the camera follows the cap up.
          `<defs><linearGradient id="${pfx}-toss-sky" gradientUnits="userSpaceOnUse" x1="0" y1="-2600" x2="0" y2="0"><stop offset="0" stop-color="#3d8fd6"/><stop offset="1" stop-color="#d9eef8"/></linearGradient></defs>` +
            rect(-3 * L.W, -2600, 7 * L.W, 2610, `url(#${pfx}-toss-sky)`) +
            // The Lottie's clouds and confetti (its gradient backdrop dropped), behind the hall
            // and faded in with the camera zoom.
            g(
              lottieAt(renderLottie(tossLayers(['sky']), `${pfx}-tsky`, 0, { transparent: true })),
              {
                'data-toss-sky': true,
                opacity: 0,
              },
            ) +
            // The hall in front of the sky: the clouds only show above its roof. Softly
            // blurred (edges duplicated, so the frame stays solid) to keep the focus on Suman.
            at(
              n(hx),
              n(L.H - hh * hk),
              n(hk * 1000) / 1000,
              `<defs><filter id="${pfx}-hall-blur" filterUnits="userSpaceOnUse" x="0" y="0" width="${hw}" height="${hh}"><feGaussianBlur stdDeviation="${m ? 2.6 : 2.2}" edgeMode="duplicate"/></filter></defs>` +
                g(K.convocationHall(pfx), { filter: `url(#${pfx}-hall-blur)` }),
            ),
        ),
      ),
      // Suman (the Lottie graduate: kurta, glasses, the cap on his head and the throwing arm).
      part(
        'me',
        6,
        cam(
          lottieAt(
            renderLottie(
              tossLayers(['graduate', 'eyes', 'face details', 'arm', 'cap']),
              `${pfx}-toss`,
              0,
            ),
          ),
        ),
        { 'data-view': 'front', 'data-lottie': 'cap-toss', 'data-toss-at': `${T.x} ${T.y} ${T.k}` },
      ),
      // The offer letter, held up once the cap is back on his head.
      part('offer', 5, at(T.letter[0], T.letter[1], T.letterK, offerLetter())),
    ];
  },

  /* 03 — first desk at Cloudcraftz: QOMIX test suites, app cards, a colleague. */
  '03-kolkata'(L, pfx) {
    const m = L.m;
    return [
      ...deskRoom(L, pfx, { withMe: false }),
      // A bigger monitor than the other desks: the apps on it are the point of this chapter.
      part(
        'monitor',
        4,
        g(
          monitorAt(
            L,
            { 'data-screen': 'app-build' },
            m ? [10, 172, 370, 252] : [440, 96, 740, 450],
          ),
          { 'data-anchor': 'monitor' },
        ),
      ),
      part(
        'phone-qomix',
        5,
        m
          ? phoneAt(16, 512, 84, 150, { 'data-screen': 'app-qomix' })
          : phoneAt(1196, 420, 96, 172, { 'data-screen': 'app-qomix' }),
      ),
      part(
        'phone-ten90',
        5,
        g(
          m
            ? phoneAt(292, 496, 76, 136, { 'data-screen': 'app-ten90' })
            : phoneAt(1300, 432, 88, 160, { 'data-screen': 'app-ten90' }),
          { 'data-late-card': true },
        ),
      ),
      part('meal', 6, m ? '' : at(545, 600, 1.35, K.deskMeal())),
      // Suman, alone at his desk, seen from behind: centred where his typing hands come in
      // (scene module), and drawn after the monitor so his head is in front of its stand.
      me(L, 'back', { d: 0.9, m: 0.48 }, { d: 810, m: 195 }),
      // Where the role thought floats: beside the monitor, clear of the screen and his head.
      part(
        'role-spot',
        1,
        rect(m ? 110 : 150, m ? 640 : 470, m ? 170 : 230, 6, 'none', { 'data-anchor': 'role' }),
      ),
      // His hands typing (the typing Lottie): rises in as his back view sinks away —
      // scenes/03-cloudcraftz.ts drives the hand-over and plays the typing loop.
      part(
        'typing',
        7,
        g(
          (({ x, y, k }) => at(x, y, k, renderLottie(TYPING, `${pfx}-type`, 0)))(
            m ? TYPING_AT.m : TYPING_AT.d,
          ),
          { 'data-typing': true, opacity: 0, transform: 'translate(0 160)' },
        ),
      ),
    ];
  },

  /* 04 — Kolkata, 2023: the BeWorld interview on a video call, then the offer mail and its
     PDF, on the desk monitor (the interview Lottie; scenes/04-interview.ts plays it). */
  '04-interview'(L, pfx) {
    const m = L.m;
    // Clear of the top badges, bottom on the desk; the screen keeps the Lottie's 16:10.
    const [x, y, w, h] = m ? [10, 184, 370, 240] : [450, 100, 700, 446];
    return [
      ...deskRoom(L, pfx, { withMe: false }),
      part(
        'monitor',
        4,
        g(
          at(
            x,
            y,
            1,
            K.monitor(w, h) + lottieBox(INTERVIEW, 'interview', pfx, 12, 12, w - 24, h - 24),
          ),
          { 'data-anchor': 'monitor' },
        ),
      ),
      part('meal', 6, m ? at(330, 478, 0.75, K.deskMeal()) : at(545, 600, 1.35, K.deskMeal())),
    ];
  },

  /* Transit — Kolkata → Hyderabad: the in-flight map (the flight Lottie) on a seat-back
     screen while a plane takes off outside. */
  '04-flight-hyd'(L, pfx) {
    return flight(L, pfx, {
      from: 'kolkata',
      to: 'hyderabad',
      board: ['DEPARTURES', 'CCU → HYD  ✈  2023', 'GATE 7 · BOARDING'],
      laptop: false,
      lottie: FLIGHT_MAP,
    });
  },

  /* 05 — BeWorld, Hyderabad: pipeline, metrics, app cards, biryani, confetti. */
  '05-hyderabad'(L, pfx) {
    const m = L.m;
    // The Lottie is the room. Desktop: 1:1. Mobile: framed like chapter 03 — the big monitor
    // across the width near the top (x 10–380, from y 172), the room around it on wall and floor
    // that continue its own; the phones and the typing hands are placed in the frame (below).
    const s = m ? 370 / DAY_NIGHT_MONITOR.w : 1;
    const [ox, oy] = m ? [10 - DAY_NIGHT_MONITOR.x * s, 172 - DAY_NIGHT_MONITOR.y * s] : [0, 0];
    // Attributes go on a plain wrapper: anchors are transformed by CSS, so no transform attribute.
    const inRoom = (inner, a) => (a ? g(at(ox, oy, s, inner), a) : at(ox, oy, s, inner));
    return [
      ...(m
        ? [
            part('wall', 0, rect(0, 0, L.W, L.H, '#eadfcd')),
            part('floor', 0, rect(0, oy + 720 * s, L.W, L.H, '#b98f6a')),
            // The wall and floor beyond the room darken with its night (the Lottie's layer 4).
            part(
              'night-wall',
              0,
              g(rect(0, 0, L.W, L.H, '#14163a'), { 'data-day': '4', opacity: 0 }),
            ),
          ]
        : []),
      part(
        'room',
        1,
        inRoom(lottieBox(DAY_NIGHT_ROOM, 'day-night', pfx, 0, 0, 1440, 900, 'xMidYMid meet')),
      ),
      // A bigger monitor (as in chapter 03) over the Lottie's own: its screen shows the Lottie's
      // pipeline, scaled up, then the app builds and store listings (scenes/05-beworld.ts).
      // It fades with the Lottie's day layer.
      part(
        'monitor',
        4,
        inRoom(
          (({ x, y, w, h }) => {
            const S = DAY_NIGHT_SCREEN;
            // Exactly the screen's aspect (centred), so nothing beyond the Lottie's screen shows.
            const pw = w - 24;
            const ph = Math.min(h - 24, (pw * S.h) / S.w);
            const pipe =
              `<svg x="12" y="${n(12 + (h - 24 - ph) / 2)}" width="${n(pw)}" height="${n(ph)}" viewBox="${S.x} ${S.y} ${S.w} ${S.h}" preserveAspectRatio="xMidYMid meet" data-lottie="day-night-pipe">` +
              renderLottie(DAY_NIGHT_PIPE, `${pfx}-day-night-pipe`, 0) +
              `</svg>`;
            return at(
              x,
              y,
              1,
              rect(w / 2 - 14, h, 28, 46, C.dark) +
                rect(w / 2 - 70, h + 42, 140, 12, C.dark, { rx: 6 }) +
                rect(0, 0, w, h, C.ink, { rx: 12 }) +
                rect(12, 12, w - 24, h - 24, S.fill, { rx: 4 }) +
                pipe +
                rect(12, 12, w - 24, h - 24, 'none', { rx: 4, 'data-screen': 'pipeline' }),
            );
          })(DAY_NIGHT_MONITOR),
          { 'data-anchor': 'monitor', 'data-day': '7' },
        ),
      ),
      // The two apps on phones: over the Lottie's own phones (desktop), or in front of the desk
      // either side, as in chapter 03 (mobile: the Lottie's phones are out of the frame).
      part(
        'phone-beworld',
        5,
        m
          ? g(phoneAt(16, 512, 84, 150, { 'data-screen': 'app-beworld' }), { 'data-day': '6' })
          : inRoom(
              rect(1117.7, 411.8, 94.6, 172.5, 'none', { rx: 6.6, 'data-screen': 'app-beworld' }),
              {
                'data-day': '6',
              },
            ),
      ),
      part(
        'phone-cadgk',
        5,
        m
          ? g(phoneAt(292, 496, 76, 136, { 'data-screen': 'app-cadgk' }), { 'data-day': '5' })
          : inRoom(rect(1243, 424.9, 86, 160.2, 'none', { rx: 6, 'data-screen': 'app-cadgk' }), {
              'data-day': '5',
            }),
      ),
      // Suman from behind, centred at the desk (the Lottie's own layers, drawn over the desk
      // things); while the code types he hands over to his hands on the keyboard, as in 03.
      part(
        'me-desk',
        6,
        // Mobile: on the frame's bottom edge, centred and the size of the other rooms' back
        // view (deskRoom's me at 0.48), looking up at the monitor — not mid-room.
        m
          ? at(
              n(L.W / 2 - 760 * 0.53),
              n(L.H - 900 * 0.53),
              0.53,
              lottieBox(DAY_NIGHT_ME, 'day-night-me', pfx, 0, 0, 1440, 900, 'xMidYMid meet'),
            )
          : inRoom(lottieBox(DAY_NIGHT_ME, 'day-night-me', pfx, 0, 0, 1440, 900, 'xMidYMid meet')),
      ),
      part(
        'typing',
        7,
        g(
          m
            ? at(
                TYPING_AT.m.x,
                TYPING_AT.m.y,
                TYPING_AT.m.k,
                renderLottie(TYPING, `${pfx}-type`, 0),
              )
            : inRoom(
                at(
                  DAY_NIGHT_TYPING_AT.x,
                  DAY_NIGHT_TYPING_AT.y,
                  DAY_NIGHT_TYPING_AT.k,
                  renderLottie(TYPING, `${pfx}-type`, 0),
                ),
              ),
          { 'data-typing': true, opacity: 0, transform: `translate(0 ${m ? 160 : n(160 * s)})` },
        ),
      ),
      // Night: Scaler on the laptop — its header bar gets the Scaler logo and the module being
      // studied (scenes/05-beworld.ts); it fades in with the Lottie's night lamp & laptop layer.
      part(
        'laptop-scaler',
        6,
        inRoom(rect(630, 430, 270, 22, 'none', { 'data-screen': 'scaler' }), { 'data-day': '3' }),
      ),
      // The biryani pot on the desk (in the Lottie) — where its speech bubble points.
      // The dish of the hour, where the biryani pot was: chai, lunch, snacks, dinner.
      part('meal', 6, m ? at(38, 453, 0.7, K.deskMeal()) : at(470, 597, 1.35, K.deskMeal())),
      // As in every room: the desk clock on the left of the desk (just right of the biryani,
      // clear of the night lamp) and the year calendar on the wall, top right.
      part('desk-clock', 5, m ? at(100, 453, 0.55, K.deskClock()) : at(600, 597, 1, K.deskClock())),
      wallCalendarAt(L),
      g('', {
        'data-confetti': true,
        'data-c': m ? `${n(ox + 1220 * s)} ${n(oy + 380 * s)}` : '1220 380',
      }),
    ];
  },

  /* Transit — Hyderabad → Kolkata: the return in-flight map (its Lottie) on the seat-back
     screen; the laptop on the tray gets a REMOTE sticker. */
  '07-flight-home'(L, pfx) {
    return flight(L, pfx, {
      from: 'hyderabad',
      to: 'kolkata',
      board: ['ARRIVALS', 'HYD → CCU  ✈  2024', 'BELT 3 · WELCOME HOME'],
      laptop: true,
      lottie: FLIGHT_HOME,
    });
  },

  /* 08 — Kolkata, 2024: back home, the Neura Dynamics interview on a video call, then the
     offer mail and its PDF, on the desk monitor (scenes/08-interview.ts plays it). */
  '08-interview'(L, pfx) {
    const m = L.m;
    const [x, y, w, h] = m ? [10, 184, 370, 240] : [450, 100, 700, 446];
    return [
      ...deskRoom(L, pfx, { windowId: 'home-window', withMe: false }),
      part(
        'monitor',
        4,
        g(
          at(
            x,
            y,
            1,
            K.monitor(w, h) + lottieBox(INTERVIEW_NEURA, 'interview', pfx, 12, 12, w - 24, h - 24),
          ),
          { 'data-anchor': 'monitor' },
        ),
      ),
      part('meal', 6, m ? at(330, 478, 0.75, K.deskMeal()) : at(545, 600, 1.35, K.deskMeal())),
    ];
  },

  /* 09 — leading the team at Neura Dynamics: one whole working day on the big monitor.
     Morning: the team sync (Suman on screen, laughing). Then his hands rise onto the keyboard
     and the screen moves through the day, one app at a time, each with a status strip naming
     the app and the time — late morning on the Jira board, the afternoon in Docker, the
     evening writing the backend, the night reviewing and merging on GitHub. Outside, the
     light goes afternoon gold, then dusk, then night, and the desk lamp comes on
     (scenes/09-leading.ts drives all of it). */
  '09-leading'(L, pfx) {
    const m = L.m;
    const [mx, my, mw, mh] = m ? [10, 172, 370, 252] : [440, 96, 740, 450];
    // The screen inside the monitor (K.monitor's bezel is 12 on every side).
    const [sx, sy, sw, sh] = [mx + 12, my + 12, mw - 24, mh - 24];
    // Each app fills the screen above a status strip: app name left, clock right.
    const strip = m ? 16 : 26;
    const fs = m ? 8 : 13;
    const app = (key, name, time, dot) =>
      g(
        rect(sx, sy, sw, sh - strip, C.screen, { 'data-screen': key }) +
          rect(sx, sy + sh - strip, sw, strip, '#0b0d16') +
          circle(sx + fs, sy + sh - strip / 2, fs * 0.35, dot) +
          text(sx + fs * 1.8, sy + sh - strip / 2 + fs * 0.36, name, fs, '#ece6d9') +
          text(sx + sw - fs, sy + sh - strip / 2 + fs * 0.36, time, fs, '#ece6d9', {
            'text-anchor': 'end',
          }),
        { 'data-pane': key, opacity: 0 },
      );
    return [
      ...deskRoom(L, pfx, { windowId: 'home-window', morph: null, withMe: false }),
      part('lamp', 5, m ? '' : at(1260, 600, 1, K.lamp(1))),
      part(
        'monitor',
        4,
        g(
          at(mx, my, 1, K.monitor(mw, mh)) +
            g(rect(sx, sy, sw, sh, C.screen, { 'data-screen': 'call-grid' }), {
              'data-phase': 'call',
            }) +
            g(
              rect(sx, sy, sw, sh, '#0f1220') +
                app('jira-board', 'Jira  ·  Sprint 24', '11:30 AM', '#2684ff') +
                app('docker', 'Docker Desktop', '3:15 PM', '#1d8fe0') +
                app('backend', 'VS Code  ·  neura-backend', '7:40 PM', '#3fa3e8') +
                app('github', 'GitHub  ·  Pull requests', '10:20 PM', '#a68cf0'),
              { 'data-phase': 'work', opacity: 0 },
            ),
          { 'data-anchor': 'laptop' },
        ),
      ),
      // Clear of the screen, so its steam never drifts over it.
      part('meal', 6, m ? '' : at(545, 600, 1.35, K.deskMeal())),
      // Where the thought bubble points (no avatar here: he's on the call, then typing).
      part(
        'head-spot',
        1,
        rect(m ? 110 : 150, m ? 640 : 470, m ? 170 : 230, 6, 'none', { 'data-anchor': 'head' }),
      ),
      part(
        'typing',
        7,
        g(
          (({ x, y, k }) => at(x, y, k, renderLottie(TYPING, `${pfx}-type`, 0)))(
            m ? TYPING_AT.m : TYPING_AT.d,
          ),
          { 'data-typing': true, opacity: 0, transform: 'translate(0 160)' },
        ),
      ),
    ];
  },

  /* 09b — Neura Dynamics, the work: as in chapter 03, the big monitor builds what he ships as
     Tech Lead (Klass Online, Ayantra, DocPharma, MeritHyre — content/showcase.ts) while his
     hands type; the two Play Store apps land on the desk phones; then MeritHyre's Twilio
     A2P 10DLC onboarding (scenes/09-neura-apps.ts drives it all). */
  '09-neura-apps'(L, pfx) {
    const m = L.m;
    return [
      ...deskRoom(L, pfx, { withMe: false }),
      part(
        'monitor',
        4,
        g(
          monitorAt(
            L,
            { 'data-screen': 'app-build' },
            m ? [10, 172, 370, 252] : [440, 96, 740, 450],
          ),
          { 'data-anchor': 'monitor' },
        ),
      ),
      part(
        'phone-klass-online',
        5,
        m
          ? phoneAt(16, 512, 84, 150, { 'data-screen': 'app-klass-online' })
          : phoneAt(1196, 420, 96, 172, { 'data-screen': 'app-klass-online' }),
      ),
      part(
        'phone-ayantra',
        5,
        m
          ? phoneAt(292, 496, 76, 136, { 'data-screen': 'app-ayantra' })
          : phoneAt(1300, 432, 88, 160, { 'data-screen': 'app-ayantra' }),
      ),
      part('meal', 6, m ? '' : at(545, 600, 1.35, K.deskMeal())),
      me(L, 'back', { d: 0.9, m: 0.48 }, { d: 810, m: 195 }),
      part(
        'role-spot',
        1,
        rect(m ? 110 : 150, m ? 640 : 470, m ? 170 : 230, 6, 'none', { 'data-anchor': 'role' }),
      ),
      part(
        'typing',
        7,
        g(
          (({ x, y, k }) => at(x, y, k, renderLottie(TYPING, `${pfx}-type`, 0)))(
            m ? TYPING_AT.m : TYPING_AT.d,
          ),
          { 'data-typing': true, opacity: 0, transform: 'translate(0 160)' },
        ),
      ),
    ];
  },

  /* 09c — the Twilio A2P 10DLC refund: the refund Lottie is the room (as chapter 10). */
  '09-twilio-refund'(L, pfx) {
    const m = L.m;
    const box = lottieBox(REFUND, 'refund', pfx, 0, 0, 1440, 900, 'xMidYMid meet');
    if (!m) return [part('room', 1, box), wallCalendarAt(L)];
    // Mobile pans with the camera, as chapter 10: first the desk from the clock to the reply
    // toasts (x ≈ 548–1180) across the width with a margin, Suman on the bottom edge; then the
    // zoomed credit (x ≈ 112–1328, y ≈ 50–868 with the banner) fit to the width.
    const r3 = (v) => Math.round(v * 1000) / 1000;
    const s0 = (L.W - 24) / 632;
    const s1 = (L.W - 32) / 1300;
    const from = [r3(L.W / 2 - 864 * s0), r3(L.H - 900 * s0), r3(s0)];
    // Above it, as in the other rooms on a phone: a window (top left; its sunset and night
    // versions follow the clock), faded out as the camera zooms into the credit.
    const [wx, wy, ww, wh] = [18, 40, 210, 300];
    const sky = (id, stops) =>
      `<defs><linearGradient id="${pfx}-${id}-sky" x1="0" y1="0" x2="0" y2="1">` +
      stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') +
      '</linearGradient></defs>';
    const win = (id, stops, opts, cls) =>
      g(
        sky(id, stops) +
          at(wx, wy, 1, K.windowObj(`${pfx}-${id}`, ww, wh, { ...opts, city: 'kolkata' })),
        cls ? { class: cls } : {},
      );
    const windowPart = part(
      'office-window',
      1,
      g(
        win('day', [
          [0, '#8ec5ea'],
          [1, '#e3f0f4'],
        ]) +
          win('dusk', DUSK_SKY, { sun: 'sunset' }, 'dl dl-evening') +
          win('night', NIGHT_SKY, { view: 'night' }, 'dl dl-night'),
        { 'data-pan-hide': true },
      ),
    );
    const to = [r3(L.W / 2 - 720 * s1), r3(L.H * 0.5 - 460 * s1), r3(s1)];
    return [
      part('wall', 0, rect(0, 0, L.W, L.H, '#eadfcd')),
      windowPart,
      part(
        'room',
        1,
        at(from[0], from[1], from[2], box, { 'data-pan': [...from, ...to].join(' ') }),
      ),
      wallCalendarAt(L),
    ];
  },

  /* 10 ★ — open source: the Flutter contributor Lottie is the room. */
  '10-open-source'(L, pfx) {
    const m = L.m;
    // Desktop: 1:1. Mobile pans with the camera (data-pan, driven by the scene module): first
    // the monitor (x 560–1080) across the width with Suman's bust on the frame's bottom edge,
    // then, once zoomed, the whole contributors page and banner (x ≈ 75–1365, y ≈ 22–868) fit
    // to the width in the middle of the frame, on wall that continues the room's.
    const box = lottieBox(OSS, 'oss', pfx, 0, 0, 1440, 900, 'xMidYMid meet');
    // His hands on the keyboard, from above (as at the other desks), while the fix is typed.
    const typing = part(
      'typing',
      7,
      g(
        (({ x, y, k }) => at(x, y, k, renderLottie(TYPING, `${pfx}-type`, 0)))(
          m ? TYPING_AT.m : TYPING_AT.d,
        ),
        { 'data-typing': true, opacity: 0, transform: 'translate(0 160)' },
      ),
    );
    if (!m) return [part('room', 1, box), typing, ossLabel(L), wallCalendarAt(L)];
    const r3 = (v) => Math.round(v * 1000) / 1000;
    const s0 = L.W / 560;
    // The whole contributors page (x ≈ 75–1365) fits the width, nothing cut at the edges.
    const s1 = (L.W - 16) / 1300;
    const from = [r3(L.W / 2 - 820 * s0), r3(L.H - 900 * s0), r3(s0)];
    const to = [r3(L.W / 2 - 720 * s1), r3(L.H * 0.5 - 445 * s1), r3(s1)];
    return [
      part('wall', 0, rect(0, 0, L.W, L.H, '#eadfcd')),
      part(
        'room',
        1,
        at(from[0], from[1], from[2], box, { 'data-pan': [...from, ...to].join(' ') }),
      ),
      typing,
      ossLabel(L),
      // Below the heading on mobile.
      part('wall-calendar', 1, at(318, 66, 0.72, K.wallCalendar())),
    ];
  },

  /* 11a — The Quiet Shelf, a side build: as chapter 09b, the big monitor builds it while his
     hands type (scenes/11-quiet-shelf.ts); a wall shelf of books; its live site linked. */
  '11-quiet-shelf'(L, pfx) {
    return [
      ...buildDesk(L, pfx, 'quiet-shelf', { shelf: false }),
      part(
        'wall-shelf',
        2,
        L.m
          ? ''
          : at(1180, 300, 1, K.shelf(200)) +
              K.books(1192, 300, 8, 64, 9) +
              at(1180, 410, 1, K.shelf(200)) +
              K.books(1196, 410, 7, 58, 4),
      ),
    ];
  },

  /* 11b — Khyaati Prakashan, a side build: the monitor builds the marketplace, then a reader pays
     with Razorpay (scenes/11-khyaati.ts); books and a parcel ready to ship on the desk. */
  '11-khyaati'(L, pfx) {
    const m = L.m;
    const parcel = (x, y, s) =>
      at(
        x,
        y,
        s,
        rect(0, -70, 110, 70, '#c49a6c', { rx: 4 }) +
          rect(0, -70, 110, 12, '#b0855a') +
          rect(48, -70, 14, 70, '#e8d6b5') +
          text(55, -24, 'KHYAATI', 11, '#6b4a2b', { 'text-anchor': 'middle' }),
      );
    return [
      ...buildDesk(L, pfx, 'khyaati'),
      part(
        'parcel',
        6,
        m
          ? parcel(300, 478, 0.5)
          : parcel(1220, 600, 1) + at(1350, 600, 1, K.books(0, 0, 3, 46, 12)),
      ),
    ];
  },

  /* 15 — departures board: NEXT DESTINATION → LET'S CONNECT, with contact rows. */
  '15-departures'(L) {
    const m = L.m;
    const floorY = m ? 760 : 720;
    return [
      part('wall', 0, K.wall(L.W, L.H, floorY)),
      part('floor', 0, K.floor(L.W, L.H, floorY)),
      part(
        'board',
        3,
        m
          ? rect(15, 100, 360, 290, '#14172a', { rx: 10, 'data-board': true })
          : rect(540, 190, 840, 400, '#14172a', { rx: 14, 'data-board': true }),
      ),
      part(
        'cta',
        5,
        g(
          m
            ? rect(20, 410, 350, 58, C.terra, { rx: 29, 'data-link': 'cta-cv' })
            : rect(560, 615, 390, 72, C.terra, { rx: 36, 'data-link': 'cta-cv' }),
          { 'data-cta': true },
        ) +
          g(
            m
              ? rect(20, 480, 350, 58, C.teal, { rx: 29, 'data-link': 'restart' })
              : rect(980, 615, 390, 72, C.teal, { rx: 36, 'data-link': 'restart' }),
            { 'data-cta': true },
          ),
      ),
      part(
        'suitcase',
        4,
        m
          ? rect(306, 744, 50, 74, C.mustard, { rx: 8 }) + rect(322, 732, 18, 14, C.dark, { rx: 4 })
          : rect(440, 700, 90, 130, C.mustard, { rx: 12 }) +
              rect(468, 678, 34, 24, C.dark, { rx: 6 }),
      ),
      // Suman at the bottom centre (on mobile; beside the window on desktop).
      me(L, 'front', { d: 0.85, m: 0.46 }, { d: 250, m: 195 }),
    ];
  },
};

/**
 * The seat-back screen: a bezel around the in-flight map Lottie (`anim`), sized to its aspect.
 * Takes the plane window's place (and its `window` morph) when a flight has a Lottie.
 */
function seatScreen(L, pfx, anim) {
  const m = L.m;
  const x = m ? 45 : 520;
  const w = m ? 300 : 480;
  const bezel = m ? 10 : 14;
  const iw = w - bezel * 2;
  const ih = (iw * anim.h) / anim.w;
  const h = ih + bezel * 2;
  const y = m ? 236 : 450 - h / 2;
  return part(
    'plane-window',
    2,
    at(
      x,
      y,
      1,
      rect(0, 0, w, h, C.ink, { rx: m ? 16 : 22 }) +
        rect(bezel - 3, bezel - 3, iw + 6, ih + 6, C.dark, { rx: m ? 8 : 10 }) +
        lottieBox(anim, 'flight-map', pfx, bezel, bezel, iw, ih, 'xMidYMid meet') +
        circle(w / 2, h - bezel / 2, m ? 2 : 3, '#8d86a0'),
    ),
    { 'data-morph': 'window' },
  );
}

/** Shared transit composition. */
function flight(L, pfx, { from, to, board, laptop, lottie = null }) {
  const m = L.m;
  const win = m ? { x: 45, y: 240, w: 300, h: 420 } : { x: 520, y: 70, w: 480, h: 640 };
  const map = m ? { x: 40, y: 70, w: 220, h: 280 } : { x: 70, y: 110, w: 340, h: 420 };
  const [ax, ay] = K.cityPt(map.x, map.y, map.w, map.h, from);
  const [bx, by] = K.cityPt(map.x, map.y, map.w, map.h, to);
  const cx = (ax + bx) / 2 + (m ? 10 : 20);
  const cy = Math.min(ay, by) - (m ? 70 : 110);
  const label = (x, y, s) => text(x, y, s, m ? 11 : 15, C.ink, { 'text-anchor': 'middle' });
  const inner =
    K.cloud(20, 40, m ? 0.6 : 0.9, 40) +
    K.india(map.x, map.y, map.w, map.h) +
    path(`M${n(ax)} ${n(ay)} Q${n(cx)} ${n(cy)} ${n(bx)} ${n(by)}`, 'none', {
      stroke: C.terra,
      'stroke-width': m ? 3 : 4,
      'stroke-dasharray': '8 6',
      opacity: 0.35,
    }) +
    path(`M${n(ax)} ${n(ay)} Q${n(cx)} ${n(cy)} ${n(bx)} ${n(by)}`, 'none', {
      stroke: C.terra,
      'stroke-width': m ? 3 : 4,
      'stroke-linecap': 'round',
      'data-route': true,
    }) +
    circle(ax, ay, m ? 5 : 7, C.ink) +
    circle(bx, by, m ? 5 : 7, C.ink) +
    label(ax + (m ? 14 : 18), ay + (m ? 18 : 24), from === 'kolkata' ? 'Kolkata' : 'Hyderabad') +
    label(bx - (m ? 8 : 10), by + (m ? 18 : 24), to === 'kolkata' ? 'Kolkata' : 'Hyderabad') +
    g(K.planeIcon(m ? 0.6 : 0.9, C.ink), {
      'data-plane': true,
      transform: `translate(${n(ax)} ${n(ay)})`,
    });
  const parts = [
    sky(L),
    part(
      'clouds',
      1,
      K.cloud(L.W * 0.05, L.H * 0.2, m ? 0.8 : 1.6, 90) +
        K.cloud(L.W * 0.7, L.H * 0.12, m ? 0.6 : 1.2, 70) +
        K.cloud(L.W * 0.78, L.H * 0.7, m ? 0.7 : 1.4, 70),
    ),
    part(
      'board',
      3,
      m
        ? at(20, 60, 1, K.infoBoard(230, 150, board))
        : at(70, 110, 1, K.infoBoard(330, 210, board)),
    ),
    lottie
      ? seatScreen(L, pfx, lottie)
      : part(
          'plane-window',
          2,
          at(win.x, win.y, 1, K.planeWindow(`${pfx}-pw`, win.w, win.h, inner)),
          {
            'data-morph': 'window',
          },
        ),
  ];
  if (laptop) {
    parts.push(
      part(
        'tray',
        5,
        m
          ? rect(200, 712, 180, 12, '#8d86a0', { rx: 4 }) +
              at(240, 640, 0.5, K.laptop(220, null, { sticker: true }))
          : rect(1060, 700, 340, 18, '#8d86a0', { rx: 6 }) +
              at(1120, 560, 1, K.laptop(220, null, { sticker: true })),
      ),
    );
  }
  return parts;
}

/* ------------------------------------------------------------------ write */

/**
 * Chapters where Suman's bust sits on the bottom edge are anchored there (xMidYMax): on wide
 * screens the scene is trimmed from the top (sky) only, so his bust is never cut at the neck.
 * Everything else stays centred.
 */
const BOTTOM_ANCHORED = new Set(['01-jadavpur', '02-graduation', '15-departures']);

function render(id, layoutName) {
  const L = LAYOUTS[layoutName];
  // Chapters that share a number (04, 08, 09, 11) get their own id prefix: ids must be unique
  // across every scene on the page (several are mounted at once).
  const PREFIX = {
    '04-interview': 'iv',
    '08-interview': 'in',
    '09-leading': 'ld',
    '09-neura-apps': 'na',
    '09-twilio-refund': 'tr',
    '11-quiet-shelf': 'qs',
    '11-khyaati': 'kp',
  };
  const pfx = `${PREFIX[id] ?? id.slice(0, 2)}${L.key}`;
  const body = SCENES[id](L, pfx).join('').replaceAll('PFX', pfx);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" preserveAspectRatio="${BOTTOM_ANCHORED.has(id) ? 'xMidYMax' : 'xMidYMid'} slice" data-scene="${id}"><defs>${K.skyGradient(`${pfx}-sky`)}</defs>${body}</svg>\n`;
}

/**
 * Suman's mouse close-up (`src/assets/lottie/mouse-top-view.json`): his hand on the mouse, from
 * above, clicking. Not part of a scene: the stage's click card (components/Stage.astro) shows it
 * as each on-screen click plays (engine/mouse.ts).
 */
const MOUSE = JSON.parse(
  readFileSync(new URL('../../src/assets/lottie/mouse-top-view.json', import.meta.url), 'utf8'),
);
writeFileSync(
  resolve(root, 'src/assets/lottie/mouse-top-view.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="110 60 230 230" focusable="false">${renderLottie(MOUSE, 'ms', 0)}</svg>
`,
);
writeMotion(MOUSE, 'mouse-top-view');
writeMotion(TOSS, 'graduation-cap-toss');
writeMotion(TYPING, 'typing-top-view');
writeMotion(INTERVIEW, 'interview-offer-mail');
writeMotion(INTERVIEW_NEURA, 'interview-offer-mail-neura');
writeMotion(FLIGHT_MAP, 'india-flight-ccu-hyd');
writeMotion(FLIGHT_HOME, 'india-flight-hyd-ccu');
writeMotion(DAY_NIGHT, 'day-night-hyd');
writeMotion(OSS, 'flutter-oss-contributor');
writeMotion(REFUND, 'twilio-a2p-refund');
const only = process.argv.slice(2);
for (const id of Object.keys(SCENES)) {
  if (only.length && !only.some((p) => id.startsWith(p))) continue;
  for (const layout of Object.keys(LAYOUTS)) {
    const file = resolve(root, 'src/assets/scenes', layout, `${id}.svg`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, render(id, layout));
  }
  console.log(`✓ ${id}`);
}
