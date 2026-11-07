// WORLD-LIFE (WORKLIST #37): who walks round Citadel and where (the machinery is src/game/walkers.js). Each resident is a
// look (an existing body, tinted a little so a neighbour is not a copy of a story character), a speed and a ROUND: stops
// it goes to in order and again, each with what it does there and for how long (seconds, a range).
//
// The bodies are the town's own: the fields' farmers (who the evacuation musters, when the streets are empty) and a few
// of the cast's other models, a little tinted. (The same model walking in another chapter is another person: nobody here is
// a story character.)
// A stop is { id, x, z, a?, act, dur: [min, max], when?: [from, to] of the day, carry?: item taken from here on (null: put
// down), pair?/mate? (a meeting: both wait for each other and chat), seat? / door? (a bench it sits on / its own front door) }.
//   act: stand (idle) · tend (kneel to a flower bed) · water (pour from a can) · draw (reach to the well) · browse (look
//        over a stall's goods) · rest (wipe a brow) · put (set a load down or take it up) · knock (at a door) · dip (fingers
//        in the water) · warm (a hand held out to a heat post)
// The town's two states (G1 world-life: walkers.js stage): `stage: 0` is a stop of the dry well (chapter 1, and chapter 2 until
// the valves are open), `stage: 1` of the water back, hot, with the heat posts lit; a stop without `stage` is for both.
// `gest: ['shrug', 'sigh']` is what it does now and then while it stands there.
// Nothing here stands where a chapter puts someone: the stops keep off the well's rim where Gilbert and Mira stand, the
// stall's counter (Pippa), the lane's pump (Bram), the harbour's customs (Odile) and Nell's shop, and every front door
// used is a house the story never sends Twinsen into (tests/walkers.mjs checks the stops against the doors and the cast).
import { WalkNav } from './walknav.js';
import { Walkers } from './walkers.js';
import { ZEELICH_SEATS } from './zeelich.js';

const A = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
// Zeelich's benches (zeelich.js: stone ends, a plank seat at 0.5 m, a tiled back): the seat's top, the back's front face
// and the seat's front edge, as walkers.js BENCH_RED
const ZEELICH_BENCH = { seatY: 0.53, back: -0.25, front: 0.245 };
const D = (id, x, z, o) => ({ id, x, z, act: 'stand', ...o });

// the bench nearest a point, as { slot (where it stands to sit down), seat (where it sits), a (the way it faces seated) }
function seatAt(W, x, z, list = W.seats) {
  let best = null, bd = 1e9;
  for (const s of list || []) { if (s.own) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
  if (!best || bd > 3) return null;
  const sx = Math.sin(best.ry), sz = Math.cos(best.ry);
  // (seat: the bench's middle and its shape, spec; the sitter's own place on it is walkers.js seatPose)
  return { slot: { x: best.x + sx * 1.15, z: best.z + sz * 1.15 }, seat: { x: best.x, z: best.z, a: best.ry, spec: best.spec }, ry: best.ry };
}
// a resident's own front door: the house whose door is nearest the hint. It stands `out` m beyond the house's door point
// (Citadel's houses: architecture.js puts that point 0.75 m before the wall, so 0.25 more is ~1 m from the leaf, within a
// knock's reach; the step in at the end of the knock then ends on the door's step, not in the open street)
function doorAt(W, x, z, list = W.houses, out = 1.7) {
  let best = null, bd = 1e9;
  for (const h of list || []) { if (!h.door) continue; const d = Math.hypot(h.door.x - x, h.door.z - z); if (d < bd) { bd = d; best = h; } }
  if (!best || bd > 3) return null;
  const ry = best.ry ?? Math.atan2(best.door.x - best.x, best.door.z - best.z);
  return { x: best.door.x + Math.sin(ry) * out, z: best.door.z + Math.cos(ry) * out, a: ry + Math.PI, door: { x: best.door.x, z: best.door.z } };
}

// TOWN-LIFE-2: where Tobb's crates come from and go (the piles are townbusy.js's). On the quay: a pile beside the cargo
// stacks at its north-west corner (the stacks measured: island/harbour colliders at x −116.3…−115.5, z 38.3…39.1; the flower
// bed east of it to x −112.55), off the way from the harbour path to the pier (z 41–44); he takes a crate from its east side.
// At Pippa's stall: a pile against the stall's east end (in the stall's own frame: 2.0 m along it from its middle, 0.25 m
// behind its line), where he sets the crate down standing a metre further along, facing the stall.
export const QUAY_PILE = { x: -114.95, z: 38.8, ry: 0.06 };
export const QUAY_PICK = { x: -113.95, z: 38.8, a: -Math.PI / 2 };
export function stallDrop(W) {
  const s = W.stall; if (!s) return null;
  const a = s.a, cx = s.x - Math.sin(a) * 1.6, cz = s.z - Math.cos(a) * 1.6;   // (the stall's middle: W.stall is 1.6 m before it)
  const at = (lx, lz) => ({ x: cx + lx * Math.cos(a) + lz * Math.sin(a), z: cz - lx * Math.sin(a) + lz * Math.cos(a) });
  return { pile: { ...at(2.0, -0.25), ry: a }, stop: { ...at(3.05, -0.25), a: Math.atan2(-Math.cos(a), Math.sin(a)) } };
}

// TOWN-LIFE-3: where the children play (src/game/townplay.js). Tag on the open lawn west of the square, east of the water
// office (measured: its east wall 4.5 m off, the nearest tree trunks 4.2 and 5.2 m, a small stone 2.8 m; the game runs to
// 2.5 m round the middle, over 10 m from any path); hopscotch chalked on the plaza's paving north of Maro and Tilde's meeting place,
// up its middle between the trees (start line at z 39.0, the trees' trunks 2.8 m either side of the grid's line); the gulls
// on the ground before Pippa's stall, run at from 3.5 m north-east of them.
export const PLAY = {
  tag: { x: -56.6, z: 11.6, r: 2.5 },
  hop: { x: -51.2, z: 39.0, a: 0 },
  gulls: { x: -42.6, z: 2.6, tx: -44.7, tz: -0.6 },
};

// ------------------------------------------------------------------ Citadel
export function citadelRoster(game) {
  const W = game.world;
  const bench = (id, x, z, dur, o = {}) => { const b = seatAt(W, x, z); if (!b) return null; return { id, x: b.slot.x, z: b.slot.z, a: b.ry + Math.PI, act: 'stand', seat: b.seat, dur, ...o }; };
  const home = (id, x, z, dur, o = {}) => { const d = doorAt(W, x, z, W.houses, 0.25); if (!d) return null; return { id, x: d.x, z: d.z, a: d.a, act: 'knock', door: d.door, dur, ...o }; };
  const look = (id, x, z, tx, tz, dur, o = {}) => D(id, x, z, { a: A(x, z, tx, tz), dur, ...o });
  const ok = (a) => a.filter(Boolean);
  // TOWN-LIFE-3: the children's games (townplay.js) and Maro's doorstep
  const TAG = PLAY.tag, HOP = PLAY.hop, GULL = PLAY.gulls;
  // (Maro sweeps along his house's front toward his door, beside the step: 1.9 m west of the door, 2.8 m off the lane's
  //  line, so nobody passing has to swerve round him into the doorway)
  const MARO_STEP = { x: -48.0, z: 27.6, a: A(-48.0, 27.6, -46.1, 27.2) };
  const hopStart = { x: HOP.x - Math.sin(HOP.a) * 0.22, z: HOP.z - Math.cos(HOP.a) * 0.22 };
  const WELL = { x: -42, z: -4 };
  // the square's tulip bed (island.js buildOriginalProps, citadel-layout.js tulips[1]): 3.3 × 1.1 m inside its curb, the
  // long sides along x; the curb's outside from x −40.9 to −37.5, z 8.0 to 9.4. The gardener works it from 0.6 m off a
  // long side, facing in (TOWN-POLISH / I-30: he stood 0.9 m off and watered the grass)
  const BED = { x: -39.2, z: 8.7 };
  // Pippa's stall (town.js): the counter faces the well; its heat post stands past the counter's south end
  const POST = { x: -47.56, z: -2.8 };
  // the pair's meeting place, between the plaza's benches; each faces the other
  const MEET = [[-52.6, 37.6], [-50.4, 37.6]];
  const DROP = stallDrop(W);
  const R = [
    // the market-goer: from her door to the well, the stall (a basket from there), a seat in the square, home
    { id: 'oda', char: 'lharWoman', tint: '#fff0e0', speed: 1.15, start: 2, color: '#f0b080', stops: ok([
      home('oda_home', -65.5, 11, [14, 22]),
      look('oda_dry', -44.0, -6.0, WELL.x, WELL.z, [6, 9], { stage: 0, gest: ['shrug', 'sigh'] }),
      look('oda_well', -44.9, -6.4, WELL.x, WELL.z, [5, 8], { stage: 1 }),
      look('oda_stall', -47.25, -1.61, -47.93, -1.11, [6, 9], { act: 'browse', when: [0, 0.75], carry: 'basket' }),   // (0.6 m before the counter's north half, facing it; 1.2 m from Pippa)
      bench('oda_bench', -49, -7.4, [18, 28]),
    ]) },
    // the old man: benches along the lane, the well, a long look at the pump
    { id: 'brix', char: 'desertTrader', tint: '#d8f0d0', speed: 0.8, start: 0, color: '#b8d8a0', stops: ok([
      bench('brix_benchE', -35.8, 2.6, [28, 44]),
      look('brix_warm', -33.25, 1.25, -33.25, 0.35, [10, 16], { stage: 1, act: 'warm', gest: ['sigh'] }),   // (the shop's heat post, once it is lit; POLISH-14 b: by the shop's wall north of the door now, he stands on its far side from the door, town.js)
      look('brix_well', -39.4, -7.6, WELL.x, WELL.z, [6, 10], { gest: ['sigh', 'shrug'] }),
      bench('brix_lane', -47.8, 19.5, [28, 44]),
      look('brix_pump', -45.6, 58.6, -42, 65, [8, 12]),
      bench('brix_lane2', -43.3, 43.4, [24, 36]),
    ]) },
    // two neighbours who meet between the plaza's benches and talk
    { id: 'maro', char: 'farmerB', tint: '#ffffff', speed: 1.05, start: 1, color: '#e8a0e0', stops: ok([
      home('maro_home', -46.1, 27.2, [10, 16], { stage: [0, 1], carry: null }),
      look('maro_meet', MEET[0][0], MEET[0][1], MEET[1][0], MEET[1][1], [26, 36], { pair: 'plaza', mate: 'tilde', stage: [0, 1] }),
      bench('maro_bench', -53.3, 34.4, [16, 24], { stage: [0, 1] }),
      // TOWN-LIFE-3: his doorstep swept before he goes in
      D('maro_sweep', MARO_STEP.x, MARO_STEP.z, { a: MARO_STEP.a, dur: [10, 15], play: 'sweep', stage: [0, 1] }),
      // TOWN-LIFE-3, the evacuation (chapter 8): in for a bundle, out to the benches to talk it over with Tilde, and back
      home('maro_pack', -46.1, 27.2, [6, 10], { stage: 2, carry: 'sack' }),
      look('maro_evac', MEET[0][0], MEET[0][1], MEET[1][0], MEET[1][1], [14, 20], { pair: 'evac', mate: 'tilde', stage: 2 }),
    ]) },
    { id: 'tilde', char: 'ilka', tint: '#fff0d8', speed: 1.05, start: 1, color: '#d8c080', stops: ok([
      home('tilde_home', -66.3, 41.1, [10, 16], { stage: [0, 1], carry: null }),
      look('tilde_meet', MEET[1][0], MEET[1][1], MEET[0][0], MEET[0][1], [26, 36], { pair: 'plaza', mate: 'maro', stage: [0, 1] }),
      look('tilde_sign', -53.0, 28.8, -50.5, 30, [4, 6], { stage: [0, 1] }),
      bench('tilde_bench', -48.3, 34.4, [16, 24], { stage: [0, 1] }),
      home('tilde_pack', -66.3, 41.1, [6, 10], { stage: 2, carry: 'sack' }),
      look('tilde_evac', MEET[1][0], MEET[1][1], MEET[0][0], MEET[0][1], [14, 20], { pair: 'evac', mate: 'maro', stage: 2 }),
    ]) },
    // the gardener: tends the square's bed from the lane side, draws water at the well, pours it on the other side
    { id: 'garrick', char: 'farmerA', tint: '#ffffff', speed: 1.0, start: 0, color: '#d0a070', stops: ok([
      look('gar_tend', BED.x - 0.4, BED.z + 1.3, BED.x, BED.z, [16, 22], { act: 'tend', carry: null }),   // (kneels 0.6 m off the north side)
      look('gar_dry', -39.9, -6.3, WELL.x, WELL.z, [5, 7], { stage: 0, gest: ['shrug', 'sigh'] }),   // (dry: a look into the well, then the drinking fountain on the lane for his water)
      look('gar_tap', -44.6, 37.4, -43.4, 37.4, [6, 9], { stage: 0, act: 'draw', carry: 'can' }),
      look('gar_draw', -40.68, -5.44, WELL.x, WELL.z, [5, 7], { stage: 1, act: 'draw', carry: 'can' }),   // (at the rim: 1.95 m from the well's middle, as Dot peers in)
      look('gar_water', BED.x + 0.8, BED.z - 1.3, BED.x + 0.8, BED.z, [9, 13], { act: 'water' }),   // (0.6 m off the south side, facing in; 2.1 m from Pom by the square)
      look('gar_rest', -36.2, 8.4, BED.x, BED.z, [6, 9], { act: 'rest', carry: null }),
    ]) },
    // the children: Pico up and down the lane, Dot round the square; TOWN-LIFE-3: tag together on the lawn west of the square,
    // Pico runs at the stall's gulls, Dot plays hopscotch on the plaza and swings her legs on the bench by the spaceport bridge
    { id: 'pico', char: 'desertkid', tint: '#ffe8d8', speed: 1.6, start: 0, color: '#ffd080', stops: ok([
      D('pico_a', -38.8, -9.4, { a: 0, dur: [2, 4] }),
      D('pico_b', -44.0, 12.8, { a: 3, dur: [2, 4] }),
      D('pico_c', -42.4, 30.6, { a: 1.5, dur: [3, 5] }),
      D('pico_d', -44.6, 46.0, { a: 3, dur: [3, 5] }),
      D('pico_e', -45.6, 20.0, { a: 0, dur: [2, 3] }),
      look('pico_tag', TAG.x - 1.2, TAG.z, TAG.x, TAG.z, [24, 34], { pair: 'tag', mate: 'dot', play: 'tag', field: TAG }),
      look('pico_gulls', GULL.x, GULL.z, GULL.tx, GULL.tz, [9, 13], { play: 'gulls' }),
    ]) },
    { id: 'dot', char: 'pim', tint: '#fff8f0', speed: 1.3, start: 2, color: '#ff9ad0', stops: ok([
      D('dot_a', -37.6, -8.8, { a: 2, dur: [2, 4] }),
      D('dot_b', -46.6, -9.0, { a: 0, dur: [2, 4] }),
      look('dot_peer', -42.0, -6.0, WELL.x, WELL.z, [4, 6], { stage: 0, act: 'dip' }),   // (dry: leaning toward the well to see for herself)
      look('dot_stall', -48.4, -3.6, -47.4, -1.2, [3, 5], { stage: 0 }),
      look('dot_warm', POST.x + 0.53, POST.z - 0.53, POST.x, POST.z, [6, 9], { stage: 1, act: 'warm' }),   // (the stall's heat post: 0.75 m from it, hands out to it)
      D('dot_c', -36.2, -3.0, { a: 1.2, dur: [2, 4] }),
      D('dot_d', -41.0, 4.6, { a: 3, dur: [2, 4] }),
      look('dot_tag', TAG.x + 1.2, TAG.z, TAG.x, TAG.z, [24, 34], { pair: 'tag', mate: 'pico', play: 'tag', field: TAG }),
      D('dot_hop', hopStart.x, hopStart.z, { a: HOP.a, dur: [16, 24], play: 'hop' }),
      bench('dot_bench', -34.6, 43.6, [14, 20], { play: 'swing' }),   // (BENCHES-1: the bench by the spaceport bridge's foot, looking at the shuttles: Ume's, who stands, so it is free; on the plaza's she found Tilde seated as often as not)
    ]) },
    // the harbour walker: the plaza's sign, the benches along the harbour path, the quay's gate
    { id: 'marda', char: 'yorna', tint: '#ffffff', speed: 1.1, start: 1, color: '#e08a8a', stops: ok([
      look('marda_sign', -52.6, 29.4, -50.5, 30, [4, 6]),
      bench('marda_b1', -67.9, 28.4, [18, 26]),
      look('marda_mid', -82.0, 36.0, -90, 33, [5, 8], { act: 'rest' }),
      look('marda_gate', -95.8, 37.4, -102, 36, [6, 9]),
      look('marda_warm', -101.42, 31.48, -100.55, 31.25, [8, 12], { stage: 1, act: 'warm', gest: ['sigh'] }),   // (the quay house's heat post; POLISH-14 b: by its front wall now, she stands on its far side from the door, town.js)
      bench('marda_b2', -94.4, 30.3, [18, 26]),
    ]) },
    // the porter: a crate from the quay's pile to the pile at the stall's end, and back empty (TOWN-LIFE-2: the crate he takes
    // comes off the quay's pile and stays on the stall's: townbusy.js; he used to pick it up from the bare harbour path)
    { id: 'tobb', char: 'farmerC', tint: '#ffffff', speed: 1.0, start: 0, color: '#e8a860', stops: ok([
      D('tobb_quay', QUAY_PICK.x, QUAY_PICK.z, { a: QUAY_PICK.a, act: 'put', dur: [4, 6], carry: 'crate' }),
      D('tobb_rest', -83.0, 43.3, { a: 0, act: 'rest', dur: [5, 8] }),   // (WA-15b: a breather at the Esmers' trading house door, facing it: the stall's Zeelich goods come through there)
      DROP ? D('tobb_stall', DROP.stop.x, DROP.stop.z, { a: DROP.stop.a, act: 'put', dur: [5, 7], carry: null }) : D('tobb_stall', -49.2, -2.8, { a: 0.4, act: 'put', dur: [5, 7], carry: null }),
      D('tobb_back', -52.5, 31.0, { a: 3, act: 'rest', dur: [4, 6] }),
    ]) },
    // WA-15b: the Esmer trader at the trading house on the harbour front (harbourzeelich.js): by the jars, by the crates
    { id: 'sefa', char: 'nara', tint: '#e8f4ff', speed: 0.8, start: 0, color: '#5ac8c8', stops: ok([
      look('sefa_jars', -86.5, 42.9, -84.0, 40.0, [14, 20]),
      look('sefa_quay', -108.8, 40.2, QUAY_PILE.x, QUAY_PILE.z, [8, 12]),   // (the goods landed for the house: a look at the quay's pile)
      look('sefa_crates', -80.2, 41.0, -80.9, 43.4, [8, 12], { act: 'tinker' }),   // (in front of the crate stacks, clear of their colliders)
    ]) },
    // PURPOSES (3.11.2026): Tibbo at his counter under the 'shop' house's awning (story/shops.js), with a turn at the parts
    // on his bench beside it; he faces the street. (2 m and more from his door: its prompt is the counter's.)
    ...(() => {
      const S = W.houses.find((h) => h.id === 'shop'); if (!S) return [];
      const at = (lx, lz) => ({ x: S.x + Math.sin(S.ry) * lz + Math.cos(S.ry) * lx, z: S.z + Math.cos(S.ry) * lz - Math.sin(S.ry) * lx });
      const c = at(1.0, S.d / 2 + 1.5), b = at(0.2, S.d / 2 + 1.8), out = at(0.6, S.d / 2 + 8);
      return [{ id: 'tibbo', char: 'farmerA', tint: '#e8f0ff', speed: 0.85, start: 0, color: '#f0d070', stops: [
        D('tibbo_counter', c.x, c.z, { a: A(c.x, c.z, out.x, out.z), dur: [30, 45] }),
        D('tibbo_bench', b.x, b.z, { a: A(b.x, b.z, out.x, out.z), act: 'tinker', dur: [8, 12] }),
        // (a look at the square's well now and then: the town's news, and who might need darts)
        ...(W.well ? [D('tibbo_well', W.well.x - 2.2, W.well.z - 1.8, { a: A(W.well.x - 2.2, W.well.z - 1.8, W.well.x, W.well.z), dur: [6, 9] })] : []),
      ] }];
    })(),
    // the old woman: two benches by the lane's middle and what she sees from each
    { id: 'ume', char: 'lharElder', tint: '#ffffff', speed: 0.75, start: 0, color: '#c8a0f0', stops: ok([
      bench('ume_b1', -34.6, 43.6, [30, 46]),
      look('ume_look', -41.0, 38.5, -44, 33, [6, 10]),
      bench('ume_b2', -43.3, 43.4, [30, 46]),
      look('ume_pump', -46.6, 56.4, -43, 64, [6, 10]),
    ]) },
  ];
  return R;
}

// ------------------------------------------------------------------ Zeelich's street (the island's boulevard, its plaza and fountain)
// Local coordinates as src/game/zeelich.js lays them out (the island is at x 2400, its floor bricks at y 6): the plaza's
// benches, the fountain (-24, 0, a basin 2 m across), the stall (-24, 9.2: Nara stands in front of it), the planters
export const ZEELICH_ROSTER_IDS = ['ilo', 'aven', 'kira'];
export function zeelichRoster(game) {
  const R = game.regions?.built('zeelich');
  if (!R) return null;
  const ox = R.group?.position.x ?? 2400, Y0 = R.group?.position.y ?? 0;
  // (the street's walkers made here if they are not yet: with `?.` a load that built Zeelich before any walker existed
  //  left the level out, so its residents stood 12 m down on the terrain under the island until the hero came, then
  //  popped up onto the street as the fade cleared: Resident.groundHint)
  (game.walkers ||= new Walkers(game)).nav.addLevel(ox - 62, ox + 66, 6.0);
  const Wz = { seats: ZEELICH_SEATS.map(([x, z, ry]) => ({ x: ox + x, z, ry, spec: ZEELICH_BENCH })),
    houses: (R.houseDoors || []).map((d, i) => ({ door: d, ry: d.z < 0 ? 0 : Math.PI, x: d.x, z: d.z + (d.z < 0 ? -2.6 : 2.6), skip: i === 1 || i === 4 })).filter((h) => !h.skip) };
  const bench = (id, x, z, dur, o = {}) => { const b = seatAt(Wz, ox + x, z); if (!b) return null; return { id, x: b.slot.x, z: b.slot.z, a: b.ry + Math.PI, act: 'stand', seat: b.seat, dur, ...o }; };
  const home = (id, x, z, dur) => { const d = doorAt(Wz, ox + x, z); if (!d) return null; return { id, x: d.x, z: d.z, a: d.a, act: 'knock', door: d.door, dur }; };
  const look = (id, x, z, tx, tz, dur, o = {}) => D(id, ox + x, z, { a: A(ox + x, z, ox + tx, tz), dur, ...o });
  const ok = (a) => a.filter(Boolean);
  return [
    // an Esmer woman: from her door to the stall (a basket from there), a dip of the hand in the fountain, a bench
    { id: 'ilo', char: 'keeper', tint: '#ffffff', speed: 1.1, start: 1, color: '#f0b0d0', stops: ok([
      home('ilo_home', -38.5, 7.2, [14, 22]),
      look('ilo_stall', -26.6, 7.2, -26, 9, [7, 10], { act: 'browse', carry: 'basket' }),
      look('ilo_fount', -21.2, 1.4, -24, 0, [6, 9], { act: 'dip' }),
      bench('ilo_bench', -31, 2.2, [20, 30]),
    ]) },
    // an Esmer man: the boulevard's benches and what he looks at from each
    { id: 'aven', char: 'clerk', tint: '#ffffff', speed: 0.95, start: 0, color: '#a0d8d0', stops: ok([
      bench('aven_b1', -31, -4.6, [22, 34]),
      look('aven_gate', -44.5, -1.6, -52, 0, [6, 10]),
      look('aven_mill', -4.0, -3.0, -2, -20, [8, 12]),
      bench('aven_b3', 3, -4.6, [22, 34]),
    ]) },
    // the plaza's gardener: the planters by the fountain, water from the basin
    { id: 'kira', char: 'lharWoman', tint: '#ffffff', speed: 1.0, start: 0, color: '#d0c0f0', stops: ok([
      look('kira_a', -18.4, -3.4, -18.4, -5.2, [14, 20], { act: 'tend', carry: null }),
      look('kira_draw', -24, 3.6, -24, 0, [5, 7], { act: 'draw', carry: 'can' }),
      look('kira_b', -6, 3.4, -6, 5.2, [9, 13], { act: 'water' }),
      look('kira_rest', -12.5, 1.6, -24, 0, [5, 8], { act: 'rest', carry: null }),
    ]) },
  ];
}

// ------------------------------------------------------------------ Kesh, the desert village (west end of Desert Island)
// Local coordinates as desert.js / keshlife.js lay them out (the island is at x 3400): the oasis (-40, -15, r 7.5), the cool
// room (-70, -6) whose door faces south, Lumi's loom in the shade of the striped sail (-58, -0.6), the ferry board (-21.6, 15.2)
export const DESERT_ROSTER_IDS = ['safi', 'tamu', 'bashir'];
const DESERT_BODY = { safi: 'lulu', tamu: 'tim', bashir: 'archivist' };
export function desertRoster(game) {
  const R = game.regions?.built('desert');
  if (!R) return null;
  const ox = R.group?.position.x ?? 3400;
  const look = (id, x, z, tx, tz, dur, o = {}) => D(id, ox + x, z, { a: A(ox + x, z, ox + tx, tz), dur, ...o });
  return [
    // a girl who carries the village's water: from the oasis to the jars in the cool room, with a rest in the loom's shade
    { id: 'safi', char: 'lulu', tint: '#ffe8c8', speed: 1.2, start: 1, color: '#f0a0c0', stops: [
      look('safi_oasis', -43.4, -6.6, -41, -9, [5, 8], { act: 'dip', carry: 'basket' }),
      look('safi_door', -69.7, -0.9, -69.7, -2.8, [5, 7], { act: 'put', carry: null }),
      look('safi_sail', -62.2, -4.2, -58, -1, [7, 11], { act: 'rest' }),
    ] },
    // a boy who runs between the ferry board and the cool room
    { id: 'tamu', char: 'tim', tint: '#fff0d8', speed: 1.7, start: 0, color: '#ffd080', stops: [
      look('tamu_board', -18.8, 12.6, -21.6, 15.2, [3, 5]),
      look('tamu_oasis', -36.5, -6.4, -38, -10, [3, 5]),
      look('tamu_cool', -67.6, -0.6, -69.7, -2.8, [3, 5]),
      look('tamu_mid', -50.5, 4.0, -54, 0, [2, 4]),
    ] },
    // an old man who watches Lumi work, the water and the porch's shade
    { id: 'bashir', char: 'archivist', tint: '#f4e8c8', speed: 0.8, start: 0, color: '#d8c890', stops: [
      look('bas_loom', -62.6, -2.0, -58.2, -0.4, [20, 30], { act: 'rest' }),
      look('bas_oasis', -48.6, -8.2, -42, -12, [8, 12]),
      look('bas_porch', -72.2, -0.8, -70.5, -2.8, [12, 18]),
      look('bas_home', -42.2, -38.0, -39.4, -38.6, [14, 20]),   // (PURPOSES: his own door, the old house S40: desertold.js)
    ] },
  ];
}

// every resident's definition for the cast list (src/game/story/citizens.js). A resident of an area not built yet is
// listed hidden (pending) with no round: src/main.js addActors gives it its round when the area is built.
export function ambientDefs(game) {
  const out = [];
  const add = (r) => {
    if (!r.stops.length) return;
    const s0 = r.stops[r.start % r.stops.length];
    out.push({ id: r.id, name: 'n_' + r.id, char: r.char, tint: r.tint, speed: r.speed, color: r.color, ambient: true, x: s0.x, z: s0.z, angle: s0.a ?? 0, round: r.stops, start: r.start });
  };
  for (const r of citadelRoster(game)) add(r);
  const pend = (ids, bodies) => { for (const id of ids) out.push({ id, name: 'n_' + id, char: bodies[id], tint: '#ffffff', ambient: true, x: 0, z: 0, angle: 0, pending: true, color: '#ffffff' }); };
  const z = zeelichRoster(game);
  if (z) for (const r of z) add(r); else pend(ZEELICH_ROSTER_IDS, ZEELICH_BODY);
  const d = desertRoster(game);
  if (d) for (const r of d) add(r); else pend(DESERT_ROSTER_IDS, DESERT_BODY);
  return out;
}
const ZEELICH_BODY = { ilo: 'keeper', aven: 'clerk', kira: 'lharWoman' };
export { WalkNav };
