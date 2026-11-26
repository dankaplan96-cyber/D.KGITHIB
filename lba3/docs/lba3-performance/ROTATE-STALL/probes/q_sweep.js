(async () => {
  // ROTATE-STALL: the Follow camera (Far) sweeping round Twinsen on Citadel's street. The street route's setup with the
  // Follow camera, then Twinsen turned on the spot (MODE=turn: SWEEPS × 360° at RATE rad/s), or 90° steps every STEP_S s
  // (MODE=step), or walked round a circle of RAD m (MODE=circle). Each frame through Game.advance (as play: the drawn
  // step, culling, shadow cache, draw batches), 1/30 s each. Per frame: CPU ms, shadow cache full / sliced / swaps and
  // the cause of every drop, draw-batch pieces left and area builds, shadow-batch pieces left and area builds, programs /
  // geometries / textures deltas, uploads, draw calls / shadow calls / triangles. Printed: per sweep totals, and every
  // frame where anything happened. Run with ../../PERF-BATTERY-2/probes/run.mjs (Q=medium BATTERY=1).
  const G = game, R = G.renderer.renderer, C = G.shadowCache, DB = G.drawBatch, SC = G.shadowCull;
  const MODE = window.MODE || 'turn', SWEEPS = +(window.SWEEPS || 3), RATE = +(window.RATE || 1.5), DT = 1 / 30;
  G.bench.setCamera(window.CAMERA || 'follow');
  // (OFF=1: this task's changes switched off, the A/B baseline in the same build)
  if (window.OFF) { G.skelUp = false; G.shadowCache.initSpare = false; G.shadowCache.pool2 = false; G.revealReady = false; }
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street'));
  G.state = 'play'; route.setup(); G.state = 'play';
  const h = G.hero, p0 = { x: h.pos.x, z: h.pos.z }, a0 = h.angle;
  // (drop causes: the casters' list or the key, compared with the last frame's)
  let lastS = null, lastKey = null, frameDrops = [];
  const st0 = C.statics.bind(C);
  C.statics = function (A) { const S = st0(A); C._probeS = S; return S; };
  const drop0 = C.drop.bind(C);
  const nm = (o) => `${o.name || o.type}#${o.id}${o.isBatchedMesh ? '(tree batch)' : o.isInstancedMesh ? '(instanced)' : ''}`;
  C.drop = function () {
    if (this.cache || this.next) {
      const S = C._probeS || [], ids = new Set(S.map((o) => o.id)), was = new Set((lastS || []).map((o) => o.id));
      const add = S.filter((o) => !was.has(o.id)).map(nm), rem = (lastS || []).filter((o) => !ids.has(o.id)).map(nm);
      frameDrops.push(add.length || rem.length ? `casters +[${add.slice(0, 4).join(',')}${add.length > 4 ? '…' + add.length : ''}] -[${rem.slice(0, 4).join(',')}${rem.length > 4 ? '…' + rem.length : ''}]` : (this.key !== lastKey ? 'key' : 'other'));
    }
    return drop0();
  };
  const ctr = () => ({ ...C.stats, dbLeft: DB.left || 0, dbB: DB.builds || 0, scLeft: SC.left || 0, scB: SC.builds || 0, p: R.info.programs.length, g: R.info.memory.geometries, x: R.info.memory.textures, rt: G.perf.targets?.size ?? 0 });
  // (what a frame put on the GPU for the first time: geometries (three's dispose listener is added on first use) and
  //  material textures (three's properties hold a WebGL texture once uploaded), with an owner's name)
  const TEXS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap', 'envMap', 'gradientMap', 'displacementMap', 'specularMap'];
  const onGpu = new WeakSet(), P = R.properties;
  const own = (o) => { const n = []; for (let q = o; q && n.length < 3; q = q.parent) if (q.name) n.push(q.name); return `${o.type}:${n.join('<') || '?'}${o.userData?.src ? '@' + o.userData.src : ''}`; };
  const scanNew = (mark) => {
    const out = [];
    G.scene.traverse((o) => {
      const g = o.geometry;
      if (g && !onGpu.has(g) && (g._listeners?.dispose || []).length) { onGpu.add(g); if (!mark) out.push('geo ' + own(o) + ` (${g.attributes?.position?.count ?? '?'} v)`); }
      for (const m of [].concat(o.material || [])) for (const k of TEXS) { const t = m[k]; if (t?.isTexture && !onGpu.has(t) && P.get(t).__webglTexture) { onGpu.add(t); if (!mark) out.push(`tex ${k} ${t.name || t.uuid.slice(0, 6)} ${t.image?.width ?? '?'}x${t.image?.height ?? '?'} on ${own(o)}`); } }
    });
    return out;
  };
  let t = 0, drive;
  if (MODE === 'turn') drive = () => { h.angle = a0 + t * RATE; h.vel.set(0, 0); };
  else if (MODE === 'step') { const S = +(window.STEP_S || 1.2); drive = () => { h.angle = a0 + Math.floor(t / S) * (Math.PI / 2); h.vel.set(0, 0); }; }
  else { const RAD = +(window.RAD || 3); drive = () => { const a = t * RATE; h.pos.set(p0.x + RAD * Math.sin(a), 0, p0.z + RAD * Math.cos(a) - RAD); h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z, 2); h.angle = a + Math.PI / 2; h.vel.set(0, 0); }; }
  // settle 2 s facing a0
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0; h.vel.set(0, 0); };
  // (manual steps: the game's own loop is held between them (testFreeze) and the steps run as play (testFreeze off
  //  inside a step: settle frames, uploads, warm-ups as a player gets them); a yield every 15 steps)
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const gl = R.getContext(), px = new Uint8Array(4), drain = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const yieldNow = () => new Promise((r) => setTimeout(r, 0));
  if (window.SEC) G.bench.secOn();
  // (DOOR=1: into the street through a scene change as a player gets there — its fade, black frame and uploads — not
  //  the benchmark route's instant switch)
  if (window.DOOR) { G.enterRoom('house', null, true, true); for (let i = 0; i < 10; i++) step(); G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); for (let i = 0; i < 600 && G.trans; i++) { step(); if (i % 15 === 14) await yieldNow(); } }
  for (let i = 0; i < +(window.SETTLE || 60); i++) { step(); if (i % 15 === 14) await yieldNow(); }
  scanNew(true);   // (what is on the GPU after the settle frames)
  // (texture storage made in a frame — texImage/texStorage with a size — and what was being drawn then: the object, or
  //  'render target' when a target was being bound, or 'outside a draw')
  const allocs = []; let drawing = null;
  { const rb = R.renderBufferDirect; R.renderBufferDirect = function (cam, sc, geo, mat, obj) { drawing = obj; try { return rb.apply(this, arguments); } finally { drawing = null; } }; }
  { const srt = R.setRenderTarget; R.setRenderTarget = function (t) { const d0 = drawing; if (t) drawing = { rt: t }; try { return srt.apply(this, arguments); } finally { drawing = d0; } }; }
  for (const fn of ['texImage2D', 'texStorage2D', 'texImage3D', 'texStorage3D']) {
    const f = gl[fn]; gl[fn] = function (...a) {
      const w = fn === 'texStorage2D' ? a[3] : fn === 'texStorage3D' ? a[3] : typeof a[3] === 'number' ? a[3] : a[5]?.width ?? a[a.length - 1]?.width;
      const hh = fn === 'texStorage2D' || fn === 'texStorage3D' ? a[4] : typeof a[4] === 'number' ? a[4] : a[a.length - 1]?.height;
      allocs.push(`${fn} ${w}x${hh}${fn.endsWith('3D') ? 'x' + (fn === 'texStorage3D' ? a[5] : a[5]) : ''} ${drawing?.rt ? 'render target ' + (drawing.rt.texture?.name || '?') : drawing ? 'drawing ' + own(drawing) + ' (' + [].concat(drawing.material).map((m) => m?.type).join(',') + ')' : 'outside a draw'}`);
      return f.apply(this, a);
    };
  }
  const sweepT = MODE === 'step' ? 4 * +(window.STEP_S || 1.2) : (2 * Math.PI) / RATE;
  const N = Math.ceil((SWEEPS * sweepT) / DT);
  G.benchTick = (real) => { G.doorCool = Math.max(G.doorCool || 0, 0.5); drive(real); };
  const rows = [], sweeps = [];
  lastS = C._probeS; lastKey = C.key;
  for (let i = 0; i < N; i++) {
    const k = Math.floor((i * DT) / sweepT);
    const a = ctr(); frameDrops = []; allocs.length = 0;
    if (i % 15 === 14) { await yieldNow(); if (i % 60 === 59) console.log(`PROBE frame ${i}/${N}`); }
    drain();   // (SwiftShader: the last frame's GPU work done first, so the frame's CPU ms is its own work)
    const t0 = performance.now(); step(); const ms = performance.now() - t0;
    t += DT;
    const b = ctr(), f = G.perf.buf[(G.perf.i + G.perf.buf.length - 1) % G.perf.buf.length] || {};
    const d = {}; for (const key of Object.keys(b)) if (b[key] !== a[key]) d[key] = b[key] - a[key];
    const sec = f.sec ? Object.fromEntries(Object.entries(f.sec.ms).filter(([, v]) => v > 0.5).map(([k2, v]) => [k2, +v.toFixed(1)])) : null;
    const fresh = d.g > 0 || d.x > 0 ? [...scanNew(false), ...allocs.map((x) => 'alloc ' + x)] : []; allocs.length = 0;
    const r = { i, k, ms: +ms.toFixed(1), sec, fresh, calls: f.calls, sh: f.shadowCalls, tris: f.tris, up: f.up, upKB: +(f.upKB || 0).toFixed(0), d, drops: frameDrops.slice() };
    rows.push(r);
    lastS = C._probeS; lastKey = C.key;
    (sweeps[k] ??= { k, frames: 0, ms: [], full: 0, sliced: 0, swaps: 0, drops: 0, dbLeft: 0, dbB: 0, scLeft: 0, scB: 0, p: 0, g: 0, x: 0, up: 0, upKB: 0, calls: [], tris: [] });
    const S = sweeps[k]; S.frames++; S.ms.push(ms); S.calls.push(f.calls); S.tris.push(f.tris); S.up += f.up || 0; S.upKB += f.upKB || 0; S.drops += frameDrops.length;
    for (const key of ['full', 'sliced', 'swaps', 'dbLeft', 'dbB', 'scLeft', 'scB', 'p', 'g', 'x']) S[key] += d[key] || 0;
  }
  G.benchTick = null;
  const pc = (a, q) => { const v = a.slice().sort((x, y) => x - y); return +v[Math.min(v.length - 1, Math.floor(q * v.length))].toFixed(1); };
  const L = [`ROTATE-STALL sweep · ${MODE} rate ${RATE} · ${G.settings.quality} · battery ${G.renderer.battery} · camera ${G.camRig.mode} ${G.settings.camDist} · ${N} frames of ${(DT * 1000).toFixed(1)} ms · sweep ${sweepT.toFixed(2)} s`];
  for (const S of sweeps) L.push(`sweep ${S.k}: ${S.frames} fr · cpu p50 ${pc(S.ms, 0.5)} p95 ${pc(S.ms, 0.95)} max ${pc(S.ms, 1)} ms · calls p50 ${pc(S.calls, 0.5)} max ${pc(S.calls, 1)} · tris p50 ${(pc(S.tris, 0.5) / 1000).toFixed(0)}k max ${(pc(S.tris, 1) / 1000).toFixed(0)}k · cache full ${S.full} sliced ${S.sliced} swaps ${S.swaps} drops ${S.drops} · drawbatch left ${S.dbLeft} areaBuilds ${S.dbB} · shadowbatch left ${S.scLeft} areaBuilds ${S.scB} · +prog ${S.p} +geo ${S.g} +tex ${S.x} · uploads ${S.up} (${S.upKB.toFixed(0)} KB)`);
  L.push('-- frames with events (i sweep ms calls/shadow tris up | deltas | drops) --');
  const med = pc(rows.map((x) => x.ms), 0.5);
  for (const r of rows) if (Object.keys(r.d).filter((k) => k !== 'live').length || r.drops.length || r.up > 0 || r.ms > 2 * med) L.push(`${r.i} s${r.k} ${r.ms}ms ${r.calls}/${r.sh} ${(r.tris / 1000).toFixed(0)}k up ${r.up}/${r.upKB}KB | ${JSON.stringify(r.d)} | ${r.drops.join('; ')}${r.sec ? ' | ' + JSON.stringify(r.sec) : ''}${r.fresh.length ? '\n      first on the GPU: ' + r.fresh.join(' · ') : ''}`);
  if (window.SEC) { G.bench.secOff(); const keys = [...new Set(rows.flatMap((r) => Object.keys(r.sec || {})))]; L.push('-- CPU by section per sweep (p50 / p95 / max ms) --'); for (const S of sweeps) { const R2 = rows.filter((r) => r.k === S.k); L.push(`sweep ${S.k}: ` + keys.map((k2) => { const v = R2.map((r) => r.sec?.[k2] || 0); return `${k2} ${pc(v, 0.5)}/${pc(v, 0.95)}/${pc(v, 1)}`; }).join(' · ')); } }
  return L.join('\n');
})()
