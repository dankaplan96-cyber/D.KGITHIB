// Chapter 6 — "The Pass" (the Hamalayi).
//
// FunFrock's glider comes down in the foothills. A dead tree, knocked across the meltwater gorge with the
// ball, is the bridge. In Lhar the ice is melting from below and the village is moving to the old monastery;
// the pass is cut by a rockslide and the rope lift's winch is frozen. The project's own heating station next
// to it has never been switched on: it needs a fuse, which Pim swaps for his kite (frozen to the icefall —
// the ball again). The station thaws the winch. Twinsen winches the villagers up the cliff in two trips,
// fighting off ice mites in between, and Yorna cranks him up last. At the monastery she points him to the
// ridge path and the observatory. → chapter 7 (The Observatory).
//
// The sword: when the lift is ready Yorna gives Twinsen her brother's blade. The platform is moored by a
// frozen rope (cut it with the sword: a safe first use), then the ice mites come up with the first trip.
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import '../text/ch6.js';

const FIRST = ['lhar1', 'lhar2'], SECOND = ['yorna', 'pim', 'lhar3'];

export class Pass extends ChapterBase {
  get M() { return this.game.rooms.hamalayi; }
  inM() { return this.game.room?.id === 'hamalayi'; }
  mitesLeft() { return this.game.enemies.filter((e) => e.def?.id?.startsWith('imite') && e.present && e.alive).length; }

  // the platform's frozen mooring rope (cut with the sword before the first trip)
  decorate() {
    const M = this.M;
    if (!M?.group) return;
    const w = M.lift.winch, gp = M.group.position, gy = this.game.physics.groundAt(w.x + 1.4, w.z - 0.8);
    const g = new THREE.Group(); g.position.set(w.x + 1.4 - gp.x, gy - gp.y, w.z - 0.8 - gp.z); M.group.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: '#6a4a2a', roughness: 0.85 }), rope = new THREE.MeshStandardMaterial({ color: '#c8b890', roughness: 0.9 }), ice = new THREE.MeshStandardMaterial({ color: '#dff4ff', roughness: 0.2, transparent: true, opacity: 0.8 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 8), wood); post.position.y = 0.55; post.castShadow = true; g.add(post);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6), rope); r.position.set(-0.7, 0.75, 0.35); r.rotation.z = 1.25; r.rotation.y = 0.45; g.add(r);
    const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.5, 6), ice); crust.position.set(-0.35, 0.85, 0.18); crust.rotation.z = 1.25; g.add(crust);
    this.rope = { x: w.x + 1.0, z: w.z - 0.6, mesh: r, crust };
  }
  cutRope(silent = false) {
    if (!this.rope) return;
    this.rope.mesh.visible = false; this.rope.crust.visible = false;
    if (silent) return;
    const g = this.game; g.audio.play('break'); g.particles.burst(this.rope.x, this.game.hero.pos.y + 0.8, this.rope.z, '#dff4ff', 16, 3);
  }
  meleeHit(o) {
    const f = this.f, R = this.rope;
    if (!this.isCur() || !R || !f.c6_sword || f.c6_rope || o.hitSet.has(R) || !o.inArc(R.x, R.z, 0.45)) return false;
    o.hitSet.add(R);
    if (!/^slash|^heavy/.test(o.move.anim)) { this.chain([['hero', 'c6_rope_fists']]); return true; }
    f.c6_rope = true; this.cutRope();
    this.chain([['hero', 'c6_rope_cut']], () => { this.game.updateObjective(); this.game.save(false); });
    return true;
  }

  npcDefs() {
    const S = this.M?.npcSpots || {};
    const at = (k) => S[k] || { x: 0, z: 0, a: 0 };
    const def = (id, char, spot, color) => ({ id, name: 'n_' + id, char, color, x: at(spot).x, z: at(spot).z, angle: at(spot).a });
    return [def('yorna', 'yorna', 'yorna', '#ffb090'), def('pim', 'pim', 'pim', '#a0c8ff'), def('lhar1', 'lharMan', 'v1', '#e8c890'), def('lhar2', 'lharWoman', 'v2', '#a8e0c8'), def('lhar3', 'lharElder', 'v3', '#d8c0f0')];
  }
  enemyDefs() {
    const M = this.M;
    if (!M) return [];
    const b = M.lift.bottom;
    return [[-4, 3], [3, 4], [6, 1]].map(([dx, dz], i) => ({ id: 'imite' + i, kind: 'mite', x: b.x + dx, z: b.z + dz, when: (f) => this.isCur(f) && !!f.c6_trip1 && !f.c6_trip2 }));
  }
  place(id) {
    const f = this.f, M = this.M;
    const mine = ['yorna', 'pim', 'lhar1', 'lhar2', 'lhar3'];
    if (!this.reached()) return mine.includes(id) ? null : undefined;
    if (!M) return undefined;
    const S = M.npcSpots, y = M.monastery.yard;
    const yard = (k) => ({ x: y.x - 3 + k * 1.5, z: y.z + (k % 2), a: Math.PI });
    switch (id) {
      case 'hesk': return S.hesk;
      case 'lhar1': return f.c6_trip1 ? yard(0) : S.v1;
      case 'lhar2': return f.c6_trip1 ? yard(1) : S.v2;
      case 'lhar3': return f.c6_trip2 ? yard(2) : S.v3;
      case 'yorna':
        if (f.c6_up) return yard(3);
        if (f.c6_trip2) { const c = M.lift.crank; return { x: c.x, z: c.z, a: Math.PI }; }
        if (f.c6_thawed) { const w = M.lift.winch; return { x: w.x - 2.4, z: w.z + 1.4, a: Math.PI }; }
        return S.yorna;
      case 'pim': return f.c6_trip2 ? yard(4) : S.pim;
    }
    return undefined;
  }

  begin() {
    const g = this.game, M = this.M;
    g.enterRoom('hamalayi', M.landing, true);
    this.story.refreshCast();
    this.chain([['narrator', 'c6_narr'], ['hesk', 'c6_hesk_1'], ['hero', 'c6_tw_1']], () => {
      this.f.c6_started = true; g.updateObjective(); g.save(false);
    });
  }

  interactables(consider, dist) {
    const f = this.f, M = this.M, h = this.game.hero;
    if (!this.isCur() || !this.inM()) return;
    if (f.c6_yorna && !f.c6_heat) consider(dist(M.heatPost.x, M.heatPost.z), 1.8, { kind: 'c6heat', label: f.c6_fuse ? 'p_heat' : 'p_look' });
    if (f.c6_liftReady && !f.c6_trip2 && Math.abs(h.pos.y - M.lift.y0) < 1.2) consider(dist(M.lift.winch.x, M.lift.winch.z), 1.6, { kind: 'c6winch', label: 'p_winch' });
  }
  interact(it) {
    const g = this.game, f = this.f, M = this.M, h = g.hero;
    switch (it.kind) {
      case 'c6heat':
        if (!f.c6_fuse) { this.chain([['hero', 'c6_heat_locked']], () => { f.c6_needFuse = true; g.updateObjective(); }); return true; }
        h.act('use', 0.8, () => {
          f.c6_heat = true; M.heatPost.setOn(true); g.audio.play('mode'); this.thawT = 3.5;
          this.chain([['hero', 'c6_heat_on']], () => { g.updateObjective(); g.save(false); });
        }, 0.5);
        return true;
      case 'c6winch':
        if (!f.c6_rope && f.c6_sword) { this.chain([['hero', 'c6_rope_frozen']]); return true; }
        if (!f.c6_trip1) { this.trip(FIRST, 'c6_trip1', () => { f.c6_trip1 = true; this.story.refreshCast(); this.chain([['hero', 'c6_mites']], () => { g.updateObjective(); g.save(false); }); }); return true; }
        if (this.mitesLeft() > 0) { this.chain([['hero', 'c6_trip_wait']]); return true; }
        this.trip(SECOND, 'c6_trip2', () => { f.c6_trip2 = true; this.story.refreshCast(); this.chain([['yorna', 'c6_yorna_top']], () => { g.updateObjective(); g.save(false); }); });
        return true;
    }
    return false;
  }
  // a trip up the cliff: the riders step onto the platform, it rises, they get off at the top, it comes back down
  trip(ids, line, done) {
    const g = this.game, M = this.M, L = M.lift, pad = L.pad;
    const riders = ids.map((id) => this.npc(id)).filter(Boolean);
    g.startTransition(() => {
      riders.forEach((n, i) => n.placeAt({ x: pad.x - 0.8 + i * 0.8, z: pad.z, a: Math.PI }));
      g.hero.pos.set(L.winch.x, g.physics.groundAt(L.winch.x, L.winch.z), L.winch.z + 0.6);
      this.chain([['hero', line]], () => {
        g.setState('cutscene'); g.cutscene = () => {};
        g.audio.play('door');
        L.ride(true, riders, () => {
          riders.forEach((n, i) => n.placeAt({ x: L.top.x - 0.8 + i * 0.8, z: L.top.z - 1.5, a: Math.PI }));
          L.ride(false, [], () => { g.cutscene = null; g.setState('play'); done(); });
        });
      });
    });
  }
  ballHit(p) {
    const g = this.game, f = this.f, M = this.M;
    if (!this.isCur() || !this.inM()) return false;
    for (const tg of M.ballTargets) {
      if (tg.done || Math.hypot(p.x - tg.x, p.y - tg.y, p.z - tg.z) > (tg.r || 0.8) + 0.2) continue;
      if (tg.tree && f.c6_started) { tg.done = true; f.c6_bridge = true; M.gorge.tree.fell(); g.audio.play('break'); g.camRig.shake(0.3); this.chain([['narrator', 'c6_bridge']], () => { g.updateObjective(); g.save(false); }); return true; }
      if (tg.kite && f.c6_kiteAsk) { tg.done = true; f.c6_kite = true; M.kite.setVisible(false); g.audio.play('bounce'); this.chain([['hero', 'c6_kite']], () => { g.updateObjective(); g.save(false); }); return true; }
    }
    return false;
  }
  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'hesk': return c([['hesk', 'c6_hesk_1']]);
      case 'yorna':
        if (!f.c6_yorna) return c([['yorna', 'c6_yorna_1'], ['hero', 'c6_tw_y1'], ['yorna', 'c6_yorna_2'], ['yorna', 'c6_yorna_3'], ['yorna', 'c6_yorna_4']], () => { f.c6_yorna = true; g.updateObjective(); g.save(false); });
        if (f.c6_thawed && !f.c6_liftReady) return c([['yorna', 'c6_yorna_lift'], ['yorna', 'c6_yorna_sword1'], ['hero', 'c6_tw_sword'], ['yorna', 'c6_yorna_sword2']], () => {
          f.c6_liftReady = true; f.c6_sword = true;
          const h = g.hero; h.hasSword = true; h.combat.equip('sword');
          g.audio.play('chest'); g.hud.toast('c6_toast_sword');
          g.updateObjective(); g.save(false);
        });
        if (f.c6_up) return c([['yorna', 'c6_yorna_end']]);
        return c([['yorna', f.c6_liftReady ? 'c6_yorna_lift' : 'c6_yorna_3']]);
      case 'pim':
        if (f.c6_kite && !f.c6_fuse) return c([['pim', 'c6_pim_3']], () => { f.c6_fuse = true; g.hud.toast('c6_toast_fuse'); g.updateObjective(); g.save(false); });
        if (f.c6_needFuse && !f.c6_kiteAsk) return c([['pim', 'c6_pim_1'], ['pim', 'c6_pim_2']], () => { f.c6_kiteAsk = true; g.updateObjective(); g.save(false); });
        if (f.c6_up) return c([['pim', 'c6_pim_end']]);
        return c([['pim', f.c6_kiteAsk && !f.c6_kite ? 'c6_pim_wait' : 'c6_pim_1']]);
      case 'lhar1': return c([['lhar1', 'c6_v1']]);
      case 'lhar2': return c([['lhar2', 'c6_v2']]);
      case 'lhar3': return c([['lhar3', 'c6_v3']]);
    }
    return false;
  }

  update(dt) {
    const g = this.game, f = this.f, M = this.M, h = g.hero;
    if (!this.isCur() || !M) return;
    M.snow.focus = h.pos;
    if (this.thawT > 0 && (this.thawT -= dt) <= 0) { f.c6_thawed = true; M.lift.thaw(); g.audio.play('break'); this.story.refreshCast(); this.chain([['hero', 'c6_thawed']], () => { g.updateObjective(); g.save(false); }); }
    // the mites are gone: say so on the objective line
    const left = f.c6_trip1 && !f.c6_trip2 ? this.mitesLeft() : -1;
    if (left !== this.lastLeft) { this.lastLeft = left; g.updateObjective(); }
    if (g.state !== 'play' || !this.inM()) return;
    if (f.c6_bridge && !f.c6_lhar && Math.hypot(h.pos.x - M.lhar.x, h.pos.z - M.lhar.z) < 20) { f.c6_lhar = true; this.chain([['hero', 'c6_lhar_in']], () => g.updateObjective()); }
    // the last ride: stand on the platform and Yorna cranks
    if (f.c6_trip2 && !f.c6_up && !this.riding && Math.hypot(h.pos.x - M.lift.pad.x, h.pos.z - M.lift.pad.z) < 1.2 && Math.abs(h.pos.y - M.lift.y0) < 0.8) {
      this.riding = true;
      g.setState('cutscene'); g.cutscene = () => {};
      M.lift.ride(true, [h], () => {
        g.cutscene = null; g.setState('play'); this.riding = false;
        f.c6_up = true; this.story.refreshCast(); g.updateObjective(); g.save(false);
      });
    }
    if (f.c6_up && !f.c6_done && Math.hypot(h.pos.x - M.monastery.yard.x, h.pos.z - M.monastery.yard.z) < 7) {
      f.c6_done = true;
      this.chain([['narrator', 'c6_monastery'], ['yorna', 'c6_yorna_end'], ['pim', 'c6_pim_end']], () => { g.save(false); g.startTransition(() => this.story.nextChapter()); });
    }
  }
  applyFlags() {
    const f = this.f, M = this.M;
    if (!this.reached() || !M) return;
    // the sword is Twinsen's from here on (older saves past this chapter get it too)
    if (f.c6_sword || this.story.index > this.pos) this.game.hero.hasSword = true;
    if (f.c6_rope || this.story.index > this.pos) this.cutRope(true);
    if (f.c6_bridge) { M.gorge.tree.fell(true); for (const tg of M.ballTargets) if (tg.tree) tg.done = true; }
    if (f.c6_kite) { M.kite.setVisible(false); for (const tg of M.ballTargets) if (tg.kite) tg.done = true; }
    if (f.c6_heat) { M.heatPost.setOn(true); if (!f.c6_thawed) f.c6_thawed = true; }
    if (f.c6_thawed) M.lift.thaw();
    if (f.c6_up) M.lift.ride(true, [], null);
  }
  objective() {
    const f = this.f;
    if (!f.c6_started) return '';
    if (f.c6_up) return this.goal('c6_obj_monastery');
    if (f.c6_trip2) return this.goal('c6_obj_up');
    if (f.c6_trip1) return this.mitesLeft() > 0 ? this.goal('c6_obj_mites') : this.goal('c6_obj_trip2');
    if (f.c6_liftReady) return f.c6_sword && !f.c6_rope ? this.goal('c6_obj_rope') : this.goal('c6_obj_trip1');
    if (f.c6_thawed) return this.goal('c6_obj_tell');
    if (f.c6_heat) return this.goal('c6_obj_thaw');
    if (f.c6_yorna) return this.goal('c6_obj_heat') + (f.c6_needFuse ? this.sub(!!f.c6_fuse, 'c6_sub_fuse') + (f.c6_kiteAsk ? this.sub(!!f.c6_kite, 'c6_sub_kite') : '') : '');
    if (f.c6_lhar) return this.goal('c6_obj_yorna');
    if (f.c6_bridge) return this.goal('c6_obj_lhar');
    return this.goal('c6_obj_gorge');
  }
  items() { return this.f.c6_fuse && !this.f.c6_heat ? [{ id: 'fuse', icon: 'part' }] : []; }
  journal() {
    const f = this.f;
    return [
      { key: 'c6_j_land', done: !!f.c6_started },
      { key: 'c6_j_bridge', done: !!f.c6_bridge },
      { key: 'c6_j_lhar', done: !!f.c6_yorna },
      { key: 'c6_j_heat', done: !!f.c6_thawed },
      { key: 'c6_j_up', done: !!f.c6_up },
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}
