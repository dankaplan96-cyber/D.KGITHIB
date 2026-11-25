// H-15 · The Francos' dig, twelve years on (docs/lba-maturity/FRANCOS.md; src/game/story/francos.js, francosworld.js).
// One covering suite, played by input where it says INPUT (tests/lib/player.js: walking, E, talking) from the campaign's
// own chapter-4 save (tests/fixtures/campaign/base-07-dig: made before H-15), loaded through Continue as a player would:
//   A  the old save loads (format 6, no fr_ state made up); Knartas (ISO: the travel network's own move): the dig on the
//      slope (holes, spades, the Founder's Seat), the four diggers at their work; the Waker hums for the pocket set
//   B  Foreman Mott (TALK): the story, the spare spade (found, carried); a dig in the wrong place (E): earth, a hole
//   C  the tips: Old Gubb (TALK, up the grass ramp to the gold dome's wall), Pella (TALK), the Founder's Seat (E),
//      Tuffo (TALK); the journal lists them
//   D  a death on Knartas (ISO: damage to 0, no clover leaf) → Game Over → Retry: back on Knartas, life full, the tips
//      and the spade kept, his empty holes filled in (not saved)
//   E  the pocket set held (R, INPUT): the needle points to the Waker from 7 m; followed (INPUT walking), dug (E): the tin
//      box, the found box with the Great Waker, Tuffo's shout; the diggers gather at the hole
//   F  Save & quit → Continue: found, the Waker carried, the diggers at the hole
//   G  Mott (TALK): the hand-over (the songs, wound, it rings, the purse, the spade back): 25 kashes and no clover leaf;
//      the shrine where it slept; Gubb on the Founder's Seat; the journal done
//   H  away to Otringal and back (ISO): the shrine and the seat as they were; the after lines; Save & quit → Continue
// ISO (logged): the travel between regions is travel.mjs's (here: the region entered by the travel network's own move);
// the death's damage. SHOTS=dir writes the pictures (the play camera; before/after pairs where something visible changes:
// the before frame is the same frame with this quest's pieces hidden). SERVE=1 answers this checkout's files by request
// routing. Automated runtime only (SwiftShader, headless Chromium): no listening, no hardware figure.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = fileURLToPath(new URL('./fixtures/campaign/base-07-dig.save.json', import.meta.url));
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
const pair = async (n, hide) => { if (!SHOTS) return; await ev(hide, true); await shot(n + '-before'); await ev(hide, false); await shot(n + '-after'); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const FWm = await import('/src/game/francosworld.js'); window.FW = FWm.FW;
  const FRm = await import('/src/game/story/francos.js'); window.DIG = FRm.DIG; window.FINDERS = FRm.FINDERS;
  window.O = { x: 2230, z: 1800 };   // (Knartas's place: zislands.js ISLE_AT(1))
  window.L = (a) => ({ x: O.x + a[0], z: O.z + a[1] });
  window.fr = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('fr_')));
  window.r2 = (v) => +(+v).toFixed(2);
  window.at = (id) => { const n = P.npc(id); return n?.present ? { x: r2(n.pos.x - O.x), z: r2(n.pos.z - O.z), anim: n.forceAnim, scene: P.sceneOf(n.pos.x, n.pos.z) } : null; };
  window.toIsle = (n) => { const G = game, reg = 'isle_' + n; G.regions.ensure(reg, 'test'); const R = G.rooms[reg]; G.enterRoom(reg, R.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.3); return R; };
  window.items = () => game.story.items().map((i) => i.id);
  window.jr = () => game.story.journal().find((s) => s.lines.some((l) => l.key.startsWith('fr_j_'))) || null;
  // the four diggers hidden or shown (the before frame of a pair)
  window.cast = (on) => { for (const id of ['fr_mott', 'fr_gubb', 'fr_pella', 'fr_tuffo']) { const n = P.npc(id); if (n?.present) { n.rig.root.visible = on; if (n.shadow) n.shadow.visible = on; } } };
});
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
};
const reboot = async (cont = true) => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  if (cont) await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 60 && game.state !== 'play'; i++) game.step(0.1); for (let i = 0; i < 30; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};
// a viewpoint for a picture: walked to (INPUT), facing a point
const view = (x, z, fx, fz) => ev(([x, z, fx, fz]) => { P.go(O.x + x, O.z + z, { tol: 0.45, maxT: 40 }); P.face(O.x + fx, O.z + fz); for (let i = 0; i < 24; i++) game.step(0.05); return [r2(game.hero.pos.x - O.x), r2(game.hero.pos.z - O.z)]; }, [x, z, fx, fz]);

// ================================================================ A · the old save, Knartas
const st = JSON.parse(fs.readFileSync(FIX, 'utf8'));
const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
await helpers(); await said();
const a0 = await ev(() => ({ v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, chapter: game.flags.chapterKey, fr: Object.keys(fr()), cast: ['fr_mott', 'fr_gubb', 'fr_pella', 'fr_tuffo'].every((id) => !!P.npc(id)), here: ['fr_mott'].map(at)[0] }));
check('A: the campaign\'s chapter-4 save from before H-15 loads through Continue: format 6, chapter 4, in play, no fr_ state made up; the four diggers are in the cast (on Knartas, not on Citadel)', a0.v === 6 && a0.state === 'play' && a0.chapter === 'dig' && a0.fr.length === 0 && a0.cast && (!a0.here || a0.here.scene === 'isle_knartas'), a0);
iso('to Knartas by the travel network\'s own move: put by its shuttle pad');
const a1 = await ev(() => { toIsle('knartas'); const hum = game.story.kit2.hums().find((s) => s.id === 'fr_waker'); return { room: game.room?.id, field: !!FW.field, seat: !!FW.seat, shrine: FW.shrine?.g.visible, box: FW.box?.g.visible, mott: at('fr_mott'), gubb: at('fr_gubb'), pella: at('fr_pella'), tuffo: at('fr_tuffo'), hum: hum && { x: r2(hum.x - O.x), z: r2(hum.z - O.z), room: hum.room }, relicX: DIG.relic[0] }; });
check('A: on Knartas: the dig on the slope below the village (holes, spades, the Founder\'s Seat), no shrine yet; Mott on the rock, Gubb and Pella kneeling at their holes, Tuffo with his ear to the ground; the Waker hums for the pocket set (kit2.hums)', a1.room === 'isle_knartas' && a1.field && a1.seat && !a1.shrine && !a1.box && a1.mott && a1.gubb?.anim === 'kneelWork' && a1.pella?.anim === 'kneelWork' && a1.tuffo?.anim === 'kneelLook' && a1.hum?.room === 'isle_knartas' && Math.abs(a1.hum.x - a1.relicX) < 0.01, a1);
await view(22.4, 2.9, 23.0, 9.5);
await pair('francos-01-dig', (h) => { FW.field.visible = !h; cast(!h); });

// ================================================================ B · Mott, the spade, a wrong dig
const b1 = await ev(() => { const k = P.talk('fr_mott'); return { k: k.r, spade: !!game.flags.fr_spade, hook: !!game.flags.fr_hook, items: items(), shown: (game.foundObj?.shown || []).slice(-1)[0], jr: jr()?.lines.map((l) => l.key) }; });
const b1l = await said();
check('B: Foreman Mott (TALK, INPUT): twelve years of digging for the Great Waker, everyone knows a piece of the rhyme; a spare spade (found box, carried)', b1.k === 'talked' && b1.spade && b1.hook && b1.items.includes('fr_spade') && b1.shown === 'shovel' && has(b1l, /Twelve years we have dug for the Great Waker/) && has(b1l, /spare spade/) && b1.jr?.includes('fr_j_hook'), { b1, b1l });
const b2 = await ev(() => { const p = L([17.2, 4.4]); const u = P.use(p.x, p.z, { kind: 'fr_dig', near: 0.9, match: 3 }); for (let i = 0; i < 6; i++) game.step(0.1); P.settle(); return { u: u.r, tg: u.target?.kind, digs: game.flags.fr_digs ?? 0, holes: FW.holes.length, found: !!game.flags.fr_found }; });
const b2l = await said();
check('B: a dig on the slope away from the spot (E "Dig", INPUT): earth, a hole left there, nothing found', b2.u === 'used' && b2.tg === 'fr_dig' && b2.digs === 1 && b2.holes === 1 && !b2.found && has(b2l, /Stones\. Worms\. No Waker\./), { b2, b2l });

// ================================================================ C · the tips
const c1 = await ev(() => { const k = P.talk('fr_gubb'); return { k: k.r, gubb: !!game.flags.fr_gubb, y: r2(game.hero.pos.y), at: [r2(game.hero.pos.x - O.x), r2(game.hero.pos.z - O.z)] }; });
const c1l = await said();
check('C: Old Gubb (TALK, INPUT: up the grass ramp to the ledge at the gold dome\'s wall): "Below the gold dome" — he digs as close to the wall as allowed; Twinsen: or downhill from it?', c1.k === 'talked' && c1.gubb && has(c1l, /Below the gold dome lies the Waker/) && has(c1l, /downhill/), { c1, c1l });
const c2 = await ev(() => { const k = P.talk('fr_pella'); return { k: k.r, pella: !!game.flags.fr_pella }; });
const c2l = await said();
check('C: Pella (TALK, INPUT): "Twelve steps from the Founder\'s Seat, the way the Founder looked" — she loses count at seven; Twinsen: her holes run in a line from the seat', c2.k === 'talked' && c2.pella && has(c2l, /Twelve steps from the Founder's Seat/) && has(c2l, /lose count/) && has(c2l, /line from the seat/), { c2, c2l });
const c3 = await ev(() => { const S = FW.seat; const u = P.use(S.x, S.z, { kind: 'fr_seat', near: 1.0, match: 3 }); return { u: u.r, seat: !!game.flags.fr_seat }; });
const c3l = await said();
check('C: the Founder\'s Seat (E "Look", INPUT): worn smooth by diggers sitting for luck; it faces the gully below the gold dome; Twinsen: twelve steps that way', c3.u === 'used' && c3.seat && has(c3l, /faces the gully below the gold dome/) && has(c3l, /Twelve steps from here/), { c3, c3l });
const c4 = await ev(() => { const k = P.talk('fr_tuffo'); return { k: k.r, tuffo: !!game.flags.fr_tuffo, set: !!game.hero.arms?.pocketset, jr: jr()?.lines.map((l) => l.key) }; });
const c4l = await said();
check('C: Tuffo (TALK, INPUT): the Waker hums under the ground; Twinsen thinks of Arthur\'s Pocket Set (or, without it, of where the tips meet); the journal lists all three tips and "Dig where the tips meet"', c4.k === 'talked' && c4.tuffo && has(c4l, /hums under the ground/) && has(c4l, c4.set ? /Pocket Set hears things that hum/ : /Where the other tips meet/) && ['fr_j_gubb', 'fr_j_pella', 'fr_j_tuffo', 'fr_j_dig'].every((k) => c4.jr?.includes(k)), { c4, c4l });

// ================================================================ D · a death on Knartas, Retry
iso('a death on Knartas (damage to 0, no clover leaf: nothing here hurts him), then Retry');
const d1 = await ev(() => { const G = game, h = G.hero; h.clovers = 0; h.hp = 1; h.invuln = 0; h.damage(5, null); let k = 0; while (k < 80 && G.state !== 'gameover') { G.step(0.1); k++; } return { dead: h.dead, state: G.state }; });
{ const reloaded = page.waitForEvent('load', { timeout: 600000 }); await page.click('#gameover [data-act="retry"]', { timeout: 60000, noWaitAfter: true }); await reloaded; await reboot(false); }
const d2 = await ev(() => ({ state: game.state, room: game.room?.id, hp: game.hero.hp, max: game.hero.maxHp, fr: fr(), holes: FW.holes.length, field: !!FW.field, gubb: at('fr_gubb'), items: items() }));
check('D: Game Over, Retry: back on Knartas with full life; the spade, the three tips and the seat kept; his empty hole filled in (not saved), the diggers at their work', d1.dead && d1.state === 'gameover' && d2.room === 'isle_knartas' && d2.hp === d2.max && d2.fr.fr_spade && d2.fr.fr_gubb && d2.fr.fr_pella && d2.fr.fr_tuffo && d2.fr.fr_seat && d2.holes === 0 && d2.field && d2.gubb?.anim === 'kneelWork' && d2.items.includes('fr_spade'), { d1, d2 });

// ================================================================ E · the pocket set, the find
const e0 = await ev(() => { const own = !!game.hero.arms?.pocketset; if (!own) game.hero.arms.pocketset = true; return own; });
if (!e0) iso('the chapter-4 save has no pocket set: given (the chapter-2 gift, tests/equip2.mjs)');
const e1 = await ev(() => { const G = game, h = G.hero; const p = L([29.6, 6.6]); P.go(p.x, p.z, { tol: 0.6 }); let n = 0; for (; n < 14 && h.combat.weapon !== 'pocketset'; n++) P.tap('KeyR', 0.15); for (let i = 0; i < 6; i++) G.step(0.05); const s = G.gadgets.tools.sense; return { held: G.gadgets.tools.held(), presses: n, sense: s && { id: s.id, d: r2(s.d) }, needle: G.gadgets.tools.needle.visible }; });
check('E: the Pocket Set held out (R, INPUT) by the Founder\'s Seat: the needle at his feet points to the Waker, about 7 m off', e1.held === 'pocketset' && e1.sense?.id === 'fr_waker' && e1.sense.d > 5 && e1.sense.d < 9 && e1.needle, e1);
// follow the needle (INPUT walking toward where it points), then dig ahead along it (E)
const e2 = await ev(() => { const G = game, h = G.hero, T = G.gadgets.tools; const path = []; for (let i = 0; i < 6 && T.sense && T.sense.d > 0.8; i++) { const s = T.sense; const k = Math.min(1, 2.5 / s.d); P.go(h.pos.x + (s.x - h.pos.x) * k, h.pos.z + (s.z - h.pos.z) * k, { tol: 0.4, maxT: 20 }); for (let j = 0; j < 4; j++) G.step(0.05); path.push([r2(h.pos.x - O.x), r2(h.pos.z - O.z), r2(T.sense?.d ?? -1)]); } const s = T.sense; if (s) P.face(s.x, s.z); P.go(h.pos.x - Math.sin(h.angle) * 0.4, h.pos.z - Math.cos(h.angle) * 0.4, { tol: 0.2, maxT: 4 }); if (s) P.face(s.x, s.z); for (let j = 0; j < 4; j++) G.step(0.05); const tg = P.target(); return { path, d: r2(T.sense?.d ?? -1), tg: tg?.kind }; });
const e2b = await ev(() => { const G = game; P.tap('KeyE', 0.1); let k = 0; while (k < 60 && G.state !== 'dialog') { G.step(0.05); k++; } const box = FW.box.g.visible; let j = 0; while (j < 40 && G.state === 'dialog') { P.tap('KeyE', 0.15); j++; } let m = 0; while (m < 30 && G.state !== 'found') { G.step(0.05); m++; } return { found: !!G.flags.fr_found, box, state: G.state }; });
await shot('francos-02-found-box');
const e3 = await ev(() => { const G = game; P.settle(); for (let i = 0; i < 60; i++) G.step(0.1); P.settle(); return { found: !!G.flags.fr_found, shown: (G.foundObj?.shown || []).slice(-1)[0], items: items(), hums: G.story.kit2.hums().some((s) => s.id === 'fr_waker'), gather: ['fr_mott', 'fr_gubb', 'fr_pella', 'fr_tuffo'].map((id) => { const a = at(id), g = DIG.gather[id]; return a ? r2(Math.hypot(a.x - g[0], a.z - g[1])) : -1; }) }; });
const e3l = await said();
check('E: followed the needle (INPUT) and dug where it spun (E "Dig"): a dented tin box, THE GREAT WAKER; the found box shows it (an alarm clock, still ticking); Tuffo: he found it!; the Waker carried, the spade still; it hums no more', e2.tg === 'fr_dig' && e2.d < 1.0 && e2b.found && e2b.box && e2b.state === 'found' && e3.shown === 'clock' && e3.items.includes('fr_clock') && !e3.hums && has(e3l, /THE GREAT WAKER/) && has(e3l, /alarm clock/) && has(e3l, /He FOUND it/), { e2, e2b, e3, e3l });
check('E: the four diggers come running (a short cut) and stand round the hole (each within 0.8 m of their place round it)', e3.gather.every((d) => d >= 0 && d < 0.8), e3.gather);
await view(24.6, 4.3, 23.0, 7.4);
await pair('francos-03-found', (h) => { FW.box.g.visible = !h; cast(!h); });

// ================================================================ F · Save & quit → Continue
await saveQuit(); await reboot();
const f1 = await ev(() => ({ room: game.room?.id, fr: fr(), items: items(), box: FW.box?.g.visible, shrine: FW.shrine?.g.visible, mott: at('fr_mott'), gubb: at('fr_gubb'), dm: r2(Math.hypot(at('fr_mott').x - DIG.gather.fr_mott[0], at('fr_mott').z - DIG.gather.fr_mott[1])) }));
check('F: Save & quit → Continue: on Knartas; the Waker found and carried; the box in its hole; the diggers round it; no shrine yet', f1.room === 'isle_knartas' && f1.fr.fr_found && !f1.fr.fr_given && f1.items.includes('fr_clock') && f1.box && !f1.shrine && f1.mott && f1.dm < 0.3, f1);

// ================================================================ G · the hand-over
const g0 = await ev(() => { const k = P.talk('fr_gubb'); return k.r; });
const g0l = await said();
const g1a = await ev(() => { const h = game.hero; window._c0 = h.coins; window._l0 = h.clovers; const k = P.talk('fr_mott'); for (let i = 0; i < 4; i++) game.step(0.1); return { k: k.r, cheer: ['fr_mott', 'fr_gubb', 'fr_pella', 'fr_tuffo'].map((id) => P.npc(id).forceAnim) }; });
await shot('francos-04-ring');
const g1 = await ev(() => { const h = game.hero, c0 = window._c0, l0 = window._l0; for (let i = 0; i < 30; i++) game.step(0.1); P.settle(); return { given: !!game.flags.fr_given, coins: h.coins - c0, clovers: h.clovers - l0, items: items(), shrine: FW.shrine.g.visible, box: FW.box.g.visible, sfx: (game.audio.sfxRecent || []).map((s) => s.name).filter((n) => n === 'alarmBell').length, jr: jr()?.lines.every((l) => l.done), finders: FINDERS }; });
const g1l = await said();
check('G: Gubb (TALK) after the find sends him to the foreman', g0 === 'talked' && has(g0l, /Show the foreman/), { g0, g0l });
check('G: Foreman Mott (TALK, INPUT): smaller than in the songs; SELF-WINDING, the digging kept it going; wound, it rings and the four jump and cheer ("IT\'S SO LOUD!"); the finder\'s purse: 25 kashes, no clover leaf; the spade back; set up where it slept: the shrine stands there, the box gone; the journal all done', g1a.k === 'talked' && g1a.cheer.every((a) => a === 'cheer') && g1.given && g1.coins === g1.finders && g1.finders === 25 && g1.clovers === 0 && !g1.items.includes('fr_clock') && !g1.items.includes('fr_spade') && g1.shrine && !g1.box && g1.jr && has(g1l, /smaller than in the songs/) && has(g1l, /SELF-WINDING/) && has(g1l, /SO LOUD/) && has(g1l, /finder's purse/), { g1a, g1, g1l });
const g2 = await ev(() => { for (let i = 0; i < 80; i++) game.step(0.1); P.settle(); const S = FW.seat, n = P.npc('fr_gubb'), m = at('fr_mott'); return { gubb: at('fr_gubb'), onSeat: r2(Math.hypot(n.pos.x - S.x, n.pos.z - S.z)), sitY: r2(n.pos.y - S.y), mott: m, dm: m ? r2(Math.hypot(m.x - DIG.after.fr_mott[0], m.z - DIG.after.fr_mott[1])) : -1, tuffo: at('fr_tuffo') }; });
check('G: after: Gubb sits on the Founder\'s Seat (within 0.4 m of its middle); Mott and Tuffo by the shrine', g2.gubb?.anim === 'sit' && g2.onSeat < 0.4 && g2.mott && g2.dm >= 0 && g2.dm < 0.8, g2);
await view(20.6, 4.4, 25.5, 7.8);
await pair('francos-05-shrine', (h) => { FW.shrine.g.visible = !h; });
await view(26.0, 2.6, 28.9, 5.4);
await shot('francos-06-gubb-seat');

// ================================================================ H · away and back
iso('to Otringal and back to Knartas by the travel network\'s own move');
const h1 = await ev(() => { toIsle('otringal'); const away = { room: game.room?.id, mott: at('fr_mott') }; toIsle('knartas'); return { away, room: game.room?.id, shrine: FW.shrine.g.visible, gubb: at('fr_gubb') }; });
check('H: away on Otringal (the diggers not there) and back on Knartas: the shrine stands, Gubb still on the seat', h1.away.room === 'isle_otringal' && h1.room === 'isle_knartas' && h1.shrine && h1.gubb?.anim === 'sit', h1);
const h2 = await ev(() => { const a = P.talk('fr_mott').r, b = P.talk('fr_tuffo').r; const S = FW.shrine; const u = P.use(L(DIG.relic).x, L(DIG.relic).z, { kind: 'fr_shrine', near: 1.2, match: 3 }).r; return { a, b, u, after: !!game.flags.fr_mottAfter && !!game.flags.fr_tuffoAfter }; });
const h2l = await said();
check('H: the after lines: Mott (the shift came on time), Tuffo (it ticks); the shrine (E "Look"): its hands point to six', h2.a === 'talked' && h2.b === 'talked' && h2.u === 'used' && h2.after && has(h2l, /whole shift came on time/) && has(h2l, /Well, it ticks/) && has(h2l, /hands point to six/), { h2, h2l });
await saveQuit(); await reboot();
const h3 = await ev(() => ({ room: game.room?.id, fr: fr(), shrine: FW.shrine?.g.visible, gubb: at('fr_gubb'), dig: !!game.story.fr.digSpot() }));
check('H: Save & quit → Continue: the shrine and Gubb on the seat as left; nothing more to dig', h3.room === 'isle_knartas' && h3.fr.fr_given && h3.shrine && h3.gubb?.anim === 'sit' && !h3.dig, h3);

await browser.close();
process.exit(done());
