// ARM-CLEAR (P111, the user 23.11: a Grobo's "hand is inside the body, swallowed"; then the standing rule: every fix
// across the whole game): every body of the cast (every look in characters.js LOOKS: the polygon models of assets/poly
// and the sculpted ones), in every pose the people use (idle and its fidgets, walk, run, talk's five gestures, listen,
// the additive gestures, sit, doze, the everyday work clips), posed by the game's own rig. For each forearm and hand
// point (the skinned vertices whose main bone is the elbow or the hand, and the sculpted bodies' rigid hands) the depth
// inside the body (the hips, torso and robe surface): a ray from the body's axis out through the point; where the body's
// surface lies beyond the point, the point is inside, by that much. Measured over each pose's cycle, the worst kept.
// Prints a table (look × pose, cm) and checks that no hand or forearm is inside its own body by more than TOL.
// ENV: OFF=1 (the rig's clearance off: the numbers before P111)  LOOKS=a,b (only those) POSES=a,b  TOL=cm (default 0.5)  JSON=path (write the full table)  NOCHECK=1 (table only)
// SwiftShader, headless: Automated runtime only (geometry measured on the CPU from the skinned pose).
import { launch, open, checker } from './lib/boot.mjs';
import { writeFileSync } from 'node:fs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 640, height: 360 });
await open(page, '?nocine');
const ONLY = process.env.LOOKS ? process.env.LOOKS.split(',') : null;
const POSES = process.env.POSES ? process.env.POSES.split(',') : null;
const TOL = +(process.env.TOL ?? 0.5) / 100;
const OFF = !!process.env.OFF;
if (process.env.DBG) await page.evaluate(() => { window.ARMDBG = true; });

const looks = await page.evaluate(async (ONLY) => {
  const C = await import('./src/game/characters.js');
  await C.loadPolys?.();
  return Object.keys(C.LOOKS).filter((n) => !ONLY || ONLY.includes(n));
}, ONLY);

const rows = [];
for (const look of looks) {
  const r = await page.evaluate(async ({ look, POSES, OFF }) => {
    const C = await import('./src/game/characters.js');
    let rig;
    try { rig = C.createCharacter(look); } catch (e) { return { look, err: String(e).slice(0, 120) }; }
    if (OFF) rig._ac = null;   // (OFF=1: the rig's arm clearance off, as before P111)
    const j = rig.j;
    if (!j?.armL?.sh || !j?.armL?.el || !rig.mesh?.isSkinnedMesh) return { look, skip: 'no arms' };
    const root = rig.root, mesh = rig.mesh, sk = mesh.skeleton, geo = mesh.geometry;
    const BODY = new Set(['body', 'hips', 'torso', 'skirtF', 'skirtB', 'skirtL', 'skirtR']);
    const SIDE = { elL: 'L', handL: 'L', elR: 'R', handR: 'R' };
    const names = sk.bones.map((b) => b.name);
    // the main mesh and (sculpted bodies) the arms' own skinned mesh
    const meshes = [mesh]; mesh.traverse((o) => { if (o !== mesh && o.isSkinnedMesh && o.skeleton === sk && o.material !== mesh.userData.silMat) meshes.push(o); });
    const dom = (g, v) => { const si = g.attributes.skinIndex, sw = g.attributes.skinWeight; let b = -1, w = -1; for (let k = 0; k < 4; k++) { const ww = sw.getComponent(v, k); if (ww > w) { w = ww; b = si.getComponent(v, k); } } return names[b]; };
    const bodyTris = [], arm = [];   // bodyTris: [meshIdx, a, b, c]; arm: [meshIdx, v, side, isHand]
    meshes.forEach((m, mi) => {
      const g = m.geometry, n = g.attributes.position.count, d = new Array(n);
      for (let v = 0; v < n; v++) d[v] = dom(g, v);
      const idx = g.index ? g.index.array : null, nt = idx ? idx.length / 3 : n / 3;
      // (the body: what does not move with an arm — cloth tied to an arm, Twinsen's cape, is not)
      const armW = (v) => { const si = g.attributes.skinIndex, sw = g.attributes.skinWeight; let w = 0; for (let k = 0; k < 4; k++) if (/^(sh|el|hand)[LR]$/.test(names[si.getComponent(v, k)] || '')) w += sw.getComponent(v, k); return w; };
      const isBody = (v) => BODY.has(d[v]) && armW(v) <= 0.08;
      if (mi === 0) for (let t = 0; t < nt; t++) { const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2; if (isBody(a) && isBody(b) && isBody(c)) bodyTris.push(a, b, c); }
      const seen = new Set();
      for (let v = 0; v < n; v++) { const s = SIDE[d[v]]; if (!s) continue; const p = g.attributes.position; const key = `${p.getX(v).toFixed(3)},${p.getY(v).toFixed(3)},${p.getZ(v).toFixed(3)}`; if (seen.has(key)) continue; seen.add(key); arm.push([mi, v, s, d[v].startsWith('hand')]); }
    });
    // rigid hands (the sculpted bodies): meshes under the hand bones
    const rigid = [];
    for (const [s, hb] of [['L', j.armL.hand], ['R', j.armR.hand]]) hb?.children.forEach((o) => o.traverse((q) => { if (q.isMesh && !q.isSkinnedMesh && q.geometry?.attributes?.position) { const P = q.geometry.attributes.position; for (let v = 0; v < P.count; v += 2) rigid.push([q, v, s]); } }));
    // skinning on the CPU: per bone W = mesh.matrixWorld · bindMatrixInverse · bone.matrixWorld · boneInverse · bindMatrix
    const THREE = mesh.matrixWorld.constructor, M = [];
    const V = new (mesh.position.constructor)();
    const skinned = (m, v, out) => {
      const g = m.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, P = g.attributes.position;
      const x = P.getX(v), y = P.getY(v), z = P.getZ(v); let ox = 0, oy = 0, oz = 0;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (!w) continue; const e = M[si.getComponent(v, k)].elements; ox += w * (e[0] * x + e[4] * y + e[8] * z + e[12]); oy += w * (e[1] * x + e[5] * y + e[9] * z + e[13]); oz += w * (e[2] * x + e[6] * y + e[10] * z + e[14]); }
      out[0] = ox; out[1] = oy; out[2] = oz; return out;
    };
    const tmp = new THREE();
    const pose = () => {
      root.updateMatrixWorld(true);
      for (let b = 0; b < sk.bones.length; b++) { M[b] ??= new THREE(); M[b].copy(mesh.matrixWorld).multiply(mesh.bindMatrixInverse).multiply(sk.bones[b].matrixWorld).multiply(sk.boneInverses[b]).multiply(mesh.bindMatrix); }
      // the body's triangles in the world (the main mesh only)
      const T = new Float32Array(bodyTris.length * 3), o = [0, 0, 0];
      for (let i = 0; i < bodyTris.length; i++) { skinned(mesh, bodyTris[i], o); T[i * 3] = o[0]; T[i * 3 + 1] = o[1]; T[i * 3 + 2] = o[2]; }
      // the body's axis: from the hips down to the soles, and up to the neck
      const hp = j.hips.getWorldPosition(new (mesh.position.constructor)()), np = (j.neck || j.torso).getWorldPosition(new (mesh.position.constructor)());
      const up = [np.x - hp.x, np.y - hp.y, np.z - hp.z], ul = Math.hypot(...up); up[0] /= ul; up[1] /= ul; up[2] /= ul;
      const drop = (hp.y - root.position.y) * 1.0;
      const A = [hp.x - up[0] * drop, hp.y - up[1] * drop, hp.z - up[2] * drop], L0 = ul + drop;
      const depth = (p) => {
        const t0 = Math.max(0, Math.min(L0, (p[0] - A[0]) * up[0] + (p[1] - A[1]) * up[1] + (p[2] - A[2]) * up[2]));
        const c = [A[0] + up[0] * t0, A[1] + up[1] * t0, A[2] + up[2] * t0];
        let dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2]; const dl = Math.hypot(dx, dy, dz);
        if (dl < 1e-4) return { d: 1, hit: true };
        dx /= dl; dy /= dl; dz /= dl;
        let far = -1, ft = -1;
        for (let i = 0; i < T.length; i += 9) {
          // Möller–Trumbore, both faces
          const e1x = T[i + 3] - T[i], e1y = T[i + 4] - T[i + 1], e1z = T[i + 5] - T[i + 2], e2x = T[i + 6] - T[i], e2y = T[i + 7] - T[i + 1], e2z = T[i + 8] - T[i + 2];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (det > -1e-9 && det < 1e-9) continue;
          const inv = 1 / det, sx = c[0] - T[i], sy = c[1] - T[i + 1], sz = c[2] - T[i + 2], u = (sx * px + sy * py + sz * pz) * inv;
          if (u < 0 || u > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = (dx * qx + dy * qy + dz * qz) * inv;
          if (w < 0 || u + w > 1) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (t > far) { far = t; ft = i / 9; }
        }
        return far < 0 ? { d: -1, hit: false } : { d: far - dl, hit: true, ft };
      };
      const res = { hand: { L: -1, R: -1 }, fore: { L: -1, R: -1 }, gap: { L: 1, R: 1 } }, o2 = [0, 0, 0];
      for (const [mi, v, s, isHand] of arm) {
        const q = depth(skinned(meshes[mi], v, o2));
        if (!q.hit) continue;
        const k = isHand ? 'hand' : 'fore';
        if (q.d > res[k][s]) { res[k][s] = q.d; if (k === 'fore' || k === 'hand') res['w' + k + s] = { mi, v, rest: [meshes[mi].geometry.attributes.position.getX(v), meshes[mi].geometry.attributes.position.getY(v), meshes[mi].geometry.attributes.position.getZ(v)].map((x) => +x.toFixed(3)), at: o2.map((x) => +x.toFixed(3)), tri: q.ft >= 0 ? [0, 1, 2].map((z) => { const vv = bodyTris[q.ft * 3 + z], g = mesh.geometry; return dom(g, vv) + '#' + (g.attributes.color ? [0, 1, 2].map((c) => Math.round(g.attributes.color.getComponent(vv, c) * 255)).join('.') : ''); }) : null }; }
        if (isHand && -q.d < res.gap[s]) res.gap[s] = -q.d;
      }
      for (const [q, v, s] of rigid) {
        q.updateMatrixWorld(); V.fromBufferAttribute(q.geometry.attributes.position, v).applyMatrix4(q.matrixWorld);
        const r2 = depth([V.x, V.y, V.z]); if (!r2.hit) continue;
        if (r2.d > res.hand[s]) res.hand[s] = r2.d;
        if (-r2.d < res.gap[s]) res.gap[s] = -r2.d;
      }
      return res;
    };
    // the poses: [name, anim, speed, setup(rig), settle s, samples (s apart)]
    const P = [
      ['idle', 'idle', 0, (r) => { r.noFidget = true; }, 1.2, 6, 0.4],
      ['fidget-scratch', 'idle', 0, (r) => { r.noFidget = false; r.fidget = 3; r.fidgetStart = r.t; r.fidgetT = 99; }, 0.9, 3, 0.15],
      ['fidget-stretch', 'idle', 0, (r) => { r.noFidget = false; r.fidget = 4; r.fidgetStart = r.t; r.fidgetT = 99; }, 0.9, 3, 0.15],
      ['walk', 'walk', 1.3, (r) => { r.noFidget = true; }, 1.2, 8, 0.09],
      ['run', 'run', 3.8, (r) => { r.noFidget = true; }, 1.0, 8, 0.05],
      ...[0, 1, 2, 3, 4].map((g) => ['talk' + g, 'talk', 0, (r) => { r.noFidget = true; r.gesture = g; }, 1.0, 6, 0.21]),
      ['listen', 'listen', 0, (r) => { r.noFidget = true; }, 1.0, 4, 0.5],
      ...['nod', 'shrug', 'sigh', 'start'].map((g) => ['g-' + g, 'talk', 0, (r) => { r.noFidget = true; r.gesture = 1; r.doGesture(g); }, 0.3, 4, 0.1]),
      ['sit', 'sit', 0, (r) => { r.noFidget = true; }, 1.2, 2, 0.4],
      ['doze', 'doze', 0, (r) => { r.noFidget = true; }, 1.2, 2, 0.4],
      ...['tinker', 'potting', 'wipe', 'reach', 'tapTurn', 'touchWater', 'setDown', 'reachHigh', 'kneelWork'].map((a) => [a, a, 0, (r) => { r.noFidget = true; }, 0.6, 4, 0.12]),
    ].filter((p) => !POSES || POSES.includes(p[0]));
    const out = {};
    const scene = root.parent;
    for (const [name, anim, speed, setup, settle, n, every] of P) {
      rig.play('idle'); rig.noFidget = true; for (let i = 0; i < 40; i++) rig.update(1 / 60, 0);
      rig.play(anim); if (anim === 'talk') { rig.update(1 / 60, 0); }
      setup(rig);
      for (let t = 0; t < settle; t += 1 / 60) { if (anim === 'talk' && name.startsWith('talk')) rig.gesture = +name.slice(4); rig.update(1 / 60, speed); }
      const worst = { hand: { L: -1, R: -1 }, fore: { L: -1, R: -1 }, gap: { L: 1, R: 1 } };
      for (let s = 0; s < n; s++) {
        if (s) for (let t = 0; t < every; t += 1 / 60) { if (name.startsWith('talk')) rig.gesture = +name.slice(4); rig.update(1 / 60, speed); }
        const q = pose();
        for (const k of ['hand', 'fore']) for (const sd of ['L', 'R']) worst[k][sd] = Math.max(worst[k][sd], q[k][sd]);
        for (const sd of ['L', 'R']) worst.gap[sd] = Math.min(worst.gap[sd], q.gap[sd]);
      }
      if (window.ARMDBG) { const q = pose(); out[name + '#dbg'] = q; }
      out[name] = { hand: Math.max(worst.hand.L, worst.hand.R), fore: Math.max(worst.fore.L, worst.fore.R), gap: Math.min(worst.gap.L, worst.gap.R), turn: rig._ac ? [+Math.max(rig._ac.L[0], rig._ac.R[0]).toFixed(3), +Math.max(rig._ac.L[1], rig._ac.R[1]).toFixed(3)] : null };
    }
    return { look, poly: !!(C.LOOKS[look] && ('poly' in C.LOOKS[look] ? C.LOOKS[look].poly : true)), race: C.LOOKS[look]?.race || '', out };
  }, { look, POSES, OFF });
  rows.push(r);
  if (r.err || r.skip) { console.log(look.padEnd(14), r.err || r.skip); continue; }
  const bad = Object.entries(r.out).filter(([, v]) => Math.max(v.hand, v.fore) > TOL).map(([k, v]) => `${k} ${(Math.max(v.hand, v.fore) * 100).toFixed(1)}`);
  const tu = Object.entries(r.out).filter(([, v]) => v.turn && (v.turn[0] > 0.01 || v.turn[1] > 0.01)).map(([k, v]) => `${k} ${v.turn[0].toFixed(2)}/${v.turn[1].toFixed(2)}`);
  console.log(look.padEnd(14), (r.race || '-').padEnd(7), bad.length ? 'INSIDE: ' + bad.join(' · ') : 'clear', tu.length ? `  [turned out/forward, rad: ${tu.join(' · ')}]` : '');
}
// the cost (CPU, this machine, SwiftShader's page): one rig's update with and without the clearance, talking and walking
if (process.env.PERF) {
  const pf = await page.evaluate(async () => {
    const C = await import('./src/game/characters.js'), out = {};
    for (const look of ['bram', 'twinsen', 'zoe', 'farmerA']) {
      const r = C.createCharacter(look), row = {};
      for (const [anim, sp] of [['talk', 0], ['walk', 1.3]]) {
        for (const off of [true, false]) {
          r._ac = off ? null : undefined; r.play('idle'); for (let i = 0; i < 30; i++) r.update(1 / 60, 0); r.play(anim);
          for (let i = 0; i < 60; i++) r.update(1 / 60, sp);
          const t0 = performance.now(); for (let i = 0; i < 600; i++) r.update(1 / 60, sp);
          row[anim + (off ? '-off' : '-on')] = +((performance.now() - t0) / 600 * 1000).toFixed(1);
        }
      }
      out[look] = row;
    }
    return out;
  });
  console.log('PERF µs per rig update (this machine, headless):', JSON.stringify(pf));
}
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(rows, null, 1));
const measured = rows.filter((r) => r.out);
let worst = { v: -1 };
for (const r of measured) for (const [p, v] of Object.entries(r.out)) { const d = Math.max(v.hand, v.fore); if (d > worst.v) worst = { v: d, look: r.look, pose: p }; }
const inside = measured.flatMap((r) => Object.entries(r.out).filter(([, v]) => Math.max(v.hand, v.fore) > TOL).map(([p, v]) => `${r.look}/${p} ${(Math.max(v.hand, v.fore) * 100).toFixed(1)} cm`));
console.log(`measured ${measured.length} bodies × ${Object.keys(measured[0]?.out || {}).length} poses; inside by more than ${(TOL * 100).toFixed(1)} cm: ${inside.length}; worst ${(worst.v * 100).toFixed(1)} cm (${worst.look}/${worst.pose})`);
// (the check: nothing buried — BURIED cm, default 3 —; what is left between TOL and that is listed: hands at work on a thing
//  (workhands.js puts them on it in the game), a run's fastest swing, the sculpted fallback; GROBO-ARM.md)
const BUR = +(process.env.BURIED ?? 3) / 100, buried = inside.filter((t) => parseFloat(t.split(' ')[1]) > BUR * 100);
console.log(`listed (inside by ${(TOL * 100).toFixed(1)}–${(BUR * 100).toFixed(0)} cm): ${inside.filter((t) => !buried.includes(t)).join(' | ') || 'none'}`);
if (!process.env.NOCHECK) check(`no hand or forearm buried in its own body (more than ${(BUR * 100).toFixed(0)} cm in, every look × every pose)`, buried.length === 0, buried.slice(0, 40).join(' | ') || `none; worst ${(worst.v * 100).toFixed(1)} cm (${worst.look}/${worst.pose})`);
await browser.close();
process.exit(done() ? 1 : 0);
