// RELEASE-AUDIT-v96 probe: the three Subtitle Sizes (Normal / Large / Extra large) at 1280×720 and 1920×1080, in
// English and Hebrew: the longest spoken lines in a dialogue box, the objective on the HUD, the pause menu's objective,
// the inventory (with More) and the journal. Each box: its text no wider/taller than the box (scrollWidth/Height), the
// box inside the screen. LOAD=<save> (a save with a full journal), SHOTS=<dir> for jpg pictures (1920×1080, Extra large).
// Automated runtime only (SwiftShader); it measures layout, it does not judge looks.
import { launch, open, menu, checker } from '../lib/boot.mjs';
import { mkdirSync } from 'node:fs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720, storageState: process.env.LOAD });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
await open(page, '?nocine');
await menu(page, process.env.LOAD ? 'continue' : 'new');
await ev(() => { game.testFreeze = true; game.step(0.5); P.settle(); game.hud.textRate = 1e9; });
await ev(() => {
  window.FITX = (sel, root = document) => {
    const out = [];
    for (const el of root.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (el.classList.contains('hidden') || !r.width || !r.height || getComputedStyle(el).display === 'none') continue;
      const slack = el.matches('.lba-frame') || el.querySelector('.lba-frame') ? 5 : 1;
      const inside = r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
      const wOk = el.scrollWidth <= el.clientWidth + slack, hOk = el.scrollHeight <= Math.max(el.clientHeight, el.offsetHeight) + slack + 1;
      out.push({ sel, cls: el.className.slice(0, 40), inside, wOk, hOk, ok: inside && wOk && hOk, dims: `${el.scrollWidth}/${el.clientWidth} x ${el.scrollHeight}/${el.clientHeight} @${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}` });
    }
    return out;
  };
});
// the longest spoken lines (by the length of the language's text), and the longest speaker name
const lines = await ev(async () => {
  const { STR } = await import('/src/game/i18n.js');
  const pick = (L) => {
    const all = [];
    for (const [k, v] of Object.entries(STR[L])) {
      if (!/^(c\d+|pr|op|t2|ep|c3|well|wl|u\d|ow|ql|yl|lf|om)_/.test(k) && !/_\d$/.test(k)) continue;
      for (const s of Array.isArray(v) ? v : [v]) if (typeof s === 'string' && !/[<{]/.test(s)) all.push([k, s]);
    }
    all.sort((a, b) => b[1].length - a[1].length);
    return all.slice(0, 3);
  };
  return { en: pick('en'), he: pick('he') };
});
console.log('longest lines:', JSON.stringify({ en: lines.en.map((x) => [x[0], x[1].length]), he: lines.he.map((x) => [x[0], x[1].length]) }));
const results = [];
for (const lang of ['en', 'he']) for (const size of ['normal', 'large', 'xl']) for (const [w, h] of [[1280, 720], [1920, 1080]]) {
  await page.setViewportSize({ width: w, height: h });
  const r = await ev(({ lang, size, L }) => {
    game.settings.lang = lang; game.settings.textSize = size; game.settings.textSpeed = 'instant'; game.applySettings(); game.renderer.resize?.();
    game.updateObjective(); game.step(0.2);
    const o = { tag: `${lang} ${size} ${innerWidth}x${innerHeight}`, boxes: [] };
    // the objective on the HUD
    o.boxes.push(...FITX('#objective'));
    // the dialogue: each of the longest lines, typed out at once
    for (const [k, s] of L) {
      game.say('n_baldino', [s], null); game.step(0.3);
      o.typed = (document.querySelector("#dialog .text")?.textContent || "").length; for (const b of FITX("#dialog, #dialog .text, #dialog .name")) o.boxes.push({ ...b, line: k, typed: o.typed, full: s.length });
      for (let i = 0; i < 10 && game.state === 'dialog'; i++) { P.tap('KeyE', 0.05); game.step(0.2); }
    }
    // the pause menu
    P.tap('Escape', 0.1); game.step(0.2);
    o.boxes.push(...FITX('#pause-objective, #pause .menu'));
    for (let i = 0; i < 4 && game.state !== 'play'; i++) { P.tap('Escape', 0.1); game.step(0.2); }
    // the inventory with More, and the journal
    P.tap('KeyI', 0.2);
    const I = game.inventory; if (I) { I.setTab('items'); I.more = true; I.render(); }
    o.boxes.push(...FITX('#inventory .inv-panel, #inventory .inv-head, #inventory .inv-body, #inventory .inv-info, #inventory .inv-text').map((b) => ({ ...b, tab: 'items+more' })));
    if (I) { I.more = false; I.setTab('journal'); }
    o.boxes.push(...FITX('#inventory .inv-panel, #inventory .inv-now, #inventory .inv-jbody, #inventory .inv-secs, #inventory .inv-lines, #inventory .inv-foot').map((b) => ({ ...b, tab: 'journal' })));
    for (let i = 0; i < 4 && game.state !== 'play'; i++) { P.tap('Escape', 0.1); game.step(0.2); }
    return o;
  }, { lang, size, L: lines[lang] });
  const bad = r.boxes.filter((b) => !b.ok);
  const typed = r.boxes.filter((b) => b.full).map((b) => [b.typed, b.full]); results.push({ tag: r.tag, n: r.boxes.length, bad, typedOk: typed.length >= 3 && typed.every(([a, f]) => a >= f * 0.95), typed: typed.filter((x, i) => i % 3 === 0) });
  console.log(`${r.tag}: ${r.boxes.length} boxes, ${bad.length} spill`); for (const b of bad) console.log('   SPILL ' + JSON.stringify(b));
  if (SHOTS && w === 1920 && size === 'xl') {
    await ev(({ L }) => { game.say('n_baldino', [L[0][1]], null); game.step(0.3); game.renderer.render(); }, { L: lines[lang] });
    await page.screenshot({ path: `${SHOTS}/textsize-${lang}-xl-1920-dialog.jpg`, type: 'jpeg', quality: 70, timeout: 180000 });
    await ev(() => { for (let i = 0; i < 10 && game.state === 'dialog'; i++) { P.tap('KeyE', 0.05); game.step(0.2); } P.tap('KeyI', 0.2); game.inventory?.setTab('journal'); game.renderer.render(); });
    await page.screenshot({ path: `${SHOTS}/textsize-${lang}-xl-1920-journal.jpg`, type: 'jpeg', quality: 70, timeout: 180000 });
    await ev(() => { for (let i = 0; i < 4 && game.state !== 'play'; i++) { P.tap('Escape', 0.1); game.step(0.2); } });
  }
}
for (const r of results) check(`${r.tag}: the three longest lines typed out whole, no text box spills (${r.n} boxes)`, !r.bad.length && r.typedOk, { bad: r.bad.slice(0, 4), typed: r.typed });
await ev(() => { game.settings.lang = 'en'; game.settings.textSize = 'normal'; game.settings.textSpeed = 'normal'; game.applySettings(); });
await done();
await browser.close();
