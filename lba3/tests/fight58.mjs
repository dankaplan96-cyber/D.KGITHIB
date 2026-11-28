// #58 (ORDER-71): the first fights, measured by input — a measuring run, not a pass/fail suite (docs/lba-maturity/FIGHTS58.md).
// Automated runtime only (headless Chromium, SwiftShader, game.step): a bot plays (tests/lib/fight58bot.js, the local
// agent's fight68.mjs in game time), not a person. Read its hits as "where it hurts", not as the difficulty.
//   FIGHT   ch2     the Citadel depot (chapter 2, tests/fixtures/campaign/base-03): from the save's own start he walks to
//                   the depot valve by keys; the watch warns him the first time, the second time it fights; he fights
//                   and turns the valve
//           ccyard  a later fight for the curve (chapter 8's yard, base-11): STAGED 5 m off, then the fight by keys
//           zdepot  the Zeelich depot (base-05): STAGED at the gate (D.x − 4, D.z − 11, as fight68 and tests/depot.mjs),
//                   then by keys: the fight, then the locker
//   CTRL    modern | classic        READ  0 (fight68: never dodges a bolt) | 1 (dodges what a player reads)
//   V       off (=none) | a | b | c | h (or a list) — ?fight58=                     TRIES  runs (different starts: WAIT k)
// Run: SERVE=1 FIGHT=ch2 CTRL=modern V=off TRIES=3 node tests/fight58.mjs   → one JSON line per run (OUT=file appends)
import { launch, open, menu, URL0 } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIGHT = process.env.FIGHT || 'ch2', CTRL = process.env.CTRL || 'modern', READ = process.env.READ === '1', V = process.env.V || 'off';
const TRIES = +(process.env.TRIES || 3), OUT = process.env.OUT || null, SHOTS = process.env.SHOTS || null, DIFF = process.env.DIFF || null;
const SAVE = { ch2: 'base-03', zdepot: 'base-05', ccyard: 'base-11', drill2: 'base-03', drillz: 'base-05' }[FIGHT];
const fixture = fs.readFileSync(path.join(HERE, `fixtures/campaign/${SAVE}.save.json`), 'utf8').replaceAll('http://localhost:9201', new URL(URL0).origin);
const LOAD = path.join(os.tmpdir(), `fight58-${process.pid}.save.json`);
fs.writeFileSync(LOAD, fixture);
for (let tr = 0; tr < TRIES; tr++) {
  const { browser, page } = await launch({ storageState: LOAD, width: 960, height: 540 });
  const ev = (f, a) => page.evaluate(f, a);
  await open(page, '?nocine' + (V !== 'off' ? `&fight58=${V}` : '&fight58=none'));
  await menu(page, 'continue');
  await page.addScriptTag({ path: path.join(HERE, 'lib/fightlog.js') });
  await page.addScriptTag({ path: path.join(HERE, 'lib/fight58bot.js') });
  const res = await ev(({ FIGHT, CTRL, READ, tr, DIFF, process_STAGE }) => {
    const G = game, h = G.hero, P = window.P, B = window.FB;
    if (DIFF) G.settings.difficulty = DIFF;
    P.settle();
    // (a different start each run: the watch's round is somewhere else when he gets there)
    G.step(0.9 * tr);
    const in0 = { hp: h.hp, maxHp: h.maxHp, clovers: h.clovers, mp: h.mp };
    const snap = window.FIGHTLOG.snap();
    let result = '', walkS = 0;
    if (FIGHT === 'ch2') {
      const v = G.world.valves.find((q) => q.id === 'depot'), D = G.world.depot, E = D.gates[1];
      // the walk there (Classic keys by the harness's planner, as any suite walks; the fight is in CTRL)
      // (STAGE=1, the default: STAGED outside the east gate on the public path, as tests/depot-watch.mjs puts him at a gate;
      //  STAGE=0: walked there from the save's own start)
      const t0 = G.time;
      if (process_STAGE) { h.pos.set(E.out.x + 1.5, G.physics.groundAt(E.out.x + 1.5, E.out.z), E.out.z); h.angle = -Math.PI / 2; G.camRig.snap?.(); G.step(0.5); }
      else P.go(E.out.x + 1.5, E.out.z, { tol: 1.0, fight: false, maxT: 200 });
      P.settle(); walkS = G.time - t0;
      B.start({ ctrl: CTRL, read: READ });
      for (let k = 0; k < 40 && G.time - B.t0 < 420 && !v.open && !h.dead; k++) {
        const g = B.go(v.x, v.z, 1.3, 100);
        if (g === 'stop') { if (h.dead) break; P.settle(); continue; }
        if (g === 'threat') { const f = B.fight(); B.note('fight → ' + f); if (f === 'dead') break; continue; }
        if (g === 'there') {
          const s = { x: h.pos.x, z: h.pos.z };
          for (const kk of [...G.input.keys]) G.input.keys.delete(kk);
          if (CTRL === 'classic') P.face(v.x, v.z, 2); else { const dx = v.x - s.x, dz = v.z - s.z; const cd = G.camera.getWorldDirection(new h.pos.constructor()); const L = Math.hypot(cd.x, cd.z) || 1, fx = cd.x / L, fz = cd.z / L, a = (dx * fx + dz * fz), b = (dx * -fz + dz * fx); const ks = []; if (a > 0.38 * Math.hypot(dx, dz)) ks.push('KeyW'); else if (a < -0.38 * Math.hypot(dx, dz)) ks.push('KeyS'); if (b > 0.38 * Math.hypot(dx, dz)) ks.push('KeyD'); else if (b < -0.38 * Math.hypot(dx, dz)) ks.push('KeyA'); for (const q of ks) G.input.keys.add(q); G.step(0.08); for (const q of ks) G.input.keys.delete(q); }
          P.tap('KeyE', 0.09); G.step(3); P.settle(); B.note('E at the valve; open ' + v.open);
        }
      }
      result = v.open ? 'valve open' : h.dead ? 'dead' : 'valve shut';
    } else if (FIGHT === 'drill2' || FIGHT === 'drillz') {
      // DRILL (STAGED, no bot): what one side of the fight does to a Twinsen who stands still. He is put in the yard, the
      // watch set on him; (1) the drones alone for 40 s: every bolt that reaches him counted (his life restored, no
      // knock-back, so the drones' own rhythm shows); (2) the Zeelich Grobo alone for 40 s: each baton blow lands for real
      // (knocked down, up again), his life restored after it: the time from his getting up to the next blow
      const Z = FIGHT === 'drillz', D = Z ? G.rooms.zeelich.depot : G.world.depot;
      const at = Z ? { x: D.x - 0.5, z: D.z - 1.5 } : { x: D.valve.x + 0.2, z: D.valve.z + 1.7 };
      const watch = () => G.enemies.filter((e) => (Z ? e.def?.group === 'zdepot' : e.def?.watch));
      const put = () => { h.pos.set(at.x, G.physics.groundAt(at.x, at.z), at.z); h.vel?.set(0, 0); };
      if (!Z) G.flags.c1_depotWarned = true;
      put(); G.camRig.snap?.(); G.step(0.3);
      const only = (k) => { for (const e of watch()) { const on = k(e); e.setPresent(on); if (on) { e.state = 'patrol'; e.alert(h.pos); } } };
      const dmg0 = h.damage.bind(h);
      // (1) the drones
      only((e) => e.def.kind === 'drone'); if (!Z) G.story.depot.goHostile(); P.settle();
      const fired = [], hits = [], wind = [];
      const fire0 = G.bolts.fire.bind(G.bolts); G.bolts.fire = (...a) => { fired.push(+G.time.toFixed(2)); return fire0(...a); };
      h.damage = (n) => { hits.push(+G.time.toFixed(2)); };
      const st = {}; const t1 = G.time;
      while (G.time - t1 < 40) { if (G.state !== 'play') P.settle(); put(); G.step(1 / 30, 1 / 30); for (const e of watch()) { if (e.def.kind !== 'drone') continue; if (st[e.id] !== e.state) { if (st[e.id] === 'windup') wind.push(+(e.stateT0 != null ? G.time - e.stateT0 : 0).toFixed(2)); st[e.id] = e.state; e.stateT0 = G.time; } } }
      G.bolts.fire = fire0;
      const gaps = fired.slice(1).map((t, i) => +(t - fired[i]).toFixed(2));
      const r1 = { bolts: fired.length, hits: hits.length, perMin: +(hits.length * 1.5).toFixed(1), meanGap: gaps.length ? +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2) : null, windups: wind.slice(0, 6) };
      let r2 = null;
      if (Z) {
        // (2) the guard
        G.bolts.clear(); only((e) => e.def.kind === 'guardG'); P.settle();
        const blows = [], ups = []; let down = false;
        h.damage = (n, from, heavy) => { const hp = h.hp; dmg0(n, from, heavy); if (h.hp < hp) { blows.push(+G.time.toFixed(2)); down = true; } h.hp = h.maxHp; h.invuln = Math.min(h.invuln, 1.1); };
        const t2 = G.time;
        while (G.time - t2 < 40) { if (G.state !== 'play') P.settle(); G.step(1 / 30, 1 / 30); if (down && h.actT <= 0 && h.hurtT <= 0) { down = false; ups.push(+G.time.toFixed(2)); } }
        const win = ups.map((u) => { const nb = blows.find((b) => b > u); return nb ? +(nb - u).toFixed(2) : null; }).filter((x) => x != null);
        r2 = { blows: blows.length, perMin: +(blows.length * 1.5).toFixed(1), upToNextBlow: win };
      }
      h.damage = dmg0;
      B.start({ ctrl: CTRL, read: READ });
      result = JSON.stringify({ drones: r1, guard: r2 });
    } else if (FIGHT === 'ccyard') {
      // (a later fight for the curve: chapter 8's crowd-control yard, two drones, a Quetch, a FunFrock trooper, a dog;
      //  STAGED 5 m west of their square, then by keys: the fight)
      const x = -43, z = -72; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.PI / 2; G.camRig.snap?.(); G.step(0.5);
      B.start({ ctrl: CTRL, read: READ });
      let f = 'none';
      for (let k = 0; k < 4 && f !== 'dead'; k++) { const g = B.go(-34, -72, 1.0, 40); B.note('go → ' + g); if (g !== 'threat') break; f = B.fight(30, 240); B.note('fight → ' + f); }
      result = f;
    } else {
      const D = G.rooms.zeelich.depot;
      h.pos.set(D.x - 4, G.physics.groundAt(D.x - 4, D.z - 11), D.z - 11); h.angle = Math.atan2(4, 11); G.camRig.snap?.(); G.step(0.5);
      B.start({ ctrl: CTRL, read: READ });
      for (let k = 0; k < 6 && G.time - B.t0 < 300; k++) {
        const f = B.fight(30, 180); B.note('fight → ' + f);
        if (f === 'dead') break;
        const g = B.go(D.locker.x, D.locker.z, 1.2, 90); B.note('to the locker → ' + g);
        if (g === 'there') {
          if (CTRL === 'classic') P.face(D.locker.x, D.locker.z, 2);
          P.tap('KeyE', 0.4); G.step(1.5); P.settle(); break;
        }
      }
      result = G.flags.c2_cyl ? 'cylinder taken' : h.dead ? 'dead' : 'no cylinder';
    }
    const L = window.FIGHTLOG.since(snap);
    const by = {}; for (const x of L.hits) { const k = x.src.replace(/\d+:/, ':'); by[k] = (by[k] || 0) + 1; }
    return { fight: FIGHT, ctrl: CTRL, read: READ, try: tr, result, in: in0, out: { hp: h.hp, clovers: h.clovers, dead: !!h.dead },
      cloversSpent: in0.clovers - h.clovers, secs: +(G.time - B.t0).toFixed(1), walkS: +walkS.toFixed(1), fightS: L.fightS, hits: L.hits.length, lost: L.lost, by, bySource: L.bySource,
      botv: B.botv || 1, throws: B.throws, dodges: B.dodges, boltDodges: B.boltDodges, covers: B.covers, searched: B.searched, seen: B.seen.size, beaten: B.beaten.size, kills: L.kills.length, attacks: L.attacks, hitList: L.hits.map((x) => `${x.t}:${x.src}:${x.lost}`), log: B.log.slice(-30) };
  }, { FIGHT, CTRL, READ, tr, DIFF, process_STAGE: process.env.STAGE !== '0' });
  res.v = V;
  const line = JSON.stringify(res);
  console.log(JSON.stringify({ ...res, hitList: undefined, log: undefined, bySource: undefined, attacks: undefined }));
  if (OUT) fs.appendFileSync(OUT, line + '\n');
  await browser.close();
}
process.exit(0);
