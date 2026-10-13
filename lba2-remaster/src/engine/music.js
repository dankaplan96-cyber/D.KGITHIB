// Music manager: plays the rendered soundtrack (assets/music/*.mp3, described by manifest.json) with WebAudio.
//
//   audio.setMood(name)   base music for the current place (room / outdoor area); same track → keeps playing
//   audio.cue(name)       a story cue that overrides the base music; a one-shot cue hands back when it ends
//   audio.endCue()        fade a cue out early and return to the base music
//   audio.setCombat(x)    0..1 every frame while playing; enters/leaves combat music with hysteresis
//   audio.duck(on)        lowers the music under dialogue / important events
//
// Tracks are decoded on demand (fetch + decodeAudioData) and the likely next one is prefetched; nothing
// blocks the game while music loads. Loops use AudioBufferSourceNode.loopStart/loopEnd from the manifest
// (the renders are built so the seam is sample-continuous). Changes crossfade with equal-power curves.
// Leaving a track and coming back to it within a couple of minutes resumes where it was.

// mood name → track (or a spec with gain / low-pass for "heard from inside") ; null = silence
export const MOODS = {
  title: 'main_theme',
  home: 'home', house: 'home',
  citadel: 'village', calm: 'village', clear: 'village', village: 'village', harbour: 'village',
  office: { track: 'village', gain: 0.6, lowpass: 1100 }, // town interiors: the square heard through the walls
  island: 'island',
  cave: 'well', storm: 'well', well: 'well', underworld: 'well', under: 'well',
  workshop: 'workshop',
  zeelich: 'zeelich',
  desert: 'island', // (until the desert track is written)
  hamalayi: 'well',  // (until the mountain track is written)
  station: 'facility', control: 'facility', facility: 'facility',
  stealth: 'facility_stealth',
  combat: 'combat',
  revelation: 'revelation',
  boss: 'finale', finale: 'finale',
  ending: 'homecoming', credits: 'homecoming', homecoming: 'homecoming',
  silence: null,
};
// what to prefetch once a track is playing
const NEXT = {
  main_theme: ['home'], home: ['village'], village: ['island', 'combat'], island: ['village', 'combat'],
  well: ['revelation'], facility: ['facility_stealth', 'combat'], zeelich: ['workshop', 'combat'],
  workshop: ['zeelich'], facility_stealth: ['facility'],
};

// moods that end a running story cue
const STRONG = new Set(['title', 'ending', 'credits', 'homecoming', 'boss', 'finale']);
const FADE = { area: 2.6, combatIn: 1.1, combatOut: 2.8, cue: 1.8, room: 1.6 };
const COMBAT_ENTER = 1.2; // s of sustained threat before the combat music starts
const COMBAT_EXIT = 3.5; //  s of calm before it hands back
const RESUME_WINDOW = 150; // s: coming back to a track within this resumes it
const CACHE = 3; // decoded buffers kept (a decoded 2.5 min stereo track is ~55 MB at 48 kHz)

function spec(name) {
  if (!(name in MOODS)) return name ? { track: name, gain: 1 } : null; // a track name used directly
  const m = MOODS[name];
  if (m === null) return null;
  return typeof m === 'string' ? { track: m, gain: 1 } : { gain: 1, ...m };
}

export class Music {
  constructor(audio) {
    this.a = audio;
    this.base = null; // spec
    this.baseName = null;
    this.cueSpec = null;
    this.combat = false;
    this.threat = 0;
    this.threatT = 0;
    this.calmT = 0;
    this.voices = []; // {name, src, gain, filter, start, offset, info, spec}
    this.buffers = new Map(); // name → {buf, promise, used}
    this.resume = new Map(); // name → {offset, at}
    this.manifest = null;
    this.url = (typeof window !== 'undefined' && window.LBA_MUSIC_URL) || 'assets/music/';
    this.log = [];
  }
  get ctx() { return this.a.ctx; }

  // called once the AudioContext exists
  start() {
    const ctx = this.ctx;
    this.out = ctx.createGain(); // ducking stage
    this.out.connect(this.a.musicBus);
    // combat watchdog: setCombat() is only called while the player has control; if it stops being called
    // (dialogue, cutscene, game over) the threat is treated as gone
    setInterval(() => {
      if (this.combat && this.ctx && this.ctx.currentTime - (this._lastCombatCall || 0) > 2.5) { this.combat = false; this.threatT = 0; this._update('combatOut'); }
    }, 1000);
    this.ready = fetch(this.url + 'manifest.json').then((r) => r.json()).then((m) => { this.manifest = m; this._update(); })
      .catch((e) => { console.warn('music manifest unavailable', e); this.manifest = { tracks: {} }; });
  }

  // a short history for the debug overlay (bounded: a long session changes music thousands of times)
  _log(line) { this.log.push(line); if (this.log.length > 200) this.log.splice(0, 100); }

  // ---------------------------------------------------------------- public API
  setMood(name) {
    const s = spec(name);
    const endsCue = STRONG.has(name) && !!this.cueSpec; // title / ending / boss take over from a story cue
    if (endsCue) this.cueSpec = null;
    if (sameSpec(s, this.base) && !endsCue) { this.baseName = name; return; }
    this.base = s;
    this.baseName = name;
    this._update();
  }
  cue(name) {
    const s = spec(name);
    if (sameSpec(s, this.cueSpec)) return;
    this.cueSpec = s;
    this._update();
  }
  endCue() {
    if (!this.cueSpec) return;
    this.cueSpec = null;
    this._update();
  }
  setCombat(level) {
    const now = this.ctx ? this.ctx.currentTime : performance.now() / 1000;
    const dt = this._lastCombatCall ? Math.min(0.25, now - this._lastCombatCall) : 0;
    this._lastCombatCall = now;
    this.threat = level;
    if (level > 0.55) { this.threatT += dt; this.calmT = 0; } else if (level < 0.25) { this.calmT += dt; this.threatT = 0; }
    if (!this.combat && this.threatT >= COMBAT_ENTER) { this.combat = true; this._update('combatIn'); }
    if (this.combat && this.calmT >= COMBAT_EXIT) { this.combat = false; this._update('combatOut'); }
  }
  duck(on) {
    if (!this.ctx || !this.out) return;
    const g = this.out.gain, t = this.ctx.currentTime;
    clearTimeout(this._duckTimer);
    if (on) {
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.55, t + 0.25);
    } else {
      // short delay: consecutive dialogue lines do not pump the music up and down
      this._duckTimer = setTimeout(() => {
        const t2 = this.ctx.currentTime;
        g.cancelScheduledValues(t2); g.setValueAtTime(g.value, t2); g.linearRampToValueAtTime(1, t2 + 0.9);
      }, 450);
    }
  }

  // what should be playing now
  target() {
    if (this.cueSpec) return this.cueSpec;
    if (this.combat && this.has('combat') && this.base) return { track: 'combat', gain: 1 };
    return this.base;
  }
  has(track) { return !!this.manifest?.tracks?.[track]; }

  state() {
    const t = this.ctx?.currentTime ?? 0;
    return {
      base: this.baseName, cue: this.cueSpec?.track || null, combat: this.combat, target: this.target()?.track || null,
      voices: this.voices.map((v) => ({ track: v.name, gain: +v.gain.gain.value.toFixed(3), pos: +this._pos(v, t).toFixed(2), stopping: !!v.stopping })),
      loaded: [...this.buffers.entries()].filter(([, b]) => b.buf).map(([k]) => k),
      log: this.log.slice(-20),
    };
  }

  // ---------------------------------------------------------------- loading
  load(name) {
    let e = this.buffers.get(name);
    if (e) { e.used = performance.now(); return e.promise; }
    const info = this.manifest?.tracks?.[name];
    if (!info || !this.ctx) return Promise.resolve(null);
    e = { buf: null, used: performance.now() };
    e.promise = fetch(this.url + info.file).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then((buf) => { e.buf = buf; this._evict(); this._log(`loaded ${name}`); return buf; })
      .catch((err) => { console.warn('music load failed', name, err); this.buffers.delete(name); return null; });
    this.buffers.set(name, e);
    return e.promise;
  }
  _evict() {
    const playing = new Set(this.voices.map((v) => v.name));
    const want = this.target()?.track;
    const loaded = [...this.buffers.entries()].filter(([k, b]) => b.buf && !playing.has(k) && k !== want);
    const extra = this.buffers.size - CACHE;
    if (extra <= 0) return;
    loaded.sort((x, y) => x[1].used - y[1].used).slice(0, extra).forEach(([k]) => this.buffers.delete(k));
  }
  _prefetch(name) {
    const next = (NEXT[name] || []).filter((n) => this.has(n) && !this.buffers.has(n));
    if (!next.length) return;
    clearTimeout(this._preT);
    // after the current track has settled, one at a time
    this._preT = setTimeout(() => this.load(next[0]).then(() => this._prefetch(name)), 4000);
  }

  // ---------------------------------------------------------------- playback
  _pos(v, t) {
    const el = Math.max(0, t - v.start) + v.offset;
    const i = v.info;
    if (!i.loop || el < i.loopEnd) return el;
    const L = i.loopEnd - i.loopStart;
    return i.loopStart + ((el - i.loopStart) % L);
  }
  _current() { return this.voices.find((v) => !v.stopping) || null; }

  _update(kind) {
    if (!this.ctx || !this.manifest) return;
    const want = this.target();
    const cur = this._current();
    const fade = FADE[kind] || (this.cueSpec ? FADE.cue : FADE.area);
    const token = (this._token = (this._token || 0) + 1); // any newer decision cancels a pending track load
    if (!want || !this.has(want.track)) {
      if (want && !this.has(want.track)) this._log(`no track for ${want.track}`);
      if (cur) this._stop(cur, fade);
      return;
    }
    if (cur && cur.name === want.track) { this._shape(cur, want, Math.min(fade, FADE.room)); return; } // same track: keep playing
    // the wanted track is still fading out (quick back-and-forth through a door): bring it back instead of restarting
    const back = this.voices.find((v) => v.stopping && !v.fast && v.name === want.track);
    if (back) {
      clearTimeout(back.stopTimer);
      back.stopping = false;
      if (cur) this._stop(cur, fade);
      this._shape(back, want, Math.min(fade, FADE.room));
      this._log(`revive ${back.name}`);
      return;
    }
    this.load(want.track).then((buf) => {
      if (!buf || token !== this._token) return; // superseded while loading
      const now = this._current();
      if (now && now.name === want.track) { this._shape(now, want, fade); return; }
      let offset = 0;
      const info = this.manifest.tracks[want.track];
      const r = this.resume.get(want.track);
      if (now && info.group && now.info.group === info.group) offset = this._pos(now, this.ctx.currentTime); // stems of one piece: stay in sync
      else if (r && this.ctx.currentTime - r.at < RESUME_WINDOW) offset = r.offset;
      if (now) this._stop(now, fade);
      this._play(want, buf, offset, fade);
    });
  }

  _play(s, buf, offset, fade) {
    const ctx = this.ctx, t = ctx.currentTime + 0.03;
    const info = this.manifest.tracks[s.track];
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (info.loop) { src.loop = true; src.loopStart = info.loopStart; src.loopEnd = info.loopEnd; }
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = s.lowpass || 20000;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.out);
    const v = { name: s.track, src, gain, filter, start: t, offset, info, spec: s };
    equalPower(gain.gain, t, fade, 0, s.gain ?? 1);
    src.start(t, Math.min(offset, buf.duration - 0.05));
    src.onended = () => {
      this.voices = this.voices.filter((x) => x !== v);
      try { gain.disconnect(); } catch { /* already */ }
      if (!info.loop && !v.stopping && this.cueSpec?.track === s.track) { this.cueSpec = null; this._update('cue'); }
    };
    this.voices.push(v);
    this._log(`play ${s.track} @${offset.toFixed(1)}s fade ${fade}s`);
    this._prefetch(s.track);
  }

  _stop(v, fade) {
    if (v.stopping) return;
    v.stopping = true;
    const t = this.ctx.currentTime;
    if (v.info.loop) this.resume.set(v.name, { offset: this._pos(v, t + fade * 0.5), at: t });
    // anything older still fading out goes quickly: never more than two tracks audible at once
    for (const o of this.voices) {
      if (o !== v && o.stopping && !o.fast) { o.fast = true; clearTimeout(o.stopTimer); equalPower(o.gain.gain, t, 0.4, o.gain.gain.value, 0); try { o.src.stop(t + 0.5); } catch { /* */ } }
    }
    equalPower(v.gain.gain, t, fade, v.gain.gain.value, 0);
    // stopped by a timer (not src.stop(when)) so a quick return can still revive it
    clearTimeout(v.stopTimer);
    v.stopTimer = setTimeout(() => { try { v.src.stop(); } catch { /* already stopped */ } }, (fade + 0.1) * 1000);
    this._log(`stop ${v.name} fade ${fade}s`);
  }

  _shape(v, s, fade) {
    const t = this.ctx.currentTime;
    v.spec = s;
    ramp(v.gain.gain, t, fade, v.gain.gain.value, s.gain ?? 1);
    const f = v.filter.frequency, f0 = f.value, f1 = s.lowpass || 20000;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f0, t);
    f.exponentialRampToValueAtTime(f1, t + fade);
  }

  // ---------------------------------------------------------------- outdoor areas on Citadel island
  // village around the square and harbour, the open island elsewhere, the project station in the old fort;
  // a few metres of hysteresis so walking along a border does not flip the music
  outdoorMood(pos, POI) {
    const F = POI.fort;
    const inFort = Math.abs(pos.x - F.x) < F.half + 2 && Math.abs(pos.z - F.z) < F.half + 2;
    if (inFort) return (this._area = 'station');
    const dv = Math.hypot(pos.x - POI.village.x, pos.z - POI.village.z);
    const dh = Math.hypot(pos.x - POI.harbour.x, pos.z - POI.harbour.z);
    const d = Math.min(dv, dh + 6);
    const was = this._area === 'citadel';
    return (this._area = d < (was ? 50 : 40) ? 'citadel' : 'island');
  }
}

function sameSpec(a, b) {
  if (!a || !b) return a === b;
  return a.track === b.track && (a.gain ?? 1) === (b.gain ?? 1) && (a.lowpass || 0) === (b.lowpass || 0);
}

// Automation helpers. Fades are written as short linear segments (not setValueCurveAtTime) so a fade can be
// interrupted at any time: read the current value, cancel, continue from there.
function ramp(param, t, dur, v0, v1) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(v0, t);
  param.linearRampToValueAtTime(v1, t + Math.max(0.02, dur));
}
// equal-power fade (sin for fade-in, cos for fade-out): two crossfading tracks keep a constant power sum
function equalPower(param, t, dur, v0, v1) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(v0, t);
  const n = 16;
  for (let i = 1; i <= n; i++) {
    const x = i / n;
    const k = v1 >= v0 ? Math.sin(x * Math.PI / 2) : 1 - Math.cos(x * Math.PI / 2);
    param.linearRampToValueAtTime(v0 + (v1 - v0) * k, t + Math.max(0.05, dur) * x);
  }
}
