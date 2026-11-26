// HAMALAYI-LIFE (the Hamalayi at Citadel's bar: docs/lba-maturity/hamalayi-inventory.md): the monastery's hall, Lhar's
// houses and their people by the story's phase (src/game/story/hamlife.js, src/game/hamrooms.js).
//   - chapter 6: the hall's door leads in from the porch by input; Brother Tenpa keeps it and talks; the prayer wheel
//     turns, a cup of tea gives life back, the altar reads; out again in front of the door, facing the yard. Lhar packs:
//     bundles by the doors, hearths lit, chimneys smoking; the notice board reads the moving day
//   - chapter 6 once the village is up (and chapter 7): Lhar's chimneys stop, its hearths are low, a house's own look
//     says it stands empty; the villagers' bedrolls lie in the hall
//   - chapter 8: Bero, Sana and Lhamo are in their houses (their outdoor selves away), dressed as outdoors, at work on a
//     round; Yorna is in her own house, Sefa in his; the observatory's door is shut with its own line and a slate on it
//   - a save inside Bero's house comes back there with Bero in it, and the door leads out
//   - a save with only a later chapter's key (an old save): the village is at the monastery, not in Lhar's square
//   - the epilogue: Old Dorje in his corner, every chimney smoking
//   - a death in the Hamalayi: Game Over, Retry, back in play in the Hamalayi with full life
// ISO (logged): chapters by their flags; he is put 2.6 m before each door (the walk in and out is by input).
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
let { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const DONE6 = { c6_started: true, c6_bridge: true, c6_lhar: true, c6_yorna: true, c6_heat: true, c6_thawed: true, c6_liftReady: true, c6_sword: true, c6_rope: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true };
const DONE7 = { c7_started: true, c7_keeper: true, c7_lit: true, c7_sendell: true, c7_scope: true, c7_droneDown: true, c7_vent: true, c7_done: true };

const boot = async () => {
  await open(page, '?nocine'); await menu(page, 'new');
  await ev(() => {
    window.setChapter = (key, flags) => {
      const G = game, f = G.flags;
      for (const k of Object.keys(f)) if (/^c\d+_/.test(k)) delete f[k];
      Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, chapter: G.story.chapters.findIndex((c) => c.key === key), c1_water: true, c1_done: true }, flags);
      G.hero.hasBall = true; G.regions.ensure('hamalayi', 'test');
      G.story.applyFlags(); G.step(0.2);
      if (G.room?.id !== 'hamalayi') { G.enterRoom('hamalayi', G.rooms.hamalayi.spawn, true); P.settle(); }
      G.story.refreshCast(); G.step(0.6);
    };
    // out to the Hamalayi (by the room's own exit), then before a door 2.6 m out and in by input
    window.outside = () => { const G = game; if (G.room?.id !== 'hamalayi') { const e = G.room?.exits?.find((x) => !x.room) || G.room?.exits?.[0]; if (e) P.through(e.x, e.z); } return G.room?.id; };
    window.inBy = (room) => {
      const G = game, M = G.rooms.hamalayi; outside();
      const d = G.story.doors().find((q) => q.room === room); if (!d) return { to: 'no door' };
      const sd = room === 'ham_hall' ? M.monastery.hall : M.shutDoors.find((q) => q.id === d.house);
      const a = sd.ry ?? 0, sx = sd.sill.x + Math.sin(a) * 2.6, sz = sd.sill.z + Math.cos(a) * 2.6;
      G.hero.pos.set(sx, G.physics.groundAt(sx, sz, 60), sz); G.hero.angle = a + Math.PI; G.hero.vy = 0; P.settle();
      const t = P.through(d.x, d.z); for (let i = 0; i < 30; i++) G.frame(1 / 30, false);
      const h = G.hero.pos;
      return { to: t.to, room: G.room?.id, floor: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 };
    };
    window.here = (id) => { const G = game, n = G.npcs.find((q) => q.def.id === id), R = G.room; return !!n?.present && !!R && Math.hypot(n.pos.x - R.center.x, n.pos.z - R.center.z) < 8; };
  });
};
await boot();

// ---------------------------------------------------------------- chapter 6, moving day
iso('chapter 6 by its flags (c6_started): the village packs');
await ev(() => setChapter('pass', { c6_started: true }));
await said();
const h1 = await ev(() => {
  const G = game, M = G.rooms.hamalayi, i = inBy('ham_hall'), R = G.room;
  let meshes = 0, lights = 0; R?.group?.traverse((m) => { if (m.isMesh) meshes++; if (m.isLight) lights++; });
  const monk = here('hl_monk');
  const talk = monk ? P.talk('hl_monk').r : 'absent';
  G.hero.hp = Math.max(1, G.hero.maxHp - 4); const hp0 = G.hero.hp;
  const tea = P.use(R.tea.x, R.tea.z, { near: 1.2, kind: 'hl_tea' }); const hp1 = G.hero.hp;
  const wheel = P.use(R.wheel.x, R.wheel.z, { near: 1.2, kind: 'hl_wheel' });
  const altar = P.use(R.altar.x, R.altar.z, { near: 1.4, kind: 'hl_look' });
  // the monk's round: he moves in 25 s with Twinsen standing in the room
  const nm = G.npcs.find((q) => q.def.id === 'hl_monk'); let dist = 0, p = [nm.pos.x, nm.pos.z];
  for (let k = 0; k < 250; k++) { G.step(0.1); dist += Math.hypot(nm.pos.x - p[0], nm.pos.z - p[1]); p = [nm.pos.x, nm.pos.z]; }
  const e = R.exits.find((x) => !x.room); const t = P.through(e.x, e.z); for (let k = 0; k < 20; k++) G.frame(1 / 30, false);
  const h = G.hero.pos, sill = M.monastery.hall.sill;
  return { ...i, meshes, lights, monk, talk, hp0, hp1, tea: tea.r, wheel: wheel.r, altar: altar.r, roundM: +dist.toFixed(1), music: R.music,
    out: t.to, near: +Math.hypot(h.x - sill.x, h.z - sill.z).toFixed(2), away: +Math.cos(Math.atan2(h.x - sill.x, h.z - sill.z) - G.hero.angle).toFixed(2), ground: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 };
});
const l1 = await said();
check('chapter 6: the monastery hall\'s door leads in by input (on its floor, furnished, lit, its own music)', h1.room === 'ham_hall' && h1.floor && h1.meshes >= 20 && h1.lights >= 2 && h1.music === 'mountain', h1);
check('chapter 6: Brother Tenpa keeps the hall, on a round (he moves with Twinsen in the room), and talks', h1.monk && h1.talk === 'talked' && h1.roundM > 1.5 && l1.some((l) => /soup is on/.test(l)), { h1, l1: l1.slice(0, 4) });
check('chapter 6: the hall\'s tea gives life back, the wheel turns, the altar reads (each its own line)', h1.hp1 === Math.min(h1.hp0 + 2, 99) && h1.hp1 > h1.hp0 && h1.tea === 'used' && h1.wheel === 'used' && h1.altar === 'used' && l1.some((l) => /Butter tea/.test(l)) && l1.some((l) => /big wheel/.test(l)) && l1.some((l) => /Sendell's shrine/.test(l)), { h1, l1 });
check('chapter 6: out of the hall he stands before its door on the porch, facing the yard, on the ground', h1.out === 'hamalayi' && h1.near < 2.8 && h1.away > 0.3 && h1.ground, h1);
const p1 = await ev(() => {
  const G = game, M = G.rooms.hamalayi, smoke = Object.entries(M.chimneys).filter(([k]) => k.startsWith('ham-lhar')).map(([, v]) => !v.off);
  const i = inBy('ih_ham_lhar3'), R = G.room, pack = R._hl?.shown === 'pack';
  const light = R.lights.reduce((s, l) => s + l.intensity, 0);
  outside(); const o = M.group.position; G.hero.pos.set(o.x - 8.2, G.physics.groundAt(o.x - 8.2, 1.3, 60), 1.3); G.hero.angle = Math.PI; P.settle();
  const n = P.use(o.x - 8.2, 0.1, { near: 1.2, kind: 'hl_notice' });
  return { smoke, room: i.room, pack: !!pack, light: +light.toFixed(2), notice: n.r };
});
const l2 = await said();
check('chapter 6, moving day: every chimney of Lhar smokes; Bero\'s house has its bundles by the door and its hearth lit; the notice board reads the moving day', p1.smoke.length === 5 && p1.smoke.every(Boolean) && p1.room === 'ih_ham_lhar3' && p1.pack && p1.light > 3 && p1.notice === 'used' && l2.some((l) => /MOVING DAY/.test(l)), { p1, l2 });

// ---------------------------------------------------------------- chapter 7: Lhar empty
iso('chapter 7 by its flags (chapter 6 done, c7_started)');
await ev(([D]) => setChapter('observatory', { ...D, c7_started: true }), [DONE6]);
await said();
const c7 = await ev(() => {
  const G = game, M = G.rooms.hamalayi, smoke = Object.entries(M.chimneys).filter(([k]) => k.startsWith('ham-lhar')).map(([, v]) => !v.off);
  const i = inBy('ih_ham_lhar3'), R = G.room, light = R.lights.reduce((s, l) => s + l.intensity, 0);
  return { smoke, room: i.room, light: +light.toFixed(2), yorna: (() => { const n = G.npcs.find((q) => q.def.id === 'yorna'); return [n.present, +(n.pos.x - M.group.position.x).toFixed(0), +n.pos.z.toFixed(0)]; })() };
});
const look = await ev(async () => { const G = game, { IH } = await import(location.origin + '/src/game/ihomes.js'), l = IH[G.room.id].looks[0]; P.go(l.x, l.z, { tol: 0.35, maxT: 20, fight: false }); P.face(l.at.x, l.at.z); const tg = P.target(); if (tg?.kind !== 'ihlook') return 'no prompt'; P.tap('KeyE', 0.1); P.settle(); return 'read'; });
const l3 = await said();
const hallG = await ev(() => { inBy('ham_hall'); const R = game.room; return { room: R.id, guests: !!R.guests }; });
check('chapter 7: Lhar stands empty: no chimney smokes, Bero\'s hearth is low, his house\'s own look says so', c7.smoke.every((s) => !s) && c7.room === 'ih_ham_lhar3' && c7.light < 3 && look === 'read' && l3.some((l) => /crack runs up the back wall/.test(l)), { c7, look, l3 });
check('chapter 7: the villagers\' bedrolls lie in the monks\' hall; Yorna is at the monastery (x > 25), not in Lhar', hallG.guests && c7.yorna[0] && c7.yorna[1] > 25, { hallG, yorna: c7.yorna });

// ---------------------------------------------------------------- chapter 8: Lhar mended by day
iso('chapter 8 by its flags (chapters 6 and 7 done, c8_started): the vent is open');
await ev(([D6, D7]) => setChapter('evacuation', { ...D6, ...D7, c8_started: true }), [DONE6, DONE7]);
await said();
const c8 = await ev(() => {
  const G = game, out = {};
  const away = (id) => { const n = G.npcs.find((q) => q.def.id === id); return n?.away === 'story' || !n?.present; };
  const col = (id) => { const n = G.npcs.find((q) => q.def.id === id); const a = n?.rig?.mesh?.geometry?.attributes?.color; return a ? [a.getX(0), a.getY(0), a.getZ(0), a.getX(a.count >> 1)].map((v) => +v.toFixed(3)).join() : 'none'; };
  for (const [id, room, of] of [['hl_bero', 'ih_ham_lhar3', 'lh_bero'], ['hl_sana', 'ih_ham_lhar4', 'lh_sana'], ['hl_lhamo', 'ih_ham_lhar0', 'lh_mira'], ['yorna', 'ih_ham_lhar1', null], ['keeper', 'ih_ham_obs0', null]]) {
    const i = inBy(room), n = G.npcs.find((q) => q.def.id === id);
    let d = 0, p = n ? [n.pos.x, n.pos.z] : [0, 0];
    for (let k = 0; k < 200 && n; k++) { G.step(0.1); d += Math.hypot(n.pos.x - p[0], n.pos.z - p[1]); p = [n.pos.x, n.pos.z]; }
    const t = n ? P.talk(id).r : 'absent';
    out[id] = { room: i.room, set: G.room?._hl?.shown ?? null, here: here(id), moved: +d.toFixed(1), talk: t, outAway: of ? away(of) : null, dress: of ? col(id) === col(of) : null };
  }
  outside();
  const M = G.rooms.hamalayi, d = M.observatory.door;
  G.hero.pos.set(d.x, G.physics.groundAt(d.x, d.z + 0.8, 60), d.z + 0.8); G.hero.angle = Math.PI; P.settle(); G.step(0.2);
  const it = G.findInteractable(); if (it?.kind === 'hl_obs') { G.story.interact(it); P.settle(); }
  out.obs = { kind: it?.kind, sign: !!M._hlSign?.visible, door: G.story.doors().some((q) => q.room === 'obsv') };
  return out;
});
const l4 = await said();
for (const id of ['hl_bero', 'hl_sana', 'hl_lhamo']) check(`chapter 8: ${id.slice(3)} is at home (in the room among the mending's things, at work on a round, talks); the outdoor self is away; one dress indoors and out`, c8[id].set === 'mend' && c8[id].room && c8[id].here && c8[id].moved > 0.5 && c8[id].talk === 'talked' && c8[id].outAway && c8[id].dress, c8[id]);
check('chapter 8: Yorna sits in her own house, Sefa in his (both talk)', c8.yorna.here && c8.yorna.talk === 'talked' && c8.keeper.here && c8.keeper.talk === 'talked', { yorna: c8.yorna, keeper: c8.keeper });
check('chapter 8: the observatory\'s door is shut with its own line and a slate on it (no story door to it)', c8.obs.kind === 'hl_obs' && c8.obs.sign && !c8.obs.door && l4.some((l) => /SEFA, NEXT DOOR/.test(l)) && !l4.some((l) => /^Locked\.?$/.test(l)), { obs: c8.obs, l4: l4.slice(-3) });
check('chapter 8: the lines are their own (Bero\'s mending, Sana\'s flags, Lhamo\'s menders, Yorna\'s ledger, Sefa\'s crystal)', [/Grandfather built well|home a bit/, /New flags|knots/, /Menders|own stove/, /packing up|ledger/, /crystal|snow stays/].every((re) => l4.some((l) => re.test(l))), l4);

// a save inside Bero's house comes back there, Bero in it, and the door leads out
await ev(() => { inBy('ih_ham_lhar3'); P.settle(); game.save(false); });
const file = path.join(os.tmpdir(), 'hamalayi-life-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await browser.close();
({ browser, context, page } = await launch({ storageState: file }));
await open(page, '?nocine'); await menu(page, 'continue');
const back = await ev(() => { const G = game, h = G.hero.pos; P.settle(); for (let i = 0; i < 30; i++) G.step(0.1);
  const n = G.npcs.find((q) => q.def.id === 'hl_bero'), R = G.room;
  const r = { room: R?.id, chapter: G.flags.chapterKey, floor: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15, bero: !!n?.present && !!R && Math.hypot(n.pos.x - R.center.x, n.pos.z - R.center.z) < 8 };
  const e = R?.exits?.find((x) => !x.room); const t = e ? P.through(e.x, e.z) : null; return { ...r, out: t?.to, state: G.state }; });
check('chapter 8: a save inside Bero\'s house → Continue: back in it on the floor, Bero at his mending; its door leads out onto the Hamalayi', back.room === 'ih_ham_lhar3' && back.floor && back.bero && back.out === 'hamalayi' && back.state === 'play', back);
fs.rmSync(file, { force: true });
await ev(() => {
  window.setChapter = (key, flags) => {
    const G = game, f = G.flags;
    for (const k of Object.keys(f)) if (/^c\d+_/.test(k)) delete f[k];
    Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, chapter: G.story.chapters.findIndex((c) => c.key === key), c1_water: true, c1_done: true }, flags);
    G.regions.ensure('hamalayi', 'test'); G.story.applyFlags(); G.step(0.2);
    if (G.room?.id !== 'hamalayi') { G.enterRoom('hamalayi', G.rooms.hamalayi.spawn, true); P.settle(); }
    G.story.refreshCast(); G.step(0.6);
  };
  window.inBy = (room) => {
    const G = game, M = G.rooms.hamalayi; if (G.room?.id !== 'hamalayi') { G.enterRoom('hamalayi', M.spawn, true); P.settle(); }
    const d = G.story.doors().find((q) => q.room === room); if (!d) return { to: 'no door' };
    const sd = room === 'ham_hall' ? M.monastery.hall : M.shutDoors.find((q) => q.id === d.house);
    const a = sd.ry ?? 0, sx = sd.sill.x + Math.sin(a) * 2.6, sz = sd.sill.z + Math.cos(a) * 2.6;
    G.hero.pos.set(sx, G.physics.groundAt(sx, sz, 60), sz); G.hero.angle = a + Math.PI; G.hero.vy = 0; P.settle();
    const t = P.through(d.x, d.z); for (let i = 0; i < 30; i++) G.frame(1 / 30, false);
    return { to: t.to, room: G.room?.id };
  };
  window.here = (id) => { const G = game, n = G.npcs.find((q) => q.def.id === id), R = G.room; return !!n?.present && !!R && Math.hypot(n.pos.x - R.center.x, n.pos.z - R.center.z) < 8; };
});

// ---------------------------------------------------------------- old saves: only a later chapter's key
iso('chapter 7 and chapter 10 by their key only (an old save): no chapter 6 flags');
const old = await ev(() => {
  const G = game, M = G.rooms.hamalayi, out = {};
  for (const key of ['observatory', 'network']) {
    setChapter(key, {});
    out[key] = Object.fromEntries(['yorna', 'pim', 'lhar1', 'lhar2', 'lhar3'].map((id) => { const n = G.npcs.find((q) => q.def.id === id); return [id, n.present ? +(n.pos.x - M.group.position.x).toFixed(0) : null]; }));
  }
  return out;
});
check('a save with only chapter 7\'s or 10\'s key: Yorna, Pim and the three are at the monastery (x > 25), not in Lhar\'s square', Object.values(old).every((o) => Object.entries(o).every(([id, x]) => x === null ? id === 'pim' : x > 25)), old);

// ---------------------------------------------------------------- the epilogue
iso('the epilogue by its flags (ep_dinner, ep_free)');
await ev(() => setChapter('home', { ep_dinner: true, ep_free: true }));
await said();
const ep = await ev(() => {
  const G = game, M = G.rooms.hamalayi, smoke = Object.entries(M.chimneys).filter(([k]) => k.startsWith('ham-lhar')).map(([, v]) => !v.off);
  const i = inBy('ih_ham_lhar2'), t = here('hl_dorje') ? P.talk('hl_dorje').r : 'absent', old = G.npcs.find((q) => q.def.id === 'lh_old');
  return { smoke, room: i.room, dorje: here('hl_dorje'), talk: t, outAway: old?.away === 'story' || !old?.present };
});
const l5 = await said();
check('the epilogue: Lhar lived in again (every chimney); Old Dorje in his own corner (not outdoors as well), talking', ep.smoke.every(Boolean) && ep.room === 'ih_ham_lhar2' && ep.dorje && ep.talk === 'talked' && ep.outAway && l5.some((l) => /My own fire/.test(l)), { ep, l5 });

// ---------------------------------------------------------------- a death in the Hamalayi, Retry
iso('chapter 7 by its flags; saved at the monastery yard; then 99 damage');
await ev(([D]) => { setChapter('observatory', { ...D, c7_started: true }); const G = game, Y = G.rooms.hamalayi.monastery.yard; G.hero.pos.set(Y.x, G.physics.groundAt(Y.x, Y.z + 3, 60), Y.z + 3); P.settle(); G.save(false); }, [DONE6]);
const dd = await ev(() => { const G = game, h = G.hero; h.clovers = 0; h.invuln = 0; h.damage(99, null); G.step(3); return { state: G.state }; });
check('a death in the Hamalayi: Game Over', dd.state === 'gameover', dd);
await page.click('#gameover [data-act="retry"]');
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 600000 });
await page.waitForFunction(() => game.state === 'play', null, { timeout: 120000 }).catch(() => {});
await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
const rt = await ev(() => { game.testFreeze = true; P.settle(); return { state: game.state, room: game.room?.id, hp: game.hero.hp, maxHp: game.hero.maxHp, chapter: game.flags.chapterKey }; });
check('Retry: back in play in the Hamalayi, chapter 7, life full', rt.state === 'play' && rt.room === 'hamalayi' && rt.chapter === 'observatory' && rt.hp === rt.maxHp, rt);

done();
await browser.close();
