/**
 * Optional per-transition plans, keyed `"<from scene id>><to scene id>"`:
 *   keep   pair objects with the same id (default true): they stay put, or move if their
 *          place or size changed
 *   move   extra pairs with different ids: [aId, bId] — A's object moves to B's
 *   morph  [[aIds], [bIds], delay]: those A objects take apart while the B ones build in their
 *          place (a sofa into desk drawers, a window into a shop front); delay in transition units
 * Anything not listed comes apart (A) or builds (B) on its own.
 */
export interface TransitionPlanSpec {
  keep?: boolean;
  move?: Array<[string, string]>;
  morph?: Array<[string[], string[], number]>;
}

export const PLANS: Record<string, TransitionPlanSpec> = {};

export const planFor = (from: string, to: string): TransitionPlanSpec =>
  PLANS[`${from}>${to}`] ?? {};
