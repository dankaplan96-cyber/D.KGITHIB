// HE-TEXT (the user, 16.11: the whole game in Hebrew too, switched by the language setting; English the default):
//   1. Settings → Game → Language: עברית, chosen as a player does (a click): the page turns right to left, the menus
//      Hebrew; the choice is kept after a reload
//   2. a new game in Hebrew: the house's tip panel (the goal, the key as a <kbd>) right to left, Hebrew, inside the screen
//   3. the cupboard and the yard (P.openingYard): Zoé's conversation in Hebrew in a right-to-left box, her name Hebrew,
//      nothing spills (scrollWidth <= clientWidth, the box inside the screen) at 1280×720 and 1920×1080
//   4. the voice speaks the English line: every line voiced while the box showed Hebrew was given its English source
//      (the voice's own record, babble.said; a spy on the line it planned), none in Hebrew
//   5. the objective (the HUD and the pause menu) in Hebrew; the inventory and the journal in Hebrew, right to left,
//      nothing scrolls or spills
//   6. back to English in Settings: left to right, the objective, the menus and a new line in English
// SHOTS=1 writes the chapter 1–2 pictures for the user to captures/hebrew/ (1920×1080, jpg).
// Automated runtime only: it shows the Hebrew is on screen, laid out and voiced from the English; it cannot say
// whether a line reads well in its scene.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CAP = fileURLToPath(new URL('../captures/hebrew/', import.meta.url));
const SHOTS = !!process.env.SHOTS;
if (SHOTS) mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: CAP + n + '.jpg', type: 'jpeg', quality: 84, timeout: 180000 }); };
const HEB = /[֐-׿]/;

// the layout checks: a box and its text inside the screen, nothing wider than its box
const helpers = () => ev(() => {
  window.HE = {
    fit(sel) {
      const el = document.querySelector(sel), r = el?.getBoundingClientRect();
      if (!el || el.classList.contains('hidden') || !r.width || !r.height) return { sel, shown: false };
      const o = { sel, shown: true, dir: getComputedStyle(el).direction, w: el.scrollWidth, cw: el.clientWidth, h: el.scrollHeight, ch: el.clientHeight };
      // (an LBA frame's corner marks sit 4 px outside its border by design, style.css .lba-frame: they are no spill)
      const slack = el.matches('.lba-frame') ? 5 : 1;
      o.inside = r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
      o.ok = o.inside && o.w <= o.cw + slack && o.h <= Math.max(o.ch, el.offsetHeight) + slack + 1;
      o.text = el.textContent.slice(0, 90);
      return o;
    },
    tip() { return document.querySelector('#tip.show')?.textContent || ''; },
    // every line put in the dialogue box and what the voice was given for it
    spy() {
      const B = game.audio.babble;
      window.__voiced = [];
      if (!B.__spy) { const ol = B._line.bind(B); B._line = (txt) => { window.__voiced.push({ shown: B.text, said: txt }); return ol(txt); }; B.__spy = true; }
    },
    settleFound() { for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(0.4); },
  };
});
// Settings → Game → Language, by clicks on the title screen
const chooseLang = async (v) => {
  await page.click('[data-act="settings"]');
  await page.click(`#settings .seg[data-setting="lang"] button[data-v="${v}"]`);
  await page.click('#settings .menu button');
};

// ---------------------------------------------------------------- 1. the setting
await open(page, '?nocine');
await ev(() => localStorage.clear());
await open(page, '?nocine');
const en0 = await ev(() => ({ dir: document.documentElement.dir, lang: game.settings.lang, nw: document.querySelector('[data-act="new"]').textContent }));
check('English is the default (a fresh profile): left to right, English menus', en0.dir === 'ltr' && en0.lang === 'en' && en0.nw === 'New Game', en0);
await chooseLang('he');
const he1 = await ev(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, set: game.settings.lang, nw: document.querySelector('[data-act="new"]').textContent, st: document.querySelector('[data-act="settings"]').textContent }));
check('Settings → Language → עברית: the page right to left, the title menu Hebrew', he1.dir === 'rtl' && he1.lang === 'he' && he1.set === 'he' && he1.nw === 'משחק חדש' && he1.st === 'הגדרות', he1);
await open(page, '?nocine');
const he2 = await ev(() => ({ dir: document.documentElement.dir, set: game.settings.lang, nw: document.querySelector('[data-act="new"]').textContent }));
check('the choice is kept after a reload', he2.dir === 'rtl' && he2.set === 'he' && he2.nw === 'משחק חדש', he2);

// ---------------------------------------------------------------- 2. the house
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 900000 });
await ev(() => { game.testFreeze = true; game.step(1.2); });
await helpers();
await ev(() => { P.yardFirst = false; HE.spy(); });
const house = await ev(() => ({ tip: HE.tip(), kbd: !!document.querySelector('#tip.show kbd'), fit: HE.fit('#tip.show'), obj: document.querySelector('#objective')?.textContent || '' }));
check('the house: the tip panel in Hebrew (the goal: the magic ball), its key a <kbd>, right to left, inside the screen', /לקחת את כדור הקסם מהארון/.test(house.tip) && house.kbd && house.fit.dir === 'rtl' && house.fit.ok, house);
// Arthur at his boat (optional): his conversation in a Hebrew box
const ar = await ev(() => {
  const a = P.npc('arthur'); P.go(a.pos.x + 1.1, a.pos.z - 1.1, { tol: 0.35 }); P.face(a.pos.x, a.pos.z); game.step(0.6);
  const prompt = document.querySelector('#prompt.show')?.textContent || '';
  P.tap('KeyE', 0.05); game.step(1.6);
  return { prompt, state: game.state, name: document.querySelector('#dialog .name')?.textContent, text: document.querySelector('#dialog .text')?.textContent, dir: document.querySelector('#dialog').dir, fit: HE.fit('#dialog'), textFit: HE.fit('#dialog .text') };
});
check('Arthur in the house: "דיבור" in the prompt; a Hebrew dialogue box, right to left, his name ארתור, inside the screen', /דיבור/.test(ar.prompt) && ar.state === 'dialog' && ar.name === 'ארתור' && HEB.test(ar.text || '') && ar.dir === 'rtl' && ar.fit.dir === 'rtl' && ar.fit.ok && ar.textFit.ok, ar);
if (SHOTS) { await page.setViewportSize({ width: 1920, height: 1080 }); await shot('01-house-dialogue'); await page.setViewportSize({ width: 1280, height: 720 }); }
const cup = await ev(() => {
  P.settle();
  const sp = game.room.searches.find((x) => x.id === 'cupboard');
  P.go(sp.x, sp.z, { tol: 1.4 }); game.step(0.8);
  const near = HE.tip();
  P.use(sp.x, sp.z); HE.settleFound();
  return { near, ball: game.hero.hasBall, voiced: (window.__voiced || []).map((x) => x.shown) };
});
check('by the cupboard: "חיפוש בארון" with the key; the ball taken, his lines in Hebrew', /חיפוש בארון/.test(cup.near) && cup.ball && cup.voiced.some((x) => /ידיד ותיק/.test(x)), cup);
await ev(() => { HE.settleFound(); game.step(1.0); });
const out = await ev(() => { const e = game.room.exits.find((x) => x.to === 'outdoor'); P.settle(); P.through(e.x, e.z); game.step(1.0); return { room: game.room?.id ?? 'out', tip: HE.tip(), fit: HE.fit('#tip.show') }; });
check('out in the yard: the tip panel says, in Hebrew, to talk to Zoé (right to left, inside the screen)', out.room === 'out' && /לדבר עם זואי/.test(out.tip) && out.fit.ok && out.fit.dir === 'rtl', out);
if (SHOTS) { await page.setViewportSize({ width: 1920, height: 1080 }); await ev(() => game.step(0.3)); await shot('02-yard-tip'); await page.setViewportSize({ width: 1280, height: 720 }); }

// ---------------------------------------------------------------- 3. Zoé, in the yard (her words read, then the rest of the yard)
const zoe = await ev(() => {
  const z = P.npc('zoe'); P.go(z.pos.x, z.pos.z, { tol: 1.6, stopWhen: () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; } });
  P.face(z.pos.x, z.pos.z); game.step(0.4);
  const prompt = document.querySelector('#prompt.show')?.textContent || '';
  P.tap('KeyE', 0.05); game.step(3.0);
  const r = { prompt, state: game.state, name: document.querySelector('#dialog .name')?.textContent, text: document.querySelector('#dialog .text')?.textContent, dir: document.querySelector('#dialog').dir, fit: HE.fit('#dialog'), textFit: HE.fit('#dialog .text') };
  return r;
});
check('Zoé: "דיבור" in the prompt; her conversation in Hebrew, her name זואי, the box right to left', /דיבור/.test(zoe.prompt) && zoe.state === 'dialog' && zoe.name === 'זואי' && HEB.test(zoe.text || '') && zoe.dir === 'rtl', zoe);
check('Zoé\'s box at 1280×720: nothing spills (the text no wider than its box, the box inside the screen)', zoe.fit.ok && zoe.textFit.ok, { box: zoe.fit, text: zoe.textFit });
await page.setViewportSize({ width: 1920, height: 1080 });
const zoeBig = await ev(() => { game.step(0.1); return { fit: HE.fit('#dialog'), textFit: HE.fit('#dialog .text') }; });
check('Zoé\'s box at 1920×1080: nothing spills', zoeBig.fit.ok && zoeBig.textFit.ok, zoeBig);
await shot('03-yard-zoe-dialogue');
await page.setViewportSize({ width: 1280, height: 720 });
const yard = await ev(() => { P.settle(); HE.settleFound(); const did = P.openingYard(); P.settle(); game.step(0.6); return { did, tip: HE.tip(), state: game.state, overflow: (window.__overflow || []).slice(0, 6) }; });
check('the rest of the yard plays in Hebrew (the inventory, the tap, the barrels, the pipe); no dialogue box spilled on the way (P.fits)', yard.state === 'play' && yard.did.length >= 3 && !yard.overflow.length, yard);

// ---------------------------------------------------------------- 4. the voice: the English line
const voiced = await ev(async () => {
  const { STR } = await import('/src/game/i18n.js');
  const en = new Set(); for (const v of Object.values(STR.en)) { if (typeof v === 'string') en.add(v.replace(/\s+/g, ' ').trim()); else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') en.add(x.replace(/\s+/g, ' ').trim()); }
  const L = window.__voiced || [];
  const heb = L.filter((x) => /[֐-׿]/.test(x.shown));
  const bad = heb.filter((x) => /[֐-׿]/.test(x.said) || !en.has(String(x.said).replace(/\s+/g, ' ').trim()));
  return { lines: L.length, hebrewShown: heb.length, bad: bad.slice(0, 5), sample: heb.slice(0, 3), said: game.audio.babble.said };
});
check('the voice speaks the English: every line shown in Hebrew was voiced from its English source (none voiced in Hebrew)', voiced.hebrewShown >= 4 && !voiced.bad.length, voiced);

// ---------------------------------------------------------------- 5. the objective, the pause menu, the inventory and the journal
const obj = await ev(() => { game.updateObjective(); game.step(0.2); const o = document.querySelector('#objective'); return { text: o.textContent, dir: getComputedStyle(o).direction }; });
check('the objective in Hebrew (the well), right to left', /הבאר/.test(obj.text) && obj.dir === 'rtl', obj);
const pause = await ev(() => { P.tap('Escape', 0.1); game.step(0.1); const o = document.querySelector('#pause-objective'); const r = { state: game.state, text: o?.textContent || '', fit: HE.fit('#pause-objective'), resume: document.querySelector('#pause [data-act="resume"]')?.textContent }; return r; });
check('the pause menu: its objective in Hebrew and inside the screen, "חזרה למשחק"', pause.state === 'pause' && HEB.test(pause.text) && pause.fit.ok && pause.resume === 'חזרה למשחק', pause);
await ev(() => { for (let i = 0; i < 4 && game.state !== 'play'; i++) P.tap('Escape', 0.1); game.step(0.2); });
const FIT = () => ev(() => {
  const el = document.querySelector('#inventory'), P0 = el.querySelector('.inv-panel'), bad = [];
  for (const e of [el, P0, ...P0.querySelectorAll('.inv-head, .inv-body, .inv-info, .inv-text, .inv-now, .inv-jbody, .inv-secs, .inv-lines, .inv-foot')]) {
    const slack = e.matches('.lba-frame') || e.querySelector('.lba-frame') ? 4 : 1;
    if (e.scrollWidth > e.clientWidth + slack || e.scrollHeight > e.clientHeight + slack) bad.push(`${e.className} ${e.scrollWidth}/${e.clientWidth} ${e.scrollHeight}/${e.clientHeight}`);
  }
  const r = P0.getBoundingClientRect();
  return { bad, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, dir: getComputedStyle(P0).direction, title: el.querySelector('.inv-tabs [data-tab="items"]')?.textContent, jtitle: el.querySelector('.inv-tabs [data-tab="journal"]')?.textContent, name: el.querySelector('.inv-name, .inv-info h3, .inv-info b')?.textContent || '', text: el.querySelector('.inv-panel').textContent.slice(0, 160) };
});
const sizes = {};
for (const [w, h] of [[1280, 720], [1920, 1080]]) {
  await page.setViewportSize({ width: w, height: h });
  await ev(() => { if (game.state !== 'inventory') P.tap('KeyI', 0.2); game.inventory.setTab('items'); game.inventory.render(); });
  const items = await FIT();
  if (w === 1920) await shot('04-inventory');
  await ev(() => { game.inventory.setTab('journal'); });
  const journal = await FIT();
  if (w === 1920) await shot('05-journal');
  sizes[`${w}x${h}`] = { items, journal };
}
const I0 = sizes['1280x720'], I1 = sizes['1920x1080'];
check('the inventory and the journal in Hebrew (חפצים / יומן), right to left', I0.items.title === 'חפצים' && I0.items.jtitle === 'יומן' && I0.items.dir === 'rtl' && HEB.test(I0.journal.text), I0);
check('the inventory and the journal: nothing scrolls or spills, inside the screen, at 1280×720 and 1920×1080', [I0, I1].every((s) => !s.items.bad.length && !s.journal.bad.length && s.items.inside && s.journal.inside), sizes);
await ev(() => { for (let i = 0; i < 4 && game.state !== 'play'; i++) P.tap('Escape', 0.1); game.step(0.2); });
await page.setViewportSize({ width: 1280, height: 720 });

// ---------------------------------------------------------------- 6. back to English
const back = await ev(() => {
  game.settings.lang = 'en'; game.applySettings(); game.saveSettings?.();
  game.updateObjective(); game.step(0.2);
  return { dir: document.documentElement.dir, obj: document.querySelector('#objective').textContent };
});
const backLine = await ev(async () => { const { t } = await import('/src/game/i18n.js'); game.say('n_zoe', [t('op_zoe_5')]); game.step(2.0); const r = { text: document.querySelector('#dialog .text')?.textContent, dir: document.querySelector('#dialog').dir, said: game.audio.babble.said }; P.settle(); return r; });
check('back to English in Settings: left to right, the objective and a new line in English (the voice the same)', back.dir === 'ltr' && /well/i.test(back.obj) && !HEB.test(back.obj) && backLine.dir === 'ltr' && backLine.text === 'Take your magic ball. Just in case.' && backLine.said === backLine.text, { back, backLine });

await done();
await browser.close();
