// SHOPS-1 (the user, 2.11.2026: "The shops: you must be able to buy in them"; "Does the Zeelich building give
// anything?"): Citadel's shops sell through the game's one shop (main.js openShop, hud.js openShop). Not a chapter: the
// director (index.js) asks it before the town's people talk (story/citizens.js), so a keeper's talk is a short line
// and then the shop. The keepers are INTERIOR-LIFE's people (src/game/roomlife.js) and Sefa, WA-15b's Esmer trader
// (walkrounds.js); nothing here moves anyone or touches a room's layout. Story state: flags prefixed sh_ (saved with
// the game); nothing else is saved.
//
//   Mr Bazoo's (LBA2: Bazoo sells goods)  magic flask 5, clover leaf 22, three darts 4 (with a blowgun), a
//                                          Nitro-Meca-Penguin 4 (after the prologue). In the evacuation (chapter 8)
//                                          he is packing and sells what he can't carry at half price.
//   The pharmacy (LBA2: potions, life)     heart potion 6, Mosquibee honey 8 (carried, up to three: when life runs
//                                          low a spoonful is taken by itself, half the life back). Shut in the
//                                          evacuation (a card on the counter).
//   The ticket office (LBA2: the ticket)   a cabin ticket for the Desert Island ferry, 5 (up to three). The ferry
//                                          itself stays free and its routes are travel.js's, unchanged: no softlock
//                                          and no new gate. A ticket is taken when he boards the ferry (either way)
//                                          and he steps off with full life and magic. Shut in the evacuation.
//   The Esmer trading house (WA-15b)       Sefa at its door: Mosquibee honey 7 (5 once she owes him), Zeelich spice
//                                          tea in a glazed jar 4 (refills magic), a crystal cell 5 (laser owners).
//                                          Its errand: a parcel short; Osk at the baggage claim has had it on his
//                                          belt all week. Brought back: 15 kashes, a jar of honey, cheaper honey.
//                                          Optional; nothing else depends on it. Shut in the evacuation (a note).
//   Tibbo's Fix and Fill (PURPOSES, 3.11.2026: the 'shop' house beside Pippa's stall, whose awning and globe sign
//                                          promised a shop): Tibbo at his counter under the awning, from the end of
//                                          chapter 1. Ten darts 9 (blowgun owners), a Nitro-Meca-Penguin 4, a crystal
//                                          cell 5 (laser owners: the only cells on Twinsun), and once, a fresh cell for
//                                          Arthur's pocket set 12 (its squeal comes back twice as soon: tools.js). His
//                                          first-visit gift: a penguin (five darts if the pockets are full), with the
//                                          tip that the project's guards watch anything that waddles: chapter 2's
//                                          station. Open in the evacuation too.
// No magic level is ever sold (MAGIC-LEVELS, story/magic.js).
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { ZH } from '../harbourzeelich.js';
import { ARMS } from '../weapons.js';
import '../text/shops.js';

export const SH_PRICE = { flask: 5, clover: 22, darts: 4, penguin: 4, potion: 6, honey: 8, ticket: 5, sefaHoney: 7, sefaHoneyFriend: 5, tea: 4, cell: 5, darts10: 9, pcell: 12 };
export const CARRY = 3;   // honey jars, cabin tickets
const KEEPER = { mrbazoo: 'bazoo', pharmacist: 'pharmacy', ines: 'ticket', sefa: 'esmer', tibbo: 'gadget' };
const REWARD = 15;
// the trading house's door (its front, +z of its own frame: harbourzeelich.js), read when first needed
let door = null;
// Tibbo's door: the 'shop' house's (town.js), read when first needed
const GDOOR = (W) => W?.houses?.find((h) => h.id === 'shop')?.door || null;
const DOOR = () => door ??= (() => { const b = ZH[0], c = Math.cos(b.ry), s = Math.sin(b.ry), lz = b.d / 2; return { x: b.x + s * lz, z: b.z + c * lz }; })();

export class Shops extends ChapterBase {
  get evac() { return this.story.cur?.key === 'evacuation'; }
  // Twinsen himself, in play (not Zoé's or a worker's segment)
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  // is this shop selling now? (its keeper's presence is INTERIOR-LIFE's / WORLD-LIFE's: story/interiors.js, citizens.js)
  open(where) { return where === 'bazoo' || where === 'gadget' || !this.evac; }
  // the keeper whose talk opens a shop now (main.js: the prompt reads "Shop")
  sells(npc) { const w = KEEPER[npc?.def?.id]; return !!w && this.able() && this.open(w) && !!npc.present && !npc.away; }
  title(w) { return w === 'bazoo' && this.evac ? 'sh_title_bazoo_sale' : { bazoo: 'sh_title_bazoo', pharmacy: 'sh_title_pharmacy', ticket: 'sh_title_ticket', esmer: 'sh_title_esmer', gadget: 'sh_title_gadget' }[w] || null; }

  // ---------------------------------------------------------------- the goods (main.js openShop)
  stock(w) {
    const g = this.game, h = g.hero, f = this.f, A = h.arms || {}, M = ARMS.max, out = [];
    const half = (p) => (this.evac ? Math.ceil(p / 2) : p);
    const own = (id, key, price, why = null) => out.push({ id, key, price, shop: true, disabled: !!why, why });
    const arm = (id, price, full) => out.push({ id, key: 'a_sh_' + id, price, arsenal: true, disabled: !!full, why: full ? 'shop_max' : null });
    const fullHp = h.hp >= h.maxHp ? 'sh_why_hp' : null, fullMp = h.mp >= h.mpMax ? 'sh_why_mp' : null;
    const carry = (k) => ((f[k] || 0) >= CARRY ? 'sh_why_carry' : null);
    if (w === 'bazoo') {
      own('flask', 'shop_flask', half(SH_PRICE.flask), fullMp);
      own('clover', 'shop_clover', half(SH_PRICE.clover), h.clovers >= 9 ? 'shop_max' : null);
      if (A.blowgun) arm('darts', half(SH_PRICE.darts), A.darts >= M.darts);
      if (f.prologueDone) arm('penguin', half(SH_PRICE.penguin), A.penguins >= M.penguins);
    } else if (w === 'pharmacy') {
      own('potion', 'shop_potion', SH_PRICE.potion, fullHp);
      own('honey', 'sh_honey', SH_PRICE.honey, carry('sh_honey'));
    } else if (w === 'ticket') {
      own('ticket', 'sh_ticket', SH_PRICE.ticket, carry('sh_ticket'));
    } else if (w === 'esmer') {
      own('honey', 'sh_honey', f.sh_sefaDone ? SH_PRICE.sefaHoneyFriend : SH_PRICE.sefaHoney, carry('sh_honey'));
      own('tea', 'sh_tea', SH_PRICE.tea, fullMp);
      if (A.laser) arm('cell', SH_PRICE.cell, A.charge > M.charge - 5);
    } else if (w === 'gadget') {
      if (A.blowgun) own('darts10', 'sh_darts10', SH_PRICE.darts10, A.darts >= M.darts ? 'shop_max' : null);
      arm('penguin', SH_PRICE.penguin, A.penguins >= M.penguins);
      if (A.laser) arm('cell', SH_PRICE.cell, A.charge > M.charge - 5);
      if (A.pocketset && !f.sh_pcell) own('pcell', 'sh_pcell', SH_PRICE.pcell);
    }
    return out;
  }
  // a bought good of our own (the kashes are taken by main.js)
  buy(it) {
    const g = this.game, h = g.hero, f = this.f;
    switch (it.id) {
      case 'potion': h.hp = h.maxHp; g.audio.play('heal'); break;
      case 'flask': case 'tea': h.mp = h.mpMax; g.audio.play('heal'); break;
      case 'clover': h.clovers = Math.min(9, h.clovers + 1); g.audio.play('heal'); break;
      case 'darts10': { const A = h.arms; A.darts = Math.min(ARMS.max.darts, A.darts + 10); g.audio.play('coin'); g.hud.toast('a_toast_darts', { n: 10 }); break; }
      case 'pcell': f.sh_pcell = true; g.audio.play('coin'); g.hud.toast('a_toast_got', { n: t('it_pcell') }); break;   // (a toast, as the other goods: no found box over the counter)
      case 'honey': case 'ticket': {
        const k = 'sh_' + it.id; f[k] = Math.min(CARRY, (f[k] || 0) + 1);
        g.audio.play('coin'); g.hud.toast('sh_toast_carry', { n: t('it_' + it.id), c: f[k] }); break;
      }
    }
    g.hud.stats?.(h);
  }

  // ---------------------------------------------------------------- carried (the inventory) and the journal
  items() {
    const f = this.f, out = [];
    if (f.sh_honey > 0) out.push({ id: 'honey', icon: 'honey', n: f.sh_honey });
    if (f.sh_ticket > 0) out.push({ id: 'ticket', icon: 'ticket', n: f.sh_ticket });
    if (f.sh_parcel && !f.sh_sefaDone) out.push({ id: 'parcel', icon: 'parcel' });
    if (f.sh_pcell) out.push({ id: 'pcell', icon: 'part' });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'sh_j_ask', done: !!(f.sh_parcel || f.sh_sefaDone), show: !!f.sh_sefaAsk },
      { key: 'sh_j_take', done: !!f.sh_sefaDone, show: !!(f.sh_parcel || f.sh_sefaDone) },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- people (asked before the town's own talk)
  talkFirst(npc) {
    const g = this.game, f = this.f, h = g.hero, id = npc.def.id;
    if (!this.able()) return false;
    if (id === 'osk') return this.oskTalk(npc);
    const w = KEEPER[id];
    if (!w || !this.open(w)) return false;
    // Tibbo opens once the well is sorted (the end of chapter 1); before, a line and no counter
    if (w === 'gadget' && !f.prologueDone) { npc.engage?.(); this.chain([[id, 'sh_gadget_early']], () => npc.release?.()); return true; }
    const lines = [];
    if (w === 'bazoo' && this.evac) lines.push([id, 'sh_bazoo_sale']);
    else if (!f['sh_met_' + w]) lines.push([id, 'sh_' + w + '_hi']);
    else { const k = this.story.citizens.linesFor(npc); const n = (npc.talkN = (npc.talkN ?? -1) + 1); lines.push([id, k.length ? k[n % k.length] : 'sh_' + w + '_hi']); }
    let after = null;
    if (w === 'gadget' && !f.sh_gift) {
      const full = (h.arms?.penguins ?? 0) >= ARMS.max.penguins;
      lines.push([id, full ? 'sh_gadget_gift_full' : 'sh_gadget_gift']);
      after = () => this.gift(full);
    }
    if (w === 'esmer') {
      if (f.sh_parcel && !f.sh_sefaDone) { lines.length = 0; lines.push(['sefa', 'sh_sefa_thanks']); after = () => this.reward(); }
      else if (!f.sh_sefaAsk) { lines.push(['sefa', 'sh_sefa_ask']); after = () => { f.sh_sefaAsk = true; }; }
    }
    npc.engage?.();
    this.chain(lines, () => { npc.release?.(); f['sh_met_' + w] = true; after?.(); g.save(false); g.openShop(w); });
    return true;
  }
  // Osk at the baggage claim: the Esmers' parcel, once Sefa has asked (otherwise his own lines: citizens.js)
  oskTalk(npc) {
    const g = this.game, f = this.f;
    if (f.sh_sefaAsk && !f.sh_parcel && !f.sh_sefaDone) {
      npc.engage?.();
      this.chain([['osk', 'sh_osk_give1'], ['hero', 'sh_tw_osk'], ['osk', 'sh_osk_give2']], () => {
        npc.release?.();
        if (f.sh_parcel) return;
        f.sh_parcel = true;
        g.found('parcel', 'it_parcel', () => g.save(false));
      });
      return true;
    }
    if (f.sh_sefaDone && !f.sh_oskAfter) {
      npc.engage?.();
      this.chain([['osk', 'sh_osk_after']], () => { npc.release?.(); f.sh_oskAfter = true; g.save(false); });
      return true;
    }
    return false;
  }
  // Tibbo's first-visit gift: once (the flag first), a penguin or, with full pockets, five darts
  gift(full) {
    const g = this.game, f = this.f, A = g.hero.arms;
    if (f.sh_gift) return;
    f.sh_gift = true;
    if (!full) { A.penguins = Math.min(ARMS.max.penguins, A.penguins + 1); g.hud.toast('a_toast_got', { n: t('it_penguin') }); }
    else { A.darts = Math.min(ARMS.max.darts, A.darts + 5); g.hud.toast('a_toast_darts', { n: 5 }); }
    g.audio.play('coin'); g.hud.stats?.(g.hero);
  }
  // the parcel delivered: once, whatever the order of saves and loads (the flag is set before anything is given)
  reward() {
    const g = this.game, f = this.f, h = g.hero;
    if (f.sh_sefaDone) return;
    f.sh_sefaDone = true;
    h.coins += REWARD;
    const jar = (f.sh_honey || 0) < CARRY;
    if (jar) f.sh_honey = (f.sh_honey || 0) + 1;
    g.audio.play('coin');
    g.hud.toast('a_toast_kashes', { n: REWARD });
    if (jar) g.hud.toast('sh_toast_carry', { n: t('it_honey'), c: f.sh_honey });
    g.hud.stats?.(h);
  }

  // ---------------------------------------------------------------- places: the Esmer house's door, the shut counters
  sefa() { const n = this.npc('sefa'); return n && n.present && !n.away ? n : null; }
  tibbo() { const n = this.npc('tibbo'); return n && n.present && !n.away ? n : null; }
  interactables(consider, dist) {
    const g = this.game, here = g.room?.id ?? 'citadel', h = g.hero;
    if (!this.able()) return;
    const D = DOOR();
    if (here === 'citadel' && Math.abs(h.pos.x - D.x) < 4 && Math.abs(h.pos.z - D.z) < 4) {
      const s = this.sefa(), near = s && !this.evac && Math.hypot(s.pos.x - D.x, s.pos.z - D.z) < 14;
      consider(dist(D.x, D.z), 1.6, { kind: 'sh_door', x: D.x, z: D.z, label: near ? 'p_shop' : 'p_read' });
    }
    // Tibbo's door: his counter when he is at it, his card otherwise
    const G = here === 'citadel' ? GDOOR(g.world) : null;
    if (G && Math.abs(h.pos.x - G.x) < 4 && Math.abs(h.pos.z - G.z) < 4) {
      const tb = this.tibbo(), near = tb && Math.hypot(tb.pos.x - G.x, tb.pos.z - G.z) < 14;
      consider(dist(G.x, G.z), 1.6, { kind: 'sh_gdoor', x: G.x, z: G.z, label: near ? 'p_shop' : 'p_read' });
    }
    if (this.evac && (here === 'pharmacy' || here === 'ticket')) {
      const R = g.regions?.built(here), sp = R && Object.values(R.npcSpots || {})[0];
      if (sp) consider(dist(sp.x, sp.z), 2.2, { kind: 'sh_note', x: sp.x, z: sp.z, key: here === 'pharmacy' ? 'sh_ph_closed' : 'sh_tk_closed', label: 'p_read' });
    }
  }
  interact(it) {
    const g = this.game;
    // (the ferry: noted here, then the travel menu opens as always: story/islands.js. A cabin ticket is taken on arrival.)
    if (it.kind === 'isleShuttle' && it.point?.mode === 'ferry') { this.ride = { from: regionNow(g), x: it.point.x, z: it.point.z }; return false; }
    if (it.kind === 'sh_door') {
      const s = this.sefa(), D = DOOR();
      if (s && !this.evac && Math.hypot(s.pos.x - D.x, s.pos.z - D.z) < 14) return this.talkFirst(s);
      g.say('', [t(this.evac ? 'sh_door_evac' : 'sh_door_sign')]);
      return true;
    }
    if (it.kind === 'sh_gdoor') {
      const tb = this.tibbo(), G = GDOOR(g.world);
      if (tb && G && Math.hypot(tb.pos.x - G.x, tb.pos.z - G.z) < 14) return this.talkFirst(tb);
      g.say('', [t('sh_gdoor_sign')]);
      return true;
    }
    if (it.kind === 'sh_note') { g.say('', [t(it.key)]); return true; }
    return false;
  }

  // ---------------------------------------------------------------- each frame: the honey, the cabin ticket
  update(dt) {
    const g = this.game, h = g.hero, f = this.f;
    if (g.state !== 'play' || g.trans || h.dead) return;
    this.honeyT = Math.max(0, (this.honeyT || 0) - (dt || 0));
    // the honey: a spoonful when life runs low (a quarter or less), half the life back
    if (f.sh_honey > 0 && h.hp > 0 && h.hp <= h.maxHp / 4 && !this.honeyT && g.room?.id !== 'arena') {
      f.sh_honey--;
      const n = Math.ceil(h.maxHp / 2);
      h.hp = Math.min(h.maxHp, h.hp + n);
      this.honeyT = 2;
      g.audio.play('heal');
      g.hud.toast('sh_toast_honey', { n });
      g.hud.stats?.(h);
    }
    // the ferry: he has crossed (the region changed): a cabin ticket is taken, and he steps off rested
    const R = this.ride;
    if (R) {
      const now = regionNow(g);
      if (now !== R.from) {
        this.ride = null;
        if (f.sh_ticket > 0) {
          f.sh_ticket--;
          h.hp = h.maxHp; h.mp = h.mpMax;
          g.audio.play('heal');
          g.hud.toast('sh_toast_cabin');
          g.hud.stats?.(h);
          g.save(false);
        }
      } else if (Math.hypot(h.pos.x - R.x, h.pos.z - R.z) > 8) this.ride = null;   // (the menu shut, and he walked off)
    }
  }
}
const regionNow = (g) => (g.room ? (g.room.outdoor ? g.room.id : 'in:' + g.room.id) : 'citadel');
