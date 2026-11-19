/** Types shared by the engine, scene modules and screens. Type-only — erased at build. */
import type { Beat, Link, Profile, Scene, SkillGroup } from '../content/schema';
import type { Layout } from './layout';

/** Everything the client needs, serialised into the page by index.astro. */
export interface EngineData {
  scenes: Scene[];
  beats: Record<string, Beat[]>;
  skills: SkillGroup[];
  links: Record<string, Link>;
  profile: Pick<
    Profile,
    | 'name'
    | 'headline'
    | 'city'
    | 'experience'
    | 'projects'
    | 'apps'
    | 'now'
    | 'education'
    | 'certifications'
    | 'contact'
    | 'status'
  >;
  /** Downloads added in each scene (same order as `scenes`). */
  downloads: number[];
}

export interface PrepareContext {
  data: EngineData;
  layout: Layout;
  reduced: boolean;
}

export interface SceneState {
  svg: SVGSVGElement;
  /** Build-in progress, 0 → 1 (1 when the scene is fully built). */
  enter: number;
  /** Progress through the hold, 0 → 1. */
  hold: number;
  /** Take-apart progress while the next scene builds, 0 → 1. */
  exit: number;
  /** True while this is the current (top) scene. */
  active: boolean;
  /** Index of the active bubble beat, or -1. */
  beat: number;
  beatT: number;
  /** Seconds on the shared idle clock (stops when the tab is hidden / reduced motion). */
  idle: number;
  /** Month index of the screen on stage (year * 12 + month - 1). */
  month: number;
  /** Downloads on the odometer. */
  downloads: number;
  reduced: boolean;
  layout: Layout;
  data: EngineData;
}

/** One module per scene in src/scenes. */
export interface SceneModule {
  id: string;
  /** Called once each time the scene's SVG is mounted. Build screens, cache elements here. */
  prepare(svg: SVGSVGElement, ctx: PrepareContext): void;
  /** Called every frame while the scene is on stage. Must be a pure function of `state`. */
  update(state: SceneState): void;
  /**
   * The time on the desk clock (minutes after midnight) at hold progress `hold`, for a scene
   * that tells its own day; others follow the journey (engine/daylight.ts).
   */
  clock?(hold: number): number;
}

/** Looping content drawn inside a screen rect (monitor, phone, TV). */
export interface ScreenContext {
  hold: number;
  idle: number;
  reduced: boolean;
}

export interface Screen {
  update(ctx: ScreenContext): void;
}
