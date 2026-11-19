/**
 * Chapter 09b, after the apps: MeritHyre's Twilio SMS integration, on the monitor — the
 * integrations page dims, the Twilio SMS dialog opens and its A2P 10DLC onboarding ticks off
 * step by step (subaccount → number → Trust Hub profiles → brand → campaign), the connection
 * tests OK and it saves. Drawn from the real dialog Suman built; driven by hold progress inside
 * `win`, so it reverses on scroll.
 */
import type { Screen } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText } from '../lib/svg';

export type Window = [number, number];

const STEPS: Array<[string, string]> = [
  ['Create subaccount', 'Twilio subaccount for your organization'],
  ['Purchase a phone number', 'SMS-capable number and Messaging Service linked'],
  ['Customer profiles (Trust Hub)', 'Secondary + A2P bundles submitted and approved'],
  ['Brand registration (APPROVED)', 'Brand registration approved'],
  ['A2P campaign (Verified)', 'Campaign approved (verified)'],
];

const TWILIO_RED = '#f22f46';

/** Twilio's mark: a ring with four dots, outer radius `r`, centred at (cx, cy). */
function twilioMark(parent: Element, cx: number, cy: number, r: number): void {
  const g = svgEl('g', {}, parent);
  svgEl(
    'circle',
    { cx, cy, r: r * 0.867, fill: 'none', stroke: TWILIO_RED, 'stroke-width': r * 0.265 },
    g,
  );
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    svgEl(
      'circle',
      { cx: cx + dx * r * 0.25, cy: cy + dy * r * 0.25, r: r * 0.208, fill: TWILIO_RED },
      g,
    );
}
const GREEN = '#1aa36f';
const BLUE = '#2563eb';
const INK = '#1f2430';
const GREY = '#6b7280';

export function twilio10dlc(rect: SVGGraphicsElement, win: Window): Screen {
  const { g, x, y, w, h } = screenFrame(rect);
  const root = svgEl('g', {}, g);

  // The integrations page behind, dimmed.
  svgEl('rect', { x, y, width: w, height: h, fill: '#f4f5f8' }, root);
  const side = w * 0.17;
  svgEl('rect', { x, y, width: side, height: h, fill: '#ffffff' }, root);
  const sfs = Math.min(h / 30, side / 9);
  svgText(root, x + sfs * 0.8, y + sfs * 1.8, 'MeritHyre', {
    'font-size': sfs * 1.1,
    fill: INK,
    class: 'title-text',
  });
  [
    'Chat',
    'Dashboard',
    'Interviews',
    'Candidates',
    'Templates',
    'Integrations',
    'Settings',
  ].forEach((label, i) => {
    const ry = y + sfs * (3.4 + i * 1.8);
    if (label === 'Integrations')
      svgEl(
        'rect',
        {
          x: x + sfs * 0.4,
          y: ry - sfs * 1.05,
          width: side - sfs * 0.8,
          height: sfs * 1.5,
          rx: sfs * 0.4,
          fill: '#7c4dff',
        },
        root,
      );
    svgText(root, x + sfs * 0.9, ry, label, {
      'font-size': sfs * 0.75,
      fill: label === 'Integrations' ? '#ffffff' : GREY,
    });
  });
  svgText(root, x + side + sfs * 1.2, y + sfs * 2, 'Integrations', {
    'font-size': sfs * 1.3,
    fill: INK,
    class: 'title-text',
  });
  for (let i = 0; i < 4; i++)
    svgEl(
      'rect',
      {
        x: x + side + sfs * 1.2,
        y: y + sfs * (3.4 + i * 4.6),
        width: w - side - sfs * 2.4,
        height: sfs * 3.8,
        rx: sfs * 0.5,
        fill: '#ffffff',
        stroke: '#e5e7eb',
      },
      root,
    );
  // The first card: Twilio SMS, marked Connected once saved.
  const cardX = x + side + sfs * 1.2;
  const cardY = y + sfs * 3.4;
  svgEl(
    'rect',
    {
      x: cardX + sfs * 0.6,
      y: cardY + sfs * 0.7,
      width: sfs * 2.4,
      height: sfs * 2.4,
      rx: sfs * 0.4,
      fill: '#ffffff',
      stroke: '#e3e5ea',
    },
    root,
  );
  twilioMark(root, cardX + sfs * 1.8, cardY + sfs * 1.9, sfs * 0.95);
  svgText(root, cardX + sfs * 3.6, cardY + sfs * 1.7, 'Twilio SMS', {
    'font-size': sfs * 0.9,
    fill: INK,
    class: 'title-text',
  });
  const cardState = svgText(root, cardX + sfs * 3.6, cardY + sfs * 2.9, 'Not connected', {
    'font-size': sfs * 0.7,
    fill: GREY,
  });
  const dim = svgEl('rect', { x, y, width: w, height: h, fill: '#000000', opacity: 0 }, root);

  // The dialog.
  const mw = Math.min(w * 0.66, h * 1.15);
  const mh = h * 0.92;
  const mx = x + (w - mw) / 2;
  const my = y + (h - mh) / 2;
  const fs = mh / 27.5;
  const modal = svgEl('g', {}, root);
  svgEl('rect', { x: mx, y: my, width: mw, height: mh, rx: fs * 0.7, fill: '#ffffff' }, modal);
  const pad = fs * 1.1;
  const left = mx + pad;
  const inner = mw - pad * 2;
  // Header: Twilio tile, title, close.
  const tile = fs * 2.2;
  svgEl(
    'rect',
    {
      x: left,
      y: my + fs * 0.9,
      width: tile,
      height: tile,
      rx: fs * 0.45,
      fill: '#ffffff',
      stroke: '#e3e5ea',
    },
    modal,
  );
  twilioMark(modal, left + tile / 2, my + fs * 0.9 + tile / 2, tile * 0.4);
  svgText(modal, left + tile + fs * 0.7, my + fs * 1.85, 'Twilio SMS', {
    'font-size': fs * 1.05,
    fill: INK,
    class: 'title-text',
  });
  svgText(
    modal,
    left + tile + fs * 0.7,
    my + fs * 2.85,
    'Send SMS notifications and reminders to candidates',
    { 'font-size': fs * 0.66, fill: GREY },
  );
  svgText(modal, mx + mw - pad, my + fs * 2.2, '✕', {
    'font-size': fs * 0.8,
    fill: GREY,
    'text-anchor': 'end',
  });
  svgEl(
    'rect',
    { x: mx, y: my + fs * 3.8, width: mw, height: Math.max(1, fs * 0.05), fill: '#e5e7eb' },
    modal,
  );

  // What it does.
  const b1y = my + fs * 4.6;
  const b1h = fs * 4.6;
  svgEl(
    'rect',
    {
      x: left,
      y: b1y,
      width: inner,
      height: b1h,
      rx: fs * 0.4,
      fill: '#f3f7ff',
      stroke: '#c9dafc',
    },
    modal,
  );
  svgText(modal, left + fs * 0.6, b1y + fs * 1.15, 'What this integration does:', {
    'font-size': fs * 0.72,
    fill: INK,
    class: 'title-text',
  });
  [
    'Send SMS interview invitations to candidates',
    'Send SMS reminders before interview deadlines',
    'Send completion confirmations via SMS',
  ].forEach((line, i) =>
    svgText(modal, left + fs * 0.8, b1y + fs * (2.25 + i * 0.95), `• ${line}`, {
      'font-size': fs * 0.62,
      fill: '#374151',
    }),
  );

  // A2P 10DLC onboarding.
  const b2y = b1y + b1h + fs * 0.7;
  const rowH = fs * 1.9;
  const b2h = fs * 3.2 + rowH * STEPS.length;
  svgEl(
    'rect',
    {
      x: left,
      y: b2y,
      width: inner,
      height: b2h,
      rx: fs * 0.4,
      fill: '#f5f3ff',
      stroke: '#d9d3fb',
    },
    modal,
  );
  svgText(modal, left + fs * 0.6, b2y + fs * 1.2, 'A2P 10DLC onboarding', {
    'font-size': fs * 0.8,
    fill: '#3b2a8f',
    class: 'title-text',
  });
  svgText(
    modal,
    left + fs * 0.6,
    b2y + fs * 2.1,
    'subaccount → number → Trust Hub profiles → brand → campaign',
    { 'font-size': fs * 0.56, fill: '#5b4bc4' },
  );
  const refresh = svgText(modal, left + inner - fs * 0.6, b2y + fs * 1.2, '↻ Refresh status', {
    'font-size': fs * 0.6,
    fill: BLUE,
    'text-anchor': 'end',
  });
  const rows = STEPS.map(([title, sub], i) => {
    const ry = b2y + fs * 3 + i * rowH;
    const cx = left + fs * 1.1;
    const cy = ry + fs * 0.5;
    if (i < STEPS.length - 1)
      svgEl(
        'rect',
        { x: cx - fs * 0.05, y: cy, width: fs * 0.1, height: rowH, fill: '#c7d2c9' },
        modal,
      );
    const dot = svgEl('circle', { cx, cy, r: fs * 0.48, fill: '#d1d5db' }, modal);
    const tick = svgText(modal, cx, cy + fs * 0.24, '✓', {
      'font-size': fs * 0.62,
      fill: '#ffffff',
      'text-anchor': 'middle',
    });
    const head = svgText(modal, cx + fs * 1, cy + fs * 0.22, `Step ${i + 1} — ${title}`, {
      'font-size': fs * 0.68,
      fill: GREY,
    });
    const note = svgText(modal, cx + fs * 1, cy + fs * 1.15, sub, {
      'font-size': fs * 0.52,
      fill: GREY,
    });
    return { dot, tick, head, note };
  });

  // Footer.
  const fy = my + mh - fs * 2.6;
  svgEl(
    'rect',
    { x: mx, y: fy - fs * 0.6, width: mw, height: Math.max(1, fs * 0.05), fill: '#e5e7eb' },
    modal,
  );
  const button = (bx: number, bw: number, label: string, fill: string, color: string) => {
    const b = svgEl('g', {}, modal);
    const r = svgEl(
      'rect',
      { x: bx, y: fy, width: bw, height: fs * 1.8, rx: fs * 0.35, fill, stroke: '#d1d5db' },
      b,
    );
    const t = svgText(b, bx + bw / 2, fy + fs * 1.18, label, {
      'font-size': fs * 0.66,
      fill: color,
      'text-anchor': 'middle',
      class: 'title-text',
    });
    return { b, r, t };
  };
  button(left, fs * 4, 'Cancel', '#ffffff', INK);
  const test = button(left + inner - fs * 11.2, fs * 6.4, 'Test Connection', '#ffffff', INK);
  const save = button(left + inner - fs * 4.4, fs * 4.4, 'Save', BLUE, '#ffffff');

  // Toast, once saved.
  const toast = svgEl('g', {}, root);
  const tw = Math.min(w * 0.7, fs * 22);
  svgEl(
    'rect',
    {
      x: x + (w - tw) / 2,
      y: y + h - fs * 2.6,
      width: tw,
      height: fs * 1.9,
      rx: fs * 0.95,
      fill: GREEN,
    },
    toast,
  );
  svgText(
    toast,
    x + w / 2,
    y + h - fs * 1.35,
    '✓ Twilio SMS connected · A2P 10DLC campaign verified',
    { 'font-size': fs * 0.66, fill: '#ffffff', 'text-anchor': 'middle', class: 'title-text' },
  );

  const [a, b] = win;
  return {
    update({ hold }) {
      const on = hold >= a;
      g.style.display = on ? '' : 'none';
      if (!on) return;
      const p = progress(hold, a, b);
      // The dialog opens over the dimmed page.
      const open = easeOut(progress(p, 0, 0.1));
      const cx = mx + mw / 2;
      const cy = my + mh / 2;
      const s = 0.92 + 0.08 * open;
      modal.setAttribute(
        'transform',
        `translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})`,
      );
      // Saved: the dialog closes onto the page, Twilio now connected.
      const shut = progress(p, 0.74, 0.82);
      modal.setAttribute('opacity', (open * (1 - shut)).toFixed(3));
      modal.style.visibility = shut >= 1 ? 'hidden' : '';
      dim.setAttribute('opacity', (0.35 * open * (1 - shut)).toFixed(3));
      // The onboarding steps complete one by one; the next one shows as in progress.
      const done = Math.floor(progress(p, 0.12, 0.55) * STEPS.length + 1e-6);
      rows.forEach((r, i) => {
        const ok = i < done;
        const busy = i === done && p > 0.1;
        r.dot.setAttribute('fill', ok ? GREEN : busy ? '#f2b84b' : '#d1d5db');
        r.tick.style.visibility = ok ? '' : 'hidden';
        r.head.setAttribute('fill', ok ? '#0f7a56' : busy ? INK : GREY);
        r.note.setAttribute('fill', ok ? '#0f7a56' : GREY);
      });
      setText(refresh, done < STEPS.length ? '↻ Refreshing status…' : '↻ Refresh status');
      // Test the connection, then save.
      const tested = p >= 0.62;
      test.r.setAttribute('fill', p >= 0.58 && !tested ? '#e5e7eb' : '#ffffff');
      setText(test.t, tested ? '✓ Connected' : 'Test Connection');
      test.t.setAttribute('fill', tested ? GREEN : INK);
      const saved = p >= 0.7;
      save.r.setAttribute('fill', saved ? GREEN : BLUE);
      setText(save.t, saved ? 'Saved' : 'Save');
      toast.style.visibility = saved ? '' : 'hidden';
      setText(cardState, saved ? '● Connected · A2P 10DLC verified' : 'Not connected');
      cardState.setAttribute('fill', saved ? GREEN : GREY);
      toast.setAttribute('opacity', progress(p, 0.74, 0.8).toFixed(3));
    },
  };
}
