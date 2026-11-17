/**
 * Scene 07 monitor: an AI reply streaming token by token over Server-Sent Events, beside a
 * WebSocket ping-pong, with a small diagram drawn between them as the hold progresses.
 */
import type { Screen } from '../engine/types';
import { clamp, lerp, mod, progress } from '../lib/math';
import { drawOn, screenFrame, setText, svgEl, svgText, UI } from '../lib/svg';

const REPLY =
  'SSE keeps one HTTP response open and the server pushes tokens down it. Simple, proxy-friendly, auto-reconnects. Use WebSockets when the client talks back mid-stream.';

/** Greedy word wrap by character count (monospace font). */
export function wrap(text: string, cols: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > cols) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export function sseVsWs(rect: SVGGraphicsElement): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  svgEl('rect', { x, y, width: w, height: h, fill: UI.bg }, g);
  const stacked = h > w * 0.9;
  const pad = u * 2.5;
  const leftW = stacked ? w - pad * 2 : w * 0.56;
  const leftH = stacked ? h * 0.55 : h - pad * 2;
  const fs = Math.min(leftW / 26, h / 16);

  // SSE chat panel.
  svgEl('rect', { x: x + pad, y: y + pad, width: leftW, height: leftH, rx: u, fill: UI.panel }, g);
  svgText(g, x + pad + fs, y + pad + fs * 1.5, 'SSE · server → client', {
    'font-size': fs * 0.8,
    fill: UI.muted,
  });
  svgEl(
    'rect',
    {
      x: x + pad + leftW - fs * 11,
      y: y + pad + fs * 2.4,
      width: fs * 10,
      height: fs * 1.8,
      rx: fs * 0.6,
      fill: UI.blue,
    },
    g,
  );
  svgText(g, x + pad + leftW - fs * 10.4, y + pad + fs * 3.6, 'explain SSE vs WS', {
    'font-size': fs * 0.75,
    fill: '#10131f',
  });
  const cols = Math.max(12, Math.floor((leftW - fs * 2.5) / (fs * 0.62)));
  const lines = wrap(REPLY, cols);
  const tokens = REPLY.split(' ').length;
  const lineEls = lines.map((_, i) =>
    svgText(g, x + pad + fs, y + pad + fs * (6 + i * 1.35), '', {
      'font-size': fs * 0.78,
      fill: UI.text,
    }),
  );
  const caret = svgEl(
    'rect',
    { width: fs * 0.45, height: fs * 0.95, fill: UI.green, class: 'idle-blink' },
    g,
  );

  // WebSocket panel.
  const rx = stacked ? x + pad : x + pad * 2 + leftW;
  const ry = stacked ? y + pad * 2 + leftH : y + pad;
  const rw = stacked ? w - pad * 2 : w - leftW - pad * 3;
  const rh = stacked ? h - leftH - pad * 3 : h - pad * 2;
  svgEl('rect', { x: rx, y: ry, width: rw, height: rh, rx: u, fill: UI.panel }, g);
  svgText(g, rx + fs * 0.8, ry + fs * 1.5, 'WebSocket · both ways', {
    'font-size': fs * 0.8,
    fill: UI.muted,
  });
  const boxW = Math.min(rw * 0.32, fs * 6);
  const boxY = ry + rh * 0.5;
  const c1 = rx + fs * 0.8;
  const c2 = rx + rw - fs * 0.8 - boxW;
  [
    [c1, 'client'],
    [c2, 'server'],
  ].forEach(([bx, label]) => {
    svgEl(
      'rect',
      { x: bx as number, y: boxY - fs, width: boxW, height: fs * 2, rx: fs * 0.3, fill: UI.line },
      g,
    );
    svgText(g, (bx as number) + boxW / 2, boxY + fs * 0.3, label as string, {
      'font-size': fs * 0.7,
      fill: UI.text,
      'text-anchor': 'middle',
    });
  });
  // Diagram: the line between client and server draws on with the hold.
  const wire = svgEl(
    'line',
    {
      x1: c1 + boxW,
      y1: boxY,
      x2: c2,
      y2: boxY,
      stroke: UI.muted,
      'stroke-width': fs * 0.12,
      'stroke-dasharray': '',
    },
    g,
  );
  const ball = svgEl('circle', { cx: c1 + boxW, cy: boxY, r: fs * 0.4, fill: UI.amber }, g);
  const msg = svgText(g, rx + rw / 2, boxY - fs * 1.6, 'ping', {
    'font-size': fs * 0.75,
    fill: UI.amber,
    'text-anchor': 'middle',
  });

  return {
    update({ hold, idle, reduced }) {
      // Stream tokens: loops every ~9 s, holding the full reply for a beat at the end.
      const shown = reduced ? tokens : Math.min(tokens, Math.floor(mod(idle, 9) * (tokens / 6)));
      let left = shown;
      let lastLine = 0;
      let lastLen = 0;
      lines.forEach((line, i) => {
        const words = line.split(' ');
        const take = clamp(left, 0, words.length);
        left -= take;
        const text = words.slice(0, take).join(' ');
        setText(lineEls[i]!, text);
        if (take > 0) {
          lastLine = i;
          lastLen = text.length;
        }
      });
      caret.setAttribute('x', (x + pad + fs + lastLen * fs * 0.47 + fs * 0.2).toFixed(1));
      caret.setAttribute('y', (y + pad + fs * (6 + lastLine * 1.35) - fs * 0.8).toFixed(1));

      drawOn(wire, progress(hold, 0.05, 0.4));
      const p = reduced ? 0.5 : mod(idle / 1.6, 2);
      const k = p < 1 ? p : 2 - p;
      ball.setAttribute('cx', lerp(c1 + boxW, c2, k).toFixed(1));
      setText(msg, p < 1 ? 'ping →' : '← pong');
      ball.style.visibility = hold > 0.4 || reduced ? '' : 'hidden';
    },
  };
}
