# NO-AIR — nothing done in the air (the user, 10.11.2026)

"The opening film isn't polished enough: the people at the harbour, Arthur and Twinsen — the actions they do in the air."
"And in general, in the whole game, don't do things in the air."

**Status: Automated runtime only.** Headless Chromium on SwiftShader; the opening stepped on its own clock at 1/30 s.
No frame-rate claim. Nobody watched it at speed on a real GPU, and nobody listened. The machine was shared with other
runs while this was measured (load 15–25 on 4 cores): timings in the logs are not the game's.

## What "in the air" is, and how it is measured

A hand action must be on a real thing, and feet on the ground. Measured against what is drawn, not against colliders:
`tests/lib/contact.js` (page side, `window.CT`) gives the least distance from a hand's probe points — the wrist bone,
the palm, the fingertips, and the vertices of whatever rigid thing the hand holds (a screwdriver, a mast) — to the
nearest triangle of any visible rigid mesh that is not the person's own body. A sole's height is the foot bone over
the physics' ground under it, less the rig's ankle height.

## Phase 1 — the opening film (src/game/story/opening.js)

Real-time, in-engine; 88 s; the shot times, the lines, the flags and the music cue are unchanged. Before/after of the
changed beats, cut from the film's own frames at the same scene times: `captures/opening/no-air-before-after.jpg`.

| Beat (scene s) | Before (measured) | What was done | After (measured) |
|---|---|---|---|
| The worker "at the lift's control" (14.2–16.9, 20–23.3) | There was no control. His right hand hung 14–60 cm from anything (median 33 cm from the mast). | The lift has a control (island.js `cargoLift`): an iron box on the mast's landward face with one lever in a slot — off, hoist, swing-and-lower; `pose(u)` puts the lever where the cycle is. His **left** palm (the camera's side) is on the knob; the lever is thrown under it as the motor starts (14.2) and again as the boom swings (20.7, under the drill's cutaway). | Hand to lever 0.9–1.0 cm through both holds (141 frames, max 1.0 cm); the lever moves 0.42 rad under it twice. |
| The crate set down (25.6–28) | It came down by itself; he bowed to it afterwards with one hand: right hand 2.5 cm from it only from 27.0, left 31–36 cm. | He meets it as it comes down, both palms on its top's near edge, and goes down with it to the deck (the thump), bending as it lowers; then his right hand goes to the hook block and he straightens. | Both hands 0.1–0.7 cm from the crate over the last 30 cm of its descent (64 samples, max 0.7 cm); deepest hand point inside the crate's box 1.5 cm (the fingertips' probe on the top's edge). |
| The resident's question (14.9) | Both forearms held up in front of him, as if he carried a box. | One gesture: a thumb back over his shoulder at the harbour row he asks about. | A pointing gesture, not work; no contact expected. |
| The resident's walk off (26.4–28.5) | His walk ended with his left foot over the pier's edge (the sole 7.8 m "over the ground": the sea). | The walk ends 0.3 m in. | Feet on the deck. |
| Twinsen "mending the lamp" (29–31.6, 35.2–46.2) | Fists at chest height over the table: the screwdriver 22 cm from anything, the left hand 27 cm. | The lamp has what he mends (interiors.js): a brass collar on its stem held by one screw on his side. The screwdriver's tip sits in the screw, its shaft in line with it; each stroke of his wrist turns the screw a radian and it goes in (6 mm over the scene), the tip lifting a hair as the wrist comes back. His left hand is on the lamp's shade. The strokes stop while he looks over at Arthur. | Tip to screw ≤ 0.8 cm in the strokes (0.7 cm is the lift between strokes); left hand 1.1 cm from the shade; the screw turns 10.3 rad and goes in 5.9 mm. |
| The screwdriver laid down (66.65–67.15) | It left his hand 11 cm from where it then lay (a jump in one frame). | His hand is solved to hold the tool exactly where it will lie; it lies by the table's near edge now, pointing away from him. | It moves 1.4 mm as it leaves his hand. |
| Arthur at his boat (29–58) | Kneeling, his hands were 21–46 cm (right) and 29–41 cm (left) from anything: the hull lay on the floor, half a metre under them. The mast "fitted" by jumping 64 cm from his hand to the hull at 36.2. | The boat stands on a low crate, his building stand, its deck at his hands' height. His left palm holds the hull by the stern. The mast is upright in his right fist: it rests on the deck by its step as he tries it, goes up as he shows it ("Dad! The mast fits!"), comes down over the step and in — home at 36.2, the click — he holds it a moment and lets go; then that hand rubs the deck by the bow. | Left hand 0.1–0.5 cm from the hull; the mast is 0.8 mm from its fitted place while still in his hand and moves 0.8 mm as he lets go; right hand ≤ 1.0 cm from the deck afterwards. |
| Zoé at the seed tray (29–39.5) | Right palm 0.9–19 cm (median 6.5), left 8.5–17 cm (median 14) from the tray. | Her palms press the soil of the two pots she is filling, in turn. | ≤ 1.4 cm (both hands); her right hand comes up to 5 cm off while she turns to look at Arthur (36.4–37.6), which is not counted. |

Under it: the opening's arm solver moved to `src/engine/handik.js` (shared with Phase 2); the scene's actors do not
get the game's own hands-on-things layer while the scene runs.

`tests/opening.mjs` item 11 checks each of these per frame (limits: 3 cm for hands, 5 mm for the mast's seat and its
release, 9 cm for a standing sole).

## Phase 2 — the whole game

### The sweep: tests/no-air.mjs
For every chapter (and the chapter states that move people or change what stands at their stops: 21 states), with
every area and room built, every person of `game.npcs` is taken through every hand action the game gives them:
- the story's people where their chapter places them (a placement's pose),
- the cast rounds (castrounds.js) and the household rounds (roomlife.js) at each stop,
- every resident (walkers.js: Citadel, the story residents, the islands, the rooms, the ports) at each stop of the
  round their state gives them; a door's knock is measured from where the knock is made (the last step up to the leaf),
- the room people who walk a track (hamlife.js, isleslife.js, deeplife.js), played for 64 s; each one at work is posed
  as the camera's view of them has it (out of view the game poses people at a lower rate and without the hands layer).

Each stop's pose is played on the person's own rig at the stop and the working hand's least gap over the action is
taken (both hands for tinker, potting, kneelWork, search, use, pump; the right for reach, tapTurn, touchWater, setDown,
pickup, reachHigh). An offender: a working hand more than 5 cm from any drawn surface, or a standing sole more than
6 cm off the ground. `wipe` (hands dried on the apron: the body's own surface) and `warm` (a hand held out to a heat
post's warmth) are listed, not measured. A stop where the game has the person stand instead of work is listed as
STOOD with the reason and what is drawn before it (how far the first face and the first table-high top are).

### What was changed (generic; one story placement)
1. **Hands are put on what is drawn there** (`src/game/workhands.js`, a layer at the end of `Rig.update`, set on every
   NPC). Once per stop the triangles of the rigid meshes within 1.3 m of the worker's hands are gathered (nobody's
   body; a big mesh is read by boxed runs of 96 triangles, indexed once), and each palm's place is found on them by
   short rays from where the pose has the hands: down for a top (a table, a bench, a crate, a rim; the ground for the
   actions that go down to it), forward for a face (a wall, a post, a door, a loom), trying up to 0.4 m along the
   facing, 0.24 m up and down a face, the two hands nearer each other for a narrow thing, and as little more bend of
   the chest as reaches (0 to 0.85 rad). The arms are then solved for the palms each frame on top of the action's own
   pose. What was found at a stop (or not found) is kept for the person's next time there, until the story's flags
   change. (The first version read the physics' colliders: a collider is a box or a cylinder round the thing, and a
   palm on its face was 6 to 60 cm from the mesh. That is gone.)
2. **Nothing in reach: no miming.** The action is stood down (`Rig.standFor`): the person stands at the stop instead
   of working the air. A one-off move (setDown, pickup, reachHigh) is judged before it sets off.
3. **Stops are stood at an arm's length** (`workSpot`): a round's work stop is moved along its own facing until its
   thing is 0.5 m from the body's middle (the stops were set 0.8 to 1 m off: a walker's berth), where the place is
   free, a route still ends there, and (the cast's rounds) nobody else's mark or stop is within 1.2 m. Read from the colliders;
   from what is drawn where no collider stands on the line.
4. **A knock steps up to its door** (walkers.js `knockTick`): the stop stays where the route ends; the last step to
   the leaf (0.1 to 1.7 m: Citadel's doors stand a metre off, the islands' and Zeelich's two) is the knock's own, and
   the step in is that much shorter.
5. **A track's walk ends on its spot** (engine/scripts.js `goto … near`; isleslife.js, deeplife.js. Not the Hamalayi
   rooms': there a person standing on the spot took the room's own look prompt from the player's Talk,
   tests/hamalayi-life.mjs).
6. **A hand held out to a heat post** (`warm`) is left as it is (`rig.handsFree`).
7. Chapter 1's worker at the lift stands at the lift's control (the opening's), both hands on it; he stood 2 m short
   of the mast cranking the air (story/chapter1.js).
8. Arthur's boat stand (Phase 1) is also where he works in play.

### Numbers
| Run | States | Distinct work cases | Hand in the air (> 5 cm) | On a thing | Stood down | Own body / warming |
|---|---|---|---|---|---|---|
| Base (ba23dfa6) | 6 of 21 (well, project ×2, zeelich ×2, dig) | ~220 | **172** (tinker 67, setDown 41, reach 20, kneelWork 16, tapTurn 11, touchWater 8, potting 6, other 3); typical gap 20–80 cm | about 30 | — | 14 / 4 |
| After (merged with the main branch, 11.11) | 21 of 21, one page per state, none died (3 463 cases measured) | 266 | **0** (1 406 measured contacts: median 0.4 cm, 95 % within 1.5 cm, the worst 2.6 cm) | 98 | 147 | 16 / 6 |

Feet: no standing worker's sole more than 6 cm off the ground in any run (0 offenders, before and after).

Stood down by reason: nothing drawn at the hands 54, nothing ahead of a one-off move 47, the thing out of reach 46.
By place: the Hamalayi 31, the desert 29, Citadel 14, Zeelich 12, the Platform 10, Under-Gas 8, the Orchard 7,
Otringal 5, Knartas 5, the lift dock 4, Mosquibee 3, the baggage hall 3, the tavern 2, the house 2, the Celebration 2,
Old Watch 2, the upper works 2, and one each in Nell's house, the two terminals, the office, the observatory and the
core. By action over all 266 cases: tinker 83, setDown 69, reach 31, kneelWork 27, wipe 16, tapTurn 14, touchWater
11, potting 6, pickup 4, reachHigh 4, use 1.

`tests/no-air.mjs` passes per state (`STATES=<i>`: 21 processes; a single process with all 21 states ran out of
memory on the shared machine earlier and was not tried again).

### Cost (SwiftShader container, the machine shared: CPU time, no frame-rate claim)
- A stop's first look (one gather and the rays): 1.0 to 4.1 ms mean over a whole sweep state (189 to 456 looks each,
  1 760 to 2 360 triangles gathered per look; the worst single look 419 ms: the first, which indexes the big meshes),
  with every area built. In ordinary play in Citadel: 9 looks in the
  first minute, about 6 ms each under a load of 14 on 4 cores; the first look of a session also indexes the big
  meshes (the ground, the merged streets): 90 to 460 ms once, measured at boot. After a person's first time at a stop
  nothing is gathered again there until the story's flags change.
- Per frame: two arms solved per visible worker (as before).

### Left (honest list)
1. **Stops where the person now stands instead of working** (see the numbers; the full list is at the end). Three
   kinds: nothing drawn within 2 m on the stop's line (a stop named for a thing that is not there, or faced past
   it); the thing 0.6 to 2 m off and the stop not moved (the place by it is not free or not walkable); the thing in
   front but out of these short arms' reach from a walker's berth (0.43 m from the collider: a low crate, a trough, a
   cart's bed). Each wants its stop set by hand at the thing, a small prop, or the last step taken as the knock takes
   it. None was done: no stop was moved and no prop placed without a picture to judge it by.
2. **Track people who never reached a work pose in 64 s** are not measured (the sweep's NOTES name them: il_avra,
   il_ione, il_zett in most states; keeper, il_mila, il_rudd, il_ulla, hl_dorje, il_nessa in some).
3. **Scripted scenes** in src/game/story/*.js other than the opening were not swept: their NPCs get the hands layer
   like everyone, but no scene was measured.
4. **Looks**: the layer has been measured, not watched. A bend of up to 0.85 rad over a low crate may read as too
   much; palms lie flat on tops and against faces whatever the action; a hand on a narrow thing can slide a few
   centimetres past its edge with the action's own movement; a person who stands where they used to work looks idle.
5. **Far people**: beyond the fog or out of the camera's view the layer does not run (and nothing is stood down
   until the person is first seen at the stop).
6. The opening's Arthur close-ups stay on his face; his hands' work shows in the wide shots only.

## Appendix — the stops where the person stands (147; the final sweep)
Scene, who@stop, the action stood down, why, and what is drawn on the stop's line (the first face at 0.5 / 0.85 /
1.2 m of height, the first table-high top): the measure for setting each stop by hand.

```
baggage osk@osk_table tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
baggage osk@osk_belt reach nothing at the hands; ahead: a face at 1.74/1.74/1.77 m, a top 1.03 m high at 1.75 m
baggage osk@osk_crates setDown nothing ahead; ahead: a face at 1.63/1.67/1.67 m, a top 0.54 m high at 1.65 m
c3core dp_sala@mark tinker nothing at the hands; ahead: a face at 1.5/1.53/- m, a top 0.85 m high at 1.5 m
citadel dot@dot_peer touchWater out of reach; ahead: a face at 0.69/0.68/0.77 m, a top 0.92 m high at 0.6 m
citadel farmer1@rows kneelWork out of reach; ahead: a face at -/-/- m, a top nowhere
citadel farmer2@rows kneelWork out of reach; ahead: a face at -/-/- m, a top 0.42 m high at 0.25 m
citadel garrick@gar_tap reach nothing at the hands; ahead: a face at 0.73/0.72/- m, a top 1.01 m high at 0.55 m
citadel garrick@gar_water potting nothing at the hands; ahead: a face at 1.02/-/- m, a top 0.54 m high at 1 m
citadel gurt@gurt_crates setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
citadel gurt@gurt_trolley setDown out of reach; ahead: a face at 0.68/-/- m, a top 0.27 m high at 0.6 m
citadel gurt@gurt_ship reach nothing at the hands; ahead: a face at -/-/- m, a top nowhere
citadel lulu@kneel kneelWork out of reach; ahead: a face at 0.91/0.91/0.86 m, a top 0.23 m high at 0.85 m
citadel sefa@sefa_crates tinker nothing at the hands; ahead: a face at 1.51/-/- m, a top 0.7 m high at 1.55 m
citadel tibbo@tibbo_bench tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
citadel tim@crate pickup out of reach; ahead: a face at -/-/- m, a top nowhere
citadel tobb@tobb_quay setDown nothing at the hands; ahead: a face at 0.63/-/- m, a top 0.62 m high at 0.65 m
citadel tobb@tobb_stall setDown nothing at the hands; ahead: a face at 1.27/1.27/- m, a top 0.31 m high at 0.6 m
desert dg_clerk@clk_b tinker nothing at the hands; ahead: a face at 1.36/-/- m, a top 0.25 m high at 0.6 m
desert dg_clerk@clk_table tinker nothing at the hands; ahead: a face at -/0.49/- m, a top 0.84 m high at 0.5 m
desert dg_cook@cook_pot tinker out of reach; ahead: a face at -/0.99/- m, a top 0.93 m high at 0.95 m
desert dg_cook@cook_table setDown nothing at the hands; ahead: a face at -/-/- m, a top 0.82 m high at 0.5 m
desert dg_cook@cook_water reach out of reach; ahead: a face at -/-/- m, a top nowhere
desert dg_cook@cook_pour setDown nothing ahead; ahead: a face at 0.92/1.04/- m, a top 0.39 m high at 0.95 m
desert dg_cook@cook_stow setDown nothing ahead; ahead: a face at 0.92/0.92/- m, a top 0.22 m high at 0.85 m
desert dg_dig@dig_rim kneelWork out of reach; ahead: a face at -/-/- m, a top 1.08 m high at 0.85 m
desert dg_dig@dig_pile tinker out of reach; ahead: a face at -/-/- m, a top nowhere
desert dg_haul@haul_a setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
desert dg_haul@haul_b setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
desert dg_mech@mech_stake kneelWork out of reach; ahead: a face at -/-/- m, a top 1.05 m high at 0.6 m
desert dg_mech@mech_tripod tinker nothing at the hands; ahead: a face at -/-/- m, a top 1.36 m high at 0.85 m
desert dg_porter@port_a setDown nothing ahead; ahead: a face at 0.93/1.7/1.7 m, a top 0.76 m high at 0.95 m
desert dg_surv@surv_scope tinker nothing at the hands; ahead: a face at -/-/- m, a top 1.41 m high at 0.65 m
desert dg_surv@surv_fold tinker nothing at the hands; ahead: a face at -/-/- m, a top 1.41 m high at 0.65 m
desert dkid@pebble pickup out of reach; ahead: a face at -/-/- m, a top nowhere
desert dtrader@wares tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
desert hesk@runner kneelWork out of reach; ahead: a face at -/-/- m, a top nowhere
desert hesk@sheet tinker nothing at the hands; ahead: a face at -/-/- m, a top 0.27 m high at 1.45 m
desert ilka@tank tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
desert ilka@notes tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
desert ilka@bag kneelWork out of reach; ahead: a face at -/-/- m, a top nowhere
desert safi@safi_oasis touchWater nothing at the hands; ahead: a face at -/-/- m, a top nowhere
desert safi@safi_door setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
desert sc_pupa@a_draw reach nothing at the hands; ahead: a face at -/-/- m, a top nowhere
desert sc_pupa@a_water potting out of reach; ahead: a face at -/-/- m, a top 0.26 m high at 0.6 m
desert sc_pupb@b_tend kneelWork out of reach; ahead: a face at 1.19/-/- m, a top 0.26 m high at 0.85 m
desert sc_pupc@c_dip touchWater nothing at the hands; ahead: a face at -/-/- m, a top nowhere
hamalayi lh_bero@bero_home tapTurn out of reach; ahead: a face at 0.91/0.91/0.91 m, a top 0.43 m high at 0.9 m
hamalayi lh_bero@bero_cart setDown nothing ahead; ahead: a face at -/1.24/- m, a top 0.91 m high at 1.25 m
hamalayi lh_bero@bero_sledge tinker out of reach; ahead: a face at 0.67/-/- m, a top 0.3 m high at 0.6 m
hamalayi lh_bero@bero_fire setDown nothing ahead; ahead: a face at -/1.04/- m, a top 0.93 m high at 1.05 m
hamalayi lh_grum@grum_crates setDown nothing ahead; ahead: a face at 0.69/0.71/- m, a top 1.08 m high at 0.7 m
hamalayi lh_grum@grum_cart setDown nothing ahead; ahead: a face at -/0.73/- m, a top 0.93 m high at 0.75 m
hamalayi lh_grum@grum_sledge setDown nothing ahead; ahead: a face at 0.85/-/- m, a top 0.31 m high at 0.75 m
hamalayi lh_grum@grum_crates setDown nothing ahead; ahead: a face at 0.9/1.03/- m, a top 0.53 m high at 0.9 m
hamalayi lh_grum@grum_lift setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
hamalayi lh_kid2@k2_sledge tinker nothing at the hands; ahead: a face at -/-/- m, a top 0.26 m high at 0.7 m
hamalayi lh_mira@mira_trough reach out of reach; ahead: a face at 0.5/-/- m, a top 0.71 m high at 0.5 m
hamalayi lh_mira@mira_pot setDown nothing ahead; ahead: a face at -/1.22/1.41 m, a top 0.89 m high at 1.25 m
hamalayi lh_mira@mira_pot tinker out of reach; ahead: a face at -/1.06/- m, a top 1.01 m high at 1.05 m
hamalayi lh_mira@mira_back setDown nothing ahead; ahead: a face at -/1.06/- m, a top 1 m high at 1.05 m
hamalayi lh_sana@sana_rack reach out of reach; ahead: a face at -/-/0.99 m, a top 1.25 m high at 1 m
hamalayi lh_sana@sana_home tapTurn out of reach; ahead: a face at 0.9/0.9/0.9 m, a top 0.41 m high at 0.9 m
hamalayi lh_sana@sana_barrels tinker out of reach; ahead: a face at 0.8/1.4/1.37 m, a top 0.48 m high at 0.8 m
hamalayi lh_sana@sana_rack tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
hamalayi lh_sana@sana_pot tinker nothing at the hands; ahead: a face at -/1.03/- m, a top 0.89 m high at 1.05 m
hamalayi lh_tam@tam_wood setDown nothing ahead; ahead: a face at 1.33/1.27/- m, a top 1.37 m high at 1.2 m
hamalayi lh_tam@tam_fire setDown nothing ahead; ahead: a face at -/1.15/1.27 m, a top 0.98 m high at 1.15 m
hamalayi lh_tam@tam_sledge setDown nothing at the hands; ahead: a face at 0.76/-/- m, a top 0.27 m high at 0.45 m
hamalayi lhar1@sledge setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
hamalayi lhar1@fire tinker nothing at the hands; ahead: a face at -/1.42/1.61 m, a top 1.01 m high at 1.45 m
hamalayi lhar2@door setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
hamalayi lhar2@wheels reach out of reach; ahead: a face at 0.55/0.94/0.72 m, a top 0.65 m high at 0.55 m
hamalayi lhar2@cart setDown nothing ahead; ahead: a face at -/0.79/- m, a top 0.61 m high at 0.7 m
hamalayi lhar3@door setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
hamalayi lhar3@trough touchWater out of reach; ahead: a face at 0.51/1.9/1.91 m, a top 0.63 m high at 0.5 m
hamalayi pim@square pickup out of reach; ahead: a face at -/-/- m, a top nowhere
hamalayi pim@sledge kneelWork out of reach; ahead: a face at 1.42/-/- m, a top 0.26 m high at 1.4 m
house zoe@mark touchWater nothing at the hands; ahead: a face at -/-/- m, a top nowhere
house zoe@table setDown nothing ahead; ahead: a face at -/-/- m, a top 0.78 m high at 0.7 m
isle_celebration ce_lanterns@la_stand tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_celebration ce_lanterns@la_pole reachHigh nothing ahead; ahead: a face at -/-/- m, a top nowhere
isle_knartas kn_fisher@fi_barrel reach out of reach; ahead: a face at -/-/- m, a top nowhere
isle_knartas kn_fisher@fi_crates setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
isle_knartas kn_mother@mo_crates tinker nothing at the hands; ahead: a face at 0.64/-/- m, a top 0.69 m high at 0.65 m
isle_knartas kn_nets@ne_crate setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
isle_knartas kn_nets@ne_rack2 tinker out of reach; ahead: a face at 1.01/1.01/1 m, a top nowhere
isle_liftdock ld_crane@cr_dock tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_liftdock ld_load1@l1_a setDown nothing ahead; ahead: a face at 0.58/-/- m, a top 0.73 m high at 0.6 m
isle_liftdock ld_load1@l1_b setDown nothing ahead; ahead: a face at 0.58/0.59/0.59 m, a top 1.35 m high at 0.6 m
isle_liftdock ld_load2@l2_a setDown nothing ahead; ahead: a face at 0.67/1.16/1.16 m, a top 0.72 m high at 0.7 m
isle_mosquibee mb_tend1@t1_bed potting nothing at the hands; ahead: a face at 1.27/0.78/- m, a top 0.3 m high at 0.55 m
isle_mosquibee mb_tend1@t1_honey setDown nothing ahead; ahead: a face at 0.68/0.8/- m, a top 0.63 m high at 0.7 m
isle_mosquibee mb_tend2@t2_bed potting out of reach; ahead: a face at -/0.79/- m, a top 0.3 m high at 0.55 m
isle_oldwatch ow_mason@ma_dome tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_oldwatch ow_mason@ma_back setDown nothing ahead; ahead: a face at 1.25/1.25/1.26 m, a top 0.75 m high at 1.25 m
isle_orchard or_carter@ca_pad setDown nothing ahead; ahead: a face at -/-/1.76 m, a top 1.48 m high at 1.2 m
isle_orchard or_pell@pe_crates tinker out of reach; ahead: a face at 0.49/-/- m, a top 0.53 m high at 0.5 m
isle_orchard or_pell@pe_crates2 setDown nothing ahead; ahead: a face at 0.59/-/- m, a top 0.78 m high at 0.6 m
isle_orchard or_pell@pe_bed tinker out of reach; ahead: a face at 0.73/-/- m, a top 0.4 m high at 0.4 m
isle_orchard or_pick1@p1_bed kneelWork out of reach; ahead: a face at -/-/- m, a top 0.67 m high at 1.35 m
isle_orchard or_pick1@p1_crates setDown nothing at the hands; ahead: a face at 0.59/-/- m, a top 0.78 m high at 0.6 m
isle_orchard or_pick2@p2_honey setDown out of reach; ahead: a face at 0.93/-/- m, a top 0.36 m high at 0.65 m
isle_otringal ot_tanek@ta_stall tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_otringal ot_tanek@ta_cloth setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
isle_otringal ot_ulla@ul_stall tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_otringal ot_ulla@ul_crates tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_otringal ot_ulla@ul_back setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
isle_platform pf_chaplain@ch_bell tinker out of reach; ahead: a face at -/-/- m, a top 0.24 m high at 0.35 m
isle_platform pf_foreman@pfo_crates tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_platform pf_miner1@m1_mine tinker nothing at the hands; ahead: a face at 1.34/2.08/2.08 m, a top 0.25 m high at 0.55 m
isle_platform pf_miner1@m1_crates setDown nothing ahead; ahead: a face at 0.67/-/- m, a top 0.58 m high at 0.7 m
isle_platform pf_miner2@m2_mine tinker nothing at the hands; ahead: a face at 1.44/1.96/1.96 m, a top 0.25 m high at 0.6 m
isle_platform pf_miner2@m2_barrel reach nothing at the hands; ahead: a face at 1.89/-/- m, a top 0.24 m high at 1.6 m
isle_platform pf_vill1@v1_home tapTurn nothing at the hands; ahead: a face at -/-/- m, a top 0.22 m high at 1.95 m
isle_platform pf_vill1@v1_barrel reach out of reach; ahead: a face at 1.01/1.16/- m, a top 0.46 m high at 1.05 m
isle_platform pf_vill2@v2_crates setDown nothing ahead; ahead: a face at -/-/- m, a top 0.19 m high at 1.25 m
isle_platform pf_vill2@v2_bench setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
isle_undergas ug_carrier@ca_a setDown nothing ahead; ahead: a face at 0.63/0.63/0.71 m, a top 0.72 m high at 0.65 m
isle_undergas ug_carrier@ca_b setDown nothing ahead; ahead: a face at 0.71/0.7/- m, a top 0.65 m high at 0.7 m
isle_undergas ug_carrier@ca_barrel reach out of reach; ahead: a face at 0.39/0.4/- m, a top 0.69 m high at 0.4 m
isle_undergas ug_fitter@fi_pump tinker out of reach; ahead: a face at 1.09/1.08/1.08 m, a top 0.4 m high at 0.55 m
isle_undergas ug_fitter@fi_holder tinker out of reach; ahead: a face at 1.24/1.24/1.24 m, a top 0.43 m high at 1.2 m
isle_undergas ug_foreman@uf_pump tinker out of reach; ahead: a face at 0.95/0.95/0.95 m, a top 0.39 m high at 0.6 m
isle_undergas ug_gauge@ga_holder tinker nothing at the hands; ahead: a face at 1.18/1.22/1.22 m, a top 0.4 m high at 1.15 m
isle_undergas ug_gauge@ga_holder2 tinker nothing at the hands; ahead: a face at 0.62/0.62/0.62 m, a top 1.04 m high at 1.05 m
nellhouse wim@wim_parts setDown out of reach; ahead: a face at -/-/- m, a top 0.45 m high at 0.55 m
obsv keeper@wall tinker out of reach; ahead: a face at 0.42/-/- m, a top 0.59 m high at 0.45 m
office mira@plant potting nothing at the hands; ahead: a face at 1.06/-/0.38 m, a top 1.16 m high at 0.4 m
tavern luc@luc_serve setDown nothing ahead; ahead: a face at -/1.1/- m, a top 0.79 m high at 0.7 m
tavern luc@luc_stack setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
terminal bern@bern_list tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
upper up_clerk@uc_board setDown nothing ahead; ahead: a face at 0.82/0.82/0.85 m, a top 1.13 m high at 0.8 m
upper up_courier@uk_counter setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
zeelich ilo@ilo_stall tinker nothing at the hands; ahead: a face at -/-/- m, a top 0.28 m high at 1.5 m
zeelich ilo@ilo_fount touchWater out of reach; ahead: a face at 0.62/-/- m, a top 0.72 m high at 0.55 m
zeelich kira@kira_a kneelWork out of reach; ahead: a face at 1.15/1.72/1.9 m, a top 0.68 m high at 1.1 m
zeelich kira@kira_draw reach nothing at the hands; ahead: a face at 1.78/-/- m, a top 0.72 m high at 1.75 m
zeelich kira@kira_b potting out of reach; ahead: a face at 0.83/1.49/- m, a top 0.45 m high at 0.85 m
zeelich oku@goods tinker nothing at the hands; ahead: a face at 1.88/1.88/- m, a top 0.97 m high at 1.85 m
zeelich zc_clerk@cl_in tapTurn nothing at the hands; ahead: a face at -/-/- m, a top nowhere
zeelich zc_courier@co_in tapTurn nothing at the hands; ahead: a face at -/-/- m, a top nowhere
zeelich zc_petit@pe_fount touchWater nothing at the hands; ahead: a face at 2.07/-/- m, a top 0.72 m high at 2 m
zeelich zr_fennick@fen_dark kneelWork out of reach; ahead: a face at 0.48/1.18/1.18 m, a top 0.56 m high at 0.5 m
zeelich zr_oma@oma_box setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
zeelich zr_rezz@rez_ship tinker nothing at the hands; ahead: a face at -/-/- m, a top 0.31 m high at 1.3 m
zterminal pask@pask_gate setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
```
