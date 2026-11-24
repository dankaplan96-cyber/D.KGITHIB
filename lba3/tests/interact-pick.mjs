// INTERACT-PICK (P115, the desktop's real-keys play of the opening, 23.11): who takes the interact key, and the tip
// panel's key line agreeing with the prompt. src/main.js findInteractable / goalPick, tutorial.js stepKeys / kick.
//   A  the yard (a new game, the cupboard and the door by input): the garden tap's step — round the tap, facing it, the
//      tap answers (not Zoé beside it); turned squarely to Zoé with the tap well to his side, Zoé; the panel's key line
//      only when the prompt offers the same thing, at every spot; Zoé's step — round Zoé, Talk, and the panel agrees;
//      ACT-RESUME (main.js endAct): after the tap's line, control at once (no gesture replayed, no 0.45 s key lock)
//   B  the well with Mira's key and the lid rusted: round the well, facing it, the well (Inspect/Kick) before Mira and
//      Gilbert; Mira faced squarely with the well well aside, Mira. Back up out of the cave, the well's way down before
//      Gilbert. Gilbert's "Give it a good kick" comes with the keys (a toast during his line)
//   C  Xil at the pier's end, from the pier's approach beside the crane's crates, walked up to by keys: Talk
//   D  one picture in Hebrew (the tap's step: the prompt and the panel's key line)
//   E  the sweep, game-wide: every campaign fixture (chapters 1–15 bases), each objective star in the area, a ring of
//      spots round it (1.0–2.2 m, 16 directions, facing it): where the star's own thing is in reach, how many spots a
//      person (or another thing) took the key before (the ranking without the goal's rule, C.base) and after
//      (SWEEP=0 skips it; SAVES=base-03,base-05 picks)
// Pictures: captures/controls/ (SHOTS=0 none). Positions are set directly only for the rings (a probe of the picker);
// the rest by input.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const OUT = fileURLToPath(new URL('../captures/controls/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
const SHOTS = process.env.SHOTS !== '0';
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
let { browser, page } = await launch({ width: 960, height: 540 });
let ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 82 }); console.log('capture ' + n); };

await open(page, '?nocine');
await menu(page, 'new');
await ev(() => { P.yardFirst = false; game.step(0.2); P.settle(); const s = game.room.searches.find((x) => x.id === 'cupboard'); P.use(s.x, s.z); P.settle(); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle(); });
// the page's helpers: a spot, the pick, the prompt and the panel's key line there
await ev(() => {
  window.IP = {
    who: (it) => (it ? it.kind + (it.npc ? ':' + it.npc.def.id : '') : '-'),
    put(x, z, fx, fz, y) { const G = game, h = G.hero; h.pos.set(x, G.physics.groundAt(x, z, y ?? h.pos.y), z); h.angle = Math.atan2(fx - x, fz - z); h.onGround = true; h.vel?.set?.(0, 0, 0); },
    // stand there 0.3 s (the prompt's dwell), then read what the key would do, the prompt and the panel's key line
    read() {
      const G = game; G.step(0.3);
      const it = G.findInteractable(), p = document.querySelector('#prompt'), tk = document.querySelector('#tip.show .tkeys');
      // (base: what the ranking without the goal's rule gave, the "before")
      const C = G._pick, base = C && (C.n >= 2 || (C.n === 1 && !C.base)) ? C.base : it;
      // (itAim: how squarely he faces the person who answered — FACE-PICK lets a person he faces take the key)
      const h = G.hero, np = it?.npc, itAim = np ? +(((np.pos.x - h.pos.x) * Math.sin(h.angle) + (np.pos.z - h.pos.z) * Math.cos(h.angle)) / (Math.hypot(np.pos.x - h.pos.x, np.pos.z - h.pos.z) || 1)).toFixed(2) : null;
      return { itAim, it: IP.who(it), base: IP.who(base), prompt: p.classList.contains('show') ? p.textContent.trim() : '', keys: tk?.textContent || '', tip: document.querySelector('#tip.show')?.textContent || '', on: IP.who(G.promptFor) };
    },
    ring(T, rs, n = 12, off = 0) {
      const out = [];
      for (const r of rs) for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, x = T.x + Math.sin(a) * r, z = T.z + Math.cos(a) * r;
        IP.put(x, z, T.x + Math.sin(a + Math.PI + off) * 9 + x - T.x, T.z + Math.cos(a + Math.PI + off) * 9 + z - T.z, T.y);
        const o = IP.read(); o.r = r; o.deg = Math.round(k * 360 / n); o.at = [+game.hero.pos.x.toFixed(2), +game.hero.pos.z.toFixed(2)];
        out.push(o);
      }
      return out;
    },
  };
});
// the panel's key line agrees with the prompt: a key line only where the prompt is up and offers the step's thing
const agree = (rows, kind) => rows.filter((o) => o.keys && !(o.prompt && o.on === kind));

// ---------------------------------------------------------------- A. the yard
let r = await ev(() => {
  const G = game, ch = G.story.chapters[0];
  G.flags.pr_kettle = true; G.tutorial.done.add('inventory'); G.step(0.1);
  const Y = ch.home.parts.yard, z = ch.npc('zoe');
  const T = { x: Y.x, z: Y.z, y: Y.y };
  return { step: G.story.cur.steps.panelStep(), zoe: [+z.pos.x.toFixed(2), +z.pos.z.toFixed(2)], tap: [+Y.x.toFixed(2), +Y.z.toFixed(2)], ring: IP.ring(T, [0.9, 1.3]), ring40: [...IP.ring(T, [1.2], 12, 0.6), ...IP.ring(T, [1.2], 12, -0.6)] };
});
const tapIn = r.ring.filter((o) => o.it !== '-');
check('A1 the tap\'s step: round the tap (0.9 and 1.3 m, 12 directions), facing it, the tap answers at every spot (Zoé 1.6 m away took it from the side by her)', r.step === 'tap' && tapIn.length === 24 && tapIn.every((o) => o.it === 'h_yard'), { step: r.step, zoe: r.zoe, tap: r.tap, not: r.ring.filter((o) => o.it !== 'h_yard').map((o) => `${o.r}/${o.deg}:${o.it}`), before: [...r.ring, ...r.ring40].filter((o) => o.it === 'h_yard' && o.base !== 'h_yard').map((o) => `${o.r}/${o.deg}:${o.base}`) });
check('A2 …turned 34° off the tap, still the tap where it is in reach (roughly faced) — or, since FACE-PICK, Zoé where he faces her (within ~39°) and she stands nearer his line', r.ring40.filter((o) => o.it !== '-' && o.it !== 'h_yard' && !(o.it === 'npc:zoe' && o.itAim >= 0.78)).length === 0, r.ring40.filter((o) => o.it !== 'h_yard').map((o) => `${o.r}/${o.deg}:${o.it}@${o.itAim}`));
const badA = agree([...r.ring, ...r.ring40], 'h_yard');
check('A3 the panel\'s key line ("W Try the tap") only where the prompt offers the tap (no "Try" beside a "Talk")', badA.length === 0 && r.ring.some((o) => /Try the tap/.test(o.keys)), badA.slice(0, 6));
await ev(() => { const Y = game.story.chapters[0].home.parts.yard; IP.put(Y.x + 0.95, Y.z - 0.3, Y.x, Y.z); game.step(0.4); });
await shot('p115-1-tap-step-after');
// facing Zoé squarely with the tap well to his side: she answers (he turned to her)
r = await ev(() => {
  const G = game, ch = G.story.chapters[0], Y = ch.home.parts.yard, z = ch.npc('zoe');
  const ux = z.pos.x - Y.x, uz = z.pos.z - Y.z, L = Math.hypot(ux, uz);
  // a spot 1.0 m from her, beside the tap, the tap ≥ 60° to his side
  for (const s of [1, -1]) {
    const x = z.pos.x + (-uz / L) * s * 1.0 - (ux / L) * 0.2, zz = z.pos.z + (ux / L) * s * 1.0 - (uz / L) * 0.2;
    IP.put(x, zz, z.pos.x, z.pos.z); const o = IP.read();
    const h = G.hero, ta = ((Y.x - h.pos.x) * Math.sin(h.angle) + (Y.z - h.pos.z) * Math.cos(h.angle)) / Math.hypot(Y.x - h.pos.x, Y.z - h.pos.z);
    const tapD = Math.hypot(Y.x - h.pos.x, Y.z - h.pos.z);
    if (tapD < 1.5 && ta < 0.5) return { ...o, tapD: +tapD.toFixed(2), tapAim: +ta.toFixed(2) };
  }
  return null;
});
check('A4 turned squarely to Zoé with the tap in reach but ≥ 60° to his side: Zoé answers ("Talk"), and the panel shows no "Try"', !r || (r.it === 'npc:zoe' && !/Try/.test(r.keys)), r ?? 'no such spot (the tap out of reach wherever she is faced)');
// out of the tap's reach (2.0 m, facing it) with Zoé in reach: her prompt, and the panel names no key for the tap
r = await ev(() => { const Y = game.story.chapters[0].home.parts.yard, z = game.story.chapters[0].npc('zoe'); const ux = Y.x - z.pos.x, uz = Y.z - z.pos.z, L = Math.hypot(ux, uz); const x = Y.x - (ux / L) * 2.0 + (-uz / L) * 0.6, zz = Y.z - (uz / L) * 2.0 + (ux / L) * 0.6; IP.put(x, zz, Y.x, Y.z); const o = IP.read(); o.tapD = +Math.hypot(Y.x - game.hero.pos.x, Y.z - game.hero.pos.z).toFixed(2); return o; });
check('A5 2 m from the tap (out of its reach), facing it, Zoé in reach: the panel shows no "W Try the tap" while the prompt says "Talk" (the desktop\'s note 1)', !/Try the tap/.test(r.keys) || r.on === 'h_yard', r);
// Zoé's step: round her (0.6, 1.0, 1.6 m), facing her: Talk; the panel agrees
r = await ev(() => { const G = game, z = G.story.chapters[0].npc('zoe'); G.flags.pr_kettle = false; G.step(0.1); return { step: G.story.cur.steps.panelStep(), ring: IP.ring({ x: z.pos.x, z: z.pos.z }, [0.7, 1.2, 1.8]) }; });
const zoeIn = r.ring.filter((o) => o.it !== '-');
check('A6 Zoé\'s step: round her (0.7–1.8 m, 12 directions), facing her, she answers wherever anything does (the tap beside her no longer first)', r.step === 'zoe' && zoeIn.length >= 30 && zoeIn.every((o) => o.it === 'npc:zoe'), { step: r.step, n: zoeIn.length, not: zoeIn.filter((o) => o.it !== 'npc:zoe').map((o) => `${o.r}/${o.deg}:${o.it}`), before: zoeIn.filter((o) => o.base !== 'npc:zoe').map((o) => `${o.r}/${o.deg}:${o.base}`) });
const badZ = agree(r.ring, 'npc:zoe');
check('A7 …the panel\'s "W Talk" only where the prompt is up for her (the desktop\'s note 2: "W Talk" at her back with no prompt and the key doing nothing)', badZ.length === 0 && r.ring.some((o) => /Talk/.test(o.keys)), badZ.slice(0, 6));
// and by keys: from behind her, walked into her back, the key talks
r = await ev(() => {
  const G = game, z = G.story.chapters[0].npc('zoe'), a = (z.angle ?? 0) + Math.PI;
  IP.put(z.pos.x + Math.sin(a) * 1.6, z.pos.z + Math.cos(a) * 1.6, z.pos.x, z.pos.z); G.input.keys.add('ArrowUp'); G.step(0.8); G.input.keys.delete('ArrowUp');
  const o = IP.read(); P.tap('KeyW', 0.3); o.state = G.state; P.settle(); return o;
});
check('A8 walked into Zoé\'s back and the key pressed: the prompt said Talk and she talks', r.it === 'npc:zoe' && /Talk/.test(r.prompt) && r.state === 'dialog', r);
// ACT-RESUME: the tap tried (his hand on it opens a line), the line closed: at once the key acts again and he walks
r = await ev(() => {
  const G = game, h = G.hero, I = G.input, Y = G.story.chapters[0].home.parts.yard;
  G.flags.pr_kettle = true; G.step(0.1);
  const at = () => { IP.put(Y.x + 1.0, Y.z - 0.2, Y.x, Y.z); h.resetMotion?.(); G.step(0.3); };
  at(); P.tap('KeyW'); let t = 0; while (t < 3 && G.state === 'play') { G.step(0.05); t += 0.05; }
  const talked = G.state === 'dialog';
  for (let n = 0; G.state !== 'play' && n < 200; n++) { I.keys.add('KeyW'); I.taps.add('KeyW'); G.step(1 / 60); I.keys.delete('KeyW'); G.step(0.15); }
  const actT = +h.actT.toFixed(2);
  // walking: Up held 0.25 s straight after
  const p0 = h.pos.clone(); I.keys.add('ArrowUp'); G.step(0.25); I.keys.delete('ArrowUp'); const walked = +Math.hypot(h.pos.x - p0.x, h.pos.z - p0.z).toFixed(2);
  // the key, one frame after play is back (he stands by the tap again)
  at(); P.tap('KeyW'); for (let n = 0; G.state !== 'play' && n < 200; n++) { I.keys.add('KeyW'); I.taps.add('KeyW'); G.step(1 / 60); I.keys.delete('KeyW'); G.step(0.15); }
  IP.put(Y.x + 1.0, Y.z - 0.2, Y.x, Y.z); G.step(1 / 60);
  I.keys.add('KeyW'); I.taps.add('KeyW'); G.step(1 / 60); I.keys.delete('KeyW');
  const again = !!h.steer || G.state !== 'play';
  // (let that try finish — his walk to the tap and its line — before the next part moves him)
  for (let t = 0; t < 4 && G.state === 'play' && (h.steer || h.actT > 0); t += 0.05) G.step(0.05);
  P.settle();
  return { talked, actTAfterTalk: actT, walked025: walked, keyActsAtOnce: again };
});
check('A9 after the tap\'s line (his hand on the tap opened it): control at once — no action time left (was 0.45 s), he walks on the first held step, the key acts on the next frame (it was ignored for 0.45 s with "W Try Tap" on screen)', r.talked && r.actTAfterTalk === 0 && r.walked025 > 0.2 && r.keyActsAtOnce, r);
await ev(() => { game.flags.pr_kettle = true; Object.assign(game.flags, { pr_yard: true, pr_barrel: true, pr_pipe: 1, pr_yardOk: true }); game.step(0.2); });

// ---------------------------------------------------------------- B. the well
r = await ev(() => {
  const G = game, W = G.world.well;
  Object.assign(G.flags, { wellSeen: true, key: true, pr_lidStuck: true }); G.story.chapters[0].setLid?.('stuck'); G.step(0.1);
  const m = P.npc('mira'), gi = P.npc('gilbert');
  const T = { x: W.x, z: W.z };
  return { mira: [+m.pos.x.toFixed(1), +m.pos.z.toFixed(1)], gilbert: [+gi.pos.x.toFixed(1), +gi.pos.z.toFixed(1)], ring: [...IP.ring(T, [1.6, 2.2], 16), ...IP.ring(T, [1.9], 16, 0.7), ...IP.ring(T, [1.9], 16, -0.7)] };
});
const wellIn = r.ring.filter((o) => o.it !== '-');
check('B1 the lid to open: round the well (1.6–2.2 m, 16 directions, facing it or 40° off), the well answers (Inspect) before Mira and Gilbert beside it', wellIn.length >= 40 && wellIn.every((o) => o.it === 'well'), { mira: r.mira, gilbert: r.gilbert, n: wellIn.length, not: wellIn.filter((o) => o.it !== 'well').map((o) => `${o.r}/${o.deg}:${o.it}`), before: wellIn.filter((o) => o.base !== 'well').map((o) => `${o.r}/${o.deg}:${o.base}`) });
r = await ev(() => {
  const G = game, W = G.world.well, m = P.npc('mira');
  const ux = m.pos.x - W.x, uz = m.pos.z - W.z, L = Math.hypot(ux, uz);
  // between the two, a little aside, facing Mira squarely: the well ≥ 60° to his side
  const x = m.pos.x - (ux / L) * 1.0 + (-uz / L) * 0.9, z = m.pos.z - (uz / L) * 1.0 + (ux / L) * 0.9;
  IP.put(x, z, m.pos.x, m.pos.z); const o = IP.read(); const h = G.hero;
  o.wellAim = +(((W.x - h.pos.x) * Math.sin(h.angle) + (W.z - h.pos.z) * Math.cos(h.angle)) / Math.hypot(W.x - h.pos.x, W.z - h.pos.z)).toFixed(2);
  return o;
});
check('B2 turned squarely to Mira with the well to his side: Mira answers', r.wellAim >= 0.5 || r.it === 'npc:mira', r);
// in Aggressive: out of reach (5 m) the panel names no key; in reach the prompt's kick and the panel's agree
await ev(() => { const W = game.world.well; P.tap('F3'); IP.put(W.x - 0.2, W.z + 5.0, W.x, W.z); game.step(1.2); });
const far = await ev(() => IP.read());
await ev(() => { const W = game.world.well; IP.put(W.x - 0.2, W.z + 2.0, W.x, W.z); game.step(1.2); });
r = await ev(() => IP.read());
check('B3 in Aggressive: 5 m from the well (Mira in reach there) no "W Kick the lid" in the panel beside her "Talk"; by the well the prompt\'s "Kick" and the panel\'s "W Kick the lid" together', !/Kick the lid/.test(far.tip) && !/Kick/.test(far.prompt) && /Kick/.test(r.prompt) && /Kick the lid/.test(r.tip), { far, near: r });
await shot('p115-3-well-after');
await ev(() => { P.tap('F1'); });
// Gilbert's line with the keys: a fresh lid (the key, not yet tried), Gilbert near
r = await ev(() => {
  const G = game, W = G.world.well, f = G.flags;
  f.pr_lidStuck = false; G.story.chapters[0].setLid?.('locked'); G.hud.toastLog = [];
  const gi = P.npc('gilbert'); IP.put(W.x - 1.9, W.z + 0.3, W.x, W.z); G.step(0.3);
  const it = IP.who(G.findInteractable());
  P.tap('KeyW', 0.2);
  let during = null; const lines = [];
  for (let i = 0; i < 40 && G.state === 'dialog'; i++) {
    const tx = document.querySelector('#dialog .text')?.textContent || '';
    if (!lines.includes(tx)) lines.push(tx);
    if (/good kick/.test(tx) && during == null) { G.step(0.6); during = [...document.querySelectorAll('#toast .toast')].map((e) => e.textContent); }
    P.tap('KeyW', 0.5);
  }
  P.settle();
  return { it, gilbertD: +gi.distTo(G.hero).toFixed(1), lines: lines.map((l) => l.slice(0, 40)), during, stuck: !!f.pr_lidStuck };
});
check('B4 the lid tried with Gilbert by: his "Give it a good kick" comes with the keys on screen ("Aggressive (F3), then W by the lid"; the desktop\'s note 6)', r.stuck && !!r.during?.some((s) => /Aggressive \(F3\).*W/.test(s)), r);
// back up out of the cave before its crystals: the well's way down before Gilbert
r = await ev(() => {
  const G = game, W = G.world.well, f = G.flags;
  Object.assign(f, { pr_lidOpen: true, rope: true, inWell: true }); G.story.chapters[0].setLid?.('open'); G.step(0.1);
  const stars = G.story.markers().filter((m) => m.kind === 'star').map((m) => [Math.round(m.x), Math.round(m.z)]);
  return { stars, ring: IP.ring({ x: W.x, z: W.z }, [1.6, 2.2], 16) };
});
const downIn = r.ring.filter((o) => o.it !== '-');
check('B5 back out of the cave (its crystals still dark): a star on the well again, and round it, facing it, the well ("Inspect": down again) answers before Gilbert (the desktop\'s note 4)', r.stars.some(([x, z]) => Math.hypot(x + 42, z + 4) < 1.5) && downIn.length >= 24 && downIn.every((o) => o.it === 'well'), { stars: r.stars, not: downIn.filter((o) => o.it !== 'well').map((o) => `${o.r}/${o.deg}:${o.it}`), before: downIn.filter((o) => o.base !== 'well').map((o) => `${o.r}/${o.deg}:${o.base}`) });
await ev(() => { Object.assign(game.flags, { inWell: false, rope: false, pr_lidOpen: false, pr_lidStuck: true }); game.story.chapters[0].setLid?.('stuck'); game.step(0.1); });

// ---------------------------------------------------------------- C. Xil from the pier's approach
// (the desktop's note 5: "Xil answers only squarely in front of the barge". Its harness's route planner stuck 2.7–3.3 m
//  from him beside the crane's crates; by keys — turned to him, Up held — he walks up to Xil from each side of the
//  pier's end and the prompt comes: measured here, no change made)
r = await ev(() => {
  const G = game, n = P.npc('xil'), out = [];
  P.go(-122.5, 46.5, { tol: 0.6 });
  for (const [x, z] of [[-124.26, 46.35], [-124.54, 46.83], [-123.5, 46.0], [-125.2, 46.6]]) {
    P.go(x, z, { tol: 0.25, maxT: 20 }); P.face(n.pos.x, n.pos.z);
    const d0 = Math.hypot(G.hero.pos.x - n.pos.x, G.hero.pos.z - n.pos.z);
    G.input.keys.add('ArrowUp'); let t = 0;
    while (t < 2.5 && !document.querySelector('#prompt.show')) { G.step(0.1); t += 0.1; }
    G.input.keys.delete('ArrowUp');
    const o = IP.read(); o.d0 = +d0.toFixed(2); o.t = +t.toFixed(1); o.d = +Math.hypot(G.hero.pos.x - n.pos.x, G.hero.pos.z - n.pos.z).toFixed(2);
    out.push(o);
  }
  return out;
});
check('C1 Xil from the pier\'s approach beside the crane\'s crates (2.6–3.8 m, four spots): turned to him, Up held, "Talk" comes within a short walk (the desktop\'s note 5 was its route planner, not the game)', r.every((o) => o.it === 'npc:xil' && /Talk/.test(o.prompt) && o.t <= 1.5), r);
await ev(() => { const n = P.npc('xil'); P.go(-124.45, 46.25, { tol: 0.25, maxT: 20 }); P.face(n.pos.x, n.pos.z); game.input.keys.add('ArrowUp'); game.step(0.6); game.input.keys.delete('ArrowUp'); game.step(0.4); });
await shot('p115-5-xil');

// ---------------------------------------------------------------- F. FACE-PICK (TESTER-FIXES, INSTALL-69 P115)
// The desktop's real-keys play of 0.50.0: walking up to Zoé, E tried the garden tap; at the well and its way down
// (climbed out of the cave) Gilbert took every E; at the tap E "did nothing" for 40 s. The rule now: what he faces and is
// nearest along his facing takes the key; a person only when he faces them. `was`: the pick before FACE-PICK (C.goal)
await ev(() => {
  window.IP.read2 = () => { const o = IP.read(), C = game._pick; o.was = IP.who(C && (C.n >= 2 || (C.n === 1 && !C.goal)) ? C.goal : game.findInteractable()); return o; };
  window.IP.aimAt = (x, z) => { const h = game.hero, d = Math.hypot(x - h.pos.x, z - h.pos.z); return d < 1e-3 ? 1 : ((x - h.pos.x) * Math.sin(h.angle) + (z - h.pos.z) * Math.cos(h.angle)) / d; };
});
// F1/F2 the tap's step: round Zoé facing her (1.1-2.2 m, 24 directions); where the tap is in reach but 45° or more off
// his line, Zoé answers; facing the tap with Zoé in reach beside it, the tap
r = await ev(() => {
  const G = game, ch = G.story.chapters[0], f = G.flags;
  Object.assign(f, { pr_kettle: true, pr_yard: false, pr_barrel: false, pr_pipe: 0, pr_yardOk: false, key: false, wellSeen: false, pr_lidStuck: false, pr_lidOpen: false, rope: false, inWell: false });
  ch.setLid?.('locked'); G.step(0.2);
  const Y = ch.home.parts.yard, z = ch.npc('zoe'), side = [], faced = [];
  for (const rr of [1.1, 1.6, 2.2]) for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, x = z.pos.x + Math.sin(a) * rr, zz = z.pos.z + Math.cos(a) * rr;
    IP.put(x, zz, z.pos.x, z.pos.z); const o = IP.read2(), tapD = Math.hypot(Y.x - x, Y.z - zz), ta = IP.aimAt(Y.x, Y.z);
    if (tapD < 1.5 && ta < Math.cos(Math.PI / 4)) side.push({ r: rr, deg: k * 15, tapD: +tapD.toFixed(2), tapAim: +ta.toFixed(2), it: o.it, was: o.was });
  }
  for (const rr of [0.8, 1.2]) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, x = Y.x + Math.sin(a) * rr, zz = Y.z + Math.cos(a) * rr;
    IP.put(x, zz, Y.x, Y.z); const o = IP.read2(), zd = Math.hypot(z.pos.x - x, z.pos.z - zz);
    // (where he really stands after the step: a spot in the fence or the bucket is pushed out, and the tap may then lie aside)
    const ta = IP.aimAt(Y.x, Y.z), td = Math.hypot(Y.x - G.hero.pos.x, Y.z - G.hero.pos.z);
    if (zd < 2.6 && o.it !== '-') faced.push({ r: rr, deg: k * 22.5, zoeD: +zd.toFixed(2), tapAim: +ta.toFixed(2), tapD: +td.toFixed(2), it: o.it, was: o.was });
  }
  return { side, faced };
});
check('F1 the tap\'s step, walking up to Zoé: facing her with the tap in reach but 45° or more off his line, Zoé answers at every such spot (before: the tap at some)', r.side.length > 0 && r.side.every((o) => o.it === 'npc:zoe'), { n: r.side.length, not: r.side.filter((o) => o.it !== 'npc:zoe'), before: r.side.filter((o) => o.was !== 'npc:zoe').map((o) => `${o.r}/${o.deg}:${o.was}`) });
check('F2 …and facing the tap (within 25° where he stands, 0.8-1.2 m) with Zoé in reach beside it, the tap answers', r.faced.filter((o) => o.tapAim >= 0.9).length > 20 && r.faced.filter((o) => o.tapAim >= 0.9).every((o) => o.it === 'h_yard'), { n: r.faced.length, squarely: r.faced.filter((o) => o.tapAim >= 0.9).length, not: r.faced.filter((o) => o.it !== 'h_yard') });
await ev(() => { const Y = game.story.chapters[0].home.parts.yard, z = game.story.chapters[0].npc('zoe'); IP.put(Y.x + 1.25, Y.z - 0.85, z.pos.x, z.pos.z); game.step(0.3); });
await shot('f1-tap-step-facing-zoe');
// F3 STEER-HOLD: E at the tap from 1.3 m, then a turn key tapped for 0.1 s while he steps up to it: his hand still goes to
// the tap and its line comes (before: the tap was thrown away and nothing happened); a move held 0.4 s takes over
r = await ev(() => {
  const G = game, h = G.hero, I = G.input, Y = G.story.chapters[0].home.parts.yard;
  const go = (k, hold) => {
    IP.put(Y.x + 1.3, Y.z - 0.4, Y.x, Y.z); h.resetMotion?.(); G.step(0.3);
    P.tap('KeyW', 0.05); const steering = !!h.steer;
    I.keys.add(k); G.step(hold); I.keys.delete(k);
    let t = 0; while (t < 4 && G.state === 'play' && (h.steer || h.actT > 0)) { G.step(0.05); t += 0.05; }
    const out = { steering, state: G.state, line: (document.querySelector('#dialog .text')?.textContent || '').slice(0, 40) };
    P.settle(); return out;
  };
  return { tap: go('ArrowLeft', 0.1), held: go('ArrowDown', 0.45) };
});
check('F3 at the tap, E then a turn key tapped 0.1 s during his step up: the tap\'s line still comes; a move held 0.45 s takes over (no line)', r.tap.steering && r.tap.state === 'dialog' && r.held.steering && r.held.state === 'play', r);
// F4/F5 the well and its way down, climbed out of the cave (its crystals still dark): Gilbert and Mira stood right beside
// him; facing the well (within 25°, 1.6-2.4 m) the well answers ("Inspect": the way down); turned squarely to Gilbert with
// the well 60° or more aside, Gilbert
r = await ev(() => {
  const G = game, ch = G.story.chapters[0], f = G.flags, W = G.world.well;
  Object.assign(f, { pr_kettle: true, pr_yard: true, pr_barrel: true, pr_pipe: 1, pr_yardOk: true, wellSeen: true, key: true, pr_lidOpen: true, rope: true, inWell: true });
  ch.setLid?.('open'); G.step(0.2);
  const gi = P.npc('gilbert'), mi = P.npc('mira'), keep = [gi.pos.clone(), mi.pos.clone()];
  // (the passers-by on their rounds kept out of these spots: a resident walking across his line would rightly take it)
  const away = G.npcs.filter((n) => n.present && n !== gi && n !== mi && Math.hypot(n.pos.x - W.x, n.pos.z - W.z) < 9); for (const n of away) n.present = false;
  const well = [], person = [];
  // (the way out of the well's room puts him here, facing away: main.js exitTo; then he turns to the well)
  const ex = ch.exitTo('well');
  for (const [rr, off] of [[1.6, 0], [2.0, 0], [2.4, 0], [2.0, 0.4], [2.0, -0.4], [Math.hypot(ex.x - W.x, ex.z - W.z), 0]]) for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, x = W.x + Math.sin(a) * rr, z = W.z + Math.cos(a) * rr;
    // Gilbert 1.0 m to his right, Mira 1.3 m to his left (turned 75° off the well's line)
    const fa = Math.atan2(W.x - x, W.z - z) + off;
    for (const [n, s, dd] of [[gi, 1, 1.0], [mi, -1, 1.3]]) { const b = fa + s * 1.3; n.pos.set(x + Math.sin(b) * dd, n.pos.y, z + Math.cos(b) * dd); n.sync?.(); }
    IP.put(x, z, x + Math.sin(fa) * 3, z + Math.cos(fa) * 3); const o = IP.read2();
    well.push({ r: +rr.toFixed(2), deg: k * 30, off, it: o.it, was: o.was });
    // turned to Gilbert squarely
    IP.put(x, z, gi.pos.x, gi.pos.z); const o2 = IP.read2();
    if (IP.aimAt(W.x, W.z) < 0.5) person.push({ r: +rr.toFixed(2), deg: k * 30, it: o2.it, was: o2.was });
  }
  gi.pos.copy(keep[0]); mi.pos.copy(keep[1]); gi.sync?.(); mi.sync?.();
  for (const n of away) n.present = true;
  return { well, person };
});
const wellIn2 = r.well.filter((o) => o.it !== '-');
check('F4 the well climbed out of (its way down), Gilbert 1 m and Mira 1.3 m beside him: facing the well (within 25°, 1.6-2.4 m and the exit\'s spot), the well answers at every spot (before: Gilbert or Mira at some)', wellIn2.length >= 60 && wellIn2.every((o) => o.it === 'well'), { n: wellIn2.length, not: wellIn2.filter((o) => o.it !== 'well').slice(0, 8), before: wellIn2.filter((o) => o.was !== 'well').map((o) => `${o.r}/${o.deg}/${o.off}:${o.was}`).slice(0, 12), beforeN: wellIn2.filter((o) => o.was !== 'well').length });
check('F5 …turned squarely to Gilbert with the well 60° or more aside: Gilbert answers', r.person.length > 0 && r.person.every((o) => o.it === 'npc:gilbert'), { n: r.person.length, not: r.person.filter((o) => o.it !== 'npc:gilbert').slice(0, 6) });
await ev(() => { Object.assign(game.flags, { inWell: false, rope: false, pr_lidOpen: false, pr_lidStuck: true }); game.story.chapters[0].setLid?.('stuck'); game.step(0.1); });

// ---------------------------------------------------------------- D. Hebrew: the tap's step
r = await ev(() => {
  const G = game; G.settings.lang = 'he'; G.applySettings();
  Object.assign(G.flags, { pr_yard: false, pr_barrel: false, pr_pipe: 0, pr_yardOk: false, key: false, wellSeen: false, pr_lidStuck: false });
  const Y = G.story.chapters[0].home.parts.yard; IP.put(Y.x + 0.95, Y.z - 0.3, Y.x, Y.z); G.step(0.6);
  return IP.read();
});
check('D1 Hebrew: at the tap\'s step the prompt and the panel\'s key line name the same action (לפתוח את הברז)', r.it === 'h_yard' && /הברז/.test(r.keys) && !!r.prompt, r);
await shot('p115-he-tap-step');
await browser.close();

// ---------------------------------------------------------------- E. the sweep (every campaign fixture's objective stars)
if (process.env.SWEEP !== '0') {
  const saves = (process.env.SAVES || 'base-01,base-03,base-04,base-05,base-06,base-07,base-09,base-10,base-11,base-12,base-13,base-14,base-15').split(',');
  const tot = { spots: 0, before: 0, after: 0, stars: 0 }, rows = [];
  for (const name of saves) {
    const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8')); for (const o of j.origins || []) o.origin = ORIGIN;
    ({ browser, page } = await launch({ storageState: j }));
    ev = (f, a) => page.evaluate(f, a);
    await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { P.settle(); });
    const s = await ev(() => {
      const G = game, h = G.hero, C = () => G._pick;
      const here = { x: h.pos.x, z: h.pos.z, y: h.pos.y };
      const stars = G.story.markers().filter((m) => m.kind === 'star' && Math.hypot(m.x - here.x, m.z - here.z) < 260);
      const res = { chapter: G.flags.chapterKey, room: G.room?.id || 'out', stars: stars.length, spots: 0, before: 0, after: 0, cases: [] };
      for (const m of stars) for (const r of [1.0, 1.6, 2.2]) for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, x = m.x + Math.sin(a) * r, z = m.z + Math.cos(a) * r;
        h.pos.set(x, G.physics.groundAt(x, z, here.y + 1), z); h.angle = Math.atan2(m.x - x, m.z - z); h.onGround = true;
        const it = G.findInteractable(), c = C();
        // the star's own thing among the candidates in reach (a person on it, or a thing within 1 m)
        let goal = null;
        for (let i = 0; i < c.n; i++) {
          const d = Math.hypot(c.x[i] - m.x, c.z[i] - m.z); if (!(d < (c.o[i].kind === 'npc' ? 0.4 : 1.0))) continue;
          // (roughly faced, as the rule wants: within ~75° of his facing, or right by him)
          const gd = Math.hypot(c.x[i] - h.pos.x, c.z[i] - h.pos.z), ga = gd < 0.5 ? 0 : ((c.x[i] - h.pos.x) * Math.sin(h.angle) + (c.z[i] - h.pos.z) * Math.cos(h.angle)) / gd;
          if (ga > 0.25 || gd < 0.8) { goal = c.o[i]; break; }
        }
        if (!goal) continue;
        res.spots++;
        const base = c.n >= 2 || (c.n === 1 && !c.base) ? c.base : it;
        if (base !== goal) res.before++;
        if (it !== goal) { res.after++; if (res.cases.length < 4) res.cases.push(`${m.label || ''}@${r}/${k * 22.5}:${it?.kind}${it?.npc ? ':' + it.npc.def.id : ''}`); }
        else if (base !== goal && res.cases.length < 8) res.cases.push(`fixed ${m.label || ''}@${r}/${k * 22.5}: ${base ? base.kind + (base.npc ? ':' + base.npc.def.id : '') : 'container'} → ${goal.kind}${goal.npc ? ':' + goal.npc.def.id : ''}`);
      }
      return res;
    });
    console.log(`SWEEP ${name}: ${JSON.stringify(s)}`);
    tot.spots += s.spots; tot.before += s.before; tot.after += s.after; tot.stars += s.stars; rows.push([name, s.after]);
    await browser.close();
  }
  check('E1 the sweep, every fixture\'s objective stars: where the star\'s own thing is in reach and faced, it takes the key (before the goal\'s rule some spots went to a person or another thing)', tot.after === 0, tot);
}
done();
