// P116 OVERHEAD REMARKS (the user's pick, 23.11; built 24.11): a minor resident's one short line over its head instead of
// the dialogue box (src/game/walkers.js Remarks; story/index.js npcDefs tags `minor`; story/base.js chain's `more`).
// One covering suite, 1366x768, the camera at Far (the default):
//   A  Citadel (base-03, chapter 2 outdoors): a minor resident spoken to by the key (E through the game's input): the line
//      over its head, the game in play (no box, no camera move, his keys his: he turns while it is up), the resident
//      stopped and turned to him, its voice started; E again closes it; its time closes it and the resident goes on;
//      walking off closes it. The size at 1366 and with Text Size Large; a small screen (640x360) keeps it inside. The
//      same resident with the old way (G.remarks.on = false, as ?remarks=box): the box — the before picture. A story
//      person still opens the full talk (the box, the talk camera). The sweep: every minor resident's line set (the
//      residents' generic lines, story/citizens.js linesFor) read by the rule: how many are short enough to be remarks.
//   B  Zeelich (base-05, chapter 3): a minor resident's remark; its before picture.
//   C  Hebrew (base-03, lang he): a remark in Hebrew, its text right to left inside the bubble only.
// Pictures: captures/p116/ (SHOTS=0 none). Positions are set directly only to stand him in front of a resident (as
// tests/walkers.mjs does); the talk is by the key.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, checkVisual, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const OUT = fileURLToPath(new URL('../captures/p116/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
const SHOTS = process.env.SHOTS !== '0';
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
let browser, page, ev;
// SERVE=1: this checkout's files answered by the browser's request routing (no http.server needed; GAME_URL any origin)
const SERVE = !!process.env.SERVE, ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = { js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', html: 'text/html', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', ogg: 'audio/ogg', mp3: 'audio/mpeg', mid: 'audio/midi', woff2: 'font/woff2', wasm: 'application/wasm', glb: 'model/gltf-binary', txt: 'text/plain', bin: 'application/octet-stream' };
async function serveLocal(route) {
  const u = new URL(route.request().url());
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': MIME[path.extname(f).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' } });
}
// (a loaded shared machine: a picture may take minutes; one that still fails is reported, not fatal)
const shot = async (n) => { if (!SHOTS) return; try { await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 84, timeout: 240000 }); console.log('capture ' + n); } catch (e) { console.log('capture FAILED to save ' + n + ': ' + e.message.split('\n')[0]); } };

async function boot(save, lang) {
  const j = JSON.parse(fs.readFileSync(path.join(FIX, save + '.save.json'), 'utf8'));
  for (const o of j.origins || []) {
    o.origin = ORIGIN;
    let s = o.localStorage.find((x) => x.name === 'sunshard_settings_v1');
    if (!s) o.localStorage.push((s = { name: 'sunshard_settings_v1', value: '{}' }));
    const v = JSON.parse(s.value || '{}'); v.camDist = 'far'; if (lang) { v.lang = lang; v.langV = 1; }   // (langV: main.js keeps a stored language only with it) s.value = JSON.stringify(v);
  }
  if (browser) await browser.close();
  let context;
  ({ browser, context, page } = await launch({ width: 1366, height: 768, storageState: j }));
  if (SERVE) await context.route(ORIGIN + '/**', serveLocal);
  ev = (f, a) => page.evaluate(f, a);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { P.settle(); });
  // (the language as Settings applies it: a stored choice alone did not take in this boot)
  if (lang) await ev((l) => { game.settings.lang = l; game.settings.langV = 1; game.applySettings(); game.step(0.1); }, lang);
  await helpers();
}

async function helpers() {
  await ev(() => {
    window.OR = {
      // stand 1.5 m in front of n, facing it, and press E (the game's own input path: Hero → tryInteract)
      front(n) {
        const G = game, h = G.hero, a = n.angle, x = n.pos.x + Math.sin(a) * 1.5, z = n.pos.z + Math.cos(a) * 1.5;
        h.pos.set(x, G.physics.groundAt(x, z, n.pos.y + 1), z); h.angle = Math.atan2(n.pos.x - x, n.pos.z - z); h.onGround = true; h.vy = 0; h.sync();
        if (G.camRig.lba) G.camRig.lba.init = false;
        G.step(0.4, 1 / 30);
        const it = G.findInteractable();
        return it?.kind === 'npc' && it.npc === n;
      },
      press() { const G = game; G.input.taps.add('KeyE'); G.step(1 / 30, 1 / 30); },
      // the bubble as drawn: its rect, its font size, and where the resident's head is on screen
      look() {
        const G = game, R = G.remarks, el = document.querySelector('.remark'), C = R.cur;
        if (!el || !C || el.style.display === 'none') return null;
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el), n = C.n;
        const v = n.pos.clone(); v.y += n._rmTop; v.project(G.camera);
        return { text: el.textContent, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width),
          font: parseFloat(cs.fontSize), bidi: cs.unicodeBidi, dir: cs.direction, vis: cs.visibility, op: +el.style.opacity,
          headX: Math.round((v.x + 1) / 2 * innerWidth), headY: Math.round((1 - v.y) / 2 * innerHeight), vw: innerWidth, vh: innerHeight };
      },
      // a minor resident here who answers with a remark: tried nearest first (a line set may answer in the box: next)
      find(maxTry = 10) {
        const G = game, h = G.hero, R = G.remarks, tried = [];
        // (the same scene: outdoors no room's people; an outdoor room — Zeelich — its street's and its rooms' people within reach; a room its own)
        const scene = (n) => (!G.room ? !n.def.indoor : G.room.outdoor ? true : !!n.def.indoor);
        const here = (n) => n.present && !n.inside && !n.away && !!n.def.minor && scene(n) && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 70;
        const list = G.npcs.filter(here).sort((a, b) => Math.hypot(a.pos.x - h.pos.x, a.pos.z - h.pos.z) - Math.hypot(b.pos.x - h.pos.x, b.pos.z - h.pos.z));
        // (each tried twice: a resident's lines cycle, and its next one may be the short one)
        for (const n of list.slice(0, maxTry)) for (let k = 0; k < 2; k++) {
          if (!OR.front(n)) { tried.push(n.def.id + ':no-prompt'); break; }
          OR.press();
          if (R.cur?.n === n) return { id: n.def.id, minor: n.def.minor, tried };
          tried.push(n.def.id + ':' + (R.log.at(-1)?.why || G.state));
          P.settle();
        }
        return { id: null, tried, minors: list.length };
      },
      // the remark up for a while: is the game in play, the camera still, the resident turned to him, its voice on
      during(s = 1.2) {
        const G = game, R = G.remarks, n = R.cur.n, h = G.hero, c0 = G.camera.position.clone();
        let faced = 9;
        for (let t = 0; t < s; t += 0.1) { G.step(0.1, 1 / 30); const d = Math.abs(Math.atan2(Math.sin(n.angleTo(h) - n.angle), Math.cos(n.angleTo(h) - n.angle))); faced = Math.min(faced, d); }
        const B = G.audio.babble;
        return { state: G.state, box: G.hud.talking, speaker: !!G.speaker, twoShot: !!G.talkers?.has(n), camMove: +G.camera.position.distanceTo(c0).toFixed(3), faced: +faced.toFixed(2),
          engaged: !!n.engaged, talking: !!n.talking, voiceKey: B.key, voiced: B.text === R.cur?.text, up: R.cur?.n === n, t: +(R.cur?.t ?? -1).toFixed(2) };
      },
    };
  });
}

// ================================================================ A. Citadel
await boot('base-03');
let r = await ev(() => ({ chapter: game.flags.chapterKey, room: game.room?.id || 'out', on: game.remarks.on, cam: game.settings.camDist }));
console.log('A boot', JSON.stringify(r));
const A = await ev(() => OR.find());
check('A1 Citadel: a minor resident spoken to by the key answers over its head (the first that does, nearest first)', !!A.id, A);
if (A.id) {
  const L = await ev(() => OR.look());
  const D = await ev(() => OR.during(1.2));
  check('A2 …the game stays in play: no dialogue box, no speaker, not in the talk camera\'s two-shot, the camera still (< 0.15 m in 1.2 s)', D.state === 'play' && !D.box && !D.speaker && !D.twoShot && D.camMove < 0.15, D);
  check('A3 …the resident stopped, turned to him (within 0.5 rad), talking, its voice started on the line (Babble keyed to its name)', D.up && D.faced < 0.5 && D.talking && /^n_/.test(D.voiceKey || ''), D);
  checkVisual('A4 …the bubble over its head at 1366x768, Far: its tail within 40 px above the head, centred on it (±30 px), the text ≥ 17 px, inside the screen', !!L && L.b <= L.headY + 4 && L.b >= L.headY - 48 && Math.abs((L.l + L.r) / 2 - L.headX) <= 30 && L.font >= 17 && L.l >= 0 && L.r <= L.vw && L.t >= 0, L);
  await shot('p116-citadel-after');
  // his keys are his: he turns on the spot while it is up
  r = await ev(() => { const G = game, h = G.hero, a0 = h.angle; P.holdFor(['ArrowLeft'], 0.4); return { turned: +Math.abs(Math.atan2(Math.sin(h.angle - a0), Math.cos(h.angle - a0))).toFixed(2), state: G.state, up: !!G.remarks.cur }; });
  check('A5 …his keys stay his: Left turns him while the remark is up (no control lock)', r.turned > 0.3 && r.state === 'play' && r.up, r);
  // Text Size Large: bigger
  r = await ev(() => { const G = game, f0 = OR.look().font; G.settings.textSize = 'large'; G.applySettings(); const f1 = parseFloat(getComputedStyle(document.querySelector('.remark')).fontSize); G.settings.textSize = 'normal'; G.applySettings(); return { normal: f0, large: f1 }; });
  checkVisual('A6 …the Text Size setting: Large draws it larger', r.large > r.normal * 1.15, r);
  // E again closes it, and that is all the key does
  r = await ev(() => { const G = game, R = G.remarks; OR.press(); return { up: !!R.cur, state: G.state, closed: R.log.at(-1) }; });
  check('A7 E again closes it (nothing else opens: the game in play)', !r.up && r.state === 'play' && r.closed?.closed === 'key', r);
}
// (OR_ID: the resident found above, for the page)
if (A.id) {
  await ev((id) => { window.OR_ID = id; }, A.id);
  r = await ev(() => {
    const G = game, R = G.remarks, n = G.npcs.find((x) => x.def.id === OR_ID);
    let tries = 0; while (tries++ < 6) { OR.front(n); OR.press(); if (R.cur) break; P.settle(); }
    if (!R.cur) return { none: true, log: R.log.slice(-6) };
    const text = R.cur.text, dur = R.cur.t; let t = 0;
    while (R.cur && t < 10) { G.step(0.1, 1 / 30); t += 0.1; }
    G.step(0.8, 1 / 30);
    return { text, dur: +dur.toFixed(2), closedAfter: +t.toFixed(1), why: R.log.at(-1)?.closed, engaged: !!n.engaged, talking: !!n.talking, words: text.split(/\s+/).length };
  });
  check('A8 its time closes it (2.6–7 s by its length) and the resident is let go (not engaged, not talking)', !r.none && r.why === 'time' && r.closedAfter >= 2.4 && r.closedAfter <= 7.2 && !r.engaged && !r.talking, r);
  // walking off closes it
  r = await ev(() => {
    const G = game, R = G.remarks, n = G.npcs.find((x) => x.def.id === OR_ID), h = G.hero;
    let tries = 0; while (tries++ < 6) { OR.front(n); OR.press(); if (R.cur) break; P.settle(); }
    if (!R.cur) return { none: true };
    const x = n.pos.x + 9, z = n.pos.z; h.pos.set(x, G.physics.groundAt(x, z, n.pos.y + 1), z); h.sync(); G.step(0.2, 1 / 30);
    return { up: !!R.cur, why: R.log.at(-1)?.closed };
  });
  check('A9 walking off (9 m) closes it', !r.none && !r.up && r.why === 'away', r);
  // a small screen: inside it, still readable
  await page.setViewportSize({ width: 640, height: 360 });
  r = await ev(() => { const G = game, R = G.remarks, n = G.npcs.find((x) => x.def.id === OR_ID); G.step(0.3, 1 / 30);
    let tries = 0; while (tries++ < 6) { OR.front(n); OR.press(); if (R.cur) break; P.settle(); }
    G.step(0.2, 1 / 30); return OR.look(); });
  checkVisual('A10 a small screen (640x360): the bubble inside it, the text ≥ 15 px', !!r && r.l >= 0 && r.r <= r.vw && r.t >= 0 && r.font >= 15, r);
  await shot('p116-citadel-small-640');
  await ev(() => { game.remarks.close('test'); });
  await page.setViewportSize({ width: 1366, height: 768 });
  // the before picture: the same resident, the old way (the box)
  r = await ev(() => { const G = game, R = G.remarks, n = G.npcs.find((x) => x.def.id === OR_ID); G.step(0.3, 1 / 30); R.on = false;
    OR.front(n); OR.press(); G.step(0.8, 1 / 30); return { state: G.state, box: G.hud.talking, speaker: G.speaker?.def?.id }; });
  check('A11 the old way (?remarks=box): the same resident opens the box (the before picture)', r.state === 'dialog' && r.box, r);
  await shot('p116-citadel-before');
  await ev(() => { P.settle(); game.remarks.on = true; });
}
// a story person keeps the full talk: someone of a chapter's cast (or Citadel's errand people) here
r = await ev(() => {
  const G = game, h = G.hero;
  const list = G.npcs.filter((n) => n.present && !n.def.minor && !n.ambient && !n.def.noTalk && (!G.room) && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 120)
    .sort((a, b) => Math.hypot(a.pos.x - h.pos.x, a.pos.z - h.pos.z) - Math.hypot(b.pos.x - h.pos.x, b.pos.z - h.pos.z));
  for (const n of list.slice(0, 8)) {
    if (!OR.front(n)) continue;
    OR.press(); G.step(0.6, 1 / 30);
    const out = { id: n.def.id, state: G.state, box: G.hud.talking, remark: !!G.remarks.cur, twoShot: !!G.talkers?.has(n), log: G.remarks.log.at(-1) };
    if (G.state !== 'play' || G.remarks.cur) return out;
  }
  return { none: list.map((n) => n.def.id) };
});
check('A12 a story person (not minor) still opens the full talk: the box (or their scene / shop), the talk camera\'s two-shot, no remark', !r.none && r.state !== 'play' && !r.remark && (r.state !== 'dialog' || (r.box && r.twoShot)), r);
await shot('p116-citadel-story-box');
await ev(() => { P.settle(); });
// the rule's other side: a long line or two sentences keep the box
r = await ev(() => { const S = game.remarks.constructor.short; return { one: S('Lovely day for it.'), ell: S('Well... the pipes again.'), two: S('The water is back. Hot, too!'), three: S('Late. Always late. Why I walk.'), four: S('Late. Always late. Why I walk. Ask Maro.'), at95: S('x'.repeat(95)), long: S('x'.repeat(96)), twoStrict: S('The water is back. Hot, too!', null, 1), ellStrict: S('Well... the pipes again.', null, 1) }; });
check('A13 the rule (TESTER-FIXES): a line of ≤ 95 characters and ≤ 3 sentences is a remark ("..." ends none); four sentences or over 95 characters keep the box; ?remarks=strict: one sentence', r.one && r.ell && r.two && r.three && !r.four && r.at95 && !r.long && !r.twoStrict && r.ellStrict, r);
// TESTER-FIXES (the desktop's 68.1, picture hw-68/18): of four residents by the square only Oda's line went overhead; Brix,
// Garrick and Dot opened the box. Each of the four spoken to by the key four times (their lines cycle): every time over
// the head, never the box; and their whole line sets (the _dry/_work/_n lines too) by the rule
r = await ev(() => {
  const G = game, R = G.remarks, out = {};
  for (const id of ['oda', 'brix', 'garrick', 'dot']) {
    const n = G.npcs.find((x) => x.def.id === id);
    if (!n?.present) { out[id] = 'absent'; continue; }
    const got = [];
    for (let k = 0; k < 4; k++) {
      if (!OR.front(n)) { got.push('no-prompt'); P.settle(); continue; }
      OR.press(); got.push(R.cur?.n === n ? 'remark' : (R.log.at(-1)?.why || G.state)); R.close('test'); P.settle();
    }
    out[id] = got;
  }
  return out;
});
const SETS = await ev(async () => {
  const { t } = await import('./src/game/i18n.js');
  const S = game.remarks.constructor.short, out = {};
  for (const id of ['oda', 'brix', 'garrick', 'dot']) { const keys = Object.keys((await import('./src/game/i18n.js')).STR.en).filter((k) => k.startsWith('rs_' + id + '_')); out[id] = keys.filter((k) => /_(dry|\d|work|home)$/.test(k) && !S(t(k))).map((k) => k + ': ' + t(k)); out[id + '_state'] = keys.filter((k) => !/_(dry|\d|work|home)$/.test(k) && !S(t(k))).map((k) => k); }
  return out;
});
check('A15 Oda, Brix, Garrick and Dot by the square (the desktop\'s four): each spoken to four times answers over its head every time (no box), and none of their idle lines (_dry, _0–_2, _work, _home) keeps the box by the rule (the longer story-state lines, _hot/_gone, listed)', Object.values(r).every((v) => Array.isArray(v) && v.every((w) => w === 'remark')) && Object.entries(SETS).every(([k, l]) => /_state$/.test(k) || !l.length), { talks: r, longLines: SETS });
await shot('p116-citadel-four');
// the sweep: who is minor here (by module) and every minor resident's generic line set by the rule
const SW = await ev(() => {
  const by = {};
  for (const d of game.story.npcDefs()) if (d.minor) { const k = d.minor + (d.area ? ':' + d.area : d.isle ? ':isle' : d.indoor ? ':room' : /^zr_/.test(d.id) ? ':zeelich' : ''); by[k] = (by[k] || 0) + 1; }
  return { by };
});
const SWL = await ev(async () => {
  const { t } = await import('./src/game/i18n.js');
  const G = game, S = G.remarks.constructor.short, C = G.story.citizens, out = { total: 0, short: 0, long: [], byMod: {} };
  for (const n of G.npcs) {
    if (!n.def.minor || !n.ambient) continue;
    let keys = []; try { keys = C.linesFor(n); } catch { continue; }
    const M = (out.byMod[n.def.minor] ||= { people: 0, lines: 0, short: 0 }); M.people++;
    for (const k of keys) { const v = t(k); for (const s of Array.isArray(v) ? v : [v]) { out.total++; M.lines++; if (!Array.isArray(v) && S(s)) { out.short++; M.short++; } else if (out.long.length < 6) out.long.push(k); } }
  }
  return out;
});
console.log('A sweep by module', JSON.stringify(SW.by));
check('A14 the sweep: minor residents of the residents\' modules are tagged (≥ 4 modules), and of their generic lines (citizens.js linesFor) at least a quarter are short enough to be remarks', Object.keys(SW.by).length >= 4 && SWL.total > 50 && SWL.short / SWL.total >= 0.25, { by: SW.by, share: +(SWL.short / SWL.total).toFixed(2), lines: SWL });

// ================================================================ B. Zeelich
await boot('base-05');
r = await ev(() => ({ chapter: game.flags.chapterKey, room: game.room?.id || 'out' }));
console.log('B boot', JSON.stringify(r));
const B = await ev(() => OR.find());
check('B1 Zeelich: a minor resident spoken to by the key answers over its head', !!B.id, B);
if (B.id) {
  const L = await ev(() => OR.look());
  const D = await ev(() => OR.during(1.0));
  check('B2 …in play, no box, the camera still, the resident turned to him', D.state === 'play' && !D.box && D.camMove < 0.15 && D.faced < 0.5 && D.up, D);
  checkVisual('B3 …the bubble over its head, ≥ 17 px, inside the screen', !!L && Math.abs((L.l + L.r) / 2 - L.headX) <= 30 && L.b <= L.headY + 4 && L.font >= 17 && L.l >= 0 && L.r <= L.vw, L);
  await shot('p116-zeelich-after');
  await ev((id) => { window.OR_ID = id; }, B.id);
  r = await ev(() => { const G = game, R = G.remarks, n = G.npcs.find((x) => x.def.id === OR_ID); R.close('test'); G.step(0.3, 1 / 30); R.on = false;
    OR.front(n); OR.press(); G.step(0.8, 1 / 30); return { state: G.state, box: G.hud.talking }; });
  check('B4 the old way: the same resident opens the box (the before picture)', r.state === 'dialog' && r.box, r);
  await shot('p116-zeelich-before');
  await ev(() => { P.settle(); game.remarks.on = true; });
}

// ================================================================ C. Hebrew
await boot('base-03', 'he');
const Cc = await ev(() => OR.find());
check('C1 Hebrew: a minor resident answers over its head', !!Cc.id, Cc);
if (Cc.id) {
  await ev(() => game.step(0.4, 1 / 30));
  const L = await ev(() => OR.look());
  check('C2 …its text is Hebrew and turns right to left inside the bubble only (unicode-bidi plaintext; the bubble keeps the page\'s ltr)', !!L && /[֐-׿]/.test(L.text) && L.bidi === 'plaintext' && L.dir === 'ltr', L);
  checkVisual('C3 …over the head, inside the screen, ≥ 17 px (Hebrew 10 % larger: --txs)', !!L && L.l >= 0 && L.r <= L.vw && L.font >= 17 && Math.abs((L.l + L.r) / 2 - L.headX) <= 30, L);
  await shot('p116-hebrew-after');
}
await browser.close();
process.exit(done());
