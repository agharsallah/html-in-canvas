// Performance budget for the production build. Run after `vite build`.
// Fails (exit 1) if any chunk grows past its gzip budget, so regressions
// show up in CI instead of in a profiler months later.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dir = 'dist/assets';
const KB = 1024;
const budgets = [
  { name: 'three.js (shared)', match: /^three-.*\.js$/, max: 155 * KB },
  { name: 'shared app JS', match: /^shared-.*\.js$/, max: 20 * KB },
  { name: 'shared app CSS', match: /^shared-.*\.css$/, max: 10 * KB },
  { name: 'darkroom entry JS', match: /^index-.*\.js$/, max: 40 * KB },
  { name: 'darkroom entry CSS', match: /^index-.*\.css$/, max: 15 * KB },
  { name: 'guide entry JS', match: /^guide-.*\.js$/, max: 30 * KB },
  { name: 'guide entry CSS', match: /^guide-.*\.css$/, max: 6 * KB },
  { name: 'each chapter JS', match: /^(prologue|roll-\d+-[a-z]+)-.*\.js$/, max: 12 * KB },
  { name: 'each chapter CSS', match: /^(prologue|roll-\d+-[a-z]+)-.*\.css$/, max: 2 * KB },
  { name: 'CSS3D fallback', match: /^css3d-surfaces-.*\.js$/, max: 3 * KB },
];

let failed = false;
const files = readdirSync(dir);
for (const budget of budgets) {
  const hits = files.filter((f) => budget.match.test(f));
  if (!hits.length) {
    console.error(`✗ ${budget.name}: no file matched ${budget.match}`);
    failed = true;
    continue;
  }
  for (const file of hits) {
    const size = gzipSync(readFileSync(join(dir, file))).length;
    const ok = size <= budget.max;
    if (!ok) failed = true;
    console.log(`${ok ? '✓' : '✗'} ${budget.name.padEnd(28)} ${file.padEnd(36)} ${(size / KB).toFixed(1).padStart(6)} kB gz / ${(budget.max / KB).toFixed(0)} kB`);
  }
}
process.exit(failed ? 1 : 0);
