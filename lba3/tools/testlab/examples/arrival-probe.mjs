// Local (not in the repo): the first island arrival and the street, as played, on the UHD 630 in the desktop app's
// Electron (the low-power launcher copy). New Game, the opening skipped; then:
//   cold    the first arrival in Zeelich (never built): a scene change as a door or a travel makes it (startTransition)
//   back    Citadel again (warm)
//   warm    Zeelich again (built, visited)
//   street  Citadel's square on the follow camera, the bench's street loop, SUSTAIN s
// Every frame from the moment the scene change starts is kept (perf.onRecord), with what ran in it (frameWhy), whether
// it was behind the black, and the long animation frames' scripts for frames over 100 ms.
//   APPDIR=<launcher> node arrival-probe.mjs <out.json> [label]
import { _electron as electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const [OUT, LABEL = ''] = process.argv.slice(2);
const EXE = process.env.ELECTRON_EXE || 'C:/Users/danka/dev/lba3-bench/electron-uhd/electron.exe';
const APPDIR = process.env.APPDIR;
const SUSTAIN = +(process.env.SUSTAIN || 30);
const QUALITY = process.env.QUALITY || 'auto';   // auto | low | medium | high
const PROFILE = 'C:/Users/danka/dev/lba3-bench/probe-profile-' + Date.now();
fs.mkdirSync(PROFILE, { recursive: true });
const power = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_Battery | Select-Object -First 1 BatteryStatus,EstimatedChargeRemaining | ConvertTo-Json -Compress)"').toString().trim(); } catch { return '?'; } })();
const app = await electron.launch({ executablePath: EXE, args: ['--user-data-dir=' + PROFILE, APPDIR], env: { ...process.env } });
const win = await app.firstWindow();
const errs = [];
win.on('pageerror', (e) => errs.push('page error: ' + e.message));
win.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push('console error: ' + m.text()); });
await win.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 400000 });
if (QUALITY !== 'auto') await win.evaluate((q) => { game.settings.qualityAuto = false; game.applyQuality ? game.applyQuality(q) : (game.settings.quality = q); }, QUALITY);
await win.click('[data-act="new"]');
await win.waitForTimeout(1000);
if (await win.evaluate(() => game.screen === 'confirmnew')) await win.click('[data-act="newyes"]');
for (let i = 0; i < 120 && !(await win.evaluate(() => game.state === 'play' && !game.cine && !game.preparing)); i++) { await win.keyboard.press('Escape'); await win.waitForTimeout(1000); }
await win.waitForTimeout(6000);
// (the Escape that skips the opening can pause it instead: back to play before anything is measured)
for (let i = 0; i < 20 && (await win.evaluate(() => game.state)) !== 'play'; i++) {
  if ((await win.evaluate(() => game.state)) === 'pause') await win.click('#pause [data-act="resume"]').catch(() => {}); else await win.keyboard.press('Escape');
  await win.waitForTimeout(1500);
}
console.log('state before measuring:', await win.evaluate(() => game.state));

const ev = (f, a) => win.evaluate(f, a);
const env = await ev(() => {
  const G = game, R = G.renderer, r = R.renderer, gl = r.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info');
  const sm = G.env?.sun?.shadow?.mapSize;
  return { gpu: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?', version: G.version, view: `${innerWidth}x${innerHeight} @ dpr ${devicePixelRatio}`,
    preset: G.settings.quality, auto: !!G.settings.qualityAuto, pixelRatio: r.getPixelRatio(), drawBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    msaa: R.composer?.renderTarget1?.samples ?? R.samples ?? gl.getParameter(gl.SAMPLES), shadows: r.shadowMap.enabled, shadowMap: sm ? [sm.x, sm.y] : null,
    autoRes: R.autoRes ?? null, resFactor: R.resScale ?? R.autoScale ?? null, regionsBuilt: G.regions.summary?.() ?? null };
});
console.log('env', JSON.stringify(env), 'power', power);
// every frame from a mark on, with its time since the mark
await ev(() => { const G = game; window.__F = []; window.__T0 = performance.now(); G.perf.onRecord = (f) => { window.__F.push({ t: +(performance.now() - window.__T0).toFixed(1), ms: +f.ms.toFixed(1), black: !!f.black, why: f.why, calls: f.calls, tris: f.tris, up: f.up, upKB: +(f.upKB || 0).toFixed(0), sim: +(f.sim || 0).toFixed(1), render: +(f.render || 0).toFixed(1), lo: f.ms > 100 && G.perf.constructor && window.__loaf ? window.__loaf(f.end, f.ms) : undefined }); }; });
// the long animation frames (the browser's own record of what the main thread ran)
await ev(() => { window.__LOAF = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__LOAF.push({ t: +(e.startTime - window.__T0).toFixed(0), d: +e.duration.toFixed(0), block: +e.blockingDuration.toFixed(0), scripts: (e.scripts || []).slice(0, 4).map((s) => `${s.invoker || s.name} ${Math.round(s.duration)}ms ${(s.sourceFunctionName || '')}@${(s.sourceURL || '').split('/').pop()}:${s.sourceCharPosition}`) }); }).observe({ type: 'long-animation-frame', buffered: false }); } catch (e) { window.__LOAF = ['unsupported ' + e.message]; } });

// which object made a shader program or a GPU geometry, and when (the frame's 'work' says how long; this says what)
await ev(() => { const G = game, r = G.renderer.renderer, orig = r.renderBufferDirect; window.__HK = [];
  const chain = (o) => { const a = []; for (let q = o, k = 0; q && k < 5; q = q.parent, k++) a.push(q.name || q.userData?.src || q.type); return a.join(' < '); };
  r.renderBufferDirect = function (camera, scene, geometry, material, object, group) { const p0 = r.info.programs?.length ?? 0, g0 = r.info.memory.geometries, t = performance.now(), k0 = r.properties.get(material)?.currentProgram?.cacheKey;
    const out = orig.call(this, camera, scene, geometry, material, object, group);
    const p1 = r.info.programs?.length ?? 0, g1 = r.info.memory.geometries, dt = performance.now() - t;
    let why; if (p1 > p0) { const k1 = r.properties.get(material)?.currentProgram?.cacheKey || '', A = (k0 || '').split(','), B = k1.split(','); why = k0 ? B.map((x, i) => (x !== A[i] ? i + ':' + A[i] + '>' + x : null)).filter(Boolean).slice(0, 12).join(' ') : 'first program of this material'; }
    const rt = r.getRenderTarget(); const st = p1 > p0 ? (new Error().stack || '').split(String.fromCharCode(10)).slice(2, 12).map((l) => l.trim().replace(/^at /, '').replace(/\(?app:\/\/game\//, '').replace(/\)$/, '')).filter((l) => !/three|renderBufferDirect/.test(l)).slice(0, 4).join(' < ') : undefined;
    if (p1 > p0 || g1 > g0 || dt > 20) window.__HK.push({ spr: object.isSprite ? ((material === game.cues?.sprites?.[0]?.material ? 'cue' : material === game.bubble?.material ? 'bubble' : 'other') + ' map ' + (material.map?.image?.width || '-') + ' parent ' + (object.parent?.name || object.parent?.type) + ' ' + (object.userData?.kind || '')) : undefined, known: window.__MATS ? window.__MATS.has(material.uuid) : null, why, cam: camera.type + (camera.name ? ':' + camera.name : '') + (rt ? ' rt ' + rt.width + 'x' + rt.height : ''), st, t: +(performance.now() - window.__T0).toFixed(0), ms: +dt.toFixed(1), prog: p1 - p0, geo: g1 - g0, shadow: scene === null, obj: chain(object), muid: material.uuid.slice(0, 8), ouid: object.uuid.slice(0, 8), mat: material.type + (material.name ? ':' + material.name : ''), verts: geometry.attributes?.position?.count });
    return out; };
});
const phase = async (name, fn, waitAfter = 4000) => {
  await ev(() => { window.__F = []; window.__LOAF = Array.isArray(window.__LOAF) ? [] : window.__LOAF; window.__T0 = performance.now(); window.__trans = []; window.__HK = []; window.__MATS = null; });
  const nlog = await ev(() => game.regions.log.length);
  await ev(fn);
  // the scene change's own timeline: polled each frame in the page
  await ev(() => new Promise((res) => { const G = game, t0 = window.__T0; let seenBlack = null, called = null, revealed = null; const tick = () => { const T = G.trans, now = performance.now() - t0;
    if (T && T.hold && seenBlack == null) seenBlack = now; if (T && T.called && called == null) called = now; if (!T) { revealed = now; window.__trans = { blackFrom: seenBlack, swap: called, control: +now.toFixed(0), revealed: G._revealed }; res(); return; } requestAnimationFrame(tick); }; requestAnimationFrame(tick); setTimeout(() => { window.__trans = { timeout: true }; res(); }, 30000); }));
  await ev(() => { const R = game.room?.group || game.world.root, m = new Map(); const walk = (o, vis) => { const v = vis && o.visible; if (o.isMesh || o.isSprite || o.isPoints || o.isLine) m.set(o, v); for (const c of o.children) walk(c, v); }; walk(R, true); window.__VIS = m; const S = new Set(); R.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const x of ms) S.add(x.uuid); }); window.__MATS = S; const P = game.renderer.renderer.properties, un = []; R.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const x of ms) if (!P.get(x).currentProgram) un.push(x.type + ' ' + x.uuid.slice(0, 8) + ' ' + (o.name || o.type) + (o.visible ? '' : ' (hidden)')); }); window.__UNC = { n: un.length, of: S.size, some: un.slice(0, 12), prepLog: (game.prepLog || []).slice(-14).map((e) => e.area + ' ' + e.k + ' ' + e.ms) }; });
  await win.waitForTimeout(waitAfter);
  await ev(() => { const R = game.room?.group || game.world.root, M = window.__VIS, out = []; const chain = (o) => { const a = []; for (let q = o, k = 0; q && k < 6; q = q.parent, k++) a.push(q.name || q.userData?.src || q.type); return a.join(' < '); };
    const walk = (o, vis) => { const v = vis && o.visible; if (M.has(o) && M.get(o) !== v) out.push({ now: v, obj: chain(o), ouid: o.uuid.slice(0, 8), muid: (Array.isArray(o.material) ? o.material[0] : o.material)?.uuid?.slice(0, 8), self: o.visible }); if (!M.has(o) && (o.isMesh || o.isSprite)) out.push({ added: true, now: v, obj: chain(o), muid: (Array.isArray(o.material) ? o.material[0] : o.material)?.uuid?.slice(0, 8) }); for (const c of o.children) walk(c, v); }; walk(R, true); window.__VISD = out.slice(0, 60); });
  const r = await ev((n0) => ({ frames: window.__F, loaf: window.__LOAF, trans: window.__trans, builds: game.regions.log.slice(n0), unc: window.__UNC, hk: window.__HK, visd: window.__VISD, room: game.room?.id ?? 'citadel', aq: (game.autoQ?.log || []).slice(-6).map((e) => `${Math.round(e.t)} ${e.kind} ${e.what || ''} ${e.state || ''}`), q: game.settings.quality, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, geo: game.renderer.renderer.info.memory.geometries, tex: game.renderer.renderer.info.memory.textures, progs: game.renderer.renderer.info.programs?.length }), nlog);
  const F = r.frames, vis = F.filter((f) => !f.black), pc = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
  const sum = { name, room: r.room, trans: r.trans, builds: r.builds, frames: F.length, black: F.filter((f) => f.black).length, blackMs: +F.filter((f) => f.black).reduce((s, f) => s + f.ms, 0).toFixed(0),
    visibleOver50: vis.filter((f) => f.ms > 50).map((f) => `${f.ms}@${f.t}${f.why ? ' [' + f.why + ']' : ''}`), longest: F.slice().sort((a, b) => b.ms - a.ms).slice(0, 6).map((f) => `${f.ms}@${f.t}${f.black ? ' black' : ''}${f.why ? ' [' + f.why + ']' : ''}`),
    aq: r.aq, q: r.q, visP50: pc(vis.map((f) => f.ms), 0.5), visP95: pc(vis.map((f) => f.ms), 0.95), visMax: pc(vis.map((f) => f.ms), 1), heap: r.heap, geo: r.geo, tex: r.tex, progs: r.progs,
    hk: (r.hk || []).filter((h) => h.prog || h.ms > 20 || h.geo > 2).slice(0, 40), unc: r.unc, visd: r.visd, hkGeo: (r.hk || []).reduce((s2, h) => s2 + h.geo, 0),
    loaf: Array.isArray(r.loaf) ? r.loaf.filter((l) => l.d > 100).slice(0, 8) : r.loaf };
  console.log(name, JSON.stringify(sum));
  return { sum, frames: F };
};
const res = {};
res.cold = await phase('cold', () => game.enterRoom('zeelich'));
// roam: right after the cold arrival, Twinsen moved through the area's people's spots (1.2 s apart, 1.5 m off each):
// the kit's detail tiles and stand-ins switch as he goes, what the area shows later comes into view (no scene change)
res.roam = await phase('roam', () => { const G = game, h = G.hero, R = G.room; window.__trans = { control: 0 };
  const ppl = (G.npcs || []).filter((n) => n.present !== false && n.pos && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 160).sort((a2, b2) => Math.hypot(a2.pos.x - h.pos.x, a2.pos.z - h.pos.z) - Math.hypot(b2.pos.x - h.pos.x, b2.pos.z - h.pos.z));
  const pick = []; for (const n of ppl) if (pick.every((q) => Math.hypot(q.x - n.pos.x, q.z - n.pos.z) > 18)) pick.push({ x: n.pos.x + 1.5, z: n.pos.z }); window.__roam = pick.slice(0, 7).length;
  pick.slice(0, 7).forEach((q, i) => setTimeout(() => { h.pos.set(q.x, G.physics.groundAt(q.x, q.z, h.pos.y + 30), q.z); h.vy = 0; h.onGround = true; G.camRig.lba.init = false; }, 300 + i * 1200));
}, 9000);
res.back = await phase('back', () => game.exitRoom({ x: -42, z: 2, a: 0 }));
res.warm = await phase('warm', () => game.enterRoom('zeelich'));
res.back2 = await phase('back2', () => game.exitRoom({ x: -42, z: 2, a: 0 }));
// the street: the bench's own loop on the follow camera, as played (the game's governor and automatic resolution on)
const street = await ev((S) => game.bench.visits({ routes: ['street'], cycles: 1, sustainS: S, coldS: 8, repeatS: 8, camera: 'follow' }), SUSTAIN);
const envEnd = await ev(() => ({ preset: game.settings.quality, applied: game.renderer.quality ?? null, pixelRatio: game.renderer.renderer.getPixelRatio(), autoLog: game.autoQ?.log?.slice(-8) ?? null }));
fs.writeFileSync(OUT, JSON.stringify({ label: LABEL, appdir: APPDIR, power, env, envEnd, errs, phases: Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v])), street }, null, 1));
console.log('street', typeof street === 'string' ? street.split('\n').slice(0, 40).join('\n') : JSON.stringify(street).slice(0, 2000));
console.log('envEnd', JSON.stringify(envEnd), 'errs', errs.slice(0, 3));
await app.close();
