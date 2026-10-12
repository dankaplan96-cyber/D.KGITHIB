// Chapter 9 — "The Council" (Zeelich and its upper district).
//
// A project ship brings Twinsen back up to Zeelich. Baldino explains how the council works: a petition on
// Form 12-B with two citizens' stamps. Nara stamps it after hearing him out; Oku wants the mills turning
// again first (Twinsen braked them for the shield in chapter 3), so the ball knocks the three brakes loose.
// The clerk in the council house lets him through. The council fears the cold more than the crack, and
// wants proof the project itself wrote down. Next door is the project's archive: a locker holds a
// technician's coat (the archivist notices a "colleague" more slowly), and one of three cabinets holds the
// master plans of the bore, "Integrity: not assessed." Back in the chamber, Dallan arrives with Ilka's
// rubbings of the seals, a map of the shell with the bore through its thinnest part. The council votes to
// reverse the bore. But only Vesk's console below can switch it, and the shaft opens only on a code sent
// from every station at once. Baldino: "A network!" → chapter 10.
import { ChapterBase } from './base.js';
import { Watcher } from '../enemies.js';
import '../text/ch9.js';

export class Council extends ChapterBase {
  get Z() { return this.game.rooms.zeelich; }
  get U() { return this.game.rooms.upper; }
  get C() { return this.game.rooms.council; }
  get A() { return this.game.rooms.archive; }
  room() { return this.game.room?.id; }
  millsFree() { return (this.Z?.mills || []).filter((m) => this.f['c9_free_' + m.id]).length; }
  stamps() { return (this.f.c9_nara ? 1 : 0) + (this.f.c9_oku ? 1 : 0); }

  npcDefs() {
    const sp = (R, k) => R?.npcSpots?.[k] || { x: 0, z: 0, a: 0 };
    const d = (id, char, color, s) => ({ id, name: 'n_' + id, char, color, x: s.x, z: s.z, angle: s.a });
    return [
      d('clerk', 'clerk', '#d8d0ff', sp(this.U, 'clerk')),
      d('chair', 'councilChair', '#e8c0ff', sp(this.C, 'chair')),
      d('councilB', 'councilB', '#ffb0c8', sp(this.C, 'c2')),
      d('councilC', 'councilC', '#a8b8ff', sp(this.C, 'c3')),
      d('archivist', 'archivist', '#9fe0d0', { x: this.A?.patrol?.[0]?.[0] ?? 0, z: this.A?.patrol?.[0]?.[1] ?? 0, a: 0 }),
    ];
  }
  place(id) {
    const f = this.f, Z = this.Z, C = this.C, R = this.game.rooms;
    if (!this.reached()) return ['clerk', 'chair', 'councilB', 'councilC', 'archivist'].includes(id) ? null : undefined;
    if (!Z || !C) return undefined;
    const S = Z.npcSpots, pl = Z.platform;
    switch (id) {
      case 'clerk': return this.U.npcSpots.clerk;
      case 'chair': return C.npcSpots.chair;
      case 'councilB': return C.npcSpots.c2;
      case 'councilC': return C.npcSpots.c3;
      case 'archivist': return { x: this.A.patrol[0][0], z: this.A.patrol[0][1], a: 0 };
      case 'baldino': return f.c9_heard ? C.npcSpots.baldino : (R.workshop?.npcSpots?.baldino ?? S.baldinoOut);
      case 'dallan': return f.c9_dallan ? C.npcSpots.dallan : null;
      case 'nara': return S.esmer1;
      case 'oku': return S.esmer2;
      case 'guard': return { x: pl.gate.x + 0.5, z: pl.gate.z + 3.2, a: -Math.PI / 2 };
      case 'vesk': case 'doran': case 'hesk': case 'worker': return null;
    }
    return undefined;
  }

  begin() {
    const g = this.game, Z = this.Z;
    g.enterRoom('zeelich', Z.dock, true);
    g.hero.hasBall = true;
    this.freezeMills();
    this.story.refreshCast();
    this.chain([['narrator', 'c9_narr'], ['hero', 'c9_tw_arrive']], () => { this.f.c9_started = true; g.updateObjective(); g.save(false); });
  }
  // the mills are still braked from chapter 3 unless Oku's errand freed them
  freezeMills() { for (const m of this.Z?.mills || []) m.setSpinning(!!this.f['c9_free_' + m.id]); }

  doors() {
    const Z = this.Z;
    if (!this.isCur() || !Z) return [];
    const out = [{ region: 'zeelich', x: Z.councilDoor.x, z: Z.councilDoor.z, r: 1.0, room: 'upper' }];
    if (this.game.rooms.workshop) out.push({ region: 'zeelich', x: Z.workshopDoor.x, z: Z.workshopDoor.z, r: 0.9, room: 'workshop' });
    return out;
  }
  exitTo(to) {
    const Z = this.Z, U = this.U, C = this.C, A = this.A;
    if (!U) return null;
    const ux = U.spawn.x + 5, uz = U.spawn.z; // the antechamber's centre
    switch (to) {
      case 'up-down': {
        const d = Z.councilDoor, s = Z.street, l = Math.hypot(s.x - d.x, s.z - d.z) || 1;
        return { room: 'zeelich', x: d.x + ((s.x - d.x) / l) * 1.8, z: d.z + ((s.z - d.z) / l) * 1.8, a: Math.atan2(s.x - d.x, s.z - d.z) };
      }
      case 'up-council': return { room: 'council', ...C.spawn };
      case 'up-archive': return { room: 'archive', ...A.spawn };
      case 'council-out': return { room: 'upper', x: ux - 3.5, z: uz - 3.4, a: 0 };
      case 'archive-out': return { room: 'upper', x: ux + 3.5, z: uz - 3.4, a: 0 };
    }
    return null;
  }
  canExit(room, to) {
    const f = this.f;
    if (!this.isCur() || room.id !== 'upper') return true;
    const refuse = (key) => {
      const h = this.game.hero, U = this.U;
      h.pos.z += 1.2; h.angle = 0; void U;
      this.chain([['clerk', key]]);
      return false;
    };
    if (to === 'up-council' && !f.c9_clerk) return refuse(this.stamps() ? 'c9_clerk_half' : 'c9_clerk_none');
    if (to === 'up-archive' && !f.c9_heard) return refuse('c9_clerk_archive');
    return true;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const f = this.f, r = this.room();
    if (!this.isCur() || r !== 'archive' || f.c9_plans) return;
    const A = this.A;
    if (!f.c9_coat) consider(dist(A.locker.x, A.locker.z), 1.4, { kind: 'c9coat', label: 'p_coat' });
    for (const c of A.cabinets) consider(dist(c.x, c.z), 1.2, { kind: 'c9cab', cab: c, label: 'p_cabinet' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'c9coat':
        h.act('use', 0.6, () => {
          f.c9_coat = true; this.wearCoat(true); g.audio.play('chest');
          this.chain([['hero', 'c9_coat_1']], () => { g.hud.toast('c9_toast_coat'); g.save(false); });
        }, 0.3);
        return true;
      case 'c9cab': {
        const c = it.cab;
        h.act('use', 0.8, () => {
          g.audio.play('chest');
          if (c.label !== 'BORE') { this.chain([['hero', c.label === 'TUNNELS' ? 'c9_cab_tunnels' : 'c9_cab_ferries']]); return; }
          f.c9_plans = true; this.watcher?.stop();
          g.audio.play('shard');
          this.chain([['hero', 'c9_cab_bore']], () => { g.hud.toast('c9_toast_plans'); g.updateObjective(); g.save(false); });
        }, 0.4);
        return true;
      }
    }
    return false;
  }
  wearCoat(on) {
    const h = this.game.hero;
    h.disguised = on;
    if (on) { h.swapBody('worker'); h.hasBall = false; } else { h.swapBody('twinsen'); h.hasBall = true; }
    if (this.watcher) this.watcher.cone.scale.setScalar(on ? 0.7 : 1);
  }

  // Oku's errand: the ball knocks a mill's brake loose
  ballHit(p) {
    const f = this.f;
    if (!this.isCur() || this.room() !== 'zeelich' || !f.c9_okuAsk || f.c9_oku) return false;
    for (const m of this.Z.mills) {
      if (f['c9_free_' + m.id]) continue;
      if (Math.hypot(p.x - m.brake.x, p.y - m.brake.y, p.z - m.brake.z) < 0.9) {
        const g = this.game;
        f['c9_free_' + m.id] = true; m.setSpinning(true);
        g.audio.play('chest'); g.particles.burst(m.brake.x, m.brake.y, m.brake.z, '#ffe8a0', 16, 3);
        this.chain([['hero', 'c9_mill_free']], () => { g.updateObjective(); g.save(false); });
        return true;
      }
    }
    return false;
  }
  ballTargets() {
    const f = this.f;
    if (!this.isCur() || this.room() !== 'zeelich' || !f.c9_okuAsk || f.c9_oku) return [];
    return this.Z.mills.filter((m) => !f['c9_free_' + m.id]).map((m) => ({ x: m.brake.x, y: m.brake.y, z: m.brake.z }));
  }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    const ok = () => { g.updateObjective(); g.save(false); };
    switch (id) {
      case 'baldino':
        if (!f.c9_form) return c([['baldino', 'c9_bal_1'], ['hero', 'c9_tw_b1'], ['baldino', 'c9_bal_2'], ['baldino', 'c9_bal_3']], () => { f.c9_form = true; g.hud.toast('c9_toast_form'); ok(); });
        if (f.c9_heard && !f.c9_plans) return c([['baldino', 'c9_bal_c1']]);
        return c([['baldino', 'c9_bal_after']]);
      case 'nara':
        if (f.c9_form && !f.c9_nara) return c([['nara', 'c9_nara_1'], ['hero', 'c9_tw_n1'], ['nara', 'c9_nara_2'], ['narrator', 'c9_nara_stamp']], () => { f.c9_nara = true; g.audio.play('select'); ok(); });
        return c([['nara', f.c9_nara ? 'c9_nara_after' : 'c9_nara_1']]);
      case 'oku':
        if (f.c9_form && !f.c9_okuAsk) return c([['oku', 'c9_oku_1'], ['oku', 'c9_oku_2']], () => { f.c9_okuAsk = true; ok(); });
        if (f.c9_okuAsk && !f.c9_oku && this.millsFree() >= 3) return c([['oku', 'c9_oku_3'], ['narrator', 'c9_oku_stamp']], () => { f.c9_oku = true; g.audio.play('select'); ok(); });
        if (f.c9_oku) return c([['oku', 'c9_oku_after']]);
        return c([['oku', f.c9_okuAsk ? 'c9_oku_2' : 'c9_oku_1']]);
      case 'clerk':
        if (f.c9_clerk) return c([['clerk', f.c9_heard ? 'c9_clerk_archive' : 'c9_clerk_after']]);
        if (this.stamps() >= 2) return c([['clerk', 'c9_clerk_ok']], () => { f.c9_clerk = true; g.audio.play('select'); ok(); });
        return c([['clerk', this.stamps() ? 'c9_clerk_half' : 'c9_clerk_none']]);
      case 'chair': case 'councilB': case 'councilC':
        if (f.c9_clerk && !f.c9_heard) { this.hearing(); return true; }
        if (f.c9_plans && !f.c9_vote) { this.verdict(); return true; }
        return c([['chair', f.c9_vote ? 'c9_chair_4' : 'c9_chair_wait']]);
      case 'dallan': return c([['dallan', 'c9_dallan_3']]);
      case 'archivist': return c([['archivist', f.c9_coat ? 'c9_arch_spot_coat' : 'c9_arch_spot']]);
    }
    return false;
  }

  // the first hearing: the council wants proof
  hearing() {
    const g = this.game, f = this.f;
    if (this.busy) return;
    this.busy = true;
    this.chain([['chair', 'c9_chair_1'], ['hero', 'c9_tw_c1'], ['councilC', 'c9_councilC_1'], ['councilB', 'c9_councilB_1'], ['chair', 'c9_chair_2'], ['baldino', 'c9_bal_c1'], ['hero', 'c9_tw_c2']], () => {
      this.busy = false; f.c9_heard = true; g.updateObjective(); g.save(false);
    });
  }
  // the second: the plans, Dallan with Ilka's proof, the vote
  verdict() {
    const g = this.game, f = this.f;
    if (this.busy) return;
    this.busy = true;
    this.chain([['hero', 'c9_tw_plans'], ['councilB', 'c9_councilB_2'], ['councilC', 'c9_councilC_2']], () => {
      f.c9_dallan = true; this.story.refreshCast(); g.audio.play('door');
      this.chain([['dallan', 'c9_dallan_1'], ['hero', 'c9_tw_d1'], ['dallan', 'c9_dallan_2'], ['dallan', 'c9_dallan_3'], ['councilC', 'c9_councilC_3'], ['chair', 'c9_chair_3']], () => {
        g.audio.cue?.('revelation');
        this.chain([['chair', 'c9_chair_4'], ['baldino', 'c9_bal_c2'], ['baldino', 'c9_bal_c3'], ['hero', 'c9_tw_c3']], () => {
          g.audio.endCue?.(); this.busy = false;
          f.c9_vote = true; g.save(false);
          g.startTransition(() => this.story.nextChapter());
        });
      });
    });
  }

  // ---------------------------------------------------------------- the archive (stealth)
  onEnterRoom(id) {
    const g = this.game, f = this.f;
    if (!this.isCur()) return;
    if (id !== 'archive') this.leaveArchive();
    if (id === 'council' && f.c9_clerk && !f.c9_heard) this.hearing();
    else if (id === 'council' && f.c9_plans && !f.c9_vote) this.verdict();
    if (id === 'archive' && !f.c9_plans) {
      const arch = this.npc('archivist');
      if (arch && !this.watcher) { arch.controlled = true; this.watcher = new Watcher(g, arch, this.A.patrol, { range: 6.0, fov: 0.7, onSpot: () => this.spotted() }); }
      if (f.c9_coat) this.wearCoat(true);
      this.watcher?.start();
      if (!f.c9_archSeen) { f.c9_archSeen = true; this.chain([['hero', 'c9_arch_door']]); }
    }
  }
  onExitRoom(id) { if (id === 'archive') this.leaveArchive(); }
  // (room-to-room moves don't call onExitRoom, so entering any other room does this too)
  leaveArchive() {
    this.watcher?.stop();
    const arch = this.npc('archivist');
    if (arch?.controlled) { arch.controlled = false; this.story.refreshCast(); }
    if (this.game.hero.disguised) this.wearCoat(false);
  }
  spotted() {
    const g = this.game, f = this.f, A = this.A;
    this.watcher.stop();
    g.audio.play('alert');
    this.chain([['archivist', f.c9_coat ? 'c9_arch_spot_coat' : 'c9_arch_spot'], ['hero', 'c9_tw_spot']], () => {
      g.startTransition(() => {
        const sp = A.spawn, h = g.hero;
        h.pos.set(sp.x, g.physics.groundAt(sp.x, sp.z), sp.z); h.angle = sp.a ?? 0;
        if (this.room() === 'archive' && !f.c9_plans) this.watcher.start();
      });
    });
  }
  update(dt) {
    const g = this.game;
    if (!this.isCur()) return;
    if (this.watcher?.active && g.state === 'play') this.watcher.update(dt);
  }
  applyFlags() {
    if (!this.isCur() || !this.Z) return;
    this.freezeMills();
    this.Z.ferry?.setVisible?.(false);
    if (this.game.hero?.disguised) this.wearCoat(false);
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f;
    if (!f.c9_started) return '';
    if (f.c9_plans) return this.goal('c9_obj_back');
    if (f.c9_heard) return this.goal('c9_obj_archive');
    if (f.c9_clerk) return this.goal('c9_obj_council');
    if (this.stamps() >= 2) return this.goal('c9_obj_clerk');
    if (f.c9_form) {
      const n = this.millsFree();
      return this.goal('c9_obj_stamps') + this.sub(!!f.c9_nara, 'c9_sub_nara') + this.sub(!!f.c9_oku, 'c9_sub_oku') + (f.c9_okuAsk && !f.c9_oku ? this.sub(n >= 3, 'c9_oku_mills', { n }) : '');
    }
    return this.goal('c9_obj_baldino');
  }
  items() {
    const f = this.f;
    if (!this.reached()) return [];
    const out = [];
    if (f.c9_form && !f.c9_clerk) out.push({ id: 'petition', icon: 'stamp', n: this.stamps() });
    if (f.c9_plans) out.push({ id: 'plans', icon: 'plan' });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'c9_j_petition', done: !!f.c9_form },
      { key: 'c9_j_heard', done: !!f.c9_heard },
      { key: 'c9_j_plans', done: !!f.c9_plans },
      { key: 'c9_j_vote', done: !!f.c9_vote },
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}
