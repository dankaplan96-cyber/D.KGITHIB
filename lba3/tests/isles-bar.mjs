// ISLES-BAR (9.11.2026; docs/lba-maturity/isles-inventory.md): Zeelich's islands at Citadel's bar, played by input where
// it says INPUT (the harness's arrow keys and E: tests/lib/player.js), through the story's states:
//   - chapter 5: Otringal from the pad up the new flight to the south terrace and through the high town's opened ramp to
//     the clinic (Sister Ione patches him up) and out; the fountain gives a drink; every shuttle board reads, with the
//     open favours' chalk notes; Mosquibee's honey hoist down to the hive keepers' hall (Zuzz) and back up;
//   - the bar's door opens in front of the bar (not behind the back-bar); the dog yard's gate is at the lane between
//     Mr Pelleck's house and the council's, walked to from the street;
//   - chapter 8: Zeelich's street walkers keep their rounds (Citadel's evacuation is Citadel's), with a line of the day;
//   - chapter 9: Ulla is at home (her stall shut while the council argues), her outdoor self away; Mr Tanek cuts
//     blankets; a save in Ulla's room comes back there and its door leads out; a death on Otringal → Retry, full health;
//   - chapter 10: a line that tells of a favour done waits for it (Tem and the quay light).
// ISO (logged): the chapters are set by their flags (as tests/world-consistency.mjs); he is put on an island's spawn
// or a few metres before a door, and walks the rest. SwiftShader: SHOTS=dir writes a few pictures.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
let { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 72, timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const ZI = await import('/src/game/zislands.js'); window.ZI = ZI;
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
  window.toIsle = (n) => { const G = game, reg = 'isle_' + n; G.regions.ensure(reg, 'test'); const R = G.rooms[reg]; G.enterRoom(reg, R.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.3); return R; };
  window.W = (n, x, z) => { const o = ZI.ISLE_AT(ZI.SLOTS.indexOf(n)); return [o.x + x, o.z + z]; };
  window.loc = (n) => { const o = ZI.ISLE_AT(ZI.SLOTS.indexOf(n)), h = game.hero.pos; return [+(h.x - o.x).toFixed(1), +h.y.toFixed(2), +(h.z - o.z).toFixed(1)]; };
  window.before = (x, z, fx, fz, d = 2.4) => { const G = game, h = G.hero, l = Math.hypot(fx, fz) || 1; const sx = x + fx / l * d, sz = z + fz / l * d; h.pos.set(sx, G.physics.groundAt(sx, sz, h.pos.y + 8), sz); h.angle = Math.atan2(x - sx, z - sz); h.onGround = true; h.vy = 0; G.camRig.snap(); G.step(0.3); P.settle(); };
  // into a room through its door by input, from 2.2 m before its sill
  window.walkIn = (rid) => { const G = game, d = G.story.doors().find((q) => q.room === rid); if (!d) return { r: 'no door' };
    const sd = G.room?.shutDoors?.find((q) => q.id === d.house); if (sd) { const a = sd.ry ?? 0; before(d.x, d.z, Math.sin(a), Math.cos(a), 2.2); }
    const t = P.through(d.x, d.z); P.settle(); G.step(0.5); return { r: t.r, room: G.room?.id }; };
  window.walkOut = () => { const G = game, e = G.room?.exits?.find((x) => /-out$/.test(x.to)) || G.room?.exits?.[0]; if (!e) return { r: 'no exit' }; P.through(e.x, e.z); P.settle(); const h = G.hero.pos; return { to: G.room?.id, ground: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 }; };
  window.useItem = (kind) => { const G = game, R = G.room, it = G.story.islife.things(R).find((q) => q.kind === kind); if (!it) return { r: 'none' }; before(it.x, it.z, R.pad.x - it.x, R.pad.z - it.z, it.r + 0.9); const u = P.use(it.x, it.z, { kind: 'il_item', near: it.r + 0.6 }); P.settle(); return { r: u.r }; };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers();
iso('chapter 5 by its flags; on Otringal at its pad');
await ev(() => setChapter('steam', { c5_started: true }));
await said();

// ---------------------------------------------------------------- Otringal on foot: the flight, the terrace, the high town
const climb = await ev(() => { toIsle('otringal'); const out = {};
  for (const [k, x, z] of [['foot', -6.9, -19.5], ['head', -6.9, -28.2], ['terrace', 0, -40], ['passage', 30, -60], ['high', 44, -55]]) { const [wx, wz] = W('otringal', x, z); const g = P.go(wx, wz, { tol: 0.9, maxT: 150 }); out[k] = { r: g.r, at: loc('otringal') }; }
  return out; });
check('Otringal (INPUT): from the plaza up the new flight west of the Grand Hall onto the south terrace, and along it through the opened ramp up to the high town (28 m)', ['foot', 'head', 'terrace', 'passage'].every((k) => climb[k].r === 'arrived') && climb.head.at[1] > 17 && climb.terrace.at[1] > 18 && climb.high.at[1] > 28, climb);
await shot('isles-bar-01-high-town');
const clinic = await ev(() => { const G = game, h = G.hero; const d = G.story.doors().find((q) => q.room === 'ih_otringal_52_m60'); const t = P.through(d.x, d.z); P.settle(); G.step(1);
  const inside = G.room?.id; h.hp = Math.max(1, h.maxHp - 4); const n = P.npc('il_ione'); const tk = n?.present ? P.talk('il_ione').r : null; const hp = [h.hp, h.maxHp]; const o = walkOut(); return { t: t.r, inside, ione: !!n?.present, tk, hp, out: o.to }; });
const clinicL = await said();
check('the high town\'s clinic by its door from the lane (INPUT): Sister Ione is there, talks and patches him up (all his life back); out again on the high town', clinic.inside === 'ih_otringal_52_m60' && clinic.ione && clinic.tk === 'talked' && clinic.hp[0] === clinic.hp[1] && clinic.out === 'isle_otringal' && has(clinicL, /Hold still/), { clinic, clinicL });
const fount = await ev(() => { const G = game, h = G.hero; toIsle('otringal'); h.hp = h.maxHp - 3; const u = useItem('fountain'); return { u: u.r, hp: [h.hp, h.maxHp] }; });
const fountL = await said();
check('Otringal\'s fountain (INPUT): a drink gives back a little life, with its own line', fount.u === 'used' && fount.hp[0] === fount.hp[1] - 1 && has(fountL, /fountain/i), { fount, fountL });

// ---------------------------------------------------------------- the boards: every island's departures, the favours' notes
const boards = await ev(() => { const out = {}; for (const n of ['knartas', 'mosquibee', 'orchard', 'liftdock', 'undergas', 'celebration']) { toIsle(n); out[n] = useItem('shuttleBoard').r; } return out; });
const boardsL = await said();
check('every island\'s shuttle departures board reads (INPUT), with the chalked notes of the open favours (the quay light out, keep high over the hives)', Object.values(boards).every((r) => r === 'used') && has(boardsL, /QUAY LIGHT OUT/) && has(boardsL, /KEEP HIGH OVER THE HIVES/), { boards, n: boardsL.length });
const lit = await ev(() => { const G = game; G.flags.pp_light = true; G.flags.pp_beacon = true; toIsle('knartas'); return useItem('shuttleBoard').r; });
const litL = await said();
check('with the quay light fitted and the beacon lit, the board\'s notes for them are gone', lit === 'used' && !has(litL, /QUAY LIGHT OUT|KEEP HIGH/), { litL });
await ev(() => { delete game.flags.pp_light; delete game.flags.pp_beacon; });

// ---------------------------------------------------------------- Mosquibee: the honey hoist and the hive keepers' hall
const hoist = await ev(() => { const G = game, R = toIsle('mosquibee'), H = R.hoists?.[0]; if (!H) return { r: 'no hoist' };
  const g = P.go(H.head.x, H.head.z, { tol: 0.6 }); const u = P.use(H.head.x, H.head.z, { kind: 'il_hoist', near: 1.0 }); for (let i = 0; i < 90 && G.trans; i++) G.step(1 / 30); P.settle(); G.step(0.5);
  const down = loc('mosquibee'); const w = walkIn('ih_mosquibee_26_15'); const n = P.npc('il_zuzz'); const tk = n?.present ? P.talk('il_zuzz').r : null; const o = walkOut();
  const g2 = P.go(H.foot.x, H.foot.z, { tol: 0.6 }); const u2 = P.use(H.foot.x, H.foot.z, { kind: 'il_hoist', near: 1.0 }); for (let i = 0; i < 90 && G.trans; i++) G.step(1 / 30); P.settle(); G.step(0.5);
  return { go: g.r, ride: u.r, down, hall: w.room, zuzz: !!n?.present, tk, out: o.to, back: g2.r, ride2: u2.r, up: loc('mosquibee') }; });
await said();
check('Mosquibee (INPUT): the honey hoist at the meadow\'s edge rides down the cliff to the ledge; the hive keepers\' hall leads in, Zuzz works there and talks; out, and the hoist rides back up', hoist.go === 'arrived' && hoist.ride === 'used' && hoist.down[1] < 7 && hoist.hall === 'ih_mosquibee_26_15' && hoist.zuzz && hoist.tk === 'talked' && hoist.out === 'isle_mosquibee' && hoist.ride2 === 'used' && hoist.up[1] > 16, hoist);

// ---------------------------------------------------------------- Otringal's bar: in, in front of the bar
const bar = await ev(() => { const G = game; toIsle('otringal'); const d = G.story.doors().find((q) => q.room === 'otrbar'), e = G.story.exitTo('otrbar-out'); before(d.x, d.z, e.x - d.x, e.z - d.z, 2.4); const t = P.through(d.x, d.z); P.settle(); G.step(0.5);
  const R = G.room, h = G.hero.pos; return { room: R?.id, localZ: +(h.z - R.spawn.z + 5.9).toFixed(2), hidden: G.camRig.hiddenBy({ x: h.x, y: h.y, z: h.z }), out: walkOut().to }; });
check('Otringal\'s bar (INPUT): he comes in through the door in front of the bar and its stools (z ≈ 5.9, the back-bar\'s wall at 2.85); out again on the harbour', bar.room === 'otrbar' && bar.localZ > 4.6 && bar.out === 'isle_otringal', bar);

// ---------------------------------------------------------------- chapter 9: people at home; a save in a room; a death
iso('chapter 9 by its flags');
await ev(() => setChapter('council', { c9_started: true }));
const home = await ev(() => { const G = game; toIsle('otringal'); const out = { outdoor: ['ot_ulla', 'ot_tanek'].map((id) => P.npc(id)?.away || 'here') };
  const [x, z] = W('otringal', 0, -40); P.go(x, z, { tol: 0.9, maxT: 150 }); const w = walkIn('ih_otringal_3_m59'); const n = P.npc('il_ulla'); out.room = w.room; out.ulla = !!n?.present; out.tk = n?.present ? P.talk('il_ulla').r : null; return out; });
const homeL = await said();
check('chapter 9 (INPUT): Ulla\'s stall is shut while the council argues: her outdoor self is away and she is at home on the terrace (walked to), counting apples', home.outdoor.every((a) => a === 'story') && home.room === 'ih_otringal_3_m59' && home.ulla && home.tk === 'talked' && has(homeL, /count apples/), { home, homeL });
await shot('isles-bar-02-ulla');
const sv = await ev(() => { game.save(false); return game.room?.id; });
const file = path.join(os.tmpdir(), 'isles-bar-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await browser.close();
({ browser, context, page } = await launch({ storageState: file }));
await open(page, '?nocine'); await menu(page, 'continue'); await helpers(); await said();
const back = await ev(() => { const G = game, h = G.hero.pos; P.settle(); const r = { room: G.room?.id, floor: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15, ulla: !!P.npc('il_ulla')?.present }; const o = walkOut(); return { ...r, out: o.to, state: G.state }; });
check('a save in Ulla\'s room → Continue: back in it, on its floor, Ulla there; its door leads out onto Otringal', sv === 'ih_otringal_3_m59' && back.room === 'ih_otringal_3_m59' && back.floor && back.ulla && back.out === 'isle_otringal' && back.state === 'play', { sv, back });
const dead = await ev(() => { const G = game, h = G.hero; G.save(false); h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null); for (let i = 0; i < 200 && G.state !== 'gameover'; i++) G.step(1 / 30); return { state: G.state }; });
const reloaded = page.waitForEvent('load', { timeout: 300000 });
await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
await reloaded;
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
await page.addScriptTag({ path: path.join(path.dirname(new URL(import.meta.url).pathname), 'lib/player.js') });
await ev(() => { game.testFreeze = true; game.step(0.3); P.settle(); });
await helpers(); await said();
const retry = await ev(() => { const G = game, h = G.hero; return { room: G.room?.id, hp: h.hp, max: h.maxHp, state: G.state, ch: G.flags.chapterKey }; });
check('a death on Otringal → Retry: back at the last save there, full health, chapter 9 still', dead.state === 'gameover' && retry.room === 'isle_otringal' && retry.hp === retry.max && retry.state === 'play' && retry.ch === 'council', { dead, retry });
fs.rmSync(file, { force: true });

// ---------------------------------------------------------------- chapter 8: Zeelich's street keeps its walkers
await ev(() => setChapter('evacuation', { c8_started: true }));
const z8 = await ev(() => { const G = game; G.regions.ensure('zeelich', 'test'); G.enterRoom('zeelich', G.rooms.zeelich.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.5);
  return ['ilo', 'aven', 'kira'].map((id) => { const n = P.npc(id); return { id, present: !!n?.present, away: n?.away || null, line: n ? G.story.citizens.linesFor(n)[0] : null }; }); });
check('chapter 8 (Citadel\'s evacuation): Zeelich\'s street walkers Ilo, Aven and Kira keep their rounds there, each with a line of the day', z8.every((p) => p.present && p.away !== 'story' && /_evac$/.test(p.line || '')), z8);

// ---------------------------------------------------------------- the dog yard's gate, from the street
await ev(() => setChapter('zeelich'));
const yard = await ev(() => { const G = game; G.regions.ensure('zeelich', 'test'); const Z = G.rooms.zeelich; G.enterRoom('zeelich', Z.spawn, true); P.settle(); const o = Z.group.position, Y = Z.dogYard;
  const s = { x: o.x - 33, z: o.z - 6 }; G.hero.pos.set(s.x, G.physics.groundAt(s.x, s.z, 30), s.z); G.camRig.snap(); G.step(0.3);
  const g = P.go(Y.gate.x, Y.gate.z + 2.2, { tol: 0.8 }); const roof = G.physics.groundAt(Y.gate.x, Y.gate.z + 2.2, G.hero.pos.y + 30) - G.hero.pos.y;   // (anything solid over him there: a roof) return { gate: [+(Y.gate.x - o.x).toFixed(1), +(Y.gate.z - o.z).toFixed(1)], r: g.r, roof: +roof.toFixed(2) }; });
check('the dog yard\'s gate opens onto the lane between Mr Pelleck\'s house and the council\'s (x −32), walked to from the street (INPUT), no roof 2 m before it', yard.r === 'arrived' && Math.abs(yard.gate[0] + 32) < 0.2 && Math.abs(yard.roof) < 1, yard);

// ---------------------------------------------------------------- chapter 10: lines wait for their favour
await ev(() => setChapter('network', { c10_started: true }));
const fav = await ev(() => { const G = game; toIsle('knartas'); const n = P.npc('kn_kid'); const a = G.story.ipeople.linesFor(n); G.flags.pp_light = true; const b = G.story.ipeople.linesFor(n); delete G.flags.pp_light; return { dark: a, lit: b }; });
check('chapter 10: Tem tells of the quay light blinking only once it is fitted (the favour); before that, that it is still dark', fav.dark.includes('ip_kn_kid_after_dark') && !fav.dark.includes('ip_kn_kid_after') && fav.lit.includes('ip_kn_kid_after') && fav.lit.includes('ip_kn_kid_1_lit'), fav);

await done();
await browser.close();
