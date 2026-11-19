/**
 * Scene transitions, scrubbed by scroll: A is taken apart piece by piece while B is built piece
 * by piece, shared objects stay put or move across. See transition.ts (the tasks), parts.ts
 * (objects, parts and the stagger), plan.ts (optional per-pair plans), palette.ts (colours).
 * The timeline (engine/timeline.ts) gives each transition TRANSITION screens of scroll.
 */
export * from './easing';
export {
  applyObject,
  collectObjects,
  hideObject,
  slot,
  wholeObject,
  type Obj,
  type Pt,
} from './parts';
export { PLANS, planFor, type TransitionPlanSpec } from './plan';
export {
  applyTransition,
  fitTransform,
  planBetween,
  planTransition,
  restObjects,
  type Transition,
} from './transition';
export { paletteAt } from './palette';

/** The swap point for things that show one scene or the other (calendar page, chapter). */
export const HANDOVER = 0.5;
