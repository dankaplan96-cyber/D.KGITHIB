// UNDER-BAR (the underground at Citadel's bar: docs/lba-maturity/underground-inventory.md; src/game/story/deeplife.js):
// chapters 11–12 and the epilogue, what a player meets there.
//   - chapter 11: the collar on Citadel takes him down by input; in the shaft the lift's call post and the crew's tea
//     corner (the shift log) answer; in the deep installation the bore's console reads the drill's state, the heat
//     shutter says why it is shut, the service hoist says how Vesk got ahead; nothing answers the generic "Locked."
//   - up the lift by input: Baldino at the collar has a word that follows the chapter's progress (not "Hello, Twinsen.")
//   - the galleries' warning board reads from the shelf, not from the chasm floor; after Sendell's words her pool points
//     the way on; the relief of the two suns reads
//   - chapter 12: Vesk, walked up to mid-fight, answers as himself
//   - a death in the deep installation: Game Over, Retry, back in play in the deep installation with full life
//   - the epilogue: the collar leads down again after dinner; Guard Harl keeps the lift; Tolli of the shield crew walks
//     a round in the deep installation and talks (Vesk's note when he was pulled clear); the hoist's lamp is green; the
//     console reads SHIELD; across the galleries by the stones, Sendell's pool reads asleep; in the core the boss's music
//     is gone and Sala reads the field below Vesk's burnt console
//   - a save in the deep installation in the epilogue → Continue: back there on the floor with Tolli; out up the lift
// ISO (logged): chapters by their flags; the drone and the mites are set aside where a check is about a thing, not a
// fight (they have their own suites: chapter3); a few starting spots. Walks, doors, the lift, talks and uses by input.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
let { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const SHELL = { c3_started: true, c3_deepSeen: true, c3_gallerySeen: true };
const COOLED = { ...SHELL, c3_diagram: true, c3_ladder: true, c3_cooled: true, c3_valves: { A: true, C: true } };
const SENDELL = { ...COOLED, c3_pillar0: true, c3_pillar1: true, c3_pillar2: true, c3_sendell: true };
const DONE = { ...SENDELL, c3_pylon0: true, c3_pylon1: true, c3_pylon2: true, c3_bleed: true, c3_done: true, c3_veskHelped: true, ep_dinner: true, ep_free: true };

const helpers = () => ev(() => {
  window.setChapter = (key, flags, room) => {
    const G = game, f = G.flags;
    for (const k of Object.keys(f)) if (/^c\d+_|^ep_/.test(k)) delete f[k];
    Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, chapter: G.story.chapters.findIndex((c) => c.key === key), c1_water: true, c1_done: true, c10_mill: true, c10_valves: true, c10_light: true, c10_bore: true, c10_dome: true, c10_done: true }, flags);
    G.hero.hasBall = true; G.regions.ensure('underground', 'test');
    G.story.applyFlags(); G.step(0.2);
    if (room) G.enterRoom(room, null, true); else if (G.room) G.exitRoom({ x: 0, z: 0 }, true, true);
    P.settle(); G.story.refreshCast(); G.updateObjective(); G.step(0.3); P.settle();
  };
  // the fights are the chapter's own suite's: set aside here (logged ISO)
  window.calm = () => { for (const e of game.enemies) if (/^c3(drone|mite)/.test(e.def?.id || '')) { e.alive = false; e.present = false; if (e.mesh) e.mesh.visible = false; } };
  // (the pool: its rim, toward the way in, not its middle)
  window.lookAt = (id) => { const G = game, R = G.room, L = R.looks.find((q) => q.id === id); let x = L.x, z = L.z; if (id === 'pool') { const dx = R.spawn.x - x, dz = R.spawn.z - z, l = Math.hypot(dx, dz); x += dx / l * (L.r - 0.5); z += dz / l * (L.r - 0.5); } return P.use(x, z, { kind: 'dp_look', near: 0.6 }); };
  window.here = (id) => { const G = game, n = G.npcs.find((q) => q.def.id === id), R = G.room; return !!n?.present && !!R && Math.hypot(n.pos.x - R.center.x, n.pos.z - R.center.z) < 14; };
  window.atCollar = () => { const G = game, st = G.world.station, h = G.hero, x = st.bore.x + 1.2, z = st.bore.z + 7; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.PI; h.vy = 0; P.settle(); return { x: st.bore.x + 1.0, z: st.bore.z + 3.5 }; };
});
await open(page, '?nocine'); await menu(page, 'new'); await helpers(); await said();

// ---------------------------------------------------------------- chapter 11: down, the shaft, the deep installation
iso('chapter 11 by its flags (c3_started), on Citadel beside the station\'s collar; the drone set aside');
const a = await ev(([S]) => {
  setChapter('shell', S);
  const G = game, c = atCollar();
  const down = P.use(c.x, c.z, { kind: 'c3down', near: 0.5, match: 9 });
  const room = G.room?.id;
  calm();
  const call = lookAt('callpost'), tea = lookAt('tea');
  const deep = P.exitTo('c3-deep'); calm();
  const cons = lookAt('console'), shut = lookAt('shutter'), hoist = lookAt('hoist');
  return { down: down.r, room, call: call.r, tea: tea.r, deep: deep.to, cons: cons.r, shut: shut.r, hoist: hoist.r, lamp: G.room.hoist?.open };
}, [SHELL]);
const l1 = await said();
check('chapter 11: the collar on Citadel takes him down the shaft by input', a.down === 'used' && a.room === 'c3shaft', a);
check('chapter 11, the shaft: the lift\'s call post and the crew\'s tea corner answer (the way back up; the shift log says why the place is empty)', a.call === 'used' && a.tea === 'used' && l1.some((l) => /UP\. The pad/.test(l)) && l1.some((l) => /shift log.*Shaft closed/.test(l)), { a, l1 });
check('chapter 11, the deep installation: the bore\'s console reads the drill flat out, the shutter says why it is shut, the hoist says how Vesk went ahead (its lamp red)', a.deep === 'c3deep' && a.cons === 'used' && a.shut === 'used' && a.hoist === 'used' && a.lamp === false && l1.some((l) => /140 %.*FAILING/.test(l)) && l1.some((l) => /OPENS AT COOLING/.test(l)) && l1.some((l) => /how Vesk got ahead/.test(l)), { a, l1: l1.slice(-4) });
check('chapter 11: nothing down there answers the generic "Locked."', !l1.some((l) => /^Locked\.?$/.test(l)), l1);

// up the lift; Baldino at the collar, by the chapter's progress
const b = await ev(() => {
  const G = game; P.exitTo('c3-shaft'); const up = P.exitTo('c3-up');
  const t0 = P.talk('baldino').r;
  G.flags.c3_cooled = true; G.flags.c3_diagram = true; G.flags.c3_ladder = true; G.flags.c3_valves = { A: true, C: true };
  const t1 = P.talk('baldino').r;
  G.flags.c3_sendell = true;
  const t2 = P.talk('baldino').r;
  return { up: up.to, t0, t1, t2, cooled: G.rooms.c3deep.coolDoor.isOpen };
});
const l2 = await said();
check('chapter 11: up the lift by input to the station\'s yard; Baldino at the collar speaks to the chapter\'s progress (not the generic hello)', b.up === 'citadel' && b.t0 === 'talked' && b.t1 === 'talked' && b.t2 === 'talked' && l2.some((l) => /Back up already/.test(l)) && l2.some((l) => /heat dropped/.test(l)) && l2.some((l) => /plans are ready/.test(l)) && !l2.includes('Hello, Twinsen.'), { b, l2 });

// the galleries' board, Sendell's pool and relief
iso('chapter 11 with the deep installation cooled, in the galleries; the mites set aside');
const c = await ev(([C, S]) => {
  setChapter('shell', C, 'c3gallery'); calm();
  const G = game, R = G.room, board = lookAt('bridge');
  // from the chasm floor under the board: it does not answer there
  const L = R.looks.find((q) => q.id === 'bridge'), h = G.hero, x = L.x + 2.2, z = L.z;
  h.pos.set(x, G.physics.groundAt(x, z, 1), z); h.angle = -Math.PI / 2; G.step(0.3);
  const low = G.findInteractable()?.key || null, lowY = +h.pos.y.toFixed(2);
  setChapter('shell', S, 'c3sendell');
  const pool = lookAt('pool'), relief = lookAt('relief');
  return { board: board.r, low, lowY, pool: pool.r, relief: relief.r };
}, [COOLED, SENDELL]);
const l3 = await said();
check('chapter 11, the galleries: the crew\'s warning board reads from the shelf, not from the chasm floor', c.board === 'used' && c.low !== 'dp_bridge' && c.lowY < 0.5 && l3.some((l) => /BRIDGE OUT/.test(l)), { c, l3 });
check('chapter 11, Sendell\'s chamber after her words: her pool points on to the core; the relief of the two suns reads', c.pool === 'used' && c.relief === 'used' && l3.some((l) => /warm arch/.test(l)) && l3.some((l) => /Two suns/.test(l)), { c, l3 });

// ---------------------------------------------------------------- chapter 12: Vesk mid-fight
iso('chapter 12 by its flags, into the core (Vesk\'s scene plays, the fight starts)');
const d = await ev(([S]) => {
  setChapter('core', S, 'c3core');
  const G = game; for (let i = 0; i < 40 && !G.flags.c3_fight; i++) { P.settle(); G.step(0.1); }
  G.hero.hp = G.hero.maxHp;
  // (ISO: put at the foot of his platform, 3.5 m out toward the arena: the guardian's fight is chapter3's suite)
  const v = G.npcs.find((q) => q.def.id === 'vesk'), C = G.room, dx = C.center.x - v.pos.x, dz = C.center.z - v.pos.z, l = Math.hypot(dx, dz);
  G.hero.pos.set(v.pos.x + dx / l * 3.5, 0, v.pos.z + dz / l * 3.5); G.hero.pos.y = G.physics.groundAt(G.hero.pos.x, G.hero.pos.z, 1); G.step(0.1);
  const t = P.talk('vesk', { fight: false });
  return { fight: !!G.flags.c3_fight, talk: t.r, room: G.room?.id };
}, [SENDELL]);
const l4 = await said();
check('chapter 12: Vesk, walked up to mid-fight, answers as himself', d.fight && d.talk === 'talked' && l4.some((l) => /Talk to my guardian/.test(l)) && !l4.includes('Hello, Twinsen.'), { d, l4: l4.slice(-3) });

// ---------------------------------------------------------------- a death in the deep installation, Retry
iso('chapter 11 by its flags, saved in the deep installation; then 99 damage');
await ev(([S]) => { setChapter('shell', S, 'c3deep'); game.save(false); }, [SHELL]);
const dd = await ev(() => { const G = game, h = G.hero; h.clovers = 0; h.invuln = 0; h.damage(99, null); G.step(3); return { state: G.state }; });
check('a death in the deep installation: Game Over', dd.state === 'gameover', dd);
await page.click('#gameover [data-act="retry"]');
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 600000 });
await page.waitForFunction(() => game.state === 'play', null, { timeout: 120000 }).catch(() => {});
await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
const rt = await ev(() => { game.testFreeze = true; P.settle(); return { state: game.state, room: game.room?.id, hp: game.hero.hp, maxHp: game.hero.maxHp, chapter: game.flags.chapterKey, valves: game.room?.valves?.length }; });
check('Retry: back in play in the deep installation, chapter 11, life full', rt.state === 'play' && rt.room === 'c3deep' && rt.chapter === 'shell' && rt.hp === rt.maxHp && rt.valves === 3, rt);
await helpers(); await said();

// ---------------------------------------------------------------- the epilogue: the shield crew
iso('the epilogue by its flags (dinner over, Vesk pulled clear), on Citadel beside the collar');
const e = await ev(([D]) => {
  setChapter('home', D);
  const G = game, c = atCollar(), out = {};
  out.down = P.use(c.x, c.z, { kind: 'dp_down', near: 0.5, match: 9 }).r; out.room = G.room?.id;
  out.guard = here('dp_guard'); out.gTalk = out.guard ? P.talk('dp_guard').r : 'absent';
  out.deep = P.exitTo('c3-deep').to;
  const n = G.npcs.find((q) => q.def.id === 'dp_tolli'); out.tolli = here('dp_tolli');
  let moved = 0, p = n ? [n.pos.x, n.pos.z] : [0, 0]; for (let k = 0; n && k < 250; k++) { G.step(0.1); moved += Math.hypot(n.pos.x - p[0], n.pos.z - p[1]); p = [n.pos.x, n.pos.z]; }
  out.moved = +moved.toFixed(1); out.tTalk = out.tolli ? P.talk('dp_tolli').r : 'absent';
  out.lamp = G.room.hoist?.open; out.hoist = lookAt('hoist').r; out.cons = lookAt('console').r; out.diag = lookAt('diagram').r;
  out.enemies = G.enemies.filter((x) => x.present && x.alive && Math.hypot(x.pos.x - G.room.center.x, x.pos.z - G.room.center.z) < 20).length;
  out.gallery = P.exitTo('c3-gallery').to;
  // (ISO: the stones' hops are the playthrough's and jumpreach's: put on the far shelf where the raised stones end)
  { const st = G.room.stones.sets.flat(), c0 = st[2].c, top = st[0].top, h = G.hero; out.stonesUp = st.every((q) => q.c.enabled); h.pos.set(c0.x + 6.2, top, c0.z - 1.9); h.vy = 0; h.onGround = true; G.step(0.3); }
  out.sendell = P.exitTo('c3-sendell').to;
  out.pool = G.room?.id === 'c3sendell' ? lookAt('pool').r : 'not there';
  out.core = P.exitTo('c3-core').to; out.music = G.room?.music; out.shield = G.room?.drill?.mode;
  out.sala = here('dp_sala'); out.sTalk = out.sala ? P.talk('dp_sala').r : 'absent';
  out.vcons = G.room?.id === 'c3core' ? lookAt('vconsole').r : 'not there';
  return out;
}, [DONE]);
const l5 = await said();
check('the epilogue: after dinner the collar leads down by input; Guard Harl keeps the lift and talks', e.down === 'used' && e.room === 'c3shaft' && e.guard && e.gTalk === 'talked' && l5.some((l) => /in chains/.test(l)), { e, l5: l5.slice(0, 3) });
check('the epilogue, the deep installation: Tolli of the shield crew on a round (moves with Twinsen in the room), talks of Vesk\'s note (he was pulled clear); no enemies', e.deep === 'c3deep' && e.tolli && e.moved > 1.5 && e.tTalk === 'talked' && e.enemies === 0 && l5.some((l) => /note from his cell/.test(l)), e);
check('the epilogue: the hoist\'s lamp is green and it reads; the console reads SHIELD; the diagram has its chalked line', e.lamp === true && e.hoist === 'used' && e.cons === 'used' && e.diag === 'used' && l5.some((l) => /green again/.test(l)) && l5.some((l) => /MODE: SHIELD/.test(l)) && l5.some((l) => /SHIELD LOOP/.test(l)), { e, l5 });
check('the epilogue: the galleries\' stones stay raised (ISO across them), on to Sendell\'s chamber (her pool reads asleep), on to the core: no boss music, the bore a shield; Sala reads the field below Vesk\'s burnt console and talks', e.gallery === 'c3gallery' && e.stonesUp && e.sendell === 'c3sendell' && e.pool === 'used' && e.core === 'c3core' && e.music !== 'boss' && e.shield === 'shield' && e.sala && e.sTalk === 'talked' && e.vcons === 'used' && l5.some((l) => /breathing/.test(l)) && l5.some((l) => /Zeelich's half/.test(l)) && l5.some((l) => /burnt black/.test(l)), { e, l5: l5.slice(-6) });

// a save in the deep installation (the epilogue) → Continue
iso('back to the deep installation by the room\'s own scene change (the walk back is the same rooms), then a save there');
await ev(() => { const G = game; G.enterRoom('c3deep', null, true); P.settle(); G.step(0.5); G.save(false); });
const file = path.join(os.tmpdir(), 'under-bar-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await browser.close();
({ browser, context, page } = await launch({ storageState: file }));
await open(page, '?nocine'); await menu(page, 'continue');
const back = await ev(() => {
  const G = game, h = G.hero.pos; P.settle(); for (let i = 0; i < 30; i++) G.step(0.1);
  const n = G.npcs.find((q) => q.def.id === 'dp_tolli'), R = G.room;
  const r = { room: R?.id, chapter: G.flags.chapterKey, floor: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15, tolli: !!n?.present && !!R && Math.hypot(n.pos.x - R.center.x, n.pos.z - R.center.z) < 14, lamp: R?.hoist?.open };
  const s = P.exitTo('c3-shaft'), u = P.exitTo('c3-up');
  return { ...r, shaft: s.to, up: u.to, state: G.state };
});
check('the epilogue: a save in the deep installation → Continue: back there on the floor, Tolli at work, the hoist green; out by the shaft and up the lift to Citadel', back.room === 'c3deep' && back.chapter === 'home' && back.floor && back.tolli && back.lamp === true && back.shaft === 'c3shaft' && back.up === 'citadel' && back.state === 'play', back);
fs.rmSync(file, { force: true });

done();
await browser.close();
