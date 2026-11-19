/**
 * Chapter 11b, after the site: Khyaati Prakashan's checkout, paid with Razorpay, on the monitor.
 * The real cart page (its screenshot) dims, the Razorpay checkout opens for the order total,
 * UPI is chosen, Pay is pressed, it processes, the payment succeeds, the checkout closes and the
 * order is placed. Driven by hold progress inside `win`, so it reverses on scroll.
 */
import type { Screen } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { screenFrame, setText, svgEl, svgText } from '../lib/svg';

export type Window = [number, number];

const RZP_BLUE = '#2b83ea';
const RZP_NAVY = '#0c2451';
const GREEN = '#16a34a';
const INK = '#1f2430';
const GREY = '#6b7280';
const METHODS: Array<[string, string]> = [
  ['UPI / QR', 'Google Pay, PhonePe, Paytm & more'],
  ['Cards', 'Visa, MasterCard, RuPay'],
  ['Netbanking', 'All Indian banks'],
  ['Wallet', 'Mobikwik, Freecharge'],
];

export function razorpayCheckout(
  rect: SVGGraphicsElement,
  win: Window,
  opts: { page: string; merchant: string; amount: string; logo: string },
): Screen {
  const { g, x, y, w, h } = screenFrame(rect);
  const root = svgEl('g', {}, g);

  // The real cart page behind.
  svgEl('rect', { x, y, width: w, height: h, fill: '#0f172a' }, root);
  svgEl(
    'image',
    { href: opts.page, x, y, width: w, height: h, preserveAspectRatio: 'xMidYMin slice' },
    root,
  );
  const dim = svgEl('rect', { x, y, width: w, height: h, fill: '#000000', opacity: 0 }, root);

  // The checkout: a blue merchant panel and a white payment panel.
  const mh = h * 0.84;
  const mw = Math.min(w * 0.66, mh * 1.45);
  const mx = x + (w - mw) / 2;
  const my = y + (h - mh) / 2;
  const fs = mh / 24;
  const modal = svgEl('g', {}, root);
  svgEl('rect', { x: mx, y: my, width: mw, height: mh, rx: fs * 0.6, fill: '#ffffff' }, modal);
  const lw = mw * 0.38;
  svgEl('rect', { x: mx, y: my, width: lw, height: mh, rx: fs * 0.6, fill: RZP_BLUE }, modal);
  svgEl('rect', { x: mx + lw - fs, y: my, width: fs, height: mh, fill: RZP_BLUE }, modal);
  const pad = fs * 1.1;
  svgEl(
    'rect',
    {
      x: mx + pad,
      y: my + pad,
      width: fs * 2.6,
      height: fs * 2.6,
      rx: fs * 0.5,
      fill: '#ffffff',
    },
    modal,
  );
  svgEl(
    'image',
    {
      href: opts.logo,
      x: mx + pad + fs * 0.2,
      y: my + pad + fs * 0.2,
      width: fs * 2.2,
      height: fs * 2.2,
    },
    modal,
  );
  svgText(modal, mx + pad, my + pad + fs * 4.1, opts.merchant, {
    'font-size': fs * 0.95,
    fill: '#ffffff',
    class: 'title-text',
  });
  svgText(modal, mx + pad, my + pad + fs * 5.3, 'Price summary', {
    'font-size': fs * 0.6,
    fill: '#dbeafe',
  });
  svgText(modal, mx + pad, my + pad + fs * 7, opts.amount, {
    'font-size': fs * 1.6,
    fill: '#ffffff',
    class: 'title-text',
  });
  svgText(modal, mx + pad, my + mh - pad, 'Secured by Razorpay', {
    'font-size': fs * 0.6,
    fill: '#dbeafe',
  });

  // Payment options.
  const rx = mx + lw + pad;
  const rw = mw - lw - pad * 2;
  const pay = svgEl('g', {}, modal);
  svgText(pay, rx, my + pad + fs * 0.9, 'Payment Options', {
    'font-size': fs * 0.9,
    fill: INK,
    class: 'title-text',
  });
  const rowH = fs * 2.5;
  const rows = METHODS.map(([title, sub], i) => {
    const ry = my + pad + fs * 2 + i * (rowH + fs * 0.45);
    const box = svgEl(
      'rect',
      { x: rx, y: ry, width: rw, height: rowH, rx: fs * 0.35, fill: '#ffffff', stroke: '#e5e7eb' },
      pay,
    );
    svgText(pay, rx + fs * 0.8, ry + fs * 1.05, title, {
      'font-size': fs * 0.72,
      fill: INK,
      class: 'title-text',
    });
    svgText(pay, rx + fs * 0.8, ry + fs * 1.95, sub, { 'font-size': fs * 0.52, fill: GREY });
    return box;
  });
  const by = my + mh - pad - fs * 2.2;
  const btn = svgEl(
    'rect',
    { x: rx, y: by, width: rw, height: fs * 2.2, rx: fs * 0.35, fill: RZP_NAVY },
    pay,
  );
  const btnText = svgText(pay, rx + rw / 2, by + fs * 1.4, `Pay ${opts.amount}`, {
    'font-size': fs * 0.8,
    fill: '#ffffff',
    'text-anchor': 'middle',
    class: 'title-text',
  });

  // Processing, then success.
  const cx = rx + rw / 2;
  const cy = my + mh * 0.45;
  const busy = svgEl('g', {}, modal);
  svgEl(
    'circle',
    { cx, cy, r: fs * 1.6, fill: 'none', stroke: '#e5e7eb', 'stroke-width': fs * 0.3 },
    busy,
  );
  const arc = svgEl(
    'circle',
    {
      cx,
      cy,
      r: fs * 1.6,
      fill: 'none',
      stroke: RZP_BLUE,
      'stroke-width': fs * 0.3,
      'stroke-dasharray': `${fs * 2.5} ${fs * 20}`,
      'stroke-linecap': 'round',
    },
    busy,
  );
  svgText(busy, cx, cy + fs * 3.2, 'Processing payment…', {
    'font-size': fs * 0.75,
    fill: GREY,
    'text-anchor': 'middle',
  });
  const done = svgEl('g', {}, modal);
  svgEl('circle', { cx, cy, r: fs * 2, fill: GREEN }, done);
  svgEl(
    'path',
    {
      d: `M${cx - fs * 0.9} ${cy} l${fs * 0.65} ${fs * 0.65} l${fs * 1.25} -${fs * 1.3}`,
      fill: 'none',
      stroke: '#ffffff',
      'stroke-width': fs * 0.4,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    done,
  );
  svgText(done, cx, cy + fs * 3.4, 'Payment Successful', {
    'font-size': fs * 0.95,
    fill: INK,
    'text-anchor': 'middle',
    class: 'title-text',
  });
  svgText(done, cx, cy + fs * 4.6, `${opts.amount} paid to ${opts.merchant}`, {
    'font-size': fs * 0.62,
    fill: GREY,
    'text-anchor': 'middle',
  });

  // Toast, once the order is placed.
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
    `✓ Order placed · ${opts.amount} paid via Razorpay`,
    {
      'font-size': fs * 0.66,
      fill: '#ffffff',
      'text-anchor': 'middle',
      class: 'title-text',
    },
  );

  const [a, b] = win;
  return {
    update({ hold }) {
      const on = hold >= a;
      g.style.display = on ? '' : 'none';
      if (!on) return;
      const p = progress(hold, a, b);
      // The checkout opens over the dimmed cart.
      const open = easeOut(progress(p, 0, 0.08));
      const mcx = mx + mw / 2;
      const mcy = my + mh / 2;
      const s = 0.92 + 0.08 * open;
      modal.setAttribute(
        'transform',
        `translate(${mcx} ${mcy}) scale(${s.toFixed(3)}) translate(${-mcx} ${-mcy})`,
      );
      const shut = progress(p, 0.82, 0.9);
      modal.setAttribute('opacity', (open * (1 - shut)).toFixed(3));
      modal.style.visibility = shut >= 1 ? 'hidden' : '';
      dim.setAttribute('opacity', (0.45 * open * (1 - shut)).toFixed(3));
      // UPI is chosen, then Pay is pressed.
      const chosen = p >= 0.22;
      rows.forEach((r, i) => {
        const sel = chosen && i === 0;
        r.setAttribute('stroke', sel ? RZP_BLUE : '#e5e7eb');
        r.setAttribute('fill', sel ? '#eff6ff' : '#ffffff');
      });
      const pressed = p >= 0.38 && p < 0.44;
      btn.setAttribute('fill', pressed ? '#1e3a8a' : RZP_NAVY);
      setText(btnText, chosen ? `Pay ${opts.amount} via UPI` : `Pay ${opts.amount}`);
      // Processing, then success.
      const processing = p >= 0.44 && p < 0.62;
      const success = p >= 0.62;
      pay.style.visibility = processing || success ? 'hidden' : '';
      busy.style.visibility = processing ? '' : 'hidden';
      done.style.visibility = success ? '' : 'hidden';
      arc.setAttribute(
        'transform',
        `rotate(${((p - 0.44) * 2400).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})`,
      );
      done.setAttribute('opacity', progress(p, 0.62, 0.68).toFixed(3));
      // Order placed.
      toast.style.visibility = p >= 0.86 ? '' : 'hidden';
      toast.setAttribute('opacity', progress(p, 0.86, 0.92).toFixed(3));
    },
  };
}
