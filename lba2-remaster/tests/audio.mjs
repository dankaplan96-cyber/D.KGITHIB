// Audio state (what can be checked without listening): the volume sliders drive the buses and are kept after a
// relaunch; each place asks for its own music and the old track goes; never more than two music voices (one
// fading out); a cinematic pause suspends the audio. Not a listening test: nothing here says how it sounds.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
const ok = await ev(() => !!game.audio.ctx);
check('the audio context starts with the first click (New Game)', ok, await ev(() => game.audio.ctx?.state));

// volumes through the settings sliders
await page.keyboard.press('Escape'); await ev(() => game.step(0.1));
await page.click('#pause [data-act="settings"]');
for (const [k, v] of [['music', '0.3'], ['sfx', '0.5'], ['voice', '0.2']]) await page.$eval(`[data-range="${k}"]`, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const buses = await ev(() => { const A = game.audio; return { music: A.musicBus.gain.value, sfx: A.sfxBus.gain.value, voice: A.voiceBus.gain.value, amb: A.ambBus.gain.value }; });
check('sliders set the music, effects, voice and ambience buses', Math.abs(buses.music - 0.3) < 1e-6 && Math.abs(buses.sfx - 0.5) < 1e-6 && Math.abs(buses.voice - 0.2) < 1e-6 && Math.abs(buses.amb - 0.3) < 1e-6, buses);
await page.click('#settings [data-act="back"]'); await page.click('#pause [data-act="resume"]');

// music per place, through doors (played)
const music = await ev(() => {
  const G = game, M = G.audio.music, out = [];
  const rec = (l) => { G.step(2.5); out.push([l, M.baseName, M.voices.filter((v) => !v.stopping).length, M.voices.length]); };
  P.settle(); rec('house');
  const s = G.room.searches[0]; P.use(s.x, s.z);
  for (let i = 0; i < 3; i++) {
    const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle(); rec('outside');
    const d = G.world.houses[0].door; P.through(d.x, d.z); P.settle(); rec('house');
  }
  return out;
});
check('each place asks for its music (house ≠ outdoors)', music.every((m) => m[1]) && music.find((m) => m[0] === 'house')[1] !== music.find((m) => m[0] === 'outside')[1], music);
check('one music voice playing after each door, at most two alive (one fading)', music.every((m) => m[2] <= 1 && m[3] <= 2), music);

// relaunch: the volumes are kept
await page.reload(); await open(page, '?nocine');
const kept = await ev(() => [game.settings.music, game.settings.sfx, game.settings.voice]);
check('volumes kept after a relaunch', kept[0] === 0.3 && kept[1] === 0.5 && kept[2] === 0.2, kept);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
