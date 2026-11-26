// RELEASE-AUDIT v75, an old save (supplement): run on the v70 build with tests/lib/try.mjs and KEEP=<file>. Jumps to
// chapter 9 (the council) the way tests/chapter9.mjs does (flags of chapter 8's end, then nextChapter), walks into
// Baldino's workshop through its door (harness teleport to the step before it), talks to him (the petition form), and
// stays inside: try.mjs then quits to the title through the pause menu (the game saves) and keeps the storage.
(() => {
  const G = game; G.testFreeze = true;
  const talkAll = (max = 80) => { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
  talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 7, chapterKey: 'evacuation', c1_water: true, c1_done: true, c2_shield: true, c2_mill_north: true, c8_started: true, c8_vesk: true, c8_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); talkAll();
  const Z = G.rooms.zeelich, d = Z.workshopDoor, h = G.hero;
  const tp = (x, z) => { h.pos.set(x, G.physics.groundAt(x, z), z); h.onGround = true; h.vy = 0; G.step(0.1); };
  tp(d.x, d.z + 1.5); G.step(1.2); tp(d.x, d.z); G.step(1.2); talkAll();
  const n = G.npcs.find((x) => x.def.id === 'baldino');
  if (n) { h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); G.input.taps.add('KeyE'); G.step(0.05); talkAll(); }
  G.step(1);
  return { chapter: G.flags.chapterKey, room: G.room?.id, form: G.flags.c9_form, pos: [h.pos.x, h.pos.y, h.pos.z].map((u) => +u.toFixed(2)), obj: document.querySelector('#pause-objective')?.textContent || document.querySelector('#objective')?.textContent };
})()
