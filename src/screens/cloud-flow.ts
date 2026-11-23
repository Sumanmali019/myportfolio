/**
 * Chapter 09a monitor: each cloud / CI/CD platform's own UI, played slowly after its real
 * screenshots have flashed by (content/showcase.ts `ciCdShowcase`, screens/app-build.ts):
 *   azurePortal    Azure (the cloud): a resource group, storage and Azure Front Door built up
 *                  behind a custom domain, then the edge serving requests.
 *   cloudRunDeploy Google Cloud: a Cloud Run rollout (build, push, deploy, route traffic) and the
 *                  service picking up requests on new instances.
 *   azureDevOps    Azure DevOps (repos, tests, CI/CD): a merge to main, the Cypress tests, then a
 *                  release deploying stage by stage, its log streaming.
 *   githubActions  GitHub Actions: the CI workflow's jobs ticking green, then the deploy.
 * Each is a pure function of hold progress inside its window (so it reverses on scroll) and ends
 * with a stamp. Nothing here is a real id, account or hostname.
 */
import type { Screen } from '../engine/types';
import { easeInOut, easeOut, progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText, UI } from '../lib/svg';

/** A hold window, [start, end]. */
export type Window = [number, number];

const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const GREEN = '#3fb950';

type Status = 'todo' | 'run' | 'done';

/** The screen's frame, header bar and the fade-up from the screenshots before it. */
function chrome(rect: SVGGraphicsElement, title: string, bar: string, win: Window, until: number) {
  const f = screenFrame(rect);
  const { g, x, y, w, h } = f;
  const fs = Math.min(w / 42, h / 20);
  svgEl('rect', { x, y, width: w, height: h, fill: '#12151f' }, g);
  svgEl('rect', { x, y, width: w, height: fs * 2, fill: bar }, g);
  svgText(g, x + fs, y + fs * 1.35, title, { 'font-size': fs * 0.85, fill: '#ffffff' });
  /** Show only inside its time on the monitor; fade in as it starts. */
  const visible = (hold: number, reduced: boolean) => {
    const on = hold >= win[0] && hold < until;
    g.style.display = on ? '' : 'none';
    if (on)
      g.setAttribute(
        'opacity',
        (reduced
          ? 1
          : easeInOut(progress(hold, win[0], win[0] + (win[1] - win[0]) * 0.04))
        ).toFixed(3),
      );
    return on;
  };
  return { ...f, fs, visible, top: y + fs * 2 };
}

/** A tilted stamp that lands at progress `at` of the window. */
function stamp(g: SVGGElement, cx: number, cy: number, fs: number, label: string, color: string) {
  const s = svgEl('g', {}, g);
  svgEl(
    'rect',
    {
      x: cx - fs * 5,
      y: cy - fs * 1.2,
      width: fs * 10,
      height: fs * 2.2,
      rx: fs * 0.4,
      fill: '#12151f',
      'fill-opacity': 0.92,
      stroke: color,
      'stroke-width': fs * 0.18,
      transform: `rotate(-8 ${cx} ${cy})`,
    },
    s,
  );
  svgText(s, cx, cy + fs * 0.35, label, {
    'font-size': fs * 0.95,
    fill: color,
    'text-anchor': 'middle',
    transform: `rotate(-8 ${cx} ${cy})`,
    class: 'title-text',
  });
  return {
    show(k: number) {
      s.style.visibility = k > 0 ? '' : 'hidden';
      s.setAttribute('opacity', k.toFixed(2));
    },
  };
}

/** A status dot: grey (todo), pulsing amber (running), green (done). */
function paint(dot: SVGElement, s: Status, idle: number, reduced: boolean, run: string = UI.amber) {
  dot.setAttribute('fill', s === 'done' ? GREEN : s === 'run' ? run : '#3a405c');
  dot.setAttribute(
    'opacity',
    s === 'run' && !reduced ? (0.55 + 0.45 * Math.abs(Math.sin(idle * 3))).toFixed(2) : '1',
  );
}

/** Streaming log rows: the last `rows` lines whose time has come. */
function logPanel(g: SVGGElement, px: number, py: number, pw: number, ph: number, fs: number) {
  svgEl('rect', { x: px, y: py, width: pw, height: ph, rx: fs * 0.3, fill: '#0b0d16' }, g);
  const rows = Math.max(1, Math.floor((ph - fs * 1.2) / (fs * 1.2)));
  const texts = Array.from({ length: rows }, (_, i) =>
    svgText(g, px + fs * 0.7, py + fs * (1.5 + i * 1.2), '', {
      'font-size': fs * 0.74,
      'font-family': MONO,
    }),
  );
  return (lines: Array<[string, string]>) =>
    texts.forEach((t, i) => {
      const l = lines[Math.max(0, lines.length - rows) + i];
      setText(t, l ? l[0] : '');
      t.setAttribute('fill', l ? l[1] : UI.text);
    });
}

/* ------------------------------------------------------------------ Azure DevOps */

const AZURE_STAGES: Array<[string, Window, string]> = [
  ['Verify Release', [0.04, 0.1], '22s'],
  ['Run Cypress tests', [0.1, 0.26], '3m 05s'],
  ['Deploy Backend', [0.26, 0.4], '58s'],
  ['Deploy Admin Frontend', [0.4, 0.62], '4m 12s'],
  ['Deploy Classroom Frontend', [0.62, 0.74], '1m 11s'],
  ['Deploy Teacher Frontend', [0.74, 0.86], '1m 40s'],
];
const AZURE_LOG: Array<[number, string, string]> = [
  [0.04, '▶ Starting: Verify Release Candidate', UI.text],
  [0.08, '✔ Release candidate verified', UI.green],
  [0.1, '▶ Starting: Run Cypress tests', UI.text],
  [0.14, 'git checkout main · npm ci', UI.muted],
  [0.18, 'cypress run --browser chrome', UI.blue],
  [0.23, '✔ All specs passed', UI.green],
  [0.26, '▶ Starting: Deploy Backend to Production', UI.text],
  [0.32, 'Pulling the image and rolling out the pods…', UI.muted],
  [0.38, '✔ Backend deployed to production', UI.green],
  [0.4, '▶ Starting: Deploy Admin Frontend', UI.text],
  [0.46, 'npm ci && npm run build', UI.muted],
  [0.52, 'az storage blob upload-batch --destination $web', UI.blue],
  [0.58, '✔ Admin frontend uploaded to Azure Storage', UI.green],
  [0.6, 'Purging the Front Door cache…', UI.muted],
  [0.62, '▶ Starting: Deploy Classroom Frontend', UI.text],
  [0.72, '✔ Classroom frontend deployed', UI.green],
  [0.74, '▶ Starting: Deploy Teacher Frontend', UI.text],
  [0.84, '✔ Teacher frontend deployed', UI.green],
  [0.88, 'Run succeeded · every stage green', UI.green],
];
export function azureDevOps(rect: SVGGraphicsElement, win: Window, until = win[1]): Screen {
  const c = chrome(rect, 'Azure DevOps  ·  Repos  ·  Tests  ·  Pipelines', '#0078d4', win, until);
  const { g, x, y, w, h, fs, top } = c;
  const at = (hold: number, a: number, b: number) =>
    progress(hold, win[0] + (win[1] - win[0]) * a, win[0] + (win[1] - win[0]) * b);
  const left = x + fs;
  const listW = w * 0.42;
  svgText(g, left, top + fs * 1.8, 'Release #214', {
    'font-size': fs * 1.15,
    fill: UI.text,
    class: 'title-text',
  });
  svgText(g, left, top + fs * 3, 'Merged to main · tests, then deploy', {
    'font-size': fs * 0.7,
    fill: UI.muted,
  });
  const rows = AZURE_STAGES.map(([name, , dur], i) => {
    const ry = top + fs * (4.4 + i * 2.2);
    svgEl(
      'rect',
      { x: left, y: ry - fs * 1.25, width: listW, height: fs * 1.9, rx: fs * 0.3, fill: UI.panel },
      g,
    );
    const dot = svgEl('circle', { cx: left + fs * 0.9, cy: ry - fs * 0.3, r: fs * 0.4 }, g);
    svgText(g, left + fs * 1.8, ry, name, { 'font-size': fs * 0.74, fill: UI.text });
    const time = svgText(g, left + listW - fs * 0.6, ry, dur, {
      'font-size': fs * 0.7,
      fill: UI.muted,
      'text-anchor': 'end',
    });
    return { dot, time };
  });
  const lx = left + listW + fs * 1.2;
  const lw = x + w - fs - lx;
  const title = svgText(g, lx, top + fs * 1.8, '', {
    'font-size': fs * 1.05,
    fill: UI.text,
    class: 'title-text',
  });
  const showLog = logPanel(g, lx, top + fs * 3, lw, h - fs * 2 - fs * 3.6 - fs, fs);
  const done = stamp(g, x + w - fs * 6.5, y + fs * 1, fs, 'DEPLOYED', GREEN);

  return {
    update({ hold, idle, reduced }) {
      if (!c.visible(hold, reduced)) return;
      let current = 0;
      AZURE_STAGES.forEach(([, [a, b]], i) => {
        const t = at(hold, a, b);
        const s: Status = t >= 1 ? 'done' : t > 0 ? 'run' : 'todo';
        if (s !== 'todo') current = i;
        paint(rows[i]!.dot, s, idle, reduced, '#2899f5');
        rows[i]!.time.style.visibility = s === 'done' ? '' : 'hidden';
      });
      setText(
        title,
        hold < win[0] + (win[1] - win[0]) * 0.04 ? 'Starting…' : AZURE_STAGES[current]![0],
      );
      showLog(AZURE_LOG.filter(([t]) => at(hold, t, t + 0.001) >= 1).map(([, s, col]) => [s, col]));
      done.show(easeOut(at(hold, 0.9, 0.95), 1.6));
    },
  };
}

/* ------------------------------------------------------------------ Azure (cloud) */

const PORTAL_STEPS: Array<[string, Window]> = [
  ['Create the resource group', [0.04, 0.18]],
  ['Provision site storage', [0.18, 0.36]],
  ['Create the Front Door profile', [0.36, 0.56]],
  ['Add custom domain + TLS', [0.56, 0.72]],
  ['Route traffic to the origin', [0.72, 0.86]],
];
const PORTAL_TILES = ['Storage', 'Front Door', 'Domain', 'Monitor'];

export function azurePortal(rect: SVGGraphicsElement, win: Window, until = win[1]): Screen {
  const c = chrome(
    rect,
    'Microsoft Azure  ·  Resource groups  ·  Front Door',
    '#0078d4',
    win,
    until,
  );
  const { g, x, y, w, h, fs, top } = c;
  const at = (hold: number, a: number, b: number) =>
    progress(hold, win[0] + (win[1] - win[0]) * a, win[0] + (win[1] - win[0]) * b);
  const left = x + fs;
  const listW = w * 0.36;
  svgText(g, left, top + fs * 1.8, 'Building the environment', {
    'font-size': fs * 1.05,
    fill: UI.text,
    class: 'title-text',
  });
  const rows = PORTAL_STEPS.map(([name], i) => {
    const ry = top + fs * (4 + i * 2.2);
    svgEl(
      'rect',
      { x: left, y: ry - fs * 1.25, width: listW, height: fs * 1.9, rx: fs * 0.3, fill: UI.panel },
      g,
    );
    const dot = svgEl('circle', { cx: left + fs * 0.9, cy: ry - fs * 0.3, r: fs * 0.4 }, g);
    svgText(g, left + fs * 1.8, ry, name, { 'font-size': fs * 0.74, fill: UI.text });
    return { dot };
  });

  // The Front Door card: its state, resource group and domain.
  const rx = left + listW + fs * 1.2;
  const rw = x + w - fs - rx;
  svgEl(
    'rect',
    { x: rx, y: top + fs * 0.8, width: rw, height: fs * 4.4, rx: fs * 0.4, fill: UI.panel },
    g,
  );
  svgText(g, rx + fs, top + fs * 2.4, 'Front Door', {
    'font-size': fs * 1.2,
    fill: UI.text,
    class: 'title-text',
  });
  const state = svgText(g, rx + rw - fs, top + fs * 2.4, '', {
    'font-size': fs * 0.8,
    'text-anchor': 'end',
  });
  svgText(g, rx + fs, top + fs * 4, 'app-prod  ·  UAE North  ·  app.example.com', {
    'font-size': fs * 0.68,
    fill: UI.muted,
    'font-family': MONO,
  });

  // The resources it adds up to.
  const iy = top + fs * 6.6;
  svgText(g, rx, iy, 'Resources', { 'font-size': fs * 0.7, fill: UI.muted });
  const tw = (rw - fs * 1.5) / 4;
  const tiles = PORTAL_TILES.map((name, i) => {
    const tx = rx + i * (tw + fs * 0.5);
    const r = svgEl(
      'rect',
      { x: tx, y: iy + fs * 0.5, width: tw, height: fs * 2.2, rx: fs * 0.3, fill: '#2a3048' },
      g,
    );
    svgText(g, tx + tw / 2, iy + fs * 1.9, name, {
      'font-size': fs * 0.62,
      fill: UI.text,
      'text-anchor': 'middle',
    });
    return r;
  });

  // The traffic it serves, from the edge.
  const cy = iy + fs * 4.2;
  const edge = svgText(g, rx, cy, '', { 'font-size': fs * 0.7, fill: UI.muted });
  const free = y + h - fs * 1.2 - (cy + fs * 0.6);
  const chartH = Math.min(fs * 5, Math.max(fs * 3, free));
  const bars = Array.from({ length: 24 }, (_, i) =>
    svgEl(
      'rect',
      {
        x: rx + i * (rw / 24),
        y: cy + fs * 0.6 + chartH,
        width: (rw / 24) * 0.7,
        height: 0,
        fill: '#2899f5',
      },
      g,
    ),
  );
  const done = stamp(g, x + w - fs * 6.5, y + fs * 1, fs, 'LIVE', '#2899f5');

  return {
    update({ hold, idle, reduced }) {
      if (!c.visible(hold, reduced)) return;
      PORTAL_STEPS.forEach(([, [a, b]], i) => {
        const t = at(hold, a, b);
        paint(rows[i]!.dot, t >= 1 ? 'done' : t > 0 ? 'run' : 'todo', idle, reduced, '#2899f5');
      });
      const created = at(hold, 0.36, 0.56);
      const domain = at(hold, 0.56, 0.72);
      setText(
        state,
        domain >= 1
          ? '● Active'
          : domain > 0
            ? '● Validating domain'
            : created > 0
              ? '● Provisioning'
              : '● Not created',
      );
      state.setAttribute(
        'fill',
        domain >= 1 ? GREEN : domain > 0 || created > 0 ? UI.amber : UI.muted,
      );
      // A tile lights as its step finishes.
      [0.36, 0.56, 0.72, 0.86].forEach((end, i) =>
        tiles[i]!.setAttribute('fill', at(hold, end - 0.02, end) >= 1 ? '#2d7f46' : '#2a3048'),
      );
      const routed = at(hold, 0.72, 0.86);
      setText(edge, `Edge requests  ·  cache hit ${Math.round(routed * 94)}%`);
      bars.forEach((b, i) => {
        const arrive = at(hold, 0.72 + i * 0.006, 0.76 + i * 0.006);
        const wob = reduced ? 0.7 : 0.55 + 0.35 * Math.abs(Math.sin(idle * 1.4 + i * 1.7));
        const bh = chartH * arrive * wob * (0.4 + 0.6 * routed);
        b.setAttribute('height', bh.toFixed(1));
        b.setAttribute('y', (cy + fs * 0.6 + chartH - bh).toFixed(1));
      });
      done.show(easeOut(at(hold, 0.9, 0.95), 1.6));
    },
  };
}

/* ------------------------------------------------------------------ Google Cloud */

const RUN_STEPS: Array<[string, Window]> = [
  ['Build the container image', [0.04, 0.2]],
  ['Push to Artifact Registry', [0.2, 0.36]],
  ['Deploy revision api-00042', [0.36, 0.56]],
  ['Route 100% of traffic', [0.56, 0.74]],
  ['Health check passed', [0.74, 0.86]],
];

export function cloudRunDeploy(rect: SVGGraphicsElement, win: Window, until = win[1]): Screen {
  const c = chrome(
    rect,
    'Google Cloud  ·  Cloud Run  ·  api  ·  asia-south1',
    '#1a73e8',
    win,
    until,
  );
  const { g, x, y, w, h, fs, top } = c;
  const at = (hold: number, a: number, b: number) =>
    progress(hold, win[0] + (win[1] - win[0]) * a, win[0] + (win[1] - win[0]) * b);
  const left = x + fs;
  const listW = w * 0.36;
  svgText(g, left, top + fs * 1.8, 'Deploying a new revision', {
    'font-size': fs * 1.05,
    fill: UI.text,
    class: 'title-text',
  });
  const rows = RUN_STEPS.map(([name], i) => {
    const ry = top + fs * (4 + i * 2.2);
    svgEl(
      'rect',
      { x: left, y: ry - fs * 1.25, width: listW, height: fs * 1.9, rx: fs * 0.3, fill: UI.panel },
      g,
    );
    const dot = svgEl('circle', { cx: left + fs * 0.9, cy: ry - fs * 0.3, r: fs * 0.4 }, g);
    svgText(g, left + fs * 1.8, ry, name, { 'font-size': fs * 0.74, fill: UI.text });
    return { dot };
  });

  // The service card: the revision serving, and the traffic split.
  const rx = left + listW + fs * 1.2;
  const rw = x + w - fs - rx;
  svgEl(
    'rect',
    { x: rx, y: top + fs * 0.8, width: rw, height: fs * 5.2, rx: fs * 0.4, fill: UI.panel },
    g,
  );
  svgText(g, rx + fs, top + fs * 2.4, 'api', {
    'font-size': fs * 1.2,
    fill: UI.text,
    class: 'title-text',
  });
  const state = svgText(g, rx + rw - fs, top + fs * 2.4, '', {
    'font-size': fs * 0.8,
    'text-anchor': 'end',
  });
  svgText(g, rx + fs, top + fs * 3.6, 'Traffic', { 'font-size': fs * 0.7, fill: UI.muted });
  const barX = rx + fs * 4;
  const barW = rw - fs * 5;
  svgEl(
    'rect',
    { x: barX, y: top + fs * 3, width: barW, height: fs * 0.8, rx: fs * 0.4, fill: '#2a3048' },
    g,
  );
  const oldBar = svgEl(
    'rect',
    { x: barX, y: top + fs * 3, width: barW, height: fs * 0.8, rx: fs * 0.4, fill: '#8a90ad' },
    g,
  );
  const newBar = svgEl(
    'rect',
    { x: barX, y: top + fs * 3, width: 0, height: fs * 0.8, rx: fs * 0.4, fill: '#4285f4' },
    g,
  );
  const split = svgText(g, rx + fs, top + fs * 5, '', {
    'font-size': fs * 0.72,
    fill: UI.muted,
    'font-family': MONO,
  });

  // Instances, then the requests they take.
  const iy = top + fs * 7.4;
  svgText(g, rx, iy, 'Container instances', { 'font-size': fs * 0.7, fill: UI.muted });
  const insts = Array.from({ length: 4 }, (_, i) =>
    svgEl(
      'rect',
      {
        x: rx + i * fs * 2.2,
        y: iy + fs * 0.6,
        width: fs * 1.8,
        height: fs * 1.8,
        rx: fs * 0.3,
        fill: '#2a3048',
      },
      g,
    ),
  );
  const cy = iy + fs * 4.2;
  svgText(g, rx, cy, 'Requests', { 'font-size': fs * 0.7, fill: UI.muted });
  const free = y + h - fs * 1.2 - (cy + fs * 0.6);
  const chartH = Math.min(fs * 6, Math.max(fs * 3, free));
  const bars = Array.from({ length: 24 }, (_, i) =>
    svgEl(
      'rect',
      {
        x: rx + i * (rw / 24),
        y: cy + fs * 0.6 + chartH,
        width: (rw / 24) * 0.7,
        height: 0,
        fill: '#4285f4',
      },
      g,
    ),
  );
  const done = stamp(g, x + w - fs * 6.5, y + fs * 1, fs, 'RUNNING', '#4285f4');

  return {
    update({ hold, idle, reduced }) {
      if (!c.visible(hold, reduced)) return;
      RUN_STEPS.forEach(([, [a, b]], i) => {
        const t = at(hold, a, b);
        paint(rows[i]!.dot, t >= 1 ? 'done' : t > 0 ? 'run' : 'todo', idle, reduced, '#4285f4');
      });
      const rolled = at(hold, 0.56, 0.74); // traffic moves to the new revision
      const deployed = at(hold, 0.36, 0.56) >= 1;
      setText(
        state,
        rolled >= 1
          ? '● Serving api-00042'
          : deployed
            ? '● Starting api-00042'
            : '● Serving api-00041',
      );
      state.setAttribute('fill', rolled >= 1 ? GREEN : deployed ? UI.amber : UI.muted);
      oldBar.setAttribute('width', (barW * (1 - rolled)).toFixed(1));
      oldBar.setAttribute('x', (barX + barW * rolled).toFixed(1));
      newBar.setAttribute('width', (barW * rolled).toFixed(1));
      setText(
        split,
        `api-00041  ${Math.round((1 - rolled) * 100)}%   ·   api-00042  ${Math.round(rolled * 100)}%`,
      );
      // Instances start as the revision deploys.
      insts.forEach((r, i) => {
        const on = at(hold, 0.4 + i * 0.05, 0.43 + i * 0.05) >= 1 && (i < 3 || rolled >= 1);
        r.setAttribute('fill', on ? '#34a853' : '#2a3048');
      });
      // Requests build up as traffic arrives.
      bars.forEach((b, i) => {
        const arrive = at(hold, 0.58 + i * 0.012, 0.62 + i * 0.012);
        const wob = reduced ? 0.7 : 0.55 + 0.35 * Math.abs(Math.sin(idle * 1.4 + i * 1.7));
        const bh = chartH * arrive * wob * (0.4 + 0.6 * rolled);
        b.setAttribute('height', bh.toFixed(1));
        b.setAttribute('y', (cy + fs * 0.6 + chartH - bh).toFixed(1));
      });
      done.show(easeOut(at(hold, 0.9, 0.95), 1.6));
    },
  };
}

/* ------------------------------------------------------------------ GitHub Actions */

const GH_JOBS: Array<[string, string, string]> = [
  ['Lint', '✔ eslint · prettier: no issues', '14s'],
  ['Typecheck', '✔ astro check: 0 errors', '21s'],
  ['Unit tests', '✔ unit tests passed', '8s'],
  ['Build + size budgets', '✔ built, every budget met', '38s'],
  ['E2E tests', '✔ playwright: 36 passed', '37s'],
  ['Lighthouse CI', '✔ performance and a11y budgets met', '39s'],
  ['Deploy to GitHub Pages', '✔ site deployed', '9s'],
];

export function githubActions(rect: SVGGraphicsElement, win: Window, until = win[1]): Screen {
  const c = chrome(rect, 'GitHub  ·  Actions  ·  CI  ·  on push to main', '#24292f', win, until);
  const { g, x, y, w, h, fs, top } = c;
  const at = (hold: number, a: number, b: number) =>
    progress(hold, win[0] + (win[1] - win[0]) * a, win[0] + (win[1] - win[0]) * b);
  const left = x + fs;
  const listW = w * 0.42;
  const n = GH_JOBS.length;
  const span = 0.84 / n;
  const win0 = (i: number): Window => [0.04 + i * span, 0.04 + (i + 1) * span];
  svgText(g, left, top + fs * 1.8, 'CI workflow', {
    'font-size': fs * 1.15,
    fill: UI.text,
    class: 'title-text',
  });
  const summary = svgText(g, left, top + fs * 3, '', { 'font-size': fs * 0.75, fill: UI.muted });
  const rows = GH_JOBS.map(([name, , dur], i) => {
    const ry = top + fs * (4.6 + i * 1.95);
    svgEl(
      'rect',
      { x: left, y: ry - fs * 1.15, width: listW, height: fs * 1.7, rx: fs * 0.3, fill: UI.panel },
      g,
    );
    const dot = svgEl('circle', { cx: left + fs * 0.9, cy: ry - fs * 0.3, r: fs * 0.38 }, g);
    svgText(g, left + fs * 1.8, ry, name, { 'font-size': fs * 0.76, fill: UI.text });
    const time = svgText(g, left + listW - fs * 0.6, ry, dur, {
      'font-size': fs * 0.68,
      fill: UI.muted,
      'text-anchor': 'end',
    });
    return { dot, time };
  });
  const lx = left + listW + fs * 1.2;
  const lw = x + w - fs - lx;
  const barY = top + fs * 1.4;
  svgEl('rect', { x: lx, y: barY, width: lw, height: fs * 0.7, rx: fs * 0.35, fill: '#2a3048' }, g);
  const bar = svgEl(
    'rect',
    { x: lx, y: barY, width: 0, height: fs * 0.7, rx: fs * 0.35, fill: GREEN },
    g,
  );
  const showLog = logPanel(g, lx, top + fs * 3, lw, h - fs * 2 - fs * 3.6 - fs, fs);
  const done = stamp(g, x + w - fs * 6.5, y + fs * 1, fs, 'CI · passing', GREEN);

  return {
    update({ hold, idle, reduced }) {
      if (!c.visible(hold, reduced)) return;
      let finished = 0;
      const lines: Array<[string, string]> = [];
      GH_JOBS.forEach(([name, ok], i) => {
        const [a, b] = win0(i);
        const t = at(hold, a, b);
        const s: Status = t >= 1 ? 'done' : t > 0 ? 'run' : 'todo';
        if (s === 'done') finished++;
        paint(rows[i]!.dot, s, idle, reduced);
        rows[i]!.time.style.visibility = s === 'done' ? '' : 'hidden';
        if (s !== 'todo') lines.push([`▶ ${name}`, UI.text]);
        if (t >= 0.7) lines.push([ok, UI.green]);
      });
      setText(summary, `${finished} of ${n} jobs passed`);
      bar.setAttribute('width', (lw * (finished / n)).toFixed(1));
      showLog(lines);
      done.show(easeOut(at(hold, 0.9, 0.95), 1.6));
    },
  };
}
