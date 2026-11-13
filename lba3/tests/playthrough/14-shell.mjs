// Chapters 11 (The Shell) and 12 (The Core) to the end: the bore's machinery (the cooling diagram, valves A and C, the ball switch for
// the ladder), the crystal galleries (three pillars: ball), Sendell, the core (the guardian, three pylons from
// their plates, the bleed valve, Vesk's overload coil), the epilogue: dinner, the end screen, Keep Exploring.
// CAMPAIGN-9 (wave 7, story/answer.js), by input: the crew's test receiver in the shaft from its plate (a bank shot); in the
// machinery the damper's answer, up the catwalk to the fitters' knocker, two knocks, her reply, on to valve C; the shutter held
// as he reaches it; the third pillar from the middle stone's plate off the survey mirror; the arch shut behind him; after the
// coil, Vesk's choice, the last act: Mill Lane's branch cock in the rest, Irsa and Vesk, the central lock after her two, two
// knocks on the main for Zoé.
export const steps = [
  ['continue', () => { P.settle();
    // (SWAIT: the thread's scenes in play — her answers, Irsa, Vesk's walk — waited out, reading what is said, as a player would)
    window.SWAIT = (max = 400, until = null) => { const G = game; let i = 0; for (; i < max && (G.story._sh?.busy || G.state === 'dialog' || G.hero.actT > 0 || G.hero.steer || G.trans || G.story._sh?.msg || (until && !until())); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } P.settle(); return i; };
    return { chapter: game.flags.chapterKey, room: game.room?.id, sh: game.flags.sh_v ?? null }; }],
  // (the crew's test receiver: stand still on the brass plate — it lines him up — and throw; up to three tries, as a player)
  ['the test receiver (a bank shot from the plate)', () => { const G = game, S = G.room?.teach; if (!S || G.flags.sh_bank) return { r: 'none or done', bank: G.flags.sh_bank ?? null };
    let n = 0; for (; n < 3 && !S.target.done; n++) { P.go(S.plate.x, S.plate.z, { tol: 0.15, maxT: 20, fight: false }); P.release(); G.step(0.8); P.tap('F1'); P.tap('KeyF', 0.05); G.step(2.0); P.settle(); }
    SWAIT(100); return { throws: n, lit: S.lit, bank: G.flags.sh_bank, fail: G.flags.sh_bank ? null : 'test receiver' }; }],
  ['down to the machinery', () => P.exitTo('c3-deep')],
  ['the cooling diagram', () => { const D = game.room; const r = P.use(D.diagram.x, D.diagram.z); return { ...r, diagram: game.flags.c3_diagram, fail: game.flags.c3_diagram ? null : 'diagram' }; }],
  ['valve A', () => { const v = game.room.valves.find((x) => x.id === 'A'); P.use(v.x, v.z); P.settle(); return { open: v.open }; }],
  ['the ball switch (ladder)', () => { const tg = game.room.ballTargets.find((x) => x.ballSwitch); return { done: P.hitTarget(tg, 3.5, { run: false, maxT: 40 }), ladder: game.flags.c3_ladder, fail: game.flags.c3_ladder ? null : 'ladder' }; }],
  // (valve C is up on the catwalk, right above the floor: up the lowered stair first, then along the catwalk)
  // (CAMPAIGN-9: from the stair's foot the damper's answer is in view: it is waited for, as a player who has seen the steam;
  //  up the lowered stair, east along the quiet end of the catwalk to the knocker, two knocks, her reply; then west to valve C)
  ['her answer, the knocker, valve C on the catwalk', () => { const G = game, f = G.flags, v = G.room.valves.find((x) => x.id === 'C'), L = G.room.ladder, K = G.room.knocker, h = G.hero;
    P.go(L.x, L.z - 0.2, { tol: 0.4 }); const w0 = f.sh_knock ? 0 : SWAIT(300, () => !!f.sh_knock);
    P.go(L.x, L.z - 5.4, { tol: 0.4 });
    let knocks = 0; for (let k = 0; k < 3 && f.sh_reply !== true && f.sh_reply !== 'past'; k++) { P.use(K.x, K.z, { near: 0.7, kind: 'sh_knock' }); P.tap('KeyE', 0.05); for (let w = 0; w < 60 && (h.steer || h.actT > 0); w++) G.step(0.05); knocks += 2; SWAIT(200, () => !G.story._sh?.msg && !G.story._sh?.busy); SWAIT(120); }
    P.use(v.x, v.z, { near: 1.0 }); P.wait(1); P.settle();
    return { waited: w0, knocks, knock: f.sh_knock ?? null, reply: f.sh_reply ?? null, hp: h.hp, open: v.open, y: +h.pos.y.toFixed(2), cooled: f.c3_cooled, fail: f.c3_cooled ? null : 'cooling' }; }],
  // (CAMPAIGN-9: the shutter starts down as he reaches it and her crystal holds it: the line read, then through)
  ['the galleries (the shutter held)', () => { let r = P.exitTo('c3-gallery'); SWAIT(100); if (game.room?.id !== 'c3gallery') r = P.exitTo('c3-gallery'); return { ...r, held: game.flags.sh_held ?? null, room: game.room?.id, fail: game.room?.id === 'c3gallery' ? null : 'galleries' }; }],
  // (the crew's supply crates: a hop beside one, the heart that comes out; a player who is hurt rummages them — the bot only when
  // it has lost 3 HP or more)
  ['the supply crates (near shelf)', () => { const h = game.hero; return h.hp <= h.maxHp - 3 ? P.rummage('crates_near') : { r: 'not hurt', hp: h.hp }; }],
  // (the first two hearts face the start shelf; the third faces the far side: it is woken from the middle stone, below)
  ['two pillars (ball)', () => { const out = game.room.ballTargets.filter((x) => x.pillar != null && !x.node).map((tg) => P.hitTarget(tg, 3.5, { run: false, maxT: 40 })); SWAIT(60); return { out, fail: out.every(Boolean) ? null : 'pillars' }; }],
  // across the chasm on the raised stepping stones (flush with the shelves, 0.9 m gaps: Athletic hops from the brink);
  // fallen in, he first walks back up the rough ledges against the start cliff
  // across the chasm on the raised stepping stones (flush with the shelves, 0.9 m gaps: Athletic hops from the brink);
  // fallen in, he first walks back up the rough ledges against the start cliff. CAMPAIGN-9: on the middle stone, its brass
  // plate (standing still lines him up), a throw off the crew's survey mirror onto the third heart; its stones rise, on
  ['across the stepping stones (the third heart off the mirror)', () => {
    const G = game, h = G.hero, R = G.room, st = R.stones.sets.flat(), c0 = st[2].c, top = st[0].top, tries = [], S = R.stonePlate, f = G.flags;
    const far = () => h.pos.x > c0.x + 5 && Math.abs(h.pos.y - top) < 0.3;
    let throws = 0;
    for (let attempt = 0; attempt < 3 && !far(); attempt++) {
      const out = [];
      if (h.pos.y < top - 1) { for (let i = 1; i <= 7; i++) P.go(c0.x - 5 + 0.65, c0.z + 9.3 - (i - 1) * 0.72, { tol: 0.35, maxT: 20 }); P.go(c0.x - 6.2, c0.z + 4.6, { tol: 0.5 }); }   // up the ledges, one by one
      P.go(st[0].c.x - 1.9, st[0].c.z + 1.0, { tol: 0.4 });                                                      // the start shelf's edge
      if (Math.abs(h.pos.y - top) > 0.3) { tries.push({ shelf: false, y: +h.pos.y.toFixed(2) }); continue; }
      // (CONTROL-FEEL: each hop from the brink — Normal, short steps until 1.85 m short of the next stone's centre — then a
      // short hop; as tests/jumpreach.mjs, which crosses in one attempt)
      const brink = (x, z) => { if (h.behaviour !== 'normal') P.tap('F1'); P.face(x, z); for (let i = 0; i < 40 && Math.hypot(x - h.pos.x, z - h.pos.z) > 1.85; i++) { game.input.keys.add('ArrowUp'); game.step(1 / 30); game.input.keys.delete('ArrowUp'); game.step(1 / 30); } game.step(0.2); };
      for (const [j, s] of st.entries()) {
        if (j === 3 && !f.c3_pillar2) {   // on the middle stone: the plate, the bank shot
          for (let k = 0; k < 3 && !f.c3_pillar2 && h.pos.y > top - 1; k++) { P.go(S.x, S.z, { tol: 0.12, maxT: 3, fight: false }); P.release(); G.step(0.8); P.tap('F1'); P.tap('KeyF', 0.05); G.step(2.0); SWAIT(60); throws++; }
          out.push({ throws, lit: !!f.c3_pillar2 }); G.step(1.8);
          if (!f.c3_pillar2 || h.pos.y < top - 1) break;
        }
        let y = 0; for (let k = 0; k < 2; k++) { brink(s.c.x, s.c.z); y = P.hopTo(s.c.x, s.c.z, top, { walk: false, brake: 0.9 }); if (Math.abs(y - top) < 0.3 || h.pos.y < top - 1) break; } out.push(+y.toFixed(2)); if (h.pos.y < top - 1) break; P.go(s.c.x, s.c.z, { tol: 0.2, maxT: 3, fight: false });
      }
      if (h.pos.y > top - 1 && f.c3_pillar2) { brink(c0.x + 5 + 1.2, c0.z - 1.9); out.push(P.hopTo(c0.x + 5 + 1.2, c0.z - 1.9, top, { walk: false, brake: 0.9 })); }
      tries.push(out);
    }
    // (the bot's hops are unreliable; the crossing was made by input in an earlier run — QA.md. Under ASSIST, after three
    // failed attempts it is placed on the far shelf: logged as ISO, never counted as input; the third heart too, if missed)
    let iso = false; if (P.assist && !far()) { if (!f.c3_pillar2) { G.story.cur.lightPillar(2); SWAIT(60); P.note('ISO assist: the third pillar woken'); } h.pos.set(c0.x + 6.2, top, c0.z - 1.9); h.vel.set(0, 0); h.vy = 0; h.onGround = true; G.step(0.3); iso = true; P.note('ISO assist: placed on the far shelf of the stepping stones'); }
    SWAIT(60); return { tries, throws, third: !!f.c3_pillar2, iso, x: +h.pos.x.toFixed(1), fail: far() && f.c3_pillar2 ? null : 'stones' };
  }],
  ['the supply crates (far shelf)', () => ({ r: 'skipped (optional)', hp: game.hero.hp })],
  // (CAMPAIGN-9: the arch behind him grows shut first; then her words, which say why; the checkpoint)
  ['Sendell (the arch shut behind him)', () => { const e = game.room?.exits?.find((x) => x.to === 'c3-sendell'); if (e) P.through(e.x, e.z, { fight: false }); SWAIT(200, () => !!game.flags.c3_sendell); P.settle(); return { shut: game.flags.sh_shut ?? null, sendell: game.flags.c3_sendell, hp: game.hero.hp, fail: game.flags.c3_sendell ? null : 'sendell' }; }],
  // (the door from Sendell's chamber ends chapter 11: chapter 12's card, then Vesk's scene and the fight)
  ['the core → chapter 12', () => { P.exitTo('c3-core'); P.settle(); return { chapter: game.flags.chapterKey, fight: game.flags.c3_fight, room: game.room?.id, fail: game.flags.chapterKey === 'core' ? null : 'no chapter 12' }; }],
  // (the guardian's fight as a player plays it: stun it with the ball, then the plate's bank shot in the 2.6 s it
  // sags — P.coreFight; walking plate to plate under its bolt fans killed the bot)
  ['the pylons from their plates', () => { const G = game; P.settle(); const r = P.coreFight('pylons'); P.settle(); const n = G.story.cur.pylons(); return { ...r, pylons: n, fail: n >= 3 ? null : 'pylons' }; }],
  // (CHAPTER-BALANCE) the overload: the bore's bleed valve on the deck ring, turned while the guardian is stunned
  ['the bleed valve', () => { const G = game; P.settle(); const r = P.coreFight('bleed'); P.settle(); return { ...r, bleed: G.flags.c3_bleed, coil: !!G.room.ballTargets.find((x) => x.coil), fail: G.flags.c3_bleed ? null : 'bleed' }; }, null, { retryFrom: 'the core → chapter 12' }],
  // the coil: three ball hits while the overloaded guardian fights (input: stun it, then the coil in the window)
  ['Vesk\'s overload coil', () => { const G = game; P.settle(); const tg = G.room.ballTargets.find((x) => x.coil); const r = tg && !tg.done ? P.coreFight('coil') : null;
    // (under ASSIST, after the bot's own tries: the remaining coil hits through the story's own hit — logged ISO)
    if (P.assist && tg && !tg.done && !G.hero.dead) { for (let n = 0; n < 3 && !tg.done; n++) { G.story.cur.hitCoil(tg); P.settle(); } P.note('ISO assist: the overload coil broken'); }
    P.settle(60); return { ...r, coil: G.flags.c3_coil, turned: G.flags.c3_turned, fail: G.flags.c3_turned ? null : 'coil' }; }, null, { retryFrom: 'the core → chapter 12' }],
  // (VESK-CHOICE: the console sparks over Vesk; E takes the first choice, "Pull him clear")
  // (VESK-CHOICE: the console sparks over Vesk; E takes the first choice, "Pull him clear". CAMPAIGN-9: then the last act)
  ['Vesk\'s choice', () => { const G = game; let t = 0, choice = null, answers = null; while (!G.flags.co_go && G.state !== 'ending' && t < 120) { G.step(0.25); t += 0.25; if (G.state === 'shop' && !choice) { choice = document.querySelector('#shop h2')?.textContent || 'menu'; answers = [...document.querySelectorAll('#shop button')].map((b) => b.textContent); P.tap('KeyE', 0.2); } if (G.state === 'dialog' || G.state === 'cutscene') P.settle(); } SWAIT(100); return { choice, answers, helped: G.flags.c3_veskHelped, go: G.flags.co_go ?? null, obj: P.state().obj, fail: answers?.length !== 2 ? 'the choice is not two answers' : G.flags.co_go || !G.flags.co_v ? null : 'no last act' }; }],
  // Mill Lane's branch cock: turned as soon as he is there (a kick throws it back: then in the rest, as a player who has heard
  // it), then Irsa on the radio and Vesk at his key, waited out
  ['Mill Lane\'s branch (the cock in the rest)', () => { const G = game, f = G.flags, B = G.room.branch; if (!f.co_v) return { r: 'no thread' }; const out = [];
    for (let k = 0; k < 6 && !f.co_branch; k++) { P.use(B.x, B.z, { near: 0.8, kind: 'co_cock' }); SWAIT(100); out.push(+G.story._sh.phase().toFixed(2)); if (!f.co_branch) { for (let w = 0; w < 40 && G.story._sh.phase() < 1.8; w++) G.step(0.05); } }
    SWAIT(400, () => !!f.co_vesk); return { tries: out, branch: f.co_branch, irsa: f.co_irsa, vesk: f.co_vesk, fail: f.co_vesk ? null : 'branch' }; }],
  // the central lock's bar: lifted at once the first time (a slam teaches), then in the rest after her two
  ['the central lock (after her two)', () => { const G = game, f = G.flags, L = G.room.lock; if (!f.co_v) return { r: 'no thread' }; const out = [];
    for (let k = 0; k < 6 && !f.co_lock; k++) { if (k > 0) for (let w = 0; w < 80 && !(G.story._sh.phase() > 1.55 && G.story._sh.phase() < 2.0); w++) G.step(0.05); P.use(L.grip.x, L.grip.z, { near: 0.8, kind: 'co_lock' }); SWAIT(100); out.push(f.co_lock ? 'up' : 'slam'); }
    return { tries: out, lock: f.co_lock, fail: f.co_lock ? null : 'lock' }; }],
  // two knocks on the main: Arthur hears them, Zoé sends the signal; the shield, the guard; the chapter ends
  ['the signal to Zoé (two knocks)', () => { const G = game, f = G.flags, K = G.room.coreKnocker, h = G.hero; if (!f.co_v) return { r: 'no thread' };
    for (let k = 0; k < 3 && !f.co_signal; k++) { P.use(K.x, K.z, { near: 0.8, kind: 'co_knock' }); P.tap('KeyE', 0.05); for (let w = 0; w < 60 && (h.steer || h.actT > 0); w++) G.step(0.05); SWAIT(200, () => !G.story._sh?.msg && !G.story._sh?.busy); }
    return { signal: f.co_signal ?? null, fail: f.co_signal ? null : 'signal' }; }],
  ['the epilogue', () => { const G = game; let t = 0, choice = null, answers = null; while (G.state !== 'ending' && t < 120) { G.step(0.25); t += 0.25; if (G.state === 'shop' && !choice) { choice = document.querySelector('#shop h2')?.textContent || 'menu'; answers = [...document.querySelectorAll('#shop button')].map((b) => b.textContent); P.tap('KeyE', 0.2); } if (G.state === 'dialog' || G.state === 'cutscene') P.settle(); } return { state: G.state, choice, answers, helped: G.flags.c3_veskHelped, title: document.querySelector('#ending h1')?.textContent, fail: G.state !== 'ending' ? 'no ending' : (answers && answers.length !== 2) ? 'the choice is not two answers' : null }; }],
  ['Keep Exploring', () => { const b = [...document.querySelectorAll('#ending button')].find((x) => x.offsetParent && /explor/i.test(x.textContent)); b?.click(); game.step(0.5); P.settle(); return { state: game.state, free: game.flags.ep_free, obj: P.state().obj }; }],
];
