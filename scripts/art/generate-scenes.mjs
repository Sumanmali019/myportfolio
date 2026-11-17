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

/** Wall, floor, window, calendar, desk, me and a plant — the desk-scene backbone. */
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
  } = {},
) {
  const parts = [];
  const floorY = L.m ? 700 : 720;
  parts.push(part('wall', 0, K.wall(L.W, L.H, floorY)));
  parts.push(part('floor', 0, K.floor(L.W, L.H, floorY)));
  const [wx, wy, ww, wh] = L.m ? [20, 60, 150, 130] : [70, 110, 330, 300];
  parts.push(
    part(
      windowId,
      1,
      at(wx, wy, 1, K.windowObj(`${pfx}-${windowId}`, ww, wh, { view })),
      morph ? { 'data-morph': morph } : {},
    ),
  );
  const [cx, cy, cw, ch] = L.m ? [282, 60, 88, 104] : [1240, 110, 120, 150];
  parts.push(part('calendar', 1, at(cx, cy, 1, K.calendar(cw, ch))));
  parts.push(part('desk', 2, L.m ? at(-10, 478, 1, K.desk(410)) : at(360, 600, 1, K.desk(1040))));
  if (plant)
    parts.push(
      part('plant', 3, L.m ? at(352, 700, 0.55, K.plant()) : at(130, 720, 1.1, K.plant())),
    );
  if (withMe) parts.push(me(L, 'back', { d: 0.9, m: 0.48 }, meAt));
  return parts;
}

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
 *   [data-sign] signature draws on · [data-stamp] "ACCEPTED" stamps in
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
        }) +
        g(
          circle(152, 206, 22, 'none', { stroke: C.terra, 'stroke-width': 2.5 }) +
            text(152, 209, 'ACCEPTED', 7.5, C.terra, {
              'text-anchor': 'middle',
              transform: 'rotate(-14 152 206)',
              'letter-spacing': 0.4,
            }),
          { 'data-stamp': true },
        ),
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

/** Only the motion (no shapes) goes to the browser: a few KB instead of ~60 KB each. */
function writeMotion(anim, name) {
  const motion = {
    fr: anim.fr,
    ip: anim.ip,
    op: anim.op,
    w: anim.w,
    h: anim.h,
    layers: anim.layers.map(({ ind, ty, nm, ks }) => ({ ind, ty, nm, ks })),
  };
  writeFileSync(
    resolve(root, `src/assets/lottie/${name}.motion.json`),
    `${JSON.stringify(motion)}
`,
  );
}

/* ------------------------------------------------------------------ scenes */

/* ------------------------------------------------------------------ intro */

const WAVE = JSON.parse(
  readFileSync(new URL('../../src/assets/lottie/avatar-hand-wave.json', import.meta.url), 'utf8'),
);

const GREETING = [
  'I’m Suman — a Tech Lead from Kolkata.',
  'I lead teams that ship apps across',
  'cloud, AI & mobile. Scroll to begin ↓',
];

const SCENES = {
  /* 00 — Hello: Suman's waving avatar (his Lottie) on the night sky, with a greeting bubble.
     The avatar is the `me` part, so it glides straight into its place at the Jadavpur gate. */
  '00-intro'(L, pfx) {
    const m = L.m;
    // Avatar centre-left, greeting bubble mid-right beside the face.
    const P = m
      ? {
          box: [-40, 300, 260],
          bubble: [196, 262, 160, 170],
          tip: [150, 362],
          hint: 790,
        }
      : {
          box: [485, 200, 470],
          bubble: [975, 312, 405, 180],
          tip: [862, 400],
          hint: 770,
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
    // Tail from the bubble's left edge to just beside the face.
    const tail = `M${qx + 2} ${qy + (m ? 70 : 60)} L${qx + 2} ${qy + (m ? 104 : 104)} L${P.tip[0]} ${P.tip[1]} Z`;
    const pad = m ? 12 : 30;
    const title = m ? ['Hi! Welcome to', 'my portfolio.'] : ['Hi! Welcome to my portfolio.'];
    const lines = m
      ? [
          'I’m Suman — a Tech',
          'Lead from Kolkata.',
          'I lead teams that',
          'ship apps across',
          'cloud, AI & mobile.',
          'Scroll to begin ↓',
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
    parts.push(
      part(
        'hint',
        4,
        g(
          text(L.W / 2, P.hint, 'scroll to begin', m ? 13 : 15, '#c9cbe0', {
            'text-anchor': 'middle',
            'letter-spacing': 2,
          }) +
            path(`M${L.W / 2 - 8} ${P.hint + 12} l8 8 l8 -8`, 'none', {
              stroke: '#c9cbe0',
              'stroke-width': 2.5,
              'stroke-linecap': 'round',
            }),
          { class: 'idle-bob' },
        ),
      ),
    );
    return parts;
  },

  /* 01 — Jadavpur main gate at dawn, through the gate into a hostel desk; gears → code. */
  '01-jadavpur'(L) {
    const m = L.m;
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
            [150, 450],
            [430, 440],
            [800, 455],
            [1150, 445],
            [1350, 460],
            [610, 430],
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
                m ? 455 : 470,
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
          rect(0, m ? 470 : 500, L.W, m ? 80 : 130, '#c97f5c') +
          rect(0, m ? 466 : 494, L.W, 10, '#a4513a'),
      ),
      part(
        'ground',
        0,
        rect(0, m ? 545 : 625, L.W, L.H, '#d6c2a3') +
          rect(0, m ? 700 : 760, L.W, m ? 144 : 140, '#8d86a0') +
          Array.from({ length: m ? 4 : 9 }, (_, i) =>
            rect(40 + i * (m ? 100 : 170), m ? 770 : 826, m ? 50 : 80, 6, '#e9e4da'),
          ).join(''),
      ),
      part('leaves', 2, leaves),
      part('gate', 3, m ? at(13, 432, 0.48, K.juGate()) : at(302, 209, 1.1, K.juGate())),
      part(
        'stall',
        4,
        m ? at(8, 660, 0.62, K.chaiStall(170, 180)) : at(90, 680, 1, K.chaiStall(220, 210)),
      ),
      part('cycle', 5, m ? at(330, 700, 0.55, K.cycle()) : at(1200, 700, 1, K.cycle())),
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
      part('mug', 6, m ? '' : at(500, 600, 1, K.mug())),
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

  /* Transit — Kolkata → Hyderabad through the plane window. */
  '04-flight-hyd'(L, pfx) {
    return flight(L, pfx, {
      from: 'kolkata',
      to: 'hyderabad',
      board: ['DEPARTURES', 'CCU → HYD  ✈  2023', 'GATE 7 · BOARDING'],
      laptop: false,
    });
  },

  /* 05 — BeWorld, Hyderabad: pipeline, metrics, app cards, biryani, confetti. */
  '05-hyderabad'(L, pfx) {
    const m = L.m;
    return [
      ...deskRoom(L, pfx),
      part(
        'monitor',
        4,
        g(monitorAt(L, { 'data-screen': 'pipeline' }), { 'data-anchor': 'monitor' }),
      ),
      part(
        'phone-beworld',
        5,
        m
          ? phoneAt(150, 515, 92, 165, { 'data-screen': 'app-beworld' })
          : phoneAt(1110, 400, 110, 196, { 'data-screen': 'app-beworld' }),
      ),
      part(
        'phone-cadgk',
        5,
        m
          ? phoneAt(256, 530, 84, 150, { 'data-screen': 'app-cadgk' })
          : phoneAt(1236, 414, 100, 182, { 'data-screen': 'app-cadgk' }),
      ),
      part(
        'biryani',
        6,
        g(m ? at(335, 478, 0.55, K.biryani()) : at(470, 600, 1, K.biryani()), {
          'data-anchor': 'biryani',
        }),
      ),
      g('', { 'data-confetti': true, 'data-c': m ? '195 420' : '1220 380' }),
    ];
  },

  /* 06 — late nights with Scaler; skill badges stack on the shelf. */
  '06-late-nights'(L, pfx) {
    const m = L.m;
    return [
      ...deskRoom(L, pfx, { windowId: 'night-window', morph: null, view: 'night' }),
      part(
        'shelves',
        3,
        m
          ? at(180, 210, 1, K.shelf(190)) +
              rect(180, 140, 190, 66, 'none', { 'data-badges': true }) +
              at(180, 330, 1, K.shelf(190)) +
              K.books(190, 330, 9, 54, 9)
          : at(880, 230, 1, K.shelf(320)) +
              rect(880, 140, 320, 86, 'none', { 'data-badges': true }) +
              at(880, 380, 1, K.shelf(320)) +
              K.books(895, 380, 14, 80, 9),
      ),
      part('lamp', 5, m ? at(45, 478, 0.65, K.lamp()) : at(470, 600, 1.1, K.lamp())),
      part(
        'laptop',
        5,
        m
          ? at(130, 368, 1, K.laptop(175, { 'data-screen': 'scaler' }))
          : at(620, 420, 1, K.laptop(290, { 'data-screen': 'scaler' })),
      ),
      part('mug', 6, m ? at(340, 478, 0.6, K.mug(1, C.teal)) : at(1000, 600, 1, K.mug(1, C.teal))),
    ];
  },

  /* Transit — Hyderabad → Kolkata; the laptop gets a REMOTE sticker. */
  '07-flight-home'(L, pfx) {
    return flight(L, pfx, {
      from: 'hyderabad',
      to: 'kolkata',
      board: ['ARRIVALS', 'HYD → CCU  ✈  2024', 'BELT 3 · WELCOME HOME'],
      laptop: true,
    });
  },

  /* 08 — remote from Kolkata, Neura Dynamics: three phones + streaming chat. */
  '08-remote'(L, pfx) {
    const m = L.m;
    const phones = m
      ? [
          [20, 515],
          [149, 510],
          [278, 515],
        ].map(([x, y]) => [x, y, 92, 160])
      : [
          [1108, 410, 78, 150],
          [1192, 396, 78, 150],
          [1276, 410, 78, 150],
        ];
    const keys = ['docpharma', 'klass-online', 'ayantra'];
    const out = [
      ...deskRoom(L, pfx, { windowId: 'home-window', morph: 'window' }),
      part(
        'monitor',
        4,
        g(monitorAt(L, { 'data-screen': 'sse-vs-ws', 'data-link': 'sse-repo' }), {
          'data-anchor': 'monitor',
        }),
      ),
      ...keys.map((k, i) =>
        part(`phone-${k}`, 5, phoneAt(...phones[i], { 'data-screen': `app-${k}` })),
      ),
    ];
    if (!m) out.push(part('laptop', 5, at(400, 470, 1, K.laptop(170)), { 'data-morph': 'laptop' }));
    return out;
  },

  /* 09 — leading the team: video-call grid, sprint board, PR reviews, 1:1. */
  '09-leading'(L, pfx) {
    const m = L.m;
    const cards = ['PR #482 · approved ✓', 'PR #490 · 2 comments', '1:1 · mentoring · 4 pm'];
    // Desktop: the cards sit on a tablet standing on the desk (clear of the avatar's head).
    const tablet = m ? '' : rect(1162, 470, 236, 130, C.ink, { rx: 12 });
    const cardEls =
      tablet +
      cards
        .map((c, i) => {
          const [x, y, w, h, fs] = m
            ? [180, 500 + i * 52, 196, 42, 11]
            : [1172, 480 + i * 38, 216, 32, 12];
          return (
            rect(x, y, w, h, C.paper, { rx: 6 }) +
            rect(x, y, 6, h, [C.teal, C.mustard, C.terra][i], { rx: 3 }) +
            text(x + 14, y + h * 0.64, c, fs, C.ink)
          );
        })
        .join('');
    return [
      ...deskRoom(L, pfx, { windowId: 'home-window', morph: null }),
      part(
        'call',
        4,
        g(
          monitorAt(
            L,
            { 'data-screen': 'call-grid' },
            m ? [20, 210, 350, 210] : [500, 200, 640, 360],
          ),
          { 'data-anchor': 'laptop' },
        ),
        { 'data-morph': 'laptop' },
      ),
      part('pr-cards', 5, cardEls),
      ...(m
        ? []
        : [
            part(
              'sprint-board',
              3,
              at(
                1180,
                300,
                1,
                rect(-8, -8, 236, 176, C.dark, { rx: 8 }) +
                  rect(0, 0, 220, 160, C.screen, { 'data-screen': 'standup-board' }),
              ),
            ),
          ]),
    ];
  },

  /* 10 ★ — open source under a spotlight. */
  '10-open-source'(L, pfx) {
    const m = L.m;
    const mon = m ? [15, 170, 360, 300] : [450, 150, 660, 400];
    const c = [mon[0] + mon[2] / 2, mon[1] + mon[3] / 2];
    return [
      ...deskRoom(L, pfx, {
        windowId: 'night-window',
        morph: null,
        view: 'night',
        plant: false,
        withMe: false,
      }),
      me(L, 'back', { d: 0.9, m: 0.48 }, { d: 300, m: 82 }),
      part(
        'monitor',
        4,
        g(monitorAt(L, { 'data-screen': 'pr-merge', 'data-link': 'flutter-pr' }, mon), {
          'data-anchor': 'monitor',
        }),
      ),
      part('spotlight', 5, K.spotlightOverlay(L.W, L.H, c[0], c[1], mon[2] * 0.62, mon[3] * 0.7)),
      part(
        'label',
        6,
        text(L.W / 2, m ? 46 : 64, '★  HIGHLIGHT · OPEN SOURCE', m ? 13 : 20, C.mustard, {
          'text-anchor': 'middle',
          'letter-spacing': m ? 2 : 4,
        }),
      ),
    ];
  },

  /* 11 — side builds: bookshelf → The Quiet Shelf; printing press → Khyaati Prakashan. */
  '11-side-builds'(L) {
    const m = L.m;
    const floorY = m ? 740 : 720;
    const bookshelf = (x, y, w, h) =>
      rect(x, y, w, h, C.wood, { rx: 6 }) +
      rect(x + 10, y + 10, w - 20, h - 20, C.woodD) +
      [0, 1, 2, 3]
        .map(
          (i) =>
            K.books(
              x + 16,
              y + 10 + ((h - 20) / 4) * (i + 1) - 4,
              Math.floor((w - 30) / 21),
              (h - 20) / 4 - 14,
              i + 2,
            ) + rect(x + 10, y + 10 + ((h - 20) / 4) * (i + 1) - 4, w - 20, 8, C.wood),
        )
        .join('');
    const qs = m
      ? { shelf: [110, 60, 170, 320], phone: [110, 50, 170, 340] }
      : { shelf: [150, 160, 300, 460], phone: [190, 150, 230, 440] };
    const kp = m
      ? { press: [65, 470, 260, 190], mon: [20, 420, 350, 230] }
      : { press: [800, 300, 460, 330], mon: [730, 180, 600, 360] };
    return [
      part('wall', 0, K.wall(L.W, L.H, floorY)),
      part('floor', 0, K.floor(L.W, L.H, floorY)),
      part(
        'qs',
        3,
        g(bookshelf(...qs.shelf), { 'data-bookshelf': true }) +
          g(
            at(
              qs.phone[0],
              qs.phone[1],
              1,
              K.phone(qs.phone[2], qs.phone[3], {
                'data-screen': 'quiet-shelf',
                'data-link': 'quiet-shelf',
              }),
            ),
            { 'data-qs-phone': true, 'data-anchor': 'phone', class: 'pre-hidden' },
          ),
      ),
      part(
        'table',
        2,
        m
          ? ''
          : rect(700, 598, 660, 20, C.wood, { rx: 4 }) +
              rect(730, 618, 18, 102, C.woodD) +
              rect(1310, 618, 18, 102, C.woodD),
      ),
      part(
        'kp',
        3,
        g(at(kp.press[0], kp.press[1], 1, K.printingPress(kp.press[2], kp.press[3])), {
          'data-press': true,
        }) +
          g(
            at(
              kp.mon[0],
              kp.mon[1],
              1,
              K.monitor(kp.mon[2], kp.mon[3], {
                'data-screen': 'khyaati-portals',
                'data-link': 'khyaati',
              }),
            ),
            { 'data-kp-monitor': true, class: 'pre-hidden' },
          ),
      ),
      part(
        'labels',
        5,
        m
          ? text(195, 402, 'THE QUIET SHELF', 12, C.ink, {
              'text-anchor': 'middle',
              'letter-spacing': 2,
            }) +
              text(195, 790, 'KHYAATI PRAKASHAN', 12, C.ink, {
                'text-anchor': 'middle',
                'letter-spacing': 2,
              })
          : text(305, 660, 'THE QUIET SHELF', 18, C.ink, {
              'text-anchor': 'middle',
              'letter-spacing': 3,
            }) +
              text(1030, 680, 'KHYAATI PRAKASHAN', 18, C.ink, {
                'text-anchor': 'middle',
                'letter-spacing': 3,
              }),
      ),
    ];
  },

  /* 12 — the numbers: phones light up like a city at night; the odometer rolls. */
  '12-numbers'(L) {
    const m = L.m;
    const clusters = m
      ? [
          [20, 250],
          [205, 250],
          [20, 360],
          [205, 360],
          [20, 470],
          [205, 470],
          [112, 580],
        ].map(([x, y]) => [x, y, 165, 96])
      : Array.from({ length: 7 }, (_, i) => [60 + i * 192, 430, 170, 190]);
    const keys = ['qomix', 'ten90', 'beworld', 'cadgk', 'docpharma', 'klass-online', 'ayantra'];
    return [
      sky(L, stars(L, m ? 25 : 50, 5)),
      part(
        'skyline',
        1,
        m ? K.skyline(0, 690, 390, 154, '#24203f') : K.skyline(0, 640, 1440, 260, '#24203f'),
      ),
      part(
        'clusters',
        2,
        clusters
          .map(([x, y, w, h], i) => rect(x, y, w, h, 'none', { 'data-cluster': keys[i] }))
          .join(''),
      ),
      part(
        'odometer',
        4,
        (m
          ? rect(25, 60, 340, 120, '#1b1e2e', { rx: 12 })
          : rect(470, 60, 500, 160, '#1b1e2e', { rx: 14 })) +
          text(L.W / 2, m ? 132 : 160, '0', m ? 46 : 72, C.mustard, {
            'text-anchor': 'middle',
            'data-odometer': true,
            class: 'title-text',
          }) +
          text(L.W / 2, m ? 164 : 200, 'DOWNLOADS & COUNTING', m ? 11 : 15, '#c9cbe0', {
            'text-anchor': 'middle',
            'letter-spacing': 3,
          }),
      ),
      part(
        'callout',
        5,
        g(
          m
            ? rect(115, 196, 160, 34, C.terra, { rx: 17 }) +
                text(195, 219, 'BeWorld 500K+', 14, C.paper, { 'text-anchor': 'middle' })
            : rect(990, 100, 220, 46, C.terra, { rx: 23 }) +
                text(1100, 130, 'BeWorld 500K+', 18, C.paper, { 'text-anchor': 'middle' }),
          { 'data-callout': true },
        ),
      ),
      part(
        'cheer',
        6,
        (m ? [235, 270, 305, 340, 372] : [960, 1050, 1140, 1230, 1320])
          .map((x, i) =>
            g(
              at(
                x,
                m ? 844 : 900,
                m ? 0.26 : 0.5,
                K.friend(1, ['teamA', 'teamB', 'teamC', 'teamD', 'teamE'][i], { armsUp: true }),
              ),
              { 'data-cheer': true },
            ),
          )
          .join(''),
      ),
      me(L, 'back', { d: 0.9, m: 0.48 }, { d: 330, m: 90 }),
    ];
  },

  /* 13 — dusk over the Kolkata skyline from a rooftop; thoughts drift up. */
  '13-ideas'(L) {
    const m = L.m;
    return [
      sky(
        L,
        g(circle(L.W * 0.62, m ? 330 : 360, m ? 46 : 80, '#ff9a4a'), { 'data-sunset': true }) +
          K.cloud(L.W * 0.1, 80, m ? 0.8 : 1.4, 80) +
          K.cloud(L.W * 0.6, 150, m ? 0.6 : 1.1, 60),
      ),
      part(
        'skyline',
        1,
        m ? K.skyline(0, 440, 390, 250, '#5a4668') : K.skyline(0, 400, 1440, 330, '#5a4668'),
      ),
      part(
        'roof',
        2,
        rect(0, m ? 690 : 720, L.W, L.H, '#c9a98a') +
          rect(0, m ? 680 : 706, L.W, 16, '#b08f70') +
          (m
            ? rect(300, 620, 50, 60, '#3b3a4a') + K.ellipse(325, 620, 25, 7, '#55536a')
            : rect(1180, 600, 90, 106, '#3b3a4a') + K.ellipse(1225, 600, 45, 12, '#55536a')) +
          (m ? line(0, 600, 260, 620, '#5d566f', 2) : line(60, 560, 900, 600, '#5d566f', 2)) +
          (m
            ? [40, 110, 180]
                .map((x, i) =>
                  rect(x, 603 + i * 5, 34, 44, [C.terra, C.teal, C.mustard][i], { rx: 3 }),
                )
                .join('')
            : [150, 330, 520, 700]
                .map((x, i) =>
                  rect(x, 566 + i * 9, 70, 90, [C.terra, C.teal, C.mustard, '#b5578a'][i], {
                    rx: 4,
                  }),
                )
                .join('')),
      ),
      me(L, 'back', { d: 0.9, m: 0.52 }, { d: 720, m: 195 }),
    ];
  },

  /* 14 — today: a calm desk. */
  '14-today'(L, pfx) {
    const m = L.m;
    return [
      ...deskRoom(L, pfx, { windowId: 'today-window', morph: null }),
      part(
        'laptop',
        4,
        g(m ? at(95, 352, 1, K.laptop(200)) : at(610, 410, 1, K.laptop(290)), {
          'data-anchor': 'laptop',
        }),
      ),
      part('mug', 5, m ? at(330, 478, 0.6, K.mug()) : at(1000, 600, 1, K.mug())),
      part('lamp', 5, m ? '' : at(1160, 600, 0.9, K.lamp(1, { light: false }))),
      part('books', 5, m ? K.books(250, 478, 4, 50, 4) : K.books(420, 600, 6, 80, 4)),
    ];
  },

  /* 15 — departures board: NEXT DESTINATION → YOUR TEAM, with contact rows. */
  '15-departures'(L, pfx) {
    const m = L.m;
    const floorY = m ? 760 : 720;
    return [
      part('wall', 0, K.wall(L.W, L.H, floorY)),
      part('floor', 0, K.floor(L.W, L.H, floorY)),
      part(
        'airport-window',
        1,
        m
          ? at(205, 630, 1, K.windowObj(`${pfx}-aw`, 170, 110, { view: 'city', grill: false }))
          : at(60, 200, 1, K.windowObj(`${pfx}-aw`, 420, 300, { view: 'city', grill: false })),
      ),
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
            ? rect(20, 410, 350, 58, C.terra, { rx: 29, 'data-link': 'cta-mail' })
            : rect(560, 615, 390, 72, C.terra, { rx: 36, 'data-link': 'cta-mail' }),
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
          ? rect(186, 744, 50, 74, C.mustard, { rx: 8 }) + rect(202, 732, 18, 14, C.dark, { rx: 4 })
          : rect(440, 700, 90, 130, C.mustard, { rx: 12 }) +
              rect(468, 678, 34, 24, C.dark, { rx: 6 }),
      ),
      me(L, 'front', { d: 0.85, m: 0.46 }, { d: 250, m: 92 }),
    ];
  },
};

/** Shared transit composition. */
function flight(L, pfx, { from, to, board, laptop }) {
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
      'runway',
      1,
      rect(0, m ? 800 : 830, L.W, 80, '#6f6886') +
        Array.from({ length: m ? 4 : 10 }, (_, i) =>
          rect(30 + i * (m ? 100 : 150), m ? 818 : 860, m ? 50 : 80, 6, '#e9e4da'),
        ).join('') +
        g(at(m ? 40 : 140, m ? 796 : 826, m ? 1.4 : 2.6, K.planeIcon(1, '#ece6d9')), {
          'data-takeoff': true,
        }),
    ),
    part(
      'board',
      3,
      m
        ? at(20, 60, 1, K.infoBoard(230, 150, board))
        : at(70, 110, 1, K.infoBoard(330, 210, board)),
    ),
    part('plane-window', 2, at(win.x, win.y, 1, K.planeWindow(`${pfx}-pw`, win.w, win.h, inner)), {
      'data-morph': 'window',
    }),
    part(
      'year',
      4,
      m
        ? text(270, 120, '2023', 44, C.ink, {
            'text-anchor': 'middle',
            'data-year': true,
            class: 'title-text',
          }) +
            text(270, 146, '', 10, C.ink, {
              'text-anchor': 'middle',
              'data-city': true,
              'letter-spacing': 1,
            })
        : text(1220, 440, '2023', 120, C.ink, {
            'text-anchor': 'middle',
            'data-year': true,
            class: 'title-text',
          }) +
            text(1220, 490, '', 18, C.ink, {
              'text-anchor': 'middle',
              'data-city': true,
              'letter-spacing': 3,
            }),
    ),
  ];
  if (laptop) {
    parts.push(
      part(
        'tray',
        5,
        m
          ? rect(200, 712, 180, 12, '#8d86a0', { rx: 4 }) +
              at(240, 640, 1, K.laptop(110, null, { sticker: true }))
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
  const pfx = `${id.slice(0, 2)}${L.key}`;
  const body = SCENES[id](L, pfx).join('').replaceAll('PFX', pfx);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" preserveAspectRatio="${BOTTOM_ANCHORED.has(id) ? 'xMidYMax' : 'xMidYMid'} slice" data-scene="${id}"><defs>${K.skyGradient(`${pfx}-sky`)}</defs>${body}</svg>\n`;
}

writeMotion(TOSS, 'graduation-cap-toss');
writeMotion(TYPING, 'typing-top-view');
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
