// PLACE-1: the recorder tests/place-scan.mjs installs before the game loads (page.addInitScript). props.js's Kit
// calls it for every k.at() (a placed piece: open/close) and every k.add()/k.mesh() (a part drawn). Each piece keeps
// the box of all its drawn parts in its own frame (so a turned piece keeps a tight, turned box), its frame's matrix
// within the Kit's group, its builder's source (the name of the prop: chair, table, bed ...) and its parent piece.
// Nothing else changes in the game: with __PLACE_REC unset Kit costs one property read per call.
(() => {
  const R = globalThis.__PLACE_REC = { frames: [], stack: [], next: null, loose: [], geos: new WeakSet() };
  R.open = (kit, fn) => {
    let src = String(fn);
    if (R.next && /fn\(this\.k/.test(src)) src = 'put:' + (R.next.name || String(R.next).slice(0, 200));
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
})();
