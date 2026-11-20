/**
 * Chapter 05 by night: Suman studies with Scaler on the big monitor (content/showcase.ts
 * `scalerModules`), driven by hold progress inside `win`, so it reverses on scroll.
 *
 * Left, the curriculum: each module ticks off in turn. Right, the module being studied:
 *   - its lecture video: the lecture's own diagram (screens/scaler-diagrams.ts) draws in piece
 *     by piece, the instructor in a
 *     corner, and the play bar runs with the lecture's time;
 *   - below it, the reading notes: each point appears as he reads, the current one highlighted.
 */
import type { ScalerModule } from '../content/showcase';
import type { Screen } from '../engine/types';
import { clamp, progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText, UI } from '../lib/svg';
import { drawDiagram } from './scaler-diagrams';

export type Window = [number, number];

/** Each lecture's length on its play bar (minutes). */
const LECTURE_MIN = 45;

export function scalerStudy(
  rect: SVGGraphicsElement,
  modules: ScalerModule[],
  win: Window,
  logo: string,
  /** The card that opens it: what this is, before the first module. */
  intro: { title: string; kicker: string; about: string },
): Screen {
  const [a, b] = win;
  /** The intro card's share of the window; the modules share the rest. */
  const INTRO = 0.14;
  const { g, x, y, w, h, u } = screenFrame(rect);
  const fs = Math.min(u * 2.4, h / 22);
  const th = fs * 2.3;
  const sb = fs * 2.2;
  const bodyY = y + th;
  const bodyH = h - th - sb;

  // Window chrome, the Scaler tab and the status bar.
  svgEl('rect', { x, y, width: w, height: h, fill: '#141826' }, g);
  svgEl('rect', { x, y, width: w, height: th, fill: '#1d2233' }, g);
  ['#e0665a', '#e3b341', '#5bb974'].forEach((c, i) =>
    svgEl('circle', { cx: x + fs * (1.2 + i * 1.1), cy: y + th / 2, r: fs * 0.35, fill: c }, g),
  );
  const tx = x + fs * 4.6;
  svgEl(
    'rect',
    { x: tx, y: y + fs * 0.35, width: w * 0.5, height: th - fs * 0.35, fill: '#141826' },
    g,
  );
  svgEl('rect', { x: tx, y: y + fs * 0.35, width: w * 0.5, height: fs * 0.18, fill: '#2f6bff' }, g);
  svgEl(
    'image',
    { href: logo, x: tx + fs * 0.3, y: y + th / 2 - fs * 0.55, width: fs * 1.3, height: fs * 1.3 },
    g,
  );
  svgText(g, tx + fs * 2, y + th / 2 + fs * 0.42, 'Scaler Academy · lectures & notes', {
    'font-size': fs * 0.85,
    fill: UI.text,
  });
  svgEl('rect', { x, y: y + h - sb, width: w, height: sb, fill: '#1d2233' }, g);
  const status = svgText(g, x + fs, y + h - sb / 2 + fs * 0.32, '', {
    'font-size': fs * 0.85,
    fill: UI.text,
  });

  // The curriculum.
  const listW = w * 0.28;
  svgEl('rect', { x, y: bodyY, width: listW, height: bodyH, fill: '#181d2c' }, g);
  svgText(g, x + fs, bodyY + fs * 1.7, 'SCALER · MODULES', {
    'font-size': fs * 0.7,
    fill: UI.muted,
  });
  const rows = modules.map((m, i) => {
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
      g,
    );
    svgEl('circle', { cx: x + fs * 1.5, cy: ty - fs * 0.3, r: fs * 0.42, fill: m.color }, g);
    svgText(g, x + fs * 2.4, ty, m.topic, { 'font-size': fs * 0.9, fill: UI.text });
    const tick = svgText(g, x + listW - fs * 1.2, ty, '', {
      'font-size': fs * 0.95,
      fill: UI.green,
      'text-anchor': 'middle',
    });
    return { row, tick };
  });

  // The module on the right: its video, then its notes.
  const rx = x + listW + fs;
  const rw = x + w - fs - rx;
  // Each module opens with its heading, as in chapter 03: "Learning DSA".
  const hy = bodyY + fs * 2.1;
  const vy = bodyY + fs * 3.1;
  const vh = bodyH * 0.5;
  const dy = vy + vh + fs * 0.6;
  const dh = bodyY + bodyH - fs * 0.6 - dy;
  const ctrl = fs * 1.6; // the video's control strip
  const panes = modules.map((m, i) => {
    const p = svgEl('g', {}, g);
    svgText(p, rx, hy, `Learning ${m.topic}`, {
      'font-size': fs * 1.35,
      fill: m.color,
      class: 'title-text',
    });
    svgText(p, rx + rw, hy, `Module ${i + 1} of ${modules.length}`, {
      'font-size': fs * 0.65,
      fill: UI.muted,
      'text-anchor': 'end',
    });
    svgEl('rect', { x: rx, y: hy + fs * 0.45, width: fs * 4, height: fs * 0.18, fill: m.color }, p);
    // Video.
    svgEl('rect', { x: rx, y: vy, width: rw, height: vh, rx: fs * 0.4, fill: '#0b0d14' }, p);
    svgText(p, rx + fs * 0.7, vy + fs * 1.3, `▶ Lecture · ${m.lecture}`, {
      'font-size': fs * 0.75,
      fill: UI.text,
    });
    const gx = rx + fs;
    const gy = vy + fs * 2;
    const gw = rw - fs * 5.6;
    const gh = vh - fs * 2 - ctrl - fs * 0.4;
    // The lecture's own diagram, drawn in piece by piece as it plays.
    const pieces = drawDiagram(p, m.diagram, { x: gx, y: gy, w: gw, h: gh }, fs, m.color);
    // The instructor, top right of the video.
    const ax = rx + rw - fs * 2.6;
    const ay = vy + fs * 3.4;
    svgEl('circle', { cx: ax, cy: ay, r: fs * 1.6, fill: '#2a3048' }, p);
    svgEl('circle', { cx: ax, cy: ay - fs * 0.35, r: fs * 0.55, fill: '#e0a77a' }, p);
    svgEl(
      'path',
      {
        d: `M${ax - fs * 1} ${ay + fs * 1.05}q${fs} -${fs * 1.3} ${fs * 2} 0`,
        fill: '#5a8f8a',
      },
      p,
    );
    ['', ''].forEach((_, k) =>
      svgEl(
        'rect',
        {
          x: ax - fs * 1.6,
          y: ay + fs * (2.3 + k * 0.6),
          width: fs * (3.2 - k),
          height: fs * 0.22,
          rx: fs * 0.11,
          fill: '#3a405c',
        },
        p,
      ),
    );
    // Controls: play, progress, time.
    const cy0 = vy + vh - ctrl / 2;
    svgEl(
      'path',
      {
        d: `M${rx + fs * 0.7} ${cy0 - fs * 0.4}l${fs * 0.6} ${fs * 0.4}l-${fs * 0.6} ${fs * 0.4}z`,
        fill: UI.text,
      },
      p,
    );
    const barX = rx + fs * 1.8;
    const barW = rw - fs * 1.8 - fs * 6.4;
    svgEl(
      'rect',
      {
        x: barX,
        y: cy0 - fs * 0.12,
        width: barW,
        height: fs * 0.24,
        rx: fs * 0.12,
        fill: '#3a405c',
      },
      p,
    );
    const bar = svgEl(
      'rect',
      { x: barX, y: cy0 - fs * 0.12, width: 0, height: fs * 0.24, rx: fs * 0.12, fill: '#ef4444' },
      p,
    );
    const time = svgText(p, rx + rw - fs * 0.6, cy0 + fs * 0.25, '', {
      'font-size': fs * 0.62,
      fill: UI.muted,
      'text-anchor': 'end',
    });

    // Notes: a page of the reading, point by point.
    svgEl('rect', { x: rx, y: dy, width: rw, height: dh, rx: fs * 0.4, fill: UI.paper }, p);
    svgEl('rect', { x: rx, y: dy, width: fs * 0.22, height: dh, fill: m.color }, p);
    svgText(p, rx + fs * 0.9, dy + fs * 1.3, `Notes · ${m.topic}`, {
      'font-size': fs * 0.82,
      fill: '#202124',
      class: 'title-text',
    });
    const lineH = Math.min(fs * 1.3, (dh - fs * 1.9) / Math.max(1, m.notes.length));
    const notes = m.notes.map((n, k) => {
      const ly = dy + fs * 1.9 + (k + 0.75) * lineH;
      const mark = svgEl(
        'rect',
        {
          x: rx + fs * 0.6,
          y: ly - lineH * 0.72,
          width: rw - fs * 1.2,
          height: lineH * 0.95,
          rx: fs * 0.2,
          fill: '#ffe08a',
        },
        p,
      );
      const text = svgText(p, rx + fs * 0.9, ly, `• ${n}`, {
        'font-size': Math.min(fs * 0.72, lineH * 0.7),
        fill: '#3c4043',
      });
      return { mark, text };
    });
    return { p, pieces, bar, barW, time, notes };
  });

  // The intro card over the whole body: Scaler's logo, what this is, the modules ahead.
  const card = svgEl('g', { 'data-study-intro': '' }, g);
  svgEl('rect', { x, y: bodyY, width: w, height: bodyH, fill: '#141826' }, card);
  svgEl('rect', { x, y: bodyY, width: fs * 0.3, height: bodyH, fill: '#2f6bff' }, card);
  const L = Math.min(fs * 5.5, bodyH * 0.32, w * 0.16);
  const lx = x + fs * 2;
  const ly = bodyY + fs * 1.4;
  svgEl('rect', { x: lx, y: ly, width: L, height: L, rx: L * 0.22, fill: '#ffffff' }, card);
  svgEl(
    'image',
    { href: logo, x: lx + L * 0.1, y: ly + L * 0.1, width: L * 0.8, height: L * 0.8 },
    card,
  );
  const cx0 = lx + L + fs * 1.4;
  svgText(card, cx0, ly + fs * 1.1, intro.kicker, { 'font-size': fs * 0.75, fill: '#6aa7ff' });
  svgText(card, cx0, ly + fs * 3.2, intro.title, {
    'font-size': fs * 2,
    fill: UI.text,
    class: 'title-text',
  });
  // The modules ahead, as chips.
  let chipX = cx0;
  const chipFs = fs * 0.68;
  for (const m of modules) {
    const cw = m.topic.length * chipFs * 0.62 + chipFs * 1.4;
    if (chipX + cw > x + w - fs) break;
    svgEl(
      'rect',
      {
        x: chipX,
        y: ly + fs * 4,
        width: cw,
        height: chipFs * 1.8,
        rx: chipFs * 0.9,
        fill: '#262d44',
      },
      card,
    );
    svgEl(
      'circle',
      { cx: chipX + chipFs * 0.8, cy: ly + fs * 4 + chipFs * 0.9, r: chipFs * 0.3, fill: m.color },
      card,
    );
    svgText(card, chipX + chipFs * 1.3, ly + fs * 4 + chipFs * 1.25, m.topic, {
      'font-size': chipFs,
      fill: UI.text,
    });
    chipX += cw + chipFs * 0.6;
  }
  // What it is, wrapped.
  const aboutFs = fs * 0.95;
  const per = Math.max(12, Math.floor((w - fs * 4) / (aboutFs * 0.62)));
  const words = intro.about.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > per) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  lines.forEach((l, k) =>
    svgText(card, lx, ly + L + fs * 2 + k * aboutFs * 1.5, l, {
      'font-size': aboutFs,
      fill: UI.text,
    }),
  );
  svgText(
    card,
    lx,
    bodyY + bodyH - fs * 1.1,
    `${modules.length} modules · each a lecture, then the notes`,
    {
      'font-size': fs * 0.75,
      fill: UI.muted,
    },
  );

  const n = modules.length;
  return {
    update({ hold }) {
      const on = hold >= a;
      g.style.display = on ? '' : 'none';
      if (!on) return;
      const opening = hold < a + (b - a) * INTRO;
      card.style.display = opening ? '' : 'none';
      if (opening) {
        rows.forEach((r) => {
          setText(r.tick, '');
          r.row.setAttribute('fill', 'none');
        });
        panes.forEach((pane) => (pane.p.style.display = 'none'));
        setText(status, `● Starting Scaler Academy · ${n} modules, by night`);
        return;
      }
      const t = progress(hold, a + (b - a) * INTRO, b) * n;
      const cur = Math.min(n - 1, Math.floor(t));
      const local = clamp(t - cur);
      rows.forEach((r, i) => {
        setText(r.tick, i < cur || (i === cur && local >= 1) ? '✓' : i === cur ? '…' : '');
        r.row.setAttribute('fill', i === cur ? '#262d44' : 'none');
      });
      panes.forEach((pane, i) => {
        pane.p.style.display = i === cur ? '' : 'none';
        if (i !== cur) return;
        // The lecture plays through the first part; the reading follows.
        const v = progress(local, 0, 0.6);
        const drawn = Math.ceil(progress(v, 0, 0.85) * pane.pieces.length);
        pane.pieces.forEach((e, k) => (e.style.visibility = k < drawn ? '' : 'hidden'));
        pane.bar.setAttribute('width', (pane.barW * v).toFixed(1));
        const secs = Math.round(v * LECTURE_MIN * 60);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        setText(pane.time, `${mm}:${ss} / ${LECTURE_MIN}:00`);
        const r = progress(local, 0.45, 0.95);
        const shown = Math.ceil(r * pane.notes.length);
        pane.notes.forEach((note, k) => {
          note.text.style.visibility = k < shown ? '' : 'hidden';
          note.mark.style.visibility = k === shown - 1 && r < 1 ? '' : 'hidden';
        });
      });
      const m = modules[cur]!;
      setText(
        status,
        `● Scaler · module ${cur + 1}/${n} · ${m.topic} · ${local < 0.5 ? 'watching the lecture' : 'reading the notes'}`,
      );
    },
  };
}
