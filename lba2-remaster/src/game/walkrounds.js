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
//        over a stall's goods) · rest (wipe a brow) · put (set a load down or take it up) · knock (at a door)
// Nothing here stands where a chapter puts someone: the stops keep off the well's rim where Gilbert and Mira stand, the
// stall's counter (Pippa), the lane's pump (Bram), the harbour's customs (Odile) and Nell's shop, and every front door
// used is a house the story never sends Twinsen into (tests/walkers.mjs checks the stops against the doors and the cast).
import { WalkNav } from './walknav.js';

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
// a resident's own front door: the house whose door is nearest the hint
function doorAt(W, x, z, list = W.houses) {
  let best = null, bd = 1e9;
  for (const h of list || []) { if (!h.door) continue; const d = Math.hypot(h.door.x - x, h.door.z - z); if (d < bd) { bd = d; best = h; } }
  if (!best || bd > 3) return null;
  const ry = best.ry ?? Math.atan2(best.door.x - best.x, best.door.z - best.z);
  return { x: best.door.x + Math.sin(ry) * 1.7, z: best.door.z + Math.cos(ry) * 1.7, a: ry + Math.PI, door: { x: best.door.x, z: best.door.z } };
}

// ------------------------------------------------------------------ Citadel
export function citadelRoster(game) {
  const W = game.world;
  const bench = (id, x, z, dur, o = {}) => { const b = seatAt(W, x, z); if (!b) return null; return { id, x: b.slot.x, z: b.slot.z, a: b.ry + Math.PI, act: 'stand', seat: b.seat, dur, ...o }; };
  const home = (id, x, z, dur) => { const d = doorAt(W, x, z); if (!d) return null; return { id, x: d.x, z: d.z, a: d.a, act: 'knock', door: d.door, dur }; };
  const look = (id, x, z, tx, tz, dur, o = {}) => D(id, x, z, { a: A(x, z, tx, tz), dur, ...o });
  const ok = (a) => a.filter(Boolean);
  const WELL = { x: -42, z: -4 };
  // the pair's meeting place, between the plaza's benches; each faces the other
  const MEET = [[-52.6, 37.6], [-50.4, 37.6]];
  const R = [
    // the market-goer: from her door to the well, the stall (a basket from there), a seat in the square, home
    { id: 'oda', char: 'lharWoman', tint: '#fff0e0', speed: 1.15, start: 2, color: '#f0b080', stops: ok([
      home('oda_home', -65.5, 11, [14, 22]),
      look('oda_well', -44.9, -6.4, WELL.x, WELL.z, [5, 8]),
      look('oda_stall', -46.2, -2.2, -47.4, -0.4, [6, 9], { act: 'browse', when: [0, 0.75], carry: 'basket' }),
      bench('oda_bench', -49, -7.4, [18, 28]),
    ]) },
    // the old man: benches along the lane, the well, a long look at the pump
    { id: 'brix', char: 'desertTrader', tint: '#d8f0d0', speed: 0.8, start: 0, color: '#b8d8a0', stops: ok([
      bench('brix_benchE', -35.8, 2.6, [28, 44]),
      look('brix_well', -39.4, -7.6, WELL.x, WELL.z, [6, 10]),
      bench('brix_lane', -42.3, 19.5, [28, 44]),
      look('brix_pump', -45.6, 58.6, -42, 65, [8, 12]),
      bench('brix_lane2', -48.2, 50.8, [24, 36]),
    ]) },
    // two neighbours who meet between the plaza's benches and talk
    { id: 'maro', char: 'farmerB', tint: '#ffffff', speed: 1.05, start: 1, color: '#e8a0e0', stops: ok([
      home('maro_home', -46.1, 27.2, [10, 16]),
      look('maro_meet', MEET[0][0], MEET[0][1], MEET[1][0], MEET[1][1], [26, 36], { pair: 'plaza', mate: 'tilde' }),
      bench('maro_bench', -53.3, 34.4, [16, 24]),
    ]) },
    { id: 'tilde', char: 'ilka', tint: '#fff0d8', speed: 1.05, start: 1, color: '#d8c080', stops: ok([
      home('tilde_home', -66.3, 41.1, [10, 16]),
      look('tilde_meet', MEET[1][0], MEET[1][1], MEET[0][0], MEET[0][1], [26, 36], { pair: 'plaza', mate: 'maro' }),
      look('tilde_sign', -53.0, 28.8, -50.5, 30, [4, 6]),
      bench('tilde_bench', -48.3, 34.4, [16, 24]),
    ]) },
    // the gardener: tends the square's bed from the lane side, draws water at the well, pours it on the other side
    { id: 'garrick', char: 'farmerA', tint: '#ffffff', speed: 1.0, start: 0, color: '#d0a070', stops: ok([
      look('gar_tend', -39.3, 10.3, -39.3, 8.7, [16, 22], { act: 'tend', carry: null }),
      look('gar_draw', -39.9, -6.3, WELL.x, WELL.z, [5, 7], { act: 'draw', carry: 'can' }),
      look('gar_water', -39.3, 7.1, -39.3, 8.7, [9, 13], { act: 'water' }),
      look('gar_rest', -36.2, 8.4, -39.3, 8.7, [6, 9], { act: 'rest', carry: null }),
    ]) },
    // the children: Pico up and down the lane, Dot round the square
    { id: 'pico', char: 'desertkid', tint: '#ffe8d8', speed: 1.6, start: 0, color: '#ffd080', stops: ok([
      D('pico_a', -38.8, -9.4, { a: 0, dur: [2, 4] }),
      D('pico_b', -44.0, 12.8, { a: 3, dur: [2, 4] }),
      D('pico_c', -42.4, 30.6, { a: 1.5, dur: [3, 5] }),
      D('pico_d', -44.6, 46.0, { a: 3, dur: [3, 5] }),
      D('pico_e', -45.6, 20.0, { a: 0, dur: [2, 3] }),
    ]) },
    { id: 'dot', char: 'pim', tint: '#fff8f0', speed: 1.3, start: 2, color: '#ff9ad0', stops: ok([
      D('dot_a', -37.6, -8.8, { a: 2, dur: [2, 4] }),
      D('dot_b', -46.6, -9.0, { a: 0, dur: [2, 4] }),
      look('dot_stall', -48.4, -3.6, -47.4, -1.2, [3, 5]),
      D('dot_c', -36.2, -3.0, { a: 1.2, dur: [2, 4] }),
      D('dot_d', -41.0, 4.6, { a: 3, dur: [2, 4] }),
    ]) },
    // the harbour walker: the plaza's sign, the benches along the harbour path, the quay's gate
    { id: 'marda', char: 'yorna', tint: '#ffffff', speed: 1.1, start: 1, color: '#e08a8a', stops: ok([
      look('marda_sign', -52.6, 29.4, -50.5, 30, [4, 6]),
      bench('marda_b1', -67.9, 28.4, [18, 26]),
      look('marda_mid', -82.0, 36.0, -90, 33, [5, 8], { act: 'rest' }),
      look('marda_gate', -95.8, 37.4, -102, 36, [6, 9]),
      bench('marda_b2', -94.4, 30.3, [18, 26]),
    ]) },
    // the porter: a crate from the quay to the stall and back empty
    { id: 'tobb', char: 'farmerC', tint: '#ffffff', speed: 1.0, start: 0, color: '#e8a860', stops: ok([
      D('tobb_quay', -96.6, 40.0, { a: -1.57, act: 'put', dur: [4, 6], carry: 'crate' }),
      D('tobb_rest', -72.0, 36.2, { a: 0, act: 'rest', dur: [5, 8] }),
      D('tobb_stall', -49.2, -2.8, { a: 0.4, act: 'put', dur: [5, 7], carry: null }),
      D('tobb_back', -52.5, 31.0, { a: 3, act: 'rest', dur: [4, 6] }),
    ]) },
    // the old woman: two benches by the lane's middle and what she sees from each
    { id: 'ume', char: 'lharElder', tint: '#ffffff', speed: 0.75, start: 0, color: '#c8a0f0', stops: ok([
      bench('ume_b1', -34.6, 43.6, [30, 46]),
      look('ume_look', -41.0, 38.5, -44, 33, [6, 10]),
      bench('ume_b2', -48.2, 50.8, [30, 46]),
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
  game.walkers?.nav.addLevel(ox - 62, ox + 66, 6.0);
  const Wz = { seats: [[-31, -4.6, 0], [-17, 4.6, Math.PI], [3, -4.6, 0], [14, 4.6, Math.PI], [-31, 2.2, Math.PI / 2 + 0.25], [26, -4.6, 0]].map(([x, z, ry]) => ({ x: ox + x, z, ry, spec: ZEELICH_BENCH })),
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
    { id: 'kira', char: 'councilB', tint: '#ffffff', speed: 1.0, start: 0, color: '#d0c0f0', stops: ok([
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
const ZEELICH_BODY = { ilo: 'keeper', aven: 'clerk', kira: 'councilB' };
export { WalkNav };
