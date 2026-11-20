// U-4 "Twelve Years Late" — the user's own side quest (docs/lba-maturity/DEPTH-PLAN.md, "The user's five side quests";
// docs/lba-maturity/U4-TWELVE-YEARS-LATE.md). Not a chapter: the director (index.js) asks it beside the chapter in progress,
// like ferry.js. The world's pieces and the old pictures are src/game/yearslate.js.
//
// Zeelich's street, from chapter 3 on. The street's post comes through the council (Rezz flies it, Oma keeps the box).
// A postcard has come back from every island stamped NOT KNOWN: "To the lady with the camera, Portraits, Clinic Row". No
// name, and no Clinic Row any more. Oma pinned it on the council house's arcade with a note: UNDELIVERABLE. ANYONE?
//   - Twinsen takes it off the pin (his hand on it). Its picture is the street twelve years ago (rendered from the game:
//     the old watch house with CLINIC over its window, PORTRAITS over a door, none of the project's posts and pipes). While
//     he carries it on the street, the card is in the corner of the screen: there is no arrow, the picture is the address.
//   - He knocks (his hand on the door) where he thinks it is. A wrong door gets a kind answer that points at one thing on
//     the card: Mr Pelleck (his house has a minaret), Wenna through Oku's door (the old mill is half the street away),
//     Mother Snuff (this WAS the clinic, but on the card it's far off: whoever took it stood up the street). After two
//     wrong doors Twinsen looks again (the cap, the mill over its shoulder), after three he reads the clinic's place.
//     Asking them face to face (inside their house, at the hatch) gives the same answer.
//   - The right door is Nara's flower house: the octagonal hall with the old mill behind it, the clinic far off at the
//     end. Lissa calls her gran. Ysel, Nara's mother, was the street's photographer; the glass house was her studio. She
//     reads the card, and gives Twinsen her album: "Stand where I stood and open it."
//   - The album: at each of her spots (Clinic Row, the West Pier, Citadel's harbour) "Open the album" puts the camera
//     where her lens was and lays her old picture over today's view (E: then / now; the pause key or Esc: close), with one
//     line of her caption. The pictures are made from the game at that moment (yearslate.js capture).
//   - Afterwards (from the next chapter, or once he has been off the island): Ysel takes pictures again, at her camera on
//     its tripod by her door, with a word for each part of the story; her new cards hang on the council's board.
// Nothing on the main path depends on it.
//
// State (flags, dx_tyl_; an old save has none: the card hangs on the board from chapter 3 on, Ysel indoors):
//   dx_tyl_card (taken), dx_tyl_knocked ('pel,oku,bak': the wrong doors tried), dx_tyl_wrong (their count),
//   dx_tyl_hint (0..2: Twinsen's second looks said), dx_tyl_oma (Oma told the card's story), dx_tyl_found (Ysel found,
//   the album given), dx_tyl_ch (the chapter it happened in), dx_tyl_away (he has been off the island since),
//   dx_tyl_seen ('row,pier,harbour': pictures opened where she stood), dx_tyl_heard ('pre,mid,…': her later words said),
//   dx_tyl_all (her word for a full album said). A knock or a view in progress is not saved.
import * as THREE from 'three';
import { t, STR } from '../i18n.js';
import { ChapterBase } from './base.js';
import { buildYearsLate, capture, spotWorld, SPOTS, SPOT_IDS, NARA } from '../yearslate.js';
import { zhomeDoors, zhomeExit, ZH } from '../zhomes.js';
import { touch, handTo } from './reach.js';
import { TrackRunner } from '../../engine/scripts.js';
import '../text/yearslate.js';

const COLOR = '#e8c890';
const NAME = { tyl_ysel: 'n_tyl_ysel', hero: 'n_hero' };
const COLORS = { tyl_ysel: COLOR, hero: '#8fc2ff' };
// the doors he can knock at while he carries the card: the street's houses with someone behind them
const DOORS = { pel: 'zh_pelleck', oku: 'zh_oku', bak: 'zh_bakery', nara: 'zh_nara' };
const WRONG = ['pel', 'oku', 'bak'];
// who answers each wrong door (speaker id; null: through the door), the line, the line when nobody comes
const ANSWER = { pel: ['ztri1', 'tyl_knock_pel', 'tyl_knock_pel_out'], oku: ['zh_wenna', 'tyl_knock_oku', 'tyl_knock_oku_out'], bak: ['zmole2', 'tyl_knock_bak', 'tyl_knock_bak_out'] };
const ZEE_ROOMS = new Set(['zeelich', 'workshop', 'zterminal', 'upper', 'council', 'archive']);   // (the terminal island and its rooms)
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const list = (v) => String(v || '').split(',').filter(Boolean);

export class TwelveYears extends ChapterBase {
  get Z() { return this.game.regions?.built?.('zeelich') || null; }
  get Y() { return this.Z?.yearslate || null; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  get open() { const i = this.idx('zeelich'); return i >= 0 && this.story.index >= i; }
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  here() { return this.game.room?.id === 'zeelich' && !!this.Y; }
  stage() { const f = this.f; return f.dx_tyl_found ? 'found' : f.dx_tyl_card ? 'search' : 'board'; }
  // Ysel at her camera outside (the next chapter, or once he has been off the island since)
  outside() { const f = this.f; return !!f.dx_tyl_found && (this.story.index > (f.dx_tyl_ch ?? 99) || !!f.dx_tyl_away); }
  // where the street is in the main story (as zeelife.js)
  phase() {
    const k = this.story.cur?.key;
    if (k === 'zeelich') return 'pre';
    if (k === 'council') return 'council';
    if (k === 'network' || k === 'shell' || k === 'core') return 'network';
    if (k === 'home') return 'late';
    return 'mid';
  }
  seen() { return list(this.f.dx_tyl_seen); }

  // ================================================================ the cast
  npcDefs() {
    // (never pending: her place is the story's to say, room built or not — main.js addActors keeps a pending person
    //  hidden from the story's placing until her area is built, and the flower house is built only when its door is used)
    const p = this.insideSpot() || { x: 2400 + NARA.door.x, z: NARA.door.z, a: 0 };
    return [{ id: 'tyl_ysel', name: 'n_tyl_ysel', char: 'nara_c', color: COLOR, x: p.x, z: p.z, angle: p.a }];
  }
  // in the flower house, by the round table, looking at the flowers under her old skylight (zhomes.js nara: Lissa's spot
  // is 1.4 m left of the room's middle, 1.85 m in front of its back wall's line)
  insideSpot() { const L = ZH.zh_nara?.npcSpots?.lissa; return L ? { x: L.x + 0.4, z: L.z + 1.85 - 0.6, a: Math.PI } : null; }
  place(id) {
    if (id !== 'tyl_ysel') return undefined;
    if (!this.open) return null;
    const n = this.npc(id);
    if (this.scene) return n?._tyl === 'scene' ? undefined : null;   // (at the door with him: the scene moves her)
    if (this.outside()) {
      const Y = this.Y; if (!Y) return undefined;
      return { x: Y.tripod.stand.x, z: Y.tripod.stand.z, a: Y.tripod.a, track: null };
    }
    const p = this.insideSpot();
    if (p) return { x: p.x, z: p.z, a: p.a, track: null };
    return null;   // (the flower house not built yet: she is indoors, out of sight; placed there once it is built: main.js regionReady)
  }

  // ================================================================ the world from the flags
  decorate() {
    const Z = this.Z;
    if (Z?.group && !Z.yearslate) buildYearsLate(this.game, Z);
    this.applyWorld();
  }
  regionBuilt(ids) { if (ids.includes('zeelich')) this.decorate(); }
  applyFlags() {
    const f = this.f;
    if (f.dx_tyl_found) f.dx_tyl_card = true;
    if (!f.dx_tyl_found) { delete f.dx_tyl_seen; delete f.dx_tyl_away; delete f.dx_tyl_heard; delete f.dx_tyl_all; delete f.dx_tyl_ch; }
    else if (!Number.isInteger(f.dx_tyl_ch)) f.dx_tyl_ch = this.story.index;
    if (f.dx_tyl_knocked != null) { const k = list(f.dx_tyl_knocked).filter((d) => WRONG.includes(d)); if (k.length) f.dx_tyl_knocked = [...new Set(k)].join(','); else delete f.dx_tyl_knocked; }
    if (f.dx_tyl_seen != null) { const s = [...new Set(list(f.dx_tyl_seen).filter((d) => SPOTS[d]))]; if (s.length) f.dx_tyl_seen = s.join(','); else delete f.dx_tyl_seen; }
    if (f.dx_tyl_wrong != null && !(Number.isInteger(f.dx_tyl_wrong) && f.dx_tyl_wrong >= 0)) delete f.dx_tyl_wrong;
    if (this.view) this.closeAlbum(true);
    if (this.cardView) this.closeCard(true);
    this.scene = null; this.knocking = null; this.busy = false; this._q = [];
    this.applyWorld();
  }
  applyWorld() {
    const Y = this.Y; if (!Y) return;
    const st = this.stage(), out = this.outside();
    Y.setBoard(!this.open ? 'none' : st === 'board' ? 'card' : out ? 'new' : 'none');
    Y.setTripod(this.open && out);
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    if (!this.open || !this.able() || this.busy || this.scene || this.view || this.cardView) return;
    const g = this.game, h = g.hero, f = this.f, st = this.stage();
    if (h.steer || h.actT > 0) return;
    if (this.here() && Math.abs(h.pos.y - 6.0) < 0.8) {
      const Y = this.Y, c = Y.card;
      if (st === 'board') consider(dist(c.x, c.z), 1.5, { kind: 'dx_tyl_card', label: 'p_take' });
      else if (this.outside()) consider(dist(c.x, c.z), 1.5, { kind: 'dx_tyl_newcards', label: 'p_look' });
      if (st === 'search') {
        const knocked = list(f.dx_tyl_knocked);
        for (const [k, room] of Object.entries(DOORS)) {
          if (knocked.includes(k)) continue;
          const D = this.doorInfo(room); if (!D) continue;
          consider(dist(D.x, D.z) - 0.05, 1.7, { kind: 'dx_tyl_knock', door: k, label: 'p_knock' });
        }
      }
    }
    if (f.dx_tyl_found) {
      const reg = g.room ? g.room.id : 'citadel';
      for (const id of SPOT_IDS) {
        if (SPOTS[id].region !== reg) continue;
        const w = spotWorld(g, id); if (Math.abs(h.pos.y - w.at.y) > 1.0) continue;
        consider(dist(w.at.x, w.at.z), 1.6, { kind: 'dx_tyl_album', spot: id, label: 'p_tyl_album' });
      }
    }
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_tyl_')) return false;
    switch (it.kind) {
      case 'dx_tyl_card': return this.takeCard();
      case 'dx_tyl_newcards': return this.look('tyl_newcards');
      case 'dx_tyl_knock': return this.knock(it.door);
      case 'dx_tyl_album': return this.openAlbum(it.spot);
    }
    return false;
  }
  look(key) { const g = this.game; g.say('n_hero', [t(key)], () => g.save(false), g.hero, COLORS.hero); return true; }
  // a street door: where it is, the way out of it (toward the street), the way he faces to knock
  doorInfo(room) {
    const Z = this.Z; if (!Z) return null;
    const d = zhomeDoors(Z).find((e) => e.room === room); if (!d) return null;
    const ex = zhomeExit(room + '-out', Z);
    const dx = ex ? (ex.x - d.x) / 1.2 : 0, dz = ex ? (ex.z - d.z) / 1.2 : 1;
    return { x: d.x, z: d.z, dir: { x: dx, z: dz }, a: Math.atan2(-dx, -dz) };
  }
  // (index.js doors(): the door he knocks at does not let him in while his hand is on it)
  filterDoors(out) {
    if (!this.knocking) return out;
    const room = DOORS[this.knocking];
    return out.map((d) => (d.room === room ? { ...d, r: 0 } : d));
  }

  // ---- the card off its pin
  takeCard() {
    const g = this.game, h = g.hero, Y = this.Y, f = this.f;
    const c = Y.card, a = Math.PI;   // (the arcade faces the street: he faces north to it)
    this.busy = true;
    // (he reads Oma's note first: the card is the street's post nobody could deliver)
    this.say([['hero', 'tyl_board']], () => handTo(h, touch(c.x, c.z, a, 'reach'), () => {
      f.dx_tyl_card = true;
      Y.setBoard('none'); g.audio.play('paper', c);
      g.save(false);
      this.later(0.7, () => { this.busy = false; this.showCard(() => this.say([['hero', 'tyl_tw_card'], ['hero', 'tyl_tw_card2']])); });
    }));
    return true;
  }

  // ---- knocking
  knock(k) {
    const g = this.game, h = g.hero, D = this.doorInfo(DOORS[k]); if (!D) return false;
    this.knocking = k; this.busy = true;
    const dep = k === 'bak' ? 0.86 : 0.72;   // (the door's face behind its point: the bakehouse's stands 0.9 m back)
    const hand = { x: D.x - D.dir.x * dep, z: D.z - D.dir.z * dep };
    handTo(h, touch(hand.x, hand.z, D.a, 'reach'), () => {
      for (let i = 0; i < 3; i++) this.later(i * 0.26, () => g.audio.play('hitWood', { x: hand.x, z: hand.z }));
      this.later(1.0, () => {
        const back = { x: D.x + D.dir.x * 1.3, z: D.z + D.dir.z * 1.3 };
        const then = () => { this.knocking = null; this.busy = false; this.answer(k, 'door'); };
        h.walkTo([back], { a: D.a, speed: 1.2, then, fail: then });
        if (h.steer) h.steer.indoor = true;   // (life.js lets a story's own steps in an area be)
      });
    }, 1.0);
    return true;
  }
  // a door's answer (or the same said face to face)
  answer(k, how) {
    const f = this.f;
    if (k === 'nara') return this.found(how);
    const knocked = list(f.dx_tyl_knocked);
    const first = !knocked.includes(k);
    if (first) { knocked.push(k); f.dx_tyl_knocked = knocked.join(','); f.dx_tyl_wrong = (f.dx_tyl_wrong | 0) + 1; }
    const [who, key, keyOut] = ANSWER[k];
    const through = who === 'zh_wenna' && how === 'door';   // (Wenna answers from inside, her room built or not)
    const sp = this.npc(who), near = through || (sp?.present && (how === 'face' || sp.distTo(this.game.hero) < 16));
    const lines = [near ? [who, key] : ['hero', keyOut]];
    const lvl = (f.dx_tyl_wrong | 0) >= 3 ? 2 : (f.dx_tyl_wrong | 0) >= 2 ? 1 : 0;
    if (lvl > (f.dx_tyl_hint | 0)) { f.dx_tyl_hint = lvl; lines.push(['hero', lvl === 1 ? 'tyl_hint_1' : 'tyl_hint_2']); }
    this.say(lines, null, { through });
    return true;
  }

  // ---- the right door: Ysel
  found(how) {
    const g = this.game, f = this.f, h = g.hero, n = this.npc('tyl_ysel');
    const D = this.doorInfo(DOORS.nara);
    // the album from her hands into his (her reach, his): no pause in the talk, so nobody walks off mid-way
    const rest = () => {
      if (n) { n.forceAnim = 'reach'; this.later(1.2, () => { if (n.forceAnim === 'reach') n.forceAnim = null; }); }
      g.audio.play('paper', h.pos);
      h.act('reach', 1.0, null, 0.5);
      f.dx_tyl_found = true; f.dx_tyl_ch = this.story.index;
      g.audio.play('found');
      g.save(false);
      this.say([['tyl_ysel', 'tyl_ysel_5'], ['hero', 'tyl_tw_album'], ['tyl_ysel', 'tyl_ysel_6']], () => {
        g.hud.toast('tyl_toast_album');
        if (how === 'door' && n && D) this.walkIn(n, D); else { this.scene = null; this.recast(); }
        g.save(false);
      });
    };
    const talk = () => this.say([['tyl_ysel', 'tyl_ysel_1'], ['hero', 'tyl_tw_found'], ['tyl_ysel', 'tyl_ysel_2'], ['tyl_ysel', 'tyl_ysel_3'], ['tyl_ysel', 'tyl_ysel_4']], rest);
    if (how === 'door') {
      this.scene = 'door';
      this.say([['zh_lissa', 'tyl_lissa_door']], () => {
        // Ysel comes to the door
        if (n && D) { n._tyl = 'scene'; if (!n.present) n.setPresent?.(true); n.placeAt?.({ x: D.x + D.dir.x * 0.2, z: D.z + D.dir.z * 0.2, a: Math.atan2(h.pos.x - D.x, h.pos.z - D.z), anim: null }); n.track = null; }
        g.audio.play('doorIn', D);
        talk();
      }, { through: true });
      return true;
    }
    this.scene = 'in'; if (n) n._tyl = 'scene';
    if (how === 'lissa') { this.say([['zh_lissa', 'tyl_lissa_in']], talk); return true; }
    talk();
    return true;
  }
  // she goes back in through her door
  walkIn(n, D) {
    const busy = { op: 'call', fn: (q) => { q.forceAnim = 'walk'; } };
    n.track = new TrackRunner([busy, { op: 'goto', x: D.x, z: D.z, speed: 0.7, near: 0.3 }, { op: 'call', fn: (q) => { q.forceAnim = null; this.scene = null; this.recast(); } }]);
    n.forceAnim = 'walk';
    this.later(8, () => { if (this.scene === 'door') { this.scene = null; this.recast(); } });   // (in case something stands in her way)
  }
  recast() { const S = this.story, n = this.npc('tyl_ysel'); if (n) n._tyl = null; S.noWalk = true; try { S.refreshCast(); } finally { S.noWalk = false; } this.applyWorld(); }

  // ================================================================ talk
  talkFirst(npc) {
    const id = npc?.def?.id;
    if (!this.open || !id) return false;
    const f = this.f, st = this.stage();
    if (id === 'tyl_ysel') {
      if (this.scene) return true;
      if (st === 'search') return this.found('face');
      if (st === 'board') return this.say([['tyl_ysel', this.pick('tyl_ysel_idle')]]);
      const ph = this.phase(), heard = list(f.dx_tyl_heard);
      if (this.outside() && !heard.includes(ph)) { heard.push(ph); f.dx_tyl_heard = heard.join(','); return this.say([['tyl_ysel', 'tyl_ysel_' + ph]]); }
      if (this.seen().length >= SPOT_IDS.length && !f.dx_tyl_all) { f.dx_tyl_all = true; return this.say([['tyl_ysel', 'tyl_ysel_all']]); }
      return this.say([['tyl_ysel', this.outside() ? this.pick('tyl_ysel_any') : this.pick('tyl_ysel_idle')]]);
    }
    if (id === 'zr_oma') {
      if (st === 'board' && !f.dx_tyl_oma) { f.dx_tyl_oma = true; npc.engage?.(); return this.say([['zr_oma', 'tyl_oma_1'], ['zr_oma', 'tyl_oma_2']], () => npc.release?.()); }
      if (st === 'search' && (f.dx_tyl_wrong | 0) >= 2 && !f.dx_tyl_omaHint) { f.dx_tyl_omaHint = true; npc.engage?.(); return this.say([['zr_oma', 'tyl_oma_hint']], () => npc.release?.()); }
      return false;
    }
    if (st !== 'search') return false;
    if (id === 'zh_lissa') return this.found('lissa');
    const k = Object.keys(ANSWER).find((w) => ANSWER[w][0] === id);
    if (k && !list(f.dx_tyl_knocked).includes(k)) return this.answer(k, 'face');
    return false;
  }
  // a conversation, each speaker under their own name; `through`: the first voice from behind a door (no one to look at)
  say(lines, done, { through = false } = {}) {
    const g = this.game;
    const next = (i) => {
      if (i >= lines.length) { done?.(); g.save(false); return; }
      const [id, key] = lines[i];
      const raw = Array.isArray(key) ? t(key[0])[key[1]] : t(key), text = Array.isArray(raw) ? raw : [raw];
      const sp = through && i === 0 ? null : this.speaker(id);
      const near = sp && (sp === g.hero || (sp.present && sp.distTo(g.hero) < 20)) ? sp : null;
      if (near && near !== g.hero) near.talking = true;
      g.say(NAME[id] || 'n_' + id, text, () => { if (near && near !== g.hero) near.talking = false; next(i + 1); }, near, COLORS[id] || (sp?.def?.color ?? null));
    };
    next(0);
    return true;
  }
  pick(key) { const a = t(key); if (!Array.isArray(a)) return key; const N = (this._n ||= {}); N[key] = ((N[key] ?? -1) + 1) % a.length; return [key, N[key]]; }

  // ================================================================ the card, close up
  cardPicture() {
    if (this._cardPic) return this._cardPic;
    if (!this.Z || (this._cardTries | 0) >= 3) return null;   // (a render that failed is not tried every frame)
    this._cardTries = (this._cardTries | 0) + 1;
    this._cardPic = capture(this.game, 'row', { maxW: 640 });
    return this._cardPic;
  }
  showCard(done) {
    const g = this.game;
    const pic = this.cardPicture();
    this.cardView = { done };
    g.setState('cutscene');
    g.cutscene = (dt) => this.cardStep(dt);
    g.input.clearEdges?.();
    let el = $('#tylcard');
    if (!el) {
      el = document.createElement('div'); el.id = 'tylcard';
      el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;gap:2.2vw;background:rgba(10,8,6,0.72);z-index:45;pointer-events:none;flex-wrap:wrap;padding:3vh 3vw;box-sizing:border-box;';
      document.body.appendChild(el);
    }
    el.innerHTML = '';
    const front = document.createElement('div');
    front.style.cssText = 'background:#f4ead4;padding:1.1vw;box-shadow:0 6px 24px rgba(0,0,0,0.6);transform:rotate(-1.5deg);max-width:min(560px,52vw);';
    if (pic) { const c = document.createElement('canvas'); c.width = pic.width; c.height = pic.height; c.getContext('2d').drawImage(pic, 0, 0); c.style.cssText = 'display:block;width:100%;height:auto;'; c.className = 'tylpic'; front.appendChild(c); }
    const back = document.createElement('div');
    back.style.cssText = 'background:#efe4c8;color:#3a2a20;padding:1.4vw 1.6vw;box-shadow:0 6px 24px rgba(0,0,0,0.6);transform:rotate(1.2deg);width:min(360px,34vw);font-family:"Comic Sans MS","Segoe Print",cursive,sans-serif;line-height:1.35;font-size:clamp(12px,1.35vw,17px);';
    const stamps = t('tyl_card_stamps');
    back.innerHTML = `<div class="tylto" style="border-bottom:1px solid #b8a07a;padding-bottom:0.6em;margin-bottom:0.6em">${t('tyl_card_to').split('|').map(esc).join('<br>')}</div>`
      + `<div class="tylmsg">${esc(t('tyl_card_msg'))}</div>`
      + `<div style="margin-top:0.8em;display:flex;flex-wrap:wrap;gap:0.4em">${(Array.isArray(stamps) ? stamps : []).map((s, i) => `<span style="font-family:sans-serif;font-weight:bold;font-size:0.68em;color:${i ? '#8a2a2a' : '#2a4a7a'};border:2px solid currentColor;border-radius:${i ? 3 : 12}px;padding:1px 5px;transform:rotate(${(i % 2 ? 4 : -5) + i}deg);opacity:0.8">${esc(s)}</span>`).join('')}</div>`;
    const keys = document.createElement('div');
    keys.style.cssText = 'flex-basis:100%;text-align:center;color:#fff;opacity:0.85;text-shadow:0 1px 2px #000;';
    keys.innerHTML = t('tyl_card_keys', { e: `<kbd>${esc(g.input.label?.('interact') ?? 'E')}</kbd>` });
    el.append(front, back, keys);
    el.style.display = 'flex';
    return true;
  }
  cardStep() {
    const g = this.game, I = g.input;
    if (!this.cardView) return;
    g.hero.vel?.set(0, 0);
    if (I.pressed('interact') || I.pressed('pause') || I.menu?.('back') || I.pressed('action')) this.closeCard(false);
  }
  closeCard(quiet) {
    const g = this.game, V = this.cardView; if (!V) return;
    this.cardView = null;
    const el = $('#tylcard'); if (el) el.style.display = 'none';
    if (g.cutscene && g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    g.input.clearEdges?.();
    if (!quiet) V.done?.();
  }
  // the card in the corner while he carries it on the street (no arrow: the picture is the address)
  thumb(on) {
    if (on === this._thumbOn) return;   // (per frame: only a change touches the page)
    let el = $('#tylthumb');
    if (!on) { this._thumbOn = false; if (el) el.style.display = 'none'; return; }
    const pic = this.cardPicture(); if (!pic) return;
    if (!el) {
      el = document.createElement('div'); el.id = 'tylthumb';
      el.style.cssText = 'position:fixed;right:1.2vw;bottom:2.2vh;width:min(300px,24vw);background:#f4ead4;padding:6px 6px 4px;box-shadow:0 4px 14px rgba(0,0,0,0.55);transform:rotate(1.5deg);z-index:30;pointer-events:none;';
      const c = document.createElement('canvas'); c.style.cssText = 'display:block;width:100%;height:auto;'; el.appendChild(c);
      const cap = document.createElement('div'); cap.style.cssText = 'font:bold 11px sans-serif;color:#5a3a2a;text-align:center;margin-top:2px;letter-spacing:0.04em;'; cap.textContent = t('tyl_card_hint'); el.appendChild(cap);
      document.body.appendChild(el);
    }
    const c = el.querySelector('canvas');
    if (c.width !== pic.width) { c.width = pic.width; c.height = pic.height; c.getContext('2d').drawImage(pic, 0, 0); }
    el.style.display = 'block';
    this._thumbOn = true;
  }

  // ================================================================ the album where she stood
  openAlbum(id) {
    const g = this.game, f = this.f, h = g.hero;
    const sw = spotWorld(g, id); if (!sw) return false;
    const pos = new THREE.Vector3(sw.eye.x, sw.eye.y, sw.eye.z), look = new THREE.Vector3(sw.look.x, sw.look.y, sw.look.z);
    this.view = { id, then: true, fov: g.camera.fov };
    g.setState('cutscene');
    g.cutscene = (dt) => this.albumStep(dt);
    g.camRig.override = { pos, look };
    g.camera.position.copy(pos); g.camRig.look.copy(look); g.camera.fov = sw.fov; g.camera.updateProjectionMatrix(); g.camera.lookAt(look);
    this.heroShown(false);
    g.audio.play('paper', h.pos);
    this.view.pic = capture(g, id);
    g.camera.fov = sw.fov; g.camera.updateProjectionMatrix();
    g.input.clearEdges?.();
    const seen = this.seen();
    if (!seen.includes(id)) {
      seen.push(id); f.dx_tyl_seen = seen.join(',');
      g.hud.toast(seen.length >= SPOT_IDS.length ? 'tyl_toast_all' : 'tyl_toast_page', { n: seen.length, m: SPOT_IDS.length });
      g.save(false);
    }
    this.albumOverlay();
    return true;
  }
  heroShown(on) { const h = this.game.hero; if (h.rig?.root) h.rig.root.visible = on; if (h.shadow) h.shadow.visible = on; if (h.rig?.silhouette) h.rig.silhouette.visible = on; }
  albumStep() {
    const g = this.game, I = g.input, V = this.view; if (!V) return;
    g.hero.vel?.set(0, 0);
    this.heroShown(false);
    const sw = spotWorld(g, V.id);
    if (g.camera.fov !== sw.fov) { g.camera.fov = sw.fov; g.camera.updateProjectionMatrix(); }
    if (I.pressed('pause') || I.menu?.('back') || I.pressed('action')) { this.closeAlbum(false); return; }
    if (I.pressed('interact')) { V.then = !V.then; g.audio.play('tClick'); this.albumOverlay(); }
  }
  albumOverlay() {
    const V = this.view, g = this.game;
    let el = $('#tylview');
    if (!el) {
      el = document.createElement('div'); el.id = 'tylview';
      el.style.cssText = 'position:fixed;inset:0;z-index:44;pointer-events:none;display:none;';
      el.innerHTML = '<canvas class="tylpic" style="position:absolute;inset:0;width:100%;height:100%;transition:opacity 0.35s"></canvas>'
        + '<div class="tyltag" style="position:absolute;left:3vw;top:4vh;font:bold clamp(16px,2.4vw,30px) serif;color:#fff4dc;text-shadow:0 2px 4px #000;letter-spacing:0.08em"></div>'
        + '<div class="tylcap" style="position:absolute;left:50%;bottom:6vh;transform:translateX(-50%);max-width:min(760px,90vw);padding:10px 18px;border-radius:10px;background:rgba(20,14,8,0.78);border:1px solid rgba(255,240,210,0.45);color:#fff;text-align:center;line-height:1.45;text-shadow:0 1px 2px #000"></div>';
      document.body.appendChild(el);
    }
    if (!V) { el.style.display = 'none'; return; }
    const c = el.querySelector('canvas');
    if (V.pic && c._for !== V.pic) { c.width = V.pic.width; c.height = V.pic.height; c.getContext('2d').drawImage(V.pic, 0, 0); c._for = V.pic; }
    c.style.opacity = V.then && V.pic ? '1' : '0';
    el.querySelector('.tyltag').textContent = t(V.then ? 'tyl_then' : 'tyl_now');
    const I = g.input, kb = (a) => `<kbd>${esc(I.label?.(a) ?? a)}</kbd>`;
    el.querySelector('.tylcap').innerHTML = `<div style="color:#ffe8b0;font-style:italic">${esc(t('tyl_cap_' + V.id))}</div><div style="opacity:0.85;font-size:0.9em;margin-top:3px">${t('tyl_album_keys', { e: kb('interact'), b: kb('pause') })}</div>`;
    el.style.display = 'block';
  }
  closeAlbum(quiet) {
    const g = this.game, V = this.view; if (!V) return;
    this.view = null;
    this.albumOverlay();
    if (g.cutscene && g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    g.camera.fov = V.fov; g.camera.updateProjectionMatrix();
    g.camRig.override = null; g.camRig.snap?.();
    this.heroShown(true);
    g.input.clearEdges?.();
    if (!quiet) g.save(false);
  }

  // ================================================================ per frame
  update(dt) {
    const g = this.game, f = this.f;
    if (this.Y && (this._st !== this.stage() || this._out !== this.outside() || this._open !== this.open)) { this._st = this.stage(); this._out = this.outside(); this._open = this.open; this.applyWorld(); }
    // off the island since he found her: she is at her camera next time
    if (f.dx_tyl_found && !f.dx_tyl_away && this.story.index === f.dx_tyl_ch && !this.scene && !(g.room && (ZEE_ROOMS.has(g.room.id) || g.room.id.startsWith('zh_')))) { f.dx_tyl_away = true; this.recast(); }
    const live = g.state === 'play' || g.state === 'dialog';
    this.thumb(this.open && this.stage() === 'search' && this.here() && live && !this.cardView && !this.view);
    if (this._q?.length) for (let i = this._q.length - 1; i >= 0; i--) { const q = this._q[i]; if ((q.t -= dt) <= 0) { this._q.splice(i, 1); q.fn(); } }
  }
  later(s, fn) { (this._q ||= []).push({ t: s, fn }); }

  items() {
    const st = this.stage();
    if (st === 'search') return [{ id: 'tyl_card', icon: 'leaflet' }];
    if (st === 'found') return [{ id: 'tyl_album', icon: 'notebook' }];
    return [];
  }
  journal() {
    const f = this.f, out = [];
    if (!f.dx_tyl_card) return out;
    out.push({ key: 'tyl_j_card', done: !!f.dx_tyl_found });
    if (f.dx_tyl_found) {
      out.push({ key: 'tyl_j_found', done: true });
      // (the journal reads plain keys; HE-TEXT: each language's line from its own table, so switching language shows the right one)
      const n = this.seen().length, m = SPOT_IDS.length, fill = (s) => s?.replace('{n}', n).replace('{m}', m);
      STR.en.tyl_j_pages_n = fill(STR.en.tyl_j_pages);
      if (STR.he.tyl_j_pages) STR.he.tyl_j_pages_n = fill(STR.he.tyl_j_pages);
      out.push({ key: 'tyl_j_pages_n', done: this.seen().length >= SPOT_IDS.length });
    }
    return out;
  }
}
