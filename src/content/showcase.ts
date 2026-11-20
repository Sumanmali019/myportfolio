/**
 * The apps Suman builds on the desk monitors — Cloudcraftz (chapter 03, `showcase`), BeWorld
 * (chapter 05, `beworldShowcase`) and Neura Dynamics (chapter 09b, `neuraShowcase`), in
 * order: their logos, real
 * screenshots (resized copies in src/assets/apps/) and a few lines of the Flutter code that
 * types out in the editor while the emulator flips through the screens.
 *
 * To change what's shown, edit this file and the images — no engine changes needed.
 */
import qomix1 from '../assets/apps/qomix-1.webp?url';
import qomix2 from '../assets/apps/qomix-2.webp?url';
import qomix3 from '../assets/apps/qomix-3.webp?url';
import qomix4 from '../assets/apps/qomix-4.webp?url';
import qomixLogo from '../assets/apps/qomix-logo.webp?url';
import ten901 from '../assets/apps/ten90-1.webp?url';
import ten902 from '../assets/apps/ten90-2.webp?url';
import ten903 from '../assets/apps/ten90-3.webp?url';
import ten904 from '../assets/apps/ten90-4.webp?url';
import ten905 from '../assets/apps/ten90-5.webp?url';
import ten906 from '../assets/apps/ten90-6.webp?url';
import ten90Logo from '../assets/apps/ten90-logo.webp?url';
import beworld1 from '../assets/apps/beworld-1.webp?url';
import beworld2 from '../assets/apps/beworld-2.webp?url';
import beworld3 from '../assets/apps/beworld-3.webp?url';
import beworld4 from '../assets/apps/beworld-4.webp?url';
import beworldLogo from '../assets/apps/beworld-logo.webp?url';
import cadgk1 from '../assets/apps/cadgk-1.webp?url';
import cadgk2 from '../assets/apps/cadgk-2.webp?url';
import cadgk3 from '../assets/apps/cadgk-3.webp?url';
import cadgk4 from '../assets/apps/cadgk-4.webp?url';
import cadgkLogo from '../assets/apps/cadgk-logo.webp?url';
import klass1 from '../assets/apps/klass-1.webp?url';
import klass2 from '../assets/apps/klass-2.webp?url';
import klass3 from '../assets/apps/klass-3.webp?url';
import klass4 from '../assets/apps/klass-4.webp?url';
import klassLogo from '../assets/apps/klass-logo.webp?url';
import ayantra1 from '../assets/apps/ayantra-1.webp?url';
import ayantra2 from '../assets/apps/ayantra-2.webp?url';
import ayantra3 from '../assets/apps/ayantra-3.webp?url';
import ayantra4 from '../assets/apps/ayantra-4.webp?url';
import ayantraLogo from '../assets/apps/ayantra-logo.webp?url';
import docpharma1 from '../assets/apps/docpharma-1.webp?url';
import docpharma2 from '../assets/apps/docpharma-2.webp?url';
import docpharma3 from '../assets/apps/docpharma-3.webp?url';
import docpharma4 from '../assets/apps/docpharma-4.webp?url';
import docpharmaLogo from '../assets/apps/docpharma-logo.webp?url';
import merithyre1 from '../assets/apps/merithyre-1.webp?url';
import merithyre2 from '../assets/apps/merithyre-2.webp?url';
import merithyreLogo from '../assets/apps/merithyre-logo.webp?url';
import quietshelf1 from '../assets/apps/quietshelf-1.webp?url';
import quietshelf2 from '../assets/apps/quietshelf-2.webp?url';
import quietshelf3 from '../assets/apps/quietshelf-3.webp?url';
import quietshelf4 from '../assets/apps/quietshelf-4.webp?url';
import quietshelf5 from '../assets/apps/quietshelf-5.webp?url';
import quietshelfLogo from '../assets/apps/quietshelf-logo.webp?url';
import khyaati1 from '../assets/apps/khyaati-1.webp?url';
import khyaati2 from '../assets/apps/khyaati-2.webp?url';
import khyaati3 from '../assets/apps/khyaati-3.webp?url';
import khyaatiLogo from '../assets/apps/khyaati-logo.webp?url';

import type { DiagramKind } from '../screens/scaler-diagrams';

export interface Showcase {
  /** Matches an app `key` in profile.ts. */
  key: string;
  name: string;
  logo: string;
  /** What it is and what Suman built, shown beside its screens. */
  about: string;
  /** Its stack. */
  stack: string[];
  shots: string[];
  /** One line per screenshot (same order as `shots`): what that screen shows. */
  captions: string[];
  /** Accent colour for the window tab, progress bar and caption. */
  accent: string;
  /** A project of Suman's own (personal work), not for an employer: its screen says so. */
  personal?: boolean;
  /** Its Play Store listing, shown once the release is live (mobile apps). */
  store?: {
    title: string;
    publisher: string;
    downloads: string;
    rating?: string;
    reviews?: string;
  };
  /**
   * A web app instead: its screens are desktop screenshots (shown in a browser window, not on
   * phones) and, once deployed, the live site at `url` replaces the Play Store listing.
   */
  site?: { url: string; title: string };
}

/** What Suman learns first, on the same monitor, while we still see him from behind. */
export interface Lesson {
  topic: string;
  color: string;
  code: string[];
}

export const learning: Lesson[] = [
  {
    topic: 'Dart',
    color: '#3fa9d6',
    code: ['void main() {', "  final name = 'Suman';", "  print('Hello, $name!');", '}'],
  },
  {
    topic: 'Flutter',
    color: '#4fc3f7',
    code: [
      'class Hello extends StatelessWidget {',
      '  @override',
      '  Widget build(BuildContext context) =>',
      "      const Text('Hello, Flutter');",
      '}',
    ],
  },
  {
    topic: 'Testing',
    color: '#5cc38a',
    code: [
      "testWidgets('counter goes up', (t) async {",
      '  await t.pumpWidget(const App());',
      '  await t.tap(find.byIcon(Icons.add));',
      "  expect(find.text('1'), findsOneWidget);",
      '});',
    ],
  },
  {
    topic: 'Firebase',
    color: '#f2a541',
    code: [
      'final db = FirebaseFirestore.instance;',
      "await db.collection('users')",
      "    .doc(uid).set({'name': name});",
      'await FirebaseAuth.instance.signInAnonymously();',
    ],
  },
  {
    topic: 'React',
    color: '#61dafb',
    code: [
      'function Hello({ name }) {',
      '  const [n, setN] = useState(0);',
      '  return <button onClick={() => setN(n + 1)}>',
      '    Hi {name} · {n}</button>;',
      '}',
    ],
  },
];

/** One Scaler module: its lecture (a video) and the points from its reading notes. */
export interface ScalerModule {
  topic: string;
  color: string;
  lecture: string;
  /** The diagram in its lecture video (screens/scaler-diagrams.ts). */
  diagram: DiagramKind;
  notes: string[];
}

/**
 * Chapter 05, by night: what Suman studies with Scaler (Dec 2023 – Feb 2025), module by module,
 * on the same big monitor — a lecture video, then the reading notes (screens/scaler-study.ts).
 */
export const scalerModules: ScalerModule[] = [
  {
    topic: 'DSA',
    color: '#5cc38a',
    lecture: 'Binary search & graphs',
    diagram: 'binary-search',
    notes: [
      'Halve the search space at every step',
      'O(log n) time, O(1) extra space',
      'BFS finds shortest paths in unweighted graphs',
    ],
  },
  {
    topic: 'LLD',
    color: '#a68cf0',
    lecture: 'Design patterns: Strategy',
    diagram: 'uml',
    notes: [
      'Program to interfaces, not classes',
      'Swap behaviour at runtime with Strategy',
      'Open for extension, closed for change',
    ],
  },
  {
    topic: 'HLD',
    color: '#6aa7e0',
    lecture: 'Designing a URL shortener',
    diagram: 'architecture',
    notes: [
      'Stateless API servers behind a load balancer',
      'Cache hot keys in Redis',
      'Shard the database by key hash',
    ],
  },
  {
    topic: 'System Design',
    color: '#f2b84b',
    lecture: 'Rate limiting at scale',
    diagram: 'token-bucket',
    notes: [
      'Token bucket per user or API key',
      'Keep counters in Redis with a TTL',
      'Reply 429 with a Retry-After header',
    ],
  },
  {
    topic: 'Databases',
    color: '#4fc3f7',
    lecture: 'Indexes & query plans',
    diagram: 'tables',
    notes: [
      'B-tree indexes speed up lookups and ranges',
      'Read the plan with EXPLAIN ANALYZE',
      'Normalise first; denormalise for hot reads',
    ],
  },
  {
    topic: 'Concurrency',
    color: '#ef6a5f',
    lecture: 'Threads, locks & pools',
    diagram: 'threads',
    notes: [
      'Prefer thread pools to raw threads',
      'Atomics avoid lock contention',
      'Avoid deadlock: always lock in one order',
    ],
  },
  {
    topic: 'Capstone',
    color: '#c9a27a',
    lecture: 'Capstone project',
    diagram: 'pipeline',
    notes: [
      'Plan the design: LLD, schema and APIs',
      'Build, test and containerise it',
      'Present it for review',
    ],
  },
];

export const showcase: Showcase[] = [
  {
    key: 'ten90',
    name: 'Tan90',
    logo: ten90Logo,
    about:
      'An exam app for teachers: set the answer key, print OMR bubble sheets, scan the students’ sheets with the phone camera and get graded reports in seconds.',
    stack: ['Flutter', 'Dart', 'OMR scanning', 'PDF export'],
    shots: [ten901, ten902, ten903, ten904, ten905, ten906],
    captions: [
      'Exam list with sync and visibility status',
      'Exam details with scanning and reports',
      'Answer key setup with MCQ and true/false',
      'Exams list grouped by class',
      'Scan answer sheets to generate a report',
      'OMR bubble sheet preview and PDF export',
    ],
    accent: '#8f7ad6',
    store: { title: 'Tan-ninety Scanner', publisher: 'Ekodroid labs', downloads: '500+' },
  },
  {
    key: 'qomix',
    name: 'QOMIX',
    logo: qomixLogo,
    about:
      'A comic-reading app from Auteur with an all-star line-up of creators. At Cloudcraftz, I wrote its system-integration and performance test suites in Flutter, keeping the feed and reader fast and stable.',
    stack: ['Flutter', 'Dart', 'Integration tests', 'Performance tests'],
    shots: [qomix1, qomix2, qomix3, qomix4],
    captions: [
      'Splash screen featuring illustrated comic creators',
      'Reading a nonfiction comic story',
      'Grid of free comics filtered by category',
      'Home feed with featured comics carousel',
    ],
    accent: '#f2b84b',
    store: {
      title: 'QOMIX',
      publisher: 'Auteur Pte. Ltd.',
      downloads: '10K+',
      rating: '4.3★',
      reviews: '53 reviews',
    },
  },
];

/** Chapter 05: what Suman ships at BeWorld, built on the monitor after the CI/CD pipeline. */
export const beworldShowcase: Showcase[] = [
  {
    key: 'cadgk',
    name: 'Current Affairs',
    logo: cadgkLogo,
    about:
      'A daily current-affairs and GK app for exam aspirants, with 50K+ downloads: news tagged by exam, revision capsules and practice quizzes, in English and Hindi.',
    stack: ['Flutter', 'Dart', 'REST APIs', 'Localisation'],
    shots: [cadgk1, cadgk2, cadgk3, cadgk4],
    captions: [
      'Daily current affairs tagged by exam',
      'Full news story in scroll reading mode',
      'Revision timeline and monthly capsules',
      'Practice dashboard with quizzes, in Hindi',
    ],
    accent: '#e07b26',
    store: {
      title: 'Current Affairs Daily GK',
      publisher: 'BeWorld Webservice PVT LTD.',
      downloads: '50K+',
    },
  },
  {
    key: 'beworld',
    name: 'BeWorld',
    logo: beworldLogo,
    about:
      'A Bengali social hub with 500K+ downloads: a social feed plus mini apps for news (Khobor), games and an AI assistant. I built features in Flutter and set up Codemagic CI/CD to both stores.',
    stack: ['Flutter', 'Riverpod', 'Codemagic CI/CD', 'Firebase'],
    shots: [beworld1, beworld2, beworld3, beworld4],
    captions: [
      'Social feed with links to mini apps',
      'Khobor news feed by category',
      'Games hub with search and genre filters',
      'Ask Anything AI assistant intro',
    ],
    accent: '#6366f1',
    store: {
      title: 'BeWorld : Bengali Social Hub',
      publisher: 'BeWorld Webservice PVT LTD.',
      downloads: '500K+',
      rating: '3.0★',
      reviews: '414 reviews',
    },
  },
];

/**
 * Chapter 09b: what Suman ships at Neura Dynamics as Tech Lead — two Flutter apps on the Play
 * Store, then two web platforms, each with its whole stack typed out file by file (front end,
 * Python backend, Docker). (MeritHyre's Twilio A2P 10DLC onboarding follows on the same
 * monitor: screens/twilio-10dlc.ts.)
 */
export const neuraShowcase: Showcase[] = [
  {
    key: 'klass-online',
    name: 'Klass Online',
    logo: klassLogo,
    about:
      'An app to learn or teach any skill live, built for a client in Qatar. As Tech Lead, I shipped the Flutter app, the FastAPI booking backend and its Docker setup.',
    stack: ['Flutter', 'FastAPI', 'PostgreSQL', 'Docker'],
    shots: [klass1, klass2, klass3, klass4],
    captions: [
      'Home with instructor search and sessions',
      'Creative skill categories and top instructors',
      'Choose to sign up as teacher or learner',
      'Weekly calendar of booked sessions',
    ],
    accent: '#2f6bff',
    store: { title: 'Klass Online', publisher: 'Klass Online LLC', downloads: '100+' },
  },
  {
    key: 'ayantra',
    name: 'Ayantra',
    logo: ayantraLogo,
    about:
      'A calmer way to navigate life: AI reflections on your situations, the phases you go through and the people in them, with end-to-end encrypted conversations.',
    stack: ['Flutter', 'FastAPI', 'LLMs', 'E2E encryption', 'Docker'],
    shots: [ayantra1, ayantra2, ayantra3, ayantra4],
    captions: [
      'Add a person to see their influence',
      'AI reflection on a personal situation',
      'Life phase view with saved reflections',
      'End-to-end encrypted conversations',
    ],
    accent: '#a0663f',
    store: { title: 'Ayantra', publisher: 'AyantraPath Private Limited', downloads: '50+' },
  },
  {
    key: 'docpharma',
    name: 'DocPharma',
    logo: docpharmaLogo,
    about:
      'India’s first healthcare quick-commerce supply chain: prescription medicines delivered in under 30 minutes. I led the Next.js site and the Python order-dispatch services.',
    stack: ['Next.js', 'React', 'FastAPI', 'Docker'],
    shots: [docpharma1, docpharma2, docpharma3, docpharma4],
    captions: [
      'Landing hero for 30-minute medicine delivery',
      'Five-step fulfilment platform overview',
      'Healthcare brands that trust DocPharma',
      'Key delivery stats and partner integrations',
    ],
    accent: '#1e88c7',
    site: { url: 'docpharma.in', title: 'DocPharma — Healthcare quick commerce' },
  },
  {
    key: 'merithyre',
    name: 'MeritHyre',
    logo: merithyreLogo,
    about:
      'AI-led interviews and a recruiting assistant: campaigns, candidate scores and an LLM interview agent, with Twilio SMS (A2P 10DLC) to reach candidates.',
    stack: ['Next.js', 'Python', 'LLMs', 'Twilio', 'Redis'],
    shots: [merithyre1, merithyre2],
    captions: ['Hiring dashboard with campaigns and scores', 'AI recruiting assistant chat'],
    accent: '#7c4dff',
    site: { url: 'merithyre.ai', title: 'MeritHyre — AI interviews' },
  },
];

/** Every app with a logo and screens, for lookups by `key`. */
/**
 * Personal work, each a chapter of its own (11a, 11b): The Quiet Shelf, a reading (and
 * watching) community; Khyaati Prakashan, a publisher's book marketplace with Razorpay checkout.
 */
export const quietShelfShowcase: Showcase[] = [
  {
    key: 'quiet-shelf',
    name: 'The Quiet Shelf',
    personal: true,
    logo: quietshelfLogo,
    about:
      'A personal project: a reading and watching community. Post reviews, ask for picks, keep Currently Reading / Read Later / Completed lists, and discover books with their film adaptations.',
    stack: ['React', 'FastAPI', 'Python', 'Tailwind CSS'],
    shots: [quietshelf1, quietshelf2, quietshelf3, quietshelf4, quietshelf5],
    captions: [
      'Community feed of book and film reviews',
      'Discussion thread asking for book picks',
      'Personal library of books being read',
      'Discover books paired with film adaptations',
      'Browse movies by genre with ratings',
    ],
    accent: '#c9a27a',
    site: { url: 'thequietshelf.art', title: 'The Quiet Shelf' },
  },
];

export const khyaatiShowcase: Showcase[] = [
  {
    key: 'khyaati',
    name: 'Khyaati Prakashan',
    personal: true,
    logo: khyaatiLogo,
    about:
      'A personal project for a publishing house: a book marketplace with author and admin portals, role-based access and Razorpay checkout.',
    stack: ['React', 'Go', 'RBAC', 'Razorpay', 'Google Cloud'],
    shots: [khyaati1, khyaati2, khyaati3],
    captions: [
      'Book marketplace with filters and prices',
      'Book page with synopsis and specs',
      'Cart checkout with sign-in and order summary',
    ],
    accent: '#3b82f6',
    site: { url: 'khyaatiprakashan.store', title: 'Khyaati Prakashan' },
  },
];

export const allShowcase: Showcase[] = [
  ...showcase,
  ...beworldShowcase,
  ...neuraShowcase,
  ...quietShelfShowcase,
  ...khyaatiShowcase,
];
