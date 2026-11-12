// CAMPAIGN-4 (the user's treatment of 11.11.2026, section 4 "The excavation — a test with a cost"): the bore test at the
// research post on Desert Island (chapter 4, The Dig) and its cost (chapter 5, Steam and Sand). Not a chapter: dig.js
// and steam.js own it (one instance for both, story._dt) and ask it first.
//
// Chapter 4. Twinsen takes Ilka's notebook from the foreman's desk in a sandstorm. The storm passes as he leaves the
// post, and Dallan, out at the bore's test stand by the gate (nobody stands inside the fence during a pressure test),
// takes him for the technician Citadel promised on the ferry: the scheduled test is on, Vesk is on the project's wire,
// and the post's watch is told to leave him be. Twinsen pulls the cutoff when the drill's needle is on the red: the drill
// winds down, its needle falls, and AFTER the stop the ground needle kicks three times, rests, and kicks three more —
// the knock from the kitchen wall. Vesk calls it settling; Dallan has never seen it settle in threes. Twinsen runs it
// again himself: lever up, the bit bites down to the red, cut. A cut before the red brings nothing after it (the bit
// was not down: it answers the drill). At the red it kicks again. Dallan keeps the drill off until Citadel has read the
// strip and lets his "new man" tear off the recorder's carbon (the item tstrip: two traces). The dig's barrier runs off
// the post's line, dark while the test is on.
//
// Chapter 5. With FunFrock's valves set, Twinsen comes back to the post for the relief valve. Dallan is at the stand on
// the wire. Vesk: Kesh is off the evacuation list, so Kesh keeps its water, wind or no wind: the bore's spare heat goes
// to the steam drive on Kesh's pump, and since that was Twinsen's hand on the cutoff, he can throw the heat line. Far
// off, Kesh's pump puffs and turns faster (a real help: seen, and seen again in Kesh). Then Vesk has Dallan send test
// 14 with the drill channel only: the ground's kicks are "settling noise". The teleprinter's tape shows one trace; the
// carbon in Twinsen's pocket has two. That is what he puts to Dallan at the gate.
//
// Flags (new, saved): dt_v (a game that reached chapter 4 with this thread: set at its start, or on loading a chapter-4
// save from before whose dig gate was still shut), dt_hail, dt_dark, dt_cut, dt_second, dt_early (count), dt_again,
// dt_strip, dt_wire, dt_divert, dt_sent, dt_log, dt_pumpSeen. A save without dt_v (from before, past the step) finds the
// drill stopped, the heat line on the bore and nothing sent, and both chapters play as they did.
import * as THREE from 'three';
import { revealBeat } from './revealcam.js';
import { handTo } from './reach.js';
import '../text/digtest.js';

const RED = 0.9;      // the load at which the bit is down (the red mark is 1)
const CLIMB = 5.0;    // s: a standing drill to the red
const KICKS = [2.6, 2.92, 3.24, 4.4, 4.72, 5.04];   // s after a good cut: three, a rest, three
const GOOD_END = 5.9, EARLY_END = 2.6;

export class TestThread {
  constructor(story) { this.story = story; this.game = story.game; this.run = null; this.busy = false; this.later = []; this.sampleT = 0; this.puffT = 0; this.humT = 0; }
  get f() { return this.game.flags; }
  get ch() { return this.story.cur; }
  get key() { return this.story.cur?.key; }
  get D() { return this.game.regions?.built?.('desert'); }
  get S() { return this.D?.stand; }
  get on() { return !!this.f.dt_v; }
  // chapter 4's part: from the notebook until the carbon is torn off
  get open4() { const f = this.f; return this.key === 'dig' && this.on && !!f.c4_notebook && !f.dt_strip; }
  // chapter 5's part: the routed steam brings him back to the post: the wire, the heat line, the log
  get open5() { const f = this.f; return this.key === 'steam' && this.on && !!f.c5_routed && !f.dt_log; }
  // the post's watch leaves him be while he is Dallan's hand
  calm() { const f = this.f; return this.key === 'dig' && !!f.dt_hail && !f.dt_strip; }
  // the dig's barrier is dark while the test is on
  gateDark() { return this.open4; }
  inD() { return this.game.room?.id === 'desert'; }

  // ---------------------------------------------------------------- state
  // chapter 4 starts: a game that reaches it now has the test ahead
  begin4() { this.f.dt_v = 1; }
  applyFlags() {
    const f = this.f;
    this.run = null; this.busy = false; this.later = []; this.pending = null;
    // a chapter-4 save from before, the dig gate still shut: the test is ahead of it
    if (this.key === 'dig' && !f.dt_v && !f.c4_digOpen && !f.c4_done) f.dt_v = 1;
    this.game.regions.whenBuilt('desert', () => this.push());
  }
  // the drill runs in chapter 4 until the test's first cut (a thread that never had it: it stands, as it did)
  get live() { const f = this.f; return this.key === 'dig' && this.on && !f.dt_cut; }
  push() {
    const S = this.S, f = this.f, D = this.D;
    if (!S) return;
    const spin = this.run?.phase === 'spin' || (this.live && this.run?.phase !== 'down');
    S.setSpin(spin); S.setLoad(spin ? (this.run?.phase === 'spin' ? this.run.load : 1) : 0); S.cut.set(spin);
    S.paper.canned(f.dt_again ? 2 : f.dt_second ? 1 : 0); S.paper.torn(!!f.dt_strip);
    S.heat.set(!!f.dt_divert); S.showTape(!!f.dt_sent); S.sent(!!f.dt_sent);
    D.pump?.drive?.setHot(!!f.dt_divert);
  }
  place(id) {
    if (id !== 'dallan') return undefined;
    const f = this.f, R = this.game.rooms.desert;   // (read through rooms: the cast waits for the area: index.js refreshCast)
    if (!this.on) return undefined;
    if (this.key === 'dig' && f.c4_notebook && !f.dt_strip && !f.c4_carving) return { ...R.stand.spots.dallan, anim: 'tinker' };
    // (the test done: back in by his office to write the log; not his round's mark, so he is seen to walk there:
    //  castrounds.js would keep him on its round wherever he stood)
    if (this.key === 'dig' && f.dt_strip && !f.c4_carving) { const o = R.post.office; return { x: o.x + 2.0, z: o.z + 1.0, a: -Math.PI / 2 }; }
    if (this.key === 'steam' && f.c5_planned && !f.c5_vent) return { ...R.stand.spots.dallan, anim: 'tinker' };
    return undefined;
  }
  objective4() {
    const f = this.f, ch = this.ch;
    if (!this.open4 || !(f.dt_hail || f.dt_dark)) return null;
    if (!f.dt_second) return ch.goal('dt_obj_test') + ch.sub(!!f.dt_cut, 'dt_sub_cut');
    if (!f.dt_again) return ch.goal('dt_obj_again') + ch.sub(!!this.S?.cut.on, 'dt_sub_run') + ch.sub(false, 'dt_sub_red');
    return ch.goal('dt_obj_strip');
  }
  objective5() {
    const f = this.f, ch = this.ch;
    if (!this.open5 || !f.dt_wire) return null;
    if (!f.dt_divert) return ch.goal('dt_obj_heat');
    return ch.goal('dt_obj_log');
  }
  marker() {
    const S = this.S, f = this.f;
    if (!S) return null;
    if (this.open4 && (f.dt_hail || f.dt_dark)) return S.board;
    if (this.open5 && f.dt_wire) return S.board;
    return null;
  }
  items() { const f = this.f; return f.dt_strip && !f.cn_log ? [{ id: 'tstrip', icon: 'leaflet' }] : []; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, S = this.S, D = this.D;
    if (!S || !this.inD()) return;
    // (the dials are read while no lever is waiting for him: at the cutoff the lever's prompt is his)
    const lever = (this.open4 && f.dt_hail && !f.dt_strip) || (this.open5 && f.dt_wire && !f.dt_divert);
    if (!lever) consider(dist(S.board.x, S.board.z), 1.5, { kind: 'dt_board', label: 'p_read' });
    const dr = D.pump?.drive;
    if (dr) consider(dist(dr.look.x, dr.look.z), 1.5, { kind: 'dt_drive', label: 'p_look' });
    if (this.busy || this.run?.phase === 'down') return;   // (while it winds up, the cutoff is his)
    if (this.open4 && f.dt_hail) {
      if (!f.dt_cut || (f.dt_second && !f.dt_again)) { const p = S.cut.touch(); consider(dist(p.x, p.z), 1.4, { kind: 'dt_cut', label: S.cut.on ? 'p_cutoff' : 'p_runup' }); }
      if (f.dt_again && !f.dt_strip) consider(dist(S.strip.x, S.strip.z), 1.3, { kind: 'dt_strip', label: 'p_tear' });
    }
    if (this.open5 && f.dt_wire && !f.dt_divert) { const p = S.heat.touch(); consider(dist(p.x, p.z), 1.4, { kind: 'dt_heat', label: 'p_heat' }); }
    void g;
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, S = this.S, ch = this.ch;
    switch (it.kind) {
      case 'dt_board': {
        if (this.open5 && f.dt_sent && !f.dt_log) {
          ch.chain([['hero', 'dt_log']], () => { f.dt_log = true; g.updateObjective(); g.save(false); });
          return true;
        }
        const key = f.dt_sent ? 'dt_log_again' : this.key === 'steam' ? 'dt_board5' : S.spinning ? (this.run?.phase === 'spin' && this.run.load < RED ? 'dt_board_run' : 'dt_board_pre') : 'dt_board_off';
        ch.chain([['hero', key]]); return true;
      }
      case 'dt_drive': ch.chain([['hero', this.D.pump.drive.hot ? 'dt_drive_hot' : 'dt_drive_cold']]); return true;
      case 'dt_cut': {
        const p = S.cut.touch();
        this.busy = true;
        handTo(h, p, () => {
          g.audio.play('lever', S.board);
          if (S.cut.on) {
            // the cutoff: the drill winds down; was the bit down?
            S.cut.set(false);
            const load = this.run?.phase === 'spin' ? this.run.load : 1;
            if (!f.dt_cut) f.dt_cut = true;
            this.run = { phase: 'down', t: 0, load0: load, good: load >= RED, k: 0 };
            g.audio.play('clunk', this.D.bore);
            if (this.run.good) this.watch();
          } else {
            // lever up: the drill winds up from a standstill, its needle climbing to the red
            S.cut.set(true); S.setSpin(true);
            this.run = { phase: 'spin', t: 0, load: 0 };
            g.audio.play('liftWinch', this.D.bore);
            this.busy = false;
            if (!this.ranUp) { this.ranUp = true; ch.chain([['hero', 'dt_runup']], () => g.updateObjective()); } else g.updateObjective();
            return;
          }
          this.busy = false;
        });
        return true;
      }
      case 'dt_strip':
        this.busy = true;
        handTo(h, S.strip, () => {
          g.audio.play('paper', S.board); S.paper.torn(true);
          ch.chain([['hero', 'dt_strip'], ['dallan', 'dt_bye']], () => {
            f.dt_strip = true; this.busy = false;
            g.found('tstrip', 'dt_toast_strip');
            this.story.refreshCast({ walk: true });   // (Dallan goes back in to his log)
            g.updateObjective(); g.save(false);
          });
        });
        return true;
      case 'dt_heat':
        this.busy = true;
        handTo(h, S.heat.touch(), () => {
          g.audio.play('lever', S.board); g.audio.play('valve', S.board);
          S.heat.set(true); f.dt_divert = true; this.D.pump?.drive?.setHot(true);
          // far off, Kesh's pump: steam at its foot, and it turns faster (a cut-away while he sees it)
          const dr = this.D.pump?.drive, beat = dr ? revealBeat(g, { in: 0.6 }) : null;
          beat?.show(() => ({ pos: new THREE.Vector3(dr.x + 7.5, dr.y + 4.2, dr.z + 6.5), look: new THREE.Vector3(dr.x - 1.2, dr.y + 2.6, dr.z), fov: 48 }), 0.6);
          ch.chain([['hero', 'dt_divert']], () => { beat?.release(1.2); g.save(false); this.logRequest(); });
        });
        return true;
    }
    return false;
  }
  // a good cut: he stands and watches the dials while the drill stops and the ground answers (a close look at the board)
  watch() {
    const g = this.game, S = this.S;
    g.setState('cutscene');
    // (the story does not update outside play: the run steps here while he watches)
    g.cutscene = (dt) => { const h = g.hero; h.vel?.set(0, 0); h.rig.play('idle'); h.rig.update(dt, 0); h.sync(); this.stepRun(dt); };
    const d = S.dials, beat = revealBeat(g, { in: 0.5 });
    beat?.show(() => ({ pos: new THREE.Vector3(d.x - 1.7 * Math.sin(Math.PI / 2), d.y + 0.35, d.z - 0.55), look: new THREE.Vector3(d.x, d.y, d.z), fov: 42 }), 0.5);
    this.beat = beat;
  }
  // the run is over: what it showed
  afterRun(R) {
    const g = this.game, f = this.f, ch = this.ch;
    if (g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    this.beat?.release(1.0); this.beat = null;
    const done = () => { this.busy = false; g.updateObjective(); g.save(false); };
    this.busy = true;
    if (!R.good) {
      // too soon: the bit was not down, and nothing came after the stop
      f.dt_early = (f.dt_early || 0) + 1;
      if (f.dt_early === 1) ch.chain([['dallan', 'dt_early']], done); else { g.hud.toast('dt_toast_early'); done(); }
      return;
    }
    const radio = (i, id) => { if (id === 'veskwire') g.audio.play('radio', this.S.board); };
    if (!f.dt_second) {
      ch.chain([['hero', 'dt_tw_kick'], ['veskwire', 'dt_vesk_1'], ['dallan', 'dt_dallan_1'], ['veskwire', 'dt_vesk_2'], ['dallan', 'dt_dallan_2']], () => { f.dt_second = true; done(); }, radio);
      return;
    }
    ch.chain([['dallan', 'dt_dallan_again'], ['hero', 'dt_tw_again'], ['veskwire', 'dt_vesk_3'], ['dallan', 'dt_dallan_3'], ['veskwire', 'dt_vesk_4'], ['dallan', 'dt_dallan_4']], () => { f.dt_again = true; done(); }, radio);
  }
  // Dallan stops him outside the gate, the storm gone: the scheduled test, and a pair of hands
  hail() {
    const g = this.game, f = this.f, ch = this.ch;
    f.dt_hail = true; this.busy = true;
    ch.chain([['dallan', 'dt_hail_1'], ['hero', 'dt_tw_hail'], ['dallan', 'dt_hail_2'], ['dallan', 'dt_hail_3'], ['veskwire', 'dt_vesk_0']], () => { this.busy = false; g.updateObjective(); g.save(false); },
      (i, id) => { if (id === 'veskwire') g.audio.play('radio', this.S.board); });
  }
  // chapter 5: Vesk on the wire as he comes back to the post
  wire() {
    const g = this.game, f = this.f, ch = this.ch;
    f.dt_wire = true; this.busy = true;
    ch.chain([['veskwire', 'dt_w5_1'], ['dallan', 'dt_w5_d1'], ['veskwire', 'dt_w5_2'], ['dallan', 'dt_w5_d2'], ['veskwire', 'dt_w5_3']], () => { this.busy = false; g.updateObjective(); g.save(false); },
      (i, id) => { if (id === 'veskwire') g.audio.play('radio', this.S.board); });
  }
  // the log: Vesk has the drill channel sent, and the teleprinter chatters it out
  logRequest() {
    const g = this.game, f = this.f, ch = this.ch, S = this.S;
    this.busy = true;
    ch.chain([['veskwire', 'dt_w5_4'], ['dallan', 'dt_w5_d3'], ['veskwire', 'dt_w5_5'], ['dallan', 'dt_w5_d4']], () => {
      for (let i = 0; i < 7; i++) this.after(0.25 * i, () => g.audio.play('tick', S.tape));
      this.after(1.9, () => { S.showTape(true); S.sent(true); f.dt_sent = true; this.busy = false; g.updateObjective(); g.save(false); });
    }, (i, id) => { if (id === 'veskwire') g.audio.play('radio', S.board); });
  }
  // Dallan at the stand in chapter 5: the thread's part comes first
  talk(npc) {
    const g = this.game, f = this.f, ch = this.ch, id = npc.def.id;
    if (id !== 'dallan' || !this.on) return false;
    if (this.busy) return true;   // (a scene of the thread under way: he is busy at the wire)
    const c = (lines, done) => { ch.chain(lines, done); return true; };
    if (this.key === 'dig' && this.open4) {
      if (!f.dt_hail) { this.hail(); return true; }
      if (!f.dt_second) return c([['dallan', 'dt_dallan_wait']]);
      if (!f.dt_again) return c([['dallan', 'dt_dallan_wait2']]);
      return c([['dallan', 'dt_dallan_wait3']]);
    }
    if (this.key === 'dig' && f.dt_strip && !f.c4_carving) return c([['dallan', 'dt_dallan_done']]);
    if (this.key !== 'steam' || !f.c5_routed || f.c5_dallanOK) return false;
    if (!f.dt_wire) { this.wire(); return true; }
    if (!f.dt_divert) return c([['dallan', 'dt_dallan_heat']]);
    if (!f.dt_sent) { this.logRequest(); return true; }
    if (!f.dt_log) return c([['dallan', 'dt_dallan_sent']]);
    // the gate: what he read on the tape is what he puts to Dallan
    return c([['dallan', 'c5_dallan_gate1'], ['hero', 'dt_tw_gate1'], ['dallan', 'dt_dallan_gate1'], ['hero', 'dt_tw_gate2'], ['dallan', 'c5_dallan_gate2'], ['hero', 'c5_tw_gate2'], ['dallan', 'c5_dallan_gate3']], () => {
      f.c5_dallanOK = true; this.D.post.gate.open(); g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- per frame
  // a run under way: the drill winding up, or down and what comes after it (the needles, the knocks, the paper)
  stepRun(dt) {
    const g = this.game, S = this.S, D = this.D, R = this.run;
    if (!R || !S) return;
    R.t += dt;
    let gv = 0;
    if (R.phase === 'spin') { R.load = Math.min(1, R.t / CLIMB); S.setLoad(R.load); }
    else {
      S.setLoad(Math.max(0, R.load0 * (1 - R.t / 1.4)));
      if (R.t > 0.25 && S.spinning) S.setSpin(false);
      while (R.good && R.k < KICKS.length && R.t >= KICKS[R.k]) {
        R.k++; S.kick(); gv = 0.9;
        g.audio.play('pipeKnock', S.board); g.audio.play('rattle', D.bore); g.camRig.shake(0.05);
      }
    }
    if ((this.sampleT -= dt) <= 0 || gv) { this.sampleT = 0.1; S.paper.trace(S.load, gv || (this.lastG > 0.5 ? -0.4 : 0)); this.lastG = gv; }
    if (R.phase === 'down' && R.t >= (R.good ? GOOD_END : EARLY_END)) { this.run = null; this.afterRun(R); }
  }
  after(t, fn) { this.later.push({ t, fn }); }
  // in every chapter from the fourth (story/index.js update): the drill's hum while it turns, and the steam drive's puffs
  // once the heat line goes to Kesh — Desert Island as he left it, whenever he comes back
  ambient(dt) {
    const g = this.game, S = this.S, h = g.hero;
    if (!S || !this.inD() || g.state !== 'play') return;
    const D = this.D;
    if (S.spinning && (this.humT -= dt) <= 0) { this.humT = 1.6; if (Math.hypot(h.pos.x - D.bore.x, h.pos.z - D.bore.z) < 32) g.audio.play('motor', D.bore); }
    const dr = D.pump?.drive;
    if (dr?.hot && (this.puffT -= dt) <= 0) {
      this.puffT = 0.5;
      if (Math.hypot(h.pos.x - dr.x, h.pos.z - dr.z) < 110) g.particles.spawn({ x: dr.stack.x + (Math.random() - 0.5) * 0.1, y: dr.stack.y, z: dr.stack.z, vx: (Math.random() - 0.5) * 0.3, vy: 1.4, vz: (Math.random() - 0.5) * 0.3, color: '#f4f6f8', a: 0.55, s0: 0.25, s1: 1.1, life: 1.6, grav: -0.3, drag: 0.8, drift: 0.6, add: 0.05, cell: 1, fi: 0.1, fo: 0.45 });
    }
  }
  // the thread's own steps (dig.js, steam.js update)
  update(dt) {
    const g = this.game, f = this.f, S = this.S, h = g.hero;
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (!S || !this.inD()) return;
    const D = this.D, dr = D.pump?.drive;
    if (g.state === 'play') this.stepRun(dt);
    if (g.state !== 'play' || g.trans || this.busy) return;
    // chapter 4: out of the gate with the notebook, the storm gone: Dallan's hail
    if (this.open4 && !f.dt_hail && !this.ch.stormy) {
      const P = D.post, gd = Math.hypot(h.pos.x - P.gate.x, h.pos.z - P.gate.z), sd = Math.hypot(h.pos.x - S.board.x, h.pos.z - S.board.z);
      if ((h.pos.x < P.x0 - 0.3 && gd < 10) || sd < 7) this.hail();
    }
    // chapter 5: back at the post with the valves set: Vesk on the wire; after a load half way, the log he asked for
    if (this.open5 && Math.hypot(h.pos.x - S.board.x, h.pos.z - S.board.z) < 9) {
      if (!f.dt_wire) this.wire();
      else if (f.dt_divert && !f.dt_sent) this.logRequest();
    }
    // back in Kesh: the pump on steam, and what Kesh makes of it
    if (this.key === 'steam' && f.dt_divert && !f.dt_pumpSeen && dr && Math.hypot(h.pos.x - dr.x, h.pos.z - dr.z) < 12) {
      f.dt_pumpSeen = true;
      const near = (id) => { const n = this.ch.npc(id); return n?.present && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 30; };
      this.ch.chain([['hero', 'dt_pump_seen'], ...(near('dkid') ? [['dkid', 'dt_sani_steam']] : []), ...(near('dtrader') ? [['dtrader', 'dt_brosk_steam']] : [])], () => g.save(false));
    }
  }
}
