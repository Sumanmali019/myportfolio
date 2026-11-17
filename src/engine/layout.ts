/**
 * Two art sets: desktop (1440×900) and mobile (390×844). Portrait viewports narrower than
 * 0.8 get the mobile set. The same breakpoint is mirrored in CSS for the inline intro:
 * `@media (max-aspect-ratio: 799/1000)`.
 */
export type Layout = 'desktop' | 'mobile';

export const MOBILE_RATIO = 0.8;

export const pickLayout = (w: number, h: number): Layout =>
  h > 0 && w / h < MOBILE_RATIO ? 'mobile' : 'desktop';

export const currentLayout = (): Layout => pickLayout(window.innerWidth, window.innerHeight);

/**
 * Calls `onResize` (rAF-throttled) on every resize, with `changed` = true when the layout
 * flips between desktop and mobile.
 */
export function watchLayout(onResize: (layout: Layout, changed: boolean) => void): () => void {
  let layout = currentLayout();
  let queued = 0;
  const handler = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      const next = currentLayout();
      const changed = next !== layout;
      layout = next;
      onResize(next, changed);
    });
  };
  window.addEventListener('resize', handler, { passive: true });
  window.addEventListener('orientationchange', handler, { passive: true });
  return () => {
    window.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
    cancelAnimationFrame(queued);
  };
}
