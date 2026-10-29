// Chapter 4 — "The Dig" (Desert Island).
//
// Baldino sent Twinsen south to learn what the shell is. Kesh, the island's village, distrusts anyone off
// the project's ferry: restarting the wind-pump earns Mother Tarra's trust and the name of Professor Ilka, who
// found the first crystals and was sacked for it. The pump (ADV-2) is found out, not told: Brosk blames the test
// bore's tremors; Sani hears it from the roof (at each gust two gears clack and one grinds). At the tower each gust
// shows it: the sound gears rock, the jammed one shudders and spits sand (Listen there brings the next gust at once).
// The ball knocks the jammed one loose; a sound gear only rings (a line, then a toast; Sani's hint grows). Then the
// pump lifts water and it sprays from a pipe joint the tremors shook apart (Brosk was half right): push it home and
// the oasis fills. Any order: the pump can be fixed before Tarra asks. Hesk's sand-yacht needs rope from the pier
// before it can fly. Ilka's notebook — the dig's gate code — sits on the foreman's desk at the research post: go
// in during one of the sandstorms that blind the drones and send the gate guard indoors. At the dig the player
// enters the code on the keypad (three worn keys, three orders: the notebook says which; a wrong one buzzes).
// The project dug Temple-Park down to the Temple of Bù's gate (three terraces, crystal mites);
// five stone discs stand round its door, like the five vents carved over it; only the three with heat behind them
// open it (crystals crust those: they grow where heat leaks, as Ilka said and a crack on the way down shows); a
// cold disc shuts the others again. Ilka waits at the rim with hints that grow with his mistakes. Inside the
// temple (src/game/temple.js) a great carving shows the shell and its vents, which the project is closing (that
// is why two discs were cold). Dallan throws them out — but he knows.
// → chapter 5 (Steam and Sand): open the vent under this island without boiling Kesh.
import { ChapterBase } from './base.js';
import '../text/ch4.js';

const STORM_PERIOD = 50, STORM_LEN = 28; // (CH4-STORM: the calm between storms 45 → 22 s) // seconds (game time) between storms, and how long one blows
const CODES = ['c4_code_147', 'c4_code_417', 'c4_code_741'];   // the keypad: three orders of its worn keys (the notebook: 4-1-7)

export class Dig extends ChapterBase {
  get D() { return this.game.rooms.desert; }
  get T() { return this.game.rooms.butemple; }
  inD() { return this.game.room?.id === 'desert'; }
  seals() { return [0, 1, 2].filter((i) => this.f['c4_seal' + i]).length; }
  // where Ilka waits once she has her notebook back: outside the dig's gate, out of the keypad's way
  ilkaRim() {
    const dg = this.D.dig, g = dg.gate, dx = g.x - dg.x, dz = g.z - dg.z, a = Math.atan2(dz, dx) + 0.12, r = Math.hypot(dx, dz) + 2.4;
    const x = dg.x + Math.cos(a) * r, z = dg.z + Math.sin(a) * r;
    return { x, z, a: Math.atan2(dg.x - x, dg.z - z) };
  }

  // ---------------------------------------------------------------- cast
  npcDefs() {
    const S = this.D?.npcSpots || {};
    const at = (k) => S[k] || { x: 0, z: 0, a: 0, pending: true };
    const def = (id, char, spot, color) => ({ id, name: 'n_' + id, char, color, x: at(spot).x, z: at(spot).z, angle: at(spot).a, ...(S[spot] ? {} : { pending: true }) });
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
    const f = this.f;
    const mine = ['hesk', 'tarra', 'ilka', 'dallan', 'dkid', 'dtrader', 'weaver'];
    if (!this.reached()) return mine.includes(id) ? null : undefined;
    if (!mine.includes(id) && id !== 'guard' && id !== 'doran') return undefined;
    const D = this.D, S = D.npcSpots;
    switch (id) {
      case 'hesk': {
        const y = f.c4_yacht || 'village';
        if (y === 'village') return S.hesk;
        const p = D.yacht.spot(y); return { x: p.x + 1.4, z: p.z + 1.6, a: Math.PI };
      }
      case 'tarra': return S.tarra;
      case 'ilka':
        if (f.c4_seals3 && this.T) return this.T.npcSpots.ilka;   // (she follows him into the temple)
        if (f.c4_notebook && D.dig) return this.ilkaRim();          // (and waits at the dig before that)
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
    const g = this.game, f = this.f, D = g.regions?.built('desert'), h = g.hero;   // (LAZY-REGIONS: read each frame: never builds)
    if (this.isCur() && g.room?.id === 'butemple' && f.c4_seals3 && !f.c4_carving && this.T) consider(dist(this.T.carving.x, this.T.carving.z), 2.2, { kind: 'c4carve', label: 'p_carving' });
    if (!this.isCur() || !this.inD()) return;
    // the wind-pump: listen at the tower while it is jammed; push the shaken joint home while it sprays
    const pu = D.pump;
    if (f.c4_started && pu.state === 'jammed') consider(dist(pu.x, pu.z), 3.7, { kind: 'c4listen', label: 'p_listen' });
    if (pu.state === 'leak') consider(dist(pu.joint.x, pu.joint.z), 1.5, { kind: 'c4joint', label: 'p_push' });
    if (f.c4_heskAsk && !f.c4_rope) consider(dist(D.rope.x, D.rope.z), 1.4, { kind: 'c4rope', label: 'p_rope' });
    if (f.c4_ilka && !f.c4_notebook) consider(dist(D.post.desk.x, D.post.desk.z), 1.5, { kind: 'c4desk', label: 'p_desk' });
    if (!f.c4_digOpen) consider(dist(D.dig.gate.x, D.dig.gate.z), 1.8, { kind: 'c4gate', label: 'p_code' });
    // the carving over the temple's door (five vents breathing), from the bottom of the dig
    if (f.c4_digOpen && !f.c4_seals3 && h.pos.y < D.dig.bottomY + 1) consider(dist(D.dig.carvings.x, D.dig.carvings.z), 1.6, { kind: 'c4lintel', label: 'p_carving' });
  }
  // the temple: its gate at the bottom of the dig, once the seals are open
  doors() {
    const D = this.game.regions.built('desert');   // (a door on Desert Island: once it is built)
    if (this.f.c4_seals3 && D?.dig?.door && this.game.regions.has('butemple')) return [{ region: 'desert', x: D.dig.door.x, z: D.dig.door.z, r: 1.3, room: 'butemple' }];
    return [];
  }
  exitTo(to) {
    const D = to === 'bu-out' ? this.D : null;
    if (to === 'bu-out' && D) { const c = D.dig.carvings; return { room: 'desert', x: D.dig.x, z: D.dig.z, a: Math.atan2(D.dig.x - c.x, D.dig.z - c.z) }; }   // (out at the middle of the dig floor, clear of the gate)
    return null;
  }
  interact(it) {
    const g = this.game, f = this.f, D = g.regions?.built('desert');   // (LAZY-REGIONS: its things exist only once built)
    switch (it.kind) {
      case 'c4rope':
        f.c4_rope = true; D.rope.setVisible(false); g.audio.play('chest'); g.hud.toast('c4_toast_rope');
        this.chain([['hero', 'c4_rope_got']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c4desk':
        f.c4_notebook = true; g.audio.play('chest'); g.hud.toast('c4_toast_notebook');
        this.story.refreshCast();   // (Ilka goes to wait at the dig)
        this.chain([['hero', 'c4_desk_1'], ['hero', 'c4_dallan_note']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c4gate':
        // without the code he only sees the worn keys; with the notebook he enters it himself
        if (!f.c4_notebook) { this.chain([['hero', 'c4_gate_locked']], () => { if (!f.c4_worn) { f.c4_worn = true; g.save(false); } }); return true; }
        g.openMenu('c4_keypad', CODES.map((key) => ({ key })), (it) => this.enterCode(it.key));
        return true;
      case 'c4listen': {
        const key = f.c4_gearMiss ? 'c4_listen_miss' : f.c4_sani ? 'c4_listen_sani' : 'c4_listen_1';
        this.chain([['hero', key]], () => { D.pump.gustNow(); if (!f.c4_listened) { f.c4_listened = true; g.updateObjective(); g.save(false); } });
        return true;
      }
      case 'c4joint':
        g.hero.act('use', 0.8, () => { if (!f.c4_joint) this.fixJoint(); }, 0.4);
        return true;
      case 'c4lintel': this.chain([['hero', 'c4_lintel']], () => { f.c4_lintel = true; g.save(false); }); return true;
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
      case 'dkid': case 'dtrader': { const l = this.keshLines(id); return l.length ? c(l, () => g.updateObjective()) : false; }
      case 'weaver': return c([['weaver', f.c4_pump ? 'c4_weaver_2' : 'c4_weaver_1']]);
      case 'tarra':
        // (the pump started before she asked: straight to her trust)
        if (!f.c4_pumpTask && f.c4_pump) return c([['tarra', 'c4_tarra_early'], ['hero', 'c4_tw_tarra1'], ['tarra', 'c4_tarra_4'], ['tarra', 'c4_tarra_5']], () => { f.c4_pumpTask = true; f.c4_trust = true; g.updateObjective(); g.save(false); });
        if (!f.c4_pumpTask) return c([['tarra', 'c4_tarra_1'], ['hero', 'c4_tw_tarra1'], ['tarra', 'c4_tarra_2'], ['tarra', f.c4_gear1 ? 'c4_tarra_leak' : 'c4_tarra_2b']], () => { f.c4_pumpTask = true; g.updateObjective(); g.save(false); });
        if (!f.c4_pump) return c([['tarra', f.c4_gear1 ? 'c4_tarra_leak' : 'c4_tarra_wait']]);
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
        if (!f.c4_notebook) return c([['ilka', 'c4_ilka_wait']]);
        // at the dig: a hint that grows with his mistakes, never more than the next step
        if (!f.c4_digOpen) return c([['ilka', 'c4_ilka_dig']]);
        if (!f.c4_bottom) return c([['ilka', 'c4_ilka_down']]);
        return c([['ilka', f.c4_coldHits ? 'c4_ilka_h2' : 'c4_ilka_h1']]);
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

  // ---------------------------------------------------------------- the ball: the pump's gears and the dig's discs
  ballHit(p) {
    const g = this.game, f = this.f;
    if (!this.isCur() || !this.inD()) return false;
    // the pump (from his arrival on: he may fix it before Tarra asks): the jammed gear frees, a sound one rings. The
    // gears sit close together, so the nearest one the ball reaches is the one struck
    if (f.c4_started && !f.c4_gear1) {
      let tg = null, bd = 1e9;
      for (const t of g.room.ballTargets) {
        if (t.gear == null && t.gearOk == null) continue;
        const d = Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z);
        if (d <= (t.r || 0.8) + 0.15 && d < bd) { bd = d; tg = t; }
      }
      if (tg?.gear != null) { tg.done = true; this.freeGear(); return true; }
      if (tg) { this.soundGear(tg); return true; }
    }
    for (const tg of g.room.ballTargets) {
      if (tg.done || tg.gear != null || tg.gearOk != null || Math.hypot(p.x - tg.x, p.y - tg.y, p.z - tg.z) > (tg.r || 0.8) + 0.15) continue;
      // (the discs answer once he is down there and has seen them: a ball thrown at a mite on the terraces above
      // mustn't count a cold disc he hasn't met yet)
      // (a disc is struck on its carved face, from the floor's side, not by a ball grazing past it from behind)
      if ((tg.seal != null || tg.cold != null) && this.D && (p.x - tg.x) * (this.D.dig.x - tg.x) + (p.z - tg.z) * (this.D.dig.z - tg.z) < 0) continue;
      if (tg.seal != null && f.c4_digOpen && f.c4_bottom) { tg.done = true; this.openSeal(tg.seal); return true; }
      if (tg.cold != null && f.c4_bottom && !f.c4_seals3) { this.coldHit(tg); return true; }
    }
    return false;
  }
  // the jammed gear knocked loose (its flag is c4_gear1, as in older saves): the train turns, and the water sprays
  // out at the joint the tremors shook apart
  freeGear() {
    const g = this.game, f = this.f, D = this.D, J = D.pump.gears[D.pump.jam];
    f.c4_gear1 = true;
    D.pump.setState(f.c4_joint ? 'running' : 'leak');
    g.audio.play('clang'); g.audio.play('chest'); g.particles.burst(J.x + J.nx * 0.25, J.y, J.z + J.nz * 0.25, '#e8c890', 24, 2.8);
    this.chain([['narrator', 'c4_gear_free'], ['hero', 'c4_leak']], () => { g.updateObjective(); g.save(false); });
  }
  // a sound gear struck while the train is held: it rings and swings back, nothing more (a line, then a toast)
  soundGear(tg) {
    const g = this.game, f = this.f, G = this.D.pump.gears[tg.gearOk];
    G.kick(); g.audio.play('clang'); g.particles.burst(G.x + G.nx * 0.2, G.y, G.z + G.nz * 0.2, '#fff0c0', 6, 1.4);
    f.c4_gearMiss = (f.c4_gearMiss || 0) + 1;
    const done = () => { g.updateObjective(); g.save(false); };
    if (f.c4_gearMiss === 1) this.chain([['hero', 'c4_gear_ok']], done);
    else { g.hud.toast('c4_toast_gearok'); done(); }
  }
  fixJoint() {
    const g = this.game, f = this.f, D = this.D;
    f.c4_joint = true; f.c4_pump = true; D.pump.setState('running');
    g.audio.play('clunk'); g.audio.play('waterRun'); g.audio.play('rumble');
    this.chain([['narrator', 'c4_pump_runs']], () => { g.updateObjective(); g.save(false); });
  }
  // a gust at the jammed pump: sand and a few sparks from the held gear; the clacks and the grind within earshot
  gust() {
    const g = this.game, D = this.D, P = D.pump, h = g.hero;
    if (!this.isCur() || !this.inD() || P.state !== 'jammed') return;
    const d = Math.hypot(h.pos.x - P.x, h.pos.z - P.z);
    if (d > 45) return;
    const J = P.gears[P.jam];
    const ox = J.x + J.nx * 0.2, oz = J.z + J.nz * 0.2;
    g.particles.burst(ox, J.y - 0.4, oz, '#d8b878', 12, 1.4);   // (sand from its lower teeth)
    g.particles.burst(ox, J.y + 0.45, oz, '#ffd060', 4, 2.4);   // (and sparks off the top)
    if (d < 18 && g.state === 'play') { g.audio.play('gearClack'); g.audio.play('grind'); }   // (not positional: only near, or it would beat over all Kesh)
  }
  // the gate's keypad: three orders of the worn keys; the notebook says which
  enterCode(key) {
    const g = this.game, f = this.f, D = this.D;
    if (key === 'c4_code_417') {
      f.c4_digOpen = true; D.dig.gate.open(); g.audio.play('select'); g.audio.play('door');
      this.story.refreshCast();
      this.chain([['hero', 'c4_gate_open']], () => { g.updateObjective(); g.save(false); });
      return;
    }
    f.c4_codeTries = (f.c4_codeTries || 0) + 1;
    D.dig.gate.flash(false); g.audio.play('deny');
    const done = () => { g.updateObjective(); g.save(false); };
    if (f.c4_codeTries === 1) this.chain([['hero', 'c4_code_wrong']], done);
    else { g.hud.toast('c4_toast_code'); done(); }
  }
  // what Brosk and Sani add about the pump (Kesh's own talk asks first: story/kesh.js)
  keshLines(id) {
    const f = this.f;
    if (!this.isCur() || !f.c4_started) return [];
    if (id === 'dtrader') {
      if (!f.c4_gear1) { const first = !f.c4_brosk; f.c4_brosk = true; this.game.updateObjective(); return first ? [['dtrader', 'c4_trader_1'], ['dtrader', 'c4_trader_1b']] : [['dtrader', 'c4_trader_1b']]; }
      if (!f.c4_pump) return [['dtrader', 'c4_trader_leak']];
      if (!f.c4_broskSaid) { f.c4_broskSaid = true; return [['dtrader', 'c4_trader_2']]; }
      return [];
    }
    if (id === 'dkid') {
      if (!f.c4_gear1) { const first = !f.c4_sani; f.c4_sani = true; this.game.updateObjective(); return [...(first ? [['dkid', 'c4_kid_1']] : []), ['dkid', f.c4_gearMiss ? 'c4_kid_pump2' : 'c4_kid_pump']]; }
      if (!f.c4_pump) return [['dkid', 'c4_kid_leak']];
      return [['dkid', 'c4_kid_2']];
    }
    return [];
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
    } else { g.updateObjective(); g.save(false); }   // (the count on the HUD follows each disc)
  }
  // a cold disc: a dull thud, and any warm disc already open grinds shut again (the door wants live heat only)
  coldHit(tg) {
    const g = this.game, f = this.f, D = this.D;
    const open = [0, 1, 2].filter((i) => f['c4_seal' + i]);
    for (const i of open) { f['c4_seal' + i] = false; D.dig.seals[i].setOn(false); }
    for (const t of g.room.ballTargets) if (t.seal != null) t.done = false;
    f.c4_coldHits = (f.c4_coldHits || 0) + 1;
    g.audio.play('hitStone'); g.particles.burst(tg.x, tg.y, tg.z, '#bfb2a0', 14, 1.6);
    if (open.length) { g.audio.play('rumble'); g.camRig.shake(0.12); }
    const key = open.length ? 'c4_cold_shut' : 'c4_cold';
    const done = () => { g.updateObjective(); g.save(false); };
    if (f.c4_coldHits === 1) this.chain([['hero', key]], done);
    else { g.hud.toast(open.length ? 'c4_toast_shut' : 'c4_toast_cold'); done(); }
  }
  readCarving() {
    const g = this.game, f = this.f;
    this.chain([['hero', 'c4_carving_1'], ['ilka', 'c4_ilka_c1'], ['ilka', 'c4_ilka_c2'], ['hero', 'c4_tw_cold'], ['hero', 'c4_tw_c1'], ['ilka', 'c4_ilka_c3']], () => {
      f.c4_carving = true;
      this.story.refreshCast();
      this.chain([['dallan', 'c4_dallan_1'], ['ilka', 'c4_ilka_d1'], ['dallan', 'c4_dallan_2'], ['hero', 'c4_tw_d1'], ['dallan', 'c4_dallan_3'], ['ilka', 'c4_ilka_end']], () => {
        f.c4_done = true;
        g.save(false);
        g.startTransition(() => this.story.nextChapter(), this.story.nextAreas());
      });
    });
  }

  onEnterRoom(id) {
    if (id === 'butemple' && this.isCur() && !this.f.c4_templeSeen) { this.f.c4_templeSeen = true; this.chain([['hero', 'c4_temple_in']], () => this.game.updateObjective()); }
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, f = this.f, D = g.regions?.built('desert');   // (LAZY-REGIONS: a per-frame read never builds the area)
    if (!this.isCur() || !D) return;
    D.pump.onGust ??= () => this.gust();
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
      f.c4_digSeen = true; this.chain([['hero', 'c4_dig_in']]);
    }
    // at the bottom: the warm crack beside the last ramp (the rule, shown safely), then the five discs
    if (f.c4_digOpen && !f.c4_seals3 && g.state === 'play' && this.inD() && h.pos.y < D.dig.bottomY + 0.9) {
      const cr = D.dig.crack;
      // (the last ramp's foot is ~3.6 m from the crack)
      if (!f.c4_crack && cr && Math.hypot(h.pos.x - cr.x, h.pos.z - cr.z) < 6.5) { f.c4_crack = true; this.chain([['hero', 'c4_crack']], () => g.save(false)); }
      else if (!f.c4_bottom && Math.hypot(h.pos.x - D.dig.x, h.pos.z - D.dig.z) < 5.6) { f.c4_bottom = true; this.chain([['hero', 'c4_bottom']], () => { g.updateObjective(); g.save(false); }); }
    }
  }

  applyFlags() {
    if (!this.reached()) return;
    // (LAZY-REGIONS: the flags are set now; what they change in an area goes on it when it is built — at once if it
    //  is: regions.whenBuilt. A load builds the save's area and its chapter's first.)
    this.game.regions.whenBuilt('desert', () => this.applyDesert());
  }
  applyDesert() {
    const f = this.f, D = this.D;
    // the pump (older saves: c4_gear1 is the jammed gear's flag, c4_gear0/2 no longer matter; c4_pump means it runs)
    D.pump.setState(f.c4_pump ? 'running' : f.c4_gear1 ? 'leak' : 'jammed');
    for (const tg of D.ballTargets) if (tg.gear != null) tg.done = !!(f.c4_gear1 || f.c4_pump);
    if (f.c4_pump) D.oasis.setLevel(1);
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
    if (f.c4_digOpen && f.c4_bottom) return this.goal('c4_obj_seals', { n: this.seals() }) + (f.c4_coldHits ? this.sub(false, 'c4_sub_warm') : '');
    if (f.c4_digOpen) return this.goal('c4_obj_bottom');
    if (f.c4_notebook) return this.goal('c4_obj_dig');
    if (f.c4_ilka) return this.goal('c4_obj_notebook') + this.sub(false, 'c4_sub_storm');
    if (f.c4_trust) return this.goal('c4_obj_ilka') + this.sub(!!f.c4_rope, f.c4_heskAsk ? 'c4_sub_rope' : 'c4_sub_hesk');
    if (f.c4_pump) return this.goal('c4_obj_tarra');
    if (f.c4_pumpTask) return this.goal('c4_obj_pump') + (f.c4_gear1 ? this.sub(false, 'c4_sub_leak') : f.c4_sani || f.c4_listened ? this.sub(false, 'c4_sub_grind') : '');
    return this.goal('c4_obj_find');
  }
  items() {
    const f = this.f, out = [];
    if (f.c4_rope && !f.c4_rode) out.push({ id: 'rope', icon: 'rope' });
    if (f.c4_notebook && !f.c4_done) out.push({ id: 'notebook', icon: 'leaflet' });
    return out;
  }
  // The chapter's steps, each shown once the one before is done; after a shown step, the facts he has heard or seen
  // that belong to it (recalled, never the answer): they never hold back or reveal a step themselves
  journal() {
    const f = this.f, fact = (on, key) => (on ? [{ key, done: true }] : []);
    const steps = [
      { key: 'c4_j_arrive', done: !!f.c4_started, facts: [...fact(f.c4_brosk, 'c4_j_brosk'), ...fact(f.c4_sani, 'c4_j_sani'), ...fact(f.c4_gearMiss, 'c4_j_gearok'), ...fact(f.c4_gear1 && !f.c4_pump, 'c4_j_leak'), ...fact(f.c4_worn && !f.c4_notebook, 'c4_j_worn')] },
      { key: 'c4_j_pump', done: !!f.c4_trust },
      { key: 'c4_j_ilka', done: !!f.c4_ilka },
      { key: 'c4_j_notebook', done: !!f.c4_notebook, facts: [...fact(f.c4_codeTries, 'c4_j_code'), ...fact(f.c4_crack, 'c4_j_crack'), ...fact(f.c4_bottom, 'c4_j_discs'), ...fact(f.c4_coldHits, 'c4_j_cold')] },
      { key: 'c4_j_carving', done: !!f.c4_carving },
      { key: 'c4_j_dallan', done: !!f.c4_done },
    ];
    const out = [];
    // (G1-NARR: a step is listed once it has happened, in the past tense; the facts of the step in progress show as they are found)
    steps.forEach((l, i) => { if (i === 0 || steps[i - 1].done) out.push(...(l.done ? [{ key: l.key, done: true }] : []), ...(l.facts || [])); });
    return out;
  }
}
