// Gibberish voices: a character's line babbles (voice.js), a sign stays silent (the typing blip), the radio is
// band-limited, and every character with a name has a voice.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== '' ? ' ' + JSON.stringify(info) : ''}`); if (!ok) fails++; };
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await ev(async () => {
  const G = window.game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  await G.audio.ctx?.resume?.();
  const B = G.audio.babble, run = (name, line) => { const c0 = B.count; G.say(name, [line]); for (let i = 0; i < 90; i++) G.step(1 / 30); const n = B.count - c0; for (let i = 0; i < 6 && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } return n; };
  const V = await import('/src/engine/voice.js');
  return {
    running: G.audio.ctx?.state,
    zoe: run('n_zoe', 'Twinsen, did you see the dean of the school of magic? He was looking for you!'),
    sign: run('', 'To the lighthouse at the end of the island.'),
    note: run('n_note', 'Back soon.'),
    radio: V.voiceFor('n_zoeradio')?.radio, hero: V.voiceFor('n_hero')?.f0, zoeF0: V.voiceFor('n_zoe')?.f0,
    stranger: V.voiceFor('n_somebody')?.f0, silentPlace: V.voiceFor('n_lighthouse'),
  };
});
check('the audio context runs headless', r.running === 'running', r);
check("Zoé's line babbles (several syllables)", r.zoe >= 6 && r.zoe <= 40, r);
check('a sign and a note stay silent', r.sign === 0 && r.note === 0, r);
check('radio voices are band-limited, Twinsen and Zoé after the originals', r.radio === true && r.hero === 195 && r.zoeF0 === 252, r);
check('anyone else gets a stable voice, places none', r.stranger > 100 && r.silentPlace === null, r);
console.log(errs.length ? errs.join('\n') : 'no errors');
if (errs.length) fails++;
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
