// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Set SITE_URL in Vercel (Project → Settings → Environment Variables) once you have a domain.
const site = process.env.SITE_URL ?? 'https://suman-day-portfolio.vercel.app';

export default defineConfig({
  site,
  output: 'static',
  compressHTML: true,
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  build: {
    // Small stylesheets are inlined to keep first paint fast (CSP allows inline styles, not scripts).
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  vite: {
    build: {
      // Never inline scene SVGs or scripts as data: URIs — they must be cacheable files under /_astro.
      assetsInlineLimit: 0,
    },
  },
});
