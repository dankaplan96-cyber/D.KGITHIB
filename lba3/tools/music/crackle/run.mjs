// MUSIC-CRACKLE (CLOUD_ORDERS 27b): the crackle measured in the desktop app's own browser (Electron from the Test Lab,
// the same switches as desktop/main.js, GPU on) on one scripted Citadel session: outdoors, walking (real keys), into an
// office room and out (gain 0.6 + 1100 Hz low-pass on the same track), dialogue ducking, the music slider, a change of
// area, combat in and out, a loop seam (Home), a piece's end and the next piece. Never the player's own saves: every
// run has its own profile.
//   serve lba3/ (e.g. python -m http.server 8123), then from lba3/:
//   TAP=0 node tools/music/crackle/run.mjs before        underruns (AudioContext.playoutStats) and frame times only
//   TAP=1 node tools/music/crackle/run.mjs before-tap    + AudioWorklet taps on the music bus and the output, and a
//                                                        recording of the music bus (music-bus.wav)
//   ONLY=slider TAP=1 …                                  the slider part alone, in the house
//   EXE="…\LBA3 The Awakening.exe" TAP=0 …               the installed app itself (fullscreen; WINDOWED=1 for a window)
//   node tools/music/crackle/analyze.mjs <label>         underruns vs long frames, discontinuities per phase per minute
//   node tools/music/crackle/dump.mjs village_b home     the source files decoded as the game decodes them
//   node tools/music/crackle/nulltest.mjs <label> <track> <ct0> <ct1> <source s at ct0> [search s]   game vs source
//   node tools/music/crackle/source.mjs                  every file alone: clipping, discontinuities, loop seams
// A baseline frame-time measurement is a TAP=0 run (the taps cost main-thread time). Not a listening test.
import { electron, HERE, RUNS, ELECTRON, GAME } from './env.mjs';
import fs from 'node:fs';
const H = HERE;
const label = process.argv[2] || 'run';
const TAP = process.env.TAP === '1';
const OUT = `${RUNS}/${label}`; fs.mkdirSync(OUT, { recursive: true });
const prof = `${RUNS}/profile-${label}-${Date.now()}`;
// EXE: the installed desktop app itself (its own files, fullscreen as the user plays it unless WINDOWED=1); never the
// user's data folder: --user-data-dir points into the runs folder
const EXE = process.env.EXE;
const app = await electron.launch(EXE
  ? { executablePath: EXE, args: ['--user-data-dir=' + prof, '--enable-blink-features=AudioContextPlayoutStats', ...(process.env.WINDOWED ? ['--windowed'] : [])], timeout: 180000 }
  : { executablePath: ELECTRON,
    args: [H + '/main.cjs', '--user-data-dir=' + prof], env: { ...process.env, ...(process.env.LOOPBACK ? { LBA_LOOPBACK: '1' } : {}), LBA_URL: GAME + '?nocine' }, timeout: 180000 });
const page = await app.firstWindow();
const logs = [];
page.on('console', (m) => { const t = m.text(); if (/audio|music|error/i.test(t)) logs.push(`${m.type()}: ${t}`); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
const ev = (f, a) => page.evaluate(f, a);
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const t0 = Date.now();
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000, polling: 500 });
console.log('booted', ((Date.now() - t0) / 1000).toFixed(0), 's');
await sleep(2);
await page.click('[data-act="new"]', { timeout: 60000 });
await page.waitForFunction(() => game.audio.ctx && game.audio.music.manifest && game.state !== 'title', null, { timeout: 120000, polling: 250 });
await sleep(3);
// (the installed app has no ?nocine: its opening cinematic is skipped as a player would)
for (let i = 0; i < 20 && await ev(() => !!game.cine); i++) { await ev(() => game.cine?.skip?.()); await sleep(2); }
await page.waitForFunction(() => game.state === 'play' && !game.cine, null, { timeout: 120000, polling: 250 }).catch(() => console.log('not in play state'));
await sleep(2);
if (process.env.LOOPBACK) await ev(() => { window.__loopback = true; });
const tapSrc = fs.readFileSync(H + '/tap.js', 'utf8');
const info = await ev(async ({ TAP, tapSrc }) => {
  const A = game.audio, ctx = A.ctx;
  const W = (window.__crk = { marks: [], stats: [], frames: [], long: [], tap: { music: { ev: [], pcm: [], peak: 0, over: 0 }, out: { ev: [], peak: 0, over: 0 } }, voices: [] });
  if (TAP) {
    const url = URL.createObjectURL(new Blob([tapSrc], { type: 'text/javascript' }));
    await ctx.audioWorklet.addModule(url);
    const mk = (id, rec) => {
      const n = new AudioWorkletNode(ctx, 'tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { id, rec } });
      n.port.onmessage = (e) => { const d = e.data, T = W.tap[id]; if (d.pcm) T.pcm.push({ at: d.at, pcm: d.pcm }); if (d.ev) { T.ev.push(...d.ev); T.peak = d.peak; T.over = d.over; T.start = d.start; T.frame = d.frame; } };
      return n;
    };
    const LOOP = !!window.__loopback;
    const tm = mk('music', !LOOP), to = mk('out', LOOP);
    A.musicBus.disconnect(); A.musicBus.connect(tm).connect(A.master);
    A.master.disconnect(); A.master.connect(to).connect(ctx.destination);
    if (LOOP) {
      // the system mix (Windows' loopback) into a recording tap that is pulled but not heard
      const st = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      st.getVideoTracks().forEach((t) => t.stop());
      W.tap.loop = { ev: [], pcm: [], peak: 0, over: 0 };
      const tl = mk('loop', true), z = ctx.createGain(); z.gain.value = 0;
      ctx.createMediaStreamSource(st).connect(tl).connect(z).connect(ctx.destination);
      W.loopTrack = st.getAudioTracks()[0]?.getSettings?.() || null;
    }
  }
  const ps = ctx.playoutStats;
  const base = ps ? { e: ps.fallbackFramesEvents, d: ps.fallbackFramesDuration, t: ps.totalFramesDuration } : null;
  W.base = base;
  W.iv = setInterval(() => {
    const M = A.music;
    W.stats.push([+performance.now().toFixed(1), +ctx.currentTime.toFixed(4), ps ? ps.fallbackFramesEvents - base.e : -1, ps ? +(ps.fallbackFramesDuration - base.d).toFixed(2) : -1, ps ? +(ps.totalFramesDuration - base.t).toFixed(0) : -1]);
    W.voices.push([+ctx.currentTime.toFixed(3), M.voices.map((v) => v.name + (v.stopping ? '-' : '') + ':' + v.gain.gain.value.toFixed(2)).join(' ')]);
  }, 250);
  let last = 0; const fr = W.frames;
  const loop = (t) => { if (last) { const d = t - last; fr.push(+d.toFixed(1)); if (d > 50) W.long.push([+t.toFixed(1), +d.toFixed(1), +ctx.currentTime.toFixed(3)]); } last = t; W.raf = requestAnimationFrame(loop); };
  W.raf = requestAnimationFrame(loop);
  return { sr: ctx.sampleRate, base: ctx.baseLatency, out: ctx.outputLatency, ps: !!ps, state: game.state, room: game.room?.id, mood: A.music.baseName };
}, { TAP, tapSrc });
console.log('instrumented', JSON.stringify(info));
const mark = (name) => ev((name) => { const W = window.__crk, A = game.audio; W.marks.push([name, +A.ctx.currentTime.toFixed(3), +performance.now().toFixed(1), A.music.baseName, game.room?.id || 'out']); }, name);
const S = +(process.env.SECS || 1);
const hold = async (key, s) => { await page.keyboard.down(key); await sleep(s); await page.keyboard.up(key); };

let seam = null;
// (the playlists' random choices from a fixed sequence, as tests/music.mjs does)
await ev(() => { game.audio.music.rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); });
if (process.env.ONLY === 'slider') {
  // the music volume slider alone, in the house (Home loops there): four moves, 1.5 s apart
  await sleep(4); await mark('slider');
  for (const v of [0.35, 0.55, 0.2, 0.55]) { await ev((v) => { game.settings.music = v; game.applySettings(); }, v); await sleep(1.5); }
  await sleep(2); await mark('end'); await sleep(1);
} else {
// 1 village square outdoors
await mark('village'); await ev(() => game.exitRoom({ x: -40, z: 0, a: 0 }, true)); await sleep(25 * S);
// 2 walking (real input)
await mark('walk'); await hold('ArrowUp', 6 * S); await hold('ArrowLeft', 2 * S); await hold('ArrowDown', 6 * S); await sleep(1);
// 3 into the water office (office mood: same track, gain 0.6 + lowpass 1100 Hz), and out again
await mark('office-in'); await ev(() => game.enterRoom('office')); await sleep(12 * S);
await mark('office-out'); await ev(() => game.exitRoom({ x: -40, z: 0, a: 0 })); await sleep(12 * S);
// 4 dialogue ducking x3
await mark('duck');
for (let i = 0; i < 3; i++) { await ev(() => game.audio.duck(true)); await sleep(3); await ev(() => game.audio.duck(false)); await sleep(3); }
// 4b the music volume slider moved (settings: what an input event on the slider does)
await mark('slider');
for (const v of [0.35, 0.55, 0.2, 0.55]) { await ev((v) => { game.settings.music = v; game.applySettings(); }, v); await sleep(1.5); }
await sleep(1);
// 5 change of area: the open island (crossfade on a bar line), and back to town
await mark('island'); await ev(() => game.exitRoom(game.story.chapters[0].exitTo('outdoor'))); await sleep(20 * S);
await mark('town'); await ev(() => game.exitRoom({ x: -40, z: 0, a: 0 })); await sleep(15 * S);
// 6 combat in and out (the game's own per-frame call held off meanwhile)
await mark('combat-in');
await ev(() => { const A = game.audio; A.__sc = A.setCombat; A.setCombat = () => {}; window.__thr = setInterval(() => A.music.setCombat(1), 100); });
await sleep(12 * S);
await mark('combat-out');
await ev(() => { clearInterval(window.__thr); window.__thr = setInterval(() => game.audio.music.setCombat(0), 100); });
await sleep(10 * S);
await ev(() => { clearInterval(window.__thr); game.audio.setCombat = game.audio.__sc; });
// 7 a loop seam: Home resumed 6 s before its loop end (crossfade town -> home, then the seam)
await mark('home-seam');
seam = await ev(() => { const M = game.audio.music, i = M.manifest.tracks.home; M.resume.set('home', { offset: i.loopEnd - 6, at: game.audio.ctx.currentTime }); game.enterRoom('house'); return { loopStart: i.loopStart, loopEnd: i.loopEnd }; });
await sleep(14 * S);
// 8 a piece's end outdoors: fade over its last bars, a short silence, the next piece from its first bar
await mark('piece-end'); await ev(() => game.exitRoom({ x: -40, z: 0, a: 0 })); await sleep(8);
await ev(() => { const M = game.audio.music; M.gapRange = [4, 4]; M.finishPiece(); }); await sleep(18 * S);
await mark('end');
await sleep(1.5);
}
const res = await ev(() => {
  const W = window.__crk, A = game.audio; clearInterval(W.iv); cancelAnimationFrame(W.raf);
  return { marks: W.marks, stats: W.stats, frames: W.frames, long: W.long, voices: W.voices, log: A.music.log.slice(-60), maxVoices: A.music.maxVoices, sr: A.ctx.sampleRate, base: A.ctx.baseLatency,
    tap: Object.fromEntries(Object.entries(W.tap).map(([k, T]) => [k, { ev: T.ev, peak: T.peak, over: T.over, start: T.start, chunks: T.pcm?.length || 0 }])), loopTrack: W.loopTrack || null,
    gameStats: A.stats?.() ?? null };
});
res.seam = seam; res.logs = logs; res.label = label; res.tapMode = TAP;
fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res));
for (const which of (TAP ? (process.env.LOOPBACK ? ['out', 'loop'] : ['music']) : [])) {
  // a tap's recording, as a WAV (16-bit stereo) with its first frame number
  const n = await ev((which) => { const P = window.__crk.tap[which].pcm; let len = 0; for (const c of P) len += c.pcm.length; const all = new Int16Array(len); let o = 0; for (const c of P) { all.set(c.pcm, o); o += c.pcm.length; } window.__all = all; return { len, first: P[0]?.at }; }, which);
  const parts = [];
  for (let i = 0; i < n.len; i += 1 << 21) {
    parts.push(Buffer.from(await ev(([i, k]) => { const a = window.__all.subarray(i, i + k); let s = ''; const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let j = 0; j < u.length; j += 0x8000) s += String.fromCharCode.apply(null, u.subarray(j, j + 0x8000)); return btoa(s); }, [i, 1 << 21]), 'base64'));
  }
  const pcm = Buffer.concat(parts);
  const hdr = Buffer.alloc(44); const sr = res.sr;
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(`${OUT}/${which === 'music' ? 'music-bus' : which}.wav`, Buffer.concat([hdr, pcm]));
  fs.writeFileSync(`${OUT}/${which === 'music' ? 'music-bus' : which}.json`, JSON.stringify({ firstFrame: n.first, frames: n.len / 2, sr }));
}
const fr = res.frames.slice().sort((a, b) => a - b), q = (p) => fr[Math.floor(p * (fr.length - 1))];
const st = res.stats.at(-1);
console.log(JSON.stringify({ label, tap: TAP, underrunEvents: st?.[2], underrunMs: st?.[3], totalMs: st?.[4], frames: fr.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: fr.at(-1), long50: res.long.length,
  tapMusicEvents: res.tap.music.ev.length, tapOutEvents: res.tap.out.ev.length, peakMusic: res.tap.music.peak, peakOut: res.tap.out.peak, overOut: res.tap.out.over, maxVoices: res.maxVoices }));
await app.close();
fs.rmSync(prof, { recursive: true, force: true });
