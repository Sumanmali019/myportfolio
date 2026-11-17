/**
 * The apps Suman builds on the Cloudcraftz monitor (chapter 03), in order: their logos, real
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
  /** Its Play Store listing, shown once the release is live. */
  store: { title: string; publisher: string; downloads: string; rating?: string; reviews?: string };
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
