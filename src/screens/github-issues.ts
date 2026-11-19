/**
 * Chapter 10, before the fix: Suman browsing flutter/samples' open issues on GitHub (dark
 * theme). Across its hold window the list scrolls, the cursor finds the RenderFlex overflow
 * issue, hovers and clicks it, and the issue opens — then the editor takes over (the scene
 * fades this screen out). A pure function of hold progress, so it reverses.
 */
import type { Screen } from '../engine/types';
import { easeInOut, easeOut, lerp, progress } from '../lib/math';
import { screenFrame, setTransform, svgEl, svgText } from '../lib/svg';
import type { Window } from './lead-workday';

const C = {
  bg: '#0d1117',
  panel: '#161b22',
  line: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  green: '#3fb950',
  blue: '#2f81f7',
  red: '#f85149',
};
const SANS = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const LABEL: Record<string, [string, string]> = {
  bug: ['#3b1a1f', '#f8a1a7'],
  enhancement: ['#0f3a35', '#7ee2d0'],
  meta: ['#2b3a2b', '#b5e0a5'],
  p1: ['#3b1a1f', '#f8a1a7'],
  'tech-debt': ['#3d2a12', '#f0b072'],
};
/** [title, labels, author, comments]. */
const ISSUES: Array<[string, string[], string, number]> = [
  ['[compass_app] UI state never updates for the HomeScreen', [], 'Maxalkin', 1],
  ['[add-to-app] Cannot re-open Flutter screen after transitions', ['bug'], 'taiju59', 3],
  ['Many samples use old Gradle, impossible to build on modern JDK', ['bug'], 'bartekpacia', 0],
  ['RenderFlex overflowed by 29 pixels when several items are selected', ['bug'], 'flutter-dev', 2],
  ['Update CODEOWNERS to include owners of specific samples', ['meta'], 'ericwindmill', 0],
  ['[navigator2 quickstart] Create a navigator2 quickstart', ['enhancement'], 'ericwindmill', 3],
  ['[deeplink quickstart] Create a deeplinking quickstart', ['enhancement'], 'ericwindmill', 0],
  ['[desktop-photo-search] Turn sample into the multiplat sample', ['p1'], 'ericwindmill', 0],
  [
    'Unify the naming convention of names in this repository',
    ['enhancement', 'p1'],
    'ericwindmill',
    2,
  ],
];
/** The one he opens. */
const TARGET = 3;

/** Rough text width for a sans font (labels are placed after titles). */
const textW = (s: string, size: number) => s.length * size * 0.64;

export function githubIssues(rect: SVGGraphicsElement, win: Window): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  const font = { 'font-family': SANS };
  svgEl('rect', { x, y, width: w, height: h, fill: C.bg }, g);

  // The list (drawn first, so the header covers it as it scrolls up).
  const rowH = u * 6.6;
  const listTop = y + u * 16;
  const list = svgEl('g', {}, g);
  const rows = ISSUES.map(([title, labels, author, comments], i) => {
    const ry = listTop + i * rowH;
    const row = svgEl('g', {}, list);
    const hover = svgEl(
      'rect',
      { x: x + u * 2, y: ry, width: w - u * 4, height: rowH, fill: '#1c2330', opacity: 0 },
      row,
    );
    svgEl(
      'line',
      { x1: x + u * 2, y1: ry + rowH, x2: x + w - u * 2, y2: ry + rowH, stroke: C.line },
      row,
    );
    svgEl(
      'circle',
      {
        cx: x + u * 4.6,
        cy: ry + rowH * 0.36,
        r: u * 1,
        fill: 'none',
        stroke: C.green,
        'stroke-width': u * 0.28,
      },
      row,
    );
    svgEl('circle', { cx: x + u * 4.6, cy: ry + rowH * 0.36, r: u * 0.3, fill: C.green }, row);
    const size = u * 1.75;
    const tx = x + u * 6.8;
    // Labels sit right-aligned before the comment count; the title is cut to fit before them.
    const labelW = labels.map((name) => textW(name, size * 0.8) + u * 1.6);
    const labelsX = x + w - u * 11 - labelW.reduce((a, b) => a + b + u * 0.5, 0);
    const room = Math.floor((labelsX - tx - u) / (size * 0.64));
    const shown = title.length > room ? `${title.slice(0, room - 1).trimEnd()}…` : title;
    const titleEl = svgText(row, tx, ry + rowH * 0.44, shown, {
      'font-size': size,
      'font-weight': 600,
      fill: C.text,
      ...font,
    });
    let lx = labelsX;
    for (const [li, name] of labels.entries()) {
      const [bg, fg] = LABEL[name] ?? ['#30363d', C.text];
      const lw = labelW[li]!;
      svgEl(
        'rect',
        { x: lx, y: ry + rowH * 0.2, width: lw, height: size * 1.2, rx: size * 0.6, fill: bg },
        row,
      );
      svgText(row, lx + u * 0.8, ry + rowH * 0.2 + size * 0.88, name, {
        'font-size': size * 0.8,
        fill: fg,
        ...font,
      });
      lx += lw + u * 0.5;
    }
    svgText(row, tx, ry + rowH * 0.8, `flutter/samples · opened by ${author}`, {
      'font-size': u * 1.3,
      fill: C.muted,
      ...font,
    });
    if (comments) {
      // A speech-bubble icon and the count.
      const cx = x + w - u * 8;
      const cy = ry + rowH * 0.24;
      svgEl(
        'path',
        {
          d: `M${cx} ${cy} h${u * 2} v${u * 1.4} h-${u * 1.2} l-${u * 0.5} ${u * 0.5} v-${u * 0.5} h-${u * 0.3} Z`,
          fill: 'none',
          stroke: C.muted,
          'stroke-width': u * 0.2,
        },
        row,
      );
      svgText(row, cx + u * 2.6, cy + u * 1.3, String(comments), {
        'font-size': u * 1.4,
        fill: C.muted,
        ...font,
      });
    }
    return { hover, titleEl, ry };
  });

  // Header: repo name and tabs, then the filter bar.
  svgEl('rect', { x, y, width: w, height: u * 15, fill: C.bg }, g);
  svgEl('rect', { x, y, width: w, height: u * 7.5, fill: C.panel }, g);
  svgText(g, x + u * 2.5, y + u * 3.6, 'flutter / samples', {
    'font-size': u * 2,
    'font-weight': 700,
    fill: C.text,
    ...font,
  });
  ['Code', 'Issues  42', 'Pull requests', 'Actions'].forEach((t, i) => {
    const tx = x + u * (2.5 + i * 13);
    svgText(g, tx, y + u * 6.4, t, {
      'font-size': u * 1.4,
      fill: i === 1 ? C.text : C.muted,
      ...font,
    });
    if (i === 1)
      svgEl('rect', { x: tx, y: y + u * 7.1, width: u * 8, height: u * 0.4, fill: '#f78166' }, g);
  });
  svgEl(
    'rect',
    {
      x: x + u * 2,
      y: y + u * 9,
      width: w - u * 4,
      height: u * 4.4,
      rx: u * 0.8,
      fill: C.bg,
      stroke: C.line,
    },
    g,
  );
  svgText(g, x + u * 3.4, y + u * 11.8, 'is:issue state:open   ·   ⊙ 42 Open   ✓ 1,204 Closed', {
    'font-size': u * 1.4,
    fill: C.muted,
    ...font,
  });

  // The issue, opened.
  const issue = svgEl('g', { opacity: 0 }, g);
  svgEl('rect', { x, y, width: w, height: h, fill: C.bg }, issue);
  svgText(issue, x + u * 3, y + u * 6, ISSUES[TARGET]![0], {
    'font-size': u * 2.3,
    'font-weight': 600,
    fill: C.text,
    ...font,
  });
  svgEl(
    'rect',
    { x: x + u * 3, y: y + u * 8.4, width: u * 7, height: u * 2.8, rx: u * 1.4, fill: '#238636' },
    issue,
  );
  svgText(issue, x + u * 4.3, y + u * 10.3, '⊙ Open', {
    'font-size': u * 1.4,
    fill: '#fff',
    ...font,
  });
  svgText(issue, x + u * 11.5, y + u * 10.3, 'flutter-dev opened this issue · 2 comments', {
    'font-size': u * 1.4,
    fill: C.muted,
    ...font,
  });
  svgEl(
    'line',
    { x1: x + u * 3, y1: y + u * 13, x2: x + w - u * 3, y2: y + u * 13, stroke: C.line },
    issue,
  );
  [
    'When several items are selected, the bottom bar overflows:',
    'the content runs under the system navigation bar.',
    '',
    'Steps: open the list, select 3+ items, look at the bottom.',
  ].forEach((t, i) =>
    svgText(issue, x + u * 3, y + u * (16.5 + i * 2.4), t, {
      'font-size': u * 1.5,
      fill: C.text,
      ...font,
    }),
  );
  svgEl(
    'rect',
    { x: x + u * 3, y: y + u * 27, width: w - u * 6, height: u * 7, rx: u * 0.8, fill: C.panel },
    issue,
  );
  svgText(issue, x + u * 4.5, y + u * 30.2, 'A RenderFlex overflowed by 29 pixels on the bottom.', {
    'font-size': u * 1.45,
    fill: C.red,
    'font-family': 'ui-monospace, Menlo, Consolas, monospace',
  });
  svgEl(
    'rect',
    { x: x + u * 4.5, y: y + u * 31.6, width: w - u * 9, height: u * 1.2, fill: '#f2c94c' },
    issue,
  );

  // The mouse pointer.
  const cursor = svgEl('g', {}, g);
  svgEl(
    'path',
    {
      d: `M0 0 L0 ${u * 3.4} L${u * 0.9} ${u * 2.6} L${u * 1.6} ${u * 4} L${u * 2.2} ${u * 3.7} L${u * 1.5} ${u * 2.3} L${u * 2.6} ${u * 2.3} Z`,
      fill: '#ffffff',
      stroke: '#111',
      'stroke-width': u * 0.2,
    },
    cursor,
  );

  const scroll = rowH * 1.4;
  return {
    update({ hold }) {
      const t = progress(hold, win[0], win[1]);
      // Scroll down the list, settle on the overflow issue.
      const sy = easeInOut(progress(t, 0.08, 0.42)) * scroll;
      setTransform(list, sy ? `translateY(${(-sy).toFixed(1)}px)` : '');
      const target = rows[TARGET]!;
      const ty = target.ry - sy + rowH * 0.4;
      const tx = x + u * 26;
      // The pointer drifts down the page, then onto the issue's title.
      const k = easeInOut(progress(t, 0.36, 0.56));
      const px = lerp(x + w * 0.72, tx, k);
      const py = lerp(y + h * 0.78, ty, k) - Math.sin(Math.PI * k) * u * 3;
      const press = t > 0.6 && t < 0.66 ? 0.85 : 1;
      cursor.setAttribute(
        'transform',
        `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${press})`,
      );
      // Hover: the row lights up and its title turns link-blue.
      const hover = progress(t, 0.5, 0.56);
      target.hover.setAttribute('opacity', hover.toFixed(2));
      target.titleEl.setAttribute('fill', hover > 0.5 ? C.blue : C.text);
      // Click → the issue opens.
      const open = easeOut(progress(t, 0.64, 0.74));
      issue.setAttribute('opacity', open.toFixed(3));
      cursor.style.visibility = open >= 1 ? 'hidden' : '';
    },
  };
}
