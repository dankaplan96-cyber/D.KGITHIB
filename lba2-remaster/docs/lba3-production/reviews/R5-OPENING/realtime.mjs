// R5-OPENING real-time capture: a new game's opening played on the wall clock (the game's own main loop: no test
// stepping), recorded as a video by the browser, with a log of what the page did and when:
//   per drawn frame   wall time, scene time, the music cue's position, the shot, the subtitle element's computed
//                     opacity (the CSS fade as it is drawn), the fade's and the title's opacity, the frame interval
//   per subtitle      the moments its text went in and its `show` class went on and off (MutationObserver)
//   per syllable      the moment each babble syllable was scheduled and on the audio clock (voice.js)
//   PAUSE_AT=<t>      also pause the scene at scene time t for 2 s (the pause menu) and resume, mid-line
//   node realtime.mjs <outdir> [width height]       GAME_URL (default http://localhost:8181/)
// Writes <outdir>/video.webm (Playwright's screencast: what the page showed, at the rate it was drawn) and log.json.
// Software rendering (SwiftShader) is slow: the game keeps real time down to 7.5 fps by taking bigger steps, so the
// picture is choppy but the clock, the fades and the voices run as on a player's machine. Nothing here listens to
// the sound: the voices' timing is read from the audio clock, not heard.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, W = 640, H = 360] = [process.argv[2], ...process.argv.slice(3).map(Number)];
fs.mkdirSync(OUT, { recursive: true });
const URL0 = process.env.GAME_URL || 'http://localhost:8181/';
const PAUSE_AT = process.env.PAUSE_AT ? +process.env.PAUSE_AT : null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } });
const page = await context.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await ev(() => localStorage.clear());
const tStart = Date.now();
await page.click('[data-act="new"]', { timeout: 180000 });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
await ev(() => {
  const G = game, c = G.cine, B = G.audio.babble, sub = document.querySelector('#cine-sub'), fade = document.querySelector('#fade'), title = document.querySelector('#cine-title');
  const now = () => performance.now() / 1000;
  window.__rt = { frames: [], subs: [], syl: [], t0: now(), def: c.def.subs.map((x) => ({ t: x.t, d: x.d, text: x.text, voice: x.voice })) };
  new MutationObserver(() => window.__rt.subs.push({ w: now(), t: c.t, show: sub.classList.contains('show'), text: sub.textContent })).observe(sub, { attributes: true, childList: true, subtree: true, characterData: true });
  const syl = B.syllable.bind(B);
  B.syllable = (text, i) => { const n0 = B.count; syl(text, i); if (B.count > n0) window.__rt.syl.push({ w: now(), t: c.t, a: G.audio.ctx?.currentTime, line: text.slice(0, 24), i, tNext: B.tNext }); };
  let last = now();
  const tick = () => {
    if (!G.cine) return;
    const w = now(), mu = G.audio.music, v = mu?.voices?.find((x) => x.name === 'opening' && !x.stopping);
    window.__rt.frames.push({ w, dt: +(w - last).toFixed(4), t: +c.t.toFixed(3), state: G.state, paused: c.paused,
      cue: v && mu.ctx ? +(2.5 + (mu.ctx.currentTime - v.start) + v.offset).toFixed(3) : null, ctx: G.audio.ctx?.state,
      sub: +getComputedStyle(sub).opacity, subI: c.subI, fade: +getComputedStyle(fade).opacity, title: +getComputedStyle(title).opacity });
    last = w;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
if (PAUSE_AT != null) {
  await page.waitForFunction((t) => game.cine && game.cine.t >= t, PAUSE_AT, { timeout: 600000, polling: 50 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2000);
  await page.click('#pause [data-act="resume"]');
}
// (under a loaded machine the game drops time below 7.5 fps, so the scene can take longer than its 88 s: wait long,
// and keep what was logged even if it never ends)
let ended = true;
await page.waitForFunction(() => !game.cine && game.state === 'play', null, { timeout: 2400000, polling: 500 }).catch((e) => { ended = false; console.log('did not end:', e.message.split('\n')[0]); });
await page.waitForTimeout(2500);   // (the first playable moments)
const log = await ev(() => window.__rt);
log.end = await ev(() => ({ state: game.state, room: game.room?.id, hud: !document.querySelector('#hud').classList.contains('hidden') }));
log.wallSeconds = (Date.now() - tStart) / 1000;
log.ended = ended;
const video = page.video();
await context.close();
fs.renameSync(await video.path(), path.join(OUT, 'video.webm'));
fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log));
console.log('done', log.frames.length, 'frames', errs.length ? errs.slice(0, 8).join('\n') : 'no errors');
await browser.close();
