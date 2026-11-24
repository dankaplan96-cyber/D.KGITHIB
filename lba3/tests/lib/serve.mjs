// SERVE=1: this checkout's files answered by the browser's request routing, no http.server needed (as
// tests/overhead-remarks.mjs does it). serveLocal(page or context): every request to GAME_URL's origin (default
// http://localhost:8123) is read from this checkout's lba3 folder.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MIME = { js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', html: 'text/html', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', ogg: 'audio/ogg', mp3: 'audio/mpeg', mid: 'audio/midi', woff2: 'font/woff2', wasm: 'application/wasm', glb: 'model/gltf-binary', txt: 'text/plain', bin: 'application/octet-stream' };
export async function serveLocal(target, url = process.env.GAME_URL || 'http://localhost:8123/') {
  const origin = new URL(url).origin;
  await target.route(origin + '/**', (route) => {
    let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': MIME[path.extname(f).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' } });
  });
}
