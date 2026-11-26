// HE-TEXT (the user, 16.11: the whole game in Hebrew too, switched by the language setting; English the default) and
// HE-LTR (the user, 17.11: "When the game is in Hebrew, switching between the modes is also reversed with the arrows.
// In Hebrew, the ONLY thing that should be RTL is the text; everything else as in the English version"):
//   1. Settings → Game → Language: עברית, chosen as a player does (a click): the menus Hebrew, the page still left to
//      right; the choice is kept after a reload
//   2. a new game in Hebrew: the house's tip panel where English has it (left), its goal read right to left, its key
//      hint laid out as in English (the key caps on the left, ← before →)
//   3. Arthur and Zoé: Hebrew boxes, the name tag at the top right (P138, the user's pick 26.11: over where the Hebrew line starts), the line read right to left, nothing spills at
//      1280×720 and 1920×1080; the cupboard and the rest of the yard (P.openingYard)
//   4. the voice speaks the English line (a spy on the voice's line), none in Hebrew
//   5. the objective (HUD and pause), the settings page (tabs and choices in English's order; → takes the next choice
//      and turns a slider up), the behaviour menu (Ctrl + →: Normal → Athletic, the box on the right), the inventory
//      (tabs, slots in English's order; → the next slot) and the journal: the texts read right to left, nothing
//      scrolls or spills at both sizes; an audit of every Hebrew paragraph on those surfaces
//   6. back to English: the same arrows do the same; English untouched (no key-hint markup, the texts left to right)
// SHOTS=after (or before) writes captures/he-ltr/<SHOTS>-*.jpg at 1920×1080: the dialogue box, the yard's tip, the
// inventory, the journal, the settings page, the behaviour menu. (SHOTS=1: captures/hebrew/ as before.)
// Automated runtime only: it shows the Hebrew is on screen, laid out and voiced from the English; it cannot say
// whether a line reads well in its scene.
import { launch, open, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const SHOTS = process.env.SHOTS || '';
const CAP = fileURLToPath(new URL(SHOTS && SHOTS !== '1' ? '../captures/he-ltr/' : '../captures/hebrew/', import.meta.url));
const PRE = SHOTS && SHOTS !== '1' ? SHOTS + '-' : '';
if (SHOTS) mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const step = (s) => ev((s) => game.step(s), s);
const shot = async (n) => { if (!SHOTS) return; await page.waitForTimeout(300); await ev(() => { game.renderer.resize(); game.frame(1 / 60, true); });   // (a frame drawn as the game draws it: the behaviour menu's portraits too)
  await page.screenshot({ path: CAP + PRE + n + '.jpg', type: 'jpeg', quality: 84, timeout: 180000 }); };
const big = async (f) => { await page.setViewportSize({ width: 1920, height: 1080 }); await step(0.1); const r = await f(); await page.setViewportSize({ width: 1280, height: 720 }); await step(0.1); return r; };
const HEB = /[֐-׿]/;

// the layout checks: a box and its text inside the screen, nothing wider than its box; which way a text reads
const helpers = () => ev(() => {
  window.HE = {
    fit(sel) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel, r = el?.getBoundingClientRect();
      if (!el || el.classList.contains('hidden') || !r.width || !r.height) return { sel, shown: false };
      const o = { sel: typeof sel === 'string' ? sel : el.className, shown: true, w: el.scrollWidth, cw: el.clientWidth, h: el.scrollHeight, ch: el.clientHeight };
      // (an LBA frame's corner marks sit 4 px outside its border by design, style.css .lba-frame: they are no spill)
      const slack = el.matches('.lba-frame') ? 5 : 1;
      o.inside = r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
      o.ok = o.inside && o.w <= o.cw + slack && o.h <= Math.max(o.ch, el.offsetHeight) + slack + 1;
      o.text = el.textContent.slice(0, 90);
      return o;
    },
    // which way an element's first line runs on screen: its first letter at the line's right end (rtl) or left (ltr)
    reads(sel) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el) return null;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ch = [];
      for (let n; (n = w.nextNode());) for (let i = 0; i < n.data.length; i++) {
        if (/\s/.test(n.data[i])) continue;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect();
        if (b.width) ch.push(b);
      }
      if (ch.length < 2) return null;
      const f = ch[0], line = ch.filter((b) => Math.abs(b.top - f.top) < f.height / 2);
      if (line.length < 2) return 'one';
      const L = Math.min(...line.map((b) => b.left)), R = Math.max(...line.map((b) => b.right));
      return f.right >= R - 1 ? 'rtl' : f.left <= L + 1 ? 'ltr' : 'mixed';
    },
    x(sel) { const e = typeof sel === 'string' ? document.querySelector(sel) : sel; const r = e?.getBoundingClientRect(); return r ? Math.round(r.left + r.width / 2) : null; },
    // every paragraph on a surface whose text starts in Hebrew reads right to left (a key-led hint, .kl, left to right
    // by design: English's arrangement). A paragraph: an element (not inline) holding text of its own or inline only
    audit(rootSel) {
      const root = document.querySelector(rootSel); if (!root) return { root: rootSel, missing: true };
      const bad = [], seen = [];
      for (const el of root.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'inline' || cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
        if (el.closest('.kl, kbd, body [dir="ltr"]')) continue;   // (the page's own dir=ltr is no exception)
        const kids = [...el.childNodes];
        if (!kids.some((n) => n.nodeType === 3 && n.data.trim()) && !(kids.length && kids.every((n) => n.nodeType === 3 || (n.nodeType === 1 && getComputedStyle(n).display === 'inline')))) continue;
        const txt = [...el.childNodes].map((n) => (n.nodeType === 1 && (n.matches('kbd, .kg, .kl') || getComputedStyle(n).unicodeBidi !== 'normal') ? '' : n.textContent)).join('');
        const m = /[A-Za-z֐-׿]/.exec(txt);
        if (!m || !HEB.test(m[0]) || el.querySelector('.kl')) continue;
        const r = HE.reads(el);
        seen.push(r);
        if (r !== 'rtl' && r !== 'one' && r !== null) bad.push({ el: el.tagName + '.' + el.className, r, t: el.textContent.slice(0, 50) });
      }
      return { root: rootSel, paragraphs: seen.length, bad: bad.slice(0, 6) };
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
  const HEB = /[֐-׿]/;
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
await helpers();
const he1 = await ev(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, set: game.settings.lang, nw: document.querySelector('[data-act="new"]').textContent, st: document.querySelector('[data-act="settings"]').textContent, reads: HE.reads('[data-act="new"]') }));
check('Settings → Language → עברית: the title menu Hebrew (read right to left), the page still left to right (HE-LTR)', he1.dir === 'ltr' && he1.lang === 'he' && he1.set === 'he' && he1.nw === 'משחק חדש' && he1.st === 'הגדרות' && he1.reads === 'rtl', he1);
await open(page, '?nocine');
const he2 = await ev(() => ({ dir: document.documentElement.dir, set: game.settings.lang, nw: document.querySelector('[data-act="new"]').textContent }));
check('the choice is kept after a reload (left to right)', he2.dir === 'ltr' && he2.set === 'he' && he2.nw === 'משחק חדש', he2);

// ---------------------------------------------------------------- 2. the house
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 900000 });
await ev(() => { game.testFreeze = true; game.step(1.2); });
await helpers();
await ev(() => { P.yardFirst = false; HE.spy(); });
const house = await ev(() => {
  const tip = document.querySelector('#tip.show'), keys = tip?.querySelector('.tkeys'), kb = [...(keys?.querySelectorAll('kbd') || [])];
  return { tip: HE.tip(), fit: HE.fit('#tip.show'), left: tip ? tip.getBoundingClientRect().right < innerWidth / 2 : null, goal: HE.reads('#tip .tgoal'),
    keys: keys?.textContent, kbd: kb.map((k) => k.textContent), kbdX: kb.map((k) => HE.x(k)), textX: HE.x(keys?.querySelector('.kt')) };
});
check('the house: the tip panel on the left as in English, inside the screen; its goal (the magic ball) Hebrew, read right to left', /לקחת את כדור הקסם מהארון/.test(house.tip) && house.fit.ok && house.left && house.goal === 'rtl', house);
check('the house: the key hint laid out as in English: the key caps first on the left, in English\'s order (← before →), each word after its keys', house.kbd.length >= 2 && house.kbdX.every((x, i) => !i || x > house.kbdX[i - 1]) && house.kbdX[0] < house.textX, house);
// Arthur at his boat (optional): his conversation in a Hebrew box
const ar = await ev(() => {
  const a = P.npc('arthur'); P.go(a.pos.x + 1.1, a.pos.z - 1.1, { tol: 0.35 }); P.face(a.pos.x, a.pos.z); game.step(0.6);
  const pe = document.querySelector('#prompt.show'), prompt = pe?.textContent || '', pk = HE.x(pe?.querySelector('kbd')), pt = HE.x(pe?.querySelector('.kt'));
  P.tap('KeyE', 0.05); game.step(1.6);
  const D = document.querySelector('#dialog'), N = D.querySelector('.name');
  return { prompt, promptKeyLeft: pk != null && pt != null && pk < pt, state: game.state, name: N?.textContent, text: D.querySelector('.text')?.textContent, reads: HE.reads('#dialog .text'), tagRight: N.getBoundingClientRect().right > D.getBoundingClientRect().right - D.getBoundingClientRect().width / 3, dir: getComputedStyle(D).direction, fit: HE.fit('#dialog'), textFit: HE.fit('#dialog .text') };
});
check('Arthur in the house: the prompt "לדבר" with its key on the left (English\'s order)', /לדבר/.test(ar.prompt) && ar.promptKeyLeft, ar);
check('Arthur: a Hebrew box, his name ארתור on the name tag at the top right (P138), the box itself as English's, the line read right to left, inside the screen', ar.state === 'dialog' && ar.name === 'ארתור' && HEB.test(ar.text || '') && ar.reads === 'rtl' && ar.tagRight && ar.dir === 'ltr' && ar.fit.ok && ar.textFit.ok, ar);
if (SHOTS) await big(() => shot(PRE ? '01-dialogue' : '01-house-dialogue'));
const cup = await ev(() => {
  P.settle();
  const sp = game.room.searches.find((x) => x.id === 'cupboard');
  P.go(sp.x, sp.z, { tol: 1.4 }); game.step(0.8);
  const near = HE.tip();
  P.use(sp.x, sp.z); HE.settleFound();
  return { near, ball: game.hero.hasBall, voiced: (window.__voiced || []).map((x) => x.shown) };
});
check('by the cupboard: "לחפש בארון" with the key; the ball taken, his lines in Hebrew', /לחפש בארון/.test(cup.near) && cup.ball && cup.voiced.some((x) => /ידיד ותיק/.test(x)), cup);
await ev(() => { HE.settleFound(); game.step(1.0); });
const out = await ev(() => { const e = game.room.exits.find((x) => x.to === 'outdoor'); P.settle(); P.through(e.x, e.z); game.step(1.0); const tip = document.querySelector('#tip.show'); return { room: game.room?.id ?? 'out', tip: HE.tip(), fit: HE.fit('#tip.show'), goal: HE.reads('#tip .tgoal'), left: tip ? tip.getBoundingClientRect().right < innerWidth / 2 : null }; });
check('out in the yard: the tip panel (left, as in English) says, in Hebrew read right to left, to talk to Zoé', out.room === 'out' && /לדבר עם זואי/.test(out.tip) && out.fit.ok && out.goal === 'rtl' && out.left, out);
if (SHOTS) await big(async () => { await step(0.3); await shot(PRE ? '02-yard-tip' : '02-yard-tip'); });

// ---------------------------------------------------------------- 3. Zoé, in the yard (her words read, then the rest of the yard)
const zoe = await ev(() => {
  const z = P.npc('zoe'); P.go(z.pos.x, z.pos.z, { tol: 1.6, stopWhen: () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; } });
  P.face(z.pos.x, z.pos.z); game.step(0.4);
  const prompt = document.querySelector('#prompt.show')?.textContent || '';
  P.tap('KeyE', 0.05); game.step(3.0);
  return { prompt, state: game.state, name: document.querySelector('#dialog .name')?.textContent, text: document.querySelector('#dialog .text')?.textContent, reads: HE.reads('#dialog .text'), fit: HE.fit('#dialog'), textFit: HE.fit('#dialog .text') };
});
check('Zoé: "לדבר" in the prompt; her conversation in Hebrew, her name זואי, the line read right to left', /לדבר/.test(zoe.prompt) && zoe.state === 'dialog' && zoe.name === 'זואי' && HEB.test(zoe.text || '') && zoe.reads === 'rtl', zoe);
check('Zoé\'s box at 1280×720: nothing spills (the text no wider than its box, the box inside the screen)', zoe.fit.ok && zoe.textFit.ok, { box: zoe.fit, text: zoe.textFit });
await page.setViewportSize({ width: 1920, height: 1080 });
const zoeBig = await ev(() => { game.step(0.1); return { fit: HE.fit('#dialog'), textFit: HE.fit('#dialog .text'), reads: HE.reads('#dialog .text') }; });
check('Zoé\'s box at 1920×1080: nothing spills, read right to left', zoeBig.fit.ok && zoeBig.textFit.ok && zoeBig.reads === 'rtl', zoeBig);
if (SHOTS === '1') await shot('03-yard-zoe-dialogue');
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

// ---------------------------------------------------------------- 5. the objective, the pause menu, the settings
const obj = await ev(() => { game.updateObjective(); game.step(0.2); const o = document.querySelector('#objective'); return { text: o.textContent, reads: HE.reads(o.firstElementChild || o), right: o.getBoundingClientRect().left > innerWidth / 2 }; });
check('the objective in Hebrew (the well), read right to left, on the right as in English', /הבאר/.test(obj.text) && obj.reads === 'rtl' && obj.right, obj);
const pause = await ev(() => { P.tap('Escape', 0.1); game.step(0.1); const o = document.querySelector('#pause-objective'); return { state: game.state, text: o?.textContent || '', fit: HE.fit('#pause-objective'), reads: HE.reads(o.firstElementChild || o), resume: document.querySelector('#pause [data-act="resume"]')?.textContent, audit: HE.audit('#pause') }; });
check('the pause menu: its objective in Hebrew (read right to left) and inside the screen, "חזרה למשחק"; every Hebrew paragraph right to left', pause.state === 'pause' && HEB.test(pause.text) && pause.fit.ok && pause.reads === 'rtl' && pause.resume === 'חזרה למשחק' && !pause.audit.bad.length, pause);
// the settings page from the pause menu: its order and its arrows as in English
const setLook = () => ev(() => {
  const S = document.querySelector('#settings'), xs = (q) => [...S.querySelectorAll(q)].filter((e) => e.getClientRects().length).map((e) => HE.x(e));
  const inc = (a) => a.length > 1 && a.every((x, i) => !i || x > a[i - 1]);
  const panel = S.querySelector('.set-panel');
  return { tabs: inc(xs('.set-tabs button')), lang: inc(xs('.seg[data-setting="lang"] button')), diff: inc(xs('.seg[data-setting="difficulty"] button')), label: HE.reads(S.querySelector('.set-page:not([hidden]) .set-label')),
    labelLeft: HE.x(S.querySelector('.set-row[data-hint="difficulty"] .set-label')) < HE.x(S.querySelector('.set-row[data-hint="difficulty"] .seg')),
    fit: HE.fit('#settings .set-panel'), screen: HE.fit('#settings'), panelInside: panel.getBoundingClientRect().right <= innerWidth && panel.getBoundingClientRect().left >= 0, audit: HE.audit('#settings') };
});
await ev(() => { game.act('settings'); game.step(0.1); });
const s0 = await setLook();
const sBig = await big(async () => { const r = await setLook(); if (SHOTS) await shot(PRE ? '05-settings' : '06-settings'); return r; });
check('settings in Hebrew: the tabs, the language and difficulty choices in English\'s order (left to right), each label left of its choices, labels read right to left; no spill at 1280×720 and 1920×1080', [s0, sBig].every((s) => s.tabs && s.lang && s.diff && s.labelLeft && s.label === 'rtl' && s.fit.ok && s.panelInside && !s.audit.bad.length), { s0, sBig });
const arrows = async () => {
  const sel = (hint) => ev((hint) => { const B = game.menuButtons(); game.menuSel = B.findIndex((b) => b.dataset?.hint === hint); game.focusMenu?.(); game.step(0.05); return game.menuSel; }, hint);
  await ev(() => { game.settings.difficulty = 'normal'; game.applySettings(); game.syncSettingsUI(); game.setTabTo('game'); game.step(0.05); });
  await sel('difficulty');
  const x0 = await ev(() => HE.x('#settings .seg[data-setting="difficulty"] button.on'));
  await page.keyboard.press('ArrowRight'); await step(0.05);
  const r = await ev(() => ({ v: game.settings.difficulty, x: HE.x('#settings .seg[data-setting="difficulty"] button.on') }));
  await page.keyboard.press('ArrowLeft'); await step(0.05);
  const back = await ev(() => game.settings.difficulty);
  await ev(() => { game.setTabTo('sound'); game.settings.music = 0.5; game.applySettings(); game.syncSettingsUI(); game.step(0.05); });
  await sel('music');
  await page.keyboard.press('ArrowRight'); await step(0.05);
  const m = await ev(() => game.settings.music);
  await ev(() => { game.settings.music = 0.5; game.applySettings(); game.syncSettingsUI(); game.setTabTo('game'); game.step(0.05); });
  return { right: r.v, moved: r.x > x0, back, music: m };
};
const sArrows = await arrows();
check('settings in Hebrew: → takes the next choice on the right (Normal → Hard), ← back; → turns the music up (as in English)', sArrows.right === 'hard' && sArrows.moved && sArrows.back === 'normal' && sArrows.music > 0.5, sArrows);
await ev(() => { game.act('back'); game.step(0.1); for (let i = 0; i < 4 && game.state !== 'play'; i++) P.tap('Escape', 0.1); game.step(0.2); });

// ---------------------------------------------------------------- the behaviour menu (Ctrl): the user's report
const behMenu = async (pic) => {
  await ev(() => { game.hero.setBehaviour('normal'); game.hud.behaviour?.('normal'); game.step(0.1); });
  await page.keyboard.down('ControlLeft'); await step(0.1);
  const x0 = await ev(() => HE.x('#behmenu .bbox.on'));
  await page.keyboard.press('ArrowRight'); await step(0.15);
  const r = await ev(() => ({ beh: game.hero.behaviour, on: [...document.querySelectorAll('#behmenu .bbox')].findIndex((b) => b.classList.contains('on')), label: document.querySelector('#behmenu .blabel').textContent, xs: [...document.querySelectorAll('#behmenu .bbox')].map((b) => HE.x(b)) }));
  r.x1 = await ev(() => HE.x('#behmenu .bbox.on')); r.x0 = x0;
  if (pic && SHOTS && r.on >= 0) await big(() => shot(PRE ? '06-behaviour-menu' : '07-behaviour-menu'));
  await page.keyboard.press('ArrowLeft'); await step(0.15);
  r.back = await ev(() => game.hero.behaviour);
  await page.keyboard.up('ControlLeft'); await step(0.1);
  return r;
};
const bh = await behMenu(true);
check('the behaviour menu in Hebrew (the user\'s report): Ctrl + → goes Normal → Athletic, the lit box moves right; ← back to Normal; the boxes in English\'s order', bh.beh === 'athletic' && bh.on === 1 && bh.x1 > bh.x0 && bh.back === 'normal' && bh.xs.every((x, i) => !i || x > bh.xs[i - 1]) && bh.label === 'אתלטי', bh);

// ---------------------------------------------------------------- the inventory and the journal
const FIT = () => ev(() => {
  const el = document.querySelector('#inventory'), P0 = el.querySelector('.inv-panel'), bad = [];
  for (const e of [el, P0, ...P0.querySelectorAll('.inv-head, .inv-body, .inv-info, .inv-text, .inv-now, .inv-jbody, .inv-secs, .inv-lines, .inv-foot')]) {
    const slack = e.matches('.lba-frame') || e.querySelector('.lba-frame') ? 4 : 1;
    if (e.scrollWidth > e.clientWidth + slack || e.scrollHeight > e.clientHeight + slack) bad.push(`${e.className} ${e.scrollWidth}/${e.clientWidth} ${e.scrollHeight}/${e.clientHeight}`);
  }
  const r = P0.getBoundingClientRect(), tabs = [...el.querySelectorAll('.inv-tabs [data-tab]')].map((b) => HE.x(b)), slots = [...el.querySelectorAll('.inv-item')].slice(0, 2).map((b) => HE.x(b));
  return { bad, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, tabsLtr: tabs[0] < tabs[1], slotsLtr: slots.length < 2 || slots[0] < slots[1],
    bigLeft: !el.querySelector('.inv-big') || HE.x('.inv-big') < HE.x('.inv-gridbox'), closeRight: HE.x('.inv-close') > innerWidth / 2,
    title: el.querySelector('.inv-tabs [data-tab="items"]')?.textContent, jtitle: el.querySelector('.inv-tabs [data-tab="journal"]')?.textContent,
    name: HE.reads('.inv-name'), desc: HE.reads('.inv-desc'), notes: HE.reads('.inv-lines li') ?? HE.reads('.inv-obj'), text: el.querySelector('.inv-panel').textContent.slice(0, 160), audit: HE.audit('#inventory') };
});
const invArrow = () => ev(() => { game.inventory.setTab('items'); game.inventory.zone = 'grid'; game.inventory.sel = 0; game.inventory.render(); game.step(0.05); return HE.x('.inv-item.sel'); });
const sizes = {};
for (const [w, h] of [[1280, 720], [1920, 1080]]) {
  await page.setViewportSize({ width: w, height: h });
  await ev(() => { if (game.state !== 'inventory') P.tap('KeyI', 0.2); game.inventory.setTab('items'); game.inventory.render(); });
  const items = await FIT();
  if (w === 1920) await shot(PRE ? '03-inventory' : '04-inventory');
  await ev(() => { game.inventory.setTab('journal'); });
  const journal = await FIT();
  if (w === 1920) await shot(PRE ? '04-journal' : '05-journal');
  sizes[`${w}x${h}`] = { items, journal };
}
const I0 = sizes['1280x720'], I1 = sizes['1920x1080'];
check('the inventory and the journal in Hebrew (חפצים / יומן): the tabs, slots, the large view and Close where English has them; the item\'s name, its text and the notes read right to left', [I0, I1].every((s) => s.items.title === 'חפצים' && s.items.jtitle === 'יומן' && s.items.tabsLtr && s.items.slotsLtr && s.items.bigLeft && s.items.closeRight && s.items.name === 'rtl' && (s.items.desc === 'rtl' || s.items.desc === 'one') && s.journal.notes === 'rtl' && HEB.test(s.journal.text) && !s.items.audit.bad.length && !s.journal.audit.bad.length), sizes);
check('the inventory and the journal: nothing scrolls or spills, inside the screen, at 1280×720 and 1920×1080', [I0, I1].every((s) => !s.items.bad.length && !s.journal.bad.length && s.items.inside && s.journal.inside), sizes);
const x0 = await invArrow();
await page.keyboard.press('ArrowRight'); await step(0.1);
const heInv = await ev((x0) => ({ sel: game.inventory.sel, x: HE.x('.inv-item.sel'), x0 }), x0);
check('the inventory in Hebrew: → selects the next slot, on the right (as in English)', heInv.sel === 1 && heInv.x > heInv.x0, heInv);
await ev(() => { for (let i = 0; i < 4 && game.state !== 'play'; i++) P.tap('Escape', 0.1); game.step(0.2); });
await page.setViewportSize({ width: 1280, height: 720 });

// ---------------------------------------------------------------- 6. back to English: the same arrows, English untouched
const back = await ev(() => {
  game.settings.lang = 'en'; game.applySettings(); game.saveSettings?.();
  game.updateObjective(); game.step(0.2);
  return { dir: document.documentElement.dir, obj: document.querySelector('#objective').textContent };
});
const backLine = await ev(async () => { const { t } = await import('/src/game/i18n.js'); game.say('n_zoe', [t('op_zoe_5')]); game.step(2.0); const r = { text: document.querySelector('#dialog .text')?.textContent, reads: HE.reads('#dialog .text'), said: game.audio.babble.said, keyMarkup: /class="k[glt]"/.test(t('tut_inv', { k: '<kbd>I</kbd>' })) }; P.settle(); return r; });
check('back to English in Settings: left to right, the objective and a new line in English (the voice the same), no Hebrew key-hint markup', back.dir === 'ltr' && /well/i.test(back.obj) && !HEB.test(back.obj) && backLine.reads === 'ltr' && backLine.text === 'Take your magic ball. Just in case.' && backLine.said === backLine.text && !backLine.keyMarkup, { back, backLine });
const enBh = await behMenu();
await ev(() => { P.tap('KeyI', 0.2); });
const ex0 = await invArrow();
await page.keyboard.press('ArrowRight'); await step(0.1);
const enInv = await ev((x0) => ({ sel: game.inventory.sel, x: HE.x('.inv-item.sel'), x0 }), ex0);
await ev(() => { for (let i = 0; i < 4 && game.state !== 'play'; i++) P.tap('Escape', 0.1); game.step(0.2); });
check('English: Ctrl + → and the inventory\'s → do exactly what they do in Hebrew', enBh.beh === bh.beh && enBh.on === bh.on && enBh.back === bh.back && enInv.sel === heInv.sel && enInv.x > enInv.x0, { enBh, enInv });

await done();
await browser.close();
