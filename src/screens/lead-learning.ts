/**
 * Chapter 09 monitor: the Tech Lead's tools (Jira, Docker, the backend) as lessons, in the same
 * learning format as chapter 03 (screens/app-build.ts): a syllabus on the left that ticks off,
 * and on the right "Learning <topic>" with its notes typing out line by line.
 *
 * One of these is mounted per app (scenes/09-leading.ts), on top of the app's own screen: the
 * lesson plays first, then it clears to show the app at work (Jira board, Docker, the editor).
 * Each draws the whole syllabus with its own lesson current, so the lessons read as one list
 * moving on. Everything is a pure function of hold progress, so it plays backwards on scroll.
 */
import type { Lesson } from '../content/showcase';
import type { Screen } from '../engine/types';
import { progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText, UI } from '../lib/svg';

/** A hold window, [start, end]. */
export type Window = [number, number];

export function leadLearning(
  rect: SVGGraphicsElement,
  lessons: Lesson[],
  /** Which lesson this window teaches. */
  cur: number,
  /** The lesson's own time on screen. */
  win: Window,
): Screen {
  const [a, b] = win;
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
  const tx = x + fs * 4.6;
  svgEl(
    'rect',
    { x: tx, y: y + fs * 0.35, width: w * 0.5, height: th - fs * 0.35, fill: '#141826' },
    g,
  );
  svgEl('rect', { x: tx, y: y + fs * 0.35, width: w * 0.5, height: fs * 0.18, fill: '#3fa9d6' }, g);
  svgText(g, tx + fs * 2, y + th / 2 + fs * 0.42, 'notes/tech-lead.md', {
    'font-size': fs * 0.85,
    fill: UI.text,
  });
  svgEl('rect', { x, y: y + h - sb, width: w, height: sb, fill: '#1d2233' }, g);

  // The syllabus: lessons before this one are ticked, this one is being read.
  const listW = w * 0.3;
  svgEl('rect', { x, y: bodyY, width: listW, height: bodyH, fill: '#181d2c' }, g);
  svgText(g, x + fs, bodyY + fs * 1.7, 'SYLLABUS', { 'font-size': fs * 0.7, fill: UI.muted });
  lessons.forEach((l, i) => {
    const ty = bodyY + fs * (3.6 + i * 2);
    svgEl(
      'rect',
      {
        x: x + fs * 0.5,
        y: ty - fs * 1.15,
        width: listW - fs,
        height: fs * 1.7,
        rx: fs * 0.3,
        fill: i === cur ? '#262d44' : 'none',
      },
      g,
    );
    svgEl('circle', { cx: x + fs * 1.5, cy: ty - fs * 0.3, r: fs * 0.42, fill: l.color }, g);
    svgText(g, x + fs * 2.4, ty, l.topic, { 'font-size': fs * 0.95, fill: UI.text });
    svgText(g, x + listW - fs * 1.2, ty, i < cur ? '✓' : i === cur ? '…' : '', {
      'font-size': fs * 0.95,
      fill: UI.green,
      'text-anchor': 'middle',
    });
  });

  // The lesson: its heading, then the notes typing out.
  const lesson = lessons[cur]!;
  const lx = x + listW + fs * 1.4;
  svgText(g, lx, bodyY + fs * 2.4, `Learning ${lesson.topic}`, {
    'font-size': fs * 1.5,
    fill: lesson.color,
    class: 'title-text',
  });
  svgEl(
    'rect',
    { x: lx, y: bodyY + fs * 3.2, width: fs * 4, height: fs * 0.2, fill: lesson.color },
    g,
  );
  const lines = lesson.code.map((c, j) =>
    svgText(g, lx, bodyY + fs * (5.2 + j * 1.5), c, {
      'font-size': fs * 0.85,
      fill: UI.text,
      style: 'white-space: pre',
    }),
  );
  const status = svgText(g, x + fs, y + h - sb / 2 + fs * 0.32, '', {
    'font-size': fs * 0.85,
    fill: UI.text,
  });
  setText(status, `● Learning ${lesson.topic} · ${cur + 1}/${lessons.length}`);

  return {
    update({ hold }) {
      // The lesson hands over to the app's own screen (mounted beneath) when its window ends.
      g.style.display = hold >= b ? 'none' : '';
      // Typed across the first 70% of the window, then left up to read.
      const typed = Math.ceil(progress(hold, a, a + (b - a) * 0.7) * lines.length);
      lines.forEach((l, j) => (l.style.visibility = j < typed ? '' : 'hidden'));
    },
  };
}
