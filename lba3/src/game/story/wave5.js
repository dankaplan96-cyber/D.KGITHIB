// WAVE 5 (docs/lba-maturity/WAVE5.md; CONTENT-15H.md §3 H-12, H-13, H-14; cards DEPTH-PLAN.md CIT-1, R-1, R-2, R-3,
// DES-3). Not a chapter, and not asked by the director directly: story/depth.js owns it (this.w5) and passes its hooks
// on (one writer of depth.js, no new line in index.js). Its pieces in the world are src/game/wave5world.js, its text
// text/wave5.js. Every part is optional: nothing on the main path needs any of it, and no gate opens to it.
//
// H-12 · Nell's bench (Citadel lane; from the end of The Mislabelled Shipment, l_coupler) and Baldino's tins
//   Nell, her engine running: "Bring me the right part and I'll tune any of your gadgets." The chalk list at her bench's
//   end names a line for each tool he owns. (1) Pump lance (8 → 12 jets a tank, 15 kashes): an Esmer pressure bulb —
//   Pello the press-master on the Orchard gives it when asked (once the list or Nell's word is known). (2) Heat flask
//   (holds heat 90 → 150 s, 20 kashes): a copper sleeve — Tashi in Lhar gives his offcut when asked. (3) Hop-pack
//   (thrust 2.2 → 3.0 s, 25 kashes; its lift cap, 2.4 m, and every other rule unchanged): Baldino's three prototype
//   tins on three rock stacks one storey high (2.35 m) in three regions — the Whispering Cliffs' plateau (Citadel), by
//   the School of Magic (Desert Island), under Lhar's falls (the Hamalayi). Each stack stands free: from its top
//   neither a jump nor the pack reaches anything new (the test step's rule, arsenal.js stepSpot), so the tuned pack
//   opens nothing a gate keeps shut. Baldino tells where once he has given the pack. Each tin holds 8 kashes.
//   The tuned numbers are written onto the tools' own tables (tools.js LANCE.tank, FLASK.keep; jetpack.js JET.fuel)
//   from the flags at every load, and the tools' descriptions read the tuned text.
// H-13 · The monastery cistern (the yard; from chapter 7, The Observatory) and the old adit's seam (Under Celebration)
//   Tenpa: the cistern door opens when its basin is full; the spring froze. The basin fills in six steps: a bucket of
//   trough water is one step (the bucket by the trough; the trough's ice is broken at the spout), a lance jet half a
//   step (the lance is filled at the same trough: 8 jets fill four steps, a tuned lance's 12 all six). Full, the chain
//   lifts the door: the monks' seed store, 20 kashes of old offerings in a bowl and a tea urn on a warm stone: its tea
//   fills his magic whenever he passes (a lasting use, not a one-off). Tenpa's lore after.
//   The seam: beside the old adit (arsenal.js: where the glove is found) a second, older frame packed with loose
//   stones. The pocket set whistles there (kit2.js hums), the lantern shows a glint in the crack behind; a bare fist
//   only thuds, the Wannie glove breaks it: a rough gem. Old Jaspa (Knartas) buys it for 25 kashes; once his gems are
//   sorted (ISL-1) he names the place. From chapter 4 (the shuttles), once the glove can be had.
// H-14 · Ilka's breathing ground (Desert Island; from chapter 5, Steam and Sand, on)
//   Ilka: the vent breathes; numbers, or the council calls it a feeling. Three numbered stakes: by the oasis, on the
//   dig's rim, by Hesk's flags. A reading: strike the singing fork by a stake, or stand by it and watch its little flag
//   lift in the warm air (three seconds: the slower way, no tool). The three to Ilka, or pinned to her survey board
//   (she is not always on the island): her warm-ground map, copied to the holomap, rings the places on the planet
//   where a singing crystal still hums (hud.js asks humRegions()). Done before the council's vote (chapter 9): Dallan
//   adds her numbers and Brum says his vote out loud (story/council.js reads w5b_done; the vote is unchanged).
// No clover leaf anywhere here (CLOVER-BALANCE): kashes and useful things only.
//
// State (flags, new only, w5*; an old save has none and nothing is made up):
//   w5n_ask, w5n_list, w5n_bulb, w5n_sleeve, w5n_lance, w5n_flask, w5n_pack; w5t_ask, w5t_1, w5t_2, w5t_3;
//   w5c_ask, w5c_fill (0..12: half-steps), w5c_bucket ('empty' | 'full': carried), w5c_open, w5c_store, w5c_lore;
//   w5s_hint, w5s_broke, w5s_gem, w5s_sold; w5b_ask, w5b_1, w5b_2, w5b_3 ('fork' | 'flag'), w5b_done ('ilka' | 'board').
//   A door rising or a flag being watched is not saved: a load stands each where its flags put it.
import { t, STR } from '../i18n.js';
import { ChapterBase } from './base.js';
import { LANCE, FLASK, FORK } from '../tools.js';
import { JET } from '../jetpack.js';
import { CRYSTAL_IDS, CRYSTAL_QUEST } from '../crystals.js';
import { W5, turn, buildChalkList, buildTinStack, buildCistern, buildBucket, buildIceHole, buildSeam, buildStake, TIN_H } from '../wave5world.js';
import '../text/wave5.js';

// the tune-ups: the tools' numbers before and after, Nell's price
export const TUNE = {
  lance: { flag: 'w5n_lance', part: 'w5n_bulb', price: 15, from: 8, to: 12 },
  flask: { flag: 'w5n_flask', part: 'w5n_sleeve', price: 20, from: 90, to: 150 },
  pack: { flag: 'w5n_pack', part: 'tins', price: 25, from: 2.2, to: 3.0 },
};
export const PAY = { tin: 8, store: 20, gem: 25 };
export const CIST_STEPS = 6;       // the basin's steps (a bucket: one; a lance jet: half)
export const WATCH_T = 3.0;        // s by a stake before its flag lifts (the slower way)
// where things are searched for or set (world coordinates; measured 25.11 on the built regions)
export const SPOTS = {
  tins: {
    // (Citadel: the Whispering Cliffs' plateau is too small for the rule — its standing stones, 3.5 m, stand within 6 m of
    //  every spot on it —, so the stack stands below them, on the open ground north of the cliffs; then other fields)
    1: { region: 'citadel', centres: [[-45, -84], [-62, -62], [-85, -49.5], [-100, 80]], color: '#a09888', seed: 31 },
    2: { region: 'desert', cx: 3398, cz: 14, color: '#b89070', seed: 41 },
    3: { region: 'hamalayi', centres: [[4285, -6], [4281, -2], [4292, -5]], color: '#8e8a86', seed: 51, snow: true },   // (by the icefall's pond, west of Lhar's houses)
  },
  stakes: [{ cx: 3369, cz: -23 }, { cx: 3450, cz: 12 }, { cx: 3382.2, cz: -23.2 }],
  cistern: { x: 4341.42, z: -36.2, ry: -Math.PI / 2 },  // against the yard's east wall (its inner face at x 4342.65), its door to the yard (-x); the basin at its -z side, 0.6 m short of the bench
  trough: { x: 4341.6, z: -42.4 },                        // the yard's trough (hamalayi.js yardTrough), its spout end
  seam: { lx: 4.3, lz: -0.4 },                            // beside the old adit (arsenal.js adit), in its frame
};
// the region each singing crystal lies in, as the planet's places (the holomap's inset): the world's five on Citadel and
// the mill's on Zeelich; the quests' by their registry (the galleries are under Citadel: travel.js puts them there)
const CRYSTAL_PLACE = { 'sc-mill': 'zeelich', isles: 'isle_knartas', underground: 'citadel' };
export const crystalPlace = (id) => CRYSTAL_QUEST[id] ? (CRYSTAL_PLACE[CRYSTAL_QUEST[id].region] || CRYSTAL_QUEST[id].region) : (CRYSTAL_PLACE[id] || 'citadel');

const DESC = { lance: 'itd_lance', flask: 'itd_heatflask', pack: 'itd_jetpack' };
const DESC_T = { lance: 'itd_w5_lance_t', flask: 'itd_w5_flask_t', pack: 'itd_w5_pack_t' };
let ORIG = null;

export class Wave5 extends ChapterBase {
  constructor(story) { super(story); this.watch = null; this.doorT = 0; }
  get A() { return this.game.hero.arms || {}; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  at(key) { const i = this.idx(key); return i >= 0 && this.story.index >= i; }
  here() { return this.game.room?.id ?? 'citadel'; }
  built(id) { return this.game.regions?.built?.(id); }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  busy() { const h = this.game.hero; return !!this.watch || this.doorT > 0 || h.actT > 0 || !!h.steer; }
  tins() { const f = this.f; return (f.w5t_1 ? 1 : 0) + (f.w5t_2 ? 1 : 0) + (f.w5t_3 ? 1 : 0); }
  readings() { const f = this.f; return (f.w5b_1 ? 1 : 0) + (f.w5b_2 ? 1 : 0) + (f.w5b_3 ? 1 : 0); }
  benchOpen() { return !!this.f.l_coupler; }
  cistOpen() { return this.at('observatory'); }
  seamOpen() { return this.at('dig'); }
  breathOpen() { return this.at('steam'); }

  // ================================================================ the tools' numbers
  applyTunes() {
    const f = this.f, A = this.A;
    LANCE.tank = f.w5n_lance ? TUNE.lance.to : TUNE.lance.from;
    FLASK.keep = f.w5n_flask ? TUNE.flask.to : TUNE.flask.from;
    JET.fuel = f.w5n_pack ? TUNE.pack.to : TUNE.pack.from;
    if (A.water > LANCE.tank) A.water = LANCE.tank;
    if (A.heat > FLASK.keep) A.heat = FLASK.keep;
    // the tools' own descriptions read the tuned text once tuned (both languages; the originals kept to put back)
    ORIG ||= Object.fromEntries(['en', 'he'].map((l) => [l, Object.fromEntries(Object.values(DESC).map((k) => [k, STR[l]?.[k]]))]));
    for (const [id, k] of Object.entries(DESC)) for (const l of ['en', 'he']) {
      if (!STR[l]) continue;
      const v = f[TUNE[id].flag] ? STR[l][DESC_T[id]] : ORIG[l][k];
      if (v != null) STR[l][k] = v;
    }
  }

  // ================================================================ the world
  decorate() { this.ensure(); this.applyFlags(); }
  regionBuilt() { this.ensure(); this.applyWorld(); }
  ensure() {
    const g = this.game, P = g.physics;
    const Wd = g.world;
    if (Wd?.life?.shop?.bench && Wd.root && !W5.list) {
      // (outside the lean-to's east post, facing the path from town: townlife.js SHOP, its open front to the south)
      const B = Wd.life.shop.bench, x = B.x + 2.15, z = B.z + 0.4, y = P.groundAt(x, z, (B.y ?? 3) + 1.5);
      buildChalkList(Wd.root, x, y, z, Math.PI / 4);
    }
    if (Wd?.shard1Spot && Wd.root && !W5.tins?.[1]) this.placeTin(1, Wd.root);
    const D = this.built('desert');
    if (D && !W5.tins?.[2]) this.placeTin(2, D.group);
    if (D && !W5.stakes?.length) SPOTS.stakes.forEach((s, i) => { const p = this.freeSpot(s.cx, s.cz, 0.5); buildStake(D.group, P, i + 1, p.x, p.y, p.z); });
    const H = this.built('hamalayi');
    if (H && !W5.tins?.[3]) this.placeTin(3, H.group);
    if (H && !W5.cistern) {
      const C = SPOTS.cistern, y = P.groundAt(C.x, C.z, 60);
      buildCistern(H.group, P, C.x, y, C.z, C.ry);
      const T = SPOTS.trough, ty = P.groundAt(T.x - 0.9, T.z + 0.2, 60);
      buildBucket(H.group, T.x - 0.95, ty, T.z + 0.75);
      buildIceHole(H.group, T.x, ty + 0.5, T.z + 0.45, 0);   // (the trough's spout end: hamalayi.js yardTrough, turned -π/2, its spout at +z)
    }
    const U = this.built('isle_undergas'), ad = this.story.arsenal?.adit;
    if (U && ad && !W5.seam) {
      const a = SPEC_A(this.story), p = turn(ad.x, ad.z, a, SPOTS.seam.lx, SPOTS.seam.lz), y = P.groundAt(p.x, p.z, ad.y + 3);
      buildSeam(U.group, P, p.x, y, p.z, a);
    }
  }
  // a tin's rock stack: the first spot round its centre that is level for 2.4 m round, clear of anything within 2.4 m,
  // and with nothing to stand on within 6 m that its top would bring in reach (arsenal.js stepSpot's rule)
  placeTin(n, parent) {
    const S = SPOTS.tins[n];
    if (this._noSpot?.[n]) return;
    const why = {};
    for (const [cx, cz] of S.centres || [[S.cx, S.cz]]) if (this.tinNear(n, parent, S, cx, cz, why)) return;
    console.warn('[wave5] no spot for tin ' + n + ' ' + JSON.stringify(why));
    (this._noSpot ||= {})[n] = true;   // (not searched again on every build)
  }
  tinNear(n, parent, S, cx, cz, why) {
    const P = this.game.physics, T = P.terrain, c = { x: cx, z: cz };
    const y0 = T.heightAt(c.x, c.z);
    const no = (k) => { why[k] = (why[k] || 0) + 1; return null; };
    // (clear of the ways people come and go: 9 m from a travel point — a glider field, a pad, a pier's stop — and 4 m
    //  from a door)
    const reg = S.region, keep = [...Object.values(this.game.travel?.points || {}).filter((p) => p.region === reg).map((p) => [p.x, p.z, 9]),
      ...(((() => { try { return this.story.doors(); } catch { return []; } })()) || []).filter((d) => (d.region || 'citadel') === reg).map((d) => [d.x, d.z, 4])];
    const ok = (x, z) => {
      if (keep.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r)) return no('way');
      const gi = P.groundInfo(x, z, T.heightAt(x, z) + 0.6), g0 = gi.h;
      if (!gi.brick && g0 < -0.35) return no('sea');
      if (Math.abs(g0 - y0) > 2.5) return no('height');
      for (const r of [0.8, 1.6, 2.4]) for (let i = 0; i < 12; i++) {
        const xx = x + Math.sin(i * 0.5236) * r, zz = z + Math.cos(i * 0.5236) * r, gg = P.groundInfo(xx, zz, g0 + 3);
        if ((!gg.brick && gg.h < -0.35) || Math.abs(gg.h - g0) > 0.6) return no('level');
        if (P.blockedAt(xx, zz, g0, 0.4)) return no('blocked');
      }
      // (within 6 m: no standable thing — a roof, a wall's top, a crate — over g0 + 0.6, which the stack's top would bring
      //  in the pack's reach; and no rise of the ground itself over g0 + 1.8, which could be a cliff's lip)
      for (const r of [3.2, 4.0, 5.0, 6.0]) for (let i = 0; i < 32; i++) {
        const xx = x + Math.sin(i * 0.19635) * r, zz = z + Math.cos(i * 0.19635) * r;
        const hc = P.groundAt(xx, zz, g0 + 8), ht = T ? T.heightAt(xx, zz) : hc;
        if (hc > ht + 0.25 && hc > g0 + 0.6) return no('object');
        if (ht > g0 + 1.8) return no('rise');
      }
      return g0;
    };
    for (const d of [0, 1.5, 3, 4.5, 6, 7.5, 9, 11, 13]) for (let i = 0; i < (d ? 16 : 1); i++) {
      const a = i * (Math.PI / 8), x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d, y = ok(x, z);
      if (y != null) { buildTinStack(parent, P, n, x, y, z, S); return true; }
    }
    return false;
  }
  // a free spot for a small thing near (cx, cz): not blocked within r, the ground level round it
  freeSpot(cx, cz, r) {
    const P = this.game.physics, T = P.terrain;
    for (const d of [0, 0.6, 1.2, 1.8, 2.4, 3.2, 4.0]) for (let i = 0; i < (d ? 12 : 1); i++) {
      const a = i * (Math.PI / 6), x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d, y = P.groundAt(x, z, T.heightAt(x, z) + 0.6);
      if (P.blockedAt(x, z, y, r)) continue;
      let flat = true; for (let j = 0; j < 6 && flat; j++) { const xx = x + Math.sin(j) * r, zz = z + Math.cos(j) * r; if (Math.abs(P.groundAt(xx, zz, y + 1) - y) > 0.25) flat = false; }
      if (flat) return { x, y, z };
    }
    return { x: cx, y: P.groundAt(cx, cz, 60), z: cz };
  }
  applyFlags() {
    const f = this.f;
    if (f.w5c_fill != null && !(Number.isInteger(f.w5c_fill) && f.w5c_fill >= 0)) delete f.w5c_fill;
    if (f.w5c_fill > CIST_STEPS * 2) f.w5c_fill = CIST_STEPS * 2;
    if (f.w5c_bucket && !['empty', 'full'].includes(f.w5c_bucket)) delete f.w5c_bucket;
    // (each step implies the ones before it)
    if (f.w5c_store) f.w5c_open = true;
    if (f.w5c_open) { f.w5c_fill = CIST_STEPS * 2; delete f.w5c_bucket; }
    if (f.w5s_sold) f.w5s_gem = true;
    if (f.w5s_gem) f.w5s_broke = true;
    if (f.w5n_lance) f.w5n_bulb = true;
    if (f.w5n_flask) f.w5n_sleeve = true;
    if (f.w5n_pack) { f.w5t_1 = f.w5t_1 || true; f.w5t_2 = f.w5t_2 || true; f.w5t_3 = f.w5t_3 || true; }
    this.watch = null; this.doorT = 0;
    this.applyTunes();
    this.ensure(); this.applyWorld();
  }
  applyWorld() {
    const f = this.f;
    for (const n of [1, 2, 3]) W5.tins?.[n]?.setTin(!f['w5t_' + n]);
    const C = W5.cistern;
    if (C && !this.doorT) C.set((f.w5c_fill || 0) / (CIST_STEPS * 2), f.w5c_open ? 1 : 0);
    W5.bucket?.show(!f.w5c_bucket);
    W5.seam?.set(!!f.w5s_broke, false);
    for (const S of W5.stakes || []) { S.lift = 0; S.pose(0); }
  }

  // ================================================================ the holomap's layer (hud.js)
  // the planet's places where a singing crystal is still to be found, once Ilka's map is copied
  humRegions() {
    if (!this.f.w5b_done) return null;
    const g = this.game, have = new Set(g.collected || []), out = new Set();
    for (const id of CRYSTAL_IDS) if (!have.has(id)) out.add(crystalPlace(id));
    return out;
  }

  // ================================================================ the things that hum (kit2.js hums)
  hums() {
    const S = W5.seam;
    return S && this.seamOpen() && !this.f.w5s_broke ? [{ id: 'w5_seam', room: 'isle_undergas', x: S.crack.x, y: S.y + 0.8, z: S.crack.z }] : [];
  }
  items() {
    const f = this.f, out = [];
    if (f.w5n_bulb && !f.w5n_lance) out.push({ id: 'w5n_bulb', icon: 'cog' });
    if (f.w5n_sleeve && !f.w5n_flask) out.push({ id: 'w5n_sleeve', icon: 'cyl' });
    const n = this.tins(); if (n && !f.w5n_pack) out.push({ id: 'w5t_tins', icon: 'cyl', n });
    if (f.w5c_bucket) out.push({ id: f.w5c_bucket === 'full' ? 'w5c_bucket_full' : 'w5c_bucket', icon: 'jar' });
    if (f.w5s_gem && !f.w5s_sold) out.push({ id: 'w5s_gem', icon: 'warmstone' });
    return out;
  }
  journal() {
    const f = this.f, L = [];
    if (f.w5n_ask || f.w5n_list) {
      L.push({ key: 'w5_j_nell', done: false });
      const A = this.A;
      if (A.lance) L.push({ key: 'w5_j_lance', done: !!f.w5n_lance });
      if (A.heatflask) L.push({ key: 'w5_j_flask', done: !!f.w5n_flask });
      if (A.jetpack) L.push({ key: 'w5_j_pack', done: !!f.w5n_pack });
    } else if (f.w5t_ask || this.tins()) L.push({ key: 'w5_j_pack', done: !!f.w5n_pack });
    if (f.w5c_ask || f.w5c_fill) L.push({ key: 'w5_j_cistern', done: !!f.w5c_open });
    if (f.w5s_hint || f.w5s_broke) L.push({ key: 'w5_j_seam', done: !!f.w5s_broke });
    if (f.w5s_gem) L.push({ key: 'w5_j_gem', done: !!f.w5s_sold });
    if (f.w5b_ask || this.readings()) {
      L.push({ key: 'w5_j_breath', done: this.readings() >= 3 });
      if (this.readings() >= 3) L.push({ key: 'w5_j_breath2', done: !!f.w5b_done });
    }
    return L.length ? [{ title: t('w5_j_title'), lines: L }] : [];
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f, here = this.here(), A = this.A;
    if (!this.able() || this.busy() || g.state !== 'play') return;
    // the tins: taken from the top; looked at from below
    for (const n of [1, 2, 3]) {
      const S = W5.tins?.[n]; if (!S || f['w5t_' + n] || !this.tinHere(n)) continue;
      if (h.pos.y > S.top - 0.35) consider(dist(S.tinAt.x, S.tinAt.z), 1.1, { kind: 'w5t_tin', n, x: S.tinAt.x, z: S.tinAt.z, label: 'p_w5_take' });
      else consider(Math.max(0.05, dist(S.x, S.z) - 0.8), 1.8, { kind: 'w5t_low', n, x: S.x, z: S.z, label: 'p_look' });
    }
    if (here === 'citadel') {
      const Ls = W5.list; if (Ls && this.benchOpen()) consider(dist(Ls.x, Ls.z), 1.3, { kind: 'w5n_list', x: Ls.x, z: Ls.z, label: 'p_read' });
      return;
    }
    if (here === 'hamalayi' && W5.cistern) {
      const C = W5.cistern;
      if (!f.w5c_open) {
        consider(dist(C.basinAt.x, C.basinAt.z), 1.4, { kind: 'w5c_basin', x: C.basinAt.x, z: C.basinAt.z, label: f.w5c_bucket === 'full' && this.cistOpen() ? 'p_w5_pour' : 'p_look' });
        consider(dist(C.doorAt.x, C.doorAt.z), 1.0, { kind: 'w5c_door', x: C.doorAt.x, z: C.doorAt.z, label: 'p_look' });
        if (this.cistOpen()) {
          const B = W5.bucket; if (B && !f.w5c_bucket) consider(dist(B.x, B.z), 1.0, { kind: 'w5c_bucket', x: B.x, z: B.z, label: 'p_w5_take' });
          const T = SPOTS.trough, wantB = f.w5c_bucket === 'empty', wantL = A.lance && (A.water ?? 0) < LANCE.tank;
          consider(dist(T.x, T.z), 1.6, { kind: 'w5c_trough', x: T.x, z: T.z, label: wantB ? 'p_w5_fill' : wantL ? 'p_fill' : 'p_look' });
        }
      } else {
        consider(dist(C.doorAt.x, C.doorAt.z), 1.2, { kind: 'w5c_store', x: C.doorAt.x, z: C.doorAt.z, label: f.w5c_store ? 'p_w5_drink' : 'p_w5_go' });
      }
      return;
    }
    if (here === 'isle_undergas' && W5.seam && this.seamOpen()) {
      const S = W5.seam; consider(dist(S.front.x, S.front.z), 1.4, { kind: 'w5s_look', x: S.front.x, z: S.front.z, label: 'p_look' });
      return;
    }
    if (here === 'desert' && W5.stakes) {
      for (const S of W5.stakes) consider(dist(S.x, S.z), 1.5, { kind: 'w5b_stake', n: S.n, x: S.x, z: S.z, label: f.w5b_ask && this.breathOpen() && !f['w5b_' + S.n] ? 'p_w5_watch' : 'p_look' });
    }
  }
  tinHere(n) { const r = SPOTS.tins[n].region; return r === this.here(); }
  interact(it) {
    if (typeof it?.kind !== 'string' || !/^w5[ntcsb]_/.test(it.kind)) return false;
    const g = this.game, f = this.f, h = g.hero, A = this.A;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'w5n_list': {
        const L = ['w5n_list_head'];
        if (A.lance) L.push(f.w5n_lance ? null : 'w5n_list_lance');
        if (A.heatflask) L.push(f.w5n_flask ? null : 'w5n_list_flask');
        if (A.jetpack) L.push(f.w5n_pack ? null : 'w5n_list_pack');
        const open = L.filter(Boolean);
        if (open.length === 1) open.push(f.w5n_lance || f.w5n_flask || f.w5n_pack ? 'w5n_list_done' : 'w5n_list_none');
        f.w5n_list = true; g.audio.play('paper');
        return say(open, () => g.save(false));
      }
      case 'w5t_low': return say([A.jetpack ? 'w5t_low_pack' : 'w5t_low']);
      case 'w5t_tin': {
        const n = it.n, S = W5.tins[n];
        h.angle = Math.atan2(S.tinAt.x - h.pos.x, S.tinAt.z - h.pos.z);
        h.act?.('pickup', 0.6, () => {
          f['w5t_' + n] = true; S.setTin(false); g.audio.play('chest');
          h.coins += PAY.tin;
          g.hud.toast('w5_toast_tin', { n: this.tins() });
          say(['w5t_take', ...(this.tins() >= 3 ? ['w5t_all'] : [])], () => { g.hud.toast('w5_toast_kashes', { n: PAY.tin }); g.save(false); });
        }, 0.3);
        return true;
      }
      case 'w5c_door': return say([this.cistOpen() ? 'w5c_door_shut' : 'w5c_basin_early']);
      case 'w5c_basin': {
        if (!this.cistOpen()) return say(['w5c_basin_early']);
        if (f.w5c_bucket === 'full') {
          const C = W5.cistern;
          h.actAt?.(C.basinAt.x, C.basinAt.z, 'use', 0.7, () => {
            f.w5c_bucket = 'empty'; g.audio.play('waterRun');
            g.particles.burst(C.basinAt.x, C.y + 1.4, C.basinAt.z, '#bfe6ff', 12, 1.6);
            this.addFill(2, () => say(['w5c_poured'], () => g.save(false)));
          }, 0.3);
          return true;
        }
        const n = Math.floor((f.w5c_fill || 0) / 2);
        f.w5c_seen = true;
        if (n) g.hud.toast('w5_toast_basin', { n });
        return say(['w5c_basin_look', ...(f.w5c_bucket ? [] : ['w5c_bucket_hint'])]);
      }
      case 'w5c_bucket':
        h.act?.('pickup', 0.6, () => { f.w5c_bucket = 'empty'; W5.bucket.show(false); g.audio.play('tClick'); say(['w5c_take_bucket'], () => g.save(false)); }, 0.3);
        return true;
      case 'w5c_trough': {
        const T = SPOTS.trough;
        h.actAt?.(T.x, T.z, 'use', 0.6, () => {
          g.particles.burst(T.x, W5.cistern.y + 0.7, T.z - 0.5, '#bfe6ff', 10, 1.4);
          // (both at once: the bucket if it is empty, the lance's tank if it is not full)
          const lance = g.gadgets.tools.fill();
          if (lance) { g.hud.toast('e2_toast_filled', { n: LANCE.tank }); g.hud.weapon?.(h); }
          if (f.w5c_bucket === 'empty') { f.w5c_bucket = 'full'; g.audio.play('gurgle'); say(['w5c_filled']); return; }
          if (!lance) say(['w5c_trough']);
        }, 0.25);
        return true;
      }
      case 'w5c_store': return this.store();
      case 'w5s_look': {
        const S = W5.seam;
        if (f.w5s_broke) return say(['w5s_after']);
        const lit = this.seamLit();
        S.set(false, lit);
        return say([lit ? 'w5s_look_lit' : 'w5s_look_dark']);
      }
      case 'w5b_stake': {
        const n = it.n, S = W5.stakes[n - 1];
        if (!f.w5b_ask || !this.breathOpen()) return say(['w5b_stake_look']);
        if (f['w5b_' + n]) return say(['w5b_stake_read']);
        h.angle = Math.atan2(S.x - h.pos.x, S.z - h.pos.z);
        this.watch = { S, t: 0 };
        return true;
      }
    }
    return false;
  }
  seamLit() { const S = W5.seam, h = this.game.hero; return !!this.game.gadgets?.lanternLit?.() && Math.hypot(h.pos.x - S.front.x, h.pos.z - S.front.z) < 4.5; }
  // the basin: n half-steps more; full: the door goes up
  addFill(n, then) {
    const g = this.game, f = this.f;
    const was = Math.floor((f.w5c_fill || 0) / 2);
    f.w5c_fill = Math.min(CIST_STEPS * 2, (f.w5c_fill || 0) + n);
    const now = Math.floor(f.w5c_fill / 2);
    W5.cistern?.set(f.w5c_fill / (CIST_STEPS * 2), 0);
    if (now > was) g.hud.toast('w5_toast_basin', { n: now });
    if (f.w5c_fill >= CIST_STEPS * 2 && !f.w5c_open) {
      f.w5c_open = true; delete f.w5c_bucket; W5.bucket?.show(true);
      this.doorT = 2.0; g.audio.play('door'); g.camRig?.shake?.(0.12);
      this._afterDoor = () => { this.chain([['hero', 'w5c_full']], () => g.save(false)); };
      return;
    }
    then?.();
  }
  store() {
    const g = this.game, f = this.f, h = g.hero, C = W5.cistern;
    if (!f.w5c_store) {
      h.act?.('use', 0.6, null, 0.3);
      f.w5c_store = true; g.audio.play('chest');
      h.coins += PAY.store;
      this.chain([['hero', 'w5c_store'], ['hero', 'w5c_store2']], () => { g.hud.toast('w5_toast_kashes', { n: PAY.store }); g.save(false); });
      return true;
    }
    if (h.mp >= h.mpMax) { this.chain([['hero', 'w5c_tea_full']]); return true; }
    h.angle = Math.atan2(C.urnAt.x - h.pos.x, C.urnAt.z - h.pos.z);
    h.act?.('use', 0.7, () => { h.mp = h.mpMax; g.audio.play('heal'); g.hud.stats?.(h); this.chain([['hero', 'w5c_tea']]); }, 0.35);
    return true;
  }

  // ---------------------------------------------------------------- the tools' hits (depth.js passes them on)
  // the lance's jet into the basin: half a step each (index.js jetHit, through depth.js)
  jetHit(o) {
    const C = W5.cistern;
    if (!C || this.here() !== 'hamalayi' || this.f.w5c_open || !this.cistOpen() || this.doorT > 0) return false;
    const bx = C.basinAt.x, bz = C.basinAt.z, by = C.y + C.basin.position.y + 0.3;
    const vx = bx - o.from.x, vy = by - o.from.y, vz = bz - o.from.z, tt = Math.max(0, Math.min(o.len, vx * o.dir.x + vy * o.dir.y + vz * o.dir.z));
    const d = Math.hypot(vx - o.dir.x * tt, vy - o.dir.y * tt, vz - o.dir.z * tt);
    if (d > 0.7 && Math.hypot(o.end.x - bx, o.end.z - bz) > 0.75) return false;
    this.game.particles.burst(bx, by + 0.2, bz, '#d8f0ff', 10, 1.2);
    this.addFill(1);
    return true;
  }
  // the fork by a stake (index.js forkHit, through depth.js): a reading
  forkHit(o) {
    if (this.here() !== 'desert' || !W5.stakes || !this.f.w5b_ask || !this.breathOpen()) return false;
    let any = false;
    for (const S of W5.stakes) {
      if (this.f['w5b_' + S.n] || Math.hypot(S.x - o.x, S.z - o.z) > (o.reach ?? FORK.reach) + 0.6) continue;
      S.lift = 1; this.reading(S, 'fork'); any = true;
      break;
    }
    return any;
  }
  reading(S, how) {
    const g = this.game, f = this.f;
    f['w5b_' + S.n] = how;
    g.hud.toast('w5_toast_read', { n: this.readings() });
    this.chain([['hero', how === 'fork' ? 'w5b_fork' : 'w5b_flag'], ...(this.readings() >= 3 ? [['hero', 'w5b_three']] : [])], () => g.save(false));
  }
  // the glove at the seam's stones (index.js meleeHit, through depth.js)
  meleeHit(o) {
    const S = W5.seam, g = this.game, f = this.f;
    if (!S || f.w5s_broke || this.here() !== 'isle_undergas' || !this.seamOpen() || o.hitSet.has(S)) return false;
    // (the front, or the crack behind it: a step into the swing can bring him right up to the stones, where the front's
    //  point is at his side and the swing passes it by)
    if (!o.inArc(S.front.x, S.front.z, 0.9) && !o.inArc(S.crack.x, S.crack.z, 0.9)) return false;
    o.hitSet.add(S);
    if (!o.move?.glove) { g.impact(S.front.x, g.hero.pos.y + 1, S.front.z, 'stone', 'blocked'); g.hud.toast('w5s_thud'); return true; }
    f.w5s_broke = true; S.set(true, false);
    g.audio.play('break'); g.particles.burst(S.front.x, g.hero.pos.y + 0.9, S.front.z, '#a89cb0', 26, 4); g.camRig.shake(0.25);
    this.chain([['hero', 'w5s_broke']], () => {
      f.w5s_gem = true;
      g.found('w5s_gem', 'it_w5s_gem', () => g.save(false), { icon: 'warmstone' });
    });
    return true;
  }

  // ================================================================ people
  // before depth.js's own hooks: Jaspa's price for the gem (it comes first: his own reminders would hold it back)
  talkPre(npc) {
    const id = npc?.def?.id, f = this.f, g = this.game;
    if (!this.able()) return false;
    if (id === 'il_jaspa' && f.w5s_gem && !f.w5s_sold) {
      this.chain([['il_jaspa', 'w5s_sell1'], ['il_jaspa', 'w5s_sell2']], () => { f.w5s_sold = true; g.hero.coins += PAY.gem; g.audio.play('coin'); g.hud.toast('w5_toast_kashes', { n: PAY.gem }); g.save(false); });
      return true;
    }
    return false;
  }
  // after depth.js's own hooks (asked when they took nothing)
  talkFirst(npc) {
    const id = npc?.def?.id, f = this.f, g = this.game, A = this.A, D = this.story.depth;
    if (!this.able()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'nell': {
        if (!this.benchOpen()) return false;
        if (!f.w5n_ask) return D.after(npc, ['w5n_hook1', 'w5n_hook2'], () => { f.w5n_ask = true; g.save(false); });
        const menu = this.tuneItems();
        if (!menu.length) return false;
        return c([['nell', 'w5n_what']], () => this.tuneMenu(npc, menu));
      }
      case 'or_pell':
        if (!(f.w5n_ask || f.w5n_list) || !A.lance || f.w5n_bulb) return false;
        return c([['hero', 'w5n_pel_ask'], ['or_pell', 'w5n_pel_give']], () => { f.w5n_bulb = true; g.found('w5n_bulb', 'it_w5n_bulb', () => g.save(false), { icon: 'cog' }); });
      case 'lhar1':
        if (!(f.w5n_ask || f.w5n_list) || !A.heatflask || f.w5n_sleeve) return false;
        return c([['hero', 'w5n_tashi_ask'], ['lhar1', 'w5n_tashi_give']], () => { f.w5n_sleeve = true; g.found('w5n_sleeve', 'it_w5n_sleeve', () => g.save(false), { icon: 'cyl' }); });
      case 'baldino':
        if (!A.jetpack || f.w5t_ask || this.tins() >= 3) return false;
        return D.after(npc, ['w5t_bal1', 'w5t_bal2'], () => { f.w5t_ask = true; g.save(false); });
      case 'hl_monk':
        if (!this.cistOpen()) return false;
        if (!f.w5c_ask && !f.w5c_open) return D.after(npc, ['w5c_tenpa1', 'w5c_tenpa2'], () => { f.w5c_ask = true; g.save(false); });
        if (f.w5c_store && !f.w5c_lore) return D.after(npc, ['w5c_tenpa_after1', 'w5c_tenpa_after2'], () => { f.w5c_lore = true; g.save(false); });
        return false;
      case 'il_jaspa':
        if (!f.dx_jaspa_sorted || f.w5s_hint || f.w5s_broke) return false;
        return D.after(npc, ['w5s_jaspa'], () => { f.w5s_hint = true; g.save(false); });
      case 'ilka':
        if (f.w5b_done && !f.w5b_thx) return D.after(npc, ['w5b_after'], () => { f.w5b_thx = true; });
        if (!this.breathOpen() || f.w5b_done) return false;
        if (!f.w5b_ask) return D.after(npc, ['w5b_ilka1', 'w5b_ilka2', 'w5b_ilka3'], () => { f.w5b_ask = true; g.save(false); });
        if (this.readings() >= 3) return D.after(npc, ['w5b_give1', 'w5b_give2'], () => this.mapGiven('ilka'));
        return false;
    }
    return false;
  }
  // the board at Ilka's camp (desertlife.js's read, passed here by depth.js while the readings wait)
  canPin() { return this.breathOpen() && this.readings() >= 3 && !this.f.w5b_done; }
  pin() { this.chain([['hero', 'w5b_pin']], () => this.mapGiven('board')); return true; }
  mapGiven(how) { const g = this.game; this.f.w5b_done = how; g.audio.play('paper'); g.hud.toast('w5_toast_map'); g.save(false); }
  // the tune-ups Nell can do now: the tool owned, its part in hand, not tuned yet
  tuneItems() {
    const f = this.f, A = this.A, out = [];
    if (A.lance && f.w5n_bulb && !f.w5n_lance) out.push({ key: 'w5n_m_lance', note: 'w5n_k15', id: 'lance' });
    if (A.heatflask && f.w5n_sleeve && !f.w5n_flask) out.push({ key: 'w5n_m_flask', note: 'w5n_k20', id: 'flask' });
    if (A.jetpack && this.tins() >= 3 && !f.w5n_pack) out.push({ key: 'w5n_m_pack', note: 'w5n_k25', id: 'pack' });
    return out;
  }
  tuneMenu(npc, items) {
    const g = this.game, f = this.f, h = g.hero, A = this.A;
    g.openMenu('w5n_m_title', items, (o) => {
      const T = TUNE[o.id];
      if ((h.coins | 0) < T.price) { this.chain([['nell', 'w5n_short']]); return; }
      h.coins -= T.price; f[T.flag] = true;
      this.applyTunes();
      if (o.id === 'lance') A.water = LANCE.tank;
      const B = g.world?.life?.shop?.bench;
      g.audio.play('lever'); if (B) g.particles.burst(B.x, (B.y ?? h.pos.y) + 0.9, B.z, '#ffd890', 14, 1.4);
      if (npc) { npc.anim = 'kneelWork'; setTimeout(() => { if (npc.anim === 'kneelWork' && f.l_coupler) npc.anim = null; }, 1400); }
      this.chain([['nell', 'w5n_done_' + o.id]], () => { g.hud.toast('w5_toast_' + o.id); g.hud.weapon?.(h); g.save(false); });
    });
  }

  // ================================================================ each frame
  update(dt) {
    const g = this.game, f = this.f, h = g.hero;
    // the cistern's door going up
    if (this.doorT > 0) {
      this.doorT -= dt;
      const k = 1 - Math.max(0, this.doorT) / 2.0;
      W5.cistern?.set(1, k * k * (3 - 2 * k));
      if (this.doorT <= 0) { this.doorT = 0; W5.cistern?.set(1, 1); const fn = this._afterDoor; this._afterDoor = null; fn?.(); }
    }
    // the stakes' flags (on the island only)
    if (this.here() === 'desert' && W5.stakes) for (const S of W5.stakes) { if (!this.watch || this.watch.S !== S) S.lift = Math.max(0, S.lift - dt * 0.5); S.pose(dt); }
    // watching a stake: three seconds by it, then the flag lifts; walking off ends it
    const w = this.watch;
    if (w) {
      if (g.state !== 'play') return;
      if (Math.hypot(h.pos.x - w.S.x, h.pos.z - w.S.z) > 2.6) { this.watch = null; return; }
      w.t += dt;
      if (w.t > WATCH_T - 0.8) w.S.lift = Math.min(1, w.S.lift + dt * 1.6);
      if (w.t >= WATCH_T) { this.watch = null; this.reading(w.S, 'flag'); }
    }
    void f;
  }
}
// the old adit's heading (arsenal.js SPOT.adit.a, set when it is built: its mouth toward the pad)
// (from its sign's place: arsenal.js puts the sign at the adit's local (1.45, 0.9))
function SPEC_A(story) { const ad = story.arsenal?.adit; if (!ad?.sign) return 1.14; return Math.atan2(ad.sign.x - ad.x, ad.sign.z - ad.z) - Math.atan2(1.45, 0.9); }
