// CAMPAIGN-7 (the user's treatment of 11.11.2026, section 6 "The evidence — Vesk closes a door" and section 9 "The failed
// shutdown"): chapter 9's evidence and the stop. Not a chapter: council.js owns it (story._cn) and asks it first; Mill
// Lane's part (Kell, the lift, the isolator on its feed) is story/zeelift.js's KellThread.
//
// After the hearing the archive's door carries Vesk's standing order: Twinsen is not to be admitted, because a stop
// ordered before the Mill Lane bypass exists cuts that quarter's water (true, as the player will see). Under it, the
// deliveries' plate: the Mill Lane service landing, ring for Kell. Kell, whose cistern he got up in chapter 3, takes him
// up on the lift's deck to the service door on the cistern's terrace; it opens on the archive's back gallery. The
// archivist's round as before (the coat, his key ring); the BORE cabinet's drawer holds the plans, the uncut log of test
// 14 (two traces: the test the player ran at the dig in chapter 4) and Vesk's note cutting the ground trace, with his
// reason. The player lays his own carbon of that test on it: line for line. Back in the chamber the council orders the
// bore stopped, and Twinsen throws the stop at the platform's console himself: the BORE needle falls, the GROUND needle
// goes on kicking three and a rest. Mill Lane's line drops with it (a cut-away: the afternoon cart stops half way, Brel's
// jug comes up empty), as Vesk wrote. Vesk on the wire. Baldino reads the console: the bore's own switch is at the bottom
// of the shaft, behind blast doors that open to a code from every station at once. At his bench the line is loose, both
// relays of his test pair jump in threes; his isolator, clipped to one relay's terminal, holds that one and never two.
// One relay, one lane: clipped on Kell's feed box it gives Mill Lane its lift and water back, and Baldino has his
// network: every station held at once → chapter 10.
//
// Flags (new, saved): cn_v (a game with the thread: set at chapter 9's start, or on loading a chapter-9 save from before:
// its stop is always ahead), cn_closed (the order read), cn_kellAsk, cn_kell (Kell took him up; 'past' in a save from
// before that has been in the archive already: the front door stays his), cn_drawer (the BORE drawer open), cn_log (the
// log compared with his carbon; 'past' in a save from before with the plans in hand), cn_stop (the stop thrown),
// cn_isoGot, cn_isoA, cn_isoB, cn_iso (the isolator tried on both relays, in his pocket), cn_lane (on Kell's feed).
// Without cn_v the chapter plays as it did (the vote ends it).
import * as THREE from 'three';
import { revealBeat } from './revealcam.js';
import { handTo } from './reach.js';
import '../text/cnline.js';

export class CouncilThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.busy = false; this.later = []; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.cn_v; }
  get kell() { return this.ch.kell; }
  get Z() { return this.game.regions?.built?.('zeelich'); }
  get A() { return this.game.rooms.archive; }
  get Wk() { return this.game.regions?.built?.('workshop')?.life; }
  cur() { return this.ch.isCur(); }
  room() { return this.game.room?.id; }
  // the old way into the archive is shut to him (Vesk's order), until he has been in by the gallery
  shut() { const f = this.f; return this.cur() && this.on && !!f.c9_heard && !f.cn_kell && !f.c9_plans; }

  // ---------------------------------------------------------------- state
  begin() { this.f.cn_v = 1; this.push(); }
  applyFlags() {
    const f = this.f, cur = this.cur();
    // a save from before the thread, in chapter 9 (every one has the stop ahead: the vote ended the chapter): the thread is
    // on; a step it is past counts as done
    if (cur && !f.cn_v && f.c9_started) {
      f.cn_v = 1;
      if (f.c9_archSeen || f.c9_plans) { f.cn_closed ||= 'past'; f.cn_kell ||= 'past'; }
      if (f.c9_plans) f.cn_log ||= 'past';
    }
    this.busy = false; this.later = []; this.beat?.release(0.01); this.beat = null;
    if (cur && this.on && f.cn_isoGot && !f.cn_iso) this.iso = f.cn_isoB && !f.cn_isoA ? 'B' : f.cn_isoA ? 'A' : null;
    else this.iso = null;
    this.kell.applyFlags();
    this.push();
  }
  push() {
    const f = this.f, cur = this.cur(), on = this.on;
    this.game.regions?.whenBuilt?.('upper', () => { this.game.rooms.upper?.order?.show(cur && on && !f.c9_vote); this.game.rooms.archive?.drawer?.setOpen(cur && on && !!f.cn_drawer && !f.cn_lane); });
    this.game.regions?.whenBuilt?.('zeelich', (Z) => Z.platform?.stop?.set(on && !!f.cn_stop, cur && on));
    this.kell.push();
  }

  // ---------------------------------------------------------------- people
  place(id) {
    const f = this.f;
    if (!this.cur() || !this.on) return undefined;
    const k = this.kell.place(id);
    if (k !== undefined) return k;
    const Z = this.game.rooms.zeelich;
    if (id === 'baldino' && f.c9_vote && !f.cn_stop) {
      // at the platform, by the console, to watch the needles
      const c = Z.platform.console; return { x: c.x - 1.2, z: c.z + 1.7, a: Math.atan2(c.x - (c.x - 1.2), c.z - (c.z + 1.7)) };
    }
    if (id === 'baldino' && f.cn_stop) return this.game.rooms.workshop?.npcSpots?.baldino ?? Z.npcSpots.baldinoOut;
    return undefined;
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f, ch = this.ch;
    if (!this.cur() || !this.on) return null;
    if (f.cn_iso && !f.cn_lane) return ch.goal('cn_obj_lane');
    if (f.cn_stop && !f.cn_iso) return ch.goal('cn_obj_bench') + (f.cn_isoGot ? ch.sub(!!f.cn_isoA, 'cn_sub_a') + ch.sub(!!f.cn_isoB, 'cn_sub_b') : '');
    if (f.c9_vote && !f.cn_stop) return ch.goal('cn_obj_stop');
    if (f.c9_heard && !f.c9_plans) {
      if (f.cn_drawer && !f.cn_log) return ch.goal('cn_obj_compare');
      if (f.cn_kell) return null;   // (in by the gallery: the archive's own objective, the key)
      if (!f.cn_closed) return ch.goal('cn_obj_order');
      if (!f.cn_kellAsk) return ch.goal('cn_obj_kell');
      return ch.goal('cn_obj_ride');
    }
    return null;
  }
  markers() {
    const f = this.f, ch = this.ch, Z = this.Z;
    if (!this.cur() || !this.on || !Z) return null;
    const L = Z.lift;
    if (f.cn_iso && !f.cn_lane) return ch.stars(L.isoAt);
    if (f.cn_stop && !f.cn_iso) return ch.stars(Z.workshopDoor);
    if (f.c9_vote && !f.cn_stop) return ch.stars(Z.platform.console);
    if (f.c9_heard && !f.c9_plans && f.cn_closed && !f.cn_kell) return f.cn_kellAsk ? ch.stars(L.deck) : ch.stars(ch.starNpc('zl_kell') || L.spots.kell);
    if (f.c9_heard && !f.c9_plans && f.cn_kell === true && this.room() === 'zeelich') return ch.stars(L.hutFront);
    return null;
  }
  journal() {
    const f = this.f;
    if (!this.on) return [];
    return [{ key: 'cn_j_order', done: f.cn_closed === true }, { key: 'cn_j_kell', done: f.cn_kell === true }, { key: 'cn_j_log', done: f.cn_log === true },
      { key: 'cn_j_stop', done: !!f.cn_stop }, { key: 'cn_j_iso', done: !!f.cn_iso }, { key: 'cn_j_lane', done: !!f.cn_lane }].filter((l) => l.done);
  }
  items() { const f = this.f; return this.on && f.cn_iso && !f.cn_lane ? [{ id: 'iso', icon: 'part' }] : []; }

  // ---------------------------------------------------------------- the archive's door
  // (council.js canExit asks: the antechamber's door to the archive, while the order holds)
  refuseArchive() {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.shut()) return false;
    h.pos.z += 1.2; h.angle = 0;
    this.readOrder();
    return true;
  }
  readOrder() {
    const g = this.game, f = this.f, ch = this.ch;
    g.audio.play('paper');
    if (f.cn_closed) { ch.chain([['hero', 'cn_order_again']]); return; }
    const kellKnows = !!f.zt_water;   // (he got Kell's cart up in chapter 3: Kell said the lift was his)
    ch.chain([['narrator', 'cn_order_0'], ['narrator', 'cn_order_1'], ['narrator', 'cn_order_2'], ['hero', kellKnows ? 'cn_tw_order' : 'cn_tw_order_b']], () => {
      f.cn_closed = true; g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, r = this.room(), h = g.hero;
    if (!this.cur() || !this.on || this.busy) return;
    this.kell.interactables(consider, dist);
    if (r === 'upper' && f.c9_heard && !f.c9_vote) { const O = g.rooms.upper.order; consider(dist(O.x, O.z), 1.3, { kind: 'cn_order', label: 'p_read' }); }
    if (r === 'archive' && f.cn_drawer && !f.cn_log && f.dt_strip) { const D = this.A.drawer; consider(dist(D.x, D.z), 1.3, { kind: 'cn_compare', label: 'p_compare' }); }
    if (r === 'zeelich' && f.c9_vote && !f.cn_stop) { const S = this.Z.platform.stop; consider(dist(S.x, S.z), 1.4, { kind: 'cn_stop', label: 'p_stop' }); }
    if (r === 'workshop' && f.cn_isoGot && !f.cn_iso && this.Wk?.terminals) {
      const T = this.Wk.terminals;
      if (this.iso !== 'A') consider(dist(T.A.x, T.A.z), 1.0, { kind: 'cn_iso', which: 'A', label: 'p_clip' });
      if (this.iso !== 'B') consider(dist(T.B.x, T.B.z), 1.0, { kind: 'cn_iso', which: 'B', label: 'p_clip' });
    }
    void h;
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, ch = this.ch;
    if (this.kell.interact(it)) return true;
    switch (it.kind) {
      case 'cn_order': this.readOrder(); return true;
      case 'cn_compare': {
        const D = this.A.drawer;
        this.busy = true;
        handTo(h, D, () => {
          g.audio.play('paper', D);
          ch.chain([['narrator', 'cn_compare_1'], ['hero', 'cn_tw_compare']], () => { this.busy = false; this.logged(); });
        });
        return true;
      }
      case 'cn_stop': this.throwStop(); return true;
      case 'cn_iso': {
        const T = this.Wk.terminals[it.which];
        this.busy = true;
        handTo(h, T, () => {
          this.iso = it.which; g.audio.play('clunk', T);
          const first = !f.cn_isoA && !f.cn_isoB;
          f['cn_iso' + it.which] = true;
          const both = f.cn_isoA && f.cn_isoB;
          const bal = this.npc('baldino')?.present ? 'baldino' : 'balradio';
          const lines = [['narrator', it.which === 'A' ? 'cn_iso_a' : 'cn_iso_b'], ...(first ? [[bal, 'cn_bal_iso1']] : both ? [[bal, 'cn_bal_iso2'], ['hero', 'cn_tw_iso'], [bal, 'cn_bal_iso3']] : [])];
          ch.chain(lines, () => {
            this.busy = false;
            if (both) { f.cn_iso = true; this.iso = null; g.found('iso', 'cn_iso_toast'); }
            g.updateObjective(); g.save(false);
          });
        });
        return true;
      }
    }
    return false;
  }
  npc(id) { return this.ch.npc(id); }
  // the people, asked before the chapter's own talk
  talkFirst(npc) {
    const f = this.f, ch = this.ch, id = npc.def.id;
    if (!this.cur() || !this.on || this.busy) return false;
    if (this.kell.talk(npc)) return true;
    const c = (lines) => { ch.chain(lines); return true; };
    const bal = id === 'baldino';
    if (f.cn_iso && !f.cn_lane) return bal ? c([['baldino', 'cn_bal_iso3']]) : false;
    if (f.cn_isoGot && !f.cn_iso) return bal ? c([['baldino', f.cn_isoA || f.cn_isoB ? 'cn_bal_iso1' : 'cn_bal_bench2']]) : false;
    if (f.c9_vote && !f.cn_stop) {
      if (id === 'guard') return c([['guard', 'cn_guard_1']]);
      if (bal) return c([['baldino', 'cn_bal_wait']]);
      if (['chair', 'councilB', 'councilC'].includes(id)) return c([['chair', 'cn_chair_wait']]);
      return false;
    }
    if (f.cn_closed === true && !f.cn_kell && !f.c9_plans) {
      if (id === 'clerk') return c([['clerk', 'cn_clerk_order']]);
      if (bal) return c([['baldino', 'cn_bal_order']]);
    }
    return false;
  }
  // the BORE drawer (council.js asks when the cabinet is opened with the key): the papers, and the order that cut the log
  openBore() {
    const g = this.game, f = this.f, ch = this.ch, A = this.A;
    f.cn_drawer = true; A.drawer?.setOpen(true); this.ch.watcher?.stop();
    g.audio.play('shard');
    ch.chain([['hero', 'c9_cab_bore'], ['hero', 'cn_cab_1'], ['narrator', 'cn_cab_2'], ['hero', 'cn_tw_cab']], () => {
      if (!f.dt_strip) { this.logged(); return; }   // (no carbon in this game: the log is taken as it is)
      g.updateObjective(); g.save(false);
    });
  }
  logged() {
    const g = this.game, f = this.f;
    f.cn_log = true; f.c9_plans = true;
    g.updateObjective(); g.save(false);
    g.found('plans', 'cn_compare_toast');
  }

  // ---------------------------------------------------------------- the verdict (council.js asks): the council orders the stop
  verdictLines() {
    const f = this.f;
    const proof = f.cn_log === true ? [['hero', 'c9_tw_plans'], ['hero', 'cn_tw_log'], ['councilB', 'c9_councilB_2'], ['councilC', 'cn_councilC_log']] : [['hero', 'c9_tw_plans'], ['councilB', 'c9_councilB_2'], ['councilC', 'c9_councilC_2']];
    const end = [['councilC', 'c9_councilC_3'], ['chair', 'cn_chair_stop'], ['councilC', 'cn_councilC_stop'], ['chair', 'cn_chair_stop2'], ['baldino', 'cn_bal_stop']];
    return { proof, end };
  }
  voted() {
    const g = this.game, f = this.f;
    f.c9_vote = true;
    this.push(); this.story.refreshCast({ walk: true });
    g.updateObjective(); g.save(false);
  }

  // ---------------------------------------------------------------- the stop at the platform's console
  throwStop() {
    const g = this.game, f = this.f, h = g.hero, ch = this.ch, Z = this.Z, S = Z.platform.stop;
    this.busy = true;
    handTo(h, S, () => {
      S.set(true, true); g.audio.play('lever', S); g.audio.play('deny', S);
      const bal = this.npc('baldino')?.present ? 'baldino' : 'balradio';
      this.after(0.4, () => ch.chain([['narrator', 'cn_stop_1'], ['narrator', 'cn_stop_2'], [bal, 'cn_bal_stop1']], () => {
        // Mill Lane: the afternoon cart on its way up, the line gone (a cut-away; the hero stays at the console)
        const L = Z.lift;
        const beat = revealBeat(g, { in: 0.4 });
        beat?.show(() => ({ pos: new THREE.Vector3(L.lane.x + 2.6, L.y0 + 2.4, L.lane.z + 4.6), look: new THREE.Vector3(L.deck.x - 0.8, L.half, L.deck.z - 0.6), fov: 46 }), 0.4);
        this.kell.cut(beat);
        g.audio.play('clunk', L.deck);
        ch.chain([['zl_kell', 'cn_cut_kell'], ['zl_brel', 'cn_cut_brel']], () => {
          beat?.release(0.6);
          f.cn_stop = true;
          this.kell.push(); this.story.refreshCast();
          ch.chain([['veskwire', 'cn_vesk_1'], ['veskwire', 'cn_vesk_2'], ['hero', 'cn_tw_vesk'], [bal, 'cn_bal_stop2'], [bal, 'cn_bal_stop3']], () => {
            this.busy = false;
            this.story.refreshCast({ walk: true });   // (Baldino goes back to his bench)
            g.updateObjective(); g.save(false);
          }, (i, id) => { if (id === 'veskwire') g.audio.play('radio', S); });
        });
      }));
    });
  }

  // ---------------------------------------------------------------- the bench
  onEnterRoom(id) {
    const g = this.game, f = this.f;
    if (!this.cur() || !this.on) return;
    this.push();
    if (id === 'workshop' && f.cn_stop && !f.cn_isoGot && this.npc('baldino')) {
      this.busy = true;
      this.ch.chain([['baldino', 'cn_bal_bench1'], ['baldino', 'cn_bal_bench2']], () => { this.busy = false; f.cn_isoGot = true; g.updateObjective(); g.save(false); });
    }
  }
  // the chapter's end, on Mill Lane once the lift runs off the isolator (KellThread.clip)
  end() {
    const g = this.game;
    this.ch.chain([['balradio', 'cn_bal_end1'], ['balradio', 'cn_bal_end2'], ['hero', 'cn_tw_end']], () => {
      g.save(false);
      g.startTransition(() => this.story.nextChapter(), this.story.nextAreas());
    }, (i, id) => { if (id === 'balradio' && i === 0) g.audio.play('radio'); });
  }

  // ---------------------------------------------------------------- what moves
  after(t, fn) { this.later.push({ t, fn }); }
  update(dt) {
    const f = this.f;
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    this.kell.update(dt);
    const W = this.Wk;
    if (W) { const loose = this.cur() && this.on && !!f.cn_stop && !f.cn_lane; W.state.loose = loose; W.state.iso = loose ? this.iso : null; }
  }
}
