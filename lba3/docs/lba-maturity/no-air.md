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
| The screwdriver laid down (66.65–67.15) | It left his hand 11 cm from where it then lay (a jump in one frame). | His hand is solved to hold the tool exactly where it will lie; it lies by the table's near edge now, pointing away from him. | See the test line below. |
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
  round their state gives them,
- the room people who walk a track (hamlife.js, isleslife.js, deeplife.js), played for 64 s.

Each stop's pose is played on the person's own rig at the stop and the working hand's least gap over the action is
taken (both hands for tinker, potting, kneelWork, search, use, pump; the right for reach, tapTurn, touchWater, setDown,
pickup, reachHigh). An offender: a working hand more than 5 cm from any drawn surface, or a standing sole more than
6 cm off the ground. `wipe` (hands dried on the apron: the body's own surface) and `warm` (a hand held out to a heat
post's warmth) are listed, not measured.

### What was changed (all generic; no per-stop edits yet)
1. **Hands are put on what stands there** (`src/game/workhands.js`, a layer at the end of `Rig.update`, set on every
   NPC): for a work action the top of the table, bench, crate, sill or rim in front (or the ground, for the actions
   that go down to it), or the face of the wall, post, loom or door, is read from the physics' colliders once per stop,
   and the arms are solved for the palms each frame on top of the action's own pose (with up to 0.64 rad more bend of
   the chest when the thing is low or far). Not run for people the far / out-of-view posing rate skips.
2. **Stops are stood at an arm's length** (`workSpot`): a round's work stop is moved along its own facing until its
   thing is 0.5 m from the body's middle (the stops were set 0.8–1 m off: a walker's berth), where the place is free.
   Residents' rounds (walkers.js `setRound`), the cast rounds and the household rounds (roomlife.js).
3. **A track's walk ends on its spot** (engine/scripts.js `goto … near`): the room people's walks ended anywhere within
   half a metre of the spot they then worked at.
4. **Nothing there: no miming.** Where no surface is in reach the action is stood down (`Rig.standFor`): the person
   stands at the stop instead of working the air. The sweep lists these as STOOD.
5. Arthur's boat stand (Phase 1) is also where he works in play (his mark's `kneelWork`): the hull's deck has a
   collider for his hands.

### Numbers
The sweep could not be run whole: the machine was shared (load 15–32 on 4 cores, memory short), and pages with every
area built died for lack of memory. What was measured:

| Run | States covered | Distinct work cases | Hand in the air (> 5 cm) | On a thing | Stood down | Own body / warming |
|---|---|---|---|---|---|---|
| Base (ba23dfa6) | well, project ×2, zeelich ×2, dig (6 of 21) | ~220 | **172** (tinker 67, setDown 41, reach 20, kneelWork 16, tapTurn 11, touchWater 8, potting 6, other 3); typical gap 20–80 cm | ~30 | — | 14 / 4 |
| After, changes 1–4 | well, project, zeelich, dig (4 of 21) | 219 | **66** | 61 | 77 | 14 / 4 |
| After, as committed (a one-off action's look-ahead made stricter) | well only (1 of 21) | 99 | **21** (base, the same state: 74) | — | — | — |

Feet: no standing worker's sole more than 6 cm off the ground in any run (0 offenders, before and after).
The other 15–17 states (chapters 5–13) were not measured after the change. They run the same code on the same kinds
of stops; their numbers are unknown, not assumed.

`tests/no-air.mjs` therefore **fails today** on its hand check, by design: it lists what is left.

### Left (honest list)
1. **Hands on a collider that is not the thing's drawn surface** (most of the 66): the layer reads colliders, the sweep
   measures triangles. Where a prop's collider is a wide box or cylinder round a thinner thing, the palm is put on the
   collider's face, 6–60 cm from the mesh. Measured in the four states:
   - Citadel: garrick@gar_tap, tobb@tobb_stall, gurt@gurt_trolley, nell@mark (6 cm), and the four house-door knocks
     (maro, tilde: the door is set 14–17 cm back in the wall's collider);
   - Zeelich: kira@kira_b, zr_fennick@fen_dark, @fen_post1, zr_oma@oma_box;
   - Desert: dg_cook@cook_pot/@cook_pour/@cook_table, dg_clerk@clk_b, dg_mech@mech_pile/@mech_stake/@mech_fence,
     dg_dig@dig_pile/@dig_rim, dg_surv@surv_scope, safi@safi_door, dkid@pebble (a pickup 36 cm over the sand);
   - the Hamalayi: lh_sana@sana_barrels/@sana_rack, lh_tam@tam_wood4/@tam_fire, lh_grum@grum_cart/@grum_crates,
     lh_bero@bero_cart, lh_mira@mira_pot;
   - rooms: zoe@table and @stove (5.7 cm), hedda@hedda_stove (6 cm), wim@wim_bench/@wim_parts, luc@luc_serve,
     osk@osk_crates, pask@pask_gate, il_zuzz, il_avra (5.4 cm);
   - islands: Knartas kn_mother@mo_crates, kn_nets@ne_rack1/2; Mosquibee mb_bzzra, mb_tend1, mb_tend2 (the hives);
     Old Watch ow_mason; the Orchard or_pick1, or_pick2, or_pell; the Platform pf_vill1, pf_vill2; Under-Gas ug_gauge,
     ug_fitter, ug_foreman (the pump's round collider).
   The fix per stop is one of: give the prop a collider that is its top or face; move the stop; or name it in
   `workhands.js AIR_STOPS` ('who@stop': the person stands there instead). The list is in place and empty: nothing was
   added to it without a sweep to check it.
2. **77 stops stood down** (in the four states: Citadel 9, Zeelich 8, Desert 12, the Hamalayi 7, the islands 34, rooms 7):
   nothing was in reach, so the person now stands at the stop instead of working. Each wants a small prop (a bench, a
   crate, a pot) or a new place. None was added: no prop was placed without a picture to judge it by.
3. **The story's placed poses** are not moved (a chapter's mark is checked by its own tests): chapter 2's worker at the
   lift plays `use` 42 cm from the mast (the lift now has a control he could be put at).
4. **Scripted scenes** in src/game/story/*.js other than the opening were not swept: their people get the hands layer
   like everyone (it runs wherever an NPC plays a work action), but no scene was measured.
5. **Looks**: the hands layer has not been looked at in play (only measured). A deep bend to a low crate (up to
   0.64 rad on top of the action's own) may read as too much; palms lie flat on tops whatever the action.
6. **Cost**: not measured. The layer solves two arms per visible worker per frame (about thirty small matrix updates
   each) and reads a handful of colliders once per stop; no frame time was taken.
7. The opening's Arthur close-ups stay on his face; his hands' work shows in the wide shots only.
