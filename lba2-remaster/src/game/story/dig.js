// Chapter 4 — "The Dig" (Desert Island).
//
// Baldino sent Twinsen south to learn what the shell is. Kesh, the island's village, distrusts anyone off
// the project's ferry: restarting the wind-pump (three seized gears, the magic ball) earns Mother Tarra's
// trust and the name of Professor Ilka, who found the first crystals and was sacked for it. Hesk's sand-yacht
// needs rope from the pier before it can fly. Ilka's notebook — the dig's gate code — sits on the foreman's
// desk at the research post: go in during one of the sandstorms that blind the drones and send the gate
// guard indoors. The project dug Temple-Park down to the Temple of Bù's gate (three terraces, crystal mites);
// three stone seals open the gate, and inside the temple (src/game/temple.js) a great carving shows the shell
// and its vents, which the project is closing. Dallan throws them out — but he knows.
// → chapter 5 (Steam and Sand): open the vent under this island without boiling Kesh.
import { ChapterBase } from './base.js';
import '../text/ch4.js';

const STORM_PERIOD = 75, STORM_LEN = 30; // seconds (game time) between storms, and how long one blows

export class Dig extends ChapterBase {
  get D() { return this.game.rooms.desert; }
  get T() { return this.game.rooms.butemple; }
  inD() { return this.game.room?.id === 'desert'; }
  gears() { return [0, 1, 2].filter((i) => this.f['c4_gear' + i]).length; }
  seals() { return [0, 1, 2].filter((i) => this.f['c4_seal' + i]).length; }

  // ---------------------------------------------------------------- cast
  npcDefs() {
    const S = this.D?.npcSpots || {};
    const at = (k) => S[k] || { x: 0, z: 0, a: 0 };
    const def = (id, char, spot, color) => ({ id, name: 'n_' + id, char, color, x: at(spot).x, z: at(spot).z, angle: at(spot).a });
    return [
      def('hesk', 'hesk', 'hesk', '#ffc890'), def('tarra', 'tarra', 'tarra', '#f0c0e0'), def('ilka', 'ilka', 'ilka', '#e8e0b0'),
      def('dallan', 'dallan', 'dallan', '#a8e0e8'), def('dkid', 'desertkid', 'kid', '#ffe0a0'), def('dtrader', 'desertTrader', 'trader', '#a8d8f0'),
      def('weaver', 'weaver', 'weaver', '#ffb0c0'),
    ];
  }
  enemyDefs() {
    const D = this.D;
    if (!D) return [];
    const P = D.post.patrol, n = P.length, h = Math.floor(n / 2);
    const out = [
      { id: 'pdrone1', kind: 'drone', group: 'dpost', x: P[0][0], z: P[0][1], patrol: P, wp: 1, when: (f) => this.isCur(f) && !f.c4_done },
      { id: 'pdrone2', kind: 'drone', group: 'dpost', x: P[h][0], z: P[h][1], patrol: P, wp: (h + 1) % n, when: (f) => this.isCur(f) && !f.c4_done },
      { id: 'pguard1', kind: 'guard', group: 'dpost', x: P[n - 1][0], z: P[n - 1][1], patrol: [...P].reverse(), wp: 1, when: (f) => this.isCur(f) && !f.c4_done },
      { id: 'pgdog1', kind: 'gdog', coat: 'greybrown', group: 'dpost', x: P[h][0], z: P[h][1], patrol: [...P].reverse(), wp: (n - h) % n, when: (f) => this.isCur(f) && !f.c4_done },
    ];
    // crystal mites on the lower terraces
    const dg = D.dig;
    [[10, 1.3], [10, 3.6], [6, 5.2]].forEach(([r, a], i) => out.push({ id: 'dmite' + i, kind: 'mite', x: dg.x + Math.cos(a) * r, z: dg.z + Math.sin(a) * r, when: (f) => this.isCur(f) && !!f.c4_digOpen }));
    // and two more got into the temple through the project's cut
    (this.T?.mites || []).forEach((p, i) => out.push({ id: 'tmite' + i, kind: 'mite', group: 'butemple', x: p.x, z: p.z, when: (f) => this.isCur(f) && !!f.c4_seals3 && !f.c4_carving }));
    return out;
  }
  place(id) {
    const f = this.f, D = this.D;
    const mine = ['hesk', 'tarra', 'ilka', 'dallan', 'dkid', 'dtrader', 'weaver'];
    if (!this.reached()) return mine.includes(id) ? null : undefined;
    const S = D.npcSpots;
    switch (id) {
      case 'hesk': {
        const y = f.c4_yacht || 'village';
        if (y === 'village') return S.hesk;
        const p = D.yacht.spot(y); return { x: p.x + 1.4, z: p.z + 1.6, a: Math.PI };
      }
      case 'tarra': return S.tarra;
      case 'ilka':
        if (f.c4_seals3 && this.T) return this.T.npcSpots.ilka;   // (she follows him into the temple)
        return S.ilka;
      case 'dallan':
        if (f.c4_carving && this.T) return this.T.npcSpots.dallan;
        return S.dallan;
      case 'guard': return this.stormy ? null : S.guard;
      case 'dkid': return this.story.kesh?.saniSpot() || S.kid;   // (in the cool room's doorway once it draws: kesh.js)
      case 'dtrader': return S.trader;
      case 'weaver': return S.weaver;
      case 'doran': return { x: D.dock.x + 1.2, z: D.dock.z + 1.4, a: Math.PI / 2 };
      // everyone else stays where the earlier chapters left them
    }
    return undefined;
  }

  // ---------------------------------------------------------------- arrival
  begin() {
    const g = this.game, D = this.D;
    g.enterRoom('desert', D.dock, true);
    g.hero.hasBall = true;
    D.ferry?.setVisible?.(true);
    this.story.refreshCast();
    this.chain([['narrator', 'c4_arrive'], ['doran', 'c4_doran_1'], ['hero', 'c4_tw_arrive']], () => {
      this.f.c4_started = true;
      g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, D = this.D, h = g.hero;
    if (this.isCur() && g.room?.id === 'butemple' && f.c4_seals3 && !f.c4_carving && this.T) consider(dist(this.T.carving.x, this.T.carving.z), 2.2, { kind: 'c4carve', label: 'p_carving' });
    if (!this.isCur() || !this.inD()) return;
    if (f.c4_heskAsk && !f.c4_rope) consider(dist(D.rope.x, D.rope.z), 1.4, { kind: 'c4rope', label: 'p_rope' });
    if (f.c4_ilka && !f.c4_notebook) consider(dist(D.post.desk.x, D.post.desk.z), 1.5, { kind: 'c4desk', label: 'p_desk' });
    if (!f.c4_digOpen) consider(dist(D.dig.gate.x, D.dig.gate.z), 1.8, { kind: 'c4gate', label: 'p_code' });
  }
  // the temple: its gate at the bottom of the dig, once the seals are open
  doors() {
    const D = this.D;
    if (this.f.c4_seals3 && D?.dig?.door && this.T) return [{ region: 'desert', x: D.dig.door.x, z: D.dig.door.z, r: 1.3, room: 'butemple' }];
    return [];
  }
  exitTo(to) {
    const D = this.D;
    if (to === 'bu-out' && D) { const c = D.dig.carvings; return { room: 'desert', x: D.dig.x, z: D.dig.z, a: Math.atan2(D.dig.x - c.x, D.dig.z - c.z) }; }   // (out at the middle of the dig floor, clear of the gate)
    return null;
  }
  interact(it) {
    const g = this.game, f = this.f, D = this.D;
    switch (it.kind) {
      case 'c4rope':
        f.c4_rope = true; D.rope.setVisible(false); g.audio.play('chest'); g.hud.toast('c4_toast_rope');
        this.chain([['hero', 'c4_rope_got']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c4desk':
        f.c4_notebook = true; g.audio.play('chest'); g.hud.toast('c4_toast_notebook');
        this.chain([['hero', 'c4_desk_1'], ['hero', 'c4_dallan_note']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c4gate':
        if (!f.c4_notebook) { this.chain([['hero', 'c4_gate_locked']]); return true; }
        f.c4_digOpen = true; D.dig.gate.open(); g.audio.play('door');
        this.story.refreshCast();
        this.chain([['hero', 'c4_gate_open']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c4carve': this.readCarving(); return true;
    }
    return false;
  }
  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'doran': return c([['doran', 'c4_doran_1']]);
      case 'dkid': return c([['dkid', f.c4_pump ? 'c4_kid_2' : 'c4_kid_1']]);
      case 'dtrader': return c([['dtrader', f.c4_pump ? 'c4_trader_2' : 'c4_trader_1']]);
      case 'weaver': return c([['weaver', f.c4_pump ? 'c4_weaver_2' : 'c4_weaver_1']]);
      case 'tarra':
        if (!f.c4_pumpTask) return c([['tarra', 'c4_tarra_1'], ['hero', 'c4_tw_tarra1'], ['tarra', 'c4_tarra_2'], ['hero', 'c4_pump_hint']], () => { f.c4_pumpTask = true; g.updateObjective(); g.save(false); });
        if (!f.c4_pump) return c([['tarra', 'c4_tarra_wait']]);
        if (!f.c4_trust) return c([['tarra', 'c4_tarra_3'], ['tarra', 'c4_tarra_4'], ['tarra', 'c4_tarra_5']], () => { f.c4_trust = true; g.updateObjective(); g.save(false); });
        return c([['tarra', 'c4_tarra_idle']]);
      case 'hesk': return this.talkHesk(c);
      case 'ilka':
        if (f.c4_seals3) return c([['ilka', 'c4_ilka_c3']]);
        if (!f.c4_ilka) {
          return c([['ilka', 'c4_ilka_1'], ['hero', 'c4_tw_ilka1'], ['ilka', 'c4_ilka_2'], ['ilka', 'c4_ilka_3'], ['ilka', 'c4_ilka_4'], ['hero', 'c4_tw_ilka2'], ['ilka', 'c4_ilka_5']], () => {
            f.c4_ilka = true; this.stormT = STORM_PERIOD - 8; g.updateObjective(); g.save(false);
          });
        }
        return c([['ilka', f.c4_notebook ? 'c4_ilka_dig' : 'c4_ilka_wait']]);
      case 'guard': return c([['guard', 'c4_guard_1']]);
      case 'dallan': return c([['dallan', f.c4_carving ? 'c4_dallan_3' : 'c4_guard_1']]);
    }
    return false;
  }
  // Hesk drives wherever the story needs (and back to the village)
  talkHesk(c) {
    const f = this.f, at = f.c4_yacht || 'village';
    if (!f.c4_trust) return c([['hesk', 'c4_hesk_idle']]);
    if (!f.c4_rope) return c([['hesk', f.c4_heskAsk ? 'c4_hesk_wait' : 'c4_hesk_1'], ...(f.c4_heskAsk ? [] : [['hesk', 'c4_hesk_rope']])], () => { f.c4_heskAsk = true; this.game.updateObjective(); });
    let to = null, key = null, line = null;
    if (at === 'village' && !f.c4_ilka) { to = 'camp'; key = 'toCamp'; line = f.c4_rode ? 'c4_hesk_camp' : 'c4_hesk_2'; }
    else if (at === 'village' && f.c4_ilka) { to = 'dig'; key = 'toDig'; line = 'c4_hesk_dig'; }
    else if (at === 'camp') { to = 'village'; key = 'campToVillage'; line = 'c4_hesk_village'; }
    else if (at === 'dig') { to = 'village'; key = 'toVillage'; line = 'c4_hesk_village'; }
    if (!to) return c([['hesk', 'c4_hesk_idle']]);
    return c([['hesk', line]], () => this.ride(key, to));
  }
  ride(key, to) {
    const g = this.game, f = this.f, D = this.D;
    const hesk = this.npc('hesk');
    g.setState('cutscene');
    g.cutscene = () => { if (hesk) { hesk.pos.set(g.hero.pos.x - 0.9, g.hero.pos.y, g.hero.pos.z - 0.4); hesk.sync(); } };
    D.yacht.ride(key, g.hero, () => {
      g.cutscene = null;
      f.c4_yacht = to; f.c4_rode = true;
      this.story.refreshCast();
      g.setState('play');
      g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- the ball: gears and seals
  ballHit(p) {
    const g = this.game, f = this.f;
    if (!this.isCur() || !this.inD()) return false;
    for (const tg of g.room.ballTargets) {
      if (tg.done || Math.hypot(p.x - tg.x, p.y - tg.y, p.z - tg.z) > (tg.r || 0.8) + 0.15) continue;
      if (tg.gear != null && f.c4_pumpTask) { tg.done = true; this.freeGear(tg.gear); return true; }
      if (tg.seal != null && f.c4_digOpen) { tg.done = true; this.openSeal(tg.seal); return true; }
    }
    return false;
  }
  freeGear(i, silent = false) {
    const g = this.game, f = this.f, D = this.D;
    f['c4_gear' + i] = true;
    D.pump.gears[i].setTurning(true);
    if (silent) return;
    const n = this.gears();
    g.audio.play('chest'); g.particles.burst(D.pump.gears[i].x, D.pump.gears[i].y, D.pump.gears[i].z, '#e8c890', 16, 2.5);
    g.hud.toast('c4_toast_gear', { n });
    if (n >= 3) {
      f.c4_pump = true; D.pump.setRunning(true); this.fill = 0.15;
      g.audio.play('rumble');
      this.chain([['narrator', 'c4_pump_runs']], () => { g.updateObjective(); g.save(false); });
    } else { g.updateObjective(); g.save(false); }
  }
  openSeal(i, silent = false) {
    const g = this.game, f = this.f, D = this.D;
    f['c4_seal' + i] = true;
    D.dig.seals[i].setOn(true);
    if (silent) return;
    const n = this.seals();
    g.audio.play('shard'); g.hud.toast('c4_toast_seal', { n });
    if (n >= 3) {
      f.c4_seals3 = true; D.dig.reveal();
      g.audio.play('rumble'); g.camRig.shake(0.3);
      this.story.refreshCast();
      this.chain([['narrator', 'c4_seals_all']], () => { g.updateObjective(); g.save(false); });
    } else g.save(false);
  }
  readCarving() {
    const g = this.game, f = this.f;
    this.chain([['hero', 'c4_carving_1'], ['ilka', 'c4_ilka_c1'], ['ilka', 'c4_ilka_c2'], ['hero', 'c4_tw_c1'], ['ilka', 'c4_ilka_c3']], () => {
      f.c4_carving = true;
      this.story.refreshCast();
      this.chain([['dallan', 'c4_dallan_1'], ['ilka', 'c4_ilka_d1'], ['dallan', 'c4_dallan_2'], ['hero', 'c4_tw_d1'], ['dallan', 'c4_dallan_3'], ['ilka', 'c4_ilka_end']], () => {
        f.c4_done = true;
        g.save(false);
        g.startTransition(() => this.story.nextChapter());
      });
    });
  }

  onEnterRoom(id) {
    if (id === 'butemple' && this.isCur() && !this.f.c4_templeSeen) { this.f.c4_templeSeen = true; this.chain([['hero', 'c4_temple_in']], () => this.game.updateObjective()); }
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, f = this.f, D = this.D;
    if (!this.isCur() || !D) return;
    // the oasis fills after the pump starts
    if (f.c4_pump && D.oasis.level < 1) D.oasis.setLevel(Math.min(1, D.oasis.level + dt * 0.08));
    // sandstorms, once Ilka has explained them, until the notebook is out
    const storming = f.c4_ilka && !f.c4_notebook;
    if (storming && g.state === 'play') {
      this.stormT = (this.stormT ?? 0) + dt;
      if (this.stormT > STORM_PERIOD) { this.stormT = 0; }
      const on = this.stormT > STORM_PERIOD - STORM_LEN;
      if (on && !this.stormOn && this.inD()) g.hud.toast('c4_toast_storm');
      this.stormOn = on;
    } else if (!storming) this.stormOn = false;
    D.storm.setLevel(this.stormOn ? 1 : 0);
    D.storm.focus = g.hero.pos;
    // the gate guard shelters, and the gate is left open, while the storm blows
    const stormy = D.storm.level > 0.5 && this.stormOn;
    if (stormy !== !!this.stormy) {
      this.stormy = stormy;
      if (stormy) D.post.gate.open(); else if (!f.c4_notebook) D.post.gate.close();
      this.story.refreshCast();
    }
    if (f.c4_notebook && !D.post.gate.isOpen) D.post.gate.open(); // (never trap him inside afterwards)
    // first steps down into the dig
    const h = g.hero;
    if (f.c4_digOpen && !f.c4_digSeen && g.state === 'play' && this.inD() && h.pos.y < D.dig.bottomY + 3.6 && Math.hypot(h.pos.x - D.dig.x, h.pos.z - D.dig.z) < 13) {
      f.c4_digSeen = true; this.chain([['hero', 'c4_dig_in'], ['hero', 'c4_seals_hint']]);
    }
  }

  applyFlags() {
    const f = this.f, D = this.D;
    if (!this.reached() || !D) return;
    for (const i of [0, 1, 2]) if (f['c4_gear' + i]) { this.freeGear(i, true); for (const tg of D.ballTargets) if (tg.gear === i) tg.done = true; }
    if (f.c4_pump) { D.pump.setRunning(true); D.oasis.setLevel(1); }
    if (f.c4_rope) D.rope.setVisible(false);
    if (f.c4_yacht) D.yacht.placeAt(f.c4_yacht);
    if (f.c4_digOpen) D.dig.gate.open();
    if (f.c4_notebook) D.post.gate.open();
    for (const i of [0, 1, 2]) if (f['c4_seal' + i]) { this.openSeal(i, true); for (const tg of D.ballTargets) if (tg.seal === i) tg.done = true; }
    if (f.c4_seals3) D.dig.reveal();
    D.ferry?.setVisible?.(true);
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f;
    if (!f.c4_started) return '';
    if (f.c4_seals3) return this.goal(this.game.room?.id === 'butemple' || f.c4_templeSeen ? 'c4_obj_carving' : 'c4_obj_temple');
    if (f.c4_digOpen) return this.goal('c4_obj_seals', { n: this.seals() });
    if (f.c4_notebook) return this.goal('c4_obj_dig');
    if (f.c4_ilka) return this.goal('c4_obj_notebook') + this.sub(false, 'c4_sub_storm');
    if (f.c4_trust) return this.goal('c4_obj_ilka') + this.sub(!!f.c4_rope, f.c4_heskAsk ? 'c4_sub_rope' : 'c4_sub_hesk');
    if (f.c4_pump) return this.goal('c4_obj_tarra');
    if (f.c4_pumpTask) return this.goal('c4_obj_pump', { n: this.gears() });
    return this.goal('c4_obj_find');
  }
  items() {
    const f = this.f, out = [];
    if (f.c4_rope && !f.c4_rode) out.push({ id: 'rope', icon: 'rope' });
    if (f.c4_notebook && !f.c4_done) out.push({ id: 'notebook', icon: 'leaflet' });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'c4_j_arrive', done: !!f.c4_started },
      { key: 'c4_j_pump', done: !!f.c4_trust },
      { key: 'c4_j_ilka', done: !!f.c4_ilka },
      { key: 'c4_j_notebook', done: !!f.c4_notebook },
      { key: 'c4_j_carving', done: !!f.c4_carving },
      { key: 'c4_j_dallan', done: !!f.c4_done },
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}
