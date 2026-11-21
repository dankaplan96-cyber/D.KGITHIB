// Chapters 12 and 13 of the expanded campaign, on Ballastra (EXP-3, docs/lba-maturity/EXP-3.md; team-only), and the two
// places later in the campaign where they pay off (the valve room's relay in the network, the sleepers before the
// credits). Chapter 11 ends at the Speaking Steps with Baldino's news: every Balance Works coil is bought for the
// project, and no regulators; the network needs regulators and Tessa needs the numbers to build them.
//
// 12 `balances` "The House of Balances" (bh_): over the gardens' causeway, the House's hall (gardenrooms.js bl_house).
//   Fennick, the House's broker, will not give out the B-7's figures: sold with the design and every copy. The order
//   book says why the project bought them (Vesk's standing order: every coil and actuator, no regulators; the B-7
//   "failed buyer's test"); the test bench, played (the knock lever), shows the House's own coils held steady by Oren
//   and the B-7's card: passed. Fennick defends the arrangement (kiln families fed a year ahead; local levers were used
//   here once to shut the lower row out; the House does not test a buyer's reasons). Set against each other, the
//   House's records turn him: he gives the House's test copy and holds the next shipment. The working test, at the
//   gardens' rig: run 1 with the figures as written (a glazed lever) shows every lamp green while basin A sits low:
//   Oren holds it; Tessa fits a brass lever ("B-8: no glaze in the lever", her drawing in chapter 11). Run 2: each
//   basin's band set from its own neighbour's need (A Wenna's rafts high, B Corvin's wheel middle, C Mags's row low),
//   the storm sluice opened; a wrong band shows itself (amber, or a spill) and the rig resets; right twice ("It
//   repeats"), Tessa will build five.
// 13 `survey` "The Cradles" (wk_): Wenna's brother Jory is one of the 304. The Cradle Hall under the keepers' house by
//   the flood bell (archrooms.js bl_cradles): Garrow, Nan Odra, the Rings. Jory's card (wake me in ten years, or when my
//   sister asks), the ledger (deferred, 24 times), the Bay 2 plaque (a waking with the ring left open). Wenna asks; Oren
//   refuses and says what he fears. The ring shut, Twinsen holds the warming lever alone: Oren does not push against a
//   hand, but a hand tires (the cradle fails safe, asleep). The flood bell, untied and rung, brings the lower row; hand
//   to hand at the lever, each handover between Oren's strokes, J-17 warms and Jory wakes. The people say who decides
//   from now on; Nan Odra keeps her mother asleep, her choice. Tessa brings five B-8s; the freighter home.
// The network (story/network.js asks NetB8): in the valve room Oren trims the relay's share on a stroke; Twinsen fits
//   one of Tessa's B-8s and sets its band from Mira's needles, as on the rig; its brass lever does not move for Oren.
// The epilogue (story/epilogue.js asks sleepersScene): before the end card, the Cradle Hall four days on.
//
// Flags: bh_started, bh_go, bh_fen1, bh_book, bh_bench, bh_oren, bh_crates, bh_def, bh_fig, bh_rig1, bh_band0-2
// (0 low · 1 mid · 2 high), bh_test, bh_done; wk_started, wk_in, wk_door, wk_card, wk_ledger, wk_bay2, wk_ask, wk_ring,
// wk_solo, wk_bell, wk_rung, wk_awake, wk_done; nwb_trim, nwb_fit, nwb_band, nwb_set; ep_bl. Only the expanded
// campaign plays any of it (Story.inCampaign). No save is made inside the rig's run or the hand-to-hand at the lever:
// a load restarts that run (the bands and the ring kept).
import { ChapterBase, SPEAKER_COLORS } from './base.js';
import { t } from '../i18n.js';
import { playJourney } from '../travelfilm.js';
import { readyCast } from './ballastra.js';
import { GROOMS } from '../ballastra/gardenrooms.js';
import { ROOMS } from '../ballastra/archrooms.js';
import '../text/ballastra.js';

const gold = '#ffcf4a';
const NEED = [2, 1, 0];                 // the rig's basins: A Wenna's rafts high, B Corvin's wheel middle, C Mags's row low
const LEVEL = [0.32, 0.62, 0.95];       // a basin's water at each band
const WHO = ['bl_wenna', 'bl_corvin', 'bl_mags'];
const STROKE = 3.6, TONE = 0.9;         // Oren's hush pulses: he pushes on the stroke, not between (R1.4 rule 4)
const GRIP = 9, WARM_RATE = 100 / 34;   // s a hand holds before it tires; warmth per second while held (an hour, told short)
const HANDS = ['hero', 'bl_wenna', 'bl_mags', 'bl_dunn', 'bl_brin', 'bl_ottie', 'bl_nuna', 'bl_garrow'];
const ROW = ['bl_mags', 'bl_dunn', 'bl_brin', 'bl_ottie', 'bl_nuna'];
// each chapter's own cast: place() reads Ballastra's areas only for them (FULL-TEST: a read for anyone else counted as
// "his spot is in an area not built yet" (LAZY-REGIONS, Story.refreshCast), and after chapter 13 every person no later
// chapter placed waited hidden for Ballastra — Sefa's dome stood empty in the epilogue)
const CAST_BH = new Set(['tessa', 'bl_fennick', 'bl_wenna', 'bl_corvin', 'bl_mags', 'bl_halden']);
const CAST_WK = new Set(['tessa', 'bl_fennick', 'bl_garrow', 'bl_odra', 'bl_jory', 'bl_wenna', ...ROW]);
const LATER = { bl_quill: 'bl_qu_end', bl_hobb: 'bl_ho_after', bl_ferro: 'bl_fe_after', bl_halden: 'bl_ha_steps', bl_corvin: 'bl_co_after', bl_mags: 'bl_ma_after',
  bl_dunn: 'bl_du_after', bl_sorrel: 'bl_so_2', bl_brin: 'bl_br_2', bl_ottie: 'bl_ot_2', bl_nuna: 'bl_nu_2', bl_wenna: 'bl_we_after' };

// what both chapters share: the places, the markers, the lines on a return visit
class BlChapter extends ChapterBase {
  get GD() { return this.game.regions.built('bl_gardens')?.gardens; }
  get A() { return this.game.regions.built('bl_arches')?.arches; }
  get H() { return this.game.regions.built('ballastra')?.harbor; }
  room() { return this.game.room?.id ?? null; }
  inMine() { return this.reached() && this.story.inCampaign(this.key); }
  // a short wait in game time (a scene's beat); stepWaits(dt) runs them, from each chapter's update
  after(s, fn) { (this.waits ??= []).push({ s, fn }); }
  stepWaits(dt) { if (this.waits?.length && this.game.state !== 'pause') for (const w of this.waits.splice(0)) { w.s -= dt; if (w.s <= 0) w.fn(); else this.waits.push(w); } }
  say(key, vars, done, who = '') { const g = this.game; g.say(who ? 'n_' + who : '', [t(key, vars)], done, null, SPEAKER_COLORS[who || 'narrator']); }
  near(id, d) { const n = this.npc(id); return n?.present && n.distTo(this.game.hero) < d; }
  // the House's hall and the Cradle Hall: their spots once built (read through regions so a spot in an unbuilt area waits)
  house() { return this.game.regions.built('bl_house') ? GROOMS.house : null; }
  hall() { return this.game.regions.built('bl_cradles') ? ROOMS.cradles : null; }
  where() { const r = this.room(); return { ballastra: 'ballastra', bl_shed: 'ballastra', bl_arches: 'bl_arches', bl_oren: 'bl_arches', bl_mags: 'bl_arches', bl_pump: 'bl_arches', bl_cradles: 'bl_arches', bl_gardens: 'bl_gardens', bl_tunnel: 'bl_gardens', bl_kiln: 'bl_gardens', bl_house: 'bl_gardens' }[r] ?? null; }
  // a star on the objective: in its room or area, else on the way out toward it
  starFor(tg, m) {
    if (!tg?.p) return;
    const star = (p, label) => { if (p && Number.isFinite(p.x)) m.push({ x: p.x, z: p.z, kind: 'star', color: gold, r: 7, edge: true, label: t(label) }); };
    const r = this.room(), here = this.where();
    if (r === tg.room || (!tg.room && here === tg.at && r === tg.at)) { star(tg.p, tg.label); return; }
    if (!here) { const p = this.game.travel?.points?.ballastra_port; if (p && this.H) star(p, 'bl_mk_pad'); return; }
    if (r !== here) { const R = this.game.room; star(R?.exits?.[0], 'bl_mk_out'); return; }
    if (here === tg.at) { star(tg.door || tg.p, tg.label); return; }
    const A = this.A, GD = this.GD, H = this.H;
    if (here === 'ballastra') star(H?.exits.toArches, 'bl_mk_arches');
    else if (here === 'bl_gardens') star(GD?.exits.toArches, 'bl_mk_arches');
    else if (here === 'bl_arches') star(tg.at === 'ballastra' ? A?.exits.toHarbor : A?.exits.toGardens, tg.at === 'ballastra' ? 'bl_mk_harbor' : 'bl_mk_gardens');
  }
  // the exits the story opens: the causeway to the House, the keepers' door to the Cradle Hall (data in the places)
  openExit(regionId, ex) { const R = this.game.regions.built(regionId); if (R && ex && !R.exits.includes(ex)) R.exits.push(ex); }
  laterLine(id) { return LATER[id] ?? null; }
}

// ===================================================================== chapter 12
export class Balances extends BlChapter {
  place(id) {
    const f = this.f;
    if (!CAST_BH.has(id) || !this.isCur() || !this.inMine()) return undefined;
    const GD = this.GD, A = this.A, hs = this.house(), at = (p, extra) => (p ? { x: p.x, z: p.z, a: p.a ?? 0, ...extra } : undefined);
    const test = f.bh_fig && !f.bh_test, rw = GD?.stands;
    switch (id) {
      case 'tessa': return f.bh_go ? at(rw?.tessa_rig) : at(A?.stands.tessa_steps);
      case 'bl_fennick': return hs ? at(hs.fennick, { anim: 'tinker' }) : undefined;
      case 'bl_wenna': return test && rw ? at(rw.rigWatch1) : undefined;
      case 'bl_corvin': return test && rw ? { x: (rw.rigWatch1.x + rw.rigWatch2.x) / 2, z: rw.rigWatch1.z, a: Math.PI } : undefined;
      case 'bl_mags': return test && rw ? at(rw.rigWatch2) : undefined;
      case 'bl_halden': return f.bh_test && rw ? at(rw.oren_rig) : undefined;
    }
    return undefined;
  }
  sync(instant = true) {
    if (!this.inMine()) return;
    const f = this.f, GD = this.GD;
    if (!GD) return;
    this.openExit('bl_gardens', GD.exits.toHouse);
    GD.house?.setHeld(!!f.bh_fig); GD.house?.setCabinet(!!f.bh_fig, instant);
    const R = GD.rig, on = !!f.bh_rig1;
    for (let i = 0; i < 5; i++) R.setPart(i, on, instant);
    for (let i = 0; i < 3; i++) { R.setRange(i, f.bh_test ? NEED[i] : this.band(i), instant); R.setLamp(i, f.bh_test ? 'green' : 'off'); }
    R.setLevels([0, 1, 2].map((k) => (f.bh_test ? LEVEL[NEED[k]] : 0)), instant);
    R.setSluice(false, instant);
  }
  band(i) { const b = this.f['bh_band' + i]; return b >= 0 && b <= 2 ? b : 1; }
  regionBuilt(ids) { if (ids.includes('bl_gardens')) this.sync(true); }
  applyFlags() {
    this.run = null; this.waits = []; this.leaving = false;
    if (this.inMine() && this.f.bh_started) this.f.bh_go = true;   // (a save made under the card, before Tessa's first lines ended: she is at the rig)
    if (this.inMine()) this.sync(true);
  }

  begin() {
    const g = this.game, f = this.f;
    f.bh_started = true;
    readyCast();
    this.story.refreshCast();
    this.chain([['tessa', 'bh_te_1'], ['hero', 'bh_tw_1'], ['tessa', 'bh_te_2'], ['tessa', 'bh_te_3']], () => {
      f.bh_go = true; this.sync(true); this.story.refreshCast({ walk: true }); g.updateObjective(); g.save(false);
    });
  }
  update(dt) {
    const g = this.game, f = this.f;
    if (!this.isCur() || !this.inMine()) return;
    // (the scene beats' waits, in game time)
    this.stepWaits(dt);
    if (this.run) this.stepRun(dt);
    if (g.state !== 'play' || g.trans || g.cine) return;
    if (!f.bh_started) { this.begin(); return; }
    if (f.bh_done && !this.leaving) { this.leaving = true; g.startTransition(() => this.story.nextChapter(), this.story.nextAreas()); return; }
    this.nudge(dt, 'bh_turn', this.room() === 'bl_house' && f.bh_book && f.bh_bench && !f.bh_fig, 50, 'bh_nudge_turn');
    this.nudge(dt, 'bh_bands', this.room() === 'bl_gardens' && f.bh_rig1 && !f.bh_test && !this.run, 70, 'bh_nudge_bands');
  }

  interactables(consider, dist) {
    const f = this.f, r = this.room();
    if (!this.isCur() || !this.inMine()) return;
    const at = (p, kind, label, extra) => { if (p) consider(dist(p.x, p.z), p.r ?? 1.0, { kind, label, ...extra }); };
    if (r === 'bl_house') {
      const hs = GROOMS.house;
      at(hs.book, 'bh_book', 'p_read'); at(hs.bench, 'bh_bench', 'p_lever'); at(hs.crates, 'bh_crates', 'p_look');
      if (f.bh_fig) at(hs.cabinet, 'bh_cabinet', 'p_look');
    } else if (r === 'bl_gardens' && f.bh_rig1 && !f.bh_test && !this.run && this.GD) {
      for (let i = 0; i < 3; i++) at(this.GD.spots['rigRange' + i], 'bh_dial', 'p_dial', { i });
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.isCur() || !it.kind?.startsWith('bh_')) return false;
    const c = (lines, done) => this.chain(lines, done);
    const after = () => { g.updateObjective(); g.save(false); };
    switch (it.kind) {
      case 'bh_book': {
        const first = !f.bh_book; f.bh_book = true;
        c(first ? [['narrator', 'bh_book'], ['narrator', 'bh_book2'], ['hero', 'bh_tw_book']] : [['narrator', 'bh_book'], ['narrator', 'bh_book2']], after);
        return true;
      }
      case 'bh_bench':
        h.act('use', 0.6, () => {
          g.regions.built('bl_gardens')?.gardens?.house?.knock();
          if (!f.bh_bench) { f.bh_bench = true; c([['narrator', 'bh_knock'], ['narrator', 'bh_card'], ['hero', 'bh_tw_card']], after); return; }
          if (!f.bh_oren) { f.bh_oren = true; g.audio.play('orenTone'); c([['narrator', 'bh_knock2'], ['oren', 'bh_or_hold'], ['hero', 'bh_tw_or'], ['oren', 'bh_or_hold2']], after); return; }
          c([['narrator', 'bh_knock2']]);
        }, 0.3);
        return true;
      case 'bh_crates': f.bh_crates = true; c([['narrator', f.bh_fig ? 'bh_crates_held' : 'bh_crates']]); return true;
      case 'bh_cabinet': c([['narrator', 'bh_cabinet']]); return true;
      case 'bh_dial': {
        const i = it.i;
        h.act('use', 0.5, () => {
          const b = (this.band(i) + 1) % 3; f['bh_band' + i] = b;
          this.GD?.rig.setRange(i, b); g.audio.play('select'); g.save(false);
          this.say('bh_dial_read', { b: t('bh_b_' + i), v: t('bh_band_' + b) });
        }, 0.3);
        return true;
      }
    }
    return false;
  }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur() || !this.inMine()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    const after = () => { g.updateObjective(); g.save(false); };
    switch (id) {
      case 'bl_fennick': return this.talkFennick();
      case 'tessa':
        if (!f.bh_go) return c([['tessa', 'bh_te_3']], () => { f.bh_go = true; this.story.refreshCast({ walk: true }); after(); });
        if (!f.bh_fig) return c([['tessa', f.bh_book || f.bh_bench ? 'bh_te_wait2' : 'bh_te_wait']]);
        if (!f.bh_rig1) return this.firstRun();
        if (this.run) return c([['tessa', 'bh_te_watch']]);
        if (!f.bh_test) return c([['tessa', 'bh_te_go']], () => this.startRun());
        return c([['tessa', 'bh_te_five']]);
      case 'bl_wenna': if (f.bh_fig && !f.bh_test) return c([['bl_wenna', 'bh_we_need']]); break;
      case 'bl_corvin': if (f.bh_fig && !f.bh_test) return c([['bl_corvin', 'bh_co_need']]); break;
      case 'bl_mags': if (f.bh_fig && !f.bh_test) return c([['bl_mags', 'bh_ma_need']]); break;
      case 'bl_halden': if (f.bh_book) return c([['bl_halden', 'bh_ha_1']]); break;
      case 'doran': return c([['doran', 'bh_do_wait']]);
    }
    const k = this.laterLine(id);
    if (k) return c([[id, k]], after);
    return false;
  }
  talkFennick() {
    const g = this.game, f = this.f, c = (lines, done) => { this.chain(lines, done); return true; };
    const after = () => { g.updateObjective(); g.save(false); };
    if (f.bh_fig) return c([['bl_fennick', 'bh_fe_after']]);
    if (!f.bh_fen1) return c([['bl_fennick', 'bh_fe_1'], ['hero', 'bh_tw_f1'], ['bl_fennick', 'bh_fe_2'], ['hero', 'bh_tw_f2'], ['bl_fennick', 'bh_fe_3']], () => { f.bh_fen1 = true; after(); });
    // the defence, once he has read the order (said before the turn, whichever clue came first)
    if (f.bh_book && !f.bh_def) return c([['hero', 'bh_tw_d1'], ['bl_fennick', 'bh_fe_d1'], ['hero', 'bh_tw_d2'], ['bl_fennick', 'bh_fe_d2'], ['bl_fennick', 'bh_fe_d3']], () => { f.bh_def = true; after(); });
    if (!(f.bh_book && f.bh_bench)) return c([['bl_fennick', f.bh_book ? 'bh_fe_bench' : 'bh_fe_book']]);
    // the turn: the House's own records against each other, and the tag Zoé found on the B-7 in chapter 10
    return c([['hero', 'bh_tw_t1'], ['bl_fennick', 'bh_fe_t1'], ['hero', 'bh_tw_t2'], ['bl_fennick', 'bh_fe_t2'], ['bl_fennick', 'bh_fe_t3'], ['bl_fennick', 'bh_fe_t4']], () => {
      f.bh_fig = true; this.sync(false); g.audio.play('chest');
      g.found?.('plan', 'it_bh_figures', () => {});
      this.story.refreshCast({ walk: true });
      this.chain([['bl_fennick', 'bh_fe_t5']], after);
    });
  }
  // run 1: the figures as written, a glazed lever: every lamp green, and basin A low. Oren holds it.
  firstRun() {
    const g = this.game, f = this.f, R = this.GD?.rig;
    if (!R) return false;
    this.chain([['tessa', 'bh_te_r1']], () => {
      for (let i = 0; i < 5; i++) R.setPart(i, true);
      for (let i = 0; i < 3; i++) R.setRange(i, 1);
      R.setSluice(true); R.setLevels([LEVEL[1], LEVEL[1], LEVEL[1]]);
      this.after(2.2, () => { for (let i = 0; i < 3; i++) R.setLamp(i, 'green'); g.audio.play('orenTone'); });
      this.after(2.6, () => this.chain([['narrator', 'bh_r1'], ['bl_wenna', 'bh_we_r1'], ['oren', 'bh_or_steady'], ['tessa', 'bh_te_r2'], ['tessa', 'bh_te_brass'], ['narrator', 'bh_brass']], () => {
        R.setSluice(false); R.setLevels([0, 0, 0]); for (let i = 0; i < 3; i++) R.setLamp(i, 'off');
        f.bh_rig1 = true; g.updateObjective(); g.save(false);
        this.chain([['tessa', 'bh_te_bands']]);
      }));
    });
    return true;
  }
  // run 2: the sluice opens; each basin rises to its band in turn; then the lamps say whether each band was right
  startRun() {
    const R = this.GD?.rig; if (!R) return;
    this.run = { t: 0, n: this.run?.n ?? 0, done: false };
    for (let i = 0; i < 3; i++) R.setLamp(i, 'off');
    R.setSluice(true);
  }
  stepRun(dt) {
    const g = this.game, f = this.f, R = this.GD?.rig, U = this.run;
    if (!R) { this.run = null; return; }
    if (g.state === 'pause') return;
    U.t += dt;
    const lv = [0, 1, 2].map((i) => (U.t > 1.2 + i * 1.8 ? LEVEL[this.band(i)] : 0));
    R.setLevels(lv);
    if (U.t < 7 || U.done) return;
    U.done = true;
    const wrong = [0, 1, 2].filter((i) => this.band(i) !== NEED[i]);
    [0, 1, 2].forEach((i) => R.setLamp(i, this.band(i) === NEED[i] ? 'green' : this.band(i) < NEED[i] ? 'amber' : 'red'));
    if (wrong.length) {
      const i = wrong[0], hi = this.band(i) > NEED[i];
      if (hi) R.spill(i, i === 2 ? 1 : i + 1);
      g.audio.play(hi ? 'splash' : 'clunk');
      this.chain([[WHO[i], 'bh_rw_' + i + (hi ? '_hi' : '_lo')], ['tessa', 'bh_te_reset']], () => this.resetRun(0));
      return;
    }
    U.n++;
    g.audio.play('chest');
    if (U.n < 2) { this.chain([['narrator', 'bh_r2ok'], ['tessa', 'bh_te_again']], () => this.resetRun(U.n, true)); return; }
    this.chain([['narrator', 'bh_r3ok'], ['tessa', 'bh_te_rep'], ['hero', 'bh_tw_rep'], ['tessa', 'bh_te_rep2'], ['bl_corvin', 'bh_co_rep'], ['bl_mags', 'bh_ma_rep'], ['tessa', 'bh_te_rep3']], () => {
      this.run = null; f.bh_test = true; this.sync(false); g.updateObjective(); g.save(false);
      f.bh_done = true; g.save(false);
    });
  }
  resetRun(n, again = false) {
    const R = this.GD?.rig;
    R?.setSluice(false); R?.setLevels([0, 0, 0]);
    this.run = null;
    this.after(again ? 2.4 : 2.0, () => { for (let i = 0; i < 3; i++) R?.setLamp(i, 'off'); if (again) { this.run = { t: 0, n, done: false }; R?.setSluice(true); } });
  }

  objective() {
    const f = this.f;
    if (!this.inMine() || !f.bh_started) return '';
    if (!f.bh_fig) return this.goal('bh_obj_house') + this.sub(!!f.bh_fen1, 'bh_sub_fen') + this.sub(!!f.bh_book, 'bh_sub_book') + this.sub(!!f.bh_bench, 'bh_sub_bench') + this.sub(false, 'bh_sub_show');
    if (!f.bh_rig1) return this.goal('bh_obj_rig');
    if (!f.bh_test) return this.goal('bh_obj_bands') + [0, 1, 2].map((i) => this.sub(false, 'bh_sub_band' + i)).join('') + this.sub(false, 'bh_sub_run');
    return this.goal('bh_obj_rig');
  }
  target() {
    const f = this.f, GD = this.GD, hs = this.house();
    if (!f.bh_fig) return { at: 'bl_gardens', room: 'bl_house', p: hs?.fennick ?? GD?.exits.toHouse, door: GD?.exits.toHouse, label: 'bh_mk_house' };
    return { at: 'bl_gardens', p: GD?.stands.tessa_rig, label: 'bh_mk_rig' };
  }
  markers() {
    const m = [];
    if (!this.isCur() || !this.inMine() || !this.f.bh_started) return m;
    const tg = this.target();
    if (tg.room === 'bl_house' && this.room() !== 'bl_house' && this.where() === 'bl_gardens') { if (tg.door) m.push({ x: tg.door.x, z: tg.door.z, kind: 'star', color: gold, r: 7, edge: true, label: t(tg.label) }); return m; }
    this.starFor(tg, m);
    return m;
  }
  items() { const f = this.f; return this.isCur() && f.bh_fig && !f.bh_test ? [{ id: 'bh_figures', icon: 'plan', n: 1 }] : []; }
  journal() {
    const f = this.f;
    return [
      { key: 'bh_j_house', done: !!f.bh_fen1 },
      { key: 'bh_j_order', done: !!f.bh_book },
      { key: 'bh_j_bench', done: !!f.bh_bench },
      { key: 'bh_j_fennick', done: !!f.bh_def },
      { key: 'bh_j_fig', done: !!f.bh_fig },
      { key: 'bh_j_brass', done: !!f.bh_rig1 },
      { key: 'bh_j_test', done: !!f.bh_test },
    ].filter((l) => l.done);
  }
}

// ===================================================================== chapter 13
export class Cradles extends BlChapter {
  place(id) {
    const f = this.f;
    if (!CAST_WK.has(id) || !this.inMine()) return undefined;
    const cur = this.isCur(), A = this.A, hl = this.hall(), GD = this.GD, hs = this.house();
    const at = (p, extra) => (p ? { x: p.x, z: p.z, a: p.a ?? 0, ...extra } : undefined);
    // after the chapter (a return visit, the epilogue): Fennick at his counter, the keepers in the hall, Jory with Wenna
    if (!cur) {
      switch (id) {
        case 'bl_fennick': return hs ? at(hs.fennick, { anim: 'tinker' }) : undefined;
        case 'bl_garrow': return hl ? at(hl.garrow) : undefined;
        case 'bl_odra': return hl ? at(hl.odra) : undefined;
        case 'bl_jory': return f.ep_bl ? (hl ? at(hl.jory) : undefined) : GD ? { x: GD.stands.wenna_rafts.x + 1.2, z: GD.stands.wenna_rafts.z + 0.4, a: -Math.PI / 2 } : undefined;
        case 'bl_wenna': return f.ep_bl && hl ? at(hl.wenna) : undefined;
      }
      return undefined;
    }
    const outside = A?.exits.toCradles;
    switch (id) {
      case 'bl_fennick': return hs ? at(hs.fennick, { anim: 'tinker' }) : undefined;
      case 'bl_garrow': return hl ? at(hl.garrow) : undefined;
      case 'bl_odra': return hl ? at(hl.odra, { anim: f.wk_rung ? null : 'wipe' }) : undefined;
      case 'bl_jory': return f.wk_awake && hl ? at(hl.jory) : null;
      case 'bl_wenna':
        if (!f.wk_started) return at(GD?.stands.rigWatch1);
        if (!f.wk_in) return outside ? { x: outside.x - 1.3, z: outside.z + 1.1, a: -Math.PI / 2 } : undefined;
        return hl ? at(hl.wenna) : undefined;
      case 'tessa': return f.wk_awake && hl ? { x: hl.door.x + 1.4, z: hl.door.z - 0.6, a: Math.PI / 2 } : at(GD?.stands.tessa_rig);
    }
    const r = ROW.indexOf(id);
    if (r >= 0 && f.wk_rung && hl) return at(hl.hands[r]);
    return undefined;
  }
  sync(instant = true) {
    if (!this.inMine()) return;
    const f = this.f, A = this.A;
    if (A) {
      this.openExit('bl_arches', A.exits.toCradles);
      if (f.wk_bell) A.bell.untie(instant);
    }
    const C = this.game.regions.built('bl_arches')?.arches?.cradles;
    if (C && this.game.regions.built('bl_cradles')) {
      C.setRing(!!f.wk_ring); C.setLid('j17', f.wk_awake ? 1 : 0, instant); C.setWarm(f.wk_awake ? 1 : 0); C.setLever(0, instant);
      for (let i = 0; i < 7; i++) C.setLid(i, f.ep_bl && [1, 4, 5].includes(i) ? 1 : 0, instant);
      C.setLamp(0, 'green'); C.setLamp(1, 'green');
    }
  }
  get C() { return this.game.regions.built('bl_arches')?.arches?.cradles; }
  regionBuilt(ids) { if (ids.includes('bl_arches')) this.sync(true); }
  applyFlags() { this.rota = null; this.leaving = false; this.waits = []; if (!this.f.wk_started) this.begun = false; if (this.inMine()) this.sync(true); }

  begin() {
    const g = this.game, f = this.f;
    readyCast();
    // (P90: Jory's own words, his card, are a line of their own; a breath of play after Twinsen's answer, and only then
    // does Wenna say where the hall is: the chapter's first instruction)
    this.chain([['bl_wenna', 'wk_we_1'], ['hero', 'wk_tw_1'], ['bl_wenna', 'wk_we_2'], ['bl_wenna', 'wk_we_2b'], ['hero', 'wk_tw_2']], () => {
      // (if he has started another talk or gone through a door in the pause, she waits until he is free)
      const where = () => {
        if (g.state !== 'play' || g.trans || g.cine) { this.after(0.3, where); return; }
        this.chain([['bl_wenna', 'wk_we_3']], () => {
          f.wk_started = true; this.sync(true); this.story.refreshCast({ walk: true }); g.updateObjective(); g.save(false);
        });
      };
      this.after(1.6, where);
    });
    this.begun = true;
  }
  update(dt) {
    const g = this.game, f = this.f;
    if (!this.isCur() || !this.inMine()) return;
    this.stepWaits(dt);
    if (this.rota) this.stepRota(dt);
    if (g.state !== 'play' || g.trans || g.cine) return;
    if (!f.wk_started && !this.begun) { this.begin(); return; }
    if (f.wk_done && !this.leaving) { this.end(); return; }
    if (this.room() === 'bl_cradles' && f.wk_in && !f.wk_door && !this.inScene) { this.inScene = true; this.doorScene(); return; }
    this.nudge(dt, 'wk_card', this.room() === 'bl_cradles' && f.wk_door && !f.wk_card, 60, 'wk_nudge_card');
    this.nudge(dt, 'wk_bell', f.wk_solo && !f.wk_rung, 90, 'wk_nudge_bell');
  }
  onEnterRoom(id) {
    if (!this.isCur() || !this.inMine()) return;
    if (id === 'bl_cradles' && !this.f.wk_in) { this.f.wk_in = true; }
    this.sync(true); this.story.refreshCast();
  }
  onExitRoom() { if (this.isCur()) this.story.refreshCast(); }
  doorScene() {
    const g = this.game, f = this.f;
    this.chain([['bl_garrow', 'wk_ga_1'], ['bl_wenna', 'wk_we_4'], ['bl_garrow', 'wk_ga_2'], ['oren', 'wk_or_look'], ['bl_garrow', 'wk_ga_3']], () => {
      f.wk_door = true; this.inScene = false; g.updateObjective(); g.save(false);
    });
  }
  end() {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game, T = g.travel, go = (then) => g.startTransition(() => this.story.nextChapter(), this.story.nextAreas(), then);
    if (!this.where()) { go(null); return; }
    playJourney(g, { from: T?.points?.ballastra_port, to: T?.points?.zeelich_port, mode: 'ship' }, go);
  }

  interactables(consider, dist) {
    const f = this.f, r = this.room();
    if (!this.isCur() || !this.inMine()) return;
    const at = (p, kind, label, extra) => { if (p) consider(dist(p.x, p.z), p.r ?? 1.0, { kind, label, ...extra }); };
    if (r === 'bl_cradles' && f.wk_door) {
      const H = ROOMS.cradles;
      at(H.card, 'wk_card', 'p_read'); at(H.ledger, 'wk_ledger', 'p_read'); at(H.plaque, 'wk_bay2', 'p_read'); at(H.board, 'wk_board', 'p_read');
      if (!f.wk_awake) {
        at(H.rings, 'wk_rings', 'p_listen');
        if (f.wk_ask && !f.wk_ring) at(H.ring, 'wk_ring', 'p_push');
        if (f.wk_ask) at(H.lever, 'wk_lever', this.rota ? 'p_next' : 'p_hold');
      }
    } else if (r === 'bl_arches' && f.wk_solo && !f.wk_rung && this.A) {
      at(this.A.spots.bellPull, 'wk_bell', f.wk_bell ? 'p_bell' : 'p_look');
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.isCur() || !it.kind?.startsWith('wk_')) return false;
    const c = (lines, done) => this.chain(lines, done);
    const after = () => { g.updateObjective(); g.save(false); };
    switch (it.kind) {
      case 'wk_card': f.wk_card = true; c([['narrator', 'wk_card'], ['bl_wenna', 'wk_we_card']], after); return true;
      case 'wk_ledger': f.wk_ledger = true; c([['narrator', 'wk_ledger'], ['bl_garrow', 'wk_ga_ledger']], after); return true;
      case 'wk_bay2': f.wk_bay2 = true; c([['narrator', 'wk_bay2']], after); return true;
      case 'wk_board': c([['narrator', f.wk_awake ? 'wk_board2' : 'wk_board']]); return true;
      case 'wk_rings': {
        if (!f.wk_card) { c([['oren', 'wk_or_look'], ['bl_wenna', 'wk_we_card0']]); return true; }
        if (f.wk_ask) { c([['oren', f.wk_solo ? 'wk_or_tired' : 'wk_or_4']]); return true; }
        g.audio.play('orenTone'); this.C?.rings.setMode('attending');
        c([['bl_wenna', 'wk_we_ask'], ['oren', 'wk_or_1'], ['hero', 'wk_tw_card'], ['oren', 'wk_or_2'], ['bl_wenna', 'wk_we_5'], ['oren', 'wk_or_3'], ['bl_garrow', 'wk_ga_ring'], ['oren', 'wk_or_4']], () => {
          this.C?.rings.setMode('turning'); f.wk_ask = true; after();
        });
        return true;
      }
      case 'wk_ring':
        h.act('use', 0.8, () => { f.wk_ring = true; this.C?.setRing(true); g.audio.play('clunk'); c([['narrator', 'wk_ring'], ['bl_garrow', 'wk_ga_ring2']], after); }, 0.4);
        return true;
      case 'wk_lever':
        if (this.rota) { this.handOver(); return true; }
        if (!f.wk_ring) { c([['bl_garrow', 'wk_ga_first']]); return true; }
        if (!f.wk_solo) { c([['bl_odra', 'wk_od_solo'], ['hero', 'wk_tw_solo']], () => this.startRota(true)); return true; }
        if (!f.wk_rung) { c([['bl_odra', 'wk_od_alone']]); return true; }
        c([['hero', 'wk_tw_rota'], ['bl_mags', 'wk_ma_rota']], () => this.startRota(false));
        return true;
      case 'wk_bell': {
        const B = this.A?.bell;
        if (!f.wk_bell) {
          if (!this.bellSeen) { this.bellSeen = true; c([['narrator', 'wk_bell_tied']]); return true; }
          h.act('use', 1.0, () => { B?.untie(); f.wk_bell = true; c([['narrator', 'wk_bell_untie']], after); }, 0.5);
          return true;
        }
        h.act('use', 0.8, () => {
          B?.ring(); f.wk_rung = true; g.save(false);
          c([['narrator', 'wk_bell_ring'], ['bl_mags', 'wk_ma_bell'], ['hero', 'wk_tw_hands'], ['bl_mags', 'wk_ma_hands']], () => { this.story.refreshCast({ walk: true }); after(); });
        }, 0.4);
        return true;
      }
    }
    return false;
  }

  // ---- the lever: hand to hand. Played in the open: he holds by standing at it (walking off lets go); E at the lever
  //      calls the next hand. On Oren's stroke a handover slips the lever back a little; between strokes it is clean.
  startRota(solo) {
    const g = this.game, H = ROOMS.cradles, h = g.hero;
    h.pos.x = H.hold.x; h.pos.z = H.hold.z; h.angle = Math.atan2(H.lever.x - h.pos.x, H.lever.z - h.pos.z);
    this.rota = { solo, t: 0, warm: 0, who: 0, grip: GRIP, held: true, ft: 0, told: 0, cycle: 0 };
    this.C?.setLever(1);
    g.audio.play('clunk'); g.updateObjective();
  }
  holder() { return HANDS[this.rota.who % HANDS.length]; }
  holderNpc() { const id = this.holder(); return id === 'hero' ? this.game.hero : this.npc(id); }
  stepRota(dt) {
    const g = this.game, f = this.f, U = this.rota, H = ROOMS.cradles, C = this.C;
    if (g.state !== 'play' || this.room() !== 'bl_cradles') { if (this.room() !== 'bl_cradles') { this.rota = null; C?.setLever(0); C?.setWarm(0); g.updateObjective(); } return; }
    U.t += dt;
    const ph = U.t % STROKE, tone = ph < TONE;
    if (Math.floor(U.t / STROKE) !== U.cycle) { U.cycle = Math.floor(U.t / STROKE); g.audio.play('orenTone'); C?.rings.setMode('attending'); }
    if (!tone) C?.rings.setMode('turning');
    // Twinsen's own turn: he holds while he stands at the lever
    if (U.held && this.holder() === 'hero' && Math.hypot(g.hero.pos.x - H.hold.x, g.hero.pos.z - H.hold.z) > 1.3) { U.held = false; U.grip = 0; g.hud.toast('wk_t_walk'); }
    if (U.held) {
      U.grip -= dt; U.warm = Math.min(100, U.warm + dt * WARM_RATE);
      if (U.grip <= 0) { U.held = false; C?.setLever(0); if (U.solo) g.hud.toast('wk_t_shake'); else g.hud.toast('wk_t_let', { who: this.nameOf(this.holder()) }); }
    } else U.warm = Math.max(0, U.warm - dt * 1.5);
    C?.setWarm(U.warm / 100);
    if ((U.ft += dt) > 1.2) { U.ft = 0; g.hud.float(t('wk_f_warm', { n: Math.round(U.warm) }), { x: H.lever.x - 1.4, y: 1.6, z: H.lever.z - 0.6 }, '#ffcf8a'); g.updateObjective(); }
    for (const [mark, key] of [[25, 'wk_t_20'], [50, 'wk_t_40'], [75, 'wk_t_60']]) if (U.warm >= mark && U.told < mark) { U.told = mark; g.hud.toast(key); }
    if (U.solo && !U.held && !this.soloEnd) { this.soloEnd = true; this.endSolo(); return; }
    if (U.warm >= 100 && !U.solo) this.wake();
  }
  nameOf(id) { return id === 'hero' ? t('n_hero') : t('n_' + id); }
  handOver() {
    const g = this.game, U = this.rota, H = ROOMS.cradles, C = this.C;
    if (!U || U.solo) return;
    const ph = U.t % STROKE, tone = ph < TONE;
    const prev = this.holderNpc(), prevId = this.holder();
    U.who++;
    if (this.holder() === 'hero') U.who++;   // (he has had his turn: the row's hands go round)
    const next = this.holderNpc(); if (!next) return;
    if (tone && U.held) { U.warm = Math.max(0, U.warm - 8); g.hud.toast('wk_t_slip'); g.audio.play('clunk'); }
    else g.hud.toast('wk_t_hand', { who: this.nameOf(this.holder()) });
    // the one who held steps back; the next takes the lever
    if (prev && prevId !== 'hero') { const k = ROW.indexOf(prevId); const s = H.hands[k >= 0 ? k : 5] ?? H.wait; prev.placeAt({ x: s.x, z: s.z, a: s.a ?? 0 }); }
    if (prevId === 'hero') { const s = H.wait; g.hero.pos.x = s.x; g.hero.pos.z = s.z; }
    next.placeAt({ x: H.hold.x, z: H.hold.z, a: Math.PI, anim: 'tinker' });
    U.held = true; U.grip = GRIP; C?.setLever(1);
  }
  endSolo() {
    const g = this.game, f = this.f;
    this.C?.setLever(0);
    this.chain([['narrator', 'wk_solo_slip'], ['oren', 'wk_or_tired'], ['bl_odra', 'wk_od_why'], ['hero', 'wk_tw_pass'], ['bl_odra', 'wk_od_row'], ['bl_garrow', 'wk_ga_bell'], ['bl_wenna', 'wk_we_bell']], () => {
      this.rota = null; this.soloEnd = false; this.C?.setWarm(0);
      f.wk_solo = true; g.updateObjective(); g.save(false);
    });
  }
  wake() {
    const g = this.game, f = this.f, C = this.C;
    this.rota = null;
    C?.setLid('j17', 1); C?.setWarm(1); C?.setLever(0);
    f.wk_awake = true;
    this.story.refreshCast();
    g.audio.play('chest');
    this.chain([['narrator', 'wk_wake'], ['bl_jory', 'wk_jo_1'], ['bl_wenna', 'wk_we_6'], ['bl_jory', 'wk_jo_2'], ['bl_wenna', 'wk_we_7'], ['oren', 'wk_or_5'], ['oren', 'wk_or_6'], ['bl_mags', 'wk_ma_ours'],
      ['hero', 'wk_tw_who'], ['bl_odra', 'wk_od_rule'], ['oren', 'wk_or_7'], ['bl_odra', 'wk_od_mine'], ['bl_garrow', 'wk_ga_key']], () => {
      g.updateObjective(); g.save(false);
      this.story.refreshCast({ walk: true });
      this.chain([['tessa', 'wk_te_1'], ['tessa', 'wk_te_2'], ['hero', 'wk_tw_te'], ['tessa', 'wk_te_3']], () => { f.wk_done = true; g.save(false); });
    });
  }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur() || !this.inMine()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'bl_wenna':
        if (!f.wk_started) return false;
        if (f.wk_awake) return c([['bl_wenna', 'wk_we_after']]);
        if (!f.wk_in) return c([['bl_wenna', 'wk_we_3']]);
        return c([['bl_wenna', !f.wk_card ? 'wk_we_card0' : f.wk_solo && !f.wk_rung ? 'wk_we_bell' : 'wk_we_wait']]);
      case 'bl_garrow': return c([['bl_garrow', f.wk_awake ? 'wk_ga_after' : f.wk_bay2 ? 'wk_ga_bay2' : 'wk_ga_2']]);
      case 'bl_odra': return c([['bl_odra', f.wk_awake ? 'wk_od_mine' : 'wk_od_1']]);
      case 'bl_jory': return c([['bl_jory', 'wk_jo_after']]);
      case 'tessa': return c([['tessa', f.wk_awake ? 'wk_te_3' : 'wk_te_wait']]);
      case 'bl_fennick': return c([['bl_fennick', 'bh_fe_after']]);
      case 'doran': return c([['doran', 'bh_do_wait']]);
    }
    if (ROW.includes(id) && f.wk_rung && !f.wk_awake) return c([[id, 'wk_row_wait']]);
    const k = this.laterLine(id);
    return k ? c([[id, k]]) : false;
  }
  // a return visit after both chapters (the network on): the new cast keeps a word
  talkLater(npc) {
    const id = npc.def.id;
    if (!this.reached() || this.isCur() || !this.story.inCampaign(this.key) || !this.f.wk_done) return false;
    const k = { bl_fennick: 'bh_fe_later', bl_garrow: 'wk_ga_later', bl_odra: 'wk_od_later', bl_jory: 'wk_jo_later', bl_wenna: 'wk_we_later', tessa: 'wk_te_later' }[id] ?? this.laterLine(id);
    if (!k) return false;
    this.chain([[id, k]]);
    return true;
  }

  objective() {
    const f = this.f;
    if (!this.inMine() || !f.wk_started) return '';
    if (this.rota && !this.rota.solo) return this.goal('wk_obj_rota', { n: Math.round(this.rota.warm) }) + this.sub(false, 'wk_sub_who', { who: this.nameOf(this.holder()) }) + this.sub(false, 'wk_sub_rest');
    if (!f.wk_door) return this.goal('wk_obj_hall');
    if (!f.wk_ask) return this.goal('wk_obj_ask') + this.sub(!!f.wk_card, 'wk_sub_card') + this.sub(!!f.wk_ledger, 'wk_sub_ledger') + this.sub(!!f.wk_bay2, 'wk_sub_bay2') + this.sub(false, 'wk_sub_oren');
    if (!f.wk_solo) return this.goal('wk_obj_wake') + this.sub(!!f.wk_ring, 'wk_sub_ring') + this.sub(false, 'wk_sub_lever');
    if (!f.wk_rung) return this.goal('wk_obj_bell') + this.sub(!!f.wk_bell, 'wk_sub_untie') + this.sub(false, 'wk_sub_ring2');
    if (!f.wk_awake) return this.goal('wk_obj_hands');
    return this.goal('wk_obj_tessa');
  }
  markers() {
    const f = this.f, m = [];
    if (!this.isCur() || !this.inMine() || !f.wk_started) return m;
    const A = this.A, hl = ROOMS.cradles, door = A?.exits.toCradles;
    let tg;
    if (f.wk_solo && !f.wk_rung) tg = { at: 'bl_arches', p: A?.spots.bellPull, label: 'wk_mk_bell' };
    else if (!f.wk_awake) tg = { at: 'bl_arches', room: 'bl_cradles', p: !f.wk_door || !f.wk_card ? hl.card : !f.wk_ask ? hl.rings : !f.wk_ring ? hl.ring : hl.lever, door, label: 'wk_mk_hall' };
    else tg = { at: 'bl_arches', room: 'bl_cradles', p: hl.door, door, label: 'wk_mk_tessa' };
    if (tg.room && this.room() !== tg.room && this.where() === 'bl_arches') { if (door) m.push({ x: door.x, z: door.z, kind: 'star', color: gold, r: 7, edge: true, label: t('wk_mk_hall') }); return m; }
    this.starFor(tg, m);
    return m;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'wk_j_wenna', done: !!f.wk_started },
      { key: 'wk_j_hall', done: !!f.wk_door },
      { key: 'wk_j_card', done: !!f.wk_card },
      { key: 'wk_j_ask', done: !!f.wk_ask },
      { key: 'wk_j_solo', done: !!f.wk_solo },
      { key: 'wk_j_bell', done: !!f.wk_rung },
      { key: 'wk_j_awake', done: !!f.wk_awake },
    ].filter((l) => l.done);
  }
}

// ===================================================================== the network: Tessa's B-8 on the valve room's relay
// network.js owns one (net.b8) and asks it: when the valve room's three gauges are green, on() says whether Oren's trim
// comes first (the expanded campaign, the rig's test passed, the station not done yet).
export class NetB8 {
  constructor(net) { this.net = net; this.game = net.game; this.story = net.story; }
  get f() { return this.game.flags; }
  has() { return this.story.inCampaign('balances') && !!this.f.bh_test; }
  on() { return this.has() && this.net.isCur() && !this.f.c10_valves && !this.f.nwb_set; }
  relay() { return this.net.relays?.valves; }
  relayAt() { const r = this.relay(); if (!r) return null; const p = r.getWorldPosition(r.position.clone()); return { x: p.x, z: p.z + 0.9 }; }
  pres() { return this.story.chapters.find((c) => c.key === 'throttle')?.pres; }
  // the gauges are green: Oren trims the relay's share on a stroke; the relay goes dim
  trim(then) {
    const g = this.game, f = this.f, n = this.net;
    this.then = then;
    if (f.nwb_trim) return;
    f.nwb_trim = true; f.nwb_band = 2;
    n.lightRelay('valves'); this.relay()?.userData.setOn?.(false);
    g.audio.play('orenTone'); this.pres()?.setMode('attending');
    n.chain([['narrator', 'nwb_trim'], ['oren', 'nwb_or_trim'], ['mira', 'nwb_mi_trim'], ['hero', 'nwb_tw_b8']], () => { this.pres()?.setMode('turning'); g.updateObjective(); g.save(false); });
  }
  // a load in the valve room: the relay as the flags left it
  applyFlags() { if (this.on() && this.f.nwb_trim) this.game.regions?.whenBuilt?.('valves', () => { this.net.lightRelay('valves'); this.relay()?.userData.setOn?.(false); }); }
  interactables(consider, dist) {
    const f = this.f;
    if (!this.on() || !f.nwb_trim || this.game.room?.id !== 'valves') return;
    const p = this.relayAt(); if (!p) return;
    consider(dist(p.x, p.z), 1.1, { kind: f.nwb_fit ? 'nwbBand' : 'nwbFit', label: f.nwb_fit ? 'p_dial' : 'p_fit' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, n = this.net;
    if (it.kind === 'nwbFit') {
      h.act('use', 1.0, () => { f.nwb_fit = true; g.audio.play('clunk'); g.save(false); n.chain([['narrator', 'nwb_fit'], ['mira', 'nwb_mi_2']], () => g.updateObjective()); }, 0.5);
      return true;
    }
    if (it.kind === 'nwbBand') {
      h.act('use', 0.5, () => {
        const b = ((f.nwb_band ?? 2) + 1) % 3; f.nwb_band = b; g.audio.play('select');
        if (b !== 1) { g.save(false); n.chain([['mira', b === 2 ? 'nwb_mi_2' : 'nwb_mi_0']]); return; }
        this.relay()?.userData.setOn?.(true);
        n.chain([['narrator', 'nwb_mid'], ['mira', 'nwb_mi_1']], () => {
          g.audio.play('orenTone'); this.pres()?.setMode('attending');
          n.chain([['narrator', 'nwb_push'], ['oren', 'nwb_or_brass'], ['mira', 'nwb_mi_mine']], () => {
            this.pres()?.setMode('turning');
            f.nwb_set = true; g.save(false);
            (this.then ?? (() => n.valvesGreen?.()))();
            this.then = null;
          });
        });
      }, 0.3);
      return true;
    }
    return false;
  }
  sub() {
    const f = this.f;
    if (!this.on() || !f.nwb_trim) return '';
    return `<span class="s">◆ ${t(f.nwb_fit ? 'nwb_sub_band' : 'nwb_sub_fit')}</span>`;
  }
}

// ===================================================================== before the credits: the Cradle Hall four days on
// (story/epilogue.js asks: true if it plays, then calls done when it is back in the kitchen)
export function sleepersScene(epi, done) {
  const g = epi.game, f = epi.f, story = epi.story;
  if (!story.inCampaign('survey') || !f.wk_awake) return false;
  const h = g.hero, show = (on) => { h.rig.root.visible = on; if (h.shadow) h.shadow.visible = on; };
  readyCast().then(() => {
    g.addActors();
    f.ep_bl = true;
    g.startTransition(() => {
      g.enterRoom('bl_cradles', null, true);
      const H = ROOMS.cradles; h.pos.x = H.wait.x; h.pos.z = H.wait.z + 0.6; show(false);
      story.chapters.find((c) => c.key === 'survey')?.sync(true);
      story.refreshCast();
    }, ['bl_arches'], () => {
      epi.chain([['narrator', 'ep_bl_1'], ['bl_jory', 'ep_bl_jory'], ['bl_wenna', 'ep_bl_wenna'], ['bl_odra', 'ep_bl_odra'], ['oren', 'ep_bl_oren']], () => {
        g.startTransition(() => { g.enterRoom('house', null, true); show(true); story.refreshCast(); }, ['house'], () => done());
      });
    });
  });
  return true;
}
