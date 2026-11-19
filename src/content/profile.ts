/**
 * Who I am. Edit freely — the build validates this file (src/content/schema.ts).
 * Values containing "example.com" or "your-username" are placeholders: the build warns until
 * they are replaced.
 */
import type { ProfileInput } from './schema';

export const profile = {
  name: 'Suman Mali',
  headline: 'SDE-2 · Technical Lead · Full-stack Developer',
  city: 'Kolkata, West Bengal, India',
  intro:
    'I lead teams that ship scalable products across cloud, AI and mobile — and I like asking why the chart moved.',
  about:
    'Technical Lead with a production-engineering background (Jadavpur University). I lead projects across cloud, AI and data analytics, working with engineers, designers and PMs. I do code reviews, mentoring and knowledge sharing, and help teams own their work while staying aligned with the architecture.',
  status: 'Open to roles — Kolkata · On-site / Hybrid / Remote',

  experience: [
    {
      company: 'Neura Dynamics',
      role: 'Technical Lead',
      period: 'May 2024 – Present',
      start: 2024,
      location: 'Remote',
      apps: ['Klass Online (Google Play)', 'Ayantra (Google Play)', 'DocPharma', 'MeritHyre'],
      stack: ['AWS', 'Java', 'GenAI', 'Next.js', 'Azure DevOps'],
      highlights: [
        'Leads delivery across cloud, AI and mobile projects',
        'Code reviews, mentoring and architecture alignment',
      ],
    },
    {
      company: 'BeWorld',
      role: 'Frontend Engineer',
      period: 'Sep 2023 – Nov 2023',
      start: 2023,
      location: 'Hyderabad',
      apps: ['BeWorld', 'Current Affairs Daily GK'],
      stack: ['Flutter', 'Codemagic'],
      highlights: [
        'Testing time −50%',
        'Test coverage +40%',
        'User engagement +30%',
        'Codemagic CI/CD to App Store & Play Store',
      ],
    },
    {
      company: 'Cloudcraftz',
      role: 'Associate Software Developer',
      period: 'Jan 2022 – Oct 2023',
      start: 2022,
      location: 'Kolkata',
      apps: ['QOMIX'],
      stack: ['Integration testing', 'Performance testing'],
      highlights: ['System integration & performance testing for QOMIX'],
    },
  ],

  projects: [
    {
      key: 'quiet-shelf',
      name: 'The Quiet Shelf',
      url: 'https://thequietshelf.art',
      summary:
        'A reading community with recommendations and Currently Reading / Read Later / Completed lists.',
      stack: ['Python', 'FastAPI', 'React', 'Tailwind CSS'],
    },
    {
      key: 'khyaati',
      name: 'Khyaati Prakashan',
      url: 'https://khyaatiprakashan.store',
      summary: 'Author Portal, Admin Portal and Book Marketplace for a publishing house.',
      stack: ['Go', 'REST APIs', 'RBAC', 'React', 'Tailwind CSS', 'Google Cloud'],
    },
    {
      key: 'flutter-pr',
      name: 'Flutter open-source contribution',
      url: 'https://github.com/flutter/samples/pull/2293',
      summary:
        'Bug fix in a Flutter sample app — reviewed and merged into the official Flutter repository.',
      stack: ['Flutter', 'Dart'],
    },
    {
      key: 'sse-repo',
      name: 'SSE vs WebSockets streaming chat',
      // TODO: replace with the repository URL.
      url: 'https://github.com/your-username/sse-vs-websockets-chat',
      summary: 'Boilerplate comparing Server-Sent Events and WebSockets for streaming AI chat.',
      stack: ['Python', 'FastAPI'],
    },
  ],

  /**
   * Apps along the way. `downloads` feeds the odometer (only known figures count);
   * `scene` is the chapter where the app is added.
   */
  apps: [
    {
      key: 'qomix',
      name: 'QOMIX',
      url: 'https://play.google.com/store/apps/details?id=com.optiquesutra.school&hl=en',
      company: 'Cloudcraftz',
      scene: '03-kolkata',
      downloads: 10_000,
      badge: '10K+ downloads',
      summary: 'System-integration and performance test suites for the QOMIX app.',
    },
    {
      key: 'ten90',
      name: 'Tan90',
      url: 'https://play.google.com/store/apps/details?id=com.ekodroid.tanninety',
      company: 'Cloudcraftz',
      scene: '03-kolkata',
      summary: 'OMR exam app: answer keys, bubble sheets, scanning and reports.',
      badge: '500+ downloads',
    },
    {
      key: 'beworld',
      name: 'BeWorld',
      url: 'https://play.google.com/store/apps/details?id=com.mybeworld.beWorldApp',
      company: 'BeWorld',
      scene: '05-hyderabad',
      downloads: 500_000,
      badge: '500K+ downloads',
      summary: 'Flutter app with Codemagic CI/CD to the App Store and Play Store.',
    },
    {
      key: 'cadgk',
      name: 'Current Affairs Daily GK',
      url: 'https://play.google.com/store/apps/details?id=com.current_affairs_app.jobsafal.com',
      company: 'BeWorld',
      scene: '05-hyderabad',
      downloads: 50_000,
      badge: '50K+ downloads',
      summary: 'Daily current-affairs and GK quiz app.',
    },
    {
      key: 'docpharma',
      name: 'DocPharma',
      company: 'Neura Dynamics',
      scene: '09-neura-apps',
      // Check: the live site's address.
      url: 'https://docpharma.in',
      summary:
        'India’s first healthcare quick-commerce supply chain: prescription medicines in under 30 minutes.',
    },
    {
      key: 'klass-online',
      name: 'Klass Online',
      url: 'https://play.google.com/store/apps/details?id=com.klass.online',
      company: 'Neura Dynamics',
      scene: '09-neura-apps',
      downloads: 100,
      badge: '100+ downloads',
      role: 'Tech Lead',
      summary: 'Online-learning app on Google Play, built for a client in Qatar.',
    },
    {
      key: 'ayantra',
      name: 'Ayantra',
      url: 'https://play.google.com/store/apps/details?id=com.ayantra.ai',
      company: 'Neura Dynamics',
      scene: '09-neura-apps',
      downloads: 50,
      badge: '50+ downloads',
      summary: 'A calmer way to navigate life: reflections, phases and the people in them.',
    },
    {
      key: 'merithyre',
      name: 'MeritHyre',
      company: 'Neura Dynamics',
      scene: '09-neura-apps',
      url: 'https://merithyre.ai',
      summary:
        'AI-led interviews and a recruiting assistant, with Twilio SMS (A2P 10DLC) to reach candidates.',
    },
  ],

  now: 'Building the next one.',

  writing: [
    "iOS alarm list vs Android's radial dial — if it works, don't touch it.",
    'Android 15 needs 16KB page sizes. Checked every .so file. No warnings.',
    'Twilio A2P 10DLC: never submit the bundle before the brand. Error 30758 taught me.',
    'Candy Crush runs on one number: pass proximity. Brilliant — and a little uncomfortable.',
    "Sandboxed doesn't mean contained. Safety infra is load-bearing now.",
  ],

  education: [
    {
      school: 'Jadavpur University',
      course: 'B.E. Production Engineering',
      period: '2017 – 2021',
      short: 'JU 2017–21',
    },
    {
      school: 'Scaler',
      course: 'Computer Software Engineering',
      period: 'Dec 2023 – Feb 2025',
      short: 'Scaler 2023–25',
    },
  ],
  certifications: ['HackerRank Java (Basic)', 'HackerRank Problem Solving (Basic)'],

  contact: {
    email: 'sumanmali019@gmail.com',
    linkedin: 'https://www.linkedin.com/in/suman-mali-3408981ab/',
    github: 'https://github.com/Sumanmali019',
    resume: '/resume.pdf',
  },
} satisfies ProfileInput;
