// SAVE-SLOTS (WORKLIST #29): six manual save slots next to the autosave. Save Game in the pause menu, Load Game on
// the title, Continue loads the newest, Delete with a confirmation, New Game replaces only the autosave, a full
// storage is told in words. Through the real page: clicks on the menu buttons and keyboard events; the game's own
// storage (localStorage) is read back after each step. Screenshots of the Save and Load screens go to
// docs/lba3-production/reviews/SAVE-SLOTS/.
import { launch, open, menu, checker, URL0 } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
const { check, done } = checker({ info: 'always' });
const OUT = new URL('../docs/lba3-production/reviews/SAVE-SLOTS/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const step = (s) => ev((s) => game.step(s), s);
const shown = () => ev(() => [...document.querySelectorAll('.screen')].filter((e) => !e.classList.contains('hidden') && e.id !== 'loading').map((e) => e.id));
const slot = (n) => ev((n) => JSON.parse(localStorage.getItem(n ? 'lba3_slot_' + n : 'lba3_save_v1') || 'null'), n);
const slotKeys = () => ev(() => Object.keys(localStorage).filter((k) => /^lba3_(slot|save)/.test(k)).sort());
const rows = (id) => ev((id) => [...document.querySelectorAll(`#${id} .slot`)].map((b) => ({ n: +b.dataset.slot, dis: b.disabled, txt: b.innerText.replace(/\s+/g, ' ').trim(), img: !!b.querySelector('img'), del: !!b.parentElement.querySelector('.slot-del') })), id);
const msg = (sel) => ev((sel) => document.querySelector(sel)?.textContent || '', sel);
const live = async (ms) => { await ev(() => { game.testFreeze = false; }); await page.waitForTimeout(ms); await ev(() => { game.testFreeze = true; }); };
// Esc with the frame loop running, as a player pauses: the slot picture comes from the frame drawn then (it is
// encoded asynchronously; this waits for it to finish, or for the session's pictures to be turned off)
const pauseLive = async () => {
  await ev(() => { game.thumbMs = null; game.thumbDone = null; game.testFreeze = false; });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => game.state === 'pause', null, { timeout: 60000 });
  await page.waitForFunction(() => game.thumbDone != null || game.thumbOff, null, { timeout: 120000 }).catch(() => {});
  await ev(() => { game.testFreeze = true; });
};

// ---------------------------------------------------------------- a new game; the autosave at its usual points
await open(page, '?nocine');
const t0 = await ev(() => ({ cont: document.querySelector('#btn-continue').disabled, load: document.querySelector('#btn-load').disabled, order: [...document.querySelectorAll('#title .menu button')].map((b) => b.dataset.act) }));
check('first launch: Continue and Load Game are unavailable without a save; Load Game sits under Continue', t0.cont && t0.load && t0.order.slice(0, 3).join() === 'continue,loadgame,new', t0);
await menu(page, 'new');
await ev(() => { game.testFreeze = true; P.settle(); });
const auto = await ev(() => {
  const G = game, get = () => JSON.parse(localStorage.getItem('lba3_save_v1') || 'null');
  const tick = () => { const w0 = Date.now(); while (Date.now() === w0) { /* (a new millisecond, so the next stamp differs) */ } };
  const a0 = get()?.at || 0;
  G.step(21);
  tick();
  const r = G.room?.id;
  G.enterRoom(r, G.hero.pos.clone(), true);   // a scene change saves (the same room, entered again where he stands)
  const a1 = get()?.at || 0;
  tick();
  G.saveTimer = 0; G.onZoneEnter({ type: 'checkpoint' });   // a checkpoint zone saves (then not again for 20 s)
  const a2 = get()?.at || 0;
  tick();
  G.onZoneEnter({ type: 'checkpoint' });
  const a3 = get()?.at || 0;
  return { room: r, a0, a1, a2, a3, played: Math.round(G.played), savedPlayed: get()?.played, slots: Object.keys(localStorage).filter((k) => k.startsWith('lba3_slot')) };
});
check('the autosave is still written at its usual points (entering a room, a checkpoint zone; a second checkpoint within 20 s does not), stamped with the time and the play time; no manual slot is written', auto.a1 > auto.a0 && auto.a2 > auto.a1 && auto.a3 === auto.a2 && auto.savedPlayed >= 20 && auto.slots.length === 0, auto);

// ---------------------------------------------------------------- the thumbnail, through the real frame loop
await ev(() => { P.settle(); });
const tw0 = Date.now();
await pauseLive();
const th = await ev(async () => {
  const u = game.pauseThumb, out = { ms: game.thumbMs == null ? null : +game.thumbMs.toFixed(1), len: u?.length || 0, off: !!game.thumbOff, head: u?.slice(0, 23) };
  if (u) {   // the picture's content: not a black or empty frame
    const im = new Image(); im.src = u; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let sum = 0, sq = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; sum += l; sq += l * l; }
    out.size = [im.width, im.height]; out.mean = Math.round(sum / n); out.sd = Math.round(Math.sqrt(sq / n - (sum / n) ** 2));
  }
  return out;
});
th.wallMs = Date.now() - tw0;
console.log('thumbnail (SwiftShader software rendering, not a hardware timing; ms = the main thread\'s step; wallMs = until the worker answered):', JSON.stringify(th));
check('pausing takes a slot picture from the drawn frame: a 160x90 JPEG of at most 15 000 characters, the main thread\'s step under 50 ms (the read-back and encoding in a worker)', th.len > 0 && th.len <= 15000 && th.head === 'data:image/jpeg;base64,' && th.ms <= 50 && !th.off && th.size?.join('x') === '160x90', th);
check('the slot picture shows the scene (not a black or flat frame: mean luminance and spread)', th.mean > 12 && th.sd > 6, th);

// ---------------------------------------------------------------- Save Game: slot 2, then slot 3, then overwrite 3
// state A: 33 kashes where he stands
const A = await ev(() => { const h = game.hero; h.coins = 33; return { coins: 33, x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2), room: game.room?.id }; });
await page.click('#pause [data-act="savegame"]'); await step(0.05);
const s0 = { shown: await shown(), rows: await rows('savegame') };
check('pause → Save Game opens the list of six slots, all empty on a new profile', JSON.stringify(s0.shown) === '["savegame"]' && s0.rows.length === 6 && s0.rows.every((r) => !r.dis && /Empty/.test(r.txt)), s0);
await page.click('#savegame .slot[data-slot="2"]'); await step(0.05);
const s2 = await slot(2);
const s2m = await msg('#savegame .menu-msg');
check('an empty slot saves at once: slot 2 holds the autosave\'s snapshot (33 kashes, his place) with the time, the play time and the picture', s2 && s2.thumb?.startsWith('data:image/jpeg') && s2.thumb.length <= 15000 && s2.hero.coins === 33 && Math.abs(s2.hero.x - A.x) < 0.01 && s2.room === A.room && s2.at > 0 && Number.isFinite(s2.played) && /Saved in Slot 2/.test(s2m), { A, s2: s2 && { coins: s2.hero.coins, x: s2.hero.x, z: s2.hero.z, room: s2.room, at: s2.at, played: s2.played, v: s2.v, thumb: s2.thumb?.length || 0 }, s2m });
check('the slot shows its chapter, place and date on the list', /Slot 2/.test((await rows('savegame'))[1].txt) && /Chapter 1 · The Well/.test((await rows('savegame'))[1].txt) && /\d{4}/.test((await rows('savegame'))[1].txt), (await rows('savegame'))[1]);

// state B: 5 kashes, walked a little; saved into slot 3 by keys (↓ to slot 3, Enter)
await page.keyboard.press('Escape'); await step(0.05);
const backEsc = await ev(() => [game.state, game.screen]);
check('Esc on the Save list goes back to the pause menu (not to the game)', backEsc[0] === 'pause' && backEsc[1] === 'pause', backEsc);
await page.click('#pause [data-act="resume"]'); await step(0.1);
const B = await ev(() => { const h = game.hero; P.holdFor(['ArrowUp'], 0.8); P.settle(); h.coins = 5; return { x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2) }; });
await pauseLive();
await page.click('#pause [data-act="savegame"]'); await step(0.05);
const k0 = await ev(() => document.querySelector('#savegame .sel')?.dataset.slot);
await page.keyboard.press('ArrowDown'); await step(0.05);
await page.keyboard.press('ArrowDown'); await step(0.05);
const k1 = await ev(() => document.querySelector('#savegame .sel')?.dataset.slot);
await page.keyboard.press('Enter'); await step(0.05);
const s3 = await slot(3);
check('by keys: the list opens on slot 1, ↓ ↓ selects slot 3, Enter saves into it (5 kashes)', k0 === '1' && k1 === '3' && s3?.hero.coins === 5, { k0, k1, coins: s3?.hero.coins });
// overwrite slot 3 with state C (7 kashes): asked first; Back keeps the old save, Overwrite replaces it
await page.keyboard.press('Escape'); await step(0.05);
await page.click('#pause [data-act="resume"]'); await step(0.1);
await ev(() => { game.hero.coins = 7; });
await pauseLive();
await page.click('#pause [data-act="savegame"]'); await step(0.05);
await page.click('#savegame .slot[data-slot="3"]'); await step(0.05);
const o1 = { shown: await shown(), q: await msg('#slotconfirm h1'), yes: await msg('#slotconfirm [data-act="slotyes"]'), sel: await ev(() => document.querySelector('#slotconfirm .sel')?.dataset.act), coins: (await slot(3)).hero.coins };
await page.click('#slotconfirm [data-act="back"]'); await step(0.05);
const o2 = { shown: await shown(), coins: (await slot(3)).hero.coins };
await page.click('#savegame .slot[data-slot="3"]'); await step(0.05);
await page.click('#slotconfirm [data-act="slotyes"]'); await step(0.05);
const o3 = { shown: await shown(), coins: (await slot(3)).hero.coins, sel: await ev(() => document.querySelector('#savegame .sel')?.dataset.slot), m: await msg('#savegame .menu-msg'), s2: (await slot(2)).hero.coins };
check('overwriting an occupied slot asks first ("Overwrite Slot 3?", Back selected); Back keeps the old save; Overwrite replaces it and returns to the list on that slot; slot 2 untouched', o1.shown.join() === 'slotconfirm' && /Overwrite Slot 3\?/.test(o1.q) && o1.sel === 'back' && o1.coins === 5 && o2.shown.join() === 'savegame' && o2.coins === 5 && o3.shown.join() === 'savegame' && o3.coins === 7 && o3.sel === '3' && o3.s2 === 33, { o1, o2, o3 });
await live(900);
await page.screenshot({ path: OUT + 'save-screen.png' });
// a pad's B goes back too
await ev(() => { const btn = (p) => ({ pressed: p, value: p ? 1 : 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => btn(false)) }; navigator.getGamepads = () => [window.__pad]; game.step(0.05); window.__pad.buttons[1] = btn(true); game.step(0.05); window.__pad.buttons[1] = btn(false); game.step(0.05); window.__pad.connected = false; game.step(0.05); });
check('a pad\'s B on the Save list goes back to the pause menu', JSON.stringify(await shown()) === '["pause"]' && await ev(() => game.state === 'pause'), await shown());

// ---------------------------------------------------------------- not during a story scene, a fight, or while he is down
const blocked = await ev(() => {
  const G = game, out = {}, press = () => { document.querySelector('#pause [data-act="savegame"]').click(); return [G.screen, document.querySelector('#pause-msg').textContent]; };
  G.cutscene = () => {}; out.scene = press(); G.cutscene = null;
  const h = G.hero, foe = { alive: true, present: true, state: 'chase', def: {}, pos: { x: h.pos.x + 3, z: h.pos.z } };
  G.enemies.push(foe); out.fight = press(); G.enemies.splice(G.enemies.indexOf(foe), 1);
  const hp = h.hp; h.hp = 0; out.dead = press(); h.hp = hp;
  out.free = G.saveBlockReason();
  return out;
});
check('Save Game is refused with a short reason during a story scene, a fight, and while he is down (the pause menu stays)', blocked.scene[0] === 'pause' && /story scene/.test(blocked.scene[1]) && blocked.fight[0] === 'pause' && /fight/.test(blocked.fight[1]) && blocked.dead[0] === 'pause' && /right now/.test(blocked.dead[1]) && blocked.free === '', blocked);

// ---------------------------------------------------------------- Save & Quit; Load Game on the title
await ev(() => { game.hero.coins = 11; });   // the autosave Save & Quit writes: 11 kashes
const reloaded = page.waitForEvent('load', { timeout: 300000 });
await page.click('#pause [data-act="quit"]');
await reloaded;
await open(page, '?nocine');
const t1 = await ev(() => ({ cont: document.querySelector('#btn-continue').disabled, load: document.querySelector('#btn-load').disabled }));
await page.click('#title [data-act="loadgame"]'); await step(0.05);
const L = await rows('loadgame');
const Lsel = await ev(() => document.querySelector('#loadgame .sel')?.dataset.slot);
check('the title: Continue and Load Game available; Load Game lists the Autosave then slots 1–6, empty ones disabled, a Delete on each saved slot, the newest marked Latest and selected', !t1.cont && !t1.load && L.length === 7 && L[0].n === 0 && /Autosave/.test(L[0].txt) && /latest/i.test(L[0].txt) && L[2].n === 2 && !L[2].dis && L[2].del && L[3].n === 3 && !L[3].dis && [1, 4, 5, 6].every((n) => L[n].dis && /Empty/.test(L[n].txt) && !L[n].del) && !L[0].del && Lsel === '0', { t1, L, Lsel });
await live(900);
await page.screenshot({ path: OUT + 'load-screen.png' });
// keys on the list: → from a slot to its Delete, ← back, ↓ skips the Delete buttons
const nav = [];
await ev(() => { game.selectSlot(2); });
nav.push(await ev(() => document.querySelector('#loadgame .sel')?.className + ':' + document.querySelector('#loadgame .sel')?.dataset.slot));
await page.keyboard.press('ArrowRight'); await step(0.05);
nav.push(await ev(() => document.querySelector('#loadgame .sel')?.className + ':' + document.querySelector('#loadgame .sel')?.dataset.slot));
await page.keyboard.press('ArrowDown'); await step(0.05);
nav.push(await ev(() => document.querySelector('#loadgame .sel')?.className + ':' + document.querySelector('#loadgame .sel')?.dataset.slot));
await page.keyboard.press('ArrowRight'); await step(0.05);
await page.keyboard.press('ArrowLeft'); await step(0.05);
nav.push(await ev(() => document.querySelector('#loadgame .sel')?.className + ':' + document.querySelector('#loadgame .sel')?.dataset.slot));
check('Load list by keys: → moves to the slot\'s Delete, ↓ goes to the next slot (past the Delete buttons and the empty slots), → ← return to the slot', /slot-del/.test(nav[1]) && nav[1].endsWith(':2') && /^slot( |$|:)/.test(nav[2]) && nav[2].endsWith(':3') && /^slot( |$|:)/.test(nav[3]) && nav[3].endsWith(':3'), nav);
// Esc on the Load list returns to the title
await page.keyboard.press('Escape'); await step(0.05);
check('Esc on the Load list goes back to the title', JSON.stringify(await shown()) === '["title"]', await shown());
// load slot 2: state A comes back
await page.click('#title [data-act="loadgame"]'); await step(0.05);
await page.click('#loadgame .slot[data-slot="2"]');
await ev(() => { game.testFreeze = true; for (let i = 0; i < 10; i++) game.step(0.05); });
const ld = await ev(() => ({ state: game.state, coins: game.hero.coins, x: +game.hero.pos.x.toFixed(2), z: +game.hero.pos.z.toFixed(2), room: game.room?.id, shown: [...document.querySelectorAll('.screen')].filter((e) => !e.classList.contains('hidden') && e.id !== 'loading').map((e) => e.id), played: game.played }));
check('Load Game → slot 2: in play with slot 2\'s state (33 kashes, his place, the room), the play time carried on', ld.state === 'play' && ld.coins === 33 && Math.abs(ld.x - A.x) < 0.05 && Math.abs(ld.z - A.z) < 0.05 && ld.room === A.room && ld.shown.length === 0 && ld.played >= s2.played, { A, ld });

// ---------------------------------------------------------------- Continue loads the newest
await page.reload(); await open(page, '?nocine');
await menu(page, 'continue');
await ev(() => { for (let i = 0; i < 10; i++) game.step(0.05); });
const c1 = await ev(() => game.hero.coins);
// slot 3 made the newest by its time
await ev(() => { const s = JSON.parse(localStorage.getItem('lba3_slot_3')); s.at = Date.now() + 3600e3; localStorage.setItem('lba3_slot_3', JSON.stringify(s)); });
await page.reload(); await open(page, '?nocine');
await menu(page, 'continue');
await ev(() => { for (let i = 0; i < 10; i++) game.step(0.05); });
const c2 = await ev(() => game.hero.coins);
check('Continue loads the newest save: the autosave (written by loading slot 2: 33 kashes), then slot 3 once it is the newest (7 kashes)', c1 === 33 && c2 === 7, { c1, c2 });

// ---------------------------------------------------------------- Delete, with a confirmation
await page.reload(); await open(page, '?nocine');
await page.click('#title [data-act="loadgame"]'); await step(0.05);
await page.click('#loadgame .slot-del[data-slot="3"]'); await step(0.05);
const d1 = { shown: await shown(), q: await msg('#slotconfirm h1'), sel: await ev(() => document.querySelector('#slotconfirm .sel')?.dataset.act) };
await page.click('#slotconfirm [data-act="back"]'); await step(0.05);
const d2 = !!(await slot(3));
await page.click('#loadgame .slot-del[data-slot="3"]'); await step(0.05);
await page.click('#slotconfirm [data-act="slotyes"]'); await step(0.05);
const d3 = { shown: await shown(), s3: await slot(3), s2: !!(await slot(2)), auto: !!(await slot(0)), m: await msg('#loadgame .menu-msg'), row: (await rows('loadgame'))[3] };
check('Delete asks first ("Delete Slot 3?", Back selected); Back keeps it; Delete removes slot 3 only (slot 2 and the autosave stay) and the list shows it empty', d1.shown.join() === 'slotconfirm' && /Delete Slot 3\?/.test(d1.q) && d1.sel === 'back' && d2 && d3.shown.join() === 'loadgame' && d3.s3 === null && d3.s2 && d3.auto && /Slot 3 deleted/.test(d3.m) && d3.row.dis, { d1, d2, d3 });
await page.click('#loadgame [data-act="back"]'); await step(0.05);

// ---------------------------------------------------------------- New Game replaces only the autosave
const before2 = JSON.stringify(await slot(2));
await page.click('#title [data-act="new"]'); await step(0.05);
const nq = { shown: await shown(), sub: await msg('#confirmnew p') };
await page.click('#confirmnew [data-act="newyes"]');
await ev(() => { game.testFreeze = true; P.settle(); });
const nn = await ev(() => ({ state: game.state, coins: game.hero.coins, keys: Object.keys(localStorage).filter((k) => /^lba3_(slot|save)/.test(k)).sort() }));
check('New Game asks first and warns only about the autosave; afterwards slot 2 is byte for byte the same and the old autosave is kept aside', nq.shown.join() === 'confirmnew' && /autosave will be replaced/i.test(nq.sub) && /slots are kept/i.test(nq.sub) && nn.state === 'play' && JSON.stringify(await slot(2)) === before2 && nn.keys.includes('lba3_save_v1_before_new'), { nq, nn });

// ---------------------------------------------------------------- a full storage (simulated)
await ev(() => { P.settle(); });
await page.keyboard.press('Escape'); await step(0.1);
await page.click('#pause [data-act="savegame"]'); await step(0.05);
const q = await ev(() => {
  const G = game, real = Storage.prototype.setItem, out = {};
  const full = (pred) => { Storage.prototype.setItem = function (k, v) { if (pred(k, v)) { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); } return real.call(this, k, v); }; };
  try {
    // everything full: the slot stays empty, the list says so in words
    full(() => true);
    document.querySelector('#savegame .slot[data-slot="5"]').click();
    out.all = { s5: localStorage.getItem('lba3_slot_5'), msg: document.querySelector('#savegame .menu-msg').textContent, bad: document.querySelector('#savegame .menu-msg').classList.contains('bad'), screen: G.screen };
    // the autosave: told once, not every 20 s
    out.auto1 = G.save(false); out.toast1 = [...document.querySelectorAll('#toast .toast')].map((e) => e.textContent).filter((s) => /full/i.test(s)).length;
    out.auto2 = G.save(false); out.toast2 = [...document.querySelectorAll('#toast .toast')].map((e) => e.textContent).filter((s) => /full/i.test(s)).length;
    // only the picture doesn't fit: the save is made without it
    G.pauseThumb = 'data:image/jpeg;base64,' + 'A'.repeat(4000);
    full((k, v) => v.includes('"thumb"'));
    document.querySelector('#savegame .slot[data-slot="6"]').click();
    const s6 = JSON.parse(localStorage.getItem('lba3_slot_6') || 'null');
    out.nothumb = { saved: !!s6, thumb: !!s6?.thumb, msg: document.querySelector('#savegame .menu-msg').textContent };
    // an overwrite that doesn't fit keeps the old save
    full(() => true);
    const before = localStorage.getItem('lba3_slot_6');
    G.slotAsk = { kind: 'overwrite', n: 6 }; G.openChild('slotconfirm'); document.querySelector('#slotconfirm [data-act="slotyes"]').click();
    out.over = { same: localStorage.getItem('lba3_slot_6') === before, msg: document.querySelector('#savegame .menu-msg').textContent };
    // Save & Quit with a full storage asks before quitting without the save
    document.querySelector('#savegame [data-act="back"]').click();
    document.querySelector('#pause [data-act="quit"]').click();
    out.quit = { screen: G.screen, msg: document.querySelector('#pause-msg').textContent, fading: document.querySelector('#fade').classList.contains('on') };
  } finally { Storage.prototype.setItem = real; }
  return out;
});
check('a full storage: the slot is not written and the Save list says so in plain words (an error line), the game goes on', q.all.s5 === null && /Not enough storage space/.test(q.all.msg) && q.all.bad && q.all.screen === 'savegame', q.all);
check('a full storage: the autosave reports it once (one toast), not at every save', q.auto1 === 'quota' && q.auto2 === 'quota' && q.toast1 === 1 && q.toast2 === 1, q);
check('a full storage with room for the save but not its picture: saved without the picture', q.nothumb.saved && !q.nothumb.thumb && /Saved in Slot 6/.test(q.nothumb.msg), q.nothumb);
check('a full storage on an overwrite keeps the slot\'s old save', q.over.same && /Not enough storage space/.test(q.over.msg), q.over);
check('Save & Quit with a full storage stays in the pause menu and says the spot wasn\'t saved (a second press quits)', q.quit.screen === 'pause' && /wasn't saved/.test(q.quit.msg) && !q.quit.fading, q.quit);
await browser.close();

// ---------------------------------------------------------------- an old single save shows as the Autosave
{
  const { browser: b2, page: p2 } = await launch();
  const v1 = { v: 1, room: null, hero: { x: -36, z: -10, hp: 10, mp: 5, magicLevel: 1, clovers: 2, coins: 7, hasBall: true, behaviour: 'normal' }, flags: { chapter: 1, prologueDone: true, intro: true, c1_started: true } };
  await p2.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, JSON.stringify(v1));
  await open(p2, '?nocine');
  const o = await p2.evaluate(() => ({ cont: document.querySelector('#btn-continue').disabled, load: document.querySelector('#btn-load').disabled }));
  await p2.click('#title [data-act="loadgame"]'); await p2.evaluate(() => game.step(0.05));
  const r = await p2.evaluate(() => [...document.querySelectorAll('#loadgame .slot')].map((b) => ({ n: +b.dataset.slot, dis: b.disabled, txt: b.innerText.replace(/\s+/g, ' ').trim() })));
  await p2.click('#loadgame .slot[data-slot="0"]');
  await p2.evaluate(() => { game.testFreeze = true; for (let i = 0; i < 10; i++) game.step(0.05); });
  const g = await p2.evaluate(() => ({ state: game.state, key: game.flags.chapterKey, coins: game.hero.coins, backup: !!localStorage.getItem('lba3_save_v1_backup_v1'), played: game.played }));
  check('an old single save (format 1, no time) shows as the Autosave: chapter and place, no date; the six slots empty; it loads through the migration', !o.cont && !o.load && r[0].n === 0 && !r[0].dis && /Autosave/.test(r[0].txt) && /Chapter 2 · The Joint Project/.test(r[0].txt) && /Citadel Island/.test(r[0].txt) && !/\d{4}/.test(r[0].txt) && r.slice(1).every((x) => x.dis) && g.state === 'play' && g.key === 'project' && g.coins === 7 && g.backup && g.played === null, { o, r, g });
  await b2.close();
}

const fails = done();
process.exit(fails ? 1 : 0);
