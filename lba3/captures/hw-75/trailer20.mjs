// ORDER 75: a 45-75 s trailer for the LBA fan group, recorded in the page itself (no screen grabber, no editor here):
// the game's WebGL canvas is drawn each frame onto a 1920x1080 canvas with the cards, captions, the talk's lines and
// fades on top; that canvas + the game's own sound (audio.out → a MediaStreamDestination) go to MediaRecorder as MP4
// (H.264 + AAC). Cuts: the recorder pauses between shots while the next is set up. Fullscreen headed Chrome, High.
// usage: node trailer.mjs <OUT> <lba3 ROOT>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, ROOT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)));
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1560,960', '--window-position=0,0', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 })).newPage();
await page.goto(server.url, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
const ev = (f, a) => page.evaluate(f, a);
const wait = (ms) => page.waitForTimeout(ms);
const key = async (k, ms = 80) => { await page.keyboard.down(k); await wait(ms); await page.keyboard.up(k); };
const held = new Set(); const hold = async (ks) => { for (const k of [...held]) if (!ks.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of ks) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
log('window', await ev(() => [innerWidth, innerHeight, devicePixelRatio, game.renderer.renderer.domElement.width, game.renderer.renderer.domElement.height]));
await ev(() => { const G = game; G.settings.qualityAuto = false; G.settings.quality = 'high'; G.settings.res = 'full'; G.settings.controls = 'modern'; G.settings.camera = 'follow'; G.settings.lang = 'en'; G.applySettings(); });

// ---- the in-page recorder and compositor
await ev(() => {
  const W = 1920, H = 1080, OW = 1280, OH = 720, C = document.createElement('canvas'); C.width = OW; C.height = OH; C.style.cssText = 'position:fixed;left:-4000px;top:0;width:192px;height:108px;pointer-events:none'; document.body.append(C); const x = C.getContext('2d');
  const R = window.REC = { C, mode: 'black', card: [], cap: '', capT0: 0, capUntil: 0, fade: 1, fadeTo: 1, fadeRate: 1 / 0.35, mode2: '', chunks: [], last: performance.now() };
  const gl = () => game.renderer.renderer.domElement;
  const text = (s, px, X, Y, opts = {}) => { x.font = `${opts.w || 600} ${px}px "Segoe UI", Arial, sans-serif`; x.textAlign = opts.align || 'left'; x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(0,0,0,0.85)'; x.shadowBlur = opts.blur ?? 10; x.shadowOffsetY = 2; x.fillStyle = opts.color || '#fff'; x.fillText(s, X, Y); x.shadowBlur = 0; x.shadowOffsetY = 0; };
  const wrap = (s, px, maxW) => { x.font = `500 ${px}px "Segoe UI", Arial, sans-serif`; const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
  const frame = (now) => { R.nf = (R.nf || 0) + 1; try { frame0(now); } catch (e) { R.err = (R.err || '') + String(e).slice(0, 200) + ' | '; } requestAnimationFrame(frame); };
  const frame0 = (now) => {
    const dt = Math.min(0.1, (now - R.last) / 1000); R.last = now; x.setTransform(OW / W, 0, 0, OH / H, 0, 0); x.imageSmoothingQuality = 'high';
    R.fade += Math.sign(R.fadeTo - R.fade) * Math.min(Math.abs(R.fadeTo - R.fade), R.fadeRate * dt);
    if (R.mode === 'game') {
      x.drawImage(gl(), 0, 0, W, H);
      // the talk's lines (the game's dialog box is the page's, not the canvas's): name and text, bottom middle
      const D = document.querySelector('#dialog'), CS = document.querySelector('#cine-sub');
      const shown = (e) => e && e.getClientRects().length && !e.classList.contains('hidden') && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.1;
      let nm = '', tx = '';
      if (R.showTalk && shown(D)) { nm = D.querySelector('.name')?.textContent || ''; tx = (D.querySelector('.text')?.textContent || '').trim(); }
      else if (R.showTalk && shown(CS)) { const b = CS.querySelector('b, .name, .who, strong, span'); nm = b?.textContent || ''; tx = CS.textContent.replace(nm, '').trim(); }
      if (tx) {
        { const L = wrap(tx, 34, 1100); const bh = 40 + L.length * 46 + (nm ? 40 : 0); x.fillStyle = 'rgba(10,14,24,0.78)'; x.fillRect(W / 2 - 600, H - 90 - bh, 1200, bh);
          let y = H - 90 - bh + 30; if (nm) { text(nm, 28, W / 2 - 570, y + 16, { color: '#ffd35a', w: 700, blur: 4 }); y += 40; }
          for (const l of L) { text(l, 34, W / 2 - 570, y + 30, { w: 500, blur: 4 }); y += 46; } } }
      // the behaviour's name while the modes are shown
      if (R.showMode) { const b = game.hero.behaviour || ''; const nm = b.charAt(0).toUpperCase() + b.slice(1); text(nm, 44, 80, H - 150, { color: '#ffd35a', w: 700 }); }
    } else if (R.mode === 'poster' && R.poster) { x.fillStyle = '#121b2b'; x.fillRect(0, 0, W, H); const ph = H, pw = R.poster.width * H / R.poster.height; x.drawImage(R.poster, (W - pw) / 2, 0, pw, ph);
    } else { x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
      R.card.forEach(([s, px, col], i) => text(s, px, W / 2, H / 2 - (R.card.length - 1) * 38 + i * 76, { align: 'center', color: col || '#fff', w: i ? 500 : 700, blur: 0 })); }
    // the caption: lower left, in for 0.4 s, out for 0.4 s
    if (R.cap && now < R.capUntil) { const a = Math.min(1, (now - R.capT0) / 400, (R.capUntil - now) / 400); x.globalAlpha = Math.max(0, a); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(60, H - 110, x.measureText ? 40 + R.cap.length * 21 : 600, 64); text(R.cap, 40, 80, H - 64, { w: 600 }); x.globalAlpha = 1; }
    if (R.fade > 0.001) { x.fillStyle = `rgba(0,0,0,${R.fade})`; x.fillRect(0, 0, W, H); }
  };
  requestAnimationFrame(frame);
});
const rec = {
  start: () => ev(() => { const R = window.REC, A = game.audio; const dest = A.ctx.createMediaStreamDestination(); A.out.connect(dest);
    const st = new MediaStream([...R.C.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mt = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4d0028,mp4a.40.2', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    R.mr = new MediaRecorder(st, { mimeType: mt, videoBitsPerSecond: 7e6, audioBitsPerSecond: 192000 }); R.mr.ondataavailable = (e) => { if (e.data.size) R.chunks.push(e.data); };
    R.mr.start(1000); R.mr.pause(); return mt; }),
  on: async () => { await ev(() => { window.REC.mr.resume(); window.REC.fadeTo = 0; }); setTimeout(async () => log('REC', await ev(() => { const R = window.REC; return { mode: R.mode, fade: +R.fade.toFixed(2), sinceFrame: Math.round(performance.now() - R.last), frames: R.nf, vis: document.visibilityState, mr: R.mr.state }; }).catch(() => null)), 1500); },
  off: async () => { await ev(() => { window.REC.fadeTo = 1; }); await wait(420); await ev(() => window.REC.mr.pause()); },
  game: () => ev(() => { window.REC.mode = 'game'; }),
  cut: () => ev(() => window.REC.mr.pause()),
  uncut: () => ev(() => window.REC.mr.resume()),
  card: async (lines, ms) => { await ev((l) => { const R = window.REC; R.mode = 'card'; R.card = l; }, lines); await rec.on(); await wait(ms); await rec.off(); },
  cap: (s, ms) => ev(({ s, ms }) => { const R = window.REC, n = performance.now(); R.cap = s; R.capT0 = n; R.capUntil = n + ms; }, { s, ms }),
  flag: (k, v) => ev(({ k, v }) => { window.REC[k] = v; }, { k, v }),
};
const look = () => ev(() => { const G = game, h = G.hero, cd = G.camera.getWorldDirection(new G.camera.position.constructor()); return { st: G.state, room: G.room?.id || 'out', x: h.pos.x, z: h.pos.z, fx: cd.x, fz: cd.z }; });
const dirKeys = (s, dx, dz) => { const L = Math.hypot(s.fx, s.fz) || 1, fx = s.fx / L, fz = s.fz / L, rx = -fz, rz = fx, d = Math.hypot(dx, dz) || 1, a = (dx * fx + dz * fz) / d, b = (dx * rx + dz * rz) / d, k = [];
  if (a > 0.38) k.push('KeyW'); else if (a < -0.38) k.push('KeyS'); if (b > 0.38) k.push('KeyD'); else if (b < -0.38) k.push('KeyA'); return k; };
const walkFor = async (x, z, ms) => { const t0 = Date.now(); let pts = null; while (Date.now() - t0 < ms) { const s = await look(); if (!pts) { const p = await ev(({ x, z }) => window.P?.plan?.(x, z, { tol: 1 }), { x, z }); pts = (p?.ok && p.pts?.length ? p.pts : [[x, z]]).map((q) => Array.isArray(q) ? q : [q.x, q.z]); }
  while (pts.length > 1 && Math.hypot(pts[0][0] - s.x, pts[0][1] - s.z) < 0.8) pts.shift(); if (Math.hypot(x - s.x, z - s.z) < 1) break; await hold(dirKeys(s, pts[0][0] - s.x, pts[0][1] - s.z)); await wait(80); } await hold([]); };
const settle = async (k = 'KeyE') => { for (let i = 0; i < 60; i++) { if ((await ev(() => game.state)) === 'play') return; await key(k); await wait(350); } };

// ---- 1. the title card
await page.click('[data-act="new"]'); await wait(900); if (await ev(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.audio?.ctx && game.audio.out, null, { timeout: 60000 });
log('recorder', await rec.start());
await ev((b64) => new Promise((res) => { const im = new Image(); im.onload = () => { window.REC.poster = im; res(); }; im.src = 'data:image/jpeg;base64,' + b64; }), fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'poster.jpg')).toString('base64'));
await ev(() => { window.REC.mode = 'poster'; }); await rec.on(); await wait(2600); await rec.off();
// ---- 2. the island (the opening's own view as the title rises)
await page.waitForFunction(() => { const t = document.querySelector('#cine-title'); return t && getComputedStyle(t).opacity > 0.2 && t.offsetParent; }, null, { timeout: 120000 }).catch(() => log('no title seen'));
await rec.game(); await rec.cap('Citadel Island, twelve years later', 2100); await rec.on(); await wait(2200); await rec.off();
// ---- 3. Zoé at home: the film's own kitchen shots, from her line about the tap, her words over them
await rec.flag('showTalk', true);
await page.waitForFunction(() => /tap/i.test(document.querySelector('#cine-sub')?.textContent || ''), null, { timeout: 120000 }).catch(() => log('no tap line'));
await rec.on(); await rec.cap('Zoé, at home', 2300); await wait(2400); await rec.off();
await rec.flag('showTalk', false);
for (let i = 0; i < 60 && (await ev(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await wait(900); await page.keyboard.up('KeyE'); }
await wait(1200); await settle();
await page.addScriptTag({ path: path.join(ROOT, 'tests/lib/player.js') });
// ---- 4. the chapter 2 save, loaded in the page (no reload: the recorder keeps going)
const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/campaign/base-03.save.json'), 'utf8'));
await ev((items) => { for (const { name, value } of items) localStorage.setItem(name, value); }, st.origins[0].localStorage);
await ev(() => { game.startContinue(); });
await page.waitForFunction(() => game.state && !game.preparing && game.hero && !game._loadingAreas, null, { timeout: 300000 }); await wait(2500); await settle();
await ev(() => { const G = game; G.settings.controls = 'modern'; G.settings.camera = 'follow'; G.settings.quality = 'high'; G.settings.qualityAuto = false; G.applySettings(); });
log('loaded', await look());
// ---- 5. through the square to the market

// ---- 6. talk to someone on the square
const npc = await ev(() => { const h = game.hero.pos; const L = game.npcs.filter((q) => q.present !== false && q.def?.id !== 'zoe').map((q) => [q.def.id, q.pos.x, q.pos.z, Math.hypot(q.pos.x - h.x, q.pos.z - h.z)]).sort((a, b) => a[3] - b[3]); return L[0] || null; });
log('npc', npc);
await rec.flag('showTalk', true);
if (npc) { await ev(({ x, z }) => { const G = game, h = G.hero, px = x + 2.2, pz = z + 0.6; h.pos.set(px, G.physics.groundAt(px, pz), pz); h.angle = Math.atan2(x - px, z - pz); G.camRig.snap?.(); }, { x: npc[1], z: npc[2] }); await wait(900); }

if (npc) { await walkFor(npc[1] + 0.9, npc[2] + 0.3, 1500); await key('KeyE'); await wait(900); }
await rec.on(); await rec.cap('Talk to everyone', 2300); await wait(2400);
await rec.off(); await settle(); await rec.flag('showTalk', false);
// ---- 7. the four behaviour modes (F1-F4), each doing its thing
await rec.flag('showMode', true);
await key('F2'); await wait(400); await rec.on(); await rec.cap('Four behaviour modes', 3000);
await hold(['KeyW']); await wait(350); await key('Space', 120); await wait(400); await hold([]);
await rec.cut(); await key('F3'); await wait(400); await rec.uncut(); await key('Space', 100); await wait(700);
await rec.cut(); await key('F4'); await wait(400); await rec.uncut(); await hold(['KeyA']); await wait(750); await hold([]);
await rec.cut(); await key('F1'); await wait(400); await rec.uncut(); await hold(['KeyW']); await wait(650); await hold([]);
await rec.off(); await rec.flag('showMode', false);
// ---- 9. a jump (Athletic, running)
await key('F2'); await wait(300);

await key('F1');
// ---- 10. the magic ball in a short fight in the chapter 2 depot's yard: the drones' aim lines and charge, his throws
const st5 = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/campaign/base-05.save.json'), 'utf8'));
await ev((items) => { for (const { name, value } of items) localStorage.setItem(name, value); }, st5.origins[0].localStorage);
await ev(() => { game.startContinue(); });
await page.waitForFunction(() => game.state && !game.preparing && game.hero && !game._loadingAreas && game.room?.id === 'zeelich', null, { timeout: 300000 }); await wait(2500); await settle();
await ev(() => { const G = game; G.settings.controls = 'modern'; G.settings.camDist = 'near'; G.applySettings(); const D = G.rooms.zeelich.depot, h = G.hero; const x = D.x - 1, z = D.z - 3; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = 0; G.camRig.snap?.(); h.hp = h.maxHp; });
await wait(400);
const foe = () => ev(() => { const h = game.hero.pos; game.hero.hp = Math.max(game.hero.hp, 5); const L = game.enemies.filter((q) => q.alive && q.present && q.def?.kind === 'drone' && Math.hypot(q.pos.x - h.x, q.pos.z - h.z) < 16).sort((a, b) => Math.hypot(a.pos.x - h.x, a.pos.z - h.z) - Math.hypot(b.pos.x - h.x, b.pos.z - h.z))[0]; return L ? [L.pos.x, L.pos.z, L.state, !!game.targeting?.lock] : null; });
// (a few seconds unrecorded for the watch to turn on him)
for (let i = 0; i < 12 && !(await ev(() => game.enemies.some((q) => q.def?.kind === 'drone' && /alert|chase|windup/.test(q.state)))); i++) await wait(400);
await rec.on(); await rec.cap('The magic ball', 2600);
for (let i = 0; i < 3; i++) { const e = await foe(); if (!e) { await wait(400); continue; }
  if (!e[3]) await key('KeyL', 50); const s = await look(); await hold(dirKeys(s, e[0] - s.x, e[1] - s.z)); await wait(80); await hold([]); await key('KeyF', 70); await wait(780); }
await rec.off();
// ---- 11. the end card
await ev(() => { window.REC.mode = 'card'; });
await rec.card([['The Awakening', 80], ['Work in progress  ·  Full release planned 31 May 2027', 44, '#d8dde6']], 2200);
// ---- out: the file
const size = await ev(() => new Promise((res) => { const R = window.REC; R.mr.onstop = () => { R.blob = new Blob(R.chunks, { type: R.mr.mimeType }); res(R.blob.size); }; R.mr.resume(); R.mr.stop(); }));
log('size', size, 'compositor errors', await ev(() => window.REC.err || 'none'));
const parts = []; const step = 4 * 1024 * 1024;
for (let o = 0; o < size; o += step) parts.push(Buffer.from(await ev(async ({ o, step }) => { const b = await window.REC.blob.slice(o, o + step).arrayBuffer(); let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }, { o, step }), 'base64'));
fs.writeFileSync(`${OUT}/awakening-trailer.mp4`, Buffer.concat(parts));
log('written', `${OUT}/awakening-trailer.mp4`);
await browser.close(); server.close?.(); process.exit(0);
