// PERF-CALLS: every main-pass draw of one frame in one area that is not a draw batch, with why drawbatch.js left it
// out (explain()), its material (transparent, opacity, map size, own shader), vertices, world position and builder path.
//   GAME_URL=http://localhost:8321/ Q=medium BATTERY=1 AREA=desert node drawlist.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', AREA = process.env.AREA || 'desert';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(async () => { window.__explain = (await import('/src/engine/drawbatch.js')).explain; });
const r = await ev(({ area, full, cam }) => {
  const G = game, R = G.renderer.renderer;
  G.state = 'play';
  if (area === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); else G.enterRoom(area, null, true, true);
  G.bench.camera();
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  G.state = 'play';
  for (let i = 0; i < 90; i++) G.frame(1 / 30, i % 3 === 0);
  const root = G.room?.group || G.world.root;
  const path = (o) => { const p = []; for (let x = o.parent; x && x !== root && (full || p.length < 4); x = x.parent) p.push((x.name || x.type) + (x.userData?.keep ? '*keep' : '') + (full ? '{' + Object.keys(x.userData).join(',') + '}' : '')); return p.reverse().join('/') || '(root)'; };
  const rows = [], rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o, ...a) {
    if (sc !== null && !o.userData.drawBatch) {
      const inArea = (() => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; })();
      const v = g.attributes.position?.count || 0, w = o.getWorldPosition(new o.position.constructor());
      const chain = []; for (let p = o.parent; p && chain.length < 6; p = p.parent) chain.push(p.name || p.type);
      rows.push({ who: chain.reverse().join('>'), why: inArea ? (o.isInstancedMesh ? 'instanced x' + o.count : window.__explain(o, root)) : 'not area', name: o.name, path: path(o), mat: (m.name || m.type) + '#' + m.id + (m.transparent ? ' T' + m.opacity.toFixed(2) : '') + (m.map ? ' map' + (m.map.image?.width || '?') + (m.map.wrapS === 1000 ? 'R' : 'C') : '') + (m.alphaTest ? ' aT' : '') + (m.depthWrite === false ? ' noDW' : ''), v, cast: o.castShadow, at: [w.x, w.y, w.z].map((x) => Math.round(x)).join(','), ro: o.renderOrder });
    }
    return rbd.call(this, c, sc, g, m, o, ...a);
  };
  G.frame(1 / 60, true);
  R.renderBufferDirect = rbd;
  return rows;
}, { area: AREA, full: !!process.env.FULL, cam: process.env.CAM || '' });
const by = new Map();
for (const x of r) { const k = x.why.replace(/x\d+$/, ''); by.set(k, (by.get(k) || 0) + 1); }
console.log('by reason', JSON.stringify(Object.fromEntries([...by].sort((a, b) => b[1] - a[1]))));
for (const x of r) console.log(`${x.why.padEnd(40).slice(0, 60)} | ${x.why === 'not area' ? x.who : x.path} :: ${x.name} | ${x.mat} | v${x.v}${x.cast ? ' cast' : ''} @${x.at}${x.ro ? ' ro' + x.ro : ''}`);
await browser.close();
