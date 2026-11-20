// PLACE-1: the recorder tests/place-scan.mjs installs before the game loads (page.addInitScript). props.js's Kit
// calls it for every k.at() (a placed piece: open/close) and every k.add()/k.mesh() (a part drawn). Each piece keeps
// the box of all its drawn parts in its own frame (so a turned piece keeps a tight, turned box), its frame's matrix
// within the Kit's group, its builder's source (the name of the prop: chair, table, bed ...) and its parent piece.
// Nothing else changes in the game: with __PLACE_REC unset Kit costs one property read per call.
(() => {
  const R = globalThis.__PLACE_REC = { frames: [], stack: [], next: null, loose: [], geos: new WeakSet() };
  R.open = (kit, fn) => {
    let src = String(fn);
    if (R.next && /fn\((this\.)?k\b/.test(src)) src = 'put:' + (R.next.name || String(R.next).slice(0, 200));   // (PLACE-3: the Hamalayi's put() too)
    R.next = null;
    let parent = null; for (let i = R.stack.length - 1; i >= 0; i--) if (R.stack[i].kit === kit) { parent = R.stack[i]; break; }
    const f = { kit, M: kit.top.clone(), inv: null, src: src.slice(0, 260), box: [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], n: 0, parent, i: R.frames.length, parts: [] };
    R.stack.push(f); R.frames.push(f);
    return f;
  };
  R.close = (kit, f) => { const i = R.stack.lastIndexOf(f); if (i >= 0) R.stack.splice(i, 1); };
  R.add = (kit, geo, m) => {
    if (!geo.boundingBox) geo.computeBoundingBox();
    const b = geo.boundingBox; if (!b || !Number.isFinite(b.min.x)) return;
    // the part itself (its box and its matrix in the Kit's group), kept by the innermost piece open on this Kit; a part
    // drawn outside any piece (a room's own walls, floors, partitions) is kept as loose
    R.geos.add(geo);
    const part = [m.clone(), b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z];
    let host = null; for (let i = R.stack.length - 1; i >= 0; i--) if (R.stack[i].kit === kit) { host = R.stack[i]; break; }
    if (host) host.parts.push(part); else { R.loose.push([kit, part]); return; }
    for (const f of R.stack) {
      if (f.kit !== kit) continue;
      if (!f.inv) f.inv = f.M.clone().invert();
      const L = f.inv.clone().multiply(m), e = L.elements;
      for (let c = 0; c < 8; c++) {
        const x = c & 1 ? b.max.x : b.min.x, y = c & 2 ? b.max.y : b.min.y, z = c & 4 ? b.max.z : b.min.z;
        const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
        const B = f.box;
        if (X < B[0]) B[0] = X; if (Y < B[1]) B[1] = Y; if (Z < B[2]) B[2] = Z; if (X > B[3]) B[3] = X; if (Y > B[4]) B[4] = Y; if (Z > B[5]) B[5] = Z;
      }
      f.n++;
    }
  };

  // ---------------------------------------------------------------- PLACE-2: what is built outside the Kit (outdoors)
  // Three ways the outdoor builders draw a piece, each recorded with WHERE it was made (the call stack: the builder's
  // function, file and line, so a bench drawn by island.js's bench() is named "bench"):
  //   - a Batch's part (kit.js, zeelich.js, island.js Batch.addM: its geometry's box and its matrix in the batch's group)
  //   - a mesh merged by engine/merge.js mergeStatic (its box and world matrix just before the merge)
  //   - a mesh, an InstancedMesh or a BatchedMesh still in the scene at the end (tests/lib/placecollect.js walks them):
  //     its maker is the stack where it was added to its parent (three's Object3D.add, wrapped by R.three below:
  //     tests/place-scan.mjs hands three's module to it as it loads; the game's code is not changed for it)
  // src/engine/placetag.js placeTag(name) names the next pieces a builder makes (a bench drawn inline in a long
  // builder); each call starts a new piece. Nothing here runs in play: the game's hooks read __PLACE_REC and stop.
  Error.stackTraceLimit = 30;
  // (placeTag sets R.tag: the builder that set it is kept, so a prop function it calls — a giant flower drawn for a
  //  'pole' — keeps its own name)
  let tag = null; R.tagN = 0; R.tagFn = null;
  Object.defineProperty(R, 'tag', { get: () => tag, set: (v) => { tag = v; const fr = R.callers(); R.tagFn = fr[2]?.fn || null; } });   // (fr: this setter, placeTag, the builder)
  R.bparts = []; R.mergedParts = []; R.sites = new WeakMap(); R.built = new WeakSet(); R.off = false;
  const FRAME = /at (?:(?:async )?([\w$.<>\[\] ]+?) \()?(?:https?:\/\/[^/]+)?\/?([^():]*?)([\w.-]+\.m?js):(\d+):\d+\)?$/;
  R.callers = () => {
    const out = [];
    for (const l of String(new Error().stack).split('\n').slice(2)) {
      const m = FRAME.exec(l.trim()); if (!m) continue;
      out.push({ fn: (m[1] || '').replace(/^(Object|Array|Function|Group|Mesh|Object3D)\./, ''), file: m[3], dir: m[2], line: +m[4] });
    }
    return out;
  };
  // (an output of a merge: its parts were recorded as they were added, the merged mesh is not a piece)
  const MERGER = /^(Batch|CellBatch|Kit|DrawBatch|ShadowCull|Area|PlaneSet)\.|^(mergeStatic|flush|build|buildCell|mergeAll)$/;
  const MERGEFILES = /^(drawbatch|shadowcull|merge|drawcull|texarray|spritebatch)\.js$/;
  R.site = (fr) => fr.map((f) => `${f.fn || '?'}@${f.file}:${f.line}`).slice(0, 14).join(' < ');
  R.tagged = () => (tag ? { tag, n: R.tagN, fn: R.tagFn } : null);
  R.bpart = (batch, geo, m, mat) => {
    if (R.off) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const b = geo.boundingBox; if (!b || !Number.isFinite(b.min.x)) return;
    R.bparts.push({ parent: batch.parent, m: m.clone(), box: [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z], site: R.site(R.callers()), tag: R.tagged(), geo, mat });
  };
  R.merged = (list, out, group) => {
    if (R.off) return;
    R.built.add(out);
    for (const o of list) {
      if (R.built.has(o)) continue;
      const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox; if (!b || !Number.isFinite(b.min.x)) continue;
      const s = R.sites.get(o);
      R.mergedParts.push({ root: group, m: o.matrixWorld.clone(), box: [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z], site: s?.site || '', tag: s?.tag || null, name: o.name || '', geo: g, mat: o.material, vis: o.visible });
    }
  };
  R.three = (T) => {
    const add = T.Object3D.prototype.add;
    T.Object3D.prototype.add = function (...objs) {
      if (!R.off) for (const o of objs) {
        if (!o || !o.isMesh || R.sites.has(o)) continue;
        // (the first frames: this wrapper and the game's own wrap of add, engine/drawcull.js)
        const fr = R.callers(); while (fr[0] && (/(^|\.)add$/.test(fr[0].fn) || /^(placerec|drawcull)\.js$/.test(fr[0].file))) fr.shift();
        if (fr[0] && (MERGER.test(fr[0].fn) || MERGEFILES.test(fr[0].file))) { R.built.add(o); continue; }
        R.sites.set(o, { site: R.site(fr), tag: R.tagged() });
      }
      return add.apply(this, objs);
    };
    R.T = T;
  };
})();
