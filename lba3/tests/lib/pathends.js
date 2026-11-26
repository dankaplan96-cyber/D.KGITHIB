// P135 PATH-ENDS, the in-page half (tests/path-ends.mjs adds it with addScriptTag): window.PE.
// PE.grids(): every terrain the game has built (Citadel's own and each outdoor area's patch), its paving per grid point
// as a signed value f (< 0 paved): the terrain's own edge distance where it has one (LAWN-EDGES: the shader cuts the
// paving there, per pixel, at 0), else the paving's share of the splat less a half (the shader's crisp re-split at
// 0.5). PE.meshes(): the up-facing triangles of paving built as meshes (the town cobbles' texture, Zeelich's flags).
// PE.judge(tips) / PE.gaps(rays): what stands at each paved strip's end, or in a gap between two pavings.
(() => {
  const G = () => window.game;
  const RANGE = 4;   // (terrain.js EDGE_RANGE)
  function grid(t, ox, oz, name) {
    const geo = t.mesh?.userData?.full || t.mesh?.geometry;
    const s2 = geo?.attributes?.splat2?.array, sp = geo?.attributes?.splat?.array, ed = geo?.attributes?.edge?.array;
    if (!s2) return null;
    const n = t.segs + 1, f = new Float32Array(n * n);
    let paved = 0;
    for (let k = 0; k < n * n; k++) {
      const tot = sp[k * 4] + sp[k * 4 + 1] + sp[k * 4 + 2] + sp[k * 4 + 3] + s2[k];
      const share = tot > 1e-6 ? s2[k] / tot : 0;
      const e = ed ? (ed[k * 2] / 32767) * RANGE : RANGE;
      const rock = tot > 1e-6 ? sp[k * 4 + 2] / tot : 0;   // (the shader: rock over ~0.45 of the splat takes the pixel)
      f[k] = e < RANGE - 0.05 ? e : rock > 0.45 ? 1 : (0.5 - share) * 2;
      if (f[k] < 0) paved++;
    }
    return { name, x0: t.x0 + ox, z0: t.z0 + oz, step: t.step, n, f: Array.from(f, (v) => Math.round(v * 1000) / 1000), paved };
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
  // a destination: a door's trigger, a building-size solid (a wall, a house, a stair, a parapet, a fence, a bench: ≥ 1.5 m
  // across, standing ≥ 0.3 m), the ground's face (a jump ≥ 0.3 m between two samples 0.25 m apart: a quay's face, a
  // stair, a cliff), the sea. A smaller solid (a bin, a lamp, a post, a tree) is listed as a prop, not a destination.
  // (the ground he would stand on there, at the paving's own level y: a mesh floor's top, else the terrain)
  const groundY = (P, x, z, y) => (Number.isFinite(y) ? P.groundAt(x, z, y + 0.3) : P.terrain.heightAt(x, z));
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
      hits.push({ kind: size >= 1.5 ? 'solid' : 'prop', a: +a.toFixed(2), size: +size.toFixed(2), top: +(c.top - gy).toFixed(2) });
    }
  }
  function judge(tips, ahead = 2.0) {
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
      for (const d of doors) {
        const lx = d.x - t.x, lz = d.z - t.z, a = lx * t.dx + lz * t.dz, o = Math.abs(lx * nx + lz * nz);
        if (a > -1.5 && a < ahead + (d.r || 1) && o < hw + (d.r || 1)) hits.push({ kind: 'door', a: +a.toFixed(2), id: d.id || d.room || d.house || '' });
      }
      return { id: t.id, h0: +groundY(P, t.x - t.dx * 0.3, t.z - t.dz * 0.3, t.y).toFixed(2), hits };
    });
  }
  // gap rays [{ id, x0, z0, x1, z1 }] (from one paving's edge to another's across bare ground): open if the ground stays
  // within 0.45 m of the start and never jumps, and nothing solid stands across it
  function gaps(rays) {
    const P = G().physics;
    return rays.map((r) => {
      const L = Math.hypot(r.x1 - r.x0, r.z1 - r.z0), h0 = groundY(P, r.x0, r.z0, r.y), hits = [], seen = new Set();
      let prev = h0, open = true, dhMax = 0;
      for (let a = 0; a <= L + 1e-6; a += 0.2) {
        const x = r.x0 + ((r.x1 - r.x0) * a) / L, z = r.z0 + ((r.z1 - r.z0) * a) / L, gy = groundY(P, x, z, Number.isFinite(r.y) ? prev : NaN);
        dhMax = Math.max(dhMax, Math.abs(gy - h0));
        if (Math.abs(gy - prev) >= 0.25 || Math.abs(gy - h0) > 0.45 || gy < 0.05) open = false;
        prev = gy;
        solidsAt(P, x, z, gy, seen, a, hits);
      }
      if (hits.some((h) => h.size >= 0.6)) open = false;
      return { id: r.id, open, dh: +dhMax.toFixed(2), props: hits.length };
    });
  }
  window.PE = { grids, meshes, judge, gaps };
})();
