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

export interface Showcase {
  /** Matches an app `key` in profile.ts. */
  key: string;
  name: string;
  /** File open in the editor tab. */
  file: string;
  logo: string;
  shots: string[];
  code: string[];
  /** Accent colour for the editor tab, build bar and status. */
  accent: string;
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

export const showcase: Showcase[] = [
  {
    key: 'qomix',
    name: 'QOMIX',
    file: 'lib/feed/comic_feed.dart',
    logo: qomixLogo,
    shots: [qomix1, qomix2, qomix3, qomix4],
    accent: '#f2b84b',
    store: {
      title: 'QOMIX',
      publisher: 'Auteur Pte. Ltd.',
      downloads: '10K+',
      rating: '4.3★',
      reviews: '53 reviews',
    },
    code: [
      'class ComicFeed extends StatelessWidget {',
      '  @override',
      '  Widget build(BuildContext context) {',
      '    final comics = context.watch<Feed>();',
      '    return CustomScrollView(slivers: [',
      '      CategoryChips(onPick: comics.filter),',
      '      CarouselOf(comics.featured),',
      '      SurpriseMe(comics.random),',
      '    ]);',
      '  }',
      '}',
    ],
  },
  {
    key: 'ten90',
    name: 'Tan90',
    file: 'lib/exam/answer_key.dart',
    logo: ten90Logo,
    shots: [ten901, ten902, ten903, ten904, ten905, ten906],
    accent: '#8f7ad6',
    store: { title: 'Tan-ninety Scanner', publisher: 'Ekodroid labs', downloads: '500+' },
    code: [
      'class AnswerKey extends StatefulWidget {',
      '  final Exam exam;',
      '  const AnswerKey(this.exam);',
      '}',
      '',
      'Future<Report> scanSheet(Image omr) async {',
      '  final marks = await Omr.detect(omr);',
      '  return Report.grade(marks, key);',
      '}',
    ],
  },
];

/** Chapter 05: what Suman ships at BeWorld, built on the monitor after the CI/CD pipeline. */
export const beworldShowcase: Showcase[] = [
  {
    key: 'beworld',
    name: 'BeWorld',
    file: 'lib/feed/for_you_feed.dart',
    logo: beworldLogo,
    shots: [beworld1, beworld2, beworld3, beworld4],
    accent: '#6366f1',
    store: {
      title: 'BeWorld : Bengali Social Hub',
      publisher: 'BeWorld Webservice PVT LTD.',
      downloads: '500K+',
      rating: '3.0★',
      reviews: '414 reviews',
    },
    code: [
      'class ForYouFeed extends ConsumerWidget {',
      '  @override',
      '  Widget build(BuildContext context, WidgetRef ref) {',
      '    final posts = ref.watch(feedProvider);',
      '    return CustomScrollView(slivers: [',
      '      ExploreApps(khobor, panjika, marriage, market),',
      '      PostList(posts, onLike: ref.read(likes).toggle),',
      '    ]);',
      '  }',
      '}',
    ],
  },
  {
    key: 'cadgk',
    name: 'Current Affairs',
    file: 'lib/daily/daily_digest.dart',
    logo: cadgkLogo,
    shots: [cadgk1, cadgk2, cadgk3, cadgk4],
    accent: '#e07b26',
    store: {
      title: 'Current Affairs Daily GK',
      publisher: 'BeWorld Webservice PVT LTD.',
      downloads: '50K+',
    },
    code: [
      'class DailyDigest extends StatelessWidget {',
      '  final DateTime day;',
      '  const DailyDigest(this.day);',
      '',
      '  Future<List<Story>> load(Exam exam) =>',
      '      api.stories(day, exam: exam, lang: locale);',
      '',
      '  Quiz quizFor(List<Story> s) => Quiz.from(s, n: 10);',
      '}',
    ],
  },
];

/**
 * Chapter 09b: what Suman ships at Neura Dynamics as Tech Lead — two Flutter apps on the Play
 * Store, then two web platforms. (MeritHyre's Twilio A2P 10DLC onboarding follows on the same
 * monitor: screens/twilio-10dlc.ts.)
 */
export const neuraShowcase: Showcase[] = [
  {
    key: 'klass-online',
    name: 'Klass Online',
    file: 'lib/sessions/session_schedule.dart',
    logo: klassLogo,
    shots: [klass1, klass2, klass3, klass4],
    accent: '#2f6bff',
    store: { title: 'Klass Online', publisher: 'Klass Online LLC', downloads: '100+' },
    code: [
      'class SessionSchedule extends ConsumerWidget {',
      '  @override',
      '  Widget build(BuildContext context, WidgetRef ref) {',
      '    final week = ref.watch(sessionsProvider(range));',
      '    return CalendarGrid(',
      '      sessions: week,',
      '      legend: [oneOnOne, group, home, paused, booked],',
      '      onBook: ref.read(booking).reserve,',
      '    );',
      '  }',
      '}',
    ],
  },
  {
    key: 'ayantra',
    name: 'Ayantra',
    file: 'lib/phases/your_phase.dart',
    logo: ayantraLogo,
    shots: [ayantra1, ayantra2, ayantra3, ayantra4],
    accent: '#a0663f',
    store: { title: 'Ayantra', publisher: 'AyantraPath Private Limited', downloads: '50+' },
    code: [
      'class YourPhase extends ConsumerWidget {',
      '  @override',
      '  Widget build(BuildContext context, WidgetRef ref) {',
      '    final phase = ref.watch(phaseProvider);',
      '    return ReflectionView(',
      '      phase: phase,',
      '      people: ref.watch(peopleInPhase),',
      '      chat: EncryptedChat(ref.read(keys)),',
      '    );',
      '  }',
      '}',
    ],
  },
  {
    key: 'docpharma',
    name: 'DocPharma',
    file: 'app/(site)/page.tsx',
    logo: docpharmaLogo,
    shots: [docpharma1, docpharma2, docpharma3, docpharma4],
    accent: '#1e88c7',
    site: { url: 'docpharma.in', title: 'DocPharma — Healthcare quick commerce' },
    code: [
      'export default async function Home() {',
      '  const brands = await cms.partners();',
      '  return (',
      '    <main>',
      '      <Hero tagline="30 Minutes Delivery" />',
      '      <TrustedBy logos={brands} />',
      '      <FulfilmentFlow steps={checkpoints} />',
      '    </main>',
      '  );',
      '}',
    ],
  },
  {
    key: 'merithyre',
    name: 'MeritHyre',
    file: 'app/dashboard/page.tsx',
    logo: merithyreLogo,
    shots: [merithyre1, merithyre2],
    accent: '#7c4dff',
    site: { url: 'merithyre.ai', title: 'MeritHyre — AI interviews' },
    code: [
      'export default async function Dashboard() {',
      '  const org = await session.org();',
      '  const [stats, campaigns] = await Promise.all([',
      '    api.metrics(org, { days: 7 }),',
      '    api.campaigns(org, { active: true }),',
      '  ]);',
      '  return <Metrics {...stats} campaigns={campaigns} />;',
      '}',
    ],
  },
];

/** Every app with a logo and screens, for lookups by `key`. */
export const allShowcase: Showcase[] = [...showcase, ...beworldShowcase, ...neuraShowcase];
