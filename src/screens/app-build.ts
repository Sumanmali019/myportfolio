/**
 * The desk monitors' "build" screen (content: src/content/showcase.ts), driven by hold progress.
 *
 *   start → learnEnd   learning (chapter 03 only) — a syllabus (Dart, Flutter, Testing,
 *                      Firebase, React) ticks off while a lesson panel shows each topic's code.
 *   learnEnd → end     the projects, one after another. Each one plays through, start to end,
 *                      before the next begins (its share of the window follows PACE, so a
 *                      project with more screens gets more time). No code is shown: only what
 *                      the product is and what each screen shows.
 *                        screens every screenshot in turn, one at a time, each with its name
 *                                (the caption), beside a panel describing the product
 *                                ("Screen 2 of 4"); the view glides from one to the next and
 *                                the caption fades with it;
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

/** Smootherstep: eases in and out more gently than easeInOut, so the glide never lurches. */
const smooth = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/** Hold progress where learning ends and building starts (when there are lessons). */
export const LEARN_END = 0.32;

/**
 * How a project's time is shared between its parts (relative weights). Each chapter gives its
 * projects a fixed number of seconds (scenes/*.ts) and `appWindows` splits it by these, so a
 * project with more files or screens gets a bigger share. Screens get the most: they are what
 * a visitor looks at.
 */
export const PACE = { shot: 1.7, live: 1.1 } as const;
/** Seconds the view takes to glide from one screen to the next (inside a screen's share). */
const GLIDE = 0.7;
/** Seconds a project's screen takes to fade in as it starts. */
const FADE = 0.35;

/** How long one project plays, in seconds at 1×. */
export const appSeconds = (app: Showcase): number => PACE.shot * app.shots.length + PACE.live;

/** How long a list of projects plays, in seconds at 1×. */
export const buildSeconds = (apps: Showcase[]): number =>
  apps.reduce((t, a) => t + appSeconds(a), 0);

/** One project's window in hold progress: its screens from `a`, then live from `live` to `b`. */
export interface AppWindow {
  a: number;
  live: number;
  b: number;
  /** Hold progress per second of this chapter's build window (to turn seconds into progress). */
  k: number;
}

/** Each project's window inside [start, end], in order, sized by its `appSeconds`. */
export function appWindows(apps: Showcase[], start: number, end: number): AppWindow[] {
  const total = buildSeconds(apps) || 1;
  const k = (end - start) / total;
  let t = start;
  return apps.map((app) => {
    const a = t;
    const live = a + PACE.shot * app.shots.length * k;
    const b = live + PACE.live * k;
    t = b;
    return { a, live, b, k };
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

interface Built {
  group: SVGGElement;
  slides: SVGGElement[];
  ring: SVGGElement;
  bar: SVGRectElement;
  barW: number;
  status: SVGTextElement;
  app: Showcase;
  /** Web app: the browser window shows its pages instead of the phone ring turning. */
  web: boolean;
  /** "MOBILE APP" / "WEB PLATFORM" (personal projects say so), shown with the screen count. */
  kind: string;
  /** Web app: show page `pos` of the site (fractional while scrolling to the next). */
  page: ((pos: number) => void) | null;
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

  /** Rough characters per line for text of size `size` across `width`. */
  const perLine = (width: number, size: number) => Math.max(12, Math.floor(width / (size * 0.62)));

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
    const size = fs * 0.72;
    const lines = wrap(app.about, perLine(pw0 - fs * 2.4, size), 6);
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
    // The window's tab: the product and what this is (no code is shown).
    tab(group, `${app.name} · ${site ? 'web platform' : 'mobile app'}`, app.accent);
    svgEl(
      'image',
      {
        href: app.logo,
        x: x + fs * 4.9,
        y: y + th / 2 - fs * 0.55,
        width: fs * 1.3,
        height: fs * 1.3,
      },
      group,
    );
    // Phones on a ring; each a bezel with the screenshot clipped inside a nested <svg>.
    const ring = svgEl('g', {}, group);
    const iw = pw - pad * 2;
    const ih = ph - pad * 4;
    // Web app: one browser window right of the description; its pages slide past inside it.
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
    return {
      group,
      slides,
      ring,
      bar,
      barW,
      status,
      app,
      web: !!site,
      kind: `${app.personal ? 'PERSONAL · ' : ''}${site ? 'WEB PLATFORM' : 'MOBILE APP'}`,
      page,
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
        const fade = reduced ? 1 : easeInOut(progress(hold, win!.live, win!.live + FADE * win!.k));
        r.group.setAttribute('opacity', fade < 1 ? fade.toFixed(3) : '1');
        const p = progress(hold, win!.live, win!.b);
        const shown = Math.ceil(progress(p, 0, 0.25) * r.steps.length);
        r.steps.forEach((el, j) => (el.style.visibility = j < shown ? '' : 'hidden'));
        // A live site: scrolled gently down from the top.
        if ('scrollSite' in r) r.scrollSite(smooth(progress(p, 0.1, 1)));
        const st = progress(p, 0.25, 0.4);
        r.stamp.style.visibility = st > 0 ? '' : 'hidden';
        r.stamp.setAttribute('opacity', st.toFixed(2));
        setText(r.status, st > 0 ? r.live : r.pending);
      });

      built.forEach((b, i) => {
        // Its screens stay under the store listing / site while that fades in over them.
        const fadeOut = win ? FADE * win.k : 0;
        const on = i === active && (!isLive || hold < win!.live + fadeOut);
        b.group.style.display = on ? '' : 'none';
        if (!on) return;
        const wi = win!;
        // It fades up from the dark as the project starts.
        const rise = reduced ? 1 : easeInOut(progress(hold, wi.a, wi.a + FADE * wi.k));
        b.group.setAttribute('opacity', rise < 1 ? rise.toFixed(3) : '1');

        // Screens: each one in turn. The view glides to the next at the start of its share of
        // time (ease in and out, no jump), and its caption fades out and in with it.
        const k = Math.max(1, b.app.shots.length);
        const sp = progress(hold, wi.a, wi.live) * k;
        const shot = Math.min(k - 1, Math.floor(sp));
        const glide = reduced ? 0.01 : Math.min(0.8, GLIDE / PACE.shot);
        const pos = shot === 0 ? 0 : shot - 1 + smooth(progress(sp - shot, 0, glide));
        if (b.page) b.page(pos);
        else placeRing(b, pos);
        const front = Math.min(k - 1, Math.round(pos));
        b.captions.forEach((c, j) => {
          const d = j - pos;
          const vis = reduced ? (j === front ? 1 : 0) : clamp(1 - Math.abs(d) * 2.2);
          c.style.display = vis > 0.01 ? '' : 'none';
          c.setAttribute('opacity', vis.toFixed(3));
          c.setAttribute(
            'transform',
            vis < 0.99 ? `translate(0 ${(-d * fs * 0.9).toFixed(1)})` : '',
          );
        });
        setText(b.counter, `${b.kind} · SCREEN ${front + 1} OF ${k}`);
        b.dots.forEach((d, j) => d.setAttribute('fill', j === front ? b.app.accent : '#3a405c'));

        // The bar in the status line: how far through this project's screens.
        b.bar.setAttribute('width', (b.barW * progress(hold, wi.a, wi.live)).toFixed(1));
        setText(b.status, `● ${b.app.name} · screen ${front + 1} of ${k}`);
      });
    },
  };
}
