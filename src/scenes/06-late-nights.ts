/**
 * 06 · Late nights, 2023–25 — a Scaler course on the laptop, and the skill groups from
 * skills.ts stacking up on the shelf as badges.
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeOut, progress } from '../lib/math';
import { boxOf, qs, screenFrame, setAttr, setScale, setText, svgEl, svgText, UI } from '../lib/svg';

let badges: SVGGraphicsElement[] = [];
let course: Screen | null = null;

function scaler(rect: SVGGraphicsElement): Screen {
  const { g, x, y, w, h, u } = screenFrame(rect);
  const fs = Math.min(u * 5, h / 8);
  svgEl('rect', { x, y, width: w, height: h, fill: UI.bg }, g);
  svgText(g, x + u * 5, y + fs * 1.5, 'SCALER · evening batch', {
    'font-size': fs * 0.75,
    fill: UI.muted,
  });
  const title = svgText(g, x + u * 5, y + fs * 3, 'Module 1 · DSA', {
    'font-size': fs * 0.9,
    fill: UI.text,
  });
  svgEl(
    'rect',
    {
      x: x + u * 5,
      y: y + fs * 4,
      width: w - u * 10,
      height: fs * 0.5,
      rx: fs * 0.25,
      fill: UI.line,
    },
    g,
  );
  const bar = svgEl(
    'rect',
    { x: x + u * 5, y: y + fs * 4, width: 0, height: fs * 0.5, rx: fs * 0.25, fill: UI.green },
    g,
  );
  for (let i = 0; i < 3; i++)
    svgEl(
      'rect',
      {
        x: x + u * 5,
        y: y + fs * (5.2 + i * 0.9),
        width: (w - u * 10) * (0.8 - i * 0.18),
        height: fs * 0.4,
        rx: 2,
        fill: UI.panel,
      },
      g,
    );
  const modules = ['DSA', 'LLD', 'HLD', 'System Design', 'Databases', 'Concurrency', 'Capstone'];
  return {
    update({ hold }) {
      const k = progress(hold, 0.05, 0.9);
      setAttr(bar, 'width', ((w - u * 10) * k).toFixed(1));
      const i = Math.min(modules.length - 1, Math.floor(k * modules.length));
      setText(title, `Module ${i + 1} · ${modules[i]}`);
    },
  };
}

const scene: SceneModule = {
  id: '06-late-nights',
  prepare(svg, { data, layout }) {
    const laptopScreen = qs(svg, '[data-screen="scaler"]');
    course = laptopScreen ? scaler(laptopScreen) : null;
    badges = [];
    const area = qs(svg, '[data-badges]');
    if (!area) return;
    const b = boxOf(area);
    const fs = layout === 'mobile' ? 9 : 12;
    let cx = b.x;
    let row = 0;
    for (const s of data.skills) {
      const w = s.group.length * fs * 0.62 + fs * 1.6;
      if (cx + w > b.x + b.w) {
        cx = b.x;
        row++;
      }
      const by = b.y + b.h - (row + 1) * (fs * 2.1);
      const pill = svgEl('g', { class: 'skill-badge' });
      area.after(pill);
      svgEl('rect', { x: cx, y: by, width: w, height: fs * 1.8, rx: fs * 0.9, fill: s.jar }, pill);
      svgText(pill, cx + w / 2, by + fs * 1.25, s.group, {
        'font-size': fs,
        fill: '#fbf6ee',
        'text-anchor': 'middle',
      });
      badges.push(pill);
      cx += w + fs * 0.5;
    }
  },
  update(state) {
    course?.update(state);
    badges.forEach((b, i) =>
      setScale(b, easeOut(progress(state.hold, 0.1 + i * 0.09, 0.18 + i * 0.09), 1.8)),
    );
  },
};

export default scene;
