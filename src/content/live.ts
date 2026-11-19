/**
 * "See it live" trays: after a chapter has shown its projects (built, released, deployed), a
 * row of cards slides up with a real link to each one — its Google Play listing or its site.
 * Rendered by components/LiveProjects.astro, shown by the engine from `from` (hold progress)
 * to the end of the chapter's hold.
 *
 * Apps link to their `url` in profile.ts (store listing or site); an app without one links to a
 * Google Play search for its name.
 */
import { profile } from './profile';
import { allShowcase } from './showcase';

export interface LiveItem {
  key: string;
  name: string;
  /** Short line under the name: downloads, or what it is. */
  note: string;
  href: string;
  /** Button text, e.g. "Google Play ↗". */
  cta: string;
  logo?: string;
}

export interface LiveTray {
  scene: string;
  title: string;
  /** Show the title on the shelf's plank (it is always the shelf's accessible name). */
  label?: boolean;
  /** Hold progress from which the tray shows. */
  from: number;
  items: LiveItem[];
}

const playSearch = (name: string) =>
  `https://play.google.com/store/search?q=${encodeURIComponent(name)}&c=apps`;

const host = (url: string) => new URL(url).host.replace(/^www\./, '');

const appsOf = (scene: string): LiveItem[] =>
  profile.apps
    .filter((a) => a.scene === scene)
    .map((a) => ({
      key: a.key,
      name: a.name,
      note: a.badge ?? a.summary.split(/[.:—]/)[0]!.trim(),
      href: a.url ?? playSearch(a.name),
      cta: !a.url || host(a.url) === 'play.google.com' ? 'Google Play ↗' : `${host(a.url)} ↗`,
      logo: allShowcase.find((s) => s.key === a.key)?.logo,
    }));

const projectsOf = (keys: string[]): LiveItem[] =>
  profile.projects
    .filter((p) => keys.includes(p.key))
    .map((p) => ({
      key: p.key,
      name: p.name,
      note: p.stack.slice(0, 3).join(' · '),
      href: p.url,
      cta: `${host(p.url)} ↗`,
      logo: allShowcase.find((s) => s.key === p.key)?.logo,
    }));

export const liveTrays: LiveTray[] = [
  {
    scene: '03-kolkata',
    title: 'Cloudcraftz · see them live',
    label: false,
    from: 0.86,
    items: appsOf('03-kolkata'),
  },
  {
    scene: '05-hyderabad',
    title: 'BeWorld · see them live',
    label: false,
    // After the night studying (scenes/05-beworld.ts has played by 0.84).
    from: 0.86,
    items: appsOf('05-hyderabad'),
  },
  {
    // After the Twilio work (MeritHyre's onboarding and refund): one shelf for all of Neura's.
    scene: '09-twilio-refund',
    title: 'Neura Dynamics · see them live',
    label: false,
    from: 0.86,
    items: appsOf('09-neura-apps'),
  },
  {
    scene: '11-quiet-shelf',
    title: 'The Quiet Shelf · explore it live',
    from: 0.8,
    items: projectsOf(['quiet-shelf']),
  },
  {
    scene: '11-khyaati',
    title: 'Khyaati Prakashan · explore it live',
    from: 0.88,
    items: projectsOf(['khyaati']),
  },
].filter((t) => t.items.length > 0);
