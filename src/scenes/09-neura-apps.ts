/**
 * 09b · Neura Dynamics, the work — in the same format as chapters 03 and 05 (scenes/desk-build.ts).
 * Suman's back view hands over to his hands on the keyboard, and on the big monitor he builds
 * what he shipped as Tech Lead (content/showcase.ts → `neuraShowcase`, screens/app-build.ts):
 *   each product in turn — "Now building X" (what it is, its stack), its files typing out
 *                 (Flutter or React / Next.js, Python, Docker), each of its real screens with
 *                 a caption, the release build, then live: Klass Online and Ayantra on their
 *                 Play Store listings (their desk phones stamp the downloads badge), DocPharma
 *                 and MeritHyre deployed;
 *   last          MeritHyre's Twilio SMS integration: the A2P 10DLC onboarding ticks off step by
 *                 step, the connection tests OK and saves (screens/twilio-10dlc.ts);
 *   0.86 → 1      the "see them live" shelf (content/live.ts).
 * Scroll-driven, so it all reverses.
 */
import { neuraShowcase } from '../content/showcase';
import { liveAt } from '../screens/app-build';
import { appCard } from '../screens/app-card';
import { twilio10dlc } from '../screens/twilio-10dlc';
import { deskBuildScene } from './desk-build';
import { mountApps } from './shared';

/**
 * The chapter in seconds at 1× (its weight in content/scenes.ts is SECONDS × AUTO_SPEED):
 * the four products, a breath, then the Twilio onboarding.
 */
const SECONDS = 42;
const TWILIO = 5;
/** Everything done before the shelf comes up (content/live.ts, from 0.86). */
const DONE = 0.855;
const BUILDS = SECONDS * DONE - TWILIO - 0.4;
const BUILD = { start: 0, end: BUILDS / SECONDS, stop: (BUILDS + 0.2) / SECONDS };

/** When an app's downloads badge stamps in: with the LIVE stamp of its store listing. */
const badgeAt = (key: string) => liveAt(neuraShowcase, key, BUILD.start, BUILD.end);

export default deskBuildScene({
  id: '09-neura-apps',
  apps: neuraShowcase,
  build: BUILD,
  // A full working day on screen: 9 AM with Klass Online, the web platforms through the
  // afternoon, Twilio at dusk, and night by the time the shelf comes up.
  day: [
    [0, 540],
    [DONE, 1230],
    [1, 1290],
  ],
  extra: (monitor) => twilio10dlc(monitor, [DONE - TWILIO / SECONDS, DONE]),
  more: (svg, data) =>
    mountApps(svg, data, appCard, {
      'klass-online': badgeAt('klass-online'),
      ayantra: badgeAt('ayantra'),
    }),
});
