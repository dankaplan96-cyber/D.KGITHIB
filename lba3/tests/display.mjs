// Display: the HUD, the prompt, the dialogue box, the menus at several window sizes (and a live resize) —
// everything inside the window, no text clipped by its box, the canvas following the window. Screenshots in
// tests/out/display-*.png for a look. (Fullscreen is the browser's / the desktop app's: not testable headless.)
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { P.settle(); const s = game.room.searches[0]; P.go(s.x, s.z, { tol: 1.0 }); P.face(s.x, s.z); game.step(0.2); });
const measure = () => ev(() => {
  const W = innerWidth, H = innerHeight, out = { W, H, off: [], clipped: [] };
  for (const id of ['stats', 'objective', 'behaviour', 'minimap', 'prompt', 'weapon', 'pausebtn', 'dialog', 'toast']) {
    const e = document.getElementById(id); if (!e) continue;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.classList.contains('hidden') || +cs.opacity === 0) continue;
    const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.off.push([id, Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]);
    for (const t of [e, ...e.querySelectorAll('*')]) { const ts = getComputedStyle(t); if ((ts.overflow === 'hidden' || ts.overflowX === 'hidden') && t.scrollWidth > t.clientWidth + 2 && t.textContent.trim()) out.clipped.push([id, t.className || t.tagName, t.scrollWidth, t.clientWidth]); }
  }
  const c = game.renderer.renderer.domElement; out.canvas = [c.clientWidth, c.clientHeight];
  return out;
});
for (const [w, h] of [[1920, 1080], [1366, 768], [1280, 720], [1024, 768], [800, 600], [640, 360]]) {
  await page.setViewportSize({ width: w, height: h });
  await ev(() => { dispatchEvent(new Event('resize')); game.step(0.1); game.renderer.render(); });
  const play = await measure();
  await page.screenshot({ path: new URL(`./out/display-${w}x${h}-play.png`, import.meta.url).pathname });
  // a line of dialogue (the cupboard)
  await ev(() => { P.tap('KeyE', 0.1); game.step(0.6); game.renderer.render(); });
  const dlg = await measure();
  await page.screenshot({ path: new URL(`./out/display-${w}x${h}-dialog.png`, import.meta.url).pathname });
  await ev(() => P.settle());
  // the pause menu
  await page.keyboard.press('Escape'); await ev(() => game.step(0.1));
  const pm = await ev(() => { const r = document.querySelector('#pause .menu').getBoundingClientRect(); return [r.top >= 0 && r.bottom <= innerHeight, Math.round(r.bottom), innerHeight]; });
  // the settings (SETTINGS-UI): each page inside the window with Back, no text cut; closed Advanced: no scrolling;
  // open Advanced: only the page's own list may scroll (the selected row is kept in view)
  await page.click('#pause [data-act="settings"]'); await ev(() => game.step(0.05));
  const sets = [];
  for (const tab of ['game', 'controls', 'display', 'sound']) {
    for (const adv of [false, true]) {
      const m = await ev(([tab, adv]) => {
        game.setAdv = { [tab]: adv }; game.setTabTo(tab); game.step(0.05);
        const S = document.querySelector('#settings'), pg = S.querySelector('.set-page.on'), back = S.querySelector('.menu button').getBoundingClientRect(), tabs = S.querySelector('.set-tabs').getBoundingClientRect();
        const cut = [...S.querySelectorAll('.set-page.on button, .set-page.on .set-label, .set-page.on .set-hint, .set-tabs button, .menu button')].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent);
        const hasAdv = !!pg.querySelector('.set-adv');
        return { tab, adv, hasAdv, screenScroll: S.scrollHeight - S.clientHeight, pageScroll: pg.scrollHeight - pg.clientHeight, inside: tabs.top >= 0 && back.bottom <= innerHeight && back.top >= 0, cut };
      }, [tab, adv]);
      if (!adv || m.hasAdv) sets.push(m);
    }
  }
  await page.keyboard.press('Escape'); await ev(() => { game.setAdv = {}; game.step(0.1); });   // (Esc in the pause's settings resumes, as before)
  const bad = sets.filter((m) => !m.inside || m.cut.length || m.screenScroll > 1 || (!m.adv && m.pageScroll > 1));
  check(`${w}×${h}: settings pages fit with Back, no text cut, no scrolling unless Advanced is open`, !bad.length, bad);
  check(`${w}×${h}: Esc from the settings resumes play`, await ev(() => game.state === 'play'), await ev(() => game.state));
  check(`${w}×${h}: the canvas fills the window`, Math.abs(play.canvas[0] - w) <= 2 && Math.abs(play.canvas[1] - h) <= 2, play.canvas);
  check(`${w}×${h}: HUD inside the window, no clipped text (in play and in dialogue)`, !play.off.length && !play.clipped.length && !dlg.off.length && !dlg.clipped.length, { play, dlg });
  check(`${w}×${h}: the pause menu fits`, pm[0], pm);
}
// reduced motion (the system setting): the menus' and the settings' fire bars hold still
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.keyboard.press('Escape'); await ev(() => game.step(0.1));
const rmPause = await ev(() => getComputedStyle(document.querySelector('#pause .menu button.sel')).animationName);
await page.click('#pause [data-act="settings"]'); await ev(() => { game.setTabTo('game'); game.menuSel = 1; game.focusMenu(); game.step(0.05); });
const rmRow = await ev(() => getComputedStyle(document.querySelector('#settings .set-row.sel')).animationName);
await page.emulateMedia({ reducedMotion: 'no-preference' });
const rmOff = await ev(() => getComputedStyle(document.querySelector('#settings .set-row.sel')).animationName);
check('reduced motion: the selected menu entry and settings row don\'t animate (they do without it)', rmPause === 'none' && rmRow === 'none' && rmOff === 'fire', { rmPause, rmRow, rmOff });
await page.keyboard.press('Escape'); await ev(() => game.step(0.1));
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
