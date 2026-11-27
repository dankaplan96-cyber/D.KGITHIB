// P152 (the user, pilot, 27.11): "At the start of chapter 2, Twinsen by the well: characters vanish, and he talks with
// Gilbert, but Gilbert is not there." Chapter 1's last beat played by the game's own flow — down in the well with the
// nodes awake, he steps past the barrier: Sendell's scene, its lines, endPrologue, the fade, chapter 2's card, the
// morning lines — then checked:
//  - every line's speaker (an NPC) is present, shown, in Twinsen's scene and within talking distance of him;
//  - the people who stood about the well when he went down are still there for the morning (or walk off in sight:
//    none of them is hidden or moved away under the card);
//  - every present resident around the well is shown and stands on the ground (not at the origin, not under it);
//  - the game-wide guard (Game.say): no line was said with an absent speaker (game.absentTalks).
// Then the morning's chain ends and Gilbert goes about his day (he walks to the water office).
// SERVE=1 node tests/p152-well-morning.mjs
import { launch, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540, locale: process.argv[2] || 'en-US' });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]', { timeout: 120000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  window.T = {
    tap(c) { G.input.taps.add(c); G.step(1 / 60); },
    talkAll(max = 60) { for (let i = 0; i < max && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
    npc(id) { return G.npcs.find((n) => n.def.id === id); },
    // the residents around the well (outdoors), with how they stand
    around(r = 22) {
      const w = G.world.well, R = G.regions, out = {};
      for (const n of G.npcs) {
        if (!n.present) continue;
        const d = Math.hypot(n.pos.x - w.x, n.pos.z - w.z);
        if (d > r || R?.sceneOf(n.pos.x, n.pos.z) !== R?.sceneOf(w.x, w.z)) continue;
        const gy = G.physics.groundAt(n.pos.x, n.pos.z);
        out[n.def.id] = { d: +d.toFixed(1), shown: !!n.rig.root.visible, ground: Math.abs(n.pos.y - gy) < 0.6 && Math.hypot(n.pos.x, n.pos.z) > 1 };
      }
      return out;
    },
  };
  // every line said: who, and whether the speaker is there
  window.__lines = [];
  const say0 = G.say.bind(G);
  G.say = (name, lines, done, sp, color) => {
    const h = G.hero, R = G.regions;
    const rec = { name, text: String([].concat(lines)[0]).slice(0, 50), npc: !!(sp && sp !== h && sp.def) };
    if (rec.npc) Object.assign(rec, { id: sp.def.id, present: !!sp.present, shown: !!sp.rig?.root?.visible, scene: R?.sceneOf(sp.pos.x, sp.pos.z) === R?.sceneOf(h.pos.x, h.pos.z), d: +Math.hypot(sp.pos.x - h.pos.x, sp.pos.z - h.pos.z).toFixed(1) });
    window.__lines.push(rec);
    return say0(name, lines, done, sp, color);
  };
});
await ev(() => T.talkAll(60));   // (the intro)
// chapter 1 up to the cave's last chamber: the steps on the square done (their flags), the ball, the morning residents
// placed around the well by the game's own cast; then down the well by its prompt's own action (enterRoom)
const before = await ev(() => {
  const G = game, f = G.flags;
  Object.assign(f, { intro: true, opening: true, pr_tap: true, pr_yard: true, pr_lane: true, pr_kettle: true, pr_row: true, pr_miraNo: true, wellSeen: true, key: true, pr_lidStuck: true, pr_lidOpen: true, pr_bell: true, stamp: true, rope: true });
  G.hero.hasBall = true;
  G.story.refreshCast(); G.step(1);
  const w = G.world.well; const h = G.hero; h.pos.set(w.x - 2.2, G.physics.groundAt(w.x - 2.2, w.z), w.z); h.onGround = true; G.camRig.lba.init = false; G.step(2);
  const around = T.around();
  G.enterRoom('well'); f.inWell = true; G.step(1);
  return { around, room: G.room?.id };
});
is('before: Gilbert stood by the well when Twinsen went down, then in the well', before, (v) => v.room === 'well' && v.around.gilbert?.shown);
// the nodes awake (their count) and the barrier down; he walks past it into the last chamber: Sendell's scene
await ev(() => { const G = game, R = G.rooms.well; G.flags.nodes = 3; if (R.barrier?.c) R.barrier.c.enabled = false; for (const n of R.nodes || []) n.lit = true;
  const h = G.hero; h.pos.set(R.chamberX + 0.6, 0, R.vein.z); h.onGround = true; G.step(0.2); for (let i = 0; i < 80 && G.state === 'cutscene'; i++) G.step(0.1); });
const said = await ev(() => { for (let i = 0; i < 30 && !game.flags.prologueDone; i++) { T.talkAll(4); game.step(0.2); } return [game.flags.sendellHeard, game.flags.prologueDone]; });
is("Sendell's scene played and chapter 1 ended", said, (v) => v[0] === true && v[1] === true);
// the fade, chapter 2's card (held for its time), the morning's first line: stop at each line to look
const morning = await ev(() => {
  const G = game, seen = [];
  for (let i = 0; i < 400 && !(G.flags.c1_started); i++) {
    G.step(0.1);
    if (G.state === 'dialog') {
      window.__underCard ??= localStorage.getItem('lba3_save_v1');   // (the save chapter 2's card made, before its lines)
      const L = window.__lines[window.__lines.length - 1];
      if (!seen.length || seen[seen.length - 1].text !== L.text) seen.push({ ...L, around: Object.keys(T.around()).sort().join(' ') });
      G.input.taps.add('KeyE'); G.step(0.05);
    }
  }
  return { key: G.flags.chapterKey, started: !!G.flags.c1_started, room: G.room?.id ?? 'outdoor', seen };
});
console.log('MORNING', JSON.stringify(morning));
is('chapter 2 (project) started, outdoors by the well', morning, (v) => v.key === 'project' && v.started && v.room === 'outdoor');
const gl = morning.seen.find((s) => s.id === 'gilbert');
is("Gilbert's morning line: Gilbert there, shown, in Twinsen's scene, within talking distance", gl, (v) => v && v.present && v.shown && v.scene && v.d < 6);
is('every line with a person speaking: the speaker there and near (no talk with someone absent)', morning.seen.filter((s) => s.npc && !(s.present && s.shown && s.scene && s.d < 12)), (v) => v.length === 0);
const after = await ev(() => T.around());
// (the story's cast only: the residents' rounds — WORLD-LIFE's citizens — come and go about the square on their own)
const cast = await ev(() => game.story.chapters.slice(0, 2).flatMap((c) => c.npcDefs().map((d) => d.id)));
const gone = Object.keys(before.around).filter((id) => cast.includes(id) && !morning.seen[0]?.around.split(' ').includes(id));
is('the story\'s people about the well when he went down are about it at the morning\'s first line (none hidden or moved away under the card)', { before: Object.keys(before.around).filter((id) => cast.includes(id)), firstLine: morning.seen[0]?.around, gone }, (v) => v.before.includes('gilbert') && v.before.includes('mira') && v.gone.length === 0);
is('every resident about the well in the morning is shown and on the ground', after, (v) => Object.values(v).every((r) => r.shown && r.ground));
// Gilbert goes about his day once the talk is done: he walks off toward the water office (in sight, not snapped away)
const walk = await ev(() => { const G = game, ns = ['gilbert', 'mira'].map(T.npc), p0 = ns.map((n) => n.pos.clone()), mv = ns.map((n) => !!G.story.moving?.get(n)); G.step(3); const r = ns.map((n, i) => ({ moving: mv[i], walked: +n.pos.distanceTo(p0[i]).toFixed(1) }));
  for (let i = 0; i < 400 && G.story.moving?.size; i++) G.step(0.1); return [...r, ns.map((n) => G.regions.sceneOf(n.pos.x, n.pos.z))]; });
is('after the talk Gilbert and Mira walk off to the water office in sight (a walk, not a cut), then are in it', walk, (v) => v[0].moving && v[0].walked > 0.5 && v[1].moving && v[1].walked > 0.5 && v[2].every((s) => s === 'office'));
is('the game-wide guard: no line said with an absent speaker in all this', await ev(() => game.absentTalks || []), (v) => v.length === 0);
// the guard itself: a line said by someone hidden is heard as a voice off (no body named as the speaker) and noted
const guard = await ev(() => { const G = game, n = T.npc('pippa'); n.setPresent(false); G.say('n_pippa', ['(test)'], null, n); const r = [G.speaker, (G.absentTalks || []).map((a) => a.id + ':' + a.why)]; T.talkAll(4); n.setPresent(true); G.absentTalks.length = 0; return [r[0] === null, r[1]]; });
is('the guard: a hidden speaker\'s line is said with no body and noted', guard, (v) => v[0] === true && v[1].includes('pippa:hidden'));
// a save from under the card (nextChapter saves before the morning's lines): it goes on from the morning's end — an
// objective, the chapter running, Gilbert in the water office — instead of a chapter that never started
const load = await ev(() => { const G = game, raw = window.__underCard, s0 = JSON.parse(raw); localStorage.setItem('lba3_save_v1', raw); G.startContinue('lba3_save_v1'); G.step(1); const n = T.npc('gilbert');
  return { savedStarted: !!s0.flags.c1_started, key: G.flags.chapterKey, started: !!G.flags.c1_started, obj: G.story.objective().replace(/<[^>]+>/g, '').slice(0, 60), gilbert: G.regions.sceneOf(n.pos.x, n.pos.z), state: G.state }; });
is('a save from under the card loads on from the morning: an objective, Gilbert in the office', load, (v) => v.savedStarted === false && v.key === 'project' && v.started && v.obj.length > 0 && v.gilbert === 'office');
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
