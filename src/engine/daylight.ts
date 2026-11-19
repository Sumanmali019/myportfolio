/**
 * The time of day. The desk clock (engine/loop.ts) shows it, and the room's light follows it:
 * every desk room has a window for each part of the day and a few room glows
 * (scripts/art/generate-scenes.mjs, `deskRoom`), shown by the scene SVG's `data-daypart`
 * (styles/global.css fades them when it changes) — so the window always matches the clock.
 *   morning    before noon: bright, soft daylight
 *   afternoon  noon – 5 PM: strong, warm daylight
 *   evening    5 – 7:30 PM: a sunset in the window
 *   night      after 7:30 PM: a dark sky, the room lights on
 */
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** The journey's own day: 8 AM at the start, 11 PM at the end (progress 0 → 1). */
export const journeyClock = (p: number): number => 480 + p * 900;

export function dayPart(minutes: number): DayPart {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (m >= 300 && m < 720) return 'morning';
  if (m >= 720 && m < 1020) return 'afternoon';
  if (m >= 1020 && m < 1170) return 'evening';
  return 'night';
}

/** "08:05" and "AM". */
export function clockText(minutes: number): [string, 'AM' | 'PM'] {
  const m = Math.floor(((minutes % 1440) + 1440) % 1440);
  const h24 = Math.floor(m / 60);
  const hh = String(h24 % 12 || 12).padStart(2, '0');
  return [`${hh}:${String(m % 60).padStart(2, '0')}`, h24 < 12 ? 'AM' : 'PM'];
}
