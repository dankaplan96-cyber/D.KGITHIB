// BG-STUCK-1: a stale "not focused" window report (8 fps, BG_FPS) ends on a key press, and on its own within a second once the
// page has focus; a page that really is hidden stays in the background. (The user, 3.11: Esc in the desktop app, then 8 fps.)
import { launch, open, menu } from './lib/boot.mjs';
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine', { freeze: false }); await menu(page, 'new');
await page.waitForFunction(() => game.state === 'play' && !game.preparing, null, { timeout: 300000 });
const stick = () => ev(() => { game.testFreeze = false; game._win = { focused: false, minimized: false, visible: true }; game.setBackground(); return { bg: game.background, hasFocus: document.hasFocus() }; });
const r = {};
r.stuck1 = await stick();
r.afterKey = await (async () => { await page.keyboard.press('KeyW'); return ev(() => ({ bg: game.background, win: game._win })); })();
// the poll: a stale report, no input at all, 2.5 s
r.stuck2 = await stick();
await page.waitForTimeout(2500);
r.afterPoll = await ev(() => ({ bg: game.background, hasFocus: document.hasFocus(), freeze: game.testFreeze, chk: game._bgCheck, last: game.last, prep: game.preparing }));
// a real background stays one: the page hidden (another tab in front)
r.hidden = await ev(async () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); game._win = { focused: false, minimized: false, visible: true }; game.setBackground(); await new Promise((res) => setTimeout(res, 2500)); const bg = game.background; delete document.hidden; return { bg }; });
console.log(JSON.stringify(r));
const ok = r.stuck1.bg && !r.afterKey.bg && r.stuck2.bg && !r.afterPoll.bg && r.hidden.bg;
console.log(ok ? 'VERDICT: PASS' : 'VERDICT: FAIL');
await browser.close();
