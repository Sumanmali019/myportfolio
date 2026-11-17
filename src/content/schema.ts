/**
 * Zod schemas for everything in src/content. `loadContent()` runs at build time (from
 * index.astro) and throws a readable error if any content is invalid, failing the build.
 *
 * Content files only `import type` from here, so zod never reaches the client bundle.
 */
import { z } from 'zod';
import { profile } from './profile';
import { skills } from './skills';
import { beats } from './beats';
import { scenes } from './scenes';

const nonEmpty = z.string().trim().min(1);
const url = z.string().url();
/** "YYYY-MM", or "now" (resolved to the build date — the counter reaches the present). */
const yearMonth = z.string().regex(/^(\d{4}-(0[1-9]|1[0-2])|now)$/, 'expected YYYY-MM or "now"');

export const LinkSchema = z.object({
  label: nonEmpty,
  href: z
    .string()
    .refine((v) => /^(https:\/\/|mailto:|\/)/.test(v), 'link must be https://, mailto: or a /path'),
});

export const ExperienceSchema = z.object({
  company: nonEmpty,
  role: nonEmpty,
  period: nonEmpty,
  start: z.number().int().min(2000).max(2100),
  location: nonEmpty,
  apps: z.array(nonEmpty).default([]),
  stack: z.array(nonEmpty).default([]),
  highlights: z.array(nonEmpty).default([]),
});

export const ProjectSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  name: nonEmpty,
  url,
  summary: nonEmpty,
  stack: z.array(nonEmpty).min(1),
});

export const AppSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  name: nonEmpty,
  company: nonEmpty,
  /** Scene id where the app (and its downloads) is added to the odometer. */
  scene: z.string(),
  /** Known install count, e.g. 10000. Omit if unknown — it then adds nothing to the total. */
  downloads: z.number().int().nonnegative().optional(),
  /** Badge text, e.g. "10K+ downloads". */
  badge: z.string().optional(),
  summary: nonEmpty,
  role: z.string().optional(),
});

export const ProfileSchema = z.object({
  name: nonEmpty,
  headline: nonEmpty,
  city: nonEmpty,
  intro: nonEmpty,
  about: nonEmpty,
  status: z.string().optional(),
  experience: z.array(ExperienceSchema).min(1),
  projects: z.array(ProjectSchema).min(1),
  apps: z.array(AppSchema).min(1),
  /** Shown on the "Today" chapter. */
  now: nonEmpty,
  writing: z.array(nonEmpty).min(1),
  education: z
    .array(z.object({ school: nonEmpty, course: nonEmpty, period: nonEmpty, short: nonEmpty }))
    .min(1),
  certifications: z.array(nonEmpty),
  contact: z.object({
    email: z.string().email(),
    linkedin: url,
    github: url,
    resume: z.string().startsWith('/'),
  }),
});

export const SkillGroupSchema = z.object({
  group: nonEmpty,
  jar: z.string().regex(/^#[0-9a-f]{6}$/i, 'jar colour must be #rrggbb'),
  items: z.array(nonEmpty).min(1),
});

export const TRIGGERS = ['steam', 'buzz', 'ci', 'rings', 'burst'] as const;

export const BeatSchema = z.object({
  kind: z.enum(['speech', 'thought', 'screen']),
  /** Who is talking. Required for screen bubbles (shown as an uppercase label). */
  who: z.string().optional(),
  text: nonEmpty.max(140, 'keep bubbles short (≤ 140 chars)'),
  /** `data-anchor` value of the element in the scene SVG the tail points at. */
  anchor: z.string().regex(/^[a-z0-9-]+$/),
  trigger: z.enum(TRIGGERS).optional(),
});

export const SceneSchema = z.object({
  id: z.string().regex(/^\d\d-[a-z0-9-]+$/),
  /** File name (no extension) of the module in src/scenes. */
  module: z.string().regex(/^\d\d-[a-z0-9-]+$/),
  /** SVG file name, present in both src/assets/scenes/desktop and /mobile. */
  svg: z.string().regex(/^\d\d-[a-z0-9-]+\.svg$/),
  title: nonEmpty,
  /** Short label for the route station, e.g. "Jadavpur". */
  section: nonEmpty,
  /** Calendar position at the start of the scene's hold; the counter interpolates between. */
  date: yearMonth,
  /** City shown beside the counter. */
  city: nonEmpty,
  /** How this scene appears on the route line. */
  station: z.enum(['stop', 'star', 'transit']).default('stop'),
  palette: z.enum([
    'night',
    'campus',
    'morning',
    'day',
    'afternoon',
    'dusk',
    'evening',
    'late',
    'spot',
  ]),
  /** Length of the scene's hold, in screen-heights of scroll. */
  weight: z.number().min(0.6).max(8),
  /** Plain-language description of the scene for screen readers (SceneText). */
  description: nonEmpty,
  /** Keys into the link registry (see buildLinks) shown over this scene. */
  links: z.array(z.string()).default([]),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type App = z.infer<typeof AppSchema>;
export type ProfileInput = z.input<typeof ProfileSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type SceneInput = z.input<typeof SceneSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Trigger = (typeof TRIGGERS)[number];

/** Every link the site can show, keyed so scenes.ts can reference them by name. */
export function buildLinks(p: Profile): Record<string, Link> {
  const links: Record<string, Link> = {
    email: { label: `Email ${p.contact.email}`, href: `mailto:${p.contact.email}` },
    linkedin: { label: 'LinkedIn profile', href: p.contact.linkedin },
    github: { label: 'GitHub profile', href: p.contact.github },
    resume: { label: 'Download résumé (PDF)', href: p.contact.resume },
    'cta-mail': {
      label: 'Book the next flight',
      href: `mailto:${p.contact.email}?subject=${encodeURIComponent('Book the next flight')}`,
    },
  };
  for (const project of p.projects) {
    links[project.key] = {
      label: project.key === 'flutter-pr' ? 'View the PR →' : `Open ${project.name}`,
      href: project.url,
    };
  }
  return links;
}

export const ContentSchema = z
  .object({
    profile: ProfileSchema,
    skills: z.array(SkillGroupSchema).min(1).max(9),
    scenes: z.array(SceneSchema).min(2),
    beats: z.record(z.string(), z.array(BeatSchema)),
  })
  .superRefine((c, ctx) => {
    const ids = new Set<string>();
    for (const s of c.scenes) {
      if (ids.has(s.id)) ctx.addIssue({ code: 'custom', message: `duplicate scene id ${s.id}` });
      ids.add(s.id);
    }
    for (const key of Object.keys(c.beats)) {
      if (!ids.has(key))
        ctx.addIssue({ code: 'custom', path: ['beats', key], message: `no scene "${key}"` });
    }
    for (const [key, list] of Object.entries(c.beats)) {
      list.forEach((b, i) => {
        if (b.kind === 'screen' && !b.who)
          ctx.addIssue({
            code: 'custom',
            path: ['beats', key, i],
            message: 'screen bubbles need `who`',
          });
      });
    }
    c.profile.apps.forEach((a, i) => {
      if (!ids.has(a.scene))
        ctx.addIssue({
          code: 'custom',
          path: ['profile', 'apps', i, 'scene'],
          message: `no scene "${a.scene}"`,
        });
    });
    const links = buildLinks(c.profile);
    for (const s of c.scenes) {
      for (const l of s.links) {
        if (!links[l] && l !== 'restart')
          ctx.addIssue({
            code: 'custom',
            path: ['scenes', s.id, 'links'],
            message: `unknown link "${l}"`,
          });
      }
    }
  });

export type Content = z.infer<typeof ContentSchema>;

/** Validate all content. Throws a formatted error listing every problem. */
export function loadContent(raw: unknown = { profile, skills, scenes, beats }): Content {
  const res = ContentSchema.safeParse(raw);
  if (!res.success) {
    const lines = res.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid content in src/content:\n${lines.join('\n')}`);
  }
  return res.data;
}

/** Placeholder values that must be replaced before going live. */
export function findPlaceholders(c: Content): string[] {
  const out: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string' && /example\.(com|org)|your-username|YOUR_|^TODO/i.test(v))
      out.push(`${path} = ${v}`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(c.profile, 'profile');
  return out;
}

/** Resolve "now" to the build month. */
export function resolveDate(d: string, today = new Date()): string {
  if (d !== 'now') return d;
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/** Odometer: downloads added per scene id. */
export function downloadsByScene(apps: App[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of apps) if (a.downloads) out[a.scene] = (out[a.scene] ?? 0) + a.downloads;
  return out;
}

export const totalDownloads = (apps: App[]): number =>
  apps.reduce((n, a) => n + (a.downloads ?? 0), 0);

/** 520000 → "520K+", 1200000 → "1.2M+". */
export function formatDownloads(n: number, plus = true): string {
  const s =
    n >= 1e6
      ? `${+(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `${Math.floor(n / 1e3)}K`
        : String(Math.floor(n));
  return plus && n > 0 ? `${s}+` : s;
}
