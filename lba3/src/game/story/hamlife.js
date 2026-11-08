// HAMALAYI-LIFE (the Hamalayi at Citadel's bar: docs/lba-maturity/hamalayi-inventory.md). Not a chapter: the director
// (index.js) asks it after the chapter in progress, like Zeelich's street life. No story flags of its own: what it shows
// is read from the chapter and chapter 6's own flags, so an old save loads as it did.
//
// The region's phases (phase()):
//   'pack'  chapter 6 before the lift: Lhar packs; a house is packed until its people's trip goes up (c6_trip1/2)
//   'camp'  chapter 6 once they are up, chapter 7: Lhar stands empty (no smoke, cold hearths); the village camps at the
//           monastery and its old and small sleep in the monks' hall
//   'mend'  chapters 8 to 12: the vent breathes (chapter 7) and the ground is still. The camp stays up, but by day Bero
//           mends his house, Sana weaves the new flags at her loom and Lhamo cooks for the menders in her kitchen; in
//           chapters 8 and 9 Yorna sits in her own house again with the village's ledger, and Sefa, with no story at his
//           dome, is at home next door to it
//   'home'  the epilogue: Lhar is lived in again; Old Dorje is back in his own corner
// What it does: the monastery hall's door (hamrooms.js ham_hall) and Brother Tenpa inside it, on a round of the tea
// stove, the altar's lamps and the prayer wheel; the room owners at home (indoor selves of Bero, Sana, Lhamo and Old
// Dorje, dressed as their outdoor selves, who are away then: storylife.js), Yorna and Sefa placed at home (pass.js and
// observatory.js ask home()); Lhar's houses dressed by phase (hamrooms.js dressLharRoom: bundles, mending, the hearth
// light) and their chimneys; the observatory's door shut with its reason where no chapter opens it; things that look
// usable do something: Lhar's notice board, the goat pen, the monastery's prayer wheels, the hall's altar, wheel, tea
// stove and bedrolls.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { IH, roomOf } from '../ihomes.js';
import { HR, dressLharRoom } from '../hamrooms.js';
import { canvasTex, MAT, plane } from '../props.js';
import '../text/hamlife.js';

const LATE = new Set(['evacuation', 'council', 'network', 'shell', 'core']);
const HOUSE = { lhar0: 'lhamo', lhar1: 'yorna', lhar2: 'dorje', lhar3: 'bero', lhar4: 'sana' };
const TRIP = { lhar0: 'c6_trip1', lhar1: 'c6_trip2', lhar2: 'c6_trip2', lhar3: 'c6_trip1', lhar4: 'c6_trip1' };
// the indoor selves: their room, when they are home, their outdoor self (storylife.js: dress and tint)
const OWNERS = {
  hl_bero: { room: 'lhar3', when: 'mend', of: 'lh_bero', char: 'lharMan', tint: '#f6eadc', color: '#d8a878', work: ['stove', 'bed'], anims: ['tinker', 'wipe'] },
  hl_sana: { room: 'lhar4', when: 'mend', of: 'lh_sana', char: 'lharWoman', tint: '#eaf6ff', color: '#a0d8c8', work: ['loom', 'woolshelf'], anims: ['tinker', 'reach'] },
  hl_lhamo: { room: 'lhar0', when: 'mend', of: 'lh_mira', char: 'farmerB', tint: '#fffae6', color: '#f0c8a0', work: ['counter', 'potstove'], anims: ['tinker', 'reach'] },
  hl_dorje: { room: 'lhar2', when: 'home', of: 'lh_old', char: 'lharElder', tint: '#fff6ea', color: '#e0c8f0', work: ['stove', 'table'], anims: ['reach', null] },
};
// the story's own people at home in chapters 8 and 9 (pass.js, observatory.js ask home())
const AT_HOME = { yorna: { room: 'lhar1', work: ['lectern', 'pew'], anims: ['tinker', null] }, keeper: { room: 'obs0', work: ['table', 'bookcase'], anims: ['tinker', 'reach'] } };
const rid = (room) => roomOf('ham-' + room);
const TEA_EVERY = 20;   // s between two cups that give life back

export class HamalayiLife extends ChapterBase {
  get RG() { return this.game.regions; }
  get M() { return this.RG?.built('hamalayi'); }
  get hall() { return this.RG?.built('ham_hall'); }
  key() { return this.story.cur?.key; }
  open() { return this.story.index >= this.story.chapters.findIndex((c) => c.key === 'pass'); }
  phase() {
    const k = this.key(), f = this.f;
    if (k === 'home') return 'home';
    if (LATE.has(k)) return 'mend';
    if (k === 'pass') return f.c6_up ? 'camp' : 'pack';
    return this.open() ? 'camp' : 'pack';
  }
  // a house of Lhar now: its phase's things ('pack' | 'mend' | null) and whether somebody lives in it (hearth, smoke)
  house(room) {
    const ph = this.phase(), f = this.f;
    if (ph === 'pack') return f[TRIP[room]] ? { set: null, home: false } : { set: 'pack', home: true };
    if (ph === 'camp') return { set: null, home: false };
    if (ph === 'home') return { set: null, home: true };
    const k = this.key(), who = HOUSE[room];
    if (who === 'yorna') return { set: null, home: k === 'evacuation' || k === 'council' };
    if (who === 'dorje') return { set: null, home: false };
    return { set: 'mend', home: true };
  }
  // ---------------------------------------------------------------- the people
  npcDefs() {
    const out = [];
    const H = HR.ham_hall?.npcSpots?.monk;
    out.push({ id: 'hl_monk', name: 'n_hl_monk', char: 'lharElder', color: '#e8a040', ...(H ? { x: H.x, z: H.z, angle: H.a } : { x: 0, z: 0, angle: 0, pending: true }) });
    for (const [id, O] of Object.entries(OWNERS)) {
      const S = this.spotIn(O.room, O.work);
      // (dressOf: the same dress as the outdoor self, index.js DRESS-1; dress 0 until then)
      out.push({ id, name: 'n_' + O.of, char: O.char, tint: O.tint, color: O.color, dress: 0, dressOf: O.of, ...(S ? { x: S.x, z: S.z, angle: S.a } : { x: 0, z: 0, angle: 0, pending: true }) });
    }
    return out;
  }
  // where a person stands at a piece of the room (before it, facing it), the first that is free; null if the room is not built
  spotIn(room, work) {
    const id = rid(room), R = this.RG?.built(id), I = IH[id];
    if (!R || !I?.placed) return null;
    const ph = this.game.physics, out = [];
    for (const name of work) {
      if (name === 'counter' && I.npcSpots?.keeper) { const k = I.npcSpots.keeper; out.push({ x: k.x, z: k.z, a: 0 }); continue; }
      const p = I.placed.find((q) => q.name === name);
      if (!p) continue;
      for (const d of [p.fd / 2 + 0.45, p.fd / 2 + 0.75]) {
        const x = p.x + Math.sin(p.ry) * d, z = p.z + Math.cos(p.ry) * d, y = ph.groundAt(x, z, 1);
        if (Math.abs(y) > 0.3 || ph.blockedAt(x, z, y + 0.3, 0.3)) continue;
        out.push({ x, z, a: p.ry + Math.PI }); break;
      }
    }
    if (!out.length) { const F = I.frame; out.push({ x: F.cx + (F.LX + F.RX) / 2 + 0.6, z: F.cz + (F.BZ + F.FZ) / 2, a: Math.PI }); }
    out.forEach((s, i) => { s.i = i; });
    return out[0] && Object.assign(out[0], { stops: out });
  }
  // a little round at the room's pieces: to each, its work there, and on. The work's pose is held from one stop to the
  // next (NPC.busy: a person at work keeps at it while Twinsen stands by, in a room he always does; walking, the rig
  // walks), so the round goes on with him in the room, and stops only while he talks to them
  track(stops, anims) {
    const T = [];
    stops.forEach((s, i) => {
      const an = anims[i] || 'tinker';
      T.push({ op: 'call', fn: (a) => { a.forceAnim = an; } }, { op: 'goto', x: s.x, z: s.z, speed: 0.5 }, { op: 'face', a: s.a }, { op: 'wait', t: s.t ?? 6 + i * 2 });
    });
    if (stops.length > 1) T.push({ op: 'loop' });
    return T;
  }
  // the indoor selves who are at home now (whether or not their room has been built yet: tests/world-consistency.mjs)
  atHome() { const ph = this.phase(); return this.open() ? Object.keys(OWNERS).filter((id) => OWNERS[id].when === ph) : []; }
  // Yorna and Sefa at home (pass.js and observatory.js: chapters 8 and 9), or null while the room is not built (they wait)
  home(id) {
    const A = AT_HOME[id], S = A && this.spotIn(A.room, A.work);
    if (!A) return undefined;
    if (!S) { this.RG?.built(rid(A.room)); return null; }   // (in a probe, the read marks the room: placed once it is built)
    return { x: S.x, z: S.z, a: S.a, anim: A.anims[0] || 'tinker', track: this.track(S.stops, A.anims) };
  }
  place(id) {
    if (id === 'hl_monk') {
      const H = this.hall, S = HR.ham_hall;
      if (!this.open() || !H || !S?.round) return null;
      const s0 = S.round[0];
      return { x: s0.x, z: s0.z, a: s0.a, anim: s0.anim || 'tinker', track: this.track(S.round, S.round.map((r) => r.anim)) };
    }
    const O = OWNERS[id];
    if (!O) return undefined;
    this.tint(id, O.tint);
    if (!this.open() || this.phase() !== O.when) return null;
    const S = this.spotIn(O.room, O.work);
    return S ? { x: S.x, z: S.z, a: S.a, anim: O.anims[0] || 'tinker', track: this.track(S.stops, O.anims) } : null;
  }
  // an indoor self takes its outdoor self's tint (walkers.js Resident does this for the residents)
  tint(id, c) { const n = this.npc(id); if (n && !n._hlTint) { n._hlTint = true; n.rig.mesh?.material?.color?.set(c); } }
  // ---------------------------------------------------------------- talk
  talkFirst(npc) {
    const id = npc.def.id, ph = this.phase(), k = this.key();
    const home = (id === 'yorna' || id === 'keeper') && (k === 'evacuation' || k === 'council') && this.game.room?.id === rid(AT_HOME[id].room);
    if (!OWNERS[id] && id !== 'hl_monk' && !home) return false;
    const base = id === 'yorna' ? 'hl_yorna' : id === 'keeper' ? 'hl_sefa' : id;
    const sub = home ? k : ph === 'mend' && k === 'network' && t(`${base}_network`) !== `${base}_network` ? 'network' : ph;
    const key = `${base}_${sub}`, more = `${key}_2`;
    const n = (npc._hlN = (npc._hlN ?? -1) + 1);
    const line = n % 2 && t(more) !== more ? more : t(key) !== key ? key : `${base}_camp`;
    // (said under the person's own name key: an indoor self speaks as its outdoor self, with its name and its voice)
    npc.talking = true;
    this.game.say(npc.def.name || 'n_' + id, [t(line)], () => { npc.talking = false; }, npc);
    return true;
  }
  // ---------------------------------------------------------------- doors: the monastery's hall
  doors() {
    const M = this.M, d = M?.monastery?.hall;
    if (!d || !this.open() || !this.RG.has('ham_hall')) return [];
    return [{ region: 'hamalayi', x: d.x, z: d.z, r: 0.75, room: 'ham_hall' }];
  }
  exitTo(to) {
    if (to !== 'ham_hall-out') return null;
    const M = this.RG?.built('hamalayi'), d = M?.monastery?.hall;
    if (!d) return M ? { room: 'hamalayi', x: M.monastery.gate.x, z: M.monastery.gate.z - 2, a: 0 } : null;
    return { room: 'hamalayi', x: d.sill.x, z: d.sill.z + 1.45, a: 0 };
  }
  // the observatory's door where no chapter opens it (chapter 6 before the dome's chapter; 8 and 9, Sefa at home)
  obsShut() { const k = this.key(); return this.open() && k !== 'observatory' && k !== 'network' && k !== 'home'; }
  // ---------------------------------------------------------------- what can be used
  interactables(consider, dist) {
    const g = this.game, r = g.room?.id;
    if (r === 'ham_hall') {
      const H = this.hall; if (!H) return;
      consider(dist(H.altar.x, H.altar.z), 2.1, { kind: 'hl_look', key: 'hh_altar', label: 'p_look' });
      consider(dist(H.wheel.x, H.wheel.z), 1.3, { kind: 'hl_wheel', label: 'p_turn', at: H.wheel });
      consider(dist(H.tea.x, H.tea.z), 1.5, { kind: 'hl_tea', label: 'p_drink' });
      if (this.guests()) consider(dist(H.beds.x, H.beds.z), 1.6, { kind: 'hl_look', key: 'hh_beds_' + this.phase(), label: 'p_look' });
      return;
    }
    if (r !== 'hamalayi' || !this.open()) return;
    const M = this.M, h = g.hero;
    const shut = this.obsShut();
    // (the heat station's shed: its own look once it runs; before that it is chapter 6's to explain: pass.js c6heat)
    const heat = !!this.f.c6_heat || this.story.index > this.story.chapters.findIndex((c) => c.key === 'pass');
    for (const s of this.spots(M)) if ((!s.obs || shut) && (!s.it.heat || heat) && Math.abs(h.pos.y - s.y) < 2.5) consider(dist(s.x, s.z), s.r, s.it);
  }
  // the outdoor things, in the region's world frame (hamalayi.js layout: Lhar's notice board, the goat pen, the
  // monastery's two rows of prayer wheels, the observatory's door)
  spots(M) {
    if (this._spots?.M === M) return this._spots.list;
    const o = M.group.position, gy = (x, z) => this.game.physics.groundAt(x, z, 60);
    const W = (x, z, r, it) => ({ x: o.x + x, z: o.z + z, y: gy(o.x + x, o.z + z), r, it });
    const list = [
      W(-8.2, 0.1, 1.5, { kind: 'hl_notice', label: 'p_read' }),
      W(-28.6, 8.4, 1.6, { kind: 'hl_look', key: 'hl_pen', label: 'p_look' }),
      W(-31.6, 6.2, 2.4, { kind: 'hl_look', key: 'hl_pen', label: 'p_look' }),
      W(-8.0, 14.0, 2.4, { kind: 'hl_look', key: 'hl_shrine', label: 'p_look' }),
      W(16.0, -19.2, 1.9, { kind: 'hl_look', key: 'hl_heat', label: 'p_look', heat: true }),
      // (the rows' outer ends: the villagers' round spins them from the middle of each row, castrounds.js)
      W(27.4, -44.2, 1.1, { kind: 'hl_pwheel', label: 'p_turn' }),
      W(41.0, -44.2, 1.1, { kind: 'hl_pwheel', label: 'p_turn' }),
    ];
    const d = M.observatory.door;
    list.push({ x: d.x, z: d.z - 0.4, y: gy(d.x, d.z + 0.6), r: 1.9, it: { kind: 'hl_obs', label: 'p_knock' }, obs: true });
    this._spots = { M, list };
    return list;
  }
  interact(it) {
    const g = this.game, h = g.hero, say = (key) => { g.say('n_hero', [t(key)], null, h); return true; };
    switch (it.kind) {
      case 'hl_look': return say(it.key === 'hl_pen' && this.phase() === 'home' ? 'hl_pen_home' : it.key);
      case 'hl_notice': g.audio.play('paper'); return say('hl_notice_' + this.phase());
      case 'hl_pwheel': g.audio.play('ropeCreak'); return say(this.phase() === 'pack' ? 'hl_pwheel_pack' : 'hl_pwheel');
      case 'hl_wheel': this.hall?.wheel.spin(); g.audio.play('ropeCreak'); return say('hh_wheel');
      case 'hl_tea':
        if (h.hp < h.maxHp && !(this._tea > g.time - TEA_EVERY)) { this._tea = g.time; h.hp = Math.min(h.maxHp, h.hp + 2); g.audio.play('heal'); }
        return say('hh_tea');
      case 'hl_obs': g.audio.play('doorLocked'); return say(this.key() === 'pass' ? 'hl_obs_pass' : 'hl_obs_home');
      case 'ihlook': {
        // (a Lhar room's own look follows the phase: ih_ham_lharN_<phase> where there is one; ihomes.js gives the rest)
        if (!/^ih_ham_lhar\d$/.test(it.key)) return false;
        const room = it.key.slice(7), st = this.house(room), ph = this.phase();
        const k = `${it.key}_${st.set || (st.home ? (ph === 'mend' ? 'mend' : '') : 'empty')}`;
        return say(t(k) !== k ? k : it.key);
      }
    }
    return false;
  }
  // the villagers sleep in the hall from the first trip up until Lhar is home
  guests() { const ph = this.phase(); return ph === 'camp' || ph === 'mend' || (ph === 'pack' && !!this.f.c6_trip1); }
  // ---------------------------------------------------------------- the phase on the places
  regionBuilt(ids) { if (ids.some((id) => id === 'hamalayi' || id === 'ham_hall' || id.startsWith('ih_ham_'))) this.apply(true); }
  applyFlags() { this.apply(true); }
  update(dt) {
    if ((this._t = (this._t || 0) + dt) < 0.5) return;
    this._t = 0;
    this.apply(false);
  }
  apply(force) {
    const RG = this.RG; if (!RG) return;
    const ph = this.phase(), key = `${ph}|${this.key()}|${this.f.c6_trip1 ? 1 : 0}${this.f.c6_trip2 ? 1 : 0}`;
    const M = this.M;
    if (!force && key === this._key) return;
    this._key = key;
    // Lhar's houses: their things, their hearth, their chimney
    for (const room of Object.keys(HOUSE)) {
      const st = this.house(room), id = rid(room), R = RG.built(id);
      M?.chimney?.('ham-' + room, st.home);
      if (!R || !IH[id]?.placed) continue;
      R._hl ||= dressLharRoom(R, IH[id], room, this.game.physics);
      R._hl.set(st.set, st.home);
    }
    M?.lharWindows?.(Object.keys(HOUSE).some((room) => this.house(room).home));
    this.hall?.setGuests(this.guests());
    if (M) this.obsSign(M, this.obsShut() && LATE.has(this.key()));
  }
  // a slate hung on the observatory's door while Sefa is at home: SEFA - NEXT DOOR
  obsSign(M, on) {
    if (!M._hlSign) {
      const d = M.observatory.door, o = M.group.position, gy = this.game.physics.groundAt(d.x, d.z - 0.6, 60);
      const tex = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#2a2a2e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#a07040'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10); x.fillStyle = '#f2f2ea'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SEFA', w / 2, h * 0.36); x.font = 'bold 30px sans-serif'; x.fillText('NEXT DOOR', w / 2, h * 0.7); });
      const m = new THREE.Mesh(plane(0.62, 0.31), MAT.map(tex, 0.9));
      m.position.set(d.x - o.x, gy + 1.75, d.z - 0.5 - o.z); M.group.add(m);
      M._hlSign = m;
    }
    M._hlSign.visible = !!on;
  }
}
