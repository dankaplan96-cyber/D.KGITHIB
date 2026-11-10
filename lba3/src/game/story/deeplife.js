// UNDER-BAR (the underground at Citadel's bar: docs/lba-maturity/underground-inventory.md). Not a chapter: the director
// (index.js) asks it after the chapter in progress, like the Hamalayi's life (hamlife.js). No story flags of its own:
// what it shows is read from the chapter and chapters 11–12's own flags, so an old save loads as it did.
//
// The underground's phases (phase()):
//   null     before chapter 11: the shaft's collar is shut (chapter 3 to 10), nothing down there is reached
//   'shell'  chapter 11: a hostile place nobody works in any more. The crew went up when Vesk closed the shaft (the
//            shift log at the tea corner), the bore runs flat out (its console), the hoist that took Vesk ahead to the
//            core is locked from below, the galleries' bridge is out; Sendell's chamber, her pool
//   'core'   chapter 12: the same rooms; Vesk at his console has a word for a hero who walks up to him mid-fight
//   'home'   the epilogue: the bore runs as a shield, "run by both worlds" (the end card). The collar on Citadel leads
//            down again; a council guard keeps the lift (the council's guards came down for Vesk), Tolli of the project's
//            crew walks the deep installation's console, valve A and the exchanger, Sala of Zeelich's half of the crew reads
//            the field below Vesk's burnt console; the hoist's lamp is green, Sendell's light is low and slow
// Baldino waits at the collar on Citadel through chapters 11 and 12 (network.js place): his word follows the chapter's
// progress (he said only "Hello, Twinsen." before).
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { SHAFT_TOP } from '../island.js';
import '../text/deeplife.js';

const COLLAR_REACH = 5.0;   // (as chapter3.js SHAFT_REACH)
const LOOK_DY = 1.5;        // a thing answers only from about its own level (the gallery's board: not from the chasm floor)
const CREW = {
  dp_guard: { room: 'c3shaft', char: 'keeper_b', tint: '#e4e8ff', color: '#a0a8e8' },
  dp_tolli: { room: 'c3deep', char: 'worker', tint: '#fff2e0', color: '#e8c070' },
  dp_sala: { room: 'c3core', char: 'nara', tint: '#eef4ff', color: '#a8c8f0' },
};

export class UndergroundLife extends ChapterBase {
  get RG() { return this.game.regions; }
  key() { return this.story.cur?.key; }
  phase() { const k = this.key(); return k === 'shell' || k === 'core' || k === 'home' ? k : null; }
  // the epilogue's way down opens once dinner is over (the ending's free roam)
  homeOpen() { return this.key() === 'home' && !!this.f.ep_dinner; }
  room(id) { return this.RG?.built(id) || null; }

  // ---------------------------------------------------------------- the shield crew (the epilogue)
  // (their spots are the rooms': pending until the underground is built, then real — Game.addActors reads these again)
  npcDefs() {
    return Object.entries(CREW).map(([id, C]) => {
      const s = this.spot(id, this.RG?.built?.(C.room));
      return { id, name: 'n_' + id, char: C.char, tint: C.tint, color: C.color, ...(s ? { x: s.x, z: s.z, angle: s.a } : { x: 0, z: 0, angle: 0, pending: true }) };
    });
  }
  spot(id, R) {
    if (!R) return null;
    if (id === 'dp_guard') return R.crew?.guard || null;
    if (id === 'dp_sala') return R.crew?.sala || null;
    return R.crew?.tolli?.[0] || null;
  }
  place(id) {
    const C = CREW[id];
    if (!C) return undefined;
    if (this.key() !== 'home') return null;
    const R = this.room(C.room);   // (LAZY-REGIONS: read inside the director's probe; placed once the underground is built)
    if (!R) return null;
    this.tint(id, C.tint);
    if (id !== 'dp_tolli') { const s = this.spot(id, R); return s ? { x: s.x, z: s.z, a: s.a, anim: id === 'dp_sala' ? 'tinker' : null } : null; }
    const st = R.crew?.tolli;
    if (!st?.length) return null;
    const anims = ['tinker', 'reach', 'tinker'], T = [];
    st.forEach((s, i) => T.push({ op: 'call', fn: (a) => { a.forceAnim = anims[i]; } }, { op: 'goto', x: s.x, z: s.z, speed: 0.55, near: 0.12 }, { op: 'face', a: s.a }, { op: 'wait', t: 6 + i * 2 }));
    T.push({ op: 'loop' });
    return { x: st[0].x, z: st[0].z, a: st[0].a, anim: 'tinker', track: T };
  }
  tint(id, c) { const n = this.npc(id); if (n && !n._dpTint) { n._dpTint = true; n.rig.mesh?.material?.color?.set(c); } }

  // ---------------------------------------------------------------- talk
  talkFirst(npc) {
    const id = npc.def.id, k = this.key(), f = this.f, g = this.game;
    let key = null;
    if (CREW[id] && k === 'home') {
      const n = (npc._dpN = (npc._dpN ?? -1) + 1);
      key = n % 2 ? `${id}_home_2` : id === 'dp_tolli' ? (f.c3_veskHelped ? 'dp_tolli_home_helped' : 'dp_tolli_home') : `${id}_home`;
    } else if (id === 'baldino' && (k === 'shell' || k === 'core') && !g.room) {
      key = k === 'core' ? 'dp_bal_core' : f.c3_sendell ? 'dp_bal_shell2' : f.c3_cooled ? 'dp_bal_shell1' : 'dp_bal_shell0';
    } else if (id === 'vesk' && k === 'core' && g.room?.id === 'c3core' && f.c3_fight && !f.c3_turned) {
      key = f.c3_overload ? 'dp_vesk_over' : 'dp_vesk_fight';
    }
    if (!key) return false;
    npc.talking = true;
    g.say(npc.def.name || 'n_' + id, [t(key)], () => { npc.talking = false; }, npc);
    return true;
  }

  // ---------------------------------------------------------------- what can be used
  // the line a room's thing gives now, or null when it has nothing to say in this phase (the chapter's own prompt is
  // there then: the diagram in chapters 11–12, the shutter once it is open)
  lookKey(room, id) {
    const ph = this.phase(), f = this.f, home = ph === 'home';
    switch (id) {
      case 'callpost': return 'dp_callpost';
      case 'tea': return home ? 'dp_tea_home' : 'dp_tea';
      case 'console': return home ? 'dp_console_home' : f.c3_cooled ? 'dp_console_cool' : 'dp_console_hot';
      case 'shutter': return !f.c3_cooled && !this.room('c3deep')?.coolDoor?.isOpen ? 'dp_shutter' : null;
      case 'hoist': return home ? 'dp_hoist_home' : 'dp_hoist';
      case 'diagram': return home ? 'dp_diagram_home' : null;
      case 'bridge': return home ? 'dp_bridge_home' : 'dp_bridge';
      case 'relief': return 'dp_relief';
      case 'pool': return home ? 'dp_pool_home' : ph === 'core' ? 'dp_pool_core' : f.c3_sendell ? 'dp_pool_shell' : null;
      case 'vconsole': return home ? 'dp_vconsole_home' : null;
    }
    return null;
  }
  interactables(consider, dist) {
    const g = this.game, ph = this.phase(), h = g.hero;
    if (!ph) return;
    if (!g.room) {
      // the epilogue: the collar's blast doors stand open (chapter2.js) and the way down is the crew's now
      if (this.homeOpen() && this.RG?.has('c3shaft')) consider(dist(SHAFT_TOP.x, SHAFT_TOP.z), COLLAR_REACH, { kind: 'dp_down', label: 'p_down' });
      return;
    }
    const R = g.room;
    if (!R.id?.startsWith('c3') || !R.looks) return;
    for (const L of R.looks) {
      if (Math.abs(h.pos.y - (L.y ?? 0)) > LOOK_DY) continue;
      const key = this.lookKey(R.id, L.id);
      if (key) consider(dist(L.x, L.z), L.r, { kind: 'dp_look', key, label: L.id === 'tea' || L.id === 'bridge' || L.id === 'console' || L.id === 'vconsole' || L.id === 'diagram' ? 'p_read' : 'p_look' });
    }
  }
  interact(it) {
    const g = this.game, h = g.hero;
    switch (it.kind) {
      case 'dp_look':
        if (it.key === 'dp_tea') g.audio.play('paper');
        g.say('n_hero', [t(it.key)], null, h);
        return true;
      case 'dp_down':
        g.audio.play('doorIn');
        g.startTransition(() => { g.enterRoom('c3shaft', null, true); g.updateObjective(); }, ['c3shaft']);
        return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- the phase on the rooms
  regionBuilt(ids) { if (ids.some((id) => id.startsWith('c3'))) this.apply(true); }
  applyFlags() { this.apply(true); }
  update(dt) {
    if ((this._t = (this._t || 0) + dt) < 0.5) return;
    this._t = 0;
    this.apply(false);
  }
  apply(force) {
    const ph = this.phase(), home = ph === 'home', RG = this.RG;
    const D = RG?.built('c3deep'), C = RG?.built('c3core'), S = RG?.built('c3sendell');
    // (chapter3.js applyRooms sets her light to 0.45 when the rooms are built: after the ending it is turned down here again)
    const key = ph + '|' + (D ? 1 : 0) + '|' + (S?.presence?.intensity ?? '-');
    if (!force && key === this._key) return;
    D?.hoist?.setOpen(home);
    // the core after the ending: the shield's calm, not the boss's music; her light low and slow
    if (C) C.music = home ? 'cave' : 'boss';
    if (home && S?.presence) { S.presence.setVisible(true); S.presence.setIntensity(0.25); }
    this._key = ph + '|' + (D ? 1 : 0) + '|' + (S?.presence?.intensity ?? '-');
  }
}
