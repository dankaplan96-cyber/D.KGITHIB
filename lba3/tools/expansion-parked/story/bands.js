// NW-1 "Bands" (docs/future/EXPANSION_PLAN.md §4.4 NW-1, Revision R1.11 "As built"), inside chapter 14 of the expanded
// campaign (key 'network', story/network.js). Not a chapter: the network owns it (net.nw1) and asks it at each hook; in
// the base campaign (exp_base) every hook here is inert and none of it shows.
//
// In the expanded campaign every relay carries one of Baldino's brass floats (his briefing says so): it keeps the
// relay's power steady, but it can't guess the day, so somebody at each station sets its band (LOW · MID · HIGH, one
// notch a press and round again, as OG-6's band at the mill). After each station's own task (as before) the relay
// comes on with Baldino's guess on its band, which is wrong; the friend there reads the local signal and Twinsen sets
// the band: "set too low" (the source runs past what the band expects) wants a higher band, "set too high" a lower one.
// Then the conditions change once, the band must follow, and the friend takes the job. No fail: a wrong band lights
// the float's lamp amber, and the first time at a station a friend already on the line complains by radio (the
// relays hear each other: c10_bal_2). The mill's band is OG-6's (story/coils.js), counted done at og6_band >= 2.
//   valves (Mira reads the needles): Oren, through the governor on the inlet (OG-1), feels the relay drink and trims
//     its share on a stroke (R1.4 rule 3: a governor's setting; rule 4: on the drill's stroke; rule 2: the brass float
//     is deaf to him, so the band is the hand that follows). Baldino learns on the radio that Oren rations the mains.
//   light (Arthur reads the needle): haze comes in; Zoé decides to put the fog call out to the boats on the harbour
//     channel, which takes some of the set's power. Arthur asks to mind the band; Zoé lets him, then "Station ready".
//   bore (Ilka reads the steam): after the fight the relay spits steam; the vent breathes out hard once (its way).
//   dome (Pim reads the light): a cloud crosses the peak. Pim keeps the band and the chain.
// Flags (per station s): c10_lit_<s> (its task done, the relay on: the band to set), c10_bandAt_<s> 0-2 (LOW, MID,
// HIGH), c10_band_<s> 0-2 (right for the first conditions; right after the change: the station done), c10_shift_<s>
// (the conditions have changed); vm_3 (Vesk's growth step at the chapter's start: R1.4 rule 5). A save is never made
// inside a timing (each notch saves at once); a load sets every part from the flags, and a band already right is read
// again on arrival. A save that finished a station the old way (c10_<s>, no c10_lit_<s>) keeps it: no float, no band.
import * as THREE from 'three';
import { ChapterBase, SPEAKER_COLORS } from './base.js';
import { t } from '../i18n.js';
import { cyl, lathe, sphere, canvasTex } from '../props.js';
import '../text/bands.js';

const BANDS = ['low', 'mid', 'high'];
const SHIFT_AFTER = 6;   // s of play at the station after the first right band, then the conditions change
const READ_AFTER = 1.3;  // s after a notch, the friend reads the signal
// each station: its room, who reads the signal, Baldino's preset, the band the conditions want (before, after the change)
const ST = {
  valves: { room: 'valves', who: 'mira', preset: 2, want: [1, 0] },
  light: { room: 'lighttop', who: 'arthur', preset: 0, want: [2, 1] },
  bore: { room: 'desert', who: 'ilka', preset: 0, want: [1, 2] },
  dome: { room: 'obsv', who: 'pim', preset: 1, want: [2, 0] },
};
export const BAND_STATIONS = Object.keys(ST);
// the friend on the radio who hears a wrong band first (the nearest station already on the line)
const RADIO = { mill: ['okuradio', 'nw1_rad_oku'], valves: ['miraradio', 'nw1_rad_mira'], light: ['arthurradio', 'nw1_rad_arthur'], bore: ['ilkaradio', 'nw1_rad_ilka'], dome: ['pimradio', 'nw1_rad_pim'] };
const NEAR = { mill: ['valves', 'light', 'bore', 'dome'], valves: ['light', 'mill', 'bore', 'dome'], light: ['valves', 'mill', 'dome', 'bore'], bore: ['dome', 'valves', 'light', 'mill'], dome: ['bore', 'light', 'valves', 'mill'] };

let MATS = null;
const mats = () => (MATS ??= {
  brass: new THREE.MeshStandardMaterial({ color: '#d8a848', roughness: 0.35, metalness: 0.7 }),
  iron: new THREE.MeshStandardMaterial({ color: '#4a4c54', roughness: 0.5, metalness: 0.5 }),
  dead: new THREE.MeshStandardMaterial({ color: '#3a3833', roughness: 0.6 }),
  amber: new THREE.MeshStandardMaterial({ color: '#e0a648', emissive: '#e0a648', emissiveIntensity: 0.9, roughness: 0.4 }),
  green: new THREE.MeshStandardMaterial({ color: '#8fd08a', emissive: '#5ab858', emissiveIntensity: 0.8, roughness: 0.4 }),
  dial: new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#efe4c8'; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#5a3a14'; x.lineWidth = 5; x.stroke();
    x.fillStyle = '#2a1e10'; x.font = 'bold 18px sans-serif'; x.textAlign = 'center';
    x.fillText('LOW', w * 0.25, h * 0.62); x.fillText('MID', w / 2, h * 0.27); x.fillText('HIGH', w * 0.76, h * 0.62);
  }) }),
});
// Baldino's brass float, as it hangs on the side of a relay (valveroom.js buildRelay: a 0.7 m brass box at 0.5-0.95 m):
// the oil cup, the float's rod, the band's dial with its pointer, and a lamp (amber: the band is wrong; green: right).
// Five small meshes, one of them casting a shadow; no light, no transparency.
function buildFloat() {
  const M = mats(), g = new THREE.Group();
  const cup = new THREE.Mesh(lathe([[0.001, 0], [0.09, 0], [0.11, 0.05], [0.11, 0.24], [0.085, 0.27], [0.001, 0.27]], 12), M.brass); cup.position.y = 0.42; cup.castShadow = true; g.add(cup);
  const rod = new THREE.Mesh(cyl(0.01, 0.01, 0.34, 5), M.brass); rod.position.y = 0.86; g.add(rod);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.075, 18), M.dial); dial.position.set(0, 0.56, 0.112); g.add(dial);
  const ptr = new THREE.Group(); ptr.position.set(0, 0.56, 0.118); const pm = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.005), M.iron); pm.position.y = 0.026; ptr.add(pm); g.add(ptr);
  const lamp = new THREE.Mesh(sphere(0.026, 8, 6), M.dead); lamp.position.set(0.07, 0.74, 0.05); g.add(lamp);
  return { g, rod, ptr, lamp };
}

export class Bands extends ChapterBase {
  constructor(net) { super(net.story); this.net = net; this.floats = {}; this.readT = {}; this.shiftT = {}; this.told = new Set(); }
  isCur(f) { return this.net.isCur(f); }
  reached(f) { return this.net.reached(f); }
  get exp() { return this.story.inCampaign('throttle'); }
  get on() { return this.exp && this.net.isCur(); }
  room() { return this.game.room?.id; }
  // the station's band follows its task (the expanded campaign; not a station finished the old way)
  takes(s) { return this.on && !!ST[s] && !this.f['c10_' + s]; }
  isLit(s) { return !!this.f['c10_lit_' + s]; }
  pending(s) { return this.on && !!ST[s] && this.isLit(s) && !this.f['c10_' + s]; }
  bandDone(s) { return s === 'mill' ? (this.f.og6_band | 0) >= 2 : (this.f['c10_band_' + s] | 0) >= 2; }
  dialOf(s) { const d = this.f['c10_bandAt_' + s]; return d >= 0 && d <= 2 ? d : ST[s].preset; }
  want(s) { return ST[s].want[this.f['c10_shift_' + s] ? 1 : 0]; }
  // 'right', 'low' (the band is set lower than the conditions: the source runs past it) or 'high'
  state(s) { const d = this.dialOf(s), w = this.want(s); return d === w ? 'right' : d < w ? 'low' : 'high'; }
  bandName(s) { return t('nw1_band_' + BANDS[this.dialOf(s)]); }
  here(s) { return this.room() === ST[s].room; }
  // a station whose relay is already on the line (it hears a wrong band elsewhere)
  online(n) { const f = this.f; return n === 'mill' ? !!(f.c10_mill || f.og6_relay) : !!(f['c10_' + n] || f['c10_lit_' + n]); }

  // ---------------------------------------------------------------- the network's hooks
  // Baldino's briefing: Vesk's growth step (vm_3) first, the floats after his limits (network.js begin)
  vmLines() { return this.exp ? [['baldino', 'nw1_bal_vm3']] : []; }
  floatLines() { return this.exp ? [['baldino', 'nw1_bal_float']] : []; }
  briefDone() { if (this.exp) this.f.vm_3 = true; }
  // a station's own task is done: its relay comes on with Baldino's guess on the band (the lines before it: `pre`)
  lit(s, pre = []) {
    const g = this.game, f = this.f;
    if (f['c10_lit_' + s]) return;
    f['c10_lit_' + s] = true; f['c10_bandAt_' + s] ??= ST[s].preset;
    this.readT[s] = 0; this.shiftT[s] = 0;
    this.show();
    // (Baldino's guess is wrong for the day: the first reading, heard on the line by a station already on it)
    this.chain([...pre, [ST[s].who, this.cueKey(s)], ...(this.state(s) !== 'right' ? this.complain(s) : [])], () => { this.story.refreshCast(); g.updateObjective(); g.save(false); });
  }
  // the radio line a wrong band brings from the nearest station on the line, once a station (coils.js asks for the mill)
  complain(s) {
    if (!this.exp || this.told.has(s)) return [];
    const n = NEAR[s].find((x) => this.online(x));
    if (!n) return [];
    this.told.add(s);
    return [RADIO[n]];
  }

  // ---------------------------------------------------------------- props: a float on each relay
  decorate() {
    // (the valve room's needles show the band, every frame there: needles())
    const V = this.game.regions?.built('valves');
    if (V && this.once('valves')) V.updaters.push(() => { const n = this.room() === 'valves' && this.needles(); if (n) V.gauges.set(n); });
    for (const s of BAND_STATIONS) {
      const r = this.net.relays?.[s];
      if (!r || this.floats[s]) continue;
      const F = buildFloat();
      F.g.position.set(0.47, 0, 0.05); r.add(F.g);
      this.floats[s] = F;
    }
    this.show();
  }
  show() {
    const f = this.f;
    for (const [s, F] of Object.entries(this.floats)) {
      F.g.visible = this.exp && this.isLit(s);
      const d = this.dialOf(s);
      F.ptr.rotation.z = [1.1, 0, -1.1][d]; F.rod.position.y = 0.84 + 0.03 * d;
      F.lamp.material = !F.g.visible ? mats().dead : (this.bandDone(s) || f['c10_' + s] || this.state(s) === 'right') ? mats().green : mats().amber;
    }
  }
  spot(s) { const r = this.net.relays?.[s]; if (!r) return null; const v = r.getWorldPosition(new THREE.Vector3()); return { x: v.x, z: v.z }; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    if (!this.exp || !this.net.isCur()) return;
    for (const s of BAND_STATIONS) {
      if (!this.here(s) || !this.isLit(s) || !this.floats[s]?.g.visible) continue;
      const p = this.spot(s); if (!p) continue;
      consider(dist(p.x, p.z), 1.3, { kind: 'nw1band', s, x: p.x, z: p.z, label: this.pending(s) ? 'p_band' : 'p_look' });
    }
  }
  interact(it) {
    if (it.kind !== 'nw1band') return false;
    const g = this.game, s = it.s, h = g.hero;
    if (this.pending(s)) { h.act('use', 0.5, () => this.turn(s), 0.25); return true; }
    g.say('n_hero', [t('nw1_float_look', { b: this.bandName(s) })], null, h, SPEAKER_COLORS.hero);
    return true;
  }
  // one notch of the band; the friend reads the signal a moment later (update)
  turn(s) {
    const g = this.game, f = this.f;
    f['c10_bandAt_' + s] = (this.dialOf(s) + 1) % 3;
    this.show();
    g.audio.play('select');
    g.hud.toast('og6_toast_band', { b: this.bandName(s) });
    this.readT[s] = READ_AFTER;
    g.save(false);
  }
  cueKey(s) { const st = this.state(s); return st === 'right' ? `nw1_${s}_right1` : `nw1_${s}_${st}`; }
  // the friend's reading: wrong (and a neighbour on the radio, once), right for the first conditions, or right after
  // the change: the friend takes the job and the station is done
  read(s) {
    const g = this.game, f = this.f, st = this.state(s), who = ST[s].who;
    this.readT[s] = 0;
    if (st !== 'right') {
      if (s === 'bore') this.puff(st === 'low' ? 24 : 6);
      this.chain([[who, this.cueKey(s)], ...this.complain(s)]);
      return;
    }
    if (!f['c10_shift_' + s]) { f['c10_band_' + s] = 1; this.shiftT[s] = 0; this.show(); this.chain([[who, this.cueKey(s)]], () => { g.updateObjective(); g.save(false); }); return; }
    f['c10_band_' + s] = 2; this.show();
    this.chain(END[s], () => { this.story.refreshCast(); this.net.stationDone(s); });
  }
  // the conditions change once
  shift(s) {
    const g = this.game, f = this.f;
    f['c10_shift_' + s] = true; this.show();
    const thr = s === 'valves' ? this.story.chapters.find((c) => c.key === 'throttle') : null;
    if (s === 'valves') { g.audio.play('thump'); g.audio.play('orenTone'); g.camRig.shake(0.05); }
    if (s === 'light') g.audio.play('horn');
    if (s === 'bore') { g.camRig.shake(0.15); this.puff(30); }
    const lines = [...SHIFT[s], ...(this.state(s) !== 'right' ? [[ST[s].who, this.cueKey(s)]] : [])];   // (and the reading the change brings)
    this.chain(lines, () => { thr?.pres?.setMode?.('turning'); this.show(); g.updateObjective(); g.save(false); }, (i, id) => { if (id === 'oren') thr?.pres?.setMode?.('attending'); });
  }
  puff(n) { const p = this.spot('bore'), g = this.game; if (p) g.particles.burst(p.x, g.physics.groundAt(p.x, p.z) + 1.1, p.z, '#f2f2ee', n, 2.5); }

  update(dt) {
    const g = this.game, f = this.f;
    if (!this.on) return;
    const play = g.state === 'play' && !g.trans, h = g.hero;
    for (const s of BAND_STATIONS) {
      if (!this.pending(s) || !this.here(s)) continue;
      if (this.readT[s] > 0) { if (play) { this.readT[s] -= dt; if (this.readT[s] <= 0) this.read(s); } continue; }
      if (!play) continue;
      const band = f['c10_band_' + s] | 0, shifted = !!f['c10_shift_' + s];
      // (a band already right — a load, or the conditions changed to meet it — is read at once)
      if (this.state(s) === 'right' && band < (shifted ? 2 : 1)) { this.read(s); continue; }
      if (band === 1 && !shifted) { this.shiftT[s] = (this.shiftT[s] || 0) + dt; if (this.shiftT[s] >= SHIFT_AFTER) { this.shiftT[s] = 0; this.shift(s); } }
      const p = this.spot(s), near = p && Math.hypot(h.pos.x - p.x, h.pos.z - p.z) < 4;
      this.nudge(dt, 'nw1_' + s, !!near && this.state(s) !== 'right', 35, 'nw1_nudge_band', { who: t('n_' + ST[s].who) });
    }
  }
  // the valve room's needles show the band (above green: set too low; under green: set too high), every frame there
  needles() {
    const s = 'valves';
    if (!this.pending(s)) return null;
    const st = this.state(s), tt = this.game.time || 0;
    const base = st === 'low' ? 2.45 : st === 'high' ? 1.5 : 2;
    const w = st === 'right' ? 0.03 : 0.12;
    return [base + w * Math.sin(tt * 5.1), base + w * Math.sin(tt * 4.3 + 1), base + w * Math.sin(tt * 4.7 + 2)];
  }

  talk(npc) {
    const id = npc.def.id;
    if (!this.on) return false;
    const c = (lines) => { this.chain(lines); return true; };
    const cue = (s) => c([[ST[s].who, this.cueKey(s)]]);
    switch (id) {
      case 'mira': if (this.room() !== 'valves') return false; if (this.pending('valves')) return cue('valves'); if (this.bandDone('valves')) return c([['mira', 'nw1_mira_after']]); return false;
      case 'arthur': if (this.pending('light')) return cue('light'); if (this.bandDone('light')) return c([['arthur', 'nw1_ar_after']]); return false;
      case 'zoe': if (this.pending('light')) return c([['zoe', 'nw1_zoe_wait']]); if (this.bandDone('light')) return c([['zoe', 'nw1_zoe_after']]); return false;
      case 'ilka': if (this.pending('bore')) return cue('bore'); if (this.bandDone('bore')) return c([['ilka', 'nw1_ilka_after']]); return false;
      case 'pim': if (this.pending('dome')) return cue('dome'); if (this.bandDone('dome')) return c([['pim', 'nw1_pim_after']]); return false;
      case 'keeper': if (this.pending('dome')) return c([['keeper', 'nw1_keeper_wait']]); return false;
    }
    return false;
  }

  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f;
    this.readT = {}; this.shiftT = {};
    if (this.exp && this.reached() && f.c10_started) f.vm_3 = true;   // (a save from before NW-1 that had begun the network)
    for (const s of BAND_STATIONS) {
      if (f['c10_band_' + s] > 2) f['c10_band_' + s] = 2;
      if (f['c10_bandAt_' + s] != null && !(f['c10_bandAt_' + s] >= 0 && f['c10_bandAt_' + s] <= 2)) f['c10_bandAt_' + s] = ST[s].preset;
    }
    this.show();
  }
  regionBuilt() { this.decorate(); }
  // the station's step on the network's objective (null: the network's own line)
  sub(s) { return this.pending(s) ? ['nw1_sub_' + s] : null; }
  journal() {
    const f = this.f;
    if (!this.exp) return [];
    return [
      { key: 'nw1_j_vm3', done: !!f.vm_3 },
      { key: 'nw1_j_float', done: !!f.c10_started },
      ...BAND_STATIONS.map((s) => ({ key: 'nw1_j_' + s, done: this.bandDone(s) && !!f['c10_' + s] })),
    ].filter((l) => l.done);
  }
}

// the change of conditions at each station
const SHIFT = {
  valves: [['narrator', 'nw1_valves_trim'], ['oren', 'nw1_oren_trim'], ['mira', 'nw1_mira_trim']],
  light: [['zoe', 'nw1_zoe_fog1'], ['zoe', 'nw1_zoe_fog2'], ['hero', 'nw1_tw_fog']],
  bore: [['narrator', 'nw1_bore_surge'], ['ilka', 'nw1_ilka_surge']],
  dome: [['narrator', 'nw1_dome_cloud'], ['pim', 'nw1_pim_cloud']],
};
// right after the change: the friend takes the job, the station is done
const END = {
  valves: [['mira', 'nw1_valves_right2'], ['balradio', 'nw1_bal_ration'], ['mira', 'c10_mira_3']],
  light: [['arthur', 'nw1_ar_mine'], ['zoe', 'nw1_zoe_yes'], ['arthur', 'c10_ar_mic'], ['zoe', 'c10_zoe_3']],
  bore: [['ilka', 'nw1_ilka_mine'], ['dallan', 'c10_dallan_1']],
  dome: [['pim', 'nw1_pim_mine'], ['keeper', 'c10_keeper_2']],
};
