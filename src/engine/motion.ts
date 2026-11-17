/**
 * prefers-reduced-motion. When set:
 *   - no Lenis (native scroll), no idle loops
 *   - scenes crossfade instead of building part by part
 *   - bubbles appear fully typed, without popping
 * `?motion=reduce` in the URL forces it (handy for testing).
 */
const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('motion') === 'reduce') return true;
  return window.matchMedia?.(QUERY).matches ?? false;
}

export function onMotionChange(cb: (reduced: boolean) => void): () => void {
  const mq = window.matchMedia?.(QUERY);
  if (!mq) return () => {};
  const handler = () => cb(prefersReducedMotion());
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
