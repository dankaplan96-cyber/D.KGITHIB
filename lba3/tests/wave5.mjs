// WAVE 5 (docs/lba-maturity/WAVE5.md; CONTENT-15H.md §3 H-12, H-13, H-14; src/game/story/wave5.js, wave5world.js): Nell's
// tune-ups and Baldino's tins, the monastery cistern and the old adit's seam, Ilka's warm-ground readings. One covering
// suite, played by input where it says INPUT (tests/lib/player.js: walking, talking, E, menu picks, Athletic and the
// hop-pack held, the tool's attack key K) from the campaign's own saves made before wave 5 (tests/fixtures/campaign/
// base-13-desert: chapter 14 on Desert Island; base-12-plans: chapter 9 with the plans; both format 5), loaded through
// Continue as a player would:
//   D  H-14 (Desert Island): the old save loads (format 6, no w5 state made up, the tools' numbers as before); a stake
//      before Ilka's word (a look, no reading); Ilka (TALK): the hook; stake 1 by the fork (INPUT, K); stake 2 watched:
//      walked off half-way (no reading), then watched to the end (E, three seconds: the flag lifts); stake 3 by the
//      fork; Ilka (TALK): the map, once; again: her after line; the holomap's layer (the places that still hum, fewer
//      once a crystal is taken); the board's way (the readings pinned, ISO: the state before it set by flags)
//   T  H-12's tins and the tuned pack: Desert Island's tin looked at from below (E); a plain jump (no pack) does not
//      reach its top; the pack (INPUT: Athletic, Space held toward it) lands him on top: the tin (E), 8 kashes; the same
//      on Citadel's plateau and under Lhar's falls (the third: "all three"); every stack's surroundings re-measured:
//      nothing standable within 6 m that its top would bring in reach
//   N  H-12 at Nell's bench (Citadel): Nell (TALK): the hook; the chalk list (E): a line per tool owned; Pello on the
//      Orchard (TALK): the bulb; Tashi in Lhar (TALK): the sleeve; Baldino (TALK): where the tins are; Nell (TALK): the
//      menu — too few kashes (her line, nothing tuned), then each of the three: the tools' numbers 8 → 12 jets, 90 →
//      150 s, 2.2 → 3.0 s of thrust, the descriptions; the tuned pack flown on flat ground: no higher than its cap;
//      Save & quit → Continue: the tunes kept, the parts gone, the menu empty (once each)
//   C  H-13 (the monastery yard): Tenpa (TALK, in the hall): the hook; the basin (E); the bucket (E), the trough (E),
//      the basin (E): one step of six; Save & quit → Continue: kept; the lance (INPUT, K) aimed away (no step), at the
//      basin until the tank is dry, refilled at the trough (E), the rest: the door goes up; the store (E): 20 kashes,
//      once; the tea (E) fills the magic, again when full: his line, nothing more; Tenpa (TALK): the lore, once
//   S  H-13 (Under Celebration): Jaspa (TALK, Knartas, his gems sorted: ISO): the hint; the pocket set hears the seam;
//      the frame (E) dark, then with the lantern lit (the glint); a bare fist (INPUT, K): a thud; the glove (K): broken,
//      the rough gem; Jaspa (TALK): 25 kashes, once
//   V  H-14 in chapter 9 (base-12-plans, the readings done: ISO): into the council chamber (INPUT): Dallan's proof scene
//      with Ilka's numbers and Brum's vote said out loud; the vote as before
//   O  the wave's pieces scanned with the overlap sweep's library (tests/lib/sweep.js): no finding names a wave-5 piece
// ISO (logged): the tools the bot's campaign never picked up (lance, flask, pack, fork, glove, pocket set, lantern) and
// some kashes are given; Nell's shipment finished by its flags; a region reached by the travel network's own move.
// ONLY=DTNCSVO runs parts. SHOTS=dir writes the pictures (the play camera; before/after pairs: the before frame is the
// same frame with this wave's pieces hidden). SERVE=1 answers this checkout's files by request routing.
// Automated runtime only (SwiftShader, headless Chromium): no person played it, no hardware figure.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const SWEEP = fileURLToPath(new URL('./lib/sweep.js', import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`./fixtures/campaign/${n}.save.json`, import.meta.url));
const ONLY = process.env.ONLY || 'DTNCSVO';
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let browser, page;
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 300000 }); };
const pair = async (n, hide) => { if (!SHOTS) return; await ev(hide, true); await shot(n + '-before'); await ev(hide, false); await shot(n + '-after'); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const G = game, I = G.input;
  const m = await import('/src/game/wave5world.js'); window.W5 = m.W5;
  const tl = await import('/src/game/tools.js'), jp = await import('/src/game/jetpack.js'); window.NUM = () => ({ tank: tl.LANCE.tank, keep: tl.FLASK.keep, fuel: jp.JET.fuel, cap: jp.JET.cap });
  window.w5 = () => Object.fromEntries(Object.entries(G.flags).filter(([k]) => /^w5/.test(k)));
  window.r2 = (v) => +(+v).toFixed(2);
  window.W = () => G.story.depth.w5;
  window.items = () => [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span')?.textContent || b.textContent);
  window.pick = (txt) => { const n = items().findIndex((s) => s.includes(txt)); return n >= 0 ? P.menuPick(n).r : 'no item ' + txt; };
  window.inv = () => G.inventory.items().map((i) => i.id);
  // a shop or menu left as a player leaves it (its Leave button, else Escape)
  window.closeShop = () => { if (G.state !== 'shop') return 'none'; document.querySelector('#shop .leave')?.click(); G.step(0.2); if (G.state === 'shop') P.tap('Escape', 0.2); if (G.state === 'shop') G.hud.shopClose?.(); G.step(0.2); P.settle(); return G.state; };
  // ISO: into a region by the travel network's own move (the room switch the glider and the shuttles use)
  window.goRegion = (id, x, z, a = 0) => { if (id === 'citadel') { if (G.room) G.exitRoom({ x, z, a }, true); else { G.hero.pos.set(x, G.physics.groundAt(x, z), z); } } else { G.regions.ensure(id, 'test'); const R = G.rooms[id]; G.enterRoom(id, x == null ? R.spawn : { x, z, a }, true); } G.story.refreshCast(); P.settle(); G.step(0.3); return G.room?.id ?? 'citadel'; };
  window.J = {
    athletic() { if (G.hero.behaviour !== 'athletic') P.tap('F2', 0.05); return G.hero.behaviour; },
    hold(keys, t, { dt = 1 / 60, letGoUp = null, letGo = null, until = null } = {}) {
      const h = G.hero, j = G.gadgets.jet;
      const r = { y0: h.pos.y, maxY: h.pos.y, lit: 0, frames: 0 };
      for (const k of keys) { I.keys.add(k); if (k === 'Space') I.taps.add(k); }
      let el = 0;
      while (el < t) {
        G.step(dt); el += dt; r.frames++;
        r.maxY = Math.max(r.maxY, h.pos.y);
        if (j.firing) r.lit++;
        if (letGoUp && letGoUp()) I.keys.delete('ArrowUp');
        if (letGo && letGo()) { I.keys.delete('Space'); I.keys.delete('ArrowUp'); }
        if (until && until()) break;
      }
      for (const k of keys) I.keys.delete(k);
      r.t = +el.toFixed(2); r.y0 = r2(r.y0); r.maxY = r2(r.maxY); r.litS = r2(r.lit * dt);
      return r;
    },
    // a hop toward (x, z): from `from` metres short, Space (and Up) held until he lands on something
    hop(x, z, { from = 1.7, t = 4, brake = 0.4, top = null } = {}) {
      const h = G.hero, a = Math.atan2(x - h.pos.x, z - h.pos.z);
      P.go(x - Math.sin(a) * from, z - Math.cos(a) * from, { tol: 0.35, maxT: 25, fight: false });
      J.athletic(); P.face(x, z);
      let air = false;
      const r = J.hold(['Space', 'ArrowUp'], t, { letGoUp: () => Math.hypot(h.pos.x - x, h.pos.z - z) < brake, letGo: top == null ? null : () => Math.hypot(h.pos.x - x, h.pos.z - z) < 0.6 && h.pos.y > top + 0.05, until: () => { if (!h.onGround) air = true; return air && h.onGround; } });
      G.step(0.3);
      return { ...r, y: r2(h.pos.y) };
    },
  };
  // the tool in hand (the weapon wheel's pick; ISO: the wheel's choice made in code) and one press of the attack key
  window.useTool = (id) => { const h = G.hero; h.combat.equip(id, true); G.step(0.2); G.gadgets.tools.jetCool = 0; P.tap('KeyK', 0.05); G.step(0.6); return h.combat.weapon; };
});
const boot = async (fixture) => {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fixture), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 60 && game.state !== 'play'; i++) game.step(0.1); for (let i = 0; i < 20; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded; await reboot();
};
const hideW5 = (h) => { for (const o of [W5.list?.grp, ...Object.values(W5.tins || {}).map((t) => t.grp), W5.cistern?.grp, W5.bucket?.grp, W5.iceHole?.grp, W5.seam?.grp, ...(W5.stakes || []).map((s) => s.grp)]) if (o) o.visible = !h; if (!h) game.story.depth.w5.applyWorld(); };

// ================================================================ the old save; D · H-14 Ilka's breathing ground
const NEED = /[DTNCSO]/.test(ONLY);
if (NEED) await boot('base-13-desert');
if (NEED) {
  const a0 = await ev(() => ({ v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, ch: game.flags.chapterKey, room: game.room?.id, w5: Object.keys(w5()), num: NUM(), stakes: (W5.stakes || []).length, tin2: !!W5.tins?.[2] }));
  check('the campaign\'s chapter-14 save from before wave 5 (format 5) loads through Continue: format 6, chapter 14 on Desert Island, in play, no w5 state made up; the tools\' numbers as before (8 jets, 90 s, 2.2 s of thrust); the three stakes and the island\'s tin stack are there', a0.v === 6 && a0.state === 'play' && a0.ch === 'network' && a0.room === 'desert' && a0.w5.length === 0 && a0.num.tank === 8 && a0.num.keep === 90 && a0.num.fuel === 2.2 && a0.stakes === 3 && a0.tin2, a0);
  iso('the tools the bot\'s campaign never picked up, and 60 kashes: the lance (full), the heat flask, the hop-pack (worn), the fork, the glove, the pocket set, the lantern; Nell\'s shipment finished (l_coupler, l_cleared, l_nellPaid)');
  await ev(() => { const h = game.hero, A = h.arms; Object.assign(A, { lance: true, water: 8, heatflask: true, jetpack: true, jetpackOn: true, fork: true, glove: true, pocketset: true, lantern: true }); h.coins = 60; Object.assign(game.flags, { l_coupler: true, l_cleared: true, l_nellPaid: true, l_cs: 'done' }); game.story.applyFlags(); game.step(0.2); });
}
if (ONLY.includes('D')) {
  const d1 = await ev(() => { const S = W5.stakes[0]; const u = P.use(S.x, S.z, { kind: 'w5b_stake', near: 1.0, match: 1.6 }); return { u: u.r, read: w5().w5b_1 ?? null }; });
  const d1l = await said();
  check('D: stake 1 by the oasis before Ilka\'s word (INPUT, E): a look ("one of Ilka\'s survey stakes"), no reading', d1.u === 'used' && d1.read === null && has(d1l, /survey stakes/), { d1, d1l });
  if (SHOTS) { await ev(() => { const S = W5.stakes[0]; P.go(S.x + 2.2, S.z + 2.4, { tol: 0.5 }); P.face(S.x, S.z); P.settle(); }); await pair('wave5-01-stake', hideW5); }
  const d2 = await ev(() => { const k = P.talk('ilka'); return { k: k.r, ask: !!w5().w5b_ask }; });
  const d2l = await said();
  check('D: Ilka at the bore (TALK, INPUT: walked there): her own line, then the hook — the vent breathes, numbers or the council calls it a feeling; three stakes; strike the fork or watch the flag; her board or her', d2.k === 'talked' && d2.ask && has(d2l, /in numbers/) && has(d2l, /three stakes/) && has(d2l, /watch its little flag/), { d2, d2l });
  const d3 = await ev(() => { const S = W5.stakes[0]; P.go(S.x - 1.2, S.z - 0.6, { tol: 0.4 }); P.face(S.x, S.z); const w = useTool('fork'); P.settle(); return { w, read: w5().w5b_1 }; });
  const d3l = await said();
  check('D: stake 1 by the fork (INPUT: the fork in hand, K by the stake): "rings low and long: warm ground"; reading 1 of 3', d3.w === 'fork' && d3.read === 'fork' && has(d3l, /rings low and long/), { d3, d3l });
  const d4 = await ev(() => { const G = game, S = W5.stakes[1], h = G.hero; G.hero.combat.equip('fists', true); const u = P.use(S.x, S.z, { kind: 'w5b_stake', near: 1.0, match: 1.6 }); const watching = !!W().watch; G.step(0.6); P.go(S.x + 4.5, S.z + 2.5, { tol: 0.4, run: true, maxT: 2 }); G.step(3); return { u: u.r, watching, read: w5().w5b_2 ?? null, after: !!W().watch, d: r2(Math.hypot(h.pos.x - S.x, h.pos.z - S.z)) }; });
  check('D: stake 2 on the dig\'s rim watched (INPUT, E), walked off (run) after 0.6 s: the watch ends, no reading', d4.u === 'used' && d4.watching && d4.read === null && !d4.after, d4);
  const d5 = await ev(() => { const G = game, S = W5.stakes[1]; const u = P.use(S.x, S.z, { kind: 'w5b_stake', near: 1.0, match: 1.6 }); let lift = 0, t = W().watch?.t || 0; while (W().watch && t < 5) { G.step(0.1); t += 0.1; lift = Math.max(lift, S.lift); } P.settle(); return { u: u.r, t: r2(t), lift: r2(lift), read: w5().w5b_2 }; });
  const d5l = await said();
  check('D: stake 2 watched to the end (INPUT, E, standing by it): about three seconds, the flag lifts, "Warm ground"; reading 2 of 3', d5.u === 'used' && d5.read === 'flag' && d5.t >= 2.8 && d5.t <= 3.3 && d5.lift > 0.5 && has(d5l, /flag hangs/), { d5, d5l });
  if (SHOTS) { await ev(() => { const S = W5.stakes[2]; P.go(S.x - 1.2, S.z - 0.6, { tol: 0.4 }); P.face(S.x, S.z); W5.stakes[2].lift = 1; game.step(0.05); }); await shot('wave5-02-stake-flag-lifts'); }
  const d6 = await ev(() => { const S = W5.stakes[2]; P.go(S.x - 1.2, S.z - 0.6, { tol: 0.4 }); P.face(S.x, S.z); const w = useTool('fork'); P.settle(); game.hero.combat.equip('fists', true); return { w, read: w5().w5b_3, n: W().readings() }; });
  const d6l = await said();
  check('D: stake 3 by Hesk\'s flags by the fork (INPUT, K): the third reading, "That\'s three readings"', d6.read === 'fork' && d6.n === 3 && has(d6l, /three readings/), { d6, d6l });
  const d7 = await ev(() => { const c0 = game.collected.length; const k = P.talk('ilka'); const hums = [...(W().humRegions() || [])].sort(); return { k: k.r, done: w5().w5b_done, hums, c0 }; });
  const d7l = await said();
  check('D: Ilka (TALK): "Three for three", her map; the holomap\'s layer rings the places where a singing crystal is still to be found (this save holds none of the quests\' six)', d7.k === 'talked' && d7.done === 'ilka' && d7.hums.length >= 3 && d7.hums.includes('hamalayi') && has(d7l, /Three for three/), { d7, d7l });
  const d8 = await ev(() => { const k1 = P.talk('ilka'); const l1 = window._said.slice(); window._said.length = 0; const k2 = P.talk('ilka'); return { k1: k1.r, k2: k2.r, l1, thx: !!w5().w5b_thx }; });
  const d8l = await said();
  check('D: Ilka again (TALK): her after line once ("Go and see why"); a third time: her own line only (the map given once)', d8.thx && has(d8.l1, /Go and see why/) && !has(d8l, /Go and see why|Three for three/), { d8, d8l });
  const d9 = await ev(() => { const G = game, before = [...W().humRegions()].sort(), ids = ['sc-pack', 'sc-waystone'].filter((i) => !G.collected.includes(i)); G.collected.push(...ids); const after = [...W().humRegions()].sort(); for (const id of ids) G.collected.splice(G.collected.indexOf(id), 1); return { before, after, ids }; });
  check('D: the layer follows the crystals: with the Hamalayi\'s two quest crystals in hand (the waystone\'s, Yorna\'s brother\'s), the Hamalayi drops out (ISO: the ids pushed and taken back)', d9.before.includes('hamalayi') && !d9.after.includes('hamalayi'), d9);
  if (SHOTS) { await ev(() => { P.settle(); P.tap('KeyM', 0.2); game.step(0.5); }); await shot('wave5-03-holomap-hums'); await ev(() => { P.tap('KeyM', 0.2); P.settle(); }); }
  iso('the board\'s way: w5b_done cleared (the three readings kept), then E at Ilka\'s survey board');
  const d10 = await ev(() => { const f = game.flags; delete f.w5b_done; delete f.w5b_thx; const R = game.room.reads.find((r) => r.id === 'survey'); const u = P.use(R.x, R.z, { near: 1.0, match: 2 }); return { u: u.r, done: w5().w5b_done }; });
  const d10l = await said();
  check('D: the readings pinned to Ilka\'s survey board (INPUT, E, her camp): the map copied there ("where something still hums"), done once', d10.u === 'used' && d10.done === 'board' && has(d10l, /Pinned to her board/), { d10, d10l });
}

// ================================================================ T · Baldino's tins and the stacks' rule
if (ONLY.includes('T')) {
  if (SHOTS) { await ev(() => { const S = W5.tins[2]; P.go(S.x + 3.2, S.z + 3.0, { tol: 0.5 }); P.face(S.x, S.z); P.settle(); }); await pair('wave5-04-tin-desert', hideW5); }
  const t1 = await ev(() => { const S = W5.tins[2]; const u = P.use(S.x, S.z, { kind: 'w5t_low', near: 1.4, match: 2 }); return { u: u.r }; });
  const t1l = await said();
  check('T: Desert Island\'s stack by the School: the tin looked at from below (INPUT, E): "A lilac tin… a job for the hop-pack"', t1.u === 'used' && has(t1l, /lilac tin/) && has(t1l, /hop-pack/), { t1, t1l });
  const t2 = await ev(() => { const G = game, h = G.hero, S = W5.tins[2]; h.arms.jetpackOn = false; G.step(0.1); const r = J.hop(S.x, S.z, { t: 2 }); const top = S.top; h.arms.jetpackOn = true; G.step(0.1); return { maxY: r.maxY, top: r2(top), y0: r.y0, y: r.y }; });
  check('T: without the pack (worn off: ISO, the inventory\'s switch) a running jump at the stack (INPUT: Athletic, Space, Up) does not reach its top', t2.maxY < t2.top - 0.4 && t2.y < t2.top - 1, t2);
  const t3 = await ev(() => { const S = W5.tins[2]; const r = J.hop(S.x, S.z, { t: 4, top: S.top }); const tg = P.target(); return { y: r.y, top: r2(S.top), lit: r.litS, tg: tg?.kind }; });
  check('T: with the pack (INPUT: Athletic, Space held toward it): he lands on its top; the prompt is the tin', Math.abs(t3.y - t3.top) < 0.1 && t3.tg === 'w5t_tin', t3);
  const t4 = await ev(() => { const c0 = game.hero.coins; P.tap('KeyE', 0.1); let k = 0; while ((game.hero.actT > 0) && k++ < 60) game.step(1 / 30); P.settle(); return { got: !!w5().w5t_2, coins: game.hero.coins - c0, n: W().tins(), vis: W5.tins[2].tin.visible, inv: inv() }; });
  const t4l = await said();
  check('T: the tin (E): taken, 8 kashes rattling in it, one of three; the inventory holds Baldino\'s tins', t4.got && t4.coins === 8 && t4.n === 1 && !t4.vis && t4.inv.includes('w5t_tins') && has(t4l, /eight kashes/), { t4, t4l });
  const t5 = await ev(() => { const tg = P.target(); P.tap('KeyE', 0.1); P.settle(); return { tg: tg?.kind ?? null, n: W().tins() }; });
  check('T: on the stack again: no prompt for a tin, nothing more taken (once)', t5.tg !== 'w5t_tin' && t5.n === 1, t5);
  // the rule of every stack: nothing to stand on within 6 m that its top would bring in the pack's reach
  const rule = (n) => ev((n) => { const G = game, P0 = G.physics, T = P0.terrain, S = W5.tins[n]; let bad = []; const g0 = S.y; for (const r of [3.2, 4, 5, 6]) for (let i = 0; i < 32; i++) { const x = S.x + Math.sin(i * 0.19635) * r, z = S.z + Math.cos(i * 0.19635) * r, hc = P0.groundAt(x, z, g0 + 8), ht = T.heightAt(x, z); if ((hc > ht + 0.25 && hc > g0 + 0.6) || ht > g0 + 1.8) bad.push([r2(x), r2(z), r2(hc - g0)]); } return { n, at: [r2(S.x), r2(S.z)], h: r2(S.top - S.y), bad: bad.slice(0, 6) }; }, n);
  const r2d = await rule(2);
  iso('to Citadel by the travel network\'s own move: by the stack under the Whispering Cliffs');
  const t6 = await ev(() => { goRegion('citadel', -60, -20, Math.PI); const S = W5.tins[1]; goRegion('citadel', S.x + 3, S.z + 3, Math.atan2(-3, -3)); const r = J.hop(S.x, S.z, { t: 4, top: S.top }); P.tap('KeyE', 0.1); let k = 0; while (game.hero.actT > 0 && k++ < 60) game.step(1 / 30); P.settle(); return { y: r.y, top: r2(S.top), got: !!w5().w5t_1, n: W().tins() }; });
  const r1d = await rule(1);
  check('T: Citadel\'s stack under the Whispering Cliffs: up with the pack (INPUT), the tin (E): two of three', Math.abs(t6.y - t6.top) < 0.1 && t6.got && t6.n === 2, t6);
  if (SHOTS) { await ev(() => { const S = W5.tins[1]; P.go(S.x + 3.0, S.z + 3.0, { tol: 0.5 }); P.face(S.x, S.z); P.settle(); }); await pair('wave5-05-tin-citadel', hideW5); }
  iso('to the Hamalayi by the travel network\'s own move');
  const t7 = await ev(() => { game.regions.ensure('hamalayi', 'test'); const S = W5.tins[3]; goRegion('hamalayi', S.x + 3, S.z + 3, Math.atan2(-3, -3)); const r = J.hop(S.x, S.z, { t: 4, top: S.top }); P.tap('KeyE', 0.1); let k = 0; while (game.hero.actT > 0 && k++ < 60) game.step(1 / 30); P.settle(); return { y: r.y, top: r2(S.top), got: !!w5().w5t_3, n: W().tins() }; });
  const t7l = await said();
  const r3d = await rule(3);
  check('T: the Hamalayi\'s stack under Lhar\'s falls: up with the pack (INPUT), the tin (E): "That\'s all three tins"', Math.abs(t7.y - t7.top) < 0.1 && t7.got && t7.n === 3 && has(t7l, /all three tins/), { t7, t7l });
  if (SHOTS) { await ev(() => { const S = W5.tins[3]; P.go(S.x + 3.0, S.z + 3.0, { tol: 0.5 }); P.face(S.x, S.z); P.settle(); }); await pair('wave5-06-tin-hamalayi', hideW5); }
  check('T: every stack 2.35 m high, and nothing standable within 6 m of it over its foot + 0.6 m, nor ground rising over its foot + 1.8 m: its top brings nothing new in the pack\'s reach (the test step\'s rule)', [r1d, r2d, r3d].every((r) => r.h === 2.35 && r.bad.length === 0), [r1d, r2d, r3d]);
}

// ================================================================ N · Nell's bench, the parts, the tune-ups
if (ONLY.includes('N')) {
  if (!ONLY.includes('T')) { iso('N without T: the three tins set by flags'); await ev(() => { Object.assign(game.flags, { w5t_1: true, w5t_2: true, w5t_3: true }); game.story.applyFlags(); }); }
  iso('to Citadel by the travel network\'s own move: the lane by Nell\'s bench');
  const n1 = await ev(() => { goRegion('citadel', -99.5, 31.5, -Math.PI / 2); const k = P.talk('nell'); return { k: k.r, ask: !!w5().w5n_ask, shop: game.state === 'shop' }; });
  const n1l = await said();
  check('N: Nell (TALK, INPUT): her own line, then the hook — "the right part and I\'ll tune any of your gadgets", the list chalked on her bench', n1.k === 'talked' && n1.ask && !n1.shop && has(n1l, /tune any of your gadgets/) && has(n1l, /chalked on my bench/), { n1, n1l });
  if (SHOTS) { await ev(() => { const L = W5.list; P.go(L.x + 2.0, L.z + 2.2, { tol: 0.4 }); P.face(L.x, L.z); P.settle(); }); await pair('wave5-07-nell-list', hideW5); }
  const n2 = await ev(() => { const L = W5.list; const u = P.use(L.x, L.z, { kind: 'w5n_list', near: 1.0, match: 1.6 }); return { u: u.r, list: !!w5().w5n_list }; });
  const n2l = await said();
  check('N: the chalk list (INPUT, E): a line for each tool he owns — the lance (Pello, the Orchard, 15), the flask (Tashi, Lhar, 20), the pack (Baldino\'s tins, 25)', n2.u === 'used' && n2.list && has(n2l, /PUMP LANCE/) && has(n2l, /HEAT FLASK/) && has(n2l, /HOP-PACK/), { n2, n2l });
  const n3 = await ev(() => { const k = P.talk('nell'); const shop = game.state === 'shop'; const it = shop ? items() : []; const left = closeShop(); return { k: k.r, shop, it, left }; });
  const n3l = await said();
  check('N: Nell (TALK) with the tins but no other part: "What are we tuning?" — only the hop-pack on her menu', n3.shop && n3.it.length === 1 && /Hop-pack/.test(n3.it[0]) && has(n3l, /What are we tuning/), { n3, n3l });
  iso('to the Orchard by the travel network\'s own move (the shuttle\'s pad)');
  const n4 = await ev(() => { goRegion('isle_orchard'); const k = P.talk('or_pell'); return { k: k.r, bulb: !!w5().w5n_bulb, inv: inv(), where: P.here() }; });
  const n4l = await said();
  check('N: Pello the press-master (TALK): asked for the bulb, "Take it. It never fitted.": the pressure bulb (found)', n4.k === 'talked' && n4.bulb && n4.inv.includes('w5n_bulb') && has(n4l, /never fitted/), { n4, n4l });
  const n4b = await ev(() => { P.settle(); const k = P.talk('or_pell'); let left = closeShop(); for (let i = 0; i < 8 && left !== 'shop' && game.state === 'play'; i++) { game.step(0.5); if (game.state === 'shop') left = closeShop(); } P.release(); if (game.state === 'shop') left = closeShop(); return { k: k.r, remark: !!k.remark, left, state: game.state, bulbs: inv().filter((i) => i === 'w5n_bulb').length }; });
  const n4bl = await said();
  check('N: Pello again (TALK): his own line (over his head) and his stall, left; no second bulb', n4b.state === 'play' && n4b.bulbs === 1 && !has(n4bl, /never fitted/), { n4b, n4bl });
  iso('to the Hamalayi by the travel network\'s own move');
  const n5 = await ev(() => { goRegion('hamalayi', 4334, -35, Math.PI); const k = P.talk('lhar1'); return { k: k.r, sleeve: !!w5().w5n_sleeve, inv: inv() }; });
  const n5l = await said();
  check('N: Tashi (TALK): asked nicely for a copper sleeve, "Tell Nell she owes me a cup": the sleeve (found)', n5.k === 'talked' && n5.sleeve && n5.inv.includes('w5n_sleeve') && has(n5l, /owes me a cup/), { n5, n5l });
  iso('to Zeelich by the travel network\'s own move (Baldino\'s workshop)');
  const n6 = await ev(() => { goRegion('zeelich'); const k = P.talk('baldino'); return { k: k.r, ask: !!w5().w5t_ask }; });
  const n6l = await said();
  check('N: Baldino (TALK, in his workshop) with all three tins already taken: no hook (nothing left to tell)', n6.k === 'talked' && !n6.ask && !has(n6l, /prototype went up/), { n6, n6l });
  iso('back to Citadel; 10 kashes first (too few), then 70');
  const n7 = await ev(() => { goRegion('citadel', -99.5, 31.5, -Math.PI / 2); game.hero.coins = 10; const k = P.talk('nell'); const it = items(); const p = pick('Pump lance'); return { k: k.r, it, p, tuned: !!w5().w5n_lance, coins: game.hero.coins, num: NUM() }; });
  const n7l = await said();
  check('N: Nell (TALK): all three on her menu; the lance with 10 kashes: "more kashes than you have", nothing tuned, nothing paid', n7.it.length === 3 && !n7.tuned && n7.coins === 10 && n7.num.tank === 8 && has(n7l, /more kashes than you have/), { n7, n7l });
  const n8 = await ev(() => { const h = game.hero; h.coins = 70; h.arms.water = 3; const out = {}; for (const [id, txt] of [['lance', 'Pump lance'], ['flask', 'Heat flask'], ['pack', 'Hop-pack']]) { const c0 = h.coins; P.talk('nell'); out[id] = { p: pick(txt), paid: c0 - h.coins }; } return { out, num: NUM(), water: h.arms.water, f: w5(), dLance: /12 jets/.test(game.inventory ? (window.t ? '' : '') : '') }; });
  const n8l = await said();
  const n8d = await ev(async () => { const { t } = await import('/src/game/i18n.js'); return { lance: t('itd_lance'), flask: t('itd_heatflask'), pack: t('itd_jetpack'), inv: inv() }; });
  check('N: the three tune-ups (TALK, a pick each): 15, 20, 25 kashes; the lance 12 jets a tank (and filled), the flask holds heat 150 s, the pack 3.0 s of thrust (its cap unchanged, 2.4 m); the tools\' descriptions say so; the parts and the tins gone from the inventory', n8.out.lance.paid === 15 && n8.out.flask.paid === 20 && n8.out.pack.paid === 25 && n8.num.tank === 12 && n8.num.keep === 150 && n8.num.fuel === 3 && n8.num.cap === 2.4 && n8.water === 12 && /12 jets a tank/.test(n8d.lance) && /150 s/.test(n8d.flask) && /tuned by Nell/.test(n8d.pack) && !n8d.inv.some((i) => /^w5[nt]_/.test(i)) && has(n8l, /Twelve jets/) && has(n8l, /won't lift you higher than a storey/), { n8, n8d, n8l });
  const n9 = await ev(() => { const G = game, h = G.hero; const x = -60, z = 4; P.go(x, z, { tol: 0.6, maxT: 60 }); P.settle(); const g0 = G.physics.groundAt(h.pos.x, h.pos.z, h.pos.y + 1); J.athletic(); const r = J.hold(['Space'], 5); J.hold([], 2.5, { until: () => h.onGround }); return { lift: r2(r.maxY - g0), lit: r.litS }; });
  check('N: the tuned pack flown on the square (INPUT: Athletic, Space held 5 s): it burns about 3 s, and lifts him no higher than its cap (2.4 m) above the ground', n9.lift <= 2.45 && n9.lit > 2.4 && n9.lit < 3.4, n9);
  await saveQuit();
  const n10 = await ev(() => { const k = P.talk('nell'); const shop = game.state === 'shop'; closeShop(); return { k: k.r, shop, num: NUM(), f: Object.keys(w5()).filter((k) => /w5n_(lance|flask|pack)/.test(k)), j: (game.story.journal().find((s) => /Odd Jobs/.test(s.title))?.lines || []).map((l) => [l.key, l.done]) }; });
  check('N: Save & quit → Continue: the three tunes kept (12, 150, 3.0 from the flags); Nell (TALK) opens no menu (each tune-up once); the journal\'s "Odd Jobs" lists them done', !n10.shop && n10.num.tank === 12 && n10.num.keep === 150 && n10.num.fuel === 3 && n10.f.length === 3 && n10.j.filter((l) => /w5_j_(lance|flask|pack)/.test(l[0])).every((l) => l[1]), n10);
}

// ================================================================ C · the monastery cistern
if (ONLY.includes('C')) {
  iso('to the Hamalayi by the travel network\'s own move; the lance\'s tank set to 8 jets (untuned) for the count, the magic emptied');
  await ev(() => { const f = game.flags; delete f.w5n_lance; game.story.applyFlags(); goRegion('hamalayi', 4334, -35, Math.PI); game.hero.arms.water = 8; game.hero.mp = 0; });
  if (SHOTS) { await ev(() => { const C = W5.cistern; P.go(C.doorAt.x - 2.6, C.doorAt.z - 1.6, { tol: 0.5, maxT: 90 }); P.face(C.doorAt.x, C.doorAt.z - 0.5); P.settle(); }); await pair('wave5-08-cistern', hideW5); }
  const c1 = await ev(() => { const out = []; let k; for (let i = 0; i < 3 && !w5().w5c_ask; i++) { k = P.talk('hl_monk'); out.push(k.r); } return { k: k.r, talks: out, ask: !!w5().w5c_ask, here: P.here() }; });
  const c1l = await said();
  check('C: Brother Tenpa in the hall (TALK, INPUT: in by its door; the waystone\'s word first if it is due, then again): the cistern door opens when its basin is full; the spring froze; the seed store under it', c1.k === 'talked' && c1.ask && has(c1l, /basin is full/) && has(c1l, /seed store/), { c1, c1l });
  const c2 = await ev(() => { const C = W5.cistern; const u = P.use(C.basinAt.x, C.basinAt.z, { kind: 'w5c_basin', near: 1.0, match: 1.6 }); return { u: u.r, here: P.here() }; });
  const c2l = await said();
  check('C: out in the yard, the basin (INPUT, E): empty, its weight should lift the door; a bucket by the trough, the lance quicker', c2.u === 'used' && has(c2l, /empty stone basin/) && has(c2l, /bucket by the trough/), { c2, c2l });
  const c3 = await ev(() => { const B = W5.bucket, T = W().constructor && W(); const u1 = P.use(B.x, B.z, { kind: 'w5c_bucket', near: 0.8, match: 1.2 }); const b1 = w5().w5c_bucket; const Tr = { x: 4341.6, z: -42.4 }; const u2 = P.use(Tr.x, Tr.z, { kind: 'w5c_trough', near: 1.0, match: 2 }); const b2 = w5().w5c_bucket; const C = W5.cistern; const u3 = P.use(C.basinAt.x, C.basinAt.z, { kind: 'w5c_basin', near: 1.0, match: 1.6 }); return { u: [u1.r, u2.r, u3.r], b1, b2, b3: w5().w5c_bucket, fill: w5().w5c_fill, d: r2(Math.hypot(Tr.x - C.basinAt.x, Tr.z - C.basinAt.z)) }; });
  const c3l = await said();
  check('C: the bucket (E), filled at the trough (E), poured into the basin (E): one step of six; trough to basin a few steps apart (no padding)', c3.u.every((u) => u === 'used') && c3.b1 === 'empty' && c3.b2 === 'full' && c3.b3 === 'empty' && c3.fill === 2 && c3.d < 7 && has(c3l, /Splash/), { c3, c3l });
  await saveQuit();
  const c4 = await ev(() => ({ room: game.room?.id, fill: w5().w5c_fill, bucket: w5().w5c_bucket, basinWater: W5.cistern.water.visible }));
  check('C: Save & quit → Continue (left mid-task): the basin\'s step and the carried bucket kept', c4.room === 'hamalayi' && c4.fill === 2 && c4.bucket === 'empty' && c4.basinWater, c4);
  const c5 = await ev(() => { const G = game, h = G.hero, C = W5.cistern; P.go(C.basinAt.x - 2.6, C.basinAt.z + 0.2, { tol: 0.35 }); P.face(C.basinAt.x - 8, C.basinAt.z + 6); const w0 = h.arms.water; useTool('lance'); const miss = { fill: w5().w5c_fill, used: w0 - h.arms.water }; P.face(C.basinAt.x, C.basinAt.z); let n = 0; while (h.arms.water > 0 && n++ < 12) { G.gadgets.tools.jetCool = 0; P.tap('KeyK', 0.05); G.step(0.6); } return { miss, fill: w5().w5c_fill, water: h.arms.water, open: !!w5().w5c_open }; });
  check('C: the lance (INPUT: in hand, K) aimed away: a jet spent, no step; at the basin until the tank is dry (seven jets): seven half-steps more, the door still shut', c5.miss.used === 1 && c5.miss.fill === 2 && c5.water === 0 && c5.fill === 9 && !c5.open, c5);
  const c6 = await ev(() => { const G = game, h = G.hero, C = W5.cistern, Tr = { x: 4341.6, z: -42.4 }; const u = P.use(Tr.x, Tr.z, { kind: 'w5c_trough', near: 1.0, match: 2 }); const w = h.arms.water; P.go(C.basinAt.x - 2.6, C.basinAt.z + 0.2, { tol: 0.35 }); P.face(C.basinAt.x, C.basinAt.z); let n = 0; while (!w5().w5c_open && n++ < 6) { G.gadgets.tools.jetCool = 0; P.tap('KeyK', 0.05); G.step(0.6); } let t = 0; while (W().doorT > 0 && t < 4) { G.step(0.1); t += 0.1; } P.settle(); return { u: u.r, w, fill: w5().w5c_fill, open: !!w5().w5c_open, doorY: r2(C.door.position.y), store: C.store.visible, bucketBack: W5.bucket.grp.visible, carried: w5().w5c_bucket ?? null }; });
  const c6l = await said();
  check('C: the lance filled at the monks\' trough (E: 8 jets), the rest at the basin: full, "the stone door grinds up"; the door up, the store seen; the bucket back by the trough', c6.u === 'used' && c6.w === 8 && c6.fill === 12 && c6.open && c6.doorY > 1.5 && c6.store && c6.bucketBack && c6.carried === null && has(c6l, /grinds up/), { c6, c6l });
  if (SHOTS) { await ev(() => { const C = W5.cistern; P.go(C.doorAt.x - 2.6, C.doorAt.z - 1.6, { tol: 0.5 }); P.face(C.doorAt.x, C.doorAt.z - 0.5); P.settle(); }); await shot('wave5-09-cistern-open'); }
  const c7 = await ev(() => { const C = W5.cistern, h = game.hero, c0 = h.coins; const u1 = P.use(C.doorAt.x, C.doorAt.z, { kind: 'w5c_store', near: 0.8, match: 1.4 }); const c1 = h.coins - c0; const mp0 = h.mp; const u2 = P.use(C.doorAt.x, C.doorAt.z, { kind: 'w5c_store', near: 0.8, match: 1.4 }); const mp1 = h.mp; const u3 = P.use(C.doorAt.x, C.doorAt.z, { kind: 'w5c_store', near: 0.8, match: 1.4 }); return { u: [u1.r, u2.r, u3.r], coins: c1, coinsAll: h.coins - c0, mp0, mp1, max: h.mpMax }; });
  const c7l = await said();
  check('C: the store (E): seed jars, the tea urn on its warm stone, 20 kashes in the bowl, once; the tea (E): his magic full; again, full already: his line, nothing more', c7.u.every((u) => u === 'used') && c7.coins === 20 && c7.coinsAll === 20 && c7.mp0 === 0 && c7.mp1 === c7.max && has(c7l, /seed store/) && has(c7l, /Butter tea/) && has(c7l, /full already/), { c7, c7l });
  const c8 = await ev(() => { const k1 = P.talk('hl_monk'); const l1 = window._said.slice(); window._said.length = 0; const k2 = P.talk('hl_monk'); return { k1: k1.r, l1, lore: !!w5().w5c_lore }; });
  const c8l = await said();
  check('C: Tenpa (TALK): the first keepers sat on the vent to keep the seed dry; the tea is for whoever passes; once (again: his own line only)', c8.lore && has(c8.l1, /first keepers/) && !has(c8l, /first keepers/), { c8, c8l });
}

// ================================================================ S · the old adit's seam
if (ONLY.includes('S')) {
  iso('to Knartas by the travel network\'s own move; Old Jaspa\'s gems sorted (dx_jaspa_ask, dx_jaspa_sorted, dx_jaspa_thx: ISL-1 done)');
  const s1 = await ev(() => { Object.assign(game.flags, { dx_jaspa_ask: true, dx_jaspa_sorted: true, dx_jaspa_thx: true }); goRegion('isle_knartas'); const k = P.talk('il_jaspa'); return { k: k.r, hint: !!w5().w5s_hint }; });
  const s1l = await said();
  check('S: Old Jaspa (TALK, in his gem room): a seam whistles behind the loose stones in the old adit under Celebration; bring him what you find', s1.k === 'talked' && s1.hint && has(s1l, /whistles behind the loose stones/), { s1, s1l });
  iso('to Under Celebration by the travel network\'s own move');
  const s2 = await ev(() => { goRegion('isle_undergas'); const S = W5.seam; const hums = game.story.kit2.hums().map((x) => x.id); game.hero.arms.lanternOn = false; const u = P.use(S.front.x, S.front.z, { kind: 'w5s_look', near: 1.0, match: 1.6 }); return { hums, u: u.r, glint: S.glint.visible }; });
  const s2l = await said();
  check('S: the pocket set hears the seam (kit2.js hums lists it); the old frame (INPUT, E) in the dark: "Too dark behind them"', s2.hums.includes('w5_seam') && s2.u === 'used' && !s2.glint && has(s2l, /Too dark/), { s2, s2l });
  if (SHOTS) { await ev(() => { const S = W5.seam; P.go(S.front.x + Math.sin(S.ry) * 2.4, S.front.z + Math.cos(S.ry) * 2.4, { tol: 0.4 }); P.face(S.front.x, S.front.z); P.settle(); }); await pair('wave5-10-seam', hideW5); }
  const s3 = await ev(() => { const S = W5.seam; game.hero.arms.lanternOn = true; game.step(0.2); const u = P.use(S.front.x, S.front.z, { kind: 'w5s_look', near: 1.0, match: 1.6 }); return { u: u.r, glint: S.glint.visible, lit: game.gadgets.lanternLit() }; });
  const s3l = await said();
  check('S: the lantern lit (the inventory\'s switch: ISO) and the frame again (E): "something glints in the crack behind them"; the glint shown', s3.u === 'used' && s3.lit && s3.glint && has(s3l, /glints/), { s3, s3l });
  if (SHOTS) await shot('wave5-11-seam-lit');
  const s4 = await ev(() => { const S = W5.seam; P.go(S.front.x + Math.sin(S.ry) * 0.6, S.front.z + Math.cos(S.ry) * 0.6, { tol: 0.3 }); P.face(S.crack.x, S.crack.z); const h = game.hero; h.combat.equip('fists', true); game.step(0.2); P.tap('KeyK', 0.05); game.step(0.8); const fist = !!w5().w5s_broke; h.combat.equip('glove', true); game.step(0.3); P.tap('KeyK', 0.05); game.step(0.9); P.settle(); return { fist, broke: !!w5().w5s_broke, gem: !!w5().w5s_gem, inv: inv(), stones: S.stones.visible }; });
  const s4l = await said();
  check('S: a bare fist at the stones (INPUT, K): a thud, nothing moves; the Wannie glove (K): the stones tumble out, a rough gem (found)', !s4.fist && s4.broke && s4.gem && s4.inv.includes('w5s_gem') && !s4.stones && has(s4l, /tumble out/), { s4, s4l });
  iso('back to Knartas by the travel network\'s own move');
  const s5 = await ev(() => { goRegion('isle_knartas'); const h = game.hero, c0 = h.coins; const k = P.talk('il_jaspa'); const c1 = h.coins - c0; const k2 = P.talk('il_jaspa'); return { k: k.r, coins: c1, all: h.coins - c0, sold: !!w5().w5s_sold, inv: inv() }; });
  const s5l = await said();
  check('S: Old Jaspa (TALK): "Good colour, honest weight", 25 kashes for the gem; again: no second sale', s5.k === 'talked' && s5.coins === 25 && s5.all === 25 && s5.sold && !s5.inv.includes('w5s_gem') && has(s5l, /honest weight/), { s5, s5l });
}

// ================================================================ O · the pieces scanned
if (ONLY.includes('O')) {
  await page.addScriptTag({ path: SWEEP }); await ev(() => SW.init());
  const o1 = await ev(async () => {
    const out = {};
    const keep = (r) => { const all = [...(r.interp || []), ...(r.zf || []), ...(r.floats || []), ...(r.sunk || []), ...(r.buried || []), ...(r.decals || []), ...(r.rockCut || [])]; return all.filter((x) => /wave5/.test(JSON.stringify(x))).map((x) => JSON.stringify(x).slice(0, 300)); };
    const box = (x, z, r) => ({ bounds: { x0: x - r, x1: x + r, z0: z - r, z1: z + r } });
    const f = game.flags;
    // the states shown: the tins on their stacks, the cistern shut (then open), the seam whole, the stakes
    for (const k of ['w5t_1', 'w5t_2', 'w5t_3', 'w5c_open', 'w5c_store', 'w5s_broke', 'w5s_gem', 'w5s_sold']) delete f[k];
    f.w5c_fill = 6; game.story.applyFlags();
    goRegion('citadel', -99.5, 31.5, 0);
    out.list = keep(SW.scan(box(W5.list.x, W5.list.z, 2), { step: 0.2 })); SW.free();
    out.tin1 = keep(SW.scan(box(W5.tins[1].x, W5.tins[1].z, 2.2), { step: 0.2 })); SW.free();
    goRegion('desert');
    out.tin2 = keep(SW.scan(box(W5.tins[2].x, W5.tins[2].z, 2.2), { step: 0.2 })); SW.free();
    out.stakes = W5.stakes.map((S) => { const r = keep(SW.scan(box(S.x, S.z, 1), { step: 0.15 })); SW.free(); return r; }).flat();
    goRegion('hamalayi');
    out.tin3 = keep(SW.scan(box(W5.tins[3].x, W5.tins[3].z, 2.2), { step: 0.2 })); SW.free();
    const C = W5.cistern;
    out.cistShut = keep(SW.scan(box(C.x, C.z - 0.8, 2.6), { step: 0.15 })); SW.free();
    f.w5c_open = true; game.story.applyFlags(); game.step(0.1);
    out.cistOpen = keep(SW.scan(box(C.x, C.z - 0.8, 2.6), { step: 0.15 })); SW.free();
    goRegion('isle_undergas');
    out.seam = keep(SW.scan(box(W5.seam.x, W5.seam.z, 2.4), { step: 0.15 })); SW.free();
    return out;
  });
  check('O: the wave\'s pieces in each state they show — Nell\'s list, the three stacks with their tins, the stakes, the cistern shut and open (with its bucket and the trough\'s broken ice), the old frame packed with stones — scanned (overlap sweep library): no finding names a wave-5 piece', Object.values(o1).every((a) => a.length === 0), o1);
}
if (NEED) await browser.close();

// ================================================================ V · chapter 9, the readings done before the vote
if (ONLY.includes('V')) {
  await boot('base-12-plans');
  iso('Ilka\'s readings done before chapter 9\'s vote (w5b_1..3, w5b_done set by flags)');
  const v1 = await ev(() => { Object.assign(game.flags, { w5b_ask: true, w5b_1: 'fork', w5b_2: 'flag', w5b_3: 'fork', w5b_done: 'ilka' }); game.story.applyFlags(); const r = P.enter('council'); let t = 0; while (game.state !== 'play' && t < 300) { if (game.state === 'dialog') P.tap('KeyE', 0.12); else game.step(0.1); t += 0.2; } P.settle(); return { r: r.r, vote: !!game.flags.c9_vote, ch: game.flags.chapterKey, state: game.state }; });
  const v1l = await said();
  check('V: chapter 9, the plans in hand, into the council chamber (INPUT): Dallan\'s proof scene adds "three stakes\' worth of warm ground", Brum says "I vote yes"; the vote taken as before and the chapter goes on', v1.vote && has(v1l, /three stakes' worth/) && has(v1l, /I vote yes/) && has(v1l, /reverse the bore|ordered/), { v1, v1l: v1l.slice(-12) });
  await browser.close();
}
done();
