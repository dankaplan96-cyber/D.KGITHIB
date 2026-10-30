// PERF-SUBMIT: what one drawn frame of a benchmark route asks of three.js and of WebGL (averaged over FRAMES drawn
// frames): GL calls by name (every WebGL2 method wrapped), draws per pass, program and material switches in the
// render lists, objects the scene walk visits, the shown-world update's stats, render-list sizes.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street FRAMES=30 [CAM=follow] [TOP=40] node census.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 30), TOP = +(process.env.TOP || 40);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => {
  try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {}
  // every WebGL2 method counted while window.__glc is an object
  const P = WebGL2RenderingContext.prototype;
  for (const k of Object.getOwnPropertyNames(P)) {
    const d = Object.getOwnPropertyDescriptor(P, k); if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
    const f = d.value; P[k] = function (...a) { const C = window.__glc; if (C) C[k] = (C[k] || 0) + 1; return f.apply(this, a); };
  }
}, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
if (process.env.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), process.env.OPT);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
const r = await ev(({ id, cam, FR }) => {
  const G = game, R = G.renderer.renderer, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  let t = 0;
  for (let i = 0; i < 300; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
  // per draw: pass, program, material, object
  const acc = { gl: {}, main: 0, shadow: 0, progSw: { main: 0, shadow: 0 }, matSw: { main: 0, shadow: 0 }, mats: 0, progs: 0, objs: 0, opaque: 0, transp: 0, mw: {}, kinds: {}, skinned: 0, inst: 0, cast: 0, shownMeshes: 0 };
  const rbd = R.renderBufferDirect; let lastP = { main: null, shadow: null }, lastM = { main: null, shadow: null }, matSet = new Set(), progSet = new Set();
  R.renderBufferDirect = function (c, sc, g, m, o, grp) {
    const P = sc === null ? 'shadow' : 'main'; acc[P]++;
    const pr = R.properties.get(m).currentProgram;
    if (pr !== lastP[P]) { acc.progSw[P]++; lastP[P] = pr; }
    if (m !== lastM[P]) { acc.matSw[P]++; lastM[P] = m; }
    if (P === 'main') { matSet.add(m); progSet.add(pr); if (o.isSkinnedMesh) acc.skinned++; if (o.isInstancedMesh) acc.inst++; }
    return rbd.apply(this, arguments);
  };
  for (let i = 0; i < FR; i++) {
    t += 1 / 60; route.drive(t, 1 / 60);
    lastP = { main: null, shadow: null }; lastM = { main: null, shadow: null };
    window.__glc = acc.gl;
    G.perf.beginFrame(); G.frame(1 / 60, true);
    window.__glc = null;
    const st = G.renderer._mw?.stats; if (st) for (const k in st) acc.mw[k] = (acc.mw[k] || 0) + st[k];
  }
  R.renderBufferDirect = rbd;
  // the scene as three's walk sees it: every object under shown parents (projectObject visits these)
  let walked = 0, shownMesh = 0, cast = 0, all = 0;
  const walk = (o) => { walked++; if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { shownMesh++; if (o.castShadow) cast++; } for (const c of o.children) if (c.visible) walk(c); };
  walk(G.scene); G.scene.traverse(() => all++);
  const RL = R.renderLists.get(G.scene, 0);
  return { acc, mats: matSet.size, progs: progSet.size, walked, shownMesh, cast, all, opaque: RL?.opaque.length, transparent: RL?.transparent.length, transmissive: RL?.transmissive.length, programs: R.info.programs.length, npcs: G.npcs.length, room: G.room?.id || 'citadel' };
}, { id: ID, cam: process.env.CAM || '', FR });
const A = r.acc, f = (x) => (x / FR).toFixed(1);
console.log(`PERF-SUBMIT census · ${Q}${process.env.BATTERY ? ' battery' : ''}${process.env.CAM ? ' cam ' + process.env.CAM : ''} · ${ID} (${r.room}) · ${FR} frames${process.env.OPT ? ' · opt ' + process.env.OPT : ''}`);
console.log(`draws a frame: main ${f(A.main)} (skinned ${f(A.skinned)}, instanced ${f(A.inst)}) · shadow ${f(A.shadow)} · program switches main ${f(A.progSw.main)} shadow ${f(A.progSw.shadow)} · material switches main ${f(A.matSw.main)} shadow ${f(A.matSw.shadow)} · distinct main materials ${r.mats}, programs ${r.progs} (all frames)`);
console.log(`scene: ${r.all} objects, ${r.walked} under shown parents (three's walk), ${r.shownMesh} drawable shown, ${r.cast} of them casting · render list (last pass) opaque ${r.opaque} transparent ${r.transparent} · npcs ${r.npcs} · programs ${r.programs}`);
console.log('shown-world update a frame:', Object.entries(A.mw).map(([k, v]) => `${k} ${f(v)}`).join(' · '));
const gl = Object.entries(A.gl).sort((a, b) => b[1] - a[1]); const tot = gl.reduce((s, x) => s + x[1], 0);
console.log(`GL calls a frame: ${f(tot)}`);
for (const [k, v] of gl.slice(0, TOP)) console.log(`  ${f(v).padStart(8)}  ${k}`);
await browser.close();
