/**
 * Scroll-mapped counters.
 *
 * Calendar: each scene's `date` (YYYY-MM) is the month at the start of its hold; between
 * holds the counter runs linearly, so the year rolls forward as you scroll.
 *
 * Odometer: each app's downloads are added during the hold of the chapter it belongs to,
 * counting up from 20% to 70% of that hold.
 */
import { clamp, lerp, progress } from '../lib/math';
import { qsa, setText } from '../lib/svg';
import type { Frame, Timeline } from './timeline';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2017-07" → months since year 0 (2017 * 12 + 6). */
export function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return (y ?? 0) * 12 + ((m ?? 1) - 1);
}

export const yearOf = (index: number): number => Math.floor(index / 12);

/** 24210 → "JUL 2017". */
export function formatMonth(index: number): string {
  const i = Math.floor(index);
  return `${MONTHS[((i % 12) + 12) % 12]} ${yearOf(i)}`;
}

/** Month index at scroll position `u` (screens). Monotonic and clamped to the first/last date. */
export function monthAt(tl: Timeline, months: number[], u: number): number {
  const segs = tl.segments;
  const first = months[0] ?? 0;
  const lastM = months[months.length - 1] ?? first;
  if (segs.length === 0 || u <= segs[0]!.holdStart) return first;
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i]!.holdStart;
    const b = segs[i + 1]!.holdStart;
    if (u < b) {
      const from = months[i] ?? first;
      const to = Math.max(from, months[i + 1] ?? from);
      return lerp(from, to, (u - a) / (b - a || 1));
    }
  }
  return lastM;
}

/** Downloads shown at a frame. `added[i]` = downloads added in scene i. */
export function downloadsAt(
  added: number[],
  frame: Pick<Frame, 'index' | 'hold' | 'transitioning'>,
): number {
  let total = 0;
  for (let i = 0; i < frame.index; i++) total += added[i] ?? 0;
  const here = added[frame.index] ?? 0;
  if (here && !frame.transitioning) total += here * progress(frame.hold, 0.2, 0.7);
  return Math.round(total);
}

/** Index of the first scene that adds downloads (the odometer appears from there). */
export const odometerStart = (added: number[]): number => {
  const i = added.findIndex((n) => n > 0);
  return i < 0 ? Infinity : i;
};

/** Rolling odometer digits: 152340 → "152,340". */
export const formatCount = (n: number): string =>
  Math.round(clamp(n, 0, 1e12)).toLocaleString('en-US');

/**
 * Updates calendar and counter text in an SVG:
 *   [data-year]  "2023"      [data-month] "SEP"     [data-date] "SEP 2023"
 *   [data-city]  "Hyderabad" [data-odometer] "520,000"
 */
export function applyCounters(
  root: ParentNode,
  month: number,
  city: string,
  downloads: number,
): void {
  const year = String(yearOf(Math.floor(month)));
  for (const el of qsa(root, '[data-year]')) setText(el, year);
  for (const el of qsa(root, '[data-month]')) setText(el, formatMonth(month).slice(0, 3));
  for (const el of qsa(root, '[data-date]')) setText(el, formatMonth(month));
  for (const el of qsa(root, '[data-city]')) setText(el, city.toUpperCase());
  for (const el of qsa(root, '[data-odometer]')) setText(el, formatCount(downloads));
}
