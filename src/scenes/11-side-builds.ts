/**
 * 11 · Side builds — a bookshelf comes apart into The Quiet Shelf app; a printing press comes
 * apart into the Khyaati Prakashan marketplace.
 *   [data-bookshelf] → [data-qs-phone]     [data-press] → [data-kp-monitor]
 */
import type { Screen, SceneModule } from '../engine/types';
import { easeIn, easeOut, progress } from '../lib/math';
import { qs, setScale } from '../lib/svg';
import { khyaatiPortals } from '../screens/khyaati-portals';
import { quietShelf } from '../screens/quiet-shelf';
import { mountScreen, screenCtx } from './shared';

let screens: Screen[] = [];
let pairs: Array<{ from: SVGGraphicsElement | null; to: SVGGraphicsElement | null; at: number }> =
  [];

const scene: SceneModule = {
  id: '11-side-builds',
  prepare(svg) {
    screens = [
      mountScreen(svg, 'quiet-shelf', quietShelf),
      mountScreen(svg, 'khyaati-portals', khyaatiPortals),
    ].filter((s): s is Screen => !!s);
    const qsPhone = qs(svg, '[data-qs-phone]');
    const kpMon = qs(svg, '[data-kp-monitor]');
    qsPhone?.classList.remove('pre-hidden');
    kpMon?.classList.remove('pre-hidden');
    pairs = [
      { from: qs(svg, '[data-bookshelf]'), to: qsPhone, at: 0.1 },
      { from: qs(svg, '[data-press]'), to: kpMon, at: 0.42 },
    ];
  },
  update(state) {
    for (const p of pairs) {
      if (p.from) setScale(p.from, 1 - easeIn(progress(state.hold, p.at, p.at + 0.12)));
      if (p.to) setScale(p.to, easeOut(progress(state.hold, p.at + 0.1, p.at + 0.22), 1.5));
    }
    // Each screen's own story starts once it has grown in.
    const ctx = screenCtx(state);
    screens[0]?.update({ ...ctx, hold: progress(state.hold, 0.25, 0.95) });
    screens[1]?.update({ ...ctx, hold: progress(state.hold, 0.55, 0.95) });
  },
};

export default scene;
