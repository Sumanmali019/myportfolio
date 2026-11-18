/**
 * Chapter 09 monitor: the Tech Lead's day, one full-screen app at a time (the Jira board
 * comes from screens/standup-board.ts). Each screen plays across its own hold window and is a
 * pure function of hold progress, so it all plays backwards when you scroll up.
 *   dockerPanel   — afternoon: the stack comes up, container by container, logs streaming.
 *   backendEditor — evening: the SSE chat endpoint types out, the server reloads, tests pass.
 *   prReview      — night: a teammate's PR reviewed → checks pass → approved → merged.
 */
import type { Screen } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { screenFrame, setText, setTransform, svgEl, svgText, UI } from '../lib/svg';

/** A hold window, [start, end]. */
export type Window = [number, number];

/** Progress through the sub-span [a, b] (0–1) of a window. */
const within =
  ([w0, w1]: Window) =>
  (hold: number, a: number, b: number) =>
    progress(hold, w0 + (w1 - w0) * a, w0 + (w1 - w0) * b);

const MONO = 'ui-monospace, Menlo, Consolas, monospace';

/* ------------------------------------------------------------------ afternoon: Docker */

const CONTAINERS: Array<[string, string, string]> = [
  ['postgres', 'postgres:16', '5432'],
  ['redis', 'redis:7', '6379'],
  ['api', 'neura/api:2.4', '8000'],
  ['worker', 'neura/worker:2.4', '—'],
];
/** [position within the window, log line, colour]. */
const DOCKER_LOG: Array<[number, string, string]> = [
  [0, '$ docker compose up -d --build', UI.text],
  [0.08, '✔ Network neura_default   Created', UI.green],
  [0.16, '✔ Container postgres      Started', UI.green],
  [0.26, '✔ Container redis         Started', UI.green],
  [0.4, '✔ Container api           Started', UI.green],
  [0.52, '✔ Container worker        Started', UI.green],
  [0.64, 'api     | Uvicorn running on 0.0.0.0:8000', UI.blue],
  [0.74, 'worker  | ready · 4 queues', UI.blue],
  [0.84, 'api     | GET /health  200  3ms', UI.muted],
];

export function dockerPanel(rect: SVGGraphicsElement, win: Window): Screen {
  const at = within(win);
  const { g, x, y, w, h } = screenFrame(rect);
  const fs = Math.min(w / 42, h / 20);
  const left = x + fs;
  svgEl('rect', { x, y, width: w, height: h, fill: '#14182a' }, g);
  svgEl('rect', { x, y, width: w, height: fs * 2, fill: '#1d6fd0' }, g);
  svgText(g, left, y + fs * 1.35, 'Docker Desktop  ·  Containers  ·  neura-backend', {
    'font-size': fs * 0.85,
    fill: '#ffffff',
  });

  const cols = [0, 0.26, 0.52, 0.66, 0.84].map((c) => left + (w - fs * 2) * c);
  const headY = y + fs * 3.5;
  ['NAME', 'IMAGE', 'PORT', 'STATUS', 'CPU'].forEach((t, i) =>
    svgText(g, cols[i]!, headY, t, { 'font-size': fs * 0.65, fill: UI.muted }),
  );
  const rowH = fs * 1.9;
  const rows = CONTAINERS.map(([name, image, port], i) => {
    const ry = headY + fs * 0.7 + i * rowH;
    svgEl(
      'rect',
      { x: left, y: ry, width: w - fs * 2, height: rowH - fs * 0.3, rx: fs * 0.3, fill: UI.panel },
      g,
    );
    const ty = ry + rowH * 0.55;
    svgText(g, cols[0]! + fs * 0.4, ty, name, { 'font-size': fs * 0.8, fill: UI.text });
    svgText(g, cols[1]!, ty, image, {
      'font-size': fs * 0.72,
      fill: UI.muted,
      'font-family': MONO,
    });
    svgText(g, cols[2]!, ty, port, { 'font-size': fs * 0.72, fill: UI.muted, 'font-family': MONO });
    const dot = svgEl('circle', { cx: cols[3]! + fs * 0.35, cy: ty - fs * 0.25, r: fs * 0.32 }, g);
    const status = svgText(g, cols[3]! + fs * 0.9, ty, '', { 'font-size': fs * 0.72 });
    svgEl(
      'rect',
      {
        x: cols[4]!,
        y: ty - fs * 0.55,
        width: fs * 4.5,
        height: fs * 0.55,
        rx: fs * 0.27,
        fill: UI.line,
      },
      g,
    );
    const cpu = svgEl(
      'rect',
      { x: cols[4]!, y: ty - fs * 0.55, width: 0, height: fs * 0.55, rx: fs * 0.27, fill: UI.blue },
      g,
    );
    return { dot, status, cpu, start: 0.1 + i * 0.12 };
  });

  const logTop = headY + fs * 1 + CONTAINERS.length * rowH;
  svgEl(
    'rect',
    {
      x: left,
      y: logTop,
      width: w - fs * 2,
      height: y + h - logTop - fs * 0.8,
      rx: fs * 0.3,
      fill: '#0b0d16',
    },
    g,
  );
  const logRows = Math.max(1, Math.floor((y + h - logTop - fs * 1.4) / (fs * 1.15)));
  const logs = Array.from({ length: logRows }, (_, i) =>
    svgText(g, left + fs * 0.6, logTop + fs * (1.3 + i * 1.15), '', {
      'font-size': fs * 0.75,
      'font-family': MONO,
    }),
  );

  return {
    update({ hold, idle, reduced }) {
      rows.forEach((r, i) => {
        const k = at(hold, r.start, r.start + 0.12);
        const [label, color] =
          k >= 1 ? ['Running', UI.green] : k > 0 ? ['Starting', UI.amber] : ['Created', UI.muted];
        r.dot.setAttribute('fill', color);
        r.status.setAttribute('fill', color);
        setText(r.status, label);
        const load =
          k >= 1 ? (reduced ? 0.4 : 0.25 + 0.35 * Math.abs(Math.sin(idle * 1.3 + i * 1.9))) : 0;
        r.cpu.setAttribute('width', (fs * 4.5 * load).toFixed(1));
      });
      const shown = DOCKER_LOG.filter(([t]) => at(hold, t, t + 0.001) >= 1).slice(-logRows);
      logs.forEach((el, i) => {
        const row = shown[i];
        setText(el, row ? row[1] : '');
        if (row) el.setAttribute('fill', row[2]);
      });
    },
  };
}

/* ------------------------------------------------------------------ evening: backend */

/** [code, colour]. Typed out across the window. */
const CODE: Array<[string, string]> = [
  ['from fastapi import APIRouter', UI.purple],
  ['from sse_starlette import EventSourceResponse', UI.purple],
  ['', UI.text],
  ['router = APIRouter()', UI.text],
  ['', UI.text],
  ['@router.post("/chat/stream")', UI.amber],
  ['async def chat_stream(req: ChatRequest):', UI.blue],
  ['    async def tokens():', UI.blue],
  ['        async for t in llm.stream(req.prompt):', UI.text],
  ['            yield {"data": t}', UI.green],
  ['    return EventSourceResponse(tokens(), ping=15)', UI.text],
];
const FILES = [
  'app/',
  '  routes/',
  '    chat.py',
  '    tasks.py',
  '  llm.py',
  'tests/',
  'Dockerfile',
];
const SERVER_LOG: Array<[number, string, string]> = [
  [0.1, '$ uvicorn app.main:app --reload', UI.text],
  [0.55, 'WARNING  Reloading: chat.py changed', UI.amber],
  [0.7, 'POST /chat/stream  200  SSE  ▸ 214 tokens', UI.green],
  [0.82, '$ pytest -q', UI.text],
  [0.92, '18 passed in 2.41s', UI.green],
];

export function backendEditor(rect: SVGGraphicsElement, win: Window): Screen {
  const at = within(win);
  const { g, x, y, w, h } = screenFrame(rect);
  const fs = Math.min(w / 46, h / 22);
  svgEl('rect', { x, y, width: w, height: h, fill: '#1b1e2b' }, g);
  // File tree.
  const side = w * 0.2;
  svgEl('rect', { x, y, width: side, height: h, fill: '#151826' }, g);
  svgText(g, x + fs * 0.7, y + fs * 1.4, 'NEURA-BACKEND', {
    'font-size': fs * 0.62,
    fill: UI.muted,
  });
  FILES.forEach((f, i) => {
    const fy = y + fs * (3 + i * 1.35);
    const on = f.trim() === 'chat.py';
    if (on)
      svgEl('rect', { x, y: fy - fs * 0.95, width: side, height: fs * 1.3, fill: '#2b3150' }, g);
    svgText(g, x + fs * 0.7, fy, f, {
      'font-size': fs * 0.72,
      fill: on ? UI.text : UI.muted,
      'font-family': MONO,
    });
  });
  // Tab and code.
  const cx = x + side;
  svgEl('rect', { x: cx, y, width: fs * 6, height: fs * 1.8, fill: '#1b1e2b' }, g);
  svgEl('rect', { x: cx, y: y + fs * 1.8, width: w - side, height: 1, fill: UI.line }, g);
  svgText(g, cx + fs * 0.8, y + fs * 1.25, 'chat.py', { 'font-size': fs * 0.75, fill: UI.text });
  const termH = h * 0.3;
  const lineH = Math.min(fs * 1.3, (h - termH - fs * 3) / CODE.length);
  const lines = CODE.map(([, color], i) => {
    const ly = y + fs * 3.2 + i * lineH;
    svgText(g, cx + fs * 0.6, ly, String(i + 1).padStart(2, ' '), {
      'font-size': fs * 0.7,
      fill: '#565d7a',
      'font-family': MONO,
    });
    return svgText(g, cx + fs * 2.6, ly, '', {
      'font-size': fs * 0.8,
      fill: color,
      'font-family': MONO,
      // Keep the code's indentation.
      style: 'white-space: pre',
    });
  });
  const total = CODE.reduce((n, [c]) => n + c.length, 0);
  const caret = svgEl(
    'rect',
    { x: 0, y: 0, width: fs * 0.12, height: fs * 0.95, fill: UI.text },
    g,
  );
  // Terminal.
  const ty = y + h - termH;
  svgEl('rect', { x: cx, y: ty, width: w - side, height: termH, fill: '#11131d' }, g);
  svgText(g, cx + fs * 0.8, ty + fs * 1.1, 'TERMINAL', { 'font-size': fs * 0.6, fill: UI.muted });
  const termRows = Math.max(1, Math.floor((termH - fs * 1.6) / (fs * 1.1)));
  const term = Array.from({ length: termRows }, (_, i) =>
    svgText(g, cx + fs * 0.8, ty + fs * (2.4 + i * 1.1), '', {
      'font-size': fs * 0.72,
      'font-family': MONO,
    }),
  );
  // Rough monospace advance, for the caret.
  const adv = fs * 0.8 * 0.6;

  return {
    update({ hold }) {
      let left = Math.round(total * at(hold, 0.05, 0.6));
      let ci = CODE.length - 1;
      let cn = CODE[ci]![0].length;
      let found = false;
      for (let i = 0; i < CODE.length; i++) {
        const code = CODE[i]![0];
        const n = Math.max(0, Math.min(code.length, left));
        left -= code.length;
        setText(lines[i]!, code.slice(0, n));
        if (n < code.length && !found) {
          found = true;
          ci = i;
          cn = n;
        }
      }
      caret.setAttribute('x', (cx + fs * 2.6 + cn * adv).toFixed(1));
      caret.setAttribute('y', (y + fs * 3.2 + ci * lineH - fs * 0.75).toFixed(1));
      const shown = SERVER_LOG.filter(([t]) => at(hold, t, t + 0.001) >= 1).slice(-termRows);
      term.forEach((el, i) => {
        const row = shown[i];
        setText(el, row ? row[1] : '');
        if (row) el.setAttribute('fill', row[2]);
      });
    },
  };
}

/* ------------------------------------------------------------------ night: GitHub */

const DIFF: Array<[string, string]> = [
  [' ', 'async def chat(req):'],
  ['-', '    return await llm.complete(req)'],
  ['+', '    stream = llm.stream(req)'],
  ['+', '    return EventSourceResponse(stream)'],
];
const COMMENTS: Array<[string, string, string]> = [
  ['you', 'Add a timeout on the stream?', UI.green],
  ['rajat', 'Done — 30 s, with a retry.', UI.blue],
];
const CHECKS = ['lint', 'tests', 'docker build'];
const PILL: Array<[string, string]> = [
  ['Review requested', UI.amber],
  ['Approved', UI.green],
  ['Merged', UI.purple],
];

export function prReview(rect: SVGGraphicsElement, win: Window): Screen {
  const at = within(win);
  const { g, x, y, w, h } = screenFrame(rect);
  const fs = Math.min(w / 40, h / 16);
  const left = x + fs;
  svgEl('rect', { x, y, width: w, height: h, fill: UI.bg }, g);
  svgEl('rect', { x, y, width: w, height: fs * 1.9, fill: UI.panel }, g);
  svgText(g, left, y + fs * 1.3, 'GitHub  ·  neura-dynamics/backend  ·  pull request #490', {
    'font-size': fs * 0.78,
    fill: UI.muted,
  });
  svgText(g, left, y + fs * 3.4, 'feat: stream chat tokens over SSE', {
    'font-size': fs * 1.1,
    fill: UI.text,
  });
  const pill = svgEl(
    'rect',
    { x: left, y: y + fs * 4.2, width: fs * 8.6, height: fs * 1.45, rx: fs * 0.72, fill: UI.amber },
    g,
  );
  const pillText = svgText(g, left + fs * 0.6, y + fs * 5.23, PILL[0]![0], {
    'font-size': fs * 0.78,
    fill: '#1d2133',
  });

  // The diff under review.
  const dy = y + fs * 6.6;
  const dw = w * 0.6 - fs;
  svgEl('rect', { x: left, y: dy, width: dw, height: fs * 4.6, rx: fs * 0.25, fill: '#141827' }, g);
  DIFF.forEach(([sign, code], i) => {
    const ly = dy + fs * (0.35 + i * 1.05);
    const tint = sign === '+' ? '#1f3a2c' : sign === '-' ? '#3d2026' : 'none';
    if (tint !== 'none') svgEl('rect', { x: left, y: ly, width: dw, height: fs, fill: tint }, g);
    svgText(g, left + fs * 0.3, ly + fs * 0.75, `${sign} ${code}`, {
      'font-size': fs * 0.7,
      fill: sign === '+' ? UI.green : sign === '-' ? UI.red : UI.muted,
      'font-family': MONO,
    });
  });

  // Review thread beside the diff.
  const cx = x + w * 0.6 + fs * 0.4;
  const cw = w - (cx - x) - fs * 0.6;
  const comments = COMMENTS.map(([who, text, color], i) => {
    const cy = dy + i * fs * 2.4;
    const cg = svgEl('g', {}, g);
    svgEl('circle', { cx: cx + fs * 0.55, cy: cy + fs * 0.6, r: fs * 0.55, fill: color }, cg);
    svgEl(
      'rect',
      {
        x: cx + fs * 1.4,
        y: cy,
        width: cw - fs * 1.4,
        height: fs * 2,
        rx: fs * 0.25,
        fill: UI.panel,
      },
      cg,
    );
    svgText(cg, cx + fs * 1.7, cy + fs * 0.75, who, { 'font-size': fs * 0.6, fill: UI.muted });
    svgText(cg, cx + fs * 1.7, cy + fs * 1.6, text, { 'font-size': fs * 0.62, fill: UI.text });
    cg.style.transformOrigin = `${cx}px ${cy}px`;
    return cg;
  });

  // Checks, then the merge.
  const ky = y + fs * 12.3;
  const checks = CHECKS.map((name, i) => {
    const kx = left + i * fs * 6.2;
    const dot = svgEl('circle', { cx: kx + fs * 0.45, cy: ky, r: fs * 0.42, fill: UI.amber }, g);
    const label = svgText(g, kx + fs * 1.1, ky + fs * 0.27, `${name} …`, {
      'font-size': fs * 0.7,
      fill: UI.muted,
    });
    return { dot, label, name };
  });
  const btnY = y + h - fs * 2.2;
  const btn = svgEl(
    'rect',
    { x: left, y: btnY, width: fs * 9, height: fs * 1.6, rx: fs * 0.3, fill: UI.green },
    g,
  );
  const btnText = svgText(g, left + fs * 0.7, btnY + fs * 1.1, 'Squash and merge', {
    'font-size': fs * 0.78,
    fill: '#10251a',
  });
  const stamp = svgEl('g', {}, g);
  const sx = x + w * 0.7;
  const sy = btnY - fs * 0.8;
  svgEl(
    'rect',
    {
      x: sx - fs * 4.2,
      y: sy - fs * 1.2,
      width: fs * 8.4,
      height: fs * 2.4,
      rx: fs * 0.5,
      fill: 'none',
      stroke: UI.purple,
      'stroke-width': fs * 0.22,
    },
    stamp,
  );
  svgText(stamp, sx, sy + fs * 0.45, 'MERGED', {
    'font-size': fs * 1.3,
    fill: UI.purple,
    'text-anchor': 'middle',
    'font-weight': 700,
    'letter-spacing': fs * 0.15,
  });
  stamp.style.transformOrigin = `${sx}px ${sy}px`;

  return {
    update({ hold }) {
      comments.forEach((c, i) => {
        const k = easeOut(at(hold, 0.08 + i * 0.14, 0.18 + i * 0.14), 1.4);
        setTransform(c, k >= 1 ? '' : `scale(${k.toFixed(3)})`);
        c.style.visibility = k <= 0 ? 'hidden' : '';
      });
      checks.forEach((c, i) => {
        const ok = at(hold, 0.4 + i * 0.08, 0.42 + i * 0.08) >= 1;
        c.dot.setAttribute('fill', ok ? UI.green : UI.amber);
        setText(c.label, ok ? `${c.name} ✓` : `${c.name} …`);
      });
      const approved = at(hold, 0.66, 0.68) >= 1;
      const merged = at(hold, 0.8, 0.82) >= 1;
      const [label, color] = PILL[merged ? 2 : approved ? 1 : 0]!;
      pill.setAttribute('fill', color);
      setText(pillText, label);
      btn.setAttribute('fill', merged ? UI.panel : approved ? UI.green : UI.line);
      setText(btnText, merged ? 'Merged ✓' : 'Squash and merge');
      btnText.setAttribute('fill', merged ? UI.text : '#10251a');
      const k = easeOut(at(hold, 0.8, 0.9), 1.8);
      setTransform(stamp, k >= 1 ? 'rotate(-6deg)' : `rotate(-6deg) scale(${(2 - k).toFixed(3)})`);
      stamp.style.opacity = k.toFixed(3);
      stamp.style.visibility = k <= 0 ? 'hidden' : '';
    },
  };
}
