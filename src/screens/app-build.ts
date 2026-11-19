/**
 * Chapter 03 and 05 monitors (content: src/content/showcase.ts), driven by hold progress
 * (chapter 05 has no lessons and starts after its CI/CD pipeline — see AppBuildOptions):
 *
 *   0 → LEARN_END   learning — a syllabus (Dart, Flutter, Testing, Firebase, React) ticks off
 *                   while a lesson panel shows each topic's code; we see Suman from behind.
 *   LEARN_END →     building — QOMIX, then Tan90: the app's logo on the editor tab, its Flutter
 *   BUILD_END       code typing out, and its real screens on a carousel of phones that rotates
 *                   one step at a time (each turn brings the next screen to the front), then a
 *                   release build. By now his hands are on the keyboard (scenes/03-cloudcraftz).
 *   BUILD_END → 1   released — each app's first production release, live on its Play Store
 *                   listing: title, publisher, downloads, logo, Install, screenshots, LIVE stamp.
 *
 * Web apps (a showcase entry with `site`, chapter 09b) swap the phones for a browser window
 * whose pages slide past, and the Play Store listing for the deployed site in the browser.
 */
import type { Lesson, Showcase } from '../content/showcase';
import type { Screen } from '../engine/types';
import { clamp, easeInOut, mod, progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText, UI } from '../lib/svg';

/** Hold progress where learning ends and building starts. */
export const LEARN_END = 0.32;
/** Hold progress where building ends and the store listings start. */
export const BUILD_END = 0.7;
/** Carousel: seconds per step, and how long each turn takes. */
const STEP_SECONDS = 2.4;
const TURN_SECONDS = 0.7;

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
  /** Web app: the browser window's pages slide instead of the phone ring turning. */
  web: boolean;
}

export interface AppBuildOptions {
  /** Hold progress before which the whole screen is hidden (another screen shows instead). */
  start?: number;
  /** Where learning ends and building starts (defaults to LEARN_END; no lessons: `start`). */
  learnEnd?: number;
  /** Where building ends and the store listings start. */
  buildEnd?: number;
  /** Where the store listings are all done (the last one then stays up). */
  end?: number;
  /** Hold progress from which the whole screen is hidden again (another screen follows). */
  stop?: number;
}

export function appBuild(
  rect: SVGGraphicsElement,
  apps: Showcase[],
  lessons: Lesson[],
  opts: AppBuildOptions = {},
): Screen {
  const start = opts.start ?? 0;
  const learnEnd = opts.learnEnd ?? (lessons.length ? LEARN_END : start);
  const buildEnd = opts.buildEnd ?? BUILD_END;
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

  /** A light browser window at (bx, by), its page (a screenshot) clipped under the chrome. */
  const browser = (
    parent: Element,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    href: string,
    url: string,
  ) => {
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
    const page = svgEl(
      'svg',
      { x: bx, y: by + bar, width: bw, height: bh - bar, viewBox: `0 0 ${bw} ${bh - bar}` },
      parent,
    );
    svgEl(
      'image',
      { href, x: 0, y: 0, width: bw, height: bh - bar, preserveAspectRatio: 'xMidYMin slice' },
      page,
    );
  };

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
    const slides = area
      ? app.shots.map((href) => {
          const el = svgEl('g', {}, area);
          browser(el, 0, 0, webW, webH, href, site!.url);
          return el;
        })
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
    return { group, panes, slides, ring, bar, barW, status, app, web: !!site };
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
    // The live site fills the body, in the browser — a tour of its pages, one after another.
    steps.push(svgEl('g', {}, group));
    const pages = app.shots.map((href) => {
      const page = svgEl('g', {}, steps[0]!);
      browser(page, x + fs * 0.6, bodyY + fs * 0.6, w - fs * 1.2, bodyH - fs * 1.2, href, site.url);
      return page;
    });
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
      pages,
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

  /** Web apps: the page at `pos` fills the browser; the next slides in from the right. */
  const placePages = (b: Built, pos: number) => {
    const k = b.slides.length;
    b.slides.forEach((el, j) => {
      const d = mod(j - pos + k / 2, k) - k / 2;
      const visible = Math.abs(d) < 1;
      el.style.display = visible ? '' : 'none';
      if (visible) el.setAttribute('transform', `translate(${(d * (webW + fs)).toFixed(1)} 0)`);
    });
  };

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
    update({ idle, reduced, hold }) {
      g.style.display = hold < start || hold >= stop ? 'none' : '';
      const learning = lessons.length > 0 && hold < learnEnd;
      learn.style.display = learning ? '' : 'none';

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

      const nApps = built.length;
      const bp = progress(hold, learnEnd, buildEnd);
      const building = hold >= learnEnd && hold < buildEnd;
      const active = building ? Math.min(nApps - 1, Math.floor(bp * nApps)) : -1;

      // Released: each app's store listing builds in, then the LIVE stamp lands.
      const rp = progress(hold, buildEnd, end);
      const live = hold >= buildEnd ? Math.min(nApps - 1, Math.floor(rp * nApps)) : -1;
      released.forEach((r, i) => {
        const on = i === live;
        r.group.style.display = on ? '' : 'none';
        if (!on) return;
        const p = progress(rp, i / nApps, (i + 1) / nApps);
        const shown = Math.ceil(progress(p, 0, 0.5) * r.steps.length);
        r.steps.forEach((el, j) => (el.style.visibility = j < shown ? '' : 'hidden'));
        // A live site: its pages, one after another.
        if ('pages' in r && r.pages.length) {
          const n = r.pages.length;
          const k = Math.min(n - 1, Math.floor(progress(p, 0.08, 0.98) * n));
          r.pages.forEach((pg, j) => (pg.style.display = j === k ? '' : 'none'));
        }
        const st = progress(p, 0.55, 0.65);
        r.stamp.style.visibility = st > 0 ? '' : 'hidden';
        r.stamp.setAttribute('opacity', st.toFixed(2));
        setText(r.status, st > 0 ? r.live : r.pending);
      });
      built.forEach((b, i) => {
        const on = i === active;
        b.group.style.display = on ? '' : 'none';
        if (!on) return;
        const p = progress(bp, i / nApps, (i + 1) / nApps);
        // Its files type out one after another, each in its own tab.
        const n = b.panes.length;
        const tp = progress(p, 0, 0.6) * n;
        const cur = Math.min(n - 1, Math.floor(tp));
        b.panes.forEach((pane, j) => {
          pane.g.style.display = j === cur ? '' : 'none';
          if (j !== cur) return;
          const typed = Math.ceil(clamp(tp - j, 0, 1) * pane.lines.length);
          pane.lines.forEach((l, q) => (l.style.visibility = q < typed ? '' : 'hidden'));
        });

        // Carousel: one step every STEP_SECONDS, each turn taking TURN_SECONDS.
        const k = b.slides.length;
        let pos: number;
        if (reduced) pos = Math.min(k - 1, Math.floor(p * k));
        else {
          const steps = idle / STEP_SECONDS;
          const frac = steps - Math.floor(steps);
          pos = Math.floor(steps) + easeInOut(progress(frac, 1 - TURN_SECONDS / STEP_SECONDS, 1));
        }
        if (b.web) placePages(b, pos);
        else placeRing(b, pos);

        const build = progress(p, 0.6, 0.9);
        b.bar.setAttribute('width', (b.barW * build).toFixed(1));
        setText(
          b.status,
          p < 0.6
            ? `● ${b.app.name} · ${b.panes[cur]!.run}`
            : build < 1
              ? `▶ Building ${b.app.name} release… ${Math.round(build * 100)}%`
              : `✓ ${b.app.name} release build ready`,
        );
      });
    },
  };
}
