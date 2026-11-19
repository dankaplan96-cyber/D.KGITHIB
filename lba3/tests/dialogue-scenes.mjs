// DIALOGUE-EDIT: a few edited exchanges played in the game, read back as the dialogue box shows them. Each scene is set
// up by flags (as the chapter suites do), the conversation is started with the talk key, and every line said is read
// from game.say as it opens (speaker and text) and from the dialogue box once typed (does it fit its box?). The first
// line of each scene is photographed into captures/dialogue-edit/ (small JPEGs). Mechanical: it shows which lines play
// in which state and that they fit; it cannot say how they read. Run: GAME_URL=… node tests/dialogue-scenes.mjs [ch3]
// (no argument: chapter 1's scenes on Citadel; ch3: Baldino on Zeelich, in a browser of its own)
import { launch, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const OUT = fileURLToPath(new URL('../captures/dialogue-edit/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 300000 });
await page.click('[data-act="new"]', { timeout: 120000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  // every line said: [speaker name key, text]; and whether the box held it once fully shown
  window.__said = []; window.__over = [];
  const say0 = G.say.bind(G);
  G.say = (name, lines, ...rest) => { for (const l of [].concat(lines)) window.__said.push([name, String(l)]); return say0(name, lines, ...rest); };
  const fits = () => {
    const el = document.querySelector('#dialog .text'); if (!el || !el.offsetParent) return;
    const r = el.parentElement.getBoundingClientRect();
    if (el.scrollHeight > el.clientHeight + 2 || r.bottom > innerHeight + 1 || r.top < -1) window.__over.push(el.textContent.slice(0, 80));
  };
  window.T = {
    talkAll(max = 160) { for (let i = 0; i < max && G.state !== 'play'; i++) { if (G.state === 'dialog') G.input.taps.add('KeyE'); G.step(0.05); fits(); } G.step(0.5); },
    tp(x, z, a = 0) { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; G.camRig.lba.init = false; G.step(0.1); },
    npc(id) { return G.npcs.find((n) => n.def.id === id); },
    near(id, d = 1.5) { const n = T.npc(id), h = G.hero, a = n.angle; h.pos.set(n.pos.x + Math.sin(a) * d, n.pos.y, n.pos.z + Math.cos(a) * d); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.05); },
    // start a conversation and stop on its first line (fully typed), for the picture
    open(id) { window.__said = []; for (let k = 0; k < 4 && G.state !== 'dialog'; k++) { T.near(id); G.step(0.3); T.near(id); G.input.taps.add('KeyE'); G.step(0.05); G.step(0.05); }
      // (the box types on the game's clock, which the test drives: let the line finish typing; auto-advance is off under test)
      for (let i = 0; i < 70 && G.state === 'dialog'; i++) G.step(0.05);
      return G.state; },
    // move the conversation on until its line number n has opened, then let it finish typing (for the picture)
    to(n) { for (let i = 0; i < 200 && G.state === 'dialog' && window.__said.length < n + 1; i++) { G.input.taps.add('KeyE'); G.step(0.05); G.step(0.05); }
      for (let i = 0; i < 70 && G.state === 'dialog'; i++) G.step(0.05); return G.state; },
    said() { return window.__said.map(([n, t]) => `${n || 'narrator'}: ${t}`); },
  };
});
const shot = (n) => page.screenshot({ path: OUT + n, type: 'jpeg', quality: 70, timeout: 180000 });
const scene = async (label, id, want, pic, at = 0) => {
  let st = await ev((i) => T.open(i), id);
  if (at) st = await ev((n) => T.to(n), at);
    if (pic && st === 'dialog') { await ev(() => game.renderer.render()); await shot(pic); }
  const lines = await ev(() => { T.talkAll(); return T.said(); });
  console.log(`---- ${label}\n  ` + lines.join('\n  '));
  check(label, want.every((re, k) => re.test(lines[k] || '')) && lines.length === want.length, lines);
};

const only3 = process.argv[2] === 'ch3';
if (!only3) {
// ---------------------------------------------------------------- chapter 1, the house: Arthur after the ball
await ev(() => { T.talkAll(60); const G = game; G.hero.hasBall = true; Object.assign(G.flags, { pr_arTrick: true, pr_tap: true }); G.step(0.2); });
await scene('Arthur after the ball, before the kids were met: what he saw, not the sneaking trick', 'arthur', [/n_arthur: Tim and Lulu were at the well first thing/], 'D1-arthur-early.jpg');
await ev(() => { game.flags.kidsAsked = true; });
await scene('... once the kids have brushed Twinsen off: the sneaking hint', 'arthur', [/n_arthur: .*sneak up really quietly/]);
await ev(() => { game.flags.timConfessed = true; });
await scene('... once Tim has confessed: a reply to that', 'arthur', [/n_arthur: Tim told you himself\?/]);
await ev(() => { Object.assign(game.flags, { kidsAsked: false, timConfessed: false }); });

// ---------------------------------------------------------------- chapter 1, the yard: Zoé back from next door
await ev(() => { const G = game, e = G.room.exits[0]; T.tp(e.x, e.z + 1.6, Math.PI); G.step(1.6); T.tp(e.x, e.z, Math.PI); G.step(1.2); T.talkAll(); });
{ const v = await ev(() => [game.state, game.room?.id ?? 'outdoor']); check('out in the yard, in play', v[0] === 'play' && v[1] === 'outdoor', v); }
await scene("Zoé's kettle crystals, Mira not yet met: where Mira is and what the proof does", 'zoe',
  [/n_zoe: Same next door/, /n_zoe: And look at their kettle/, /n_hero: \(Tiny crystals/, /n_zoe: Mira's got the well padlocked, and she's telling everyone .* she'll have to open it/], 'D2-zoe-kettle.jpg', 3);
await ev(() => { Object.assign(game.flags, { pr_kettle: false, zoeNext: false, pr_miraNo: true }); });
await scene("... after Mira's refusal: Twinsen tells her, and she doesn't tell it back", 'zoe',
  [/n_hero: Mira won't open the well/, /n_zoe: Same next door/, /n_zoe: And look at their kettle/, /n_hero: \(Tiny crystals/, /n_zoe: Then show her these\. Pipes don't grow crystals\./], 'D3-zoe-kettle-b.jpg', 4);

// ---------------------------------------------------------------- chapter 1, the harbour: Xil (DIALOGUE-2: the rope asked for once the well is seen)
await ev(() => { Object.assign(game.flags, { pr_yardOk: true, wellSeen: true, metXil: false, pr_bell: false, pr_xilRope: false }); T.near('xil'); game.step(0.6); T.talkAll(); window.__said = []; });
await scene('Xil, the well seen: Twinsen asks for a rope and Xil names the deal', 'xil',
  [/n_xil: Greetings/, /n_xil: I asked him three times/, /n_xil: Only the bell/, /n_hero: I need a rope for the town well/, /n_xil: Rope ladders, a whole crate/], 'D5-xil-rope.jpg', 4);
await scene('... asked again: the deal is not asked twice', 'xil', [/n_xil: I asked him three times/, /n_xil: Only the bell/]);

}
if (only3) {
// ---------------------------------------------------------------- chapter 3, Zeelich: Baldino after Irsa's bench
await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); Object.assign(G.flags, { zt_v: 1, zt_bench: true, zt_bal: true }); G.step(0.3);
  const Z = G.rooms.zeelich; if (G.rooms.workshop) { T.tp(Z.workshopDoor.x, Z.workshopDoor.z + 0.01); G.step(1.5); T.talkAll(); } });
await scene("Baldino after Irsa's bench: his entrance, Twinsen's report, then his answer (one greeting)", 'baldino',
  [/n_baldino: Twinsen! Mind the/, /n_hero: Irsa's bench says/, /n_baldino: From below!/, /n_hero: Baldino, Vesk says/, /n_baldino: Look at the globe/, /n_baldino: Vesk's bore/, /n_hero: Then we stop the drill/, /n_baldino: No! Pull it out halfway/, /n_baldino: So I built an override key/, /n_baldino: The shield runs off/, /n_baldino: Zoé's waiting at the Citadel lighthouse/], 'D4-baldino.jpg', 2);

}
const over = await ev(() => window.__over);
check('every line shown fits its dialogue box', over.length === 0, over);
check('no page errors', errs.length === 0, errs.slice(0, 5));
await browser.close();
done();
