#!/usr/bin/env node
/**
 * Regenerates public/og.png (1200×630) from the live hero. Run after rebranding:
 *   pnpm build && pnpm og && pnpm build
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = new URL(req.url, 'http://x').pathname;
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(dist, p);
  if (!file.startsWith(dist) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  userDataDir: path.join(root, '.verify', '.og-profile'),
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 688, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '.site-nav,.hero-hint{display:none!important}' });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: path.join(root, 'public', 'og.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
server.close();
console.log('Wrote public/og.png');
