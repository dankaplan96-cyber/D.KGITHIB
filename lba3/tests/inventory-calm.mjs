// INVENTORY-CALM (the user, 15.11: the Inventory + Journal window "crowded and ugly and not visual, and scrolling"):
//   1. no scroll bars at 1200×700, 1280×720, 1366×768, 1920×1080 (and 960×540, 844×390): the window, the panel and
//      its panes have scrollWidth <= clientWidth and scrollHeight <= clientHeight, nothing scrolls, the panel lies
//      inside the window; on both tabs, with More open, with big text
//   2. every item slot has a picture (a rendered model, an image that loaded); empty slots are frames, not buttons
//   3. keyboard: the arrows select (the name follows), up from the first row reaches the counters' strip, Space shows
//      the whole text and again hides it, E uses a gadget (the lantern), Tab switches to the journal and back, J opens
//      the journal
//   4. the journal: the current goal first (the story's objective), the current chapter's section open first
//   5. the pause menu's Journal opens the window on its journal tab; Esc shuts it back to the pause menu, its Journal
//      button selected
//   6. the pad: View opens, RB switches the tab, Y shows More, A uses a gadget, B closes
//   7. the mouse: tabs, slots, More, Close; one handler (a click after many openings toggles More once)
//   8. rapid open/close ends shut, nothing turning
//   9. Hebrew (HE-LTR): the window lays out inside the screen as in English (the first tab and slot on the left,
//      → the next item), only its texts right to left
//  10. a late-game load of items pages the grid (‹ 1 / 2 ›) instead of scrolling (not pictured)
//  11. an old save (format 3, no arsenal) continues and the window opens
// SHOTS=dir writes pictures (chapter 1 only).
import { launch, checker, open, menu } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
const { browser, page } = await launch({ width: 1200, height: 700 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

await open(page, '?nocine');
await ev(() => localStorage.clear());
await menu(page, 'new');
await page.addScriptTag({ path: new URL('./lib/inv-state.js', import.meta.url).pathname });
await ev(() => {
  INV_CH1();
  const G = game;
  window.PAD = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  window.padTap = (b) => { PAD.buttons[b] = { pressed: true }; G.step(1 / 60); PAD.buttons[b] = { pressed: false }; G.step(1 / 60); };
  window.INV = () => document.querySelector('#inventory');
  // back in play from wherever a check left it (the window or the pause menu)
  window.TOPLAY = () => { for (let i = 0; i < 4 && G.state !== 'play'; i++) P.tap('Escape', 0.1); G.step(0.1); return G.state; };
  // everything that could scroll or spill: the window, the panel, its panes; anything set to scroll. A pane holding an
  // LBA frame may measure 4 px over: the frame's corner marks sit 4 px outside its border by design (style.css
  // .lba-frame); what counts there is that no real box spills (the rects below)
  window.FIT = () => {
    const el = INV(), P = el.querySelector('.inv-panel'), out = { bad: [] };
    if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) out.bad.push(`window ${el.scrollWidth}/${el.clientWidth} ${el.scrollHeight}/${el.clientHeight}`);
    const panes = [P, ...P.querySelectorAll('.inv-head, .inv-body, .inv-show, .inv-gridbox, .inv-grid, .inv-info, .inv-text, .inv-now, .inv-jbody, .inv-secs, .inv-lines, .inv-lines ul, .inv-foot')];
    for (const e of panes) {
      const slack = e.matches('.lba-frame') || e.querySelector('.lba-frame') ? 4 : 1;
      if (e.scrollWidth > e.clientWidth + slack || e.scrollHeight > e.clientHeight + slack) out.bad.push(`${e.className} ${e.scrollWidth}/${e.clientWidth} ${e.scrollHeight}/${e.clientHeight}`);
      const r = e.getBoundingClientRect();
      for (const k of e.querySelectorAll('*')) {
        if (k.closest('.inv-desc:not(.open)') && k !== k.closest('.inv-desc')) continue;   // (the clamped short line: More)
        const q = k.getBoundingClientRect();
        if (!q.width || !q.height) continue;
        if (q.left < r.left - 0.5 || q.top < r.top - 0.5 || q.right > r.right + 0.5 || q.bottom > r.bottom + 0.5) { out.bad.push(`spill: ${k.className || k.tagName} out of ${e.className}`); break; }
      }
    }
    for (const e of [el, ...el.querySelectorAll('*')]) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) out.bad.push('scrollable: ' + (e.className || e.tagName)); }
    const r = P.getBoundingClientRect();
    out.rect = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    out.inside = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    out.page = document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
    out.slot = Math.round(el.querySelector('.inv-item')?.getBoundingClientRect().width || 0);
    return out;
  };
});

// ---------------------------------------------------------------- 1. sizes
const SIZES = [[1200, 700], [1280, 720], [1366, 768], [1920, 1080], [960, 540], [844, 390]];
const fits = [];
await ev(() => { game.inventory.sel = 1; P.tap('KeyI', 0.1); });
for (const [w, h] of SIZES) {
  await page.setViewportSize({ width: w, height: h });
  const r = await ev(() => {
    const G = game, I = G.inventory, o = {};
    I.setTab('items'); I.zone = 'grid'; I.sel = 1; I.more = false; I.render(); o.items = FIT();
    I.more = true; I.render(); o.more = FIT(); I.more = false;
    I.setTab('journal'); o.journal = FIT();
    G.settings.textSize = 'large'; G.applySettings(); I.setTab('items'); I.more = true; I.render(); o.bigMore = FIT(); I.setTab('journal'); o.bigJournal = FIT();
    G.settings.textSize = 'normal'; G.applySettings(); I.setTab('items'); I.more = false; I.render();
    return o;
  });
  fits.push([w, h, r]);
  const ok = Object.values(r).every((f) => !f.bad.length && f.inside && f.page);
  check(`${w}×${h}: nothing scrolls or spills (both tabs, More open, big text); slot ${r.items.slot}px, panel ${r.items.rect.join(',')}`, ok, Object.fromEntries(Object.entries(r).map(([k, f]) => [k, f.bad.length ? f.bad : f.rect])));
}
await page.setViewportSize({ width: 1200, height: 700 });

// ---------------------------------------------------------------- 2. pictures
const p1 = await ev(async () => {
  const I = game.inventory; I.sel = 0; I.render();
  const imgs = [...INV().querySelectorAll('.inv-item img')];
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  return { n: imgs.length, items: I.items().length, loaded: imgs.every((i) => i.src.startsWith('data:image/') && i.naturalWidth > 0), empty: INV().querySelectorAll('.inv-free').length, emptyButtons: INV().querySelectorAll('button.inv-free, .inv-free button').length, counters: [...INV().querySelectorAll('.inv-ctr')].map((c) => c.getAttribute('aria-label')) };
});
check('every item slot has a picture that loaded; the empty slots are frames, not buttons', p1.n === p1.items && p1.loaded && p1.empty > 0 && p1.emptyButtons === 0, p1);
check('the counters sit in one strip (Kashes, clovers, crystals), out of the grid', p1.counters.length === 3 && /Kashes: 23/.test(p1.counters[0]) && /Crystals: 2/.test(p1.counters[2]), p1.counters);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/test-items-1200x700.jpg`, type: 'jpeg', quality: 80 });

// ---------------------------------------------------------------- 3. keyboard
const k1 = await ev(() => {
  const G = game, I = G.inventory, el = INV(), name = () => el.querySelector('.inv-name')?.firstChild?.textContent?.trim(), r = {};
  I.sel = 0; I.zone = 'grid'; I.render();
  r.n0 = name(); P.tap('ArrowRight', 0.05); r.n1 = name(); r.sel1 = I.sel;
  r.lineShort = el.querySelector('.inv-desc').getBoundingClientRect().height;
  r.restHidden = getComputedStyle(el.querySelector('.inv-desc .rest') || el).display === 'none';
  P.tap('Space', 0.05); r.open = el.querySelector('.inv-desc').classList.contains('open'); r.lineLong = el.querySelector('.inv-desc').getBoundingClientRect().height; r.btn = el.querySelector('.inv-more')?.textContent;
  P.tap('Space', 0.05); r.shut = !el.querySelector('.inv-desc').classList.contains('open');
  P.tap('ArrowUp', 0.05); r.zone = I.zone; r.stripName = name(); r.chipSel = !!el.querySelector('.inv-ctr.sel');
  P.tap('ArrowRight', 0.05); r.strip2 = name();
  P.tap('ArrowDown', 0.05); r.back = [I.zone, name()];
  P.tap('Tab', 0.05); r.tab = I.tab; P.tap('Tab', 0.05); r.tab2 = I.tab;
  return r;
});
check('keyboard: → selects the next item (the name follows)', k1.n0 === 'Medallion' && k1.n1 === 'Magic Ball' && k1.sel1 === 1, k1);
check('the ball shows one short line; Space shows the rest (More → Less) and Space hides it again', k1.restHidden && k1.open && k1.lineLong > k1.lineShort * 1.5 && /Less/.test(k1.btn) && k1.shut, k1);
check('↑ from the first row reaches the counters\' strip (Kashes, then Clover Leaves); ↓ goes back to the slot', k1.zone === 'strip' && k1.stripName === 'Kashes' && k1.chipSel && k1.strip2 === 'Clover Leaves' && k1.back[0] === 'grid' && k1.back[1] === 'Magic Ball', k1);
check('Tab turns to the journal and back', k1.tab === 'journal' && k1.tab2 === 'items', k1);
const k2 = await ev(() => {
  const G = game, I = G.inventory, a = G.hero.arms, r = {};
  TOPLAY();
  a.lantern = true; a.lanternOn = false;
  P.tap('KeyI', 0.1); I.sel = 0; I.render();
  const i = I.items().findIndex((x) => x.id === 'lantern');
  for (let k = 0; k < i; k++) P.tap('ArrowRight', 0.05);
  r.sel = I.items()[I.sel]?.id; r.useBtn = INV().querySelector('.inv-use')?.textContent; r.key = G.hud.key('interact');
  P.tap('KeyE', 0.1);
  r.state = G.state; r.on = a.lanternOn;
  a.lanternOn = false; a.lantern = false;
  return r;
});
check('E (the interact key) on a gadget (the lantern) uses it and shuts the window; its Use button names that key', k2.sel === 'lantern' && k2.useBtn === 'Use ' + k2.key && k2.state === 'play' && k2.on === true, k2);
// (J is the Modern scheme's second inventory key; Classic, LBA2's keys, opens it with Shift or I)
await ev(() => { window.AC0 = game.settings.autoControls; game.settings.autoControls = 'off'; game.settings.controls = 'modern'; game.applySettings(); game.step(0.1); });
await page.keyboard.press('KeyJ'); await ev(() => game.step(0.1));
const k3 = await ev(() => ({ state: game.state, tab: game.inventory.tab }));
await page.keyboard.press('KeyI'); await ev(() => game.step(0.1));
await page.keyboard.press('KeyI'); await ev(() => game.step(0.1));
const k4 = await ev(() => ({ state: game.state, tab: game.inventory.tab }));
await page.keyboard.press('Escape'); await ev(() => { game.step(0.1); game.settings.controls = 'classic'; game.settings.autoControls = AC0; game.applySettings(); game.step(0.1); });
check('J opens the journal tab; I opens the inventory tab', k3.state === 'inventory' && k3.tab === 'journal' && k4.state === 'inventory' && k4.tab === 'items', { k3, k4 });

// ---------------------------------------------------------------- 4. the journal
const j1 = await ev(() => {
  const G = game, I = G.inventory, el = INV(), r = {};
  TOPLAY(); P.tap('KeyI', 0.1); r.state = G.state;
  I.setTab('journal');
  const tmp = document.createElement('div'); tmp.innerHTML = G.story.objective(); r.goal = tmp.querySelector('b')?.textContent;
  r.now = el.querySelector('.inv-now b')?.textContent;
  r.first = el.querySelector('.inv-body').firstElementChild?.className;
  r.secs = [...el.querySelectorAll('.inv-secs button')].map((b) => b.textContent);
  r.open = el.querySelector('.inv-lines h3')?.textContent;
  r.lines = [...el.querySelectorAll('.inv-lines li')].map((l) => l.className);
  P.tap('ArrowDown', 0.05); r.open2 = el.querySelector('.inv-lines h3')?.textContent;
  P.tap('ArrowUp', 0.05); r.open3 = el.querySelector('.inv-lines h3')?.textContent;
  r.chapterTitle = G.story.journal()[G.story.index]?.title;
  return r;
});
if (SHOTS) await page.screenshot({ path: `${SHOTS}/test-journal-1200x700.jpg`, type: 'jpeg', quality: 80 });
check('the journal leads with the current goal (the story\'s objective)', j1.first === 'inv-now' && j1.now && j1.now === j1.goal, j1);
check('the current chapter\'s notes open first; the other sections wait in the list; ↓/↑ open another and back', j1.open === j1.chapterTitle && j1.secs[0] === j1.chapterTitle && j1.secs.length > 1 && j1.open2 !== j1.open && j1.open3 === j1.open && j1.lines.length > 0, j1);

// ---------------------------------------------------------------- 5. the pause menu's route
await ev(() => { TOPLAY(); P.tap('Escape', 0.1); });
const pz0 = await ev(() => ({ state: game.state, has: !!document.querySelector('#pause [data-act="journal"]') }));
await page.click('#pause [data-act="journal"]'); await ev(() => game.step(0.1));
const pz1 = await ev(() => ({ state: game.state, tab: game.inventory.tab, pauseHidden: document.querySelector('#pause').classList.contains('hidden') }));
await ev(() => P.tap('Escape', 0.1));
const pz2 = await ev(() => ({ state: game.state, screen: game.screen, sel: document.querySelector('#pause .menu button.sel')?.dataset.act, shut: INV().classList.contains('hidden') }));
await ev(() => P.tap('Escape', 0.1));
const pz3 = await ev(() => game.state);
check('pause → Journal: the window on its journal tab; Esc shuts it back to the pause menu, Journal selected; Esc resumes', pz0.state === 'pause' && pz0.has && pz1.state === 'inventory' && pz1.tab === 'journal' && pz1.pauseHidden && pz2.state === 'pause' && pz2.screen === 'pause' && pz2.sel === 'journal' && pz2.shut && pz3 === 'play', { pz0, pz1, pz2, pz3 });

// ---------------------------------------------------------------- 6. the pad
const pd = await ev(() => {
  const G = game, I = G.inventory, a = G.hero.arms, r = {};
  TOPLAY(); navigator.getGamepads = () => [PAD];
  padTap(8); r.open = G.state; r.hint = INV().querySelector('.inv-hint')?.textContent; r.tabKey = INV().querySelector('.inv-tabs kbd')?.textContent;
  padTap(5); r.tab = I.tab; padTap(4); r.tab2 = I.tab;
  I.sel = 1; I.render(); padTap(3); r.more = I.more; r.moreKey = INV().querySelector('.inv-more kbd')?.textContent; padTap(3);
  padTap(1); r.closed = G.state;
  a.lantern = true; a.lanternOn = false;
  padTap(8); I.sel = I.items().findIndex((x) => x.id === 'lantern'); I.render(); r.useKey = INV().querySelector('.inv-use kbd')?.textContent;
  padTap(0); r.used = [G.state, a.lanternOn];
  a.lanternOn = false; a.lantern = false;
  navigator.getGamepads = () => []; G.input.lastDevice = 'kbd'; G.step(0.1);
  return r;
});
check('pad: View opens, RB/LB switch tabs, Y shows More, B closes, A uses a gadget; the controls name the pad\'s buttons', pd.open === 'inventory' && /View \/ B: close/.test(pd.hint) && pd.tabKey === 'LB / RB' && pd.tab === 'journal' && pd.tab2 === 'items' && pd.more && pd.moreKey === 'Y' && pd.closed === 'play' && pd.useKey === 'A' && pd.used[0] === 'play' && pd.used[1] === true, pd);

// ---------------------------------------------------------------- 7. the mouse, and one handler
await ev(() => TOPLAY());
for (let i = 0; i < 6; i++) await ev(() => { P.tap('KeyI', 1 / 60); });
await ev(() => { if (game.state !== 'inventory') P.tap('KeyI', 0.1); game.inventory.sel = 1; game.inventory.render(); });
await page.click('#inventory .inv-more');
const m1 = await ev(() => game.inventory.more);
await page.click('#inventory .inv-tabs [data-tab="journal"]');
const m2 = await ev(() => game.inventory.tab);
await page.click('#inventory .inv-tabs [data-tab="items"]');
await page.click('#inventory .inv-item[data-i="2"]');
const m3 = await ev(() => [game.inventory.sel, document.querySelector('#inventory .inv-name')?.firstChild?.textContent?.trim()]);
await page.click('#inventory .inv-ctr[data-c="0"]');
const m4 = await ev(() => [game.inventory.zone, document.querySelector('#inventory .inv-name')?.firstChild?.textContent?.trim()]);
await page.click('#inventory .inv-close'); await ev(() => game.step(0.1));
const m5 = await ev(() => game.state);
check('mouse: More toggles once after many openings (one handler); tabs, a slot, a counter, Close', m1 === true && m2 === 'journal' && m3[0] === 2 && m3[1] === 'Holomap' && m4[0] === 'strip' && m4[1] === 'Kashes' && m5 === 'play', { m1, m2, m3, m4, m5 });

// ---------------------------------------------------------------- 8. rapid open/close
const rp = await ev(async () => {
  TOPLAY();
  for (let k = 0; k < 10; k++) P.tap('KeyI', 1 / 60);
  game.step(0.2);
  const { stage } = await import('/src/game/itemlook.js');
  return { state: game.state, hidden: INV().classList.contains('hidden'), spins: stage.spins.length };
});
check('rapid open/close ends shut, in play, nothing turning', rp.state === 'play' && rp.hidden && rp.spins === 0, rp);

// ---------------------------------------------------------------- 9. Hebrew: only the text right to left (HE-LTR)
const rtl = await ev(async () => {
  const G = game, I = G.inventory, r = {};
  G.settings.lang = 'he'; G.applySettings();
  r.dir = document.documentElement.dir;
  // which way a text's first line runs: its first letter at the line's right end (rtl) or its left (ltr)
  const reads = (el) => {
    if (!el) return null;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ch = [];
    for (let n; (n = w.nextNode());) for (let i = 0; i < n.data.length; i++) { if (/\s/.test(n.data[i])) continue; const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const b = rg.getBoundingClientRect(); if (b.width) ch.push(b); }
    if (ch.length < 2) return null;
    const f = ch[0], line = ch.filter((b) => Math.abs(b.top - f.top) < f.height / 2);
    return f.right >= Math.max(...line.map((b) => b.right)) - 1 ? 'rtl' : f.left <= Math.min(...line.map((b) => b.left)) + 1 ? 'ltr' : 'mixed';
  };
  TOPLAY(); P.tap('KeyI', 0.1); I.sel = 0; I.render();
  r.fit = FIT();
  const [a, b] = [...INV().querySelectorAll('.inv-tabs [data-tab]')].map((x) => x.getBoundingClientRect());
  r.firstLeft = a.left < b.left;
  r.title = INV().querySelector('.inv-tabs [data-tab="items"]').textContent;
  r.name = reads(INV().querySelector('.inv-name'));
  const s0 = I.sel; P.tap('ArrowRight', 0.05); r.next = I.sel === s0 + 1;
  P.tap('ArrowLeft', 0.05); r.prev = I.sel === s0;
  const g0 = INV().querySelector('.inv-item[data-i="0"]').getBoundingClientRect(), g1 = INV().querySelector('.inv-item[data-i="1"]').getBoundingClientRect();
  r.gridLtr = g1.left > g0.left;
  I.setTab('journal'); r.fitJ = FIT(); r.note = reads(INV().querySelector('.inv-lines li') || INV().querySelector('.inv-obj'));
  return r;
});
if (SHOTS) await page.screenshot({ path: `${SHOTS}/test-he-1200x700.jpg`, type: 'jpeg', quality: 80 });
await ev(() => { game.settings.lang = 'en'; game.applySettings(); P.tap('KeyI', 0.1); });
check('Hebrew (HE-LTR): inside the screen, nothing scrolls; the page left to right, the first tab and the first slot on the left as in English; → is the next item, ← the one before; the name and the notes read right to left', !rtl.fit.bad.length && rtl.fit.inside && !rtl.fitJ.bad.length && rtl.dir === 'ltr' && rtl.firstLeft && rtl.gridLtr && rtl.next && rtl.prev && rtl.title === 'חפצים' && rtl.name === 'rtl' && rtl.note === 'rtl', rtl);

// ---------------------------------------------------------------- 10. many items: pages, not scroll bars (not pictured)
const lg = await ev(() => {
  const G = game, I = G.inventory, a = G.hero.arms, keep = { ...a }, r = {};
  TOPLAY();
  Object.assign(a, { blowgun: true, darts: 20, laser: true, charge: 5, glove: true, lightning: true, protect: true, penguins: 2, conch: true, lantern: true, jetpack: true, pocketset: true, lance: true, water: 3, fork: true, line: true, heatflask: true });
  P.tap('KeyI', 0.1); I.sel = 0; I.render();
  r.n = I.items().length; r.page = I.shape().page; r.pager = INV().querySelector('.inv-gridbox .inv-pager')?.textContent;
  r.fit = FIT();
  for (let k = 0; k < r.page; k++) P.tap('ArrowRight', 0.02);
  r.pager2 = INV().querySelector('.inv-gridbox .inv-pager')?.textContent; r.sel = I.sel;
  r.fit2 = FIT();
  P.tap('KeyI', 0.1);
  for (const k of Object.keys(a)) delete a[k];
  Object.assign(a, keep);
  return r;
});
check('a late-game load of items is paged (‹ 1 / 2 ›, → past the page turns it), nothing scrolls', lg.n > lg.page && /1 \/ 2/.test(lg.pager) && /2 \/ 2/.test(lg.pager2) && lg.sel === lg.page && !lg.fit.bad.length && lg.fit.inside && !lg.fit2.bad.length, lg);

// ---------------------------------------------------------------- 11. an old save
await ev(() => { const G = game, s = G.snapshot(); s.v = 3; delete s.hero.arms; s.room = null; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); });
await page.evaluate(() => game.reloadInto('continue'));
await page.waitForEvent('load', { timeout: 600000 }).catch(() => {});
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'loading', null, { timeout: +process.env.BOOT_TIMEOUT || 600000 });
await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
const os = await ev(() => {
  const G = game; G.testFreeze = true; G.step(0.5);
  P.tap('KeyI', 0.1);
  const r = { state: G.state, slots: document.querySelectorAll('#inventory .inv-item').length, items: G.inventory.items().length };
  G.inventory.setTab('journal'); r.journal = !!document.querySelector('#inventory .inv-now, #inventory .inv-secs, #inventory .inv-empty');
  P.tap('KeyI', 0.1); r.after = G.state;
  return r;
});
check('an old save (format 3, no arsenal) continues; the window opens with its slots and journal, and shuts', os.state === 'inventory' && os.slots === os.items && os.slots > 0 && os.journal && os.after === 'play', os);

console.log('SIZES', JSON.stringify(fits.map(([w, h, r]) => [w, h, r.items.slot, r.items.rect, r.journal.rect])));
done();
await browser.close();
