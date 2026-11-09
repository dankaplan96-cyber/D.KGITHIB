// PEOPLE-1: what the people of Zeelich's islands say and the one small thing each island gives the journey (the residents
// themselves: src/game/islandlife.js). Not a chapter: the director (index.js) asks it before the town's people talk
// (story/citizens.js), and for its places. Its state is flags prefixed pp_ (saved with the game); nothing else is saved.
//
//   Otringal      the Imperial Hotel's coin machines: life or magic, 5 kashes each (the lobby, any time).
//   Knartas       the quay light is dark: the project bought its lens. Quill asks for it back (pp_quill). From chapter 9 the
//                 bar's boss at Otringal sells the project's leftover stores, the lens among them (20 kashes; 8 once the
//                 Lift Dock's crane driver has shown Twinsen the manifest: pp_manifest). Fitted (pp_light): a clover.
//   Lift Dock     the crane driver's manifest: where the lens went (the bar's price comes down).
//   Mosquibee     the hives are restless: the shuttles cut low over the meadow. Bzzra (pp_bzzra) sells honey; once the
//                 beacon on the Orchard's cloud catcher is lit by the ball (pp_beacon) the shuttles swing wide and she gives
//                 a jar of royal honey (pp_royal: carried, a full heal when life runs low) and the honey costs less.
//   The Orchard   Pell's nectar cordial: magic, 4 kashes; the beacon is on its cloud catcher.
//   Celebration   the lantern seller: a lantern for 10 kashes if Twinsen has none (the old Wannie mine below is dark).
//   Under Celeb.  the gas-works foreman points to the old mine (the Wannie glove: story/arsenal.js).
//   The Platform  the chapel bell has lost its clapper (pp_bellAsk); it lies by the ore cart (pp_clapper); brought back
//                 (pp_bell): the chaplain's thanks, a clover.
//   The Old Watch the telescope shows a supply crate on the Orchard's far side (pp_spied); searched (pp_cache): 15 kashes
//                 and a jar of honey.
// The lines follow the chapter: chapters 4–7, the evacuation (8: news from Twinsun; Zeelich itself unchanged), the council
// (9), chapter 10 on, the epilogue.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { ISLE_THINGS, ISLE_IDS, ISLE_ROOM_IDS, lineState, islePhase, dressIsle } from '../islandlife.js';
import { HOTEL } from '../otrhotel.js';
import { CARRY } from './shops.js';
import '../text/islandpeople.js';

export const IP_PRICE = { life: 5, magic: 5, lens: 20, lensPaper: 8, honey: 6, honeyFriend: 4, cordial: 4, lantern: 10 };
// ISLES-BAR: [the favour's flag, the line while it is open, the line once it is done (else the key itself)]
const FAVOUR_LINE = {
  ip_kn_kid_after: ['pp_light', 'ip_kn_kid_after_dark'], ip_kn_kid_1: ['pp_light', 'ip_kn_kid_1', 'ip_kn_kid_1_lit'],
  ip_kn_fisher_after: ['pp_light', 'ip_kn_fisher_after_dark'], ip_ow_kid_after: ['pp_light', 'ip_ow_kid_after_dark'],
  ip_ot_boss_after: ['pp_light', 'ip_ot_boss_after_dark'],
  ip_ot_guest_after: ['pp_beacon', 'ip_ot_guest_after_dark'], ip_ld_load2_after: ['pp_beacon', 'ip_ld_load2_after_dark'],
  ip_or_carter_after: ['pp_beacon', 'ip_or_carter_after_dark'], ip_ce_dancer1_after: ['pp_beacon', 'ip_ce_dancer1_after_dark'],
  ip_or_pick1_after: ['pp_bzzraDone', 'ip_or_pick1_after_dark'], ip_or_pell_ord: ['pp_beacon', 'ip_or_pell_ord', 'ip_or_pell_ord_lit'],
};
const ISLE_OF = Object.fromEntries(Object.entries(ISLE_IDS).flatMap(([a, ids]) => ids.map((id) => [id, a])));
for (const id of ISLE_ROOM_IDS) ISLE_OF[id] = 'isle_otringal';

export class IslandPeople extends ChapterBase {
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  from(key) { const i = this.idx(key); return i >= 0 && this.story.index >= i; }
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  here() { return this.game.room?.id ?? 'citadel'; }
  isle(name) { return this.game.regions?.built('isle_' + name); }
  T(name) { return ISLE_THINGS[name] || {}; }

  // ---------------------------------------------------------------- state → world
  applyFlags() { this.applyThings(); }
  regionBuilt(ids) { if (ids.some((i) => i.startsWith('isle_'))) this.applyThings(); }
  applyThings() {
    const f = this.f;
    for (const n of ['knartas', 'orchard', 'platform']) if (this.isle(n)) dressIsle(this.game, n);
    this.T('knartas').light?.set(!!f.pp_light);
    const B = this.T('orchard').beacon, O = this.isle('orchard');
    if (B && O) {
      B.set(!!f.pp_beacon);
      if (!this.beaconT || this.beaconT.R !== O) { this.beaconT = { R: O, x: B.x, y: B.y, z: B.z, r: 0.8, onHit: () => this.beaconHit() }; O.ballTargets.push(this.beaconT); }
      this.beaconT.done = !!f.pp_beacon;
    }
    const C = this.T('platform').clapper; if (C?.mesh) C.mesh.visible = !f.pp_clapper && !f.pp_bell;
    const K = this.T('orchard').cache; if (K?.mesh) K.mesh.visible = !f.pp_cache;
  }
  items() {
    const f = this.f, out = [];
    if (f.pp_lens && !f.pp_light) out.push({ id: 'lens', icon: 'part' });
    if (f.pp_clapper && !f.pp_bell) out.push({ id: 'clapper', icon: 'part' });
    if (f.pp_royal > 0) out.push({ id: 'royal', icon: 'honey', n: f.pp_royal });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'ip_j_light', done: !!f.pp_light, show: f.pp_quill || f.pp_lens || f.pp_light },
      { key: 'ip_j_beacon', done: !!f.pp_bzzraDone, show: f.pp_bzzra || f.pp_beacon },
      { key: 'ip_j_bell', done: !!f.pp_bell, show: f.pp_bellAsk || f.pp_clapper },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- places
  interactables(consider, dist) {
    if (!this.able()) return;
    const g = this.game, here = this.here(), f = this.f, y = g.hero.pos.y;
    if (here === 'otrhotel' && islePhase(this.story)) {
      for (const m of HOTEL.machines || []) consider(dist(m.x, m.z), 1.2, { kind: 'ip_machine', what: m.kind, label: 'p_station' });
      return;
    }
    if (!here.startsWith('isle_')) return;
    const name = here.slice(5), T = this.T(name);
    if (name === 'knartas' && T.light) consider(dist(T.light.prompt.x, T.light.prompt.z), 1.5, { kind: 'ip_light', label: f.pp_lens && !f.pp_light ? 'p_fit' : 'p_look' });
    if (name === 'platform' && T.clapper && !f.pp_clapper && !f.pp_bell && Math.abs(T.clapper.y - y) < 1.5) consider(dist(T.clapper.x, T.clapper.z), 1.4, { kind: 'ip_clapper', label: 'p_take' });
    if (name === 'orchard' && T.cache && !f.pp_cache && Math.abs(T.cache.y - y) < 1.5) consider(dist(T.cache.x, T.cache.z), 1.5, { kind: 'ip_cache', label: 'p_rummage' });
    if (name === 'oldwatch') { const R = this.isle('oldwatch'), p = R?.pois?.find((q) => q.word === 'TELESCOPE'); if (p) consider(dist(p.x, p.z), 1.6, { kind: 'ip_scope', label: 'p_scope' }); }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'ip_machine': {
        const life = it.what === 'life', full = life ? h.hp >= h.maxHp : h.mp >= h.mpMax, price = life ? IP_PRICE.life : IP_PRICE.magic;
        if (full) { g.audio.play('deny'); g.hud.toast(life ? 'sh_why_hp' : 'sh_why_mp'); return true; }
        if (h.coins < price) { g.audio.play('deny'); g.hud.toast('shop_poor'); return true; }
        h.coins -= price;
        if (life) h.hp = h.maxHp; else h.mp = h.mpMax;
        g.audio.play('heal'); g.hud.toast(life ? 'ip_toast_life' : 'ip_toast_magic', { n: price }); g.hud.stats?.(h); g.save(false);
        return true;
      }
      case 'ip_light':
        if (f.pp_light) return say([['narrator', 'ip_light_lit']]);
        if (!f.pp_lens) return say([['narrator', 'ip_light_dark'], 'ip_light_tw'], () => { f.pp_quillSeen = true; });
        return say(['ip_light_fit'], () => this.fitLens());
      case 'ip_clapper':
        return say([['narrator', 'ip_clapper_look'], 'ip_clapper_take'], () => {
          if (f.pp_clapper) return;
          f.pp_clapper = true; this.applyThings();
          g.found('clapper', 'it_clapper', () => g.save(false));
        });
      case 'ip_cache':
        return say([['narrator', f.pp_spied ? 'ip_cache_spied' : 'ip_cache_look']], () => this.openCache());
      case 'ip_scope':
        return say([['narrator', 'ip_scope_1'], ['narrator', f.pp_cache ? 'ip_scope_after' : 'ip_scope_2'], f.pp_cache ? 'ip_scope_tw_after' : 'ip_scope_tw'], () => { if (!f.pp_spied) { f.pp_spied = true; g.save(false); } });
    }
    return false;
  }
  fitLens() {
    const g = this.game, f = this.f, h = g.hero;
    if (f.pp_light || !f.pp_lens) return;
    f.pp_light = true; this.applyThings();
    h.clovers = Math.min(9, h.clovers + 1);
    g.audio.play('chest'); g.hud.toast('toast_clover_found'); g.hud.stats?.(h);
    const L = this.T('knartas').light; if (L) g.particles?.burst(L.x, L.y + 3.4, L.z, '#fff0b0', 18, 1.4);
    const q = this.npc('kn_quill'), near = q?.present && !q.away && Math.hypot(q.pos.x - h.pos.x, q.pos.z - h.pos.z) < 18;
    this.chain([['narrator', 'ip_light_on'], ...(near ? [['kn_quill', 'ip_quill_thanks']] : [])], () => g.save(false));
  }
  openCache() {
    const g = this.game, f = this.f, h = g.hero;
    if (f.pp_cache) return;
    f.pp_cache = true; this.applyThings();
    h.coins += 15;
    const jar = (f.sh_honey || 0) < CARRY; if (jar) f.sh_honey = (f.sh_honey || 0) + 1;
    g.audio.play('coin'); g.hud.toast('a_toast_kashes', { n: 15 });
    if (jar) g.hud.toast('sh_toast_carry', { n: t('it_honey'), c: f.sh_honey });
    g.hud.stats?.(h); g.save(false);
  }
  // the ball on the Orchard's beacon: lit, the shuttles swing wide of the meadow
  beaconHit() {
    const g = this.game, f = this.f;
    if (f.pp_beacon) return;
    f.pp_beacon = true; this.applyThings();
    const B = this.T('orchard').beacon;
    g.audio.play('chest'); if (B) g.particles?.burst(B.x, B.y, B.z, '#ffd860', 20, 1.5);
    this.chain([['hero', f.pp_bzzra ? 'ip_beacon_lit' : 'ip_beacon_lit_cold']], () => g.save(false));
  }

  // ---------------------------------------------------------------- people (asked before the town's own talk)
  linesFor(npc) {
    const id = npc.def.id, st = lineState(this.story), ph = islePhase(this.story) || 'ord', has = (k) => t(k) !== k, keys = [];
    for (const k of [`ip_${id}_${st}`, `ip_${id}_${ph}`]) if (has(k) && !keys.includes(k)) keys.push(k);
    for (let i = 0; i < 4 && has(`ip_${id}_${i}`); i++) keys.push(`ip_${id}_${i}`);
    // (ISLES-BAR: a line that tells of a favour done is said only once it is; till then its other line: text/isleslife.js)
    return keys.map((k) => { const w = FAVOUR_LINE[k]; return w ? (this.f[w[0]] ? w[2] || k : w[1]) : k; });
  }
  talkFirst(npc) {
    const id = npc?.def?.id;
    if (!id || !ISLE_OF[id] || !this.able()) return false;
    const g = this.game, f = this.f, A = g.hero.arms || {};
    const c = (lines, done) => { npc.engage?.(); this.chain(lines.map((l) => (Array.isArray(l) ? l : [id, l])), () => { npc.release?.(); done?.(); }); return true; };
    const plain = () => { const k = this.linesFor(npc); if (!k.length) return false; const n = (npc.talkN = (npc.talkN ?? -1) + 1); return c([k[n % k.length]]); };
    switch (id) {
      case 'kn_quill':
        if (f.pp_light) return c(['ip_quill_after']);
        if (!f.pp_quill) return c(['ip_quill_1', 'ip_quill_2', this.from('council') ? 'ip_quill_c9' : 'ip_quill_wait'], () => { f.pp_quill = true; g.save(false); });
        return c([f.pp_lens ? 'ip_quill_haslens' : this.from('council') ? 'ip_quill_c9' : 'ip_quill_wait']);
      case 'ld_crane':
        if (!f.pp_manifest) return c(['ip_crane_1', this.from('council') ? 'ip_crane_sold' : 'ip_crane_held'], () => { f.pp_manifest = true; g.save(false); });
        if (f.pp_lens) return plain();
        return c([this.from('council') ? 'ip_crane_sold' : 'ip_crane_held']);
      case 'ot_boss': {
        if (!this.from('council') || f.pp_lens) return plain();
        const price = f.pp_manifest ? IP_PRICE.lensPaper : IP_PRICE.lens;
        return c([f.pp_manifest ? 'ip_boss_lens_paper' : 'ip_boss_lens'], () => this.sell([{ id: 'lens', key: 'ip_sh_lens', price }], 'ip_sh_boss', (it) => {
          f.pp_lens = true; g.found('lens', 'it_lens', () => g.save(false));
        }));
      }
      case 'mb_bzzra': {
        const reward = f.pp_beacon && !f.pp_bzzraDone;
        const lines = reward ? ['ip_bzzra_thanks'] : !f.pp_bzzra ? ['ip_bzzra_1', 'ip_bzzra_2'] : f.pp_bzzraDone ? [this.linesFor(npc)[0] || 'ip_bzzra_after'] : ['ip_bzzra_wait'];
        return c(lines, () => {
          f.pp_bzzra = true;
          if (reward) { f.pp_bzzraDone = true; f.pp_royal = (f.pp_royal || 0) + 1; g.audio.play('coin'); g.hud.toast('a_toast_got', { n: t('it_royal') }); }
          g.save(false);
          this.sell(() => [{ id: 'honey', key: 'sh_honey', price: f.pp_bzzraDone ? IP_PRICE.honeyFriend : IP_PRICE.honey, disabled: (f.sh_honey || 0) >= CARRY, why: 'sh_why_carry' }], 'ip_sh_bzzra', () => {
            f.sh_honey = Math.min(CARRY, (f.sh_honey || 0) + 1); g.hud.toast('sh_toast_carry', { n: t('it_honey'), c: f.sh_honey });
          }, true);
        });
      }
      case 'or_pell': {
        const k = this.linesFor(npc), n = (npc.talkN = (npc.talkN ?? -1) + 1);
        return c([k.length ? k[n % k.length] : 'ip_or_pell_0'], () => this.sell(() => [{ id: 'flask', key: 'ip_sh_cordial', price: IP_PRICE.cordial, disabled: g.hero.mp >= g.hero.mpMax, why: 'sh_why_mp' }], 'ip_sh_pell', () => { g.hero.mp = g.hero.mpMax; g.audio.play('heal'); }, true));
      }
      case 'ce_lanterns':
        if (!A.lantern) return c(['ip_lant_sell'], () => this.sell([{ id: 'lantern', key: 'a_sh_lantern', price: IP_PRICE.lantern }], 'ip_sh_lant', () => this.story.arsenal.gain('lantern', 'it_lantern')));
        return c([A.glove ? 'ip_lant_after' : 'ip_lant_mine']);
      case 'pf_chaplain':
        if (f.pp_bell) return plain();
        if (f.pp_clapper) return c(['ip_chap_thanks'], () => {
          if (f.pp_bell) return;
          f.pp_bell = true; this.applyThings();
          const h = g.hero; h.clovers = Math.min(9, h.clovers + 1);
          g.audio.play('chest'); g.hud.toast('toast_clover_found'); g.hud.stats?.(h); g.save(false);
        });
        if (!f.pp_bellAsk) return c(['ip_chap_1', 'ip_chap_2'], () => { f.pp_bellAsk = true; g.save(false); });
        return c(['ip_chap_wait']);
    }
    return plain();
  }
  // a small counter of the islands' own (the game's shop panel; the kashes taken here)
  sell(list, title, give, keepOpen = false) {
    const g = this.game, h = g.hero, items = typeof list === 'function' ? list : () => list;
    g.setState('shop');
    g.hud.openShop(items, (it) => {
      if (it.disabled) { g.hud.toast(it.why || 'shop_max'); g.audio.play('deny'); return; }
      if (h.coins < it.price) { g.hud.toast('shop_poor'); g.audio.play('deny'); return; }
      h.coins -= it.price; g.audio.play('coin');
      if (!keepOpen) { g.hud.shopClose?.(); }
      give(it);
      g.hud.stats?.(h); g.save(false);
    }, () => g.setState('play'), title);
  }

  // ---------------------------------------------------------------- each frame: the royal honey
  update(dt) {
    const g = this.game, h = g.hero, f = this.f;
    if (!(f.pp_royal > 0) || g.state !== 'play' || g.trans || h.dead) return;
    this.royalT = Math.max(0, (this.royalT || 0) - (dt || 0));
    // (after the ordinary honey: a jar of that is taken first, story/shops.js)
    if (h.hp > 0 && h.hp <= h.maxHp / 4 && !(f.sh_honey > 0) && !this.royalT && g.room?.id !== 'arena') {
      f.pp_royal--; this.royalT = 2;
      h.hp = h.maxHp; g.audio.play('heal'); g.hud.toast('ip_toast_royal'); g.hud.stats?.(h);
    }
  }
}
