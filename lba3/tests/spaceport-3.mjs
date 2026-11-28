// SPACEPORT-3: the user's three reports of 17.11 about chapter 2's end at Citadel Spaceport.
//   P62 "the walk of Twinsen and Doran to the spaceport is just walking … and without the problem that I can't meet him
//       there": Doran at the harbour sends Twinsen ahead to sign their flight form at the terminal's ticket counter
//       (story/chapter1.js), the gate lets nobody out to the pad without it (story/islands.js), and Doran is at the fuel
//       cart by the ship whenever Twinsen gets there (spaceport.js APRON).
//   P63 the terminal's gate was drawn in the hall's left wall, outside it is at the building's back: now in the hall's
//       back wall, across the hall from the landside door (terminal.js); out of it he faces away from the terminal.
//   P64 the apron alive: the crew at work by chapter, the fuel hose run out to a ship being readied, travellers at the
//       boarding rope while flights run; the deck's draw calls within the street's budget.
// By input (the harness's walk, E, the dialogue keys), from chapter 2's state after Arthur's radio:
//   1. Doran's talk: the errand (the objective, the map's star at the terminal's door), Doran walking off;
//   2. the wrong move: straight to the gate: the guard sends him to the counter, he stays in the hall;
//   3. Save & quit → Continue in the hall before signing: the errand still stands, Doran already at the ship's fuel cart;
//   4. the counter: the form signed (his hands at the counter), the item, the objective, the star on Doran;
//   5. out by the gate: on the deck facing away from the terminal, Doran in view at the fuel cart; the gate's side;
//   6. Save & quit → Continue on the deck: Doran there again; boarding with him → chapter 3 on Zeelich;
//   7. a second way: an older chapter-2 save (Doran's start code, no errand) loaded on the bridge: the gate opens as
//      before, Doran at the ship; the apron by chapter (the hose's state, the crew present and on the deck), draw calls.
// Automated runtime only (headless Chromium, SwiftShader).
import { launch, open, menu, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker();
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
const C1 = { c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_water: true, c1_tour: true, c1_needZoe: true, c1_zoeStart: true, c1_zoeDone: true, c1_plan: true, c1_veskGone: true, c1_radio: true };
const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.refreshCast(); P.settle(); }, [key, extra]);
const HELP = () => {
  window.side = () => { const G = game, S = G.world.spaceport, h = G.hero; if (G.room) return G.room.id === 'terminal' ? 'hall' : G.room.id; return S.airside(h.pos.x, h.pos.z) && Math.abs(h.pos.y - S.deck.y) < 0.35 ? 'deck' : 'land'; };
  window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines.map((l) => String(l))); return sv.call(this, n, lines, ...a); };
  window.star = () => game.story.markers().filter((m) => m.kind === 'star').map((m) => ({ x: +m.x.toFixed(1), z: +m.z.toFixed(1), label: m.label }));
  window.doranAt = () => { const G = game, d = P.npc('doran'), S = G.world.spaceport, fs = S.apron.fuel.stand; if (!d) return null;
    const v = d.pos.clone(); v.y += 1; let inView = null; if (!G.room) { const cam = G.camRig.cam; cam.updateMatrixWorld(); const p = v.project(cam); inView = Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1; }
    return { present: !!d.present, walking: !!G.story.cur.walkers?.doran, atCart: +Math.hypot(d.pos.x - fs.x, d.pos.z - fs.z).toFixed(2), onDeck: S.airside(d.pos.x, d.pos.z) && Math.abs(d.pos.y - S.deck.y) < 0.35, anim: d.forceAnim || null, inView }; };
};
const said = () => ev(() => window._said.splice(0));
await ev(HELP);
// Save & quit by input (Esc, the pause menu's Quit: the game saves and reloads the page), then Continue on the title (one
// browser: boot.mjs quitAndKeep's reload, without a second browser for the load)
const saveQuitContinue = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: +process.env.BOOT_TIMEOUT || 300000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 });
  await reloaded;
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 300000 });
  await ev(() => { game.testFreeze = true; }); await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue'); await ev(HELP);
};

// PHASE=a|b|c (or several, default all): 1–3, 4–6, 7 — each can run on its own (b sets up the errand's state itself),
// for a loaded machine whose pages crash in long runs
const ON = (k) => (process.env.PHASE || 'abc').includes(k);
if (ON('a')) {
// ---------------------------------------------------------------- 1. Doran's errand
await setChapter('project', C1);
const talk = await ev(() => { const G = game, f = G.flags, ps = G.world.pierStart; G.exitRoom({ x: ps.x + 1.5, z: ps.z + 4.5, a: Math.PI }, true, true); P.settle();
  const r = P.talk('doran'); for (let i = 0; i < 5; i++) G.step(0.2);
  return { r: r.r, ship: !!f.c1_ship, errand: !!f.c1_errand, form: !!f.c1_form, obj: document.querySelector('#objective')?.textContent, star: star(), doran: doranAt(), door: G.world.spaceport.door }; });
talk.said = await said();
check('P62, INPUT: Doran at the harbour agrees to fly and sends Twinsen ahead to sign the flight form at the terminal\'s ticket counter; he sets off on foot; the objective names the counter and the map\'s star stands at the terminal\'s door',
  talk.r === 'talked' && talk.ship && talk.errand && !talk.form && /ticket counter/i.test(talk.obj || '') && talk.said.some((s) => /flight form/.test(s)) && talk.doran.walking && talk.star.some((s) => Math.hypot(s.x - talk.door.x, s.z - talk.door.z) < 1.5), talk);

// ---------------------------------------------------------------- 2. the wrong move: straight to the gate
const wrong = await ev(async () => { const G = game, TT = (await import('/src/game/terminal.js')).TERMINAL, out = {};
  G.exitRoom({ x: -22, z: 40, a: Math.PI / 2 }, true, true); P.settle();   // (put on the bridge: the town's walk is not what is tested)
  out.enter = P.enter('terminal', { run: true }).r; out.room = G.room?.id;
  const R = G.room, c = R.center, gx = R.exits.find((q) => q.to === 'terminal-gate'), dx = R.exits.find((q) => q.to === 'terminal-out');
  // (the gate in the hall's back wall, across the hall from the door in its near wall: SPACEPORT-3)
  out.gateWall = { gate: [+(gx.x - c.x).toFixed(2), +(gx.z - c.z).toFixed(2)], door: [+(dx.x - c.x).toFixed(2), +(dx.z - c.z).toFixed(2)] };
  const track = []; const sv = G.step.bind(G); let n = 0; G.step = (dt) => { sv(dt); if (n++ % 3 === 0 && G.room?.id === 'terminal') track.push([+(G.hero.pos.x - c.x).toFixed(2), +(G.hero.pos.z - c.z).toFixed(2)]); };
  const g = P.through(TT.gate.x, TT.gate.z); G.step = sv;
  out.gate = g.r; out.side = side(); out.form = !!G.flags.c1_form;
  out.pillars = track.some(([x, z]) => Math.abs(x - (gx.x - c.x)) < 1.0 && z < -4.9);   // (between the pillars at the back wall)
  return out; });
wrong.said = await said();
check('P62, the wrong move (INPUT): straight to the gate without the form: the port guard sends him to the counter for it, the gate does not open, he stays in the hall',
  wrong.enter === 'entered' && wrong.side === 'hall' && !wrong.form && wrong.said.some((s) => /flight form/i.test(s) && /counter/i.test(s)), wrong);
check('P63: in the hall the gate is in the back wall (z −6), across the hall from the landside door in the near wall (z +6) — as outside, where the gate is in the face opposite the door; the way to it passes between the security pillars at the back wall',
  wrong.gateWall.gate[1] < -5.0 && wrong.gateWall.door[1] > 5.0 && wrong.pillars, wrong);

// ---------------------------------------------------------------- 3. Save & quit → Continue in the hall, before signing
await ev(() => { const G = game, c = G.room.center; P.go(c.x - 1, c.z + 2, { tol: 0.6, maxT: 30 }); P.settle(); G.save(false); });
await saveQuitContinue();
const mid = await ev(() => { const G = game, f = G.flags; for (let i = 0; i < 20; i++) { G.step(0.1); if (G.state !== 'play') P.settle(); }
  return { state: G.state, room: G.room?.id ?? 'citadel', ship: !!f.c1_ship, errand: !!f.c1_errand, form: !!f.c1_form, obj: document.querySelector('#objective')?.textContent, doran: doranAt() }; });
check('P62, Save & quit → Continue mid-errand (in the hall, unsigned): the errand still stands (the objective names the counter) and Doran is already at the ship\'s fuel cart, not on his walk',
  mid.state === 'play' && mid.room === 'terminal' && mid.ship && mid.errand && !mid.form && /ticket counter/i.test(mid.obj || '') && mid.doran.present && !mid.doran.walking && mid.doran.atCart < 0.6, mid);

}
if (ON('b')) {
if (!ON('a')) {   // (on its own: the errand given, he is in the hall)
  await setChapter('project', { ...C1, c1_ship: true, c1_errand: true, c1_form: false });
  await ev(() => { const G = game; G.exitRoom({ x: -22, z: 40, a: Math.PI / 2 }, true, true); P.settle(); P.enter('terminal'); P.settle(); });
}
// ---------------------------------------------------------------- 4. the counter: the form signed
const sign = await ev(async () => { const G = game, f = G.flags, h = G.hero, TT = (await import('/src/game/terminal.js')).TERMINAL, out = {};
  const ready = () => P.target()?.kind === 'termCounter';
  P.go(TT.counter.x, TT.counter.z, { tol: 0.35, maxT: 40, stopWhen: ready }); P.face(TT.counter.x, TT.counter.z - 1); for (let k = 0; k < 12 && !ready(); k++) G.step(0.25);
  out.prompt = P.target()?.kind;
  const acts = new Set(); const sv = G.step.bind(G); G.step = (dt) => { sv(dt); if (h.actAnim && h.actT > 0) { const d = Math.atan2(TT.counter.x - h.pos.x, TT.counter.z - 0.85 - h.pos.z) - h.angle; acts.add(h.actAnim + '@' + (Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.3 ? 'counter' : 'away')); } };
  P.tap('KeyE', 0.1);
  for (let i = 0; i < 8 && !f.c1_form; i++) { P.settle(); G.step(0.4); }
  P.settle(); G.step = sv;
  out.acts = [...acts]; out.form = !!f.c1_form;
  out.item = G.story.items().some((it) => it.id === 'flightform');
  out.obj = document.querySelector('#objective')?.textContent; out.star = star();
  out.doranAt = (() => { const d = P.npc('doran'); return d ? [+d.pos.x.toFixed(1), +d.pos.z.toFixed(1)] : null; })();
  return out; });
sign.said = await said();
check('P62, INPUT: at the ticket counter (its prompt) Ama brings out the form, Twinsen signs it with his hands at the counter, she stamps it: the form in his things, the objective on to Doran, the star on Doran',
  sign.prompt === 'termCounter' && sign.form && sign.acts.includes('use@counter') && sign.item && /Doran/.test(sign.obj || '') && sign.said.some((s) => /stamped/i.test(s)) && sign.star.some((s) => sign.doranAt && Math.hypot(s.x - sign.doranAt[0], s.z - sign.doranAt[1]) < 1), sign);

// ---------------------------------------------------------------- 5. out by the gate: the deck, Doran in view
const outGate = await ev(async () => { const G = game, h = G.hero, S = G.world.spaceport, TT = (await import('/src/game/terminal.js')).TERMINAL;
  const g = P.through(TT.gate.x, TT.gate.z); for (let i = 0; i < 10; i++) G.step(0.1);
  return { gate: g.r, side: side(), at: { x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2), a: +h.angle.toFixed(2) }, fromGate: +(h.pos.x - S.gate.x).toFixed(2), doran: doranAt(), work: S.work }; });
check('P63: out by the gate he stands on the deck before the terminal\'s east face, facing away from it (toward the ship)',
  outGate.side === 'deck' && outGate.fromGate > 1.0 && Math.abs(outGate.at.a - Math.PI / 2) < 0.4, outGate);
check('P62: Doran is there, at the fuel cart beside the ship with his hands on its panel, in the camera\'s view as he comes out; the fuel hose is run out to the ship',
  outGate.doran.present && outGate.doran.onDeck && outGate.doran.atCart < 0.6 && outGate.doran.inView && outGate.work === 'run', outGate);

// ---------------------------------------------------------------- 6. Save & quit → Continue on the deck; boarding
await ev(() => { game.save(false); });
await saveQuitContinue();
const deck = await ev(() => { const G = game, f = G.flags; for (let i = 0; i < 20; i++) { G.step(0.1); if (G.state !== 'play') P.settle(); }
  return { state: G.state, side: side(), form: !!f.c1_form, doran: doranAt() }; });
check('P62, Save & quit → Continue on the deck after the errand: on the deck, the form kept, Doran at the fuel cart',
  deck.state === 'play' && deck.side === 'deck' && deck.form && deck.doran.present && deck.doran.atCart < 0.6, deck);
const board = await ev(() => { const G = game, S = G.world.spaceport;
  const d = P.talk('doran'); const ch0 = G.flags.chapterKey;
  for (let i = 0; i < 6 && G.flags.chapterKey === 'project'; i++) P.settle(60);
  return { talk: d.r, ch0, chapter: G.flags.chapterKey, room: G.room?.id ?? 'citadel', state: G.state }; });
check('P62, INPUT: a word with Doran at the cart takes them aboard: chapter 3 starts on Zeelich', board.talk === 'talked' && board.chapter === 'zeelich' && board.room === 'zeelich', board);

}
if (ON('c')) {
// ---------------------------------------------------------------- 7. a second way in: an older save, the apron by chapter
await ev(() => { P.settle(); });
await setChapter('project', { ...C1, c1_ship: true, c1_errand: false, c1_form: false });   // (an older save: Doran's start code, no errand)
const old = await ev(async () => { const G = game, S = G.world.spaceport; G.exitRoom({ x: -24, z: 40, a: Math.PI / 2 }, true, true); P.settle();
  const r = P.go(S.landing.x, S.landing.z, { tol: 0.8, maxT: 120 }); for (let i = 0; i < 10; i++) G.step(0.1);
  G.updateObjective(); return { go: r.r, side: side(), form: !!G.flags.c1_form, obj: document.querySelector('#objective')?.textContent, doran: doranAt() }; });
check('P62, a second way in (a chapter-2 save from before the errand, from the bridge by input): the gate opens as before, no form asked, Doran at the fuel cart in view',
  old.side === 'deck' && !old.form && /spaceport/i.test(old.obj || '') && old.doran.present && old.doran.atCart < 0.6 && old.doran.inView, old);

const PEOPLE = ['gurt', 'rhun', 'pema', 'kesa', 'brin', 'dov', 'esren', 'gunda', 'bibi'];
const apron = async (key, extra) => { await setChapter(key, extra);
  return ev(([people]) => { const G = game, S = G.world.spaceport, T = S.terminal; G.exitRoom({ x: -5.0, z: 40.0, a: Math.PI / 2 }, true, true); P.settle(); for (let i = 0; i < 60; i++) G.step(0.1);
    const who = {}; for (const id of people) { const n = P.npc(id); if (!n?.present) continue; const x = n.pos.x, z = n.pos.z; who[id] = { deck: S.airside(x, z) && Math.abs(n.pos.y - S.deck.y) < 0.35, walls: x > T.x0 - 0.3 && x < T.x1 + 0.3 && z > T.z0 - 0.3 && z < T.z1 + 0.3 }; }
    const R = G.renderer.renderer; G.perf?.beginFrame?.(); G.frame(1 / 30, true); const calls = R.info.render.calls;
    return { work: S.work, who, calls }; }, [PEOPLE]); };
const a1 = await apron('well', { c1_ship: false, c1_errand: false, c1_form: false });
const a2 = await apron('project', { ...C1, c1_ship: true, c1_errand: false, c1_form: false });
const a4 = await apron('dig', {});
const a8 = await apron('evacuation', {});
const ok = (a) => Object.values(a.who).every((w) => w.deck && !w.walls);
check('P64: grounded (chapter 1): the nozzle hung on the fuel cart; Gurt and Rhun at work, Dov on his bench; no fueller, no travellers at the rope', a1.work === 'idle' && a1.who.gurt && a1.who.rhun && a1.who.dov && !a1.who.pema && !a1.who.kesa && ok(a1), a1);
check('P64: chapter 2 with Doran\'s ship: the hose run out to it, Gurt and Rhun at work', a2.work === 'run' && a2.who.gurt && a2.who.rhun && !a2.who.kesa && ok(a2), a2);
check('P64: flights running (chapter 4): the hose run out, Ambo the fueller, Rhun, Gurt, two travellers at the boarding rope, the others as before; everyone on the deck, none in the terminal\'s walls', a4.work === 'run' && ['gurt', 'rhun', 'pema', 'kesa', 'brin', 'esren', 'gunda', 'bibi'].every((id) => a4.who[id]) && ok(a4), a4);
check('P64: the evacuation: the hose run out for the project\'s ships, Ambo and the crew at work, no travellers at the rope', a8.work === 'run' && a8.who.pema && a8.who.gurt && !a8.who.kesa && ok(a8), a8);
check('P64: the deck\'s view (from the gate toward the pad) within the street\'s draw-call budget at the default quality (≤ 300) in every chapter tried', [a1, a2, a4, a8].every((a) => a.calls > 0 && a.calls <= 300), [a1, a2, a4, a8].map((a) => a.calls));

}
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
