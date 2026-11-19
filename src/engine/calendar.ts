/**
 * The journey's calendar (top right, components/Stage.astro). Its page shows the month and year;
 * when the month moves on, the old page is torn off the pad — it folds forward from the
 * perforation and falls away — showing the new one underneath. Scrolling back, the earlier
 * page flies back onto the pad (the tear in reverse). With reduced motion the text just changes.
 */
import { formatMonth } from './clock';

/** Pages in flight at once, at most (fast scrolling flips many months). */
const MAX_FLYING = 3;

export interface Calendar {
  set(month: number, reduced: boolean): void;
}

export function calendar(root: HTMLElement | null): Calendar {
  const page = root?.querySelector<HTMLElement>('.hud-cal__page') ?? null;
  let shown = -1;

  const write = (el: ParentNode, index: number) => {
    const [m = '', y = ''] = formatMonth(index).split(' ');
    const me = el.querySelector('[data-cal-month]');
    const ye = el.querySelector('[data-cal-year]');
    if (me && me.textContent !== m) me.textContent = m;
    if (ye && ye.textContent !== y) ye.textContent = y;
  };

  /** A copy of the page showing month `index`, playing the tear (or the tear in reverse). */
  const fly = (index: number, back: boolean, done?: () => void) => {
    if (!root || !page) return;
    const flying = root.querySelectorAll('.hud-cal__page.is-torn');
    if (flying.length >= MAX_FLYING) flying[0]?.remove();
    const sheet = page.cloneNode(true) as HTMLElement;
    // Only the real page keeps the ids.
    for (const el of sheet.querySelectorAll('[id]')) el.removeAttribute('id');
    write(sheet, index);
    sheet.classList.add('is-torn');
    if (back) sheet.classList.add('is-back');
    sheet.addEventListener(
      'animationend',
      () => {
        sheet.remove();
        done?.();
      },
      { once: true },
    );
    root.appendChild(sheet);
  };

  return {
    set(month, reduced) {
      const index = Math.floor(month);
      if (index === shown || !page) return;
      const from = shown;
      shown = index;
      if (from < 0 || reduced) return write(page, index);
      if (index > from) {
        // Forward: the new month is underneath; the old page tears away on top.
        write(page, index);
        fly(from, false);
      } else {
        // Back: the earlier page flies back onto the pad, then it is the page.
        fly(index, true, () => {
          if (shown === index) write(page, index);
        });
      }
    },
  };
}
