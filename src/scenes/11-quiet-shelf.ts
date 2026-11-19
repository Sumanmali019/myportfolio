/**
 * 11a · The Quiet Shelf, a side build: a reading (and watching) community — community posts and
 * picks, your library, Discover, search. Built on the big monitor (scenes/desk-build.ts): its
 * React and FastAPI code types out file by file while its real pages slide through a browser,
 * then it deploys to thequietshelf.art.
 */
import { quietShelfShowcase } from '../content/showcase';
import { deskBuildScene } from './desk-build';

export default deskBuildScene({
  id: '11-quiet-shelf',
  apps: quietShelfShowcase,
  build: { start: 0, buildEnd: 0.5, end: 1 },
});
