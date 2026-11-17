/**
 * Word-by-word reveal. All words are laid out up front (so the bubble never changes size);
 * unrevealed words are just invisible.
 */

export function splitWords(container: HTMLElement, text: string): HTMLSpanElement[] {
  container.textContent = '';
  const words = text.split(/\s+/).filter(Boolean);
  return words.map((word, i) => {
    const span = document.createElement('span');
    span.className = 'tw-word';
    span.textContent = word;
    container.appendChild(span);
    if (i < words.length - 1) container.appendChild(document.createTextNode(' '));
    return span;
  });
}

/** Number of words visible at progress t (0..1). */
export const wordsVisible = (n: number, t: number): number =>
  t <= 0 ? 0 : t >= 1 ? n : Math.min(n, Math.ceil(t * n));

/** Reveal words for progress t. Returns how many are visible. */
export function revealWords(spans: HTMLSpanElement[], t: number): number {
  const count = wordsVisible(spans.length, t);
  spans.forEach((s, i) => {
    const on = i < count;
    if (s.classList.contains('is-on') !== on) s.classList.toggle('is-on', on);
  });
  return count;
}
