// WC-3 "Residents where the story goes" (docs/future/WORLD_CONSISTENCY.md R1, work order 3): the places chapters 4–9 use
// get residents with rounds, as Citadel (walkrounds.js) and Kesh have. Data only, in the style of walkrounds.js and
// roomlife.js: who, where, and in which states of the story; the machinery is walkers.js (Resident), the street's
// manager for the open air and the rooms' manager indoors (roomlife.js ROOMS.school / ROOMS.upper).
//
//   Desert Island, the project's yard between the research post and the dig (chapters 4 and 5): eight of the Joint
//     Project's crew at their work, outside the post's fence (its inside is the sneak of chapter 4: nobody walks there):
//     a surveyor at a tripod on the dig's rim and his staff man at the far rim, a cook at the field kitchen, two
//     porters carrying crates from the yard's pile to the pile by the dig's gate, a fitter mending the fence and the
//     rim's stakes, a digger at the rim, a site clerk counting crates. While a sandstorm blows they shelter (as the
//     gate guard does). Chapter 5: once Dallan's order has taken the ferry (c5_planned), two of them have gone with it;
//     the six left pack up: the crates come back from the dig to the yard, the tripod is folded.
//   The School of Magic (from chapter 4): a master and three pupils on its plaza (a spell practised in pairs, the herb
//     bed watered from the channel at the mask's foot, the sign read, a look at the horned pillar, across at the door); inside
//     (its hall is a room of its own: nobody walks between the two), three pupils on the classroom's front benches before Rector Hougo, at the blackboard, at the open edge.
//   Lhar, then the monastery (the Hamalayi, chapters 6 and 7): eight villagers. In Lhar before the lift takes them up
//     they pack (sacks out of their houses to the hand cart, crates to the cart, the washing off the rack, wood to the
//     fire, water from the trough) and two children play tag below the square. Each goes up with one of the story's two
//     trips (c6_trip1 / c6_trip2, the same flags as the story's villagers); from then on they live in a camp on the
//     terrace east of the monastery's yard (its fire and pot, the washing on a rack, a woodpile, a laden sledge), the
//     yard itself being the story villagers' and the terrace's lip by the gate chapter 7's glider take-off. Chapter 7
//     on: settled there.
//   Zeelich's council quarter (chapter 9): before the council house on the street, a council guard on post either side
//     of its door, a clerk who goes in and out of it, a courier between the spaceport's bridge, the council house and
//     the ferry dock, a petitioner from Twinsun waiting by the fountain; upstairs in the antechamber (upper.js) a junior
//     clerk at the noticeboard and the counter's end, a courier with a case from the lift, two petitioners (one on the
//     bench), a guard on post either side of the council's door (never the archive's: the disguise is in there).
//
// The rules (WORLD_CONSISTENCY.md, the work order): talk and scenes win (a resident spoken to stops and turns; anyone a
// chapter places is the chapter's: these are never a chapter's people); nothing is saved (the state is read from the
// chapter and the story's own flags: `phase` below); old saves load as they did. A change of state moves a resident
// only where the camera cannot see it (story/citizens.js), so nobody pops in or out in view. Every stop keeps clear of
// the doors, the prompts, the story people's marks and rounds (castrounds.js), the mandatory ways and the places of
// the sneak, the disguise and the fights (tests/residents.mjs checks them). Out of their area they sleep: no update at
// all while the hero is not in that area (citizens.js), so a far region costs nothing.
//
// A resident: { id, char (characters.js LOOKS), tint, speed, color, start, area ('desert' | 'hamalayi' | 'zeelich'),
// phase(f, story) → a key of `rounds` or null (not here now), rounds: { key: stops } } with stops as walkrounds.js's,
// in the area's own frame (the region group's origin is added when it is built).
import * as THREE from 'three';
import { Walkers } from './walkers.js';
import { Kit, MAT, rbox, cyl } from './props.js';
import { woodpile, dryingRack, sledge } from './props-mountain.js';

const A = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
const PI = Math.PI;
// a stop at (x, z) facing (tx, tz)
const L = (id, x, z, tx, tz, act, dur, o = {}) => ({ id, x, z, a: A(x, z, tx, tz), act, dur, ...o });
// a stop at (x, z) facing the way a
const D = (id, x, z, a, act, dur, o = {}) => ({ id, x, z, a, act, dur, ...o });
// a door it goes in at: the slot in front of the door (out m along the door's outward way ry), gone `dur` s inside
const DOOR = (id, door, ry, out, dur, o = {}) => ({ id, x: door.x + Math.sin(ry) * out, z: door.z + Math.cos(ry) * out, a: ry + PI, act: 'knock', door: { x: door.x, z: door.z }, dur, ...o });
const idx = (S, key) => S.chapters.findIndex((c) => c.key === key);

// ================================================================== Desert Island (desert.js's frame: the island at x 3400)
// the research post's fence x 26…58, z −34…−8, its gate on the west side at z −21; the dig at (64, 28), its rope ring at
// 17.5 m, its gate (46.8, 20.3) and keypad (47.7, 18.1); the yacht's stop at the dig (44, 25); the track to the gate
// along x 22…26. The yard's things (built here, dressDesert): the crate pile in the yard north of the post (PILE_A),
// the pile by the dig's gate (PILE_B, 6 m off the keypad and 8 m off the yacht's line), the field kitchen (its fire, a
// table, two water barrels) north of the post's east half, the surveyor's tripod on the dig's north rim
export const DIG_YARD = {
  pileA: { x: 31, z: -3.6 }, pileB: { x: 38, z: 14 },
  fire: { x: 50, z: -2.6 }, table: { x: 53.6, z: -2.6 }, barrels: { x: 46.6, z: -2.7 }, tripod: { x: 63.5, z: 8.0 },
};
const Y = DIG_YARD, PA = Y.pileA, PB = Y.pileB, FI = Y.fire, TB = Y.table, BR = Y.barrels, TP = Y.tripod, DIGC = { x: 64, z: 28 };
// (the crew's state: 'crew' at work (chapter 4, chapter 5 before the order), 'pack' (chapter 5 after it, the six who
//  stayed); null: not here — another chapter, a sandstorm blowing (they shelter), or gone with the ferry)
const crew = (stays) => (f, S) => {
  const k = S.cur?.key;
  if (k === 'dig') return S.cur.stormy ? null : 'crew';
  if (k === 'steam') return !f.c5_planned ? 'crew' : stays ? 'pack' : null;
  return null;
};
// (the School: from chapter 4 on; DESERT-BAR: in the evacuation too, which is Citadel's: the ferry still reaches the island)
const school = (f, S) => (S.index >= idx(S, 'dig') ? 'school' : null);

const DESERT_PEOPLE = [
  // the surveyor at his tripod on the north rim, a look from the north-east rim, a word with his staff man, his notes at the kitchen's table
  { id: 'dg_surv', char: 'worker', tint: '#fff2dc', speed: 0.95, color: '#e8c030', start: 0, area: 'desert', phase: crew(true), rounds: {
    crew: [
      L('surv_scope', TP.x, TP.z - 0.85, TP.x, TP.z + 4, 'browse', [14, 20], { gest: ['nod'] }),
      L('surv_rim', 77.6, 15.2, DIGC.x, DIGC.z, 'stand', [6, 9], { gest: ['nod'] }),
      L('surv_chat', 61.2, 6.2, 62.6, 5.8, 'stand', [16, 22], { pair: 'survey', mate: 'dg_rod' }),
      L('surv_notes', TB.x - 0.6, TB.z + 1.0, TB.x - 0.6, TB.z, 'browse', [8, 12]),
    ],
    pack: [
      L('surv_fold', TP.x, TP.z - 0.85, TP.x, TP.z + 4, 'browse', [10, 14]),
      L('surv_last', 61.0, 9.4, DIGC.x, DIGC.z, 'stand', [6, 9], { gest: ['sigh'] }),
      L('surv_notes', TB.x - 0.6, TB.z + 1.0, TB.x - 0.6, TB.z, 'browse', [8, 12]),
    ] } },
  // his staff man: the far rim east, the rim west (by the dig's gate, well off it), back for a word
  { id: 'dg_rod', char: 'farmerA', tint: '#e6eeff', speed: 1.05, color: '#a8c0f0', start: 0, area: 'desert', phase: crew(false), rounds: {
    crew: [
      L('rod_east', 75.6, 12.4, TP.x, TP.z, 'stand', [8, 12]),
      L('rod_chat', 62.6, 5.8, 61.2, 6.2, 'stand', [16, 22], { pair: 'survey', mate: 'dg_surv' }),
      L('rod_west', 45.6, 31.4, TP.x, TP.z, 'stand', [8, 12], { gest: ['shrug'] }),
    ] } },
  // the cook: the pot on the fire, the table, water from the barrels poured into the pot
  { id: 'dg_cook', char: 'farmerB', tint: '#fff0e6', speed: 0.9, color: '#f0a8a0', start: 0, area: 'desert', phase: crew(true), rounds: {
    crew: [
      L('cook_pot', FI.x, FI.z + 1.15, FI.x, FI.z, 'browse', [14, 20], { gest: ['nod'] }),
      L('cook_table', TB.x + 0.6, TB.z + 1.0, TB.x + 0.6, TB.z, 'put', [6, 9]),
      L('cook_water', BR.x, BR.z + 1.2, BR.x, BR.z, 'draw', [5, 7], { carry: 'can' }),
      L('cook_pour', FI.x - 1.0, FI.z + 0.9, FI.x, FI.z, 'put', [4, 6], { carry: null }),
    ],
    pack: [
      L('cook_pot', FI.x, FI.z + 1.15, FI.x, FI.z, 'browse', [12, 18]),
      L('cook_table', TB.x + 0.6, TB.z + 1.0, TB.x + 0.6, TB.z, 'put', [6, 9], { carry: 'basket' }),
      L('cook_stow', PA.x + 0.4, PA.z - 1.2, PA.x + 0.4, PA.z, 'put', [5, 7], { carry: null }),
    ] } },
  // the porters: a crate off the yard's pile to the pile by the dig (chapter 5: back again), a breather at the kitchen
  { id: 'dg_haul', char: 'farmerC_b', tint: '#ffffff', speed: 0.95, color: '#e8a860', start: 0, area: 'desert', phase: crew(true), rounds: {
    crew: [
      L('haul_a', PA.x, PA.z + 1.2, PA.x, PA.z, 'put', [4, 6], { carry: 'crate' }),
      L('haul_b', PB.x, PB.z - 1.2, PB.x, PB.z, 'put', [5, 7], { carry: null }),
      L('haul_rest', FI.x + 1.4, FI.z + 2.2, FI.x, FI.z, 'rest', [5, 8]),
    ],
    pack: [
      L('haul_b', PB.x, PB.z - 1.2, PB.x, PB.z, 'put', [4, 6], { carry: 'crate' }),
      L('haul_a', PA.x, PA.z + 1.2, PA.x, PA.z, 'put', [5, 7], { carry: null }),
      L('haul_rest', FI.x + 1.4, FI.z + 2.2, FI.x, FI.z, 'rest', [5, 8]),
    ] } },
  { id: 'dg_porter', char: 'worker', tint: '#e2eeff', speed: 1.0, color: '#80c8c8', start: 1, area: 'desert', phase: crew(true), rounds: {
    crew: [
      L('port_a', PA.x + 1.6, PA.z, PA.x, PA.z, 'put', [4, 6], { carry: 'crate' }),
      L('port_b', PB.x - 1.6, PB.z, PB.x, PB.z, 'put', [5, 7], { carry: null }),
      L('port_fence', 40.5, -6.6, 40.5, -9, 'stand', [5, 8], { gest: ['shrug'] }),
    ],
    pack: [
      L('port_b', PB.x - 1.6, PB.z, PB.x, PB.z, 'put', [4, 6], { carry: 'crate' }),
      L('port_a', PA.x + 1.6, PA.z, PA.x, PA.z, 'put', [5, 7], { carry: null }),
      L('port_fence', 40.5, -6.6, 40.5, -9, 'stand', [5, 8], { gest: ['sigh'] }),
    ] } },
  // the fitter: the post's fence mended from outside, the rim's rope re-staked, a look over the yard's crates
  { id: 'dg_mech', char: 'lharMan_b', tint: '#f0e2cc', speed: 0.9, color: '#c8a070', start: 0, area: 'desert', phase: crew(true), rounds: {
    crew: [
      L('mech_fence', 45.2, -6.75, 45.2, -8, 'browse', [12, 18], { gest: ['shrug'] }),
      L('mech_stake', 59.4, 10.4, DIGC.x, DIGC.z, 'tend', [9, 13]),
      L('mech_pile', PA.x, PA.z - 1.2, PA.x, PA.z, 'browse', [5, 8]),
    ],
    pack: [
      L('mech_fence', 45.2, -6.75, 45.2, -8, 'browse', [12, 18]),
      L('mech_tripod', TP.x - 1.1, TP.z - 0.6, TP.x, TP.z, 'browse', [6, 9]),
      L('mech_pile', PA.x, PA.z - 1.2, PA.x, PA.z, 'browse', [5, 8]),
    ] } },
  // the digger: the spoil at the west rim, the dig's crates, his bowl at the kitchen's table
  { id: 'dg_dig', char: 'worker', tint: '#f6e4cc', speed: 1.0, color: '#d8a060', start: 2, area: 'desert', phase: crew(false), rounds: {
    crew: [
      L('dig_rim', 46.6, 34.8, DIGC.x, DIGC.z, 'tend', [12, 16]),
      L('dig_pile', PB.x, PB.z + 1.2, PB.x, PB.z, 'browse', [5, 8]),
      L('dig_eat', TB.x - 0.6, TB.z - 1.05, TB.x - 0.6, TB.z, 'browse', [10, 14]),
    ] } },
  // the site clerk: the crates counted at both piles, the table, a look through the post's fence at the bore
  { id: 'dg_clerk', char: 'archivist', tint: '#eef6ff', speed: 0.9, color: '#90b8c8', start: 2, area: 'desert', phase: crew(true), rounds: {
    crew: [
      L('clk_a', PA.x - 1.6, PA.z, PA.x, PA.z, 'browse', [6, 9]),
      L('clk_b', PB.x + 1.6, PB.z, PB.x, PB.z, 'browse', [6, 9]),
      L('clk_table', TB.x + 0.7, TB.z - 1.05, TB.x + 0.7, TB.z, 'browse', [8, 12]),
      L('clk_post', 35.6, -6.6, 35.6, -9, 'stand', [5, 8], { gest: ['nod'] }),
    ],
    pack: [
      L('clk_a', PA.x - 1.6, PA.z, PA.x, PA.z, 'browse', [6, 9]),
      L('clk_post', 35.6, -6.6, 35.6, -9, 'stand', [6, 9], { gest: ['sigh'] }),
      L('clk_table', TB.x + 0.7, TB.z - 1.05, TB.x + 0.7, TB.z, 'browse', [8, 12]),
    ] } },

  // ---------------------------------------------------------------- the School's plaza (desertold.js: the mask's chin door,
  // its forecourt x −67.4…−65.0; the bridge over the channel at z −72.7; the plaza x −62.4…−54.5, z −80.5…−68.3; the
  // channel at its west edge; the palm (−58.6, −77.4), the sign (−59.6, −70.2), the horned pillars at x −60.2). The
  // way from the rim walk's stair (−56.2, −68.3) to the bridge stays clear; the herb bed (built here) by the east wall
  { id: 'sc_master', char: 'magus', tint: '#dfe8ff', speed: 0.75, color: '#9fc0ff', start: 0, area: 'desert', phase: school, rounds: {
    school: [
      L('m_watch', -55.6, -78.2, -58.6, -79.4, 'stand', [16, 24], { gest: ['nod'] }),
      L('m_water', -61.8, -76.6, -64, -76.6, 'stand', [6, 9], { gest: ['sigh'] }),
      L('m_look', -56.4, -71.4, -66, -72.7, 'stand', [8, 12], { gest: ['nod'] }),   // (a look across at the chin door)
    ] } },
  { id: 'sc_pupa', char: 'lulu', tint: '#e6f2ff', speed: 1.2, color: '#a8d0ff', start: 0, area: 'desert', phase: school, rounds: {
    school: [
      L('a_spell', -59.6, -79.4, -57.6, -79.4, 'stand', [18, 26], { pair: 'spell', mate: 'sc_pupb' }),
      L('a_draw', -61.85, -78.0, -63.7, -78.0, 'draw', [5, 7], { carry: 'can' }),
      L('a_water', -56.4, -75.95, -56.4, -74.4, 'water', [8, 12], { carry: null }),
    ] } },
  { id: 'sc_pupb', char: 'tim', tint: '#eaffea', speed: 1.3, color: '#a0e0a0', start: 0, area: 'desert', phase: school, rounds: {
    school: [
      L('b_spell', -57.6, -79.4, -59.6, -79.4, 'stand', [18, 26], { pair: 'spell', mate: 'sc_pupa' }),
      L('b_tend', -57.5, -76.1, -56.9, -75.2, 'tend', [9, 13]),
      L('b_look', -57.6, -72.4, -66, -72.7, 'stand', [5, 8], { gest: ['shrug'] }),
    ] } },
  { id: 'sc_pupc', char: 'desertkid_b', tint: '#fff2ec', speed: 1.4, color: '#ffc0a0', start: 1, area: 'desert', phase: school, rounds: {
    school: [
      L('c_dip', -61.85, -79.6, -63.7, -79.6, 'dip', [4, 6]),
      L('c_pillar', -59.3, -76.0, -60.2, -75.1, 'stand', [5, 8], { gest: ['shrug'] }),
    ] } },
  // PURPOSES (3.11.2026): Oni, a pupil, on the rim walk before the dormitory's door (the great hall in the pool,
  // desertold.js: its door (−67.8, −66.4), the study crystal on its bracket (−66.05, −65.5)); a look up at the crystal
  { id: 'oni', char: 'desertkid', tint: '#eef0ff', speed: 1.1, color: '#b8c8ff', start: 0, area: 'desert', phase: school, rounds: {
    school: [
      // (1 m east of where she stood: that was 1.7 m from the centre of the School wall's big boulder (desertold.js
      //  OLD_ROCKS −72.0, −68.1, its collider 2.2 m round), inside it, its top her floor)
      L('oni_door', -69.4, -67.0, -67.8, -66.0, 'stand', [20, 30], { gest: ['sigh'] }),
      L('oni_look', -64.9, -67.5, -66.05, -65.5, 'stand', [8, 12], { gest: ['shrug'] }),
    ] } },
];
// the School's herb bed (built here): long side along z, by the plaza's east wall
const HERB_BED = { x: -56.4, z: -74.4, w: 0.9, l: 1.9 };
// the plaza's paving lies at 0.3 m, under the street planner's shore line (walknav.js MIN_GROUND 0.35): it is dry land in
// this box (walknav.js addShore). The plaza's people stay on it: the bridge to the chin door is two split steps the
// planner does not walk (its deck stands 1.3 m over the channel), so the School's door is the pupils' inside (the
// classroom's three, below), not a door these walk through
const SCHOOL_PLAZA = { x0: -62.35, x1: -54.7, z0: -80.45, z1: -68.4, min: 0.2 };

// ================================================================== the Hamalayi (hamalayi.js's frame: the area at x 4300)
// Lhar: the square's shrine (−8, 13), the story's villagers' marks v1 (−18, 8), v2 (−14, 1), v3 (0, 2), Yorna (−6, 6),
// Pim (−3, 7.5) and their rounds' stops; the way in from the trail's top (12, 9) to the square. The houses the story
// sends nobody into: house 3 (−24, 20, ry 0.5, its door (−22.59, 22.54)) and house 4 (6, 18, ry −0.6, door (4.29,
// 20.46)). The square's things: the hand cart (−17.3, 2.4), the crates (−26.3, 0.3), the sledge (−24.6, 8.6), the
// trough (−17, 12.3), the fire and its pot (−4, 17.2), the woodpiles (−15.8, −4.4) and (7.5, 15.9), the drying rack
// (−5.6, −6.2), the barrels (3.6, −0.2), the second sledge (10.6, 13.6).
// The monastery: the yard (34, −40) inside its walls (x 25…43, z −45…−34; the gate at (34, −33)) is the story
// villagers'; their camp is on the terrace east of it (built here, MON_CAMP): x 45…58, z −47…−29. The terrace's lip by
// the gate (x 34…47, z −33…−28) is chapter 7's take-off: the glider stands there for its film (observatory.js SLOPE,
// watched from (47, −31)), so no stop is west of x 50 between z −33 and the lip.
const H3 = { x: -22.59, z: 22.54 }, H4 = { x: 4.29, z: 20.46 };
export const MON_CAMP = { fire: { x: 50, z: -40 }, rack: { x: 51.5, z: -31.6 }, wood: { x: 57, z: -43.5 }, sledge: { x: 46.6, z: -46 }, crates: { x: 45.6, z: -35.4 }, tag: { x: 55.2, z: -36.6, r: 2.0 } };
const MC = MON_CAMP, LHAR_TAG = { x: -4, z: 27.5, r: 2.0 };
// (in Lhar before the lift (and before chapter 6), up at the monastery once the trip that takes them has gone up; home in
//  Lhar again after the ending, with Yorna, Pim and the story's villagers: story/epilogue.js EPILOGUE-HOME)
const village = (trip) => (f, S) => {
  const i = S.index, p = idx(S, 'pass');
  if (i < p) return 'lhar';
  if (S.cur?.key === 'pass') return f[trip] ? 'mon' : 'lhar';
  if (S.cur?.key === 'home') return 'lhar';
  if (MEND.has(S.cur?.key)) return 'mend';
  return 'mon';
};
// (HAMALAYI-LIFE: from chapter 8, the vent open and the ground still, the village still lives in the camp ('mend': the
//  camp's rounds, its own lines) but some go down by day to mend Lhar: Bero, Sana and Lhamo are in their houses then, and
//  Old Dorje in his once Lhar is home again (story/hamlife.js places them indoors); out here they are not there then)
const MEND = new Set(['evacuation', 'council', 'network', 'shell', 'core']);
const homeAt = (phase, inside) => (f, S) => { const k = phase(f, S); return k === inside ? null : k; };
const HAMALAYI_PEOPLE = [
  // Bero: sacks out of house 3 to the hand cart, the sledge's load lashed; up there, logs split and carried to the fire
  { id: 'lh_bero', char: 'lharMan', tint: '#f6eadc', speed: 0.9, color: '#d8a878', start: 0, area: 'hamalayi', phase: homeAt(village('c6_trip1'), 'mend'), rounds: {
    lhar: [
      DOOR('bero_home', H3, 0.5, 0.9, [6, 10], { carry: 'sack' }),
      L('bero_cart', -17.1, 3.9, -17.3, 2.4, 'put', [5, 7], { carry: null }),
      L('bero_sledge', -23.4, 10.0, -24.6, 8.6, 'browse', [8, 12]),
    ],
    mon: [
      L('bero_wood', MC.wood.x - 1.4, MC.wood.z, MC.wood.x, MC.wood.z, 'browse', [10, 14], { carry: 'crate' }),
      L('bero_fire', MC.fire.x + 1.2, MC.fire.z - 0.2, MC.fire.x, MC.fire.z, 'put', [4, 6], { carry: null }),
      L('bero_view', 57.4, -30.2, 57.4, -20, 'stand', [5, 8], { gest: ['sigh'] }),
    ] } },
  // Sana: the washing off the rack and into house 4, the barrels; up there, mending at the rack, the pot, a look down
  { id: 'lh_sana', char: 'lharWoman', tint: '#eaf6ff', speed: 0.95, color: '#a0d8c8', start: 1, area: 'hamalayi', phase: homeAt(village('c6_trip1'), 'mend'), rounds: {
    lhar: [
      L('sana_rack', -5.6, -5.0, -5.6, -6.2, 'draw', [6, 9], { carry: 'basket' }),
      DOOR('sana_home', H4, -0.6, 0.9, [8, 12], { carry: null }),
      L('sana_barrels', 3.0, 1.0, 3.6, -0.2, 'browse', [6, 9]),
    ],
    mon: [
      L('sana_rack', MC.rack.x, MC.rack.z - 1.1, MC.rack.x, MC.rack.z, 'browse', [12, 18], { gest: ['nod'] }),
      L('sana_pot', MC.fire.x, MC.fire.z + 1.2, MC.fire.x, MC.fire.z, 'browse', [8, 12]),
      L('sana_view', 54.4, -29.8, 54.4, -20, 'stand', [5, 8]),
    ] } },
  // Old Dorje: warm by the fire, watching the packing with a sigh; up there, the camp's fire and the washing
  { id: 'lh_old', char: 'lharElder', tint: '#fff6ea', speed: 0.7, color: '#e0c8f0', start: 0, area: 'hamalayi', phase: (f, S) => (S.cur?.key === 'home' ? null : village('c6_trip2')(f, S)), rounds: {
    lhar: [
      L('old_fire', -4.8, 16.1, -4, 17.2, 'warm', [14, 20], { gest: ['sigh'] }),
      L('old_look', -11.0, 6.6, -16, 3, 'stand', [8, 12], { gest: ['sigh', 'shrug'] }),
    ],
    mon: [
      L('old_fire', MC.fire.x - 1.2, MC.fire.z, MC.fire.x, MC.fire.z, 'warm', [16, 24], { gest: ['nod'] }),
      L('old_rack', 50.0, -33.4, MC.rack.x, MC.rack.z, 'stand', [8, 12]),
    ] } },
  // Tam: wood from the north woodpile to the fire, a look at the south woodpile; up there, the sledge unloaded by the gate
  { id: 'lh_tam', char: 'farmerA', tint: '#eaffea', speed: 1.0, color: '#b0d890', start: 1, area: 'hamalayi', phase: village('c6_trip2'), rounds: {
    lhar: [
      L('tam_wood', -17.4, -4.4, -15.8, -4.4, 'put', [4, 6], { carry: 'crate' }),
      L('tam_fire', -5.2, 17.8, -4, 17.2, 'put', [4, 6], { carry: null }),
      L('tam_wood4', 6.5, 14.6, 7.5, 15.9, 'browse', [8, 12]),
    ],
    mon: [
      L('tam_sledge', MC.sledge.x + 0.8, MC.sledge.z + 1.1, MC.sledge.x, MC.sledge.z, 'put', [4, 6], { carry: 'sack' }),
      L('tam_crates', MC.crates.x + 1.3, MC.crates.z - 0.4, MC.crates.x, MC.crates.z, 'put', [4, 6], { carry: null }),
      L('tam_warm', MC.fire.x + 0.85, MC.fire.z + 0.85, MC.fire.x, MC.fire.z, 'warm', [6, 9]),
    ] } },
  // the children: tag below the square (up there, on the terrace), a dash about between
  { id: 'lh_kid1', char: 'desertkid', tint: '#eef6ff', speed: 1.5, color: '#a8d8ff', start: 0, area: 'hamalayi', phase: village('c6_trip1'), rounds: {
    lhar: [
      L('k1_tag', LHAR_TAG.x - 1.2, LHAR_TAG.z, LHAR_TAG.x, LHAR_TAG.z, 'stand', [22, 30], { pair: 'lhtag', mate: 'lh_kid2', play: 'tag', field: LHAR_TAG }),
      D('k1_a', 1.5, 18.0, 0.5, 'stand', [3, 5]),
      D('k1_b', -13.2, 16.6, -1.2, 'stand', [3, 5]),
    ],
    mon: [
      L('k1_tag', MC.tag.x - 1.2, MC.tag.z, MC.tag.x, MC.tag.z, 'stand', [22, 30], { pair: 'montag', mate: 'lh_kid2', play: 'tag', field: MC.tag }),
      D('k1_c', 48.4, -36.6, 2.0, 'stand', [3, 5]),
    ] } },
  { id: 'lh_kid2', char: 'pim', tint: '#fff0ea', speed: 1.4, color: '#ffb8a0', start: 0, area: 'hamalayi', phase: village('c6_trip2'), rounds: {
    lhar: [
      L('k2_tag', LHAR_TAG.x + 1.2, LHAR_TAG.z, LHAR_TAG.x, LHAR_TAG.z, 'stand', [22, 30], { pair: 'lhtag', mate: 'lh_kid1', play: 'tag', field: LHAR_TAG }),
      L('k2_sledge', 9.6, 14.8, 10.6, 13.6, 'browse', [4, 6]),
    ],
    mon: [
      L('k2_tag', MC.tag.x + 1.2, MC.tag.z, MC.tag.x, MC.tag.z, 'stand', [22, 30], { pair: 'montag', mate: 'lh_kid1', play: 'tag', field: MC.tag }),
      L('k2_view', 52.0, -29.6, 52.0, -20, 'stand', [4, 6]),
    ] } },
  // Mira: water from the trough to the pot on the fire, a word by the shrine; up there, the cooking
  { id: 'lh_mira', char: 'farmerB', tint: '#fffae6', speed: 0.9, color: '#f0c8a0', start: 0, area: 'hamalayi', phase: homeAt(village('c6_trip1'), 'mend'), rounds: {
    lhar: [
      L('mira_trough', -15.6, 12.0, -17, 12.3, 'draw', [5, 7], { carry: 'can' }),
      L('mira_pot', -3.0, 16.2, -4, 17.2, 'put', [5, 7], { carry: null }),
      L('mira_shrine', -10.0, 9.5, -8, 13, 'stand', [6, 9], { gest: ['nod'] }),
    ],
    mon: [
      L('mira_pot', MC.fire.x, MC.fire.z - 1.2, MC.fire.x, MC.fire.z, 'browse', [14, 20], { gest: ['nod'] }),
      L('mira_crates', MC.crates.x + 1.3, MC.crates.z + 0.6, MC.crates.x, MC.crates.z, 'browse', [6, 9], { carry: 'basket' }),
      L('mira_back', MC.fire.x - 0.9, MC.fire.z - 0.9, MC.fire.x, MC.fire.z, 'put', [4, 6], { carry: null }),
    ] } },
  // Grum: crates to the hand cart; up there, the sledge's load into the camp
  { id: 'lh_grum', char: 'farmerC_b', tint: '#eef0ff', speed: 0.85, color: '#c0c8e8', start: 1, area: 'hamalayi', phase: village('c6_trip2'), rounds: {
    lhar: [
      L('grum_crates', -26.0, 1.6, -26.3, 0.3, 'put', [4, 6], { carry: 'crate' }),
      L('grum_cart', -15.9, 2.8, -17.3, 2.4, 'put', [5, 7], { carry: null }),
    ],
    mon: [
      L('grum_sledge', MC.sledge.x - 0.4, MC.sledge.z + 1.3, MC.sledge.x, MC.sledge.z, 'put', [4, 6], { carry: 'crate' }),
      L('grum_crates', MC.crates.x + 0.2, MC.crates.z + 1.2, MC.crates.x, MC.crates.z, 'put', [5, 7], { carry: null }),
    ],
    // (HAMALAYI-LIFE: while Lhar is mended he carries the new slates that come down the lift to Bero's house, and back)
    mend: [
      L('grum_lift', 17.0, -15.5, 24, -22, 'put', [5, 7], { carry: 'crate' }),
      DOOR('grum_bero', H3, 0.5, 0.9, [4, 6], { carry: null }),
      L('grum_cart', -15.9, 2.8, -17.3, 2.4, 'browse', [4, 6]),
    ] } },
];
for (const p of HAMALAYI_PEOPLE) p.rounds.mend ||= p.rounds.mon;   // (HAMALAYI-LIFE: the camp's rounds while Lhar is mended)

// ================================================================== Zeelich's council quarter (zeelich.js's frame: the island at x 2400)
// the council house's door (−25.5, −7.65) (its cloud lift: the upper district's rooms); the fountain (−24, 0), 2.5 m
// round; the spaceport's bridge from z 26 at x −4; the ferry's dock (−57.6, 1.3); Nara (−34.5, −3.2), Oku (−24, 7)
const COUNCIL_DOOR = { x: -25.5, z: -7.65 };
const council = (f, S) => (S.cur?.key === 'council' ? 'council' : null);
const ZEELICH_PEOPLE = [
  // PURPOSES (3.11.2026): Marl, who trains the project's guard dogs in the yard behind the north houses (zeelich.js: the
  // palisade round (−28, −21), 11 × 6.8 m, its gate gap on the south side at x −32, z −17.6); from chapter 3 on
  { id: 'marl', char: 'keeper', tint: '#fff0dc', speed: 0.8, color: '#e8b070', start: 0, area: 'zeelich',
    phase: (f, S) => (S.index >= idx(S, 'zeelich') ? 'yard' : null), rounds: {
      // (the council house (−25.5, −13.3; 8.2 × 5.6 m) backs onto the yard, its back wall at z −16.35, 1.25 m short of the
      //  gate: both stops stood inside it, Marl's legs in the wall. Now at its two back corners, by the fence)
      yard: [
        // (ISLES-BAR: the gate's gap moved west to x −32, the lane's head: he stands just west of it, by the fence)
        L('marl_gate', -34.0, -16.3, -31, -20, 'stand', [24, 34], { gest: ['nod'] }),
        L('marl_side', -20.4, -16.4, -26, -21, 'stand', [10, 14]),
      ] } },
  // a council guard on post either side of the council house's door, crossing over now and then
  { id: 'zc_guard', char: 'keeper_b', tint: '#dfe4ff', speed: 0.6, color: '#a0a8e8', start: 0, area: 'zeelich', phase: council, rounds: {
    council: [
      // (west of the door's flower tub (−27.8, −5.2), not behind it: there he stood with his nose in its leaves, legs hidden)
      D('g_west', -29.4, -6.6, 0, 'stand', [30, 45]),
      D('g_east', -23.0, -6.3, 0, 'stand', [30, 45]),
    ] } },
  // a council clerk: in and out of the council house, a paper read by the fountain, out to the bridge to meet the ship
  { id: 'zc_clerk', char: 'clerk', tint: '#f6eeff', speed: 0.95, color: '#c8b8f0', start: 1, area: 'zeelich', phase: council, rounds: {
    council: [
      DOOR('cl_in', COUNCIL_DOOR, 0, 1.05, [18, 26]),
      L('cl_paper', -26.8, 2.6, -24, 0, 'stand', [6, 9], { gest: ['sigh'] }),
      L('cl_bridge', -5.5, 22.5, -4, 30, 'stand', [5, 8]),
    ] } },
  // a courier with a document case: from the spaceport's bridge to the council house, then to the ferry's dock
  { id: 'zc_courier', char: 'xil', tint: '#fff0f8', speed: 1.15, color: '#f0b0d8', start: 0, area: 'zeelich', phase: council, rounds: {
    council: [
      L('co_bridge', 0.5, 25.5, -4, 30, 'stand', [4, 6], { carry: 'case' }),
      DOOR('co_in', COUNCIL_DOOR, 0, 1.05, [12, 18], { carry: null }),
      L('co_dock', -54.0, 0.5, -62, 0.5, 'stand', [5, 8], { gest: ['nod'] }),
    ] } },
  // a petitioner from Twinsun, waiting by the fountain with her form, a look at the council's door
  { id: 'zc_petit', char: 'lharWoman_b', tint: '#f2eaff', speed: 0.85, color: '#d0b0f0', start: 0, area: 'zeelich', phase: council, rounds: {
    council: [
      L('pe_wait', -28.4, -2.4, -25.5, -7.65, 'stand', [16, 24], { gest: ['sigh', 'shrug'] }),
      L('pe_fount', -26.6, 2.9, -24, 0, 'dip', [5, 8]),
    ] } },
];

// ------------------------------------------------------------------ the outdoor rosters, in the world (the area built)
export const STORY_AREAS = { desert: DESERT_PEOPLE, hamalayi: HAMALAYI_PEOPLE, zeelich: ZEELICH_PEOPLE };
export const STORY_IDS = Object.fromEntries(Object.entries(STORY_AREAS).map(([a, L0]) => [a, L0.map((p) => p.id)]));
// which roster an id is in (the tests: the area each one counts for)
export const STORY_GROUP = {
  dig: DESERT_PEOPLE.filter((p) => p.id.startsWith('dg_')).map((p) => p.id),
  school: DESERT_PEOPLE.filter((p) => p.id.startsWith('sc_')).map((p) => p.id),
  village: HAMALAYI_PEOPLE.map((p) => p.id),
  council: ZEELICH_PEOPLE.filter((p) => p.phase === council).map((p) => p.id),
};
const shift = (s, ox, oz) => ({ ...s, x: s.x + ox, z: s.z + oz, ...(s.door ? { door: { x: s.door.x + ox, z: s.door.z + oz } } : {}), ...(s.field ? { field: { ...s.field, x: s.field.x + ox, z: s.field.z + oz } } : {}) });
// every outdoor story resident's definition (story/citizens.js npcDefs): its rounds by state in the world, or pending (its
// area not built yet: hidden, no round; src/main.js addActors gives it the round when the area is built)
export function storyDefs(game) {
  const out = [];
  for (const [area, people] of Object.entries(STORY_AREAS)) {
    const R = game.regions?.built(area), o = R?.group?.position;
    if (R && area === 'zeelich') (game.walkers ||= new Walkers(game)).nav.addLevel(o.x - 62, o.x + 66, 6.0);   // (Zeelich's floor bricks: as walkrounds.js zeelichRoster)
    if (R && area === 'desert') { const F = SCHOOL_PLAZA; (game.walkers ||= new Walkers(game)).nav.addShore({ x0: F.x0 + o.x, x1: F.x1 + o.x, z0: F.z0 + o.z, z1: F.z1 + o.z, min: F.min }); }
    for (const p of people) {
      const base = { id: p.id, name: 'n_' + p.id, char: p.char, tint: p.tint, speed: p.speed, color: p.color, ambient: true, story: true, area, start: p.start || 0, phase: p.phase };
      if (!R) { out.push({ ...base, x: 0, z: 0, angle: 0, pending: true }); continue; }
      const rounds = Object.fromEntries(Object.entries(p.rounds).map(([k, st]) => [k, st.map((s) => shift(s, o.x, o.z))]));
      const first = Object.values(rounds)[0], s0 = first[(p.start || 0) % first.length];
      out.push({ ...base, rounds, round: first, x: s0.x, z: s0.z, angle: s0.a ?? 0 });
    }
  }
  return out;
}

// ================================================================== the rooms (roomlife.js ROOMS: the room's own frame)
// the School's hall (wizards.js buildSchoolRoom: s 0.63, the original's cells): the classroom 3.2 m up in the back left
// corner (cells 29…40 × 3…18), its benches in two groups of three facing the dais (cells 33.5/35.5/37.5 × 5/15.5;
// props.js bench: no back, its seat 0.47 m up), the blackboard on the back wall over cell 31, its open edge at cell 18.
// Rector Hougo teaches on the dais (cells 22…29, 4 m up); the stair down to the walkway at cells 40…43 × 8…13 and the
// way across the classroom from it to the dais's step stay clear.
const SX = (lx) => (lx - 22) * 0.63 - 41 * 0.63 / 2, SZ = (lz) => (lz - 3) * 0.63 - 39 * 0.63 / 2;
export const BENCH_SEAT = { seatY: 0.47, back: -0.6, front: 0.17 };   // (props.js bench: a backless plank 0.44…0.47 m up, 0.34 m deep)
const SEATED = (id, slot, seat, dur, o = {}) => ({ id, x: slot[0], z: slot[1], a: seat[2], act: 'stand', seat: { x: seat[0], z: seat[1], a: seat[2], spec: BENCH_SEAT }, dur, ...o });
const B1 = [SX(33.5), SZ(5)], B2 = [SX(33.5), SZ(15.5)], B3 = [SX(35.5), SZ(5)], B4 = [SX(37.5), SZ(15.5)];
const north = (b) => [b[0], b[1] + 1.05], south = (b) => [b[0], b[1] - 1.05];   // (to sit down from: the bench's end on the aisle)
export const SCHOOL_ROOM = {
  floors: [{ x0: SX(29) + 0.05, x1: SX(40) - 0.05, z0: SZ(3) + 0.05, z1: SZ(18) - 0.1, y: 3.2 }],
  people: [
    { id: 'sc_in1', stays: true, char: 'lulu', tint: '#fff4e4', color: '#f0c0a0', speed: 1.0, start: 0, when: school, stops: [
      SEATED('i1_bench', north(B1), [...B1, -PI / 2], [40, 60]),
      D('i1_board', -7.0, -11.5, PI, 'stand', [6, 9], { gest: ['nod'] }),
    ] },
    { id: 'sc_in2', stays: true, char: 'tim', tint: '#e6f6ff', color: '#a0c8f0', speed: 1.0, start: 0, when: school, stops: [
      SEATED('i2_bench', south(B2), [...B2, -PI / 2], [40, 60]),
      D('i2_edge', -4.6, -3.5, 0, 'stand', [6, 9], { gest: ['shrug'] }),
    ] },
    { id: 'sc_in3', stays: true, char: 'desertkid', tint: '#f6eaff', color: '#d0a8f0', speed: 1.1, start: 0, when: school, stops: [
      SEATED('i3_bench', north(B3), [...B3, -PI / 2], [30, 45]),
      D('i3_board', -5.9, -11.5, PI, 'stand', [5, 8]),
      SEATED('i3_bench2', south(B4), [...B4, -PI / 2], [30, 45]),
    ] },
  ],
};
// the council's antechamber (upper.js buildUpper: 14 × 10 m; the counter (1.0, 1.4), 3.2 m long, the clerk behind it
// at (1.0, 0.6), Twinsen's place before it (1.0, 2.4); the benches (−3.5, 2.6 / 3.8), 2.2 m long, facing the counter;
// the noticeboard on the left wall (z −3.7…−1.3); the doors: the council (−3.5, −4.5), the archive (3.5, −4.5), the
// lift (−6.5, 0), where he arrives at (−5, 0)). Nobody goes near the archive's door
const upper = (f, S) => S.cur?.key === 'council';
export const UPPER_ROOM = {
  floors: [{ x0: -6.95, x1: 6.95, z0: -4.95, z1: 4.95, y: 0 }],
  people: [
    // (the user, 6.11, of Citadel: "two red Grobos together". Tib wears the clerk's own robe (the Esmer looks are few),
    //  so he no longer works at the clerk's elbow behind the counter, where the two stood side by side as twins: he
    //  pins forms up and takes them from Mrs Quill on the bench; his robe a cooler grey-blue, the clerk's junior)
    { id: 'up_clerk', char: 'clerk', tint: '#c4d0f4', color: '#b8c0f0', speed: 0.85, start: 0, when: upper, stops: [
      D('uc_board', -6.15, -3.2, -PI / 2, 'put', [6, 9], { gest: ['nod'] }),   // (a form pinned up)
      L('uc_quill', -1.9, 1.9, -3.0, 2.6, 'stand', [8, 12], { gest: ['nod'] }), // (Mrs Quill's form, at the bench's end)
    ] },
    { id: 'up_courier', char: 'xil', tint: '#fff4ec', color: '#f0c0b0', speed: 1.1, start: 0, when: upper, stops: [
      D('uk_lift', -5.9, 1.6, PI / 2, 'stand', [4, 6], { carry: 'case' }),
      L('uk_counter', -1.2, 0.6, 1.0, 0.6, 'put', [5, 7], { carry: null }),     // (the case handed over at the counter's end, on the clerk's side: clear of the benches)
    ] },
    { id: 'up_wait', char: 'farmerB', tint: '#fff0f4', color: '#f0b8c8', speed: 0.8, start: 0, when: upper, stops: [
      { id: 'uw_bench', x: -3.0, z: 1.75, a: PI, act: 'stand', seat: { x: -3.0, z: 2.6, a: PI, spec: BENCH_SEAT }, dur: [40, 60] },
      D('uw_board', -6.15, -1.7, -PI / 2, 'stand', [6, 9], { gest: ['sigh'] }),
    ] },
    { id: 'up_esmer', char: 'oku', tint: '#f2fff6', color: '#a8e0c0', speed: 0.75, start: 0, when: upper, stops: [
      D('ue_bench', -1.8, 3.9, PI, 'stand', [20, 30], { gest: ['sigh', 'shrug'] }),
      L('ue_plant', 4.5, 2.4, 5.5, 3.4, 'stand', [6, 9]),
    ] },
    { id: 'up_guard', char: 'keeper_b', tint: '#d8deff', color: '#9098e0', speed: 0.6, start: 0, when: upper, stops: [
      D('ug_west', -5.3, -3.9, 0, 'stand', [40, 60]),
      D('ug_east', -1.7, -3.9, 0, 'stand', [30, 45]),
    ] },
  ],
};
STORY_GROUP.school.push(...SCHOOL_ROOM.people.map((p) => p.id));
STORY_GROUP.council.push(...UPPER_ROOM.people.map((p) => p.id));
// the people who stand on post by design (the tests do not ask them to walk)
export const ON_POST = new Set(['zc_guard', 'up_guard']);

// ================================================================== the places' things (built once with the area)
// One Kit per area, merged per material (props.js: a handful of draw calls), into the region's own group; each piece
// that one walks round gets a collider (a low solid: never stepped onto), and the street's planner forgets the cells
// there. Low-poly on purpose (plain boxes, 6–10-sided cylinders, few materials: the flat colours share one
// vertex-coloured material), so an area's new things cost a few draw calls and a few thousand triangles.
function dress(game, R, build) {
  const P = game.physics, o = R.group.position, k = new Kit(new THREE.Group()), cols = [];
  const put = (x, z, ry, fn) => {
    const gy = P.groundAt(x + o.x, z + o.z) - o.y;
    const fp = k.at(x, gy, z, ry, () => fn(k)) || {};
    if (fp.hw != null || fp.r != null) {
      const top = gy + o.y + (fp.top ?? 1);
      cols.push(fp.r != null ? { type: 'cyl', x: x + o.x, z: z + o.z, r: fp.r, top, block: true } : { type: 'box', x: x + o.x, z: z + o.z, hw: fp.hw, hd: fp.hd, rot: ry, top, block: true });
    }
  };
  build(put);
  k.flush();
  k.group.name = 'storylife';
  R.group.add(k.group);
  for (const c of cols) P.add(c);
  const nav = game.walkers?.nav; if (nav) { nav.cells.clear(); nav.cache.clear(); }
  return k.group;
}
const BOX = (w, h, d) => rbox(w, h, d, 0);
const WOOD = () => MAT.planks('honey'), DARK = () => MAT.wood('dark'), IRON = () => MAT.iron();
const FLAT = (c) => MAT.flat(c, 0.85);
// a crate: a plank box with dark corner posts (s: its size)
const crate1 = (k, s, ry = 0) => { k.add(BOX(s, s, s), WOOD(), 0, s / 2, 0, ry); k.add(BOX(s + 0.03, 0.06, s + 0.03), DARK(), 0, s - 0.05, 0, ry); k.add(BOX(s + 0.03, 0.06, s + 0.03), DARK(), 0, 0.05, 0, ry); };
// a pile of crates: two side by side, a smaller one on top
const pile = (k) => { k.at(-0.38, 0, 0, 0, () => crate1(k, 0.65, 0.1)); k.at(0.36, 0, 0.02, 0, () => crate1(k, 0.6, -0.15)); k.at(-0.36, 0.65, 0, 0, () => crate1(k, 0.5, 0.3)); return { hw: 0.72, hd: 0.36, top: 1.15 }; };
// a water barrel
const barrel1 = (k, r = 0.3, h = 0.8) => { k.add(cyl(r * 0.92, r * 0.92, h, 10), DARK(), 0, h / 2, 0); for (const y of [0.15, h - 0.15]) k.add(cyl(r, r, 0.05, 10), IRON(), 0, y, 0); k.add(cyl(r * 0.85, r * 0.85, 0.02, 10), FLAT('#3a5a70'), 0, h + 0.005, 0); return { r, top: h }; };
// a cooking fire: a ring of stones, embers and logs, three poles and the pot hanging between them
const fire = (k) => {
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; k.add(BOX(0.24, 0.16, 0.2), FLAT('#8a847a'), Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55, -a); }
  k.add(cyl(0.42, 0.44, 0.04, 8), MAT.glow('#ff9a40', '#ff5a10', 1.1), 0, 0.03, 0);
  for (let i = 0; i < 3; i++) k.add(cyl(0.06, 0.06, 0.7, 6), DARK(), 0, 0.1, 0, i * 1.05, { rz: PI / 2 });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2 + 0.4; k.add(cyl(0.03, 0.03, 1.7, 5), DARK(), Math.cos(a) * 0.36, 0.8, Math.sin(a) * 0.36, 0, { rx: Math.sin(a) * 0.24, rz: -Math.cos(a) * 0.24 }); }
  k.add(cyl(0.2, 0.15, 0.26, 10), IRON(), 0, 0.82, 0);
  return { r: 0.72, top: 1.0 };
};
// the field kitchen's table: a plank top on four legs, a pot and two bowls
const table1 = (k) => {
  k.add(BOX(1.5, 0.06, 0.8), WOOD(), 0, 0.75, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(BOX(0.07, 0.72, 0.07), DARK(), sx * 0.66, 0.36, sz * 0.32);
  k.add(cyl(0.12, 0.1, 0.13, 10), IRON(), -0.4, 0.845, 0.05);
  for (const [x, z] of [[0.3, 0.1], [0.55, -0.15]]) k.add(cyl(0.11, 0.07, 0.05, 8), FLAT('#e8e0d0'), x, 0.805, z);
  return { hw: 0.75, hd: 0.4, top: 0.8 };
};
// the surveyor's tripod and its instrument
const tripod = (k) => {
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; k.add(cyl(0.025, 0.03, 1.42, 5), DARK(), Math.sin(a) * 0.24, 0.68, Math.cos(a) * 0.24, 0, { rx: Math.cos(a) * 0.33, rz: -Math.sin(a) * 0.33 }); }
  k.add(cyl(0.09, 0.09, 0.06, 8), IRON(), 0, 1.36, 0);
  k.add(BOX(0.12, 0.16, 0.22), FLAT('#d8c890'), 0, 1.47, 0);
  k.add(cyl(0.04, 0.045, 0.34, 8), FLAT('#c89a40'), 0, 1.52, 0, 0, { rx: PI / 2 });
  return { r: 0.3, top: 1.6 };
};
// the School's herb bed: a stone kerb, dark soil, two rows of small green plants
const herbBed = (k) => {
  const { w, l } = HERB_BED;
  k.add(BOX(w, 0.26, l), FLAT('#b8b0a2'), 0, 0.13, 0);
  k.add(BOX(w - 0.14, 0.04, l - 0.14), FLAT('#5a3e28'), 0, 0.27, 0);
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) k.add(cyl(0.02, 0.12, 0.2, 5), FLAT(i % 2 ? '#5f9a3a' : '#7ab04a'), sx * 0.2, 0.38, -l / 2 + 0.22 + i * (l - 0.44) / 5);
  return { hw: w / 2, hd: l / 2, top: 0.3 };
};
export function dressStoryLife(game, area) {
  const R = game.regions?.built(area);
  if (!R?.group || R._storyLife) return;
  if (area === 'desert') {
    R._storyLife = dress(game, R, (put) => {
      put(PA.x, PA.z, 0, pile);
      put(PB.x, PB.z, 0, pile);
      put(FI.x, FI.z, 0, fire);
      put(TB.x, TB.z, 0, table1);
      put(BR.x - 0.33, BR.z, 0, (k) => barrel1(k, 0.3, 0.82));
      put(BR.x + 0.33, BR.z - 0.1, 0, (k) => barrel1(k, 0.28, 0.78));
      put(TP.x, TP.z, 0, tripod);
      put(HERB_BED.x, HERB_BED.z, 0, herbBed);
    });
  } else if (area === 'hamalayi') {
    R._storyLife = dress(game, R, (put) => {
      put(MC.fire.x, MC.fire.z, 0.4, fire);
      put(MC.rack.x, MC.rack.z, 0, (k) => dryingRack(k, { w: 2.6, seed: 5 }));
      put(MC.wood.x, MC.wood.z, -PI / 2, (k) => woodpile(k, { w: 1.6, h: 0.9 }));
      put(MC.sledge.x, MC.sledge.z, 0.3, (k) => sledge(k, { seed: 4 }));
      put(MC.crates.x, MC.crates.z, PI / 2, (k) => { crate1(k, 0.6); k.at(0.62, 0, 0.05, 0, () => barrel1(k, 0.28, 0.8)); k.at(0.05, 0.6, 0, 0, () => crate1(k, 0.45, -0.2)); return { hw: 0.75, hd: 0.4, top: 1.05 }; });
    });
  } else R._storyLife = true;
}
