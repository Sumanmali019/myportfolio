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

export default deskBuildScene({
  id: '11-khyaati',
  apps: khyaatiShowcase,
  build: { start: 0, buildEnd: 0.36, end: 0.62, stop: 0.64 },
  extra: (monitor) =>
    razorpayCheckout(monitor, [0.64, 0.88], {
      page: cart,
      merchant: 'Khyaati Prakashan',
      amount: '₹424',
      logo,
    }),
});
