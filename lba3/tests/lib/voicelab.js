// Voice lab (runs in the page): renders a speaker's babble offline with the game's own Babble class
// (src/engine/voice.js), driven exactly as the dialogue box drives it (the line typing out frame by frame at the
// normal text speed), and measures it. Used by tests/voices.mjs and tools/voice-render.mjs. Measuring only:
// nothing here says how a voice sounds to a listener.

// render one line: returns Float32Array samples (mono) at `sr`
// (`lines`: say it that many times in a row, a new start each time; `nodes` counts the audio nodes made per line)
export async function render(mod, nameKey, text, { sr = 32000, cps = 50, fps = 60, tail = 0.7, vol = 1, seed = 7, stopAt = null, lines = 1 } = {}) {
  const len = (lines * text.length) / cps + tail;
  let made = 0;
  const off = new OfflineAudioContext(1, Math.ceil(len * sr), sr);
  let now = 0;
  // the game's Babble reads ctx.state / ctx.currentTime; offline, the clock is the simulated frame time
  const ctx = new Proxy(off, {
    get(t, k) {
      if (k === 'state') return 'running';
      if (k === 'currentTime') return now;
      const v = t[k];
      if (typeof v !== 'function') return v;
      return typeof k === 'string' && k.startsWith('create') ? (...a) => { made++; return v.apply(t, a); } : v.bind(t);
    },
  });
  const bus = off.createGain(); bus.gain.value = vol; bus.connect(off.destination);
  // the engine's noise buffer (2 s of white noise), seeded so renders repeat
  const nb = off.createBuffer(1, sr * 2, sr), d = nb.getChannelData(0);
  let a = seed >>> 0;
  for (let i = 0; i < d.length; i++) { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; d[i] = a / 2147483648 - 1; }
  const audio = { ctx, voiceBus: bus, vol: { voice: vol }, noiseBuf: nb };
  const B = new mod.Babble(audio);
  let frames = 0, f = 0;
  const nodes = [];
  for (let n = 0; n < lines; n++) {
    const m0 = made;
    B.start(nameKey);
    let shown = 0;
    for (; shown < text.length; f++) {
      now = f / fps;
      if (stopAt != null && now >= stopAt) { B.hush?.(); B.stop(); break; }
      const before = Math.floor(shown);
      shown = Math.min(text.length, shown + cps / fps);
      const nowI = Math.floor(shown);
      if (nowI !== before) B.chars(text, before, nowI);
      frames++;
    }
    nodes.push(made - m0);
  }
  const buf = await off.startRendering();
  return { data: buf.getChannelData(0), sr, syllables: B.count, frames, nodes };
}

// in-place radix-2 FFT (re, im)
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k], br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi; re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -200);
const pct = (arr, q) => { if (!arr.length) return 0; const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]; };

// measurements: level, spectrum, pitch, rhythm, clicks
export function analyse(data, sr) {
  const N = 2048, hop = 512;
  // level
  let peak = 0, maxJump = 0, maxD2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    if (Math.abs(x) > peak) peak = Math.abs(x);
    if (i > 0) { const j = Math.abs(x - data[i - 1]); if (j > maxJump) maxJump = j; }
    if (i > 1) { const d2 = Math.abs(x - 2 * data[i - 1] + data[i - 2]); if (d2 > maxD2) maxD2 = d2; }
  }
  // clicks: a click is a broadband spike, so its second difference stands far out of the second difference around
  // it (±5 ms); a smooth, band-limited voice keeps this ratio small even where it is loud and bright
  const half = Math.round(sr * 0.005), d2 = new Float32Array(data.length), cum = new Float64Array(data.length + 1);
  for (let i = 2; i < data.length; i++) d2[i] = data[i] - 2 * data[i - 1] + data[i - 2];
  for (let i = 0; i < data.length; i++) cum[i + 1] = cum[i] + d2[i] * d2[i];
  let clickCrest = 0;
  for (let i = 2; i < data.length; i++) {
    const a = Math.abs(d2[i]);
    if (a < 0.004) continue; // (below audibility for a click at these levels)
    const lo = Math.max(0, i - half), hi = Math.min(data.length, i + half + 1);
    const local = Math.sqrt(Math.max(1e-12, (cum[hi] - cum[lo] - a * a) / (hi - lo - 1)));
    if (a / local > clickCrest) clickCrest = a / local;
  }
  // frames
  const frames = [];
  for (let s = 0; s + N <= data.length; s += hop) {
    let e = 0; for (let i = 0; i < N; i++) e += data[s + i] * data[s + i];
    frames.push({ s, rms: Math.sqrt(e / N) });
  }
  const fmax = Math.max(1e-9, ...frames.map((f) => f.rms));
  const active = frames.filter((f) => f.rms > fmax * 0.1);    // within 20 dB of the loudest frame
  let eAct = 0; for (const f of active) eAct += f.rms * f.rms;
  const rmsActive = Math.sqrt(eAct / Math.max(1, active.length));
  // spectral centroid (energy weighted over active frames)
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  let cNum = 0, cDen = 0;
  for (const f of active) {
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let i = 0; i < N; i++) re[i] = data[f.s + i] * win[i];
    fft(re, im);
    let num = 0, den = 0;
    for (let k = 1; k < N / 2; k++) { const m = Math.hypot(re[k], im[k]); num += (k * sr / N) * m; den += m; }
    if (den > 0) { const w = f.rms * f.rms; cNum += (num / den) * w; cDen += w; }
  }
  const centroid = cDen ? cNum / cDen : 0;
  // pitch per active frame: YIN (cumulative mean normalised difference), 60–700 Hz
  const pitches = [];
  const W = 1024, lmin = Math.floor(sr / 700), lmax = Math.ceil(sr / 60), dd = new Float32Array(lmax + 2);
  for (const f of active) {
    const s = f.s;
    if (s + W + lmax + 1 > data.length) continue;
    let run = 0; dd[0] = 1;
    for (let L = 1; L <= lmax + 1; L++) {
      let d = 0; for (let i = 0; i < W; i++) { const x = data[s + i] - data[s + i + L]; d += x * x; }
      run += d; dd[L] = run > 0 ? (d * L) / run : 1;
    }
    let bl = 0;
    for (let L = lmin; L <= lmax; L++) if (dd[L] < 0.15) { while (L + 1 <= lmax && dd[L + 1] < dd[L]) L++; bl = L; break; }
    if (!bl) continue; // unvoiced or unclear: no pitch
    // an octave-up error: the dip at twice the lag is much deeper (formant-filtered tones with a weak fundamental)
    for (let k = 0; k < 2 && 2 * bl + 3 <= lmax; k++) {
      let m2 = 2 * bl; for (let L = 2 * bl - 3; L <= 2 * bl + 3; L++) if (dd[L] < dd[m2]) m2 = L;
      if (dd[m2] < dd[bl] * 0.5) bl = m2; else break;
    }
    const y0 = dd[bl - 1], y1 = dd[bl], y2 = dd[bl + 1];
    const den = y0 - 2 * y1 + y2, sh = den ? (0.5 * (y0 - y2)) / den : 0;
    pitches.push(sr / (bl + Math.max(-0.5, Math.min(0.5, sh))));
  }
  const f0med = pct(pitches, 0.5), f0lo = pct(pitches, 0.1), f0hi = pct(pitches, 0.9);
  // rhythm: syllable onsets from a 5 ms envelope (rises through 35 % of the peak envelope, with hysteresis)
  const eh = Math.round(sr * 0.005), env = [];
  for (let s = 0; s + eh <= data.length; s += eh) { let e = 0; for (let i = 0; i < eh; i++) e += data[s + i] * data[s + i]; env.push(Math.sqrt(e / eh)); }
  // smooth 15 ms
  const sm = env.map((_, i) => (env[i - 1] ?? env[i]) * 0.25 + env[i] * 0.5 + (env[i + 1] ?? env[i]) * 0.25);
  const emax = Math.max(1e-9, ...sm);
  // an onset: the envelope rises to twice (6 dB over) the valley before it, above 8 % of the loudest; the next one
  // needs a fall to half of this peak first
  let onsets = 0, up = false, first = -1, last = -1, on = 0, valley = Infinity, pk = 0;
  for (let i = 0; i < sm.length; i++) {
    const x = sm[i];
    if (!up) { valley = Math.min(valley, x); if (x > emax * 0.08 && x > valley * 2) { up = true; onsets++; pk = x; if (first < 0) first = i; } }
    else { pk = Math.max(pk, x); if (x < pk * 0.5) { up = false; valley = x; } }
    if (x > emax * 0.1) { on++; last = i; }
  }
  const span = first >= 0 ? (last - first + 1) * 0.005 : 0;
  return {
    peak: +peak.toFixed(4), peakDb: +db(peak).toFixed(1), rmsActive: +rmsActive.toFixed(4), rmsDb: +db(rmsActive).toFixed(1),
    centroid: Math.round(centroid), f0: Math.round(f0med), f0lo: Math.round(f0lo), f0hi: Math.round(f0hi),
    rangeSt: f0lo > 0 ? +(12 * Math.log2(f0hi / f0lo)).toFixed(1) : 0,
    sylRate: span > 0 ? +(onsets / span).toFixed(2) : 0, voiced: span > 0 ? +((on * 0.005) / span).toFixed(2) : 0,
    maxJump: +maxJump.toFixed(4), maxD2: +maxD2.toFixed(4), clickCrest: +clickCrest.toFixed(1), pitchFrames: pitches.length, seconds: +(data.length / sr).toFixed(2),
  };
}

// a feature vector for distances: 1 unit ≈ a clearly audible step on that axis
// (3 semitones of median pitch, 3 of pitch range, 3 of spectral centroid, 1.5 syllables a second, 15 % voicing)
export function features(m) {
  return [12 * Math.log2(Math.max(1, m.f0) / 100) / 3, m.rangeSt / 3, 12 * Math.log2(Math.max(1, m.centroid) / 500) / 3, m.sylRate / 1.5, m.voiced / 0.15];
}
export const FEATURE_NAMES = ['pitch', 'range', 'timbre', 'rate', 'legato'];

// 16-bit PCM WAV, base64
export function wavBase64(data, sr) {
  const n = data.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true);
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// a deliberately clicky control (a tone switched on and off with no ramp) to prove the click check catches clicks
export function clickyControl(sr = 32000) {
  const d = new Float32Array(sr);
  for (let i = 0; i < d.length; i++) d[i] = (i % 3200) < 1600 ? 0.2 * Math.sin((2 * Math.PI * 220 * i) / sr + 1.1) : 0;
  return d;
}

// a spectrogram (0–fmax Hz, 60 dB below the panel's loudest bin) drawn into a 2D canvas context at x, y, w × h
export function spectrogram(g, data, sr, x, y, w, h, fmax = 6000) {
  const N = 1024, bins = Math.floor((fmax / sr) * N);
  const img = g.createImageData(w, h);
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const cols = [];
  let top = -200;
  for (let c = 0; c < w; c++) {
    const s = Math.floor((c / w) * Math.max(0, data.length - N));
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let i = 0; i < N; i++) re[i] = (data[s + i] || 0) * win[i];
    fft(re, im);
    const col = new Float32Array(bins + 2);
    for (let k = 1; k <= bins + 1; k++) { col[k] = 20 * Math.log10(Math.hypot(re[k], im[k]) + 1e-9); top = Math.max(top, col[k]); }
    cols.push(col);
  }
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      const k = Math.floor(((h - 1 - r) / h) * bins) + 1;
      const v = Math.max(0, Math.min(1, (cols[c][k] - top + 60) / 60));
      const o = (r * w + c) * 4;
      img.data[o] = 255 * Math.min(1, v * 1.6); img.data[o + 1] = 255 * Math.max(0, v * 1.6 - 0.5); img.data[o + 2] = 90 * (1 - v) + 40; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, x, y);
}
