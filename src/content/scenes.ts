/**
 * The journey, in order. Each entry ties together:
 *   - `svg`     → src/assets/scenes/{desktop,mobile}/<svg>
 *   - `module`  → src/scenes/<module>.ts
 *   - `date`    → year/month on the counter at the start of the hold ("now" = build month);
 *                 the counter interpolates between chapters
 *   - `city`    → shown beside the counter
 *   - `station` → stop | star (highlight) | transit (flight) on the route line
 *   - `weight`  → hold length in screen-heights of scroll (bubbles need ~0.6 each)
 *   - `links`   → keys from buildLinks() in schema.ts, overlaid as real <a> links
 */
import { weightOf } from './pacing';
import type { SceneInput } from './schema';

export const scenes = [
  {
    id: '00-intro',
    module: '00-install',
    svg: '00-intro.svg',
    title: 'Hello',
    section: 'Start',
    date: '2017-01',
    city: 'Kolkata',
    station: 'stop',
    palette: 'night',
    weight: 1.2,
    description:
      'Suman’s avatar waves hello on a night sky and says: Hi! Welcome to my portfolio. I’m Suman, a Tech Lead / SDE II: I turn ideas into products across mobile, web and backend, and lead teams from idea to launch. Always curious, always learning. Scroll to begin.',
    links: [],
  },
  {
    id: '01-jadavpur',
    module: '01-jadavpur',
    svg: '01-jadavpur.svg',
    title: 'Jadavpur, 2017',
    section: 'Jadavpur',
    date: '2017-07',
    city: 'Kolkata',
    station: 'stop',
    palette: 'campus',
    weight: 1,
    description:
      'Early morning outside the main gate of Jadavpur University: the JADAVPUR UNIVERSITY beam, maroon pillars, the guard booth, the university’s seal on the gate, clouds and birds drifting overhead. Young Suman stands at the gate — red T-shirt, backpack, no beard yet — a production-engineering student.',
    links: [],
  },
  {
    id: '02-graduation',
    module: '02-graduation',
    svg: '02-graduation.svg',
    title: 'Graduation, 2021',
    section: 'Graduation',
    date: '2021-06',
    city: 'Kolkata',
    station: 'stop',
    palette: 'morning',
    weight: 1.8,
    description:
      'Graduation, 2021, in the convocation hall among rows of graduates in orange. Suman, his cap on his head, swings his arm and tosses it; the view zooms in and follows the spinning cap up past the roof into a sky of clouds and confetti, then back down as it lands on his head again. He then holds up his offer letter: Associate Software Engineer at Cloudcraftz, Kolkata, signed.',
    links: [],
  },
  {
    id: '03-kolkata',
    module: '03-cloudcraftz',
    svg: '03-kolkata.svg',
    title: 'Kolkata office, 2022 — Cloudcraftz',
    section: 'Cloudcraftz',
    date: '2022-02',
    city: 'Kolkata',
    station: 'stop',
    palette: 'mint',
    // Seconds per chapter live in content/pacing.ts: lessons, then each app.
    weight: weightOf('03-kolkata'),
    description:
      'The first desk, at Cloudcraftz. The monitor runs QOMIX test suites; the QOMIX app card lands on a phone with a 10K+ downloads badge, and a card for Tan90 builds in beside it. The downloads odometer starts at 10K.',
    links: [],
  },
  {
    id: '04-interview',
    module: '04-interview',
    // The same kind of desk as the office before it: a short transition, so the call starts
    // straight away (it plays from the first frame of the hold).
    enter: 0.7,
    svg: '04-interview.svg',
    title: 'Kolkata, 2023 — the BeWorld interview',
    section: 'BeWorld interview',
    date: '2023-07',
    city: 'Kolkata',
    station: 'stop',
    palette: 'peach',
    weight: 2.4,
    description:
      'Back at the desk in Kolkata, the monitor shows a video call: Suman interviews with BeWorld, the interviewer asks and he answers, then he smiles and leaves the call. A new mail lands in his inbox; he opens it, and the offer letter PDF zooms in with a green check and confetti.',
    links: [],
  },
  {
    id: '04-flight-hyd',
    module: '04-flight-hyd',
    // No build-up into the flight: the scene just starts.
    enter: 0,
    svg: '04-flight-hyd.svg',
    title: 'Kolkata → Hyderabad',
    section: 'Flight to Hyderabad',
    date: '2023-08',
    city: 'Kolkata → Hyderabad',
    station: 'transit',
    palette: 'afternoon',
    weight: 1.8,
    description:
      'On a flight from Kolkata: on the seat-back screen, an in-flight map of India draws in, pins drop on Kolkata and Hyderabad, and the view zooms in as the plane flies the route and lands at Hyderabad: Welcome to Hyderabad! The year rolls to 2023.',
    links: [],
  },
  {
    id: '05-hyderabad',
    module: '05-beworld',
    svg: '05-hyderabad.svg',
    title: 'Hyderabad, 2023 — BeWorld, and Scaler by night',
    section: 'BeWorld · Scaler',
    date: '2023-09',
    city: 'Hyderabad',
    station: 'stop',
    palette: 'day',
    // Pipeline, each app, then the night studying Scaler module by module.
    weight: weightOf('05-hyderabad'),
    description:
      'The BeWorld office in Hyderabad, from day to night. By day, the release pipeline on the monitor lights up stage by stage; then the monitor presents the apps Suman built — BeWorld, the Bengali social hub, then Current Affairs Daily GK — each with a short description beside a carousel of its real screens, one at a time, each named, and each goes live on its Play Store listing. The desk phones show their logos; BeWorld stamps 500K+ downloads and Current Affairs 50K+, and the odometer races up. Then dusk falls: the monitor fades, the lamp comes on, and by night he studies with Scaler on the same monitor — the Scaler curriculum ticks off module by module, DSA, LLD, HLD, System Design, Databases, Concurrency and the Capstone.',

    links: [],
  },
  {
    id: '07-flight-home',
    module: '07-flight-home',
    // No build-up into the flight: the scene just starts.
    enter: 0,
    svg: '07-flight-home.svg',
    title: 'Hyderabad → Kolkata',
    section: 'Flight home',
    date: '2024-03',
    city: 'Hyderabad → Kolkata',
    station: 'transit',
    palette: 'evening',
    weight: 1.4,
    description:
      'The flight home. On the seat-back screen, the in-flight map of India draws in, pins drop on Hyderabad and Kolkata, and the view zooms in as the plane flies back and lands in Kolkata: Welcome home! On the tray, his laptop gets a REMOTE sticker.',
    links: [],
  },
  {
    id: '10-open-source',
    module: '10-open-source',
    svg: '10-open-source.svg',
    title: 'Highlight — open source',
    section: 'Open source ★',
    // When the PR merged into flutter/samples (May 28, 2024).
    date: '2024-05',
    city: 'Kolkata · Remote',
    station: 'star',
    palette: 'day',
    // Browsing the issues first, then the fix (scenes/10-open-source.ts).
    weight: 4.6,
    description:
      'Suman at his desk, in the middle under the monitor. In the editor he types the fix; then the pull request plays: review requested, comments, checks passing one by one, approved, and a Merged toast — merged into the official Flutter repository. The view zooms into flutter/flutter’s contributors, his photo among them, and a banner rises with confetti: Official Flutter Contributor.',
    links: ['flutter-pr'],
  },
  {
    id: '08-interview',
    module: '08-interview',
    svg: '08-interview.svg',
    title: 'Kolkata, 2024 — the Neura Dynamics interview',
    section: 'Neura Dynamics interview',
    // After the Flutter PR merged (May 2024): the chapters are in calendar order.
    date: '2024-05',
    city: 'Kolkata',
    station: 'stop',
    palette: 'lilac',
    weight: 2.4,
    description:
      'Back home in Kolkata, the monitor shows a video call: Suman interviews with Neura Dynamics, the interviewer asks and he answers, then he smiles and leaves the call. A new mail lands in his inbox; he opens it, and the offer letter PDF zooms in with a green check and confetti.',
    links: [],
  },
  {
    id: '09-leading',
    module: '09-leading',
    svg: '09-leading.svg',
    title: 'Leading the team',
    section: 'Tech Lead',
    date: '2024-11',
    city: 'Kolkata · Remote',
    station: 'stop',
    palette: 'afternoon',
    // A whole day: the stand-up, then Jira, Docker and the backend, each a lesson and then at work.
    weight: weightOf('09-leading'),
    description:
      'One whole working day at Neura Dynamics, on the big monitor. 10 AM: the team sync, Suman on screen as Tech Lead asking what everyone is working on today, and the team answering one by one. Then his hands come onto the keyboard and the screen moves through the day, each stop with its clock, first as a lesson in the style of his first desk (a syllabus that ticks off, the notes typing out), then the tool at work. 11:30 AM, Learning Jira, then the sprint board with tickets moving across it; 3:15 PM, Learning Docker, then Docker Desktop bringing the backend stack up container by container; 7:40 PM, Learning Backend, then VS Code with the SSE chat endpoint typed out, reloaded and tested; 10:20 PM, GitHub, a teammate’s pull request reviewed, checks passing, approved and merged. Outside, the light follows the desk clock from afternoon gold to a sunset to night, and the desk lamp comes on. Role updated: Technical Lead.',
    links: [],
  },
  {
    id: '09-cicd',
    module: '09-cicd',
    svg: '09-cicd.svg',
    title: 'Neura Dynamics — cloud engineering & CI/CD',
    section: 'Cloud & CI/CD',
    date: '2024-12',
    city: 'Kolkata · Remote',
    station: 'stop',
    palette: 'sky',
    // The card, then Azure, Google Cloud, Azure DevOps and GitHub Actions: the screens flash by, then the
    // platform's own UI plays slowly (screens/cloud-flow.ts).
    weight: weightOf('09-cicd'),
    description:
      'At the same desk, his hands on the keyboard, the big monitor opens a Cloud & CI/CD card: the cloud services and pipelines behind the products he leads, every change built, tested and shipped automatically. Then four platforms, one at a time: the cloud first, then testing and CI/CD. Each starts with a short description and its real console screens flashing by, each named, then its own UI plays slowly. Azure, the cloud: Azure Front Door and the resource groups, then the environment built up, a resource group, storage, Front Door and a custom domain with TLS, before the edge serves requests. Google Cloud: the Cloud Run services overview, one service’s metrics and the billing report, then a Cloud Run rollout: build, push, deploy the new revision, move the traffic across and watch requests arrive on new instances. Azure DevOps, for the repos, tests and pipelines: the production pipeline run and the boards with the Cypress testing work, then a merge to main, the Cypress tests and a release deploying stage by stage as its log streams. GitHub Actions: the workflow run, its build log and the CI job, then the workflow’s jobs, lint, type checks, unit tests, build, end-to-end tests and Lighthouse, ticking green before the deploy. Each ends with a stamp: live, running, deployed, passing.',
    links: [],
  },
  {
    id: '09-neura-apps',
    module: '09-neura-apps',
    svg: '09-neura-apps.svg',
    title: 'Neura Dynamics — what we shipped',
    section: 'Neura Dynamics work',
    date: '2025-01',
    city: 'Kolkata · Remote',
    station: 'stop',
    palette: 'sky',
    // Four products, Twilio, then the "see them live" shelf.
    weight: weightOf('09-neura-apps'),
    description:
      'Back at the desk, his hands on the keyboard, the big monitor shows what Suman shipped at Neura Dynamics as Tech Lead. Each product gets a short description and its real screens, one at a time, each named. Klass Online, an app to learn or teach any skill live, and Ayantra, a calm reflection app: their screens turn on a carousel, each goes live on its Play Store listing, and its desk phone stamps the downloads badge. Then two web platforms: DocPharma, a healthcare quick-commerce supply chain, and MeritHyre, AI-led interviews with a recruiting assistant — their pages slide through a browser, and each goes live in production. Last, MeritHyre’s Twilio SMS integration: the A2P 10DLC onboarding ticks off step by step — subaccount, phone number, Trust Hub profiles, brand, campaign — the connection tests OK and it saves.',
    links: [],
  },
  {
    id: '11-quiet-shelf',
    module: '11-quiet-shelf',
    svg: '11-quiet-shelf.svg',
    title: 'Personal work — The Quiet Shelf',
    // Both personal projects are one chapter in the player: "Personal work".
    section: 'Personal work',
    date: '2025-06',
    city: 'Kolkata',
    station: 'stop',
    palette: 'cocoa',
    // The "Personal work" card, then the project.
    weight: weightOf('11-quiet-shelf'),
    description:
      'Personal work begins: a card on the big monitor says these are projects Suman builds on his own time, outside the day job — designed, coded and shipped end to end — and The Quiet Shelf and Khyaati Prakashan pop in. First, The Quiet Shelf, a reading and watching community. At the desk, his hands on the keyboard, the big monitor shows what it is and slides through its real pages in a browser, each named — the community feed with reviews and picks, a picks discussion, My Library, and Discover — then the live site at thequietshelf.art, linked to explore.',
    links: ['quiet-shelf'],
  },
  {
    id: '11-khyaati',
    module: '11-khyaati',
    svg: '11-khyaati.svg',
    title: 'Personal work — Khyaati Prakashan',
    section: 'Personal work',
    date: '2025-09',
    city: 'Kolkata',
    station: 'stop',
    palette: 'navy',
    weight: weightOf('11-khyaati'),
    description:
      'More personal work: Khyaati Prakashan, a publisher’s book marketplace. The big monitor shows what it is and slides through its real pages in a browser, each named — the marketplace, a book page, the cart — then the live site at khyaatiprakashan.store. Then a reader buys: on the cart, the Razorpay checkout opens for ₹424, UPI is chosen, the payment succeeds and the order is placed.',
    links: ['khyaati'],
  },
  {
    id: '15-departures',
    module: '15-departures',
    svg: '15-departures.svg',
    title: 'Departures',
    section: 'Contact',
    date: 'now',
    city: 'Kolkata',
    station: 'stop',
    palette: 'evening',
    weight: 1.8,
    description:
      'An airport departures board flips letter by letter to let’s connect. Its rows are the contact links: his email address in capitals (with a Copy button), LinkedIn, GitHub and Résumé; below, See my CV and Replay the journey.',
    links: ['email', 'linkedin', 'github', 'resume', 'cta-cv', 'restart'],
  },
] satisfies SceneInput[];
