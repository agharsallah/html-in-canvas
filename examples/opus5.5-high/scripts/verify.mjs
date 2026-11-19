#!/usr/bin/env node
/**
 * Native verification in a real Chrome (157+ has HTML-in-Canvas).
 *
 *   pnpm build && pnpm verify            # live mode, light theme
 *   pnpm verify -- --fallback            # the ?fallback path
 *   pnpm verify -- --dark --dpr=2        # dark theme on a 2x screen
 *   pnpm verify -- --url=https://your-site.workers.dev   # a deployed copy
 *   CHROME=/path/to/chrome pnpm verify
 *
 * Serves dist/, screenshots every section into .verify/, runs hit-testing and
 * accessibility checks, and exits non-zero if any check fails.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, '.verify');
const args = new Set(process.argv.slice(2));
const flag = (name) => [...args].find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const fallback = args.has('--fallback');
const dark = args.has('--dark');
const reduce = args.has('--reduce');
const forced = args.has('--forced');
const noGpu = args.has('--no-webgpu');
const dpr = Number(flag('dpr') ?? 1);
const width = Number(flag('width') ?? 1440);
const height = Number(flag('height') ?? 900);
const tag = [fallback ? 'fallback' : 'live', dark ? 'dark' : 'light', `${width}w`, `dpr${dpr}`, reduce ? 'reduce' : '', forced ? 'forced' : '', noGpu ? 'nogpu' : ''].filter(Boolean).join('-');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!fs.existsSync(dist)) { console.error('Run pnpm build first.'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(dist, p);
  if (!file.startsWith(dist) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: process.env.HEADED ? false : 'new',
  args: ['--enable-unsafe-webgpu', '--enable-gpu', `--window-size=${width},${height}`],
  userDataDir: path.join(out, '.profile'),
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: dpr });
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' },
  { name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' },
  { name: 'forced-colors', value: forced ? 'active' : 'none' },
]);
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

const target = flag('url') ?? `http://localhost:${port}/`; // --url=https://… checks a deployed copy
await page.goto(`${target}${fallback ? '?fallback' : noGpu ? '?no-webgpu' : ''}`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await sleep(1800);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` · ${detail}` : ''}`); };

// Debug hook: `pnpm verify -- --eval=some-file.js` prints the result of evaluating it, then exits.
if (flag('eval')) {
  console.log(JSON.stringify(await page.evaluate(fs.readFileSync(flag('eval'), 'utf8')), null, 1));
  await page.screenshot({ path: path.join(out, 'eval.png') });
  await browser.close();
  server.close();
  process.exit(0);
}

const mode = await page.$eval('.mode-chip', (el) => el.dataset.mode);
check('mode chip', mode === (fallback ? 'fallback' : 'live'), mode);

// Visit every section: scroll into view, let it settle, screenshot.
await page.evaluate(() => (document.documentElement.style.scrollBehavior = 'auto'));
const sections = await page.$$eval('[data-section]', (els) => els.map((e) => e.id));
for (const id of sections) {
  await page.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'start' }), id);
  await sleep(id === 'whats-on' ? 3200 : 1400);
  await page.screenshot({ path: path.join(out, `${tag}-${id}.png`) });
}

if (!fallback) {
  // Real input, through the real hit testing: pointer, keyboard, drag.
  const shot = (name) => page.screenshot({ path: path.join(out, `${tag}-x-${name}.png`) });
  const box = async (sel) => page.$eval(sel, (el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(width * 0.85, height * 0.2, { steps: 8 });
  await sleep(700);
  await shot('hero-tilt');
  await page.focus('#top-email');
  await page.keyboard.type('ada@plaza.example');
  await page.keyboard.press('Tab');
  await sleep(500);
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check('hero: Tab moves focus inside the 3D poster', focused === 'Subscribe', focused);
  await shot('hero-focus');
  await page.keyboard.press('Enter');
  await sleep(400);
  const thanks = await page.$eval('.poster-note', (el) => el.textContent);
  check('hero: form submits and the poster repaints', /list/.test(thanks), thanks);

  const prog = await box('canvas[data-stage="programme"]');
  await sleep(400);
  await page.mouse.move(prog.x + prog.w * 0.4, prog.y + 300, { steps: 6 });
  await sleep(600);
  const lensed = await page.$$eval('.sess[data-lensed]', (els) => els.length);
  check('programme: loupe marks the row under it (DOM edit in paint)', lensed === 1, String(lensed));
  await shot('loupe');

  const toy = await box('canvas[data-stage="toybox"]');
  await sleep(2600);
  const card = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-stage="toybox"]');
    const cards = [...c.querySelectorAll('.toy')];
    const r = c.getBoundingClientRect();
    // Grab whichever card is on top at the sampled point.
    for (const el of cards) {
      const m = c.getElementTransform(el);
      const p = m.transformPoint(new DOMPoint(el.offsetWidth / 2, 24, 0, 1));
      const x = r.left + p.x, y = r.top + p.y;
      const top = document.elementFromPoint(x, y)?.closest('.toy');
      if (top === el) return { x, y, index: cards.indexOf(el), before: [m.e, m.f] };
    }
    return null;
  });
  await page.mouse.move(card.x, card.y);
  await page.mouse.down();
  await page.mouse.move(card.x + 120, card.y - 260, { steps: 12 });
  await sleep(150);
  const mid = await page.evaluate((i) => {
    const c = document.querySelector('canvas[data-stage="toybox"]');
    const m = c.getElementTransform(c.querySelectorAll('.toy')[i]);
    return [m.e, m.f];
  }, card.index);
  await shot('drag');
  await page.mouse.move(card.x + 260, card.y - 300, { steps: 6 });
  await page.mouse.up();
  await sleep(2500);
  const after = await page.evaluate((i) => {
    const c = document.querySelector('canvas[data-stage="toybox"]');
    const m = c.getElementTransform(c.querySelectorAll('.toy')[i]);
    return [m.e, m.f];
  }, card.index);
  // Measured mid-drag: the card's geometry follows the pointer (after release it may fall back).
  const moved = Math.hypot(mid[0] - card.before[0], mid[1] - card.before[1]);
  void after;
  check('toybox: a real mouse drag throws the card (geometry follows)', moved > 40, `card ${card.index} moved ${Math.round(moved)}px`);
  await shot('thrown');
  void toy;

  const pass = await box('canvas[data-stage="passes"]');
  await sleep(500);
  await page.mouse.move(pass.x + pass.w / 2, pass.y + pass.h / 2);
  await page.mouse.down();
  await page.mouse.move(pass.x + pass.w * 0.3, pass.y + pass.h / 2, { steps: 8 });
  await page.mouse.up();
  await sleep(500);
  const split = await page.$eval('.pass-split input', (el) => el.value);
  check('passes: dragging the divider moves the split', Number(split) < 45, split);
  await shot('passes-drag');
}

if (!fallback) {
  await page.mouse.move(2, 2); // park the cursor: hovering the tape pauses it (by design)
  const r = await page.evaluate(async () => {
    const at = (x, y) => document.elementFromPoint(x, y);
    // getElementTransform() only accepts drawable elements (InvalidStateError otherwise, Chrome 157),
    // so map a descendant's point through its drawable root's transform.
    const offsetOf = (n) => { let x = 0, y = 0; for (; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y]; };
    const centerOf = (canvas, el, u = 0.5, v = 0.5) => {
      const rootEl = el.closest('[drawable]');
      const [ex, ey] = offsetOf(el), [rx, ry] = offsetOf(rootEl);
      const m = canvas.getElementTransform(rootEl);
      const p = m.transformPoint(new DOMPoint(ex - rx + el.offsetWidth * u, ey - ry + el.offsetHeight * v, 0, 1));
      const r = canvas.getBoundingClientRect();
      return [r.left + p.x / p.w, r.top + p.y / p.w];
    };
    const scrollTo = async (id) => { document.getElementById(id).scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 900)); };
    document.documentElement.style.scrollBehavior = 'auto'; // measure after scrolling, not during
    const out = {};
    const live = [...document.querySelectorAll('canvas.stage')].map((c) => c.dataset.stage);
    out.liveStages = live;

    await scrollTo('top');
    const hero = document.querySelector('canvas[data-stage="hero"]');
    if (hero) {
      const sticker = hero.querySelector('.poster-cta'), input = hero.querySelector('input'), button = hero.querySelector('.poster-row button');
      out.heroSticker = at(...centerOf(hero, sticker))?.className;
      out.heroInput = at(...centerOf(hero, input))?.tagName;
      out.heroButton = at(...centerOf(hero, button))?.tagName;
      out.heroIsProjective = !hero.getElementTransform(hero.querySelector('.poster')).is2D;
    }

    await scrollTo('lineup');
    out.bandReady = document.getElementById('lineup')?.dataset.ready;
    const band = document.querySelector('canvas[data-stage="band"]');
    band?.scrollIntoView({ block: 'center' });
    if (band) {
      // The link moves every frame in the worker; geometry arrives in batches. Sample it now.
      const link = band.querySelector('.tape-link');
      // On narrow screens the live link can be off-screen for a while (the tape repeats every ~1700px): wait for it.
      let [lx, ly] = centerOf(band, link);
      for (let i = 0; i < 100 && (lx < 20 || lx > innerWidth - 20); i++) {
        await new Promise((r) => setTimeout(r, 500));
        [lx, ly] = centerOf(band, link);
      }
      const hit = at(lx, ly);
      out.bandLink = hit === link || link.contains(hit) ? 'link' : `${hit?.className || hit?.tagName}@${Math.round(lx)},${Math.round(ly)}`;
    }

    document.querySelector('[data-stage="toybox"]')?.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 2500));
    const toy = document.querySelector('canvas[data-stage="toybox"]');
    if (toy) {
      out.toyHits = [...toy.querySelectorAll('.toy')].map((card) => {
        const link = card.querySelector('a');
        const [, ly] = centerOf(toy, link);
        if (ly < 70 || ly > innerHeight - 10) scrollBy(0, ly - innerHeight / 2); // small screens: bring it into view
        const hit = at(...centerOf(toy, link));
        const pt = centerOf(toy, link).map(Math.round);
        return hit === link || link.contains(hit) ? 'link' : hit && card.contains(hit) ? 'card' : `${hit?.className || hit?.tagName || 'none'}@${pt}`;
      });
    }

    await scrollTo('programme');
    const prog = document.querySelector('canvas[data-stage="programme"]');
    if (prog) {
      const btn = prog.querySelector('.prog-list:not([hidden]) .sess-add');
      out.progButton = at(...centerOf(prog, btn))?.className;
      const tab = document.querySelectorAll('.prog-tab')[1];
      tab.click();
      await new Promise((r) => setTimeout(r, 400));
      const btn2 = prog.querySelector('.prog-list:not([hidden]) .sess-add');
      out.progTab2 = btn2?.closest('ol')?.id + ':' + (at(...centerOf(prog, btn2))?.className ?? '');
    }

    await scrollTo('app');
    const outer = document.querySelector('canvas[data-stage="app-outer"]');
    const inner = document.querySelector('canvas[data-stage="app-inner"]');
    if (outer && inner) {
      const star = inner.querySelector('.app-star');
      // Through both canvases: the star's rect already includes both transforms.
      const sr = star.getBoundingClientRect();
      out.appStar = at(sr.left + sr.width / 2, sr.top + sr.height / 2)?.className;
      star.click();
      await new Promise((r) => setTimeout(r, 200));
      out.appCount = inner.querySelector('.app-count')?.textContent;
    }

    await scrollTo('voices');
    const voices = document.getElementById('voices');
    out.voicesRenderer = voices?.dataset.renderer;
    const vc = voices?.querySelector('canvas');
    if (vc) {
      const q = vc.querySelectorAll('.quote');
      out.voicesInert = [...q].map((x) => x.inert);
      const hit = at(...centerOf(vc, q[0], 0.5, 0.4));
      out.voicesHit = q[0].contains(hit);
    }

    await scrollTo('passes');
    const pc = document.querySelector('canvas[data-stage="passes"]');
    if (pc) {
      const [a, b] = pc.querySelectorAll('.pass');
      const ctaB = b.querySelector('.pass-cta');
      const range = document.querySelector('.pass-split input');
      range.value = '50';
      range.dispatchEvent(new Event('input'));
      await new Promise((r) => setTimeout(r, 600));
      // A point in B's left quarter belongs to A at 50%: canvasClip must keep B from taking it.
      const pt = centerOf(pc, b, 0.2, 0.5);
      const hit = at(...pt);
      out.passesLeftHalf = b.contains(hit) ? 'B (leak!)' : a.contains(hit) ? 'A' : hit?.className;
      range.value = '0';
      range.dispatchEvent(new Event('input'));
      await new Promise((r) => setTimeout(r, 600));
      out.passesAInert = a.inert;
      a.querySelector('.pass-cta').focus();
      out.passesAFocusable = document.activeElement === a.querySelector('.pass-cta');
      let [bx, by] = centerOf(pc, ctaB);
      if (by < 60 || by > innerHeight - 20) { scrollBy(0, by - innerHeight / 2); await new Promise((r) => setTimeout(r, 300)); [bx, by] = centerOf(pc, ctaB); }
      out.passesBHit = (() => { const h = at(bx, by); return h === ctaB || ctaB.contains(h); })();
      range.value = '50';
      range.dispatchEvent(new Event('input'));
    }

    await scrollTo('badge');
    const bc = document.querySelector('canvas[data-stage="badge"]');
    if (bc) {
      const input = document.getElementById('badge-name');
      input.value = 'Ada Rios';
      input.dispatchEvent(new Event('input'));
      await new Promise((r) => setTimeout(r, 500));
      try { out.badgeExport = bc.toDataURL('image/png').length; } catch (e) { out.badgeExport = String(e); }
      out.badgeName = bc.querySelector('.badge-name')?.textContent;
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  check('every stage upgraded', ['hero', 'band', 'toybox', 'programme', 'app-outer', 'app-inner', 'voices', 'passes', 'badge'].every((s) => r.liveStages?.includes(s)), r.liveStages?.join(','));
  check('hero: sticker hit-tests on the tilted 3D plane', String(r.heroSticker).includes('poster-cta'), r.heroSticker);
  check('hero: email input hit-tests', r.heroInput === 'INPUT', r.heroInput);
  check('hero: submit button hit-tests', r.heroButton === 'BUTTON', r.heroButton);
  check('hero: canvasTransform is projective 3D', r.heroIsProjective === true);
  check('band: worker geometry arrived (elementgeometryupdate)', r.bandReady === 'true');
  check('band: the moving, worker-drawn link hit-tests', r.bandLink === 'link', r.bandLink);
  // A link may be covered by a card lying on top of it (hit-test order = draw order): that's correct too.
  check('toybox: every thrown card link is clickable where drawn', r.toyHits?.every((h) => h === 'link' || h.startsWith('toy toy--')), r.toyHits?.join(','));
  check('programme: row button hit-tests', String(r.progButton).includes('sess-add'), r.progButton);
  check('programme: second day tab draws and hit-tests', String(r.progTab2).includes('day-1:sess-add'), r.progTab2);
  check('app: star clickable through two canvases', String(r.appStar).includes('app-star'), r.appStar);
  check('app: star toggles count', r.appCount === '1', r.appCount);
  check('voices: renderer', r.voicesRenderer === (noGpu ? '2d' : 'webgpu'), r.voicesRenderer);
  check('voices: only the current quote is interactive', JSON.stringify(r.voicesInert) === JSON.stringify([false, true, true, true]) && r.voicesHit);
  check('passes: hidden half does not take clicks (canvasClip)', r.passesLeftHalf === 'A', r.passesLeftHalf);
  check('passes: fully covered pass is inert and its CTA cannot take focus', r.passesAInert === true && r.passesAFocusable === false);
  check('passes: visible pass CTA clickable', r.passesBHit === true);
  check('badge: export works (canvas not tainted)', typeof r.badgeExport === 'number' && r.badgeExport > 10000, String(r.badgeExport));
} else {
  const n = await page.$$eval('canvas.stage', (c) => c.length);
  check('fallback: no stage was turned into a canvas', n === 0, String(n));
  const visible = await page.$eval('.poster-title', (el) => el.getBoundingClientRect().height > 40);
  check('fallback: poster content is visible HTML', visible);
}

if (!fallback) {
  // Accessibility: canvas content is in the accessibility tree like ordinary DOM.
  const ax = await page.accessibility.snapshot({ interestingOnly: true });
  const flat = [];
  const walk = (n) => { if (!n) return; flat.push(`${n.role}:${n.name ?? ''}`); (n.children ?? []).forEach(walk); };
  walk(ax);
  if (process.env.AXDUMP) console.log(flat.filter((x) => /quote|interfaces|Canvas used|slide|figure/i.test(x)).join('\n'));
  const has = (re) => flat.some((s) => re.test(s));
  check('a11y: poster h1 inside the WebGL canvas is exposed', has(/^heading:.*Plaza/i));
  check('a11y: sticker link inside the 3D scene is exposed', has(/^link:Get a pass/i));
  check('a11y: thrown card links are exposed', has(/^link:Browse talks/i) && has(/^link:Visit/i));
  check('a11y: phone app (nested canvas) buttons are exposed', has(/^button:Star /));
  check('a11y: off-stage quotes are not exposed (inert)', has(/The best interfaces/) && !has(/Canvas used to mean giving up text/));

  // Idle cost: with no input, animated canvases stop requesting paints.
  const idle = await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 2500));
    const counts = {};
    const stop = [...document.querySelectorAll('canvas.stage')].map((c) => {
      counts[c.dataset.stage] = 0;
      const f = () => counts[c.dataset.stage]++;
      c.addEventListener('paint', f);
      return () => c.removeEventListener('paint', f);
    });
    await new Promise((r) => setTimeout(r, 2000));
    stop.forEach((s) => s());
    return counts;
  });
  // The phone's clock ticks once a second, so app-inner/app-outer paint ~2 times by design.
  const busy = Object.entries(idle).filter(([k, v]) => (k.startsWith('app') ? v > 4 : v > 1));
  check('idle: canvases stop painting when nothing changes', busy.length === 0, JSON.stringify(idle));
}

await page.screenshot({ path: path.join(out, `${tag}-full.png`), fullPage: true });
const errors = logs.filter((l) => !/favicon|DevTools/.test(l));
check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in .verify/ (${tag}-*)`);
process.exit(failed.length ? 1 : 0);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
