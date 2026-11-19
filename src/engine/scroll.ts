/**
 * Scroll input: the page's own (native) scroll. Smoothness comes from the pace (engine/pace.ts):
 * the view chases the scroll position every frame, eased and speed-limited, so wheel steps and
 * flicks still play smoothly — no smooth-scroll library needed.
 *
 * progress() → P in 0..1;  toScroll(P) scrolls to that progress.
 */
import { clamp } from '../lib/math';

export class Scroller {
  /** Set by an immediate jump: the view should land there at once, not glide (see takeJump). */
  private jumped = false;
  /** A smooth programmatic scroll (e.g. replay) in flight: the view follows it directly. */
  private gliding = false;
  private glideTo = 0;
  private lastY = -1;
  private still = 0;

  /** Maximum scroll offset in px. */
  get max(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  progress(): number {
    return clamp(window.scrollY / this.max);
  }

  /** Scroll to progress `p`. `immediate` jumps; otherwise the browser scrolls smoothly there. */
  toScroll(p: number, immediate = false): void {
    const top = Math.round(clamp(p) * this.max);
    if (immediate) this.jumped = true;
    else {
      this.gliding = true;
      this.glideTo = top;
      this.still = 0;
    }
    window.scrollTo({ top, behavior: immediate ? 'instant' : 'smooth' });
  }

  /**
   * True after an immediate jump (links, tests), and while a smooth programmatic scroll
   * (replay) runs: the view goes straight there instead of chasing at its top speed.
   */
  takeJump(): boolean {
    const j = this.jumped || this.gliding;
    this.jumped = false;
    return j;
  }

  /** Scroll to an exact px offset at once, without marking a jump (auto-scroll, shelves). */
  scrollToPx(y: number): void {
    window.scrollTo({ top: Math.max(0, Math.min(this.max, y)), behavior: 'instant' });
  }

  /** Once per frame: notices when a smooth programmatic scroll has arrived (or stalled). */
  raf(): void {
    if (!this.gliding) return;
    const y = window.scrollY;
    this.still = y === this.lastY ? this.still + 1 : 0;
    this.lastY = y;
    if (Math.abs(y - this.glideTo) < 2 || this.still > 20) this.gliding = false;
  }

  /** Hold the page still (a dialog is open), and let it go again. */
  stop(): void {
    document.documentElement.style.overflow = 'hidden';
  }

  start(): void {
    document.documentElement.style.overflow = '';
  }
}
