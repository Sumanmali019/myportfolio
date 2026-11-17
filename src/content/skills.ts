/**
 * Skills, one shelf jar per group (scene 02, the kitchen). Order = left → right on the shelf.
 * `jar` is the jar's lid/label colour.
 */
import type { SkillGroup } from './schema';

export const skills = [
  {
    group: 'Mobile',
    jar: '#3f8f8b',
    items: ['Flutter', 'Dart', 'Android (16KB page-size migration)', 'Firebase'],
  },
  { group: 'Frontend', jar: '#c8674a', items: ['React.js', 'Next.js', 'Tailwind CSS'] },
  {
    group: 'Backend',
    jar: '#5b5aa8',
    items: [
      'Python',
      'FastAPI',
      'Go',
      'Node.js',
      'Express.js',
      'Spring Boot',
      'Core Java',
      'REST APIs',
    ],
  },
  {
    group: 'AI',
    jar: '#b5578a',
    items: ['Generative AI', 'GenAI API extensions', 'Streaming chat (SSE / WebSockets)'],
  },
  {
    group: 'Cloud/Ops',
    jar: '#4f7cb8',
    items: [
      'AWS',
      'Microsoft Azure',
      'Google Cloud',
      'Azure DevOps',
      'CI/CD (Codemagic)',
      'Git',
      'Jira',
    ],
  },
  { group: 'Data', jar: '#c48b26', items: ['MySQL', 'SQL', 'Product analytics'] },
  {
    group: 'Craft',
    jar: '#6f8f5a',
    items: ['Integration & performance testing', 'Debugging', 'Code review', 'Mentoring'],
  },
] satisfies SkillGroup[];
