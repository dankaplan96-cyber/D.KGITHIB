// DEPTH-LOOK probe: the play camera (Follow, Far) at 8 places; per place and preset, the frame and its light variants
// (sun off, cast shadows off, fog off, wall normals off) for the measurements.
// usage (from lba3, SERVE=1): node captures/depth-look/depthshots.mjs OUT "query" mode [places] [res list] [presets]
// mode: measure (variants at 1366 wide) | shots (frames only)
import { launch, open, menu } from '../../tests/lib/boot.mjs';
import fs from 'node:fs';
const [OUT, Q = '', MODE = 'measure', ONLYP, RESL = '1366x768,1920x1080', PRES = 'high,medium'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1366, height: 768, ...(process.env.SCALE ? { scale: +process.env.SCALE } : {}) });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (Q ? '&' + Q : ''));
await menu(page, 'new');
await ev(() => { const G = game; for (let i = 0; i < 120 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.flags.pr_tut2 = false; G.settings.res = 'full'; G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.applySettings(); });
const PLACES = [
  ['fortwall', { x: -68.4, z: 1.5, a: -1.5708 }],
  ['square', { x: -42, z: -2, a: 0.6 }],
  ['harbour', { x: -107, z: 37, a: -1.2 }],
  ['house', { room: 'house', t: 2.5 }],
  ['zeelich', { room: 'zeelich', t: 2 }],
  ['desert', { room: 'desert', t: 2 }],
  ['lhar', { room: 'hamalayi', near: 'lhar', dz: 6, a: Math.PI, t: 2 }],
  ['island', { room: 'isle_celebration', t: 2 }],
].filter(([n]) => !ONLYP || ONLYP === 'all' || ONLYP.split(',').includes(n));
const place = (s) => ev((s) => { const G = game, h = G.hero;
  if (s.near) { const R = G.rooms[s.room], q = s.near.split('.').reduce((o, k) => o[k], R); s.x = q.x + (s.dx || 0); s.z = q.z + (s.dz || 0); }
  if (s.room) { if (G.room?.id !== s.room) G.enterRoom(s.room, s.x != null ? { x: s.x, z: s.z, a: s.a } : null, true, true); else if (s.x != null) h.pos.set(s.x, G.physics.groundAt(s.x, s.z), s.z); }
  else G.exitRoom({ x: s.x, z: s.z, a: s.a ?? 0 }, true, true);
  if (s.a != null) h.angle = s.a;
  G.camRig.snap?.(); G.step(s.t ?? 1.5); G.step(0.5); G.renderer.render(); return G.room?.id || 'citadel'; }, s);
const quality = (q) => ev((q) => { const G = game; G.settings.qualityAuto = false; G.settings.quality = q; G.applySettings(); G.warmGraphics?.(); G.step(0.1); }, q);
const info = () => ev(() => { const G = game, E = G.env, C = G.camera, h = G.hero, R = G.renderer.renderer;
  const v = new C.position.constructor(); C.getWorldDirection(v);
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  let nm = 0; G.scene.traverse((o) => { const m = o.material; if (o.visible && m && !Array.isArray(m) && m.normalMap) nm++; });
  return { room: G.room?.id || 'citadel', sunI: +E.sun.intensity.toFixed(3), sunLum: +lum(E.sun.color).toFixed(3), hemiI: +E.hemi.intensity.toFixed(3), skyLum: +lum(E.hemi.color).toFixed(3), groundLum: +lum(E.hemi.groundColor).toFixed(3),
    sunDir: E.sunDir.toArray().map((x) => +x.toFixed(3)), viewDir: v.toArray().map((x) => +x.toFixed(3)), sunViewDot: +(-v.dot(E.sunDir)).toFixed(3),
    fog: [Math.round(G.scene.fog?.near ?? 0), Math.round(G.scene.fog?.far ?? 0)], camDist: +C.position.distanceTo(h.pos).toFixed(2), camH: +(C.position.y - h.pos.y).toFixed(2),
    shadows: R.shadowMap.enabled, shadowMap: E.sun.shadow.mapSize.x, quality: G.settings.quality, pr: R.getPixelRatio(), calls: R.info.render.calls, normalMapped: nm,
    grade: G.renderer.output?.uniforms.grade?.value, storm: E.storm, interior: !!E.interior, indoor: E.indoor || null, hero: h.pos.toArray().map((x) => +x.toFixed(2)) }; });
const variant = (k) => ev((k) => { const G = game, E = G.env, S = G._dlSave ??= {};
  if (S.sun != null) { E.sun.intensity = S.sun; S.sun = null; }
  if (S.sh != null) { E.sun.shadow.intensity = S.sh; S.sh = null; }
  if (S.fog) { G.scene.fog.near = S.fog[0]; G.scene.fog.far = S.fog[1]; S.fog = null; }
  if (S.nm) { for (const [m, a, b] of S.nm) { m.normalScale.set(a, a); m.aoMapIntensity = b; } S.nm = null; }
  if (k === 'nosun') { S.sun = E.sun.intensity; E.sun.intensity = 0; }
  if (k === 'noshadow') { S.sh = E.sun.shadow.intensity; E.sun.shadow.intensity = 0; }
  if (k === 'nofog' && G.scene.fog) { S.fog = [G.scene.fog.near, G.scene.fog.far]; G.scene.fog.near = 1e5; G.scene.fog.far = 2e5; }
  if (k === 'nonormal') { S.nm = []; const seen = new Set(); G.scene.traverse((o) => { const m = o.material; if (m && !Array.isArray(m) && m.normalMap && !seen.has(m)) { seen.add(m); S.nm.push([m, m.normalScale.x, m.aoMapIntensity]); m.normalScale.set(0, 0); m.aoMapIntensity = 0; } }); }
  G.renderer.render(); }, k);
const log = {};
const RES = RESL.split(',').map((s) => s.split('x').map(Number));
for (const [w, h] of RES) {
  await page.setViewportSize({ width: w, height: h });
  for (const q of PRES.split(',')) {
    await quality(q);
    for (const [name, s] of PLACES) {
      try { await place(s); } catch (e) { console.log('place fail', name, e.message.slice(0, 200)); continue; }
      const tag = `${name}-${q}-${w}x${h}`;
      await variant('base');
      const I = await info(); log[tag] = I; console.log(tag, JSON.stringify(I));
      await page.screenshot({ path: `${OUT}/${tag}.png`, timeout: 180000 });
      if (MODE === 'measure' && w === 1366) for (const k of ['nosun', 'noshadow', 'nofog', 'nonormal']) { await variant(k); await page.screenshot({ path: `${OUT}/${tag}~${k}.png`, timeout: 180000 }); }
      await variant('base');
      if (process.env.NEAR && w === 1366 && q === 'high') {
        await ev(() => { const G = game; G.settings.camDist = 'near'; G.applySettings(); });
        await place(s); await page.screenshot({ path: `${OUT}/${name}-near-${q}-${w}x${h}.png`, timeout: 180000 });
        await ev(() => { const G = game; G.settings.camDist = 'far'; G.applySettings(); });
      }
      if (process.env.DLINFO) console.log('DL', name, JSON.stringify(await ev(() => { const D = window.__depthlook; return D ? { bakes: D.bakes, ms: D.bakeMs && +D.bakeMs.toFixed(1), hidden: D.bakeHidden, calls: D.bakeCalls, frameCalls: game.renderer.renderer.info.render.calls } : null; })));
    }
  }
}
fs.writeFileSync(`${OUT}/info.json`, JSON.stringify(log, null, 1));
console.log('ERRORS', errs.length, errs.slice(0, 5).map((e) => e.slice(0, 600)).join('\n'));
await browser.close(); process.exit(0);
