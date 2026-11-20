#!/usr/bin/env node
/**
 * Fails the build if the client JavaScript is over 68 KB gzipped (total) or any scene SVG
 * is over 120 KB gzipped. Runs after `astro build` against dist/.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = resolve('dist');
// 68 KB: room for the project descriptions, screen captions and the Scaler study screen.
const JS_BUDGET = 68 * 1024;
const SVG_BUDGET = 120 * 1024;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error('check-budgets: dist/ not found — run `astro build` first.');
  process.exit(1);
}

const gz = (f) => gzipSync(readFileSync(f), { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const errors = [];

const js = files.filter((f) => f.endsWith('.js'));
const jsTotal = js.reduce((n, f) => n + gz(f), 0);
console.log(`JS (gzip, total of ${js.length} file(s)): ${kb(jsTotal)} / ${kb(JS_BUDGET)}`);
if (jsTotal > JS_BUDGET)
  errors.push(`JavaScript is ${kb(jsTotal)} gzipped — budget ${kb(JS_BUDGET)}`);

const svgs = files.filter((f) => f.endsWith('.svg') && f.includes('_astro'));
let biggest = 0;
for (const f of svgs) {
  const size = gz(f);
  biggest = Math.max(biggest, size);
  if (size > SVG_BUDGET)
    errors.push(`${f.replace(DIST, 'dist')} is ${kb(size)} gzipped — budget ${kb(SVG_BUDGET)}`);
}
console.log(`Scene SVGs: ${svgs.length} file(s), largest ${kb(biggest)} gzip / ${kb(SVG_BUDGET)}`);

if (errors.length) {
  console.error(`\n✗ Budget exceeded:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('✓ Budgets OK');
