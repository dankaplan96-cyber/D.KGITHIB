// PLACE-2, page side: the outdoor pieces built outside props.js's Kit (tests/lib/placerec.js recorded them while the
// areas were built), grouped into pieces, in world space, per outdoor area.
// PLACE.collectOut(ids) → { [area]: { pieces: [...], walls: [...], doors, stairs, walks, stops, quests, skipped } }
//   piece: { i, name, maker, site, inst, parts: [[hull 2D, y0, y1, nrm?]], hull, y0, y1, mid, g: [ground under its
//            middle and its footprint's corners (drawn 20 % in)], gw (sea under it), path (m to the path's centre line,
//            where the area has one), veg }
// Grouping: a part's maker is the first function on its stack that is not a drawing helper (Batch.add, mesh(),
// instances() ...): island.js's bench() makes a bench. Parts of one maker called from one line (one loop) that touch
// (their boxes within 2 cm) are one piece; src/engine/placetag.js names (and splits) a builder's inline pieces. Each
// instance of an InstancedMesh or BatchedMesh is a piece of its own. A group larger than 6 m (or 3.5 m both ways, or
// 7 m tall: a house, a quay, the ground) is not a piece: its tall thin parts are walls for the pieces round it.
(() => {
const G = game, PLACE = window.PLACE || (window.PLACE = {});
const r3 = (v) => Math.round(v * 1000) / 1000;
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-9) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 1e-9) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
// a box (in a frame) through a world matrix: its footprint's hull, its height span, its axis-aligned box
function wpart(e, b) {
  const pts = []; let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let c = 0; c < 8; c++) {
    const x = c & 1 ? b[3] : b[0], y = c & 2 ? b[4] : b[1], z = c & 4 ? b[5] : b[2];
    const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
    pts.push([r3(X), r3(Z)]); if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Z < z0) z0 = Z; if (Z > z1) z1 = Z;
  }
  return { h: hull(pts), y0: r3(y0), y1: r3(y1), bb: [x0, z0, x1, z1] };
}
// the functions that only draw (their caller is the maker)
const HELPER = /^(\?|add|addM|addPart|mesh|instances|piecesOf|cullInstances|lodInstances|member|rod|pv|fitAdd|put|part|at|frame|compose|tint|bbox|cyl|lathe|tube|box|slab|wall|pane|post|rail|new \w+|\w+\.(add|addM|mesh|at|cyl|box|pt|push|pop|addInstance|build)|R\.\w+|PLACE\.\w+)$/;
const SKIPFILE = /^(placerec|placeout|placecollect|three\.(module|core)\.min|actors|characters|rig|dogs|guarddog|gulls|shuttle|dinofly|weather|walkers|guards|enemies|softfx|weapons|gadgets|combat|townbits|jetpack|slashtrail|bossmodels|equiplook|itemlook|hud|inventory|tools|death|spritebatch|environment|renderer|cinematic|travelfilm|lightpool|camera)\.js$/;
const parse = (site) => (site ? site.split(' < ').map((s) => { const m = /^(.*)@([\w.-]+):(\d+)$/.exec(s); return m ? { fn: m[1], file: m[2], line: +m[3] } : null; }).filter(Boolean) : []);
function makerOf(site) {
  const fr = parse(site);
  let i = 0; while (i < fr.length && (HELPER.test(fr[i].fn) || /^(placerec|three)/.test(fr[i].file))) i++;
  const m = fr[i]; if (!m) return null;
  const caller = fr.slice(i + 1).find((f) => f.file) || { file: '', line: 0 };
  const name = m.fn.replace(/^.*\./, '').replace(/^new /, '');
  // (a part drawn for an actor, a dog, a boat that sails, a cat ...: not placed dressing)
  const near = fr.slice(0, i + 3).filter((f) => SKIPFILE.test(f.file) && !/^(three|placerec)/.test(f.file));
  if (near.length) return { skip: near[0].file };
  return { name, key: `${m.fn}@${m.file}|${caller.file}:${caller.line}`, short: `${m.fn}@${m.file}:${m.line} < ${caller.fn || '?'}@${caller.file}:${caller.line}` };
}

PLACE.collectOut = async (ids) => {
  const REC = globalThis.__PLACE_REC; REC.off = true;
  G.scene.updateMatrixWorld(true);
  const roots = new Map();
  for (const id of ids) { if (id === 'citadel') { if (G.world?.root) roots.set(G.world.root, id); } else { const R = G.rooms[id]; if (R?.group) roots.set(R.group, id); } }
  const areaOf = (o) => { for (let p = o; p; p = p.parent) if (roots.has(p)) return roots.get(p); return null; };
  const shown = (o) => { for (let p = o; p && !roots.has(p); p = p.parent) if (p.visible === false) return false; return true; };
  const raw = new Map(ids.map((id) => [id, []]));
  const skipped = {};
  const skip = (id, why) => { const k = id + ':' + why; skipped[k] = (skipped[k] || 0) + 1; };
  const textN = (geo, mat, e) => (mat?.map && geo?.type === 'PlaneGeometry' ? [r3(e[8] / (Math.hypot(e[8], e[10]) || 1)), r3(e[10] / (Math.hypot(e[8], e[10]) || 1)), mat.map.isCanvasTexture ? 1 : 0] : null);
  const push = (id, mk, tag, w, extra = {}) => {
    // (a tag names the builder's own inline pieces; a prop function it calls keeps its own name)
    const own = tag && (!tag.fn || mk.key.startsWith(tag.fn + '@'));
    const name = own ? tag.tag : mk.name, key = tag ? `tag:${tag.tag}#${tag.n}` : mk.key;
    // (an instance: its own piece, joined only with the same instance of the maker's other meshes — a crate's body and its bands)
    raw.get(id).push({ key: key + (extra.ikey || ''), name, maker: mk.short, ...w, ...extra });
  };
  const M = new REC.T.Matrix4();
  // 1. Batch parts
  for (const p of REC.bparts) {
    const id = areaOf(p.parent); if (!id) continue;
    if (!shown(p.parent)) { skip(id, 'hidden batch'); continue; }
    const mk = makerOf(p.site); if (!mk) continue; if (mk.skip) { skip(id, mk.skip); continue; }
    M.multiplyMatrices(p.parent.matrixWorld, p.m);
    push(id, mk, p.tag, wpart(M.elements, p.box), { nrm: textN(p.geo, p.mat, M.elements), src: 'batch' });
  }
  // 2. meshes merged by mergeStatic
  for (const p of REC.mergedParts) {
    const id = areaOf(p.root); if (!id) continue;
    if (!p.vis || !shown(p.root)) { skip(id, 'hidden merged'); continue; }
    const mk = makerOf(p.site); if (!mk) { skip(id, 'no site'); continue; } if (mk.skip) { skip(id, mk.skip); continue; }
    push(id, mk, p.tag, wpart(p.m.elements, p.box), { nrm: textN(p.geo, p.mat, p.m.elements), src: 'merged' });
  }
  // 3. what is still in the scene: meshes (not a merge's output, not Kit's), instances
  const B = new REC.T.Box3(), IM = new REC.T.Matrix4();
  for (const [root, id] of roots) {
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || REC.built.has(o) || REC.geos.has(o.geometry)) return;
      if (/^(shadowBatch|drawBatch|smallPool|spriteBatch|merged)$/.test(o.name)) return;
      const s = REC.sites.get(o); if (!s) { skip(id, 'no site'); return; }
      const mk = makerOf(s.site); if (!mk) return; if (mk.skip) { skip(id, mk.skip); return; }
      if (!shown(o)) { skip(id, 'hidden'); return; }
      const g = o.geometry;
      if (o.isBatchedMesh) {
        const n = o._instanceInfo?.length ?? 0;
        for (let i = 0; i < n; i++) {
          if (o._instanceInfo[i]?.active === false || o.getVisibleAt?.(i) === false) continue;
          const gid = o.getGeometryIdAt(i); o.getBoundingBoxAt(gid, B); o.getMatrixAt(i, IM);
          IM.premultiply(o.matrixWorld);
          push(id, mk, s.tag, wpart(IM.elements, [B.min.x, B.min.y, B.min.z, B.max.x, B.max.y, B.max.z]), { inst: `${o.name || 'batch'}#${o.id}:${i}`, ikey: '#' + i, src: 'batched' });
        }
        return;
      }
      if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox; if (!b || !Number.isFinite(b.min.x)) return;
      const box = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z];
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, IM); if (Math.abs(IM.determinant()) < 1e-9) continue;   // (an instance shrunk to nothing: gone)
          IM.premultiply(o.matrixWorld);
          push(id, mk, s.tag, wpart(IM.elements, box), { inst: `${o.name || 'inst'}#${o.id}:${i}`, ikey: '#' + i, src: 'instanced' });
        }
        return;
      }
      push(id, mk, s.tag, wpart(o.matrixWorld.elements, box), { nrm: textN(g, o.material, o.matrixWorld.elements), src: 'mesh' });
    });
  }
  // 4. group: one key, touching boxes (union-find on a 2 m grid); each instance its own piece
  const out = {};
  const PH = G.physics;
  const doors = (G.story?.doors?.() || []).filter((d) => Number.isFinite(d.x) && Number.isFinite(d.z));
  const W = G.world;
  // the ground under a point: the terrain, or the highest standable brick whose top is no higher than yMax (so not the
  // piece's own collider), each brick grown 6 cm (two bricks laid edge to edge leave no seam: physics.js groundInfo)
  const groundUnder = (x, z, yMax) => {
    let g = PH.terrain.heightAt(x, z);
    for (const c of PH.near(x, z)) { if (!c.enabled || c.noStand || c.top > yMax || c.top <= g) continue; if (PH._inside(c, x, z, 0.06)) g = c.top; }
    return g;
  };
  const veg = /^(?!(planter|boxPlanter|flowerBox|flowerBed|flowerTub|tulipBed)$)(\w*(tree|palm|bush|shrub|grass|flower|tulip|fern|plant|reed|frond|cactus|hedge|ivy|vine|moss|scatter|blossom)\w*|lodBatch.*)$/i;
  for (const id of ids) {
    const list = raw.get(id), C = id === 'citadel' ? [0, 0] : [G.rooms[id].center?.x ?? 0, G.rooms[id].center?.z ?? 0];
    // union-find over the parts of one key whose boxes touch (2 cm), on a 2 m grid; `ok` picks the parts that may link
    const unite = (idx) => {
      const par = new Map(idx.map((i) => [i, i])), find = (i) => { while (par.get(i) !== i) { par.set(i, par.get(par.get(i))); i = par.get(i); } return i; };
      const grid = new Map(), CELL = 2;
      for (const i of idx) {
        const p = list[i], [x0, z0, x1, z1] = p.bb;
        for (let gx = Math.floor((x0 - 0.02) / CELL); gx <= Math.floor((x1 + 0.02) / CELL); gx++) for (let gz = Math.floor((z0 - 0.02) / CELL); gz <= Math.floor((z1 + 0.02) / CELL); gz++) {
          const k = p.key + '|' + gx + ',' + gz; let L = grid.get(k); if (!L) grid.set(k, (L = []));
          for (const j of L) {
            const q = list[j];
            if (q.bb[0] <= x1 + 0.02 && q.bb[2] >= x0 - 0.02 && q.bb[1] <= z1 + 0.02 && q.bb[3] >= z0 - 0.02 && q.y0 <= p.y1 + 0.02 && q.y1 >= p.y0 - 0.02) { const a = find(i), b = find(j); if (a !== b) par.set(a, b); }
          }
          L.push(i);
        }
      }
      const comps = new Map(); for (const i of idx) { const r = find(i); let c = comps.get(r); if (!c) comps.set(r, (c = [])); c.push(i); } return [...comps.values()];
    };
    const spanOf = (ix) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9; for (const i of ix) { const p = list[i]; x0 = Math.min(x0, p.bb[0]); z0 = Math.min(z0, p.bb[1]); x1 = Math.max(x1, p.bb[2]); z1 = Math.max(z1, p.bb[3]); y0 = Math.min(y0, p.y0); y1 = Math.max(y1, p.y1); } return { dx: x1 - x0, dz: z1 - z0, dy: y1 - y0 }; };
    const tooBig = ({ dx, dz, dy }) => Math.max(dx, dz) > 6 || (dx > 3.5 && dz > 3.5) || dy > 7;
    // a part that is building, not a piece: over 3 m long, a slab over 1.5 m both ways, over 4 m tall
    const bigPart = (p) => { const dx = p.bb[2] - p.bb[0], dz = p.bb[3] - p.bb[1], dy = p.y1 - p.y0; return Math.max(dx, dz) > 3 || (dx > 1.5 && dz > 1.5 && dy < 0.4) || dy > 4; };
    const comps = [], structure = [];
    const byKey = new Map(); list.forEach((p, i) => { if (p.key2) { comps.push([i]); return; } let L = byKey.get(p.key); if (!L) byKey.set(p.key, (L = [])); L.push(i); });
    for (const idx of byKey.values()) for (const c of unite(idx)) {
      if (!tooBig(spanOf(c))) { comps.push(c); continue; }
      // a builder's large group (a quay and its crates, a house and its lamp): its big parts are structure; its small
      // parts that touch nothing big but from above or below (a crate on the quay, a lamp on its slab) are pieces;
      // small parts against a big part's side (a window frame, a sill, a sign on the wall) are the structure's own
      const big = c.filter((i) => bigPart(list[i])), small = c.filter((i) => !bigPart(list[i]));
      structure.push(...big);
      for (const s of unite(small)) {
        const side = s.some((i) => { const p = list[i]; return big.some((j) => { const q = list[j]; return q.bb[0] <= p.bb[2] + 0.02 && q.bb[2] >= p.bb[0] - 0.02 && q.bb[1] <= p.bb[3] + 0.02 && q.bb[3] >= p.bb[1] - 0.02 && Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0) > 0.1; }); });
        if (side || tooBig(spanOf(s))) structure.push(...s); else comps.push(s);
      }
    }
    const stats = { raw: list.length, structure: structure.length, comps: comps.length, src: {} };
    for (const p of list) stats.src[p.src] = (stats.src[p.src] || 0) + 1;
    const pieces = [], walls = [], floors = [];
    const thin = (h) => { let w = 1e9; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez); if (L < 1e-6) continue; const nx = -ez / L, nz = ex / L; let lo = 1e9, hi = -1e9; for (const q of h) { const d = q[0] * nx + q[1] * nz; lo = Math.min(lo, d); hi = Math.max(hi, d); } w = Math.min(w, hi - lo); } return w; };
    let n = 0;
    for (const i of structure) { const p = list[i]; if (p.y1 - p.y0 >= 1.5 && p.h.length >= 3 && thin(p.h) <= 0.8) walls.push([p.h, p.y0, p.y1]); else if (p.y1 - p.y0 <= 1.2 && p.h.length >= 3) floors.push([p.h, p.y0, p.y1]); }
    for (const ci of comps) {
      const ps = ci.map((i) => list[i]);
      let y0 = 1e9, y1 = -1e9; for (const p of ps) { y0 = Math.min(y0, p.y0); y1 = Math.max(y1, p.y1); }
      const first = ps[0];
      const all = hull(ps.flatMap((p) => p.h));
      if (all.length < 3) continue;
      let mx = 0, mz = 0; for (const q of all) { mx += q[0]; mz += q[1]; } mx /= all.length; mz /= all.length;
      // the ground under it (terrain and standable bricks no higher than 10 cm over its foot: not its own collider)
      const pts = [[mx, mz], ...all.map((q) => [q[0] + (mx - q[0]) * 0.2, q[1] + (mz - q[1]) * 0.2])];
      const g = pts.map(([x, z]) => { const v = groundUnder(x, z, y0 + 0.1); return Number.isFinite(v) ? r3(v) : null; });
      const isVeg = veg.test(first.name) || veg.test((first.inst || '').split('#')[0]);
      const P = { i: n++, name: first.name, maker: first.maker, inst: first.inst || null, veg: isVeg,
        parts: ps.slice(0, 120).map((p) => [p.h, p.y0, p.y1, p.nrm || null]), hull: all, y0: r3(y0), y1: r3(y1), mid: [r3(mx), r3(mz)], g, np: ps.length };
      if (id === 'citadel' && W?.pathDist) {
        P.path = r3(Math.min(...[[mx, mz], ...all].map(([x, z]) => W.pathDist(x, z))));
        // (a sign: which way its path is, the nearest point of a path's centre line within 4 m)
        if (ps.some((p) => p.nrm?.[2] === 1)) { let best = 1e9, bv = null; for (let k = 0; k < 24; k++) for (const d of [0.5, 1, 1.5, 2, 3, 4]) { const a = k / 24 * Math.PI * 2, x = mx + Math.cos(a) * d, z = mz + Math.sin(a) * d, v = W.pathDist(x, z); if (v < best - 1e-6) { best = v; bv = [r3(x - mx), r3(z - mz)]; } } if (best < 1.5) P.toPath = bv; }
      }
      pieces.push(P);
    }
    // doors (the story's doors outdoors in this area), stairs and walkways (bricks), people's work stops, quest things
    const reg = id === 'citadel' ? undefined : id;
    const hdoor = (d) => (id === 'citadel' ? (W.houses || []).find((h) => h.door && Math.hypot(h.door.x - d.x, h.door.z - d.z) < 0.6) : null);
    const dl = doors.filter((d) => (d.region || undefined) === reg).map((d) => { const h = hdoor(d); return { x: r3(d.x), z: r3(d.z), r: d.r ?? 0.9, to: d.room || d.to || '', ...(h ? { ry: h.ry ?? Math.atan2(h.door.x - h.x, h.door.z - h.z) } : {}) }; });
    if (id === 'citadel') for (const h of W.houses || []) if (h.door) dl.push({ x: r3(h.door.x), z: r3(h.door.z), r: 0.9, to: 'house:' + h.id, ry: h.ry ?? Math.atan2(h.door.x - h.x, h.door.z - h.z) });
    const near = (c) => { const b = c.bound ?? 1; return pieces.some((P) => Math.abs(P.mid[0] - c.x) < b + 6 && Math.abs(P.mid[1] - c.z) < b + 6); };
    const cols = PH.colliders.filter((c) => c.enabled !== false && near(c));
    const inA = (c) => { const a = (() => { for (const P of pieces) if (Math.hypot(P.mid[0] - c.x, P.mid[1] - c.z) < (c.bound ?? 1) + 8) return true; return false; })(); return a; };
    const colJ = (c) => ({ t: c.type, x: r3(c.x), z: r3(c.z), hw: c.hw, hd: c.hd, r: c.r, rot: c.rot || 0, top: r3(c.top), bottom: r3(c.bottom ?? -50), st: !!c.seeThrough, ns: !!c.noStand, blk: !!c.block, stair: !!c.stair });
    const stairs = cols.filter((c) => c.stair && inA(c)).map(colJ);
    // (a walkway: a long narrow brick with a drop at both long sides — a bridge, a pier, a gangway; not a strip of a
    //  brick floor laid among others)
    const dropSide = (c, s) => { const lx = c.hw < c.hd ? s * (c.hw + 0.5) : 0, lz = c.hw < c.hd ? 0 : s * (c.hd + 0.5); const x = c.x + lx * c.cos + lz * c.sin, z = c.z - lx * c.sin + lz * c.cos; return groundUnder(x, z, c.top + 0.05) < c.top - 0.4; };
    const walks = cols.filter((c) => !c.noStand && c.type === 'box' && Math.min(c.hw, c.hd) <= 1.6 && Math.max(c.hw, c.hd) >= 1.25 && c.top - PH.terrain.heightAt(c.x, c.z) >= 0.4 && dropSide(c, 1) && dropSide(c, -1) && inA(c)).map(colJ);
    const solid = cols.filter((c) => !c.noStand && !c.seeThrough && c.top - Math.max(c.bottom ?? -50, PH.terrain.heightAt(c.x, c.z)) >= 1.9 && (c.type === 'box' ? Math.max(c.hw, c.hd) >= 1.2 : c.r >= 1.4) && inA(c)).map(colJ);
    const fl = floors.filter((f) => { const c = f[0][0]; return pieces.some((P) => Math.abs(P.mid[0] - c[0]) < 12 && Math.abs(P.mid[1] - c[1]) < 12); });
    out[id] = { outdoor: true, stats, c: C, pieces, walls, floors: fl, doors: dl, stairs, walks, solid, skipped: Object.fromEntries(Object.entries(skipped).filter(([k]) => k.startsWith(id + ':'))) };
  }
  return out;
};
})();
