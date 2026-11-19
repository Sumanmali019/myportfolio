/**
 * The résumé (public/resume.pdf), as content: what the "CV" button shows over the journey
 * (components/SkipTheDay.astro). Keep it in step with the PDF.
 */

export interface ResumeLink {
  label: string;
  href: string;
}

export interface ResumeRole {
  title: string;
  company: string;
  period: string;
  points: string[];
}

export interface ResumeProject {
  name: string;
  link: string;
  role: string;
  points: string[];
}

export const resume = {
  name: 'Suman Mali',
  phone: '+91-9002261940',
  email: 'sumanmali019@gmail.com',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/suman-mali-3408981ab/' },
    { label: 'GitHub', href: 'https://github.com/Sumanmali019' },
    { label: 'LeetCode', href: 'https://leetcode.com/Sumanmali019/' },
  ] satisfies ResumeLink[],
  skills: [
    'React',
    'Firebase',
    'SQL',
    'JIRA',
    'GitHub',
    'REST API',
    'Android Development',
    'Azure',
    'iOS Development',
    'Python',
    'Java',
    'Flutter',
    'Node.js',
    'Spring Boot',
    'React Native',
    'MySQL',
    'MongoDB',
    'Azure DevOps',
    'HTTP',
    'CI/CD',
    'Git',
    'PostgreSQL',
    'Generative AI',
    'FastAPI',
    'Next.js',
    'Express.js',
    'MVVM',
    'JavaScript',
    'CSS',
    'HTML',
    'TypeScript',
  ],
  experience: [
    {
      title: 'Technical Lead',
      company: 'Neura Dynamics',
      period: 'May 2024 – Present',
      points: [
        'Technical Lead, ensuring timely delivery of client requirements with high-quality code, robust architecture, and seamless cross-functional collaboration.',
        'Conducted detailed sprint planning to prioritize features, manage timelines effectively, and ensure timely task delivery.',
        'Implemented a scalable public chat system using SSE and OpenAI, with proper parameter mapping, rate limiting, and request schema validation; achieved full test coverage to ensure reliability and performance.',
        'Led comprehensive code reviews to uphold coding standards, maintain code quality, and ensure production readiness across the codebase.',
        'Maintained and monitored CI/CD pipelines to automatically trigger and validate test cases upon every backend or frontend push, ensuring stability before code reviews.',
        'Designed and managed Azure DevOps pipelines to automate build, testing, and deployment workflows, improving release efficiency by 35% and reducing deployment errors.',
      ],
    },
    {
      title: 'Frontend Engineer',
      company: 'BeWorld',
      period: 'Sep 2023 – Nov 2023',
      points: [
        'Delivered production-ready code with comprehensive testing, ensuring reliability, maintainability, and seamless deployment.',
        'Implemented automated testing, reducing testing time by 50% and increasing test coverage by 40%.',
        'Implemented CI/CD pipelines to automate build, testing, and deployment processes, reducing manual effort and accelerating release cycles.',
        'Crafted visually appealing UI, improving user engagement by 30% across all platforms.',
        'Facilitated clear communication and collaboration between designers and developers, ensuring alignment on requirements and seamless feature delivery.',
        'Integrated Codemagic CI/CD pipelines to automate the build and distribution process for app releases across both App Store and Play Store environments.',
      ],
    },
    {
      title: 'Associate Software Developer',
      company: 'Cloudcraftz',
      period: 'Jan 2022 – Oct 2023',
      points: [
        'Designing and building advanced applications for Android.',
        'Working on bug fixing and improving application performance.',
        'Collaborating with clients to define, design and ship new features.',
        'Updated old code bases to modern development standards, improving functionality.',
        'Analyzed app user data using Google BigQuery & developed reports using Data Studio reporting services.',
      ],
    },
  ] satisfies ResumeRole[],
  projects: [
    {
      name: 'QOMIX (Comic book Application)',
      link: 'https://play.google.com/store/search?q=Qomix&c=apps',
      role: 'Mobile Developer (Flutter)',
      points: [
        'Engineered robust API services, enhancing system functionality and user experience.',
        'Developed comprehensive test suites achieving 95% coverage, significantly improving code reliability.',
        'Automated API testing with Postman and Newman, cutting testing time by 50% and boosting API reliability.',
        'Crafted visually appealing UI themes, elevating user engagement and satisfaction.',
        'Established automated testing frameworks, reducing manual testing efforts by 60% and accelerating deployment cycles.',
      ],
    },
    {
      name: 'BeWorld and Telword (social media application)',
      link: 'https://play.google.com/store/apps/details?id=com.mybeworld.beWorldApp',
      role: 'Mobile Developer (Flutter)',
      points: [
        'Built and maintained white-label support enabling multiple branded versions of the app from a single codebase, reducing development effort by 40%.',
        'Enhanced API reliability by automating testing with Postman and Newman, improving test coverage by 40%.',
        'Reduced API testing time, enabling faster feedback loops and proactively resolving API-related issues.',
        'Developed distinct app flavors for development, staging, and production, improving deployment efficiency by 60%.',
        'Prioritized and resolved critical bugs in the production application, decreasing average bug resolution time by 25%.',
      ],
    },
    {
      name: 'Klass Online',
      link: 'https://play.google.com/store/apps/details?id=com.klass.online',
      role: 'Technical Lead & Mobile Developer (Flutter) | Backend Developer',
      points: [
        'Automated end-to-end testing with Flutter, achieving 95% test coverage and ensuring a seamless user experience.',
        'Enhanced API reliability by automating testing with Postman and Newman, improving test coverage by 40%.',
        'Developed distinct app flavors for development, staging, and production, improving deployment efficiency by 30%.',
        'Prioritized and resolved critical bugs in production, decreasing average bug resolution time by 25%.',
        'Designed and integrated a real-time chat and notification system using WebSockets and FCM for improved engagement.',
        'Collaborated on backend services including API design, authentication, payment gateway integration, and session scheduling.',
      ],
    },
    {
      name: 'Prgya',
      link: 'https://prgya.com/',
      role: 'Backend Developer',
      points: [
        'Enhanced chat functionality by implementing FastAPI with Server-Sent Events (SSE) and WebSockets, enabling real-time, reliable communication and improving user engagement.',
        'Integrated Arize Phoenix to evaluate responses dynamically, refining accuracy and tailoring system outputs based on contextual data for smarter interactions.',
        'Led and managed a cross-functional team, coordinating development efforts, resolving blockers, and fostering efficient collaboration across frontend, backend, and QA.',
        'Delivered all assigned tasks on time with consistent quality, ensuring smooth project milestones and zero critical delays.',
        'Improved overall product quality by automating tests, achieving 80%+ test coverage, reducing regression issues, and accelerating release cycles.',
      ],
    },
  ] satisfies ResumeProject[],
  achievements: [
    {
      label: 'Open Source Contribution – Flutter (Google)',
      href: 'https://github.com/flutter/samples/pull/2293',
    },
    {
      label: 'Java (Basic) – HackerRank · Issued Apr 2024',
      href: 'https://www.hackerrank.com/certificates/b65eced5392a',
    },
    {
      label: 'Problem Solving (Basic) – HackerRank · Issued Feb 2024',
      href: 'https://www.hackerrank.com/certificates/iframe/32b8456e98f2',
    },
  ] satisfies ResumeLink[],
  education: [{ school: 'Jadavpur University', degree: 'BE/B.Tech/BS', year: '2021' }],
};
