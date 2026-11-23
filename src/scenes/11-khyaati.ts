/**
 * 11b · Khyaati Prakashan, a side build: a publisher's book marketplace. Built on the big monitor
 * (scenes/desk-build.ts) — what it is, then its real pages (marketplace, book, cart) sliding
 * through a browser, each named, then the live site at khyaatiprakashan.store.
 * Then a reader buys: the Razorpay checkout opens on the cart, UPI, pay, payment successful,
 * order placed (screens/razorpay-checkout.ts).
 */
import { doneAt, SECONDS as chapter } from '../content/pacing';
import { khyaatiShowcase } from '../content/showcase';
import { razorpayCheckout } from '../screens/razorpay-checkout';
import { deskBuildScene } from './desk-build';
import cart from '../assets/apps/khyaati-3.webp?url';
import logo from '../assets/apps/khyaati-logo.webp?url';
import rzp from '../assets/apps/razorpay-logo.webp?url';

/** The chapter in seconds at 1× (weight in content/scenes.ts = SECONDS × AUTO_SPEED). */
const SECONDS = chapter['11-khyaati'];
/** The project's screens, then 4.5 s of checkout. */
const END = doneAt(SECONDS) - 4.9 / SECONDS;
/** Then the checkout, done before the "explore it live" shelf (content/live.ts). */
const CHECKOUT: [number, number] = [END + 0.4 / SECONDS, doneAt(SECONDS)];

export default deskBuildScene({
  id: '11-khyaati',
  apps: khyaatiShowcase,
  build: { start: 0, end: END, stop: CHECKOUT[0] },
  extra: (monitor) =>
    razorpayCheckout(monitor, CHECKOUT, {
      page: cart,
      merchant: 'Khyaati Prakashan',
      amount: '₹424',
      logo,
      rzp,
    }),
});
