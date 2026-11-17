# The journey so far — Suman Mali

A scroll-driven, illustrated portfolio. The scroll tells a career rather than a single day:
a production-engineering student at Jadavpur University, then jobs in Kolkata and Hyderabad,
then leading a team remotely, with apps shipped along the way.

The intro is Suman's waving avatar (his Lottie animation) saying hello on a night sky. Scrolling
glides the avatar into its place at the Jadavpur gate in chapter 01.
The rest of the page is built the same way:

- **Counters:** a calendar counter (year, month and city) and a downloads odometer move with the scroll.
- **Route line:** progress shows as stations on a route line; transits are diamonds and the open-source highlight is a star.
- **Art:** everything is flat vector SVG. Nothing fades: parts shrink into and grow from their own centres, and matching objects morph into each other.

Built with **Astro 5** (static output) and **TypeScript (strict)**. **Lenis** handles smooth
scroll, and a small vanilla animation engine (~28 KB gzipped JS in total) does the rest.
Deploys to **Vercel**.

```
pnpm install
pnpm dev            # http://localhost:4321
```

Node version: see `.nvmrc` (22). pnpm is pinned in `package.json` (`corepack enable` gets it).

---

## Before you launch

The build prints a warning listing every placeholder it finds. Replace them in
`src/content/profile.ts`:

| Field                         | Now                                       |
| ----------------------------- | ----------------------------------------- |
| `contact.email`               | `hello@example.com`                       |
| `contact.github`              | `https://github.com/your-username`        |
| `projects[flutter-pr].url`    | the merged Flutter PR                     |
| `projects[sse-repo].url`      | the SSE vs WebSockets repo                |
| `apps[docpharma].summary`     | one-line description of DocPharma         |
| `public/resume.pdf`           | placeholder PDF — drop in the real résumé |
| `SITE_URL` (env) / robots.txt | the production domain                     |

The chapter dates in `src/content/scenes.ts` are positions for the counter. Adjust them if a
milestone month is different. They must stay in order (a unit test checks this). `"now"`
resolves to the build month.

---

## Editing content — `src/content/` only

You never need to touch engine code to change text, links, order or numbers.

| File         | What's in it                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `profile.ts` | name, headline, about, experience, **apps (with downloads)**, projects, writing, education, contact |
| `skills.ts`  | skill groups (they become badges stacking on the shelf in "Late nights")                            |
| `beats.ts`   | every speech / thought / screen bubble, per chapter                                                 |
| `scenes.ts`  | chapter order, date, city, station type, palette, scroll weight, SVG file, module, links            |
| `schema.ts`  | zod schemas — **the build fails on invalid content**, with a list of what's wrong                   |

- **Downloads odometer:** the total is the sum of every app's `downloads`. Each app's figure
  is added during its chapter (`apps[].scene`). Apps without a known figure add nothing.
- **Bubbles:** `anchor` must be a `data-anchor` in that chapter's SVGs, for both desktop and
  mobile. A unit test (`tests/unit/svg-contract.test.ts`) checks this.
- **Links:** a scene's `links` are keys from `buildLinks()` in `schema.ts`. They render as
  real `<a>` elements over `[data-link]` rects in the SVG.

---

## Adding a chapter

1. **Art:** add `src/assets/scenes/desktop/NN-name.svg` (viewBox `0 0 1440 900`) and
   `src/assets/scenes/mobile/NN-name.svg` (viewBox `0 0 390 844`). Follow the conventions below.
   The quickest start is a new entry in `scripts/art/generate-scenes.mjs`, then
   `node scripts/art/generate-scenes.mjs NN`.
2. **Module:** add `src/scenes/NN-name.ts` exporting `{ id, prepare(svg, ctx), update(state) }`.
   `update` must be a pure function of `state` (hold progress, idle clock…) so that scrolling
   backwards plays it in reverse.
3. **Entry:** add one object to `src/content/scenes.ts`, plus bubbles in `beats.ts` if needed.

The engine discovers modules and SVGs by file name. Run `pnpm test` to confirm the contract holds.

### Scene SVG conventions

| Marker                                                                         | Meaning                                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `<g data-id="…" data-k="n">`                                                   | a **part**: builds in / comes apart from its centre; `k` = depth (back → front) |
| same `data-id` in consecutive chapters                                         | the part **stays** (or **glides** if it moved)                                  |
| `data-morph="key"`                                                             | **morphs** into the part with the same key in the next chapter                  |
| `data-static`                                                                  | excluded from build/take-apart                                                  |
| `data-anchor="…"`                                                              | bubble tail target                                                              |
| `<rect data-screen="…">`                                                       | where a screen module draws (monitor, phone, laptop)                            |
| `<rect data-link="…">`                                                         | where a real link is positioned                                                 |
| `data-year` `data-month` `data-date` `data-city` `data-odometer` (on `<text>`) | filled in by the counters                                                       |
| `class="draw"`                                                                 | stroke draws on as its part builds                                              |
| `class="idle-cloud / idle-steam / idle-blink / idle-bob / idle-twinkle"`       | ambient loops on one shared idle clock                                          |
| `class="p-wall / p-floor …"`, gradient stops `s-top / s-bot`                   | palette-driven fills (blend between chapters)                                   |

Two rules:

- **Ids:** prefix them per scene and layout, because desktop and mobile intros are both inline.
- **Transforms:** never put a `transform` attribute on an element the engine scales with CSS
  (parts, anchors, `.idle-*`). Wrap it in a plain `<g>` instead. The contract test enforces this.

`pnpm svg:optimize` runs SVGO in place with every id-, data-, class- and structure-changing
plugin disabled. It fails if anything the engine relies on would be lost.

---

## How it works

```
scroll ─▶ Lenis ─▶ P (0…1) ─▶ timeline ─▶ { scene, transition t, hold t, beat }
                                        │
     ┌──────────────────────────────────┼───────────────────────────────────┐
  morph.ts       palette.ts         clock.ts            scenes/*.ts        bubbles/*
  build/glide    blend CSS vars     calendar + odometer screens & props    trigger → pop → type
```

- `engine/timeline.ts`: each chapter is a 1-screen **enter transition** plus a **hold**
  (`weight` screens, at least 0.6 per bubble).
- `engine/loader.ts`: only the intro is inline. Other chapters are hashed, long-cached files
  under `/_astro`, lazy-loaded (previous + current + next two). Far ones are evicted.
- `engine/loop.ts`: one `requestAnimationFrame` loop that pauses when the tab is hidden.
- `engine/motion.ts`: with `prefers-reduced-motion` (or `?motion=reduce`) there is no Lenis
  and no idle loops, chapters crossfade, and bubbles appear fully typed.
- **Fallback:** if a scene SVG fails to load, or JS is off, the **Skip the journey** content
  (semantic HTML with everything) becomes the page.

### Accessibility and SEO

- **Decorative stage:** it is `aria-hidden`. `SceneText.astro` gives screen readers a plain
  description of every chapter, and `SkipTheDay.astro` holds all content in a focus-trapped
  dialog (Esc closes it).
- **Keyboard:** every link is reachable. Focusing a stage link brings its chapter on stage.
- **Metadata:** the static HTML contains all profile text, plus canonical, Open Graph/Twitter
  tags, JSON-LD `Person`, a sitemap and `robots.txt`.

---

## Scripts

| Script                           | Does                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev` / `build` / `preview` | Astro; `build` also runs the size budgets                                    |
| `pnpm lint`                      | ESLint + Prettier check                                                      |
| `pnpm typecheck`                 | `astro check`                                                                |
| `pnpm test`                      | Vitest unit tests (timeline, counters, morph order, schema, SVG contract)    |
| `pnpm test:e2e`                  | Playwright, desktop 1440×900 + mobile 390×844, against the built site        |
| `pnpm test:visual`               | visual snapshots (off by default; add `--update-snapshots` to record)        |
| `pnpm svg:optimize`              | SVGO pass, preserving ids / data-* / classes                                 |
| `pnpm og`                        | renders `public/og.png` (1200×630) from the intro SVG                        |
| `pnpm budgets`                   | fails if JS > 60 KB gzip or any scene SVG > 120 KB gzip                      |
| `pnpm lhci`                      | Lighthouse CI (perf ≥ 90 mobile, a11y = 100, best-practices ≥ 95, SEO = 100) |

Husky + lint-staged run ESLint/Prettier and the SVG optimiser on commit.

Visual baselines are platform-specific. Record them on the CI platform (Linux) and commit
`tests/e2e/visual.spec.ts-snapshots/`.

---

## Deploy (Vercel)

1. Push the repository to GitHub and import it in Vercel. The framework (Astro) and the
   settings in `vercel.json` are picked up automatically.
2. Set `SITE_URL` to the production URL (canonical links, OG image URLs, sitemap) and update
   `public/robots.txt`.
3. `vercel.json` sets the security headers (CSP, HSTS, `X-Content-Type-Options`,
   `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP) and a one-year immutable
   cache for `/_astro/*`.
4. **Optional PR previews:** add `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as
   repository secrets and `.github/workflows/preview.yml` will start deploying.

CSP note: scripts are `'self'` only (no inline scripts or handlers). Styles allow
`'unsafe-inline'` for Astro's small inlined stylesheets and the `<noscript>` fallback.

## Art and licensing

All artwork is original, generic flat vector made for this site. There are no brand logos or
app icons (apps appear as initials tiles), and the Jadavpur University gate is drawn from Suman's own
reference illustration. Names appear only as text. Fonts are DM Mono and Special Elite, self-hosted
via @fontsource (SIL OFL).
