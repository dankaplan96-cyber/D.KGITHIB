// PEOPLE-1 (the user: "every place has people"; docs/future/CLUTTER_AUDIT.md cards; ALIGNMENT.md phase A, island life by
// identity): the residents of Zeelich's islands, reached by the Esmer shuttles from chapter 4. Data in the style of
// storylife.js: who, what they do where, and in which state of the story; the machinery is walkers.js (Resident), the
// street's manager outdoors and the rooms' manager in Otringal's bar and hotel (roomlife.js ROOMS, from here).
//
//   Otringal       the city's townsfolk: a fruit seller and a cloth seller at their stalls, a sweeper round the fountain's
//                  benches, the hotel's porter between the shuttle and the hotel's door; in the bar its keeper behind the
//                  counter and its boss on the raised floor; in the hotel's lobby its clerk at the desk and a guest.
//   Knartas        the harbour: Quill the harbourmaster, a net-mender at the racks, a fishing family of three.
//   Mosquibee      Bzzra the hive keeper at the great hive and her stall, two hive tenders, a cargo flier.
//   The Orchard    Pello the press-master (the card's Pell: renamed, Citadel has a Mrs Pell) at the press house, two pickers, a Mosquibee carter.
//   Celebration    the festival crowd round the figure: a steward, two dancers, a lantern seller.
//   Under Celeb.   the Wannies' gas-works crew: a foreman, a fitter, a carrier, a gauge reader.
//   The Platform   the Wannies' village and mine: a foreman, two miners, two villagers, the chaplain.
//   The Lift Dock  the cargo crew: the lift's operator, the crane's driver, two loaders.
//   The Old Watch  Old Oumi at the telescope (the expansion's Sergeant Vael is not here), a mason at the tower, a sketcher, a child.
// At most 8 an island. Three states of the story (`phase`): 'ord' (chapters 4–7, the project's everyday), 'crisis'
// (chapters 8–9: the evacuation on Twinsun heard of, the council deciding), 'after' (chapter 10 on and the epilogue);
// before chapter 4 nobody is here (the islands cannot be reached). Lines are text/islandpeople.js, said by
// story/islandpeople.js (by the chapter in progress).
//
// The rules (storylife.js): talk wins (a resident spoken to stops and turns); nothing is saved (the state is read from the
// chapter); a change of state moves a resident only out of sight (story/citizens.js). A stop is given by what it is at (an
// anchor in the island's own frame, from the planner's numbers: zislands.js planOf) and resolved where the island is
// built: the first place on the planner's walkable ground at that distance, clear of the pad, the board, the doors, the
// givers, the searches and the prompts (tests/island-people.mjs checks them). Out of their island they sleep (no update).
// Defined only once their island is built (no rig before), so an island never visited costs nothing.
import * as THREE from 'three';
import { SLOTS, ISLE_AT } from './zislands.js';
import { WalkNav } from './walknav.js';
import { Walkers } from './walkers.js';
import { WATER_FLOOR } from '../engine/physics.js';
import { otrHotelDoors, otrHotelExit } from './otrhotel.js';
import { otrBarDoors } from './otrbar.js';

const PI = Math.PI;
const idx = (S, key) => S.chapters.findIndex((c) => c.key === key);
// the island's state of the story (null before chapter 4: the shuttle does not fly there yet)
export function islePhase(S) {
  if (!S || S.index < idx(S, 'dig')) return null;
  const k = S.cur?.key;
  if (k === 'evacuation' || k === 'council') return 'crisis';
  if (k === 'network' || k === 'shell' || k === 'core' || k === 'home') return 'after';
  return 'ord';
}
// the finer state the lines follow
export function lineState(S) {
  const k = S?.cur?.key;
  return k === 'evacuation' ? 'evac' : k === 'council' ? 'council' : k === 'home' ? 'home' : (k === 'network' || k === 'shell' || k === 'core') ? 'net' : 'ord';
}

// ------------------------------------------------------------------ stops (in the island's frame)
// at an anchor: stand d m from it (toward `dir`, absolute, or toward the pad), facing it; o.local [lx, lz] with o.ry: a place
// in the anchor's own frame (a stall's keeper behind its counter), tried first
const at = (id, ax, az, act, dur, o = {}) => ({ id, ax, az, act, dur, ...o });
// in the open at (x, z), facing a
const op = (id, x, z, a, act, dur, o = {}) => ({ id, ax: x, az: z, a, open: true, act, dur, ...o });
// a house door it goes in at (the nearest of the island's doors to x, z), gone `dur` s inside
const dr = (id, x, z, dur, o = {}) => ({ id, ax: x, az: z, door: true, act: 'knock', dur, ...o });
// a stall's keeper: behind the counter (the stall's local −z), facing out over it
const keep = (id, x, z, ry, act, dur, o = {}) => at(id, x, z, act, dur, { local: [0, -0.35], ry, face: ry, d: 1.6, ...o });

// ================================================================== the islands
// (each: its people { id, char, tint, color, speed, scale?, start, rounds: { ord, crisis?, after? } } and what its people
//  keep clear of besides the island's own handles: `avoid` [[x, z, r]] in its frame)
export const ISLE_PEOPLE = {
  // ---------------------------------------------------------------- Otringal: the plaza (fountain −5, 6.6; stalls; the pad 2.8, 17.8)
  otringal: { people: [
    { id: 'ot_ulla', char: 'nara', tint: '#fff2ea', color: '#f0a080', speed: 0.85, rounds: {
      ord: [keep('ul_stall', -15.2, 9.8, 1.88, 'browse', [18, 26], { gest: ['nod'] }), at('ul_crates', -17.7, -14.7, 'browse', [5, 7], { carry: 'basket' }), keep('ul_back', -15.2, 9.8, 1.88, 'put', [5, 8], { carry: null })],
      crisis: [keep('ul_stall', -15.2, 9.8, 1.88, 'browse', [16, 22]), at('ul_post', 1.3, 6.7, 'stand', [6, 9], { gest: ['sigh'], d: 1.2 }), keep('ul_back', -15.2, 9.8, 1.88, 'put', [5, 8])],
      // (the chat first: Mr Tanek starts at his second stop, so both begin there)
      after: [at('ul_chat', -7.5, 1.0, 'stand', [14, 20], { pair: 'otstall', mate: 'ot_tanek', dir: -PI / 2, d: 0.8 }), keep('ul_stall', -15.2, 9.8, 1.88, 'browse', [18, 26], { gest: ['nod'] })],
    } },
    { id: 'ot_tanek', char: 'ztri2', tint: '#f6f2ff', color: '#b8b0f0', speed: 0.9, start: 1, rounds: {
      ord: [keep('ta_stall', 0.3, -3.7, -0.48, 'browse', [18, 26]), at('ta_bench', -3.2, -4.7, 'rest', [5, 8], { d: 1.0 }), keep('ta_cloth', 0.3, -3.7, -0.48, 'put', [6, 9], { gest: ['shrug'] })],
      crisis: [keep('ta_stall', 0.3, -3.7, -0.48, 'browse', [14, 20]), at('ta_board', -1.7, 13.6, 'stand', [8, 12], { gest: ['sigh'], d: 1.7 })],
      after: [keep('ta_stall', 0.3, -3.7, -0.48, 'browse', [18, 26]), at('ta_chat', -7.5, 1.0, 'stand', [14, 20], { pair: 'otstall', mate: 'ot_ulla', dir: PI / 2, d: 0.8 })],
    } },
    { id: 'ot_sweep', char: 'oku', tint: '#eef6ff', color: '#a8c8e8', speed: 0.75, rounds: {
      ord: [at('sw_b1', -8, 9.4, 'rest', [8, 12]), at('sw_fount', -5, 6.6, 'dip', [5, 7], { d: 2.2 }), at('sw_b2', 9.8, 7.8, 'rest', [8, 12]), at('sw_b3', -11.7, 1.3, 'rest', [8, 12], { gest: ['sigh'] })],
    } },
    { id: 'ot_porter', char: 'xil', tint: '#fff6e0', color: '#e8c070', speed: 1.1, rounds: {
      ord: [at('po_pad', 2.8, 17.8, 'stand', [8, 12], { carry: 'case', d: 4.2, dir: -PI / 2 }), dr('po_hotel', -15.4, -5.4, [6, 10], { carry: null }), at('po_fount', -5, 6.6, 'stand', [4, 6], { d: 2.4 })],
      crisis: [at('po_pad', 2.8, 17.8, 'stand', [14, 20], { d: 4.2, dir: -PI / 2, gest: ['shrug'] }), dr('po_hotel', -15.4, -5.4, [8, 12])],
    } },
  ] },
  // ---------------------------------------------------------------- Knartas: the harbour (pad −23.8, −41.8; HARBOUR −15.8, −16.8)
  knartas: { people: [
    { id: 'kn_quill', char: 'oku', tint: '#e8f4ff', color: '#90b8e0', speed: 0.8, rounds: {
      ord: [at('qu_boats', -20.6, -30.4, 'stand', [12, 18], { d: 2.6, gest: ['nod'] }), at('qu_light', -15.8, -16.8, 'stand', [10, 14], { d: 1.0, gest: ['sigh'] }), at('qu_bench', -14.3, -35.8, 'stand', [6, 9])],
    } },
    { id: 'kn_nets', char: 'nara', tint: '#f0fff4', color: '#a0e0b8', speed: 0.85, rounds: {
      ord: [at('ne_rack1', -29.8, -38.3, 'browse', [18, 26], { d: 1.0 }), at('ne_crate', -18.3, -42.8, 'put', [5, 7], { carry: 'basket', d: 1.0 }), at('ne_rack2', -11.8, -41.8, 'browse', [16, 22], { d: 1.0, carry: null })],
    } },
    { id: 'kn_fisher', char: 'keeper', tint: '#f4eadc', color: '#d0b088', speed: 0.9, start: 1, rounds: {
      ord: [at('fi_skiff', -12.5, -48.8, 'tend', [12, 18], { d: 2.4 }), at('fi_barrel', -12.3, -18.8, 'draw', [5, 7], { carry: 'can', d: 0.9 }), at('fi_crates', -11.8, -15.8, 'put', [5, 7], { carry: null, d: 0.9 })],
    } },
    { id: 'kn_mother', char: 'nara', tint: '#fff0f6', color: '#f0b0d0', speed: 0.85, rounds: {
      ord: [at('mo_crates', -8.3, -22.8, 'browse', [6, 9], { carry: 'basket', d: 1.0 }), dr('mo_home', 18.7, -17.5, [10, 14], { carry: null }), at('mo_bench', 9.7, -16.8, 'stand', [8, 12], { d: 1.0 })],
    } },
    { id: 'kn_kid', char: 'xil', scale: 0.72, tint: '#fff8e8', color: '#f0d890', speed: 1.35, rounds: {
      ord: [at('ki_boats', -20.6, -30.4, 'stand', [6, 9], { d: 3.4, dir: PI / 2 }), at('ki_dad', -12.5, -48.8, 'stand', [5, 8], { d: 3.6 }), at('ki_bench', -15.8, -13.3, 'stand', [5, 7], { d: 1.0 })],
    } },
  ], avoid: [[-17.3, -20.6, 1.6]] },   // (the quay light: its prompt)
  // ---------------------------------------------------------------- Mosquibee Island: the meadow (great hive 27.3, −11.4; Bzzra's stall 31.7, −13.8)
  mosquibee: { people: [
    { id: 'mb_bzzra', char: 'zbee2', tint: '#fff4d8', color: '#f0c050', speed: 0.8, rounds: {
      ord: [at('bz_great', 27.3, -11.4, 'browse', [14, 20], { d: 2.2, dir: PI }), keep('bz_stall', 31.7, -13.8, -2.68, 'put', [10, 14]), at('bz_hive', 29.7, -19.8, 'tend', [8, 12], { d: 1.0, gest: ['shrug'] })],
    } },
    { id: 'mb_tend1', char: 'zbee1', tint: '#fff8e0', color: '#e8c060', speed: 0.95, rounds: {
      ord: [at('t1_hive', 17.7, -13.8, 'tend', [10, 14], { d: 1.0 }), at('t1_bed', 26.2, -17.3, 'water', [6, 9], { carry: 'can', d: 1.0 }), at('t1_honey', 21.7, -6.3, 'put', [5, 7], { carry: null, d: 1.0 })],
    } },
    { id: 'mb_tend2', char: 'zbee1', tint: '#f0ffe8', color: '#b0e090', speed: 0.95, start: 1, rounds: {
      ord: [at('t2_hive', 21.2, -15.3, 'tend', [10, 14], { d: 1.0 }), at('t2_bed', 28.2, -23.3, 'water', [6, 9], { carry: 'can', d: 1.0 }), at('t2_hive2', 31.2, -16.3, 'tend', [8, 12], { d: 1.0, carry: null })],
    } },
    { id: 'mb_flier', char: 'zbee1', tint: '#e8f0ff', color: '#a0b8f0', speed: 1.1, rounds: {
      ord: [at('fl_crates', 33.2, -35.8, 'put', [5, 7], { carry: 'crate', d: 1.0 }), at('fl_stall', 31.7, -13.8, 'put', [5, 7], { carry: null, d: 2.0, dir: -PI / 2 }), at('fl_view', 26.3, -29.8, 'stand', [6, 9], { d: 1.2 })],
    } },
  ] },
  // ---------------------------------------------------------------- the Mosquibee Orchard (cloud catcher 0, 0; press house door 8.1, 27.5)
  orchard: { people: [
    { id: 'or_pell', char: 'oku', tint: '#fff0dc', color: '#e8b070', speed: 0.8, rounds: {
      // (his round keeps to the press yard's west side: the press house's giver, by its door, stays out of talk reach)
      ord: [at('pe_crates', -0.4, 15.6, 'browse', [16, 22], { d: 1.0, dir: -PI / 2, gest: ['nod'] }), at('pe_crates2', -4.4, 18.1, 'put', [6, 9], { d: 1.0 }), at('pe_bed', -1.4, 13.1, 'browse', [6, 9], { d: 1.4, dir: -PI / 2 })],
    } },
    { id: 'or_pick1', char: 'nara', tint: '#fffbe6', color: '#f0d880', speed: 0.9, rounds: {
      ord: [at('p1_bed', -3.9, 7.6, 'tend', [10, 14], { d: 1.4 }), at('p1_bed2', 4.6, 7.6, 'tend', [10, 14], { d: 1.4, carry: 'basket' }), at('p1_crates', -4.4, 18.1, 'put', [5, 7], { carry: null, d: 1.0 })],
    } },
    { id: 'or_pick2', char: 'xil', tint: '#f2ffee', color: '#a8e0a0', speed: 0.9, start: 1, rounds: {
      ord: [at('p2_bed', -1.4, 13.1, 'tend', [10, 14], { d: 1.4 }), at('p2_bed2', -7.9, 14.1, 'tend', [10, 14], { d: 1.4, carry: 'basket' }), at('p2_honey', 1.6, 15.6, 'put', [5, 7], { carry: null, d: 1.0 })],
    } },
    { id: 'or_carter', char: 'zbee2', tint: '#e8f4ff', color: '#a0c0f0', speed: 1.05, rounds: {
      ord: [at('ca_crates', -0.4, 15.6, 'put', [5, 7], { carry: 'crate', d: 1.6, dir: -PI / 2 }), at('ca_pad', -21.9, 2.1, 'put', [5, 7], { carry: null, d: 4.2, dir: PI / 2 }), at('ca_bench', -9.9, -4.9, 'stand', [6, 9], { d: 1.0 })],
    } },
  ] },
  // ---------------------------------------------------------------- Celebration: the plaza round the figure (2.2, 0.6; base 3.6 m)
  celebration: { people: [
    { id: 'ce_steward', char: 'ztri1', tint: '#fff0f6', color: '#f0a8c8', speed: 0.85, rounds: {
      ord: [at('st_post', 3, 9.1, 'stand', [12, 18], { d: 1.0, gest: ['nod'] }), op('st_figure', -2.8, -4.6, 0.9, 'stand', [8, 12]), at('st_pole', -6.9, -0.9, 'stand', [6, 9], { d: 1.0 })],
    } },
    { id: 'ce_dancer1', char: 'nara', tint: '#ffe8f4', color: '#f0a0c8', speed: 1.0, rounds: {
      ord: [op('d1_dance', -3.6, 4.6, 2.3, 'stand', [16, 22], { pair: 'celdance', mate: 'ce_dancer2' }), op('d1_look', 7.4, -5.6, -0.8, 'stand', [6, 9])],
    } },
    { id: 'ce_dancer2', char: 'xil', tint: '#f0ecff', color: '#c0b0f0', speed: 1.0, rounds: {
      ord: [op('d2_dance', -2.4, 3.6, -0.9, 'stand', [16, 22], { pair: 'celdance', mate: 'ce_dancer1' }), op('d2_bench', -6.6, -5.4, 0.7, 'stand', [6, 9])],
    } },
    { id: 'ce_lanterns', char: 'zbee2', tint: '#fff6e0', color: '#f0c070', speed: 0.8, rounds: {
      ord: [op('la_stand', -5.6, 2.6, 2.0, 'browse', [18, 26]), at('la_pole', -2.6, 8.8, 'reachHigh', [5, 8], { d: 1.0 })],
    } },
  ], avoid: [[2.2, 0.6, 5.0]] },   // (the figure's base)
  // ---------------------------------------------------------------- Under Celebration: the gas works (GAS WORKS −18.8, −24.3; PUMP HOUSE −16.8, −32.8)
  undergas: { people: [
    { id: 'ug_foreman', char: 'zmole1', tint: '#f0f0ff', color: '#b0b0e0', speed: 0.75, rounds: {
      ord: [at('uf_works', -18.8, -24.3, 'stand', [12, 18], { d: 1.0, gest: ['nod'] }), at('uf_pump', -30.3, -34.3, 'browse', [8, 12], { d: 1.4 }), at('uf_sign', -22.3, -26.3, 'stand', [5, 8], { d: 1.2 })],
    } },
    { id: 'ug_fitter', char: 'zmole1', tint: '#fff0e6', color: '#e0b090', speed: 0.8, start: 1, rounds: {
      ord: [at('fi_pump', -13, -17.5, 'tinker', [14, 20], { d: 1.6 }), at('fi_holder', -12.5, -33, 'browse', [8, 12], { d: 3.2 })],
    } },
    { id: 'ug_carrier', char: 'zmole2', tint: '#fff8f0', color: '#f0c0a0', speed: 0.8, rounds: {
      ord: [at('ca_a', -29.3, -31.3, 'put', [5, 7], { carry: 'crate', d: 1.0 }), at('ca_b', -14.8, -23.3, 'put', [5, 7], { carry: null, d: 1.0 }), at('ca_barrel', -24.3, -30.8, 'draw', [5, 7], { d: 0.9 })],
    } },
    { id: 'ug_gauge', char: 'zmole2', tint: '#eef8ff', color: '#a0c8e0', speed: 0.8, rounds: {
      ord: [at('ga_holder', -24, -41, 'browse', [10, 14], { d: 3.2 }), at('ga_holder2', -12.5, -33, 'browse', [10, 14], { d: 3.2, dir: 0 }), at('ga_crates', -18.3, -41.8, 'stand', [5, 7], { d: 1.0 })],
    } },
  ] },
  // ---------------------------------------------------------------- the Platform: the Wannies' village and mine (spots: zislands.js R.wannie.npcSpots)
  platform: { people: [
    { id: 'pf_foreman', char: 'zmole1', tint: '#f8f0e0', color: '#d8c090', speed: 0.75, rounds: {
      ord: [op('pfo_yard', 29.2, -25.0, PI, 'stand', [12, 18], { gest: ['nod'] }), at('pfo_crates', 17.2, -24.3, 'browse', [6, 9], { d: 1.0 }), at('pfo_lift', 27.3, -21.9, 'stand', [6, 9], { d: 2.6, dir: -PI / 2 })],
    } },
    { id: 'pf_miner1', char: 'zmole1', tint: '#e6e2f0', color: '#a8a0c8', speed: 0.85, rounds: {
      ord: [at('m1_mine', 27.5, -9.5, 'browse', [12, 18], { d: 3.6, dir: -PI / 2 + 0.4, carry: 'crate' }), at('m1_crates', 20.7, -23.3, 'put', [5, 7], { carry: null, d: 1.0 })],
    } },
    { id: 'pf_miner2', char: 'zmole1', tint: '#f0e6dc', color: '#c8a888', speed: 0.85, start: 1, rounds: {
      ord: [at('m2_mine', 27.5, -9.5, 'tinker', [12, 18], { d: 3.6, dir: -PI / 2 - 0.5 }), at('m2_barrel', 31.2, -14.8, 'draw', [5, 7], { d: 0.9 })],
    } },
    { id: 'pf_vill1', char: 'zmole2', tint: '#fff4ec', color: '#f0c8a8', speed: 0.8, rounds: {
      ord: [at('v1_bench', 32.2, 8.2, 'stand', [10, 14], { d: 1.0 }), dr('v1_home', 27.3, 7.9, [10, 14]), at('v1_barrel', 30.2, 15.7, 'draw', [5, 7], { d: 0.9 })],
    } },
    { id: 'pf_vill2', char: 'zmole2', tint: '#eefcff', color: '#a8e0e8', speed: 0.8, start: 1, rounds: {
      ord: [op('v2_door', 40.7, 14.5, PI / 2, 'stand', [8, 12]), at('v2_crates', 43.7, 12.7, 'put', [5, 7], { carry: 'basket', d: 1.0 }), at('v2_bench', 32.2, 8.2, 'put', [5, 7], { carry: null, d: 1.6 })],
    } },
    { id: 'pf_chaplain', char: 'zmole1', tint: '#fffaf0', color: '#e8e0c8', speed: 0.7, rounds: {
      ord: [op('ch_terrace', 36.6, 28.0, PI / 2, 'stand', [14, 20], { gest: ['sigh'] }), at('ch_bell', 38.3, 29.8, 'browse', [8, 12], { d: 1.3 })],
    } },
  ] },
  // ---------------------------------------------------------------- the Lift Dock (LIFT −4.9, 12.1; CARGO DOCK 9.6, 6.6; the pad −17.4, 14.6)
  liftdock: { people: [
    { id: 'ld_op', char: 'keeper', tint: '#f0f6ff', color: '#a8c0e8', speed: 0.75, rounds: {
      ord: [at('op_lift', -4.9, 12.1, 'stand', [14, 20], { d: 0.6, gest: ['sigh'] }), at('op_crates', -0.4, 13.6, 'browse', [6, 9], { d: 1.0 })],
    } },
    { id: 'ld_crane', char: 'ztri1', tint: '#f6fff0', color: '#b8e0a0', speed: 0.85, rounds: {
      ord: [at('cr_dock', 9.6, 6.6, 'browse', [14, 20], { d: 0.6 }), at('cr_crates', 7.6, 14.6, 'stand', [6, 9], { d: 1.2 })],
    } },
    { id: 'ld_load1', char: 'oku', tint: '#fff4e8', color: '#e8c0a0', speed: 0.95, rounds: {
      ord: [at('l1_a', 7.6, 14.6, 'put', [4, 6], { carry: 'crate', d: 1.0 }), at('l1_b', -2.4, 16.1, 'put', [4, 6], { carry: null, d: 1.0 }), at('l1_rest', 3.6, 14.6, 'stand', [5, 7], { d: 1.4 })],
    } },
    { id: 'ld_load2', char: 'zbee1', tint: '#fff0f0', color: '#f0a8a8', speed: 1.05, start: 1, rounds: {
      ord: [at('l2_a', 3.6, 14.6, 'put', [4, 6], { carry: 'crate', d: 1.0 }), at('l2_b', -11.9, 13.6, 'put', [4, 6], { carry: null, d: 1.0 })],
    } },
  ] },
  // ---------------------------------------------------------------- the Old Watch (tower 9.9, −18; telescope 9.4, 15.8)
  oldwatch: { people: [
    { id: 'ow_oumi', char: 'oku', tint: '#f6f0ff', color: '#c8b8f0', speed: 0.7, rounds: {
      ord: [at('va_scope', 9.4, 15.8, 'stand', [16, 22], { d: 2.6, dir: PI, gest: ['nod'] }), at('va_bench', 0.8, 14.3, 'stand', [10, 14], { d: 1.0 })],
    } },
    { id: 'ow_mason', char: 'ztri2', tint: '#fff0e0', color: '#e0b890', speed: 0.85, rounds: {
      ord: [at('ma_tower', 9.9, -18, 'tend', [14, 20], { d: 3.4 }), at('ma_dome', 14.4, -15, 'browse', [8, 12], { d: 2.6, carry: 'crate' }), at('ma_back', 9.9, -18, 'put', [5, 7], { d: 3.6, carry: null })],
    } },
    { id: 'ow_sketch', char: 'nara', tint: '#eefcf4', color: '#a8e0c8', speed: 0.85, rounds: {
      ord: [at('sk_post', 11.5, -11.7, 'stand', [16, 22], { d: 1.0 }), at('sk_bench', -3.2, 5.8, 'stand', [10, 14], { d: 1.0 })],
    } },
    { id: 'ow_kid', char: 'xil', scale: 0.72, tint: '#fff4f0', color: '#f0c0b0', speed: 1.4, rounds: {
      ord: [at('kd_tower', 9.9, -18, 'stand', [5, 8], { d: 4.4, dir: PI }), at('kd_scope', 9.4, 15.8, 'stand', [5, 8], { d: 3.0, dir: -PI / 2 }), at('kd_bench', -3.2, 5.8, 'stand', [4, 6], { d: 1.4 })],
    } },
  ], avoid: [[8.8, 13.3, 1.7]] },   // (the telescope's prompt: its TELESCOPE spot)
};
export const ISLE_IDS = Object.fromEntries(Object.entries(ISLE_PEOPLE).map(([n, I]) => ['isle_' + n, I.people.map((p) => p.id)]));
// the islands' own handles for the story (world coordinates, filled as each is built): the quay light, the beacon, the
// clapper, the cache the telescope shows
export const ISLE_THINGS = {};

// ------------------------------------------------------------------ resolving the stops where the island is built
const origin = (name) => ISLE_AT(SLOTS.indexOf(name));
function avoidList(R, name, o) {
  const out = [];
  if (R.pad) out.push({ x: R.pad.x, z: R.pad.z, r: 3.7 });
  if (R.board) out.push({ x: R.board.x, z: R.board.z, r: 2.0 });
  for (const d of R.shutDoors || []) out.push({ x: d.x, z: d.z, r: 1.5 });
  for (const g of R.givers || []) out.push({ x: g.x, z: g.z, r: 3.6 });   // (well out of talk reach, 2.6 m: a hop by a giver is not taken for a talk)
  for (const s of R.searches || []) if (s.x != null) out.push({ x: s.x, z: s.z, r: 1.6 });
  for (const [x, z, r] of ISLE_PEOPLE[name]?.avoid || []) out.push({ x: o.x + x, z: o.z + z, r });
  for (const t of Object.values(ISLE_THINGS[name] || {})) if (t?.x != null && t.prompt) out.push({ x: t.x, z: t.z, r: 1.6 });
  return out;
}
let NAV = null;
const navOf = (game) => (NAV && NAV.game === game ? NAV : (NAV = new WalkNav(game)));
function resolveStop(game, R, s, o, avoid) {
  const nav = navOf(game), ax = o.x + s.ax, az = o.z + s.az;
  const ok = (x, z) => nav.walkable(x, z) && avoid.every((q) => Math.hypot(q.x - x, q.z - z) > q.r);
  const out = { id: s.id, act: s.act, dur: s.dur };
  for (const k of ['carry', 'gest', 'pair', 'mate']) if (s[k] !== undefined) out[k] = s[k];
  if (s.door) {
    // the nearest of the island's doors: the slot in front of it (as storylife.js DOOR)
    let best = null; for (const d of R.shutDoors || []) { const dd = Math.hypot(d.x - ax, d.z - az); if (!best || dd < best.dd) best = { d, dd }; }
    if (best && best.dd < 6) { const d = best.d; return { ...out, x: d.x + Math.sin(d.ry) * 1.05, z: d.z + Math.cos(d.ry) * 1.05, a: d.ry + PI, door: { x: d.x, z: d.z } }; }
    return { ...out, act: 'stand', ...near(nav, ok, ax, az, 0, 0.0) };
  }
  if (s.open) { const p = near(nav, ok, ax, az, 0, 0); return { ...out, x: p.x, z: p.z, a: s.a }; }
  const towardPad = R.pad ? Math.atan2(R.pad.x - ax, R.pad.z - az) : 0;
  const base = s.dir ?? towardPad, d0 = s.d ?? 1.1;
  if (s.local) {
    const [lx, lz] = s.local, c = Math.cos(s.ry), sn = Math.sin(s.ry);
    const x = ax + lx * c + lz * sn, z = az - lx * sn + lz * c;
    if (ok(x, z)) return { ...out, x, z, a: s.face ?? s.ry };
  }
  for (const d of [d0, d0 + 0.4, d0 + 0.9, d0 + 1.5]) for (let k = 0; k < 12; k++) {
    const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (PI / 6), x = ax + Math.sin(a) * d, z = az + Math.cos(a) * d;
    if (ok(x, z)) return { ...out, x, z, a: Math.atan2(ax - x, az - z) };
  }
  const p = near(nav, ok, ax, az, 0, 0);
  return { ...out, x: p.x, z: p.z, a: Math.atan2(ax - p.x, az - p.z), unresolved: true };
}
// the nearest acceptable point to (x, z): rings out to 4 m
function near(nav, ok, x, z) {
  if (ok(x, z)) return { x, z };
  for (let r = 0.5; r <= 4; r += 0.5) for (let k = 0; k < 16; k++) { const a = (k / 16) * PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (ok(px, pz)) return { x: px, z: pz }; }
  return { x, z, unresolved: true };
}
// the hotel's door (its house on the plaza) and the slot outside it; the bar's door (the harbour house)
function hotelDoor() { const d = otrHotelDoors()?.[0], e = otrHotelExit('otrhotel-out'); return d && e ? { x: d.x, z: d.z, out: e } : null; }
function barDoor() { const d = otrBarDoors()?.[0]; return d ? { x: d.x, z: d.z } : null; }

// every island resident's definition (story/citizens.js npcDefs): only for an island that is built (its rig is made then)
export function isleDefs(game) {
  const out = [];
  for (const [name, I] of Object.entries(ISLE_PEOPLE)) {
    const area = 'isle_' + name, R = game.regions?.built(area);
    if (!R) continue;
    // (an island whose walks are decks over the clouds, as the Lift Dock's and Knartas's quay: the level people walk at,
    //  as Zeelich's floor bricks: storylife.js; the street's planner and the stops' own)
    if (R._isleLevel === undefined) { const P = game.physics, th = R.pad ? P.terrain.heightAt(R.pad.x, R.pad.z) : 0, o = origin(name); R._isleLevel = R.pad && th < WATER_FLOOR - 1 ? { x0: o.x - 75, x1: o.x + 75, y: R.pad.y } : null; }
    if (R._isleLevel) { const L = R._isleLevel; for (const nv of [navOf(game), (game.walkers ||= new Walkers(game)).nav]) nv.addLevel(L.x0, L.x1, L.y); }
    if (!R._isleStops) {
      dressIsle(game, name);   // (its things first: their prompts are kept clear of)
      const o = origin(name), avoid = avoidList(R, name, o), hd = name === 'otringal' ? hotelDoor() : null, bd = name === 'otringal' ? barDoor() : null;
      if (hd) avoid.push({ x: hd.x, z: hd.z, r: 1.5, door: true });
      if (bd) avoid.push({ x: bd.x, z: bd.z, r: 1.5, door: true });
      R._isleStops = {};
      for (const p of I.people) {
        R._isleStops[p.id] = Object.fromEntries(Object.entries(p.rounds).map(([k, st]) => [k, st.map((s) => {
          // (the porter goes in at the hotel's own door)
          if (s.door && hd && s.id === 'po_hotel') return { id: s.id, act: 'knock', dur: s.dur, ...(s.carry !== undefined ? { carry: s.carry } : {}), x: hd.out.x, z: hd.out.z, a: hd.out.a + PI, door: { x: hd.x, z: hd.z } };
          return resolveStop(game, R, s, o, avoid);
        })]));
      }
    }
    for (const p of I.people) {
      const rounds = R._isleStops[p.id];
      const full = { ord: rounds.ord, crisis: rounds.crisis || rounds.ord, after: rounds.after || rounds.ord };
      const s0 = full.ord[(p.start || 0) % full.ord.length];
      out.push({ id: p.id, name: 'n_' + p.id, char: p.char, tint: p.tint, speed: p.speed, color: p.color, scale: p.scale, ambient: true, story: true, isle: name, area, start: p.start || 0,
        phase: (f, S) => islePhase(S), rounds: full, round: full.ord, x: s0.x, z: s0.z, angle: s0.a ?? 0 });
    }
  }
  return out;
}
// (the key the cast list is rebuilt on: which islands are built)
export const islesKey = (game) => Object.keys(ISLE_PEOPLE).map((n) => (game.regions?.built('isle_' + n) ? 1 : 0)).join('');

// ================================================================== Otringal's rooms (roomlife.js ROOMS: the room's own frame)
// the bar (otrbar.js: 20 × 14 m; the raised floor at the back left 0.6 m up, x −10…−1.4, z −7…−3; the L-shaped counter at
// the front left, its long arm x −7.4…−2.8 at z 4.6 with the stools before it at z 5.4: the keeper's side is the room's);
// the hotel's lobby (otrhotel.js: 22 × 16 m; the back strip 0.9 m up to z −2.8 with the members' desks at z −5.8, the
// clerk behind them; the lounge and the pool on the floor below)
const ROOM_WHEN = (f, S) => islePhase(S) != null;
const RD = (id, x, z, a, act, dur, o = {}) => ({ id, x, z, a, act, dur, ...o });
export const OTRBAR_ROOM = {
  floors: [{ x0: -9.7, x1: -1.5, z0: -6.9, z1: -3.1, y: 0.6 }, { x0: -9.7, x1: 9.7, z0: -6.7, z1: 6.7, y: 0 }],   // (the raised floor first: a point is on the first floor that holds it)
  people: [
    { id: 'ot_keep', char: 'clerk', tint: '#eafff2', color: '#a8e0c0', speed: 0.8, start: 0, stays: true, when: ROOM_WHEN, stops: [
      RD('bk_counter', -5.6, 3.5, 0, 'browse', [14, 20], { gest: ['nod'] }), RD('bk_urns', -3.9, 3.5, 0, 'put', [6, 9]),
    ] },
    { id: 'ot_boss', char: 'councilChair', tint: '#ffe6ea', color: '#f0a0b0', speed: 0.7, start: 0, stays: true, when: ROOM_WHEN, stops: [
      RD('bo_rail', -4.1, -3.9, 0, 'stand', [16, 24], { gest: ['shrug'] }), RD('bo_corner', -7.0, -3.9, 0, 'stand', [10, 14]),
    ] },
  ],
};
export const OTRHOTEL_ROOM = {
  floors: [{ x0: -10.7, x1: 10.7, z0: -7.7, z1: -2.95, y: 0.9 }, { x0: -10.7, x1: -5.1, z0: -2.95, z1: 2.5, y: 0.9 }, { x0: -10.7, x1: 10.7, z0: -7.7, z1: 7.7, y: 0 }],
  people: [
    { id: 'ot_clerk', char: 'clerk', tint: '#fff2fa', color: '#e8b8d8', speed: 0.8, start: 0, stays: true, when: ROOM_WHEN, stops: [
      RD('hc_desk', 1.2, -6.9, 0, 'browse', [16, 22]), RD('hc_desk2', -2.6, -6.9, 0, 'put', [6, 9], { gest: ['nod'] }),
    ] },
    { id: 'ot_guest', char: 'zbee2', tint: '#fff6e4', color: '#f0c890', speed: 0.8, start: 0, stays: true, when: ROOM_WHEN, stops: [
      RD('hg_pool', 2.4, 2.2, 0, 'stand', [14, 20], { gest: ['sigh'] }), RD('hg_lounge', -1.6, 1.4, PI, 'stand', [10, 14]),
    ] },
  ],
};
export const ISLE_ROOM_IDS = ['ot_keep', 'ot_boss', 'ot_clerk', 'ot_guest'];

// ================================================================== the islands' things (built once with the island)
// Knartas's quay light (a post and its lamp house, the lens missing until it is fitted), the beacon clamped on the
// Orchard's cloud catcher (a ball target), the Platform's bell clapper by the ore cart, the crate on the Orchard's far side
// that the Old Watch's telescope shows. Small own meshes (each lamp its own material: it lights), shared geometry.
const geo = {};
const G = (k, f) => (geo[k] ||= f());
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
function lampHouse(group, x, y, z, { post = 3.2, color = '#fff0b0' } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
  const iron = mat('#4a4c54', { metalness: 0.5, roughness: 0.5 });
  const p = new THREE.Mesh(G('lpost', () => new THREE.CylinderGeometry(0.07, 0.1, post, 8)), iron); p.position.y = post / 2; g.add(p);
  const cap = new THREE.Mesh(G('lcap', () => new THREE.ConeGeometry(0.34, 0.3, 8)), mat('#2f6a72')); cap.position.y = post + 0.62; g.add(cap);
  const lensM = mat('#5a5a60', { emissive: '#000000', emissiveIntensity: 1.4, transparent: true, opacity: 0.85 });
  const lens = new THREE.Mesh(G('llens', () => new THREE.CylinderGeometry(0.24, 0.24, 0.42, 10)), lensM); lens.position.y = post + 0.26; g.add(lens);
  const base = new THREE.Mesh(G('lbase', () => new THREE.CylinderGeometry(0.28, 0.28, 0.08, 10)), iron); base.position.y = post + 0.02; g.add(base);
  return { g, set(on) { lensM.color.set(on ? color : '#5a5a60'); lensM.emissive.set(on ? color : '#000000'); }, top: y + post + 0.26 };
}
export function dressIsle(game, name) {
  const R = game.regions?.built('isle_' + name);
  if (!R?.group || R._isleDress) return;
  R._isleDress = true;
  const o = origin(name), P = game.physics, gy = (x, z) => P.groundAt(x, z), T = (ISLE_THINGS[name] ||= {});
  const grp = new THREE.Group(); grp.name = 'islandlife'; R.group.add(grp);
  if (name === 'knartas') {
    // the quay light, on the quay's edge by the basin (its prompt on the quay side)
    const x = o.x - 17.3, z = o.z - 22.4, y = gy(x, z);
    const L = lampHouse(grp, x, y, z, { color: '#ffe6a0' });
    P.add({ type: 'cyl', x, z, r: 0.18, top: y + 3.2, block: true });
    T.light = { x, z, y, prompt: { x: o.x - 17.3, z: o.z - 20.6 }, set: L.set };
    T.light.x = x; T.light.prompt.y = gy(o.x - 17.3, o.z - 20.6);
  } else if (name === 'orchard') {
    // the beacon on the cloud catcher's pole toward the pad (a ball target, 3.4 m up)
    const a = (5 / 6) * PI * 2, r = 4.5, x = o.x + Math.sin(a) * r, z = o.z + Math.cos(a) * r, y = gy(o.x, o.z) + 3.0;
    const g = new THREE.Group(); g.position.set(x, y, z); grp.add(g);
    const bm = mat('#6a5040', { emissive: '#000000', emissiveIntensity: 1.6 });
    const box = new THREE.Mesh(G('bbox', () => new THREE.BoxGeometry(0.36, 0.42, 0.36)), mat('#c89a40', { metalness: 0.5 })); g.add(box);
    const glass = new THREE.Mesh(G('bglass', () => new THREE.SphereGeometry(0.2, 10, 8)), bm); glass.position.y = 0.32; g.add(glass);
    T.beacon = { x, y: y + 0.3, z, set(on) { bm.color.set(on ? '#ffd860' : '#6a5040'); bm.emissive.set(on ? '#ffb020' : '#000000'); } };
    // the crate the Old Watch's telescope shows: the walkable point furthest from the pad on the island's main area
    let far = null; for (const p of R.sample || []) { const d = Math.hypot(p.x - R.pad.x, p.z - R.pad.z); if (!far || d > far.d) far = { ...p, d }; }
    if (far) {
      const cy = gy(far.x, far.z);
      const c = new THREE.Mesh(G('ccrate', () => new THREE.BoxGeometry(0.55, 0.45, 0.45)), mat('#b07a40')); c.position.set(far.x + 0.9, cy + 0.22, far.z); c.rotation.y = 0.5; grp.add(c);
      T.cache = { x: far.x, z: far.z, y: cy, mesh: c, prompt: true };
    }
  } else if (name === 'platform') {
    // the bell's clapper, dropped by the ore cart at the mine's mouth
    const M = R.wannie?.mine; if (M) {
      const x = M.x + Math.cos(M.a) * 1.6, z = M.z - Math.sin(M.a) * 1.6, y = gy(x, z);
      const c = new THREE.Mesh(G('clap', () => new THREE.CylinderGeometry(0.05, 0.12, 0.5, 8).rotateZ(PI / 2)), mat('#6a6a72', { metalness: 0.6 })); c.position.set(x, y + 0.1, z); grp.add(c);
      T.clapper = { x, z, y, mesh: c, prompt: true };
    }
    const B = R.wannie?.chapelDoor; if (B) T.bell = { x: o.x + 38.3, z: o.z + 29.8 - 1.4, y: gy(o.x + 38.3, o.z + 28.4) };
  } else if (name === 'otringal') {
    // (the hotel's machines are the lobby's: otrhotel.js HOTEL.machines)
  }
}
