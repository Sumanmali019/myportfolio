/**
 * Optional per-transition plans, keyed `"<from scene id>><to scene id>"`:
 *   keep   pair objects with the same id (default true): they stay put, or move if their
 *          place or size changed
 *   pin    ids that stay exactly where they are, whatever their measured boxes say (e.g. a
 *          monitor whose screen content differs): A's copy, then B's at the midpoint
 *   move   extra pairs with different ids: [aId, bId] — A's object moves to B's
 *   morph  [[aIds], [bIds], delay]: those A objects take apart while the B ones build in their
 *          place (a sofa into desk drawers, a window into a shop front); delay in transition units
 * Anything not listed comes apart (A) or builds (B) on its own.
 */
export interface TransitionPlanSpec {
  keep?: boolean;
  pin?: string[];
  move?: Array<[string, string]>;
  morph?: Array<[string[], string[], number]>;
}

export const PLANS: Record<string, TransitionPlanSpec> = {
  // Tech Lead day → the Neura work: the same desk, so the monitor (and the desk, his hands on
  // the keyboard) stay put; only what is around them changes.
  '09-leading>09-neura-apps': { pin: ['monitor', 'desk', 'typing'] },
};

export const planFor = (from: string, to: string): TransitionPlanSpec =>
  PLANS[`${from}>${to}`] ?? {};
