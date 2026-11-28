// ORDER 66.5: play from a new game through chapter 1 with real input only — key presses through Playwright's keyboard
// (the game's default Classic controls: ←/→ turn, ↑ walks; E talks, uses and turns the dialogue's page; Enter in menus).
// It steers toward the star the game itself shows (game.story.markers(): the map's and the compass's star), as a player
// following the star would; it never moves Twinsen or sets a flag. Where it can't get on (stuck, no star, a state it
// doesn't know) it writes that down with a picture and goes on trying round it; after STUCK_MAX s on one goal it stops.
// Every objective, every line of dialogue (speaker and text) and every prompt it sees goes to the log, with pictures
// at each new objective, each speaker's first line and every 20 s.
// usage: node play66.mjs <OUT> <lba3 ROOT> <en|he> [minutes]
import { chromium, _electron as electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, LANG = 'en', MIN = '60'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const STUCK_MAX = +(process.env.STUCK_MAX || 240);
// ORDER 69: the installed game (APP = its exe, PROFILE a user-data-dir of its own), not a browser
const server = process.env.APP ? null : await serve(ROOT);
const eapp = process.env.APP ? await electron.launch({ executablePath: process.env.APP, args: [`--user-data-dir=${process.env.PROFILE}`], timeout: 120000 }) : null;
const browser = eapp ? null : await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = eapp ? await eapp.firstWindow() : await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const logf = fs.createWriteStream(`${OUT}/play.log`);
const T0 = Date.now(), el = () => ((Date.now() - T0) / 1000).toFixed(1);
const log = (...a) => { const s = `[${el()}] ` + a.join(' '); logf.write(s + '\n'); console.log(s); };
let shotN = 0;
const shot = async (tag) => { const n = `${String(shotN++).padStart(3, '0')}-${tag.replace(/[^\w-]+/g, '_').slice(0, 40)}.jpg`; await page.screenshot({ path: `${OUT}/${n}`, type: 'jpeg', quality: 78 }); return n; };
const tap = async (k, ms = 90) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };

if (!eapp) await page.goto(server.url + (process.env.NOCINE ? '?nocine' : ''), { waitUntil: 'load', timeout: 180000 });   // (with the opening cinematic: a new player sees it)
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
// the language as a player picks it in Settings (the settings object the menu writes)
await page.evaluate((l) => { game.settings.lang = l; game.applySettings(); game.saveSettings?.(); }, LANG);
await page.waitForTimeout(600);
await shot('title');
await page.click('[data-act="new"]'); await page.waitForTimeout(900);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
log('new game, language', LANG);
const TALK = await page.evaluate(async () => (await import('./src/game/i18n.js')).t('p_talk'));
const NAMES = new Set(await page.evaluate(async () => { const I = await import('./src/game/i18n.js'); return game.npcs.map((n) => I.t('n_' + n.def.id)).filter((x) => x && !x.startsWith('n_')); }));
const stole = new Set();
// the town's streets (world.js PATHS): a player walks the streets to a far star, not through walls
const PATHS = await page.evaluate(async () => (await import('./src/game/world.js')).PATHS);
const NODES = []; const ADJ = [];
for (const pl of PATHS) { let prev = -1; for (const [x, z] of pl) { let i = NODES.findIndex((n) => Math.hypot(n[0] - x, n[1] - z) < 0.5); if (i < 0) { i = NODES.length; NODES.push([x, z]); ADJ.push([]); } if (prev >= 0 && prev !== i) { ADJ[prev].push(i); ADJ[i].push(prev); } prev = i; } }
for (let i = 0; i < NODES.length; i++) for (let j = i + 1; j < NODES.length; j++) if (Math.hypot(NODES[i][0] - NODES[j][0], NODES[i][1] - NODES[j][1]) < 16) { ADJ[i].push(j); ADJ[j].push(i); }
const nearN = (x, z) => NODES.map((n, i) => [Math.hypot(n[0] - x, n[1] - z), i]).sort((a, b) => a[0] - b[0])[0][1];
const route = (x0, z0, x1, z1) => {   // Dijkstra over the street nodes, from the node nearest him to the one nearest the star
  const a = nearN(x0, z0), b = nearN(x1, z1), D = NODES.map(() => Infinity), P = NODES.map(() => -1), done = new Set(); D[a] = 0;
  while (true) { let u = -1; for (let i = 0; i < NODES.length; i++) if (!done.has(i) && (u < 0 || D[i] < D[u])) u = i; if (u < 0 || D[u] === Infinity || u === b) break; done.add(u);
    for (const v of ADJ[u]) { const w = D[u] + Math.hypot(NODES[u][0] - NODES[v][0], NODES[u][1] - NODES[v][1]); if (w < D[v]) { D[v] = w; P[v] = u; } } }
  const out = []; for (let v = b; v >= 0; v = P[v]) out.unshift(NODES[v]); return out;
};
let way = [], wayFor = '';

const held = new Set();
const hold = async (keys) => { for (const k of [...held]) if (!keys.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of keys) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
let nodeAt = '', sameStuck = 0, stuckAt = null, bellTry = 0, lastFk = '', lastFkT = 0, lastHint = '', lastStepSeen = '', lastTip = '', lastStep = '', lastObj = '', lastSpeaker = '', lastText = '', lastPrompt = '', lastState = '', lastShotT = 0, goalT = Date.now(), lastGoalKey = '';
const tried = new Set(); let presses = 0; const heard = new Map(), blocked = new Map(), spent = new Set(); let starSet = ''; let orbitA = 0; let leftSign = null, stuckT = 0, lastPos = null, lastMoveT = Date.now(), detour = 0, chapterSeen = 0;
const notes = [];
const note = async (what) => { const n = await shot('note'); notes.push({ t: el(), what, shot: n }); log('NOTE', what, n); };
while ((Date.now() - T0) / 60000 < +MIN) {
  const s = await page.evaluate(() => {
    const G = game, h = G.hero, d = document.querySelector('#dialog'), q = (s) => document.querySelector(s);
    const ms = (G.state === 'play' && G.story?.markers) ? G.story.markers().filter((m) => m.kind === 'star') : [];
    const cam = G.camera.position;
    return { state: G.state, screen: G.screen, room: G.room?.id || 'out', chapter: G.flags.chapter | 0, prologueDone: !!G.flags.prologueDone,
      obj: q('#objective')?.textContent || '', tip: q('.tgoal')?.textContent || '', hint: [q('#tip')?.textContent || '', q('#toast')?.textContent || '', q('#floats')?.textContent || ''].join(' | '), tkeys: q('#tip .tkeys')?.textContent || '', beh: h.behaviour || '',
      step: G.story?.cur?.steps?.on ? (G.story.cur.steps.current?.() || '') : '', prompt: q('#prompt')?.textContent || '', toast: q('#toast')?.textContent || '',
      dlg: d && !d.classList.contains('hidden') ? [d.querySelector('.name')?.textContent || '', d.querySelector('.text')?.textContent || ''] : null,
      menu: q('#shop') && !q('#shop').classList.contains('hidden') ? (q('#shop h2')?.textContent || 'menu') : null,
      chap: q('#chapter') && getComputedStyle(q('#chapter')).opacity > 0.1 ? q('#chapter').textContent : '',
      bell: G.story?.cur?.bell && G.flags.metXil && !G.flags.pr_bell ? [G.story.cur.bell.x, G.story.cur.bell.z] : null,
      // (dark crystals the ball wakes, in the room he is in: what he sees glowing dark on its stand)
      nodes: G.room ? (G.room.ballTargets || []).filter((b) => b.node && !b.node.lit).map((b) => [b.x, b.z]) : [],
      hp: h.hp, x: h.pos.x, y: h.pos.y, z: h.pos.z, a: h.angle, cx: cam.x, cz: cam.z,
      stars: ms.map((m) => [+m.x.toFixed(1), +m.z.toFixed(1), m.label || '', G.npcs.some((n) => n.present && Math.hypot(n.pos.x - m.x, n.pos.z - m.z) < 0.8) ? 'P' : '']),
      exits: G.room ? (G.room.exits || []).map((e) => [+e.x.toFixed(1), +e.z.toFixed(1), 'exit ' + (e.to || e.room || e.id || '')]) : [],
      searches: G.room ? (G.room.searches || []).map((e) => [+e.x.toFixed(1), +e.z.toFixed(1), 'search ' + (e.id || '')]) : [] };
  });
  if (s.obj !== lastObj || s.step !== lastStepSeen) { blocked.clear(); heard.clear(); lastStepSeen = s.step; }
  if (s.obj !== lastObj) { log('OBJECTIVE', JSON.stringify(s.obj)); lastObj = s.obj; await shot('obj'); goalT = Date.now(); }
  if (s.hint !== lastHint) { if (s.hint.replace(/[ |]/g, '')) log('HINT', JSON.stringify(s.hint)); lastHint = s.hint; }
  if (s.tip !== lastTip) { log('TIP', JSON.stringify(s.tip), 'keys', JSON.stringify(s.tkeys), 'step', s.step); lastTip = s.tip; if (s.tip) await shot('tip'); }
  if (s.prompt && s.prompt !== lastPrompt) log('PROMPT', JSON.stringify(s.prompt));
  lastPrompt = s.prompt;
  if (s.chap) log('CHAPTER CARD', JSON.stringify(s.chap));
  if (s.state !== lastState) { log('STATE', s.state, 'room', s.room, 'chapter', s.chapter); lastState = s.state; }
  if (s.chapter >= 2 && !chapterSeen) { chapterSeen = 1; log('CHAPTER 2 reached'); await shot('chapter2'); break; }
  if (s.state === 'end' || s.screen === 'end') { log('END screen'); await shot('end'); break; }
  if (Date.now() - lastShotT > 20000) { lastShotT = Date.now(); await shot('t'); }
  if (s.dlg) {
    await hold([]);
    if (s.dlg[1] !== lastText) {
      // (the line types itself out: wait till it stops changing)
      for (let k = 0; k < 14; k++) { await page.waitForTimeout(300); const t2 = await page.evaluate(() => { const d = document.querySelector('#dialog'); return d && !d.classList.contains('hidden') ? [d.querySelector('.name')?.textContent || '', d.querySelector('.text')?.textContent || ''] : null; }); if (!t2) break; if (t2[1] === s.dlg[1]) break; s.dlg = t2; }
      if (s.dlg[1] === lastText) { await tap('KeyE'); await page.waitForTimeout(250); continue; }
      log('SAY', JSON.stringify(s.dlg[0]), JSON.stringify(s.dlg[1]));
      const hk = s.dlg[0] + '|' + s.dlg[1], hn = (heard.get(hk) || 0) + 1; heard.set(hk, hn);
      if (hn >= 6 && lastGoalKey && !spent.has(lastGoalKey)) { spent.add(lastGoalKey); log('SPENT', lastGoalKey, '(the same line six times); the next star'); }
      if (hn === 3 && lastGoalKey && !blocked.has(lastGoalKey)) { blocked.set(lastGoalKey, s.dlg[0]); await note(`at the star ${lastGoalKey} E talks to ${s.dlg[0]} (the same line a third time: ${JSON.stringify(s.dlg[1].slice(0, 80))}) instead of the thing under the star; walking round it`); }
      if (s.dlg[0] !== lastSpeaker) { await shot('say-' + s.dlg[0]); lastSpeaker = s.dlg[0]; }
      lastText = s.dlg[1];
      await page.waitForTimeout(Math.min(2600, 500 + s.dlg[1].length * 25));   // (time to read it, as a player)
    }
    await tap('KeyE'); await page.waitForTimeout(250); goalT = Date.now(); continue;
  }
  if (!s.dlg) lastText = '';   // (a conversation over: the same line again later is a repeat, counted)
  if (s.menu) { await hold([]); log('MENU', JSON.stringify(s.menu)); await shot('menu'); await tap('Escape'); await page.waitForTimeout(500); continue; }
  if (s.state === 'cutscene') { await hold([]); await page.waitForTimeout(500); continue; }
  if (s.state !== 'play') { await hold([]); await tap('KeyE'); await page.waitForTimeout(400); continue; }
  // in play: first learn which way ← turns him (one short press, as a player tries the keys)
  if (leftSign === null) { const a0 = s.a; await tap('ArrowLeft', 300); const a1 = await page.evaluate(() => game.hero.angle); leftSign = Math.sign(a1 - a0) || 1; log('← turns the angle by sign', leftSign); continue; }
  // in play: the nearest star
  // the opening's steps (the tips panel's goal): the inventory, the ball at the barrel, the pipe
  if (s.step === 'inv' && s.step !== lastStep) {
    await hold([]); log('STEP inv: opening the inventory (I)'); await tap('KeyI'); await page.waitForTimeout(1500); await shot('inventory');
    const st2 = await page.evaluate(() => game.state); log('state after I:', st2); await page.waitForTimeout(1200); await tap('KeyE'); await page.waitForTimeout(1200); await shot('inventory-e');
    await tap('KeyI'); await page.waitForTimeout(800); if (await page.evaluate(() => game.state) !== 'play') { await tap('Escape'); await page.waitForTimeout(600); }
    lastStep = s.step; continue;
  }
  if (s.step !== 'inv') lastStep = s.step;
  // the bell on the post (Xil: "only the bell on that post wakes him"; the game's nudge: "not for the magic ball"): from a few
  // metres, facing it, the ball
  if (!s.bell && s.nodes.length) {   // (the nearest dark crystal: the ball at it, as the bell)
    const nd = s.nodes.map((n) => [n, Math.hypot(n[0] - s.x, n[1] - s.z)]).sort((a, b) => a[1] - b[1])[0][0];
    s.bell = nd; if (nodeAt !== nd.join(',')) { nodeAt = nd.join(','); log('CRYSTAL to wake at', nodeAt); bellTry = 0; }
  }
  if (s.bell && (s.room === 'out' || s.nodes.length)) {
    const R = [4.5, 3.6, 5.4][bellTry % 3], bd = Math.hypot(s.bell[0] - s.x, s.bell[1] - s.z);
    if (bd > R + 0.6 || bd < R - 0.8) {   // (to a spot R m from the bell, on his side of it)
      const ux = (s.x - s.bell[0]) / (bd || 1), uz = (s.z - s.bell[1]) / (bd || 1), tx = s.bell[0] + ux * R, tz = s.bell[1] + uz * R;
      let dg = Math.atan2(tx - s.x, tz - s.z) - s.a; while (dg > Math.PI) dg -= 2 * Math.PI; while (dg < -Math.PI) dg += 2 * Math.PI;
      await hold([...(Math.abs(dg) > 0.2 ? [dg * leftSign > 0 ? 'ArrowLeft' : 'ArrowRight'] : []), ...(Math.abs(dg) < 0.9 ? ['ArrowUp'] : [])]); await page.waitForTimeout(150); continue; }
    let db = Math.atan2(s.bell[0] - s.x, s.bell[1] - s.z) - s.a; while (db > Math.PI) db -= 2 * Math.PI; while (db < -Math.PI) db += 2 * Math.PI;
    if (Math.abs(db) > 0.08) { await hold([db * leftSign > 0 ? 'ArrowLeft' : 'ArrowRight']); await page.waitForTimeout(70); continue; }
    await hold([]); bellTry++; log(s.nodes.length ? 'CRYSTAL: the ball (F) from' : 'BELL: the ball (F) at the bell from', bd.toFixed(1), 'm, try', bellTry); await shot('bell'); await tap('KeyF', 120); await page.waitForTimeout(2200); continue;
  }
  // (inside a room the map shows no star: a player looks for the way out, the room's door)
  let viaExit = false;
  // (in a room with the star outside it — far off in the world's coordinates —: out by the door first)
  if (s.room !== 'out' && s.stars.length && s.exits.length && Math.min(...s.stars.map((m) => Math.hypot(m[0] - s.x, m[1] - s.z))) > 60) s.stars = [];
  const todo = s.searches.filter((q) => !tried.has(s.room + q[2]));
  if (!s.stars.length && todo.length) s.stars = todo;
  else if (!s.stars.length && s.exits.length) { const out = s.exits.filter((e) => /outdoor/.test(e[2])); s.stars = out.length ? out : s.exits; viaExit = true; }
  if (!s.stars.length) {
    if (Date.now() - goalT > 15000) { await note(`no star to follow for 15 s (objective ${JSON.stringify(s.obj)}, room ${s.room})`); goalT = Date.now(); }
    await hold([]); await tap('KeyE'); await page.waitForTimeout(300); continue;
  }
  { const ss = s.stars.map((m) => m.slice(0, 3).join(',')).sort().join(';'); if (ss !== starSet) { if (starSet) spent.clear(); starSet = ss; } }
  const live = s.stars.filter((m) => !spent.has(m.slice(0, 3).join(',')));
  const st = (live.length ? live : s.stars).map((m) => ({ m, d: Math.hypot(m[0] - s.x, m[1] - s.z) })).sort((a, b) => a.d - b.d)[0];
  const key = st.m.slice(0, 3).join(',');
  if (key !== lastGoalKey) { presses = 0; log('STAR', key, 'at', st.d.toFixed(1), 'm'); lastGoalKey = key; goalT = Date.now(); }
  // (a search spot: close in until the game offers it — its prompt — then E; given up after 12 s there)
  if (/^search /.test(st.m[2]) && st.d < 1.1) {
    if (s.prompt) { await hold([]); await tap('KeyE'); await page.waitForTimeout(700); tried.add(s.room + st.m[2]); log('SEARCHED', st.m[2], 'prompt', JSON.stringify(s.prompt)); continue; }
    let da0 = Math.atan2(st.m[0] - s.x, st.m[1] - s.z) - s.a; while (da0 > Math.PI) da0 -= 2 * Math.PI; while (da0 < -Math.PI) da0 += 2 * Math.PI;
    await hold(Math.abs(da0) > 0.12 ? [da0 * leftSign > 0 ? 'ArrowLeft' : 'ArrowRight'] : []); await page.waitForTimeout(120);
    if (Date.now() - goalT > 20000) { tried.add(s.room + st.m[2]); log('GAVE UP on', st.m[2]); }
    continue; }
  if (/^search /.test(st.m[2]) && Date.now() - goalT > 25000) { tried.add(s.room + st.m[2]); log('GAVE UP on', st.m[2], 'at', st.d.toFixed(1), 'm'); continue; }
  if (s.step === 'barrels' && st.d < 5.5) {   // (the ball at the barrel: face it, then F)
    let db = Math.atan2(st.m[0] - s.x, st.m[1] - s.z) - s.a; while (db > Math.PI) db -= 2 * Math.PI; while (db < -Math.PI) db += 2 * Math.PI;
    if (Math.abs(db) > 0.1) { await hold([db * leftSign > 0 ? 'ArrowLeft' : 'ArrowRight']); await page.waitForTimeout(100); continue; }
    await hold([]); log('STEP barrels: throwing the ball (F) at', st.d.toFixed(1), 'm'); await tap('KeyF', 120); await page.waitForTimeout(1800); continue;
  }
  if (s.step === 'pipe' && s.beh !== 'athletic') { await hold([]); log('STEP pipe: the panel says', JSON.stringify(s.tkeys), '- F2 for Athletic'); await tap('F2'); await page.waitForTimeout(700); continue; }
  { const BEH = { F1: 'normal', F2: 'athletic', F3: 'aggressive', F4: 'discreet' };
    const fk = (s.hint.match(/\((F[1-4])\)/) || s.hint.match(/(F[1-4]) Switch to/) || [])[1] || (s.step === 'pipe' ? 'F2' : null);
    if (fk) { lastFkT = Date.now(); if (fk !== lastFk) { lastFk = fk; spent.clear(); } }
    if (fk && s.beh !== BEH[fk]) { await hold([]); log('HINT says', fk, '-> pressing it'); await tap(fk); await page.waitForTimeout(600); continue; }
    if (!fk && Date.now() - lastFkT > 10000 && s.beh && s.beh !== 'normal' && !s.dlg) { await hold([]); log('back to Normal (F1)'); lastFk = ''; await tap('F1'); await page.waitForTimeout(500); continue; } }
  if (s.step === 'pipe' && st.d < 2.4) { log('STEP pipe: run and jump (Space)'); await hold(['ArrowUp']); await page.waitForTimeout(150); await tap('Space', 120); await page.waitForTimeout(900); continue; }
  const person = NAMES.has(st.m[2]) || st.m[3] === 'P';
  const wrongPrompt = !s.prompt || (person ? !(TALK && s.prompt.includes(TALK)) : (TALK && s.prompt.includes(TALK)));
  if (blocked.has(key) && st.d < 3.2 && wrongPrompt) {   // (round the star till the right thing is offered: a person's Talk, a thing's own)
    orbitA += 0.45; const tx = st.m[0] + 1.4 * Math.sin(orbitA), tz = st.m[1] + 1.4 * Math.cos(orbitA);
    let dg = Math.atan2(tx - s.x, tz - s.z) - s.a; while (dg > Math.PI) dg -= 2 * Math.PI; while (dg < -Math.PI) dg += 2 * Math.PI;
    await hold([...(Math.abs(dg) > 0.2 ? [dg * leftSign > 0 ? 'ArrowLeft' : 'ArrowRight'] : []), ...(Math.abs(dg) < 1.0 ? ['ArrowUp'] : [])]); await page.waitForTimeout(300); continue; }
  if (blocked.has(key) && s.prompt && st.d < 3.2) { await hold([]); log('ROUND THE STAR: the prompt now', JSON.stringify(s.prompt)); await tap('KeyE'); await page.waitForTimeout(600); continue; }
  if ((st.d < 1.6 || (s.prompt && st.d < 2.8)) && !viaExit && !/^search /.test(st.m[2])) {
    let df = Math.atan2(st.m[0] - s.x, st.m[1] - s.z) - s.a; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    if (Math.abs(df) > 0.2 && st.d > 0.45) { await hold([df * leftSign > 0 ? 'ArrowLeft' : 'ArrowRight']); await page.waitForTimeout(90); continue; }
    // (a thing, not a person, under the star, but the prompt offers to talk: someone beside it takes the key; closer first)
    if (!st.m[2] && st.m[3] !== 'P' && TALK && s.prompt.includes(TALK) && st.d > 0.55) {
      if (!stole.has(key)) { stole.add(key); await note(`at the star ${key} (a thing) the prompt is ${JSON.stringify(s.prompt)}: a person beside it takes the key; stepping closer`); }
      await hold(['ArrowUp']); await page.waitForTimeout(110); continue; }
    await hold([]); await tap('KeyE'); await page.waitForTimeout(500);
    presses = (presses || 0) + 1;
    if (presses % 4 === 0) {   // (nothing came of E: step back, as a player would, and come at it again)
      if (presses === 4 && !s.prompt && s.tkeys) await note(`at the star ${key}, ${st.d.toFixed(2)} m: the tips panel says ${JSON.stringify(s.tkeys)} but the game shows no prompt and E does nothing; stepping back`);
      await hold(['ArrowDown']); await page.waitForTimeout(450); await hold([]); }
    if (Date.now() - goalT > 20000) { await note(`at the star ${key} and E does nothing for 20 s (objective ${JSON.stringify(s.obj)})`); goalT = Date.now(); spent.add(key); } continue; }
  // moved?
  if (!lastPos || Math.hypot(s.x - lastPos[0], s.z - lastPos[1]) > 0.35) { lastPos = [s.x, s.z]; lastMoveT = Date.now(); }
  if (Date.now() - lastMoveT > 1800 && !detour) {
    detour = Date.now(); stuckT++;
    sameStuck = stuckAt && Math.hypot(stuckAt[0] - s.x, stuckAt[1] - s.z) < 2.5 ? sameStuck + 1 : 0; stuckAt = [s.x, s.z];
    log('STUCK at', s.x.toFixed(1), s.z.toFixed(1), 'toward', key, sameStuck ? `(${sameStuck + 1}× here)` : '');
    wayFor = '';   // (a new route from here after the step aside)
    if (sameStuck >= 2) { await hold(['ArrowDown']); await page.waitForTimeout(500 + 150 * Math.min(sameStuck, 8)); await hold([]); }
  }
  if ((Date.now() - goalT) / 1000 > STUCK_MAX) { await note(`could not reach the star ${key} in ${STUCK_MAX} s (objective ${JSON.stringify(s.obj)}, at ${s.x.toFixed(1)}, ${s.z.toFixed(1)})`); break; }
  let gx = st.m[0], gz = st.m[1];
  if (s.room === 'out' && st.d > 22) {
    if (wayFor !== key) { way = route(s.x, s.z, gx, gz); wayFor = key; log('ROUTE to', key, 'by the streets:', way.map((n) => n.join(',')).join(' > ')); }
    while (way.length && Math.hypot(way[0][0] - s.x, way[0][1] - s.z) < 2.5) way.shift();
    // (skip a node behind him: the next one nearer the star than he is)
    if (way.length > 1 && Math.hypot(way[1][0] - s.x, way[1][1] - s.z) < Math.hypot(way[1][0] - way[0][0], way[1][1] - way[0][1])) way.shift();
    if (way.length && Math.hypot(way[way.length - 1][0] - gx, way[way.length - 1][1] - gz) < st.d) { gx = way[0][0]; gz = way[0][1]; }
  } else if (wayFor === key && st.d <= 22) { way = []; }
  let want = Math.atan2(gx - s.x, gz - s.z);
  if (detour) { const k = Date.now() - detour, len = 1700 + 600 * Math.min(sameStuck, 6); if (k > len) { detour = 0; lastMoveT = Date.now(); } else want += (Math.floor(stuckT / 2) % 2 ? 1.6 : -1.6); }
  let da = want - s.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const keys = [];
  if (Math.abs(da) > 0.18) keys.push(da * leftSign > 0 ? 'ArrowLeft' : 'ArrowRight');
  if (Math.abs(da) < 0.9) keys.push('ArrowUp');
  await hold(keys);
  await page.waitForTimeout(120);
}
await hold([]);
fs.writeFileSync(`${OUT}/notes.json`, JSON.stringify(notes, null, 1));
log('done; notes', notes.length, '; page errors', errs.length, errs.slice(0, 5).join(' | ').slice(0, 500));
logf.end(); if (eapp) await eapp.close(); else { await browser.close(); server.close?.(); } process.exit(0);
