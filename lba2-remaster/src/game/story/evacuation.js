// Chapter 8 — "Evacuation" (Citadel Island, changed).
//
// Twinsen comes home to an island being evacuated by the project's list: ships in the harbour, the heat
// posts dark, the square fenced. Zoé's plan: the town goes underground, the hill families to the lighthouse
// cliffs. Gilbert knows FunFrock's two shelters (a lever by the old cistern in the station yard, guarded by
// crowd-control drones; a rusted hatch wheel on the depot bunker — the ball), Mira gives water and the key
// to FunFrock's valve control room, Pippa sends supplies. Zoé (playable) brings the three hill farms to the
// lighthouse and finds that its transmitter relays to Zeelich's council chamber. In the station's control
// room Vesk announces three days to full depth. Twinsen boards a project ship for Zeelich. → chapter 9.
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import { tm, pm, bbox, cyl, mesh } from '../kit.js';
import '../text/ch8.js';

// (the farmers work the fields south of town; the landing and the fort on the northern plateau)
const FARMS = [{ id: 'farmer1', char: 'farmerA', x: -50, z: 30, a: 0.4 }, { id: 'farmer2', char: 'farmerB', x: -30, z: 45, a: -1.2 }, { id: 'farmer3', char: 'farmerC', x: -60, z: 55, a: 2.6 }];
const LANDING = { x: -58, z: -60 }, GATHER = { x: -66, z: -55 };
// (the lever and its cistern stand on the yard's floor, clear of the station's tanks as rebuilt to the original layout)
const FORT = { door: { x: -50, z: -71 }, lever: { x: -33, z: -70 } };
const DEPOT = { door: { x: -90, z: -72 } };

export class Evacuation extends ChapterBase {
  get W() { return this.game.world; }
  outdoors() { return !this.game.room; }
  farmsDone() { return FARMS.filter((p) => this.f['c8_' + p.id]).length; }
  townDone() { const f = this.f; return !!(f.c8_gilbert && f.c8_fort && f.c8_depot && f.c8_mira && f.c8_pippa); }

  npcDefs() {
    return FARMS.map((p) => ({ id: p.id, name: 'n_' + p.id, char: p.char, color: '#e8d0a0', x: p.x, z: p.z, angle: p.a }));
  }
  enemyDefs() {
    const P = [[-38, -75], [-30, -75], [-30, -69], [-38, -69]];
    return [
      { id: 'cc1', kind: 'drone', group: 'ccyard', x: P[0][0], z: P[0][1], patrol: P, wp: 1, when: (f) => this.isCur(f) && !f.c8_fort },
      { id: 'cc2', kind: 'drone', group: 'ccyard', x: P[2][0], z: P[2][1], patrol: P, wp: 3, when: (f) => this.isCur(f) && !f.c8_fort },
      // Vesk's crowd-control squad: a Quetch guard and a Grobo guard
      { id: 'ccg1', kind: 'guard', group: 'ccyard', x: P[1][0], z: P[1][1], patrol: [...P].reverse(), wp: 0, when: (f) => this.isCur(f) && !f.c8_fort },
      { id: 'ccclone', kind: 'fclone', group: 'ccyard', x: P[0][0], z: P[0][1], patrol: [...P], wp: 1, when: (f) => this.isCur(f) && !f.c8_fort },
      { id: 'ccdog', kind: 'gdog', coat: 'grey', group: 'ccyard', x: P[2][0], z: P[2][1], patrol: [...P].reverse(), wp: 1, when: (f) => this.isCur(f) && !f.c8_fort },
      { id: 'ccg2', kind: 'guardG', group: 'ccyard', x: P[3 % P.length][0], z: P[3 % P.length][1], patrol: [P[3 % P.length]], when: (f) => this.isCur(f) && !f.c8_fort },
    ];
  }

  // ---------------------------------------------------------------- props on Citadel for this chapter
  decorate() {
    const g = this.game, W = this.W, root = W.root, P = g.physics;
    const H = (x, z) => W.H(x, z);
    const grp = new THREE.Group(); grp.visible = false; root.add(grp);
    this.props = grp; this.cols = [];
    const hazard = tm('hazard'), concrete = tm('concrete', { color: '#c8c4bc' }), rust = pm('#8a5038', 0.8, { metalness: 0.3 }), iron = pm('#4a4c54', 0.5, { metalness: 0.5 });
    // the fence around the square (project barriers)
    const V = W.well;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, x = V.x + Math.cos(a) * 5.6, z = V.z + Math.sin(a) * 5.6;
      const b = mesh(grp, bbox(2.7, 0.9, 0.18, 0.04, 0.6), hazard, x, H(x, z) + 0.75, z, -a + Math.PI / 2);
      void b;
      for (const s of [-1, 1]) mesh(grp, cyl(0.05, 0.05, 1.2, 6, 0), iron, x + Math.sin(a) * s * 1.2, H(x, z) + 0.6, z - Math.cos(a) * s * 1.2);
      this.cols.push(P.add({ type: 'box', x, z, hw: 1.35, hd: 0.15, rot: -a + Math.PI / 2, top: H(x, z) + 1.2, noStand: true, seeThrough: true, enabled: false }));
    }
    // two bunker entrances: concrete blocks with a steel door, half in the ground
    const bunker = (x, z, ry) => {
      const k = new THREE.Group(); k.position.set(x, H(x, z) - 0.3, z); k.rotation.y = ry; grp.add(k);
      mesh(k, bbox(4.2, 2.8, 3.0, 0.2, 2.4), concrete, 0, 1.4, 0);
      const door = mesh(k, bbox(1.8, 2.1, 0.16, 0.03, 1), rust, 0, 1.15, 1.55);
      mesh(k, bbox(2.4, 0.35, 0.6, 0.05, 1), concrete, 0, 2.5, 1.6);
      this.cols.push(P.add({ type: 'box', x, z, hw: 2.1, hd: 1.5, rot: ry, top: H(x, z) + 2.5, enabled: false }));
      return { k, door, open() { door.position.x = 1.7; door.rotation.y = 1.4; } };
    };
    this.fortDoor = bunker(FORT.door.x, FORT.door.z, -Math.PI / 2);
    this.depotDoor = bunker(DEPOT.door.x, DEPOT.door.z, -Math.PI / 2);
    // the hatch wheel up on the depot bunker's frame (a ball target)
    const wy = H(DEPOT.door.x, DEPOT.door.z) + 2.95;
    this.wheel = mesh(grp, new THREE.TorusGeometry(0.42, 0.07, 6, 18), pm('#b88a3a', 0.4, { metalness: 0.6 }), DEPOT.door.x - 1.7, wy, DEPOT.door.z, Math.PI / 2);
    this.wheelSpot = { x: DEPOT.door.x - 1.7, y: wy, z: DEPOT.door.z };
    // the cistern lever in the station yard
    const ly = H(FORT.lever.x, FORT.lever.z);
    mesh(grp, cyl(1.2, 1.3, 0.8, 16, 0), tm('stone', { color: '#a8a090' }), FORT.lever.x + 1.6, ly + 0.4, FORT.lever.z);
    this.lever = mesh(grp, cyl(0.06, 0.06, 1.2, 6, 0), iron, FORT.lever.x, ly + 0.6, FORT.lever.z);
    this.cols.push(P.add({ type: 'cyl', x: FORT.lever.x + 1.6, z: FORT.lever.z, r: 1.3, top: ly + 0.8, noStand: true, enabled: false }));
    // hay and a cart at each farm
    for (const p of FARMS) { mesh(grp, cyl(0.7, 0.8, 1.1, 12, 0), pm('#e8c860', 0.95), p.x + 2, H(p.x + 2, p.z + 1) + 0.55, p.z + 1); }
  }
  showProps(on) {
    if (this.props) this.props.visible = !!on;
    for (const c of this.cols || []) c.enabled = !!on;
  }

  place(id) {
    const f = this.f, W = this.W;
    const farm = FARMS.find((p) => p.id === id);
    if (farm) {
      if (!this.reached()) return null;
      const k = FARMS.indexOf(farm);
      return f['c8_' + id] ? { x: GATHER.x + k * 1.6 - 1.6, z: GATHER.z + 1, a: Math.PI } : { x: farm.x, z: farm.z, a: farm.a };
    }
    if (!this.reached()) return undefined;
    const V = W.well, S = W.stall, Q = W.pierStart; // (the quay, where the pier starts)
    switch (id) {
      case 'zoe':
        if (f.c8_zoeStart && !f.c8_zoeDone) return null;
        if (f.c8_zoeDone) return { x: GATHER.x - 1, z: GATHER.z - 1.5, a: 0 };
        return undefined;     // (at home, as usual)
      case 'gilbert': return f.c8_gilbert ? { x: FORT.door.x - 2, z: FORT.door.z + 1.5, a: -Math.PI / 2 } : { x: V.x + 3.5, z: V.z + 8.0, a: Math.PI };
      case 'pippa': return S ? { x: S.x, z: S.z, a: S.a } : undefined;
      case 'tim': return f.c8_pippa ? { x: DEPOT.door.x - 2.4, z: DEPOT.door.z + 1.6, a: 0 } : { x: Q.x + 2.5, z: Q.z + 2, a: Math.PI / 2 };
      case 'lulu': return f.c8_pippa ? { x: DEPOT.door.x - 2.4, z: DEPOT.door.z + 2.6, a: 0 } : { x: Q.x + 2.5, z: Q.z + 3.2, a: Math.PI / 2 };
      case 'xil': return { x: Q.x + 4.5, z: Q.z - 0.5, a: -Math.PI / 2 };
      case 'worker': return { x: Q.x + 6.5, z: Q.z + 0.2, a: -Math.PI / 2 };
      case 'doran': case 'vesk': case 'hesk': return null;
      case 'guard': return { x: Q.x - 0.5, z: Q.z, a: -Math.PI / 2 };
    }
    return undefined;
  }

  begin() {
    const g = this.game, W = this.W;
    if (g.room) g.exitRoom({ x: LANDING.x, z: LANDING.z, a: Math.PI }, true);
    else { g.hero.pos.set(LANDING.x, g.physics.groundAt(LANDING.x, LANDING.z), LANDING.z); }
    g.hero.swapBody?.('twinsen'); g.hero.hasBall = true;
    W.station?.setActive?.(false);
    W.ferry?.setVisible?.(true);
    this.showProps(true);
    this.story.refreshCast();
    this.chain([['narrator', 'c8_narr'], ['radio', 'c8_hesk_1'], ['hero', 'c8_tw_1']], () => { this.f.c8_started = true; g.updateObjective(); g.save(false); });
  }

  doors() { return this.story.townDoors(); }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const f = this.f, g = this.game;
    if (!this.isCur() || !this.outdoors()) return;
    if (f.c8_gilbert && !f.c8_fort) consider(dist(FORT.lever.x, FORT.lever.z), 1.6, { kind: 'c8lever', label: 'p_lever' });
    if (f.c8_gilbert && !f.c8_depot) consider(dist(DEPOT.door.x - 2.2, DEPOT.door.z), 2.2, { kind: 'c8hatch', label: 'p_shelter' });
    if (f.c8_relay && f.c8_vesk) { const F = this.W.pierStart; consider(dist(F.x - 6, F.z), 3.0, { kind: 'c8ship', label: 'p_board' }); }
    void g;
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'c8lever':
        h.act('use', 1.0, () => {
          f.c8_fort = true; this.lever.rotation.z = 1.0; this.fortDoor.open(); g.audio.play('door'); g.camRig.shake(0.2);
          this.story.refreshCast();
          this.chain([['hero', 'c8_lever_1'], ['hero', 'c8_shelter_fort']], () => this.progress());
        }, 0.6);
        return true;
      case 'c8hatch': this.chain([['hero', 'c8_wheel_hint']]); return true;
      case 'c8ship':
        f.c8_done = true; g.save(false);
        g.startTransition(() => this.story.nextChapter());
        return true;
    }
    return false;
  }
  ballHit(p) {
    const g = this.game, f = this.f, w = this.wheelSpot;
    if (!this.isCur() || !this.outdoors() || !f.c8_gilbert || f.c8_depot || !w) return false;
    if (Math.hypot(p.x - w.x, p.y - w.y, p.z - w.z) < 1.0) {
      f.c8_depot = true; this.wheel.rotation.x += 2; this.depotDoor.open(); g.audio.play('door');
      this.chain([['hero', 'c8_shelter_depot']], () => this.progress());
      return true;
    }
    return false;
  }
  ballTargets() {
    const f = this.f, w = this.wheelSpot;
    return this.isCur() && this.outdoors() && f.c8_gilbert && !f.c8_depot && w ? [{ x: w.x, y: w.y, z: w.z }] : [];
  }
  progress() { this.game.updateObjective(); this.game.save(false); }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    const farm = FARMS.find((p) => p.id === id);
    if (farm) {
      if (f.c8_zoeStart && !f.c8_zoeDone && !f['c8_' + id]) return c([[id, 'c8_' + ['f1', 'f2', 'f3'][FARMS.indexOf(farm)] + '_1']], () => { f['c8_' + id] = true; g.startTransition(() => { this.story.refreshCast(); this.progress(); }); });
      return c([[id, 'c8_' + ['f1', 'f2', 'f3'][FARMS.indexOf(farm)] + '_1']]);
    }
    switch (id) {
      case 'zoe':
        if (!f.c8_home) return c([['zoe', 'c8_zoe_1'], ['arthur', 'c8_ar_1'], ['zoe', 'c8_zoe_2'], ['hero', 'c8_tw_z1'], ['zoe', 'c8_zoe_3'], ['arthur', 'c8_ar_2'], ['zoe', 'c8_zoe_4']], () => { f.c8_home = true; this.progress(); });
        if (this.townDone() && !f.c8_zoeStart) return c([['hero', 'c8_tw_z2'], ['zoe', 'c8_zoe_5']], () => this.startZoe());
        return c([['zoe', 'c8_zoe_4']]);
      case 'arthur': return c([['arthur', 'c8_ar_2']]);
      case 'gilbert':
        if (f.c8_home && !f.c8_gilbert) return c([['gilbert', 'c8_gil_1'], ['hero', 'c8_tw_g1'], ['gilbert', 'c8_gil_2'], ['gilbert', 'c8_gil_3']], () => { f.c8_gilbert = true; this.story.refreshCast(); this.progress(); });
        return c([['gilbert', f.c8_gilbert ? 'c8_gil_after' : 'c8_gil_1']]);
      case 'mira':
        if (f.c8_home && !f.c8_mira) return c([['mira', 'c8_mira_1'], ['hero', 'c8_tw_m1'], ['mira', 'c8_mira_2']], () => { f.c8_mira = true; g.hud.toast('c8_toast_key'); this.progress(); });
        return c([['mira', f.c8_mira ? 'c8_mira_after' : 'c8_mira_1']]);
      case 'pippa':
        if (f.c8_home && !f.c8_pippa) { this.chain([['pippa', 'c8_pippa_1']], () => { f.c8_pippa = true; this.story.refreshCast(); this.progress(); }); return true; }
        this.chain([['pippa', 'c8_pippa_after']], () => g.openShop()); return true;
    }
    return false;
  }

  // Zoé's part: the hill farms, then the lighthouse
  startZoe() {
    const g = this.game, f = this.f, h = g.hero;
    f.c8_zoeStart = true;
    this.saved = { behaviour: h.behaviour };
    g.startTransition(() => {
      // out of the front door (a fixed point here ended up inside the square's barrier ring after the Citadel rebuild)
      if (g.room) g.exitRoom(this.story.exitTo('outdoor'), true);
      h.swapBody('zoe'); h.hasBall = false; h.noBehaviours = true; h.behaviour = 'normal'; g.hud.behaviour('normal');
      this.story.refreshCast();
      g.hud.toast('c8_toast_zoe');
      this.progress();
    });
  }
  endZoe() {
    const g = this.game, f = this.f, h = g.hero;
    this.chain([['zoe', 'c8_zoe_lh'], ['zoe', 'c8_zoe_lh2'], ['zoe', 'c8_zoe_lh3']], () => {
      f.c8_zoeDone = true; f.c8_relay = true;
      g.startTransition(() => {
        h.swapBody('twinsen'); h.hasBall = true; h.noBehaviours = false; h.behaviour = this.saved?.behaviour || 'normal'; g.hud.behaviour(h.behaviour);
        const st = this.W.station;
        if (st) { const d = st.control.door; h.pos.set(d.x, g.physics.groundAt(d.x, d.z + 3), d.z + 3); h.angle = Math.PI; }
        this.story.refreshCast();
        this.progress();
      });
    });
  }
  onEnterRoom(id) {
    const g = this.game, f = this.f;
    if (!this.isCur()) return;
    if (id === 'control' && f.c8_relay && !f.c8_vesk) {
      this.chain([['narrator', 'c8_control_1'], ['vesk', 'c8_vesk_1'], ['hero', 'c8_tw_c1'], ['zoeradio', 'c8_zoe_radio'], ['hero', 'c8_tw_c2']], () => { f.c8_vesk = true; this.progress(); });
    }
    void g;
  }
  update() {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.isCur()) return;
    if (f.c8_zoeStart && !f.c8_zoeDone && this.farmsDone() >= 3 && this.outdoors() && g.state === 'play' && !this.ending && Math.hypot(h.pos.x - GATHER.x, h.pos.z - GATHER.z) < 6) { this.ending = true; this.endZoe(); }
  }
  applyFlags() {
    const f = this.f, W = this.W;
    // (the fences and the open shelters stay through chapter 10, while the town waits underground)
    const on = this.isCur() || this.story.cur?.key === 'network';
    this.showProps(on);
    if (!on) return;
    W.station?.setActive?.(false);
    W.ferry?.setVisible?.(true);
    if (f.c8_fort) { this.fortDoor.open(); this.lever.rotation.z = 1.0; }
    if (f.c8_depot) this.depotDoor.open();
    // a save during Zoé's run resumes before it
    if (f.c8_zoeStart && !f.c8_zoeDone) { f.c8_zoeStart = false; for (const p of FARMS) f['c8_' + p.id] = false; }
  }
  objective() {
    const f = this.f;
    if (!f.c8_started) return '';
    if (f.c8_vesk) return this.goal('c8_obj_ship');
    if (f.c8_relay) return this.goal('c8_obj_control');
    if (f.c8_zoeStart) { const n = this.farmsDone(); return n >= 3 ? this.goal('c8_obj_lighthouse') : this.goal('c8_obj_farms', { n }); }
    if (this.townDone()) return this.goal('c8_obj_zoe');
    if (f.c8_home) return this.goal('c8_obj_shelters') + this.sub(!!f.c8_gilbert, 'c8_sub_gilbert') + (f.c8_gilbert ? this.sub(!!f.c8_fort, 'c8_sub_fort') + this.sub(!!f.c8_depot, 'c8_sub_depot') : '') + this.sub(!!f.c8_mira, 'c8_sub_mira') + this.sub(!!f.c8_pippa, 'c8_sub_pippa');
    return this.goal('c8_obj_home');
  }
  items() { return this.f.c8_mira ? [{ id: 'valvekey', icon: 'key' }] : []; }
  journal() {
    const f = this.f;
    return [
      { key: 'c8_j_home', done: !!f.c8_home },
      { key: 'c8_j_shelters', done: this.townDone() },
      { key: 'c8_j_farms', done: !!f.c8_zoeDone },
      { key: 'c8_j_relay', done: !!f.c8_relay },
      { key: 'c8_j_vesk', done: !!f.c8_vesk },
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}
