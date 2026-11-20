/**
 * 11b · Khyaati Prakashan, a side build: a publisher's book marketplace. Built on the big monitor
 * (scenes/desk-build.ts) — its React and Go code types out file by file while its real pages
 * (marketplace, book, cart) slide through a browser, and it deploys to khyaatiprakashan.store.
 * Then a reader buys: the Razorpay checkout opens on the cart, UPI, pay, payment successful,
 * order placed (screens/razorpay-checkout.ts).
 */
import { khyaatiShowcase } from '../content/showcase';
import { razorpayCheckout } from '../screens/razorpay-checkout';
import { deskBuildScene } from './desk-build';
import cart from '../assets/apps/khyaati-3.webp?url';
import logo from '../assets/apps/khyaati-logo.webp?url';

/** The chapter in seconds at 1× (weight in content/scenes.ts = SECONDS × AUTO_SPEED). */
const SECONDS = 36;
/** The build, then 6 s of checkout. */
const END = 0.855 - 6.4 / SECONDS;
/** Then the checkout, done before the "explore it live" shelf (content/live.ts, from 0.86). */
const CHECKOUT: [number, number] = [END + 0.4 / SECONDS, 0.855];

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
    }),
});
