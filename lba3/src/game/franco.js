// #17 (the user's pick, 26.11: "Knartas first"; docs/lba-maturity/KNARTAS-17.md): Knartas in its own look, behind the
// URL switch ?knartas=new (default off: without it the island is exactly as before). Read once, at load.
//   francoHut(P, o)     a Franco house: a round, squat, brown hut under a thick-lipped dome, round porthole windows, a
//                       low arched door recessed in a deep portal under the roof's lip, a chimney pot. On the Esmer house's
//                       footprint (its plan a circle, or a stadium on a long footprint) with the same door
//                       (zislands.js asks esmerBuilding where the door is, without drawing it, and builds this instead)
//   zeppelinMast(P, o)  the island's landmark: a timber mooring mast at the quay's end and a moored zeppelin (a grey
//                       hull with red fins, a gondola, two engines) nosed into its cup, floating over the clouds
// Everything is ours, in the game's own low-poly kit; nothing from LBA2 but the idea (round brown huts with portholes,
// a moored zeppelin: docs/lba-maturity/resemblance-zeelich.md §C). Static scenery: no light, no per-frame work, no new
// texture. The materials are the island's own (stone, planks, brass, the vertex-colour one) and two vertex-coloured
// plaster ones for the huts' walls and domes: each hut's colour is in its vertices, so all the huts are two draws.
import * as THREE from 'three';
import { tm, cached, bbox, cyl, lathe, panelGeo, frameGeo, fillGeo, rod, member } from './kit.js';

const q = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('knartas') || ''; } catch { return ''; } })();
// (#17, the user's pick 26.11: the Franco huts and the moored zeppelin are Knartas's look; ?knartas=old shows the old houses)
export const KNARTAS_NEW = q !== 'old';
// (#17b, docs/lba-maturity/KNARTAS-PALETTE.md, the user's pick 26.11: Knartas's ground in LBA2's palette, pale grey rock and
//  orange-brown earth; zislands.js KNA_PAL. ?knartaspal=old shows the old ground)
export const KNARTAS_PAL = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('knartaspal') !== 'old'; } catch { return true; } })();

// the huts' two materials (plaster with the colour in the vertices)
// (one material for both: the walls and the domes are one draw; the domes are darker by their vertices)
export const hutWallM = () => tm('plasterWall', { vc: true, rough: 0.93 });
export const hutDomeM = hutWallM;
// the island's browns: walls of rammed earth and plaster, darker domes (one hut, the dig foreman's, has the gold dome
// the Francos' rhyme names: story/francos.js)
export const HUT_WALLS = ['#c9a074', '#bf946a', '#d1aa7e', '#b88c64'];
export const HUT_DOMES = ['#7e4e30', '#71452b', '#8a5836', '#784c32'];

const C = new THREE.Color(), C2 = new THREE.Color();
// a lathe whose plan is a stadium of half sizes hx, hz (a circle when they are equal): each profile point [s, y, shade]
// is a ring of that plan scaled by s at height y, its colour `col` times shade. Smooth normals, u along the ring, v up
// the profile (tile metres a texture repeat).
export function ovalLathe(prof, hx, hz, col, k = 9, tile = 2.2) {
  const key = 'oval' + JSON.stringify(prof) + hx.toFixed(2) + hz.toFixed(2) + col + k + tile;
  return cached(key, () => {
    const along = hx >= hz, R = Math.min(hx, hz), Ls = Math.abs(hx - hz), ring = [];
    for (let half = 0; half < 2; half++) for (let i = 0; i <= k; i++) {
      const th = (along ? -Math.PI / 2 : 0) + half * Math.PI + (i / k) * Math.PI;
      const cx = along ? (half ? -Ls : Ls) : 0, cz = along ? 0 : (half ? -Ls : Ls);
      ring.push([cx + R * Math.cos(th), cz + R * Math.sin(th)]);
    }
    const N = ring.length, arc = [0];
    for (let j = 1; j <= N; j++) { const a = ring[j - 1], b = ring[j % N]; arc.push(arc[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const vs = [0]; for (let p = 1; p < prof.length; p++) vs.push(vs[p - 1] + Math.hypot((prof[p][0] - prof[p - 1][0]) * R, prof[p][1] - prof[p - 1][1]));
    const nv = prof.length * (N + 1), pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), cl = new Float32Array(nv * 3);
    C.set(col);
    for (let p = 0; p < prof.length; p++) {
      const [s, y, sh = 1] = prof[p];
      C2.copy(C).multiplyScalar(sh);
      for (let j = 0; j <= N; j++) {
        const v = p * (N + 1) + j, [x, z] = ring[j % N];
        pos[v * 3] = x * s; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z * s;
        uv[v * 2] = (arc[j] * Math.max(0.15, s)) / tile; uv[v * 2 + 1] = vs[p] / tile;
        cl[v * 3] = C2.r; cl[v * 3 + 1] = C2.g; cl[v * 3 + 2] = C2.b;
      }
    }
    const idx = [];
    for (let p = 0; p < prof.length - 1; p++) for (let j = 0; j < N; j++) {
      const a = p * (N + 1) + j, b = a + 1, c = a + N + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // outward faces: the first wall quad's normal against the way out from the middle
    const nrm = g.attributes.normal, mid = Math.floor(N / 4), pm = Math.min(1, prof.length - 2), vi = pm * (N + 1) + mid;
    if (nrm.getX(vi) * pos[vi * 3] + nrm.getZ(vi) * pos[vi * 3 + 2] < 0 && prof[pm][0] > 0) {
      for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      g.setIndex(idx); g.computeVertexNormals();
    }
    // the seam: its two columns share one normal
    const n = g.attributes.normal;
    for (let p = 0; p < prof.length; p++) {
      const a = p * (N + 1), b = a + N;
      const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
      n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
    }
    g.userData.ring = ring; g.userData.along = along;
    return g;
  });
}
// a point on the stadium of half sizes hx, hz at arc length t from the front's middle (local +z), going toward +x;
// its outward normal
function stadiumAt(hx, hz, t) {
  const along = hx >= hz, R = Math.min(hx, hz), Ls = Math.abs(hx - hz), per = 2 * Math.PI * R + 4 * Ls;
  t = ((t % per) + per) % per;
  const line = (len, x, z, dx, dz, nx, nz) => ({ len, at: (u) => ({ x: x + dx * u, z: z + dz * u, nx, nz }) });
  const arc = (len, cx, cz, a0) => ({ len, at: (u) => { const a = a0 - u / R; return { x: cx + Math.cos(a) * R, z: cz + Math.sin(a) * R, nx: Math.cos(a), nz: Math.sin(a) }; } });
  const segs = along
    ? [line(Ls, 0, R, 1, 0, 0, 1), arc(Math.PI * R, Ls, 0, Math.PI / 2), line(2 * Ls, Ls, -R, -1, 0, 0, -1), arc(Math.PI * R, -Ls, 0, -Math.PI / 2), line(Ls, -Ls, R, 1, 0, 0, 1)]
    : [arc(Math.PI * R / 2, 0, Ls, Math.PI / 2), line(2 * Ls, R, Ls, 0, -1, 1, 0), arc(Math.PI * R, 0, -Ls, 0), line(2 * Ls, -R, -Ls, 0, 1, -1, 0), arc(Math.PI * R / 2, 0, Ls, Math.PI)];
  for (const sg of segs) { if (t <= sg.len + 1e-9) return sg.at(t); t -= sg.len; }
  return segs[0].at(0);
}

// ---------------------------------------------------------------- the Franco hut
// P: an EP.Place at the footprint's middle on the ground, its local +z the door's side. o: { w, d, h (the footprint and
// the house's height, as esmerBuilding's), base (the sill: the plinth's top), bury, door: { x, z } | null (esmerBuilding's),
// wall, dome (colours), gold (the dome brass), blind: sides with no window, mats: { stone, wood, brass, vc } }
// Returns { cols: [{ type, lx, lz, ... }] (in the hut's own frame), portal } — the caller turns them into colliders.
export function francoHut(P, o) {
  const { w, d, h, base, door, mats } = o, bury = o.bury ?? 0.6;
  const ci = 0.16, hx = w / 2 - ci, hz = d / 2 - ci, R = Math.min(hx, hz);
  const wallM = hutWallM(), domeM = hutDomeM();
  const M = (lx, ly, lz, lry = 0, rx = 0, sx = 1, sy = sx, sz = sx) => { const [x, z] = P.pt(lx, lz); return new THREE.Matrix4().compose(new THREE.Vector3(x, P.y + ly, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, P.ry + lry, 0, 'YXZ')), new THREE.Vector3(sx, sy, sz)); };
  const add = (geo, mat, m) => P.B.addM(geo, mat, m);
  const low = h < 3.2;
  // the door: low and round-arched (a Franco's door), set in a deep portal that stands just under the roof's lip, so
  // the lip is its hood; the eaves at the portal's top
  const dw = door ? Math.min(1.1, Math.max(0.85, R - 0.4)) : 0, dh = 1.8, ph = dh + 0.24;
  const Hw = low ? Math.max(1.0, h * 0.55) : Math.max(2.35, door ? base + ph + 0.04 : h * 0.52), top = h - (low ? 0.12 : 0.34);
  // the plinth (stone, from under the ground to the sill), the drum (a little bulge, darker at its foot: splashed
  // earth), the roof (a thick lip over the eaves, its underside in shade, the dome lighter where the sun bleaches it)
  add(ovalLathe([[1.035, -bury, 0.9], [1.035, base - 0.05, 1], [1.0, base + 0.02, 1]], hx, hz, '#ffffff', 9, 1.8), mats.stone, M(0, 0, 0));
  add(ovalLathe([[1.0, base - 0.02, 0.72], [1.008, base + 0.35, 0.88], [1.014, base + (Hw - base) * 0.5, 1.0], [0.992, Hw, 0.96]], hx, hz, o.wall, 9), wallM, M(0, 0, 0));
  const span = top - (Hw + 0.24), dome = [[0.98, Hw - 0.05, 0.55], [1.05, Hw + 0.02, 0.62], [1.062, Hw + 0.14, 0.9], [1.035, Hw + 0.24, 1.0]];
  for (let i = 1; i <= 7; i++) { const t = (i / 7) * Math.PI / 2; dome.push([+(1.035 * Math.pow(Math.cos(t), 0.7)).toFixed(4), +(Hw + 0.24 + span * Math.sin(t)).toFixed(3), +(1.0 + 0.12 * (i / 7)).toFixed(3)]); }
  add(ovalLathe(dome, hx, hz, o.gold ? '#ffffff' : o.dome, 9), o.gold ? mats.brass : domeM, M(0, 0, 0));
  // the chimney pot on the crown, with a brass cap
  if (!low) {
    add(cached('fhut-pot', () => tintGeo(lathe([[0.2, 0], [0.22, 0.32], [0.27, 0.4], [0.26, 0.46], [0.17, 0.48], [0.0001, 0.3]], 8), '#8a5a3c')), mats.vc, M(0, top - 0.08, 0));
    add(cached('fhut-potcap', () => lathe([[0.0001, 0.08], [0.28, 0.03], [0.3, 0.06], [0.0001, 0.18]], 8)), mats.brass, M(0, top + 0.34, 0));
  }
  // round porthole windows round the drum: a brass ring and dark glass (none on a side banked into the rise, none by
  // the door)
  const ring = cached('fhut-porth', () => new THREE.TorusGeometry(0.26, 0.055, 5, 12));
  const glass = cached('fhut-glass', () => { const g = new THREE.CircleGeometry(0.235, 12); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = Math.hypot(g.attributes.position.getX(i), g.attributes.position.getY(i)); const v = r < 0.01 ? 0.32 : 0.16; c[i * 3] = v * 0.7; c[i * 3 + 1] = v * 0.85; c[i * 3 + 2] = v; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; });
  const py = base + (Hw - base) * 0.52, per = 2 * Math.PI * R + 4 * Math.abs(hx - hz);
  const ports = [];
  if (Hw - base > 1.4) {
    const n = Math.max(3, Math.floor(per / 2.5));
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * per, p = stadiumAt(hx, hz, t);
      const side = Math.abs(p.nz) >= Math.abs(p.nx) ? (p.nz > 0 ? 'front' : 'back') : p.nx > 0 ? 'right' : 'left';
      if (o.blind?.includes(side)) continue;
      if (door && Math.min(t, per - t) < 1.35) continue;
      ports.push(p);
      const s = 1.016, x = p.x * s + p.nx * 0.03, z = p.z * s + p.nz * 0.03, a = Math.atan2(p.nx, p.nz);
      add(ring, mats.brass, M(x, py, z, a));
      add(glass, mats.vc, M(p.x * s - p.nx * 0.005, py, p.z * s - p.nz * 0.005, a));
    }
  }
  // the door, recessed in its portal of the hut's plaster: a stone frame at the portal's face, the leaf deep inside, a
  // stone sill under it (the portal's face on the door's plane plus a hand: the collider there is where the house's was)
  const cols = [];
  let portal = null;
  if (door) {
    const pw = dw + 0.84, front = hz + 0.12, half = pw / 2;
    // how far in the drum's wall is behind the portal's edges (a round front curves away from it)
    const back = (() => { let zb = hz; for (const u of [-half, half]) { const Ls = Math.abs(hx - hz), ux = hx >= hz ? Math.max(0, Math.abs(u) - Ls) : Math.abs(u); zb = Math.min(zb, (hx >= hz ? 0 : Ls) + Math.sqrt(Math.max(0, R * R - ux * ux))); } return zb - 0.12; })();
    const t = +(front - back).toFixed(2), op = { x: 0, y: 0, w: +dw.toFixed(2), h: dh, arch: true };
    add(cached('fhut-portal' + pw.toFixed(2) + ph.toFixed(2) + t + o.wall, () => tintGeo(panelGeo(+pw.toFixed(2), +ph.toFixed(2), t, [op]), o.wall, 0.97)), wallM, M(door.x, base, back));
    // (the sill's top 1 cm over the portal's floor: level with it, the plaster of the opening's floor (the panel's hole
    //  reaches its foot) and the stone z-fought in the doorway of every hut: tests/worldfit.mjs (3))
    add(bbox(+(pw + 0.1).toFixed(2), +(base + bury + 0.01).toFixed(2), +(t + 0.08).toFixed(2), 0.03, 1.8), mats.stone, M(door.x, (base + 0.01 - bury) / 2, back + t / 2));
    add(frameGeo(op, 0.13, 0.08), mats.stone, M(door.x, base, front - 0.06));
    add(fillGeo(op, 0.03, 0.05), mats.wood, M(door.x, base, back + 0.16));
    add(cached('fhut-dring', () => new THREE.TorusGeometry(0.07, 0.016, 5, 10)), mats.brass, M(door.x + dw * 0.26, base + 0.95, back + 0.23));
    portal = { x: door.x, w: pw, front, back, h: base + ph, dw, dh };
    cols.push({ type: 'box', lx: door.x, lz: (back + front) / 2 - 0.02, hw: half, hd: (front - back) / 2 + 0.02 });
  }
  // the hut's own body for the colliders: a circle, or a stadium (a box and two circles)
  const Ls = Math.abs(hx - hz), along = hx >= hz, rr = R * 1.03;
  if (Ls < 0.05) cols.push({ type: 'cyl', lx: 0, lz: 0, r: rr });
  else {
    cols.push({ type: 'box', lx: 0, lz: 0, hw: along ? Ls : rr, hd: along ? rr : Ls });
    for (const s of [-1, 1]) cols.push({ type: 'cyl', lx: along ? s * Ls : 0, lz: along ? 0 : s * Ls, r: rr });
  }
  return { cols, portal, ports: ports.length, Hw, top };
}
function tintGeo(g, col, sh = 1) {
  const c = new THREE.Color(col).multiplyScalar(sh), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// ---------------------------------------------------------------- the mooring mast and the zeppelin
// P at the mast's foot on the ground; its local +z points out over the clouds, where the hull lies. o: { h (the mast's
// height), len (the hull's), r (its radius), mats: { stone, wood, brass, vc } }. Returns the mast's collider (local).
export function zeppelinMast(P, o) {
  // (low, moored alongside the quay as a ship is: the play camera looks down at the island, and anything higher than
  //  it is never in its frame — a hull up a tall mast was seen only from overhead)
  const { mats } = o, H = o.h ?? 4.6, L = o.len ?? 16, Rh = o.r ?? 2.4;
  const M = (lx, ly, lz, lry = 0, rx = 0, sx = 1, sy = sx, sz = sx) => { const [x, z] = P.pt(lx, lz); return new THREE.Matrix4().compose(new THREE.Vector3(x, P.y + ly, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, P.ry + lry, 0, 'YXZ')), new THREE.Vector3(sx, sy, sz)); };
  const add = (geo, mat, m) => P.B.addM(geo, mat, m);
  const W = (lx, ly, lz) => { const [x, z] = P.pt(lx, lz); return [x, P.y + ly, z]; };
  // the footing and the mast: four timber legs leaning in, rings of braces, a platform with a rail, the mooring cup
  add(bbox(2.6, 0.9, 2.6, 0.05, 1.8), mats.stone, M(0, -0.1, 0));
  const R0 = 1.0, R1 = 0.34, leg = (k, f) => { const a = Math.PI / 4 + (k / 4) * Math.PI * 2, r = R0 + (R1 - R0) * f; return [Math.sin(a) * r, 0.35 + f * (H - 0.35), Math.cos(a) * r]; };
  for (let k = 0; k < 4; k++) { const a = leg(k, 0), b = leg(k, 1); rod(P.B, W(a[0], a[1], a[2]), W(b[0], b[1], b[2]), 0.11, mats.wood, 6); }
  const rings = H > 8 ? 5 : 3;
  for (let i = 1; i <= rings; i++) for (let k = 0; k < 4; k++) {
    const f = i / (rings + 0.6), a = leg(k, f), b = leg((k + 1) % 4, f);
    member(P.B, W(a[0], a[1], a[2]), W(b[0], b[1], b[2]), 0.09, mats.wood);
    if (i < rings) { const c = leg((k + 1) % 4, (i + 1) / (rings + 0.6)); member(P.B, W(a[0], a[1], a[2]), W(c[0], c[1], c[2]), 0.06, mats.wood); }
  }
  add(cached('zep-deck', () => cyl(0.95, 0.95, 0.16, 10, 1.8)), mats.wood, M(0, H - 0.6, 0));
  add(cached('zep-rail', () => new THREE.TorusGeometry(0.92, 0.035, 4, 16).rotateX(Math.PI / 2)), mats.brass, M(0, H + 0.25, 0));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(cached('zep-railpost', () => cyl(0.03, 0.03, 0.8, 5)), mats.brass, M(Math.sin(a) * 0.92, H - 0.15, Math.cos(a) * 0.92)); }
  add(cached('zep-post', () => cyl(0.16, 0.22, 1.2, 8)), mats.brass, M(0, H, 0));
  add(cached('zep-cup', () => lathe([[0.0001, 0], [0.18, 0.02], [0.42, 0.3], [0.46, 0.38], [0.36, 0.34], [0.0001, 0.2]], 10)), mats.brass, M(0, H + 0.95, 0.1, 0, Math.PI / 2));
  // the hull: a long round body along +z, its nose in the cup; grey doped canvas, brass bands, red fins
  const hy = H + 0.95, z0 = 0.5;
  const prof = [[0.0001, 0], [0.42, 0.025], [0.72, 0.08], [0.9, 0.17], [0.985, 0.3], [1.0, 0.45], [0.97, 0.6], [0.88, 0.74], [0.7, 0.86], [0.44, 0.95], [0.16, 0.995], [0.0001, 1]];
  const hull = cached('zep-hull' + L + Rh, () => tintGeo(lathe(prof.map(([r, t]) => [r * Rh, t * L]), 16), '#c9c5bd'));
  add(hull, mats.vc, M(0, hy, z0, 0, Math.PI / 2));
  // (the nose cap and the panels' seams: darker bands)
  for (const [t, sh] of [[0.12, 0.85], [0.3, 0.98], [0.62, 0.98], [0.8, 0.85]]) {
    const r = Rh * prof.reduce((acc, [pr, pt], i) => (i && t >= prof[i - 1][1] && t <= pt ? prof[i - 1][0] + (pr - prof[i - 1][0]) * (t - prof[i - 1][1]) / (pt - prof[i - 1][1]) : acc), 1);
    add(cached('zep-band' + r.toFixed(2) + sh, () => new THREE.TorusGeometry(r + 0.01, 0.06, 4, 20)), mats.brass, M(0, hy, z0 + t * L));
  }
  // four tail fins, red, in a cross
  const fin = cached('zep-fin' + Rh, () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(2.6, 0); s.lineTo(1.9, 2.4); s.lineTo(0.5, 2.4); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }).translate(0, 0, -0.05); return tintGeo(g.rotateY(-Math.PI / 2), '#b23a2e'); });
  for (let k = 0; k < 4; k++) add(fin, mats.vc, M(0, hy, z0 + L * 0.8, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(k * Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, Rh * 0.4, 0)));
  // the gondola under the hull's middle: a timber cabin with dark windows, a rounded nose, two struts
  const gz = z0 + L * 0.42, gy = hy - Rh - 1.0;
  add(bbox(1.5, 1.15, 4.4, 0.25, 2.2), mats.wood, M(0, gy, gz));
  for (const s of [-1, 1]) add(cached('zep-gwin', () => tintGeo(bbox(0.04, 0.38, 3.3, 0.01, 1), '#2a3038')), mats.vc, M(s * 0.76, gy + 0.18, gz));
  add(cached('zep-groof', () => tintGeo(bbox(1.62, 0.12, 4.6, 0.04, 1), '#8a3a30')), mats.vc, M(0, gy + 0.62, gz));
  for (const dz of [-1.4, 1.4]) rod(P.B, W(0, gy + 0.6, gz + dz), W(0, hy - Rh * 0.92, gz + dz * 1.1), 0.05, mats.brass, 5);
  // two engines on outriggers, each a nacelle and a two-bladed propeller (still: moored)
  for (const s of [-1, 1]) {
    const ex = s * 1.9, ez = gz + 1.2;
    rod(P.B, W(s * 0.7, gy + 0.2, ez), W(ex, gy + 0.3, ez), 0.05, mats.brass, 5);
    add(cached('zep-nac', () => tintGeo(lathe([[0.0001, 0], [0.22, 0.12], [0.3, 0.45], [0.26, 0.95], [0.12, 1.15], [0.0001, 1.2]], 10), '#6a6a6e')), mats.vc, M(ex, gy + 0.3, ez - 0.6, 0, Math.PI / 2));
    add(cached('zep-prop', () => tintGeo(bbox(0.12, 1.5, 0.05, 0.02, 1), '#4a3a30')), mats.vc, M(ex, gy + 0.3, ez - 0.66, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(s * 0.5)));
  }
  // the mast's collider, and the hull's and the gondola's in the air (the camera reads them as scenery and rises over
  // them: roomocc.js occAuto; the hull's from its nose, over the quay too, but its underside 3 m over Twinsen's head, so
  // he walks under the nose; the gondola's past the quay's edge, over the clouds, never reached on foot)
  return { cols: [{ type: 'cyl', lx: 0, lz: 0, r: 1.25, top: H + 1.0 },
    { type: 'box', lx: 0, lz: z0 + L / 2, hw: Rh * 0.95, hd: L / 2, top: hy + Rh, bottom: hy - Rh },
    { type: 'box', lx: 0, lz: gz, hw: 2.3, hd: 2.5, top: hy - Rh + 0.2, bottom: gy - 0.8 }], nose: W(0, hy, z0), gondola: W(0, gy - 0.5, gz - 2.2), hy };
}
