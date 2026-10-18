// Chapter 4 playthrough (Desert Island): jump to the end of chapter 3 → the sealed shaft → Kesh (Mother
// Tarra, the wind-pump's three gears) → Hesk, the rope, the sand-yacht → Ilka's camp → the research post in a
// sandstorm (the notebook) → save/reload → the dig (gate code, terraces, three seals) → the carving and
// Dallan → chapter 11. Ball targets are thrown at first; "forced" in the log means a throw missed.
// ADV-1 (the dig's five discs, docs/lba3-team/ADVENTURE_DESIGN.md): from the open gate on, by INPUT with the player
// harness (tests/lib/player.js: walking, E, the ball): Ilka at the rim, the warm crack on the way down, the five
// discs, the carving over the door, a warm disc, a cold disc shutting it again, Ilka's stronger hint, Save & quit →
// Continue with two discs open, a cold disc again (a toast this time), a death → Retry, the three warm discs, the
// temple's line about the cold discs, the journal. PASS/FAIL lines and the exit code cover this part. (Played by an
// agent who knows the solution: not a first-time player's test.)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : JSON.stringify(info)?.slice(0, 700)); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
const shot = async (n) => { await ev(() => game.renderer.render()); await page.screenshot({ path: n, timeout: 180000 }); };
const boot = async (mode) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 480000 });   // (a shared machine under load needs the margin)
  await page.evaluate(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    window.T = {
      tap(c) { G.input.taps.add(c); G.step(1 / 60); },
      talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0, y = null) { const h = G.hero; h.pos.set(x, y == null ? G.physics.groundAt(x, z) : G.physics.groundAt(x, z, y + 1), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
      npc(id) { return G.npcs.find((n) => n.def.id === id); },
      talk(id) { const n = T.npc(id); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
      useAt(x, z, y = null) { T.tp(x + 0.9, z + 0.3, 0, y); G.hero.angle = Math.atan2(x - G.hero.pos.x, z - G.hero.pos.z); G.step(0.3); T.tap('KeyE'); G.step(1.6); T.talkAll(); },
      // walk onto an exit and let the room change happen
      exit(to) { const e = G.room.exits.find((x) => x.to === to); if (!e) return 'no exit ' + to; T.tp(e.x, e.z, 0, e.y ?? Math.max(G.hero.pos.y, G.room.deckY ?? -1e9) + 0.5); G.step(1.6); T.talkAll(); return G.room?.id ?? 'out'; },
      // throw at a ball target from a few metres away; fall back to applying the hit
      hit(tg) {
        const h = G.hero;
        for (let i = 0; i < 6 && !tg.done; i++) {
          const a = i * 1.05, r = 3.5;
          T.tp(tg.x - Math.sin(a) * r, tg.z - Math.cos(a) * r);
          h.angle = Math.atan2(tg.x - h.pos.x, tg.z - h.pos.z);
          G.ball.state = 'idle'; h.hp = h.maxHp ?? 10;
          T.tap('Digit1'); T.tap('KeyF'); G.step(1.4); T.talkAll();
        }
        if (tg.done) return 'thrown';
        G.story.ballHit({ x: tg.x, y: tg.y, z: tg.z }); G.step(0.2); T.talkAll();
        return tg.done ? 'forced' : 'FAILED';
      },
      f() { return { ...G.flags }; },
      obj() { return document.querySelector('#objective')?.textContent || ''; },
    };
  });
};

await boot('new');
// to the end of chapter 3 (Zeelich): the sealed shaft sends Twinsen south
await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
log('sealed shaft', await ev(() => { const G = game; Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
  G.story.cur.toShell(); T.talkAll(); G.step(1.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id, G.state, T.obj()]; }));
await shot('C4-00-arrive.png');
// Kesh: Mother Tarra, the pump
log('tarra', await ev(() => { T.talk('tarra'); return [game.flags.c4_pumpTask, T.obj()]; }));
log('gears', await ev(() => game.room.ballTargets.filter((t) => t.gear != null).map((tg) => T.hit(tg))));
log('pump', await ev(() => { game.step(1); T.talkAll(); return [game.flags.c4_pump, T.obj()]; }));
log('trust', await ev(() => { T.talk('tarra'); return [game.flags.c4_trust, T.obj()]; }));
await shot('C4-01-oasis.png');
// Hesk, the rope, the ride
log('hesk', await ev(() => { T.talk('hesk'); return [game.flags.c4_heskAsk, T.obj()]; }));
log('rope', await ev(() => { const R = game.rooms.desert.rope; T.useAt(R.x, R.z); return [game.flags.c4_rope]; }));
log('ride', await ev(() => { T.talk('hesk'); const G = game; for (let i = 0; i < 400 && G.state !== 'play'; i++) G.step(0.05); return [G.flags.c4_yacht, G.state, Math.round(G.hero.pos.x), Math.round(G.hero.pos.z)]; }));
await shot('C4-02-camp.png');
log('ilka', await ev(() => { T.talk('ilka'); return [game.flags.c4_ilka, T.obj()]; }));
// the research post in a storm
log('storm', await ev(() => { const G = game; for (let i = 0; i < 400 && !G.story.cur.stormy; i++) G.step(0.05); return [G.story.cur.stormy, G.rooms.desert.post.gate.isOpen, G.rooms.desert.storm.level.toFixed(2)]; }));
log('desk', await ev(() => { const P = game.rooms.desert.post; T.tp(P.gate.x + 3, P.gate.z); T.useAt(P.desk.x, P.desk.z); return [game.flags.c4_notebook, T.obj()]; }));
await shot('C4-03-post.png');
// save/reload mid-chapter
const before = await ev(() => { game.save(false); return JSON.stringify(['c4_pump', 'c4_trust', 'c4_rope', 'c4_ilka', 'c4_notebook', 'c4_yacht'].map((k) => game.flags[k] ?? null)); });
await boot('continue');
const after = await ev(() => { T.talkAll(); return JSON.stringify(['c4_pump', 'c4_trust', 'c4_rope', 'c4_ilka', 'c4_notebook', 'c4_yacht'].map((k) => game.flags[k] ?? null)); });
log('save/load', before === after, after, await ev(() => [game.room?.id, game.flags.chapterKey, game.rooms.desert.oasis.level.toFixed(2), T.obj()]));
// the dig
log('gate', await ev(() => { const g = game.rooms.desert.dig.gate; T.useAt(g.x, g.z); return [game.flags.c4_digOpen, T.obj()]; }));
// ---- ADV-1: the five discs, by input
await page.addScriptTag({ path: HARNESS });
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
await said();
// throw at a disc as a player does: walk to a spot in front of it, face it, tap F (another spot if a throw misses)
const throwAt = (sel) => ev((sel) => {
  const G = game, D = G.rooms.desert.dig, tg = G.room.ballTargets.find((t) => t[sel[0]] === sel[1]);
  const key = () => JSON.stringify([G.flags.c4_seal0, G.flags.c4_seal1, G.flags.c4_seal2, G.flags.c4_coldHits]);
  const dx = D.x - tg.x, dz = D.z - tg.z, d = Math.hypot(dx, dz);
  for (let k = 0; k < 4; k++) {
    const sp = [0, 0.3, -0.3, 0.6][k], r = 2.6 + (k % 2) * 0.6, ca = Math.cos(sp), sa = Math.sin(sp);
    const ux = (dx * ca - dz * sa) / d, uz = (dx * sa + dz * ca) / d;
    P.go(tg.x + ux * r, tg.z + uz * r, { tol: 0.35, maxT: 40 }); P.settle();
    const f0 = key();
    for (let w = 0; w < 120 && G.ball.state !== 'idle'; w++) G.step(1 / 30);
    if (G.hero.behaviour !== 'normal') P.tap('F1');
    P.throwAt(tg.x, tg.z); P.settle();
    if (key() !== f0) return { k, r: 'hit' };
  }
  return { r: 'missed' };
}, sel);
const fl = () => ev(() => { const f = game.flags; return { s: [f.c4_seal0, f.c4_seal1, f.c4_seal2].map(Boolean), cold: f.c4_coldHits || 0, seals3: !!f.c4_seals3, bottom: !!f.c4_bottom, crack: !!f.c4_crack, on: game.rooms.desert.dig.seals.map((s) => s.on) }; });
const obj = () => ev(() => document.querySelector('#objective')?.textContent || '');
const rim = await ev(() => { const n = P.npc('ilka'), g = game.rooms.desert.dig.gate; return { present: n?.present, d: +Math.hypot(n.pos.x - g.x, n.pos.z - g.z).toFixed(1) }; });
check('Ilka waits at the dig rim, clear of the keypad', rim.present && rim.d > 1.2 && rim.d < 5, rim);
const ik1 = await ev(() => P.talk('ilka')); const s1 = await said();
check('Ilka at the rim before he goes down: "go on down" (INPUT)', ik1.r === 'talked' && has(s1, /knees did those ramps/), { ik1, s1 });
// down the terraces on foot, past the crack beside the last ramp (mites on the way are fought as a player would)
const down = await ev(() => { const G = game, D = G.rooms.desert.dig, c = D.crack; let r; for (let k = 0; k < 4 && Math.abs(G.hero.pos.y - D.bottomY) > 0.8; k++) { r = P.go(c.x + (D.x - c.x) * 0.3, c.z + (D.z - c.z) * 0.3, { tol: 0.8, maxT: 120 }); P.settle(); } return { r: r?.r, y: +G.hero.pos.y.toFixed(2) }; });
let s2 = await said();
const down2 = await ev(() => { const D = game.rooms.desert.dig; const r = P.go(D.x, D.z, { tol: 1.0, maxT: 40 }); P.settle(); return r.r; });
s2 = s2.concat(await said());
let F = await fl();
const iC = s2.findIndex((l) => /Warm air from a crack/.test(l)), iB = s2.findIndex((l) => /Five stone discs on pillars/.test(l));
check('walking down: the warm crack is remarked on first, then the five discs (INPUT)', F.crack && F.bottom && iC >= 0 && iB > iC, { down, down2, F, s2 });
const F0 = F, n0 = F0.s.filter(Boolean).length;   // (a ball thrown at a mite on the way down may already have struck a disc: counted, not assumed)
check('the objective counts the door\'s seals (n/3)', new RegExp('seals \\(' + n0 + '\\/3\\)').test(await obj()), { obj: await obj(), F0 });
await shot('C4-04-dig.png');
const lin = await ev(() => { const c = game.rooms.desert.dig.carvings; return P.use(c.x, c.z, { kind: 'c4lintel' }); }); const s3 = await said();
check('the carving over the door can be inspected: five vents puffing (INPUT)', has(s3, /puffing like a kettle/), { lin, s3 });
const wi = F0.s.indexOf(false), w0 = await throwAt(['seal', wi]); F = await fl();
check('a warm disc opens and glows, counted in the objective (INPUT)', w0.r === 'hit' && F.s[wi] && F.on[wi] && new RegExp('\\(' + F.s.filter(Boolean).length + '\\/3\\)').test(await obj()), { wi, w0, F, obj: await obj() });
await said();
const c1 = await throwAt(['cold', 0]); const s4 = await said(); F = await fl();
check('a cold disc: a thud, and every open disc grinds shut (line, flags, glow) (INPUT)', c1.r === 'hit' && !F.s.some(Boolean) && !F.on.some(Boolean) && F.cold === 1 && has(s4, /open ones ground shut/), { c1, F, s4 });
check('after a cold disc the objective recalls what it does', (await obj()).includes('A cold disc shuts the others'), await obj());
const ik2 = await ev(() => P.talk('ilka', { run: true })); const s5 = await said();
check('Ilka\'s hint after a cold disc is the stronger one (walked back up, INPUT)', ik2.r === 'talked' && has(s5, /Leave the bare ones/), { ik2, s5 });
await ev(() => { const D = game.rooms.desert.dig; P.go(D.x, D.z, { tol: 1.0, maxT: 120 }); P.settle(); });
await throwAt(['seal', 0]); await throwAt(['seal', 1]); F = await fl();
check('two warm discs open (2/3) (INPUT)', F.s[0] && F.s[1] && !F.s[2], F);
// Save & quit → Continue with two discs open, through the pause menu and the title screen as a player does
await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
const reloaded = page.waitForEvent('load', { timeout: 300000 });
await page.click('#pause [data-act="quit"]', { timeout: 60000 }); await reloaded;
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => { game.testFreeze = true; game.step(0.3); P.settle(); });
  await said();
};
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
await page.evaluate(() => { game.testFreeze = true; });
await page.click('[data-act="continue"]', { timeout: 180000 });
await reboot();
F = await fl();
const tg2 = await ev(() => game.room.ballTargets.filter((t) => t.seal != null).sort((a, b) => a.seal - b.seal).map((t) => !!t.done));
check('Save & quit → Continue: two discs still open (flags, glow, targets) and the cold count kept', F.s[0] && F.s[1] && !F.s[2] && F.on[0] && F.on[1] && !F.on[2] && tg2[0] && tg2[1] && !tg2[2] && F.cold === 1, { F, tg2 });
const c2 = await throwAt(['cold', 1]); const s6 = await said(); const toast = await ev(() => (game.hud.toastLog || []).slice(-3)); F = await fl();
check('a cold disc again: both close, a toast this time instead of the speech (INPUT)', c2.r === 'hit' && !F.s[0] && !F.s[1] && F.cold === 2 && !has(s6, /ground shut/) && toast.some((m) => /Cold disc: the seals closed/.test(m)), { c2, F, s6, toast });
const w2 = await throwAt(['seal', 2]); F = await fl();
// a death with one disc open: Retry continues from the last save, that disc still open
await ev(() => { const h = game.hero; h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null); for (let i = 0; i < 200 && game.state !== 'gameover'; i++) game.step(1 / 30); });
await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
await reboot();
const F2 = await fl();
check('death → Retry: the open disc and the cold count come back from the save (ISO death)', w2.r === 'hit' && F.s[2] && F2.s[2] && !F2.s[0] && F2.on[2] && F2.cold === 2, { w2, F, F2 });
await throwAt(['seal', 0]); await throwAt(['seal', 1]); await ev(() => { game.step(0.5); P.settle(); });
F = await fl();
check('the three warm discs open the temple door (INPUT)', F.seals3 && F.s.every(Boolean), F);
const jr = await ev(() => game.story.journal().flatMap((c) => c.lines.map((l) => l.key)));
check('the journal recalls the crack, the discs and what a cold disc does (not the answer)', ['c4_j_ilka', 'c4_j_crack', 'c4_j_discs', 'c4_j_cold'].every((k) => jr.includes(k)), jr);
await said();
// the seals open the Temple of Bù's gate: walk in, read the great carving inside
const tin = await ev(() => { const G = game, d = G.rooms.desert.dig.door; P.settle(); const r = P.through(d.x, d.z); return [G.room?.id, G.flags.c4_templeSeen, r.r, document.querySelector('#objective')?.textContent || '']; });
log('temple', tin);
check('into the temple through the opened door (INPUT)', tin[0] === 'butemple' && tin[1], tin);
await shot('C4-05-temple.png');
log('carving', await ev(() => { const G = game, c = G.rooms.butemple.carving; const r = P.use(c.x, c.z, { kind: 'c4carve' }); G.step(2); P.settle(); return [G.flags.c4_carving, G.flags.c4_done, r.r]; }));
const s7 = await said();
check('the carving: Twinsen ties the cold discs to the closing vents', has(s7, /two of the discs out there were cold/), s7);
await shot('C4-05-carving.png');
const nx = await ev(() => { const G = game; G.step(1.5); P.settle(); return [G.flags.chapterKey, G.room?.id, document.querySelector('#objective')?.textContent || '']; });
log('next', nx);
check('chapter 5 follows', nx[0] === 'steam', nx);
console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails || errs.length ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails || errs.length ? 1 : 0);
