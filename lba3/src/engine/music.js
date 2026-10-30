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
//
// Places the player stays in for a long time (Citadel town, the open island, Zeelich, the Desert, Hamalayi) have a
// PLAYLIST instead of one looping track (MUSIC-2, the user: "the music is repetitive"): each piece is played through
// once, to its own end, then outdoors a silence of 20-60 s follows (as in LBA2) and the next piece starts from its
// first bar; indoors the next piece follows at once. Arriving in such a place starts a piece at a phrase start chosen
// at random, not always at bar 1; a change of place waits for the next bar line of the old track (at most ~3 s)
// before the crossfade. Combat, story cues and the other places are as before.

// mood name → track (or a spec with gain / low-pass for "heard from inside", or a playlist { list }) ; null = silence
export const MOODS = {
  title: 'main_theme',
  home: 'home', house: 'home',
  citadel: { list: 'citadel' }, calm: { list: 'citadel' }, clear: { list: 'citadel' }, village: { list: 'citadel' }, harbour: { list: 'citadel' },
  office: { list: 'citadel', gain: 0.6, lowpass: 1100 }, // town interiors: the square heard through the walls
  island: { list: 'island' },
  cave: 'well', storm: 'well', well: 'well', underworld: 'well', under: 'well',
  workshop: 'workshop',
  zeelich: { list: 'zeelich' },
  desert: { list: 'desert' },     // (shares the island pieces until the Desert has its own)
  hamalayi: { list: 'hamalayi' }, // (the well's music until the mountain has its own; with silences outdoors)
  station: 'facility', control: 'facility', facility: 'facility',
  stealth: 'facility_stealth',
  combat: 'combat',
  revelation: 'revelation',
  boss: 'finale', finale: 'finale',
  ending: 'homecoming', credits: 'homecoming', homecoming: 'homecoming',
  silence: null,
};
// playlists: the pieces of a place, in rotation (a track missing from the manifest is skipped)
export const PLAYLISTS = {
  citadel: ['village', 'village_b'],
  island: ['island', 'island_b'],
  zeelich: ['zeelich', 'zeelich_b'],
  desert: ['island_b', 'island'],
  hamalayi: ['well'],
};
const GAP = [20, 60]; // s of silence between two pieces outdoors (uniform)
// what to prefetch once a track is playing (a playlist piece first prefetches the next piece of its list)
const NEXT = {
  main_theme: ['home'], home: ['village'], village: ['island', 'combat'], island: ['village', 'combat'],
  village_b: ['island', 'combat'], island_b: ['village', 'combat'], zeelich_b: ['workshop', 'combat'],
  well: ['revelation'], facility: ['facility_stealth', 'combat'], zeelich: ['workshop', 'combat'],
  workshop: ['zeelich'], facility_stealth: ['facility'],
};

// moods that end a running story cue
const STRONG = new Set(['title', 'ending', 'credits', 'homecoming', 'boss', 'finale']);
// end: a looping piece fades over its last bars (its link back to the top thins out there); top: a piece that
// starts from its first bar after a silence comes in almost at once (its intro is quiet already)
const FADE = { area: 2.6, combatIn: 1.1, combatOut: 2.8, cue: 1.8, room: 1.6, end: 6, top: 0.25 };
const COMBAT_ENTER = 1.2; // s of sustained threat before the combat music starts
const COMBAT_EXIT = 3.5; //  s of calm before it hands back
const RESUME_WINDOW = 150; // s: coming back to a track within this resumes it
const CACHE = 3; // decoded buffers kept (a decoded 3 min stereo track is ~69 MB at 48 kHz)
const BAR_WAIT = 3.2; // s: the longest a change of place waits for the old track's next bar line

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
    this.lists = new Map(); // playlist key → {key, tracks, idx, started, gapUntil, mode}
    this.gapRange = GAP;    // (tests shorten it)
    this.rand = Math.random;
  }
  get ctx() { return this.a.ctx; }
  // outdoors (the listener's place, set by audio.setPlace before the room's mood): the playlists leave silences here
  get outdoor() { const p = this.a.place || 'island'; return p === 'island' || p === 'sky'; }

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
    if (sameSpec(s, this.base) && !endsCue) { this.baseName = name; this.placeChanged(); return; }
    this.base = s;
    this.baseName = name;
    this._update();
  }
  // the listener moved indoors (audio.setPlace): a silence between two pieces ends there (no silences indoors)
  // (checked after the current task: a room change sets the place first and its mood just after)
  placeChanged() {
    if (this._placeQ) return;
    this._placeQ = true;
    Promise.resolve().then(() => {
      this._placeQ = false;
      const s = this.base;
      if (!s?.list || !this.ctx || !this.manifest) return;
      if (this._list(s.list).gapUntil && !this._gapsHere(s)) this._update();
    });
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
  duck(on, level = 0.5) {
    if (!this.ctx || !this.out) return;
    const g = this.out.gain, t = this.ctx.currentTime;
    clearTimeout(this._duckTimer);
    if (on) {
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(level, t + 0.25);
    } else {
      // short delay: consecutive dialogue lines do not pump the music up and down
      this._duckTimer = setTimeout(() => {
        const t2 = this.ctx.currentTime;
        g.cancelScheduledValues(t2); g.setValueAtTime(g.value, t2); g.linearRampToValueAtTime(1, t2 + 0.9);
      }, 450);
    }
  }

  // what should be playing now (commit: a playlist that is due to move on does so; only _update commits, so reading
  // the state never changes it)
  target(commit = false) {
    if (this.cueSpec) return this.cueSpec;
    if (this.combat && this.has('combat') && this.base) return { track: 'combat', gain: 1 };
    return this._resolve(this.base, commit);
  }
  has(track) { return !!this.manifest?.tracks?.[track]; }

  state() {
    const t = this.ctx?.currentTime ?? 0;
    const lists = {};
    for (const [k, L] of this.lists) lists[k] = { tracks: L.tracks, track: L.tracks[L.idx] || null, started: L.started, gapIn: L.gapUntil ? +Math.max(0, L.gapUntil - t).toFixed(2) : null };
    return {
      base: this.baseName, cue: this.cueSpec?.track || null, combat: this.combat, target: this.target()?.track || null,
      list: this.base?.list || null, outdoor: this.outdoor, lists,
      voices: this.voices.map((v) => ({ track: v.name, gain: +v.gain.gain.value.toFixed(3), pos: +this._pos(v, t).toFixed(2), stopping: !!v.stopping, list: v.list || null, endsIn: v.passEndT ? +(v.passEndT - t).toFixed(2) : null })),
      loaded: [...this.buffers.entries()].filter(([, b]) => b.buf).map(([k]) => k),
      log: this.log.slice(-20),
    };
  }

  // ---------------------------------------------------------------- playlists
  _list(key) {
    let L = this.lists.get(key);
    if (!L) {
      const tracks = (PLAYLISTS[key] || [key]).filter((n) => this.has(n));
      L = { key, tracks, idx: Math.floor(this.rand() * tracks.length) % Math.max(1, tracks.length), started: false, gapUntil: 0, mode: 'phrase' };
      this.lists.set(key, L);
    }
    return L;
  }
  // silences between pieces: outdoors, and in the rooms that hear the outdoor music through their walls (office)
  _gapsHere(s) { return this.outdoor || !!s?.lowpass; }
  _next(L, mode) {
    if (L.tracks.length > 1) L.idx = (L.idx + 1) % L.tracks.length;
    L.started = false; L.gapUntil = 0; L.mode = mode;
  }
  // the track a playlist spec stands for now (null during a silence between two pieces)
  _resolve(s, commit) {
    if (!s?.list || !this.manifest || !this.ctx) return s;
    const L = this._list(s.list);
    if (!L.tracks.length) return null;
    const now = this.ctx.currentTime;
    const after = { ...s, track: L.tracks[(L.idx + 1) % L.tracks.length] };
    if (L.gapUntil) {
      if (this._gapsHere(s) && now < L.gapUntil - 0.05) return null;
      if (!commit) return after;
      this._next(L, 'top'); // after a silence the next piece starts from its first bar
    } else if (L.started) {
      // the piece was left: back within the resume window it continues, later the next piece starts
      const t = L.tracks[L.idx], r = this.resume.get(t);
      if (!this.voices.some((v) => v.name === t && !v.fast) && (!r || now - r.at >= RESUME_WINDOW)) {
        if (!commit) return after;
        this._next(L, 'phrase');
      }
    }
    return { ...s, track: L.tracks[L.idx] };
  }
  // where a playlist piece starts: its first bar, or (arriving in the place) the start of a phrase of 8 bars in the
  // first 60 % of the piece, chosen at random
  _entry(info, mode) {
    if (mode === 'top' || !info.bars?.length) return 0;
    const end = (info.loop ? info.bodyEnd ?? info.loopEnd : info.duration) * 0.6;
    const b0 = info.bodyBar ?? 0, step = info.phrase || 8;
    const starts = [0];
    for (let i = b0; i < info.bars.length; i += step) if (info.bars[i] > 0 && info.bars[i] < end) starts.push(info.bars[i]);
    return starts[Math.floor(this.rand() * starts.length) % starts.length];
  }
  // where a playlist piece ends: the end of its body (looping renders), or its last note (pieces with an ending)
  _endPos(info) { return info.loop ? info.bodyEnd ?? info.loopEnd : info.duration; }
  // a playlist piece reached its end: outdoors a silence, indoors the next piece
  _pieceDone(v) {
    if (!v.list || v.stopping) return;
    const L = this._list(v.list);
    clearTimeout(v.passT); v.passT = null; v.passEndT = 0;
    v.done = true; // (never revived: the piece is over)
    this.resume.delete(v.name);
    if (this._gapsHere(v.spec) && L.tracks.length) {
      const [g0, g1] = this.gapRange;
      const lead = v.info.loop ? FADE.end : 0;
      L.started = false;
      L.gapUntil = this.ctx.currentTime + lead + g0 + (g1 - g0) * this.rand();
      this._log(`end ${v.name}: silence ${(L.gapUntil - this.ctx.currentTime).toFixed(0)}s`);
      this._scheduleGap(L);
      const nx = L.tracks[(L.idx + 1) % L.tracks.length];
      if (nx && !this.buffers.has(nx)) setTimeout(() => this.load(nx), 8000); // decode during the silence
    } else {
      this._next(L, 'top');
      this._log(`end ${v.name}: next ${L.tracks[L.idx]}`);
    }
    this._update('end');
  }
  // at the end of a silence: the next piece (re-checked on the audio clock, which stops while the game is suspended)
  _scheduleGap(L) {
    clearTimeout(this._gapT);
    const tick = () => {
      if (!this.ctx) return;
      const left = L.gapUntil ? L.gapUntil - this.ctx.currentTime : 0;
      if (left <= 0.05) { if (this.base?.list === L.key) this._update('gapEnd'); return; }
      this._gapT = setTimeout(tick, (Math.min(5, left) + 0.02) * 1000);
    };
    tick();
  }
  // a playlist voice ends its piece at v.passEndT (audio clock); a looping render fades out over its last bars
  _schedulePass(v) {
    clearTimeout(v.passT);
    if (!v.list || !v.passEndT) return;
    const lead = v.info.loop ? FADE.end : 0.2;
    const tick = () => {
      if (v.stopping || !this.voices.includes(v) || !this.ctx) return;
      const left = v.passEndT - this.ctx.currentTime;
      if (left <= lead + 0.02) { this._pieceDone(v); return; }
      v.passT = setTimeout(tick, Math.min(5, left - lead) * 1000);
    };
    tick();
  }
  // seconds until the voice's next bar line (0 when unknown or too far away)
  _toBar(v) {
    const bars = v.info.bars;
    if (!bars?.length) return 0;
    const t = this.ctx.currentTime, pos = this._pos(v, t + 0.06);
    const next = bars.find((b) => b > pos);
    const w = next === undefined ? 0 : next - pos + 0.06;
    return w > BAR_WAIT ? 0 : w;
  }
  // tests: end the current playlist piece now (as if it had reached its last bar)
  finishPiece() { const v = this._current(); if (v?.list) this._pieceDone(v); return !!v?.list; }

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
  _prefetch(name, list) {
    // a playlist piece: the next piece of its list and the combat music (the cache keeps 3: no more, or they evict each other)
    const L = list && this.lists.get(list);
    const cand = L ? [L.tracks[(L.idx + 1) % L.tracks.length], 'combat'] : (NEXT[name] || []);
    const next = cand.filter((n) => n && n !== name && this.has(n) && !this.buffers.has(n));
    if (!next.length) return;
    clearTimeout(this._preT);
    // after the current track has settled, one at a time
    this._preT = setTimeout(() => this.load(next[0]).then(() => this._prefetch(name, list)), 4000);
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
    const want = this.target(true);
    const cur = this._current();
    const fade = FADE[kind] || (this.cueSpec ? FADE.cue : FADE.area);
    const token = (this._token = (this._token || 0) + 1); // any newer decision cancels a pending track load
    if (!want || !this.has(want.track)) {
      if (want && !this.has(want.track)) this._log(`no track for ${want.track}`);
      if (cur) this._stop(cur, fade);
      return;
    }
    if (cur && cur.name === want.track) { this._shape(cur, want, Math.min(fade, FADE.room)); this._bindPass(cur, want); return; } // same track: keep playing
    // the wanted track is still fading out (quick back-and-forth through a door): bring it back instead of restarting
    // (not a playlist piece that has reached its end)
    const back = this.voices.find((v) => v.stopping && !v.fast && !v.done && v.name === want.track);
    if (back) {
      clearTimeout(back.stopTimer);
      back.stopping = false;
      if (cur) this._stop(cur, fade);
      this._shape(back, want, Math.min(fade, FADE.room));
      this._bindPass(back, want);
      this._log(`revive ${back.name}`);
      return;
    }
    // a piece that ended indoors: the next one starts when the old one has faded out over its last bars
    if (kind === 'end' && cur) { this._stop(cur, FADE.end); }
    this.load(want.track).then((buf) => {
      if (!buf || token !== this._token) return; // superseded while loading
      const go = () => {
        if (token !== this._token) return;
        const now = this._current();
        if (now && now.name === want.track) { this._shape(now, want, fade); this._bindPass(now, want); return; }
        let offset = 0, inFade = fade;
        const info = this.manifest.tracks[want.track];
        const r = this.resume.get(want.track);
        const L = want.list ? this._list(want.list) : null;
        if (now && info.group && now.info.group === info.group) offset = this._pos(now, this.ctx.currentTime); // stems of one piece: stay in sync
        else if (L && !L.started) {
          // after a silence, from the first bar; arriving from another place's music, from a phrase start, crossfading
          const mode = now ? 'phrase' : L.mode;
          offset = this._entry(info, mode);
          if (mode === 'top') inFade = FADE.top;
        }
        else if (r && this.ctx.currentTime - r.at < RESUME_WINDOW) offset = r.offset;
        if (now) {
          if (waited) { const pos = this._pos(now, this.ctx.currentTime); this.lastBarSwitch = { track: now.name, wait: +wait.toFixed(2), offBar: +Math.min(...now.info.bars.map((b) => Math.abs(b - pos))).toFixed(3) }; }
          this._stop(now, fade);
        }
        this._play(want, buf, offset, inFade);
      };
      // a change of place waits for the old track's next bar line, so the crossfade starts on the beat
      const now = this._current();
      let wait = 0;
      if (kind === 'end') wait = this.voices.some((v) => v.done && !v.fast && v.info.loop) ? FADE.end : 0;
      else if (now && kind === undefined && !this.cueSpec && !this.combat && now.name !== 'combat') wait = this._toBar(now);
      const waited = wait > 0.05 && kind !== 'end';
      if (wait > 0.05) setTimeout(go, wait * 1000); else go();
    });
  }
  // keep a playlist voice's piece accounting when the same track goes on playing under a new spec
  _bindPass(v, s) {
    if (!s.list) { if (v.list) { v.list = null; clearTimeout(v.passT); v.passEndT = 0; } return; }
    const L = this._list(s.list);
    v.list = s.list;
    if (L.started && v.passEndT) { this._schedulePass(v); return; }
    L.started = true; v.done = false; // (a one-piece list indoors: the same track goes round once more)
    let left = this._endPos(v.info) - this._pos(v, this.ctx.currentTime);
    if (left < 12 && v.info.loop) left += v.info.loopLength; // (past its end already: once more round the loop)
    v.passEndT = this.ctx.currentTime + Math.max(1, left);
    this._schedulePass(v);
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
    this.maxVoices = Math.max(this.maxVoices || 0, this.voices.filter((x) => !x.fast).length); // (tests: never more than two audible)
    if (s.list) {
      // a playlist piece: played to its end once (from here), then _pieceDone
      v.list = s.list;
      this._list(s.list).started = true;
      v.passEndT = t + Math.max(1, this._endPos(info) - offset);
      this._schedulePass(v);
    }
    this._log(`play ${s.track} @${offset.toFixed(1)}s fade ${fade}s`);
    this._prefetch(s.track, s.list);
  }

  _stop(v, fade) {
    if (v.stopping) return;
    v.stopping = true;
    const t = this.ctx.currentTime;
    if ((v.info.loop || v.list) && !v.done) this.resume.set(v.name, { offset: this._pos(v, t + fade * 0.5), at: t });
    clearTimeout(v.passT);
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
  return a.track === b.track && (a.list || null) === (b.list || null) && (a.gain ?? 1) === (b.gain ?? 1) && (a.lowpass || 0) === (b.lowpass || 0);
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
