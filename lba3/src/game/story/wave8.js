// WAVE 8 (docs/lba-maturity/WAVE8.md; CONTENT-15H.md §3 H-19, H-20). Not a chapter: the director (index.js) asks it
// beside the chapter in progress, as it asks wave7.js. Its pieces in the world: src/game/wave8world.js; its text:
// text/wave8.js. Everything here is optional: nothing on the main path needs it, and nothing here opens a gate.
//
// H-19 · Four ways to walk (from chapter 3, The Zeelich, on; each place once its region is open). One visible hint per
// place, each opened by one behaviour (actors.js BEHAVIOURS), game-wide: the same rules in every chapter from the window
// to the ending's free play, for Twinsen's own body only (Zoé's and the disguise's scenes have none of it).
//   Discreet   Zeelich's street, behind the houses by the dog yard: a dog asleep across a cellar hatch. It wakes when he
//              comes within WAKE × his sneak() (actors.js: 1 walking in Normal, Athletic or Aggressive; 0.4 sneaking, 0.25
//              standing in Discreet, 0.12 hiding) — the same scale the mites and sentries use — with noticemark.js's "?"
//              while he is close to it and its "!" when it wakes: it sits up on the hatch, barks, and watches until he
//              has been SLEEP_AWAY m off for SLEEP_T s. Asleep, the hatch's free leaf (E, Discreet) lifts: a tin of
//              coins (PAY.cellar kashes) and a note. Woken, the hatch is only looked at ("Soft feet might not").
//   Athletic   Desert Island, by the ruins: a satchel on a rock ledge 2.15 m up (out of reach from the ground: a jump
//              rises 1.19 m, a walker steps 0.55) and a flat rock 1.05 m high a 2 m gap away. Only a jump gets on the flat
//              rock, and only a jump from it crosses the gap to the ledge. The satchel (E on the ledge): a Meca-Penguin
//              (five darts with full pockets, as Tibbo's gift: shops.js). Both rocks stand free (the tin stacks' rule,
//              story/wave5.js: from their tops nothing new is in reach); the hop-pack reaches the ledge too (no gate).
//   Aggressive the Hamalayi (chapter 6 on): an old arch bricked up at the foot of the cliff between the valley floor and
//              Lhar's terrace, its mortar cracked (air whistles through it). Aggressive E kicks it (as the well's lid,
//              prologue.js), or any melee hit: the bricks give, old steps go up through the rock. Climbing them (E) comes
//              out under a grate on the terrace, which unbolts from below: a short way between the valley and Lhar from
//              then on, both ways (the walk round is ~126 m). Both ends are walked to anyway (the suite plans the long
//              way round), so the steps open nothing that was shut.
//   Normal     Citadel, the Weather Wizard's tent: a slate by its door (QUIET, PLEASE: LISTENING TO THE WIND. WALK IN.
//              TALK PLAINLY.). Bersimon talks quietly only to a plain, walking Twinsen: in another behaviour his reply
//              is a kind word about it (galloping, fists, creeping); in Normal, the old wizards' saying — four ways to
//              walk — and where the other three doors are (lore, and the hints for the rest). Only when his own
//              stories (arsenal.js, sewers.js) have nothing to say: they come first.
// Rewards: kashes (the cellar), something useful (the satchel), a shortcut (the steps), lore (the saying). No clover
// leaf anywhere (CLOVER-BALANCE option A, the user's pick 25.11).
//
// H-20 · The world notices.
//   News sheets: every optional deed done (DEEDS) is noticed once, in the order it was done (w8n_seen); Citadel's two
//   notice boards (stands.js) and the isles' shuttle boards (isleslife.js) show their own notice as before, then the
//   latest news sheet (its newest headline and one older one, a different one each read); Otringal's first market stall
//   (unattended: BACK AFTER THE NEXT SHUTTLE) has a stack of them on its counter (THE CLOUD CRIER). No new stand. A
//   headline exists only for a deed done: nothing is hinted before.
//   The thanks round: in the ending's free play (after the dinner), each person helped says thank you once (THANKS),
//   some with a small gift (life or magic back); the journal's "Open favours" names who would still like a word.
//   Open favours: the journal lists every optional story started and not finished (DEEDS' start and done), one line each.
//
// State (flags, new only, prefix w8; an old save has none, nothing is made up but the news order, which is read from the
// deeds' own flags at the first tick): w8d_woke, w8d_done; w8a_seen, w8a_done; w8c_seen, w8c_open, w8c_up; w8q_slate,
// w8q_nudge, w8q_done; w8n_seen ('id,id,…'); w8t_<npc> (thanked). A dog awake or a hatch lifting is not saved.
import { t, STR } from '../i18n.js';
import { ChapterBase } from './base.js';
import { W8, buildHatch, buildArch, buildLedge, buildSlate, buildPapers, turn, ARCH_AT } from '../wave8world.js';
import { ARMS } from '../weapons.js';
import { NEAR_K, suspect, calm as calmMark, seen as seenMark, draw as drawMark } from '../noticemark.js';
import '../text/wave8.js';

export const PAY = { cellar: 20, darts: 5 };
export const WAKE = 3.2;          // m: the dog wakes within this × his sneak()
export const SLEEP_AWAY = 6, SLEEP_T = 4;
// where the pieces stand (world coordinates; measured 25.11 on the built regions)
export const SPOT = {
  hatch: { x: 2360.6, z: -13.9, ry: Math.PI },                       // behind the first house's back wall (its face at z -13.2), west of the dog yard's lane
  // the Hamalayi: the valley floor south of Lhar (2.67 m) and Lhar's terrace above it (11.93 m), 6 m apart across the cliff;
  // the walk round between them is ~126 m (measured with the test planner, 25.11)
  arch: ARCH_AT,   // (wave8world.js: the Hamalayi's snow lips keep off its steps)
  ledge: { x: 3412, z: 38, ry: Math.PI / 2 },                        // north of the ruins on Desert Island, the ledge to the east
  slate: { x: -94.0, z: -68.3, ry: Math.PI / 2 + 0.3 },              // Citadel: before the Weather Wizard's tent, beside its name board, facing the way in
};
const OPEN_FROM = 'zeelich';   // chapter 3 on

// ---------------------------------------------------------------- H-20: the optional deeds (done, started, helper)
const has = (f, ...k) => k.some((x) => !!f[x]);
export const DEEDS = [
  { id: 'light', done: (f) => has(f, 'pp_light'), start: (f) => has(f, 'pp_quill', 'pp_lens') },
  { id: 'beacon', done: (f) => has(f, 'pp_bzzraDone'), start: (f) => has(f, 'pp_bzzra', 'pp_beacon') },
  { id: 'bell', done: (f) => has(f, 'pp_bell'), start: (f) => has(f, 'pp_bellAsk', 'pp_clapper') },
  { id: 'jaspa', done: (f) => has(f, 'dx_jaspa_sorted'), start: (f) => has(f, 'dx_jaspa_ask') },
  { id: 'way', done: (f) => has(f, 'dx_way_open'), start: (f) => has(f, 'dx_way_ask') },
  { id: 'pack', done: (f) => has(f, 'dx_pack_given'), start: (f) => has(f, 'dx_pack_ask', 'dx_pack_taken') },
  { id: 'gaze', done: (f) => has(f, 'dx_gaze_open'), start: (f) => has(f, 'dx_gaze_ask', 'dx_gaze_seen') },
  { id: 'heat', done: (f) => has(f, 'dx_heat_open', 'dx_heat_late'), start: (f) => has(f, 'dx_heat_ask', 'dx_heat_pipe', 'dx_heat_grate') },
  { id: 'store', done: (f) => has(f, 'dx_store_given'), start: (f) => has(f, 'dx_store_seen', 'dx_store_open') },
  { id: 'kite', done: (f) => f.dx_kite === 'given', start: (f) => has(f, 'dx_kite') },
  { id: 'ferry', done: (f) => has(f, 'dx_lf_first'), start: (f) => has(f, 'dx_lf_ask', 'dx_lf_plate', 'dx_lf_bridge') },
  { id: 'brix', done: (f) => has(f, 'dx_om_done'), start: (f) => has(f, 'dx_om_ask') },
  { id: 'tali', done: (f) => has(f, 'dx_ow_moved'), start: (f) => has(f, 'dx_ow_met') },
  { id: 'card', done: (f) => has(f, 'dx_tyl_found'), start: (f) => has(f, 'dx_tyl_card') },
  { id: 'lift', done: (f) => has(f, 'zo_done'), start: (f) => has(f, 'zo_heard', 'zo_reserved') },
  { id: 'blow', done: (f) => has(f, 'zo_blow'), start: () => false },
  { id: 'matto', done: (f) => has(f, 'dx_qc_open'), start: (f) => has(f, 'dx_qc_heard') },
  { id: 'boat', done: (f) => has(f, 'w4b_won'), start: (f) => has(f, 'w4b_hook') },
  { id: 'letters', done: (f) => has(f, 'w4l_given'), start: (f) => has(f, 'w4l_ask') },
  { id: 'raph', done: (f) => has(f, 'w4r_found'), start: (f) => has(f, 'w4r_card', 'w4r_fenn') },
  { id: 'cistern', done: (f) => has(f, 'w5c_open'), start: (f) => has(f, 'w5c_ask', 'w5c_fill') },
  { id: 'breath', done: (f) => has(f, 'w5b_done'), start: (f) => has(f, 'w5b_ask', 'w5b_1', 'w5b_2', 'w5b_3') },
  { id: 'pippa', done: (f) => has(f, 'w7m_done'), start: (f) => has(f, 'w7m_hook') },
  { id: 'sail', done: (f) => has(f, 'w7d_up'), start: (f) => has(f, 'w7d_need', 'w7d_paid') },
  { id: 'waker', done: (f) => has(f, 'fr_given'), start: (f) => has(f, 'fr_hook', 'fr_gubb', 'fr_pella', 'fr_tuffo') },
];
const DEED = Object.fromEntries(DEEDS.map((d) => [d.id, d]));
// the ending's thanks round: who thanks him for which deeds, and the gift where one fits
export const THANKS = {
  pippa: { deeds: ['pippa'], gift: 'life' }, weaver: { deeds: ['sail', 'kite'] }, arthur: { deeds: ['boat'] }, odile: { deeds: ['letters'] },
  ilka: { deeds: ['breath'] }, yorna: { deeds: ['pack'] }, pim: { deeds: ['kite'] }, kn_quill: { deeds: ['light'] },
  mb_bzzra: { deeds: ['beacon'], gift: 'life' }, pf_chaplain: { deeds: ['bell'] }, lf_ossel: { deeds: ['ferry'], gift: 'magic' },
  fr_mott: { deeds: ['waker'] }, ow_tali: { deeds: ['tali'] }, w4_raph: { deeds: ['raph'] }, hl_monk: { deeds: ['cistern', 'way'] },
  il_jaspa: { deeds: ['jaspa'] }, brix: { deeds: ['brix'] },
};

export class Wave8 extends ChapterBase {
  constructor(story) { super(story); this.lift = null; this._rot = 0; this._tick = 0; this.awayT = 0; }
  get ck() { return this.story.cur?.key; }
  here() { return this.game.room?.id || 'citadel'; }
  built(id) { return this.game.regions?.built?.(id); }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  open() { const S = this.story; return S.index >= S.chapters.findIndex((c) => c.key === OPEN_FROM); }
  beh() { return this.game.hero.behaviour; }

  // ================================================================ the world
  decorate() { this.ensure(); this.applyWorld(); }
  regionBuilt() { this.ensure(); this.applyWorld(); }
  ensure() {
    const g = this.game, P = g.physics;
    const Z = this.built('zeelich');
    if (Z && !W8.hatch) { const s = SPOT.hatch; buildHatch(Z.group, P, s.x, P.groundAt(s.x, s.z, 40), s.z, s.ry); W8.hatch.mark.game = g; }
    const M = this.built('hamalayi');
    if (M && !W8.arch) {
      const A = SPOT.arch, gy = (p) => ({ ...p, y: P.terrain.heightAt(p.x, p.z) });
      buildArch(M.group, P, gy(A.foot), gy(A.top));
    }
    const D = this.built('desert');
    if (D && !W8.ledge) { const s = SPOT.ledge; buildLedge(D.group, P, s.x, P.terrain.heightAt(s.x, s.z), s.z, s.ry); }
    if (g.world?.root && !W8.slate) { const s = SPOT.slate; buildSlate(g.world.root, s.x, P.groundAt(s.x, s.z, 40), s.z, s.ry); }
    const O = this.built('isle_otringal');
    if (O && !W8.papers) { const it = this.stallItem(O); if (it) buildPapers(O.group, it.x, P.groundAt(it.x, it.z, 80), it.z, it.ry); }
  }
  // the unattended stall that carries the news: Otringal's first market stall
  stallItem(O = this.built('isle_otringal')) { return O?.items?.find((it) => it.kind === 'stall') || null; }
  applyFlags() {
    const f = this.f;
    if (f.w8n_seen != null && typeof f.w8n_seen !== 'string') delete f.w8n_seen;
    if (f.w8c_up) f.w8c_open = true;
    if (f.w8c_open) f.w8c_seen = true;
    if (f.w8a_done) f.w8a_seen = true;
    this.lift = null;
    const H = W8.hatch; if (H) { H.state = 'sleep'; H.setOpen(0); }
    this.ensure(); this.applyWorld();
  }
  applyWorld() {
    const f = this.f;
    W8.arch?.setOpen(!!f.w8c_open); W8.arch?.setGrate(!!f.w8c_up);
    W8.ledge?.setTaken(!!f.w8a_done);
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f, here = this.here();
    if (!this.able() || this.lift || h.actT > 0 || g.state !== 'play' || !this.open()) return;
    if (here === 'zeelich' && W8.hatch) {
      const H = W8.hatch, L = H.leafAt;
      const lift = H.state === 'sleep' && this.beh() === 'discreet' && !f.w8d_done;
      consider(dist(L.x, L.z), 1.1, { kind: lift ? 'w8d_hatch' : 'w8d_look', x: L.x, z: L.z, label: lift ? 'p_w8_hatch' : 'p_look' });
    }
    if (here === 'hamalayi' && W8.arch) {
      const A = W8.arch, aggro = this.beh() === 'aggressive';
      if (Math.abs(h.pos.y - A.foot.y) < 1.5) consider(dist(A.door.x, A.door.z), 1.3, f.w8c_open ? { kind: 'w8c_up', label: 'p_w8_up' } : { kind: 'w8c_arch', label: aggro ? 'p_kick' : 'p_look', kick: aggro });
      if (Math.abs(h.pos.y - A.top.y) < 1.5) consider(dist(A.grate.x, A.grate.z), 1.2, f.w8c_up ? { kind: 'w8c_down', label: 'p_w8_down' } : { kind: 'w8c_grate', label: 'p_look' });
    }
    if (here === 'desert' && W8.ledge) {
      const L = W8.ledge;
      if (h.pos.y > L.high.top - 0.35 && !f.w8a_done) consider(dist(L.bagAt.x, L.bagAt.z), 1.0, { kind: 'w8a_take', label: 'p_w8_take' });
      else if (h.pos.y < L.low.top - 0.5) consider(Math.max(0.05, dist(L.high.x, L.high.z) - 0.9), 1.6, { kind: 'w8a_look', label: 'p_look' });
    }
    if (here === 'citadel' && W8.slate) consider(dist(W8.slate.x, W8.slate.z), 1.3, { kind: 'w8q_slate', label: 'p_read' });
  }
  interact(it) {
    const k = it?.kind;
    // H-20: the boards and the stall say their own piece, then the news
    if (k === 'cs_board') return this.withNews(() => this.story.stands.interact(it), 'board');
    if (k === 'il_item' && it.item?.kind === 'shuttleBoard') return this.withNews(() => this.story.islife.interact(it), 'board');
    if (k === 'il_item' && it.item?.kind === 'stall' && this.isNewsStall(it.item)) return this.withNews(() => this.story.islife.interact(it), 'stall');
    if (typeof k !== 'string' || !/^w8[dacq]_/.test(k)) return false;
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((x) => (Array.isArray(x) ? x : ['hero', x])), done); return true; };
    switch (k) {
      // ---- the dog and the hatch
      case 'w8d_look': {
        const H = W8.hatch;
        if (f.w8d_done) return say(['w8d_after']);
        return say([H.state === 'sleep' ? 'w8d_look' : 'w8d_awake']);
      }
      case 'w8d_hatch': {
        const H = W8.hatch;
        h.actAt(H.leafAt.x, H.leafAt.z, 'use', 0.8, null);
        this.lift = { t: 0, dur: 0.7, H };
        g.audio.play('door');
        return true;
      }
      // ---- the arch
      case 'w8c_arch':
        if (it.kick) { const A = W8.arch; h.actAt(A.door.x, A.door.z, 'kick', 0.55, () => this.archOpen(), 0.2); return true; }
        f.w8c_seen = true;
        return say(['w8c_look'], () => g.save(false));
      case 'w8c_up': return this.climb('up');
      case 'w8c_down': return this.climb('down');
      case 'w8c_grate': return say(['w8c_grate']);
      // ---- the ledge
      case 'w8a_look': f.w8a_seen = true; return say([f.w8a_done ? 'w8a_after' : 'w8a_low']);
      case 'w8a_take': {
        const A = h.arms || (h.arms = {});
        h.act?.('pickup', 0.6, null, 0.3);
        f.w8a_done = true; f.w8a_seen = true; this.applyWorld();
        const full = (A.penguins ?? 0) >= ARMS.max.penguins;
        if (!full) { A.penguins = Math.min(ARMS.max.penguins, (A.penguins ?? 0) + 1); g.hud.toast('a_toast_got', { n: t('it_penguin') }); }
        else { A.darts = Math.min(ARMS.max.darts, (A.darts ?? 0) + PAY.darts); g.hud.toast('a_toast_darts', { n: PAY.darts }); }
        g.audio.play('chest'); g.hud.stats?.(h);
        return say([full ? 'w8a_take_full' : 'w8a_take'], () => g.save(false));
      }
      // ---- the slate
      case 'w8q_slate': f.w8q_slate = true; g.audio.play('paper'); g.say('', [t('w8q_slate')]); return true;
    }
    return false;
  }
  // a kick or a blow at the bricked arch (story.meleeHit)
  meleeHit({ inArc, hitSet }) {
    const A = W8.arch;
    if (!A || this.f.w8c_open || this.here() !== 'hamalayi' || !this.able() || hitSet?.has(A) || !this.open()) return false;
    if (Math.abs(this.game.hero.pos.y - A.foot.y) > 1.5 || !inArc(A.door.x, A.door.z, 0.9)) return false;
    hitSet?.add(A);
    this.archOpen();
    return true;
  }
  archOpen() {
    const g = this.game, f = this.f, A = W8.arch;
    if (f.w8c_open) return;
    f.w8c_open = true; f.w8c_seen = true; this.applyWorld();
    g.audio.play('break'); g.camRig?.shake?.(0.2);
    g.particles?.burst(A.door.x, A.foot.y + 0.8, A.door.z, '#a89888', 22, 2.2);
    this.chain([['hero', 'w8c_open']], () => g.save(false));
  }
  // the steps: up to the grate (the first time it unbolts), or back down to the arch (behind the black)
  climb(dir) {
    const g = this.game, f = this.f, A = W8.arch, h = g.hero;
    g.audio.play('step');
    g.startTransition(() => {
      const to = dir === 'up' ? A.out : A.up;
      h.pos.set(to.x, g.physics.groundAt(to.x, to.z, (dir === 'up' ? A.top.y : A.foot.y) + 1), to.z); h.angle = to.a; h.resetMotion?.(); h.vy = 0; h.sync?.(); g.camRig?.snap?.();
    }, null, () => {
      if (dir === 'up' && !f.w8c_up) { f.w8c_up = true; this.applyWorld(); g.audio.play('clang'); this.chain([['hero', 'w8c_top']], () => g.save(false)); }
    });
    return true;
  }

  // ================================================================ the people (asked after the waves' and depth.js's hooks)
  talkFirst(npc) {
    const id = npc?.def?.id, g = this.game, f = this.f;
    if (!id || !this.able()) return false;
    if (id === 'bersimon' && this.here() === 'wtent' && !f.w8q_done && this.open() && this.wizardFree()) return this.quiet(npc);
    const T = THANKS[id];
    if (T && this.ck === 'home' && f.ep_dinner && !f['w8t_' + id] && T.deeds.some((d) => DEED[d].done(f))) {
      if (this.ownFirst(npc)) return true;
      npc.engage?.();
      this.chain([[id, 'w8t_' + id]], () => {
        npc.release?.();
        f['w8t_' + id] = true;
        const h = g.hero;
        if (T.gift === 'life') { h.hp = h.maxHp; g.audio.play('heal'); g.hud.toast('w8t_gift_life'); }
        if (T.gift === 'magic') { h.mp = h.mpMax ?? h.mp; g.audio.play('pickMagic'); g.hud.toast('w8t_gift_magic'); }
        g.hud.stats?.(h); g.save(false);
      });
      return true;
    }
    return false;
  }
  // Bersimon's own stories come first (arsenal.js: the pearl and the lightning; sewers.js: the trapdoor and the globe):
  // the quiet talk only when neither has anything for him to say (their own conditions, read here)
  wizardFree() {
    const f = this.f, A = this.game.hero.arms || {};
    const arsenal = !(A.lightning || (f.a_berAsk && !f.a_pearl));
    const sewers = !f.sw_ber || (f.sw_globe && !f.sw_berGlobe);
    return !arsenal && !sewers && !this.story.cur?.pendingTalk?.('bersimon');
  }
  // the quiet talk: in Normal, the old wizards' saying; in any other behaviour, a kind word about it. (He tops up the
  // magic as he always does when talked to: prologue.js baseTalk)
  quiet(npc) {
    const g = this.game, f = this.f, b = this.beh(), h = g.hero;
    if (h.mp < h.mpMax) { h.mp = h.mpMax; g.audio.play('heal'); g.hud.toast('wz_toast_magic'); }
    npc.engage?.();
    if (b !== 'normal') {
      f.w8q_nudge = (f.w8q_nudge || 0) + 1;
      this.chain([['bersimon', b === 'athletic' ? 'w8q_ath' : b === 'aggressive' ? 'w8q_agg' : 'w8q_dis']], () => { npc.release?.(); g.save(false); });
      return true;
    }
    this.chain([['bersimon', 'w8q_1'], ['bersimon', 'w8q_2'], ['bersimon', 'w8q_2b'], ['hero', 'w8q_tw'], ['bersimon', 'w8q_3']], () => { npc.release?.(); f.w8q_done = true; g.save(false); });
    return true;
  }

  // ================================================================ each frame
  update(dt) {
    const g = this.game, f = this.f;
    // (the news: deeds done are noticed in the order they happen, once a second)
    if ((this._tick -= dt) <= 0) { this._tick = 1; this.notice(); }
    const H = W8.hatch; if (!H) return;
    H.t += dt;
    // the hatch's leaf (lifted, the tin, shut again)
    if (this.lift) {
      const L = this.lift; L.t += dt; H.setOpen(Math.min(1, L.t / L.dur));
      if (L.t >= L.dur && !L.said) {
        L.said = true;
        this.chain([['hero', 'w8d_open'], ['hero', 'w8d_note']], () => {
          f.w8d_done = true; g.hero.coins += PAY.cellar; g.audio.play('coin'); g.hud.toast('w8d_toast', { n: PAY.cellar }); g.hud.stats?.(g.hero);
          H.setOpen(0); g.audio.play('door'); this.lift = null; g.save(false);
        });
      }
    }
    const here = this.here() === 'zeelich';
    if (!here) { H.pose(H.state, dt, H.t); return; }
    const h = g.hero, d = Math.hypot(h.pos.x - H.dog.x, h.pos.z - H.dog.z);
    const r = WAKE * (this.able() ? h.sneak() : 1);
    const live = g.state === 'play' && !g.trans && this.open() && !this.lift;
    if (H.state === 'sleep') {
      const m = live ? suspect(H.mark, dt) : null;
      if (m) m.near = d < r * NEAR_K;
      if (!live) calmMark(H.mark, dt);
      if (live && d < r) this.wake(d);
    } else {
      calmMark(H.mark, dt);
      this.awayT = d > SLEEP_AWAY ? this.awayT + dt : 0;
      if (this.awayT > SLEEP_T) { H.state = 'sleep'; this.awayT = 0; }
      // (it turns to watch him)
      const want = Math.atan2(h.pos.x - H.dog.x, h.pos.z - H.dog.z) - H.ry;
      H.rig.root.rotation.y += (Math.atan2(Math.sin(want - H.rig.root.rotation.y), Math.cos(want - H.rig.root.rotation.y))) * Math.min(1, dt * 3);
    }
    if (H.state === 'sleep') H.rig.root.rotation.y += (0 - H.rig.root.rotation.y) * Math.min(1, dt * 2);
    drawMark(H.mark, 1.25, dt);
    H.pose(H.state, dt, H.t);
  }
  wake(d) {
    const g = this.game, f = this.f, H = W8.hatch;
    H.state = 'awake'; this.awayT = 0;
    seenMark(H.mark);
    H.rig.bark(); g.audio.play('bark', { x: H.dog.x, z: H.dog.z });
    if (!f.w8d_woke && d < 9) { f.w8d_woke = true; this.chain([['hero', 'w8d_woke']], () => g.save(false)); }
  }

  // ================================================================ H-20: the news
  seenList() { return (this.f.w8n_seen || '').split(',').filter((id) => DEED[id]); }
  notice() {
    const f = this.f, list = this.seenList();
    let changed = false;
    for (const D of DEEDS) if (!list.includes(D.id) && D.done(f)) { list.push(D.id); changed = true; }
    if (changed) f.w8n_seen = list.join(',');
  }
  // the headlines on a sheet: the newest, and one older one (a different one each read)
  headlines() {
    this.notice();
    const L = this.seenList().reverse();
    if (!L.length) return [];
    const out = ['w8h_' + L[0]];
    if (L.length > 1) out.push('w8h_' + L[1 + (this._rot++ % (L.length - 1))]);
    return out;
  }
  isNewsStall(item) { const S = this.stallItem(); return !!S && Math.abs(S.x - item.x) < 0.01 && Math.abs(S.z - item.z) < 0.01; }
  // the piece's own handler says its lines (caught here), then the news sheet follows in a box of its own
  withNews(fn, kind) {
    const g = this.game, sv = g.say;
    let cap = null;
    g.say = (...a) => { cap = a; };
    let r;
    try { r = fn(); } finally { g.say = sv; }
    if (!cap) return !!r;
    const H = this.headlines().map((k) => t(k));
    const extra = kind === 'stall' ? [t('w8n_stall'), ...(H.length ? H : [t('w8n_none')])] : H.length ? [t('w8n_board'), ...H] : [];
    if (!extra.length) { g.say(...cap); return true; }
    const [name, lines, done, who] = cap;
    g.say(name, lines, () => { g.audio.play('paper'); g.say('', extra, done); }, who);
    return true;
  }

  // ================================================================ the journal
  journal() {
    const f = this.f, out = [];
    // H-19
    const W = [];
    if (f.w8q_slate || f.w8q_nudge || f.w8q_done) W.push({ key: 'w8j_quiet', done: !!f.w8q_done });
    if (f.w8d_woke || f.w8d_done || f.w8q_done) W.push({ key: 'w8j_dog', done: !!f.w8d_done });
    if (f.w8c_seen || f.w8c_open || f.w8q_done) W.push({ key: 'w8j_arch', done: !!f.w8c_open });
    if (f.w8a_seen || f.w8a_done || f.w8q_done) W.push({ key: 'w8j_ledge', done: !!f.w8a_done });
    if (W.length) out.push({ title: t('w8j_title'), lines: W });
    // H-20: the open favours, and in the ending who would like a word
    const O = DEEDS.filter((D) => D.start(f) && !D.done(f)).map((D) => ({ key: 'w8o_' + D.id, done: false }));
    const who = this.thanksDue();
    if (who.length) {
      // (the journal reads plain keys: each language's line filled from its own table, as yearslate.js does)
      const names = (lang) => who.map((id) => { const k = this.npc(id)?.def?.name || 'n_' + id; return (lang === 'he' ? STRhe()?.[k] : null) || t(k); }).join(', ');
      fill('w8j_thanks_n', 'w8j_thanks', names);
      O.push({ key: 'w8j_thanks_n', done: false });
    }
    if (O.length) out.push({ title: t('w8j_open'), lines: O });
    return out;
  }
  // in the ending's free play: the people with a thank-you still to say
  thanksDue() {
    const f = this.f;
    if (this.ck !== 'home' || !f.ep_dinner) return [];
    return Object.keys(THANKS).filter((id) => !f['w8t_' + id] && THANKS[id].deeds.some((d) => DEED[d].done(f)));
  }
  items() { return []; }
}

// (the journal's filled line, in both languages' tables)
const STRhe = () => STR.he;
function fill(key, from, names) {
  for (const lang of ['en', 'he']) { const T = STR[lang]; if (!T?.[from]) continue; T[key] = T[from].replace('{who}', names(lang)); }
}
// (where the steps' ends are, re-exported for the tests)
export { turn };
