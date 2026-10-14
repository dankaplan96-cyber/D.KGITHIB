// Chapter 10 — "Baldino's Network" (all five islands).
//
// The council's order is paper; the shaft opens only on a code sent from every station at once. Baldino has
// built five relays, each powered by what is already there and each held by a friend: the water mains under
// Citadel (Mira, in FunFrock's valve room: two marks on every gauge), the lighthouse transmitter (Zoé holds the
// frequency, Arthur reads the needle, and gets to say "station ready"), Baldino's old mill on Zeelich (Oku;
// brake it with the ball, climb, set the relay), the bore vent on Desert Island (Ilka and Dallan; project drones
// come for the relay), and Sefa's dome on the Hamalayi (Pim holds the big mirror's chain; ice mites on the
// ridge). Hesk's glider flies Twinsen between the islands, in any order. With all five lamps lit, the console
// on the drill platform sends the code; every friend holds for a minute; the blast doors open → chapter 11.
import { ChapterBase } from './base.js';
import { VALVE_EFFECT, buildGlider, buildRelay } from '../valveroom.js';
import '../text/ch10.js';

const STATIONS = ['mill', 'valves', 'light', 'bore', 'dome'];
const LIGHT_CODE = [2, 0, 1];                 // star, sun, wave (the lighthouse dials: 0 sun · 1 wave · 2 star)
const CITADEL_LANDING = { x: -58, z: -60 };
const LIGHTHOUSE_DOOR = { x: -107.5, z: 94.2 };
const REGION_OF = { zeelich: 'zeelich', workshop: 'zeelich', upper: 'zeelich', council: 'zeelich', archive: 'zeelich', desert: 'desert', condA: 'desert', condB: 'desert', hamalayi: 'hamalayi', obsv: 'hamalayi' };

export class Network extends ChapterBase {
  get R() { return this.game.rooms; }
  get Z() { return this.R.zeelich; }
  get D() { return this.R.desert; }
  get M() { return this.R.hamalayi; }
  room() { return this.game.room?.id; }
  region() { return REGION_OF[this.room()] || 'citadel'; }
  done() { return STATIONS.filter((s) => this.f['c10_' + s]).length; }
  boreDrones() { return this.game.enemies.filter((e) => /^ndrone/.test(e.def?.id || '')); }
  ridgeMites() { return this.game.enemies.filter((e) => /^nmite|^ncrawler/.test(e.def?.id || '')); }

  // where Hesk's glider comes down on each island, and where Hesk waits beside it
  landing(r) {
    const Z = this.Z, D = this.D, M = this.M;
    switch (r) {
      case 'zeelich': return { x: Z.dock.x + 3.0, z: Z.dock.z - 1.3, a: Math.PI / 2 };
      case 'desert': return { x: D.dock.x + 28, z: D.dock.z, a: Math.PI / 2 }; // (past the pier)
      case 'hamalayi': return { x: M.monastery.yard.x + 2, z: M.monastery.yard.z + 3, a: Math.PI };
      default: return { x: CITADEL_LANDING.x, z: CITADEL_LANDING.z, a: Math.PI };
    }
  }
  heskSpot(r) { const l = this.landing(r), x = l.x + Math.cos(l.a) * 1.8, z = l.z - Math.sin(l.a) * 1.8; return { x, z, a: Math.atan2(l.x - x, l.z - z) }; }

  // ---------------------------------------------------------------- props: gliders at the landings, relays
  decorate() {
    const g = this.game, Z = this.Z, D = this.D, M = this.M;
    this.gliders = []; this.relays = {};
    const put = (obj, parent, x, y, z, ry) => { obj.position.set(x - parent.position.x, y - parent.position.y, z - parent.position.z); obj.rotation.y = ry; obj.visible = false; parent.add(obj); return obj; };
    const gy = (x, z) => g.physics.groundAt(x, z);
    if (Z?.group) { const l = this.landing('zeelich'); this.gliders.push(put(buildGlider(), Z.group, l.x + 1.5, gy(l.x, l.z + 7), l.z + 7, Math.PI / 2)); }
    if (D?.group) { const l = this.landing('desert'); this.gliders.push(put(buildGlider(), D.group, l.x - 2, gy(l.x - 2, l.z - 7), l.z - 7, -Math.PI / 2)); }
    if (g.world?.root) { const l = CITADEL_LANDING; this.gliders.push(put(buildGlider(), g.world.root, l.x + 5, g.world.H(l.x + 5, l.z - 3), l.z - 3, 0.6)); }
    if (M?.group) { const l = this.landing('hamalayi'); this.gliders.push(put(buildGlider(), M.group, l.x + 6, gy(l.x + 6, l.z + 1), l.z + 1, 0.4)); }
    // relays: one at each station
    const mt = Z?.millTop;
    if (mt) this.relays.mill = put(buildRelay(), Z.group, mt.x + 0.5, mt.y - 0.05, mt.z + 0.3, 0);
    const V = this.R.valves;
    if (V) this.relays.valves = put(buildRelay(), V.group, V.board.x + 2.8, 0, V.board.z - 0.5, 0);
    const L = this.R.lighttop;
    if (L?.npcSpots?.zoe) { const s = L.npcSpots.zoe; this.relays.light = put(buildRelay(), L.group, s.x + (L.group.position.x - s.x) * 0.25, 0, s.z + (L.group.position.z - s.z) * 0.25, 0); }
    if (D?.bore) this.relays.bore = put(buildRelay(), D.group, D.bore.x + 1.4, (D.bore.y ?? gy(D.bore.x, D.bore.z)), D.bore.z - 1.2, 0);
    const O = this.R.obsv;
    if (O?.telescope) this.relays.dome = put(buildRelay(), O.group, O.telescope.x - 1.3, 0, O.telescope.z - 0.4, 0);
  }

  // ---------------------------------------------------------------- cast
  enemyDefs() {
    const out = [], D = this.D, M = this.M;
    if (D?.bore) for (let i = 0; i < 3; i++) {
      const b = D.bore, P = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2 + i * 2.1; return [b.x + Math.cos(a) * 7, b.z + Math.sin(a) * 7]; });
      out.push({ id: 'ndrone' + i, kind: 'drone', group: 'nbore', x: P[0][0], z: P[0][1], patrol: P, wp: 1, when: (f) => this.isCur(f) && !!f.c10_boreRelay && !f.c10_bore });
    }
    // a Grobo guard of Vesk's stands at the bore itself
    if (D?.bore) out.push({ id: 'nclone', kind: 'fclone', group: 'nbore', x: D.bore.x - 4, z: D.bore.z + 4, angle: Math.PI * 0.75, when: (f) => this.isCur(f) && !!f.c10_boreRelay && !f.c10_bore });
    if (D?.bore) out.push({ id: 'nguard', kind: 'guardG', group: 'nbore', x: D.bore.x + 4, z: D.bore.z + 4, angle: Math.PI * 1.25, when: (f) => this.isCur(f) && !!f.c10_boreRelay && !f.c10_bore });
    if (D?.bore && D.post) {
      // a lone sentry automaton at the post's gate: met on its own before the drones at the bore
      const gt = D.post.gate;
      out.push({ id: 'nsentry', kind: 'sentry', x: gt.x + 1.5, z: gt.z + 2.5, angle: 0, group: 'npost', when: (f) => this.isCur(f) && !!f.c10_started && !f.c10_bore });
    }
    if (M?.observatory) {
      const d = M.observatory.door, g = M.monastery.gate;
      // on the open ridge: a crystal crawler on its own, then two mites near the dome's door
      out.push({ id: 'ncrawler', kind: 'crawler', x: g.x + (d.x - g.x) * 0.5, z: g.z + (d.z - g.z) * 0.5, group: 'nridge', when: (f) => this.isCur(f) && !!f.c10_pim && !f.c10_dome });
      [0.86, 0.9].forEach((t, i) => out.push({ id: 'nmite' + i, kind: 'mite', x: g.x + (d.x - g.x) * t + (i ? 2 : -2), z: g.z + (d.z - g.z) * t, group: 'nridge2', when: (f) => this.isCur(f) && !!f.c10_pim && !f.c10_dome }));
    }
    return out;
  }
  place(id) {
    const f = this.f, R = this.R, Z = this.Z, D = this.D;
    if (!this.reached() || !Z) return undefined;
    const plat = Z.platform;
    switch (id) {
      case 'baldino':
        if (this.done() >= 5) return { x: plat.gate.x - 1.6, z: plat.gate.z + 1.4, a: Math.PI / 2 };
        return R.workshop?.npcSpots?.baldino ?? Z.npcSpots.baldinoOut;
      case 'hesk': return f.c10_started ? this.heskSpot(this.region()) : null;
      case 'oku': return f.c10_okuAsk ? { x: Z.millTop.x + 2.2, z: Z.millTop.z + 3.0, a: Math.PI } : Z.npcSpots.esmer2;
      case 'mira': return f.c10_miraAsk && R.valves ? { x: R.valves.spawn.x + 1.6, z: R.valves.spawn.z - 1.8, a: Math.PI * 0.75 } : undefined;
      case 'zoe': { const s = R.lighttop?.npcSpots?.zoe; return s ? { ...s } : undefined; }
      case 'arthur': { const s = R.lighttop?.npcSpots?.zoe, c = R.lighttop?.group.position; return s && c ? { x: s.x + (c.x - s.x) * 0.45 + 0.6, z: s.z + (c.z - s.z) * 0.45, a: Math.atan2(s.x - c.x, s.z - c.z) } : undefined; }
      case 'ilka': return D?.bore ? { x: D.bore.x - 2.6, z: D.bore.z + 2.4, a: 0.6 } : undefined;
      case 'dallan': return D?.bore ? { x: D.bore.x + 2.8, z: D.bore.z + 2.6, a: -0.6 } : undefined;
      case 'pim': return f.c10_pim && R.obsv ? { x: R.obsv.telescope.x - 1.0, z: R.obsv.telescope.z + 1.1, a: Math.PI * 0.8 } : undefined;
      case 'vesk': case 'doran': return null;
    }
    return undefined;
  }

  begin() {
    const g = this.game, f = this.f;
    g.hero.swapBody?.('twinsen'); g.hero.hasBall = true; g.hero.disguised = false;
    if (this.R.workshop) g.enterRoom('workshop', null, true); else g.enterRoom('zeelich', this.Z.workshopDoor, true);
    this.story.refreshCast();
    // (Twinsen got Baldino's test pair talking in chapter 3: he remembers it)
    this.chain([['narrator', 'c10_narr'], ['baldino', 'c10_bal_1'], ['baldino', 'c10_bal_2'], ['baldino', 'c10_bal_3'], ...(f.w_pair ? [['baldino', 'c10_bal_pair']] : []), ['hero', 'c10_tw_b1'], ['baldino', 'c10_bal_pulse1'], ['baldino', 'c10_bal_pulse2'], ['baldino', 'c10_bal_4'], ['heskradio', 'c10_hesk_1']], () => {
      f.c10_started = true; f.c10_pulse = true;
      g.hero.hasPulse = true;
      g.hud.toast('c10_toast_relays'); setTimeout(() => g.hud.toast('c10_toast_pulse'), 1800);
      this.story.refreshCast(); g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- moving about
  doors() {
    if (!this.isCur()) return [];
    const out = [];
    const Z = this.Z, M = this.M;
    out.push({ region: 'zeelich', x: Z.workshopDoor.x, z: Z.workshopDoor.z, r: 0.9, room: 'workshop' });
    out.push(...this.story.townDoors());
    if (this.R.lighttop) out.push({ x: LIGHTHOUSE_DOOR.x, z: LIGHTHOUSE_DOOR.z, r: 1.0, room: 'lighttop' });
    if (M?.observatory && this.R.obsv) out.push({ region: 'hamalayi', x: M.observatory.door.x, z: M.observatory.door.z, r: 1.0, room: 'obsv' });
    return out;
  }
  exitTo(to) {
    const R = this.R;
    if (!this.isCur()) return null;
    if (to === 'outdoor-lighthouse') return { x: LIGHTHOUSE_DOOR.x, z: LIGHTHOUSE_DOOR.z + 2.2, a: 0 };
    if (to === 'valves-out') return { room: 'office', ...R.office.spawn };
    return null;
  }
  canExit(room) {
    if (!this.isCur()) return true;
    if (room.id === 'lighttop' && this.f.c10_zoeAsk && !this.f.c10_light && this.lightBusy) return false;
    return true;
  }
  fly(dest) {
    const g = this.game;
    g.startTransition(() => {
      const l = this.landing(dest);
      if (dest === 'citadel') {
        if (g.room) g.exitRoom(l, true);
        else { g.hero.pos.set(l.x, g.physics.groundAt(l.x, l.z), l.z); g.hero.angle = l.a; }
      } else g.enterRoom(dest, l, true);
      this.story.refreshCast();
      g.audio.play('door');
      this.chain([['hesk', 'c10_hesk_land']], () => { g.updateObjective(); g.save(false); });
    });
  }
  openFlights() {
    const g = this.game, f = this.f, here = this.region();
    const of = { zeelich: ['mill'], citadel: ['valves', 'light'], desert: ['bore'], hamalayi: ['dome'] };
    const items = ['zeelich', 'citadel', 'desert', 'hamalayi'].map((r) => ({
      key: 'fly_' + r, id: r, disabled: r === here,
      note: r === here ? 'fly_here' : of[r].every((s) => f['c10_' + s]) ? 'fly_done' : '',
    }));
    g.openMenu('fly_title', items, (it) => this.fly(it.id));
  }
  onEnterRoom() { if (this.isCur()) this.story.refreshCast(); this.setupRoom(); }
  onExitRoom() { if (this.isCur()) this.story.refreshCast(); }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, r = this.room(), h = g.hero;
    if (!this.isCur() || !f.c10_started) return;
    if (r === 'zeelich') {
      const mt = this.Z.millTop;
      if (f.c10_millBraked && !f.c10_mill && Math.abs(h.pos.y - mt.y) < 1.3) consider(dist(mt.x, mt.z), 1.8, { kind: 'c10mill', label: 'p_relay' });
      if (this.done() >= 5 && !f.c10_done) consider(dist(this.Z.platform.console.x, this.Z.platform.console.z), 1.8, { kind: 'c10console', label: 'p_station' });
    } else if (r === 'valves' && f.c10_miraAsk && !f.c10_valves) {
      for (const v of this.R.valves.valves) consider(dist(v.x, v.z), 1.1, { kind: 'c10valve', valve: v, label: 'p_valve' });
    } else if (r === 'lighttop' && f.c10_zoeAsk && !f.c10_light) {
      for (const s of this.R.lighttop.searches || []) { const m = /^dial(\d)$/.exec(s.id); if (m) consider(dist(s.x, s.z), s.r + 0.2, { kind: 'c10dial', i: +m[1] - 1, label: 'p_dial' }); }
    } else if (r === 'desert' && f.c10_ilka && !f.c10_boreRelay) {
      const b = this.D.bore; consider(dist(b.x, b.z), 2.6, { kind: 'c10bore', label: 'p_relay' });
    } else if (r === 'obsv' && f.c10_pim && !f.c10_dome) {
      const T = this.R.obsv.telescope;
      if (f.c10_keeper && !f.c10_domeRelay) consider(dist(T.x, T.z), 2.0, { kind: 'c10domeRelay', label: 'p_relay' });
      if (f.c10_domeRelay) consider(dist(T.x, T.z), 2.0, { kind: 'c10scope', label: 'p_scope' });
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'c10mill':
        h.act('use', 1.0, () => {
          this.lightRelay('mill');
          this.Z.mills[0].setSpinning(true);
          this.chain([['narrator', 'c10_relay_mill'], ['oku', 'c10_oku_2']], () => this.stationDone('mill'));
        }, 0.5);
        return true;
      case 'c10valve': {
        const v = it.valve;
        h.act('use', 0.6, () => {
          v.setOpen(!v.open); (f.c10_valveSet ||= {})[v.i] = v.open; g.audio.play('select');
          const lv = this.gaugeLevels(); this.R.valves.gauges.set(lv);
          if (lv.every((x) => x === 2)) {
            this.lightRelay('valves'); g.audio.play('shard');
            this.chain([['narrator', 'c10_valves_ok'], ['mira', 'c10_mira_3']], () => this.stationDone('valves'));
          }
        }, 0.3);
        return true;
      }
      case 'c10dial': {
        const d = this.R.lighttop.dials[it.i];
        h.act('use', 0.5, () => {
          d.set(d.value + 1); (f.c10_dials ||= [0, 1, 2])[it.i] = d.value; g.audio.play('select');
          const right = f.c10_dials.filter((v, i) => v === LIGHT_CODE[i]).length;
          if (right === 3) {
            this.R.lighttop.transmitter?.setOn?.(true); this.lightRelay('light');
            this.chain([['arthur', 'c10_ar_right'], ['arthur', 'c10_ar_mic'], ['zoe', 'c10_zoe_3']], () => this.stationDone('light'));
          } else g.hud.toast(right === 2 ? 'c10_ar_close' : 'c10_ar_wrong');
        }, 0.3);
        return true;
      }
      case 'c10bore':
        h.act('use', 1.0, () => {
          f.c10_boreRelay = true; this.lightRelay('bore');
          this.story.refreshCast(); g.audio.play('alert');
          this.chain([['narrator', 'c10_relay_bore'], ['hero', 'c10_drones']], () => { g.hud.toast('c10_toast_drones'); g.updateObjective(); g.save(false); });
        }, 0.5);
        return true;
      case 'c10domeRelay':
        h.act('use', 1.0, () => { f.c10_domeRelay = true; g.audio.play('chest'); this.chain([['narrator', 'c10_relay_dome']], () => { g.updateObjective(); g.save(false); }); }, 0.5);
        return true;
      case 'c10scope':
        f.c10_domeLit = true; g.audio.play('door'); g.camRig.shake(0.3); this.lightRelay('dome');
        this.chain([['narrator', 'c10_scope'], ['pim', 'c10_pim_2'], ['keeper', 'c10_keeper_2']], () => this.stationDone('dome'));
        return true;
      case 'c10console': this.sendCode(); return true;
    }
    return false;
  }
  gaugeLevels() {
    const st = this.f.c10_valveSet || {}, out = [0, 0, 0];
    VALVE_EFFECT.forEach((eff, i) => { if (st[i]) eff.forEach((e, k) => { out[k] += e; }); });
    return out;
  }
  lightRelay(s) { this.relays?.[s]?.userData.setOn?.(true); if (this.relays?.[s]) this.relays[s].visible = true; }
  stationDone(s) {
    const g = this.game, f = this.f;
    if (f['c10_' + s]) return;
    f['c10_' + s] = true;
    const n = this.done();
    g.hud.toast('c10_toast_station', { n });
    this.story.refreshCast();
    if (n >= 5) this.chain([['balradio', 'c10_all_1']], () => { this.story.refreshCast(); g.updateObjective(); g.save(false); });
    else { g.updateObjective(); g.save(false); }
  }

  // Oku's mill: the ball on the north mill's brake holds it still for the climb
  ballHit(p) {
    const f = this.f;
    if (!this.isCur() || this.room() !== 'zeelich' || !f.c10_okuAsk || f.c10_millBraked) return false;
    const m = this.Z.mills[0];
    if (Math.hypot(p.x - m.brake.x, p.y - m.brake.y, p.z - m.brake.z) < 0.9) {
      const g = this.game;
      f.c10_millBraked = true; m.setSpinning(false);
      g.audio.play('chest'); g.particles.burst(m.brake.x, m.brake.y, m.brake.z, '#ffe8a0', 16, 3);
      this.chain([['oku', 'c10_oku_brake']], () => { g.updateObjective(); g.save(false); });
      return true;
    }
    return false;
  }
  // the pulse tool stalls the north mill too (machinery: the tool's other use)
  pulseHit(o) {
    const f = this.f;
    if (!this.isCur() || this.room() !== 'zeelich' || !f.c10_okuAsk || f.c10_millBraked) return false;
    const m = this.Z.mills[0], dx = m.brake.x - o.x, dz = m.brake.z - o.z, d = Math.hypot(dx, dz);
    if (d > o.range + 1.5 || (dx * o.fx + dz * o.fz) / d < Math.cos(o.cone + 0.3)) return false;
    return this.ballHit({ x: m.brake.x, y: m.brake.y, z: m.brake.z });
  }
  ballTargets() {
    const f = this.f;
    if (!this.isCur() || this.room() !== 'zeelich' || !f.c10_okuAsk || f.c10_millBraked) return [];
    const m = this.Z.mills[0]; return [{ x: m.brake.x, y: m.brake.y, z: m.brake.z }];
  }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    const ok = () => { this.story.refreshCast(); g.updateObjective(); g.save(false); };
    switch (id) {
      case 'hesk':
        if (!f.c10_started) return false;
        return c([['hesk', 'c10_hesk_fly']], () => this.openFlights());
      case 'baldino':
        if (this.done() >= 5 && !f.c10_done) return c([['baldino', 'c10_bal_p1']]);
        return c([['baldino', 'c10_bal_after']]);
      case 'oku':
        if (!f.c10_okuAsk) return c([['oku', 'c10_oku_1']], () => { f.c10_okuAsk = true; ok(); });
        return c([['oku', f.c10_mill ? 'c10_oku_2' : f.c10_millBraked ? 'c10_oku_brake' : 'c10_oku_1']]);
      case 'mira':
        if (!f.c10_miraAsk) return c([['mira', 'c10_mira_1'], ['mira', 'c10_mira_2']], () => { f.c10_miraAsk = true; g.startTransition(() => { g.enterRoom('valves', null, true); ok(); this.chain([['narrator', 'c10_valves_in'], ['hero', 'c10_valve_hint']]); }); });
        return c([['mira', f.c10_valves ? 'c10_mira_3' : 'c10_mira_2']]);
      case 'zoe':
        if (!f.c10_zoeAsk) return c([['zoe', 'c10_zoe_1'], ['arthur', 'c10_ar_1'], ['zoe', 'c10_zoe_2']], () => { f.c10_zoeAsk = true; ok(); });
        return c([['zoe', f.c10_light ? 'c10_zoe_after' : 'c10_zoe_2']]);
      case 'arthur':
        if (!f.c10_zoeAsk) return this.talk(this.npc('zoe'));
        return c([['arthur', f.c10_light ? 'c10_ar_right' : 'c10_ar_1']]);
      case 'ilka':
        if (!f.c10_ilka) return c([['ilka', 'c10_ilka_1'], ['ilka', 'c10_ilka_2']], () => { f.c10_ilka = true; ok(); });
        return c([['ilka', f.c10_bore ? 'c10_ilka_3' : 'c10_ilka_2']]);
      case 'dallan': return c([['dallan', 'c10_dallan_1']]);
      case 'yorna': case 'pim':
        if (!f.c10_pim) return c([['yorna', 'c10_yorna_1'], ['pim', 'c10_pim_1'], ['yorna', 'c10_yorna_2']], () => { f.c10_pim = true; ok(); });
        return c([[id, id === 'pim' ? 'c10_pim_2' : 'c10_yorna_2']]);
      case 'keeper':
        if (f.c10_pim && !f.c10_keeper) return c([['keeper', 'c10_keeper_1']], () => { f.c10_keeper = true; ok(); });
        return c([['keeper', f.c10_dome ? 'c10_keeper_2' : 'c10_keeper_1']]);
    }
    return false;
  }

  // the code goes out on all five relays; every friend holds for a minute
  sendCode() {
    const g = this.game, f = this.f;
    if (this.sending) return;
    this.sending = true;
    g.audio.cue?.('revelation');
    this.chain([['baldino', 'c10_bal_p1'], ['hero', 'c10_tw_p1'], ['miraradio', 'c10_radio_mira'], ['zoeradio', 'c10_radio_zoe'], ['okuradio', 'c10_radio_oku'], ['ilkaradio', 'c10_radio_ilka'], ['pimradio', 'c10_radio_pim'], ['baldino', 'c10_bal_p2']], () => {
      g.camRig.shake(0.8); g.audio.play('horn');
      this.chain([['narrator', 'c10_shaft'], ['baldino', 'c10_bal_p3'], ['hero', 'c10_tw_p2']], () => {
        g.audio.endCue?.(); this.sending = false;
        f.c10_done = true; g.save(false);
        g.startTransition(() => this.story.nextChapter());
      });
    });
  }

  setupRoom() {
    const f = this.f, r = this.room();
    if (!this.isCur()) return;
    if (r === 'valves') { const V = this.R.valves; for (const v of V.valves) v.setOpen(!!f.c10_valveSet?.[v.i]); V.gauges.set(this.gaugeLevels()); }
    if (r === 'lighttop') { const d = f.c10_dials || [0, 1, 2]; this.R.lighttop.dials?.forEach((x, i) => x.set?.(d[i])); this.R.lighttop.transmitter?.setOn?.(!!f.c10_light); }
  }
  update() {
    const g = this.game, f = this.f;
    if (!this.isCur()) return;
    if (this.room() === 'hamalayi') this.M.snow.focus = g.hero.pos;
    if (f.c10_boreRelay && !f.c10_bore && g.state === 'play') {
      const ds = this.boreDrones();
      if (ds.length && ds.every((e) => !e.alive)) { f.c10_bore = 'pending'; this.chain([['ilka', 'c10_ilka_3'], ['dallan', 'c10_dallan_1']], () => { f.c10_bore = false; this.stationDone('bore'); }); }
    }
    if (f.c10_pim && !f.c10_mitesSeen && this.room() === 'hamalayi' && g.state === 'play' && this.ridgeMites().some((e) => e.present && e.alive && e.distTo?.(g.hero) < 12)) {
      f.c10_mitesSeen = true; this.chain([['hero', 'c10_mites']]);
    }
  }
  applyFlags() {
    const f = this.f, on = this.isCur();
    // the pulse tool is Twinsen's from here on (older saves past this chapter get it too)
    if (f.c10_pulse || this.story.index > this.pos) this.game.hero.hasPulse = true;
    for (const gl of this.gliders || []) gl.visible = on;
    for (const [s, r] of Object.entries(this.relays || {})) { r.visible = on && (!!f['c10_' + s] || (s === 'bore' && !!f.c10_boreRelay)); r.userData.setOn?.(!!f['c10_' + s] || (s === 'bore' && !!f.c10_boreRelay)); }
    if (!on || !this.Z) return;
    // the mills turn again (chapter 9), the north one held still for the climb
    for (const m of this.Z.mills) m.setSpinning(!(m === this.Z.mills[0] && f.c10_millBraked && !f.c10_mill));
    this.Z.ferry?.setVisible?.(false);
    if (f.c10_bore === 'pending') f.c10_bore = false;
    this.setupRoom();
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f;
    if (!f.c10_started) return this.goal('c10_obj_bal');
    const n = this.done();
    if (n >= 5) return this.goal('c10_obj_platform');
    return this.goal('c10_obj_stations', { n }) + this.sub(!!f.c10_mill, 'c10_sub_mill') + this.sub(!!f.c10_valves, 'c10_sub_valves') + this.sub(!!f.c10_light, 'c10_sub_light') + this.sub(!!f.c10_bore, 'c10_sub_bore') + this.sub(!!f.c10_dome, 'c10_sub_dome') + (n === 0 && this.region() === 'zeelich' ? this.sub(false, 'c10_sub_fly') : '');
  }
  items() {
    if (!this.reached() || !this.f.c10_started) return [];
    const left = 5 - this.done();
    return left > 0 && this.isCur() ? [{ id: 'relay', icon: 'part', n: left }] : [];
  }
  journal() {
    const f = this.f;
    return [
      { key: 'c10_j_plan', done: !!f.c10_started },
      { key: 'c10_j_fly', done: !!f.c10_started },
      { key: 'c10_j_all', done: !!f.c10_done },
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}
