/**
 * Lazy scene loading. Only the intro SVG is inline in the HTML; every other scene is a
 * hashed, long-cached file under /_astro, fetched when it is within reach:
 * the previous scene (needed while it comes apart), the current one and the next two.
 * Scenes further away are evicted from the DOM (their markup stays cached in memory).
 */
import type { Scene } from '../content/schema';
import type { Layout } from './layout';
import { collectObjects, hideObject, type Obj } from '../transitions';

const urls: Record<Layout, Record<string, string>> = {
  desktop: import.meta.glob('../assets/scenes/desktop/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
  mobile: import.meta.glob('../assets/scenes/mobile/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
};

export const sceneUrl = (layout: Layout, file: string): string | undefined =>
  urls[layout][`../assets/scenes/${layout}/${file}`];

export interface Mounted {
  index: number;
  scene: Scene;
  host: HTMLElement;
  svg: SVGSVGElement;
  /** Its objects, with their parts wrapped and measured (transitions/parts.ts). */
  parts: Obj[];
  inline: boolean;
}

export interface LoaderOptions {
  stage: HTMLElement;
  scenes: Scene[];
  layout: Layout;
  /** Called after the SVG is in the DOM and before parts are collected. */
  prepare: (svg: SVGSVGElement, index: number) => void;
  onError: (error: unknown) => void;
  /** Called after a scene is mounted, so the engine can redraw even if scroll hasn't moved. */
  onMount?: (index: number) => void;
}

export const BEHIND = 1;
export const AHEAD = 2;

/** Indices to keep mounted around `index`. */
export function windowAround(index: number, count: number): number[] {
  const out: number[] = [];
  for (let i = index - BEHIND; i <= index + AHEAD; i++) if (i >= 0 && i < count) out.push(i);
  return out;
}

export class SceneLoader {
  layout: Layout;
  private readonly texts = new Map<string, Promise<string>>();
  private readonly mounted = new Map<number, Mounted>();
  private readonly pending = new Set<number>();
  private generation = 0;
  private center = -1;

  constructor(private readonly opts: LoaderOptions) {
    this.layout = opts.layout;
  }

  get(index: number): Mounted | undefined {
    return this.mounted.get(index);
  }

  each(fn: (m: Mounted) => void): void {
    this.mounted.forEach(fn);
  }

  /** Make sure the window around `index` is mounted; evict the rest. */
  ensure(index: number): void {
    if (index === this.center) return;
    this.center = index;
    const keep = windowAround(index, this.opts.scenes.length);
    for (const [i, m] of this.mounted) {
      if (keep.includes(i)) continue;
      if (m.inline) m.host.classList.remove('is-on');
      else m.host.remove();
      this.mounted.delete(i);
    }
    // Current scene first, then ahead, then behind.
    const order = [...keep].sort((a, b) => Math.abs(a - index) - Math.abs(b - index) || b - a);
    for (const i of order) if (!this.mounted.has(i) && !this.pending.has(i)) void this.load(i);
  }

  /** Switch art set (desktop ↔ mobile): drop everything and reload around the current scene. */
  setLayout(layout: Layout): void {
    if (layout === this.layout) return;
    this.generation++;
    for (const m of this.mounted.values()) {
      if (m.inline) m.host.classList.remove('is-on');
      else m.host.remove();
    }
    this.mounted.clear();
    this.pending.clear();
    this.layout = layout;
    const c = this.center;
    this.center = -1;
    if (c >= 0) this.ensure(c);
  }

  private fetchText(url: string): Promise<string> {
    let p = this.texts.get(url);
    if (!p) {
      p = fetch(url, { credentials: 'same-origin' }).then(async (res) => {
        if (!res.ok) throw new Error(`Scene ${url} failed: HTTP ${res.status}`);
        const text = await res.text();
        if (!text.includes('<svg')) throw new Error(`Scene ${url} is not an SVG`);
        return text;
      });
      p.catch(() => this.texts.delete(url));
      this.texts.set(url, p);
    }
    return p;
  }

  private async load(index: number): Promise<void> {
    const gen = this.generation;
    const layout = this.layout;
    const scene = this.opts.scenes[index]!;
    this.pending.add(index);
    try {
      let host: HTMLElement;
      let inline = false;
      const inlineHost =
        index === 0 ? this.opts.stage.querySelector<HTMLElement>(`[data-intro="${layout}"]`) : null;
      if (inlineHost?.querySelector('svg')) {
        host = inlineHost;
        inline = true;
      } else {
        const url = sceneUrl(layout, scene.svg);
        if (!url) throw new Error(`No ${layout} SVG for scene ${scene.id} (${scene.svg})`);
        const text = await this.fetchText(url);
        if (gen !== this.generation) return;
        // Scrolled on while it downloaded: no longer in the window, so don't mount it (it would
        // never be evicted). It mounts again from the text cache if we come back.
        if (!windowAround(this.center, this.opts.scenes.length).includes(index)) return;
        host = document.createElement('div');
        host.className = 'scene';
        host.innerHTML = text;
        this.opts.stage.appendChild(host);
      }
      host.dataset.sceneIndex = String(index);
      host.dataset.sceneId = scene.id;
      host.style.zIndex = String(10 + index);
      const svg = host.querySelector('svg');
      if (!svg) throw new Error(`Scene ${scene.id} has no <svg>`);
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      this.opts.prepare(svg, index);
      const parts = collectObjects(svg);
      if (!inline) parts.forEach(hideObject);
      this.mounted.set(index, { index, scene, host, svg, parts, inline });
      this.opts.onMount?.(index);
    } catch (err) {
      if (gen === this.generation) this.opts.onError(err);
    } finally {
      this.pending.delete(index);
    }
  }
}
