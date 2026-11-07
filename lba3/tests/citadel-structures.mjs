// CITADEL-STANDS (the user, 7.11.2026, a photo of the spaceport deck: "another structure that's just there"): Citadel's
// small structures that look usable each do something (src/game/story/stands.js; the list:
// docs/lba-maturity/citadel-structures.md). By input, in chapter 1 (grounded, the well dry), chapter 5 (flying) and
// chapter 8 (the evacuation):
//   - Corla stands behind the TICKETS · INFO kiosk's counter and talks; her line follows the chapter; while the
//     spaceship flies her talk ends in the spaceship's menu and a pick flies him to Zeelich; in chapters 1 and 8 no menu;
//   - every structure on the list gives its prompt from in front of it and a line of its own (never "Locked.");
//   - the drinking fountains are dry in chapter 1 and give back a little life once the water runs;
//   - the notice boards' text changes with the town's state.
// SHOTS=dir writes the kiosk with Corla in it.
// ISO (logged): the chapters by their flags; he is put 3 m before each structure (walking up to it and E are input).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker();
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.jpg'), type: 'jpeg', quality: 75, timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });

await open(page, '?nocine'); await menu(page, 'new');
const setCh = (key, extra = {}) => ev(({ key, extra }) => { const G = game, f = G.flags; Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, ...extra }); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.refreshCast(); if (G.room) { G.exitRoom({ x: -30, z: 40, a: Math.PI / 2 }, true); } P.settle(); }, { key, extra });
// every structure: walk up from 3 m before it (ISO: put there), face it, E (input); what it said
const tour = () => ev(() => {
  const G = game, S = G.story.stands, out = [];
  for (const it of S.things()) {
    const a = Math.atan2(-30 - it.x, 40 - it.z);   // (from the side toward the town's lane)
    let best = null;
    for (let k = 0; k < 8 && !best; k++) {
      const b = a + k * Math.PI / 4, sx = it.x + Math.sin(b) * 3, sz = it.z + Math.cos(b) * 3;
      if (G.physics.blockedAt(sx, sz, G.physics.groundAt(sx, sz, 60) + 0.3, 0.4)) continue;
      G.hero.pos.set(sx, G.physics.groundAt(sx, sz, 60), sz); G.hero.vy = 0; P.settle();
      P.go(it.x, it.z, { tol: Math.max(0.5, it.r - 0.5), maxT: 20, fight: false, stopWhen: () => P.target()?.kind === it.kind }); P.face(it.x, it.z);
      const tg = P.target();
      if (tg?.kind === it.kind) best = tg;
    }
    if (!best) { out.push({ kind: it.kind, key: it.key || it.which, prompt: false }); continue; }
    const hp0 = G.hero.hp;
    P.tap('KeyE', 0.1);
    const s = P.settle();
    out.push({ kind: it.kind, key: it.key || it.which, prompt: true, lines: s.lines, hp: G.hero.hp - hp0 });
  }
  return out;
});
const corla = (pick) => ev((pick) => {
  const G = game, n = P.npc('cs_corla');
  if (!n?.present) return { r: 'absent' };
  const inKiosk = Math.hypot(n.pos.x + 10.4, n.pos.z - 45.5) < 0.6;
  // from the walkway, before the hatch
  G.hero.pos.set(-10.4, G.physics.groundAt(-10.4, 42.6, 60), 42.6); G.hero.angle = 0; P.settle();
  P.go(-10.4, 44.1, { tol: 0.3, maxT: 10, fight: false }); P.face(n.pos.x, n.pos.z);
  const tg = P.target();
  P.tap('KeyE', 0.1);
  let lines = 0; while (G.state === 'dialog' && lines < 6) { P.tap('KeyE', 0.15); lines++; }
  G.step(0.2);
  const menuOpen = G.state === 'shop', items = [...document.querySelectorAll('#shop .item')].map((b) => b.textContent);
  let room = null;
  if (menuOpen && pick) { P.menuPick(0); P.settle(60); room = G.room?.id ?? 'citadel'; }
  else if (menuOpen) { P.tap('Escape', 0.1); P.settle(); }
  return { r: 'ok', inKiosk, target: tg?.kind + ':' + tg?.id, lines, menuOpen, items, room, state: G.state };
}, pick);

// ---- chapter 1: grounded, the well dry
iso('chapter 1 by its flags, on Citadel by the lane');
await setCh('well');
await said();
const c1 = await corla(false);
const l1 = await said();
check('chapter 1: Corla stands in the kiosk, talks (grounded), and sells nothing', c1.inKiosk && c1.target === 'npc:cs_corla' && !c1.menuOpen && l1.some((l) => /grounded/i.test(l)), { c1, l1 });
await shot('kiosk-ch1');
const t1 = await tour();
const s1 = await said();
check('chapter 1: every structure on the list gives its prompt and a line of its own', t1.length >= 10 && t1.every((x) => x.prompt) && s1.length >= t1.length && !s1.some((l) => /^Locked\.?$/.test(l)), { t1, s1 });
check('chapter 1: the drinking fountains are dry', s1.filter((l) => /^Dry\./.test(l)).length === 2, s1.filter((l) => /Dry|water/i.test(l)));
const board1 = s1.find((l) => l.startsWith('NOTICES'));

// ---- chapter 5: flying
iso('chapter 5 by its flags');
await setCh('steam');
await ev(() => { game.hero.hp = Math.max(1, game.hero.maxHp - 4); });
const t5 = await tour();
const s5 = await said();
check('chapter 5: the fountains give back a little life once the water runs', t5.filter((x) => x.kind === 'cs_fount').some((x) => x.hp > 0) && !s5.some((l) => /^Dry\./.test(l)), { t5: t5.filter((x) => x.kind === 'cs_fount'), s5: s5.filter((l) => /water|Warm|Cool/i.test(l)) });
const board5 = s5.find((l) => l.startsWith('NOTICES'));
check('the square\'s notice board follows the town (chapter 1 ≠ chapter 5)', board1 && board5 && board1 !== board5, { board1, board5 });
const c5 = await corla(true);
const l5 = await said();
check('chapter 5: Corla sells the seat: her line, then the spaceship menu; a pick flies him to Zeelich', c5.inKiosk && c5.menuOpen && c5.items.length >= 1 && c5.room === 'zeelich' && l5.length >= 1, { c5, l5 });

// ---- chapter 8: the evacuation
iso('chapter 8 by its flags, back on Citadel');
await setCh('evacuation');
const c8 = await corla(false);
const l8 = await said();
check('chapter 8: Corla hands out directions, no seats (no menu)', c8.inKiosk && !c8.menuOpen && l8.some((l) => /list/i.test(l)), { c8, l8 });
done();
await browser.close();
