/**
 * 11a · Personal work opens: first a "Personal work" card on the big monitor (what these are:
 * projects of his own, outside the day job — The Quiet Shelf and Khyaati Prakashan pop in one
 * by one), then The Quiet Shelf, a reading (and watching) community — community posts and
 * picks, your library, Discover, search. Built on the big monitor (scenes/desk-build.ts): its
 * React and FastAPI code types out file by file while its real pages slide through a browser,
 * then it deploys to thequietshelf.art.
 */
import { khyaatiShowcase, quietShelfShowcase } from '../content/showcase';
import { deskBuildScene } from './desk-build';

/** The chapter is 36.5 s at 1× (weight 14.6 in content/scenes.ts). */
const SECONDS = 36.5;
/** The "Personal work" card, then the build, done before the shelf (content/live.ts, 0.86). */
const PREFACE = 4.5 / SECONDS;
const END = 0.855;

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
        'Products Suman builds on his own time: he designs, codes and ships each one end to end — front end, backend and deployment.',
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
