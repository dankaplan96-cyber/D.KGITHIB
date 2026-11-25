// WAVE 4 (docs/lba-maturity/WAVE4.md; CONTENT-15H.md §3 H-9, H-10, H-11; src/game/story/wave4.js, wave4world.js): Arthur's
// boat against Lulu's, the letters filed as cargo, Raph's guitar. One covering suite, played by input where it says
// INPUT (tests/lib/player.js: walking, E, menu picks) from the campaign's own chapter-4 save (tests/fixtures/campaign/
// base-07-dig: format 5, made before wave 4), loaded through Continue as a player would:
//   A  H-9: the old save loads (format 6, no w4 state made up); Arthur at home (TALK): the hook; out of the house: Arthur
//      and Lulu at the garden pond; Lulu's boat looked at; Lulu (TALK): the first race watched (Arthur's leans and turns
//      into the wind); a race at once without a keel (lost: it leans); the keel asked for before Lulu's boat was looked at
//      (Twinsen's hint), Lulu's boat again: the keel weight; the keel fitted; the sail pulled in tight (lost: circles); the
//      harbour flags read (E) at the pier's root; the sail let all out (lost: drifts); Save & quit → Continue (keel and
//      sail kept, Arthur at the pond); half out: the win, Lulu's 10 kashes; Arthur at home and Lulu after
//   B  H-10: Tellem in the hostel (TALK); the sack by the customs booth (E); Odile (TALK): the form, a wrong answer
//      (Otringal) and her line, again, Knartas: the sack (found); Knartas: Mila (TALK): a clover leaf, 15 kashes, her
//      letter; Tem; Citadel: Tellem gets Mila's letter
//   C  H-11: the tavern: Old Fenn (TALK), the postcard behind the bar (E); Tralu's cave: the case taken (E, found);
//      Otringal: Sim (TALK) in the bar; Raph outside its door (TALK) with the borrowed harp, then the case: his guitar,
//      20 kashes; Madam Orla's lens price with Raph's word (the price function, chapter 9's state set by flags: ISO)
//   D  the ending (ISO: the chapter key set to 'home'): Arthur at the pier (TALK): the boat's lamp blinks; a wrong
//      answer (the boat blinks all over, his line); watched again, the right one: the boat comes in, his clover leaf;
//      Raph by the lighthouse door (TALK)
// ISO (logged): the travel between regions is travel.mjs's (here: put in the region by the travel network's own move);
// chapter D's state is set by flags. ONLY=A..D runs a part (the state before it set by its flags, logged). SHOTS=dir
// writes the pictures (the play camera; before/after pairs where something visible changes: the before frame is the
// same frame with this wave's pieces hidden). SERVE=1 answers this checkout's files by request routing.
// Automated runtime only (SwiftShader, headless Chromium): no listening, no hardware figure.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = fileURLToPath(new URL('./fixtures/campaign/base-07-dig.save.json', import.meta.url));
const ONLY = process.env.ONLY || 'ABCD';
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
// a before/after pair of the same frame: `hide` (page code) hides this wave's pieces for the before
const pair = async (n, hide) => { if (!SHOTS) return; await ev(hide, true); await shot(n + '-before'); await ev(hide, false); await shot(n + '-after'); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const W4m = await import('/src/game/wave4world.js'); window.W4 = W4m.W4;
  const W4s = await import('/src/game/story/wave4.js'); window.PIER = W4s.PIER;
  window.W = () => game.story.w4;
  window.w4 = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('w4')));
  window.r2 = (v) => +(+v).toFixed(2);
  window.at = (id) => { const n = P.npc(id); return n?.present ? { x: r2(n.pos.x), z: r2(n.pos.z), room: P.sceneOf(n.pos.x, n.pos.z) } : null; };
  // into a region by the travel network's own move (ISO): Citadel by its outdoor spot, an island on its pad
  window.toCit = (x, z, a = 0) => { const G = game; if (G.room) G.exitRoom({ x, z, a }, true); P.settle(); G.story.refreshCast(); G.step(0.3); P.settle(); };
  window.toIsle = (n) => { const G = game, reg = 'isle_' + n; G.regions.ensure(reg, 'test'); const R = G.rooms[reg]; G.enterRoom(reg, R.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.3); return R; };
  window.setW4 = (o) => { const f = game.flags; for (const k of Object.keys(f)) if (k.startsWith('w4')) delete f[k]; Object.assign(f, o); game.story.applyFlags(); game.story.refreshCast(); game.step(0.3); P.settle(); };
  window.aboat = () => W4.boats.arthur.pos;
  window.lboat = () => W4.boats.lulu.pos;
  // a race asked of Lulu at the pond (TALK, the pick "Race now"): played out, its lines read
  window.race = () => { const k = P.talk('lulu'); const menu = game.state === 'shop'; const pick = menu ? P.menuPick(0) : { r: 'no menu' }; P.settle(); return { k: k.r, menu, pick: pick.r }; };
  // Arthur's boat (E at the pond): the fix menu, a pick by its id
  window.fix = (id) => { const A = aboat(); const u = P.use(A.x, A.z, { kind: 'w4b_aboat', near: 1.0, match: 2.2 }); const items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent); const i = { keel: 'Fit a keel weight', tight: 'Sail: pulled in tight', half: 'Sail: half out', free: 'Sail: all the way out' }[id]; const n = items.indexOf(i); const p = n >= 0 ? P.menuPick(n) : { r: 'no item ' + i }; P.settle(); return { u: u.r, items, pick: p.r }; };
});
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
};
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};

// ================================================================ the old save
const st = JSON.parse(fs.readFileSync(FIX, 'utf8'));
const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
await helpers(); await said();
const a0 = await ev(() => ({ v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, chapter: game.flags.chapterKey, w4: Object.keys(w4()), boats: !!W4.boats, toy: game.world.life.toyBoat?.visible, raph: !!P.npc('w4_raph') }));
check('the campaign\'s chapter-4 save from before wave 4 (format 5) loads through Continue: format 6, chapter 4, in play, no w4 state made up; Arthur\'s boat has taken the toy boat\'s place on the pond; Raph is in the cast', a0.v === 6 && a0.state === 'play' && a0.chapter === 'dig' && a0.w4.length === 0 && a0.boats && a0.toy === false && a0.raph, a0);

// ================================================================ A · H-9 Arthur's boat against Lulu's
if (ONLY.includes('A')) {
  iso('to Citadel by the travel network\'s own move: put in the garden west of the house');
  const a1 = await ev(() => { toCit(-52.5, 82.5, Math.PI / 2); const out = []; let k; for (let i = 0; i < 3 && !game.flags.w4b_hook; i++) { k = P.talk('arthur'); out.push(k.r); } return { k: k.r, talks: out, hook: game.flags.w4b_hook ?? 0, room: game.room?.id }; });
  const a1l = await said();
  check('A: Arthur at home (TALK, INPUT: into the house; his own gift first if one is due — TALK-ORDER — then again): Lulu\'s boat beats his every time; she is at the pond: come and watch', a1.k === 'talked' && a1.hook === 1 && a1.room === 'house' && has(a1l, /beats mine every single time/) && has(a1l, /Come and watch/), { a1, a1l });
  const a2 = await ev(() => { const e = game.room?.exits?.find((x) => !x.room) || game.room?.exits?.[0]; if (e) P.through(e.x, e.z); P.settle(); const P0 = W4.pond; return { room: game.room?.id ?? 'citadel', arthur: at('arthur'), lulu: at('lulu'), dA: r2(Math.hypot(P.npc('arthur').pos.x - P0.x, P.npc('arthur').pos.z - P0.z)), dL: r2(Math.hypot(P.npc('lulu').pos.x - P0.x, P.npc('lulu').pos.z - P0.z)), lboat: W4.boats.lulu.group.visible }; });
  check('A: out of the house (INPUT): Arthur and Lulu stand by the garden pond (2–2.5 m from its middle), Lulu\'s boat on the rim', a2.room === 'citadel' && a2.dA < 2.6 && a2.dL < 2.6 && a2.lboat, a2);
  await ev(() => { const P0 = W4.pond; P.go(P0.x + 1.6, P0.z + 2.4, { tol: 0.5 }); P.face(P0.x, P0.z - 1); P.settle(); });
  await pair('wave4-01-pond', (h) => { W4.boats.arthur.visible(!h); W4.boats.lulu.visible(!h); game.world.life.toyBoat.visible = h; for (const id of ['arthur', 'lulu']) if (h) P.npc(id).rig.root.visible = false; else P.npc(id).rig.root.visible = true; });
  const a3 = await ev(() => { const L = lboat(); const u = P.use(L.x, L.z, { kind: 'w4b_lboat', near: 0.9, match: 2 }); return { u: u.r, keel: !!game.flags.w4b_keelSeen }; });
  const a3l = await said();
  check('A: Lulu\'s boat on the rim (E) before the race: a look, nothing learnt yet', a3.u === 'used' && !a3.keel && has(a3l, /pink hull/), { a3, a3l });
  // the first race: E on Lulu, her "go", a moment into the race for the picture, then to its end
  const a4 = await ev(() => { const n = P.npc('lulu'); P.go(n.pos.x + 0.9, n.pos.z + 1.3, { tol: 0.4 }); P.face(n.pos.x, n.pos.z); const tg = P.target(); P.tap('KeyE', 0.1); let k = 0; while (game.state === 'dialog' && k++ < 10) P.tap('KeyE', 0.15); const st = game.state, race = !!W().race; game.step(2.6); return { tg: tg?.id, st, race, kind: W().race?.kind }; });
  await shot('wave4-02-race-watched');
  const a4b = await ev(() => { P.settle(); return { seen: !!game.flags.w4b_seen, state: game.state, cam: !game.camRig.override }; });
  const a4l = await said();
  check('A: Lulu (TALK): "Three, two, one... go!" — the first race played out (a scene, the camera over the pond): Arthur\'s boat leans and turns into the wind, Lulu\'s runs straight; Twinsen says so; back in play', a4.tg === 'lulu' && a4.st === 'cutscene' && a4.race && a4.kind === 'heel' && a4b.seen && a4b.state === 'play' && a4b.cam && has(a4l, /leans over in every gust/), { a4, a4b, a4l });
  const a5 = await ev(() => { const r = race(); return { ...r, won: !!game.flags.w4b_won, tries: game.flags.w4b_tries ?? 0 }; });
  const a5l = await said();
  check('A: a race at once, nothing changed (TALK, "Race now"): lost the same way — "It still leans!", Twinsen: he should look at Lulu\'s; no kashes, nothing lost', a5.k === 'talked' && a5.menu && !a5.won && a5.tries === 1 && has(a5l, /It still leans/) && has(a5l, /look at hers/), { a5, a5l });
  const a6 = await ev(() => { const r = fix('keel'); return { ...r, keel: !!game.flags.w4b_keel }; });
  const a6l = await said();
  check('A: Arthur\'s boat (E, the menu): "Fit a keel weight" before Lulu\'s boat is understood: not done, Twinsen\'s hint', a6.u === 'used' && a6.items.includes('Fit a keel weight') && !a6.keel && has(a6l, /look at hers/), { a6, a6l });
  const a7 = await ev(() => { const L = lboat(); const u = P.use(L.x, L.z, { kind: 'w4b_lboat', near: 0.9, match: 2 }); const r = fix('keel'); return { u: u.r, keelSeen: !!game.flags.w4b_keelSeen, ...r, keel: !!game.flags.w4b_keel }; });
  const a7l = await said();
  check('A: Lulu\'s boat again (E): a lump of lead under her hull, a keel weight; Arthur\'s boat (E, "Fit a keel weight"): a sinker from his box screwed under it', a7.u === 'used' && a7.keelSeen && a7.keel && has(a7l, /keel weight/) && has(a7l, /fishing sinker/), { a7, a7l });
  const a8 = await ev(() => { const r = fix('tight'); const q = race(); return { ...r, q, sail: game.flags.w4b_sail, won: !!game.flags.w4b_won }; });
  const a8l = await said();
  check('A: the sail pulled in tight (E, a pick) and a race: round in circles — "Too tight for a wind from the side"; lost, the settings kept', a8.sail === 'tight' && a8.q.menu && !a8.won && has(a8l, /round in circles/) && has(a8l, /Too tight/), { a8, a8l });
  const a9 = await ev(() => { const F = W4.flags[1]; const u = P.use(F.x, F.z, { kind: 'w4b_flag', near: 1.0, match: 2 }); return { u: u.r, wind: !!game.flags.w4b_wind, pos: [r2(game.hero.pos.x), r2(game.hero.pos.z)] }; });
  const a9l = await said();
  check('A: the harbour flags at the pier\'s root (INPUT: walked there, E): the pennants stream inland, the wind off the sea; across the pond is east to west: the wind from the side', a9.u === 'used' && a9.wind && has(a9l, /stream inland/) && has(a9l, /from the side/), { a9, a9l });
  await ev(() => { const F = W4.flags[0]; P.go(F.x + 3.2, F.z + 3.5, { tol: 0.5 }); P.face(F.x - 2, F.z - 2); P.settle(); });
  await pair('wave4-03-harbour-flags', (h) => { for (const o of game.world.root.children) if (o.name === 'wave4 harbour') o.visible = !h; });
  const a10 = await ev(() => { const r = fix('free'); const q = race(); return { ...r, q, sail: game.flags.w4b_sail, won: !!game.flags.w4b_won }; });
  const a10l = await said();
  check('A: back at the pond (INPUT), the sail let all the way out and a race: it drifts sideways, the sail only flapping; lost', a10.sail === 'free' && !a10.won && has(a10l, /going sideways/) && has(a10l, /flapping/), { a10, a10l });
  iso('Save & quit through the pause menu by the pond, then Continue (as a player)');
  await saveQuit(); await reboot();
  const a11 = await ev(() => { const P0 = W4.pond; return { keel: !!game.flags.w4b_keel, sail: game.flags.w4b_sail, room: game.room?.id ?? 'citadel', dA: r2(Math.hypot(P.npc('arthur').pos.x - P0.x, P.npc('arthur').pos.z - P0.z)), keelOn: W4.boats.arthur.group.children[0].children.filter((c) => c.type === 'Group')[1]?.visible ?? null, race: !!W().race }; });
  check('A: Save & quit → Continue by the pond: the keel and the sail\'s setting kept (on the boat too), Arthur at the pond, no race under way', a11.keel && a11.sail === 'free' && a11.room === 'citadel' && a11.dA < 2.6 && a11.keelOn === true && !a11.race, a11);
  const a12 = await ev(() => { const c0 = game.hero.coins; fix('half'); const k = P.talk('lulu'); const el = document.querySelector('#shop .item[data-i="0"]'); el?.click(); game.step(0.1); const pick = el ? 'picked' : 'no menu'; let n = 0; while (game.state === 'dialog' && n++ < 10) P.tap('KeyE', 0.15); game.step(3.2); return { k: k.r, pick: pick.r, c0, kind: W().race?.kind }; });
  await shot('wave4-04-race-won');
  const a12b = await ev((c0) => { P.settle(); return { won: !!game.flags.w4b_won, coins: game.hero.coins - c0, lulu: at('lulu'), lboat: W4.boats.lulu.group.visible }; }, a12.c0);
  const a12l = await said();
  check('A: the sail half out (E, a pick) and the race (TALK, "Race now"): Arthur\'s boat wins by a nose — "I won!"; Lulu pays her bet: 10 kashes and her secret', a12.kind === 'win' && a12b.won && a12b.coins === 10 && has(a12l, /I won/) && has(a12l, /right under the mast/), { a12, a12b, a12l });
  const a13 = await ev(() => { const ar = at('arthur'); const k1 = P.talk('lulu'); const k2 = P.talk('arthur'); return { ar, k1: k1.r, k2: k2.r, room: game.room?.id, j: game.story.journal().find((s) => /Arthur's boat/.test(s.title))?.lines.map((l) => l.done) }; });
  const a13l = await said();
  check('A: afterwards Arthur is at home again (TALK, INPUT into the house: "The weight stays on forever"), Lulu: "Best of five"; the journal\'s section all done', a13.ar?.room === 'house' && a13.k1 === 'talked' && a13.k2 === 'talked' && a13.room === 'house' && has(a13l, /Best of five/) && has(a13l, /stays on forever/) && a13.j?.every(Boolean), { a13, a13l });
}

// ================================================================ B · H-10 the letters filed as cargo
if (ONLY.includes('B')) {
  iso('to Citadel (outdoors), by the asylum');
  const b1 = await ev(() => { toCit(-52.5, 82.5, Math.PI / 2); const e = P.enter('asylum'); const k = P.talk('hs_worker2'); return { e: e.r, k: k.r, ask: !!game.flags.w4l_ask, room: game.room?.id }; });
  const b1l = await said();
  check('B: Tellem in the hostel (TALK, INPUT: into the asylum): he writes home every week, nothing arrives; the project sends the post with its cargo', b1.k === 'talked' && b1.ask && b1.room === 'asylum' && has(b1l, /Nothing arrives/) && has(b1l, /with its cargo/), { b1, b1l });
  const b2 = await ev(() => { const S = W4.sack; const u = P.use(S.x, S.z, { kind: 'w4l_sack', near: 1.0, match: 2 }); return { u: u.r }; });
  const b2l = await said();
  check('B: the mail sack by the customs booth (INPUT, E): CARGO, UNDECLARED; the top letter "To Mila, Knartas"', b2.u === 'used' && has(b2l, /To Mila, Knartas/), { b2, b2l });
  await ev(() => { const S = W4.sack; P.go(S.x + 3.2, S.z + 1.0, { tol: 0.5 }); P.face(S.x, S.z); P.settle(); });
  await pair('wave4-05-customs-sack', (h) => W4.sack.setOn(!h));
  // Odile: her crate may still be open (her own story): then she asks which, and "The letters" is picked
  const odile = () => ev(() => { const k = P.talk('odile'); let title = document.querySelector('#shop h2')?.textContent || ''; let which = null; if (game.state === 'shop' && /Officer Odile/.test(title)) { which = P.menuPick(1).r; P.settle(); title = document.querySelector('#shop h2')?.textContent || ''; } return { k: k.r, which, title, state: game.state, items: [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent) }; });
  const b3 = await odile();
  const b3p = await ev(() => { const r = P.menuPick(2); P.settle(); return { r: r.r, sack: !!game.flags.w4l_sack, wrong: game.flags.w4l_wrong ?? 0 }; });
  const b3l = await said();
  check('B: Officer Odile (TALK): the sack filed as CARGO, UNDECLARED; letters are correspondence, a different form — the form (one choice: deliver to); "Otringal" (a pick): wrong, her line, nothing lost', b3.k === 'talked' && b3.state === 'shop' && /Deliver to/.test(b3.title) && b3.items.length === 4 && !b3p.sack && b3p.wrong === 1 && has(b3l, /Letters are not cargo/) && has(b3l, /Read the envelopes/), { b3, b3p, b3l });
  const b4 = await odile();
  const b4p = await ev(() => { const r = P.menuPick(0); P.settle(); return { r: r.r, sack: !!game.flags.w4l_sack, item: game.story.items().some((i) => i.id === 'w4l_sack') }; });
  const b4l = await said();
  check('B: Odile again, the form: "Knartas" (a pick): stamped, "you are the post now"; the MAIL SACK received (the found box; in the pockets), gone from beside the booth', b4.k === 'talked' && b4p.sack && b4p.item && has(b4l, /you are the post now/), { b4, b4p, b4l });
  iso('to Knartas by the travel network (spaceship and shuttle: travel.mjs): put on its pad');
  const b5 = await ev(() => { toIsle('knartas'); const h = game.hero, c0 = h.coins, l0 = h.clovers; const k = P.talk('kn_mother'); return { k: k.r, given: !!game.flags.w4l_given, coins: h.coins - c0, clovers: h.clovers - l0, at9: l0 >= 9, reply: game.story.items().some((i) => i.id === 'w4l_reply'), sack: game.story.items().some((i) => i.id === 'w4l_sack') }; });
  const b5l = await said();
  check('B: Knartas: Mila (TALK, INPUT): the sack handed over — "Twelve weeks of them"; a clover leaf and 15 kashes (30 kashes at nine leaves); her letter for Tellem; the sack out of the pockets', b5.k === 'talked' && b5.given && !b5.sack && b5.reply && (b5.at9 ? b5.coins === 30 : b5.coins === 15 && b5.clovers === 1) && has(b5l, /Twelve weeks/), { b5, b5l });
  const b6 = await ev(() => { const k = P.talk('kn_kid'); return { k: k.r, remark: !!k.remark, over: game.remarks?.el?.textContent || '', done: !!game.flags.w4l_temAfter }; });
  const b6l = await said();
  check('B: Tem (TALK): his mother reads them out loud, even the soup ones (once: then his own lines again)', b6.k === 'talked' && b6.done && (has(b6l, /soup ones/) || /soup ones/.test(b6.over)), { b6, b6l });
  iso('back to Citadel by the travel network: put west of the house');
  const b7 = await ev(() => { toCit(-52.5, 82.5, Math.PI / 2); P.enter('asylum'); const k = P.talk('hs_worker2'); return { k: k.r, given: !!game.flags.w4l_replyGiven, reply: game.story.items().some((i) => i.id === 'w4l_reply'), j: game.story.journal().find((s) => /Letters home/.test(s.title))?.lines.map((l) => l.done) }; });
  const b7l = await said();
  check('B: Tellem (TALK): Mila\'s letter — "the boy has grown a whole head"; the letter out of the pockets; the journal\'s section all done', b7.k === 'talked' && b7.given && !b7.reply && has(b7l, /grown a whole head/) && b7.j?.every(Boolean), { b7, b7l });
}

// ================================================================ C · H-11 Raph's guitar
if (ONLY.includes('C')) {
  iso('to Citadel (outdoors), by the square');
  const c1 = await ev(() => { toCit(-52.5, 82.5, Math.PI / 2); const e = P.enter('tavern'); for (let i = 0; i < 40 && !P.npc('fenn')?.present; i++) game.step(0.5); const k = P.talk('fenn'); return { e: e.r, k: k.r, fenn: !!game.flags.w4r_fenn, room: game.room?.id }; });
  const c1l = await said();
  check('C: the tavern (INPUT: in by its door): Old Fenn (TALK) — Raph kept the lighthouse, went off-world, a postcard pinned behind the bar', c1.k === 'talked' && c1.fenn && c1.room === 'tavern' && has(c1l, /Pinned behind the bar/), { c1, c1l });
  const c2 = await ev(() => { const C = W4.card; const u = P.use(C.x, C.z, { kind: 'w4r_card', near: 0.8, match: 2 }); return { u: u.r, card: !!game.flags.w4r_card }; });
  const c2l = await said();
  check('C: the postcard behind the bar (E, across the counter): Otringal\'s harbour, "Four strings too many. Raph."; Twinsen: the case is in Tralu\'s cave', c2.u === 'used' && c2.card && has(c2l, /Four strings too many/) && has(c2l, /Tralu's cave/), { c2, c2l });
  await pair('wave4-06-tavern-postcard', (h) => { const R = game.rooms.tavern; for (const o of R.group.children) if (o.name === 'wave4 postcard') o.visible = !h; });
  const c3 = await ev(() => { const r = P.enter('tralucave'); const C = game.room?.cache?.case; const u = C ? P.use(C.x, C.z, { kind: 'w4r_case', near: 0.9, match: 2 }) : { r: 'no case' }; return { r: r.r, room: game.room?.id, u: u.r, case: !!game.flags.w4r_case, item: game.story.items().some((i) => i.id === 'w4r_case') }; });
  const c3l = await said();
  check('C: Tralu\'s cave (INPUT: in by its door): the guitar case "Take" (E): found, in the pockets, gone from the wall', c3.room === 'tralucave' && c3.u === 'used' && c3.case && c3.item && has(c3l, /take it to him on Otringal/), { c3, c3l });
  iso('to Otringal by the travel network: put on its pad');
  const c4 = await ev(() => { toIsle('otringal'); P.enter('otrbar'); const k = P.talk('ot_keep'); const r = { k: k.r, sim: !!game.flags.w4r_sim, room: game.room?.id, over: game.remarks?.el?.textContent || '' }; return r; });
  const c4l = await said();
  check('C: Otringal, the harbour bar (INPUT: in by its door): Sim (TALK) — the Twinsunian plays outside by the door; the stage is Lys\'s', c4.k === 'talked' && c4.sim && c4.room === 'otrbar' && (has(c4l, /plays outside, by our door/) || /plays outside, by our door/.test(c4.over)), { c4, c4l });
  const c5 = await ev(() => { const e = game.room?.exits?.find((x) => /-out$/.test(x.to)); if (e) P.through(e.x, e.z); P.settle(); const n = P.npc('w4_raph'); const S = W4.seats.otr; P.go(S.x + Math.sin(S.a) * 2.4 + 0.8, S.z + Math.cos(S.a) * 2.4, { tol: 0.4 }); P.face(n.pos.x, n.pos.z); P.settle(); return { room: game.room?.id, raph: at('raph') || at('w4_raph'), anim: n.forceAnim, harp: W4.seats.otr && true }; });
  await pair('wave4-07-otringal-raph', (h) => { for (const o of game.rooms.isle_otringal.group.children) if (o.name === 'wave4 raph otr') o.visible = !h; P.npc('w4_raph').rig.root.visible = !h; });
  const c6 = await ev(() => { const c0 = game.hero.coins; const k = P.talk('w4_raph'); return { k: k.r, found: !!game.flags.w4r_found, coins: game.hero.coins - c0, item: game.story.items().some((i) => i.id === 'w4r_case') }; });
  const c6l = await said();
  check('C: Raph outside the bar\'s door, sitting on a crate (INPUT, TALK): the case — "RAPH, burned in the lid"; his guitar again, 20 kashes from his tip jar, a word with Madam Orla; the case out of the pockets', c5.room === 'isle_otringal' && c5.anim === 'sit' && c6.k === 'talked' && c6.found && c6.coins === 20 && !c6.item && has(c6l, /burned in the lid/) && has(c6l, /word with Madam Orla/), { c5, c6, c6l });
  await shot('wave4-08-otringal-raph-guitar');
  iso('Madam Orla\'s lens price (her line and the price), chapter 9\'s state set by flags (the lens is on sale from the council)');
  const c7 = await ev(() => { const G = game, f = G.flags, k0 = f.chapterKey, c0 = f.chapter; f.chapterKey = 'council'; f.chapter = G.story.chapters.findIndex((c) => c.key === 'council'); let item = null; const sv = G.story.ipeople.sell; G.story.ipeople.sell = (list) => { item = (typeof list === 'function' ? list() : list)[0]; }; let said = []; const sy = G.say; G.say = function (n, l, d, ...a) { said.push(...[].concat(l)); return sy.call(this, n, l, d, ...a); }; G.story.ipeople.talkFirst?.(P.npc('ot_boss')) || G.story.talkRest(P.npc('ot_boss')); P.settle(); G.story.ipeople.sell = sv; G.say = sy; f.chapterKey = k0; f.chapter = c0; return { price: item?.price ?? null, said }; });
  check('C: with Raph\'s word Madam Orla sells Knartas\'s lens at 8 kashes, not 20 ("Raph says you carried his guitar")', c7.price === 8 && c7.said.some((l) => /Raph says/.test(l)), c7);
}

// ================================================================ D · the ending: signals by lamp; Raph at the lighthouse
if (ONLY.includes('D')) {
  iso('the ending\'s free play: the chapter key set to home (flags), the race won and Raph found (flags)');
  const d1b = await ev(() => { const G = game, f = G.flags; Object.assign(f, { chapterKey: 'home', chapter: G.story.chapters.findIndex((c) => c.key === 'home'), ep_dinner: true, w4b_hook: 1, w4b_seen: true, w4b_keelSeen: true, w4b_keel: true, w4b_sail: 'half', w4b_won: true, w4r_card: true, w4r_case: true, w4r_found: true }); G.story.applyFlags(); toCit(PIER.x + 2.2, PIER.z, -Math.PI / 2); return { arthur: at('arthur'), boat: [r2(aboat().x), r2(aboat().z)], raph: at('w4_raph') }; });
  check('D: the ending, outdoors on Citadel: Arthur on the pier, his boat (a lamp on its masthead) out on the basin; Raph by the lighthouse', d1b.arthur && Math.hypot(d1b.arthur.x - -122, d1b.arthur.z - 43.1) < 1 && d1b.boat[1] < 40 && d1b.raph && Math.hypot(d1b.raph.x - -105.2, d1b.raph.z - 92.6) < 1.5, d1b);
  const d2 = await ev(() => { const n = P.npc('arthur'); P.go(n.pos.x + 1.1, n.pos.z + 0.4, { tol: 0.4 }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1); let k = 0; while (game.state === 'dialog' && k++ < 10) P.tap('KeyE', 0.15); const st = game.state, pat = W().lamp?.pat; game.step(0.75); return { st, pat }; });
  await shot('wave4-09-pier-lamp');
  const d3 = await ev((pat) => { const G = game; let t = 0; while (G.state !== 'shop' && t < 30) { G.step(0.1); t += 0.1; } const items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent); const wrong = ['LSS', 'SLS', 'SSL'].findIndex((p) => p !== pat); P.menuPick(wrong); t = 0; while (G.state !== 'shop' && t < 40) { if (G.state === 'dialog') P.tap('KeyE', 0.15); else G.step(0.1); t += 0.1; } const pat2 = W().lamp?.pat; const right = ['LSS', 'SLS', 'SSL'].indexOf(pat2); const c0 = G.hero.clovers, k0 = G.hero.coins; P.menuPick(right); P.settle(); return { items, tries: G.flags.w4b_lampTries ?? 0, same: pat2 === pat, lamp: !!G.flags.w4b_lamp, clover: G.hero.clovers - c0, coins: G.hero.coins - k0, boat: r2(aboat().z) }; }, d2.pat);
  const d3l = await said();
  check('D: Arthur (TALK): "Mira says a signal has to be said back"; the boat\'s lamp blinks its signal (a scene); the choice of three: a wrong one — the boat blinks all over, "That wasn\'t what it said", nothing lost; the signal again, the right one: it turns and comes in to the pier; his clover leaf (10 kashes at nine)', d2.st === 'cutscene' && !!d2.pat && d3.items.length === 4 && d3.tries === 1 && d3.same && d3.lamp && (d3.clover === 1 || d3.coins === 10) && d3.boat > 40 && has(d3l, /said back/) && has(d3l, /wasn't what it said/) && has(d3l, /It heard us/), { d2, d3, d3l });
  const d4 = await ev(() => { const n = P.npc('w4_raph'); const S = W4.seats.home; P.go(S.x + Math.sin(S.a) * 2.6 + 1.4, S.z + Math.cos(S.a) * 2.6, { tol: 0.5 }); P.face(n.pos.x, n.pos.z); P.settle(); return { anim: n.forceAnim }; });
  await shot('wave4-10-lighthouse-raph');
  const d5 = await ev(() => { const k = P.talk('w4_raph'); return { k: k.r }; });
  const d5l = await said();
  check('D: Raph sits by the lighthouse door with his guitar (TALK): "somebody has to sing to it"', d4.anim === 'sit' && d5.k === 'talked' && has(d5l, /sing to it/), { d4, d5, d5l });
}

const ov = await ev(() => window.__overflow || []);
check('every line and prompt shown fitted its box', ov.length === 0, ov);
await browser.close();
done();
