// SHOPS-1: Citadel's shops sell (story/shops.js): Mr Bazoo's, the pharmacy, the ticket office, and the Esmer trading
// house on the harbour front (Sefa). In chapter 1 (the dry well), chapter 2 and the evacuation (chapter 8):
//   - the keeper is talked to by input (P.talk: walk up, E, the lines advanced with E) and the shop opens with the
//     stock that shop has in that chapter, at its prices;
//   - a purchase by input (the arrows and E, or a click on the row) takes the kashes and gives the good;
//   - too few kashes is refused (a toast, the deny sound): nothing taken, nothing given, the shop stays open;
//   - a good that would be wasted (a potion at full life, a flask at full magic, a fourth jar) is greyed with why;
//   - the Esmers' parcel (Sefa asks, Osk at the baggage claim has it, back to Sefa): rewarded exactly once;
//   - Mosquibee honey is taken by itself when life runs low; a cabin ticket is taken on the ferry and he steps off
//     with full life and magic (the ferry stays free without one);
//   - Save & quit → Continue keeps what was bought (the kashes, the clovers, the jars, the tickets, the errand);
//   - the evacuation: Mr Bazoo sells at half price while packing; the pharmacy, the ticket office and the Esmer house
//     are shut (their keepers away, a card or a note to read).
// ISO (logged): chapters are set by their flags (as tests/interior-life.mjs); kashes, life and magic are set before a
// purchase so each one can be measured; the hero is put outside a shop's door (exitRoom) and walks in by input; the
// honey's moment (life at 2) is set directly. One picture of each shop open goes to SHOTS (default /dev/shm/shops-shots).
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || '/dev/shm/shops-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { await ev(() => { game.step(0.1); game.renderer.render?.(); }); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

const helpers = () => ev(() => {
  window.said = []; const sv = game.say; game.say = function (n, lines, ...a) { window.said.push({ n, lines: [...lines] }); return sv.call(this, n, lines, ...a); };
  window.T = {
    setChapter(key, extra = {}) { const G = game, f = G.flags; P.settle(); if (G.state === 'shop') { P.tap('Escape', 0.1); P.settle(); } Object.assign(f, { prologueDone: key !== 'well', intro: true, chapterKey: key }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.applyFlags(); G.step(0.2); },
    // outside a room's door (ISO), out of any room first
    // (LAZY-REGIONS: a room's people are placed when the room is built, at its door: walked in first, by input)
    outside(room, walkIn = true) { const G = game; if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); P.settle(); } const o = G.story.exitTo(room + '-out'); G.exitRoom({ ...o, a: o.a + Math.PI }, true, true); G.step(0.3); if (walkIn) return P.enter(room).r; },
    // what the shop shows: its title, each row (label, price, greyed), the purse
    shop() {
      if (game.state !== 'shop') return { state: game.state };
      const rows = [...document.querySelectorAll('#shop .item')].map((b) => ({ label: b.querySelector('span').textContent, price: +(b.querySelector('b')?.textContent || 'NaN'), off: b.disabled }));
      return { state: 'shop', title: document.querySelector('#shop h2')?.textContent, rows, coins: +document.querySelector('#shop .coins')?.textContent, why: document.querySelector('#shop .shop-why')?.textContent };
    },
    // buy by the keys: down to the row (from the top), E
    buyKeys(label) {
      const G = game, btns = [...document.querySelectorAll('#shop button')], i = btns.findIndex((b) => b.classList.contains('item') && b.textContent.includes(label));
      if (i < 0) return 'no item ' + label;
      while ((G.hud.shopSel ?? 0) !== 0) P.tap('ArrowUp', 0.05);
      for (let k = 0; k < i; k++) P.tap('ArrowDown', 0.05);
      const sel = document.querySelector('#shop button.sel')?.textContent || '';
      P.tap('KeyE', 0.1);
      return sel.includes(label) ? 'ok' : 'selected ' + sel;
    },
    // buy by a click on the row (as tests/arsenal.mjs)
    buyClick(label) { const b = [...document.querySelectorAll('#shop .item')].find((x) => x.textContent.includes(label)); if (!b) return 'no item ' + label; if (b.disabled) return 'disabled'; b.click(); game.step(0.1); return 'ok'; },
    toasts() { return [...document.querySelectorAll('.toast')].map((e) => e.textContent); },
    leave() { if (game.state === 'shop') P.tap('Escape', 0.1); P.settle(); return game.state; },
    heard(id) { return window.said.filter((s) => s.n === 'n_' + id).map((s) => s.lines.join(' ')); },
    heardAll() { return window.said.map((s) => s.lines.join(' ')); },
  };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers();

// ================================================================ chapter 1 (the dry well)
await ev(() => T.setChapter('well'));
iso('chapter 1 (the dry well) set by its flags; 100 kashes, magic 0 given for the purchases');
await ev(() => { const h = game.hero; h.coins = 100; h.mp = 0; h.clovers = 2; });

// ---- Mr Bazoo's
const b1 = await ev(() => { T.outside('bazoo'); window.said.length = 0; const r = P.talk('mrbazoo'); return { r: r.r, room: game.room?.id, said: T.heard('mrbazoo'), ...T.shop() }; });
await shot('bazoo');
check('Mr Bazoo (TALK by input): a line of his own, then his shop', b1.r === 'talked' && b1.room === 'bazoo' && b1.state === 'shop' && b1.said.length === 1 && b1.title === "Mr Bazoo's", b1);
check('Mr Bazoo\'s stock in chapter 1 (no blowgun, prologue not done): magic flask 5, clover leaf 22', JSON.stringify(b1.rows?.map((r) => [r.label, r.price])) === JSON.stringify([['Magic flask: refill magic', 5], ['Clover leaf: extra life', 22]]), b1.rows);
const b2 = await ev(() => { const G = game, h = G.hero, c0 = h.coins, k0 = h.clovers; const a = T.buyKeys('Magic flask'); const m = h.mp; const b = T.buyKeys('Clover leaf'); const after = T.shop(); P.tap('ArrowUp', 0.05); const flask = T.shop(); return { a, b, spent: c0 - h.coins, mp: m, mpMax: h.mpMax, clovers: h.clovers - k0, after, flask }; });
check('bought by the keys (arrows, E): the flask (5) fills the magic; the clover (22) adds one; 27 kashes taken', b2.a === 'ok' && b2.b === 'ok' && b2.spent === 27 && b2.mp === b2.mpMax && b2.clovers === 1 && b2.after.coins === 73, b2);
check('the flask is greyed at full magic, and says why', b2.flask.rows?.[0]?.off && /magic is full/.test(b2.flask.why || ''), b2.flask);
const b3 = await ev(() => { const h = game.hero; h.coins = 10; game.step(0.05); const k0 = h.clovers; const r = T.buyKeys('Clover leaf'); game.step(0.1); return { r, coins: h.coins, clovers: h.clovers - k0, state: game.state, toasts: T.toasts(), why: T.shop().why }; });
check('not enough kashes (10 for a 22 clover): refused with a toast, nothing taken or given, the shop stays open', b3.coins === 10 && b3.clovers === 0 && b3.state === 'shop' && b3.toasts.some((t) => /Not enough kashes/.test(t)) && /12 more kashes/.test(b3.why || ''), b3);
await ev(() => { T.leave(); game.hero.coins = 100; });

// ---- the pharmacy
const p1 = await ev(() => { const h = game.hero; h.hp = 3; T.outside('pharmacy'); window.said.length = 0; const r = P.talk('pharmacist'); return { r: r.r, room: game.room?.id, said: T.heard('pharmacist'), ...T.shop() }; });
await shot('pharmacy');
check('the Pharmacist (TALK by input): a line, then the pharmacy', p1.r === 'talked' && p1.room === 'pharmacy' && p1.state === 'shop' && p1.said.length === 1 && p1.title === 'The Pharmacy', p1);
check('the pharmacy\'s stock: heart potion 6, Mosquibee honey 8', JSON.stringify(p1.rows?.map((r) => [r.label, r.price])) === JSON.stringify([['Heart potion: full health', 6], ['Mosquibee honey', 8]]), p1.rows);
const p2 = await ev(() => { const G = game, h = G.hero, c0 = h.coins; const a = T.buyKeys('Heart potion'); const hp = h.hp; const b = T.buyClick('Mosquibee honey'); const c = T.buyClick('Mosquibee honey'); const d = T.buyClick('Mosquibee honey'); const e = T.buyClick('Mosquibee honey');
  G.hud.shopSel = 1; G.hud.shopRender(); const s = T.shop(); G.hud.shopSel = 0; G.hud.shopRender(); return { a, b, c, d, e, spent: c0 - h.coins, hp, maxHp: h.maxHp, honey: G.flags.sh_honey, s, s0: T.shop() }; });
check('bought: the potion (6) fills life; three jars of honey (8 each); a fourth is greyed ("can\'t carry any more"); 30 kashes taken', p2.a === 'ok' && p2.hp === p2.maxHp && p2.honey === 3 && p2.e === 'disabled' && p2.spent === 30 && p2.s.rows?.[1]?.off && /carry any more/.test(p2.s.why) && p2.s0.rows?.[0]?.off && /good health/.test(p2.s0.why), p2);
await ev(() => T.leave());
const p3 = await ev(() => { const G = game, h = G.hero; P.settle(); h.hp = 2; const n0 = G.flags.sh_honey; G.step(0.5); return { hp: h.hp, used: n0 - G.flags.sh_honey, toasts: T.toasts() }; });
check('the honey: with life at 2 a spoonful is taken by itself (+5 life, one jar fewer)', p3.hp === 7 && p3.used === 1 && p3.toasts.some((t) => /spoonful of honey: \+5/.test(t)), p3);

// ---- the ticket office
const t1 = await ev(() => { T.outside('ticket'); window.said.length = 0; const r = P.talk('ines'); return { r: r.r, room: game.room?.id, said: T.heard('ines'), ...T.shop() }; });
await shot('ticket');
check('Ines (TALK by input): a line about the cabin, then the ticket office', t1.r === 'talked' && t1.room === 'ticket' && t1.state === 'shop' && t1.title === 'Ferry Tickets' && t1.said.some((l) => /cabin ticket/.test(l)), t1);
check('the ticket office\'s stock: a cabin ticket for the Desert Island ferry, 5', JSON.stringify(t1.rows?.map((r) => [r.label, r.price])) === JSON.stringify([['Cabin ticket, Desert Island ferry', 5]]), t1.rows);
const t2 = await ev(() => { const G = game, h = G.hero, c0 = h.coins; const a = T.buyKeys('Cabin ticket'); const inv = G.inventory.items().find((i) => i.id === 'ticket'); return { a, spent: c0 - h.coins, tickets: G.flags.sh_ticket, inv }; });
check('bought: one cabin ticket (5); it is in the inventory', t2.a === 'ok' && t2.spent === 5 && t2.tickets === 1 && t2.inv?.n === 1, t2);
await ev(() => T.leave());

// ================================================================ chapter 2 (the water back): the Esmer trading house and its parcel
await ev(() => T.setChapter('project', { c1_water: true }));
iso('chapter 2 (the water back) set by its flags; magic 0 given for the tea');
const e1 = await ev(() => { const G = game; G.hero.mp = 0; G.hero.coins = 60; if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); P.settle(); } G.exitRoom({ x: -84, z: 38.5, a: 0 }, true, true); G.step(0.3); window.said.length = 0; const r = P.talk('sefa'); return { r: r.r, room: G.room?.id ?? 'citadel', said: T.heard('sefa'), ask: !!G.flags.sh_sefaAsk, journal: G.story.journal().find((j) => j.title === 'Harbour trade')?.lines?.map((l) => l.key), ...T.shop() }; });
await shot('esmer');
check('Sefa (TALK by input) at the Esmer trading house: a welcome, the parcel she is short, then her goods', e1.r === 'talked' && e1.state === 'shop' && e1.title === 'The Esmer Trading House' && e1.said.length === 2 && /nine parcels/.test(e1.said[1]) && e1.ask && e1.journal?.includes('sh_j_ask'), e1);
check('Sefa\'s stock (no laser yet): Mosquibee honey 7, Zeelich spice tea 4', JSON.stringify(e1.rows?.map((r) => [r.label, r.price])) === JSON.stringify([['Mosquibee honey', 7], ['Zeelich spice tea: refill magic', 4]]), e1.rows);
const e2 = await ev(() => { const G = game, h = G.hero, c0 = h.coins; const a = T.buyKeys('spice tea'); const mp = h.mp; return { a, mp, mpMax: h.mpMax, spent: c0 - h.coins, honey: G.flags.sh_honey }; });
check('bought: the tea (4) fills the magic', e2.a === 'ok' && e2.mp === e2.mpMax && e2.spent === 4 && e2.honey === 2, e2);
await ev(() => T.leave());
// the parcel: Osk at the baggage claim
const o1 = await ev(() => { const G = game; T.outside('baggage'); window.said.length = 0; const r = P.talk('osk'); P.settle(); return { r: r.r, room: G.room?.id, said: T.heardAll(), parcel: !!G.flags.sh_parcel, inv: G.inventory.items().some((i) => i.id === 'parcel'), state: G.state }; });
check('Osk at the baggage claim (TALK by input, upstairs): the teal parcel is the Esmers\'; it is handed over (the found box) and carried', o1.r === 'talked' && o1.room === 'baggage' && o1.parcel && o1.inv && o1.said.some((l) => /teal one/.test(l)) && o1.state === 'play', o1);
const o2 = await ev(() => { const G = game; window.said.length = 0; const r = P.talk('osk'); P.settle(); return { r: r.r, said: T.heardAll(), parcel: !!G.flags.sh_parcel }; });
check('Osk again before the parcel is delivered: his own lines, no second parcel', o2.r === 'talked' && !o2.said.some((l) => /teal one/.test(l)), o2);
const e3 = await ev(() => { const G = game, h = G.hero; const c0 = h.coins, n0 = G.flags.sh_honey; window.said.length = 0; const r = P.talk('sefa'); const s = T.shop(); T.leave();
  return { r: r.r, said: T.heard('sefa'), coins: h.coins - c0, honey: G.flags.sh_honey - n0, done: !!G.flags.sh_sefaDone, inv: G.inventory.items().some((i) => i.id === 'parcel'), honeyPrice: s.rows?.[0]?.price, journal: G.story.journal().find((j) => j.title === 'Harbour trade')?.lines }; });
check('the parcel back to Sefa (TALK by input): her thanks, 15 kashes and a jar of honey, honey 5 from now on; the parcel leaves the inventory; the journal ticks both lines', e3.r === 'talked' && e3.said.some((l) => /ninth parcel/.test(l)) && e3.coins === 15 && e3.honey === 1 && e3.done && !e3.inv && e3.honeyPrice === 5 && e3.journal?.every((l) => l.done), e3);
const e4 = await ev(() => { const G = game, h = G.hero; const c0 = h.coins; window.said.length = 0; const r = P.talk('sefa'); T.leave(); const r2 = P.talk('osk'); const s2 = T.heardAll(); P.settle(); return { r: r.r, r2: r2.r, coins: h.coins - c0, thanks: T.heard('sefa').some((l) => /ninth parcel/.test(l)), osk: s2.filter((l) => /good morning to the other/.test(l)).length }; });
check('exactly once: Sefa again gives nothing more; Osk says the parcel has gone (once)', e4.r === 'talked' && e4.coins === 0 && !e4.thanks && e4.osk === 1, e4);
const e5 = await ev(() => { const G = game; if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); P.settle(); }
  const n = P.npc('sefa'); n.engage(); n.pos.set(-108.8, n.pos.y, 40.2); n.sync?.();   // (ISO: Sefa at the quay's pile, her round's far stop)
  const r = P.use(-83.5, 44.8, { kind: 'sh_door', near: 1.0 }); P.settle(); n.release(); return { r: r.r, said: T.heardAll().slice(-1) }; });
check('the trading house\'s door with Sefa away on the quay (WALK, E): its sign says what it is and who to ask', /ESMER TRADING HOUSE/.test(e5.said[0] || ''), e5);

// ---- chapter 2, Mr Bazoo with a blowgun: the darts and the penguin join his stock
const b4 = await ev(() => { const G = game; G.hero.arms.blowgun = true; G.hero.arms.darts = 2; T.outside('bazoo'); const r = P.talk('mrbazoo'); const s = T.shop(); const c0 = G.hero.coins; const a = T.buyClick('Three darts'); const b = T.buyClick('Nitro-Meca-Penguin'); const out = { r: r.r, rows: s.rows?.map((x) => [x.label, x.price]), a, b, spent: c0 - G.hero.coins, darts: G.hero.arms.darts, penguins: G.hero.arms.penguins }; T.leave(); return out; });
check('chapter 2, Mr Bazoo (TALK) with a blowgun: flask 5, clover 22, three darts 4, Nitro-Meca-Penguin 4; darts and a penguin bought (8)', b4.r === 'talked' && JSON.stringify(b4.rows) === JSON.stringify([['Magic flask: refill magic', 5], ['Clover leaf: extra life', 22], ['Three darts', 4], ['Nitro-Meca-Penguin', 4]]) && b4.spent === 8 && b4.darts === 5 && b4.penguins === 1, b4);

// ================================================================ Save & quit → Continue keeps what was bought
const before = await ev(() => { const G = game, h = G.hero; return { coins: h.coins, clovers: h.clovers, arms: { darts: h.arms.darts, penguins: h.arms.penguins }, sh: Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.startsWith('sh_'))), inv: G.inventory.items().map((i) => i.id + ':' + (i.n ?? '')).filter((s) => /honey|ticket|parcel/.test(s)) }; });
const keep = path.join(os.tmpdir(), 'shops-save-' + process.pid + '.json');
await quitAndKeep(page, context, keep);
await open(page, '?nocine'); await menu(page, 'continue'); await helpers();
const after = await ev(() => { const G = game, h = G.hero; return { coins: h.coins, clovers: h.clovers, arms: { darts: h.arms.darts, penguins: h.arms.penguins }, sh: Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.startsWith('sh_'))), inv: G.inventory.items().map((i) => i.id + ':' + (i.n ?? '')).filter((s) => /honey|ticket|parcel/.test(s)) }; });
check('Save & quit → Continue: kashes, clovers, darts, penguins, the honey jars, the cabin ticket and the parcel errand all kept', JSON.stringify(before) === JSON.stringify(after) && after.sh.sh_honey === 3 && after.sh.sh_ticket === 1 && after.sh.sh_sefaDone === true, { before, after });
const e6 = await ev(() => { const G = game, h = G.hero; const c0 = h.coins; window.said.length = 0; G.exitRoom({ x: -84, z: 38.5, a: 0 }, true, true); G.step(0.3); const r = P.talk('sefa'); T.leave(); return { r: r.r, coins: h.coins - c0, thanks: T.heard('sefa').some((l) => /ninth parcel/.test(l)) }; });
check('after the load, Sefa still owes nothing more (the reward was once)', e6.r === 'talked' && e6.coins === 0 && !e6.thanks, e6);

// ================================================================ the evacuation (chapter 8)
await ev(() => T.setChapter('evacuation'));
iso('the evacuation (chapter 8) set by its flags; magic 0 given');
const v1 = await ev(() => { const G = game, h = G.hero; h.mp = 0; h.coins = 40; T.outside('bazoo'); window.said.length = 0; const r = P.talk('mrbazoo'); const s = T.shop(); return { r: r.r, said: T.heard('mrbazoo'), ...s }; });
await shot('bazoo-evacuation');
check('the evacuation: Mr Bazoo (TALK), packing, sells what he can\'t carry at half price', v1.r === 'talked' && v1.state === 'shop' && v1.title === "Mr Bazoo's: everything must go" && v1.said.some((l) => /Half price/.test(l)), v1);
check('his stock, halved: flask 3, clover 11, three darts 2, Nitro-Meca-Penguin 2', JSON.stringify(v1.rows?.map((r) => [r.label, r.price])) === JSON.stringify([['Magic flask: refill magic', 3], ['Clover leaf: extra life', 11], ['Three darts', 2], ['Nitro-Meca-Penguin', 2]]), v1.rows);
const v2 = await ev(() => { const G = game, h = G.hero, c0 = h.coins; const a = T.buyKeys('Magic flask'); const out = { a, spent: c0 - h.coins, mp: h.mp === h.mpMax }; T.leave(); return out; });
check('bought in the sale: the flask for 3', v2.a === 'ok' && v2.spent === 3 && v2.mp, v2);
const v3 = await ev(() => { const G = game, out = {};
  for (const [room, id] of [['pharmacy', 'pharmacist'], ['ticket', 'ines']]) {
    const en = { r: T.outside(room) }; const R = G.regions.built(room), sp = Object.values(R.npcSpots)[0];
    window.said.length = 0; const r = P.use(sp.x, sp.z, { kind: 'sh_note', near: 1.4 }); P.settle();
    out[room] = { enter: en.r, room: G.room?.id, keeper: !!P.npc(id)?.present, r: r.r, said: T.heardAll() };
  }
  if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); P.settle(); }
  G.exitRoom({ x: -84, z: 39, a: 0 }, true, true); G.step(0.3); window.said.length = 0;
  const r = P.use(-83.5, 44.8, { kind: 'sh_door', near: 1.0 }); P.settle();
  out.esmer = { r: r.r, sefa: !!P.npc('sefa')?.present && !P.npc('sefa')?.away, said: T.heardAll() };
  return out; });
check('the evacuation: the pharmacy is shut, its keeper away, a card on the counter (WALK, E)', v3.pharmacy.room === 'pharmacy' && !v3.pharmacy.keeper && v3.pharmacy.said.some((l) => /CLOSED/.test(l)), v3.pharmacy);
check('the evacuation: the ticket office is shut, its keeper away, a card on the till (WALK, E)', v3.ticket.room === 'ticket' && !v3.ticket.keeper && v3.ticket.said.some((l) => /NO CROSSINGS/.test(l)), v3.ticket);
check('the evacuation: Sefa is gone; the Esmer house\'s door has a note (WALK, E)', !v3.esmer.sefa && v3.esmer.said.some((l) => /GONE WITH THE TOWN/.test(l)), v3.esmer);

// ================================================================ the cabin ticket on the ferry (after the main story: the ferry runs)
await ev(() => T.setChapter('home', { ep_free: true }));
iso('after the main story (the epilogue, free play) set by its flags; life 4 and magic 0 given before the crossing');
const f1 = await ev(() => { const G = game, h = G.hero, p = G.travel.points.citadel_ferry, L = p.landing;
  if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); P.settle(); }
  G.exitRoom({ x: L.x + 3, z: L.z, a: -Math.PI / 2 }, true, true); P.settle(); h.hp = 4; h.mp = 0; const n0 = G.flags.sh_ticket;
  const r = P.use(p.x, p.z, { kind: 'isleShuttle', near: Math.max(1.5, p.r - 1.2) }); const menu = [...document.querySelectorAll('#shop .item span')].map((s) => s.textContent);
  const pick = P.menuPick(0); P.settle(120);
  return { r: r.r, menu, pick: pick.r, room: G.room?.id ?? 'citadel', state: G.state, used: n0 - (G.flags.sh_ticket || 0), hp: h.hp === h.maxHp, mp: h.mp === h.mpMax, toasts: T.toasts() }; });
check('the ferry with a cabin ticket (WALK, E, the menu): to Desert Island; the ticket is taken and he steps off with full life and magic', f1.room === 'desert' && f1.state === 'play' && f1.used === 1 && f1.hp && f1.mp && /Desert/.test(f1.menu[0] || ''), f1);
const f2 = await ev(() => { const G = game, h = G.hero, p = G.travel.points.desert_ferry; h.hp = 4; const n0 = G.flags.sh_ticket || 0;
  const r = P.use(p.x, p.z, { kind: 'isleShuttle', near: Math.max(1.5, p.r - 1.2) }); P.menuPick(0); P.settle(120);
  return { r: r.r, room: G.room?.id ?? 'citadel', state: G.state, tickets: n0, hp: h.hp }; });
check('the ferry back without a ticket: still free (no gate), no refill', f2.room === 'citadel' && f2.state === 'play' && f2.tickets === 0 && f2.hp === 4, f2);

console.log('SHOTS ' + SHOTS);
await browser.close();
done();
