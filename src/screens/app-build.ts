/**
 * The desk monitors' "build" screen (content: src/content/showcase.ts), driven by hold progress.
 *
 *   start → learnEnd   learning (chapter 03 only) — a syllabus (Dart, Flutter, Testing,
 *                      Firebase, React) ticks off while a lesson panel shows each topic's code.
 *   learnEnd → end     the projects, one after another. Each one plays through, start to end,
 *                      before the next begins (its share of the window follows PACE, so a
 *                      project with more files or screens gets more time):
 *                        intro   "Now building X": its logo, what it is, its stack;
 *                        code    its files type out, one tab each (front end, backend, Docker…);
 *                        screens every screenshot in turn, one at a time, each with a caption,
 *                                beside a panel describing the product ("Screen 2 of 4");
 *                        build   the release / production build;
 *                        live    its Play Store listing (apps) or the deployed site (web apps),
 *                                with the LIVE stamp and where to find it.
 *   end → stop         the last project's live page stays up.
 *
 * Mobile apps show their screens on a carousel of phones that turns one step per screen; web
 * apps (a showcase entry with `site`) in a browser window that scrolls to each page in turn.
 */
import type { Lesson, Showcase } from '../content/showcase';
import type { Screen } from '../engine/types';
import { clamp, easeInOut, mod, progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText, UI } from '../lib/svg';

/** Hold progress where learning ends and building starts (when there are lessons). */
export const LEARN_END = 0.32;

/**
 * How a project's time is shared between its parts (relative weights). Each chapter gives its
 * projects a fixed number of seconds (scenes/*.ts) and `appWindows` splits it by these, so a
 * project with more files or screens gets a bigger share. Screens get the most: they are what
 * a visitor looks at.
 */
export const PACE = { intro: 2.5, file: 1.6, shot: 2.4, build: 0.8, live: 2.6 } as const;

const fileCount = (app: Showcase) => 1 + (app.files?.length ?? 0);

/** How long one project plays, in seconds at 1×. */
export const appSeconds = (app: Showcase): number =>
  PACE.intro + PACE.file * fileCount(app) + PACE.shot * app.shots.length + PACE.build + PACE.live;

/** How long a list of projects plays, in seconds at 1×. */
export const buildSeconds = (apps: Showcase[]): number =>
  apps.reduce((t, a) => t + appSeconds(a), 0);

/** One project's window in hold progress, and where each of its parts starts. */
export interface AppWindow {
  a: number;
  code: number;
  shots: number;
  build: number;
  live: number;
  b: number;
}

/** Each project's window inside [start, end], in order, sized by its `appSeconds`. */
export function appWindows(apps: Showcase[], start: number, end: number): AppWindow[] {
  const total = buildSeconds(apps) || 1;
  const k = (end - start) / total;
  let t = start;
  return apps.map((app) => {
    const a = t;
    const code = a + PACE.intro * k;
    const shots = code + PACE.file * fileCount(app) * k;
    const build = shots + PACE.shot * app.shots.length * k;
    const live = build + PACE.build * k;
    const b = live + PACE.live * k;
    t = b;
    return { a, code, shots, build, live, b };
  });
}

/** When a project's LIVE stamp lands (hold progress), e.g. for its desk phone's badge. */
export function liveAt(
  apps: Showcase[],
  key: string,
  start: number,
  end: number,
): [number, number] {
  const i = Math.max(
    0,
    apps.findIndex((s) => s.key === key),
  );
  const w = appWindows(apps, start, end)[i]!;
  const len = w.b - w.live;
  return [w.live + len * 0.25, w.live + len * 0.4];
}

/** Break text into lines of at most `max` characters, at spaces. */
function wrap(text: string, max: number, limit = Infinity): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  if (out.length > limit) {
    out.length = limit;
    out[limit - 1] = out[limit - 1]!.replace(/\s*\S*$/, '') + '…';
  }
  return out;
}

/** One file in the editor: its tab and code lines, and the command in the status bar. */
interface Pane {
  g: SVGGElement;
  lines: SVGTextElement[];
  run: string;
}

interface Built {
  group: SVGGElement;
  /** The app's files, typed one after another (main file first). */
  panes: Pane[];
  slides: SVGGElement[];
  ring: SVGGElement;
  bar: SVGRectElement;
  barW: number;
  status: SVGTextElement;
  app: Showcase;
  /** Web app: the browser window shows its pages instead of the phone ring turning. */
  web: boolean;
  /** Web app: show page `pos` of the site (fractional while scrolling to the next). */
  page: ((pos: number) => void) | null;
  /** "Now building X": logo, what it is, its stack. */
  intro: SVGGElement;
  /** Left of the screens while they play: the product described, and this screen's caption. */
  about: SVGGElement;
  captions: SVGGElement[];
  counter: SVGTextElement;
  dots: SVGCircleElement[];
}

export interface AppBuildOptions {
  /** Hold progress before which the whole screen is hidden (another screen shows instead). */
  start?: number;
  /** Where learning ends and building starts (defaults to LEARN_END; no lessons: `start`). */
  learnEnd?: number;
  /** Where the last project is done (its live page then stays up). */
  end?: number;
  /** Hold progress from which the whole screen is hidden again (another screen follows). */
  stop?: number;
  /**
   * A card before the first project (from `start` to `learnEnd`), introducing what follows,
   * e.g. "Personal work": a title, a line about it, and the projects popping in one by one.
   */
  preface?: {
    kicker: string;
    title: string;
    about: string;
    accent: string;
    items: Array<{ logo: string; name: string; note: string }>;
    footer: string;
  };
}

export function appBuild(
  rect: SVGGraphicsElement,
  apps: Showcase[],
  lessons: Lesson[],
  opts: AppBuildOptions = {},
): Screen {
  const start = opts.start ?? 0;
  const learnEnd = opts.learnEnd ?? (lessons.length ? LEARN_END : start);
  const end = opts.end ?? 1;
  const stop = opts.stop ?? Infinity;
  const { g, x, y, w, h, u } = screenFrame(rect);
  const fs = Math.min(u * 2.4, h / 22);
  const th = fs * 2.3; // title bar
  const sb = fs * 2.2; // status bar
  const bodyY = y + th;
  const bodyH = h - th - sb;
  svgEl('rect', { x, y, width: w, height: h, fill: '#141826' }, g);
  svgEl('rect', { x, y, width: w, height: th, fill: '#1d2233' }, g);
  ['#e0665a', '#e3b341', '#5bb974'].forEach((c, i) =>
    svgEl('circle', { cx: x + fs * (1.2 + i * 1.1), cy: y + th / 2, r: fs * 0.35, fill: c }, g),
  );
  const statusBar = (parent: Element) =>
    svgEl('rect', { x, y: y + h - sb, width: w, height: sb, fill: '#1d2233' }, parent);
  const tab = (parent: Element, label: string, accent: string) => {
    const tx = x + fs * 4.6;
    svgEl(
      'rect',
      { x: tx, y: y + fs * 0.35, width: w * 0.5, height: th - fs * 0.35, fill: '#141826' },
      parent,
    );
    svgEl(
      'rect',
      { x: tx, y: y + fs * 0.35, width: w * 0.5, height: fs * 0.18, fill: accent },
      parent,
    );
    svgText(parent, tx + fs * 2, y + th / 2 + fs * 0.42, label, {
      'font-size': fs * 0.85,
      fill: UI.text,
    });
  };

  /**
   * A light browser window at (bx, by): its pages (screenshots) stacked into one long page
   * under the chrome. Returns `scrollTo(f)`: 0 = the top of the site, 1 = the bottom.
   */
  const browser = (
    parent: Element,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    hrefs: string[],
    url: string,
  ): { scroll: (f: number) => void; page: (pos: number) => void } => {
    const bar = Math.max(fs * 1.25, bh * 0.07);
    svgEl('rect', { x: bx, y: by, width: bw, height: bh, rx: fs * 0.4, fill: '#ffffff' }, parent);
    svgEl('rect', { x: bx, y: by, width: bw, height: bar, rx: fs * 0.4, fill: '#e3e6ec' }, parent);
    ['#e0665a', '#e3b341', '#5bb974'].forEach((c, i) =>
      svgEl(
        'circle',
        { cx: bx + bar * (0.5 + i * 0.42), cy: by + bar / 2, r: bar * 0.13, fill: c },
        parent,
      ),
    );
    const ax = bx + bar * 1.7;
    svgEl(
      'rect',
      {
        x: ax,
        y: by + bar * 0.2,
        width: Math.min(bw * 0.6, bw - bar * 2.2),
        height: bar * 0.6,
        rx: bar * 0.3,
        fill: '#ffffff',
      },
      parent,
    );
    svgText(parent, ax + bar * 0.35, by + bar * 0.64, `🔒 ${url}`, {
      'font-size': bar * 0.38,
      fill: '#5f6368',
    });
    const viewH = bh - bar;
    const page = svgEl(
      'svg',
      { x: bx, y: by + bar, width: bw, height: viewH, viewBox: `0 0 ${bw} ${viewH}` },
      parent,
    );
    // Each screenshot is one screen of the site (about 2:1): stack them down one long page.
    const shotH = bw * 0.49;
    const long = svgEl('g', {}, page);
    hrefs.forEach((href, i) =>
      svgEl(
        'image',
        {
          href,
          x: 0,
          y: i * shotH,
          width: bw,
          height: shotH,
          preserveAspectRatio: 'xMidYMin slice',
        },
        long,
      ),
    );
    const total = Math.max(viewH, hrefs.length * shotH);
    // The scrollbar: a thumb sized to the view, moving down the right edge.
    const thumbH = Math.max(bar, (viewH * viewH) / total);
    const thumb = svgEl(
      'rect',
      {
        x: bw - bar * 0.32,
        y: 0,
        width: bar * 0.2,
        height: thumbH,
        rx: bar * 0.1,
        fill: 'rgba(0,0,0,.35)',
      },
      page,
    );
    let last = '';
    const to = (px: number) => {
      const off = clamp(px, 0, total - viewH);
      const key = off.toFixed(1);
      if (key === last) return;
      last = key;
      long.setAttribute('transform', off ? `translate(0 ${(-off).toFixed(1)})` : '');
      thumb.setAttribute('y', ((off / (total - viewH || 1)) * (viewH - thumbH)).toFixed(1));
    };
    return {
      scroll: (f: number) => to(clamp(f) * (total - viewH)),
      // Page `pos` at the top of the window (the last page may sit lower: it ends the site).
      page: (pos: number) => to(pos * shotH),
    };
  };
  /**
   * Scrolling like a person with a mouse wheel: `t` (0–1) across the visit becomes a series of
   * eased flicks, each followed by a short pause to read.
   */
  const wheel = (t: number, flicks = 6) => {
    const x = clamp(t) * flicks;
    const i = Math.min(flicks - 1, Math.floor(x));
    return (i + easeInOut(progress(x - i, 0, 0.6))) / flicks;
  };

  /* ---------- preface ---------- */
  const pre = opts.preface;
  const preG = svgEl('g', { 'data-phase': 'preface' }, g);
  preG.style.display = 'none';
  const preParts: Array<{ el: SVGGElement; at: number }> = [];
  let preStatus: SVGTextElement | null = null;
  if (pre) {
    tab(preG, 'personal/README.md', pre.accent);
    svgEl('rect', { x, y: bodyY, width: fs * 0.3, height: bodyH, fill: pre.accent }, preG);
    statusBar(preG);
    preStatus = svgText(preG, x + fs, y + h - sb / 2 + fs * 0.32, '', {
      'font-size': fs * 0.85,
      fill: UI.text,
    });
    const lx = x + fs * 2;
    // (perLine is defined further down; this card is built first.)
    const prePer = (width: number, size: number) => Math.max(12, Math.floor(width / (size * 0.62)));
    const piece = (at: number) => {
      const el = svgEl('g', {}, preG);
      preParts.push({ el, at });
      return el;
    };
    const head = piece(0);
    svgText(head, lx, bodyY + fs * 2.2, pre.kicker, { 'font-size': fs * 0.75, fill: pre.accent });
    svgText(head, lx, bodyY + fs * 4.8, pre.title, {
      'font-size': fs * 2.4,
      fill: UI.text,
      class: 'title-text',
    });
    const about = piece(0.14);
    const size = fs * 0.95;
    wrap(pre.about, prePer(w - fs * 4, size), 3).forEach((line, i) =>
      svgText(about, lx, bodyY + fs * 6.9 + i * size * 1.5, line, {
        'font-size': size,
        fill: UI.text,
      }),
    );
    // The projects: a tile each, side by side.
    const n = pre.items.length;
    const gap = fs;
    const tw = (w - fs * 4 - gap * (n - 1)) / n;
    const th2 = fs * 4.6;
    const ty = bodyY + bodyH - th2 - fs * 2.8;
    pre.items.forEach((it, i) => {
      const tile = piece(0.32 + i * 0.2);
      const tx = lx + i * (tw + gap);
      svgEl(
        'rect',
        {
          x: tx,
          y: ty,
          width: tw,
          height: th2,
          rx: fs * 0.5,
          fill: '#1d2233',
          stroke: pre.accent,
          'stroke-width': fs * 0.08,
        },
        tile,
      );
      const L = th2 - fs * 1.4;
      svgEl(
        'rect',
        { x: tx + fs * 0.7, y: ty + fs * 0.7, width: L, height: L, rx: L * 0.22, fill: '#fff' },
        tile,
      );
      svgEl(
        'image',
        {
          href: it.logo,
          x: tx + fs * 0.7 + L * 0.1,
          y: ty + fs * 0.7 + L * 0.1,
          width: L * 0.8,
          height: L * 0.8,
        },
        tile,
      );
      const nx = tx + fs * 1.4 + L;
      svgText(tile, nx, ty + fs * 2, it.name, {
        'font-size': fs * 1.05,
        fill: UI.text,
        class: 'title-text',
      });
      wrap(it.note, prePer(tw - L - fs * 2.2, fs * 0.72), 2).forEach((line, k) =>
        svgText(tile, nx, ty + fs * (3.2 + k * 1.05), line, {
          'font-size': fs * 0.72,
          fill: UI.muted,
        }),
      );
    });
    const foot = piece(0.32 + n * 0.2);
    svgText(foot, lx, bodyY + bodyH - fs * 1.1, pre.footer, {
      'font-size': fs * 0.78,
      fill: pre.accent,
    });
  }

  /* ---------- learning ---------- */
  const learn = svgEl('g', { 'data-phase': 'learn' }, g);
  tab(learn, 'notes/learning.md', '#3fa9d6');
  statusBar(learn);
  const listW = w * 0.3;
  svgEl('rect', { x, y: bodyY, width: listW, height: bodyH, fill: '#181d2c' }, learn);
  svgText(learn, x + fs, bodyY + fs * 1.7, 'SYLLABUS', { 'font-size': fs * 0.7, fill: UI.muted });
  const topics = lessons.map((l, i) => {
    const ty = bodyY + fs * (3.6 + i * 2);
    const row = svgEl(
      'rect',
      {
        x: x + fs * 0.5,
        y: ty - fs * 1.15,
        width: listW - fs,
        height: fs * 1.7,
        rx: fs * 0.3,
        fill: 'none',
      },
      learn,
    );
    svgEl('circle', { cx: x + fs * 1.5, cy: ty - fs * 0.3, r: fs * 0.42, fill: l.color }, learn);
    svgText(learn, x + fs * 2.4, ty, l.topic, { 'font-size': fs * 0.95, fill: UI.text });
    const tick = svgText(learn, x + listW - fs * 1.2, ty, '', {
      'font-size': fs * 0.95,
      fill: UI.green,
      'text-anchor': 'middle',
    });
    return { row, tick };
  });
  const lessonX = x + listW + fs * 1.4;
  const lessonPanels = lessons.map((l) => {
    const p = svgEl('g', {}, learn);
    svgText(p, lessonX, bodyY + fs * 2.4, `Learning ${l.topic}`, {
      'font-size': fs * 1.5,
      fill: l.color,
      class: 'title-text',
    });
    svgEl(
      'rect',
      { x: lessonX, y: bodyY + fs * 3.2, width: fs * 4, height: fs * 0.2, fill: l.color },
      p,
    );
    const lines = l.code.map((c, j) =>
      svgText(p, lessonX, bodyY + fs * (5.2 + j * 1.5), c, {
        'font-size': fs * 0.85,
        fill: UI.text,
        style: 'white-space: pre',
      }),
    );
    return { p, lines };
  });
  const learnStatus = svgText(learn, x + fs, y + h - sb / 2 + fs * 0.32, '', {
    'font-size': fs * 0.85,
    fill: UI.text,
  });

  /* ---------- building ---------- */
  const codeW = w * 0.46;
  // Carousel: right of the code, using the full body height.
  const ph = bodyH - fs * 1.2;
  const pw = ph * 0.52;
  // The front phone sits right of centre so the left neighbour stays clear of the code;
  // the right neighbour is cut by the screen edge, like a carousel turning past.
  const cx = Math.max(x + codeW + pw * 1.05, x + w - pw * 0.95);
  const cy = bodyY + bodyH / 2;
  const pad = fs * 0.32;
  // Web apps: a browser window in the same place, as big as fits.
  const webX = x + codeW + fs * 0.8;
  const webW = x + w - fs * 0.8 - webX;
  const webH = Math.min(bodyH - fs * 1.2, webW * 0.62);
  const webY = bodyY + (bodyH - webH) / 2;

  /** A row of stack chips from (cx0, cy0); returns nothing — purely drawn. */
  const chips = (
    parent: Element,
    cx0: number,
    cy0: number,
    labels: string[],
    size: number,
    maxX: number,
  ) => {
    let cxi = cx0;
    for (const label of labels) {
      const cw = label.length * size * 0.6 + size * 1.4;
      if (cxi + cw > maxX) break;
      svgEl(
        'rect',
        { x: cxi, y: cy0, width: cw, height: size * 1.8, rx: size * 0.9, fill: '#262d44' },
        parent,
      );
      svgText(parent, cxi + cw / 2, cy0 + size * 1.25, label, {
        'font-size': size,
        fill: UI.text,
        'text-anchor': 'middle',
      });
      cxi += cw + size * 0.6;
    }
  };
  /** Rough characters per line for text of size `size` across `width`. */
  const perLine = (width: number, size: number) => Math.max(12, Math.floor(width / (size * 0.62)));

  /** "Now building X" — the project introduced before its code: what it is and what it uses. */
  const introCard = (parent: Element, app: Showcase): SVGGElement => {
    const c = svgEl('g', { 'data-intro': app.key }, parent);
    svgEl('rect', { x, y: bodyY, width: w, height: bodyH, fill: '#141826' }, c);
    svgEl('rect', { x, y: bodyY, width: fs * 0.3, height: bodyH, fill: app.accent }, c);
    const L = Math.min(fs * 5.5, bodyH * 0.32, w * 0.16);
    const lx = x + fs * 2;
    const ly = bodyY + fs * 1.4;
    svgEl('rect', { x: lx, y: ly, width: L, height: L, rx: L * 0.22, fill: '#ffffff' }, c);
    svgEl(
      'image',
      { href: app.logo, x: lx + L * 0.1, y: ly + L * 0.1, width: L * 0.8, height: L * 0.8 },
      c,
    );
    const rx = lx + L + fs * 1.4;
    svgText(
      c,
      rx,
      ly + fs * 1.1,
      `${app.personal ? 'PERSONAL PROJECT' : 'NOW BUILDING'} · ${app.site ? 'WEB PLATFORM' : 'MOBILE APP'}`,
      {
        'font-size': fs * 0.75,
        fill: app.accent,
      },
    );
    const nameSize = Math.min(fs * 2, ((x + w - rx - fs) / Math.max(6, app.name.length)) * 1.6);
    svgText(c, rx, ly + fs * 3.2, app.name, {
      'font-size': nameSize,
      fill: UI.text,
      class: 'title-text',
    });
    chips(c, rx, ly + fs * 4, app.stack, fs * 0.72, x + w - fs);
    const aboutSize = fs * 0.95;
    const top = ly + L + fs * 2;
    const room = Math.max(1, Math.floor((bodyY + bodyH - fs * 2.6 - top) / (aboutSize * 1.5)) + 1);
    wrap(app.about, perLine(w - fs * 4, aboutSize), room).forEach((line, i) =>
      svgText(c, lx, top + i * aboutSize * 1.5, line, { 'font-size': aboutSize, fill: UI.text }),
    );
    const files = fileCount(app);
    svgText(
      c,
      lx,
      bodyY + bodyH - fs * 1.1,
      `${files} file${files > 1 ? 's' : ''} of code · ${app.shots.length} screens · then live at ${app.site ? app.site.url : 'Google Play'}`,
      { 'font-size': fs * 0.75, fill: UI.muted },
    );
    return c;
  };

  /** Left of the screens: the product described, and what the screen in front shows. */
  const aboutPanel = (parent: Element, app: Showcase) => {
    const about = svgEl('g', { 'data-about': app.key }, parent);
    const pw0 = codeW;
    svgEl('rect', { x, y: bodyY, width: pw0, height: bodyH, fill: '#181d2c' }, about);
    const lx = x + fs * 1.2;
    const L = fs * 2.2;
    svgEl(
      'rect',
      { x: lx, y: bodyY + fs * 0.9, width: L, height: L, rx: L * 0.22, fill: '#fff' },
      about,
    );
    svgEl(
      'image',
      {
        href: app.logo,
        x: lx + L * 0.1,
        y: bodyY + fs * 0.9 + L * 0.1,
        width: L * 0.8,
        height: L * 0.8,
      },
      about,
    );
    svgText(about, lx + L + fs * 0.7, bodyY + fs * 2.45, app.name, {
      'font-size': Math.min(fs * 1.3, ((pw0 - L - fs * 3) / Math.max(6, app.name.length)) * 1.6),
      fill: UI.text,
      class: 'title-text',
    });
    const size = fs * 0.78;
    const lines = wrap(app.about, perLine(pw0 - fs * 2.4, size), 5);
    lines.forEach((line, i) =>
      svgText(about, lx, bodyY + fs * 4.4 + i * size * 1.45, line, {
        'font-size': size,
        fill: UI.muted,
      }),
    );
    const capY = bodyY + fs * 4.4 + lines.length * size * 1.45 + fs * 1.2;
    svgEl(
      'rect',
      { x: lx, y: capY - fs * 0.6, width: fs * 3, height: fs * 0.16, fill: app.accent },
      about,
    );
    const counter = svgText(about, lx, capY + fs * 0.6, '', {
      'font-size': fs * 0.72,
      fill: app.accent,
    });
    const capSize = fs * 1.05;
    const captions = app.shots.map((_, j) => {
      const cg = svgEl('g', {}, about);
      const text = app.captions?.[j] ?? `${app.name} · screen ${j + 1}`;
      wrap(text, perLine(pw0 - fs * 2.4, capSize), 3).forEach((line, i) =>
        svgText(cg, lx, capY + fs * 2.2 + i * capSize * 1.35, line, {
          'font-size': capSize,
          fill: UI.text,
        }),
      );
      return cg;
    });
    const dots = app.shots.map((_, j) =>
      svgEl(
        'circle',
        {
          cx: lx + fs * 0.4 + j * fs * 1.1,
          cy: bodyY + bodyH - fs * 1,
          r: fs * 0.3,
          fill: '#3a405c',
        },
        about,
      ),
    );
    return { about, captions, counter, dots };
  };

  const built: Built[] = apps.map((app) => {
    const group = svgEl('g', { 'data-app': app.key }, g);
    const site = app.site;
    const files = [
      { file: app.file, code: app.code, run: site ? 'npm run dev' : 'flutter run' },
      ...(app.files ?? []),
    ];
    const panes: Pane[] = files.map((f) => {
      const pg = svgEl('g', { 'data-file': f.file }, group);
      tab(pg, `${app.name.toLowerCase()}/${f.file}`, app.accent);
      svgEl(
        'image',
        {
          href: app.logo,
          x: x + fs * 4.9,
          y: y + th / 2 - fs * 0.55,
          width: fs * 1.3,
          height: fs * 1.3,
        },
        pg,
      );
      const lines = f.code.map((line, i) => {
        const ly = bodyY + fs * (1.7 + i * 1.32);
        svgText(pg, x + fs * 1.7, ly, String(i + 1), {
          'font-size': fs * 0.7,
          fill: UI.muted,
          'text-anchor': 'end',
        });
        // Comments muted, the first code line in the app's accent.
        const comment = /^\s*(#|\/\/)/.test(line);
        return svgText(pg, x + fs * 2.4, ly, line, {
          'font-size': fs * 0.74,
          fill: comment ? UI.muted : i === 0 ? app.accent : UI.text,
          style: 'white-space: pre',
        });
      });
      return { g: pg, lines, run: f.run };
    });
    // Phones on a ring; each a bezel with the screenshot clipped inside a nested <svg>.
    const ring = svgEl('g', {}, group);
    const iw = pw - pad * 2;
    const ih = ph - pad * 4;
    // Web app: one browser window right of the code; its pages slide past inside it.
    const area = site
      ? svgEl(
          'svg',
          { x: webX, y: webY, width: webW, height: webH, viewBox: `0 0 ${webW} ${webH}` },
          ring,
        )
      : null;
    const page = area ? browser(area, 0, 0, webW, webH, app.shots, site!.url).page : null;
    const slides = area
      ? []
      : app.shots.map((href) => {
          const el = svgEl('g', {}, ring);
          svgEl(
            'rect',
            {
              x: cx - pw / 2,
              y: cy - ph / 2,
              width: pw,
              height: ph,
              rx: fs * 0.9,
              fill: '#0b0d14',
            },
            el,
          );
          const view = svgEl(
            'svg',
            {
              x: cx - pw / 2 + pad,
              y: cy - ph / 2 + pad * 2,
              width: iw,
              height: ih,
              viewBox: `0 0 ${iw} ${ih}`,
            },
            el,
          );
          svgEl(
            'image',
            { href, x: 0, y: 0, width: iw, height: ih, preserveAspectRatio: 'xMidYMin slice' },
            view,
          );
          return el;
        });
    statusBar(group);
    const barW = w * 0.22;
    const barY = y + h - sb / 2 - fs * 0.25;
    const barX = x + w - barW - fs;
    svgEl(
      'rect',
      { x: barX, y: barY, width: barW, height: fs * 0.5, rx: fs * 0.25, fill: '#2a3048' },
      group,
    );
    const bar = svgEl(
      'rect',
      { x: barX, y: barY, width: 0, height: fs * 0.5, rx: fs * 0.25, fill: app.accent },
      group,
    );
    const status = svgText(group, x + fs, y + h - sb / 2 + fs * 0.32, '', {
      'font-size': fs * 0.85,
      fill: UI.text,
    });
    const about = aboutPanel(group, app);
    const intro = introCard(group, app);
    return {
      group,
      panes,
      slides,
      ring,
      bar,
      barW,
      status,
      app,
      web: !!site,
      page,
      intro,
      ...about,
    };
  });

  /* ---------- released: the Play Store listings (web apps: the deployed site) ---------- */
  const STORE_GREEN = '#01875f';
  /** A LIVE stamp, tilted, centred at (stx, sty). */
  const liveStamp = (parent: Element, stx: number, sty: number, label: string, color: string) => {
    const stamp = svgEl('g', { class: 'release-stamp' }, parent);
    svgEl(
      'rect',
      {
        x: stx - fs * 4.4,
        y: sty - fs * 1.2,
        width: fs * 8.8,
        height: fs * 2.1,
        rx: fs * 0.4,
        fill: '#ffffff',
        'fill-opacity': 0.9,
        stroke: color,
        'stroke-width': fs * 0.18,
        transform: `rotate(-8 ${stx} ${sty})`,
      },
      stamp,
    );
    svgText(stamp, stx, sty + fs * 0.35, label, {
      'font-size': fs * 0.95,
      fill: color,
      'text-anchor': 'middle',
      transform: `rotate(-8 ${stx} ${sty})`,
      class: 'title-text',
    });
    return stamp;
  };
  const siteRelease = (group: SVGGElement, app: Showcase, site: { url: string }) => {
    svgEl('rect', { x, y: bodyY, width: w, height: bodyH, fill: '#ffffff' }, group);
    tab(group, `${site.url} · production`, app.accent);
    statusBar(group);
    const steps: SVGElement[] = [];
    // The live site fills the body, in the browser — scrolled down from top to bottom.
    steps.push(svgEl('g', {}, group));
    const scrollSite = browser(
      steps[0]!,
      x + fs * 0.6,
      bodyY + fs * 0.6,
      w - fs * 1.2,
      bodyH - fs * 1.2,
      app.shots,
      site.url,
    ).scroll;
    const stamp = liveStamp(group, x + w - fs * 7, bodyY + fs * 5, 'LIVE · prod', STORE_GREEN);
    const status = svgText(group, x + fs, y + h - sb / 2 + fs * 0.32, '', {
      'font-size': fs * 0.85,
      fill: UI.text,
    });
    return {
      group,
      steps,
      stamp,
      status,
      app,
      pending: `▶ Deploying ${app.name} to production…`,
      live: `✓ ${app.name} is live · ${site.url}`,
      scrollSite,
    };
  };
  const released = apps.map((app) => {
    const group = svgEl('g', { 'data-release': app.key }, g);
    if (app.site) return siteRelease(group, app, app.site);
    const store = app.store ?? { title: app.name, publisher: '', downloads: '' };
    svgEl('rect', { x, y: bodyY, width: w, height: bodyH, fill: '#ffffff' }, group);
    tab(group, `Play Store · ${store.title}`, STORE_GREEN);
    statusBar(group);
    const left = x + fs * 2;
    const steps: SVGElement[] = [];
    const step = (el: SVGElement) => (steps.push(el), el);
    step(
      svgText(group, left, bodyY + fs * 3.6, store.title, {
        'font-size': Math.min(fs * 2.6, ((w * 0.55) / Math.max(6, store.title.length)) * 1.7),
        fill: '#202124',
        class: 'title-text',
      }),
    );
    step(
      svgText(group, left, bodyY + fs * 5.3, store.publisher, {
        'font-size': fs * 0.95,
        fill: STORE_GREEN,
      }),
    );
    const stats = step(svgEl('g', {}, group));
    const stat = (sx: number, big: string, small: string) => {
      svgText(stats, sx, bodyY + fs * 7.6, big, {
        'font-size': fs * 1.05,
        fill: '#202124',
        'text-anchor': 'middle',
      });
      svgText(stats, sx, bodyY + fs * 8.8, small, {
        'font-size': fs * 0.7,
        fill: '#5f6368',
        'text-anchor': 'middle',
      });
    };
    let sx = left + fs * 2.4;
    if (store.rating) {
      stat(sx, store.rating, store.reviews ?? '');
      svgEl(
        'rect',
        { x: sx + fs * 2.6, y: bodyY + fs * 6.6, width: 1, height: fs * 2.4, fill: '#dadce0' },
        stats,
      );
      sx += fs * 5.4;
    }
    stat(sx, store.downloads, 'Downloads');
    const install = step(svgEl('g', {}, group));
    svgEl(
      'rect',
      {
        x: left,
        y: bodyY + fs * 10,
        width: fs * 9,
        height: fs * 2.2,
        rx: fs * 0.5,
        fill: STORE_GREEN,
      },
      install,
    );
    svgText(install, left + fs * 4.5, bodyY + fs * 11.4, 'Install', {
      'font-size': fs * 0.95,
      fill: '#ffffff',
      'text-anchor': 'middle',
    });
    // Logo tile on the right.
    const tile = Math.min(bodyH * 0.42, w * 0.2);
    const tx = x + w - tile - fs * 2.5;
    const icon = step(svgEl('g', {}, group));
    svgEl(
      'rect',
      {
        x: tx,
        y: bodyY + fs * 1.4,
        width: tile,
        height: tile,
        rx: tile * 0.22,
        fill: '#ffffff',
        stroke: '#dadce0',
      },
      icon,
    );
    svgEl(
      'image',
      {
        href: app.logo,
        x: tx + tile * 0.1,
        y: bodyY + fs * 1.4 + tile * 0.1,
        width: tile * 0.8,
        height: tile * 0.8,
      },
      icon,
    );
    // Screenshot strip.
    const shotsG = step(svgEl('g', {}, group));
    const sh = bodyH - fs * 14.2;
    const sw = sh * 0.56;
    if (sh > fs * 2)
      app.shots.slice(0, 6).forEach((href, j) => {
        const sxj = left + j * (sw + fs * 0.6);
        if (sxj + sw > x + w - fs) return;
        const v = svgEl(
          'svg',
          { x: sxj, y: bodyY + fs * 13.4, width: sw, height: sh, viewBox: `0 0 ${sw} ${sh}` },
          shotsG,
        );
        svgEl(
          'image',
          { href, x: 0, y: 0, width: sw, height: sh, preserveAspectRatio: 'xMidYMin slice' },
          v,
        );
      });
    // "LIVE" stamp.
    const stamp = liveStamp(
      group,
      tx + tile / 2,
      bodyY + fs * 1.4 + tile + fs * 2.6,
      'LIVE · v1.0',
      STORE_GREEN,
    );
    const status = svgText(group, x + fs, y + h - sb / 2 + fs * 0.32, '', {
      'font-size': fs * 0.85,
      fill: UI.text,
    });
    return {
      group,
      steps,
      stamp,
      status,
      app,
      pending: `▶ Publishing ${app.name} to production…`,
      live: `✓ ${app.name} v1.0 is live on the Play Store · ${store.downloads} downloads`,
    };
  });

  const windows = appWindows(apps, learnEnd, end);

  /** Place the phones: `pos` is front and centre; neighbours sit beside it, smaller and turned. */
  const placeRing = (b: Built, pos: number) => {
    const k = b.slides.length;
    const order: Array<{ el: SVGGElement; a: number }> = [];
    b.slides.forEach((el, j) => {
      const d = mod(j - pos + k / 2, k) - k / 2; // signed distance from the front
      const a = Math.abs(d);
      const visible = a < 1.6;
      el.style.display = visible ? '' : 'none';
      if (!visible) return;
      const sc = 1 - 0.3 * Math.min(1, a);
      const sx = sc * (1 - 0.35 * Math.min(1, a)); // narrower towards the sides: the ring turns
      el.setAttribute(
        'transform',
        `translate(${(cx + d * pw * 0.8).toFixed(1)} ${cy.toFixed(1)}) scale(${sx.toFixed(3)} ${sc.toFixed(3)}) translate(${(-cx).toFixed(1)} ${(-cy).toFixed(1)})`,
      );
      el.setAttribute('opacity', (a <= 1 ? 1 - 0.45 * a : ((1.6 - a) / 0.6) * 0.55).toFixed(3));
      order.push({ el, a });
    });
    // Front phone drawn last (on top).
    order.sort((p, q) => q.a - p.a).forEach(({ el }) => b.ring.appendChild(el));
  };

  return {
    update({ reduced, hold }) {
      g.style.display = hold < start || hold >= stop ? 'none' : '';
      const learning = lessons.length > 0 && hold < learnEnd;
      learn.style.display = learning ? '' : 'none';

      // The preface: each piece rises and fades in at its turn.
      const prefacing = !!pre && hold >= start && hold < learnEnd;
      preG.style.display = prefacing ? '' : 'none';
      if (prefacing) {
        const p = progress(hold, start, learnEnd);
        for (const { el, at } of preParts) {
          const k = easeInOut(progress(p, at, at + 0.14));
          el.setAttribute('opacity', k.toFixed(3));
          el.setAttribute(
            'transform',
            k < 1 ? `translate(0 ${((1 - k) * fs * 1.2).toFixed(1)})` : '',
          );
        }
        if (preStatus) setText(preStatus, `● ${pre!.title} · ${pre!.items.length} projects`);
      }

      if (learning) {
        const p = progress(hold, start, learnEnd);
        const n = lessons.length;
        const cur = Math.min(n - 1, Math.floor(p * n));
        topics.forEach((t, i) => {
          setText(t.tick, i < cur ? '✓' : i === cur ? '…' : '');
          t.row.setAttribute('fill', i === cur ? '#262d44' : 'none');
        });
        const local = clamp(p * n - cur);
        lessonPanels.forEach((lp, i) => {
          lp.p.style.display = i === cur ? '' : 'none';
          if (i !== cur) return;
          const typed = Math.ceil(progress(local, 0, 0.7) * lp.lines.length);
          lp.lines.forEach((l, j) => (l.style.visibility = j < typed ? '' : 'hidden'));
        });
        setText(learnStatus, `● Learning ${lessons[cur]!.topic} · ${cur + 1}/${n}`);
      }

      // Which project is on: the one whose window holds `hold` (the last stays up after `end`).
      const building = hold >= learnEnd;
      let active = -1;
      if (building) {
        active = windows.length - 1;
        for (let i = 0; i < windows.length; i++)
          if (hold < windows[i]!.b) {
            active = i;
            break;
          }
      }
      const win = active >= 0 ? windows[active]! : null;
      const isLive = !!win && hold >= win.live;

      // Live: its Play Store listing (or the deployed site) builds in, then the LIVE stamp lands.
      released.forEach((r, i) => {
        const on = i === active && isLive;
        r.group.style.display = on ? '' : 'none';
        if (!on) return;
        const p = progress(hold, win!.live, win!.b);
        const shown = Math.ceil(progress(p, 0, 0.25) * r.steps.length);
        r.steps.forEach((el, j) => (el.style.visibility = j < shown ? '' : 'hidden'));
        // A live site: scrolled down from the top, flick by flick.
        if ('scrollSite' in r) r.scrollSite(wheel(progress(p, 0.08, 0.95), 4));
        const st = progress(p, 0.25, 0.4);
        r.stamp.style.visibility = st > 0 ? '' : 'hidden';
        r.stamp.setAttribute('opacity', st.toFixed(2));
        setText(r.status, st > 0 ? r.live : r.pending);
      });

      built.forEach((b, i) => {
        const on = i === active && !isLive;
        b.group.style.display = on ? '' : 'none';
        if (!on) return;
        const wi = win!;
        const phase =
          hold < wi.code ? 'intro' : hold < wi.shots ? 'code' : hold < wi.build ? 'shots' : 'build';
        b.intro.style.display = phase === 'intro' ? '' : 'none';
        b.about.style.display = phase === 'shots' ? '' : 'none';

        // Code: its files type out one after another, each in its own tab (then it stays up).
        const n = b.panes.length;
        const tp = phase === 'intro' ? 0 : progress(hold, wi.code, wi.shots) * n;
        const cur = Math.min(n - 1, Math.floor(tp));
        b.panes.forEach((pane, j) => {
          pane.g.style.display = j === cur ? '' : 'none';
          if (j !== cur) return;
          const typed = Math.ceil(progress(tp - j, 0, 0.7) * pane.lines.length);
          pane.lines.forEach((l, q) => (l.style.visibility = q < typed ? '' : 'hidden'));
        });

        // Screens: each one in turn, the turn to it at the start of its own share of time.
        const k = Math.max(1, b.app.shots.length);
        const sp =
          phase === 'shots'
            ? progress(hold, wi.shots, wi.build) * k
            : phase === 'build'
              ? k - 1
              : 0;
        const shot = Math.min(k - 1, Math.floor(sp));
        const pos =
          shot === 0 ? 0 : shot - 1 + easeInOut(progress(sp - shot, 0, reduced ? 0.01 : 0.22));
        if (b.page) b.page(pos);
        else placeRing(b, pos);
        b.captions.forEach((c, j) => (c.style.display = j === shot ? '' : 'none'));
        setText(b.counter, `SCREEN ${shot + 1} OF ${k}`);
        b.dots.forEach((d, j) => d.setAttribute('fill', j === shot ? b.app.accent : '#3a405c'));

        const build = progress(hold, wi.build, wi.live);
        b.bar.setAttribute('width', (b.barW * build).toFixed(1));
        setText(
          b.status,
          phase === 'intro'
            ? `● Starting a new project · ${b.app.name}`
            : phase === 'code'
              ? `● ${b.app.name} · file ${cur + 1} of ${n} · ${b.panes[cur]!.run}`
              : phase === 'shots'
                ? `● ${b.app.name} · screen ${shot + 1} of ${k}`
                : build < 1
                  ? `▶ Building ${b.app.name} ${b.web ? 'for production' : 'release'}… ${Math.round(build * 100)}%`
                  : `✓ ${b.app.name} build ready`,
        );
      });
    },
  };
}
