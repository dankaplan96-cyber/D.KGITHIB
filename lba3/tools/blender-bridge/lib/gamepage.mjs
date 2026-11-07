// Opens the actual game in a browser for the bridge's checks: a static file server on 127.0.0.1 only, on a random port,
// for the life of one run (closed at the end; nothing listens afterwards), and Playwright from the repo's Test Lab.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GAME_ROOT } from '../bridge.mjs';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };

export function serve(root = GAME_ROOT) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => new Promise((r) => srv.close(r)) })));
}

export async function playwright() {
  const p = path.join(GAME_ROOT, 'tools', 'testlab', 'node_modules', 'playwright', 'index.mjs');
  if (!fs.existsSync(p)) throw new Error(`Playwright not found at ${p} (run npm install in tools/testlab)`);
  return import(pathToFileURL(p).href);
}

// gpu: false = SwiftShader (deterministic, any machine); true = the machine's own GPU through installed Chrome
export async function openGame({ gpu = false, width = 960, height = 540, boot = 900000 } = {}) {
  const { chromium } = await playwright();
  const server = await serve();
  const browser = await chromium.launch(gpu ? { channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] } : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: boot });
  await page.evaluate(() => { game.testFreeze = true; });
  const close = async () => { await browser.close().catch(() => {}); await server.close(); };
  return { page, server, browser, errors, close };
}
