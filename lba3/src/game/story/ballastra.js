// Chapter 11 of the expanded campaign — "Ballastra" (key 'ballastra'). EXP-2 (docs/lba-maturity/EXP-PLAN-2.md §3.2,
// team-only). Chapter 10 ends with the B-7 holding one shelter's branch and its crate's return label: TESSA'S FLOAT
// REPAIRS, FLOAT HARBOR, BALLASTRA. The network needs one at every station, and the voice in the pipe said Ballastra.
//   0. Citadel Spaceport: the council has lent Vesk's idle freighter; Doran flies it (the ship's film to Ballastra).
//   1. N1 "Wrong Dock" (W-1 Float Harbor): Quill weighs visitors; the shed's door says AT THE LIFT; Tessa, Ferro's boat
//      stuck halfway up the lift. The crank moves the counterweight (high weight, low deck: backwards); no notch alone
//      lifts the boat. Hobb: crane B's load on the counterweight; its latch is up the jib (the ball). The load lands on
//      the counterweight's cradle only with the weight in the middle; anywhere else it lies on the walkway (shut) and the
//      deck stops halfway or jams (the wrong attempt; the crank puts it right). Balanced: the boat sails, the pier bridge
//      swings back, the district gate opens. Tessa: her label, the B-7 she mended ("rejected"), a bounded job: the box,
//      but a glazed float from Corvin's kiln and Halden's numbers.
//   2. N2 "The Missing Water" (W-3 the Water Gardens): Wenna, the two gauges (full above, dry below); the tunnel: a copper
//      tap bodged onto the main feeds the kiln's leat before the splitter board. Shut it with the old bypass seized and
//      nothing flows anywhere but the sea (Corvin comes running: the wrong attempt); the bypass gives to a knock (melee);
//      then the board shares: gate 1 (the gardens) by its wheel in the tunnel, gates 2 (the kiln) and 3 (the sea) by
//      their latches across the channel (the ball). Share, don't shut: the gardens full, the kiln steady, the sea none.
//      Corvin promises the float.
//   3. N3 "The Uninvited Engineer" (W-2 the Arch District): Halden's old plan shows a spill gate for the lower row; in
//      the pump room the plates say UPPER TERRACE · PRIORITY; the gate is chained under the council's seal (the sword)
//      and held by a pawl high on the pier wall (the ball); opened, the canal falls to balanced. Oren speaks from the
//      pumps: when the council would not open it, the row's young ones went to sleep in his keeping. Dunn's door is
//      silted: three blows and a kick; the lower row comes home.
//   4. The Speaking Steps: Tessa will draw the box; Baldino (Doran's radio): every Balance Works coil on Ballastra is
//      bought for the project, and no regulators (vm_2). Back to the freighter: the next chapter (the network while
//      chapter 12 is not written: Story.nextIndex passes the empty ones; the ship's film to Zeelich).
// Flags (bl_): started, arrived, quHail, quWeighed, sign, tessa1, crank, cw (0 high | 1 middle | 2 low), cwDir, hobb,
// released, n1, tessa2, seenArches, maHail, wenna1, gaugeU, gaugeL, gauges, tapSeen, tapShut, corvinRun, bypassSeen,
// bypassHits, bypass, g1, g2, g3 (0 shut | 1 half | 2 open), n2, n2seen, float, rafts2, plan, chain, pawlSeen, pawl,
// spill, silt (0-3), dunn, n3, endTalk, done; owed rewards bl_oweKash, bl_oweClover; vm_2. Only the expanded campaign
// plays this chapter (Story.inCampaign). Its people (the Ballastra cast's models load on demand: characters.js
// loadPolys) exist once a save needs them (readyCast).
import { ChapterBase, SPEAKER_COLORS } from './base.js';
import { t } from '../i18n.js';
import { playJourney } from '../travelfilm.js';
import { loadPolys, ONDEMAND_POLYS } from '../characters.js';
import { BALLASTRA_AT } from '../ballastra/common.js';
import { HARBOR_PAD } from '../ballastra/harbor.js';
import { SHED } from '../ballastra/shed.js';
import { GROOMS } from '../ballastra/gardenrooms.js';
import { regionOf } from '../travel.js';
import '../text/ballastra.js';

const gold = '#ffcf4a';
export const BL_REGIONS = ['ballastra', 'bl_arches', 'bl_gardens'];
const ROOM_REGION = { ballastra: 'ballastra', bl_shed: 'ballastra', bl_arches: 'bl_arches', bl_oren: 'bl_arches', bl_mags: 'bl_arches', bl_pump: 'bl_arches', bl_gardens: 'bl_gardens', bl_tunnel: 'bl_gardens', bl_kiln: 'bl_gardens' };
// the cast: [id, model] (DRESS-1 gives each one sharing a model a dress of its own)
const CAST = [['tessa', 'tessa'], ['bl_hobb', 'docker1'], ['bl_ferro', 'docker2'], ['bl_halden', 'docker3'], ['bl_quill', 'docker1'], ['bl_wenna', 'tessa'],
  ['bl_corvin', 'docker2'], ['bl_mags', 'tessa'], ['bl_dunn', 'docker3'], ['bl_sorrel', 'docker1'], ['bl_brin', 'docker2'], ['bl_ottie', 'tessa'], ['bl_nuna', 'tessa']];
const CAST_IDS = new Set(CAST.map((c) => c[0]));
const COLORS = { tessa: '#e8b860', bl_hobb: '#8ad0a8', bl_ferro: '#e8d8a0', bl_halden: '#c8c8e0', bl_quill: '#d8a888', bl_wenna: '#b8e090', bl_corvin: '#e8a070', bl_mags: '#f0a8a8', bl_dunn: '#c0b0a0' };

// ---- the cast's models: loaded on demand (characters.js ONDEMAND_POLYS), once, for a save that needs them
let READY = false, READY_P = null;
export const castReady = () => READY;
export function readyCast() {
  if (READY) return Promise.resolve();
  return (READY_P ??= loadPolys(ONDEMAND_POLYS).catch(() => {}).then(() => { READY = true; }));
}

// ---- the gardens' water (N2): where the aqueduct's water goes for a set of flags
// The copper tap sits on the main before the splitter board: open, it takes everything into the kiln's leat. Shut, the
// water goes round the old bypass to the board, or, with the bypass seized, has nowhere to go but over into the sea.
// The board shares it by its gates (0 shut, 1 half, 2 open). Solved: the gardens full (2/3), the kiln steady (1/3).
export function gardensFlow(f) {
  const g = [f.bl_g1 ?? 0, f.bl_g2 ?? 2, f.bl_g3 ?? 2];
  if (!f.bl_tapShut) return { gardens: 0, kiln: 1, sea: 0, tap: true };
  if (!f.bl_bypass) return { gardens: 0, kiln: 0, sea: 1, stuck: true };
  const n = g[0] + g[1] + g[2];
  if (!n) return { gardens: 0, kiln: 0, sea: 1, shut: true };
  return { gardens: g[0] / n, kiln: g[1] / n, sea: g[2] / n };
}
const shared = (f, fl = gardensFlow(f)) => !!f.bl_tapShut && !!f.bl_bypass && fl.gardens >= 0.6 && fl.kiln >= 0.25 && fl.kiln <= 0.45;
const flowWord = (v) => t('bl_f_' + (v <= 0.02 ? 0 : v < 0.3 ? 1 : v < 0.45 ? 2 : v < 0.6 ? 3 : 4));

export class Ballastra extends ChapterBase {
  get H() { return this.game.regions.built('ballastra')?.harbor; }
  get A() { return this.game.regions.built('bl_arches')?.arches; }
  get GD() { return this.game.regions.built('bl_gardens')?.gardens; }
  room() { return this.game.room?.id ?? null; }
  inMine() { return this.reached() && this.story.inCampaign(this.key); }
  // the outdoor area he is in on Ballastra (a room's: its area's), or null off Ballastra
  where() { const r = this.room(); return r ? ROOM_REGION[r] ?? null : null; }
  onBallastra() { return !!this.where(); }
  say(key, vars, done, who = '') { const g = this.game; g.say(who, [t(key, vars)], done, who === 'n_hero' ? g.hero : null, SPEAKER_COLORS[who ? 'hero' : 'narrator']); }

  // ---------------------------------------------------------------- the cast
  npcDefs() {
    if (!READY) return [];   // (the models are not here yet: addActors makes them once readyCast is done)
    const { x, z } = BALLASTRA_AT.ballastra;
    return CAST.map(([id, char], i) => ({ id, name: 'n_' + id, char, color: COLORS[id] || '#d8d0c0', x: x + (i % 4) * 2, z: z - 40 - Math.floor(i / 4) * 2, angle: 0 }));
  }
  place(id) {
    const f = this.f;
    if (!CAST_IDS.has(id) && id !== 'doran' && id !== 'zoe' && id !== 'arthur') return undefined;
    if (!this.inMine()) return CAST_IDS.has(id) ? null : undefined;
    // (each area is read only where a person's spot is in it: a read of an area not built yet means "wait for it",
    //  Story.refreshCast's probe)
    const cur = this.isCur(), R = this.game.regions, steps = cur && f.bl_n3 && !f.bl_done;
    const spot = (o, extra) => (o ? { x: o.x, z: o.z, a: o.a ?? 0, ...extra } : undefined);
    const H = (k) => spot(this.H?.stands[k]), A = (k, extra) => spot(this.A?.stands[k], extra), GD = (k) => spot(this.GD?.stands[k]);
    switch (id) {
      case 'doran': {
        if (!cur) return undefined;
        if (!f.bl_arrived) { const sp = this.game.world.spaceport; return sp ? { x: sp.landing.x - 1.0, z: sp.landing.z + 2.6, a: -Math.PI / 2 } : undefined; }
        const P = this.H?.spawns.pad;
        return P ? { x: P.x - 1.0, z: P.z + 2.4, a: Math.PI / 2 } : undefined;
      }
      case 'zoe': return cur && !f.bl_arrived ? R.built('house')?.npcSpots?.zoe ?? undefined : undefined;
      case 'arthur': return cur && !f.bl_arrived ? R.built('house')?.npcSpots?.arthur ?? undefined : undefined;
      case 'tessa':
        if (steps) return A('tessa_steps', { from: this.A?.spawns.fromHarbor });
        if (!f.bl_n1 || !f.bl_tessa2 || !f.bl_seenArches) return spot(this.H?.stands.tessa_lift, { anim: f.bl_n1 ? null : 'tinker' });
        return spot(R.built('bl_shed')?.npcSpots?.tessa_shed, { anim: 'tinker' });
      case 'bl_quill': return steps ? A('quill_steps') : H('customs');
      case 'bl_hobb': return H(f.bl_n1 ? 'docker1' : 'docker2');
      case 'bl_ferro': return H(f.bl_n1 ? 'boatOwner_moored' : 'boatOwner');
      case 'bl_wenna': return GD(f.bl_n2 ? 'wenna_rafts' : 'wenna_gauges');
      case 'bl_corvin': {
        if (f.bl_corvinRun && !f.bl_n2) { const T = R.built('bl_tunnel'); return T?.spawn ? { x: T.spawn.x + 0.9, z: T.spawn.z + 0.4, a: Math.PI } : undefined; }
        if (f.bl_n2) return GD('corvin_wheel');
        const K = R.built('bl_kiln');
        return K?.npcSpots ? spot(K.npcSpots.corvin_kiln, { anim: 'tinker', via: GROOMS.tunnel.door }) : undefined;
      }
      case 'bl_halden':
        if (steps) return A('oren_steps');
        return spot(R.built('bl_oren')?.npcSpots?.oren_table, { anim: 'tinker' });
      case 'bl_mags': return A(f.bl_spill && !f.bl_n3 ? 'mags_row' : 'mags_steps');
      case 'bl_dunn':
        if (!f.bl_spill) return spot(R.built('bl_mags')?.npcSpots?.mags_house);
        return A('dunn_door');
      case 'bl_sorrel': return GD('grower1');
      case 'bl_brin': return A(f.bl_n3 ? 'row1' : 'market1');
      case 'bl_ottie': return A(f.bl_n3 ? 'row3' : 'market2');
      case 'bl_nuna': return A('market3');
    }
    return undefined;
  }

  // ---------------------------------------------------------------- the places' state from the flags
  // (instant on a load or an area's build; animated as he plays)
  sync(instant = true) {
    if (!this.inMine()) return;
    const H = this.H, A = this.A, GD = this.GD;
    if (H) this.syncHarbor(H, instant);
    if (A) this.syncArches(A, instant);
    if (GD) this.syncGardens(GD, instant);
  }
  syncHarbor(H, instant) {
    const f = this.f, R = this.game.regions.built('ballastra');
    H.counterweight.set(f.bl_n1 ? 1 : f.bl_cw ?? 2, instant);
    if (f.bl_released || f.bl_n1) H.crane.release(instant); else H.crane.reset(instant);
    if (f.bl_n1) { H.boat.sailOut(instant); H.shortcut.setOpen(true, instant); } else { H.boat.reset(instant); H.shortcut.setOpen(false, instant); }
    // (the shed: locked while she is at the lift — its door says so; the district's gate open once the lift is free)
    H.doors.shed.setLocked(!f.bl_n1);
    if (R && f.bl_n1 && !R.exits.includes(H.exits.toArches)) R.exits.push(H.exits.toArches);
  }
  syncArches(A, instant) {
    const f = this.f;
    if (f.bl_chain) A.chain.cut(instant); else A.chain.reset(instant);
    if (f.bl_pawl) A.pawl.release(instant); else A.pawl.reset(instant);
    A.spillGate.setOpen(!!f.bl_spill, instant);
    A.canal.setLevel(f.bl_spill ? 1 : 0, instant);
    A.silt.setHits(Math.min(3, f.bl_silt | 0), instant);
    A.dunnDoor.setOpen(!!f.bl_dunn, instant);
    A.row.setHome(!!f.bl_n3, instant);
  }
  syncGardens(GD, instant) {
    const f = this.f, fl = gardensFlow(f);
    GD.tap.setOpen(!f.bl_tapShut, instant);
    GD.bypass.setFree(!!f.bl_bypass, instant);
    GD.gate.set(1, f.bl_g1 ?? 0, instant); GD.gate.set(2, f.bl_g2 ?? 2, instant); GD.gate.set(3, f.bl_g3 ?? 2, instant);
    GD.channels.show({ upper: 1, gardens: fl.gardens, kiln: fl.kiln, overflow: fl.sea }, instant);
    GD.gauges.set(0.9, 0.08 + 0.84 * fl.gardens, instant);
    GD.walkways.setLevel(f.bl_n2 ? 1 : fl.gardens * 0.6, instant);
    GD.rafts.setState(f.bl_n2 ? (f.bl_rafts2 ? 2 : 1) : 0, instant);
    GD.kiln.setRunning(fl.kiln > 0.05, instant);
    GD.wheel.setSpeed(Math.min(1, fl.kiln * 1.5));
  }
  regionBuilt(ids) { if (ids.some((id) => BL_REGIONS.includes(id))) this.sync(true); }

  // ---------------------------------------------------------------- flow
  begin() {
    const g = this.game, f = this.f, h = g.hero, sp = g.world.spaceport;
    f.bl_started = true;
    h.swapBody?.('twinsen'); h.hasBall = true; h.disguised = false;
    // (under the chapter's card: at Citadel Spaceport, by the freighter, Doran beside it)
    if (sp) {
      const l = sp.landing, d = { x: l.x - 1.0, z: l.z + 2.6 }, a = Math.atan2(d.x - l.x, d.z - l.z);
      if (g.room) g.exitRoom({ x: l.x, z: l.z, a }, true);
      else { h.pos.set(l.x, g.physics.groundAt(l.x, l.z), l.z); h.angle = a; g.lastSafe = { x: l.x, z: l.z }; }
    }
    readyCast();   // (the Ballastra cast's models: fetched while he is still on Citadel)
    this.story.refreshCast();
    this.chain([['doran', 'bl_doran_1'], ['hero', 'bl_tw_d1'], ['doran', 'bl_doran_2']], () => { g.updateObjective(); g.save(false); });
  }
  // the freighter: the ship's film from Citadel Spaceport to Float Harbor's pad (the cast's models first)
  fly() {
    const g = this.game, f = this.f, T = g.travel;
    if (this.flying) return;
    this.flying = true;
    readyCast().then(() => {
      g.addActors();
      const from = T?.points?.citadel_port, to = T?.points?.ballastra_port;
      const swap = () => {
        const l = to?.landing || HARBOR_PAD.landing;
        g.enterRoom('ballastra', l, true);
        f.bl_arrived = true; this.flying = false; this.landLine = true;
        this.sync(true); this.story.refreshCast(); g.audio.play('door'); g.updateObjective(); g.save(false);
      };
      playJourney(g, { from, to, mode: 'ship' }, (then) => g.startTransition(swap, ['ballastra'], then));
    });
  }
  update(dt) {
    const g = this.game, f = this.f;
    if (!this.isCur()) return;
    const free = g.state === 'play' && !g.trans && !g.cine;
    if (!free) return;
    if (!f.bl_started) { this.begin(); return; }
    if (f.bl_done && !this.leaving) { this.end(); return; }
    const r = this.room(), h = g.hero;
    const near = (id, d) => { const n = this.speaker(id); return n && n !== h && n.present && n.distTo(h) < d; };
    if (this.landLine && r === 'ballastra') { this.landLine = false; this.chain([['doran', 'bl_doran_land']], () => g.updateObjective()); return; }
    if (r === 'ballastra' && !f.bl_quHail && near('bl_quill', 6)) { f.bl_quHail = true; this.chain([['bl_quill', 'bl_qu_hail']]); return; }
    if (r === 'bl_arches' && !f.bl_maHail && !f.bl_spill && near('bl_mags', 9)) { f.bl_maHail = true; this.chain([['bl_mags', 'bl_ma_hail']]); return; }
    // the gardens shared: Wenna sees the water come (wherever he set the last gate from)
    if (r === 'bl_gardens' && f.bl_n2 && !f.bl_n2seen) { this.gardensScene(); return; }
    this.nudge(dt, 'latch', r === 'ballastra' && !!f.bl_hobb && !f.bl_released && !f.bl_n1, 60, 'bl_nudge_latch');
    this.nudge(dt, 'bypass', r === 'bl_tunnel' && !!f.bl_bypassSeen && !f.bl_bypass, 45, 'bl_nudge_bypass');
    this.nudge(dt, 'pawl', r === 'bl_pump' && !!f.bl_pawlSeen && !f.bl_pawl, 40, 'bl_nudge_pawl');
  }
  // the chapter's end: the next chapter (behind a scene change; from Ballastra by the ship's film home)
  end() {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game, T = g.travel, nk = this.story.keyOf(this.story.nextIndex());
    const go = (then) => g.startTransition(() => this.story.nextChapter(), this.story.nextAreas(), then);
    if (!this.onBallastra() || nk === 'balances') { go(null); return; }
    playJourney(g, { from: T?.points?.ballastra_port, to: T?.points?.[nk === 'network' ? 'zeelich_port' : 'citadel_port'], mode: 'ship' }, go);
  }
  onEnterRoom(id) {
    if (!this.isCur()) return;
    const f = this.f;
    if (id === 'bl_arches') f.bl_seenArches = true;
    // (the rafts green on his next visit after the water came back: N2's "two visits")
    if (id === 'bl_gardens' && f.bl_n2 && f.bl_plan && !f.bl_rafts2) { f.bl_rafts2 = true; this.sync(true); }
    this.story.refreshCast();
  }
  onExitRoom() { if (this.isCur()) this.story.refreshCast(); }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const f = this.f, r = this.room(), h = this.game.hero;
    if (!this.isCur() || !f.bl_arrived) return;
    const at = (p, kind, label, extra) => { if (p) consider(dist(p.x, p.z), p.r ?? 1.0, { kind, label, ...extra }); };
    const kick = h.behaviour === 'aggressive';
    switch (r) {
      case 'ballastra': {
        const H = this.H; if (!H || f.bl_n1) return;
        if (!f.bl_sign && !f.bl_tessa1) at({ ...H.spawns.shedDoorOut, r: 1.3 }, 'bl_sign', 'p_read');
        at(H.spots.crank, 'bl_crank', 'p_crank');
        at(H.spots.liftLever, 'bl_dial', 'p_read');
        return;
      }
      case 'bl_shed': at(SHED.drawings, 'bl_drawings', 'p_look'); return;
      case 'bl_gardens': {
        const GD = this.GD; if (!GD) return;
        at(GD.spots.gaugeUpper, 'bl_gauge', 'p_read', { which: 'U' });
        at(GD.spots.gaugeLower, 'bl_gauge', 'p_read', { which: 'L' });
        return;
      }
      case 'bl_tunnel': {
        if (f.bl_n2) return;
        const T = GROOMS.tunnel;
        at(T.tap, 'bl_tap', f.bl_tapSeen ? 'p_valve' : 'p_look');
        if (!f.bl_bypass) at(T.bypass, 'bl_bypass', kick ? 'p_kick' : 'p_valve', { kick });
        at(T.gate1, 'bl_gate1', 'p_turn');
        return;
      }
      case 'bl_arches': {
        const A = this.A; if (!A) return;
        at(A.spots.noticeBoard, 'bl_board', 'p_read');
        if (f.bl_spill && !f.bl_dunn) {
          const cleared = (f.bl_silt | 0) >= 3;
          at(A.spots.dunnDoor, 'bl_dunndoor', !cleared ? 'p_look' : kick ? 'p_kick' : 'p_door', { kick: cleared && kick });
        }
        return;
      }
      case 'bl_oren': { const A = this.A; if (A) at(A.spots.orenPlan, 'bl_table', 'p_look'); return; }
      case 'bl_pump': {
        const A = this.A; if (!A) return;
        at(A.spots.pumpPlates, 'bl_plates', 'p_read');
        at(A.spots.pumpMachine, 'bl_machine', 'p_look');
        if (!f.bl_spill) at(A.spots.spillWheel, 'bl_wheel', 'p_turn');
        return;
      }
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.isCur() || !it.kind?.startsWith('bl_')) return false;
    const c = (lines, done) => this.chain(lines, done);
    switch (it.kind) {
      case 'bl_sign': f.bl_sign = true; c([['narrator', 'bl_sign']], () => g.updateObjective()); return true;
      case 'bl_crank': h.act('use', 0.8, () => this.crank(), 0.35); return true;
      case 'bl_dial': this.say('bl_dial_read', { d: t('bl_d_' + (this.H?.lift.level ?? 1)) }); return true;
      case 'bl_drawings': c([['narrator', 'bl_drawings']]); return true;
      case 'bl_gauge': this.gauge(it.which); return true;
      case 'bl_tap':
        if (!f.bl_tapSeen) { f.bl_tapSeen = true; c([['narrator', 'bl_tap']], () => g.updateObjective()); return true; }
        h.act('use', 0.8, () => { f.bl_tapShut = !f.bl_tapShut; g.audio.play(f.bl_tapShut ? 'valveShut' : 'valve'); this.water(f.bl_tapShut ? 'tapShut' : 'tapOpen'); }, 0.35);
        return true;
      case 'bl_bypass':
        if (it.kick) { h.act('kick', 0.55, () => this.knock(), 0.2); return true; }
        h.act('use', 0.6, () => {
          const first = !f.bl_bypassSeen; f.bl_bypassSeen = true; g.audio.play('clunk');
          c(first ? [['narrator', 'bl_bypass_stuck'], ['hero', 'bl_tw_knock']] : [['narrator', 'bl_bypass_stuck']]);
        }, 0.3);
        return true;
      case 'bl_gate1':
        h.act('use', 0.7, () => {
          f.bl_g1 = ((f.bl_g1 ?? 0) + 1) % 3; g.audio.play('valve');
          this.water('gate1');
        }, 0.3);
        return true;
      case 'bl_board': c([['narrator', 'bl_board_read']]); return true;
      case 'bl_dunndoor':
        if ((f.bl_silt | 0) < 3) { c([['narrator', 'bl_silt_look']]); return true; }
        if (it.kick) { const A = this.A, p = A.spots.dunnDoor; h.angle = Math.atan2(p.x - h.pos.x, p.z - h.pos.z); h.act('kick', 0.55, () => this.dunnOpen(), 0.2); return true; }
        c([['narrator', 'bl_door_stuck'], ['bl_dunn', 'bl_du_kick']]);
        return true;
      case 'bl_table': c([['narrator', 'bl_table']]); return true;
      case 'bl_plates': c([['narrator', 'bl_plates']]); return true;
      case 'bl_machine':
        if (f.bl_plan && !f.bl_compare) { f.bl_compare = true; c([['narrator', 'bl_compare']], () => g.updateObjective()); return true; }
        c([['narrator', f.bl_plan ? 'bl_compare' : 'bl_machine']]);
        return true;
      case 'bl_wheel': this.wheel(); return true;
    }
    return false;
  }

  // ---- N1: the lift
  // the crank moves the counterweight a notch (low → middle → high → middle → low …); the dial says where the deck is
  crank() {
    const g = this.game, f = this.f, H = this.H;
    if (!H || f.bl_n1) return;
    let cw = f.bl_cw ?? 2, dir = f.bl_cwDir ?? -1;
    if (cw + dir < 0 || cw + dir > 2) dir = -dir;
    cw += dir; f.bl_cw = cw; f.bl_cwDir = dir;
    H.counterweight.set(cw);
    g.audio.play('ropeCreak');
    const first = !f.bl_crank; f.bl_crank = true;
    if (f.bl_released && cw === 1) { this.balanced(); return; }
    g.updateObjective(); g.save(false);
    const tessaNear = this.speaker('tessa')?.present && this.speaker('tessa').distTo(g.hero) < 14;
    this.say('bl_crank_read', { w: t('bl_w_' + cw), d: t('bl_d_' + H.lift.level) }, first && tessaNear ? () => this.chain([['tessa', 'bl_te_crank']]) : null);
  }
  // crane B's latch, struck by the ball: the load swings over; it seats on the counterweight's cradle only with the
  // weight in the middle, else it lies on the walkway (the lift's own rule: harbor.js)
  release() {
    const g = this.game, f = this.f, H = this.H;
    f.bl_released = true; H.crane.release();
    g.audio.play('chest'); g.updateObjective();
    if ((f.bl_cw ?? 2) === 1) { this.balanced(); return; }
    g.save(false);
    const over = H.lift.level >= 3;
    this.chain(over ? [['narrator', 'bl_rel_over'], ['tessa', 'bl_te_over']] : [['narrator', 'bl_rel_half'], ['tessa', 'bl_te_half']]);
  }
  // the deck level with the basin: the boat floats free, Ferro sails, the pier bridge swings back, the gate opens
  balanced() {
    const g = this.game, f = this.f, H = this.H;
    f.bl_n1 = true;
    g.audio.play('chest'); g.updateObjective(); g.save(false);
    this.chain([['narrator', 'bl_bal'], ['bl_ferro', 'bl_fe_free']], () => {
      H.boat.sailOut();
      const fe = this.npc('bl_ferro'); if (fe?.present) this.reward('bl_oweKash', 'coin', 2, fe.pos.x, fe.pos.y + 1.2, fe.pos.z, { pop: true, value: 5 });
      const met = !!f.bl_tessa1; f.bl_tessa1 = true;
      this.chain(met ? [['tessa', 'bl_te_done'], ['hero', 'bl_tw_done'], ['bl_hobb', 'bl_ho_bridge'], ['tessa', 'bl_te_shed']] : [['tessa', 'bl_te_met'], ['bl_hobb', 'bl_ho_bridge']], () => {
        this.sync(false); this.story.refreshCast({ walk: true }); g.updateObjective(); g.save(false);
      });
    });
  }

  // ---- N2: the gardens' water
  gauge(which) {
    const g = this.game, f = this.f, fl = gardensFlow(f);
    if (which === 'U') f.bl_gaugeU = true; else f.bl_gaugeL = true;
    const both = f.bl_gaugeU && f.bl_gaugeL && !f.bl_gauges && !f.bl_n2;
    if (both) f.bl_gauges = true;
    const after = () => { if (both) this.chain([['hero', 'bl_tw_gauges']], () => { g.updateObjective(); g.save(false); }); else g.updateObjective(); };
    if (which === 'U') this.chain([['narrator', 'bl_gaugeU']], after); else this.say('bl_gaugeL', { g: flowWord(fl.gardens) }, after);
  }
  // after a change at the tap, the bypass or a gate: the water moves; a line says where it goes now
  water(what) {
    const g = this.game, f = this.f, GD = this.GD, fl = gardensFlow(f);
    if (GD) this.syncGardens(GD, false);
    if (!f.bl_n2 && shared(f, fl)) { this.solve(); return; }
    // (the kiln's wheel back to turning: Corvin goes back to it)
    if (f.bl_corvinRun && !fl.stuck) { f.bl_corvinRun = false; this.story.refreshCast({ walk: true }); }
    g.updateObjective(); g.save(false);
    const flowLine = (done) => this.say('bl_flow', { g: flowWord(fl.gardens), k: flowWord(fl.kiln), s: flowWord(fl.sea) }, done);
    const after = () => {
      // the wrong attempt: shut with the bypass seized, nothing reaches the kiln either: Corvin comes running
      if (fl.stuck && !f.bl_corvinRun && what === 'tapShut') {
        f.bl_corvinRun = true; g.save(false); this.story.refreshCast();
        g.audio.play('door');
        this.chain([['bl_corvin', 'bl_co_run1'], ['hero', 'bl_tw_c1'], ['bl_corvin', 'bl_co_run2'], ['bl_corvin', 'bl_co_run3'], ['hero', 'bl_tw_bypass']], () => g.updateObjective());
      }
    };
    const pos = (k) => t('bl_gp_' + (f['bl_g' + k] ?? (k === 1 ? 0 : 2)));
    if (what === 'gate1') this.say('bl_gate1', { g1: pos(1), g2: pos(2), g3: pos(3) }, () => flowLine(after));
    else if (what === 'tapShut' || what === 'tapOpen') this.chain([['narrator', what === 'tapShut' ? 'bl_tap_shut' : 'bl_tap_open']], () => flowLine(after));
    else if (what === 'g2' || what === 'g3') { const k = what === 'g2' ? 2 : 3; this.say('bl_latch', { gate: t('bl_gn_' + k), pos: pos(k) }, () => flowLine(after)); }
    else flowLine(after);
  }
  // the bypass's rusted wheel: two blows free it (a kick, the fists, the sword)
  knock() {
    const g = this.game, f = this.f, T = GROOMS.tunnel;
    if (f.bl_bypass) return;
    f.bl_bypassSeen = true;
    f.bl_bypassHits = (f.bl_bypassHits | 0) + 1;
    g.impact(T.bypass.x, 1.1, T.bypass.z, 'machine', 'hit');
    if (f.bl_bypassHits < 2) { g.save(false); this.chain([['narrator', 'bl_bypass_hit']]); return; }
    f.bl_bypass = true; g.audio.play('waterRun');
    this.chain([['narrator', 'bl_bypass_free']], () => this.water('bypass'));
  }
  // shared: the gardens' channel runs and the kiln turns steady
  solve() {
    const g = this.game, f = this.f;
    f.bl_n2 = true; f.bl_corvinRun = false;
    this.sync(false); this.story.refreshCast(); g.updateObjective(); g.save(false);
    g.audio.play('chest');
    if (this.room() === 'bl_gardens') this.gardensScene();
    else this.chain([['hero', 'bl_tw_solved']]);
  }
  gardensScene() {
    const g = this.game, f = this.f;
    f.bl_n2seen = true;
    this.chain([['narrator', 'bl_solved'], ['bl_wenna', 'bl_we_s1'], ['bl_wenna', 'bl_we_s2'], ['bl_wenna', 'bl_we_basket']], () => {
      const w = this.npc('bl_wenna'), at = w?.present ? w.pos : g.hero.pos;
      this.reward('bl_oweClover', 'clover', 1, at.x, at.y + 1.2, at.z, { pop: true });
      g.updateObjective(); g.save(false);
    });
  }

  // ---- N3: the pump room and Dunn's door
  wheel() {
    const g = this.game, f = this.f, h = g.hero;
    if (!f.bl_chain) { const first = !f.bl_chainSeen; f.bl_chainSeen = true; g.audio.play('clang'); this.chain(first ? [['narrator', 'bl_wheel_chain'], ['hero', 'bl_tw_chain']] : [['narrator', 'bl_wheel_chain']]); return; }
    if (!f.bl_pawl) {
      h.act('use', 0.6, () => { const first = !f.bl_pawlSeen; f.bl_pawlSeen = true; g.audio.play('clunk'); g.camRig.shake(0.06); this.chain(first ? [['narrator', 'bl_wheel_pawl'], ['hero', 'bl_tw_pawl']] : [['narrator', 'bl_wheel_pawl']], () => g.updateObjective()); }, 0.3);
      return;
    }
    h.act('use', 1.2, () => this.openSpill(), 0.5);
  }
  openSpill() {
    const g = this.game, f = this.f, A = this.A;
    if (f.bl_spill) return;
    f.bl_spill = true;
    A?.spillGate.setOpen(true); A?.canal.setLevel(1);
    g.updateObjective(); g.save(false);
    this.chain([['narrator', 'bl_spill_open']], () => {
      g.audio.play('orenTone');
      this.chain([['oren', 'bl_or_1'], ['hero', 'bl_tw_or1'], ['oren', 'bl_or_2'], ['hero', 'bl_tw_or2'], ['oren', 'bl_or_3']], () => {
        this.story.refreshCast(); g.updateObjective(); g.save(false);
      });
    });
  }
  dunnOpen() {
    const g = this.game, f = this.f, A = this.A;
    if (f.bl_dunn || (f.bl_silt | 0) < 3) return;
    f.bl_dunn = true; f.bl_n3 = true;
    A?.dunnDoor.setOpen(true); A?.row.setHome(true);
    g.camRig.shake(0.2); g.updateObjective(); g.save(false);
    this.chain([['narrator', 'bl_door_open'], ['bl_dunn', 'bl_du_home']], () => {
      this.story.refreshCast({ walk: true }); g.updateObjective(); g.save(false);
    });
  }
  meleeHit(o) {
    const g = this.game, f = this.f, r = this.room(), h = g.hero;
    if (!this.isCur()) return false;
    const blade = /^slash|^heavy/.test(o.move?.anim || '');
    if (r === 'bl_tunnel' && !f.bl_bypass) {
      const p = GROOMS.tunnel.bypass;
      if (o.hitSet.has(p) || !o.inArc(p.x, p.z, 0.5)) return false;
      o.hitSet.add(p); this.knock(); return true;
    }
    if (r === 'bl_pump' && !f.bl_chain) {
      const A = this.A, p = A?.swordTargets.spillChain;
      if (!p || o.hitSet.has(p) || !o.inArc(p.x, p.z, p.r)) return false;
      o.hitSet.add(p);
      if (!blade && h.hasSword) { g.impact(p.x, p.y, p.z, 'armor', 'blocked'); this.chain([['hero', 'bl_tw_fists']]); return true; }
      f.bl_chain = true; A.chain.cut();
      g.impact(p.x, p.y, p.z, 'machine', 'break');
      this.chain([['narrator', 'bl_chain_cut']], () => { g.updateObjective(); g.save(false); });
      return true;
    }
    if (r === 'bl_arches' && !f.bl_dunn) {
      const A = this.A, p = A?.swordTargets.dunnSilt;
      if (!p || o.hitSet.has(p) || !o.inArc(p.x, p.z, p.r) || Math.abs(h.pos.y - (p.y - 0.5)) > 1.0) return false;
      o.hitSet.add(p);
      if (!f.bl_spill) { this.chain([['bl_dunn', 'bl_du_wet']]); return true; }
      if ((f.bl_silt | 0) >= 3) { this.dunnOpen(); return true; }
      f.bl_silt = (f.bl_silt | 0) + 1; A.silt.setHits(f.bl_silt);
      g.impact(p.x, p.y, p.z, 'stone', 'hit');
      g.updateObjective(); g.save(false);
      if (f.bl_silt >= 3) this.chain([['narrator', 'bl_silt_clear'], ['bl_dunn', 'bl_du_kick']]);
      else this.chain([['narrator', 'bl_silt_hit']]);
      return true;
    }
    return false;
  }
  // the ball: crane B's latch (N1), the gardens' gate latches (N2), the pump room's pawl (N3)
  ballHit(p) {
    const f = this.f, r = this.room(), g = this.game;
    if (!this.isCur()) return false;
    const hit = (q, more = 0.35) => q && Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < (q.r || 0.5) + more;
    // (crane B's latch sits on its mast, inside the mast's collider: the ball strikes the mast's face right by it)
    if (r === 'ballastra' && !f.bl_released && !f.bl_n1 && hit(this.H?.craneLatch, 0.95)) { this.release(); return true; }
    if (r === 'bl_gardens' && !f.bl_n2) {
      const B = this.GD?.ballTargets;
      for (const k of [2, 3]) if (hit(B?.['gate' + k + 'Latch'])) {
        f['bl_g' + k] = ((f['bl_g' + k] ?? 2) + 2) % 3;   // (2 open → 1 half → 0 shut → 2: the latch drops the leaf a notch; at the bottom it springs back up)
        g.audio.play('clunk');
        this.water('g' + k);
        return true;
      }
    }
    if (r === 'bl_pump' && !f.bl_pawl && hit(this.A?.ballTargets.spillPawl)) {
      f.bl_pawl = true; this.A.pawl.release();
      this.chain([['narrator', 'bl_pawl_free']], () => { g.updateObjective(); g.save(false); });
      return true;
    }
    return false;
  }
  ballTargets() {
    const f = this.f, r = this.room();
    if (!this.isCur()) return [];
    if (r === 'ballastra' && !f.bl_released && !f.bl_n1 && this.H) return [this.H.craneLatch];
    if (r === 'bl_gardens' && !f.bl_n2 && this.GD) return [this.GD.ballTargets.gate2Latch, this.GD.ballTargets.gate3Latch];
    if (r === 'bl_pump' && !f.bl_pawl && this.A) return [this.A.ballTargets.spillPawl];
    return [];
  }

  // (Doran is the freighter's pilot in this chapter: before the town's own talk of him)
  talkFirst(npc) { return this.isCur() && npc.def.id === 'doran' ? this.talk(npc) : false; }
  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'doran':
        if (!f.bl_arrived) return c([['doran', 'bl_doran_go']], () => this.fly());
        if (f.bl_endTalk) return c([['doran', 'bl_do_home']], () => { f.bl_done = true; g.save(false); this.end(); });
        return c([['doran', 'bl_do_wait']]);
      case 'zoe': return f.bl_arrived ? false : c([['zoe', 'bl_zoe_home']]);
      case 'arthur': return f.bl_arrived ? false : c([['arthur', 'bl_ar_home']]);
      case 'bl_quill':
        if (!f.bl_quWeighed) return c([['bl_quill', 'bl_qu_1'], ['narrator', 'bl_qu_weigh'], ['bl_quill', 'bl_qu_2'], ['hero', 'bl_tw_q1'], ['bl_quill', 'bl_qu_3']], () => { f.bl_quWeighed = f.bl_quHail = true; g.updateObjective(); g.save(false); });
        return c([['bl_quill', f.bl_n3 ? 'bl_qu_end' : f.bl_n1 ? 'bl_qu_n1' : 'bl_qu_wait']]);
      case 'tessa': return this.talkTessa();
      case 'bl_ferro': return c([['bl_ferro', f.bl_n1 ? 'bl_fe_after' : 'bl_fe_wait']]);
      case 'bl_hobb':
        if (f.bl_n1) return c([['bl_hobb', 'bl_ho_after']]);
        if (!f.bl_hobb) return c([['bl_hobb', 'bl_ho_1'], ['hero', 'bl_tw_h1'], ['bl_hobb', 'bl_ho_2']], () => { f.bl_hobb = true; g.updateObjective(); g.save(false); });
        return c([['bl_hobb', f.bl_released ? 'bl_ho_wrong' : 'bl_ho_wait']]);
      case 'bl_wenna':
        if (f.bl_n2) return c([['bl_wenna', 'bl_we_after']]);
        if (!f.bl_wenna1) return c([['bl_wenna', 'bl_we_1'], ['hero', 'bl_tw_w1'], ['bl_wenna', 'bl_we_2']], () => { f.bl_wenna1 = true; g.updateObjective(); g.save(false); });
        return c([['bl_wenna', !f.bl_gauges ? 'bl_we_g' : f.bl_tapSeen ? 'bl_we_wait' : 'bl_we_tunnel']]);
      case 'bl_corvin':
        if (f.bl_n2 && !f.bl_float) return c([['bl_corvin', 'bl_co_s1'], ['bl_corvin', 'bl_co_s2'], ['hero', 'bl_tw_co'], ['bl_corvin', 'bl_co_s3']], () => { f.bl_float = true; g.updateObjective(); g.save(false); });
        if (f.bl_n2) return c([['bl_corvin', 'bl_co_after']]);
        if (f.bl_corvinRun) return c([['bl_corvin', 'bl_co_wait']]);
        return c([['bl_corvin', gardensFlow(f).kiln > 0.45 && f.bl_tapShut ? 'bl_co_fast' : 'bl_co_1']]);
      case 'bl_halden':
        if (f.bl_n3) return c([['bl_halden', 'bl_ha_steps']]);
        if (!f.bl_plan && f.bl_tessa2) return c([['bl_halden', 'bl_ha_1'], ['hero', 'bl_tw_ha1'], ['bl_halden', 'bl_ha_2'], ['bl_halden', 'bl_ha_3'], ['narrator', 'bl_plan_read'], ['hero', 'bl_tw_ha2'], ['bl_halden', 'bl_ha_4']], () => { f.bl_plan = true; g.updateObjective(); g.save(false); });
        return c([['bl_halden', f.bl_plan ? 'bl_ha_after' : 'bl_ha_2']]);
      case 'bl_mags':
        if (f.bl_n3) return c([['bl_mags', 'bl_ma_after']]);
        if (f.bl_spill) return c([['bl_mags', 'bl_ma_spill']]);
        if (f.bl_plan) return c([['bl_mags', 'bl_ma_plan']]);
        return c([['bl_mags', 'bl_ma_1'], ['hero', 'bl_tw_m1'], ['bl_mags', 'bl_ma_2']], () => { f.bl_maHail = true; });
      case 'bl_dunn':
        if (f.bl_dunn) return c([['bl_dunn', 'bl_du_after']]);
        if (!f.bl_spill) return c([['bl_dunn', 'bl_du_1']]);
        if ((f.bl_silt | 0) >= 3) return c([['bl_dunn', 'bl_du_kick']]);
        return c([['bl_dunn', 'bl_du_2'], ['hero', 'bl_tw_du']]);
      case 'bl_sorrel': return c([['bl_sorrel', f.bl_n2 ? 'bl_so_2' : 'bl_so_1']]);
      case 'bl_brin': return c([['bl_brin', f.bl_n3 ? 'bl_br_2' : 'bl_br_1']]);
      case 'bl_ottie': return c([['bl_ottie', f.bl_n3 ? 'bl_ot_2' : 'bl_ot_1']]);
      case 'bl_nuna': return c([['bl_nuna', f.bl_n3 ? 'bl_nu_2' : 'bl_nu_1']]);
    }
    return false;
  }
  talkTessa() {
    const g = this.game, f = this.f, c = (lines, done) => { this.chain(lines, done); return true; };
    if (!f.bl_tessa1) return c([['tessa', 'bl_te_1'], ['hero', 'bl_tw_t1'], ['tessa', 'bl_te_2'], ['bl_ferro', 'bl_fe_1'], ['tessa', 'bl_te_3']], () => { f.bl_tessa1 = true; g.updateObjective(); g.save(false); });
    if (!f.bl_n1) return c([['tessa', !f.bl_crank ? 'bl_te_h1' : !f.bl_hobb ? 'bl_te_h2' : !f.bl_released ? 'bl_te_h3' : 'bl_te_h4']]);
    if (!f.bl_tessa2) {
      return c([['tessa', 'bl_te_s1'], ['hero', 'bl_tw_s1'], ['tessa', 'bl_te_s2'], ['hero', 'bl_tw_s2'], ['tessa', 'bl_te_s3'], ['hero', 'bl_tw_s3'], ['tessa', 'bl_te_s4'], ['tessa', 'bl_te_s5'], ['tessa', 'bl_te_s6']], () => {
        f.bl_tessa2 = true; g.updateObjective(); g.save(false);
      });
    }
    if (f.bl_n3 && !f.bl_endTalk) return this.endTalk();
    if (f.bl_endTalk) return c([['tessa', 'bl_te_bye']]);
    return c([['tessa', f.bl_spill ? 'bl_te_n3c' : f.bl_plan ? 'bl_te_n3b' : f.bl_float ? 'bl_te_n3' : 'bl_te_n2']]);
  }
  // the Speaking Steps: Tessa, the plan and the float; Baldino on Doran's set: every coil, no regulators (vm_2)
  endTalk() {
    const g = this.game, f = this.f;
    this.chain([['tessa', 'bl_te_end1'], ['hero', 'bl_tw_e1'], ['tessa', 'bl_te_end2']], () => {
      g.audio.play('radio');
      this.chain([['doranradio', 'bl_dr_1'], ['balradio', 'bl_ba_1'], ['hero', 'bl_tw_e2'], ['tessa', 'bl_te_end3'], ['balradio', 'bl_ba_2'], ['tessa', 'bl_te_end4']], () => {
        f.bl_endTalk = true; f.vm_2 = 1;
        g.updateObjective(); g.save(false);
      });
    });
    return true;
  }

  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f, g = this.game;
    this.leaving = false; this.flying = false; this.landLine = false;
    if (!this.inMine()) return;
    if (f.bl_cw != null && !(f.bl_cw >= 0 && f.bl_cw <= 2)) f.bl_cw = 2;
    for (const k of [1, 2, 3]) if (f['bl_g' + k] != null && !(f['bl_g' + k] >= 0 && f['bl_g' + k] <= 2)) delete f['bl_g' + k];
    this.settleOwed('bl_oweKash', 'coin', 5, 'bl_toast_kash');
    this.settleOwed('bl_oweClover', 'clover', 1, 'bl_toast_clover');
    this.sync(true);
    // (a save from this chapter on: the cast's models, then the people on their places)
    if (READY) g.addActors();
    else readyCast().then(() => { g.addActors(); this.story.refreshCast(); });
  }
  objective() {
    const f = this.f;
    if (!f.bl_started) return '';
    if (!f.bl_arrived) return this.goal('bl_obj_board');
    if (!f.bl_tessa1 && !f.bl_n1) return this.goal('bl_obj_find');
    if (!f.bl_n1) return this.goal('bl_obj_lift') + this.sub(!!f.bl_crank, 'bl_sub_crank') + this.sub(!!f.bl_released, 'bl_sub_load') + this.sub(false, 'bl_sub_level');
    if (!f.bl_tessa2) return this.goal('bl_obj_shed');
    if (!f.bl_n2) return this.goal('bl_obj_water') + this.sub(!!f.bl_gauges, 'bl_sub_gauges') + this.sub(!!f.bl_tapSeen, 'bl_sub_where') + this.sub(false, 'bl_sub_share');
    if (!f.bl_float) return this.goal('bl_obj_corvin');
    if (!f.bl_plan) return this.goal('bl_obj_halden');
    if (!f.bl_spill) return this.goal('bl_obj_spill') + this.sub(!!f.bl_chain, 'bl_sub_chain') + this.sub(!!f.bl_pawl, 'bl_sub_pawl') + this.sub(false, 'bl_sub_gate');
    if (!f.bl_dunn) return this.goal('bl_obj_dunn') + this.sub((f.bl_silt | 0) >= 3, 'bl_sub_silt', { n: Math.min(3, f.bl_silt | 0) }) + this.sub(false, 'bl_sub_door');
    if (!f.bl_endTalk) return this.goal('bl_obj_steps');
    return this.goal('bl_obj_home');
  }
  // the objective's place on Ballastra: { at: area, p: {x, z}, label }
  target() {
    const f = this.f, H = this.H, A = this.A, GD = this.GD;
    const T = (at, p, label) => ({ at, p, label });
    if (!f.bl_arrived) return null;
    if (!f.bl_n1) {
      if (!f.bl_tessa1 && !f.bl_sign) return T('ballastra', H?.spawns.shedDoorOut, 'bl_mk_shed');
      return T('ballastra', H?.stands.tessa_lift, 'bl_mk_tessa');
    }
    if (!f.bl_tessa2) return T('ballastra', H?.stands.tessa_lift, 'bl_mk_tessa');
    if (!f.bl_n2) return T('bl_gardens', !f.bl_gauges ? GD?.spots.gaugeUpper : GD?.spots.tunnelHatch, !f.bl_gauges ? 'bl_mk_gardens' : 'bl_mk_hatch');
    if (!f.bl_float) return T('bl_gardens', GD?.stands.corvin_wheel, 'bl_mk_corvin');
    if (!f.bl_plan) return T('bl_arches', A?.doors.orenOut, 'bl_mk_halden');
    if (!f.bl_spill) return T('bl_arches', A?.doors.pumpOut, 'bl_mk_pump');
    if (!f.bl_dunn) return T('bl_arches', A?.spots.dunnDoor, 'bl_mk_dunn');
    if (!f.bl_endTalk) return T('bl_arches', A?.stands.tessa_steps, 'bl_mk_steps');
    return T('ballastra', H?.spawns.pad, 'bl_mk_pad');
  }
  markers() {
    const f = this.f, m = [];
    if (!this.isCur() || !f.bl_started) return m;
    const star = (p, label) => { if (p && Number.isFinite(p.x)) m.push({ x: p.x, z: p.z, kind: 'star', color: gold, r: 7, edge: true, label: t(label) }); };
    if (!f.bl_arrived) { const d = this.npc('doran'); if (d?.present) star(d.pos, 'bl_mk_doran'); return m; }
    const tg = this.target(), here = this.where();
    if (!tg) return m;
    if (!here) {   // (off Ballastra: the harbour's pad; the story's way-star leads to the spaceport from there)
      const p = this.game.travel?.points?.ballastra_port; if (p && this.H) star(p, 'bl_mk_pad');
      return m;
    }
    if (here === tg.at) { star(tg.p, tg.label); return m; }
    // (on Ballastra, another area: the way out toward it — the harbour ⇄ the Arch District ⇄ the Water Gardens)
    const H = this.H, A = this.A, GD = this.GD;
    if (here === 'ballastra') star(H?.exits.toArches, tg.at === 'bl_arches' ? 'bl_mk_arches' : 'bl_mk_gardens');
    else if (here === 'bl_gardens') star(GD?.exits.toArches, 'bl_mk_arches');
    else if (here === 'bl_arches') star(tg.at === 'ballastra' ? A?.exits.toHarbor : A?.exits.toGardens, tg.at === 'ballastra' ? 'bl_mk_harbor' : 'bl_mk_gardens');
    return m;
  }
  items() {
    const f = this.f;
    if (!this.isCur()) return [];
    const out = [];
    if (f.bl_started && !f.bl_tessa2) out.push({ id: 'bl_label', icon: 'leaflet', n: 1 });
    if (f.bl_plan && !f.bl_endTalk) out.push({ id: 'bl_plan', icon: 'plan', n: 1 });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'bl_j_fly', done: !!f.bl_arrived },
      { key: 'bl_j_lift', done: !!f.bl_n1 },
      { key: 'bl_j_tessa', done: !!f.bl_tessa2 },
      { key: 'bl_j_water', done: !!f.bl_n2 },
      { key: 'bl_j_plan', done: !!f.bl_plan },
      { key: 'bl_j_spill', done: !!f.bl_spill },
      { key: 'bl_j_dunn', done: !!f.bl_dunn },
      { key: 'bl_j_coils', done: !!f.bl_endTalk },
    ].filter((l) => l.done);
  }
}
