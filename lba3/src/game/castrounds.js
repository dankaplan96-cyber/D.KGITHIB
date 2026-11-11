// WC-2 "The cast moves" (WORLD_CONSISTENCY.md R2, the user 2.11.2026: Zoé "just standing at home"; every change made
// for chapters 1–4 reaches the later ones): the story's own people who stand on their marks all chapter long walk a
// small round when no scene needs them, as INTERIOR-LIFE's household rounds do (roomlife.js StoryRounds, which drives
// these too). Data only: who, in which chapters and states, and the stops round their mark.
//
// A round: { id, ch: [chapter keys], room: the area or room it runs in ('citadel' for Citadel's open air), indoor (a
// room: its floor below, CAST_FLOORS), when(flags, game) (the chapter states it runs in: the chapter's place for them
// in those states is their usual mark), speed, stops }. A stop: { id, mark: true } is the mark itself (the chapter's
// place and pose); any other is { id, dx, dz } metres from the mark (world axes), facing `a` (world angle) or the
// point `face` [dx, dz] from the mark, with an act (a pose of the rig: tinker, kneelWork, reach, touchWater, setDown,
// pickup, wipe, potting, search; 'stand' is standing) for `dur` [min, max] s, and gestures (nod, shrug, sigh).
//
// The rules (the same as the household rounds): a talk stops them where they are and they turn to Twinsen; a scene, a
// conversation, a cut-scene or a fight near holds them; a new place from the chapter takes them at once (refreshCast;
// walked to when they are on screen: story/index.js walkOn);
// the hero gone from the area (or 40 m off) puts them back on the mark unseen, so a scene that needs them finds them
// there; nothing is saved (after a load they start on the mark). Every stop keeps clear of the doors (StoryRounds
// leaves out a stop in a door's reach), of the chapter's prompts and puzzle pieces, of the mandatory ways and of the
// other quest givers' talk reach (tests/cast-rounds.mjs checks each one in its chapter's state).
//
// Left out on purpose (tests/cast-rounds.mjs lists them): the guards everywhere; chapter 3's guard at the platform's
// way and Vesk; chapter 4's research post (Dallan and his gate guard: the sneak) and Ilka once she waits by the dig's
// keypad or in the temple; chapter 5's Dallan at the post's gate (he is the gate) and Hesk by the hangar's glider;
// chapter 6's Yorna at the winch and the crank (the lift), Hesk at the landing (his mark is inside the glider's box); chapter 8's Gilbert at the fort's shelter (the drones'
// lever), Zoé's segment's farmers once told (they march); chapter 9's archivist (the disguise), the clerk (the door's
// keeper) and Dallan; chapter 10's Zoé and Arthur at the lamp room's dial bank, Mira in the valve room, Pim at the
// dome's mirror chain, Oku on the mill top, Ilka and Dallan while the bore's fight is on; Baldino in his workshop (the hop-pack's peg leaves no free
// spot) and at the shaft.
const M = (dur, o = {}) => ({ id: 'mark', mark: true, dur, ...o });
const T = (id, dx, dz, face, act, dur, o = {}) => ({ id, dx, dz, face, act, dur, ...o });
// the usual marks, read from the same spots the chapters place them on (a round runs only while the chapter's place for
// them is this mark: a scene's place elsewhere is never the start of a round)
const spot = (area, key) => (g) => g.regions?.built(area)?.npcSpots?.[key] || null;
const near = (get, dx, dz) => (g) => { const p = get(g); return p ? { x: p.x + dx, z: p.z + dz } : null; };
const plaza = (g) => g.regions?.built('desert')?.plaza || null;
const bore = (g) => g.regions?.built('desert')?.bore || null;
const well = (g) => g.world?.well || null;
const quay = (g) => g.world?.pierStart || null;
// the monastery's yard, where story/pass.js puts the villagers once up: yard(k)
const yard = (k) => (g) => { const y = g.regions?.built('hamalayi')?.monastery?.yard; return y ? { x: y.x - 3 + k * 1.5, z: y.z + (k % 2) } : null; };
// chapter 10: beside the glider at the landing of the area he is in (story/network.js heskSpot)
const heskSpot = (g) => { const c = g.story?.cur; return c?.key === 'network' ? c.heskSpot?.(c.region()) || null : null; };

// the rooms' floors the rounds walk (the room's frame, as its builder lays it out)
export const CAST_FLOORS = {
  workshop: [{ x0: -3.6, x1: 3.6, z0: -3.1, z1: 3.1, y: 0 }],     // interiors.js buildWorkshop: 8 × 7 m
  obsv: [{ x0: -6.0, x1: 6.0, z0: -6.0, z1: 6.0, y: 0 }],         // obsroom.js: 13 × 13 m
  council: [{ x0: -4.3, x1: 4.3, z0: -6.2, z1: -3.35, y: 0.5 }],  // upper.js: the dais (0.5 m up, 9 × 3.2 m)
};

const ZEELICH = ['zeelich', 'council'];
export const CAST_ROUNDS = [
  // ---------------------------------------------------------------- Zeelich (chapters 3 and 9; Oku 10)
  // Baldino at his bench (workshop: the bench is his mark) and a few steps off it, looking his flying machine over; the
  // room is full (the bench's, the globe's, the test pair's and the looks' prompts, the way to the lever and the tap):
  // that one spot keeps clear of all of them and of the doorway (a stop by the curio shelves blocked the way to a look).
  // Chapter 10 has none: Baldino's hop-pack on its peg by the door (story/arsenal.js, from chapter 10) takes that spot's
  // room, and nowhere else in the workshop is clear
  { id: 'baldino', ch: ['zeelich', 'council'], room: 'workshop', indoor: true, mark: spot('workshop', 'baldino'), speed: 0.75,
    when: (f, g) => (g.story.cur.key === 'zeelich' ? !f.c2_shield : !f.c9_heard),
    stops: [M([14, 22], { act: 'tinker', gest: ['nod'] }), T('flyer', 2.6, 1.8, [3.6, 3.6], 'stand', [6, 9], { gest: ['nod', 'shrug'] })] },
  // Oku keeps the stall by the fountain: his goods, a look at the south mill (his mills), the fountain's rim
  { id: 'oku', ch: [...ZEELICH, 'network'], room: 'zeelich', mark: spot('zeelich', 'esmer2'), speed: 0.85,
    when: (f, g) => g.story.cur.key !== 'network' || !f.c10_okuAsk,
    stops: [M([12, 18]), T('goods', 3.5, 1.0, [1.5, 1.8], 'tinker', [8, 12]), T('mill', 6.5, 3.0, [21.5, 14.5], 'stand', [6, 9], { gest: ['nod', 'sigh'] }), T('fountain', 2.2, -4.4, [0, -7], 'touchWater', [4, 6])] },
  // Nara on the boulevard: the planter by her, a look down the street
  { id: 'nara', ch: ZEELICH, room: 'zeelich', mark: spot('zeelich', 'esmer1'), speed: 0.9,
    stops: [M([12, 18]), T('south', -2.0, 3.6, [-2.0, 9.0], 'stand', [6, 9], { gest: ['shrug'] }), T('street', 2.0, 2.4, [10, 2.4], 'stand', [5, 8], { gest: ['nod'] })] },

  // ---------------------------------------------------------------- Desert Island (chapters 4 and 5)
  // Brosk the trader at his wares and a look across the water, Sani darting about the square (chapters 4 and 5; Sani's
  // spot moves to the cool room's doorway once it draws — story/kesh.js — and there he has no round); both keep clear of
  // the pump and its gears
  { id: 'dtrader', ch: ['dig', 'steam'], room: 'desert', mark: spot('desert', 'trader'), speed: 0.8,
    stops: [M([12, 18]), T('wares', -0.7, 0.55, [-0.7, 1.4], 'tinker', [8, 12]), T('water', 1.2, -2.6, [8, -11.6], 'stand', [5, 8], { gest: ['shrug'] })] },
  { id: 'dkid', ch: ['dig', 'steam'], room: 'desert', mark: spot('desert', 'kid'), speed: 1.5,
    stops: [M([6, 9]), T('pump', 2.6, 2.6, [14, -3], 'stand', [3, 5], { gest: ['nod'] }), T('pebble', -1.6, -2.0, [-1.6, -2.85], 'kneelWork', [3, 5])] },   // (NO-AIR 3: Brosk at his stall's counter from behind it; Sani kneels at the pebble game on its flat stone, storylife.js KESH_LIFE)
  // Hesk at his sand-yacht in Kesh: the runner, the sail's sheet
  { id: 'hesk', ch: ['dig', 'steam'], room: 'desert', mark: spot('desert', 'hesk'), speed: 1.0,
    when: (f, g) => (g.story.cur.key === 'dig' ? (f.c4_yacht || 'village') === 'village' : !!f.c5_planned && !f.c5_glider),
    stops: [M([10, 16]), T('runner', -0.8, -2.2, [1.5, -2.2], 'kneelWork', [9, 13]), T('sheet', 2.25, -0.9, [1.5, -2.2], 'tinker', [7, 10])] },   // (NO-AIR 3: both at the yacht's hull where it is parked, desert.js YACHT (−24, 11): the old stops faced past its ends)
  // Mother Tarra before her house: her porch, a look at the pump that matters to Kesh
  { id: 'tarra', ch: ['dig', 'steam'], room: 'desert', mark: spot('desert', 'tarra'), speed: 0.75,
    when: (f, g) => g.story.cur.key === 'dig' || !!f.c5_planned,
    stops: [M([14, 20]), T('porch', 2.8, 0.6, [2.8, 2.2], 'wipe', [6, 9]), T('pump', 3.5, -2.5, [19, -18.5], 'stand', [6, 9], { gest: ['nod', 'sigh'] })] },
  // Ilka at her camp (chapter 4 until the notebook is hers): her notes at the tent, a look toward the post
  { id: 'ilka', ch: ['dig'], room: 'desert', mark: spot('desert', 'ilka'), speed: 1.0,
    when: (f) => !f.c4_notebook,
    stops: [M([12, 18]), T('notes', -0.4, -1.3, [-0.4, -2.4], 'tinker', [9, 13]), T('look', 2.6, -1.5, [32, 22], 'stand', [6, 9], { gest: ['nod'] })] },   // (NO-AIR 3: at her camp table by the tent)
  // chapter 5, the plan made: Ilka at the plaza (a look at the pump, her bag), Dallan once the steam is through
  { id: 'ilka', ch: ['steam'], room: 'desert', mark: near(plaza, 2.2, 1.0), speed: 1.0,
    when: (f) => !!f.c5_planned,
    stops: [M([12, 18]), T('pump', 3.0, -1.6, [17.8, -10.0], 'stand', [6, 9], { gest: ['nod'] }), T('bag', -0.6, 2.6, [-0.6, 3.6], 'stand', [6, 9], { gest: ['sigh', 'nod'] })] },   // (NO-AIR 3: no bag is drawn there: she stands a moment, thinking)
  { id: 'dallan', ch: ['steam'], room: 'desert', mark: near(plaza, -2.4, 1.6), speed: 0.95,
    when: (f) => !!f.c5_vent,
    stops: [M([12, 18]), T('dock', -2.6, -0.8, [-50, 0], 'stand', [6, 9], { gest: ['sigh'] }), T('pump', 1.0, 2.6, [22.4, -11.6], 'stand', [5, 8], { gest: ['nod'] })] },

  // ---------------------------------------------------------------- the Hamalayi (chapters 6 and 7)
  // (Hesk at the landing in chapter 6 has none: his mark stands inside the crashed glider's solid box, so a walk back to
  //  it would be pushed off it; he stays on it, as the chapter puts him)
  // Lhar, before the lift (chapter 6): Yorna by the shrine and watching the packing, Pim looking up at the icefall where
  // his kite is; the villagers packing at their doors
  { id: 'yorna', ch: ['pass'], room: 'hamalayi', mark: spot('hamalayi', 'yorna'), speed: 0.9,
    when: (f) => !f.c6_thawed,
    stops: [M([12, 18]), T('shrine', -0.6, 4.8, [-2.0, 7.0], 'stand', [6, 9], { gest: ['nod'] }), T('packing', -3.4, 0.4, [-6.1, -6.8], 'stand', [5, 8], { gest: ['nod'] })] },   // (clear of the steam crack's prompt (kit2b.js): it stood 1.4 m from it)
  { id: 'pim', ch: ['pass'], room: 'hamalayi', mark: spot('hamalayi', 'pim'), speed: 1.2,
    when: (f) => !f.c6_trip2,
    stops: [M([8, 12]), T('icefall', 1.5, -3.0, [-5.6, -20.9], 'stand', [5, 8], { gest: ['sigh', 'shrug'] }), T('square', 0.5, 4.0, [0.5, 5.0], 'tinker', [4, 6])] },   // (NO-AIR 3: at the children's snowman, storylife.js LHAR_SNOWMAN: a child's hand does not reach the ground it picked from)
  { id: 'lhar1', ch: ['pass'], room: 'hamalayi', mark: spot('hamalayi', 'v1'), speed: 0.8, when: (f) => !f.c6_trip1,
    stops: [M([10, 16]), T('sledge', -1.6, 1.8, [-2.5, 1.79], 'kneelWork', [6, 9])] },   // (HAMALAYI-LIFE: house 0's door leads in now: its stop by the door stood 1.8 m from the door's trigger, inside its reach and its way in; now by the sledge's side of the square, 3.6 m off)
  { id: 'lhar2', ch: ['pass'], room: 'hamalayi', mark: spot('hamalayi', 'v2'), speed: 0.8, when: (f) => !f.c6_trip1,
    stops: [M([10, 16]), T('door', 0.1, 0.95, [0.62, 1.85], 'kneelWork', [6, 9])] },   // (HAMALAYI-LIFE: 2.9 m from Yorna's door's trigger: it stood on the rim of its reach and its way in)
  { id: 'lhar3', ch: ['pass'], room: 'hamalayi', mark: spot('hamalayi', 'v3'), speed: 0.8, when: (f) => !f.c6_trip2,
    stops: [M([10, 16]), T('door', -1.4, -1.6, [-2.48, -1.38], 'kneelWork', [6, 9])] },   // (HAMALAYI-LIFE: house 2's door leads in now: off its way in (2.2 m out, ±0.7 m), 3 m from its trigger, still watching it)
  // (NO-AIR 3: the three households' stops above are at their packing now — a crate and a bundle each, storylife.js
  //  LHAR_PACK — kneeling at it: they set things down on the air before a door; each stays clear of its door's way in)
  // the monastery's yard, the villagers settled (chapter 6 once up, chapter 7): the fire, the crates and the cart in the
  // west corner, the trough and the prayer wheels; the middle of the yard (the way from the gate) stays clear
  { id: 'lhar1', ch: ['pass', 'observatory'], room: 'hamalayi', mark: yard(0), speed: 0.8, when: (f, g) => g.story.cur.key === 'observatory' || !!f.c6_trip1,
    stops: [M([10, 16]), T('fire', -1.79, -2.3, [-3.0, -1.6], 'kneelWork', [10, 14]), T('crates', -3.6, -0.4, [-4.7, -0.6], 'pickup', [5, 8])] },   // (NO-AIR 3: the fire tended kneeling at its stones — the pot hangs out of a standing reach)
  { id: 'lhar2', ch: ['pass', 'observatory'], room: 'hamalayi', mark: yard(1), speed: 0.8, when: (f, g) => g.story.cur.key === 'observatory' || !!f.c6_trip1,
    stops: [M([10, 16]), T('wheels', -3.55, -5.15, [-3.55, -6.05], 'reach', [6, 9]), T('cart', -4.4, 0.4, [-5.0, 1.6], 'setDown', [6, 9])] },   // (NO-AIR 3: the wheels' stop square before a wheel)
  { id: 'lhar3', ch: ['pass', 'observatory'], room: 'hamalayi', mark: yard(2), speed: 0.8, when: (f, g) => g.story.cur.key === 'observatory' || !!f.c6_trip2,
    stops: [M([10, 16]), T('trough', 6.4, -2.4, [7.6, -2.4], 'touchWater', [6, 9]), T('wheels', 4.6, -4.6, [5.05, -6.05], 'reach', [6, 9])] },
  { id: 'yorna', ch: ['pass', 'observatory'], room: 'hamalayi', mark: yard(3), speed: 0.9, when: (f, g) => g.story.cur.key === 'observatory' || !!f.c6_up,
    stops: [M([12, 18]), T('wheels', 3.6, -5.0, [3.55, -6.05], 'reach', [6, 9]), T('bench', 5.2, -0.6, [6.6, 1.0], 'stand', [6, 9], { gest: ['nod'] })] },   // (clear of the frozen chest's prompt (kit2b.js): it stood 1.75 m from it)
  { id: 'pim', ch: ['pass', 'observatory'], room: 'hamalayi', mark: yard(4), speed: 1.2, when: (f, g) => g.story.cur.key === 'observatory' || !!f.c6_trip2,
    stops: [M([8, 12]), T('sledge', -8.15, 3.17, [-8.8, 4.3], 'kneelWork', [7, 10]), T('trough', 3.6, -1.6, [4.6, -2.4], 'touchWater', [4, 6])] },
  // the observatory's keeper (chapter 7), along the hall's south wall: the telescope's side, the bookshelf by the door;
  // never within reach of a floor mirror, nor on the beam's way
  { id: 'keeper', ch: ['observatory'], room: 'obsv', indoor: true, mark: spot('obsv', 'keeper'), speed: 0.75,
    stops: [M([12, 18]), T('telescope', 5.9, 1.4, [7.5, 0], 'stand', [8, 12], { gest: ['nod'] }), T('wall', 1.5, 1.6, [1.5, 2.6], 'tinker', [6, 9])] },

  // ---------------------------------------------------------------- Citadel in the evacuation (chapter 8)
  // the hill farms' farmers at their fields (story/evacuation.js FARMS, the same spots) until Zoé tells them; then they
  // march to the gather point (driven by the chapter: no round)
  { id: 'farmer1', ch: ['evacuation'], room: 'citadel', mark: () => ({ x: -50, z: 30 }), speed: 0.8, when: (f) => !f.c8_farmer1,
    stops: [M([10, 16]), T('rows', 2.4, 1.2, [2.4, 2.4], 'kneelWork', [10, 14]), T('look', -1.6, 2.2, [-1.6, 6], 'stand', [5, 8], { gest: ['sigh'] })] },
  { id: 'farmer2', ch: ['evacuation'], room: 'citadel', mark: () => ({ x: -30, z: 45 }), speed: 0.8, when: (f) => !f.c8_farmer2,
    stops: [M([10, 16]), T('rows', -2.2, 1.4, [-2.2, 2.6], 'kneelWork', [10, 14]), T('look', 1.8, -1.8, [6, -1.8], 'stand', [5, 8], { gest: ['shrug'] })] },
  { id: 'farmer3', ch: ['evacuation'], room: 'citadel', mark: () => ({ x: -60, z: 55 }), speed: 0.8, when: (f) => !f.c8_farmer3,
    stops: [M([10, 16]), T('rows', 2.2, -1.6, [2.2, -2.8], 'kneelWork', [10, 14]), T('look', -2.0, -1.4, [-6, -1.4], 'stand', [5, 8], { gest: ['sigh'] })] },
  // Gilbert at the well (before he is asked for the shelters), the children and Xil on the quay (before Pippa sends the
  // children to the depot's shelter)
  { id: 'gilbert', ch: ['evacuation'], room: 'citadel', mark: near(well, 3.5, 8.0), speed: 0.85, when: (f) => !f.c8_gilbert,
    stops: [M([12, 18]), T('well', -2.4, -2.6, [-3.5, -8.0], 'stand', [6, 9], { gest: ['sigh'] }), T('post', 1.8, -1.8, [3.0, -2.6], 'wipe', [6, 9])] },
  // (Tim's crate and Lulu's kneel moved off the harbour sheds' doors, CITADEL-STANDS 7.11: their prompts were in reach)
  { id: 'tim', ch: ['evacuation'], room: 'citadel', mark: near(quay, 2.5, 2.0), speed: 1.4, when: (f) => !f.c8_pippa,
    stops: [M([6, 10]), T('edge', 3.5, 1.8, [6.0, 1.8], 'stand', [4, 6], { gest: ['shrug'] }), T('crate', 2.5, 0.6, [2.5, -0.4], 'pickup', [3, 5])] },
  { id: 'lulu', ch: ['evacuation'], room: 'citadel', mark: near(quay, 2.5, 3.2), speed: 1.3, when: (f) => !f.c8_pippa,
    stops: [M([6, 10]), T('kneel', -1.4, 0.2, [-2.6, 0.2], 'kneelWork', [4, 6]), T('edge', 3.2, -1.4, [6.0, -1.4], 'stand', [4, 6], { gest: ['nod'] })] },
  { id: 'xil', ch: ['evacuation'], room: 'citadel', mark: near(quay, 4.5, -0.5), speed: 0.9,
    stops: [M([12, 18]), T('bollard', 1.4, -2.0, [2.6, -2.0], 'tinker', [7, 10]), T('sea', 2.6, 1.0, [8, 1.0], 'stand', [5, 8], { gest: ['sigh'] })] },

  // ---------------------------------------------------------------- the council between its sittings (chapter 9)
  // on the dais, never down among the benches: a look down the hall, a word with each other, back to their seats
  { id: 'chair', ch: ['council'], room: 'council', indoor: true, mark: spot('council', 'chair'), speed: 0.7, when: (f) => !!f.c9_heard && !f.c9_plans,
    stops: [M([12, 18]), T('edge', 0, 1.25, [0, 6], 'stand', [6, 9], { gest: ['nod'] }), T('word', 1.3, 0.9, [2.6, 0], 'stand', [6, 9], { gest: ['shrug', 'nod'] })] },
  { id: 'councilB', ch: ['council'], room: 'council', indoor: true, mark: spot('council', 'c2'), speed: 0.7, when: (f) => !!f.c9_heard && !f.c9_plans,
    stops: [M([12, 18]), T('side', -1.3, 1.1, [-3.9, 3.0], 'stand', [6, 9], { gest: ['sigh'] }), T('word', 1.3, 1.0, [2.6, 0], 'stand', [6, 9], { gest: ['nod'] })] },
  { id: 'councilC', ch: ['council'], room: 'council', indoor: true, mark: spot('council', 'c3'), speed: 0.7, when: (f) => !!f.c9_heard && !f.c9_plans,
    stops: [M([12, 18]), T('side', 1.3, 1.1, [3.9, 3.0], 'stand', [6, 9], { gest: ['shrug'] }), T('edge', -0.6, 1.3, [-0.6, 6], 'stand', [6, 9], { gest: ['nod'] })] },

  // ---------------------------------------------------------------- Baldino's network (chapter 10)
  // Ilka and Dallan at the bore's post before the relay is set and after its fight; the relay's prompt (2.6 m round the
  // bore) stays clear
  { id: 'ilka', ch: ['network'], room: 'desert', mark: near(bore, -2.6, 2.4), speed: 1.0, when: (f) => !f.c10_boreRelay || f.c10_bore === true,
    stops: [M([12, 18]), T('tank', -7.05, -0.4, [-8.1, -0.4], 'tinker', [8, 12]), T('look', 0.4, 2.2, [0.4, 12], 'stand', [5, 8], { gest: ['nod'] })] },   // (NO-AIR 3: at the post's crates west of the bore: the stop named for the tank faced open ground)
  { id: 'dallan', ch: ['network'], room: 'desert', mark: near(bore, 2.8, 2.6), speed: 0.95, when: (f) => !f.c10_boreRelay || f.c10_bore === true,
    stops: [M([12, 18]), T('fence', 2.4, 1.2, [6, 1.2], 'stand', [6, 9], { gest: ['sigh'] }), T('cabin', 1.2, 2.6, [1.2, 4], 'wipe', [5, 8])] },
  // Hesk by his glider at each of Twinsun's landings (chapter 10: he flies Twinsen between them)
  { id: 'hesk', ch: ['network'], room: 'desert', mark: heskSpot, speed: 1.0,
    stops: [M([10, 14]), T('wing', -1.6, -2.6, [-2.0, -5.2], 'tinker', [8, 12]), T('look', 4.5, -1.6, [10, -1.6], 'stand', [5, 8], { gest: ['nod'] })] },
  { id: 'hesk', ch: ['network'], room: 'hamalayi', mark: heskSpot, speed: 1.0,
    // (REV-HAM: the glider stands outside the gate now, story/network.js: his mark west of its wing; at the wing's tip
    //  north of its trailing edge, and a look west down the terrace to the lift's top — not south: the lip is 3 m off,
    //  and whoever stands in front of him there stands at its edge)
    stops: [M([10, 14]), T('wing', 4.2, 0.0, [4.8, 1.2], 'tinker', [8, 12]), T('look', -2.0, 0.0, [-11, 0], 'stand', [5, 8], { gest: ['nod'] })] },
  { id: 'hesk', ch: ['network'], room: 'citadel', mark: heskSpot, speed: 1.0,
    stops: [M([10, 14]), T('wing', 4.2, -1.2, [6.8, -3.0], 'tinker', [8, 12]), T('look', 1.0, 2.4, [1.0, 10], 'stand', [5, 8], { gest: ['nod'] })] },
];
