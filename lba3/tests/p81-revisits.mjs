// P81 (the user's brief of 20.11: "places change after Twinsen helps"): the revisit changes, one focused check.
// Kesh (Desert Island, chapter 4): before the pump Sani stands at his roof spot; once the joint is pushed home (INPUT)
// he walks down to the oasis's rim and kneels with his hands in the water, and stays there on the way back from
// Ilka's camp (chapter 4) and in chapter 5; Tarra's line says what is seen ("Sani, splashing in the oasis"); his own line
// is about the jars; Save & quit → Continue keeps him there. A picture from the normal camera: captures/p81/.
// ISO (logged): chapter 4 is reached by flags (as tests/desert-life.mjs); the pump's jammed gear is set by its flag
// (tests/chapter4.mjs throws it); the joint is pushed by the use key.
// Run: GAME_URL=http://localhost:<port>/ node tests/p81-revisits.mjs
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = fileURLToPath(new URL('../captures/p81/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
// where Sani is, against his roof spot and his oasis place
const sani = () => ev(() => { const G = game, D = G.rooms.desert, n = P.npc('dkid'), ch = G.story.chapters.find((c) => c.key === 'dig');
  const want = ch.saniAtOasis(D.oasis), d = (p) => +Math.hypot(n.pos.x - p.x, n.pos.z - p.z).toFixed(2);
  const gy = G.physics.groundAt(n.pos.x, n.pos.z);
  // (the nearest other person present: Safi's and Tamu's rounds stop at the oasis too)
  let near = Infinity, who = null; for (const o of G.npcs) if (o !== n && o.present && Math.abs(o.pos.x - n.pos.x) < 30) { const e = Math.hypot(o.pos.x - n.pos.x, o.pos.z - n.pos.z); if (e < near) { near = e; who = o.def.id; } }
  return { present: n.present, anim: n.forceAnim, toKid: d(D.npcSpots.kid), toOasis: d(want), rim: +Math.hypot(n.pos.x - D.oasis.x, n.pos.z - D.oasis.z).toFixed(2), r: D.oasis.r,
    feet: +(n.pos.y - gy).toFixed(2), walking: !!n.track, ch: G.flags.chapterKey, near: +near.toFixed(2), who }; });
const shot = async (name) => {
  await ev(() => { const G = game, n = P.npc('dkid'), h = G.hero, D = G.rooms.desert, a = Math.atan2(n.pos.x - D.oasis.x, n.pos.z - D.oasis.z);
    // (Twinsen 6 m out along the rim, looking at a point 2 m past Sani over the water: Sani to one side of him in the
    //  follow camera's view, not behind his back)
    const x = n.pos.x + Math.sin(a + 1.2) * 6, z = n.pos.z + Math.cos(a + 1.2) * 6;
    const tx = n.pos.x - Math.sin(a) * 2, tz = n.pos.z - Math.cos(a) * 2;
    h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.atan2(tx - x, tz - z); h.onGround = true; h.vy = 0;
    G.camRig.lba.init = false; G.step(1.2); G.renderer.render(); });
  await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 72, timeout: 180000 });
};

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 3 finished by flags (as tests/desert-life.mjs): chapter 4 on Desert Island');
await ev(() => { const G = game; P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); P.settle();
  Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
  G.story.cur.toShell(); P.settle(); G.step(1.5); P.settle(); });
await said();
const s0 = await sani();
check('chapter 4, the pump seized: Sani at his usual spot, not at the water', s0.ch === 'dig' && s0.present && s0.toKid < 0.3 && !s0.anim, s0);

iso('the jammed gear knocked loose by its flag (c4_pumpTask, c4_gear1: the pump turns and leaks)');
await ev(() => { const G = game; Object.assign(G.flags, { c4_pumpTask: true, c4_gear1: true }); G.story.applyFlags(); G.step(0.5); P.settle(); });
const jo = await ev(() => { const J = game.rooms.desert.pump.joint; return P.use(J.x, J.z, { kind: 'c4joint', run: true }); });
const jl = await said();
await ev(() => { for (let i = 0; i < 40; i++) game.step(0.25); P.settle(); });
const s1 = await sani();
check('the joint pushed home (INPUT): the pump runs; Sani has walked down to the oasis rim and kneels with his hands in the water', jo.r === 'used' && jl.some((l) => /collar slides home/.test(l)) && s1.toOasis < 0.4 && s1.anim === 'touchWater' && !s1.walking && s1.rim > s1.r + 0.2 && Math.abs(s1.feet) < 0.15 && s1.near > 1.2, { jo: jo.r, s1 });
await shot('01-sani-at-oasis');

const t1 = await ev(() => { game.flags.c4_trust = true; return P.talk('tarra', { run: true }).r; });
const tl = await said();
check('Tarra (pump running, trust given; INPUT): the sound she names is the one in view', t1 === 'talked' && tl.some((l) => /Sani, splashing in the oasis/.test(l)) && !tl.some((l) => /children are swimming/.test(l)), { t1, tl });
const k1 = await ev(() => P.talk('dkid', { run: true }).r);
const kl = await said();
check('Sani (INPUT): the jars he is meant to fill, not the pump heard "from my roof"', k1 === 'talked' && kl.some((l) => /filling Mum's jars/.test(l)) && !kl.some((l) => /from my roof/.test(l)), { k1, kl });
const s2 = await sani();
check('after the talk he goes back to the water', s2.toOasis < 0.4 && s2.anim === 'touchWater', s2);

iso('Save & quit → Continue');
const file = path.join(os.tmpdir(), 'p81-revisits-' + process.pid + '.json');
await ev(() => { game.save(false); });
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
await ev(() => { P.settle(); game.step(1); });
const s3 = await sani();
check('Continue: Sani still at the oasis rim, hands in the water', s3.ch === 'dig' && s3.present && s3.toOasis < 0.4 && s3.anim === 'touchWater', s3);

iso('chapter 5 by flags (as tests/chapter5.mjs: the dig and the carving done): the return to Kesh');
await ev(() => { const G = game; Object.assign(G.flags, { c4_trust: true, c4_rope: true, c4_notebook: true, c4_digOpen: true, c4_seals3: true, c4_carving: true, c4_done: true }); G.story.nextChapter(); P.settle(); G.step(1.5); P.settle(); });
await said();
const s4 = await sani();
check('chapter 5 in Kesh: Sani is still at the water', s4.ch === 'steam' && s4.present && s4.toOasis < 0.4 && s4.anim === 'touchWater', s4);
await shot('02-chapter5-kesh');

await browser.close();
done();
