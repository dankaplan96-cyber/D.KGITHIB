// P135/P136 PATH-ENDS, the in-page half (tests/path-ends.mjs adds it with addScriptTag): window.PE.
// PE.grids(): every terrain the game has built (Citadel's own and each outdoor area's patch), its paving per grid point
// as a signed value f (< 0 paved): the terrain's own edge distance where it has one (LAWN-EDGES: the shader cuts the
// paving there, per pixel, at 0), else the paving's share of the splat less a half (the shader's crisp re-split at
// 0.5). PE.meshes(): the up-facing triangles of paving built as meshes (the town cobbles' texture, Zeelich's flags).
// PE.judge(tips) / PE.gaps(rays): what stands at each paved strip's end, or in a gap between two pavings.
(() => {
  const G = () => window.game;
  const RANGE = 4;   // (terrain.js EDGE_RANGE)
  // (P140: the line the shader draws. Citadel's streets: the edge attribute (LAWN-EDGES). Elsewhere: with ROCK-EDGES on
  //  (?rockedge=new, the user's decided default, 26.11) the traced paving and rock lines (the `rockedge` attribute), else
  //  the interpolated share, as before. And d, the bare earth (> 0 on it): the lawn's traced soil side (LAWN-EDGES-2, the
  //  `lawn` attribute; without it the soil's share of grass + soil), and LAWN-EDGES' earth band along the paving; not
  //  where rock or sand (the desert's sand, the Hamalayi's snow) takes the ground)
  function grid(t, ox, oz, name) {
    const geo = t.mesh?.userData?.full || t.mesh?.geometry;
    const s2 = geo?.attributes?.splat2?.array, sp = geo?.attributes?.splat?.array, ed = geo?.attributes?.edge?.array;
    const re = geo?.attributes?.rockedge?.array, lw = geo?.attributes?.lawn?.array, Q = 32767;
    if (!s2) return null;
    const n = t.segs + 1, f = new Float32Array(n * n), d = new Float32Array(n * n), pk = new Uint8Array(n * n);
    let paved = 0, patch = 0, under = 0;
    // (P136: on a Zeelich isle the ground under a deck island's decks is never seen: left out. P140: WA-11's bare patches
    //  are judged now (the user's answer to P136: each patch ends at a clean edge or joins a path); counted apart too)
    const kind = t.paveKind, lx0 = t.x0, lz0 = t.z0;
    for (let k = 0; k < n * n; k++) {
      const tot = sp[k * 4] + sp[k * 4 + 1] + sp[k * 4 + 2] + sp[k * 4 + 3] + s2[k];
      const share = tot > 1e-6 ? s2[k] / tot : 0;
      const e = ed ? (ed[k * 2] / Q) * RANGE : RANGE;
      const rock = tot > 1e-6 ? sp[k * 4 + 2] / tot : 0;   // (the shader: rock over ~0.45 of the splat takes the pixel)
      const isRock = re ? re[k * 4] < 0 && re[k * 4 + 1] / Q > 0.45 : rock > 0.45;
      // (traced: paved where the rock's line leaves it and the paving's line takes it — the larger of the two signed
      //  distances, so the zero between two grid points falls where the shader draws it. Where the paving fills all
      //  that is not rock (Otringal's granite turf), the rock's line is the paving's edge: a grid point's class alone
      //  (+1 rock, −4 deep paving) drew it as the grid's staircase)
      const rD = re && re[k * 4 + 1] / Q > 0.45 ? -(re[k * 4] / Q) * RANGE : -RANGE;   // (no rock near: no limit)
      f[k] = e < RANGE - 0.05 ? e : re ? Math.max(rD, re[k * 4 + 3] / Q > 0.5 ? (re[k * 4 + 2] / Q) * RANGE : Math.max(0.05, (0.5 - share) * 2)) : isRock ? 1 : (0.5 - share) * 2;
      const kd = kind ? kind(lx0 + (k % n) * t.step, lz0 + Math.floor(k / n) * t.step) : null;
      if (f[k] < 0 && kd === 'under') { f[k] = 1; under++; }
      if (kd === 'patch') { pk[k] = 1; if (f[k] < 0) patch++; }
      if (f[k] < 0) paved++;
      // the bare earth
      const g = sp[k * 4], sand = sp[k * 4 + 1], soil = sp[k * 4 + 3];
      let dv = -1;
      if ((re || !isRock) && g + soil > sand) {
        if (lw) dv = lw[k * 2 + 1] / Q > 0.5 ? -(lw[k * 2] / Q) * RANGE : -1;
        else dv = g + soil > 0.01 ? (soil / (g + soil) - 0.5) * 2 : -1;
        const bw = ed ? (ed[k * 2 + 1] / Q) * RANGE : 0;
        if (bw > 0.05 && e > -0.5) dv = Math.max(dv, bw - e);   // (the earth band: from the paving's edge to its width)
        if (re) dv = Math.min(dv, re[k * 4 + 1] / Q < 0.45 ? RANGE : (re[k * 4] / Q) * RANGE);   // (not where the rock's line takes the ground)
      }
      d[k] = dv;
    }
    const r3 = (v) => Math.round(v * 1000) / 1000;
    return { name, x0: t.x0 + ox, z0: t.z0 + oz, step: t.step, n, f: Array.from(f, r3), d: Array.from(d, r3), pk: kind ? Array.from(pk) : null, paved, patch, under, mode: ed && !re ? 'edge+share' : re ? 'traced' : 'share' };
  }
  // the outdoor area an x, z belongs to (nearest outdoor room's centre within 400 m; else Citadel near the origin)
  function areaOf(x, z) {
    const R = G().regions; let best = null, bd = 1e9;
    for (const id of Object.keys(R.rooms_)) { const r = R.rooms_[id]; if (!r?.outdoor) continue; const c = R.centreOf(id); const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = id; } }
    if (Math.abs(x + 60) < 160 && Math.abs(z) < 160) return 'citadel';
    return bd < 400 ? best : null;
  }
  function grids() {
    const T = G().physics.terrain, out = [];
    const main = grid(T, 0, 0, 'citadel'); if (main) out.push(main);
    for (const p of T.patches || []) { const g = grid(p.t, p.cx, p.cz, areaOf(p.cx, p.cz) || 'patch@' + Math.round(p.cx) + ',' + Math.round(p.cz)); if (g) out.push(g); }
    return out;
  }
  // paving built as meshes: the town cobbles' texture (engine textures().cobble) or a painted one named as paving
  // ('zpave': Zeelich's flags, 'zkerb': their pale borders); up-facing triangles in the world, by area (interiors left out: no outdoor area there)
  async function meshes() {
    const { textures } = await import(new URL('src/engine/textures.js', location.href).href);
    const TX = textures(), isPave = (m) => !!m?.map && (m.map === TX.cobble || m.map.name === 'zpave' || m.map.name === 'zkerb');
    const out = {}, v = [0, 0, 0].map(() => new (G().camera.position.constructor)());
    G().scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (!mats.some(isPave)) return;
      const geo = o.geometry, P = geo.attributes.position, I = geo.index, groups = geo.groups?.length ? geo.groups : [{ start: 0, count: I ? I.count : P.count, materialIndex: 0 }];
      o.updateWorldMatrix(true, false);
      for (const g of groups) {
        if (!isPave(mats[g.materialIndex ?? 0] ?? mats[0])) continue;
        for (let k = g.start; k < g.start + g.count; k += 3) {
          for (let q = 0; q < 3; q++) v[q].fromBufferAttribute(P, I ? I.getX(k + q) : k + q).applyMatrix4(o.matrixWorld);
          const ax = v[1].x - v[0].x, ay = v[1].y - v[0].y, az = v[1].z - v[0].z, bx = v[2].x - v[0].x, by = v[2].y - v[0].y, bz = v[2].z - v[0].z;
          const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.hypot(nx, ny, nz);
          if (nl < 1e-9 || Math.abs(ny / nl) < 0.9) continue;
          const area = areaOf((v[0].x + v[1].x + v[2].x) / 3, (v[0].z + v[1].z + v[2].z) / 3);
          if (!area) continue;
          (out[area] ||= []).push([v[0].x, v[0].z, v[1].x, v[1].z, v[2].x, v[2].z, (v[0].y + v[1].y + v[2].y) / 3].map((a) => Math.round(a * 100) / 100));
        }
      }
    });
    return out;
  }
  // P136 (the user, 26.11: "the paths are still not fixed"): from the player's view. A destination is a door's trigger, a
  // WALL (a building, a wall, a parapet, a fence, a stair's side: a box collider ≥ 1.5 m long, standing ≥ 0.5 m, not a
  // `block` prop; or a round solid ≥ 2.4 m across: a tower, a silo), the ground's face (a jump ≥ 0.3 m between two
  // samples 0.25 m apart: a quay's face, a stair, a bridge's deck, a cliff), the sea. Everything else standing there is a
  // PROP and never makes an end acceptable: a bin, a lamp, a post, a sign, a tree, a bush (round solids up to 1.5 m), a
  // bench, a tub, a planter (`block` props), a crate.
  // (the ground he would stand on there, at the paving's own level y: a mesh floor's top, else the terrain)
  const groundY = (P, x, z, y) => (Number.isFinite(y) ? P.groundAt(x, z, y + 0.3) : P.terrain.heightAt(x, z));
  // a floor standing over the ground here (a bridge's or a pier's deck, a house's terrace, a stair's tread)
  const deck = (P, x, z) => { const th = P.terrain.heightAt(x, z), fy = P.groundAt(x, z, th + 0.7); return fy - th > 0.025 && fy - th < 0.7; };   // (the spaceport footbridge's deck lands 3 cm over the ground)
  const isWall = (c, gy) => !c.block && (c.type === 'box' ? 2 * Math.max(c.hw, c.hd) >= 1.5 && c.top - gy >= 0.5 : (c.r ?? 0) >= 1.2);
  function solidsAt(P, x, z, gy, seen, a, hits) {
    for (const c of P.near(x, z)) {
      if (seen.has(c) || c.enabled === false) continue;
      if (c.top < gy + 0.3 || c.bottom > gy + 1.8) continue;
      let inside;
      if (c.type === 'box') { const lx = x - c.x, lz = z - c.z, u = lx * c.cos - lz * c.sin, v = lx * c.sin + lz * c.cos; inside = Math.abs(u) < c.hw + 0.15 && Math.abs(v) < c.hd + 0.15; }
      else inside = Math.hypot(x - c.x, z - c.z) < (c.r ?? 0) + 0.15;
      if (!inside) continue;
      seen.add(c);
      const size = c.type === 'box' ? 2 * Math.max(c.hw, c.hd) : 2 * (c.r ?? 0);
      hits.push({ kind: isWall(c, gy) ? 'solid' : 'prop', a: +a.toFixed(2), size: +size.toFixed(2), top: +(c.top - gy).toFixed(2), x: +c.x.toFixed(1), z: +c.z.toFixed(1) });
    }
  }
  function judge(tips, ahead = 1.25) {
    const g = G(), P = g.physics, doors = (g.story?.doors?.() || []).filter((d) => Number.isFinite(d.x));
    return tips.map((t) => {
      const hits = [], nx = -t.dz, nz = t.dx, hw = Math.max(0.6, t.w / 2), seen = new Set();
      for (let o = -hw; o <= hw + 1e-6; o += Math.max(0.25, hw / 4)) {
        let prev = groundY(P, t.x - t.dx * 0.25 + nx * o, t.z - t.dz * 0.25 + nz * o, t.y);
        for (let a = 0; a <= ahead + 1e-6; a += 0.25) {
          const x = t.x + t.dx * a + nx * o, z = t.z + t.dz * a + nz * o, gy = groundY(P, x, z, Number.isFinite(t.y) ? prev : NaN);
          if (gy < 0.05 && prev >= 0.05 && !Number.isFinite(t.y) && !seen.has('water')) { seen.add('water'); hits.push({ kind: 'water', a }); }
          if (Math.abs(gy - prev) >= 0.3 && !seen.has('face')) { seen.add('face'); hits.push({ kind: 'face', a, dh: +(gy - prev).toFixed(2) }); }
          prev = gy;
          solidsAt(P, x, z, gy, seen, a, hits);
        }
      }
      // (P136: a deck at the end — a bridge's, a pier's, a stair's tread: a floor standing over the ground — ahead, or
      //  beside the strip's last stretch: a footbridge leaving from the side of the street that ends at it)
      let deckAt = null;
      for (let a = -Math.max(1, t.w); a <= ahead + 1e-6 && deckAt == null; a += 0.25) for (const s of [-1, 1]) for (let o = a > 0 ? 0 : hw + 0.25; o <= hw + 1.0 + 1e-6; o += 0.25) {
        if (deck(P, t.x + t.dx * a + nx * o * s, t.z + t.dz * a + nz * o * s)) { deckAt = +a.toFixed(2); break; }
      }
      if (deckAt != null) hits.push({ kind: 'deck', a: deckAt });
      for (const d of doors) {
        const lx = d.x - t.x, lz = d.z - t.z, a = lx * t.dx + lz * t.dz, o = Math.abs(lx * nx + lz * nz);
        if (a > -1.5 && a < ahead + (d.r || 1) && o < hw + (d.r || 1)) hits.push({ kind: 'door', a: +a.toFixed(2), id: d.id || d.room || d.house || '' });
      }
      return { id: t.id, h0: +groundY(P, t.x - t.dx * 0.3, t.z - t.dz * 0.3, t.y).toFixed(2), hits };
    });
  }
  // gap rays [{ id, x0, z0, x1, z1 }] (from one paving's edge to another's across bare ground): open if the ground stays
  // within 0.45 m of the start and never jumps, and no WALL stands across it (P136: a bin, a bush, a tree, a bench in the
  // gap do not make it a deliberate one)
  function gaps(rays) {
    const P = G().physics;
    return rays.map((r) => {
      const L = Math.hypot(r.x1 - r.x0, r.z1 - r.z0), h0 = groundY(P, r.x0, r.z0, r.y), hits = [], seen = new Set();
      let prev = h0, open = true, dhMax = 0, by = null;
      for (let a = 0; a <= L + 1e-6; a += 0.2) {
        const x = r.x0 + ((r.x1 - r.x0) * a) / L, z = r.z0 + ((r.z1 - r.z0) * a) / L, gy = groundY(P, x, z, Number.isFinite(r.y) ? prev : NaN);
        dhMax = Math.max(dhMax, Math.abs(gy - h0));
        if (Math.abs(gy - prev) >= 0.25 || Math.abs(gy - h0) > 0.45 || gy < 0.05) { open = false; by ||= gy < 0.05 ? 'water' : 'ground'; }
        if (a > 0.3 && a < L - 0.3 && deck(P, x, z)) { open = false; by ||= 'deck'; }   // (P136: covered by a terrace, a deck, a stair)
        prev = gy;
        solidsAt(P, x, z, gy, seen, a, hits);
      }
      const wall = hits.find((h) => h.kind === 'solid');
      if (wall) { open = false; by ||= `wall ${wall.size} m × ${wall.top} m at (${wall.x}, ${wall.z})`; }
      return { id: r.id, open, by, dh: +dhMax.toFixed(2), props: hits.length };
    });
  }
  // (P136 coverage) every up-facing outdoor surface built as a mesh near the ground (within 1.2 m of the terrain), its
  // area by texture (map.name, else the material's name, else its colour) per area: what the scan reads, what it does not
  async function cover() {
    const { textures } = await import(new URL('src/engine/textures.js', location.href).href);
    const TX = textures(), named = new Map(Object.entries(TX).filter(([, v]) => v && v.isTexture).map(([k, v]) => [v, k]));
    const out = {}, v = [0, 0, 0].map(() => new (G().camera.position.constructor)()), T = G().physics.terrain;
    G().scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const geo = o.geometry, P = geo.attributes.position, I = geo.index, groups = geo.groups?.length ? geo.groups : [{ start: 0, count: I ? I.count : P.count, materialIndex: 0 }];
      o.updateWorldMatrix(true, false);
      for (const g of groups) {
        const m = mats[g.materialIndex ?? 0] ?? mats[0]; if (!m) continue;
        const key = m.map ? named.get(m.map) || m.map.name || 'map?' : m.name || (m.color ? '#' + m.color.getHexString() : '?');
        for (let k = g.start; k < Math.min(g.start + g.count, I ? I.count : P.count); k += 3) {
          for (let q = 0; q < 3; q++) v[q].fromBufferAttribute(P, I ? I.getX(k + q) : k + q).applyMatrix4(o.matrixWorld);
          const ax = v[1].x - v[0].x, ay = v[1].y - v[0].y, az = v[1].z - v[0].z, bx = v[2].x - v[0].x, by = v[2].y - v[0].y, bz = v[2].z - v[0].z;
          const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.hypot(nx, ny, nz);
          if (nl < 1e-9 || ny / nl < 0.9) continue;
          const cx = (v[0].x + v[1].x + v[2].x) / 3, cy = (v[0].y + v[1].y + v[2].y) / 3, cz = (v[0].z + v[1].z + v[2].z) / 3;
          if (Math.abs(cy - T.heightAt(cx, cz)) > 1.2) continue;
          const area = areaOf(cx, cz); if (!area) continue;
          const A = (out[area] ||= {}); A[key] = (A[key] || 0) + nl / 2;
        }
      }
    });
    for (const a of Object.values(out)) for (const k of Object.keys(a)) { a[k] = Math.round(a[k]); if (a[k] < 20) delete a[k]; }
    return out;
  }
  // P140 EDGE: what a paving's edge meets, per sample [x, z, nx, nz, y] (a point on the edge, its outward normal, the
  // paving's level): a wall (a non-prop solid), a face in the ground (≥ 0.3 m), the sea, or a floor over the ground (a
  // deck, a house's floor) within 0.8 m outward. A prop, a lawn or bare ground there is no clean end for a ragged edge.
  function edgeMeet(samples) {
    const P = G().physics;
    return samples.map(([x, z, nx, nz, y]) => {
      const g0 = groundY(P, x - nx * 0.2, z - nz * 0.2, y), hits = [], seen = new Set();
      let what = null, prev = g0;
      for (let a = 0.1; a <= 0.8 + 1e-6 && !what; a += 0.1) {
        const px = x + nx * a, pz = z + nz * a, gy = groundY(P, px, pz, Number.isFinite(y) ? prev : NaN);
        if (Math.abs(gy - prev) >= 0.3 || Math.abs(gy - g0) >= 0.3) what = 'face';
        else if (gy < 0.05 && g0 >= 0.05 && !Number.isFinite(y)) what = 'water';
        else if (deck(P, px, pz)) what = 'deck';
        prev = gy;
        solidsAt(P, px, pz, gy, seen, a, hits);
        if (!what && hits.some((h) => h.kind === 'solid')) what = 'wall';
      }
      return what;
    });
  }
  // P140: a small bare hole inside a paving: hidden if anything solid stands over it (a statue's base, a well, a stall)
  function holeCovered(pts) {
    const P = G().physics;
    return pts.map(([x, z]) => { const gy = P.terrain.heightAt(x, z); for (const c of P.near(x, z)) { if (c.enabled === false || c.top < gy + 0.05 || c.bottom > gy + 1.8) continue; if (c.type === 'box') { const lx = x - c.x, lz = z - c.z, u = lx * c.cos - lz * c.sin, v = lx * c.sin + lz * c.cos; if (Math.abs(u) < c.hw && Math.abs(v) < c.hd) return true; } else if (Math.hypot(x - c.x, z - c.z) < (c.r ?? 0)) return true; } return deck(P, x, z); });
  }
  // P140: the kerb stones in the world (Citadel's, the isles' around their WA-11 paving pieces): [x, z] each
  let KERBS = null;
  function kerbs() {
    if (KERBS) return KERBS;
    const m = new (G().camera.matrix.constructor)(); KERBS = new Map();
    G().scene.traverse((o) => {
      if (!o.isInstancedMesh || !/kerb/i.test(o.name || '')) return;
      o.updateWorldMatrix(true, false);
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); const e = m.elements, k = Math.floor(e[12]) + ',' + Math.floor(e[14]); (KERBS.get(k) || KERBS.set(k, []).get(k)).push(e[12], e[14]); }
    });
    return KERBS;
  }
  const kerbNear = (x, z, r) => { const K = kerbs(); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = K.get((Math.floor(x) + i) + ',' + (Math.floor(z) + j)); if (L) for (let q = 0; q < L.length; q += 2) if (Math.hypot(L[q] - x, L[q + 1] - z) < r) return true; } return false; };
  // P140 (the user's answer to P136): a WA-11 paving piece's outline, per sample [x, z, nx, nz]: a kerb stone on it,
  // else what it meets (edgeMeet), else null
  function patchEnds(samples) {
    const met = edgeMeet(samples.map(([x, z, nx, nz]) => [x, z, nx, nz, NaN]));
    return samples.map(([x, z, nx, nz], i) => (kerbNear(x + nx * 0.12, z + nz * 0.12, 0.45) ? 'kerb' : met[i]));
  }
  window.PE = { grids, meshes, judge, gaps, cover, edgeMeet, holeCovered, kerbNear: (pts, r) => pts.map(([x, z]) => kerbNear(x, z, r)), patchEnds };
})();
