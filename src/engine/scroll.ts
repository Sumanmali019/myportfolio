/**
 * Scroll input. With motion allowed, Lenis smooths wheel scrolling and is driven by our own
 * rAF loop (autoRaf: false). With reduced motion, native scroll is used directly.
 *
 * progress() → P in 0..1;  toScroll(P) scrolls to that progress.
 */
import Lenis from 'lenis';
import { clamp } from '../lib/math';

export class Scroller {
  private lenis: Lenis | null = null;

  constructor(reduced: boolean) {
    this.setReduced(reduced);
  }

  setReduced(reduced: boolean): void {
    if (reduced && this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    } else if (!reduced && !this.lenis) {
      this.lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true, syncTouch: false });
    }
  }

  /** Maximum scroll offset in px. */
  get max(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  get y(): number {
    return this.lenis ? this.lenis.scroll : window.scrollY;
  }

  progress(): number {
    return clamp(this.y / this.max);
  }

  /** Scroll to progress `p`. `immediate` jumps without smoothing. */
  toScroll(p: number, immediate = false): void {
    const target = Math.round(clamp(p) * this.max);
    if (this.lenis) {
      this.lenis.scrollTo(
        target,
        immediate ? { immediate: true, force: true } : { duration: 1.4, force: true },
      );
    } else {
      window.scrollTo({ top: target, behavior: 'auto' });
    }
  }

  /** Advance smoothing; call once per frame. Returns true while Lenis is still moving. */
  raf(time: number): boolean {
    if (!this.lenis) return false;
    this.lenis.raf(time);
    return this.lenis.isScrolling !== false;
  }

  resize(): void {
    this.lenis?.resize();
  }

  stop(): void {
    this.lenis?.stop();
  }

  start(): void {
    this.lenis?.start();
  }

  destroy(): void {
    this.lenis?.destroy();
    this.lenis = null;
  }
}
