// #13 THE ENDING FILM (src/game/story/ending.js, docs/lba-maturity/ENDING-13.md): after the epilogue's dinner, before the
// end card. A LOGIC test on the tests' fixed stepping (no pictures: the ending is not shown to the user):
//   1. the epilogue from its start (the chapters before set by flags, as tests/epilogue-home.mjs): the dinner's lines, then
//      the film; 45–60 s long; every shot boundary passed in order, the scene changes (house → Citadel → house), every
//      line a subtitle in its speaker's voice, the two captions; frame by frame: the family on the floor, the town's speakers
//      present, the hero hidden only outside, nothing left on screen after it
//   2. played out: the end card (state 'ending', its text), the film's set piece and loops gone, the camera's up the world's,
//      the family at the table; Keep Exploring: free play, Zoé and Arthur back at their places, the objective
//   3. skipped (held E) at every shot boundary and at mid-action points: the same end state as played out (the same
//      flags, room, positions, camera, screens); a held E does not press the end card's buttons
//   4. pause and focus loss stop its clock and resume it; replay: a second film leaves no second ceiling, no loop
//   5. ?nocine (developers, the other tests): straight to the end card, as before
//   6. Save after Keep Exploring, relaunch, Continue: free play, the film does not play again
// SERVE=1 answers this checkout's files by request routing (no http.server).
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };

const helpers = () => ev(() => {
  const G = window.game; G.testFreeze = true;
  window.T = {
    talkAll(max = 120) { for (let i = 0; i < max && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.05); },
    flags: { prologueDone: true, intro: true, chapter: 11, chapterKey: 'core',
      c1_started: true, c1_done: true, c1_water: true, c1_radio: true, c1_veskGone: true, c1_plan: true, c2_shield: true, c2_veskDown: true,
      c4_pump: true, c4_notebook: true, c4_carving: true, c5_planned: true, c5_vent: true, c5_glider: true,
      c6_trip1: true, c6_trip2: true, c6_up: true, c7_vent: true,
      c8_home: true, c8_gilbert: true, c8_pippa: true, c8_farmer1: true, c8_farmer2: true, c8_farmer3: true, c8_zoeDone: true, c8_vesk: true,
      c9_heard: true, c9_dallan: true, c9_vote: true,
      c10_started: true, c10_okuAsk: true, c10_miraAsk: true, c10_pim: true, c10_mill: true, c10_valves: true, c10_light: true, c10_bore: true, c10_dome: true, c10_done: true,
      c3_turned: true, c3_done: true, c3_veskHelped: true },
    // the state a played or skipped film leaves (compared between the two)
    snap() {
      const r = (v) => Math.round(v * 100) / 100, p = (a) => a && [r(a.pos.x), r(a.pos.z)];
      const c = G.camera, n = (id) => G.npcs.find((x) => x.def.id === id);
      const f = { ...G.flags }; delete f.playTime;
      return { state: G.state, screen: G.screen, room: G.room?.id ?? 'citadel', cine: !!G.cine, camCine: !!G.camRig.cine, hero: p(G.hero), heroVis: G.hero.rig.root.visible,
        zoe: p(n('zoe')), arthur: p(n('arthur')), ctl: [!!n('zoe')?.controlled, !!n('arthur')?.controlled], cam: [r(c.position.x), r(c.position.y), r(c.position.z)], up: [c.up.x, c.up.y, c.up.z],
        flags: JSON.stringify(Object.keys(f).sort().map((k) => [k, f[k]])), ceiling: G.scene.getObjectByName('endingCeiling') ? 1 : 0,
        sub: document.querySelector('#cine-sub')?.classList.contains('show') ?? false, cap: document.querySelector('#cine-cap')?.style.opacity ?? '', cineUI: !document.querySelector('#cine')?.classList.contains('hidden'),
        fade: document.querySelector('#fade').classList.contains('on'), card: document.querySelector('#ending p')?.textContent.slice(0, 40) || '' };
    },
  };
});

// ---------------------------------------------------------------- 1–2: played out
await open(page, '');   // (no ?nocine: the films play)
await menu(page, 'new');
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
await ev(() => game.cine.skip());   // (the opening)
await page.waitForFunction(() => !game.cine && game.state === 'play', null, { timeout: 120000 });
await helpers();
await ev(() => { const G = game; G.step(0.5); T.talkAll(); Object.assign(G.flags, T.flags); G.hero.hasBall = true; G.story.nextChapter();
  window.__said = []; for (let i = 0; i < 60 && !G.cine; i++) { if (G.state === 'dialog') { __said.push(document.querySelector('#dialog-text')?.textContent?.slice(0, 30)); T.talkAll(1); } else G.step(0.1); }
  window.__t0 = performance.now(); });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
const prepMs = await ev(() => Math.round(performance.now() - window.__t0));
const play = await ev(() => {
  const G = game, c = G.cine, E = c.ending, S = E.shots, out = { len: +c.def.length.toFixed(2), shots: S.map((x) => +x.toFixed(2)), passed: [], rooms: [], floor: 0, floorBad: [], heroHiddenIn: 0, speakers: [], subs: c.def.subs.map((s) => [s.who, s.voice, s.text.slice(0, 22)]), caps: [], frames: 0, dinner: window.__said.length };
  const cast = [E.cast.tw, E.cast.zo, E.cast.ar];
  let lastRoom = null, k = 1;
  while (G.cine === c && c.state === 'run' && out.frames < 4000) {
    G.step(1 / 30, 1 / 30); out.frames++;
    if (c.state !== 'run') break;
    while (k < S.length - 1 && c.t >= S[k]) { out.passed.push(+S[k].toFixed(2)); k++; }
    const room = G.room?.id ?? 'citadel';
    if (room !== lastRoom) { out.rooms.push([+c.t.toFixed(1), room]); lastRoom = room; }
    if (room === 'house') {
      for (const a of cast) { const gy = G.physics.groundAt(a.pos.x, a.pos.z, a.pos.y + 0.3); out.floor++; if (Math.abs(a.pos.y - gy) > 0.03 && out.floorBad.length < 5) out.floorBad.push([a.name || a.def?.id, +c.t.toFixed(1), +(a.pos.y - gy).toFixed(3)]); }
      if (!G.hero.rig.root.visible) out.heroHiddenIn++;
    }
    const sub = document.querySelector('#cine-sub.show b')?.textContent;
    if (sub && !out.speakers.includes(sub)) out.speakers.push(sub);
    const cap = document.querySelector('#cine-cap');
    if (cap && cap.style.opacity === '1' && !out.caps.includes(cap.textContent.slice(0, 16))) out.caps.push(cap.textContent.slice(0, 16));
  }
  out.endT = +c.t.toFixed(2); out.gone = G.cine !== c;
  out.cue = G.audio.music?.cueSpec?.track ?? null;
  return out;
});
is('the dinner first (its seven lines), then the film starts from it', { dinner: play.dinner, prepMs }, (v) => v.dinner >= 6);
is('the film is 45–60 s long and passes every shot boundary in order', play, (v) => v.len >= 45 && v.len <= 60 && v.passed.length === v.shots.length - 2 && v.passed.every((x, i, a) => !i || x > a[i - 1]));
is('it goes house → Citadel → house (the square, the harbour, the bore, the headland outside)', play.rooms, (v) => v.length === 3 && v[0][1] === 'house' && v[1][1] === 'citadel' && v[2][1] === 'house');
is('every line is a subtitle in its speaker\'s voice: Twinsen, Arthur, Zoé, Gilbert, Doran; both captions shown', { speakers: play.speakers, subs: play.subs, caps: play.caps }, (v) => ['Twinsen', 'Arthur', 'Zoé', 'Gilbert', 'Doran'].every((n) => v.speakers.includes(n)) && v.subs.every((s) => /^n_/.test(s[1])) && v.caps.length === 2);
is('in the house the family stands on the floor every frame, and Twinsen is never hidden there', { floor: play.floor, bad: play.floorBad, hidden: play.heroHiddenIn }, (v) => v.floor > 300 && !v.bad.length && v.hidden === 0);
await page.waitForFunction(() => !game.cine, null, { timeout: 60000 });
await ev(() => game.step(0.2));
const played = await ev(() => T.snap());
is('played out: the end card (state ending, its text), the film\'s ceiling, subtitles, captions and fade gone, the camera upright, the family free again', played, (v) => v.state === 'ending' && v.screen === 'ending' && !v.cine && !v.camCine && v.room === 'house' && v.heroVis && v.ceiling === 0 && !v.sub && v.cap !== '1' && !v.cineUI && !v.fade && v.up.join() === '0,1,0' && !v.ctl[0] && !v.ctl[1] && /bore/i.test(v.card));
is('the music: the ending piece (homecoming) carries on under the card (where the browser gave audio)', await ev(() => ({ ctx: !!game.audio.ctx, voices: game.audio.music?.voices?.filter((x) => !x.stopping).map((x) => x.name) ?? [] })), (v) => !v.ctx || v.voices.includes('homecoming'));
// a held E over the card's grace does not press its buttons (held input from the film)
const held = await ev(() => { const G = game; G.input.keys?.add?.('KeyE'); for (let i = 0; i < 25; i++) { G.input.taps.add('KeyE'); G.step(1 / 30); } G.input.keys?.delete?.('KeyE'); return { state: G.state, screen: G.screen }; });
is('E pressed through the card\'s first moments leaves the card up (no button pressed by the film\'s skip key)', held, (v) => v.state === 'ending' && v.screen === 'ending');

// ---------------------------------------------------------------- 3: skipped at every shot boundary and mid-action
const skipAt = async (T) => {
  await ev(() => { const G = game; G.hideScreens?.(); G.setState('play'); G.story.cur.film(() => G.story.cur.showEnd()); });
  await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
  const at = await ev((T) => { const G = game, c = G.cine; while (c.t < T - 1e-6 && c.state === 'run') G.step(Math.min(1 / 30, T - c.t + 1e-4), 1 / 30);
    const t0 = c.t; c.pointerHold = true; for (let i = 0; i < 40 && c.state === 'run'; i++) G.step(1 / 30, 1 / 30); c.pointerHold = false; return { t: +t0.toFixed(2), state: c.state }; }, T);
  await page.waitForFunction(() => !game.cine, null, { timeout: 60000 });
  await ev(() => game.step(0.2));
  return { ...at, snap: await ev(() => T.snap()) };
};
const S = play.shots;
const points = [...S.slice(0, -1).map((x) => x + 0.02), 3.0, 12.4, 22.0, 30.5, 39.0, 46.9, 51.6, 55.9];
const diffs = [];
for (const T of points) {
  const r = await skipAt(T);
  const d = Object.keys(played).filter((k) => JSON.stringify(played[k]) !== JSON.stringify(r.snap[k]));
  diffs.push({ at: r.t, ok: r.state === 'done', diff: d.map((k) => [k, played[k], r.snap[k]]) });
}
is(`skipped at ${points.length} points (every shot boundary, and mid-line in each shot): the same end state as played out`, diffs.filter((x) => !x.ok || x.diff.length), (v) => v.length === 0);

// ---------------------------------------------------------------- 4: pause, focus loss, replay
await ev(() => { const G = game; G.hideScreens?.(); G.setState('play'); G.story.cur.film(() => G.story.cur.showEnd()); });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
const pause = await ev(() => {
  const G = game, c = G.cine; G.step(2.0, 1 / 30);
  const t0 = c.t; G.pause(); G.step(1.5, 1 / 30); const t1 = c.t, st = G.state;
  G.act('resume'); G.step(1.0, 1 / 30); const t2 = c.t;
  window.dispatchEvent(new Event('blur')); G.step(1.0, 1 / 30); const t3 = c.t, st2 = G.state;
  G.act('resume'); G.step(0.5, 1 / 30);
  return { t0: +t0.toFixed(2), paused: +(t1 - t0).toFixed(2), st, resumed: +(t2 - t1).toFixed(2), blurred: +(t3 - t2).toFixed(2), st2, ceilings: G.scene.children.length >= 0 && (() => { let n = 0; G.scene.traverse((o) => { if (o.name === 'endingCeiling') n++; }); return n; })() };
});
is('pause and focus loss stop the film\'s clock; resume goes on; one ceiling on a replayed film', pause, (v) => v.paused === 0 && v.st === 'pause' && v.resumed > 0.9 && v.blurred === 0 && v.st2 === 'pause' && v.ceilings === 1);
await ev(() => game.cine?.skip());
await page.waitForFunction(() => !game.cine, null, { timeout: 60000 });

// Keep Exploring: free play, Zoé and Arthur back at their places
const free = await ev(() => {
  const G = game; G.step(1.5);
  const b = [...document.querySelectorAll('#ending button')].find((x) => x.offsetParent && /explor/i.test(x.textContent)); b?.click(); G.step(0.5);
  T.talkAll();   // (EQUIP-2a: home in the house, Arthur calls out once about his present: heard out, as tests/epilogue-home.mjs)
  const H = G.rooms.house.npcSpots, n = (id) => G.npcs.find((x) => x.def.id === id), d = (id) => +Math.hypot(n(id).pos.x - H[id].x, n(id).pos.z - H[id].z).toFixed(2);
  return { state: G.state, free: G.flags.ep_free, zoe: d('zoe'), arthur: d('arthur'), obj: document.querySelector('#pause-objective')?.textContent || G.story.objective().replace(/<[^>]+>/g, ''), hud: !document.querySelector('#hud')?.classList.contains('hidden') };
});
is('Keep Exploring: free play, Zoé and Arthur back at their epilogue places, the objective sends him round everyone', free, (v) => v.state === 'play' && v.free === true && v.zoe < 0.6 && v.arthur < 0.6 && /everyone/i.test(v.obj));

// ---------------------------------------------------------------- 6: save, relaunch, Continue
await ev(() => game.save(false));
await open(page, '');
await page.click('#btn-continue', { timeout: 180000 });
await helpers();
const back = await ev(() => { const G = game; let film = false; for (let i = 0; i < 60; i++) { G.step(0.1); if (G.cine) film = true; if (G.state === 'dialog') T.talkAll(); } return { state: G.state, ck: G.flags.chapterKey, free: G.flags.ep_free, film }; });
is('save after the handoff, relaunch, Continue: free play in the epilogue, the film does not come back', back, (v) => v.state === 'play' && v.ck === 'home' && v.free === true && !v.film);

// ---------------------------------------------------------------- 5: ?nocine
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
const nocine = await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, T.flags); G.hero.hasBall = true; G.story.nextChapter(); let film = false;
  for (let i = 0; i < 40 && G.state !== 'ending'; i++) { G.step(0.25); if (G.cine) film = true; if (G.state === 'dialog') T.talkAll(); } return { state: G.state, film }; });
is('?nocine: the dinner, then the end card at once (no film), as the other tests expect', nocine, (v) => v.state === 'ending' && !v.film);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
