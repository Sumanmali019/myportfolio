/**
 * 09b · Neura Dynamics, the work — in the same format as chapters 03 and 05 (scenes/desk-build.ts).
 * Suman's back view hands over to his hands on the keyboard, and on the big monitor he shows
 * what he shipped as Tech Lead (content/showcase.ts → `neuraShowcase`, screens/app-build.ts):
 *   each product in turn — what it is, then each of its real screens, one at a time and named,
 *                 then live: Klass Online and Ayantra on their Play Store listings (their desk
 *                 phones stamp the downloads badge), DocPharma and MeritHyre deployed;
 *   last          MeritHyre's Twilio SMS integration: the A2P 10DLC onboarding ticks off step by
 *                 step, the connection tests OK and saves (screens/twilio-10dlc.ts);
 *   the end       the "see them live" shelf (content/live.ts).
 * Scroll-driven, so it all reverses.
 */
import { doneAt, SECONDS as chapter } from '../content/pacing';
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
const SECONDS = chapter['09-neura-apps'];
const TWILIO = 4;
/** Everything done before the shelf comes up (content/live.ts). */
const DONE = doneAt(SECONDS);
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
