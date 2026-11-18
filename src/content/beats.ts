/**
 * Every bubble on the journey, per scene, in order.
 *
 *   kind     speech  — a rounded bubble from an object or person
 *            thought — a scalloped cloud
 *            screen  — a flat card with an uppercase WHO label
 *   anchor   the `data-anchor` of the element the tail points at (must exist in both SVGs)
 *   trigger  optional cue played before the bubble pops: steam | buzz | ci | rings | burst
 */
import type { Beat } from './schema';
import { profile } from './profile';

export const beats: Record<string, Beat[]> = {
  '01-jadavpur': [
    {
      kind: 'thought',
      anchor: 'head',
      text: 'Production engineering. Machines make sense… mostly.',
    },
  ],
  '03-kolkata': [
    // Just the first role (from profile.ts): Associate Software Engineer.
    {
      kind: 'thought',
      anchor: 'role',
      text:
        profile.experience.find((e) => e.company === 'Cloudcraftz')?.role ??
        'Associate Software Engineer',
    },
  ],
  '04-flight-hyd': [
    {
      kind: 'screen',
      who: 'Gate 7',
      anchor: 'board',
      trigger: 'rings',
      text: 'Now boarding · Kolkata → Hyderabad',
    },
  ],
  '05-hyderabad': [
    {
      kind: 'speech',
      who: 'Biryani',
      anchor: 'biryani',
      trigger: 'steam',
      text: 'Hyderabadi biryani > deadlines.',
    },
  ],
  '07-flight-home': [
    {
      kind: 'screen',
      who: 'Arrivals',
      anchor: 'board',
      trigger: 'rings',
      text: 'Welcome home to Kolkata · working remote from here.',
    },
  ],
  '09-leading': [
    {
      kind: 'screen',
      who: 'Profile',
      anchor: 'laptop',
      trigger: 'ci',
      text: 'Role updated · Technical Lead',
    },
    { kind: 'thought', anchor: 'head', text: 'Mentor first, merge second.' },
  ],
  '09-neura-apps': [{ kind: 'thought', anchor: 'role', text: 'Four products. One team.' }],
  '10-open-source': [
    {
      kind: 'screen',
      who: 'flutter/flutter',
      anchor: 'monitor',
      trigger: 'ci',
      text: 'Reviewer: “Nice catch. LGTM.”',
    },
    { kind: 'thought', anchor: 'head', text: 'My code, inside Flutter.' },
  ],
  '11-side-builds': [
    {
      kind: 'screen',
      who: 'The Quiet Shelf',
      anchor: 'phone',
      trigger: 'buzz',
      text: 'Someone finished the book you recommended.',
    },
  ],
};
