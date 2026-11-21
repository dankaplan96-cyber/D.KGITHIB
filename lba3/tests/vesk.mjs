// VESK (REVIEW-TASKS-19-11 task 3, P81 scenes 1-2): Vesk's two confrontations, played through the story's own code; the
// lines are read from what was said (the chapters' chain, by key), in order.
//   Z. Zeelich's platform (chapter 3): with Baldino on the platform, then without him (his place empty): Twinsen asks
//      about the people down by the docks, Vesk's answer and the readings, the drill's argument from whoever is there and
//      Vesk's answer to it, his escape without a line describing it, Baldino after it (by radio when he isn't there).
//   H. The core, expanded campaign (chapter 10 played: th_vesk), "Pull him clear": a save in the fight → Continue → the
//      overload (the needles, the B-7, the field), the bleed valve, the coil, the choice; save → Continue in the last act;
//      the branch in the rest, Irsa's one report, Vesk (the cut log), his key, the lock, two knocks, the guard; the
//      journal; the end card and Baldino after it.
//   L. The core, base campaign (exp_base, no chapter 10), "Leave him for the council's guards": the overload without the
//      B-7; save → Continue after his key; the lock, the guard; the journal; the end card.
// Run: GAME_URL=http://localhost:<port>/ node tests/vesk.mjs
import { launch, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
const boot = async (mode) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await page.evaluate(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await ev(async () => {
    const G = window.game; G.testFreeze = true;
    // every conversation line, by speaker and key, in the order said
    const { ChapterBase } = await import('./src/game/story/base.js');
    window.SAID = [];
    if (!ChapterBase.prototype._vk) {
      const c0 = ChapterBase.prototype.chain;
      ChapterBase.prototype._vk = true;
      ChapterBase.prototype.chain = function (lines, d, on) { return c0.call(this, lines, d, (i, id, key) => { window.SAID.push(id + ':' + key); on?.(i, id, key); }); };
    }
    window.T = {
      tap(c) { G.input.taps.add(c); G.step(1 / 60); },
      press(c) { G.input.keys.add(c); G.input.taps.add(c); G.step(1 / 60); G.input.keys.delete(c); G.step(1 / 30); },
      talkAll(max = 120) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending' && G.state !== 'shop'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0) { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z, h.pos.y + 1.5), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
      npc(id) { return G.npcs.find((n) => n.def.id === id); },
      talk(id) { const n = T.npc(id); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05); },
      // play on until cond(), reading every line out
      run(cond, max = 1200) { for (let i = 0; i < max && !cond(); i++) { if (G.state === 'dialog') G.input.taps.add('KeyE'); G.step(1 / 20); } return cond(); },
      said(from = 0) { return window.SAID.slice(from); },
      journal() { return G.story.journal().flatMap((s) => s.lines || []).map((l) => l.key); },
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
      // a handle in the core, E pressed when the knocking's clock is in [lo, hi) (tests/chapter3.mjs turnAt)
      turnAt(p, lo, hi) { const sh = G.story._sh, h = G.hero; T.talkAll(); T.tp(p.x - Math.sin(p.a) * 0.55 + Math.cos(p.a) * 0.38, p.z - Math.cos(p.a) * 0.55 - Math.sin(p.a) * 0.38, p.a); G.step(0.3);
        for (let w = 0; w < 400 && !(sh.phase() > lo && sh.phase() < hi); w++) G.step(1 / 60); T.press('KeyE'); for (let w = 0; w < 60 && (h.steer || h.actT > 0); w++) G.step(0.05);
        for (let i = 0; i < 400 && (sh.busy || G.state === 'dialog'); i++) { G.step(0.1); if (G.state === 'dialog') T.talkAll(); } T.talkAll(); },
      // a save standing in the core, written as the game writes one, for Continue
      coreSave(extra) { const s = G.snapshot(); s.room = 'c3core'; s.respawn = true; s.at = Date.now();
        s.flags = { ...s.flags, prologueDone: true, intro: true, c1_water: true, c1_done: true, chapterKey: 'core', chapter: G.story.chapters.findIndex((c) => c.key === 'core'),
          c3_started: true, c3_cooled: true, c3_sendell: true, c3_fight: true, c3_pylon0: true, c3_pylon1: true, c3_pylon2: true, sh_v: 1, co_v: 1, nw_v: 1, nw_irsa: true, ...extra };
        s.hero.hasBall = true; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); return s.flags.chapter; },
    };
  });
};

// ================================================================ Z. the platform on Zeelich
const toPlatform = (noBaldino) => ev((noBaldino) => { const G = game; T.talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
  Object.assign(G.flags, { c2_plan: true, c2_okuOK: true, c2_planBack: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_zoeStart: true, c2_broadcast: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true, c2_shield: true });
  const ch = G.story.cur;
  if (noBaldino) { const p0 = ch.place.bind(ch); ch.place = (id) => (id === 'baldino' ? null : p0(id)); }   // (his place empty: the version without him)
  G.story.applyFlags?.(); G.story.refreshCast(); G.step(0.5); T.talkAll();
  const Z = G.rooms.zeelich; T.tp(Z.platform.gate.x, Z.platform.gate.z + 2); G.step(1);
  const from = window.SAID.length; T.talk('vesk');
  T.run(() => G.flags.c2_veskDown && G.state === 'play' && !G.story.cur.ship && !G.cutscene, 2400); T.talkAll();
  return { baldino: !!T.npc('baldino')?.present, said: T.said(from), down: G.flags.c2_veskDown, obj: T.obj(), j: T.journal().includes('c2_j_vesk') };
}, noBaldino);
const ZWITH = ['vesk:c2_vesk_1', 'hero:c2_tw_vesk1', 'vesk:c2_vesk_2', 'vesk:c2_vesk_2b', 'baldino:c2_bal_vesk', 'vesk:c2_vesk_3', 'hero:c2_tw_vesk2', 'vesk:c2_vesk_4', 'baldino:c2_ship_bal2', 'baldino:c2_after_bal'];
const ZWITHOUT = ['vesk:c2_vesk_1', 'hero:c2_tw_vesk1', 'vesk:c2_vesk_2', 'vesk:c2_vesk_2b', 'hero:c2_tw_vesk_drill', 'vesk:c2_vesk_3b', 'hero:c2_tw_vesk2', 'vesk:c2_vesk_4', 'balradio:c2_ship_bal2', 'balradio:c2_after_bal_r'];
await boot('new');
is('Z1 with Baldino: the docks, his answer, the readings, Baldino\'s drill and Vesk to him, no line narrates the escape; the console next', await toPlatform(false),
  (v) => v.baldino && v.down && JSON.stringify(v.said) === JSON.stringify(ZWITH) && /console/i.test(v.obj) && v.j);
await boot('new');
is('Z2 without Baldino: Twinsen carries the drill\'s argument, Vesk answers "Baldino has said so", Baldino by radio after', await toPlatform(true),
  (v) => !v.baldino && v.down && JSON.stringify(v.said) === JSON.stringify(ZWITHOUT) && /console/i.test(v.obj));

// ================================================================ the core: from a save in the fight to the end
const fight = () => ev(() => { const G = game; for (let i = 0; i < 400 && !G.flags.c3_overload; i++) { G.step(0.1); if (G.state === 'dialog') G.input.taps.add('KeyE'); }
  const from = 0; T.run(() => G.state === 'play' && !!G.flags.c3_overload, 600); const over = T.said(from).filter((s) => /c3_vesk_over|c3_tw_over/.test(s));
  G.story.cur.openBleed(); T.run(() => G.state === 'play', 400);
  const tg = G.room.ballTargets.find((x) => x.coil); for (let n = 0; n < 3 && tg && !tg.done; n++) { G.story.cur.hitCoil(tg); for (let i = 0; i < 200 && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } }
  T.run(() => G.state === 'shop', 600);
  return { over, coil: T.said().includes('vesk:c3_vesk_coil'), menu: G.state === 'shop' ? [...document.querySelectorAll('#shop .item')].map((b) => b.textContent.trim()) : G.state }; });
const pick = (which) => ev((which) => { const G = game, from = window.SAID.length; const b = [...document.querySelectorAll('#shop .item')].find((x) => (which === 'help' ? /Pull/ : /Leave/).test(x.textContent)); b?.click(); G.step(0.1);
  T.run(() => G.state === 'play' && !!G.flags.co_go, 600); T.talkAll(); return { said: T.said(from), helped: G.flags.c3_veskHelped, go: G.flags.co_go, obj: T.obj(), j: T.journal() }; }, which);
const lane = () => ev(() => { const G = game, from = window.SAID.length; T.turnAt(G.room.branch, 1.7, 2.1); T.run(() => !!G.flags.co_vesk && G.state === 'play' && !G.story._sh.busy, 800); T.talkAll();
  return { said: T.said(from), f: [G.flags.co_branch, G.flags.co_irsa, G.flags.co_vesk, G.room.lock.turned], obj: T.obj() }; });
const finish = () => ev(() => { const G = game, from = window.SAID.length, L = G.room.lock;
  for (let k = 0; k < 4 && !G.flags.co_lock; k++) T.turnAt(L.grip, 1.4, 1.7);
  const K = G.room.coreKnocker, h = G.hero; T.tp(K.x - Math.sin(K.a) * 0.55 + Math.cos(K.a) * 0.38, K.z - Math.cos(K.a) * 0.55 - Math.sin(K.a) * 0.38, K.a); G.step(0.3);
  for (let i = 0; i < 2; i++) { for (let w = 0; w < 60 && h.actT > 0; w++) G.step(0.05); T.press('KeyE'); for (let w = 0; w < 40 && (h.steer || h.actT > 0); w++) G.step(0.05); }
  const jEnd = []; for (let i = 0; i < 600 && G.flags.chapterKey === 'core'; i++) { if (G.flags.c3_done && !jEnd.length) jEnd.push(...T.journal()); G.step(0.1); if (G.state === 'dialog') T.talkAll(); }
  const said = T.said(from);
  for (let i = 0; i < 60 && G.state !== 'ending'; i++) { G.step(0.5); if (G.state === 'dialog') T.talkAll(); }
  const card = document.querySelector('#ending p')?.textContent || '', state = G.state;
  // (after the card: Baldino, as he answers in free roam — the epilogue's own talk)
  const b = T.npc('baldino'); const f0 = window.SAID.length; if (b) { G.story.cur.talk(b); T.talkAll(); }
  return { lock: G.flags.co_lock, signal: G.flags.co_signal, said: said.filter((s) => /co_guard|co_vesk_guard|co_lock_ok/.test(s)), state, card: card.slice(175, 345), baldino: T.said(f0).filter((s) => /baldino/.test(s)), j: jEnd.filter((k) => /^(c3|co)_j_/.test(k)), key: G.flags.chapterKey }; });

// ---------------------------------------------------------------- H. expanded campaign, pulled clear
await boot('new');
await ev(() => T.coreSave({ exp: 1, th_vesk: true, th_done: true }));
await boot('continue');
const hf = await fight();
is('H1 the overload (expanded): three pylons on a lighthouse, a water office and a windmill; the needles; he knew the B-7 worked; the field; the order', hf,
  (v) => JSON.stringify(v.over) === JSON.stringify(['vesk:c3_vesk_over1', 'hero:c3_tw_over', 'vesk:c3_vesk_over_b7', 'vesk:c3_vesk_over2', 'vesk:c3_vesk_over3']) && v.coil && v.menu.length === 2);
const hp = await pick('help');
is('H2 "Pull him clear": Vesk as himself (the coolant loop), then Twinsen: not the lock yet; the journal has the overload and the pull, in order', hp,
  (v) => v.helped === true && v.go === true && JSON.stringify(v.said) === JSON.stringify(['narrator:c3_help_narr', 'vesk:c3_vesk_helped', 'hero:co_tw_lane']) && /Mill Lane/.test(v.obj)
    && v.j.indexOf('c3_j_over') > v.j.indexOf('c3_j_pylons') && v.j.indexOf('c3_j_help') === v.j.indexOf('c3_j_over') + 1 && !v.j.includes('c3_j_left'));
await ev(() => game.save(false));
await boot('continue');
is('H3 save → Continue in the last act: the choice and the step kept, the journal the same', await ev(() => { T.talkAll(); game.step(1); T.talkAll(); return [game.flags.c3_veskHelped, game.flags.co_go, game.flags.co_branch ?? null, game.room?.id, /Mill Lane/.test(T.obj()), T.journal().includes('c3_j_help')]; }),
  (v) => v[0] === true && v[1] === true && v[2] === null && v[3] === 'c3core' && v[4] && v[5]);
const hl = await lane();
is('H4 the branch in the rest: Irsa\'s one report (Kell\'s cart), Vesk owns the cut log, walks to his lock, the clue for the bar, Twinsen thanks him', hl,
  (v) => JSON.stringify(v.said) === JSON.stringify(['hero:co_tw_cock', 'zl_irsaradio:co_irsa_1', 'vesk:co_vesk_up_helped', 'vesk:co_vesk_why', 'vesk:co_vesk_key', 'hero:co_tw_key']) && v.f.every(Boolean));
const hz = await finish();
is('H5 the lock, the signal, the guard names the log and the list, "I kept the water running"; the journal in order; the end card and Baldino remember the pull', hz,
  (v) => v.lock && v.signal && JSON.stringify(v.said) === JSON.stringify(['hero:co_lock_ok', 'dp_guard:co_guard_1', 'vesk:co_vesk_guard', 'dp_guard:co_guard_2']) && v.key === 'home' && v.state === 'ending'
    && /readings every day/.test(v.card) && v.baldino.includes('baldino:ep_baldino_vesk')
    && ['c3_j_over', 'c3_j_help', 'co_j_lane', 'co_j_vesk_helped', 'co_j_signal', 'co_j_end'].every((k, i, a) => v.j.includes(k) && (i === 0 || v.j.indexOf(a[i - 1]) < v.j.indexOf(k))) && !v.j.includes('co_j_vesk'));

// ---------------------------------------------------------------- L. base campaign, left for the guards
await boot('new');
await ev(() => T.coreSave({ exp_base: 1 }));
await boot('continue');
const lf = await fight();
is('L1 the overload (base): the needles read, no B-7; the field; the order', lf,
  (v) => JSON.stringify(v.over) === JSON.stringify(['vesk:c3_vesk_over1', 'hero:c3_tw_over', 'vesk:c3_vesk_over_read', 'vesk:c3_vesk_over2', 'vesk:c3_vesk_over3']) && v.menu.length === 2);
const lp = await pick('leave');
is('L2 "Leave him for the council\'s guards": his bitter line, then not the lock yet; the journal says he was left', lp,
  (v) => v.helped === false && v.go === true && JSON.stringify(v.said) === JSON.stringify(['vesk:c3_vesk_left', 'hero:co_tw_lane']) && v.j.includes('c3_j_left') && !v.j.includes('c3_j_help'));
const ll = await lane();
is('L3 Irsa\'s report; Vesk "I heard Irsa", no confession, the clue for the bar, no thanks', ll,
  (v) => JSON.stringify(v.said) === JSON.stringify(['hero:co_tw_cock', 'zl_irsaradio:co_irsa_1', 'vesk:co_vesk_up_left', 'vesk:co_vesk_key']) && v.f.every(Boolean));
await ev(() => game.save(false));
await boot('continue');
is('L4 save → Continue after his key: the key turned, Vesk at his lock, the bar next', await ev(() => { T.talkAll(); game.step(1); T.talkAll(); const v = T.npc('vesk'), K = game.room.lock.vesk;
  return [game.flags.c3_veskHelped, game.flags.co_vesk, game.room.lock.turned, !!v?.present && Math.hypot(v.pos.x - K.x, v.pos.z - K.z) < 0.6, /lock/i.test(T.obj())]; }), (v) => v[0] === false && v[1] === true && v[2] && v[3] && v[4]);
const lz = await finish();
is('L5 the lock, the guard, the same arrest; the journal (left, co_j_vesk); the end card without the readings; Baldino has no note from him', lz,
  (v) => v.lock && v.signal && JSON.stringify(v.said) === JSON.stringify(['hero:co_lock_ok', 'dp_guard:co_guard_1', 'vesk:co_vesk_guard', 'dp_guard:co_guard_2']) && v.state === 'ending'
    && /judgement\.\s/.test(v.card) && !/readings every day/.test(v.card) && !v.baldino.includes('baldino:ep_baldino_vesk')
    && ['c3_j_over', 'c3_j_left', 'co_j_lane', 'co_j_vesk', 'co_j_signal', 'co_j_end'].every((k) => v.j.includes(k)) && !v.j.includes('co_j_vesk_helped'));

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
