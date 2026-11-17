#!/usr/bin/env node
/**
 * Renders public/og.png (1200×630) from the desktop intro SVG: the install ring part-filled
 * around the SM icon, with the name and subtitle. Uses Playwright's Chromium.
 *
 *   pnpm og
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const font = (pkg, file) =>
  readFileSync(require.resolve(`${pkg}/files/${file}`)).toString('base64');

const svg = readFileSync(resolve('src/assets/scenes/desktop/00-intro.svg'), 'utf8');
const css = readFileSync(resolve('src/styles/palettes.css'), 'utf8');

const html = `<!doctype html><html><head><style>
@font-face{font-family:'DM Mono';src:url(data:font/woff2;base64,${font('@fontsource/dm-mono', 'dm-mono-latin-400-normal.woff2')}) format('woff2');}
@font-face{font-family:'Special Elite';src:url(data:font/woff2;base64,${font('@fontsource/special-elite', 'special-elite-latin-400-normal.woff2')}) format('woff2');}
${css}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#1b1a3a}
svg{width:1200px;height:630px}
.ui-text{font-family:'DM Mono',monospace}.title-text{font-family:'Special Elite',serif}
.pre-hidden{transform:scale(0)}
[data-id="hint"]{display:none}
</style></head><body>${svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
});
await page.screenshot({ path: resolve('public/og.png'), type: 'png' });
await browser.close();
console.log('✓ public/og.png (1200×630)');
