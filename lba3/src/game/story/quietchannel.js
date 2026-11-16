// U-5 "The Quiet Channel" — the user's own side quest (docs/lba-maturity/DEPTH-PLAN.md, "The user's five side quests";
// docs/lba-maturity/U5-QUIET-CHANNEL.md). Not a chapter: the director (index.js) asks it beside the chapter in progress,
// as it asks ferry.js … yearslate.js. The world's pieces are src/game/quietchannel.js, the text text/quietchannel.js.
//
// Chapter 11 (The Shell), at the bottom of the shaft, beside the walk from the lift to the tunnel: an old service riser
// knocks. Not the ground: a hand. Its gauge's needle kicks with each knock by its weight, a white lamp over it flashes
// (the rhythm can be read with the sound off), and the knocks sound from the pipe. Nothing marks it; the main way goes on.
//   1. His call: heavy, light, light, and a rest (the campaign's "three and a rest", the ground's own beat: the crew
//      pinched it, "ours just have weight"). Three valves on the riser's header, big, middle, small: snapped by hand
//      (NO-AIR: his hand on the wheel), each hammers the pipe with its own weight. Three knocks make an answer; the
//      rest after them sends it. The same back: the voice takes him for his brother Tol. A wrong rhythm: the voice
//      puts it right, kindly (the second time it names the valves).
//   2. Their end-of-shift knock: light, middle, heavy, answered backwards (heavy, middle, light). Told before it is
//      asked. Wrong: "Backwards, Tol"; wrong again, he starts to wonder. Right: "you're not Tol, are you?" Twinsen says
//      who he is; it is Matto, who minds Pump Two on cooling line two, cut off when Vesk closed the shaft; his brother
//      Tolli is up at the station. The riser cock beside him is tagged shut (SHAFT CLOSED. V.).
//   3. The riser opened (his hand on the cock): the knocking carries up to the station's control room.
// What stays (the "come back later" test): in the control room, the riser's speaking horn is lit, Tolli sits by it
// through chapter 11, and Listen plays what the channel carries now: the line hot (before the cooling), cool (after),
// the rock humming (the galleries' pillars woken); never a line ahead of the story. After the ending the horn carries
// both brothers at once ("We're in the same room, Tol"), and in the deep installation Matto is on shift beside Tolli.
// A player who never stops at the riser loses nothing on the main path.
//
// State (flags, dx_qc_; an old save has none: nothing is made up, the riser knocks in chapter 11 as for a new player):
//   dx_qc_heard (listened at the riser), dx_qc_step (0: his call; 1: the first answered; 2: the second, Matto named),
//   dx_qc_miss (wrong answers at the current step), dx_qc_wrong (all wrong answers), dx_qc_open (the riser opened),
//   dx_qc_tol (Tolli met at the horn), dx_qc_msgs ('hot,cool,stones,home': the horn's messages heard), dx_qc_home (the
//   brothers met after the ending), dx_qc_tolHome (Tolli's word on it). An answer half made, a knock in the air, a scene
//   under way are not saved: a load starts his call again.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { handTo, touch } from './reach.js';
import { buildRiser, buildHorn, MATTO_HOME, TOLLI_UP } from '../quietchannel.js';
import '../text/quietchannel.js';

// his calls and what answers them (weights: 3 heavy, 2 middle, 1 light), by step
export const CALL = [[3, 1, 1], [1, 2, 3]];
export const ANSWER = [[3, 1, 1], [3, 2, 1]];
// three knocks and a rest: the knocks BEAT s apart, the whole round CYCLE s (a calm pace: nothing here is timed)
export const BEAT = 0.55, CYCLE = 4.4;
const LEAD = 0.9;                       // s of quiet before his call starts again after a reply
const REST = 1.1;                       // s after an answer's third knock before it is sent
export const AMP = { 1: 0.34, 2: 0.64, 3: 1.0 };   // the needle's kick by weight (its dial: light, middle, heavy)
const SND = { 1: 'hitMachine', 2: 'clunk', 3: 'pipeKnock' };
const ROW = { z0: 3.3, z1: 4.7 };       // (the riser's local frame: the strip in front of the valves)
const COLORS = { qc_piperadio: '#c8d8c0', qc_mattoradio: '#c8d8c0', qc_matto: '#c8d8c0', dp_tolli: '#e8c070', dp_tolliradio: '#e8c070', hero: '#8fc2ff' };
const MATTO_TINT = '#e8f0ff', TOLLI_TINT = '#fff2e0';   // (Tolli's own: deeplife.js)
const list = (s) => String(s || '').split(',').filter(Boolean);

export class QuietChannel extends ChapterBase {
  get key() { return this.story.cur?.key; }
  get RG() { return this.game.regions; }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  step() { const s = this.f.dx_qc_step; return Number.isInteger(s) ? s : 0; }
  open() { return !!this.f.dx_qc_open; }
  // where the main story is, for the channel (no line ahead of it)
  stage() {
    const k = this.key, f = this.f;
    if (k === 'home') return 'home';
    if (k === 'core') return 'core';
    if (k !== 'shell') return null;
    if (f.c3_pillar0 && f.c3_pillar1 && f.c3_pillar2) return 'stones';
    return f.c3_cooled ? 'cool' : 'hot';
  }
  // his knocking at the riser: chapter 11 (the quest's window); the shaft's bottom built
  live() { return this.key === 'shell' && !!this.QR; }
  inShaft() { return this.game.room?.id === 'c3shaft'; }

  // ================================================================ the cast
  npcDefs() {
    const s = this.mattoSpot();
    return [{ id: 'qc_matto', name: 'n_qc_matto', char: 'worker_b', color: COLORS.qc_matto, ...(s ? { x: s.x, z: s.z, angle: s.a } : { x: 0, z: 0, angle: 0, pending: true }) }];
  }
  mattoSpot() {
    const D = this.RG?.built?.('c3deep'); if (!D?.group) return null;
    const o = D.group.position, M = MATTO_HOME;
    return { x: o.x + M.x, z: o.z + M.z, a: Math.atan2(M.face.x - M.x, M.face.z - M.z) };
  }
  tint(id, c) { const n = this.npc(id); if (n && !n._dpTint) { n._dpTint = true; n.rig?.mesh?.material?.color?.set(c); } }
  place(id) {
    const f = this.f, k = this.key;
    if (id === 'qc_matto') {
      if (k !== 'home' || !f.dx_qc_open) return null;
      const s = this.mattoSpot(); if (!s) return null;   // (placed once the underground is built: regionBuilt)
      this.tint(id, MATTO_TINT);
      return { x: s.x, z: s.z, a: s.a, anim: 'tinker', track: null };
    }
    // Tolli by the horn in the station's control room, through chapter 11, once the channel is open (deeplife.js has him
    // only after the ending)
    if (id === 'dp_tolli' && k === 'shell' && f.dx_qc_open) {
      const C = this.RG?.built?.('control'); if (!C?.group) return null;
      this.tint(id, TOLLI_TINT);
      const o = C.group.position, H = this.QH ? { x: this.QH.horn.x - o.x, z: this.QH.horn.z - o.z } : { x: -5.56, z: 1.08 };
      return { x: o.x + TOLLI_UP.x, z: o.z + TOLLI_UP.z, a: Math.atan2(H.x - TOLLI_UP.x, H.z - TOLLI_UP.z), anim: null, track: null };
    }
    return undefined;
  }
  // (index.js doors(): the control room's door in chapter 11, once the channel leads there)
  doors() {
    const g = this.game, st = g.world?.station;
    if (this.key !== 'shell' || !this.open() || !st?.control?.door || !g.regions?.has?.('control')) return [];
    return [{ x: st.control.door.x, z: st.control.door.z, r: 0.9, room: 'control' }];
  }

  // ================================================================ the world from the flags
  get QR() { return this._qr || null; }
  get QH() { return this._qh || null; }
  ensure() {
    const S = this.RG?.built?.('c3shaft'), C = this.RG?.built?.('control');
    if (S?.group && !this._qr) this._qr = buildRiser(this.game, S);
    if (C?.group && !this._qh) this._qh = buildHorn(this.game, C);
  }
  decorate() { this.ensure(); this.applyWorld(); }
  regionBuilt(ids) { if (ids.includes('c3shaft') || ids.includes('control')) { this.ensure(); this.applyWorld(); } }
  applyFlags() {
    const f = this.f;
    if (f.dx_qc_step != null && !(Number.isInteger(f.dx_qc_step) && f.dx_qc_step >= 0 && f.dx_qc_step <= 2)) delete f.dx_qc_step;
    if (f.dx_qc_open) f.dx_qc_step = 2;
    if ((f.dx_qc_step || 0) >= 1) f.dx_qc_heard = true;
    for (const k of ['dx_qc_miss', 'dx_qc_wrong']) if (f[k] != null && !(Number.isInteger(f[k]) && f[k] >= 0)) delete f[k];
    if (!f.dx_qc_open) { delete f.dx_qc_tol; delete f.dx_qc_msgs; delete f.dx_qc_home; delete f.dx_qc_tolHome; }
    if (f.dx_qc_msgs != null) { const m = [...new Set(list(f.dx_qc_msgs).filter((s) => ['hot', 'cool', 'stones', 'home'].includes(s)))]; if (m.length) f.dx_qc_msgs = m.join(','); else delete f.dx_qc_msgs; }
    this.reset();
    this.ensure(); this.applyWorld();
  }
  reset() { this.mode = null; this.entry = []; this.busy = false; this.pt = 0; this.restT = 0; this.kicks = []; this.lastPh = 0; this.idleT = 3; }
  applyWorld() {
    const f = this.f;
    this.QR?.setCock(!!f.dx_qc_open, true);
    this.QR?.setCount(0);
    this.QH?.setOpen(!!f.dx_qc_open && (this.key === 'shell' || this.key === 'core' || this.key === 'home'));
  }

  // ================================================================ interaction
  // the riser's local frame (the shaft's group)
  local(x, z) { const o = this.QR.group.parent.position; return { x: x - o.x, z: z - o.z }; }
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f;
    if (!this.able() || this.busy || h.steer || h.actT > 0 || g.state !== 'play') return;
    if (this.inShaft() && this.QR && (this.key === 'shell' || (this.key === 'home' && this.open()))) {
      const Q = this.QR, p = this.local(h.pos.x, h.pos.z), r = Q.riser;
      const inRow = p.z > ROW.z0 && p.z < ROW.z1 && p.x > -1.0 && p.x < 2.7;
      if (this.key === 'shell' && inRow && p.x >= 0.3 && this.step() < 2 && this.mode !== 'rest' && this.mode !== 'talk') {
        // the valve in front of him (the one whose standing place is nearest along the row): one prompt
        let best = 0, bd = 9;
        Q.wheels.forEach((w, i) => { const d = Math.abs((w.x - 0.38) - h.pos.x); if (d < bd) { bd = d; best = i; } });
        const w = Q.wheels[best];
        consider(dist(w.x - 0.38, w.z + 0.55) * 0.5, 1.2, { kind: 'dx_qc_valve', i: best, x: w.x, z: w.z, label: ['p_qc_big', 'p_qc_mid', 'p_qc_small'][best] });
        return;
      }
      if (this.key === 'shell' && this.step() >= 2 && !this.open() && (inRow || dist(r.x, r.z) < 1.6)) {
        consider(dist(Q.cock.x, Q.cock.z), 1.7, { kind: 'dx_qc_cock', x: Q.cock.x, z: Q.cock.z, label: 'p_qc_riser' });
        return;
      }
      consider(dist(r.x, r.z), 1.8, { kind: 'dx_qc_listen', x: r.x, z: r.z, label: 'p_listen' });
      if (this.key === 'shell' && !this.open() && this.step() < 2) consider(dist(Q.cock.x, Q.cock.z) + 0.25, 1.2, { kind: 'dx_qc_tag', x: Q.cock.x, z: Q.cock.z, label: 'p_look' });
      return;
    }
    if (g.room?.id === 'control' && this.QH && this.open() && (this.key === 'shell' || this.key === 'home')) {
      const H = this.QH.horn;
      consider(dist(H.x, H.z), 1.5, { kind: 'dx_qc_horn', x: H.x, z: H.z, label: 'p_listen' });
    }
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_qc_')) return false;
    switch (it.kind) {
      case 'dx_qc_listen': return this.listen();
      case 'dx_qc_tag': return this.lines([['hero', 'qc_tag']]);
      case 'dx_qc_valve': return this.valve(it.i);
      case 'dx_qc_cock': return this.openCock();
      case 'dx_qc_horn': return this.horn();
    }
    return false;
  }
  // a conversation: [[who, key]…] (who: 'hero', a person's id, or a voice in the pipe: '…radio'); each line its speaker
  lines(L, done) {
    const g = this.game;
    this.busy = true;
    let i = 0;
    const next = () => {
      if (i >= L.length) { this.busy = false; done?.(); return; }
      const [who, key] = L[i++];
      const sp = who === 'hero' ? g.hero : who.endsWith('radio') ? null : this.speaker(who);
      if (sp && sp !== g.hero) sp.talking = true;
      g.say(who === 'hero' ? 'n_hero' : 'n_' + who, [].concat(t(key)), () => { if (sp && sp !== g.hero) sp.talking = false; next(); }, sp, COLORS[who] || null);
    };
    next();
    return true;
  }
  listen() {
    const f = this.f;
    if (this.key === 'home') return this.lines([['hero', 'qc_listen_home']]);
    if (this.open()) return this.lines([['hero', 'qc_listen_open']]);
    const s = this.step();
    if (s >= 2) return this.lines([['hero', 'qc_listen_c']]);
    if (s === 1) return this.lines([['hero', 'qc_listen_b']]);
    const first = !f.dx_qc_heard;
    f.dx_qc_heard = true;
    // (his call heard again from its start once the lines are read)
    return this.lines(first ? [['hero', 'qc_listen_1'], ['hero', 'qc_listen_2']] : [['hero', 'qc_listen_0']], () => { this.restartCall(); this.game.save(false); });
  }
  // a valve snapped: his hand on its wheel; at the touch, the knock
  valve(i) {
    const g = this.game, Q = this.QR, w = Q?.wheels[i];
    if (!w || this.step() >= 2) return false;
    this.busy = true;
    if (this.mode !== 'entry') { this.mode = 'entry'; this.entry = []; }
    handTo(g.hero, touch(w.x, w.z, w.a, 'tinker'), () => {
      this.busy = false;
      if (this.mode !== 'entry') return;
      Q.snap(i);
      this.knock(w.w, false);
      this.entry.push(w.w);
      Q.setCount(this.entry.length);
      if (this.entry.length >= 3) { this.mode = 'rest'; this.restT = REST; }
    });
    return true;
  }
  // a knock on the pipe (his from the far side, or Twinsen's): the needle, the lamp (his only), the sound, a shudder
  knock(w, far) {
    const g = this.game, Q = this.QR;
    this.kicks.push({ t: this.clock(), a: AMP[w] });
    if (this.kicks.length > 6) this.kicks.shift();
    if (far) Q?.setCall(AMP[w]);
    Q?.shake(0.4 + 0.6 * AMP[w]);
    if (this.inShaft() && Q) g.audio.play(SND[w], Q.riser);
    (this.log ??= []).push({ t: +this.clock().toFixed(2), w, far });
    if (this.log.length > 40) this.log.shift();
  }
  clock() { return this.game.time ?? 0; }
  restartCall() { this.mode = 'call'; this.pt = -LEAD; this.lastPh = -LEAD; }
  // the answer sent: right or wrong, his reply
  judge() {
    const f = this.f, s = this.step(), ok = this.entry.join('') === ANSWER[s].join('');
    this.entry = []; this.QR?.setCount(0);
    this.mode = 'talk';
    const after = () => { this.game.save(false); if (this.step() < 2) this.restartCall(); else { this.mode = 'wait'; this.idleT = 5; } };
    if (!ok) {
      f.dx_qc_miss = (f.dx_qc_miss || 0) + 1; f.dx_qc_wrong = (f.dx_qc_wrong || 0) + 1;
      const n = f.dx_qc_miss;
      const key = s === 0 ? (n >= 2 ? 'qc_p1_no_2' : 'qc_p1_no_1') : (n >= 2 ? 'qc_p2_no_2' : 'qc_p2_no_1');
      return this.lines([['qc_piperadio', key]], after);
    }
    const missed = f.dx_qc_miss || 0;
    f.dx_qc_heard = true; f.dx_qc_step = s + 1; delete f.dx_qc_miss;
    if (s === 0) return this.lines([['qc_piperadio', 'qc_p1_ok_1'], ['hero', 'qc_tw_p1'], ['qc_piperadio', 'qc_p1_ok_2'], ['qc_piperadio', 'qc_p1_ok_3']], after);
    return this.lines([['qc_piperadio', missed >= 2 ? 'qc_p2_ok_1b' : 'qc_p2_ok_1'], ['hero', 'qc_tw_p2'], ['qc_mattoradio', 'qc_p2_ok_2'], ['qc_mattoradio', 'qc_p2_ok_3'], ['qc_mattoradio', 'qc_p2_ok_4'], ['qc_mattoradio', 'qc_p2_ok_5']], after);
  }
  openCock() {
    const g = this.game, Q = this.QR, f = this.f;
    if (!Q || this.open() || this.step() < 2) return false;
    this.busy = true;
    handTo(g.hero, touch(Q.cock.x, Q.cock.z, Q.cock.a, 'reach'), () => {
      Q.setCock(true); g.audio.play('valve', Q.riser); Q.shake(0.6);
      f.dx_qc_open = true;
      this.QH?.setOpen(true);
      this.mode = 'chatter'; this.idleT = 6;
      this.lines([['hero', 'qc_tw_cock'], ['qc_mattoradio', 'qc_cock_1'], ['qc_mattoradio', 'qc_cock_2']], () => { g.save(false); this.story.refreshCast(); });
    });
    return true;
  }
  // the control room's horn: what the channel carries now
  horn() {
    const f = this.f, st = this.stage(), g = this.game;
    if (!st || st === 'core') return false;
    this.QH?.pulse(1); g.audio.play('radio', this.QH?.horn);
    const L = st === 'home'
      ? [['qc_mattoradio', 'qc_horn_home_1'], ['dp_tolliradio', 'qc_horn_home_2'], ['qc_mattoradio', 'qc_horn_home_3']]
      : [['qc_mattoradio', 'qc_horn_' + st]];
    const m = new Set(list(f.dx_qc_msgs)); m.add(st); f.dx_qc_msgs = [...m].join(',');
    return this.lines(L, () => g.save(false));
  }

  // ================================================================ talk
  talkFirst(npc) {
    const id = npc.def.id, f = this.f, k = this.key;
    if (!this.open()) return false;
    if (id === 'dp_tolli' && k === 'shell' && this.game.room?.id === 'control') {
      if (!f.dx_qc_tol) { f.dx_qc_tol = true; return this.lines([['dp_tolli', 'qc_tol_1'], ['hero', 'qc_tw_tol'], ['dp_tolli', 'qc_tol_2']], () => this.game.save(false)); }
      return this.lines([['dp_tolli', 'qc_tol_' + (this.stage() || 'hot')]]);
    }
    if (k !== 'home') return false;
    if (id === 'qc_matto') {
      if (!f.dx_qc_home) { f.dx_qc_home = true; return this.lines([['qc_matto', 'qc_m_home_1'], ['dp_tolli', 'qc_t_home_1'], ['qc_matto', 'qc_m_home_2']], () => this.game.save(false)); }
      const n = (npc._qcN = (npc._qcN ?? -1) + 1);
      return this.lines([['qc_matto', n % 2 ? 'qc_m_home_4' : 'qc_m_home_3']]);
    }
    if (id === 'dp_tolli' && !f.dx_qc_tolHome) { f.dx_qc_tolHome = true; return this.lines([['dp_tolli', 'qc_t_home_2']], () => this.game.save(false)); }
    return false;
  }

  // ================================================================ journal
  journal() {
    const f = this.f, s = this.step(), out = [];
    if (!f.dx_qc_heard && !s) return out;
    out.push({ key: 'qc_j_heard', done: s >= 1 });
    if (s >= 1) out.push({ key: 'qc_j_tol', done: s >= 2 });
    if (s >= 2) out.push({ key: 'qc_j_matto', done: !!f.dx_qc_open });
    if (f.dx_qc_open) out.push({ key: 'qc_j_open', done: true });
    if (f.dx_qc_home) out.push({ key: 'qc_j_home', done: true });
    return out;
  }

  // ================================================================ the knocking
  // what the riser shows now (the tests read it: the rhythm by sight)
  view() { const Q = this.QR; return Q ? { needle: Q.state.needle, call: Q.state.call, count: Q.state.count, open: Q.state.open, mode: this.mode, step: this.step(), entry: [...this.entry] } : null; }
  update(dt) {
    const Q = this.QR, g = this.game;
    if (!Q) return;
    // (only chapter 11 knocks: after the ending both brothers are downstairs, and the riser is quiet)
    if (!this.live()) { if (this.mode != null || Q.state.needle) { Q.setNeedle(0); Q.setCall(0); this.mode = null; this.kicks = []; } return; }
    if (this.mode == null) { if (this.step() < 2) this.restartCall(); else this.mode = this.open() ? 'chatter' : 'wait'; }
    // an answer half made is dropped when he walks off (nothing lost: his call comes again)
    if (this.mode === 'entry' && !this.busy && (!this.inShaft() || Math.hypot(g.hero.pos.x - Q.riser.x, g.hero.pos.z - Q.riser.z) > 4.5)) { this.entry = []; Q.setCount(0); this.restartCall(); }
    if (g.state === 'play' && !g.trans) {
      if (this.mode === 'call') {
        this.pt += dt;
        const ph = this.pt < 0 ? this.pt : this.pt % CYCLE, prev = this.lastPh;
        const call = CALL[Math.min(this.step(), 1)];
        if (ph >= 0) call.forEach((w, i) => { const at = i * BEAT; if ((prev < at || prev > ph) && ph >= at) this.knock(w, true); });
        this.lastPh = ph;
      } else if (this.mode === 'rest') {
        this.restT -= dt;
        if (this.restT <= 0) this.judge();
      } else if (this.mode === 'wait' || this.mode === 'chatter') {
        // waiting for the cock: one heavy knock now and then; the channel open: he chats up the pipe, a phrase at a time
        this.idleT -= dt;
        if (this.idleT <= 0) {
          if (this.mode === 'wait') { this.knock(3, true); this.idleT = 6; }
          else { const ph = [[3, 1, 1], [1, 2, 3], [2, 2, 1]][Math.floor(Math.random() * 3)]; ph.forEach((w, i) => this.later(i * BEAT, () => this.knock(w, true))); this.idleT = 9 + Math.random() * 5; this.QH?.pulse(0.8); }
        }
      }
    }
    this.runLater(dt);
    // the needle: the latest knocks' kicks, each a quick rise and a fall
    const now = this.clock();
    let v = 0;
    for (const kk of this.kicks) { const u = now - kk.t; if (u < 0) continue; const e = u < 0.06 ? u / 0.06 : Math.exp(-(u - 0.06) / 0.22); v = Math.max(v, kk.a * e); }
    Q.setNeedle(v);
    Q.setCall(Math.max(0, Q.state.call - dt * 4));
  }
  later(d, fn) { (this._later ??= []).push({ d, fn }); }
  runLater(dt) { const L = this._later; if (!L?.length) return; for (const x of [...L]) { x.d -= dt; if (x.d <= 0) { L.splice(L.indexOf(x), 1); x.fn(); } } }
}
