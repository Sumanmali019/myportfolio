/**
 * 09a · Cloud engineering & CI/CD, before the Neura Dynamics work: the cloud services and
 * pipelines behind what he leads. The same desk and big monitor as the chapters around it
 * (scenes/desk-build.ts): a "Cloud & CI/CD" card first, then four platforms one after another:
 * the cloud (Azure, Google Cloud), then testing and CI/CD (Azure DevOps, GitHub Actions). For
 * each, its real console screens flash by (fast; content/showcase.ts → `ciCdShowcase`,
 * screens/app-build.ts), then its own UI plays slowly on the monitor (screens/cloud-flow.ts): an
 * Azure Front Door build-out, a Cloud Run rollout, an Azure DevOps test-and-release run, a GitHub
 * Actions workflow. Scroll-driven, so it all reverses.
 */
import { SECONDS as chapter } from '../content/pacing';
import { ciCdShowcase } from '../content/showcase';
import type { Screen } from '../engine/types';
import { appWindows } from '../screens/app-build';
import { azureDevOps, azurePortal, cloudRunDeploy, githubActions } from '../screens/cloud-flow';
import { deskBuildScene } from './desk-build';

/** The chapter in seconds at 1× (its weight in content/scenes.ts is SECONDS × AUTO_SPEED). */
const SECONDS = chapter['09-cicd'];
/** The intro card, then the platforms, done just before the chapter ends. */
const PREFACE = 2.6 / SECONDS;
const END = 0.97;

const [azure, gcp, devops, github] = ciCdShowcase;
/** Each platform's window: its screens from `a`, then its own UI from `live` to `b`. */
const WINDOWS = appWindows(ciCdShowcase, PREFACE, END);
/** While a platform's own UI plays, the screenshot screen is hidden (the last one stays). */
const GAPS: Array<[number, number]> = WINDOWS.map((w, i) => [
  w.live,
  i === WINDOWS.length - 1 ? Infinity : w.b,
]);

const ui = [azurePortal, cloudRunDeploy, azureDevOps, githubActions] as const;

export default deskBuildScene({
  id: '09-cicd',
  apps: ciCdShowcase,
  build: {
    start: 0,
    learnEnd: PREFACE,
    end: END,
    gaps: GAPS,
    preface: {
      file: 'cloud/pipeline.md',
      kicker: 'CLOUD ENGINEERING · SERVICES · CI/CD',
      title: 'Cloud & CI/CD',
      about:
        'The cloud services and pipelines behind the products I lead: infrastructure on Azure and Google Cloud, and Azure DevOps and GitHub Actions to test, build and ship every change.',
      accent: '#3fa9d6',
      items: [
        { logo: azure!.logo, name: azure!.name, note: 'Cloud engineering' },
        { logo: gcp!.logo, name: gcp!.name, note: 'Cloud services' },
        { logo: devops!.logo, name: devops!.name, note: 'Repos · tests · CI/CD' },
        { logo: github!.logo, name: github!.name, note: 'CI/CD workflows' },
      ],
      logosOnly: true,
      footer: 'Built, tested and shipped automatically',
    },
  },
  // Beneath the screenshot screen, which hides itself for each platform's own UI.
  extra: (monitor): Screen => {
    const screens = ui.map((make, i) => {
      const w = WINDOWS[i]!;
      return make(monitor, [w.live, w.b], i === ui.length - 1 ? Infinity : w.b);
    });
    return { update: (ctx) => screens.forEach((s) => s.update(ctx)) };
  },
});
