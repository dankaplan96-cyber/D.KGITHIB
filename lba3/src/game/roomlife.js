// INTERIOR-LIFE (the user, 2.11: "In the tavern there are no people"; "characters should move, like Zoé: she just stands
// at home"; "the SPACEPORT is empty, no people"): who lives in Citadel's interiors and at the two spaceports, and the
// household rounds of the story's own people at home.
//
// 1. The rooms' people. Each room built after LBA2's scenes left a spot for its keeper (R.npcSpots); here the keeper
//    stands there and, where the room has seats, a few regulars sit and come and go. They are Residents
//    (src/game/walkers.js) with a manager of their own (game.roomWalkers, `indoor`), so they reuse the street's whole
//    routine: a round of stops, walking over a planned route (walknav.js, the rooms' floors: addFloor) round whoever is in
//    the way, sitting on a chair, a bar stool or a sofa by the street's bench code (a seat's shape: SEAT below), chatting
//    in pairs, carrying a crate or a case, talking when spoken to (story/citizens.js: their lines are text/interiors.js).
//    Every place is the room's own data: the stops are in the room's frame, read from the layout its builder uses (the
//    room's *_PLAN, BIGGER-1), turned into the world by its centre; nothing in the rooms' geometry changes.
//      tavern     Luc (LBA2's keeper, twelve years older) behind the bar, at the taps, serving a table; four harbour
//                 regulars: Hobb at the bar, Sanna at a table and the lone stool, Old Fenn on the sofa, Kip at the
//                 jukebox (Fenn and Kip meet before the sofa and talk), then at a table
//      bazoo      Mr Bazoo (LBA2's) at the till, the back shelves, the Zeelich goods; a customer, Mrs Pell, browsing
//      ticket     Ines at the till and setting out tickets; a traveller, Rollo, waiting on a chair with his case
//      pharmacy   the pharmacist (LBA2's) at the counter, the honey shelf, the jar shelves
//      nbrhouse   Hedda, the neighbour (the kettle of chapter 1), at her stove, her tap, her table, her desk
//      nellhouse  Wim, Nell's apprentice (Nell herself keeps her stall outside: story/life.js), at the workbench
//      baggage    Osk the baggage clerk upstairs: his table, the belt, the crates
//    The tavern's cellar is a store: nobody lives there (Luc's lines mention it).
//    The town's states: before the water (chapter 1, chapter 2 until the valves), with it, and the evacuation
//    (chapter 8), when the rooms empty except for Luc and Mr Bazoo packing (story/interiors.js: place).
// 2. The spaceports' people (outdoors, the same manager: a resident of a place, simulated in full only near the hero).
//    Citadel Spaceport (spaceport.js): chapters 1–3, passenger flights grounded by the project — two stranded travellers
//    on the benches grumbling, the kiosk's clerk, a port guard by the ship's hatch, a mechanic at the pad's far side;
//    from chapter 4 flights run — two passengers on the benches, an Esmer visitor at the board, a family with a case,
//    the clerk, the mechanic. Gone in the evacuation (the project's queue is on the bridge then: story/evacuation.js).
//    Zeelich Spaceport (travel.js builds its deck): an Esmer port agent and two Esmer travellers. Every stop keeps off
//    the painted walkway from the bridge to the ship, the pad's ring and the departures board's reading spot.
// 3. Household rounds (StoryRounds): the story's own people who stand all chapter at home or at work — Zoé and Arthur in
//    the house, Gilbert and Mira in the Water Office (chapter 2) — walk a small round when no scene needs them: Zoé from
//    the sink to the stove, the table, the window, the stairwell and her desk in the bedroom; Arthur from his boat to his
//    workbench and the window of his room; Gilbert from his counter to the pipes and the counter's far end; Mira from her desk to
//    the plant and the north wall. A round
//    runs only while the chapter's place for them is their usual mark (their own pose there, no scene's), the hero is in
//    the house and play is on; a talk, a conversation they are in, a cut-scene or a new place from the chapter wins at
//    once (refreshCast puts them where the chapter says; a placement that is still the mark leaves them on their way:
//    keeps()). Nothing of a round is saved: after a load they start on their mark.
// 4. WC-2, the cast's rounds (castrounds.js): the same machinery for the story's people of chapters 3–10, outdoors (the
//    street's planner, walkers.js) and in their rooms (the workshop, the observatory, the council's dais). A cast round
//    belongs to chapters and states (`ch`, `when`) and to an area; its mark is the person's usual spot (`mark`), its
//    stops are round it. It runs only with the hero in the area and within CAST_NEAR of the mark, in play, with no foe
//    near; talk, scenes and fights hold the person where they stand; the hero gone or the state moved on puts them back
//    on the mark (release), so a scene that needs them finds them there. The household rounds above are unchanged.
//
// Cost: a room's people are simulated only while the hero is in that room (elsewhere they are stepped twice a second
// with no physics and no animation: walkers.js abstract tier); a port's only near the hero and in view; the household
// rounds only while the hero is in the house (a cast round: in its area and near). tests/interior-life.mjs and
// tests/cast-rounds.mjs measure it.
import { Walkers } from './walkers.js';
import { CAST_ROUNDS, CAST_FLOORS } from './castrounds.js';
import { dampAngle, clamp, rng } from '../engine/math.js';
import { TAVERN_PLAN } from './tavern.js';
import { BAZOO_PLAN } from './bazoo.js';
import { TICKET_PLAN } from './ticket.js';
import { PHARMACY_PLAN } from './pharmacy.js';
import { NBRHOUSE_PLAN } from './nbrhouse.js';
import { NELLHOUSE_PLAN } from './nellhouse.js';
import { BAGGAGE_PLAN } from './baggage.js';

const A = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
// the seats a person sits on, as walkers.js BENCH_RED: the seat's top over the floor, its back's front face and its front
// edge along the way the sitter faces (m, from the seat's middle)
export const SEAT = {
  chair: { seatY: 0.53, back: -0.21, front: 0.22 },          // props.js chair (its cushion's top; the back's rails at −0.19)
  barStool: { seatY: 0.82, back: -0.6, front: 0.2 },         // tavern.js stool (no back)
  lowStool: { seatY: 0.72, back: -0.6, front: 0.2 },         // ticket.js stool
  sofa: { seatY: 0.47, back: -0.17, front: 0.35 },           // tavern.js sofa (the back cushion's face)
  portBench: { seatY: 0.49, back: -0.24, front: 0.235 },     // props.js waitingBench
};

// ------------------------------------------------------------------ the rooms
// each room: its walkable floors (its own frame; y the floor's height), and its people. A stop is walkrounds.js's
// { id, x, z, a, act, dur, seat?, pair?/mate?, carry?, stage?, gest?, spot? } in the room's frame.
// BIGGER-1 (the user 2.11, "make them bigger": every room 1.5 times the first cut, the furniture its own size): every
// floor and stop is read from the room's own layout (its *_PLAN, the numbers its builder uses), so a change of the layout
// carries its people along; the keeper's first stop names the room's spot for them (`spot`: R.npcSpots), and is put on
// it as the room is built. Each stop keeps its own distance from the thing it is at (a counter's face, a shelf, a seat).
const S = (id, slot, seat, dur, o = {}) => ({ id, x: slot[0], z: slot[1], a: seat[2], act: 'stand', seat: { x: seat[0], z: seat[1], a: seat[2], spec: seat[3] }, dur, ...o });
const D = (id, x, z, a, act, dur, o = {}) => ({ id, x, z, a, act, dur, ...o });
const L = (id, x, z, tx, tz, act, dur, o = {}) => ({ id, x, z, a: A(x, z, tx, tz), act, dur, ...o });
const NOW = [0, 1];          // (the town's states 0 and 1: everything but the evacuation)
// a seat of the room's: [x, z, the way its sitter faces, its shape], and the place to stand by it (dx, dz from the seat)
const seatOf = (c, spec) => [c.x, c.z, c.a, spec];
const by = (c, dx, dz) => [c.x + dx, c.z + dz];
const hall = (P, y = 0) => ({ x0: -P.W / 2, x1: P.W / 2, z0: -P.D / 2, z1: P.D / 2, y });   // (a room's whole floor)

const TV = TAVERN_PLAN, BA = BAZOO_PLAN, TK = TICKET_PLAN, PH = PHARMACY_PLAN, NB = NBRHOUSE_PLAN, NL = NELLHOUSE_PLAN, BG = BAGGAGE_PLAN;
// the tavern: the tables (TV.tables) with their chairs (TV.chairs: in front, behind, left, right of each)
const tvChair = (t, c) => ({ x: TV.tables[t][0] + TV.chairs[c][0], z: TV.tables[t][1] + TV.chairs[c][1], a: TV.chairs[c][2] });
const tvStool = TV.stools.reduce((b, s) => (Math.abs(s.z - TV.luc.z) < Math.abs(b.z - TV.luc.z) ? s : b));   // (the bar stool across from Luc)
const tvSanna = { x: TV.tables[0][0], z: TV.tables[0][1] }, tvJuke = TV.juke, tvSofa = TV.sofa;
// the shop: before a display table (its middle, d from it into the room), facing it: [x, z, a]
const bzAt = (k, d) => { const [x, z, ry] = BA.tables[k], ux = Math.sin(ry), uz = Math.cos(ry); return [x + ux * d, z + uz * d, Math.atan2(-ux, -uz)]; };
// the baggage claim's crates by the office's right wall: their middle
const bgCrates = { x: BG.crates[0].x, z: (BG.crates[0].z + BG.crates[1].z) / 2 };

export const ROOMS = {
  tavern: {
    floors: [hall(TV)],
    people: [
      { id: 'luc', char: 'lharMan', tint: '#e6e2da', color: '#e8b070', speed: 0.9, start: 0, stays: true, stops: [
        D('luc_bar', TV.luc.x, TV.luc.z, TV.luc.a, 'browse', [14, 22], { spot: 'luc' }),          // (his spot: polishing a glass behind the bar)
        D('luc_tap', TV.luc.x, TV.tap.z, Math.PI / 2, 'reach', [6, 9], { stage: NOW }),            // (the tap barrel on the bar)
        L('luc_serve', tvSanna.x + 1.05, tvSanna.z - 0.9, tvSanna.x, tvSanna.z, 'put', [5, 7], { stage: NOW }),   // (Sanna's table, from its free corner)
        D('luc_shelf', TV.luc.x, TV.luc.z + 0.9, -Math.PI / 2, 'reachHigh', [6, 9], { stage: 2, carry: 'crate' }),   // (the evacuation: the good bottles boxed)
        D('luc_stack', TV.BARX + 1.5, TV.BZ1 - 0.5, 0, 'put', [5, 7], { stage: 2, carry: null }),   // (stacked by the bar's end, off the way in from the door)
      ] },
      { id: 'hobb', char: 'hesk', tint: '#d6e2f0', color: '#a8c8e8', speed: 0.95, start: 0, stops: [
        S('hobb_stool', by(tvStool, 0.65, 0), [tvStool.x, tvStool.z, -Math.PI / 2, SEAT.barStool], [40, 60]),
        S('hobb_table', by(tvChair(1, 2), -0.7, -0.65), seatOf(tvChair(1, 2), SEAT.chair), [25, 35]),   // (the table by the front wall)
      ] },
      { id: 'sanna', char: 'councilB', tint: '#dcefe6', color: '#90d0b0', speed: 1.05, start: 0, stops: [
        S('sanna_table', by(tvChair(0, 2), -0.5, -0.65), seatOf(tvChair(0, 2), SEAT.chair), [30, 45]),
        S('sanna_stool', by(TV.lone, 0.7, -0.2), [TV.lone.x, TV.lone.z, 0, SEAT.barStool], [20, 30]),
      ] },
      { id: 'fenn', char: 'weaver', tint: '#f2e8d6', color: '#d8c0a0', speed: 0.75, start: 0, stops: [
        S('fenn_sofa', by(tvSofa, 0.3, 0.78), [tvSofa.x, tvSofa.z, 0, SEAT.sofa], [40, 60]),
        // (Fenn and Kip meet before the sofa, off the ways from the door to the stair and the cellar's arched door)
        L('fenn_chat', tvSofa.x - 0.6, tvSofa.z + 1.6, tvSofa.x + 0.4, tvSofa.z + 1.6, 'stand', [22, 30], { pair: 'juke', mate: 'kip' }),
      ] },
      { id: 'kip', char: 'archivist', tint: '#fff2de', color: '#f0c070', speed: 1.15, start: 0, stops: [
        D('kip_juke', tvJuke.x, tvJuke.z + 0.85, Math.PI, 'reach', [8, 12]),                      // (choosing a tune at its glowing front)
        L('kip_chat', tvSofa.x + 0.4, tvSofa.z + 1.6, tvSofa.x - 0.6, tvSofa.z + 1.6, 'stand', [22, 30], { pair: 'juke', mate: 'fenn' }),
        S('kip_table', by(tvChair(2, 0), -0.9, -0.25), seatOf(tvChair(2, 0), SEAT.chair), [25, 35]),
      ] },
    ],
  },
  bazoo: {
    floors: [hall(BA)],
    people: [
      { id: 'mrbazoo', char: 'councilC', tint: '#f2eadc', color: '#e0c080', speed: 0.8, start: 0, stays: true, stops: [
        D('baz_till', BA.till.x, BA.till.z, BA.till.a, 'browse', [14, 20], { spot: 'bazoo' }),   // (his spot, at the till)
        D('baz_back', ...bzAt('fruit', 1.0), 'reach', [6, 9], { stage: NOW }),                   // (the fruit and the candle on the back table)
        D('baz_goods', ...bzAt('zeelich', 0.95), 'put', [5, 7], { stage: NOW, gest: ['nod'] }),   // (the Zeelich goods)
        D('baz_pack', ...bzAt('zeelich', 0.95), 'put', [5, 7], { stage: 2, carry: 'crate' }),
        D('baz_crates', ...bzAt('corner', 1.05), 'put', [5, 7], { stage: 2, carry: null }),     // (boxed, by the back corner's table)
      ] },
      { id: 'pell', char: 'lharWoman', tint: '#e6eeff', color: '#a8b8f0', speed: 0.9, start: 0, stops: [
        D('pell_counter', BA.CX - 0.7, BA.front + 0.58, Math.PI, 'browse', [10, 14]),            // (at the counter's front, by the till)
        D('pell_rabbit', ...bzAt('rabbit', 1.0), 'browse', [8, 12], { gest: ['shrug'] }),
        D('pell_corner', ...bzAt('corner', 1.05), 'browse', [6, 9]),
        D('pell_jars', ...bzAt('bowl', 0.95), 'browse', [8, 12]),
      ] },
    ],
  },
  ticket: {
    floors: [hall(TK)],
    people: [
      { id: 'ines', char: 'tarra', tint: '#e6f2ee', color: '#a0d0c8', speed: 0.85, start: 0, stops: [
        // (the staff's side is a narrow lane between the counter and the two stools: she keeps to it)
        D('ines_till', TK.clerk.x, TK.clerk.z, TK.clerk.a, 'browse', [14, 20], { spot: 'clerk' }),   // (her spot, at the till)
        // (a ticket stamped and set out on the counter, beside the till: the lane past the stool toward the pile of tickets
        //  is narrower than the room's planner walks)
        D('ines_tickets', TK.clerk.x - 0.5, TK.clerk.z, 0, 'put', [5, 8], { gest: ['nod'] }),
      ] },
      { id: 'rollo', char: 'desertTrader', tint: '#f2e2d2', color: '#d8b090', speed: 0.85, start: 0, stops: [
        S('rollo_chair', by(TK.frontChairs[1], 0, -0.75), seatOf(TK.frontChairs[1], SEAT.chair), [40, 60], { carry: 'case' }),
        D('rollo_ask', TK.till.x + 0.5, TK.CZ + TK.CHD + 0.43, Math.PI, 'browse', [6, 9]),          // (across the counter from Ines)
        D('rollo_board', TK.LX + 1.3, TK.board.z - 0.3, -Math.PI / 2, 'stand', [6, 9], { gest: ['sigh'] }),   // (the timetable by the door)
      ] },
    ],
  },
  pharmacy: {
    floors: [hall(PH)],
    people: [
      { id: 'pharmacist', char: 'ilka', tint: '#e6f6f2', color: '#a0e0d0', speed: 0.75, start: 0, stops: [
        D('ph_counter', PH.spot.x, PH.spot.z, PH.spot.a, 'browse', [14, 20], { spot: 'pharmacist' }),   // (the spot: mixing at the counter)
        D('ph_honey', PH.honeyShelves[0], PH.backZ + 0.6, Math.PI, 'reachHigh', [6, 9]),        // (the Mosquibees' honey jars)
        D('ph_jars', PH.wallX + 0.7, PH.wallShelves[1], -Math.PI / 2, 'reach', [6, 9], { gest: ['nod'] }),   // (the left wall's jars)
      ] },
    ],
  },
  nbrhouse: {
    floors: [hall(NB)],
    people: [
      { id: 'hedda', char: 'farmerB', tint: '#fff2e4', color: '#f0b8a0', speed: 0.9, start: 0, stops: [
        D('hedda_stove', NB.spot.x, NB.spot.z, NB.spot.a, 'browse', [12, 18], { spot: 'neighbour' }),   // (the spot, at the stove with the kettle)
        D('hedda_tap', NB.basin.x - 0.6, NB.basin.z, Math.PI / 2, 'touchWater', [5, 8], { gest: ['shrug'] }),
        S('hedda_table', by(NB.chairs[0], -0.15, 0.9), seatOf(NB.chairs[0], SEAT.chair), [16, 24]),
        S('hedda_desk', by(NB.deskChair, -0.9, 0.25), seatOf(NB.deskChair, SEAT.chair), [14, 20]),
      ] },
    ],
  },
  nellhouse: {
    floors: [hall(NL)],
    people: [
      { id: 'wim', char: 'farmerA', tint: '#e6f0de', color: '#b8d890', speed: 1.0, start: 0, stops: [
        // (the spot is Nell's, before her workbench: Wim works there facing the bench)
        L('wim_bench', NL.spot.x, NL.spot.z, NL.bench.x, NL.bench.z, 'browse', [16, 24], { spot: 'nell' }),   // (the Esmer engine on the bench)
        L('wim_parts', NL.parts.x - 0.1, NL.parts.z - 0.75, NL.parts.x, NL.parts.z, 'put', [5, 7], { carry: 'crate' }),   // (the crate of spare parts)
        S('wim_table', by(NL.chairs[0], -0.1, 0.9), seatOf(NL.chairs[0], SEAT.chair), [14, 20], { carry: null }),
      ] },
    ],
  },
  baggage: {
    // (the upper level, BG.UY up, from the back wall to its edge; the front hall below it)
    floors: [{ ...hall(BG, BG.UY), z1: BG.UZ1 - 0.05 }, { ...hall(BG), z0: BG.UZ1 + 0.05 }],
    people: [
      { id: 'osk', char: 'dallan', tint: '#f0eee0', color: '#c8c090', speed: 0.9, start: 0, stops: [
        D('osk_table', BG.spot.x, BG.spot.z, BG.spot.a, 'browse', [14, 20], { spot: 'clerk' }),   // (the spot: papers at the office table)
        D('osk_belt', BG.belt.x + 0.2, BG.belt.z + BG.belt.hd + 0.6, Math.PI, 'reach', [6, 9], { carry: 'crate' }),   // (a parcel off the belt)
        D('osk_crates', bgCrates.x - 0.8, bgCrates.z, Math.PI / 2, 'put', [5, 7], { carry: null }),
      ] },
    ],
  },
};

// ------------------------------------------------------------------ the spaceports (outdoors)
// Citadel's: world coordinates (spaceport.js: the deck x −14…14, z 26…54; the walkway z 38.25…41.75 from the bridge to
// the pad; the pad at (4.5, 41), its ring 5 m; the board at (−11.2, 36.2), read from (−10.6, 36.2); the benches at z 33.05
// facing the pad; the kiosk at (−10.4, 45.5), its hatch to the walkway). `when`: 'grounded' (chapters 1–3, before
// passenger flights run) or 'flying' (from chapter 4).
const CB = [-11.2, -7.4], CBZ = 33.05;   // (the two benches' middles: spaceport.js; BENCHES-1, 0.3 m further apart, clear of the tub between them)
const SB = (id, bx, side, dur, o = {}) => S(id, [bx + side * 0.45, CBZ + 0.95], [bx + side * 0.45, CBZ, 0, SEAT.portBench], dur, o);
const CITADEL_PORT = [
  { id: 'ama', char: 'councilB', tint: '#e4ecff', color: '#a0b8f0', speed: 0.85, start: 0, stops: [
    D('ama_kiosk', -8.75, 44.9, Math.PI, 'stand', [16, 24]),
    L('ama_leaflets', -7.0, 43.2, -7.7, 44.1, 'browse', [6, 9]),
    S('ama_break', [-9.6, 51.65], [-9.6, 52.6, Math.PI, SEAT.portBench], [14, 20]),
  ] },
  { id: 'gurt', char: 'hesk', tint: '#dfe6fb', color: '#e0a060', speed: 0.9, start: 1, stops: [
    L('gurt_crates', 9.0, 30.4, 10.45, 28.75, 'put', [5, 8], { carry: 'crate' }),
    L('gurt_trolley', 9.6, 35.4, 10.4, 34.4, 'put', [5, 7], { carry: null }),
    L('gurt_cargo', 11.0, 46.3, 12.6, 45.6, 'browse', [10, 14]),
    L('gurt_ship', 9.6, 37.0, 4.5, 41, 'reach', [6, 9]),
  ] },
  { id: 'bern', char: 'archivist', tint: '#d4dcee', color: '#90a8d0', speed: 0.85, start: 0, when: 'grounded', stops: [
    L('bern_hatch', -1.0, 45.6, 4.5, 41, 'stand', [20, 30]),
    L('bern_round', -3.0, 35.8, 4.5, 41, 'stand', [12, 18]),
  ] },
  { id: 'lomba', char: 'weaver', tint: '#fff0e6', color: '#e8b0c0', speed: 0.8, start: 0, when: 'grounded', stops: [
    SB('lomba_bench', CB[0], -1, [30, 45], { carry: 'case' }),
    L('lomba_grumble', -7.6, 35.8, -6.6, 35.8, 'stand', [20, 28], { pair: 'grounded', mate: 'dov' }),
    L('lomba_kiosk', -9.0, 43.6, -10.4, 45.5, 'stand', [8, 12], { gest: ['shrug', 'sigh'] }),
  ] },
  { id: 'dov', char: 'lharMan', tint: '#e6f6e6', color: '#b0d8a0', speed: 0.95, start: 0, when: 'grounded', stops: [
    SB('dov_bench', CB[1], 1, [30, 45]),
    L('dov_grumble', -6.6, 35.8, -7.6, 35.8, 'stand', [20, 28], { pair: 'grounded', mate: 'lomba' }),
    L('dov_guard', -1.8, 44.0, -1.0, 45.6, 'stand', [6, 9], { gest: ['shrug'] }),
  ] },
  { id: 'ressa', char: 'tarra', tint: '#f0e8ff', color: '#c8a8e8', speed: 0.7, start: 0, when: 'flying', stops: [
    SB('ressa_bench', CB[0], -1, [40, 60]),
    S('ressa_red', [-9.15, 51.65], [-9.15, 52.6, Math.PI, SEAT.portBench], [30, 45]),
  ] },
  { id: 'ollo', char: 'lharMan', tint: '#f4ecdc', color: '#d8c090', speed: 1.0, start: 0, when: 'flying', stops: [
    SB('ollo_bench', CB[1], 1, [30, 45]),
    L('ollo_kiosk', -9.0, 43.6, -10.4, 45.5, 'browse', [6, 9]),
    L('ollo_board', -9.8, 35.0, -11.2, 36.2, 'stand', [6, 9]),
  ] },
  { id: 'esren', char: 'keeper', tint: '#fff6ee', color: '#e8a8d0', speed: 0.8, start: 0, when: 'flying', stops: [
    L('esren_board', -9.8, 35.0, -11.2, 36.2, 'stand', [12, 18]),
    L('esren_ship', -6.8, 36.0, 4.5, 41, 'stand', [8, 12]),
    L('esren_kiosk', -11.6, 43.0, 4.5, 41, 'stand', [8, 12]),
  ] },
  { id: 'gunda', char: 'councilC', tint: '#e6eee4', color: '#b8c890', speed: 0.8, start: 0, when: 'flying', stops: [
    SB('gunda_bench', CB[1], -1, [30, 45], { carry: 'case' }),
    L('gunda_kid', -4.0, 36.0, -3.0, 36.4, 'stand', [16, 24], { pair: 'family', mate: 'bibi' }),
  ] },
  { id: 'bibi', char: 'pim', tint: '#dfe9ff', color: '#a8c0ff', speed: 1.3, start: 0, when: 'flying', stops: [
    L('bibi_wait', -6.4, 34.6, -7.7, 33.05, 'stand', [14, 20]),
    L('bibi_parent', -3.0, 36.4, -4.0, 36.0, 'stand', [16, 24], { pair: 'family', mate: 'gunda' }),
  ] },
];
// Zeelich's: in the frame of travel.js ZPORT (the island's origin; the deck x −14…6, z 33…51 at 6 m; the bridge comes in
// at x −4 from z 26; the landing (−4, 36.8); the pad (−4, 44), its ring 5.8 m; the board at (−0.6, 35.2), read from its
// south-east). Esmers do not sit (walkers.js canSit): they stand.
const ZEELICH_PORT = [
  { id: 'velo', char: 'councilChair', tint: '#f2ecff', color: '#c0a8f0', speed: 0.8, start: 0, stops: [
    D('velo_post', 3.5, 38.0, -Math.PI / 2, 'stand', [14, 20]),
    L('velo_cargo', 3.5, 47.5, -4, 44, 'browse', [10, 14]),
  ] },
  { id: 'ennu', char: 'oku', tint: '#eef8ff', color: '#a8d8f0', speed: 0.75, start: 0, stops: [
    D('ennu_wait', -11.5, 40.0, Math.PI / 2, 'stand', [20, 30], { carry: 'case', gest: ['sigh'] }),
    L('ennu_ship', -11.5, 47.0, -4, 44, 'stand', [14, 20]),
    L('ennu_board', -8.0, 34.5, -0.6, 35.2, 'stand', [8, 12]),
  ] },
  { id: 'oshra', char: 'xil', tint: '#fff0f6', color: '#e0a8c8', speed: 0.85, start: 1, stops: [
    D('oshra_rail', -12.5, 44.0, Math.PI / 2, 'stand', [20, 30]),
    D('oshra_clouds', 1.5, 49.5, 0, 'stand', [14, 20], { gest: ['sigh'] }),
    D('oshra_bridge', -12.8, 37.0, Math.PI / 2, 'stand', [10, 14]),
  ] },
];
export const PORT_IDS = { citadel: CITADEL_PORT.map((p) => p.id), zeelich: ZEELICH_PORT.map((p) => p.id) };
export const ROOM_IDS = Object.fromEntries(Object.entries(ROOMS).map(([r, R]) => [r, R.people.map((p) => p.id)]));

// ------------------------------------------------------------------ the manager and the cast list
export function roomWalkers(game) { return (game.roomWalkers ||= new Walkers(game, { indoor: true })); }
// a place's floors and doorways, once (the planner keeps out of doorways: an exit's trigger and a little more)
function register(game, key, floors, exits) {
  const W = roomWalkers(game), done = (W._places ||= new Set());
  if (done.has(key)) return;
  done.add(key);
  for (const f of floors) W.nav.addFloor(f);
  for (const e of exits || []) W.doors.push({ x: e.x, z: e.z, r: e.r || 0.75 });   // (the trigger's own reach: a room's ways pass close to its door)
  W.nav.cells.clear(); W.nav.cache.clear();
}
// (a stop that names the room's spot for its person, `spot`, stands on R.npcSpots[spot] as the room is built)
const toWorld = (s, ox, oz, spots) => {
  const m = s.spot && spots?.[s.spot];
  const o = { ...s, x: m ? m.x : s.x + ox, z: m ? m.z : s.z + oz };
  if (s.seat) o.seat = { ...s.seat, x: s.seat.x + ox, z: s.seat.z + oz };
  return o;
};
// every person's definition for the cast (story/interiors.js npcDefs). A place not built yet: hidden (pending), with no
// round; src/main.js addActors gives the round when it is built (nothing is built here: regions.built never builds).
export function placeDefs(game) {
  const out = [], G = game.regions;
  const add = (p, place, round, extra = {}) => {
    const s0 = round ? round[p.start % round.length] : null;
    out.push({ id: p.id, name: 'n_' + p.id, char: p.char, tint: p.tint, speed: p.speed, color: p.color, ambient: true, indoor: true, room: place,
      stays: !!p.stays, when: p.when || null, start: p.start || 0, ...(round ? { x: s0.x, z: s0.z, angle: s0.a ?? 0, round } : { x: 0, z: 0, angle: 0, pending: true }), ...extra });
  };
  for (const [rid, R] of Object.entries(ROOMS)) {
    const room = G?.built(rid);
    if (room) {
      const c = room.center;
      register(game, rid, R.floors.map((f) => ({ x0: f.x0 + c.x, x1: f.x1 + c.x, z0: f.z0 + c.z, z1: f.z1 + c.z, y: f.y })), room.exits);
    }
    for (const p of R.people) add(p, rid, room ? p.stops.map((s) => toWorld(s, room.center.x, room.center.z, room.npcSpots)) : null);
  }
  const sp = game.world?.spaceport;
  if (sp) {
    const d = sp.deck, b = sp.bridge;
    register(game, 'port_citadel', [{ x0: d.x0, x1: d.x1, z0: d.z0, z1: d.z1, y: d.y }, { x0: b.x0, x1: b.x1, z0: b.z - b.hw, z1: b.z + b.hw, y: d.y }], []);
  }
  for (const p of CITADEL_PORT) add(p, 'port_citadel', sp ? p.stops.map((s) => ({ ...s, seat: s.seat ? { ...s.seat } : undefined })) : null, { outdoor: true });
  const Z = G?.built('zeelich'), zs = Z?.spaceport;
  if (zs) {
    const d = zs.deck;
    register(game, 'port_zeelich', [{ x0: d.x0, x1: d.x1, z0: d.z0, z1: d.z1, y: d.y }], []);
  }
  const zo = Z?.group?.position;
  for (const p of ZEELICH_PORT) add(p, 'port_zeelich', zs && zo ? p.stops.map((s) => toWorld(s, zo.x, zo.z)) : null, { outdoor: true });
  return out;
}

// ------------------------------------------------------------------ household rounds (the story's own people)
// A round: its person, the room, the chapter's mark it belongs to (the person's usual place: house npcSpots) and the
// poses that count as being on it, and its stops (the room's frame). The mark is the round's first stop.
export const HOUSE_ROUNDS = [
  { id: 'zoe', room: 'house', speed: 1.0, markAnims: [null, 'idle'], stops: [
    { id: 'sink', mark: true, act: 'touchWater', dur: [6, 9], gest: ['nod'] },                    // (her mark, at the sink)
    { id: 'stove', x: -3.2, z: -2.2, a: Math.PI, act: 'tinker', dur: [7, 10], gest: ['nod'] },  // (stirring at the range)
    { id: 'table', x: -1.45, z: 1.45, a: A(-1.45, 1.45, -0.45, 0.55), act: 'setDown', dur: [4, 6], gest: ['shrug'] },
    { id: 'window', x: 2.8, z: -2.7, a: Math.PI, act: 'stand', dur: [5, 8], gest: ['sigh'] },     // (the village window)
    { id: 'stairs', x: -3.45, z: 6.8, a: 0, act: 'stand', dur: [4, 6], gest: ['shrug'] },         // (the stairwell's head: a word down to the cellar)
    { id: 'desk', x: -12.1, z: -1.55, a: A(-12.1, -1.55, -13.18, -2.45), act: 'tinker', dur: [8, 12], gest: ['nod'] },   // (her register)
  ] },
  { id: 'arthur', room: 'house', speed: 1.15, markAnims: [null, 'idle', 'kneelWork'], stops: [
    { id: 'boat', mark: true, act: 'kneelWork', dur: [18, 26] },
    { id: 'bench', x: -11.55, z: 7.4, a: -Math.PI / 2, act: 'tinker', dur: [12, 18], gest: ['nod'] },   // (his workbench, the paddle boat)
    { id: 'window', x: -12.4, z: 9.3, a: -Math.PI / 2, act: 'stand', dur: [5, 8], gest: ['shrug'] },    // (his room's harbour window)
  ] },
  // the Water Office (chapter 2 until the water is back, Gilbert; all chapter 2, Mira: story/chapter1.js place)
  { id: 'gilbert', room: 'office', speed: 0.85, markAnims: [null, 'idle'], stops: [
    { id: 'counter', mark: true, act: 'browse', dur: [12, 18] },
    // (every stop keeps 2 m and more from the pipe map's reading place, LX + 1.05 by the left wall, and out of the lane
    //  from the door)
    { id: 'pipes', x: 0.3, z: -2.3, a: Math.PI, act: 'stand', dur: [5, 8], gest: ['shrug'] },
    { id: 'counterEnd', x: 1.5, z: 2.75, a: Math.PI, act: 'browse', dur: [6, 9] },   // (the counter's far end: the ledgers)
  ] },
  { id: 'mira', room: 'office', speed: 0.9, markAnims: [null, 'idle'], stops: [
    { id: 'desk', mark: true, act: 'browse', dur: [14, 20] },
    { id: 'plant', x: 2.6, z: 2.4, a: A(2.6, 2.4, 3.6, 2.8), act: 'potting', dur: [6, 9] },
    { id: 'board', x: -1.0, z: -2.3, a: Math.PI, act: 'stand', dur: [5, 8], gest: ['nod'] },
  ] },
];
// the rooms' floors the rounds walk (the room's frame)
export const ROUND_FLOORS = { house: { x0: -13.5, x1: 4.5, z0: -3.5, z1: 11.5, y: 0 }, office: { x0: -4, x1: 4, z0: -3.5, z1: 3.5, y: 0 } };

const FREE = 0.3;   // m: a placement within this of the mark is the mark
// WC-2 (cast rounds, castrounds.js)
const SAME = 0.05;       // m: the chapter's place is still the mark the round started from
const CAST_NEAR = 40;    // m: outdoors a round runs only with the hero this near its mark (farther: back on the mark, unseen)
const FIGHT_R = 25;      // m: no round with a foe this near that is after someone (not on its calm patrol)
const PATROL_R = 12;     // m: nor with any foe this near (a watch, a patrol: the sneaks)
const CALM = new Set(['patrol', 'idle', 'guard', 'home', 'return', 'dead', 'dormant']);   // (enemies.js states with no one chased)
const DOOR_CLEAR = 1.0;  // m: a stop keeps this clear of a door's trigger (its reach and this)
const samePlace = (p, m) => !!p && !!m && Math.hypot(p.x - m.x, p.z - m.z) < SAME;
// a cast round's stops in the world: the mark (the chapter's place: its pose, its angle) and the others round it (dx, dz
// from the mark; facing `a`, or the point `face` [dx, dz] from the mark, or the mark's way). A stop that is no way for
// the planner moves to the nearest that is (within 0.75 m) or is left out; one in a door's reach is left out.
export function castStops(g, D, m, nav) {
  const doors = [...(g.story?.doors?.() || []), ...(g.room?.exits || [])].filter((d) => Math.abs(d.x - m.x) < 15 && Math.abs(d.z - m.z) < 15);
  const out = [];
  for (const s of D.stops) {
    if (s.mark) { out.push({ ...s, x: m.x, z: m.z, a: m.a ?? 0, act: m.anim || s.act || 'stand' }); continue; }
    let x = m.x + s.dx, z = m.z + s.dz;
    if (!nav.walkable(x, z)) { const c = nav.nearest(x, z, 0.75); if (!c) continue; x = c.x; z = c.z; }
    if (doors.some((d) => Math.hypot(d.x - x, d.z - z) < (d.r || 0.9) + DOOR_CLEAR)) continue;
    const a = s.a ?? (s.face ? Math.atan2(m.x + s.face[0] - x, m.z + s.face[1] - z) : (m.a ?? 0));
    out.push({ ...s, x, z, a });
  }
  return out;
}
export class StoryRounds {
  constructor(game) {
    this.game = game;
    this.st = new Map();   // id → state
    this.stats = { frames: 0, ms: 0 };
    // WC-2: every round of a person: the cast rounds of the later chapters first (castrounds.js), then the household one
    this.byId = new Map();
    for (const D of [...CAST_ROUNDS, ...HOUSE_ROUNDS]) { if (!this.byId.has(D.id)) this.byId.set(D.id, []); this.byId.get(D.id).push(D); }
  }
  def(id) { return HOUSE_ROUNDS.find((r) => r.id === id) || null; }
  // the round this person walks now: a cast round of the chapter in progress, in the area or room the hero is in, whose
  // state holds (castrounds.js `ch`, `room`, `when`), else their household round, else none
  defFor(n) {
    const L = this.byId.get(n.def.id);
    if (!L) return null;
    const g = this.game, key = g.story?.cur?.key, room = g.room?.id ?? 'citadel';
    for (const D of L) {
      if (!D.ch) return D;
      if (D.room === room && D.ch.includes(key) && (!D.when || D.when(g.flags, g))) return D;
    }
    return null;
  }
  // the round's mark (world) for the room as built, or null
  mark(D, R) { const s = R?.npcSpots?.[D.id]; return s ? { x: s.x, z: s.z, a: s.a } : null; }
  // refreshCast: does a placement leave this person on their round (the mark, in the mark's own pose)? Then they are not
  // put back on it (they carry on where they are); otherwise the placement wins. (A cast round's mark is the place the
  // chapter gave when the round started: the same place again leaves them on their way.)
  keeps(n, p) {
    const S = this.st.get(n.def.id);
    if (S?.def?.ch) return !!(S.active && p && n.present && samePlace(p, S.mark));
    const D = this.def(n.def.id);
    if (!D || !S?.active || !p || !n.present) return false;
    return this.onMark(D, p);
  }
  onMark(D, p) {
    const R = this.game.regions?.built(D.room), m = this.mark(D, R);
    return !!m && Math.hypot(p.x - m.x, p.z - m.z) < FREE && D.markAnims.includes(p.anim ?? null);
  }
  // the stops in the world (the mark's from the chapter's own place)
  stops(D, R) {
    const c = R.center, m = this.mark(D, R);
    return D.stops.map((s) => (s.mark ? { ...s, x: m.x, z: m.z, a: m.a } : { ...s, x: s.x + c.x, z: s.z + c.z }));
  }
  update(dt) {
    const g = this.game;
    // (each person's update is wrapped once; the cast is looked over again twice a second, for anyone added since)
    if ((this.scanT = (this.scanT ?? 0) - dt) > 0 && g.npcs?.length === this.scanN) return;
    this.scanT = 0.5; this.scanN = g.npcs?.length;
    for (const id of this.byId.keys()) {
      const n = g.npcs?.find((x) => x.def.id === id);
      if (!n) continue;
      if (n._round !== this) { const base = n.update; n._round = this; n.update = (d) => { if (!this.drive(n, d)) base.call(n, d); }; }
    }
  }
  // may the round run now? (the chapter's place for them is their mark; the hero is in their room; play is on)
  allowed(n, D) {
    const g = this.game, p = n.placed;
    if (!n.present || n.controlled || !p || g.state !== 'play' || g.cutscene || g.trans || g.reveal?.on) return false;
    // (a track someone gave them since: a scene, or a test walking them, drives them; the round waits)
    if (n.track && n.track.cmds[n.track.pc]) return false;
    if (g.room?.id !== D.room || g.hero?.body === D.id) return false;
    return this.onMark(D, p);
  }
  // WC-2: why a cast round may not run this frame: null (it may), 'pause' (they stand where they are: a talk, a
  // conversation, a scene, a fight near) or 'away' (the hero is not about: they go back to their mark, unseen)
  castBlock(n, D) {
    const g = this.game, p = n.placed, h = g.hero;
    if (!n.present || !p) return 'away';
    if (D.room === 'citadel' ? !!g.room : g.room?.id !== D.room) return 'away';
    // (the chapter's place for them is their usual mark — castrounds.js `mark`, read from the chapter's own spots — not a
    //  scene's: a round never starts round a place a scene gave)
    const mk = D.mark(g);
    if (!mk || Math.hypot(p.x - mk.x, p.z - mk.z) > FREE) return 'away';
    if (!D.indoor && Math.hypot(h.pos.x - p.x, h.pos.z - p.z) > (D.near || CAST_NEAR)) return 'away';
    if (n.controlled || g.state !== 'play' || g.cutscene || g.trans || g.reveal?.on || h.body === D.id || n.talking || n.listenTo) return 'pause';
    // (no round in a fight or near a watch: a foe up and about within FIGHT_R of them that is after someone, or one on
    //  its patrol within PATROL_R)
    for (const e of g.enemies || []) {
      if (!e.present || e.alive === false) continue;
      const d = Math.hypot(e.pos.x - n.pos.x, e.pos.z - n.pos.z);
      if (d < PATROL_R || (d < FIGHT_R && !CALM.has(e.state))) { this.blockedBy = e.def?.id || e.id || '?'; return 'pause'; }
    }
    return null;
  }
  // a cast round ends (the hero has gone, the chapter's state moved on): back on the mark the chapter gave, if that is
  // still their place (a new place is given by refreshCast itself)
  release(n, S) {
    S.active = false;
    // (a person the chapter drives itself — a farmer marching off — is the chapter's: left where it takes them from)
    if (!S.def?.ch || !S.mark || n.controlled || !n.placed || !samePlace(n.placed, S.mark)) return;
    if (Math.hypot(n.pos.x - S.mark.x, n.pos.z - S.mark.z) > SAME || n.forceAnim !== (n.placed.anim ?? null)) {
      n.placeAt(n.placed); n.gait = 0;
      S.log.push(`${this.game.time.toFixed(1)} back on the mark`); if (S.log.length > 30) S.log.shift();
    }
  }
  // one frame of the person: true when the round moved and drew them (else their own NPC update runs)
  drive(n, dt) {
    const g = this.game, D = this.defFor(n);
    let S = this.st.get(n.def.id);
    if (S && S.def && S.def !== D) { this.release(n, S); this.st.delete(n.def.id); S = null; }   // (another round, or none, from now)
    if (!D) return false;
    if (D.ch) return this.driveCast(n, dt, D, S);
    if (!this.allowed(n, D)) { if (S) S.active = false; return false; }
    if (n.talking || n.listenTo) return false;   // (a talk or a conversation: he turns to them and stops: NPC.update)
    const t0 = this.measure ? performance.now() : 0;
    const R = g.regions.built(D.room);
    if (!S || !S.active) {
      // starting (or starting again): from the stop it stands nearest, at the stop
      const stops = this.stops(D, R);
      const W = roomWalkers(g), F = ROUND_FLOORS[D.room]; register(g, D.room, [{ x0: F.x0 + R.center.x, x1: F.x1 + R.center.x, z0: F.z0 + R.center.z, z1: F.z1 + R.center.z, y: F.y }], R.exits);
      let ri = 0, bd = 1e9; stops.forEach((s, i) => { const d = Math.hypot(s.x - n.pos.x, s.z - n.pos.z); if (d < bd) { bd = d; ri = i; } });
      S = { def: D, active: true, rnd: S?.rnd || rng([...D.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)), stops, ri, st: bd < 0.8 ? 'dwell' : 'walk', tmr: 0, path: null, wi: 0, vel: 0, gait: 0, gestT: 2, stuckT: 0, replans: 0, visits: (S?.visits || 0), log: S?.log || [], nav: W.nav };
      if (S.st === 'dwell') this.arrive(n, S, true); else this.plan(n, S);
      this.st.set(D.id, S);
    }
    if (S.st === 'dwell') this.dwell(n, S, dt);
    else this.walk(n, S, dt, D);
    n.rig.update(dt, S.st === 'walk' && S.gait > 0.12 ? S.gait : 0);
    n.sync();
    if (this.measure) { this.stats.ms += performance.now() - t0; this.stats.frames++; }
    return true;
  }
  // WC-2: a cast round (castrounds.js). Its mark is the place the chapter gives them now (n.placed); its stops are round
  // that mark, on the street's planner outdoors or the room's indoors; a stop that is no way for the planner, or too near
  // a door, is left out (castStops). Talk, scenes and fights hold them where they are; the hero gone (out of the area,
  // or CAST_NEAR off), or the chapter's state moved on, puts them back on the mark.
  driveCast(n, dt, D, S) {
    const g = this.game, why = this.castBlock(n, D);
    if (S && S.mark && (!n.placed || !samePlace(n.placed, S.mark))) { S.active = false; S.none = false; S.mark = null; }   // (placed elsewhere by refreshCast)
    if (why === 'away') { if (S) this.release(n, S); return false; }
    if (why) { if (S) S.active = false; return false; }
    if (!S || !S.active) {
      const m = n.placed;
      if (S?.none && S.mark && samePlace(m, S.mark)) return false;   // (no round fits round this mark: they stand)
      const t0 = this.measure ? performance.now() : 0;
      const nav = this.castNav(D), stops = castStops(g, D, m, nav);
      const rnd = S?.rnd || rng([...D.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)), log = S?.log || [];
      if (stops.length < 2) {
        log.push(`${g.time.toFixed(1)} no round here (${stops.length} stop)`);
        this.st.set(D.id, { def: D, active: false, none: true, mark: { x: m.x, z: m.z }, rnd, visits: S?.visits || 0, log });
        return false;
      }
      let ri = 0, bd = 1e9; stops.forEach((s, i) => { const d = Math.hypot(s.x - n.pos.x, s.z - n.pos.z); if (d < bd) { bd = d; ri = i; } });
      S = { def: D, mark: { x: m.x, z: m.z }, active: true, rnd, stops, ri, st: bd < 0.8 ? 'dwell' : 'walk', tmr: 0, path: null, wi: 0, vel: 0, gait: 0, gestT: 2, stuckT: 0, replans: 0, visits: S?.visits || 0, log, nav };
      if (S.st === 'dwell') this.arrive(n, S, true); else this.plan(n, S);
      this.st.set(D.id, S);
      if (this.measure) this.stats.ms += performance.now() - t0;
    }
    const t0 = this.measure ? performance.now() : 0;
    if (S.st === 'dwell') this.dwell(n, S, dt);
    else this.walk(n, S, dt, D);
    n.rig.update(dt, S.st === 'walk' && S.gait > 0.12 ? S.gait : 0);
    n.sync();
    if (this.measure) { this.stats.ms += performance.now() - t0; this.stats.frames++; this.stats.cast = (this.stats.cast || 0) + 1; }
    return true;
  }
  // the planner a cast round walks with: a room's (the interiors' manager, the floors castrounds.js gives the room) or the
  // street's (outdoors: walkers.js, with Zeelich's floor level as its residents have it)
  castNav(D) {
    const g = this.game;
    if (D.indoor) {
      const R = g.regions.built(D.room), F = CAST_FLOORS[D.room] || [];
      register(g, D.room, F.map((f) => ({ x0: f.x0 + R.center.x, x1: f.x1 + R.center.x, z0: f.z0 + R.center.z, z1: f.z1 + R.center.z, y: f.y })), R.exits);
      return roomWalkers(g).nav;
    }
    const W = (g.walkers ||= new Walkers(g)), nav = W.nav;
    if (D.room === 'zeelich') { const ox = g.regions.built('zeelich')?.group?.position.x ?? 2400; nav.addLevel(ox - 62, ox + 66, 6.0); }
    return nav;
  }
  arrive(n, S, first = false) {
    const s = S.stops[S.ri], d = s.dur;
    S.st = 'dwell'; S.path = null; S.vel = 0; S.stuckT = 0; S.replans = 0;
    S.tmr = d[0] + (d[1] - d[0]) * S.rnd() * (first ? 0.6 : 1);
    S.gestT = 1 + S.rnd() * 2;
    n.targetAngle = s.a; n.forceAnim = s.act === 'stand' ? null : s.act;
    S.visits++; S.log.push(`${this.game.time.toFixed(1)} at ${s.id}`); if (S.log.length > 30) S.log.shift();
  }
  plan(n, S) {
    const s = S.stops[S.ri], j = S.nav.planSync(n.pos, s, { key: `${n.def.id}:${S.ri}:${Math.round(n.pos.x * 2)},${Math.round(n.pos.z * 2)}` });
    S.st = 'walk'; S.wi = 0; S.stuckT = 0;
    S.path = j.ok && j.pts?.length ? j.pts : [{ x: s.x, z: s.z }];
    if (S.path.length > 1 && Math.hypot(S.path[0].x - n.pos.x, S.path[0].z - n.pos.z) < 0.4) S.wi = 1;
    n.forceAnim = null;
  }
  dwell(n, S, dt) {
    const g = this.game, s = S.stops[S.ri], h = g.hero;
    // standing about (not busy with her hands), she turns to Twinsen when he comes close, as the story's people do
    const near = Math.hypot(h.pos.x - n.pos.x, h.pos.z - n.pos.z) < 2.6 && s.act === 'stand';
    n.angle = dampAngle(n.angle, near ? n.angleTo(h) : s.a, 4, dt);
    if (s.gest && (S.gestT -= dt) <= 0) { n.rig.doGesture(s.gest[Math.floor(S.rnd() * s.gest.length)]); S.gestT = 4 + S.rnd() * 4; }
    n.rig.play(s.act === 'stand' ? 'idle' : s.act);
    n.placeRig();
    if ((S.tmr -= dt) <= 0) { S.ri = (S.ri + 1) % S.stops.length; this.plan(n, S); }
  }
  // along the route at a walk, round whoever is in the way (the hero, the people near): the walkers' right-hand step
  // aside, slowing and waiting when someone stands in the way; moved by the physics (never through a wall or furniture)
  walk(n, S, dt, D) {
    const g = this.game, P = g.physics, s = S.stops[S.ri], path = S.path;
    while (S.wi < path.length - 1 && Math.hypot(path[S.wi].x - n.pos.x, path[S.wi].z - n.pos.z) < 0.35) S.wi++;
    const last = S.wi >= path.length - 1, tx = last ? s.x : path[S.wi].x, tz = last ? s.z : path[S.wi].z;
    const gx = tx - n.pos.x, gz = tz - n.pos.z, d = Math.hypot(gx, gz);
    // (there; or held a step short of it by the furniture it stands at — a stove's front, a counter: that is the stop)
    if (last && (d < 0.12 || (d < 0.6 && S.stuckT > 0.6))) { if (d < 0.04) { n.pos.x = s.x; n.pos.z = s.z; } this.arrive(n, S); n.rig.play(s.act === 'stand' ? 'idle' : s.act); return; }
    let ux = gx / (d || 1), uz = gz / (d || 1), slow = 1;
    // (two on their rounds who meet head on in a narrow way would each wait for the other: after a moment the one whose
    //  name comes first in the alphabet goes on past, the other keeps waiting; for the hero it waits, and in the end takes
    //  the stop where it stands, below)
    const passing = (S.blockT || 0) > 1.0;
    const others = [g.hero, ...g.npcs.filter((o) => o !== n && o.present && !o.away && Math.abs(o.pos.x - n.pos.x) < 3 && Math.abs(o.pos.z - n.pos.z) < 3 && !(passing && this.st.get(o.def.id)?.active && n.def.id < o.def.id))];
    let ax = 0, az = 0;
    for (const b of others) {
      const rx = n.pos.x - b.pos.x, rz = n.pos.z - b.pos.z, dd = Math.hypot(rx, rz), rr = (n.bodyR || 0.45) + (b.bodyR ?? b.radius ?? 0.45) + 0.25;
      if (dd > rr + 1.0 || dd < 1e-3) continue;
      const ahead = (-rx * ux - rz * uz) / dd;
      if (ahead > 0.3) {
        const w = (rr + 1.0 - dd) / (rr + 1.0);
        ax += -uz * w * 1.2; az += ux * w * 1.2;
        if (ahead > 0.6) slow = Math.min(slow, clamp((dd - rr) / 0.8, 0, 1));
      }
    }
    // (the step aside is taken only where the way to the side is clear: a room's ways are narrow)
    if (ax || az) { const vx = ux + ax, vz = uz + az, l = Math.hypot(vx, vz) || 1, nx = n.pos.x + vx / l * 0.5, nz = n.pos.z + vz / l * 0.5; if (S.nav.walkable(nx, nz)) { ux = vx / l; uz = vz / l; } }
    const sp = D.speed * slow * (last ? clamp(d / 0.8, 0.3, 1) : 1);
    S.vel += (sp - S.vel) * Math.min(1, dt * 4);
    const want = Math.atan2(ux, uz);
    n.angle = dampAngle(n.angle, want, 7, dt);
    const dAng = Math.abs(Math.atan2(Math.sin(want - n.angle), Math.cos(want - n.angle)));
    const step = Math.min(S.vel * dt * Math.max(0.15, Math.cos(Math.min(1.4, dAng))), d);
    const x0 = n.pos.x, z0 = n.pos.z;
    if (step > 1e-4) P.move(n, Math.sin(n.angle) * step, Math.cos(n.angle) * step);
    P.fall(n, dt);
    const v = dt > 0 ? Math.hypot(n.pos.x - x0, n.pos.z - z0) / dt : 0;
    S.gait += (v - S.gait) * Math.min(1, dt * 8);
    n.rig.play(S.gait > 0.12 ? 'walk' : 'idle');
    n.placeRig();
    // stuck (not held up by someone): plan again; again and again: take up the stop where it stands
    if (slow > 0.5 && v < 0.2 * Math.max(sp, 0.3)) S.stuckT += dt; else S.stuckT = Math.max(0, S.stuckT - dt);
    if (slow <= 0.5) { S.blockT = (S.blockT || 0) + dt; if (S.blockT > 6) { S.blockT = 0; S.stuckT = 0; S.log.push(`${g.time.toFixed(1)} held up: takes the stop here`); S.stops[S.ri] = { ...s, x: n.pos.x, z: n.pos.z }; this.arrive(n, S); return; } } else S.blockT = 0;
    if (S.stuckT > 1.5) {
      S.stuckT = 0; S.replans++;
      S.log.push(`${g.time.toFixed(1)} stuck at ${n.pos.x.toFixed(1)},${n.pos.z.toFixed(1)}`);
      if (S.replans > 3) { S.stops[S.ri] = { ...s, x: n.pos.x, z: n.pos.z }; this.arrive(n, S); } else this.plan(n, S);
    }
  }
}
