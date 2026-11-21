(async () => {
  // P87b (A): which builds run on a first visit move the version of a texture source that a batched piece already uses.
  // Citadel's street batched first (as play), then every group not built yet is built (regions.buildGroup, its onBuilt
  // hooks included) one by one; after each, the batched pieces (every draw-batch area) whose map's source version moved.
  const G = game, DB = G.drawBatch, R = G.regions, THREE = await import('three');
  const DT = 1 / 30;
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  for (let i = 0; i < 40; i++) step();
  const SP = THREE.Source.prototype, d = Object.getOwnPropertyDescriptor(SP, 'needsUpdate');
  let cur = 'street'; const bumps = new Map();
  Object.defineProperty(SP, 'needsUpdate', { configurable: true, get: d.get, set(v) { if (v === true) { const fr = (new Error().stack || '').split('\n').slice(2).map((x) => x.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\/(src\/)?/, '').replace(/\)$/, '')); const site = fr.find((x) => /game\/|engine\//.test(x) && !/three/.test(x)) || fr[1] || '?'; let L = bumps.get(this); if (!L) bumps.set(this, (L = [])); L.push({ g: cur, site }); } d.set.call(this, v); } });
  const batched = () => { const out = []; for (const [k, A] of DB.areas) for (const M of A.members) if (!M.out && M.o.material?.map) out.push({ a: k, M, src: M.o.material.map.source }); return out; };
  // (DEEP=1: every built room's draw batches built too, as if visited — house, well, then each group right after its build)
  const roomsOf = (gid) => Object.entries(R.rooms_).filter(([id]) => R.groupOf(id) === gid).map(([, r]) => r);
  const prep = (r) => { const g = r?.group; if (!g) return 0; const v = g.visible; g.visible = true; g.updateMatrixWorld(true); const A = DB.prepare(g); g.visible = v; return A ? A.members.length : 0; };
  if (window.DEEP) for (const id of ['house', 'well']) prep(R.built(id));
  // every texture source any material in the scene uses (with its pixel size): a build that moves one makes three send it again
  const sceneSrcs = () => { const m = new Map(); G.scene.traverse((o) => { for (const mm of [].concat(o.material || [])) for (const k in mm) { const t = mm[k]; if (t?.isTexture && !t.isRenderTargetTexture && t.source) m.set(t.source, t.source.version); } }); return m; };
  const kb = (src) => { const d = src.data; return d && d.width ? (d.width * d.height * 4 * 1.33) / 1024 : 0; };
  let scMoved = 0, scKB = 0;
  const out = [`P87b census · ${G.settings.quality} · batched areas: ${[...DB.areas.keys()].map((k) => k.name || k.uuid.slice(0, 6)).join(',')} · pieces with a map: ${batched().length}`];
  const tot = { moved: 0, groups: 0 }, siteHits = new Map();
  const todo = window.GROUPS ? window.GROUPS.split(',') : [...R.groups.keys()].filter((g) => R.groups.get(g).state === 'unloaded');
  for (const gid of todo) {
    const B = batched(), v0 = new Map(B.map((b) => [b.src, b.src.version])), S0 = sceneSrcs();
    cur = gid; const t = performance.now();
    try { R.buildGroup(gid, 'probe'); } catch (e) { out.push(`${gid}: build failed ${e.message}`); continue; }
    const ms = performance.now() - t;
    let sm = 0, sk = 0; const smSites = new Map(); for (const [src, v] of S0) if (src.version !== v && v > 0) { sm++; sk += kb(src); for (const e of bumps.get(src) || []) if (e.g === gid) smSites.set(e.site, (smSites.get(e.site) || 0) + 1); }
    scMoved += sm; scKB += sk;
    const scTxt = sm ? ` · scene sources moved ${sm} (~${sk.toFixed(0)} KB to send again; ${[...smSites].map(([s2, n]) => n + 'x ' + s2).join(' | ')})` : '';
    let pm = 0; if (window.DEEP) for (const r of roomsOf(gid)) pm += prep(r);
    const moved = B.filter((b) => b.src.version !== v0.get(b.src));
    const srcs = new Set(moved.map((b) => b.src));
    if (moved.length) {
      tot.moved += moved.length; tot.groups++;
      const sites = new Map(); for (const s of srcs) for (const e of bumps.get(s) || []) if (e.g === gid) sites.set(e.site, (sites.get(e.site) || 0) + 1);
      for (const [s, n] of sites) siteHits.set(s, (siteHits.get(s) || 0) + n);
      const byA = new Map(); for (const b of moved) { const nm = b.a.name || b.a.userData?.src || b.a.uuid.slice(0, 6); byA.set(nm, (byA.get(nm) || 0) + 1); }
      out.push(`${gid} (${ms.toFixed(0)} ms): ${moved.length} batched pieces' texture source moved (${srcs.size} sources; areas ${[...byA].map(([a, n]) => a + ' ' + n).join(', ')}); by ${[...sites].map(([s, n]) => n + 'x ' + s).join(' | ')}${scTxt} · batched now ${pm}`);
    } else out.push(`${gid} (${ms.toFixed(0)} ms): 0${scTxt} · batched now ${pm}`);
  }
  out.push(`batched areas at the end: ${DB.areas.size}, pieces with a map: ${batched().length}; scene sources moved by the builds: ${scMoved} (~${scKB.toFixed(0)} KB)`);
  out.push(`TOTAL: ${tot.moved} piece-moves in ${tot.groups} of ${todo.length} first builds`);
  out.push('SITES (bumps of a batched piece\'s source, by call site):');
  for (const [s, n] of [...siteHits].sort((a, b) => b[1] - a[1])) out.push(`  ${n}x ${s}`);
  const all = new Map(); for (const L of bumps.values()) for (const e of L) if (e.g !== 'street') all.set(e.site, (all.get(e.site) || 0) + 1);
  out.push('ALL bumps during the builds, by site (top 40):');
  for (const [s, n] of [...all].sort((a, b) => b[1] - a[1]).slice(0, 40)) out.push(`  ${n}x ${s}`);
  return out.join('\n');
})()
