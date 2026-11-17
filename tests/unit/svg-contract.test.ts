/**
 * The contract between content, scene modules and artwork: every scene has both SVGs and a
 * module; every bubble anchor and link exists in both SVGs; and nothing the engine transforms
 * with CSS also carries a `transform` attribute (CSS would silently replace it).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beats } from '../../src/content/beats';
import { scenes } from '../../src/content/scenes';

const root = resolve(__dirname, '../..');
const svgOf = (layout: string, file: string) =>
  readFileSync(resolve(root, 'src/assets/scenes', layout, file), 'utf8');

/** Links that scene modules create at runtime (contact rows on the departures board). */
const RUNTIME_LINKS: Record<string, string[]> = {
  '15-departures': ['email', 'linkedin', 'github', 'resume'],
};

const CSS_CLASSES = [
  'idle-twinkle',
  'idle-steam',
  'idle-cloud',
  'idle-bob',
  'star',
  'pop',
  'skill-badge',
  'idle-sway',
  'idle-bird',
  'idle-leaf',
  'idle-walk',
];
const CSS_ATTRS = [
  'data-id',
  'data-anchor',
  'data-icon',
  'data-bloom',
  'data-code',
  'data-late-card',
  'data-sticker',
  'data-callout',
  'data-cta',
  'data-qs-phone',
  'data-kp-monitor',
  'data-bookshelf',
  'data-press',
  'data-greeting-bubble',
  'data-envelope',
  'data-letter',
  'data-stamp',
];

function cssTransformed(tag: string): boolean {
  const cls = /\sclass="([^"]*)"/.exec(tag)?.[1]?.split(/\s+/) ?? [];
  return (
    cls.some((c) => CSS_CLASSES.includes(c)) ||
    CSS_ATTRS.some((a) => new RegExp(`\\s${a}(=|\\s|>|/)`).test(tag))
  );
}

describe.each(['desktop', 'mobile'])('%s artwork', (layout) => {
  it.each(scenes.map((s) => [s.id, s] as const))('%s', (_id, scene) => {
    const file = resolve(root, 'src/assets/scenes', layout, scene.svg);
    expect(existsSync(file), `${layout}/${scene.svg} missing`).toBe(true);
    expect(
      existsSync(resolve(root, 'src/scenes', `${scene.module}.ts`)),
      `module ${scene.module} missing`,
    ).toBe(true);
    const svg = svgOf(layout, scene.svg);

    expect(svg).toContain(
      layout === 'desktop' ? 'viewBox="0 0 1440 900"' : 'viewBox="0 0 390 844"',
    );
    expect(svg).toMatch(/data-id="[^"]+"/);

    for (const b of beats[scene.id] ?? []) {
      expect(svg, `anchor "${b.anchor}"`).toContain(`data-anchor="${b.anchor}"`);
    }
    for (const l of scene.links) {
      if (RUNTIME_LINKS[scene.id]?.includes(l)) continue;
      expect(svg, `link "${l}"`).toContain(`data-link="${l}"`);
    }

    for (const tag of svg.match(/<[a-z]+\s[^>]*>/g) ?? []) {
      if (cssTransformed(tag)) {
        expect(tag, 'element transformed by CSS also has a transform attribute').not.toMatch(
          /\stransform="/,
        );
      }
    }
  });
});
