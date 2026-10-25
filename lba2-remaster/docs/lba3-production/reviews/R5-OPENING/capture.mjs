// R5-OPENING review capture: plays a new game's opening on the game's own clock (deterministic 1/30 s steps: the
// picture a player sees at normal speed, with no frames dropped by the slow software renderer), saves a page
// screenshot every STEP seconds (subtitles, captions, the fade and the title included) and a per-frame log.
//   node capture.mjs <outdir> [width height step t0 t1]        GAME_URL (default http://localhost:8181/)
//   NOSHOTS=1: the log only (every frame), no pictures
// <outdir>/f_<t>.jpg   the frame at t
// <outdir>/log.json    per frame (30 fps): t, shot, sub, room, fade, camera; per actor pos / angle / anim / visible, the
//                      ankles' world position and height over the floor, the wrists; Zoé's right hand from the skinned
//                      mesh (its fingertip, the gap to the tap's handle and to the stream's axis); every actor's gaze
//                      error (head forward vs the look target). On picture frames also: each face's place in the
//                      frame (head centre and crown in NDC, facing the lens, hidden behind something) and the part of
//                      the frame taken by the house's ceiling (downward-facing surfaces) and by anything above 2.5 m.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, W = 960, H = 540, STEP = 0.2, T0 = 0, T1 = 89] = [process.argv[2], ...process.argv.slice(3).map(Number)];
fs.mkdirSync(OUT, { recursive: true });
const SHOTS = !process.env.NOSHOTS;
const HEAVY = process.env.HEAVY != null ? +process.env.HEAVY : 0.2;   // seconds between the face / ceiling measures (0: none)
const TIMING = !!process.env.TIMING;
const URL0 = process.env.GAME_URL || 'http://localhost:8181/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
await ev(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
await ev(() => {
  const G = game, c = G.cine, V3 = G.camera.position.constructor, v = new V3(), v2 = new V3(), v3 = new V3();
  const R = G.rooms.house, K = R.kitchen;
  const cast = () => ({ twinsen: G.hero, zoe: G.npcs.find((n) => n.def.id === 'zoe'), arthur: G.npcs.find((n) => n.def.id === 'arthur'), ...(c.extras || {}) });
  // Zoé's right-hand vertices (skin weight on handR > 0.5), found once
  const zoe = cast().zoe;
  let zMesh = null, zIdx = [];
  zoe.rig.root.traverse((o) => { if (o.isSkinnedMesh && !zMesh) zMesh = o; });
  if (zMesh) {
    const bi = zMesh.skeleton.bones.indexOf(zoe.rig.j.armR.hand), si = zMesh.geometry.attributes.skinIndex, sw = zMesh.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.5) { zIdx.push(i); break; }
  }
  const handPts = () => zIdx.map((i) => { const p = new V3(); zMesh.getVertexPosition(i, p); return p.applyMatrix4(zMesh.matrixWorld); });
  // the soles: each foot's lowest vertex (skin weight on the foot bone), for every actor — the ankle alone moves as
  // the foot rolls heel to toe, so a planted foot is judged by its lowest point
  const soleIdx = new Map();
  const soles = (id, a, fl) => {
    if (!soleIdx.has(id)) {
      let m = null; a.rig.root.traverse((o) => { if (o.isSkinnedMesh && !m) m = o; });
      const ix = { m, L: [], R: [] };
      if (m) { const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
        for (const s of ['L', 'R']) { const bi = m.skeleton.bones.indexOf(a.rig.j['leg' + s].foot);
          if (bi >= 0) for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.5) { ix[s].push(i); break; } } }
      soleIdx.set(id, ix);
    }
    const ix = soleIdx.get(id);
    if (!ix.m || !ix.L.length) return null;
    // per foot: a contact patch followed for as long as it stays on the floor — the vertices within 1 cm of the lowest,
    // picked when the foot comes down and then the same vertices every frame (so a heel-to-toe roll starts a new patch
    // instead of reading as a slide); [x, mean height over the floor, z, patch number, lowest height]
    return ['L', 'R'].map((s) => {
      const pts = ix[s].map((i) => { const p = new V3(); ix.m.getVertexPosition(i, p); return p.applyMatrix4(ix.m.matrixWorld); });
      const lo = Math.min(...pts.map((p) => p.y)) - fl;
      const key = s, st = (ix.patch ??= {});
      let P = st[key];
      const mean = (ids) => { const c = ids.map((k) => pts[k]); return [c.reduce((a, p) => a + p.x, 0) / c.length, c.reduce((a, p) => a + p.y, 0) / c.length - fl, c.reduce((a, p) => a + p.z, 0) / c.length]; };
      if (P) { const m = mean(P.ids); if (m[1] > 0.015 || Math.hypot(m[0] - a.pos.x, m[2] - a.pos.z) > 0.6) P = st[key] = null; }   // (off the floor, or the actor was moved)
      if (!P && lo < 0.012) { const ids = []; pts.forEach((p, k) => { if (p.y - fl < lo + 0.01) ids.push(k); }); P = st[key] = { ids, n: (ix.np = (ix.np || 0) + 1) }; }
      if (!P) return [null, +lo.toFixed(4), null, 0, +lo.toFixed(4)];
      const m = mean(P.ids);
      return [+m[0].toFixed(4), +m[1].toFixed(4), +m[2].toFixed(4), P.n, +lo.toFixed(4)];
    });
  };
  const process_soles = true;
  window.__rec = [];
  window.__sample = (heavy) => {
    const P = G.physics, shots = c.def.shots, t = c.t;
    const si = shots.findIndex((s) => t >= s.t0 && t < s.t1);
    const cam = G.camera, sub = document.querySelector('#cine-sub');
    if (heavy) { cam.updateMatrixWorld(); G.scene.updateMatrixWorld(); }
    const r = { t: +t.toFixed(3), shot: si, sub: sub.classList.contains('show') ? sub.textContent : '', room: G.room?.id || 'out', fade: document.querySelector('#fade').classList.contains('on'), cam: [cam.position.x, cam.position.y, cam.position.z].map((x) => +x.toFixed(3)), fov: +cam.fov.toFixed(2), a: {} };
    for (const [id, a] of Object.entries(cast())) {
      const rig = a.rig, vis = rig.root.visible && (id !== 'zoe' || a.present);
      const fl = P.groundAt(a.pos.x, a.pos.z, a.pos.y + 0.3);
      const feet = ['legL', 'legR'].map((s) => { rig.j[s].foot.getWorldPosition(v); return [v.x, v.y - fl, v.z].map((x) => +x.toFixed(4)); });
      const hands = ['armL', 'armR'].map((s) => { rig.j[s].hand.getWorldPosition(v); return [v.x, v.y, v.z].map((x) => +x.toFixed(3)); });
      const o = { pos: [a.pos.x, a.pos.y, a.pos.z].map((x) => +x.toFixed(4)), ang: +a.angle.toFixed(4), anim: rig.anim, vis, floor: +fl.toFixed(3), feet, hands };
      if (vis && (id === 'zoe' || id === 'twinsen' || process_soles)) { const so = soles(id, a, fl); if (so) o.soles = so; }
      // gaze: the head's forward (+z) against the direction to the look target
      rig.j.head.getWorldPosition(v); rig.j.head.getWorldDirection(v2);
      if (rig.lookAt) { o.look = [rig.lookAt.x, rig.lookAt.y, rig.lookAt.z].map((x) => +x.toFixed(2)); v3.copy(rig.lookAt).sub(v).normalize(); o.gaze = +((Math.acos(Math.max(-1, Math.min(1, v2.dot(v3)))) * 180) / Math.PI).toFixed(1); }
      o.headFwd = [v2.x, v2.y, v2.z].map((x) => +x.toFixed(3));
      if (heavy && vis) {
        // the face in the frame: head centre and crown (NDC), toward the lens, hidden behind something
        const hc = v.clone().add(new V3(0, 0.08 * rig.root.scale.y, 0)), crown = v.clone().add(new V3(0, 0.26 * rig.root.scale.y, 0)), chin = v.clone().add(new V3(0, -0.08 * rig.root.scale.y, 0));
        const toCam = cam.position.clone().sub(hc), dist = toCam.length(); toCam.normalize();
        const n1 = hc.clone().project(cam), n2 = crown.clone().project(cam), n3 = chin.clone().project(cam);
        const face = { c: [n1.x, n1.y].map((x) => +x.toFixed(3)), top: +n2.y.toFixed(3), chin: +n3.y.toFixed(3), front: +v2.dot(toCam).toFixed(2), d: +dist.toFixed(2), behind: n1.z > 1 };
        if (G.room === R && Math.abs(n1.x) < 1.1 && Math.abs(n1.y) < 1.1 && n1.z < 1) {
          const rc = window.__rc ??= new (window.__RC)(); rc.camera = cam;
          rc.set(cam.position, toCam.clone().negate()); rc.far = dist - 0.25;
          const hit = rc.intersectObject(R.group, true).find((h) => h.object.isMesh && h.object.visible && !h.object.material.transparent);
          face.hidden = hit ? (hit.object.name || hit.object.parent?.name || hit.object.type) : false;
        }
        o.face = face;
      }
      r.a[id] = o;
    }
    // Zoé's right hand against the tap and the stream
    if (zMesh && zoe.present && G.room === R) {
      const pts = handPts(); zoe.rig.j.armR.hand.getWorldPosition(v);
      let tip = v, far = 0; for (const p of pts) { const d = p.distanceTo(v); if (d > far) { far = d; tip = p; } }
      K.handle.getWorldPosition(v2);
      let dH = 9, dS = 9, inS = 0, low = 9;
      const sx = K.spout.x, sz = K.spout.z, sy = K.spout.y, by = K.basin.y;
      for (const p of pts) {
        const rxz = Math.hypot(p.x - v2.x, p.z - v2.z), dy = p.y - v2.y;
        dH = Math.min(dH, Math.hypot(Math.max(0, rxz - 0.075), Math.abs(dy) > 0.02 ? Math.abs(dy) - 0.02 : 0));
        const ax = Math.hypot(p.x - sx, p.z - sz);
        if (p.y < sy && p.y > by) { dS = Math.min(dS, Math.max(0, ax - 0.014)); if (ax < 0.03) inS++; }
        low = Math.min(low, p.y);
      }
      r.zh = { tip: [tip.x, tip.y, tip.z].map((x) => +x.toFixed(3)), reach: +far.toFixed(3), dHandle: +dH.toFixed(3), dStream: +dS.toFixed(3), inStream: inS, low: +low.toFixed(3), handleY: +K.handle.rotation.y.toFixed(3), stream: K.stream.visible };
    }
    // the ceiling's share of the frame (house only, picture frames)
    if (heavy && G.room === R) {
      const rc = window.__rc ??= new (window.__RC)(); rc.camera = cam; rc.far = 40;
      const NX = 32, NY = 18; let down = 0, high = 0, topDown = 0, n = 0, voids = 0; const rows = new Array(NY).fill(0);
      for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
        const ndc = { x: -1 + (ix + 0.5) * 2 / NX, y: 1 - (iy + 0.5) * 2 / NY };
        rc.setFromCamera(ndc, cam);
        const hit = rc.intersectObject(R.group, true).find((h) => h.object.isMesh && h.object.visible && h.object.material.opacity !== 0);
        n++;
        if (!hit) { voids++; continue; }
        const nrm = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null;
        const isDown = nrm && nrm.y < -0.5 && hit.point.y > 2.0;
        if (isDown) { down++; rows[iy]++; if (iy < NY / 2) topDown++; }
        if (hit.point.y > 2.5) high++;
      }
      r.ceil = { void: +(voids / n).toFixed(3), down: +(down / n).toFixed(3), high: +(high / n).toFixed(3), topHalf: +(topDown / (n / 2)).toFixed(3), rows };
    }
    window.__rec.push(r);
  };
});
// a Raycaster class from the page's own three.js module
await ev(async () => { const T = await import('three'); window.__RC = T.Raycaster; });
const fmt = (t) => t.toFixed(2).padStart(6, '0');
let next = T0;
for (;;) {
  const st = await ev(() => (game.cine ? game.cine.t : null));
  if (st == null || st > T1) break;
  if (SHOTS && st + 1 / 30 >= next - 1e-6) {
    const tA = Date.now();
    await ev((HEAVY) => { game.frame(1 / 30, true); const t = game.cine.t; const h = HEAVY > 0 && Math.floor(t / HEAVY) !== window.__lastH; if (h) window.__lastH = Math.floor(t / HEAVY); window.__sample(h); }, HEAVY);
    const tB = Date.now();
    const t = await ev(() => game.cine?.t ?? 999);
    await page.screenshot({ path: path.join(OUT, `f_${fmt(t)}.jpg`), type: 'jpeg', quality: 85, timeout: 120000 });
    if (TIMING) console.log('frame', t.toFixed(2), 'sim+sample ms', tB - tA, 'shot ms', Date.now() - tB);
    while (next <= t + 1e-6) next += STEP;
  } else {
    const tA = Date.now();
    await ev(([n, HEAVY]) => { let i = 0; do { game.frame(1 / 30, false); const t = game.cine?.t ?? 0; const h = HEAVY > 0 && Math.floor(t / HEAVY) !== window.__lastH; if (h) window.__lastH = Math.floor(t / HEAVY); window.__sample(h); i++; } while (i < 300 && game.cine && game.cine.t + 2 / 30 < n - 1e-6); }, [SHOTS ? next : 1e9, HEAVY]);
    if (TIMING) console.log('steps ms', Date.now() - tA);
  }
}
fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(await ev(() => window.__rec)));
console.log('done', errs.length ? errs.slice(0, 8).join('\n') : 'no errors');
await browser.close();
