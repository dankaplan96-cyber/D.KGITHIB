// EXPANSION WAVE 1 (docs/lba-maturity/WAVE1.md; story/relays.js): the covering suite for H-1 (Baldino's relays down the shaft,
// chapter 15) and H-2 (the allies' feeds at the deck ring, chapter 16). Staged by flags, played by input with game.step.
//   A  the shell from its start: Baldino's hook; the machinery's brackets (the one by the way in blind to the shutter, the
//      catwalk's east post sees both), the shutter refusing him until then, the spare taken along, the brackets quiet after;
//      the galleries' brackets (the far shelf's north one blind to the tunnel, the one by the old arch sees both), the arch
//      refusing him until then; a death in the galleries and Retry (the relays as saved); Sendell's line about her light.
//   B  the core: each bank shot opens its pylon and the guardian stays down (no bolts, no harm) while its box waits; the
//      LIGHTHOUSE dials in a wrong order buzz (Zoé says it), then star, sun, wave; a save with the MAINS box waiting →
//      Continue: the pylon open, the guardian down, the box's objective; the needle past the second mark trips (Mira says
//      it), then between the marks; a death in the fight and Retry (the pylons and feeds kept); the MILLS flywheel struck
//      with its mark low slips (Oku says it), then with the mark coming up to the top: it holds, the overload follows.
//   C  saves from before the wave: in the galleries (the machinery's hall counts as set, the hook comes once in play); in the
//      core's fight (both halls past, no feed past, a bank shot opens a pylon); after the coil (every feed past).
// ONLY=A|B|C. SERVE=1 serves this checkout. Results: automated runtime only (SwiftShader).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { launch, open, menu, checker, URL0 } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const ONLY = process.env.ONLY || '';
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
let browser, context, page;
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
// the page's helpers (again after every load): what was said, a bracket by input, a box's parts by input, a bank shot
const install = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col, o) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col, o); };
  window.T = {
    run(s) { for (let i = 0; i < s * 10; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } P.settle(); },
    said(n0) { return window.__said.slice(n0).join(' | '); },
    tp(x, z, y = null) { const h = G.hero; h.pos.set(x, y == null ? G.physics.groundAt(x, z) : G.physics.groundAt(x, z, y + 1), z); h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
    face(x, z) { const h = G.hero; h.angle = Math.atan2(x - h.pos.x, z - h.pos.z); G.step(0.2); },
    // a bracket: stand in front of it, face it, E with its prompt up; what it shows
    bracket(id) { const RL = G.story._rl, m = RL.marks[id], n0 = window.__said.length; if (!m) return { r: 'no bracket ' + id };
      T.tp(m.b.post ? m.x + 0.75 : m.x, m.b.post ? m.z + 0.35 : m.z - 0.7, m.y); T.face(m.x, m.z); const k = G.findInteractable()?.kind;
      if (k !== 'rl_set' && k !== 'rl_take') return { r: 'prompt ' + k };
      P.tap('KeyE', 0.05); T.run(1.5);
      return { kind: k, at: G.flags.dx_relay_at ?? '', lamps: m.relay.visible ? m.lamps.map((l) => (l.m.color.getHexString() === '3cff6a' ? 'G' : 'R')).join('') : '-', hand: RL.hand(), said: T.said(n0) }; },
    prompt(id) { const m = G.story._rl.marks[id]; T.tp(m.b.post ? m.x + 0.75 : m.x, m.b.post ? m.z + 0.35 : m.z - 0.7, m.y); T.face(m.x, m.z); return G.findInteractable()?.kind ?? null; },
    // walk onto a room's exit and let the door act
    exit(to) { const e = G.room.exits.find((x) => x.to === to), n0 = window.__said.length; if (!e) return { r: 'no exit' }; T.tp(e.x, e.z, (G.room.deckY ?? 0)); G.step(0.5); T.run(2); return { room: G.room?.id, said: T.said(n0) }; },
    away(to) { const e = G.room.exits.find((x) => x.to === to); T.tp(e.x, e.z + (to === 'c3-shaft' ? 0 : 2.0), (G.room.deckY ?? 0)); if (to === 'c3-shaft') T.tp(e.x + 2.0, e.z, 0); G.step(0.3); },
    // a bank shot from a pylon's plate: stand still on it (it lines him up), Normal, throw
    bank(i) { const p = G.story.cur.plates().find((q) => q.i === i), h = G.hero, tg = G.room.ballTargets.find((x) => x.pylon === i); for (let k = 0; k < 3 && !tg.done; k++) { T.tp(p.x + (k ? 0.3 : 0), p.z - (k ? 0.2 : 0)); h.hp = h.maxHp; G.step(0.6); G.ball.state = 'idle'; P.tap('F1'); P.tap('KeyF', 0.05); G.step(1.6); P.settle(); } return { done: tg.done, prime: G.flags.c3_prime ?? null }; },
    gd() { const g = G.story.cur.guardian; return g ? g.state : 'none'; },
    // the open box's parts, by input
    box() { const fd = G.story._fd; return { fd, B: fd.boxes[fd.pending()], st: fd.box[fd.pending()] }; },
    dial(j) { const { fd, B } = T.box(), d = fd.dialAt(B, j), q = B.dialFront[j]; T.tp(q.x, q.z); T.face(d.x, d.z); const tg = G.findInteractable(); if (tg?.kind !== 'fd_dial' || tg.j !== j) return 'prompt ' + (tg?.kind ?? 'none') + ' ' + tg?.j; P.tap('KeyE', 0.05); for (let w = 0; w < 60 && G.hero.actT > 0; w++) G.step(1 / 30); G.step(0.3); P.settle(); return 'ok'; },
    wheel(n) { const { fd, B } = T.box(), w = fd.wheelAt(B); T.tp(B.wheelAt.x, B.wheelAt.z); T.face(w.x, w.z); let k = 0; for (; k < n; k++) { if (G.findInteractable()?.kind !== 'fd_wheel') break; P.tap('KeyE', 0.05); for (let s = 0; s < 60 && G.hero.actT > 0; s++) G.step(1 / 30); G.step(0.2); } return k; },
    fly(lo, hi) { const { B, st } = T.box(), tg = B.target, dx = B.front.x - tg.x, dz = B.front.z - tg.z, d = Math.hypot(dx, dz); T.tp(tg.x + dx / d * 3, tg.z + dz / d * 3); T.face(tg.x, tg.z); P.tap('F1');
      for (let w = 0; w < 60 && G.ball.state !== 'idle'; w++) G.step(1 / 30);
      for (let w = 0; w < 600 && !(st.brakeT < 0 && st.slipT <= 0 && st.ang > lo && st.ang < hi); w++) G.step(1 / 60);
      const a0 = +st.ang.toFixed(2); P.tap('KeyF', 0.05); G.step(1.8); return a0; },
  };
});
// a fixture's save, at this page's origin (the fixtures were written on several ports)
const fixture = (name) => { const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8')); for (const o of j.origins || []) o.origin = new URL(URL0).origin; return j; };
const boot = async (storageState, mode) => { ({ browser, context, page } = await launch({ storageState })); await open(page, '?nocine'); await install(); await menu(page, mode); await ev(() => P.settle()); };
const retry = async () => {
  await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 300000 }), page.click('#gameover [data-act="retry"]', { timeout: 60000, noWaitAfter: true })]);
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: fileURLToPath(new URL('./lib/player.js', import.meta.url)) });
  await install(); await ev(() => { window.__hp = [game.hero.hp, game.hero.maxHp]; P.settle(); });
};
const reload = async () => { await page.reload(); await open(page, '?nocine'); await install(); await menu(page, 'continue'); await ev(() => P.settle()); };
// game over by input's consequence: no clover, a heavy blow
const die = () => ev(() => { const G = game, h = G.hero; h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null); for (let i = 0; i < 200 && G.state !== 'gameover'; i++) G.step(0.05); return G.state; });

// ================================================================== A: the shell
if (!ONLY || ONLY === 'A' || ONLY === 'B') {
  await boot(undefined, 'new');
  await ev(() => { const G = game; Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
    G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle();
    Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_mills: true, c2_signal: true });
    window.__said.length = 0;
    G.story.cur.toShell?.(); G.step(1.5); P.settle(); for (let i = 0; i < 14 && G.story.cur.key !== 'shell'; i++) { G.story.nextChapter(); G.step(0.5); P.settle(); } });
  is('A1 chapter 15 begins in the shaft: Baldino says his radio goes blind below and relays talk by sight; two relays in hand; no relay line in the shaft\'s objective', await ev(() => {
    const G = game, RL = G.story._rl; return [G.flags.chapterKey, G.room?.id, /goes blind/.test(T.said(0)) && /One for each hall/.test(T.said(0)), RL.hand(), /both doors/.test(G.story.cur.objective())]; }),
    (v) => v[0] === 'shell' && v[1] === 'c3shaft' && v[2] && v[3] === 2 && !v[4]);
  // (the machinery as a player leaves it: the steps of chapter 15 before the relay have their own suite, chapter3.mjs)
  await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { c3_deepSeen: true, c3_diagram: true, c3_ladder: true, sh_knock: true, sh_reply: true, sh_bank: true, c3_cooled: true, c3_valves: { A: true, B: false, C: true } }); G.enterRoom('c3deep', null, true); P.settle(); G.story.cur.applyRooms(); T.run(1); });
  const a2 = await ev(() => T.bracket('D1'));
  is('A2 the machinery: a relay on the bracket by the way in: green for the tunnel, red for the shutter; Twinsen says why (the catwalk beside the wall)', a2, (v) => v.kind === 'rl_set' && v.lamps === 'GR' && v.hand === 1 && /catwalk runs right beside/.test(v.said));
  const a3 = await ev(() => { const r = T.exit('c3-gallery'); if (r.room !== 'c3deep') return { r }; T.away('c3-gallery'); const r2 = T.exit('c3-gallery'); return { first: r, second: r2, flag: game.flags.dx_relay_deep ?? null, sub: /both doors/.test(game.story.cur.objective()) }; });
  is('A3 the shutter (held by her crystal) refuses him while no relay sees both doors: said once, then a toast; the objective keeps asking', a3, (v) => v.first?.room === 'c3deep' && /Baldino loses me/.test(v.first.said) && v.second?.room === 'c3deep' && !/Baldino loses me/.test(v.second.said) && v.flag === null && v.sub);
  const a4 = await ev(() => { T.away('c3-gallery'); return { d2: T.bracket('D2'), d1: T.bracket('D1') }; });
  is('A4 the second relay on the catwalk\'s east post: both lamps green, Baldino hears the whole hall; the first still red on its bracket (two placed, none in hand)', a4, (v) => v.d2.kind === 'rl_set' && v.d2.lamps === 'GG' && /Clear as a bell/.test(v.d2.said) && v.d1.kind === 'rl_take' && v.d1.at === 'D2' && v.d1.hand === 1);
  const a5 = await ev(() => { const s = T.bracket('D1'); T.away('c3-gallery'); const r = T.exit('c3-gallery'); return { spare: s.at, room: r.room, flag: game.flags.dx_relay_deep, at: game.flags.dx_relay_at, hand: game.story._rl.hand() }; });
  is('A5 through the shutter with the catwalk\'s relay green-green: the hall set, the spare on the blind bracket unclipped and taken along', a5, (v) => v.spare === 'D2,D1' && v.room === 'c3gallery' && v.flag === true && v.at === 'D2' && v.hand === 1);
  const a6 = await ev(() => { const G = game; T.exit('c3-deep'); const p = ['D1', 'D2'].map((id) => T.prompt(id)); const vis = G.story._rl.marks.D2.relay.visible; T.exit('c3-gallery'); return { p, vis, room: G.room?.id }; });
  is('A6 back in the machinery: the set relay stays on the catwalk post, the brackets offer nothing (the hall is done); back to the galleries', a6, (v) => v.p.every((k) => k !== 'rl_set' && k !== 'rl_take') && v.vis && v.room === 'c3gallery');
  // (the galleries as a player crosses them: the pillars and the stones have their own suites)
  await ev(() => { const G = game; Object.assign(G.flags, { c3_gallerySeen: true, sh_held: true, c3_pillar0: true, c3_pillar1: true, c3_pillar2: true }); G.story.cur.applyRooms(); T.run(1); });
  const a7 = await ev(() => { const g2 = T.bracket('G2'); const r = T.exit('c3-sendell'); return { g2, r }; });
  is('A7 the galleries\' far shelf, north of the stones: red for the tunnel (a pillar hides it), green for the arch; the arch refuses him (said)', a7, (v) => v.g2.kind === 'rl_set' && v.g2.lamps === 'RG' && /Nearer the arch/.test(v.g2.said) && v.r.room === 'c3gallery' && /One that sees the tunnel and this arch/.test(v.r.said));
  const a8 = await ev(() => { T.away('c3-sendell'); const t = T.bracket('G2'); const g3 = T.bracket('G3'); return { t: t.kind, g3 }; });
  is('A8 the relay moved to the bracket beside the old arch: both lamps green, Baldino says all of them will hear him at the core', a8, (v) => v.t === 'rl_take' && v.g3.kind === 'rl_set' && v.g3.lamps === 'GG' && /hear you now/.test(v.g3.said));
  is('A9 a death in the galleries (no clover): game over', await die(), (v) => v === 'gameover');
  await retry();
  is('A10 Retry: back from the autosave in the galleries, the relays as he set them (the catwalk\'s, the arch\'s, both lamps green), the hall still to leave', await ev(() => { const G = game, RL = G.story._rl; return [G.room?.id, G.flags.dx_relay_at, G.flags.dx_relay_deep, G.flags.dx_relay_gal ?? null, !!RL.marks.G3?.relay.visible, RL.marks.G3?.lamps.map((l) => l.m.color.getHexString()).join(), RL.hand()]; }),
    (v) => v[0] === 'c3gallery' && v[1] === 'D2,G3' && v[2] === true && v[3] === null && v[4] && v[5] === '3cff6a,3cff6a' && v[6] === 0);
  const a11 = await ev(() => { const G = game, n0 = window.__said.length; T.away('c3-sendell'); T.exit('c3-sendell'); for (let i = 0; i < 80 && !G.flags.c3_sendell; i++) { G.step(0.1); P.settle(); } return { room: G.room?.id, gal: G.flags.dx_relay_gal, sendell: G.flags.c3_sendell, said: T.said(n0) }; });
  is('A11 through the old arch: the galleries\' relay set; in Sendell\'s chamber Baldino says her light carries his signal now (her chamber is hers)', a11, (v) => v.room === 'c3sendell' && v.gal === true && v.sendell === true && /Her light carries my signal/.test(v.said));

  // ================================================================== B: the core
  await ev(() => { const G = game, e = G.room.exits.find((x) => x.to === 'c3-core'); T.tp(e.x, e.z); for (let i = 0; i < 80 && G.flags.chapterKey !== 'core'; i++) G.step(0.1); P.settle(); T.run(2); });
  const b1 = await ev(() => { const G = game, h = G.hero, n0 = window.__said.length; const s0 = T.gd(); const r = T.bank(0); const said = T.said(n0); const st = T.gd(), bolts = G.bolts.list.length, hp = h.hp; T.run(8); return { s0, r, said, st, bolts, after: T.gd(), lost: hp - h.hp, obj: G.story.cur.objective(), pylon: G.room.pylons[0].state }; });
  is('B1 the core\'s fight; the first plate\'s bank shot opens its pylon (amber); the guardian sags and stays down (8 s, no bolts, no harm); Zoé asks for the LIGHTHOUSE box; its objective', b1,
    (v) => v.s0 !== 'none' && v.r.done && v.r.prime === 0 && v.st === 'stunned' && v.after === 'stunned' && v.bolts === 0 && v.lost === 0 && /drawing on it/.test(v.said) && /LIGHTHOUSE box/.test(v.said) && /LIGHTHOUSE/.test(v.obj) && v.pylon === 1);
  const b2 = await ev(() => { const n0 = window.__said.length; const p = [T.dial(0), T.dial(1), T.dial(2)]; const st = T.box().st.dials.join(); return { p, st, said: T.said(n0), prime: game.flags.c3_prime }; });
  is('B2 the LIGHTHOUSE dials turned to sun-wave-star the wrong way round (wave, star, sun): the box buzzes, Zoé: "Star, sun, wave. The same as always"', b2, (v) => v.p.every((x) => x === 'ok') && v.st === '1,2,0' && /Star, sun, wave, love/.test(v.said) && v.prime === 0);
  const b3 = await ev(() => { const G = game, n0 = window.__said.length; const p = [T.dial(0), T.dial(1), T.dial(2)]; T.run(1.5); const st0 = T.gd(); T.run(3); return { p, said: T.said(n0), pylon: G.flags.c3_pylon0, feed: G.flags.dx_feed_light, prime: G.flags.c3_prime ?? null, state: G.room.pylons[0].state, gd0: st0, gd: T.gd() }; });
  is('B3 star, sun, wave: the pylon holds (cyan), Zoé\'s signal is out; the guardian rises again', b3, (v) => v.p.every((x) => x === 'ok') && v.pylon === true && v.feed === true && v.prime === null && v.state === 2 && /Signal is out/.test(v.said) && v.gd !== 'stunned');
  const b4 = await ev(() => T.bank(1));
  is('B4 the second plate: the pylon opens, the MAINS box waits (saved)', b4, (v) => v.done && v.prime === 1);
  await reload();
  const b5 = await ev(() => { const G = game; T.run(2); return { room: G.room?.id, prime: G.flags.c3_prime, pylon: G.room.pylons[1].state, fight: G.flags.c3_fight, gd: T.gd(), obj: G.story.cur.objective(), done0: G.flags.c3_pylon0 }; });
  is('B5 Continue with the MAINS box waiting: in the core, the fight back on, pylon 2 open (amber), the guardian down, the objective names the needle', b5, (v) => v.room === 'c3core' && v.prime === 1 && v.pylon === 1 && v.fight === true && v.gd === 'stunned' && /MAINS needle/.test(v.obj) && v.done0 === true);
  const b6 = await ev(() => { const G = game, n0 = window.__said.length, st = T.box().st; const k = T.wheel(5); T.run(1.5); const a = { k, said: T.said(n0), p: +st.p.toFixed(2) }; const k2 = T.wheel(4); T.run(3); return { a, k2, pylon: G.flags.c3_pylon1, feed: G.flags.dx_feed_mains, said: T.said(n0) }; });
  is('B6 the MAINS wheel five turns: past the second mark it trips back to nothing (Mira says so); four turns, the needle between the marks, let settle: the pylon holds', b6,
    (v) => v.a.k === 5 && /Past the second mark it trips/.test(v.a.said) && v.a.p === 0.08 && v.k2 === 4 && v.pylon === true && v.feed === true && /All three valves open/.test(v.said));
  is('B7 a death in the fight (no clover): game over', await die(), (v) => v === 'gameover');
  await retry();
  const b8 = await ev(() => { const G = game; T.run(3); return { hp0: window.__hp, room: G.room?.id, p: [G.flags.c3_pylon0, G.flags.c3_pylon1, G.flags.c3_pylon2 ?? null], feeds: [G.flags.dx_feed_light, G.flags.dx_feed_mains, G.flags.dx_feed_mills ?? null], prime: G.flags.c3_prime ?? null, fight: G.flags.c3_fight, gd: T.gd(), hp: G.hero.hp === G.hero.maxHp }; });
  is('B8 Retry: back in the core at full life, two pylons held and their feeds kept, none open, the guardian fighting', b8, (v) => v.room === 'c3core' && v.p[0] && v.p[1] && v.p[2] === null && v.feeds[0] === true && v.feeds[1] === true && v.feeds[2] === null && v.prime === null && v.fight && v.gd !== 'stunned' && v.gd !== 'none' && v.hp0[0] === v.hp0[1]);
  const b9 = await ev(() => { const n0 = window.__said.length; const r = T.bank(2); return { r, said: T.said(n0) }; });
  is('B9 the third plate: its pylon opens; Oku asks for the MILLS flywheel braked with its mark at the top', b9, (v) => v.r.done && v.r.prime === 2 && /MILLS coupling/.test(v.said));
  const b10 = await ev(() => { const G = game, n0 = window.__said.length; const a0 = T.fly(-2.6, -2.0); T.run(2.5); const a = { a0, said: T.said(n0), prime: G.flags.c3_prime }; const a1 = T.fly(0.75, 1.15); T.run(3); return { a, a1, pylon: G.flags.c3_pylon2, feed: G.flags.dx_feed_mills, over: G.flags.c3_overload, said: T.said(n0) }; });
  is('B10 the flywheel struck with its mark low: it slips loose (Oku says so); struck as the mark comes up: it holds at the top, the third pylon holds, the overload begins', b10,
    (v) => /mark's not on top/.test(v.a.said) && v.a.prime === 2 && v.pylon === true && v.feed === true && v.over === true && /full sail/.test(v.said));
  await browser.close();
}

// ================================================================== C: saves from before the wave
if (!ONLY || ONLY === 'C') {
  await boot(fixture('base-14-gal'), 'continue');
  const c1 = await ev(() => { const G = game, f = G.flags, RL = G.story._rl; T.run(3); return { room: G.room?.id, v: f.dx_relay_v, deep: f.dx_relay_deep, gal: f.dx_relay_gal ?? null, at: f.dx_relay_at, hand: RL.hand(), told: f.dx_relay_told, said: T.said(0), sub: /both doors/.test(G.story.cur.objective()), d2: RL.marks.D2?.relay.visible }; });
  is('C1 a save from before in the galleries: loads; the machinery\'s hall counts as set (its relay on the catwalk post), one relay in hand for the galleries; Baldino\'s line once play is under way; the objective asks for the relay', c1,
    (v) => v.room === 'c3gallery' && v.v === 1 && v.deep === 'past' && v.gal === null && v.at === 'D2' && v.hand === 1 && v.told === true && /goes blind/.test(v.said) && v.sub && v.d2 === true);
  await browser.close();
  await boot(fixture('base-15'), 'continue');
  const c2 = await ev(() => { const G = game, f = G.flags; T.run(3); const a = { room: G.room?.id, deep: f.dx_relay_deep, gal: f.dx_relay_gal, feeds: [f.dx_feed_light ?? null, f.dx_feed_mains ?? null, f.dx_feed_mills ?? null], fight: f.c3_fight, gd: T.gd() }; const r = T.bank(0); return { ...a, r, gd2: T.gd() }; });
  is('C2 a save from before in the core\'s fight: loads; both halls past; no feed past; the fight resumes; a bank shot opens a pylon and the guardian goes down', c2,
    (v) => v.room === 'c3core' && v.deep === 'past' && v.gal === 'past' && v.feeds.every((x) => x === null) && v.fight === true && v.gd !== 'none' && v.r.done && v.r.prime === 0 && v.gd2 === 'stunned');
  await browser.close();
  await boot(fixture('new-15-last'), 'continue');
  const c3 = await ev(() => { const G = game, f = G.flags; T.run(2); return { room: G.room?.id, feeds: [f.dx_feed_light, f.dx_feed_mains, f.dx_feed_mills], prime: f.c3_prime ?? null, obj: G.story.cur.objective(), boxes: G.story._fd.boxes?.map((B) => B.state) }; });
  is('C3 a save from before after the coil: every feed counts as done (its box lit green), none open; the last act\'s objective as before', c3,
    (v) => v.room === 'c3core' && v.feeds.every((x) => x === 'past') && v.prime === null && /Mill Lane/.test(v.obj) && v.boxes?.every((s) => s === 'done'));
  await browser.close();
}
const fails = done();
process.exit(fails ? 1 : 0);
