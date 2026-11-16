// U-4 "Twelve Years Late" (the user's side quest; src/game/story/yearslate.js, src/game/yearslate.js;
// docs/lba-maturity/U4-TWELVE-YEARS-LATE.md). Played by input where it says INPUT (the harness's arrow keys, E, Escape and
// the pause menu: tests/lib/player.js):
//   - chapter 3 on Zeelich: the postcard on the council house's arcade; Oma's word on it; the card taken off its pin (E,
//     his hand on it): its old picture (rendered from the game: the street twelve years ago) and its back (the address
//     that no longer exists, the islands' NOT KNOWN stamps); the card in the corner of the screen while he carries it;
//   - wrong doors knocked at (E, his hand on the door): Mr Pelleck's (his minaret), the bakehouse (Snuff: this WAS the
//     clinic, but on the card it's far off); after the second, Twinsen's own second look; the doors do not let him in
//     while he knocks;
//   - Save & quit → Continue in the middle (the card carried, two doors tried);
//   - the right door (Nara's flower house): Lissa calls her gran; Ysel reads her card; the album handed over;
//   - the album at Clinic Row (E): the old picture over today's view from where she stood; E: then / now; Escape: closed;
//   - the other way in (a fresh state by flags): Lissa asked indoors, with the card;
//   - chapters 9 and the epilogue by their flags: Ysel at her camera by her door, her new cards on the council's board,
//     her word for that part of the story;
//   - old saves from before this change (new-05: chapter 3 on Zeelich; base-12: chapter 9) load with no dx_tyl_ state
//     made up: the card on its pin, Ysel indoors.
// ISO (logged): chapters are set by their flags (as tests/last-ferry.mjs). SHOTS=dir writes jpg pictures from the play
// camera (deviceScaleFactor 1). SwiftShader, headless: Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`./fixtures/campaign/${n}.save.json`, import.meta.url));
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (n, render = true) => { if (!SHOTS) return; if (render) await ev(() => { game.step(0.2); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 70, timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(() => {
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.T = () => game.story.tyl;
  window.tyl = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('dx_tyl_')));
  window.loc = (v) => (v ? [+(v.x - 2400).toFixed(2), +v.z.toFixed(2)] : null);
  window.ysel = () => { const n = P.npc('tyl_ysel'); return n ? { present: n.present, at: [+(n.pos.x - 2400).toFixed(2), +n.pos.z.toFixed(2)] } : null; };
  window.world = () => { const Y = T().Y, Z = game.rooms.zeelich; return { tripod: Y.tripodG.visible, row: Y.then.row.visible, now: (Z.life.now || []).every((m) => m.visible), nowN: (Z.life.now || []).length, ramp: Y.ramp.visible, hero: game.hero.rig.root.visible }; };
  window.board = () => { const Y = T().Y; return { card: Y.cardMesh.visible, newCards: Y.newCards.visible }; };
  window.target = () => { const it = game.findInteractable(); return it ? { kind: it.kind, door: it.door, spot: it.spot } : null; };
  // INPUT: walk to the knock spot before a street door, face it, press E; the answer read through (the lines kept)
  window.knockAt = (room) => {
    const D = T().doorInfo(room); P.go(D.x + D.dir.x * 1.35, D.z + D.dir.z * 1.35, { tol: 0.25, maxT: 200 }); P.face(D.x, D.z);
    const tg = target(); P.tap('KeyE', 0.1); const roomsIn = new Set();
    for (let k = 0; k < 300 && game.state === 'play'; k++) { game.step(0.05); roomsIn.add(game.room?.id); }
    const st = game.state, s = P.settle(); return { tg, st, rooms: [...roomsIn], settle: s.state, room: game.room?.id, at: loc(game.hero.pos) };
  };
  window.picStats = (c) => { if (!c) return null; const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < x.length; i += 16) { const l = x[i] * 0.3 + x[i + 1] * 0.59 + x[i + 2] * 0.11; s += l; s2 += l * l; n++; } const m = s / n; return { w: c.width, h: c.height, mean: +m.toFixed(1), sd: +Math.sqrt(s2 / n - m * m).toFixed(1) }; };
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    const keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('dx_')));
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true, c2_shield: true }, keep, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
});
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 900000 });
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

await open(page, '?nocine'); await menu(page, 'new');
await helpers();
iso('chapter 2 finished by its flags (as tests/last-ferry.mjs): story.nextChapter() starts chapter 3 at Zeelich Spaceport');
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
await said();
const a0 = await ev(() => ({ room: game.room?.id, ch: game.flags.chapterKey, built: !!T().Y, stage: T().stage(), board: board(), world: world(), ysel: ysel(), tyl: tyl(), items: T().items() }));
check('chapter 3 on Zeelich: the postcard pinned on the council house\'s arcade; the ramp at Nara\'s door; no tripod; Ysel not on the street; no dx_tyl_ state yet', a0.room === 'zeelich' && a0.built && a0.stage === 'board' && a0.board.card && !a0.board.newCards && a0.world.ramp && !a0.world.tripod && !a0.world.row && Object.keys(a0.tyl).length === 0 && a0.items.length === 0, a0);

// ---------------------------------------------------------------- Oma, the card
const o0 = await ev(() => { const r = P.talk('zr_oma').r; return { r, tyl: tyl() }; });
const o0l = await said();
check('INPUT: Oma (TALK): the card came back from every island stamped NOT KNOWN; Clinic Row is gone ("the doctor moved up to Otringal")', o0.r === 'talked' && o0.tyl.dx_tyl_oma && has(o0l, /NOT KNOWN/) && has(o0l, /Otringal/), { o0, o0l });
const c0 = await ev(() => { const c = T().Y.card; const r = P.go(c.x, c.z + 1.25, { tol: 0.3, maxT: 200 }); P.face(c.x, c.z); return { r: r.r, tg: target() }; });
const c1 = await ev(() => { const h = game.hero; P.tap('KeyE', 0.1); let k = 0, reach = false; while (game.state !== 'cutscene' && k++ < 300) { if (game.state === 'dialog') P.tap('KeyE', 0.12); else game.step(0.05); if (h.actAnim === 'reach' && h.actT > 0) reach = true; }
  const el = document.querySelector('#tylcard'), pic = el?.querySelector('canvas.tylpic');
  return { state: game.state, reach, shown: el?.style.display, pic: picStats(pic), back: el?.textContent || '', tyl: tyl(), board: board(), world: world() }; });
const c1l = await said();
check('INPUT: the card taken off its pin (E: Oma\'s note read, UNDELIVERABLE; his hand on it, the reach): the card close up, its picture (rendered, toned) and its back: "Portraits, Clinic Row", the islands\' NOT KNOWN stamps', c0.tg?.kind === 'dx_tyl_card' && c1.state === 'cutscene' && c1.reach && c1.shown === 'flex' && c1.pic && c1.pic.w >= 400 && c1.pic.sd > 12 && /Clinic Row/.test(c1.back) && /NOT KNOWN/.test(c1.back) && c1.tyl.dx_tyl_card && !c1.board.card && has(c1l, /UNDELIVERABLE/), { c0, c1: { ...c1, back: c1.back.slice(0, 160) }, c1l });
check('the old picture was rendered from the game and the street given back at once: the twelve years\' pieces shown again, the period pieces hidden, the people (him too) visible', c1.world.now && c1.world.nowN >= 4 && !c1.world.row && c1.world.hero && c1.world.ramp, c1.world);
await shot('01-the-postcard', false);
const c2 = await ev(() => { P.tap('KeyE', 0.1); const s = P.settle(); game.step(0.4); return { s, thumb: document.querySelector('#tylthumb')?.style.display, items: T().items(), state: game.state }; });
const c2l = await said();
check('INPUT: put away (E): Twinsen reads it ("this street, twelve years ago"); the card stays in the corner of the screen while he carries it; in his things', c2.state === 'play' && c2.thumb === 'block' && c2.items[0]?.id === 'tyl_card' && has(c2l, /twelve years ago/), { c2, c2l });

// ---------------------------------------------------------------- wrong doors
const k1 = await ev(() => knockAt('zh_pelleck'));
const k1l = await said();
const k1t = await ev(() => tyl());
check('INPUT: a wrong door, Mr Pelleck\'s (E: Knock, his hand on the door, he is not let in while he knocks): the answer points at the minaret; counted', k1.tg?.kind === 'dx_tyl_knock' && k1.tg.door === 'pel' && k1.st === 'dialog' && k1.rooms.every((r) => r === 'zeelich') && k1.room === 'zeelich' && has(k1l, /minaret/) && k1t.dx_tyl_knocked === 'pel' && k1t.dx_tyl_wrong === 1, { k1, k1l, k1t });
const k2 = await ev(() => knockAt('zh_bakery'));
const k2l = await said();
const k2t = await ev(() => tyl());
check('INPUT: a wrong door, the bakehouse: Mother Snuff, "This was the clinic", but far off on the card; after the second wrong door Twinsen looks again (the cap, the old mill over its shoulder)', k2.tg?.door === 'bak' && has(k2l, /This was the clinic/) && has(k2l, /old mill right over its shoulder/) && k2t.dx_tyl_wrong === 2 && k2t.dx_tyl_hint === 1 && k2.room === 'zeelich', { k2, k2l, k2t });
await shot('02-the-card-in-hand');

// ---------------------------------------------------------------- Save & quit → Continue mid-way
iso('Save & quit (the pause menu) → Continue: the card carried, two doors tried');
await saveQuit(); await reboot();
const s0 = await ev(() => { game.step(0.5); return { room: game.room?.id, tyl: tyl(), board: board(), items: T().items(), thumb: document.querySelector('#tylthumb')?.style.display, ysel: ysel() }; });
check('Continue: the card still in his hand (the corner card shown again, rendered anew), off the board; the two wrong doors remembered; nothing else made up', s0.room === 'zeelich' && s0.tyl.dx_tyl_card && s0.tyl.dx_tyl_knocked === 'pel,bak' && s0.tyl.dx_tyl_wrong === 2 && !s0.tyl.dx_tyl_found && !s0.board.card && s0.items[0]?.id === 'tyl_card' && s0.thumb === 'block', s0);

// ---------------------------------------------------------------- the right door
const r0 = await ev(() => { const sv = game.hud.toast.bind(game.hud), toasts = []; game.hud.toast = (k, ...a) => { toasts.push(k); return sv(k, ...a); }; const k = knockAt('zh_nara'); game.hud.toast = sv; return { k, toasts, tyl: tyl(), items: T().items(), ysel: ysel(), idx: game.story.index }; });
const r0l = await said();
check('INPUT: the right door, Nara\'s flower house (the octagonal hall, the old mill behind it): Lissa calls her gran; Ysel at the door reads her card; the album handed over ("Stand where I stood")', r0.k.tg?.door === 'nara' && r0.k.room === 'zeelich' && has(r0l, /Gran!/) && has(r0l, /My card/) && has(r0l, /Stand where I stood/) && r0.tyl.dx_tyl_found && r0.tyl.dx_tyl_ch === r0.idx && r0.items[0]?.id === 'tyl_album' && r0.toasts.includes('tyl_toast_album'), { r0, r0l });
const r1 = await ev(() => { for (let i = 0; i < 160 && T().scene; i++) game.step(0.1); P.settle(); return { scene: T().scene, ysel: ysel(), thumb: document.querySelector('#tylthumb')?.style.display, journal: T().journal().map((l) => l.key), board: board(), world: world() }; });
check('she goes back in (this chapter, he has not left the island: indoors, off the street); the corner card gone; the journal: the card found, the album', !r1.scene && !r1.ysel?.present && r1.thumb === 'none' && r1.journal.includes('tyl_j_found') && r1.journal.includes('tyl_j_pages_n') && !r1.world.tripod && !r1.board.card, r1);

// ---------------------------------------------------------------- the album where she stood
const al0 = await ev(() => { const w = { x: 2400 - 15.5, z: 2.5 }; const r = P.go(w.x, w.z, { tol: 0.35, maxT: 200 }); const tg = target(); const fov0 = game.camera.fov; P.tap('KeyE', 0.1); game.step(0.2);
  const el = document.querySelector('#tylview'), c = el?.querySelector('canvas'); return { r: r.r, tg, fov0, state: game.state, then: T().view?.then, shown: el?.style.display, op: c?.style.opacity, tag: el?.querySelector('.tyltag')?.textContent, cap: el?.querySelector('.tylcap')?.textContent, pic: picStats(c), hero: game.hero.rig.root.visible, override: !!game.camRig.override, seen: game.flags.dx_tyl_seen }; });
check('INPUT: at Clinic Row, where she stood (E: Open the album): the camera at her lens, her old picture over today\'s view ("Then"), her caption', al0.tg?.kind === 'dx_tyl_album' && al0.tg.spot === 'row' && al0.state === 'cutscene' && al0.then === true && al0.shown === 'block' && al0.op === '1' && al0.tag === 'Then' && /glass house/.test(al0.cap) && al0.pic?.sd > 12 && al0.override && !al0.hero && al0.seen === 'row', al0);
await shot('03-album-then');
const al1 = await ev(() => { P.tap('KeyE', 0.1); game.step(0.4); const el = document.querySelector('#tylview'); return { then: T().view?.then, op: el?.querySelector('canvas').style.opacity, tag: el?.querySelector('.tyltag').textContent }; });
check('INPUT: E: today\'s view from the same spot ("Now"), the picture lifted off it', al1.then === false && al1.op === '0' && al1.tag === 'Now', al1);
await shot('04-album-now');
const al2 = await ev(() => { P.tap('KeyE', 0.1); game.step(0.2); const back = T().view?.then; P.tap('Escape', 0.1); game.step(0.3); return { back, state: game.state, view: !!T().view, shown: document.querySelector('#tylview')?.style.display, override: !!game.camRig.override, hero: game.hero.rig.root.visible, fov: game.camera.fov }; });
check('INPUT: E again: then; Escape: the album shut, back in play (the camera his own again, Twinsen seen, the view\'s width as before)', al2.back === true && al2.state === 'play' && !al2.view && al2.shown === 'none' && !al2.override && al2.hero && al2.fov === al0.fov0, al2);

const pr0 = await ev(() => { const S = game.rooms.zeelich.skyferry, b0 = S.boardState, k0 = S.bridgeK; const w = { x: 2400 - 62.6, z: -1.2 }; const r = P.go(w.x, w.z, { tol: 0.35, maxT: 300 }); const tg = target(); P.tap('KeyE', 0.1); game.step(0.2);
  const el = document.querySelector('#tylview'); const out = { r: r.r, tg, state: game.state, tag: el?.querySelector('.tyltag')?.textContent, cap: el?.querySelector('.tylcap')?.textContent, pic: picStats(el?.querySelector('canvas')), board: [b0, S.boardState], bridge: [k0, S.bridgeK] };
  return out; });
await shot('06-pier-then');
Object.assign(pr0, await ev(() => { P.tap('Escape', 0.1); game.step(0.3); return { after: game.state, seen: game.flags.dx_tyl_seen }; }));
check('INPUT: at the end of the West Pier (E): her picture of the Patience before the shuttles; the ferry\'s board and bridge as they were once it is rendered; Escape', pr0.tg?.spot === 'pier' && pr0.state === 'cutscene' && pr0.tag === 'Then' && /Patience/.test(pr0.cap) && pr0.pic?.sd > 12 && pr0.board[0] === pr0.board[1] && pr0.bridge[0] === pr0.bridge[1] && pr0.after === 'play' && pr0.seen === 'row,pier', pr0);

// ---------------------------------------------------------------- the other way: Lissa asked indoors, with the card
iso('a fresh state by flags (the card carried, no door tried): into the flower house, Lissa asked face to face');
const in0 = await ev(() => { const G = game, f = G.flags; const keep = { ...tyl() }; for (const k of Object.keys(f)) if (k.startsWith('dx_tyl_')) delete f[k]; f.dx_tyl_card = true; G.story.applyFlags(); G.step(0.3); P.settle();
  const e = P.enter('zh_nara'); P.settle(); const room = G.room?.id; const r = P.talk('zh_lissa').r; const st = tyl(); const yi = ysel();
  // (back as it was: found, the row's page seen)
  P.exitTo('zh_nara-out'); P.settle(); for (const k of Object.keys(f)) if (k.startsWith('dx_tyl_')) delete f[k]; Object.assign(f, keep); G.story.applyFlags(); P.settle();
  return { e: e?.r, room, r, st, yi, back: G.room?.id }; });
const in0l = await said();
check('INPUT: indoors, Lissa asked with the card in hand: "That\'s Gran!", and Ysel (by her old skylight) reads it; the album handed over the same', in0.room === 'zh_nara' && in0.r === 'talked' && has(in0l, /That's Gran/) && has(in0l, /My card/) && in0.st.dx_tyl_found && in0.back === 'zeelich', { in0, in0l });

// ---------------------------------------------------------------- later chapters: the lasting change
for (const [key, re] of [['council', /Everyone is at the council house/], ['home', /Mara wrote back/]]) {
  iso(`chapter ${key} by its flags; on Zeelich's street`);
  const cx = await ev(({ key }) => { setChapter(key); const G = game; if (G.room?.id !== 'zeelich') { G.regions.ensure?.('zeelich', 'test'); G.enterRoom('zeelich', { x: 2400 - 12.5, z: -2.5, a: Math.PI }, true); P.settle(); }
    G.story.refreshCast(); G.step(0.5); P.settle();
    const out = { ch: G.flags.chapterKey, room: G.room?.id, out: T().outside(), ysel: ysel(), board: board(), world: world(), items: T().items() };
    const Y = T().Y; out.atCamera = out.ysel && Math.hypot(out.ysel.at[0] + 2400 - Y.tripod.stand.x, out.ysel.at[1] - Y.tripod.stand.z) < 0.6;
    out.r = P.talk('tyl_ysel').r;
    return out; }, { key });
  const cxl = await said();
  check(`${key}: Ysel at her camera on its tripod by her door, her new cards on the council's board, the album still his; her word for this part of the story`, cx.room === 'zeelich' && cx.out && cx.ysel?.present && cx.atCamera && cx.world.tripod && cx.board.newCards && !cx.board.card && cx.items[0]?.id === 'tyl_album' && cx.r === 'talked' && has(cxl, re), { cx, cxl });
  if (key === 'council') { await ev(() => { const Y = T().Y; P.go(Y.tripod.x + 1.6, Y.tripod.z + 2.6, { tol: 0.4 }); P.face(Y.tripod.x, Y.tripod.z); game.camRig.lba && (game.camRig.lba.init = false); game.step(1.0); }); await shot('05-chapter9-ysel-at-her-camera'); }
}

// text: English, short, no night words in any new line
const tx = await ev(async () => { const { STR } = await import('/src/game/i18n.js'); const keys = Object.keys(STR.en).filter((k) => /^(tyl_|n_tyl_|it_tyl_|itd_tyl_|p_tyl_)/.test(k) && k !== 'tyl_j_pages_n'); const all = keys.flatMap((k) => [].concat(STR.en[k])); return { n: keys.length, bad: all.filter((s) => /\b(night|evening|tonight|sunset|dawn|dusk|morning)\b/i.test(s)), long: all.filter((s) => s.split(/(?<=[.!?])\s+/).length > 3), nonEnglish: all.filter((s) => /[֐-׿]/.test(s)) }; });
check('the quest\'s text: English; no night, evening, tonight, sunset, dawn, dusk or morning; no line of more than three sentences', tx.n > 45 && tx.bad.length === 0 && tx.long.length === 0 && tx.nonEnglish.length === 0, tx);
await browser.close();

// ---------------------------------------------------------------- old saves (from before this change)
for (const [fx, key] of [['new-05', 'zeelich'], ['base-12', 'council']]) {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fx), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((i) => i.name === 'lba3_save_v1').value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers();
  const o = await ev(() => { const G = game; const st0 = G.state, t0 = tyl(); if (G.room?.id !== 'zeelich') { G.regions.ensure?.('zeelich', 'test'); G.enterRoom('zeelich', { x: 2400 - 22, z: -3, a: Math.PI }, true); P.settle(); }
    G.story.refreshCast(); G.step(1); P.settle();
    return { state: st0, ch: G.flags.chapterKey, t0, tyl: tyl(), stage: T().stage(), board: board(), world: world(), ysel: ysel() }; });
  check(`an old save (${fx}, chapter ${key}, before this change) loads: in play; no dx_tyl_ state made up; the card on its pin, no tripod, Ysel not at a camera`, o.state === 'play' && o.ch === key && Object.keys(o.t0).length === 0 && Object.keys(o.tyl).length === 0 && o.stage === 'board' && o.board.card && !o.world.tripod, o);
  await browser.close();
}
done();
