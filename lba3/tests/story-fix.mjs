// STORY-FIX (19.11.2026, docs/lba-maturity/STORY-FIX.md): the lines changed for the three story contradictions and the
// residents heard in the wrong state, checked in the running game. Staged, not played: a new game is started, then the
// story's own index and flags are set for each state and the residents' own code (hostel.js talkFirst, desertlife.js
// interact, ihomes.js talkFirst, kesh.js lifePhase) is asked what it says; every line said is read from game.say.
// It shows which line each state now picks and that the edited texts load (English and Hebrew); it cannot say how they
// read. Run: GAME_URL=… node tests/story-fix.mjs
import { launch, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 640, height: 360 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 300000 });
await page.click('[data-act="new"]', { timeout: 120000 });
await page.waitForFunction(() => window.game?.story?.chapters?.length > 4, null, { timeout: 120000 });

const r = await ev(async () => {
  const G = window.game, S = G.story, f = G.flags;
  const { t, STR } = await import(new URL('src/game/i18n.js', location.href).href);
  G.testFreeze = true;
  const said = [];
  const say0 = G.say.bind(G);
  G.say = (name, lines, done, ...rest) => { for (const l of [].concat(lines)) said.push(String(l)); done?.(); };
  const idx = (k) => S.chapters.findIndex((c) => c.key === k);
  const at = (k) => { f.chapterKey = k; f.chapter = idx(k); };   // (story.index is read from the flags)
  const out = { keys: S.chapters.map((c) => c.key) };
  const flags0 = { ...f };
  try {
    // ---- the texts (English and Hebrew)
    const keys = ['c4_tw_d1', 'c5_tw_gate2', 'ev_z_go', 'ev_j_board', 'pr_gil_told', 'c1_zoe_home3', 'c5_zoe_radio1', 'idle_zoe_pass', 'dl_board', 'rs_tamu_kafter', 'ih_hanna_after'];
    out.en = Object.fromEntries(keys.map((k) => [k, t(k)]));
    out.he = Object.fromEntries(keys.map((k) => [k, STR.he?.[k] ?? null]));
    out.cookHe = STR.he?.hs_cook_l; out.foremanHe = STR.he?.hs_foreman_v;
    // ---- the hostel: the cook in chapter 9, chapter 12 and the epilogue; the foreman in chapter 1
    const npcs = {}, talk = (id) => { said.length = 0; S.hostel.talkFirst((npcs[id] ||= { def: { id } })); return said.slice(); };   // (one object per speaker: talkFirst counts its turns on it)
    out.cook = {};
    for (const k of ['council', 'core', 'home']) { at(k); out.cook[k] = { phase: S.hostel.phase(), line: talk('hs_cook')[0] }; }
    at(S.chapters[0].key);
    out.foreman1 = { phase: S.hostel.phase(), lines: [talk('hs_foreman')[0], talk('hs_foreman')[0], talk('hs_foreman')[0]] };
    // ---- Kesh: the state, the board, Hanna
    const board = () => { said.length = 0; S.dlife.interact({ kind: 'dl_read', id: 'board' }); return said[0]; };
    const hanna = () => { said.length = 0; try { S.ihomes.talkFirst({ def: { id: 'ih_hanna' } }); } catch (e) { return 'ERR ' + e.message; } return said[0] || null; };
    out.kesh = {};
    const states = [['steam', { c5_planned: true, c5_ferryTaken: true }], ['steam-vent', { c5_planned: true, c5_ferryTaken: true, c5_vent: true }], ['pass', {}], ['council', {}], ['network', {}], ['shell', {}], ['home', {}]];
    for (const [label, fl] of states) {
      for (const k of ['c5_planned', 'c5_ferryTaken', 'c5_vent']) delete f[k];
      Object.assign(f, fl, { c4_pump: true });
      at(label.replace('-vent', ''));
      out.kesh[label] = { life: S.kesh.lifePhase(), board: board(), hanna: hanna() };
    }
  } finally {
    for (const k of Object.keys(f)) if (!(k in flags0)) delete f[k];
    Object.assign(f, flags0);
    G.say = say0;
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));

const E = r.en, H = r.he;
check('Dallan: Twinsen names project security on Zeelich, not Dallan\'s guards', /^Project security took/.test(E.c4_tw_d1) && /אבטחת המיזם/.test(H.c4_tw_d1), [E.c4_tw_d1, H.c4_tw_d1]);
check('Dallan: the gate line quotes what he said at the dig, not "on Zeelich"', /Your words, at the dig/.test(E.c5_tw_gate2) && !/Zeelich/.test(E.c5_tw_gate2) && /בחפירה/.test(H.c5_tw_gate2), [E.c5_tw_gate2, H.c5_tw_gate2]);
check('Chapter 8: Zoé says why the lane takes the list cart (they are on the list)', /on the list/.test(E.ev_z_go) && /ברשימה/.test(H.ev_z_go), [E.ev_z_go, H.ev_z_go]);
check('Chapter 8: the journal says where the cart went and who the shelters are for', /ships' queue on the bridge/.test(E.ev_j_board) && /shelters/.test(E.ev_j_board) && /המקלטים/.test(H.ev_j_board), [E.ev_j_board]);
check('Gilbert: his chapter-1 line ties him to Arthur', /taught Arthur/.test(E.pr_gil_told) && /ארתור/.test(H.pr_gil_told), [E.pr_gil_told, H.pr_gil_told]);
check('Gilbert: "Grandpa\'s radio" is named as Grandpa Gilbert\'s the first time', /Grandpa Gilbert's radio/.test(E.c1_zoe_home3) && /סבא גילברט/.test(H.c1_zoe_home3), [E.c1_zoe_home3]);
check('Gilbert: Zoé to Twinsen says "Gilbert\'s charts" (no unexplained Grandpa)', /Gilbert's old charts/.test(E.c5_zoe_radio1) && /Gilbert's old charts/.test(E.idle_zoe_pass) && /גילברט/.test(H.c5_zoe_radio1) && /גילברט/.test(H.idle_zoe_pass), [E.c5_zoe_radio1, E.idle_zoe_pass]);
check('Hostel: the cook\'s chapter-9-on line holds in 9, 12 and the epilogue ("Soon", no "when this is all done")', ['council', 'core', 'home'].every((k) => r.cook[k].phase === 'l' && /^Soon I cook/.test(r.cook[k].line || '')) && /בקרוב/.test(r.cookHe?.[0] || ''), r.cook);
check('Hostel: the foreman in chapter 1 does not name Vesk', r.foreman1.phase === 'v' && r.foreman1.lines.every((l) => !/Vesk/.test(l || '')) && r.foreman1.lines.some((l) => /chief engineer/.test(l || '')) && !/וסק/.test(r.foremanHe?.[1] || ''), r.foreman1);
const K = r.kesh;
check('Kesh: chapter 5 after the vent is Kesh\'s "after", and its board still says NO FERRY', K['steam-vent'].life === 'after' && /NO FERRY/.test(K['steam-vent'].board || ''), K['steam-vent']);
check('Kesh: before the vent (chapter 5) the board says NO FERRY as before', K.steam.life === 'steam' && /NO FERRY/.test(K.steam.board || ''), K.steam);
check('Kesh: from chapter 6 on (6, 9, 11) the board has the ferry back and no stale "HESK IS NORTH"', ['pass', 'council', 'shell'].every((k) => K[k].life === 'after' && /ferry's line is back/.test(K[k].board || '') && !/NORTH/.test(K[k].board || '')), K);
check('Kesh: chapter 10 and the epilogue keep their own board lines', /HESK IS EVERYWHERE/.test(K.network.board || '') && /TAMU WAS FIRST/.test(K.home.board || ''), [K.network, K.home]);
check('Kesh: Hanna\'s "after" line holds whether Hesk has flown yet or not', ['steam-vent', 'pass', 'council', 'shell'].every((k) => /stays made for whenever he's back/.test(K[k].hanna || '')), K);
check('Kesh: Tamu\'s "after" line is about the vent, true from the vent on', /When the vent blew/.test(E.rs_tamu_kafter) && /הפתח/.test(H.rs_tamu_kafter), [E.rs_tamu_kafter]);
await browser.close();
done();
