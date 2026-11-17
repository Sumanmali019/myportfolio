#!/usr/bin/env node
/**
 * SVGO pass over the scene SVGs, in place. The engine depends on ids, data-* attributes and
 * classes, so every plugin that could rename, merge, move or drop them is disabled — and the
 * script verifies afterwards that none were lost (exit 1 if they were).
 *
 *   node scripts/optimize-svg.mjs                 # all of src/assets/scenes
 *   node scripts/optimize-svg.mjs a.svg b.svg     # specific files (lint-staged)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { optimize } from 'svgo';

const ROOT = resolve('src/assets/scenes');

const config = {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false, // ids are referenced by url(#…) and by the engine
          collapseGroups: false, // groups carry data-id / data-anchor
          moveGroupAttrsToElems: false,
          moveElemsAttrsToGroup: false,
          convertShapeToPath: false, // screens/links read rect x/y/width/height
          mergePaths: false,
          removeEmptyContainers: false, // empty <g data-ticks>, <g data-confetti> are mount points
          removeEmptyAttrs: false, // boolean data-* attributes have empty values
          removeEmptyText: false, // empty <text data-year/data-city> are filled in by the engine
          removeUnknownsAndDefaults: { keepDataAttrs: true, keepRoleAttr: true },
          removeViewBox: false,
          removeHiddenElems: false, // fill="none" rects are layout boxes
          inlineStyles: false,
        },
      },
    },
  ],
};

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.svg') ? [p] : [];
  });
}

/** Everything the engine can query: ids, data-* attributes (with values), classes. */
function signature(svg) {
  const out = new Map();
  const add = (k) => out.set(k, (out.get(k) ?? 0) + 1);
  for (const m of svg.matchAll(/\s(id|data-[a-z-]+)="([^"]*)"/g)) add(`${m[1]}=${m[2]}`);
  for (const m of svg.matchAll(/\sclass="([^"]*)"/g))
    for (const c of m[1].split(/\s+/)) if (c) add(`.${c}`);
  return out;
}

const files = process.argv.length > 2 ? process.argv.slice(2).map((f) => resolve(f)) : walk(ROOT);
let before = 0;
let after = 0;
let failed = false;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let data;
  try {
    ({ data } = optimize(src, { ...config, path: file }));
  } catch (err) {
    failed = true;
    console.error(
      `✗ ${file}: ${err.reason ?? err.message} (line ${err.line ?? '?'}, col ${err.column ?? '?'})`,
    );
    continue;
  }
  const a = signature(src);
  const b = signature(data);
  const lost = [...a].filter(([k, n]) => (b.get(k) ?? 0) < n).map(([k]) => k);
  if (lost.length) {
    failed = true;
    console.error(
      `✗ ${file}: SVGO would drop ${lost.slice(0, 8).join(', ')}${lost.length > 8 ? '…' : ''}`,
    );
    continue;
  }
  before += src.length;
  after += data.length;
  if (data !== src) writeFileSync(file, data);
}

console.log(
  `SVGO: ${files.length} file(s), ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB`,
);
process.exit(failed ? 1 : 0);
