import { describe, expect, it } from 'vitest';
import { backSoft, ease, easeIn, easeOut, map } from '../../src/transitions/easing';
import { slot, type Obj } from '../../src/transitions/parts';
import { paletteAt } from '../../src/transitions/palette';
import { planTransition } from '../../src/transitions/transition';

describe('easings', () => {
  it('start at 0 and end at 1', () => {
    for (const f of [ease, easeIn, easeOut, backSoft]) {
      expect(f(0)).toBeCloseTo(0);
      expect(f(1)).toBeCloseTo(1);
    }
  });
  it('backSoft overshoots a little on the way', () => {
    expect(Math.max(...[0.7, 0.8, 0.85, 0.9].map(backSoft))).toBeGreaterThan(1.03);
    expect(Math.max(...[0.7, 0.8, 0.85, 0.9].map(backSoft))).toBeLessThan(1.12);
  });
  it('map clamps', () => {
    expect(map(-1, 0, 1)).toBe(0);
    expect(map(0.25, 0, 0.5)).toBe(0.5);
    expect(map(3, 0, 1)).toBe(1);
  });
});

describe('stagger inside an object', () => {
  it('one part takes the whole progress', () => {
    expect(slot(0, 1)).toEqual([0, 0.5]);
  });
  it('windows are min(.5, max(.05, 3 / n)) and spread evenly to the end', () => {
    const n = 10;
    const [a0, b0] = slot(0, n);
    const [a9, b9] = slot(9, n);
    expect(b0 - a0).toBeCloseTo(0.3);
    expect(a0).toBe(0);
    expect(b9).toBeCloseTo(1);
    expect(a9).toBeCloseTo(0.7);
    expect(slot(0, 200)[1]).toBeCloseTo(0.05);
  });
});

describe('palette', () => {
  it('shifts mostly in the middle of the build', () => {
    expect(paletteAt(0.1)).toBe(0);
    expect(paletteAt(0.35)).toBeCloseTo(0.5);
    expect(paletteAt(0.6)).toBe(1);
    expect(paletteAt(0.5, true)).toBeCloseTo(0.5);
  });
});

/** A stand-in object: boxes in a 1×1 frame (no SVG: boxes map 1:1 between scenes). */
const obj = (id: string, x: number, y = 0.5, w = 0.1, view: string | null = null): Obj =>
  ({
    el: { ownerSVGElement: null } as unknown as SVGGraphicsElement,
    id,
    key: id,
    view,
    box: { x: x - w / 2, y: y - w / 2, w, h: w },
    parts: [],
    apart: [],
  }) as Obj;

describe('one transition', () => {
  it('keeps, moves, takes apart right → left and builds left → right', () => {
    const A = [
      obj('desk', 0.5),
      obj('me', 0.3, 0.5, 0.1, 'front'),
      obj('lamp', 0.9),
      obj('sofa', 0.1),
    ];
    const B = [
      obj('desk', 0.5),
      obj('me', 0.6, 0.5, 0.1, 'back'),
      obj('plant', 0.1),
      obj('shelf', 0.9),
    ];
    const t = planTransition(A, B, 0);
    expect(t.keeps.map(([a]) => a.id)).toEqual(['desk']);
    expect(t.moves.map((m) => [m.a.id, m.d, m.len, m.turn])).toEqual([['me', 0.18, 0.3, true]]);
    const d = (id: string) => t.tasks.find((k) => k.o.id === id)!;
    // OUT: right first.
    expect(d('lamp').d).toBeLessThan(d('sofa').d);
    expect(d('lamp').len).toBe(0.22);
    // IN: left first, after .4.
    expect(d('plant').d).toBeLessThan(d('shelf').d);
    expect(d('plant').d).toBeGreaterThanOrEqual(0.4);
    expect(d('plant').building).toBe(true);
  });

  it('mirrors the sweep on every second transition', () => {
    const A = [obj('lamp', 0.9), obj('sofa', 0.1)];
    const t = planTransition(A, [], 1);
    const d = (id: string) => t.tasks.find((k) => k.o.id === id)!.d;
    expect(d('sofa')).toBeLessThan(d('lamp'));
  });

  it('follows a plan: moves between ids, morphs a list into a list', () => {
    const A = [obj('window', 0.5), obj('sofa', 0.2)];
    const B = [obj('shop', 0.5), obj('drawer-r', 0.8), obj('drawer-l', 0.6)];
    const t = planTransition(A, B, 0, {
      move: [['window', 'shop']],
      morph: [[['sofa'], ['drawer-l', 'drawer-r'], 0.2]],
    });
    expect(t.moves.map((m) => [m.a.id, m.b.id])).toEqual([['window', 'shop']]);
    const k = (id: string) => t.tasks.find((x) => x.o.id === id)!;
    expect(k('sofa')).toMatchObject({ building: false, a: 0, b: 0.38, len: 0.48 });
    expect(k('sofa').d).toBeCloseTo(0.22);
    expect(k('drawer-l').a).toBeCloseTo(0.38);
    expect(k('drawer-r').a).toBeCloseTo(0.8);
    expect(k('drawer-r').b).toBeCloseTo(1);
  });
});

describe('backdrops', () => {
  it("B's builds over A's, which comes apart beneath it afterwards", () => {
    const A = [obj('hall', 0.5, 0.5, 0.9), obj('lamp', 0.9)];
    const B = [obj('room', 0.5, 0.5, 0.9), obj('plant', 0.1)];
    const t = planTransition(A, B, 0);
    const k = (id: string) => t.tasks.find((x) => x.o.id === id)!;
    expect(k('room')).toMatchObject({ building: true, d: 0.25 });
    expect(k('hall')).toMatchObject({ building: false, d: 0.55 });
    expect(k('lamp').len).toBe(0.22);
  });
});
