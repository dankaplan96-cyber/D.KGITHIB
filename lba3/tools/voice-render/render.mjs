// Voice render harness, the Node side: opens a headless Chromium (Playwright), serves the game's files to it from
// disk (no server: a route on http://voice.local/), and renders scripted conversations offline with
// tools/voice-render/scene.js. Used by tools/voice-render/listen.mjs (the listening files) and diagnose.mjs.
//
//   const R = await openRenderer({ roots: { game: '<lba3 dir>', old: '<another checkout's lba3 dir>' } });
//   const r = await R.render({ root: 'game', style: 'soft', scene, opts }); // { mix, voice: Float32Array, sr, log }
//   await R.close();
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LBA3 = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(LBA3, 'package.json'));
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.md': 'text/plain' };

export async function openRenderer({ roots }) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.route('http://voice.local/**', (route) => {
    const u = new URL(route.request().url());
    const [, root, ...rest] = u.pathname.split('/');
    const base = roots[root];
    const p = base && join(base, ...rest);
    if (!p || !existsSync(p) || statSync(p).isDirectory()) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, body: readFileSync(p), headers: { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  await page.goto('http://voice.local/game/README.md');
  return {
    page,
    // one render: returns the mix and the voice alone as Float32Arrays
    // (P18-VOICES: mode 'words' | 'classic', engine 'render' | 'chain': how a Words line is made)
    async render({ root = 'game', style = null, scene, opts = {}, music = null, banks = null, inject = null, mode = null, engine = null }) {
      const r = await page.evaluate(async ({ root, style, scene, opts, music, banks, inject, mode, engine }) => {
        const V = await import(`http://voice.local/${root}/src/engine/voice.js`);
        const S = await import('http://voice.local/game/tools/voice-render/scene.js');
        if (style && V.setVoiceStyle) V.setVoiceStyle(style);
        V.setVoiceMode?.(mode || 'classic'); V.setWordsEngine?.(engine || 'render');
        if (inject) Object.assign(V.VOICES, inject);   // (voices only the sampler has, e.g. one from another branch)
        if (music) opts.music = await (await fetch(`http://voice.local/game/assets/music/${music}`)).arrayBuffer();
        if (opts.presFromStyle && V.voiceStyle) opts.pres = V.voiceStyle().pres;
        // the clip banks (the chosen approach's pre-rendered phrases), or none: the synthesis alone
        V.voiceBanks?.(banks === false ? null : `http://voice.local/${root}/assets/voice/`);
        if (banks !== false && V.Babble.prototype.prepare) opts.prepare = async (B) => { await B.prepare(scene.turns.map((t) => t.key), { wait: true }); };
        const t0 = performance.now();
        const out = await S.renderScene(V, scene, opts);
        return { mix: S.f32Base64(out.mix), voice: S.f32Base64(out.voice), sr: out.sr, log: out.log, count: out.count, played: out.played, ms: performance.now() - t0 };
      }, { root, style, scene, opts, music, banks, inject, mode, engine });
      const dec = (b) => { const buf = Buffer.from(b, 'base64'); return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4); };
      return { ...r, mix: dec(r.mix), voice: dec(r.voice) };
    },
    close: () => browser.close(),
  };
}
