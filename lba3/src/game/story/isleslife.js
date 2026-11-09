// ISLES-BAR (Zeelich's islands at Citadel's bar: docs/lba-maturity/isles-inventory.md). Not a chapter: the director
// (index.js) asks it after the chapter in progress, like the Hamalayi's and Desert Island's life. No story flags of its own:
// what it shows is read from the chapter (islandlife.js islePhase · lineState) and the islands' favours' own flags (pp_*,
// story/islandpeople.js), so an old save loads as it did.
//   - The pieces a player reads as usable say something (zislands.js R.items): every island's shuttle departures board
//     (with chalked notes that point at the islands' open favours: the quay light out, keep high over the hives, the
//     chapel bell silent), the signposts and warning signs, Otringal's fountain (a drink gives back a little life once in
//     a while), the unattended market stalls, Knartas's net racks and washing, Mosquibee's great hive (angry until the
//     beacon is lit), the gas works' holders and pumps, the Building Company's board, the Wannies' mine and bell frame,
//     the lift towers, Mr Kett's crane, the Orchard's cloud catcher (its dark beacon high on a pole: the ball's clue),
//     the Old Watch's tower and fallen dome. A piece's prompt gives way to a person standing by it (their talk wins).
//   - People at home: indoor selves of seven residents in their own rooms in the states islandlife.js ISLE_HOME gives
//     (their outdoor selves are away then: one name, one voice, one dress), and five people of the rooms themselves:
//     Miss Avra at the terrace school, Sister Ione at the high town's clinic (she patches Twinsen up), Old Jaspa in
//     Knartas's gem-sorting room, Zuzz in Mosquibee's hive keepers' hall (down the honey hoist), Zett at the Orchard's press. Each works a round between
//     two pieces of their room and has a line for each state of the story.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { IH, roomOf } from '../ihomes.js';
import { ISLE_PEOPLE, ISLE_HOME, islePhase, lineState } from '../islandlife.js';
import '../text/isleslife.js';

// the people indoors: their door (ihomes.js IHOMES), the outdoor self they are (if any: its name, voice, dress and tint),
// when they are there (lineState values; none: whenever the islands are open), their look, the pieces they work at
const INDOOR = {
  il_ulla: { door: 'otringal-3--59', of: 'ot_ulla', work: ['shelf', 'stove'], anims: ['tinker', 'reach'] },
  il_tanek: { door: 'otringal--1--53', of: 'ot_tanek', work: ['wardrobe', 'boxes'], anims: ['tinker', 'reach'] },
  il_obo: { door: 'otringal-17--71', of: 'ot_sweep', work: ['stove', 'chest'], anims: ['tinker', null] },
  il_mila: { door: 'knartas-19--20', of: 'kn_mother', work: ['stove', 'shelf'], anims: ['tinker', null] },
  il_nessa: { door: 'knartas-19--22', of: 'kn_nets', work: ['chest', 'shelf'], anims: ['tinker', null] },
  il_pudd: { door: 'platform-27-12', of: 'pf_vill1', work: ['stove', 'chest'], anims: ['tinker', null] },
  il_rudd: { door: 'undergas-8--39', of: 'ug_gauge', work: ['desk', 'crates'], anims: ['tinker', null] },
  il_avra: { door: 'otringal--4--60', char: 'ztri2', color: '#a8d0f0', work: ['bookcase', 'pew'], anims: ['tinker', 'reach'] },
  il_ione: { door: 'otringal-52--60', char: 'nara', color: '#f4f4ff', work: ['desk', 'jarshelf'], anims: ['tinker', 'reach'], heals: true },
  il_jaspa: { door: 'knartas-28-29', char: 'keeper', color: '#d8b8a0', work: ['shelf', 'sacks'], anims: ['tinker', 'reach'] },
  il_zuzz: { door: 'mosquibee-26-15', char: 'zbee1', color: '#f0d070', work: ['barrels', 'sacks'], anims: ['tinker', 'reach'] },
  il_zett: { door: 'orchard-4-28', char: 'zbee2', color: '#c0e090', work: ['barrels', 'crates'], anims: ['tinker', 'reach'] },
};
const PEOPLE_OF = Object.fromEntries(Object.values(ISLE_PEOPLE).flatMap((I) => I.people.map((p) => [p.id, p])));
const HEAL_EVERY = 30;   // s between two of Sister Ione's patch-ups
const DRINK_EVERY = 20;   // s between two drinks at Otringal's fountain that give life back
// what each usable piece offers: its prompt and its line key (il_<kind>, then _<state> or a favour's own)
const ITEM = {
  shuttleBoard: 'p_read', signpost: 'p_read', warn: 'p_read', boardSign: 'p_read', fountain: 'p_drink', stall: 'p_look', netRack: 'p_look',
  laundry: 'p_look', greatHive: 'p_look', gasHolder: 'p_read', pump: 'p_look', mineMouth: 'p_look', liftTower: 'p_read', bellFrame: 'p_look',
  crane: 'p_look', cloudCatcher: 'p_look', ruinedTower: 'p_look', fallenDome: 'p_look', weighBeam: 'p_look', nectarPress: 'p_look',
};

export class IslesLife extends ChapterBase {
  get RG() { return this.game.regions; }
  open() { return islePhase(this.story) != null; }
  state() { return lineState(this.story); }
  phase() { return islePhase(this.story) || 'ord'; }
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  // is this indoor person home now?
  home(id) {
    const I = INDOOR[id]; if (!I || !this.open()) return false;
    return I.of ? !!ISLE_HOME[I.of]?.includes(this.state()) : true;
  }
  // ---------------------------------------------------------------- the people indoors
  npcDefs() {
    const out = [];
    for (const [id, I] of Object.entries(INDOOR)) {
      const P = I.of ? PEOPLE_OF[I.of] : null, S = this.spotIn(I);
      out.push({ id, name: 'n_' + (I.of || id), char: P?.char || I.char, color: P?.color || I.color, ...(P ? { tint: P.tint, dressOf: I.of } : {}),
        ...(S ? { x: S.x, z: S.z, angle: S.a } : { x: 0, z: 0, angle: 0, pending: true }) });
    }
    return out;
  }
  // where a person stands at a piece of the room (before it, facing it), the first free; null while the room is not built
  // (as story/hamlife.js spotIn)
  spotIn(I) {
    const id = roomOf(I.door), R = this.RG?.built(id), H = IH[id];
    if (!R || !H?.placed) return null;
    const ph = this.game.physics, out = [];
    for (const name of I.work) {
      const p = H.placed.find((q) => q.name === name);
      if (!p) continue;
      for (const d of [p.fd / 2 + 0.45, p.fd / 2 + 0.75]) {
        const x = p.x + Math.sin(p.ry) * d, z = p.z + Math.cos(p.ry) * d, y = ph.groundAt(x, z, 1);
        if (Math.abs(y) > 0.3 || ph.blockedAt(x, z, y + 0.3, 0.3)) continue;
        // (out of the door's way in, and not on a look's own standing spot: his look there must stay his)
        const F = H.frame, lx = x - F.cx, lz = z - F.cz;
        if (lx < F.LX + 2.0 && Math.abs(lz - F.doorZ) < 1.0) continue;
        // (nor where a look's prompt is offered: a person ahead of him takes the prompt, Game.findInteractable; the room's
        //  two looks are at its first two pieces, which nobody works at)
        if ((H.looks || []).some((l) => Math.hypot(l.x - x, l.z - z) < 1.6 || Math.hypot(l.at.x - p.x, l.at.z - p.z) < 0.05)) continue;
        out.push({ x, z, a: p.ry + Math.PI }); break;
      }
    }
    if (!out.length) {   // (a free spot of the floor, clear of the pieces, the door's way in and the looks, facing the room)
      const F = H.frame;
      for (let lx = F.LX + 2.2; lx <= F.RX - 0.6 && !out.length; lx += 0.3) for (let lz = F.BZ + 0.6; lz <= F.FZ - 0.6 && !out.length; lz += 0.3) {
        const x = F.cx + lx, z = F.cz + lz;
        if (ph.blockedAt(x, z, 0.3, 0.35) || (H.looks || []).some((l) => Math.hypot(l.x - x, l.z - z) < 1.6)) continue;
        out.push({ x, z, a: Math.PI });
      }
      if (!out.length) out.push({ x: F.cx + (F.LX + F.RX) / 2 + 0.6, z: F.cz + (F.BZ + F.FZ) / 2, a: Math.PI });
    }
    return Object.assign(out[0], { stops: out });
  }
  track(stops, anims) {
    const T = [];
    stops.forEach((s, i) => {
      const an = anims[i] || 'tinker';
      T.push({ op: 'call', fn: (a) => { a.forceAnim = an; } }, { op: 'goto', x: s.x, z: s.z, speed: 0.5 }, { op: 'face', a: s.a }, { op: 'wait', t: 6 + i * 2 });
    });
    if (stops.length > 1) T.push({ op: 'loop' });
    return T;
  }
  // the indoor people at home now, whether or not their room is built (tests)
  atHome() { return Object.keys(INDOOR).filter((id) => this.home(id)); }
  roomOf(id) { return INDOOR[id] ? roomOf(INDOOR[id].door) : null; }
  place(id) {
    const I = INDOOR[id]; if (!I) return undefined;
    if (I.of) { const n = this.npc(id); if (n && !n._ilTint && PEOPLE_OF[I.of]?.tint) { n._ilTint = true; n.rig?.mesh?.material?.color?.set(PEOPLE_OF[I.of].tint); } }
    if (!this.home(id)) return null;
    const S = this.spotIn(I);
    return S ? { x: S.x, z: S.z, a: S.a, anim: I.anims[0] || 'tinker', track: this.track(S.stops, I.anims) } : null;
  }
  talkFirst(npc) {
    const id = npc?.def?.id, I = INDOOR[id];
    if (!I || !this.able()) return false;
    const g = this.game, h = g.hero, st = this.state(), ph = this.phase(), has = (k) => t(k) !== k;
    const n = (npc._ilN = (npc._ilN ?? -1) + 1);
    let key = [`${id}_${st}`, `${id}_${ph}`, id].find(has);
    if (n % 2 && has(`${key}_2`)) key = `${key}_2`;
    const lines = [t(key)];
    // (Sister Ione patches him up: all his life back, once in a while)
    if (I.heals && h.hp < h.maxHp && !(this._healed > g.time - HEAL_EVERY)) { this._healed = g.time; h.hp = h.maxHp; g.audio.play('heal'); g.hud.stats?.(h); lines.unshift(t('il_ione_heal')); }
    npc.talking = true; npc.engage?.();
    g.say(npc.def.name || 'n_' + id, lines, () => { npc.talking = false; npc.release?.(); }, npc);
    return true;
  }
  // the hoist: the cage's ride behind the black, out at the other end facing away from the tower
  ride(Hs, from) {
    const g = this.game, rid = g.room?.id, to = Hs[from === 'head' ? 'foot' : 'head'];
    g.audio.play('liftWinch');
    g.startTransition(() => { g.enterRoom(rid, { x: to.x, z: to.z, a: to.a }, true); });
    return true;
  }
  // ---------------------------------------------------------------- the islands' usable pieces
  things(R) {
    if (R._ilThings) return R._ilThings;
    const gy = (x, z) => this.game.physics.groundAt(x, z, 80);
    R._ilThings = (R.items || []).filter((it) => ITEM[it.kind]).map((it) => ({ ...it, y: gy(it.x, it.z), reach: Math.min(3.2, it.r + 1.3) }));
    return R._ilThings;
  }
  interactables(consider, dist) {
    const g = this.game, rid = g.room?.id;
    if (!rid?.startsWith('isle_') || !this.open() || !this.able()) return;
    const R = g.room, h = g.hero;
    // (a person by the hero: their talk wins over a piece beside them)
    const busy = g.npcs.some((n) => n.present && !n.away && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 2.4 && Math.abs(n.pos.y - h.pos.y) < 1.5);
    // (the honey hoist: at its head and at its foot, a ride to the other end)
    for (const Hs of R.hoists || []) for (const end of ['head', 'foot']) {
      const e = Hs[end]; if (Math.abs(e.y - h.pos.y) > 1.6) continue;
      consider(dist(e.x, e.z), 1.5, { kind: 'il_hoist', hoist: Hs, from: end, label: 'p_ride' });
    }
    for (const it of this.things(R)) {
      if (busy && it.kind !== 'shuttleBoard') continue;
      if (Math.abs(it.y - h.pos.y) > 2.5) continue;
      consider(dist(it.x, it.z), it.reach, { kind: 'il_item', item: it, label: ITEM[it.kind] });
    }
  }
  interact(it) {
    if (it.kind === 'il_hoist') return this.ride(it.hoist, it.from);
    if (it.kind !== 'il_item') return false;
    const g = this.game, h = g.hero, f = this.f, I = it.item, st = this.state(), ph = this.phase(), has = (k) => t(k) !== k;
    const pick = (base) => [`${base}_${st}`, `${base}_${ph}`, base].find(has) || base;
    const read = (lines) => { g.audio.play('paper'); g.say('', lines); return true; };
    const look = (key) => { g.say('n_hero', [t(key)], null, h); return true; };
    switch (I.kind) {
      case 'shuttleBoard': {
        const notes = [];
        if (!f.pp_light) notes.push(t('il_board_light'));
        if (!f.pp_beacon) notes.push(t('il_board_hives'));
        if (!f.pp_bell) notes.push(t('il_board_bell'));
        return read([t(pick('il_board')), ...notes.slice(0, 2)]);
      }
      case 'signpost': return read([t('il_signpost', { w: (I.words || []).join(' · ') || '…' })]);
      case 'warn': return read([t('il_warn', { w: I.text || 'KEEP CLEAR' })]);
      case 'boardSign': case 'gasHolder': case 'liftTower': return read([t(pick('il_' + I.kind))]);
      case 'fountain': {
        if (h.hp < h.maxHp && !(this._drank > g.time - DRINK_EVERY)) { this._drank = g.time; h.hp = Math.min(h.maxHp, h.hp + 2); g.audio.play('heal'); g.hud.stats?.(h); }
        return look(pick('il_fountain'));
      }
      case 'greatHive': return look(f.pp_beacon ? 'il_greatHive_calm' : 'il_greatHive');
      case 'cloudCatcher': return look(f.pp_beacon ? 'il_cloudCatcher_lit' : 'il_cloudCatcher');
      case 'bellFrame': if (f.pp_bell) g.audio.play('clang'); return look(f.pp_bell ? 'il_bellFrame_rung' : 'il_bellFrame');
      default: return look(pick('il_' + I.kind));
    }
  }
}
