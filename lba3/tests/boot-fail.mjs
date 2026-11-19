// BOOT-FAIL (P73): a failure anywhere in the start replaces the progress with a short, accurate message, Retry and Copy
// diagnostics; Retry starts the game normally (a fresh page: one game, one canvas, one loop). main.js startupFailed;
// the test hook ?failstart=renderer | game | boot.
import { launch, URL0, checker, expectError } from './lib/boot.mjs';
expectError(/startup failed|forced by \?failstart|Error creating WebGL context/, 'the test forces the start to fail');
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const failScreen = () => ev(() => {
  const b = document.querySelector('#boot-fail');
  const vis = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && e.offsetParent !== null; };
  return { shown: !!b && b.offsetParent !== null, text: b?.querySelector('p')?.textContent || '', buttons: [...(b?.querySelectorAll('button') || [])].map((x) => x.dataset.act),
    stepVisible: vis('#loading-step'), building: /Building Citadel/.test(document.querySelector('#loading')?.innerText || ''), game: !!window.game };
});
for (const [stage, gfx] of [['renderer', true], ['game', false], ['boot', false]]) {
  await page.goto(URL0 + '?nocine&failstart=' + stage);
  await page.waitForSelector('#boot-fail', { timeout: 300000 });
  const s = await failScreen();
  check(`B-${stage}: the failure screen, not "Building Citadel…": ${gfx ? 'the 3D graphics message' : 'the general message'}, Retry and Copy diagnostics`,
    s.shown && !s.stepVisible && !s.building && (gfx ? /3D graphics/.test(s.text) : /couldn't start\./.test(s.text)) && s.buttons.includes('boot-retry') && s.buttons.includes('boot-copy'), s);
}
// Copy diagnostics: the details (the clipboard, or a selectable box where the browser refuses it)
await page.goto(URL0 + '?nocine&failstart=renderer');
await page.waitForSelector('#boot-fail', { timeout: 300000 });
await page.click('[data-act="boot-copy"]');
const cp = await ev(() => ({ label: document.querySelector('[data-act="boot-copy"]').textContent, box: document.querySelector('#boot-fail textarea')?.value || '', diag: window.navigator && document.querySelector('#boot-fail') ? true : false }));
check('C: Copy diagnostics gives the details (stage, error, browser) — copied, or shown in a box to select', cp.label === 'Copied' || /stage: renderer/.test(cp.box), cp);
// Retry: a normal start, one game, one canvas, the title
await page.click('[data-act="boot-retry"]');
await page.waitForFunction(() => window.game && game.state === 'title', null, { timeout: 600000 });
const ok = await ev(() => ({ url: location.search, canvases: document.querySelectorAll('canvas#game, #game canvas').length, fail: !!document.querySelector('#boot-fail'), state: game.state }));
check('R: Retry starts the game normally (no test flag, the title, no failure screen, one game canvas)', !/failstart/.test(ok.url) && ok.state === 'title' && !ok.fail && ok.canvases <= 1, ok);
await browser.close();
done();
