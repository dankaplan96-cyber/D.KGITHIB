// U-5 "The Quiet Channel" (the user's side quest; src/game/story/quietchannel.js, src/game/quietchannel.js;
// docs/lba-maturity/U5-QUIET-CHANNEL.md). Played by input where it says INPUT (the harness's arrow keys, E and the pause
// menu: tests/lib/player.js):
//   - chapter 11: down the shaft from the collar; at the bottom the riser knocks (no dx_qc_ state yet). His call read BY
//     SIGHT from the riser's gauge (the needle's kicks, their size; the white lamp): heavy, light, light, a rest; the
//     knocks sound from the riser (the game's own sound requests, logged);
//   - noticed: Listen (E) at the riser: "one heavy, two light", the valves' rule (a big valve, a big knock);
//   - a wrong rhythm (the small valve three times, his hand on each wheel): the voice puts it right, kindly; nothing lost;
//   - the right one (big, small, small): he takes Twinsen for Tol; his second call (light, middle, heavy) on the gauge;
//   - Save & quit → Continue mid-way: back at the riser, the second call knocking, the step kept;
//   - the second call answered as it was knocked (not backwards): "Backwards, Tol"; then backwards: Matto names himself,
//     Pump Two, the shut tunnel, his brother Tolli at the station; the riser cock (his hand on it): open, the tag gone;
//   - up the lift to Citadel: the control room's door; Tolli by the speaking horn (first word); Listen at the horn: the
//     channel's message before the cooling (the line hot), then after it (cool) and with the galleries' pillars woken
//     (the rock hums): one message per story stage, none ahead of it;
//   - the epilogue by its flags: the horn carries both brothers at once; down the collar after dinner, Matto on shift
//     beside Tolli in the deep installation, both speaking;
//   - text: English, no night words, no line over three sentences;
//   - old saves from before this change (base-14: chapter 11 at the bottom of the shaft; base-15: chapter 12) load with no
//     dx_qc_ state made up: the riser knocks for a new player in chapter 11, nothing in chapter 12.
// ISO (logged): chapters by their flags; the drone set aside. SHOTS=dir writes small jpgs from the play camera (late-game
// area: for the team, not for players). SwiftShader, headless: Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`./fixtures/campaign/${n}.save.json`, import.meta.url));
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.step(0.2); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 62, timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines).map((l) => (n ? n + ': ' : '') + l)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const SHELL = { c3_started: true };
const COOLED = { ...SHELL, c3_deepSeen: true, c3_diagram: true, c3_ladder: true, c3_cooled: true, c3_valves: { A: true, C: true } };
const STONES = { ...COOLED, c3_gallerySeen: true, c3_pillar0: true, c3_pillar1: true, c3_pillar2: true };
const DONE = { ...STONES, c3_sendell: true, c3_pylon0: true, c3_pylon1: true, c3_pylon2: true, c3_bleed: true, c3_done: true, c3_veskHelped: true, ep_dinner: true, ep_free: true };

const helpers = () => ev(() => {
  window.QC = () => game.story.qc;
  window.qc = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('dx_qc_')));
  window.target = () => { const it = game.findInteractable(); return it ? { kind: it.kind, i: it.i, id: it.npc?.def?.id, label: it.label } : null; };
  window.setChapter = (key, flags, room) => {
    const G = game, f = G.flags; P.settle();
    for (const k of Object.keys(f)) if (/^c\d+_|^ep_|^sh_|^co_/.test(k)) delete f[k];
    Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, chapter: G.story.chapters.findIndex((c) => c.key === key), c1_water: true, c1_done: true, c10_mill: true, c10_valves: true, c10_light: true, c10_bore: true, c10_dome: true, c10_done: true }, flags);
    G.hero.hasBall = true; G.regions.ensure('underground', 'test');
    G.story.applyFlags(); G.step(0.2);
    if (room) G.enterRoom(room, null, true); else if (G.room) G.exitRoom({ x: 0, z: 0 }, true, true);
    P.settle(); G.story.refreshCast(); G.updateObjective(); G.step(0.3); P.settle();
  };
  window.calm = () => { for (const e of game.enemies) if (/^c3(drone|mite)/.test(e.def?.id || '')) { e.alive = false; e.present = false; if (e.mesh) e.mesh.visible = false; } };
  window.atCollar = () => { const G = game, st = G.world.station, h = G.hero, x = st.bore.x + 1.2, z = st.bore.z + 7; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.PI; h.vy = 0; P.settle(); return { x: st.bore.x + 1.0, z: st.bore.z + 3.5 }; };
  // BY SIGHT: the riser's gauge sampled every 0.02 s; the needle's peaks (time, size) and the white lamp's flashes; the
  // phrases (peaks closer than 1.5 s) read as weights by the needle's size: heavy > 0.85, middle 0.5–0.8, light 0.25–0.45
  window.readGauge = (secs) => {
    const s = [], lamp = [];
    for (let k = 0; k < secs / 0.02; k++) { game.step(0.02); const v = QC().view(); s.push([game.time, v.needle]); lamp.push(v.call); }
    const peaks = [];
    for (let i = 1; i < s.length - 1; i++) if (s[i][1] > 0.2 && s[i][1] >= s[i - 1][1] && s[i][1] > s[i + 1][1]) peaks.push([s[i][0], s[i][1]]);
    const wt = (a) => (a > 0.85 ? 3 : a > 0.5 && a < 0.8 ? 2 : a > 0.25 && a < 0.45 ? 1 : 0);
    const phrases = [];
    for (const [tt, a] of peaks) { const last = phrases[phrases.length - 1]; if (last && tt - last.t1 < 1.5) { last.w.push(wt(a)); last.t1 = tt; } else phrases.push({ t0: tt, t1: tt, w: [wt(a)] }); }
    return { phrases: phrases.map((p) => p.w.join('')), gaps: phrases.slice(1).map((p, i) => +(p.t0 - phrases[i].t1).toFixed(2)), peaks: peaks.map(([tt, a]) => [+tt.toFixed(2), +a.toFixed(2)]), lampMax: +Math.max(...lamp).toFixed(2) };
  };
  // INPUT: to the place before valve i (the walk), face its wheel, E; his hand on it ('tinker'); the knock
  window.valve = (i) => {
    const Q = QC().QR, w = Q.wheels[i], h = game.hero;
    P.go(w.x - 0.38, w.z + 0.75, { tol: 0.22, maxT: 40 }); P.face(w.x, w.z);
    const tg = target(); const n0 = QC().log?.length || 0;
    P.tap('KeyE', 0.1);
    let hand = false;
    for (let k = 0; k < 200 && (h.actT > 0 || h.steer || QC().busy) && game.state === 'play'; k++) { game.step(0.05); if (h.actAnim === 'tinker' && h.actT > 0) hand = true; }
    const knocks = (QC().log || []).slice(n0).filter((x) => !x.far).map((x) => x.w);
    return { tg, hand, knocks, count: QC().view().count, mode: QC().mode };
  };
  // an answer: three valves, then the rest that sends it; the reply read to its end
  window.answer = (seq) => {
    const out = seq.map((i) => valve(i));
    let k = 0; while (game.state === 'play' && k++ < 80) game.step(0.05);
    const st = game.state; const s = P.settle();
    return { valves: out, replyState: st, lines: s.lines, step: QC().step(), qc: qc() };
  };
});
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 900000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
};
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};

await open(page, '?nocine'); await menu(page, 'new'); await helpers(); await said();

// ---------------------------------------------------------------- chapter 11: down; the riser knocks
iso('chapter 11 by its flags (c3_started), on Citadel by the station\'s collar; the drone set aside');
const a0 = await ev(([S]) => {
  setChapter('shell', S);
  const G = game, c = atCollar();
  const down = P.use(c.x, c.z, { kind: 'c3down', near: 0.5, match: 9 });
  calm();
  const Q = QC().QR;
  return { down: down.r, room: G.room?.id, built: !!Q, qc: qc(), journal: QC().journal().length, open: Q?.state.open, tag: Q?.group.children.some((m) => m.isMesh && m.visible && m.geometry?.parameters?.width === 0.11) };
}, [SHELL]);
check('chapter 11: the collar takes him down by input; at the bottom the riser stands, its cock shut and tagged; no dx_qc_ state, nothing in the journal', a0.down === 'used' && a0.room === 'c3shaft' && a0.built && !a0.open && a0.tag && Object.keys(a0.qc).length === 0 && a0.journal === 0, a0);
const g0 = await ev(() => { P.go(QC().QR.riser.x - 2.2, QC().QR.riser.z - 2.0, { tol: 0.4 }); const r = readGauge(9.5); const far = (QC().log || []).filter((x) => x.far).length; return { ...r, far, mode: QC().mode, sfx: (game.audio.sfxRecent || []).filter((x) => /pipeKnock|clunk|hitMachine/.test(x.name)).length }; });
check('BY SIGHT: his call on the riser\'s gauge: heavy, light, light (the needle\'s kicks by size), then a rest of about three seconds; again; the white lamp flashes with his knocks', g0.phrases.length >= 2 && g0.phrases.slice(0, 2).every((p) => p === '311') && g0.gaps.every((x) => x > 2.5) && g0.lampMax > 0.3, g0);
check('BY EAR (code): each of his knocks asks for its sound at the riser (heavy pipeKnock, light hitMachine); the sounds the headless browser actually played are counted when its audio runs', g0.far >= 6, { far: g0.far, played: g0.sfx });
await shot('01-the-riser-knocks');

// ---------------------------------------------------------------- noticed: Listen
const l0 = await ev(() => { const Q = QC().QR; P.go(Q.riser.x - 0.9, Q.riser.z - 0.9, { tol: 0.3 }); P.face(Q.riser.x, Q.riser.z); const tg = target(); P.tap('KeyE', 0.1); const st = game.state; P.settle(); return { tg, st, qc: qc() }; });
const l0l = await said();
check('INPUT: Listen at the riser (E): "someone is knocking on this pipe by hand: one heavy, two light, then a rest"; the valves\' rule (snap a valve, the water hammers the pipe; big valve, big knock)', l0.tg?.kind === 'dx_qc_listen' && l0.tg.label === 'p_listen' && l0.st === 'dialog' && has(l0l, /one heavy, two light/) && has(l0l, /Big valve, big knock/) && l0.qc.dx_qc_heard === true, { l0, l0l });

// ---------------------------------------------------------------- a wrong rhythm, then the right one
const w1 = await ev(() => answer([2, 2, 2]));
const w1l = await said();
check('INPUT: a wrong rhythm (the small valve three times, his hand on the wheel each time; the prompt names the valve): three light knocks on the gauge count; the voice puts it right kindly ("one heavy, two light"); nothing lost, the step stays', w1.valves.every((v) => v.tg?.kind === 'dx_qc_valve' && v.tg.label === 'p_qc_small' && v.hand && v.knocks.join('') === '1') && w1.valves.map((v) => v.count).join('') === '123' && w1.replyState === 'dialog' && has(w1l, /That's not our knock: one heavy, two light/) && w1.step === 0 && w1.qc.dx_qc_miss === 1, { w1, w1l });
const r1 = await ev(() => answer([0, 2, 2]));
const r1l = await said();
check('INPUT: the right rhythm (big, small, small): the voice takes him for Tol; their own beat is the ground\'s, three and a rest; the next: "knock it back to me backwards"', r1.valves[0].tg?.label === 'p_qc_big' && r1.valves.map((v) => v.knocks.join('')).join('') === '311' && has(r1l, /Tol! At last/) && has(r1l, /three and a rest/) && has(r1l, /backwards/) && r1.step === 1 && !r1.qc.dx_qc_miss, { r1, r1l });
const g1 = await ev(() => readGauge(9.5));
check('BY SIGHT: his second call on the gauge: light, middle, heavy, and a rest', g1.phrases.length >= 2 && g1.phrases.slice(0, 2).every((p) => p === '123'), g1);
await shot('02-the-valves');

// ---------------------------------------------------------------- Save & quit → Continue, mid-way
const sv0 = await ev(() => ({ qc: qc(), at: [game.hero.pos.x, game.hero.pos.z] }));
await saveQuit(); await reboot();
const sv1 = await ev(() => { calm(); const r = readGauge(9.5); const Q = QC().QR; P.go(Q.riser.x - 0.9, Q.riser.z - 0.9, { tol: 0.3 }); P.face(Q.riser.x, Q.riser.z); P.tap('KeyE', 0.1); P.settle(); return { room: game.room?.id, state: game.state, qc: qc(), r, d: Math.hypot(game.hero.pos.x - Q.riser.x, game.hero.pos.z - Q.riser.z) }; });
const sv1l = await said();
check('INPUT: Save & quit → Continue mid-way: back at the bottom of the shaft, the step kept (his second call on the gauge again); Listen: "I answer it backwards"', sv1.room === 'c3shaft' && sv1.state === 'play' && sv1.qc.dx_qc_step === 1 && sv1.r.phrases[0] === '123' && has(sv1l, /backwards/), { sv0, sv1, sv1l });

const w2 = await ev(() => answer([2, 1, 0]));
const w2l = await said();
check('INPUT: the second call knocked back as it came (light, middle, heavy), not backwards: "Backwards, Tol. Last knock first."', w2.valves.map((v) => v.knocks.join('')).join('') === '123' && has(w2l, /Backwards, Tol/) && w2.step === 1 && w2.qc.dx_qc_miss === 1, { w2, w2l });
const r2 = await ev(() => answer([0, 1, 2]));
const r2l = await said();
check('INPUT: backwards (heavy, middle, light): "You\'re not Tol"; Twinsen says who he is; it is Matto, who minds Pump Two, cut off when Vesk closed the shaft; his brother Tolli up at the station; the riser cock by him', r2.valves.map((v) => v.knocks.join('')).join('') === '321' && has(r2l, /not Tol/) && has(r2l, /I'm Twinsen/) && has(r2l, /I'm Matto/) && has(r2l, /Pump Two/) && has(r2l, /brother Tolli/) && has(r2l, /riser cock/) && r2.step === 2 && r2.qc.dx_qc_wrong === 2, { r2, r2l });
const c0 = await ev(() => {
  const Q = QC().QR, h = game.hero;
  P.go(Q.cock.x - 0.42, Q.cock.z + 0.8, { tol: 0.25 }); P.face(Q.cock.x, Q.cock.z); const tg = target();
  P.tap('KeyE', 0.1); let hand = false;
  for (let k = 0; k < 200 && (h.actT > 0 || h.steer) && game.state === 'play'; k++) { game.step(0.05); if (h.actAnim === 'reach' && h.actT > 0) hand = true; }
  const st = game.state; P.settle(); for (let k = 0; k < 20; k++) game.step(0.05);
  return { tg, hand, st, qc: qc(), open: Q.state.open, journal: QC().journal().map((j) => j.key), tagGone: !Q.group.children.some((m) => m.isMesh && m.visible && m.geometry?.parameters?.width === 0.11) };
});
const c0l = await said();
check('INPUT: the riser cock opened (E, his hand on it: reach): Vesk\'s tag gone; "It\'s breathing all the way up"; the channel open; the journal tells it', c0.tg?.kind === 'dx_qc_cock' && c0.tg.label === 'p_qc_riser' && c0.hand && c0.st === 'dialog' && c0.open && c0.tagGone && c0.qc.dx_qc_open === true && has(c0l, /SHAFT CLOSED/) && has(c0l, /breathing all the way up/) && c0.journal.includes('qc_j_open'), { c0, c0l });
await shot('03-the-riser-open');

// ---------------------------------------------------------------- up to the station: Tolli and the horn
const u0 = await ev(() => {
  const G = game; const up = P.exitTo('c3-up'); P.settle();
  const door = G.story.doors().some((d) => d.room === 'control');
  const e = P.enter('control'); P.settle(); G.story.refreshCast(); G.step(0.3);
  const T = P.npc('dp_tolli'), H = QC().QH;
  const nearHorn = T?.present && H && Math.hypot(T.pos.x - H.horn.x, T.pos.z - H.horn.z) < 2.2;
  const t1 = P.talk('dp_tolli');
  const hl = P.use(H.horn.x, H.horn.z, { kind: 'dx_qc_horn', near: 0.9 });
  return { up: up.to, door, e: e.r, room: G.room?.id, nearHorn, lamp: H?.state.open, talk: t1.r, horn: hl.r, qc: qc() };
});
const u0l = await said();
check('INPUT: up the lift; the control room\'s door is offered in chapter 11 now; Tolli by the speaking horn (its lamp lit): "That\'s my brother!"', u0.room === 'control' && u0.door && u0.nearHorn && u0.lamp && u0.talk === 'talked' && has(u0l, /That's my brother/) && u0.qc.dx_qc_tol === true, { u0, u0l });
check('INPUT: Listen at the horn (stage 1, before the cooling): Matto through the pipe, the line running hot; no later message', u0.horn === 'used' && has(u0l, /running hot as soup/) && !has(u0l, /went cool|hums now/) && u0.qc.dx_qc_msgs === 'hot', u0l);
await shot('04-tolli-at-the-horn');
iso('the cooling and the pillars by their flags (their play is the chapter\'s own suite\'s)');
const u1 = await ev(([C, S]) => {
  const G = game, f = G.flags; Object.assign(f, C); G.story.applyFlags(); G.step(0.3); P.settle();
  const H = QC().QH; const h1 = P.use(H.horn.x, H.horn.z, { kind: 'dx_qc_horn', near: 0.9 }); const t1 = P.talk('dp_tolli');
  const mid = window._said.slice();
  Object.assign(f, S); G.story.applyFlags(); G.step(0.3); P.settle();
  const h2 = P.use(H.horn.x, H.horn.z, { kind: 'dx_qc_horn', near: 0.9 });
  return { h1: h1.r, t1: t1.r, h2: h2.r, mid, qc: qc(), room: G.room?.id };
}, [COOLED, STONES]);
const u1l = await said();
check('INPUT: the horn after the cooling (stage 2): "The line just went cool under my hand"; Tolli: "He\'s knocking like a happy woodpecker"', u1.h1 === 'used' && has(u1.mid, /went cool under my hand/) && has(u1.mid, /happy woodpecker/) && !has(u1.mid, /hums now/), u1.mid);
check('INPUT: the horn with the galleries\' pillars woken (stage 3): the rock out there hums; the messages heard kept (hot, cool, stones)', u1.h2 === 'used' && has(u1l, /hums now/) && /hot/.test(u1.qc.dx_qc_msgs) && /cool/.test(u1.qc.dx_qc_msgs) && /stones/.test(u1.qc.dx_qc_msgs), { u1, u1l });

// ---------------------------------------------------------------- the epilogue: the same room
iso('the epilogue by its flags (after dinner), the quest\'s dx_qc_ state kept');
const e0 = await ev(([D]) => {
  const G = game; setChapter('home', D); atCollar();
  const e = P.enter('control'); P.settle(); G.story.refreshCast(); G.step(0.3);
  const T = P.npc('dp_tolli'), H = QC().QH;
  const tolliHere = !!T?.present && Math.hypot(T.pos.x - H.horn.x, T.pos.z - H.horn.z) < 6;
  const hl = P.use(H.horn.x, H.horn.z, { kind: 'dx_qc_horn', near: 0.9 });
  return { e: e.r, room: G.room?.id, tolliHere, horn: hl.r, lamp: H.state.open, qc: qc() };
}, [DONE]);
const e0l = await said();
check('INPUT: the epilogue, the control room\'s horn: both brothers at once, Matto and Tolli ("We\'re in the same room, Tol"); Tolli is not up here any more', e0.room === 'control' && e0.horn === 'used' && e0.lamp && !e0.tolliHere && has(e0l, /^n_qc_mattoradio: .*downstairs/) && has(e0l, /^n_dp_tolliradio: /) && has(e0l, /same room, Tol/), { e0, e0l });
const e1 = await ev(() => {
  const G = game; P.exitTo('outdoor-control'); P.settle();
  const c = atCollar(); const down = P.use(c.x, c.z, { kind: 'dp_down', near: 0.5, match: 9 }); P.settle();
  const deep = P.exitTo('c3-deep'); P.settle(); G.story.refreshCast(); G.step(0.5);
  const M = P.npc('qc_matto'), T = P.npc('dp_tolli'), R = G.room;
  const inRoom = (n) => !!n?.present && Math.hypot(n.pos.x - R.center.x, n.pos.z - R.center.z) < 14;
  const both = inRoom(M) && inRoom(T);
  const t = P.talk('qc_matto');
  const t2 = P.talk('qc_matto');
  return { down: down.r, room: R?.id, both, talk: t.r, speakers: t.speakers, t2: t2.r, qc: qc(), journal: QC().journal().map((j) => j.key) };
});
const e1l = await said();
check('INPUT: down the collar after dinner, the deep installation: Matto on shift in the same room as Tolli; talked to, both speak ("A door, a tunnel, and my brother at the end of it"; Tolli: "He knocked on the wall"); later, a word of his own', e1.room === 'c3deep' && e1.both && e1.talk === 'talked' && e1.speakers.includes('qc_matto') && e1.speakers.includes('dp_tolli') && has(e1l, /my brother at the end of it/) && has(e1l, /^n_dp_tolli: He knocked on the wall/) && e1.t2 === 'talked' && e1.qc.dx_qc_home === true && e1.journal.includes('qc_j_home'), { e1, e1l });
await shot('05-epilogue-the-brothers');

// text: English, short, no night words in any new line
const tx = await ev(async () => { const { STR } = await import('/src/game/i18n.js'); const keys = Object.keys(STR.en).filter((k) => /^(qc_|n_qc_|p_qc_)/.test(k) || k === 'n_dp_tolliradio'); const all = keys.flatMap((k) => [].concat(STR.en[k])); return { n: keys.length, bad: all.filter((s) => /\b(night|evening|tonight|sunset|dawn|dusk|morning)\b/i.test(s)), long: all.filter((s) => s.split(/(?<=[.!?])\s+/).length > 3), nonEnglish: all.filter((s) => /[֐-׿]/.test(s)) }; });
check('the quest\'s text: English; no night, evening, tonight, sunset, dawn, dusk or morning; no line of more than three sentences', tx.n > 50 && tx.bad.length === 0 && tx.long.length === 0 && tx.nonEnglish.length === 0, tx);
await browser.close();

// ---------------------------------------------------------------- old saves (from before this change)
for (const [fx, key, room] of [['base-14', 'shell', 'c3shaft'], ['base-15', 'core', 'c3core']]) {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fx), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((i) => i.name === 'lba3_save_v1').value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers();
  const o = await ev(() => { const G = game; const q0 = qc(); calm(); const r = G.room?.id === 'c3shaft' ? readGauge(9.5) : null;
    return { state: G.state, ch: G.flags.chapterKey, room: G.room?.id, q0, qc: qc(), r, mode: QC().mode, matto: !!P.npc('qc_matto')?.present, journal: QC().journal().length }; });
  const okRiser = key === 'shell' ? o.r?.phrases?.[0] === '311' : o.r === null;
  check(`an old save (${fx}, chapter ${key}, before this change) loads in play where it was saved; no dx_qc_ state made up; ${key === 'shell' ? 'the riser knocks his first call for him (heavy, light, light)' : 'nothing of the quest shown'}; no Matto`, o.state === 'play' && o.ch === key && o.room === room && Object.keys(o.q0).length === 0 && Object.keys(o.qc).length === 0 && okRiser && !o.matto && o.journal === 0, o);
  await browser.close();
}
done();
