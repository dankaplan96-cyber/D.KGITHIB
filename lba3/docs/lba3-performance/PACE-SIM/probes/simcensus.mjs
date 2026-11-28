// PACE-SIM: who is simulated where. On a benchmark route (default: the interior, Twinsen's house), at a fixed 60 Hz
// step, every person's and enemy's update is timed and the physics queries it makes are counted, per actor, with the
// area the actor stands in and the area the hero is in. Also the benchmark's own section counts (perf.js Sections) for
// the same frames, so the numbers can be read against the laptop's "people 67 calls · enemies 39 · physics 183".
//   GAME_URL=... ROUTE=interior S=5 CHAPTER=<n> node simcensus.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const ID = process.env.ROUTE || 'interior', S = +(process.env.S || 5);
const { browser, page } = await launch({ width: 640, height: 360 });
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); } catch {} });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const out = await ev(async ({ id, S }) => {
  const G = game, P = G.physics, reg = G.regions;
  const where = (x, z) => (Math.abs(x) < 400 && Math.abs(z) < 400 ? 'citadel' : reg.sceneOf?.(x, z) || '?');
  const route = G.bench.routes().find((r) => r.id === id);
  G.benching = true; G.state = 'play'; route.setup(); G.state = 'play';
  for (let i = 0; i < 30; i++) { route.drive(i / 60, 1 / 60); G.frame(1 / 60, false); }
  // per actor: calls, ms, physics queries made inside its update
  const rows = new Map(); let cur = null;
  const row = (a, kind) => { let r = rows.get(a); if (!r) rows.set(a, (r = { id: a.def?.id || a.id || a.name || '?', kind, cls: a.constructor.name, calls: 0, ms: 0, phys: 0, active: 0 })); return r; };
  const wrapU = (a, kind) => { const f = a.update; a.update = function (...x) { const r = row(a, kind), t0 = performance.now(), prev = cur; cur = r; const px = r.phys; try { return f.apply(this, x); } finally { r.calls++; r.ms += performance.now() - t0; cur = prev; } }; };
  for (const n of G.npcs) wrapU(n, 'npc');
  for (const e of G.enemies) wrapU(e, 'enemy');
  let physOut = 0; const byM = {};
  for (const m of ['move', 'fall', 'groundInfo', 'steepAt', 'blockedAt', 'solidAt', 'clearTo', 'lineOfSight', 'near', 'ballFenceAt', 'ballFenceBetween']) {
    const f = P[m]; if (typeof f !== 'function') continue;
    // (only the outermost query counts, as perf.js Sections counts it: groundAt → groundInfo inside move is one call)
    let depth = 0;
    P[m] = function (...x) { if (P.__d) return f.apply(this, x); P.__d = 1; try { if (cur) { cur.phys++; (cur.by ||= {})[m] = (cur.by[m] || 0) + 1; } else { physOut++; byM[m] = (byM[m] || 0) + 1; } return f.apply(this, x); } finally { P.__d = 0; } };
  }
  const N = Math.round(S * 60); let t = 0.5;
  const T0 = performance.now();
  for (let i = 0; i < N; i++) { t += 1 / 60; G.state = 'play'; route.drive(t, 1 / 60); G.perf.beginFrame(); G.frame(1 / 60, i % 4 === 0); }
  const wall = performance.now() - T0;
  G.benching = false;
  const h = G.hero;
  const list = [...rows.values()].map((r) => ({ ...r, perFrame: +(r.calls / N).toFixed(2), msPerFrame: +(r.ms / N).toFixed(4), physPerFrame: +(r.phys / N).toFixed(2), ms: undefined }));
  const actors = [...G.npcs, ...G.enemies];
  for (const r of list) { const a = actors.find((x) => (x.def?.id || x.id || x.name) === r.id); if (a) { r.at = where(a.pos.x, a.pos.z); r.present = !!a.present; r.alive = a.alive; r.d = +Math.hypot(a.pos.x - h.pos.x, a.pos.z - h.pos.z).toFixed(0); r.tier = a.tier; r.vis = !!a.rig?.root?.visible; } }
  const busy = list.filter((r) => r.msPerFrame > 0.0005 || r.physPerFrame > 0).sort((a, b) => b.msPerFrame - a.msPerFrame);
  const sum = (k, f = () => true) => +list.filter(f).reduce((s, r) => s + r[k], 0).toFixed(3);
  return {
    hero: where(h.pos.x, h.pos.z), room: G.room?.id || null, frames: N, wallMsPerFrame: +(wall / N).toFixed(2),
    npcs: G.npcs.length, enemies: G.enemies.length,
    perFrame: { npcCalls: sum('perFrame', (r) => r.kind === 'npc'), npcMs: sum('msPerFrame', (r) => r.kind === 'npc'), npcPhys: sum('physPerFrame', (r) => r.kind === 'npc'),
      enemyCalls: sum('perFrame', (r) => r.kind === 'enemy'), enemyMs: sum('msPerFrame', (r) => r.kind === 'enemy'), enemyPhys: sum('physPerFrame', (r) => r.kind === 'enemy'),
      physOutsideActors: +(physOut / N).toFixed(2), physOutsideBy: Object.fromEntries(Object.entries(byM).map(([k, v]) => [k, +(v / N).toFixed(2)])) },
    otherArea: { npcMs: sum('msPerFrame', (r) => r.kind === 'npc' && r.at !== where(h.pos.x, h.pos.z)), npcPhys: sum('physPerFrame', (r) => r.kind === 'npc' && r.at !== where(h.pos.x, h.pos.z)),
      enemyMs: sum('msPerFrame', (r) => r.kind === 'enemy' && r.at !== where(h.pos.x, h.pos.z)), enemyPhys: sum('physPerFrame', (r) => r.kind === 'enemy' && r.at !== where(h.pos.x, h.pos.z)) },
    busy: busy.slice(0, 40).map((r) => `${r.kind} ${r.cls} ${r.id} @${r.at} d${r.d}${r.tier != null ? ' tier' + r.tier : ''}${r.present ? '' : ' (absent)'}${r.vis ? '' : ' (hidden)'} · ${r.msPerFrame} ms · phys ${r.physPerFrame}${r.by ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(r.by).map(([k, v]) => [k, +(v / N).toFixed(1)]))) : ''}`),
  };
}, { id: ID, S });
console.log(JSON.stringify(out, null, 1));
await browser.close();
