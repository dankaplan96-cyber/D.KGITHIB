# Orders from the cloud to the laptop (3.11.2026, night mode)

> **4.11.2026: the cloud moves to a new session** (the user's decision). Talk to the cloud through the repository only
> (`WORLD_ART_REQUESTS.md` for requests and questions, pushed); direct messages to the old cloud session will not be read.
> The new session starts from `docs/HANDOFF.md`.


The user, 3.11: "Give instructions and tasks to the local agent too. We're going into night mode." Work them in this
order, one at a time, through the usual loop (`docs/future/LOCAL_EXPANSION_PROMPT.md`): build, picture, test, send the
diff as a request in `WORLD_ART_REQUESTS.md`, push. The user's rules override everything (English player text, no
Earth-style night, FunFrock dead, Vesk the villain, planets only by spaceship, Esmer / Wannies, numbers and
descriptions only from LBA1/LBA2, no spoilers past chapter 2 to the user).

New standing rule (the user, 3.11, `WORLD_CONSISTENCY.md` R11): **every place has a meaning for the journey, even a
small one; no superfluous LBA1/LBA2 places, no cacophony of buildings.** Apply it to everything you build or dress.

## Tonight's queue
1. **ASYLUM-2** (answered in `WORLD_ART_REQUESTS.md`, "the cloud's answer"): build the two entrances as LBA1 had them,
   the Esmer workers' hostel dressing, Vesk's store behind it (crates stamped ZEELICH, the hidden humming crate, his
   locked office separate from the foreman's), the plaque at the old bricking ("SEALED BY ORDER OF THE CITADEL ISLAND
   COUNCIL AFTER FUNFROCK'S FALL. NEVER AGAIN."), the front sign, and the `R.npcSpots` handles named there. Pictures
   from the play camera. The cloud writes the people and the story on your handles after the merge.
2. **Real-hardware checks of what merged today** (you have the GPU; the cloud has only SwiftShader):
   - `tests/playthrough/14-shell` (CAMPAIGN-2's choice) and, once, the whole chain 01–14; report verdicts.
   - The asylum's frame time and draw calls after ASYLUM-1 (about 40 cut-away lids; merge the fallback lids if
     they cost).
   - Pictures of the Wannies' platform and Otringal under the new skies (SKY, WANNIE) from the play camera; fix what
     reads wrong.
3. **Cacophony** (from `docs/future/CLUTTER_AUDIT.md`): Citadel's harbour has four building styles in about 45 m;
   bring it to one or two that belong to LBA2's harbour, without moving story places. Otringal's ~55 identical
   shells: fewer, varied, each lane with a reason (the declutter work in the cloud is cutting the islands with no
   use; check `CLUTTER_AUDIT.md` before you touch an island).
4. **W-1 (Float Harbor):** still waits on the user's approval of its pictures. When the user is back at the laptop,
   show them the pictures and ask; do not build W-2 before that.

## Coordination
- The cloud is working on: the follow camera after doors and the rooms' scale and detail (`rooms-cam`), the
  declutter cuts and purposes (`declutter`: the CX islet, Tralu Rock, the Hamalayi camp and causeway, the office
  behind the bar, the west islet's dome, six Desert Island leftovers; new purposes for Citadel's shop house, the
  School's second building, Zeelich's dog yard, three Desert Island houses). Don't touch those files until they merge.
- LINE-CLEAR-1 is queued in the cloud after `declutter` (it touches `zislands.js` too).

## Added 4.11.2026 (the user's playtest notes; the laptop owns world art)
5. **Citadel: the way up to the tavern.** The user: "In LBA2 the climb to the bar in Citadel was paved and orderly; now it's dirt again." Pave the
   approach and steps up to the tavern (`south` house) as LBA2 has it (numbers and descriptions from CITADEL.ILE only),
   in the town's paving kit; keep story spots and colliders.
6. **Zeelich doesn't look like LBA2's Zeelich** (the user, after seeing it). Compare the hub (Zeelich street, Baldino's
   workshop side, the spaceport deck) and Otringal against LBA2's references from the play camera; list the biggest
   differences (silhouettes, colours, building types, ground, sky) and fix the top ones within ALIGNMENT.md's 80 %
   likeness and R11 (every place a meaning). Pictures before/after for the user.
The cloud is working on (don't touch): chapter 1–2 staging and cinematics (Vesk's ship and arrival, the crystal and
Sendell scene, the beam pad after Vesk, Doran's walk, the follow camera against walls) and the audio (Sendell's voice,
Vesk vs Twinsen, the music crackle).

## Orders of 5.11.2026 (the second cloud session; the user: "give tasks to the local agent")
Done since the last orders, so take them off your list: order 1 (ASYLUM-2: built by you, its story written by the
cloud), order 3 (HARBOUR-1, OTRINGAL-1), order 5 as corrected (CLIMB-1), TREES-1. All applied on
`ccr-adf00ea7-37ebl3` (25af69c); base your next diffs there. The cloud is no longer working on the chapter 1–2 staging
or the audio: those files are free again. Work in this order, one at a time, the usual loop (build, picture, test,
request diff in `WORLD_ART_REQUESTS.md`, push).

7. **Real-GPU check of what the cloud changed (first, short; the cloud has SwiftShader only).** On the laptop's GPU,
   Medium, plugged in: the asylum hostel with its seven people and two guards (frame time and draw calls at the
   dormitory, the mess and the store: the room was the heaviest LBA1 room already); walk out of Twinsen's house and
   two shop doors with Settings → Camera on Follow (`Game.doorStep`: he lands 1 m further out; the camera should start
   behind him at a normal angle, not over his head; say if any door now puts him somewhere odd); Sendell's call
   (the "crystals take in the ball" shot, now wide). Pictures of each for the user (chapters 1–2 only). Report in
   `WORLD_ART_REQUESTS.md`; fix nothing of the cloud's, just report.
8. **The hostel's leftovers (yours, ASYLUM-2):** the potted plant in a wall collider (room point (2.25, −22.11));
   grass to the front step (`keepClearNew`); and look at Old Kesso sitting on the mess bench and Wix asleep in the
   lower bunk (`R.npcSpots` worker4 'sit', sleeper 'lie': the cloud pins them at your `y`, a new rig pose 'sleep'):
   if either floats or sinks into the furniture, correct the spot's `y` or `a` in `asylumhostel.js`.
9. **Order 2's remainder:** the playthrough chain 01–14 and 14-shell on the GPU once; the skies' pictures (SKY,
   WANNIE) from the play camera. Verdicts in `WORLD_ART_REQUESTS.md`.
10. **Order 6 (as before): Zeelich closer to LBA2's** — the hub (Zeelich street, Baldino's workshop side, the
   spaceport deck); Otringal's part is done by OTRINGAL-1. List the biggest differences first (silhouettes, colours,
   building types, ground, sky), then fix the top ones within 80 % likeness and R11. Before/after pictures, but these
   are chapter 3 on: put them in `docs/future/world/` and ask the user before showing (no spoilers past chapter 2).
11. **Chapter 10's glider at Citadel (small; later chapter, no pictures to the user):** the glider film now flies the
   parked glider (`network.js`, `CITADEL_LANDING` + (5, −3)); from the film's camera a pine and the cliff rock hide it
   for part of the take-off. Move the parked glider (or that pine) so the take-off reads; keep Hesk's spot and the
   landing. Same check at Desert Island and the Hamalayi.
12. **Expansion (branch `expansion/ballastra`): W-2 "The Arch District" is Ordered** in `EXPANSION_WORLD_SPEC.md`
   (5.11), with the user's note on W-1 as its brief: Ballastra must read as a city that lives by the water's level,
   in form, not colour. Build it there after 7–9 (it is the longest); pictures to `docs/future/world/W-2/` and to
   the user (they have seen Ballastra), canal levels 0 and 1 from the same spot.
13. **WA-10's open point, Desert Island's grey rock (handed back to you: it is texture work).** The original shows grey
   rock outcrops over about 24 % of the island; ours are few and reddish-brown. The cloud tried the terrain's vertex
   colour (`desert.js` COL.rock → grey-beige, slope from 0.65): almost no visible change, so the colour comes from the
   cliff splat texture (`TX.cliff`) and the rock meshes. Make the outcrops grey (and more of them on the steep slopes)
   within 80 % likeness; before/after from above and from the play camera. Chapter 4 on: no pictures to the user
   unless asked.
14. **The polish passes' visual leftovers (5.11; yours: art, lighting, placement; chapters 1–2 unless marked):**
   (a) leaving the hostel by its north door with Follow: a cream band fills the bottom of the frame for a moment (the
   camera behind the portico top, the 1 m near-cut slices it): `asylumhostel.js` portico or a camera nudge, say which;
   (b) the lantern beside most street doors shows at the frame's lower right for a moment after leaving (cosmetic);
   (c) the wizard tent's door: a tall grass blade and a bush in front of the Follow camera; (d) the tavern cellar's
   lower floor near-black (R8 "never dark"); (e) `GL_INVALID_OPERATION: texture format/sampler type mismatch` warnings
   in the console (SwiftShader only? check on the GPU); (f) Citadel landing (−58, −60): two low plant colliders overlap
   the landing spot; (g) later chapter, no pictures to the user: the Hamalayi parked glider seems to cut into the
   monastery wall by the frozen chest (with order 11). Report in `WORLD_ART_REQUESTS.md`.
15. **CLIMB-1, the user's second look (5.11): "still a hole here, and it isn't like the structure in LBA2".** The hole is
   fixed by the cloud (the ground across the ramp's second leg is filled level to its retaining wall: it fell 1.1 m
   toward the wall's foot under the stone house's pad ease, `lba1places.js climbRampFill`, applied last in
   `world.js islandHeight`). The likeness is yours: compare the ramp and its wall with LBA2's climb north of the square
   (31_game_bugstreet_north: the build of its walls, posts and rails, the proportions, the steps), list the biggest
   differences and fix the top ones within 80 % likeness and R11. Before/after pictures from the play camera (chapter 1–2
   place: the user may see them).
16. **The asylum flight's top (the user, 5.11, three photos; chapters 1–2: pictures may go to the user).** (a) "Still
   crooked": the flight's axis (ASYLUM_STEPS a (−33.0, −37.2) → b (−31.5, −47.5)) is 8° off the terrace and the hostel's
   portico, which stand square: at the top the sandstone landing meets the square grey terrace at a slant, a cheek post
   stands in the way between the landing and the terrace. Square the flight to the portico if the water main's legs,
   the stump's clover and the stone house's upper door allow it (move them if they must move), or square the landing.
   (b) "A strange gap": between the flight's east cheek (o = +1.7) and TERRACE_RAIL's first run (x −28.4, z −46.6 →
   −42.95) a trench 1.4–2 m wide down to the cliff rock, two railed walls side by side. Make it one: the terrace carried
   on to the cheek as a retaining wall (the flight cut into the terrace, as LBA2's climbs), or the cheek and the rail one
   wall. (d) The camera at the top (the user: "going up the stairs the camera sticks to Twinsen"): the terrace
   before the fort's south wall is only ~2.5 m deep behind the flight's top, the wall 5.6 m high, so Follow's arm has
   no room and rises over his head at 1.4–3.2 m (camera.js MIN-VIEW, by design). If (a) squares the flight, give the
   landing ≥ 4 m before the wall, or say so and the cloud makes the camera look along the terrace there. The cloud's terrain fill helper is `lba1places.js climbRampFill` (applied last in `world.js islandHeight`). (c)
   With (a)–(b), order 15's likeness to LBA2's climb. Before/after from the play camera (Follow, medium).
17. **The climb's foot, straight (the user, 6.11, a photo from the ramp at the flight's foot: "can't it be
   straightened? it doesn't look good"; chapters 1–2: pictures may go to the user).** CLIMB_RAMP's second leg
   (−37, −20) → (−34, −36) runs ~10.6° off the flight, which starts square at ASYLUM_STEPS.a (−32.6, −35.0) heading due
   north; the round FOOT apron (−33.3, −36.4, r 2) between them, the parapet slanting in at the left and the cheek posts
   square make the join read crooked. Make the ramp's last stretch (at least ~6 m, the parapet and its wall with it) run
   on the flight's own axis, x −32.6, straight into the first step, so ramp, parapet, kerbs and flight are one straight
   line; replace the round apron with a square landing the flight's width (plus the cheeks); keep world.js PATHS[0]'s
   later points, the ground under the paving level across (climbGround / climbRampFill), and STEP_UP-safe risers. Also
   the dark notch at the left cheek's foot beside the first step (in the photo, left of Twinsen): close it. Same play
   camera (Follow, medium) before/after from the ramp below, and run lba1rooms, asylum, rocks, world-consistency,
   overlaps, chapter1.
18. **A player's-eye art review, region by region, on the GPU (the user, 6.11: "all these notes are only from Citadel,
   I'm afraid what happens in the other places"; "3 agents at a time and give tasks to the local agent").** The cloud
   runs agents too: Desert Island now (camera, people, logic, music), then the others; you own the art, so you take the
   art side first where the cloud is not yet: **(a) Zeelich and its nine islands, Otringal included; (b) the Hamalayi
   (the village, the pass, the monastery, the observatory); (c) the underground (`c3*`, the shaft to the core).** Walk the
   story's own routes (tests/playthrough 06–14 are the routes) with Follow, distance Medium (the user's setting), and
   look for what the user found in Citadel today: crooked joins (stairs or ramps meeting at an angle, paths into walls),
   holes and troughs beside walls, trenches beside stairs, dark notches, black voids where floors end, floating slabs or
   black-sided boxes in rooms, doubled floors, rocks or props cutting through buildings, the camera zooming in or flailing
   in passages and on stairs (report those to the cloud with coords: the cloud's camera agent is on camera.js now), two
   near-identical characters side by side. Fix the art at its cause; before/after pictures (chapter 3+: keep them, not
   for the user); report each region in `WORLD_ART_REQUESTS.md` with a table (spot, what a player sees, fixed / for the
   cloud). One region per request diff (REVIEW-ZEELICH, REVIEW-HAMALAYI, REVIEW-UNDER), smallest first is fine.
19. **Music by place (the user: "the asylum should have a different tune"):** the cloud gave the asylum the facility piece
   (main.js ROOM_MUSIC asylum: 'stealth'). List every room and region and its music mood (main.js ROOM_MUSIC, R.music,
   engine/music.js MOODS) and say where the piece does not fit the place as LBA1/LBA2 scored such places (a prison, a
   temple, a cave, a shop, a ship); if a new piece is needed, write it with the repo's own music tools
   (tools/music/tracks/*.py, original compositions only — never LBA's music) and wire it. Chapter 1–2 places first.
20. **ASYLUM-4 against LBA1 itself (the user, 6.11: "check how they did it in the first game"; "the local agent has the
   LBA1 files").** The cloud's agent fixed the asylum's look without LBA1's files (the cloud machine has none): from
   `assets/lba1/asylum.json` it lit the room from the camera's side (`R.indoor.sunDir` (0.3, 0.8, 0.5), sideGain 2.8),
   drew the nine-cell lamps and tables and the pipe runs as lamps, tables and round pipes (`lba1room.js opts.fittings`),
   and stone post tops (`opts.capStone`) — merged as ASYLUM-4 (6dc37340), published (v51). Three of its before|after
   pictures (our game only, no LBA1 art): `docs/future/world/ASYLUM-4/`. **With LBA1's own files:** render the asylum the way LBA1
   draws it (its bricks, its camera) at the same spots (the user's two photos: the west landing by the tall maroon post;
   the loft by the clothes line) and compare with ours on the GPU: wall and floor tones and texture, what LBA1 shows past
   a floor's edge, the camera-side walls' height, the lamps/tables/pipes' look and placement (the agent's reading:
   lamps 10 3 13 / 2 1 5 / 12 4 11 slope patterns over the loft, the kitchen counter, the upper walk, the office desk;
   254 pipe cells), what LBA1 has that we lack. Fix the biggest differences within 80 % likeness and R11 (numbers and
   descriptions only from LBA1, never its bricks or pictures in the repo). Left by the agent: pipe-colour cells that are
   not runs still boxes; a few pipe ends capped in mid-air; the lamp over the upper walk reads as standing near the floor.
   Before/after from the room's own camera (chapters 1–2: the user may see them).
21. **A slide trap at the east flight's top (the cloud's camera agent, 6.11; small, urgent: the user plays there).** The
   top step of the 6-step east flight ends at x −28.99; just past it, at x ≈ −28.9 … −28.8, z −46.3 … −45.2, the ground
   is 0.6–0.9 m lower and steep: Twinsen slides against the step, sticks, and after 1 s `actors.js respawnFromFall`
   teleports him back (and costs a life) — the likeliest cause of the user's "the camera lost its balance" on the
   forecourt. Fill that strip level with the forecourt (climbGround / the fill) or close it with the cheek; check by
   standing and turning there, and walking the east flight both ways.
22. **Desert Island, the cloud's player's-eye review (6.11; chapter 4+: pictures stay with you):** fixed by the cloud:
   Hesk off the yacht and the glider, the yacht's collider turns with it, Oni and Doran placed, the NO FERRY slate in
   chapter 5 only, the island's glider hidden until chapter 6. **Yours (art):** (a) the School sign "SCHOOL OF MAGIC"
   (desertold.js:237 → desert.js `signAt` ~1531) reads mirrored from the bridge and on the way out: two front-facing
   planes back to back instead of one double-sided; (b) the project ferry at the pier (desert.js 564–573): a teal box
   with a roof floating over a thin white sliver of hull and a bright cyan disc: a closed hull with a deck, the disc
   softened or gone; (c) the hangar tarp (condenser.js ~151, 10.5 × 6.2 m) overhangs the floor's rim and Twinsen's legs
   are inside its edge at the boarding spot: ~9 × 5 or its edge raised; (d) the School's interior wall at (5588.2, 0–3,
   −12…−2.8): two textures in one plane (wizards.js school shell); (e) the pump pipe (desert.js ~720, no collider) is
   walked through at the joint: bury or lift it, or a thin collider; (f) the Bù maze (lba1places.js buildLba1Temple):
   dark tops read as trenches and light floors as wall tops: darker floors or lighter wall tops (with order 20's LBA1
   look); (g) the School's pits: piles of shiny black boulders; (h) the School pupils reuse Lulu and Tim (sc_pupa/
   sc_pupb, sc_in1/sc_in2): other kid looks so Citadel's named children don't seem to be there. Report in
   `WORLD_ART_REQUESTS.md` (REVIEW-DESERT-ART).
23. **Zeelich and the isles, the cloud's player's-eye review (6.11; chapter 3+: pictures stay with you):** fixed by the
   cloud: the Esmer shuttles hidden while the routes are grounded, the cog's star after Oku, Tib/Marl/the council guard
   placed, the Dark Monk's temple in the cave piece. **Yours:** (a) **Esmer looks (with order 18):** the game has 6 Esmer
   looks, all named characters (keeper 10×, xil 9×, oku 9×, nara 8×): Kira wears Councillor Sela's look while Sela sits
   in council; Old Ossa and Ennu wear Oku's; Velo and the bar's boss wear Councillor Amaru's; the barkeep and the hotel
   clerk wear the council clerk's. Colours are baked into the poly models: make 3–4 generic Esmer palette variants and
   1–2 Quetch women and give them to the non-named people. (b) The Otringal bar: the door opens behind the back-bar shelf,
   he walks in hidden beside the barkeep (otrbar.js, door left wall z 1.8, spawn LX+1.4): move the door or the back-bar.
   (c) The dog yard's gate (local x −28.9…−27.1, z −17.6) opens 1.25 m from the council house's back wall. (d) The
   Zeelich pier's mooring rope ends in the air (~(2342, 6, 1)). (e) Celebration's summit plaza ("THE FIGURE"): paving in
   sharp folds over the rock, a bench on the slope. (f) Music (order 19): the Otringal bar and hotel and Zeelich's
   terminal play 'home': a livelier bar piece; a muffled Zeelich mood for the terminal (one MOODS entry in
   engine/music.js, as 'office'). Report as REVIEW-ZEELICH-ART.
Cloud, 6.11: MUSIC-19, REVIEW-UNDER and REVIEW-HAMALAYI applied (4713a88f); the Old Asylum rendered with `build.py asylum` (b06d0560, -18.5 LUFS, loop 16.59–111.39 s, 1.57 MB), so `alt` no longer plays.
24. **No two people the same (the user, 6.11: "there are duplicate characters in Citadel, and I suppose elsewhere too: make sure no character is a copy of another"):** fixed by the cloud for colour (DRESS-1, characters.js `dressVariant`/`dressMap`, story/index.js `npcDefs`): 147 people share 51 poly models; everyone who shares a model now gets their own clothes and hair at load (the baked vertex colours of the clothing roles and their shades are remapped; skin, fur and eyes keep theirs; gold and cream trim stays; the person the model is named after keeps the model's own). This covers 23a's palettes. **Yours (shape, which colour cannot change):** the most shared models still read as one body in other clothes: keeper ×8 (Esmer: Ilo, Marl, three guards, Esren), farmerB ×7, desertkid/lharMan/lharWoman/farmerA/clerk ×6, farmerC/oku/archivist ×5. Give each of these 1–2 shape variants (another hat or none, another hair style or beard, a coat length, a heavier or slimmer build) as their own poly models with a LOOKS entry each (`<look>_b`), and say which people take them (by id; the list: `game.npcs.map(n => [n.def.id, n.def.char])`). Their colours will then be varied again by DRESS-1 on top. Report as DRESS-2.
25. **The Hamalayi from the cloud's camera, art follow-ups (REV-HAM, merged 6.11):** the cloud moved the heat station's shed 3.6 m off the post with its pipe low on the snow, the glider field sign beside the glider, the ch 10 glider and landing outside the monastery gate (gate + (6.3, 3.8)), the trail's rope rail (fewer posts, one side per leg, none on rock) and the deep installation's music to the facility mix. **Yours:** (a) look over those four changes from the Follow camera and say if any reads wrong; (b) the vent steam seen from (4254, 16, −47.8) looking west reads as a brown dusty column against the ice: whiter/softer; (c) the two Lhar roof flicker spots overlaps.mjs flags, (4302.15, 14.49, −3.06) and (4305.92, 14.53, 18.11) (you found them on the original too); (d) the Hamalayi outdoors, the observatory and the underground all play The Well: a mountain/monastery piece if you have one in mind (score only; the cloud renders it, as it did the asylum). The cloud's agent is doing the monastery yard's wall gaps, the ch 7 take-off through the signpost, the gallery crystals hiding him, and a general fix for slide traps (sliding into a collider respawns him). Report as REV-HAM-ART.
26. **Citadel from the cloud's camera, art follow-ups (REVIEW-CITADEL, merged 6.11):** the cloud closed the pit north of the hostel stair's landing with a collider (x −33.9…−31.3, z −46.9…−47.7, lba1places.js `climbTerraceFill`), kept scattered boulders off the benches' room (Marda walked over one at (−94.56, 31.16)), renamed the harbour's Esmer trader Neska (two Sefas). **Yours:** (a) that pit still draws as a dark crevice under the terrace edge: fill it to the edge's height; (b) Bug Street's foot (−56…−50, −12…−5): a dirt pocket before the pharmacy and baggage-claim doors, the street ramp's paving and the square's meet in a stepped overlapping edge by the bench (−50, −7); (c) the Water Office (−65.5, 11): a heap of square rock blocks juts into the front yard left of the door; (d) Tralu's cave door (−80.7, 12.9, −83.8): he comes out on a narrow ledge facing the sea with 1.2–1.5 m drops west and north; the way back is a gap at z −82.3 nobody will read: steps west from the ledge and the exit facing along them; (e) Bersimon's tent still plays Home (order 19). Report as REVIEW-CITADEL-ART.
27. **The user's LBA3 Maturity Agent Pack (7.11): your roles.** The pack is installed on the branch: `.claude/agents/lba-*.md` (16 agents) and `lba3/docs/lba-maturity/` (PROJECT_CONTRACT.md, templates, and status.md with who does what). Read the contract and status.md first. The cloud coordinates and runs the code roles two at a time (Zeelich first). **Yours, because they need your machine or your files:** (a) **lba-world-reference-curator**: with the LBA1/LBA2 files you hold (read-only, numbers and descriptions only, nothing committed from them), a matched-location reference set for every revisited place: Citadel first, then Zeelich (it is not one generic island: name each district), Desert Island, the Hamalayi; fill `WORLD_RESEMBLANCE_TEMPLATE.md` per place with the rubric score and its evidence, and `BUILDING_REGISTER_TEMPLATE.csv` for every building (exists in original? has a door? interior? story-locked?). The cloud's buildings-interiors and world-campaign-finisher workers build from these, so Citadel and Zeelich first. (b) **lba-music-director**: the user hears music crackle on their computer while other music plays fine: reproduce it there (Chrome on the laptop, the published page and a local copy), capture before evidence, find the cause (decoding, scheduling, the lowpass/gain moods, loop seams, duplicate sources) and fix it; give scores for missing pieces (mountain/monastery) for the cloud to render. (c) **lba-performance-lab**: the Vega 8 at 1366×768 measurements, battery and plugged-in, before/after each wave the cloud publishes. (d) **lba-world-art**: with orders 24–26. Report each as MATURITY-<role> in `WORLD_ART_REQUESTS.md` with the evidence labels of the contract.
Questions for the cloud: in `WORLD_ART_REQUESTS.md`, pushed. The cloud reads it at the start of each session.
