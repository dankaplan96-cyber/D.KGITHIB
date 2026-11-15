// U-1 "The Last Ferry" — the user's own side quest (docs/lba-maturity/DEPTH-PLAN.md, "The user's five side quests";
// docs/lba-maturity/U1-LAST-FERRY.md). Not a chapter: the director (index.js) asks it beside the chapter in progress,
// like depth.js. The world's pieces are src/game/skyferry.js; the ferry's model is zeelich.js buildFerry.
//
// From chapter 3 (Zeelich) on. A sailings board on the West Pier says SAILINGS ON THE BELL under a pasted LINE CLOSED;
// Captain Ossel still turns up for every sailing: he chalks the board, walks to the rail gap, rings the bell, waits, and
// goes back. His ferry, the "Patience", has lain tied to the pier since the shuttles came; the catch on the winch house's
// cable drum holds her and only lets go from its far side.
//   - In the winch house (behind the gateway): a brass plate (1. BRIDGE DOWN 2. TRIP THE CATCH 3. RING OFF), the bridge's
//     hand wheel, a partition with one hole (the port). The bridge's counterweight hangs in front of the port while the
//     bridge is up: an interlock, so the catch is never tripped with the bridge up. Turning the wheel (both hands on it)
//     lowers the loading bridge onto her deck and raises the counterweight; through the port the catch's trip paddle
//     shows behind the drum. A hand can't get there; the magic ball, thrown through the port, can. Thrown while the
//     weight still hangs there, it strikes the weight (a line; nothing lost).
//   - The catch drops, the cable runs slack. Ossel: twelve years of ringing for nobody; "you ring her off". Twinsen walks
//     over the bridge, pushes the telegraph's handle down (his hand on it) and the first sailing starts: a short film
//     round the south-west cliffs to Mill Lane Steps (holding the skip key ends it at the far berth).
//   - At Mill Lane Oshra (the glaze trader stuck at the spaceport while the project grounds the ships) and Wick (a Wannie
//     who hates shuttles) come aboard. From then on the line runs: the telegraph sails her from either berth; a bell at
//     each landing calls her when she is at the other one (she is seen sailing over). Oshra sells tea on deck (two kashes:
//     magic refilled; with no kashes it is on the house). Each sailing the passengers talk about what is happening on the
//     island; their lines follow the main story (chapter 3 before and after the shield, 4–8, 9, 10, after the ending), and
//     the return sailing has its own.
// Nothing on the main path depends on it; a player who never starts it still meets the captain on time.
//
// State (flags, dx_ like depth.js; an old save has none: the ferry lies tied up, the bridge up, the catch on):
//   dx_lf_board (board read), dx_lf_ask (the captain's story), dx_lf_plate, dx_lf_bridge (bridge lowered), dx_lf_blocked
//   (throws into the counterweight), dx_lf_free (the catch tripped), dx_lf_first (the first sailing made: the line runs),
//   dx_lf_at ('west' | 'mill': where she is moored; set when a sailing starts, so a save mid-way lands her and him at the
//   far berth), dx_lf_sails (sailings made with him), dx_lf_heard ('pre,mid,…': the stages whose sailing lines he heard),
//   dx_lf_tea (cups bought). A save made on her deck loads him on it (the deck is walkable at her berth); one over the open
//   clouds (none should exist) is put back on the landing.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { Cinematic } from '../../engine/cinematic.js';
import { buildSkyFerry, makeRoute, voyage, LF, DECK } from '../skyferry.js';
import { handTo } from './reach.js';
import { TrackRunner } from '../../engine/scripts.js';
import { WATER_FLOOR } from '../../engine/physics.js';
import '../text/ferry.js';

const SAIL_T = 30;          // s, one sailing (film or called)
const TEA = 2;              // kashes a cup
const COLORS = { lf_ossel: '#8ac0e8', lf_wick: '#d8b888', lf_oshra: '#e0a8c8', hero: '#8fc2ff' };
const NAME = { lf_ossel: 'n_lf_ossel', lf_wick: 'n_lf_wick', lf_oshra: 'n_oshra', hero: 'n_hero' };
const ABOARD = ['lf_ossel', 'lf_oshra', 'lf_wick'];
const SPOT = { lf_ossel: 'captain', lf_oshra: 'oshra', lf_wick: 'wick' };
const other = (b) => (b === 'west' ? 'mill' : 'west');
const $ = (s) => document.querySelector(s);

// the journey film's runner: a Cinematic with a synchronous start (as travelfilm.js's Film)
class SailFilm extends Cinematic {
  start() {
    const g = this.game;
    this.state = 'prep';
    g.cine = this; g.camRig.cine = true; g.camRig.override = null;
    if (g.hero.rig.silhouette) g.hero.rig.silhouette.visible = false;
    g.setState('cinematicEnd');
    g.hud.show(false);
    document.body.classList.add('cine-on');
    $('#touch')?.classList.add('hidden');
    $('#fade').classList.remove('quick');
    $('#fade').classList.add('on', 'instant');
    this.ui(true);
    try { this.def.prepare?.(this); } catch (e) { console.error('ferry film prepare failed', e); }
    this.state = 'run';
    g.setState('cinematic');
    this.apply(0);
    const reveal = () => $('#fade').classList.remove('instant', 'on');
    requestAnimationFrame(reveal); setTimeout(reveal, 250);
  }
}

export class LastFerry extends ChapterBase {
  get Z() { return this.game.regions?.built?.('zeelich') || null; }
  get S() { return this.Z?.skyferry || null; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  get open() { const i = this.idx('zeelich'); return i >= 0 && this.story.index >= i; }
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  here() { return this.game.room?.id === 'zeelich' && !!this.S; }
  get at() { return this.f.dx_lf_at === 'mill' ? 'mill' : 'west'; }
  get line() { return !!this.f.dx_lf_first; }
  // where the island is in the main story (the passengers' talk): as zeelife.js, the chapters inside the shell count with
  // the network (nobody up here knows more yet), 'late' only once it is over
  phase() {
    const k = this.story.cur?.key;
    if (k === 'zeelich') return this.f.c2_shield ? 'post' : 'pre';
    if (k === 'council') return 'council';
    if (k === 'network' || k === 'shell' || k === 'core') return 'network';
    if (k === 'home') return 'late';
    return 'mid';
  }

  // ================================================================ the cast
  npcDefs() {
    const Z = this.Z, ox = Z?.group?.position.x ?? 2400, oz = Z?.group?.position.z ?? 0;
    const at = (x, z, a) => (Z ? { x: ox + x, z: oz + z, angle: a } : { x: 0, z: 0, angle: 0, pending: true });
    return [
      { id: 'lf_ossel', name: 'n_lf_ossel', char: 'ztri1', color: COLORS.lf_ossel, ...at(-53.02, -1.07, Math.PI) },
      { id: 'lf_wick', name: 'n_lf_wick', char: 'zmole1_b', color: COLORS.lf_wick, ...at(LF.stage.x + 0.5, LF.stage.z0 + 1.6, Math.PI) },
      { id: 'lf_oshra', name: 'n_oshra', char: 'xil', dressOf: 'oshra', color: COLORS.lf_oshra, ...at(LF.stage.x - 0.4, LF.stage.z0 + 2.4, Math.PI) },
    ];
  }
  // the captain's round while the line is closed: chalk on the board, the bell at the rail gap, a wait, back
  roundTrack() {
    const Z = this.Z, ox = Z.group.position.x, oz = Z.group.position.z, S = this.S;
    const B = { x: ox - 53.02, z: oz - 1.07 }, cord = S.cord.west.front;
    const ring = (n) => { if (!this.here()) return; S.ringBell('west'); for (let i = 0; i < 3; i++) this.later(i * 0.45, () => this.game.audio.play('clang', { x: cord.x, z: cord.z })); n.rig?.doGesture?.('nod'); };
    return [
      { op: 'goto', x: B.x, z: B.z, speed: 0.8, near: 0.15 }, { op: 'face', a: Math.PI }, { op: 'anim', name: 'reach', t: 2.2 }, { op: 'wait', t: 12 },
      { op: 'goto', x: cord.x, z: cord.z, speed: 0.8, near: 0.15 }, { op: 'face', a: 0 }, { op: 'anim', name: 'reach', t: 1.0 },
      { op: 'call', fn: (n) => ring(n) }, { op: 'wait', t: 7 }, { op: 'call', fn: (n) => n.rig?.doGesture?.('sigh') }, { op: 'wait', t: 2 },
      { op: 'loop' },
    ];
  }
  place(id) {
    const n = this.npc(id);
    if (id === 'oshra') {   // (the glaze trader at the spaceport's rail: on the ferry once the line runs)
      if (!n) return undefined;
      if (this.open && (this.line || this.firstFilm)) { n.away = 'lf'; return null; }
      if (n.away === 'lf') { n.away = null; return n.reset?.() ?? undefined; }
      return undefined;
    }
    if (!ABOARD.includes(id)) return undefined;
    if (!this.open) return null;
    if (!this.S) return undefined;   // (Zeelich not built: they wait hidden)
    const f = this.f;
    if (n?._lf === 'boarding' && n.track && n.track.pc < n.track.cmds.length) return undefined;   // (stepping aboard at Mill Lane)
    if (id !== 'lf_ossel' && (!this.line || this.firstFilm)) {
      if (!this.firstFilm) return null;
      // (the first arrival: on Mill Lane's stage, waiting for her, until they have said hello)
      const ox = this.Z.group.position.x, oz = this.Z.group.position.z, ST = LF.stage;
      if (n) n._lf = 'stage';
      return id === 'lf_wick' ? { x: ox + ST.x + 0.45, z: oz + ST.z0 + 1.7, a: Math.PI, track: null } : { x: ox + ST.x - 0.4, z: oz + ST.z0 + 2.5, a: Math.PI, track: null };
    }
    if (this.sail) return undefined;  // (under way: the voyage moves them)
    if (id === 'lf_ossel' && !f.dx_lf_free) {
      if (n?._lf === 'round' && n.present && n.track) return undefined;   // (on his round: leave him at it)
      if (n) n._lf = 'round';
      const ox = this.Z.group.position.x, oz = this.Z.group.position.z;
      return { x: ox - 53.02, z: oz - 1.07, a: Math.PI, track: this.roundTrack() };
    }
    if (n) n._lf = 'aboard';
    const s = this.S.deckSpot(SPOT[id], this.at);
    return { x: s.x, z: s.z, a: s.a, track: null };
  }

  // ================================================================ the world from the flags
  decorate() {
    const Z = this.Z;
    if (!Z || !Z.ferry || Z.skyferry) { if (Z?.skyferry && this.once('targets')) this.targets(); return; }
    buildSkyFerry(this.game, Z);
    if (this.once('targets')) this.targets();
    this.applyWorld();
  }
  regionBuilt(ids) { if (ids.includes('zeelich')) this.applyWorld(); }
  applyFlags() {
    const f = this.f;
    if (f.dx_lf_at && f.dx_lf_at !== 'west' && f.dx_lf_at !== 'mill') delete f.dx_lf_at;
    if (f.dx_lf_first && !f.dx_lf_free) f.dx_lf_free = true;   // (consistent: the line runs only with the catch off)
    if (f.dx_lf_free && !f.dx_lf_bridge) f.dx_lf_bridge = true;
    this.sail = null; this.anim = null; this.busy = false; this.firstFilm = false; this._q = [];
    this.applyWorld();
  }
  bridgeDown() { const f = this.f; return !!f.dx_lf_bridge && (!f.dx_lf_first || this.at === 'west'); }
  applyWorld() {
    const S = this.S, Z = this.Z, f = this.f; if (!S) return;
    Z.ferry.setVisible(this.open);
    const B = LF.berth[this.at];
    if (!this.sail) { S.place(B.x, B.z, B.rot); S.setMoor(this.open && (f.dx_lf_bridge || this.at === 'mill') ? this.at : null); }
    S.setRopes(!this.sail && this.at === 'west');
    const down = this.bridgeDown();
    S.setBridge(down ? 1 : 0); S.setWeight(down ? 1 : 0);
    S.setCatch(!!f.dx_lf_free);
    S.setCable(f.dx_lf_free ? 'gone' : 'taut');
    S.setBoard(!f.dx_lf_first ? 'closed' : 'tea');
    S.setTelegraph(0);
    S.setCrate(this.line);
    Z.ferry.spin = this.line || this.sail ? 9 : 0;   // (laid up: her propellers still)
  }
  // the ball's two marks in the winch house: the counterweight (while it covers the port) and the catch's trip paddle
  targets() {
    const S = this.S, Z = this.Z, me = this; if (!S || !Z) return;
    Z.ballTargets.push({
      r: 0.42, lf: 'weight', material: 'machine',
      get x() { return S.weight.x; }, get y() { return S.weight.y; }, get z() { return S.weight.z; },
      get done() { return !me.open || !!me.f.dx_lf_free || S.weightK > 0.5 || !me.able(); },
      onHit() { me.blocked(); },
    });
    Z.ballTargets.push({
      r: S.trip.r, lf: 'trip', material: 'machine',
      get x() { return S.trip.x; }, get y() { return S.trip.y; }, get z() { return S.trip.z; },
      get done() { return !me.open || !!me.f.dx_lf_free || S.weightK < 0.5 || !me.able(); },
      onHit() { me.trip(); },
    });
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    if (!this.open || !this.here() || !this.able() || this.sail || this.busy) return;
    const S = this.S, h = this.game.hero, f = this.f, y = h.pos.y;
    if (h.steer || h.actT > 0) return;
    const ground = Math.abs(y - 6.0) < 0.5, deck = Math.abs(y - LF.deckTop) < 0.12 && !ground;
    if (ground) {
      consider(dist(S.board.x, S.board.z), 1.3, { kind: 'dx_lf_board', label: 'p_read' });
      consider(dist(S.millBoard.x, S.millBoard.z), 1.2, { kind: 'dx_lf_mboard', label: 'p_read' });
      for (const w of ['west', 'mill']) { const c = S.cord[w]; consider(dist(c.x, c.z), 1.3, { kind: 'dx_lf_bell', which: w, label: 'p_bell' }); }
      if (S.inHut(h.pos.x, h.pos.z)) {
        consider(dist(S.plate.x, S.plate.z), 1.1, { kind: 'dx_lf_plate', label: 'p_read' });
        consider(dist(S.wheel.x, S.wheel.z), 1.45, { kind: 'dx_lf_wheel', label: f.dx_lf_bridge ? 'p_look' : 'p_turn' });
        consider(dist(S.port.x, S.port.z), 1.25, { kind: 'dx_lf_port', label: 'p_look' });
      }
    }
    // the telegraph: on her deck, at her berth
    if ((deck || ground) && this.moored()) {
      const T = S.telegraph(this.at);
      if (Math.hypot(h.pos.x - T.front.x, h.pos.z - T.front.z) < 1.2 && y > LF.deckTop - 0.3) consider(dist(T.x, T.z), 1.3, { kind: 'dx_lf_tel', label: f.dx_lf_free ? 'p_sail' : 'p_look' });
    }
  }
  moored() { return !this.sail && (this.f.dx_lf_bridge || this.at === 'mill'); }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_lf_')) return false;
    const g = this.game, f = this.f, S = this.S, h = g.hero;
    const look = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), () => { done?.(); g.save(false); }); return true; };
    switch (it.kind) {
      case 'dx_lf_board': f.dx_lf_board = true; return look(f.dx_lf_first ? ['lf_board_open', 'lf_board_tea'] : ['lf_board_closed', 'lf_board_closed2']);
      case 'dx_lf_mboard': return look(['lf_board_mill']);
      case 'dx_lf_plate': f.dx_lf_plate = true; return look(['lf_hut_plate']);
      case 'dx_lf_port':
        if (f.dx_lf_free) return look(['lf_free_hut']);
        if (S.weightK < 0.5) return look(['lf_weight_down']);
        return look(f.dx_lf_reach ? ['lf_weight_up'] : ['lf_weight_up', 'lf_catch_hand'], () => { f.dx_lf_reach = true; });
      case 'dx_lf_wheel': {
        if (f.dx_lf_bridge) return look([f.dx_lf_free ? 'lf_wheel_down' : 'lf_wheel_back']);
        // both hands on the wheel's grips; it turns, the bridge goes down outside and the counterweight up in here
        this.busy = true;
        const W = S.wheel, go = () => {
          h.act('pumpGrip', 2.6, () => {}, 0.05);
          g.audio.play('winch', W);
          this.anim = { kind: 'bridge', t: 0, T: 2.4, done: () => {
            f.dx_lf_bridge = true; this.busy = false;
            this.applyWorld();
            look(['lf_wheel_turn']);
          } };
        };
        h.walkTo([W.stand], { a: W.a, speed: 1.3, then: () => { h.angle = W.a; go(); }, fail: () => { h.angle = W.a; go(); } });
        if (h.steer) h.steer.indoor = true;
        return true;
      }
      case 'dx_lf_bell': {
        const c = S.cord[it.which];
        this.busy = true;
        handTo(h, c, () => {
          S.ringBell(it.which);
          for (let i = 0; i < 3; i++) this.later(i * 0.45, () => g.audio.play('clang', c));
          this.busy = false;
          if (!f.dx_lf_first) return look([f.dx_lf_free && it.which === 'west' ? 'lf_bell_here' : 'lf_bell_none']);
          if (this.at === it.which) return look(['lf_bell_here']);
          this.callFerry(it.which);
          return look(['lf_bell_coming']);
        });
        return true;
      }
      case 'dx_lf_tel': {
        if (!f.dx_lf_free) return look([f.dx_lf_ask || f.dx_lf_plate ? 'lf_tel_held' : 'lf_tel_look']);
        if (Math.abs(h.pos.y - LF.deckTop) > 0.15) return look(['lf_tel_look']);
        this.busy = true;
        const T = S.telegraph(this.at);
        handTo(h, T, () => {
          S.setTelegraph(1); g.audio.play('lever', T);
          this.later(0.5, () => { this.busy = false; this.sailWith(); });
        });
        return true;
      }
    }
    return false;
  }
  // the ball into the counterweight: it hangs right in front of the hole
  blocked() {
    const f = this.f;
    f.dx_lf_blocked = (f.dx_lf_blocked || 0) + 1;
    if (this._blockT > this.game.time - 1) return;   // (one line a throw)
    this._blockT = this.game.time;
    this.chain([['hero', 'lf_port_blocked']], () => this.game.save(false));
  }
  // the ball through the port onto the trip paddle: the catch drops, the drum runs, the cable goes slack
  trip() {
    const g = this.game, f = this.f, S = this.S;
    if (f.dx_lf_free) return;
    f.dx_lf_free = true;
    S.setCatch(true);
    g.audio.play('clunk', S.trip);
    this.anim = { kind: 'drum', t: 0, T: 1.6, done: () => {
      S.setCable('gone'); g.audio.play('tSlack', S.drum);
      this.story.refreshCast({ walk: true });
      const lines = [['hero', 'lf_catch_free'], ['lf_ossel', 'lf_ossel_free'], ['lf_ossel', 'lf_ossel_free2']];
      this.chain(lines, () => g.save(false));
    } };
    g.audio.play('rattle', S.drum);
    g.save(false);
  }

  // ================================================================ talk
  talkFirst(npc) {
    const id = npc?.def?.id;
    if (!ABOARD.includes(id) || !this.open || !this.here()) return false;
    const g = this.game, f = this.f, ph = this.phase();
    const c = (keys, done) => { this.chain(keys, () => { done?.(); g.save(false); }); return true; };
    const pick = (key) => { const a = t(key); if (!Array.isArray(a)) return key; const N = (this._n ||= {}); N[key] = ((N[key] ?? -1) + 1) % a.length; return [key, N[key]]; };
    if (id === 'lf_ossel') {
      if (!f.dx_lf_ask) {
        const lines = [['lf_ossel', 'lf_ossel_1'], ['lf_ossel', 'lf_ossel_2']];
        if (ph === 'pre' || ph === 'post') lines.push(['lf_ossel', 'lf_ossel_grounded']);
        if (!f.dx_lf_free) lines.push(['lf_ossel', 'lf_ossel_3'], ['lf_ossel', 'lf_ossel_4']);
        return c(lines, () => { f.dx_lf_ask = true; });
      }
      if (!f.dx_lf_free) return c([['lf_ossel', f.dx_lf_bridge ? 'lf_ossel_wait2' : 'lf_ossel_wait']]);
      if (!f.dx_lf_first) return c([['lf_ossel', 'lf_ossel_board']]);
      const key = ph === 'pre' || ph === 'post' ? 'lf_ossel_on' : 'lf_ossel_on_' + ph;
      return this.one(npc, pick(key));
    }
    if (id === 'lf_wick') return this.one(npc, pick('lf_wick_on'));
    if (id === 'lf_oshra') {
      const h = g.hero;
      if (h.mp >= h.mpMax) return this.one(npc, 'lf_oshra_full');
      const paid = h.coins >= TEA;
      if (paid) { h.coins -= TEA; g.audio.play('coin'); }
      h.mp = h.mpMax; g.audio.play('heal'); g.hud.stats?.(h);
      f.dx_lf_tea = (f.dx_lf_tea || 0) + 1;
      g.hud.toast('lf_toast_tea');
      return c([['lf_oshra', 'lf_oshra_hi'], ['lf_oshra', paid ? 'lf_oshra_tea' : 'lf_oshra_free']]);
    }
    return false;
  }
  // one line in the person's name and voice (a line set's item: [key, i])
  one(npc, k) {
    const g = this.game, txt = Array.isArray(k) ? t(k[0])[k[1]] : t(k);
    npc.talking = true;
    g.say(NAME[npc.def.id] || npc.def.name, [txt], () => { npc.talking = false; g.save(false); }, npc, COLORS[npc.def.id]);
    return true;
  }
  // a conversation (as ChapterBase.chain), with the ferry's people under their own names (Oshra's is n_oshra)
  chain(lines, done) {
    const g = this.game;
    const next = (i) => {
      if (i >= lines.length) { for (const [oid] of lines) { const o = this.speaker(oid); if (o && o !== g.hero) o.listenTo = null; } done?.(); return; }
      const [id, key] = lines[i];
      const sp = this.speaker(id), text = Array.isArray(t(key)) ? t(key) : [t(key)];
      for (const [oid] of lines) { const o = this.speaker(oid); if (o && o !== sp && sp && o !== g.hero) o.listenTo = sp; }
      if (sp && sp !== g.hero) sp.talking = true;
      g.say(NAME[id] || 'n_' + id, text, () => { if (sp && sp !== g.hero) sp.talking = false; next(i + 1); }, sp, COLORS[id]);
    };
    next(0);
  }
  later(s, fn) { (this._q ||= []).push({ t: s, fn }); }

  // ================================================================ sailing
  // the sailing's lines: who says what, by the story's stage and the way she sails (the return has its own where there are)
  sailLines(from) {
    const ph = this.phase(), has = (k) => t(k) !== k;
    const k = (who, n) => `lf_s_${ph}_${who}${n}`;
    const pickN = (who, n) => (has(k(who, n)) ? k(who, n) : k(who, 1));
    if (from === 'west') return [['lf_wick', k('w', 1)], ['lf_oshra', k('o', 1)], ['lf_ossel', k('c', 1)]];
    return [['lf_oshra', pickN('o', 2)], ['lf_wick', pickN('w', 2)], ['lf_ossel', pickN('c', 2)]];
  }
  // aboard with him: the film (the telegraph's handle is down)
  sailWith() {
    const g = this.game, f = this.f, S = this.S, h = g.hero;
    const from = this.at, to = other(from), first = !f.dx_lf_first;
    const R = makeRoute(from, to), T = SAIL_T, ox = this.Z.group.position.x, oz = this.Z.group.position.z;
    this.sail = { from, to, R, t: 0, T, film: true };
    if (first) { this.firstFilm = true; this.story.refreshCast(); }   // (Oshra and Wick on Mill Lane's stage, out of sight)
    // (saved as arrived: a save under way lands him and her at the far berth)
    f.dx_lf_at = to; g.lastSafe = { x: S.landing[to].x, z: S.landing[to].z };
    const lines = first ? [['lf_ossel', 'lf_first_ossel1'], ['hero', 'lf_first_tw2'], ['lf_ossel', 'lf_first_ossel3'], ['lf_ossel', 'lf_first_ossel2']] : this.sailLines(from);
    const subs = lines.map(([who, key], i) => ({ t: 3.5 + i * 6.2, d: 5.4, who: t(NAME[who]), text: t(key), color: COLORS[who], voice: NAME[who] }));
    const aboard = first ? ['lf_ossel'] : ABOARD;
    const npcs = aboard.map((id) => this.npc(id)).filter((n) => n?.present);
    const side = from === 'west' ? 1 : -1;   // (the camera on her open-water side: away from the cliffs)
    const pose = (tt) => R.at(voyage(R.L, T, tt));
    const local = (p, lx, ly, lz) => { const c = Math.cos(p.rot), sn = Math.sin(p.rot); return new THREE.Vector3(ox + p.x + lx * c + lz * sn, ly, oz + p.z - lx * sn + lz * c); };
    const cam = (tt) => { const p = pose(tt); return { pos: local(p, -5.5, LF.deckTop + 6.5, side * 11), look: local(p, 1.5, LF.deckTop + 1.2, 0), fov: 46 }; };
    const shots = [{ t0: 0, t1: T - 2.4, from: cam }, { t0: T - 2.4, t1: T, to: 'game' }];
    const events = [
      { t: 0.2, fn: () => g.audio.play('horn') },
      { t: T - 1.2, fn: () => g.audio.play('clunk') },
    ];
    const tracks = [{ t0: 0, t1: T, fn: (k, tt, dt) => { this.sail.t = tt; this.moveTo(pose(tt), dt, npcs, true); this.bridgeAt(tt, T, from, to); } }];
    const cine = new SailFilm(g, {
      length: T, events, tracks, shots, subs,
      prepare: (c) => {
        S.setMoor(null); S.setRopes(false); S.envFade(1); this.Z.ferry.spin = 20; this.Z.ferry.bobK = 0.5;
        h.onGround = false; h.vy = 0; h.shadow.visible = false;
        for (const n of npcs) { n.track = null; n.forceAnim = null; }
        this.moveTo(pose(0), 0, npcs, true);
        c.focus = h.pos;
      },
      finish: (skipped) => this.arrive(to, npcs, first, skipped),
    });
    cine.speakers = { n_lf_ossel: this.npc('lf_ossel'), n_oshra: this.npc('lf_oshra'), n_lf_wick: this.npc('lf_wick'), n_hero: h };
    this.film = cine;
    cine.start();
    g.save(false);   // (he is in the air now as far as a save goes: it keeps him at the far landing, lastSafe)
  }
  // the ferry, him and the people aboard where the voyage has her
  moveTo(p, dt, npcs, withHero) {
    const g = this.game, S = this.S, h = g.hero;
    S.place(p.x, p.z, p.rot);
    if (withHero) {
      const s = S.deckSpot('hero');
      h.pos.set(s.x, LF.deckTop, s.z); h.angle = s.a;
      h.rig.play('idle'); h.rig.update(dt, 0); h.sync(); h.shadow.visible = false;
    }
    for (const n of npcs) {
      const s = S.deckSpot(SPOT[n.def.id]);
      n.pos.set(s.x, LF.deckTop, s.z); n.angle = s.a; n.pinY = LF.deckTop; n.sync();
      if (n.shadow) n.shadow.visible = false;
    }
  }
  // the loading bridge lifts as she leaves the West Pier and comes down as she arrives there
  bridgeAt(tt, T, from, to) {
    const S = this.S;
    if (from === 'west') { const k = 1 - Math.min(1, Math.max(0, (tt - 0.3) / 2.0)); S.setBridge(k); S.setWeight(k); }
    else if (to === 'west') { const k = Math.min(1, Math.max(0, (tt - (T - 2.2)) / 2.0)); S.setBridge(k); S.setWeight(k); }
  }
  // at the far berth: moored, him on her deck, the people on their spots; the first sailing's welcome
  arrive(to, npcs, first, skipped) {
    const g = this.game, f = this.f, S = this.S, h = g.hero, B = LF.berth[to];
    this.sail = null; this.film = null;
    S.place(B.x, B.z, B.rot); S.setMoor(to); S.setRopes(to === 'west'); S.setTelegraph(0);
    S.setBridge(this.bridgeDown() ? 1 : 0); S.setWeight(this.bridgeDown() ? 1 : 0);
    this.Z.ferry.spin = 9; this.Z.ferry.bobK = 0.15;
    const s = S.deckSpot('hero', to);
    h.pos.set(s.x, LF.deckTop, s.z); h.angle = s.a; h.vy = 0; h.onGround = true; h.shadow.visible = true; h.rig.play('idle'); h.sync();
    g.lastSafe = { x: S.landing[to].x, z: S.landing[to].z };
    for (const n of npcs) { n.pinY = null; if (n.shadow) n.shadow.visible = true; }
    f.dx_lf_sails = (f.dx_lf_sails || 0) + 1;
    if (!first) { const ph = this.phase(), heard = new Set(String(f.dx_lf_heard || '').split(',').filter(Boolean)); heard.add(ph); f.dx_lf_heard = [...heard].join(','); }
    g.camRig.cine = false; g.camRig.snap?.();
    g.hud.show(true); $('#touch')?.classList.toggle('hidden', !g.touch);
    g.setState('play');
    if (first) {
      f.dx_lf_first = true;
      this.story.refreshCast();
      S.setCrate(true); S.setBoard('tea');
      this.chain([['lf_oshra', 'lf_first_oshra'], ['lf_wick', 'lf_first_wick'], ['lf_ossel', 'lf_first_ossel4']], () => {
        this.firstFilm = false;
        // (they step aboard: down the stage to its end, onto her foredeck, to their spots)
        const ox = this.Z.group.position.x, oz = this.Z.group.position.z, mid = S.deckSpot('step', 'mill');
        for (const id of ['lf_oshra', 'lf_wick']) {
          const n = this.npc(id); if (!n?.present) continue;
          const sp = S.deckSpot(SPOT[id], 'mill');
          // (busy walking, so they keep walking past him instead of stopping to look at him: actors.js NPC.update)
          n._lf = 'boarding'; n.forceAnim = 'walk';
          n.track = new TrackRunner([{ op: 'goto', x: ox + LF.stage.x, z: oz + LF.stage.z1 - 0.35, speed: 0.9 }, { op: 'goto', x: mid.x, z: mid.z, speed: 0.9 }, { op: 'goto', x: sp.x, z: sp.z, speed: 0.9, near: 0.12 }, { op: 'face', a: sp.a }, { op: 'call', fn: (q) => { q.forceAnim = null; } }]);
        }
        g.save(false);
      });
      return;
    }
    this.story.refreshCast();
    g.save(false);
  }
  // called by a landing's bell: she sails over by herself (seen from the shore), the people aboard with her
  callFerry(to) {
    const f = this.f, from = other(to);
    const R = makeRoute(from, to);
    this.sail = { from, to, R, t: 0, T: SAIL_T, film: false, npcs: ABOARD.map((id) => this.npc(id)).filter((n) => n?.present) };
    f.dx_lf_at = to;
    const S = this.S;
    S.setMoor(null); S.setRopes(false); this.Z.ferry.spin = 20; this.Z.ferry.bobK = 0.5;
    for (const n of this.sail.npcs) { n.track = null; n.forceAnim = null; }
    this.game.audio.play('horn');
    this.game.save(false);
  }

  // ================================================================ per frame
  update(dt) {
    const g = this.game, S = this.S;
    if (!S) return;
    S.update(dt);
    // (Zeelich's chapters hid the model: she is the old line's ferry, there from chapter 3 on)
    if (this.Z.ferry.group.visible !== this.open) this.Z.ferry.setVisible(this.open);
    const live = g.state === 'play' || g.state === 'dialog';
    if (live && this._q?.length) for (let i = this._q.length - 1; i >= 0; i--) { const q = this._q[i]; if ((q.t -= dt) <= 0) { this._q.splice(i, 1); q.fn(); } }
    if (this.anim && live) {
      const A = this.anim; A.t += dt;
      const k = Math.min(1, A.t / A.T);
      if (A.kind === 'bridge') { S.setBridge(k); S.setWeight(k); }
      if (A.kind === 'drum' && k < 1) S.spinDrum(dt);
      if (k >= 1) { this.anim = null; A.done?.(); }
    }
    // a sailing called by a bell: under way while the game runs (not under the pause menu or a menu)
    const C = this.sail;
    if (C && !C.film && live) {
      C.t += dt;
      const p = C.R.at(voyage(C.R.L, C.T, C.t));
      this.moveTo(p, dt, C.npcs, false);
      this.bridgeAt(C.t, C.T, C.from, C.to);
      if (C.t >= C.T) {
        const B = LF.berth[C.to];
        this.sail = null;
        S.place(B.x, B.z, B.rot); S.setMoor(C.to); S.setRopes(C.to === 'west');
        this.Z.ferry.spin = 9; this.Z.ferry.bobK = 0.15;
        for (const n of C.npcs) { n.pinY = null; if (n.shadow) n.shadow.visible = true; }
        this.story.refreshCast();
        g.audio.play('clunk');
      }
    }
    // (a hand action that never reached its thing — the walk to it cut short — gives the prompts back after a while)
    if (this.busy && !this.anim && !g.hero.steer && !(g.hero.actT > 0) && g.state === 'play') { this._busyT = (this._busyT || 0) + dt; if (this._busyT > 4) { this.busy = false; this._busyT = 0; } } else this._busyT = 0;
    if (!this.here()) return;
    const h = g.hero;
    // the winch house's shell fades while he is inside it; her envelope while he stands on her deck
    const inHut = S.inHut(h.pos.x, h.pos.z) && h.pos.y < 8;
    this._shell = (this._shell ?? 1) + ((inHut ? 0.22 : 1) - (this._shell ?? 1)) * Math.min(1, dt * 8);
    S.shellFade(this._shell);
    const onDeck = !this.sail && Math.abs(h.pos.y - LF.deckTop) < 0.15 && Math.hypot(h.pos.x - S.deckSpot('hero').x, h.pos.z - S.deckSpot('hero').z) < 4;
    this._env = (this._env ?? 1) + ((onDeck ? 0.3 : 1) - (this._env ?? 1)) * Math.min(1, dt * 6);
    if (!this.sail) S.envFade(this._env);
    // (never left standing over the open clouds: a save from before this build, or anything that went wrong)
    if (g.state === 'play' && !this.sail && !g.trans) {
      const gi = g.physics.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.3);
      if (!gi.brick && gi.h < WATER_FLOOR && h.onGround && this.nearFerry(h.pos)) {
        const L = S.landing[this.at];
        h.pos.set(L.x, 6.0, L.z); h.vy = 0; h.angle = L.a; h.sync(); g.camRig.snap?.();
      }
    }
  }
  nearFerry(p) { const ox = this.Z.group.position.x, oz = this.Z.group.position.z; return Object.values(LF.berth).some((B) => Math.hypot(p.x - ox - B.x, p.z - oz - B.z) < 9); }

  journal() {
    const f = this.f, out = [];
    if (f.dx_lf_ask || f.dx_lf_plate || f.dx_lf_bridge) out.push({ key: 'lf_j_ask', done: !!f.dx_lf_free });
    if ((f.dx_lf_ask || f.dx_lf_plate) && !f.dx_lf_bridge) out.push({ key: 'lf_j_bridge', done: false });
    if (f.dx_lf_bridge && !f.dx_lf_free) out.push({ key: 'lf_j_catch', done: false });
    if (f.dx_lf_free && !f.dx_lf_first) out.push({ key: 'lf_j_free', done: false });
    if (f.dx_lf_first) out.push({ key: 'lf_j_line', done: true });
    return out;
  }
}
