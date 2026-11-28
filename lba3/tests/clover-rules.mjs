// CLOVER-RULES (docs/lba-maturity/CLOVER-BALANCE.md, Option A, the user's pick of 25.11): the one clover rule, read in
// actors.js (hero.cloverFull / gainClover / shopClover) and asked by every cap site. One covering suite on a new game:
//   A  the cap: 9 with no clover box, 13 with all four (the kc_box_* flags); a leaf below the cap, at the cap 10 kashes
//   B  a reward at the cap pays 10 kashes and says so (a chapter's giveClover; a reward owed after a load: settleOwed)
//   C  a leaf on the ground at the cap stays on the ground (it is not taken, it hops aside); with room it is taken
//   D  the shops: Pippa's stall and Mr Bazoo's sell a leaf only below nine (greyed with why at 9, with a box found);
//      at 8 it is bought
//   E  Mila (wave 4), Arthur (wave 4) and Pippa (wave 7): kashes, never a leaf (option A, the user's pick 25.11): Mila 15 + 10, Arthur 10, Pippa 10, under the cap and at it
//      (they compared with a fixed 9 before); at the cap: their kashes and 10 more
//   F  a converted reward: the quay light pays 15 kashes and no leaf; the stump gives 10 kashes, once ever; the asylum
//      desk and the Bù maze's chest give no clover and refill as other containers do
// ISO (logged): the leaves, kashes and box flags are set in the page; the rewards are called as their dialogue's end
// calls them (the lines are not played here; each reward's own suite plays it). SERVE=1 answers this checkout's files.
// Automated runtime only (SwiftShader, headless Chromium): no hardware figure, no playtime.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);

await open(page, '?nocine'); await menu(page, 'new');
await ev(() => {
  for (let i = 0; i < 20; i++) game.step(0.05);
  window.boxes = (n) => { const f = game.flags; ['fort', 'pump', 'goat', 'mask'].forEach((b, i) => { if (i < n) f['kc_box_' + b] = true; else delete f['kc_box_' + b]; }); game.story.kc.sync(); return game.hero.cloverMax; };
  window.toasts = () => [...document.querySelectorAll('.toast')].map((e) => e.textContent);
  window.clearToasts = () => { for (const e of document.querySelectorAll('.toast')) e.remove(); };
});

// ================================================================ A · the cap
iso('the leaves and the box flags set in the page');
const a = await ev(() => {
  const h = game.hero, out = {};
  out.cap0 = boxes(0);
  h.clovers = 8; h.coins = 0; out.below9 = [h.gainClover(), h.clovers, h.coins];
  out.at9 = [h.gainClover(), h.clovers, h.coins];
  out.cap4 = boxes(4);
  h.clovers = 12; h.coins = 0; out.below13 = [h.gainClover(), h.clovers, h.coins];
  out.at13 = [h.gainClover(), h.clovers, h.coins];
  return out;
});
check('A: no clover box: the cap is 9; at 8 a leaf is given (9); at 9 no leaf, 10 kashes instead', a.cap0 === 9 && a.below9.join() === 'true,9,0' && a.at9.join() === 'false,9,10', a);
check('A: all four boxes: the cap is 13; at 12 a leaf is given (13); at 13 no leaf, 10 kashes instead', a.cap4 === 13 && a.below13.join() === 'true,13,0' && a.at13.join() === 'false,13,10', a);

// ================================================================ B · a reward at the cap
const b = await ev(() => {
  const G = game, h = G.hero, ch = G.story.cur; boxes(1); clearToasts();
  h.clovers = 10; h.coins = 0; const got = ch.giveClover('toast_clover_found'); G.step(0.1);
  const r1 = { got, clovers: h.clovers, coins: h.coins, toasts: toasts() };
  // an owed reward whose pickup no longer lies anywhere (a load): given straight away; at the cap its kashes
  clearToasts(); G.flags.cr_owe = 1; h.clovers = 10; h.coins = 0;
  const settled = ch.settleOwed('cr_owe', 'clover', 1, 'l_toast_owed_clover'); G.step(0.1);
  const r2 = { settled, owed: G.flags.cr_owe || 0, clovers: h.clovers, coins: h.coins, toasts: toasts() };
  clearToasts(); G.flags.cr_owe = 1; h.clovers = 9; h.coins = 0;
  ch.settleOwed('cr_owe', 'clover', 1, 'l_toast_owed_clover'); G.step(0.1);
  const r3 = { clovers: h.clovers, coins: h.coins, toasts: toasts() };
  return { r1, r2, r3 };
});
check('B: a reward\'s leaf at the cap (10, one box): no leaf, 10 kashes, the toast says the leaves are full', !b.r1.got && b.r1.clovers === 10 && b.r1.coins === 10 && b.r1.toasts.some((t) => /10 kashes: your clover leaves are full/.test(t)), b.r1);
check('B: an owed leaf settled after a load at the cap: 10 kashes, nothing owed; below the cap (9 of 10): the leaf, its own toast', b.r2.settled && b.r2.owed === 0 && b.r2.clovers === 10 && b.r2.coins === 10 && b.r2.toasts.some((t) => /clover leaves are full/.test(t)) && b.r3.clovers === 10 && b.r3.coins === 0 && b.r3.toasts.some((t) => /Bram's clover/.test(t)), b);

// ================================================================ C · a leaf on the ground at the cap
const c = await ev(() => {
  const G = game, h = G.hero; boxes(1); h.clovers = 10;
  const p = G.pickups.spawn('clover', h.pos.x, h.pos.y + 0.6, h.pos.z, { id: 'cr-ground' });
  for (let i = 0; i < 60; i++) G.step(0.05);
  const full = { lying: G.pickups.list.includes(p), clovers: h.clovers, taken: G.collected.includes('cr-ground') };
  h.clovers = 9; p.pos.x = h.pos.x; p.pos.z = h.pos.z; p.baseY = h.pos.y + 0.6; p.pos.y = p.baseY; p.fly = false;
  for (let i = 0; i < 40; i++) G.step(0.05);
  return { full, room: { lying: G.pickups.list.includes(p), clovers: h.clovers } };
});
check('C: a leaf on the ground at the cap (10 of 10) stays on the ground for 3 s, not taken; with room (9) it is taken: 10', c.full.lying && c.full.clovers === 10 && !c.full.taken && !c.room.lying && c.room.clovers === 10, c);

// ================================================================ D · the shops sell below nine only
const shopRow = () => ev(() => {
  const row = [...document.querySelectorAll('#shop .item')].find((x) => /Clover leaf/.test(x.textContent));
  return { open: game.state === 'shop', found: !!row, off: !!row?.disabled };
});
const d = {};
await ev(() => { const h = game.hero; boxes(2); h.clovers = 9; h.coins = 100; game.openShop('citadel'); game.step(0.1); });
d.pippa9 = await shopRow();
d.pippa9.why = await ev(() => { const it = [...document.querySelectorAll('#shop button')].findIndex((b) => /Clover leaf/.test(b.textContent)); while ((game.hud.shopSel ?? 0) < it) P.tap('ArrowDown', 0.05); game.step(0.05); return document.querySelector('#shop .shop-why')?.textContent; });
d.pippa9.buy = await ev(() => { const h = game.hero, k = h.coins; P.tap('KeyE', 0.1); game.step(0.1); return { clovers: h.clovers, spent: k - h.coins }; });
await ev(() => { P.tap('Escape', 0.1); game.step(0.1); const h = game.hero; h.clovers = 8; game.openShop('citadel'); game.step(0.1); });
d.pippa8 = await shopRow();
d.pippa8.buy = await ev(() => { const h = game.hero, k = h.coins; const b = [...document.querySelectorAll('#shop .item')].find((x) => /Clover leaf/.test(x.textContent)); b?.click(); game.step(0.1); return { clovers: h.clovers, spent: k - h.coins }; });
await ev(() => { P.tap('Escape', 0.1); game.step(0.1); });
d.bazoo = await ev(() => {
  const h = game.hero, S = game.story.shops, row = () => S.stock('bazoo').find((x) => x.id === 'clover');
  h.clovers = 9; const r9 = row(); h.clovers = 12; const r12 = row(); h.clovers = 8; const r8 = row();
  return { at9: [r9.disabled, r9.why], at12: [r12.disabled, r12.why], at8: [r8.disabled, r8.why], cap: h.cloverMax };
});
check('D: Pippa\'s stall with a box found (cap 11) and 9 leaves: the clover leaf greyed, its why "Sold only while you hold fewer than nine", E buys nothing', d.pippa9.open && d.pippa9.found && d.pippa9.off && /fewer than nine/.test(d.pippa9.why || '') && d.pippa9.buy.clovers === 9 && d.pippa9.buy.spent === 0, d.pippa9);
check('D: Pippa\'s stall at 8 leaves: the clover leaf sold (22): 9', d.pippa8.found && !d.pippa8.off && d.pippa8.buy.clovers === 9 && d.pippa8.buy.spent === 22, d.pippa8);
check('D: Mr Bazoo\'s stock (cap 11): the clover leaf greyed at 9 and at 12 with the same why; sold at 8', d.bazoo.cap === 11 && d.bazoo.at9[0] && d.bazoo.at9[1] === 'shop_clover_nine' && d.bazoo.at12[0] && !d.bazoo.at8[0], d.bazoo);

// ================================================================ E · Mila, Arthur, Pippa with a box found
iso('Mila\'s, Arthur\'s and Pippa\'s rewards called as their dialogue\'s end calls them (their lines: tests/wave4.mjs, wave7.mjs)');
const e = await ev(() => {
  const G = game, h = G.hero, f = G.flags, S = G.story, out = {};
  const run = (fn) => { try { fn(); } catch (err) { return String(err); } for (let i = 0; i < 6; i++) { if (G.foundObj?.cur) G.foundObj.finish(); G.step(0.1); } if (G.state !== 'play') G.setState('play'); return null; };
  const quiet = (W, fn) => { const ch = W.chain; W.chain = (l, d) => d?.(); try { return run(fn); } finally { W.chain = ch; } };
  boxes(2);
  // Mila: 10 of 11
  f.w4l_sack = true; delete f.w4l_given; h.clovers = 10; h.coins = 0;
  out.milaErr = run(() => S.w4.mila(null, (keys, cb) => { cb(); return true; }));
  out.mila = { clovers: h.clovers, coins: h.coins, given: !!f.w4l_given };
  // Arthur: 9 of 11
  h.clovers = 9; h.coins = 0; out.arthurErr = quiet(S.w4, () => S.w4.lampDone());
  out.arthur = { clovers: h.clovers, coins: h.coins };
  // Pippa: 12 of 13 (four boxes)
  boxes(4); h.clovers = 12; h.coins = 0; out.pippaErr = quiet(S.w7, () => S.w7.deliver());
  out.pippa = { clovers: h.clovers, coins: h.coins };
  // at the cap: Mila 15 + 10, Arthur 10, Pippa 10
  delete f.w4l_given; h.clovers = 13; h.coins = 0; run(() => S.w4.mila(null, (keys, cb) => { cb(); return true; }));
  out.milaCap = { clovers: h.clovers, coins: h.coins };
  h.coins = 0; quiet(S.w4, () => S.w4.lampDone()); out.arthurCap = { clovers: h.clovers, coins: h.coins };
  h.coins = 0; quiet(S.w7, () => S.w7.deliver()); out.pippaCap = { clovers: h.clovers, coins: h.coins };
  out.state = G.state;
  return out;
});
check('E: Mila with a box found (cap 11) and 10 leaves: no leaf (10), 15 + 10 kashes', !e.milaErr && e.mila.given && e.mila.clovers === 10 && e.mila.coins === 25, e);
check('E: Arthur with a box found (cap 11) and 9 leaves: no leaf (9), 10 kashes', !e.arthurErr && e.arthur.clovers === 9 && e.arthur.coins === 10, e);
check('E: Pippa with four boxes (cap 13) and 12 leaves: no leaf (12), 10 kashes', !e.pippaErr && e.pippa.clovers === 12 && e.pippa.coins === 10, e);
check('E: at the cap (13): Mila 15 + 10 kashes, Arthur 10, Pippa 10; no leaf over the cap', e.milaCap.clovers === 13 && e.milaCap.coins === 25 && e.arthurCap.coins === 10 && e.pippaCap.coins === 10 && e.pippaCap.clovers === 13, e);

// ================================================================ F · converted rewards and containers
const fr = await ev(() => {
  const G = game, h = G.hero, f = G.flags, out = {};
  boxes(0); h.clovers = 5; h.coins = 0; f.pp_lens = true; delete f.pp_light;
  try { G.story.ipeople.fitLens(); } catch (err) { out.err = String(err); }
  for (let i = 0; i < 4; i++) G.step(0.1); if (G.state !== 'play') G.setState('play');
  out.light = { clovers: h.clovers, coins: h.coins, lit: !!f.pp_light };
  const stump = G.world.givers.find((x) => x.id === 'stump');
  out.stump = { kinds: stump.kinds, n: stump.n, once: G.giverOnce(stump) };
  const kindsOf = (room, id) => { try { G.regions.ensure(room, 'test'); } catch (err) { return 'err ' + err; } const gv = G.rooms[room]?.givers?.find((x) => x.id === id); return gv ? { kinds: gv.kinds, once: G.giverOnce(gv) } : 'missing'; };
  out.desk = kindsOf('asylum', 'asylum_desk'); out.bu = kindsOf('bumaze', 'bu_halls');
  return out;
});
check('F: the quay light fitted (pp_lens set): 15 kashes, no leaf (Option A)', !fr.err && fr.light.lit && fr.light.coins === 15 && fr.light.clovers === 5, fr);
check('F: the stump gives 10 kashes, once ever; the asylum desk and the Bù maze\'s chest give no clover and refill', fr.stump.kinds.join() === 'money' && fr.stump.n === 10 && fr.stump.once && fr.desk.kinds?.join() === 'money,life' && !fr.desk.once && fr.bu.kinds?.join() === 'life,magic' && !fr.bu.once, fr);

await done();
