/**
 * 09b · Neura Dynamics, the work — in the same format as chapters 03 and 05 (scenes/desk-build.ts).
 * Suman's back view hands over to his hands on the keyboard, and on the big monitor he builds
 * what he shipped as Tech Lead (content/showcase.ts → `neuraShowcase`, screens/app-build.ts):
 *   0 → 0.48      Klass Online and Ayantra (Flutter, then their Python backend and Docker
 *                 files, their real screens on the phone carousel, release build), then
 *                 DocPharma and MeritHyre (React / Next.js, Python, Docker; their pages sliding
 *                 through a browser window, production build);
 *   0.48 → 0.74   each goes live — the two apps on their Play Store listings (their desk
 *                 phones stamp the downloads badge), the two sites deployed;
 *   0.76 → 1      MeritHyre's Twilio SMS integration: the A2P 10DLC onboarding ticks off step by
 *                 step, the connection tests OK and saves (screens/twilio-10dlc.ts). The
 *                 refund that followed is the next scene (09-twilio-refund), same chapter.
 * Scroll-driven, so it all reverses.
 */
import { neuraShowcase } from '../content/showcase';
import { appCard } from '../screens/app-card';
import { twilio10dlc } from '../screens/twilio-10dlc';
import { deskBuildScene } from './desk-build';
import { mountApps } from './shared';

/** Building, then the releases; then the Twilio onboarding takes the monitor. */
const BUILD = { start: 0, buildEnd: 0.48, end: 0.74, stop: 0.76 };

/** When an app's downloads badge stamps in: with the LIVE stamp of its store listing. */
const badgeAt = (key: string): [number, number] => {
  const i = neuraShowcase.findIndex((s) => s.key === key);
  const span = (BUILD.end - BUILD.buildEnd) / neuraShowcase.length;
  const a = BUILD.buildEnd + span * i;
  return [a + span * 0.55, a + span * 0.7];
};

export default deskBuildScene({
  id: '09-neura-apps',
  apps: neuraShowcase,
  build: BUILD,
  extra: (monitor) => twilio10dlc(monitor, [0.76, 1]),
  more: (svg, data) =>
    mountApps(svg, data, appCard, {
      'klass-online': badgeAt('klass-online'),
      ayantra: badgeAt('ayantra'),
    }),
});
