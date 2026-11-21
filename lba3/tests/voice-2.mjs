// VOICE-2 (docs/lba-maturity/VOICE-2.md): the Expressive voices in the running game, the brief's point 10. Mechanical
// checks only: nothing here says how a voice sounds; that is the user's to judge.
//   1. a quiet conversation at home (Zoé, Twinsen, Arthur in the house) and dialogue outdoors (Gilbert in the square)
//   2. a tense exchange (Vesk, Zoé, Twinsen at the station, chapter 1): the metadata's intentions, one voice at a time
//   3. rapid skipping: E pressed every other frame through a long dialogue never stacks voices or clicks
//   4. the same NPC talked to again and again: never the same performance twice running, one start per line
//   5. pause and resume in a cinematic: the line stops under the pause, the next subtitle speaks after it
//   6. a scene change in the middle of a line: no voice stacked, the close leaves nothing
//   7. the cost: the frame a line starts on, in Citadel with its people about
import { launch, open, menu, checker, URL0 } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
await open(page, '?nocine');
await page.evaluate(() => localStorage.clear());
await menu(page, 'new');
const R = await page.evaluate(async () => {
  const G = window.game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  await G.audio.ctx?.resume?.();
  const A = G.audio, B = A.babble, out = { mode: G.settings.voiceMode };
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const an = A.ctx.createAnalyser(); an.fftSize = 1024; A.voiceBus.connect(an);
  const buf = new Float32Array(an.fftSize);
  const level = () => { an.getFloatTimeDomainData(buf); let p = 0; for (const x of buf) p = Math.max(p, Math.abs(x)); return p; };
  const npc = (id) => G.npcs.find((n) => n.def?.id === id);
  // a whole dialogue box played as the player would: each line typed, heard, read, then E; returns what was heard
  const talk = async (key, lines, who, { readMs = 900, frames = 45 } = {}) => {
    const p0 = B.played.length, l0 = B.lines;
    let speak = 0, mouth = 0, active = 0;
    G.say(key, lines, null, who);
    for (let k = 0; k < lines.length; k++) {
      for (let i = 0; i < frames; i++) { G.step(1 / 30); await wait(33); speak = Math.max(speak, level()); mouth = Math.max(mouth, B.mouth().o); active = Math.max(active, B.active); }
      await wait(readMs - frames * 33 > 0 ? readMs - frames * 33 : 0);
      G.input.taps.add('KeyE'); G.step(0.02);   // (the next line, or the box closes)
    }
    await wait(250);
    return { played: B.played.slice(p0), lines: B.lines - l0, speak, mouth, active, state: G.state, live: B.live };
  };
  await B.prepare(['n_zoe', 'n_hero', 'n_arthur', 'n_gilbert', 'n_vesk'], { wait: true });
  // 1. at home, then outdoors
  out.home = [];
  out.home.push(await talk('n_zoe', ['Dry again. But listen. Something is still knocking in there.'], npc('zoe')));
  out.home.push(await talk('n_hero', ['I\'ll check the well.'], G.hero));
  out.home.push(await talk('n_arthur', ['I put my cup under the pipe, Dad. For when it comes back.'], npc('arthur')));
  G.exitRoom({ x: -12, z: 8, a: 0 }, true, true); G.step(0.1); await wait(300);
  out.outdoorRoom = G.room?.id ?? 'world';
  out.outdoor = await talk('n_gilbert', ['A ferry that runs on light! In my day we rowed, and even that was showing off.'], npc('gilbert'));
  // 2. the tense exchange (chapter 1's confrontation, the game's own lines, each speaker their own box)
  const T = [['n_zoe', 'Vesk! "Ship capacity: 30%"? What about everyone else?'], ['n_vesk', 'Ah. Zoé, isn\'t it? You weren\'t meant to read that. Still, perhaps it\'s better this way.'],
    ['n_hero', 'You don\'t get to decide who lives. Stop the bore.'], ['n_vesk', 'Stopping now would be more dangerous than carrying on. Goodbye, Twinsen. I hope one day you understand.']];
  out.tense = [];
  for (const [k, s] of T) out.tense.push(await talk(k, [s], null, { readMs: 1500, frames: 50 }));
  // 3. rapid skipping: a ten-line box, E every other frame
  {
    const lines = Array.from({ length: 10 }, (_, i) => ['Delivery forms.', 'And a very old sandwich.', 'Bore blueprints. I can\'t read them, but Twinsen will.', 'Here: "Evacuation plan."', 'That\'s all?'][i % 5]);
    let active = 0, peak = 0, maxLive = 0;
    G.say('n_zoe', lines, null, npc('zoe'));
    for (let i = 0; i < 60 && G.state === 'dialog'; i++) { G.step(1 / 30); if (i % 2) { G.input.taps.add('KeyE'); G.step(0.01); } await wait(20); active = Math.max(active, B.active); peak = Math.max(peak, level()); maxLive = Math.max(maxLive, B.live); }
    await wait(350);
    out.rapid = { active, peak, maxLive, state: G.state, liveAfter: B.live, after: level() };
  }
  // 4. the same NPC, again and again (the same line, five times)
  out.repeat = [];
  for (let i = 0; i < 5; i++) out.repeat.push((await talk('n_gilbert', ['Water! Steaming hot. You could boil an egg in it. Better than nothing.'], npc('gilbert'), { readMs: 400, frames: 40 })).played.join());
  // 5. pause and resume in a cinematic
  {
    const { Cinematic } = await import('./src/engine/cinematic.js');
    const c = new Cinematic(G, { length: 8, subs: [{ t: 0.3, d: 3.2, who: 'Zoé', text: 'Doran is getting the ship ready at the spaceport. Be careful up there, Twinsen.', voice: 'n_zoe' }, { t: 4.2, d: 2.4, who: 'Twinsen', text: 'I fixed that yesterday.', voice: 'n_hero' }], shots: [], finish() {} });
    await c.start();
    let during = 0; for (let i = 0; i < 30; i++) { G.step(1 / 30); await wait(33); during = Math.max(during, level()); }
    G.pause();
    await wait(400);
    let under = 0; for (let i = 0; i < 6; i++) { under = Math.max(under, level()); await wait(30); }
    const pausedState = G.state, liveUnder = B.live;
    // resume (the pause menu's Resume)
    G.hideScreens?.(); G.setState('cinematic'); c.resume();
    await wait(300);
    const l0 = B.lines; let after = 0;
    for (let i = 0; i < 120 && c.state === 'run'; i++) { G.step(1 / 30); await wait(33); if (c.t > 4.3) after = Math.max(after, level()); }
    out.pause = { during, under, liveUnder, pausedState, after, linesAfter: B.lines - l0, voiced: c.voiced };
    if (c.state !== 'done') c.complete(true);
    await wait(300); G.step(0.1);
  }
  // 6. a scene change in the middle of a line
  {
    for (let i = 0; i < 40 && G.state !== 'play'; i++) { G.step(0.05); await wait(10); }
    G.say('n_zoe', ['Doran is getting the ship ready at the spaceport. Be careful up there, Twinsen. And come back.'], null, null);
    for (let i = 0; i < 10; i++) { G.step(1 / 30); await wait(33); }
    G.enterRoom('house', null, true, true);
    let active = 0; for (let i = 0; i < 30; i++) { G.step(1 / 30); await wait(33); active = Math.max(active, B.active); }
    G.input.taps.add('KeyE'); G.step(0.02); G.input.taps.add('KeyE'); G.step(0.02);
    await wait(350);
    out.scene = { active, state: G.state, live: B.live, after: level() };
  }
  // 7. the cost of the frame a line starts on, in Citadel
  {
    G.exitRoom({ x: -12, z: 8, a: 0 }, true, true); G.step(0.1); await wait(300);
    const ms = [];
    for (const s of ['A ferry that runs on light! In my day we rowed, and even that was showing off.', 'Water! Steaming hot.', 'Valves? That pipeline was FunFrock\'s. If it still works, it\'s the only good thing he ever left us.']) {
      G.say('n_gilbert', [s], null, npc('gilbert'));
      const t0 = performance.now(); B.chars(s, 0, 1); ms.push(+(performance.now() - t0).toFixed(2));
      for (let i = 0; i < 20; i++) { G.step(1 / 30); await wait(20); }
      G.input.taps.add('KeyE'); G.step(0.02); G.input.taps.add('KeyE'); G.step(0.02); await wait(100);
    }
    out.cost = { lineStartMs: ms, npcs: G.npcs.filter((n) => n.present).length };
  }
  A.voiceBus.disconnect(an);
  return out;
});
check('the game starts with the Expressive voices (the default)', R.mode === 'expressive', R.mode);
const okLine = (x, who) => x.lines === 1 && x.played.length >= 1 && x.played.every((p) => p.startsWith(`x:${who}:`)) && x.speak > 0.01 && x.mouth > 0.3 && x.active === 1 && x.live === 0;
check('a quiet conversation at home: Zoé, Twinsen and Arthur each heard from their own Expressive bank, mouths moving, nothing left after each box', okLine(R.home[0], 'zoe') && okLine(R.home[1], 'hero') && okLine(R.home[2], 'arthur'), R.home);
check('dialogue outdoors (Citadel): Gilbert heard from his bank, his mouth moving, nothing left after', okLine(R.outdoor, 'gilbert'), { room: R.outdoorRoom, ...R.outdoor });
const ti = R.tense.map((x) => x.played.map((p) => p.split(':')[2].split('.')[0]));
check('a tense exchange: one voice at a time, each from its own bank; the metadata\'s intentions heard (Zoé urgent, Twinsen annoyed then urgent, Vesk annoyed at the end)', R.tense.every((x) => x.active === 1 && x.live === 0) && ti[0].includes('excl') && ti[2].join() === 'no,excl' && ti[3][0] === 'no', { intents: ti, tense: R.tense.map((x) => ({ active: x.active, live: x.live })) });
check('rapid skipping: E every other frame through ten lines never stacks voices nor clips; the box closes into silence', R.rapid.active <= 1 && R.rapid.peak < 0.9 && R.rapid.liveAfter === 0 && R.rapid.after < 0.001, R.rapid);
check('the same NPC again and again: the same line five times is never the same performance twice running', R.repeat.every((x, i) => i === 0 || x !== R.repeat[i - 1]) && new Set(R.repeat).size >= 2, R.repeat);
check('pause in a cinematic: the line is heard, then silent under the pause (nothing alive); after resuming, the next subtitle speaks', R.pause.during > 0.01 && R.pause.under < 0.001 && R.pause.liveUnder === 0 && R.pause.pausedState === 'pause' && R.pause.after > 0.01 && R.pause.linesAfter >= 1, R.pause);
check('a scene change in the middle of a line: never two voices, and closing the box leaves nothing', R.scene.active <= 1 && R.scene.live === 0 && R.scene.after < 0.001, R.scene);
check('the frame a line starts on does no synthesis: planning and scheduling under 8 ms each (Citadel, its people about)', R.cost.lineStartMs.every((x) => x < 8), R.cost);
await browser.close();
done();
