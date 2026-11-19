/**
 * "See it live" shelves (components/LiveProjects.astro). From the chapter's `from` (hold
 * progress) the shelf comes up at the bottom and each project flies onto it, one after another,
 * from where it is in the scene — its desk phone (`[data-screen="app-<key>"]`), its link target
 * (`[data-link="<key>"]`) or else the monitor. Everything is a function of hold progress, so
 * scrolling back flies them home again. Once on the shelf they are plain links.
 */
import { easeInOut, lerp, progress } from '../lib/math';

/** Hold progress the whole move takes, from `from`. */
export const SPAN = 0.12;

interface Item {
  el: HTMLElement;
  key: string;
  /** Slot on the shelf and where it starts in the scene (viewport px), measured on arrival. */
  slot: DOMRect | null;
  start: DOMRect | null;
  /** Its flight last frame (0 home … 1 on the shelf), for the sounds. */
  f: number;
}

interface Shelf {
  el: HTMLElement;
  index: number;
  from: number;
  items: Item[];
  measured: string;
  /** The shelf's own progress last frame, for the sounds. */
  k: number;
}

/** What a shelf does, going forward: comes up, a project takes off, a project lands (its index). */
export type ShelfEvent = 'lift' | 'fly' | 'land';

export interface Shelves {
  update(
    index: number,
    hold: number,
    transitioning: boolean,
    svg: SVGSVGElement | null,
    gen: number,
  ): void;
  /** Called as the shelf comes up and as each project takes off and lands (forward only). */
  onEvent: ((event: ShelfEvent, item: number) => void) | null;
}

const sourceIn = (svg: SVGSVGElement, key: string): Element =>
  svg.querySelector(`[data-screen="app-${key}"]`) ??
  svg.querySelector(`[data-link="${key}"]`) ??
  svg.querySelector('[data-screen="app-build"]') ??
  svg.querySelector('[data-anchor="monitor"]') ??
  svg;

export function shelves(root: ParentNode): Shelves {
  const list: Shelf[] = Array.from(root.querySelectorAll<HTMLElement>('[data-live-scene]')).map(
    (el) => ({
      el,
      index: Number(el.dataset.liveScene),
      from: Number(el.dataset.liveFrom),
      items: Array.from(el.querySelectorAll<HTMLElement>('[data-live-key]')).map((a) => ({
        el: a,
        key: a.dataset.liveKey ?? '',
        slot: null,
        start: null,
        f: 0,
      })),
      measured: '',
      k: 0,
    }),
  );

  const set = (el: HTMLElement, prop: string, v: string) => {
    if (el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v);
  };

  const api: Shelves = {
    onEvent: null,
    update(index, hold, transitioning, svg, gen) {
      for (const s of list) {
        const k =
          !transitioning && index === s.index && svg ? progress(hold, s.from, s.from + SPAN) : 0;
        // Sounds only for the shelf coming up gradually (not a jump straight onto it).
        if (s.k <= 0 && k > 0 && k < 0.3) api.onEvent?.('lift', -1);
        s.k = k;
        const on = k > 0;
        if (s.el.classList.contains('is-on') !== on) {
          s.el.classList.toggle('is-on', on);
          s.el.inert = !on;
        }
        if (!on || !svg) {
          for (const it of s.items) it.f = 0;
          continue;
        }
        // Measure once per arrival (and after a resize): slots with no transform, and starts.
        const sig = `${gen}`;
        if (s.measured !== sig) {
          s.measured = sig;
          for (const it of s.items) {
            it.el.style.transform = '';
            it.slot = it.el.getBoundingClientRect();
            it.start = sourceIn(svg, it.key).getBoundingClientRect();
          }
        }
        // The shelf itself comes up first, then the projects fly on one by one.
        set(s.el, '--shelf', easeInOut(progress(k, 0, 0.3)).toFixed(3));
        const n = s.items.length;
        s.items.forEach((it, i) => {
          if (!it.slot || !it.start) return;
          const a = 0.15 + (i / Math.max(1, n)) * 0.45;
          const f = easeInOut(progress(k, a, a + 0.4));
          // Takes off, and lands (only if it was seen flying: not on a jump).
          if (it.f <= 0 && f > 0 && f < 1) api.onEvent?.('fly', i);
          if (it.f > 0 && it.f < 1 && f >= 1) api.onEvent?.('land', i);
          it.f = f;
          const sx = it.start.left + it.start.width / 2 - (it.slot.left + it.slot.width / 2);
          const sy = it.start.top + it.start.height / 2 - (it.slot.top + it.slot.height / 2);
          const s0 = Math.min(1.4, Math.max(0.4, it.start.height / (it.slot.height || 1)));
          // A little arc up on the way.
          const arc = Math.sin(Math.PI * f) * -40;
          const tf =
            f >= 1
              ? ''
              : `translate(${lerp(sx, 0, f).toFixed(1)}px, ${(lerp(sy, 0, f) + arc).toFixed(1)}px) scale(${lerp(s0, 1, f).toFixed(3)})`;
          if (it.el.style.transform !== tf) it.el.style.transform = tf;
          const o = f <= 0 ? '0' : '';
          if (it.el.style.opacity !== o) it.el.style.opacity = o;
          it.el.classList.toggle('is-flying', f > 0 && f < 1);
        });
      }
    },
  };
  return api;
}
