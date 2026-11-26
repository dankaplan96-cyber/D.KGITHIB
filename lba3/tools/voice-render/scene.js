// Voice render harness (runs in the page, loaded by tools/voice-render/render.mjs): plays a scripted conversation
// through the game's own Babble (src/engine/voice.js) in an OfflineAudioContext, driven the way the game drives it
// (the dialogue box typing at hud.textRate, or a cinematic's subtitles), on the render clock (ctx.suspend every
// frame), through a copy of the voice bus in src/engine/audio.js, with an optional music bed ducked as in the game.
// Returns the mix and, separately, the voice alone, plus a per-frame log (mouth opening, voices alive).
// Measuring and listening material only: nothing here says how a voice sounds to a person.

// scene: { len (s), turns: [{ key: 'n_zoe', text, at (s), say (true: a new dialogue box / speaker), d (cinematic: the
//   subtitle's seconds), mode: 'dialog' | 'cine' }] }
// opts: { sr, fps, voiceVol, master, music (ArrayBuffer of an mp3) , musicAt (s into the track), musicVol, pres (dB),
//   cps (text speed), prepare (async (B) => {}) to load what the voice needs before rendering, skipAt: [s...] (reveal the
//   text at once at these times, the player's E) }
export async function renderScene(V, scene, opts = {}) {
  const sr = opts.sr || 48000, fps = opts.fps || 50, cps = opts.cps || 50;
  const len = scene.len;
  const off = new OfflineAudioContext(2, Math.ceil(len * sr), sr);
  // the game's Babble reads ctx.state / ctx.currentTime: while a suspended offline render is being driven the state
  // reads 'suspended', so the voice would think it can't be heard; it runs, as in the game
  const ctx = new Proxy(off, {
    get(t, k) {
      if (k === 'state') return 'running';
      const v = t[k];
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  const master = off.createGain(); master.gain.value = opts.master ?? 0.8; master.connect(off.destination);
  // --- the voice bus (audio.js init): bus (voice slider x VOICE_BOOST) -> compressor -> presence -> makeup -> limiter
  const voiceBus = off.createGain(); voiceBus.gain.value = (opts.voiceVol ?? 0.8) * 2.2;
  const comp = off.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.18;
  const pres = off.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2500; pres.Q.value = 0.8; pres.gain.value = opts.pres ?? 0;
  const makeup = off.createGain(); makeup.gain.value = 2.2;
  const lim = off.createDynamicsCompressor();
  lim.threshold.value = -4; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
  voiceBus.connect(comp).connect(pres).connect(makeup).connect(lim);
  // the voice alone (after the bus, before the master) goes to channel 1, the mix to channel 0 (split below)
  const merger = off.createChannelMerger(2);
  const mixSum = off.createGain();
  lim.connect(master);
  master.disconnect(); master.connect(mixSum);
  mixSum.connect(merger, 0, 0);
  const voiceOnly = off.createGain(); voiceOnly.gain.value = opts.master ?? 0.8; lim.connect(voiceOnly); voiceOnly.connect(merger, 0, 1);
  merger.connect(off.destination);
  // --- the music bed (music.js): the music slider, then the ducking stage (0.5 under dialogue, 0.25 s down, back up
  //     0.45 s after the last line over 0.9 s)
  let duckG = null;
  if (opts.music) {
    const buf = await off.decodeAudioData(opts.music.slice(0));
    const src = off.createBufferSource(); src.buffer = buf;
    const mv = off.createGain(); mv.gain.value = opts.musicVol ?? 0.55;
    duckG = off.createGain(); duckG.gain.value = 1;
    src.connect(mv).connect(duckG).connect(master);
    src.start(0, opts.musicAt || 0);
  }
  // the engine's noise buffer (2 s of white noise, seeded so renders repeat)
  const nb = off.createBuffer(1, sr * 2, sr), d = nb.getChannelData(0);
  let a = 7;
  for (let i = 0; i < d.length; i++) { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; d[i] = a / 2147483648 - 1; }
  let unduckAt = -1;
  const audio = {
    ctx, voiceBus, vol: { voice: opts.voiceVol ?? 0.8 }, noiseBuf: nb,
    duck(on) {
      if (!duckG) return;
      const g = duckG.gain, t = off.currentTime;
      if (on) { unduckAt = -1; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.5, t + 0.25); }
      else unduckAt = t + 0.45;
    },
  };
  const B = new V.Babble(audio);
  if (opts.prepare) await opts.prepare(B, audio);

  // --- the frames
  const turns = [...scene.turns].sort((x, y) => x.at - y.at);
  const skips = [...(opts.skipAt || [])].sort((x, y) => x - y);
  let cur = null, open = false, ti = 0;
  const log = [];
  const frame = (t) => {
    B.mt = t;
    if (unduckAt >= 0 && t >= unduckAt) { const g = duckG.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1, t + 0.9); unduckAt = -1; }
    // a turn ends where the next begins (the player presses on), or at its own end (`end`)
    if (cur && cur.end != null && t >= cur.end && open) { B.stop(); open = false; cur = null; }
    while (ti < turns.length && turns[ti].at <= t + 1e-6) {
      const u = turns[ti++];
      if (u.mode === 'cine') { B.stop(); B.start(u.key, { maxDur: u.d ? u.d - 0.2 : undefined }); open = true; }
      else if (u.say || !open) { if (open) B.stop(); B.start(u.key); open = true; }
      cur = { ...u, shown: 0, rate: u.mode === 'cine' ? Math.min(50, Math.max(28, u.text.length / ((u.d || 2) * 0.8))) : cps };
      if (u.mode === 'cine' && u.d) cur.end = u.at + u.d;
      else if (u.end != null) cur.end = u.end;
    }
    if (cur && open) {
      if (skips.length && t >= skips[0]) { skips.shift(); if (cur.shown < cur.text.length) { cur.shown = cur.text.length; B.hush?.(); } }
      if (cur.shown < cur.text.length) {
        const before = Math.floor(cur.shown);
        cur.shown = Math.min(cur.text.length, cur.shown + cur.rate / fps);
        const now = Math.floor(cur.shown);
        if (now !== before) B.chars(cur.text, before, now);
      }
      B.pump?.();
    }
    const m = B.mouth ? B.mouth(t) : { o: 0 };
    log.push([+t.toFixed(3), +m.o.toFixed(3), B.live ?? 0, B.active ?? 0]);
  };
  const N = Math.floor(len * fps);
  for (let f = 1; f < N; f++) {
    const t = f / fps;
    off.suspend(t).then(() => { frame(off.currentTime); off.resume(); });
  }
  frame(0);
  const out = await off.startRendering();
  return { mix: out.getChannelData(0), voice: out.getChannelData(1), sr, log, count: B.count, played: B.played ? [...B.played] : [] };
}

// Float32Array -> base64 (to hand PCM back to Node)
export function f32Base64(arr) {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
