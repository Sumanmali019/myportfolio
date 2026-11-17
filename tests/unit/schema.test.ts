import { describe, expect, it } from 'vitest';
import { beats } from '../../src/content/beats';
import { profile } from '../../src/content/profile';
import { scenes } from '../../src/content/scenes';
import {
  buildLinks,
  downloadsByScene,
  findPlaceholders,
  formatDownloads,
  loadContent,
  resolveDate,
  totalDownloads,
} from '../../src/content/schema';
import { skills } from '../../src/content/skills';

describe('content', () => {
  it('validates', () => {
    expect(() => loadContent()).not.toThrow();
  });

  it('rejects a beat for a scene that does not exist', () => {
    const bad = { ...beats, '99-nope': [{ kind: 'speech' as const, anchor: 'x', text: 'hi' }] };
    expect(() => loadContent({ profile, skills, scenes, beats: bad })).toThrow(
      /no scene "99-nope"/,
    );
  });

  it('rejects screen bubbles without a WHO label', () => {
    const bad = { '03-kolkata': [{ kind: 'screen' as const, anchor: 'monitor', text: 'hi' }] };
    expect(() => loadContent({ profile, skills, scenes, beats: bad })).toThrow(
      /screen bubbles need `who`/,
    );
  });

  it('rejects unknown link keys and bad dates', () => {
    const bad = scenes.map((s, i) => (i === 1 ? { ...s, links: ['nope'], date: '2017-13' } : s));
    expect(() => loadContent({ profile, skills, scenes: bad, beats })).toThrow(/YYYY-MM/);
    const badLink = scenes.map((s, i) => (i === 1 ? { ...s, links: ['nope'] } : s));
    expect(() => loadContent({ profile, skills, scenes: badLink, beats })).toThrow(
      /unknown link "nope"/,
    );
  });

  it('rejects apps added in a scene that does not exist', () => {
    const p = { ...profile, apps: [{ ...profile.apps[0]!, scene: '42-nowhere' }] };
    expect(() => loadContent({ profile: p, skills, scenes, beats })).toThrow(
      /no scene "42-nowhere"/,
    );
  });

  it('keeps calendar dates in order', () => {
    const months = loadContent().scenes.map((s) => resolveDate(s.date));
    expect([...months].sort()).toEqual(months);
  });

  it('builds every link the scenes reference', () => {
    const links = buildLinks(loadContent().profile);
    for (const s of scenes)
      for (const l of s.links) if (l !== 'restart') expect(links[l]).toBeDefined();
    for (const l of Object.values(links)) expect(l.href).toMatch(/^(https:\/\/|mailto:|\/)/);
  });

  it('adds up downloads (520K+ from the known figures)', () => {
    const c = loadContent();
    expect(totalDownloads(c.profile.apps)).toBe(520_000);
    expect(formatDownloads(totalDownloads(c.profile.apps))).toBe('520K+');
    expect(downloadsByScene(c.profile.apps)['05-hyderabad']).toBe(510_000);
  });

  it('resolves "now" to the build month', () => {
    expect(resolveDate('now', new Date(2026, 10, 17))).toBe('2026-11');
    expect(resolveDate('2021-06')).toBe('2021-06');
  });

  it('reports placeholders', () => {
    const c = loadContent();
    const contact = { ...c.profile.contact, email: 'me@example.com' };
    const found = findPlaceholders({ ...c, profile: { ...c.profile, contact } });
    expect(found.some((f) => f.includes('me@example.com'))).toBe(true);
  });
});
