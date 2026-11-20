/**
 * 11a · Personal work opens: first a "Personal work" card on the big monitor (what these are:
 * projects of his own, outside the day job — The Quiet Shelf and Khyaati Prakashan pop in one
 * by one), then The Quiet Shelf, a reading (and watching) community — community posts and
 * picks, your library, Discover, search. Shown on the big monitor (scenes/desk-build.ts): what
 * it is, then its real pages sliding through a browser, each named, then the live site at
 * thequietshelf.art.
 */
import { doneAt, SECONDS as chapter } from '../content/pacing';
import { khyaatiShowcase, quietShelfShowcase } from '../content/showcase';
import { deskBuildScene } from './desk-build';

/** The chapter's length in seconds at 1× (its weight in content/scenes.ts). */
const SECONDS = chapter['11-quiet-shelf'];
/** The "Personal work" card, then the project, done before the shelf (content/live.ts). */
const PREFACE = 3 / SECONDS;
const END = doneAt(SECONDS);

const [quiet] = quietShelfShowcase;
const [khyaati] = khyaatiShowcase;

export default deskBuildScene({
  id: '11-quiet-shelf',
  apps: quietShelfShowcase,
  build: {
    start: 0,
    learnEnd: PREFACE,
    end: END,
    preface: {
      kicker: 'PERSONAL WORK · OUTSIDE THE DAY JOB',
      title: 'Personal work',
      about:
        'Products I build on my own time: I design, code and ship each one end to end — front end, backend and deployment.',
      accent: '#f2b84b',
      items: [
        {
          logo: quiet!.logo,
          name: quiet!.name,
          note: 'Reading & watching community',
        },
        {
          logo: khyaati!.logo,
          name: khyaati!.name,
          note: 'Book marketplace for a publisher',
        },
      ],
      footer: 'Designed, built and shipped by me',
    },
  },
});
