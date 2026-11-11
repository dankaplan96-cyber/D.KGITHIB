# Strengthening the main campaign: the mapping, the measurement, the waves

The user's brief is `CAMPAIGN-TREATMENT-2026-11-11.md` (verbatim). This file maps it onto the game that exists, records
what was measured, what wave 1 built (the treatment's sections 1–3 in the real chapters 1–3), and what the next waves
build. Base: branch `ccr-c1c2c4b9-dep6ed` at `3ecbf58e`. Labels as in `PROJECT_CONTRACT.md`.

**Evidence.** Everything here is **Automated runtime only** (the player-input bot and scripted probes on SwiftShader in
headless Chromium) or **Source-reviewed only** where it says so. No person has played any of it. No frame rate was
measured, nothing was listened to. Bot seconds are a floor, not a player's time; every first-play minute is an
**estimate** from `chapter-balance.md`'s formula. No hours are claimed.

## 1. The campaign that exists (each real chapter: how it starts, what the player does, what ends it)

"Plays" = the player's own hands (input); "told" = a person does it or says it in a conversation or a scene. Chapters 1–3
are as they are **after wave 1** (the new steps marked ●); chapters 4–12 as on the base (Source-reviewed, and the bot's
steps in `tests/playthrough/07…14`).

| # (key, script) | Starts | The player plays | Told / shown | Ends when |
|---|---|---|---|---|
| 1 The Well (`well`, prologue.js + hometap.js) | the opening film (the tap coughs, runs warm, stops; "I'll check the well"), then the kitchen | ● turns the dry tap by hand (the pipe knocks) · ● carries Arthur's cup from the stove's overflow to the sink · the ball from the cupboard · ● hears the garden pipe and the lane's pipe as he passes · the well, Mira's refusal, Zoé's kettle crystals, the key · the lid kicked (Aggressive) · the bell rung with the ball, Doran's stamp, Xil's rope · (optional: Tim overheard, the bay rocks) · down the well · ● feels the warm pool · mites · three crystals woken with the ball | ● the pump starts above and the growth on the pillar leans (seen, not done) · Sendell's two lines | Sendell has spoken; his last thought: the pump runs in cycles, he will watch the next |
| 2 The Joint Project (`project`, chapter1.js + depotwatch.js + pumpline.js) | by the well; Zoé at home; the ferry brings Vesk (scene) | the pipe map (optional) · three bypass valves (the caged orchard: a lob; the depot: its watch, sneak or fight; the cliffs: the target and the rising stones) · ● his own tap: still dry · ● the pump room on the lane: the wall diagram (two pipes), three pipes felt by hand, the copper one followed behind the pier, the bypass cocks (the wrong one roars and springs back, the right one fills the houses' line), the gauge's strip torn off, the pump's plate read · ● the garden tap, the tap Arthur left open shut by hand · Zoé's office (stealth, the plan) | Vesk's task and tour (● he calls the strip "a pump settling") · the well filling (scene) · ● Zoé's knocks on the pipe (heard below) · the confrontation, Vesk up the beam (scene) · Arthur's radio: Baldino (● who knows Irsa) | Doran flies him to Zeelich (film) |
| 3 Zeelich (`zeelich`, chapter2.js + zeelift.js) | the landing; the guard takes the plan | ● Brel's directions (the brass wheel) · ● the cistern lift: the stair, the safety chain let down onto the cart, the landing bell, the feed switch, the ride up with the cart, the shove along the rails, the cart's cock · ● Irsa's bench: the dial, the crank (a wrong setting answers too) · Baldino · the depot (fight or sneak), the locker · Oku, the old mill's climb, the cog · three mills braked with the ball · Zoé's dials and broadcast (Citadel) · the console | ● Kell's refusal and thanks · ● Vesk on the speaking tube gives the lift the mill line · ● Irsa reads the strip · Baldino's shell · Vesk's refusal, his ship (scene) | the console shows the shaft sealed; Doran flies him home, the ferry south (films) |
| 4 The Dig (`dig`, dig.js) | Kesh's pier; Mother Tarra | the oasis pump's jammed gear (ball), the pipe joint · Hesk's rope, the sand-yacht ride · the notebook in the sandstorm (the gate guard) · the keypad (worn keys, the notebook's order) · the terraces · three warm seals (ball) · Bu's temple | Brosk and Sani diagnose the pump · Ilka explains the crystals and, at the carving, the vents | the great carving is read |
| 5 Steam and Sand (`steam`, steam.js) | Brosk's jar | water carried, the shovel, the buried door dug out · the condenser hall: the diagram, the old trooper, valves 1, 3, 4 · the hangar, the glider's hatch (ball) · Dallan · the relief valve · the run out before the vent blows | Dallan takes the ferry and lists the evacuees (told) · Zoé reads the shell map on the radio (told) | Hesk flies him north in the cargo glider |
| 6 The Pass (`pass`, pass.js) | the gorge | the frozen tree felled (ball) · the heating station: Pim's kite (ball), the fuse · the frozen rope (sword) · two winch trips, ice mites between · the ride up | Yorna knows the road | Lhar is safe in the monastery |
| 7 The Observatory (`observatory`, observatory.js) | the monastery gate | the frozen window (ball), four mirrors, the telescope · the heavy drone · the seal's warm discs (ball) · the vent | Sendell speaks openly (told) · Arthur's radio: Citadel is evacuating (told) | the second vent is open |
| 8 Evacuation (`evacuation`, evacuation.js + shelters.js) | home, changed | Gilbert, Mira, Pippa recruited · the fortress lever (control drones) · the depot wheel (ball) · Zoé's run with the hill families (played as Zoé) · the lighthouse gathering · the control room | Vesk's message from below (told) · Mira finds the old valve room (told) | he boards a project ship for Zeelich |
| 9 The Council (`council`, council.js) | Zeelich's street | the street's people, the petition · Nara's and Oku's stamps (three mills freed, ball) · the clerk · the hearing · the archive in a borrowed coat, the archivist's keys, the BORE cabinet | the council's fear, Dallan's proof (told) · the turn: only the core's console reverses the bore (told) | the council agrees; the network is needed |
| 10 Baldino's Network (`network`, network.js) | Oku | five legs in any order: the old mill's relay (brake, climb) · Citadel's valve room (three valves) and the lighthouse dials · Desert Island's bore relay (drones) · the Hamalayi's dome (telescope) · the code box at the station | the allies answer at each station (told on the radio) | the shaft's blast doors open |
| 11 The Shell (`shell`, chapter3.js) | the lift down | the cooling diagram, valves A and C, the ball switch for the ladder · a patrol drone · the galleries: three pillars (ball), stepping stones | Sendell explains what is under the shell (told) · Baldino on the radio | he walks from Sendell's chamber into the core |
| 12 The Core (`core`, chapter3.js ChapterCore) | Vesk speaks, the guardian comes | three pylons converted by shots banked off copper plates while the guardian fights · the bleed valve · Vesk's coil broken (three hits) · the bore switched to shield mode | Zoé, Mira and Oku power the pylons (radio) · the council's guards take Vesk | the shell holds |
| Epilogue (`home`, epilogue.js) | dinner at home | Keep Exploring (free roam) | the ending | — |

Implemented but not on the base route: the Oren expansion (`expansion/ballastra`, gated: `docs/future/OREN_PROGRESS.md`).
It is not in the base campaign and is not touched here. Design only: everything in section 5 below.

## 2. The treatment mapped onto the real chapters (by events; the numbering differs)

Kept everywhere: the travel order of the game (Citadel → Zeelich → Desert Island ×2 → the Hamalayi ×2 → Citadel →
Zeelich → all regions → the deep installation → the core → home); Vesk is the villain and makes his own choices;
FunFrock is dead; Sendell keeps her part; no second villain is added. The base campaign has no guardian from another
world: Oren belongs to the gated expansion and stays there. Where the treatment says "if a guardian is present", the
base game's own presence under the shell ("her", the young being Sendell watches) takes the event.

| Treatment | Real chapter | What exists already (deepened, never doubled) | What changes |
|---|---|---|---|
| 1 Home — the water stops | 1 The Well | the opening film's tap; the well, the key, the rope, the cave, Sendell | **built (wave 1)**: the tap and the cup by hand, the knocking followed, the warm pool, the growth and the pump, the pump cycle as the reason to stay |
| 2 Citadel — the wrong pipe | 2 The Joint Project | the three valves, the well filling, the tour, Zoé's office, the radio | **built (wave 1)**: the houses stay dry, the pump room, the bypass, the strip, the plate, the street after. "The harbour connection" of the treatment is our project pipe from the old fortress (the bore's station): the pulse comes up it |
| 3 Zeelich — a town that needs the project | 3 Zeelich | the landing, the confiscation, Baldino, the depot, the mills, the shield | **built (wave 1)**: Mill Lane's cistern lift, Kell, Brel, Irsa and her bench. Vesk was confronted on Citadel in chapter 2 and stands behind his shield here, so he "helps restart the motor" from his platform, on the lift's speaking tube: he gives the quarter the mill line and says why |
| 4 The excavation — a test with a cost | 4 The Dig and 5 Steam and Sand | the research post, Dallan, the test bore under pressure, the relief valve | Vesk is sealed in the shaft by then: the controlled test is run with **Dallan** at the instruments and Vesk on the project's wire, the player at the cutoff; the second vibration comes after the stop (three and a rest); Vesk diverts heat to Kesh's oasis pump (a real help); the filed log shows one vibration |
| 5 Hamalayi — the road under the ice | 6 The Pass and 7 The Observatory | the gorge, the winch trips, Yorna, the mirrors and the telescope | the winch line's supports carry the pulse: the trips are timed between surges (seen and heard); the telescope gives the direction: under the installations, toward the shaft |
| 7 The evacuation — Zoé finds the omission | 8 Evacuation | Zoé's run (played), the shelters, the 30 % list | the omitted district is the lane of chapter 2 (the pump room's lane): a project cart passes its closed gate with empty seats; Twinsen opens the way through the pump room; the lane's people (Bram, the neighbours, Pippa) are seen to board. (The treatment has this after its section 6; the game's order keeps it before the council) |
| 6 The evidence — Vesk closes a door | 9 The Council | the archive, the archivist's keys, the BORE cabinet, Dallan's proof | the archive is closed to Twinsen by Vesk's standing order (the reason: a stop before a bypass exists cuts the quarter's water); **Kell takes him up the service lift**; the cabinet holds the unedited test log of chapter 4/5 and the order that cut it, signed |
| 9 The failed shutdown | 9 The Council's end → 10's start | "only the core's console can reverse the bore" (told) | played: the council orders the stop, the player throws it at the platform's console: the drill winds down, the pulse goes on, Mill Lane's lift and taps lose pressure; Baldino's isolator holds one branch at a time (tried on his Test Pair bench, which exists as a side story) |
| 10 The network — allies take responsibility | 10 Baldino's Network | the five legs, the allies on the radio | each ally is seen to take the station over as he leaves it; Irsa takes Zeelich's bypass; Arthur hears the irregular interval (the kitchen's knocking), Mira verifies it on the valve room's gauge |
| 8 Below the shell — someone answers | 11 The Shell | the machinery, the galleries, Sendell | the three-and-a-rest knock is answered: a mechanism replies to a pattern he did not send, he repeats it and gets a different reply, and steers by it; a failing passage is held open for him, later a door is sealed "for his protection" (shown before it is explained). It is "her", not a new guardian; Sendell stays distinct |
| 11 The deep installation — reach the controls | 11 The Shell (its second half) and 12's approach | the catwalk, the ball switch, the stepping stones, the banked shots of chapter 12 | one sustained run: the pulse read to cross moving machinery, a banked throw taught safely before it is needed, a way back opened from the far side, the allies heard, a checkpoint before Vesk |
| 12 The decision — keep the water running | 12 The Core | the pylons, the coil, shield mode, the guards | the last act made specific: one branch rerouted, Irsa's confirmation, the central lock released, Zoé's signal; Vesk's choice is seen and the falsified log and the list are named when the guards take him |
| Playable aftermath | Epilogue | dinner, the end, Keep Exploring | the kitchen: the player turns the tap (cold), Arthur's cup stands under it "just in case", a moment with Zoé |

## 3. The measurement (the main route; side content, idle, loading and repeated failures left out)

**Method** as `chapter-balance.md`: the bot plays each chapter by input from real saves; `tests/lib/stats.js` adds up
game time in free play ("bot s"), apart from dialogue, scenes and loading; a first-play minute is the formula's
**estimate** (1.8 × free play + 60 s a puzzle + 30 s a fight; reading at 200 words a minute), never a measurement.

| Ch | bot s, base (9.11, three runs' last) | est. first play, base (min) | vs the median of estimates (16.9) |
|---|---|---|---|
| 1 | 362 | 19.5 | 1.16 |
| 2 | 655 | 33.5 | 1.99 **over 125 %** |
| 3 | 259 | 17.5 | 1.04 |
| 4 | 212 | 18.5 | 1.10 |
| 5 | 263 | 16.2 | 0.96 |
| 6 | 236 | 14.0 | 0.83 |
| 7 | 222 | 13.3 | 0.79 |
| 8 | 350 | 18.5 | 1.10 |
| 9 | 212 | 15.6 | 0.93 |
| 10 | 542 | 29.5 | 1.75 **over 125 %** |
| 11 | 249 | 13.8 | 0.82 |
| 12 | 66 | 7.3 | 0.43 **under 75 %** |
| Epilogue | 1 | 0.9 | aftermath |

The median core chapter: **254 bot s** of free play, **16.9 estimated minutes**. Against it, chapter 12 is short (the
boss alone), chapters 2 and 10 long (kept by the user's decision of 8.11: long chapters are not shortened). By bot
seconds alone chapters 1 and 8 are also over 125 % (their long crossings).

**The whole campaign is thin.** The estimates add up to about 218 minutes of main route for chapters 1–12 — an
estimate, not a demonstrated time — against the user's goal of roughly 15 hours with optional play. A chapter at the
median is therefore not "long enough": the median is a way to find the outliers, not the target. What is missing is not
minutes but played steps: in most chapters after the third, the problem is found, tested and resolved in a
conversation (section 4).

**Chapters 1–3, this wave** (base `3ecbf58e` and the wave's build, both run in this session, the same bot):

| Ch | bot s of free play: base → wave 1 | walked m | lines · words | est. first play (min): base → wave 1 | what the seconds are |
|---|---|---|---|---|---|
| 1 | 333 → **418** (segments 01 + 02: 241 + 93 → 306 + 112) | 776 → 820 | 64 · 702 → 80 · 894 | 18.7 → **23.4** | the tap, the cup, the two pipes outside (+65 s); the pool and the pump's cycle (+19 s) |
| 2 | 676 → **897** (03 + 04 + 05: 81 + 210 + 386 → 81 + 240 + 575) | 1,471 → 1,864 | 72 · 1,206 → 103 · 1,686 | 32.6 → **43.9** | home, the lane, the pump room and back (+190 s; segment 04's +31 s is the bot's depot fight, not a change) |
| 3 | 235 → **370** (06) | 471 → 525 | 53 · 829 → 81 · 1,305 | 16.8 → **25.5** | Brel, the lift's six hand actions and the ride, the cart, the bench (+135 s) |

The estimates use `chapter-balance.md`'s formula with one more deduction step counted in chapter 1 (which pipe), two in
chapter 2 (which pipe is the new one; which cock) and two in chapter 3 (hook before bell; the dial). They are
**estimates**. The runs: base in `/dev/shm/c1010/base`, wave 1 in `/dev/shm/c1010/new` (logs, stats, traces, a picture
after every step; the session's scratch, not in the repository). Each chain is a new game played by input with Esc →
Save & quit → Continue between segments; no death, no assisted fight in either. Chapters 1 and 3 are now above 125 %
of the old median and chapter 2 further above it: the three chapters the player meets first are the three with a
problem found by hand, and the median moves only when the later chapters get theirs (section 6).

## 4. The missing playable step, chapter by chapter

Did the player discover the problem, test an idea and see the result — or did a person do all three?

| Ch | Discover | Test | See the result | The missing step |
|---|---|---|---|---|
| 1 (base) | told (the film; "I'll check the well") | played (the well's steps) | told (Sendell) | the household problem itself was never in his hands → **built**: the tap, the cup, the knocking, the pool, the growth |
| 2 (base) | told (Vesk names the three valves) | played (the valves) | shown (the well fills) | nothing he found himself; the departure came from a radio call → **built**: the dry lane, the pump room, the strip and the plate |
| 3 (base) | told (Baldino explains the shell) | played (parts, mills) | shown (the shield, Vesk's ship) | no reason to trust Vesk was ever seen; the street was a list of errands → **built**: the lift, the cistern, the bench |
| 4 | told (Brosk, Sani, Ilka) | played (pump, keypad, seals) | told (Ilka at the carving) | the test itself: he never runs the bore's cutoff, never sees the second vibration |
| 5 | told (the diagram; Dallan) | played (valves, the relief valve) | shown (the vent, the geysers) | the cost: Vesk's diversion that helps Kesh, and the log that leaves the second vibration out |
| 6 | told (Yorna) | played (tree, kite, rope, winch) | shown (the lift runs) | the pulse is not in the pass at all: nothing here moves because of it |
| 7 | told (Sendell) | played (mirrors, discs) | shown (the vent) | the direction is told, not read off an instrument he sets |
| 8 | told (the list is known since chapter 2) | played (shelters, Zoé's run) | shown (the gathering) | the omission is never seen happening (the cart that passes the gate) |
| 9 | told (the council) | played (stamps, the archive) | told (the turn) | what the cabinet proves is not his own test; the shutdown everyone argues about is never tried |
| 10 | told (Baldino) | played (five relays) | told (radio) | the allies are voices; nobody is seen taking a station over |
| 11 | told (Sendell) | played (valves, pillars) | told | nothing answers him; the installation is a set of locks |
| 12 | told (Vesk) | played (pylons, coil) | shown (the shell holds) | the last act is a boss pattern, not a decision made with the things he has learned |
| Epilogue | — | — | told (dinner) | the tap is never turned again |

## 5. Wave 1, as built (the treatment's sections 1–3)

| Chapter | Before (base) | Now: what the player's hands do | Where |
|---|---|---|---|
| 1 Home | the film said the tap had stopped; control began with "take the ball" and "check the well"; Zoé had already gone next door | Zoé is still at the sink and Arthur at his boat. The door waits ("the tap first"). He holds his hand under the tap (not a drop; the brass riser beside the picture shakes and knocks three times). Arthur's cup stands on the stove under the boiler's overflow: he lifts it, carries it in his hand to the sink and puts it under the tap; one drop falls into it. Outside, the garden standpipe knocks as he passes, then the copper riser at the shut pump room up the lane ("toward the square"). Zoé is next door by the time he needs her kettle. In the cave he reaches into the pool at the shaft's foot (warm); a moment later a pump starts above (a hum, a shake) and the crystals grown up the old pillar lean toward it. After Sendell's two lines: the pump runs in cycles, he will watch the next | `story/hometap.js`; the kitchen, the yard, the lane, the well cave |
| 2 Citadel | three valves, the well fills, "time to see Vesk"; the departure came from Arthur's radio | The square fills, and his own tap is still dry (his hand again). Zoé stays at it and will knock on the pipe (twice for water). The worker at the pump room's door has opened "two pipes, as on the diagram". Below: a pump room with the fitters' bench, tool board, stool, lunch, hose and spare lengths; the wall diagram (TOWN MAIN: upper → SQUARE, lower → HOUSES); three pipes out of the wall, each felt by hand (the copper one, warm, shivers three beats and rests, seen and heard along its run); behind the brick pier a cock on each old pipe: the upper one roars and springs back with one knock from above (nothing lost), the lower one fills the houses' line (two knocks). The shut copper pipe's gauge still kicks: he tears off its paper strip and reads the booster pump's plate (IRSA'S PUMP WORKS · MILL LANE · ZEELICH · No. 14); the door waits for both. Up in the lane the garden tap runs; at home the tap Arthur left open runs into the sink, cold under his hand (Arthur shuts it); in the square the shopkeeper washes her counter. Vesk, shown the strip, calls it "a new pump settling"; Baldino on the radio knows Irsa | `story/pumpline.js`, `pumproom.js`; the lane's pump house (new, small) and its room |
| 3 Zeelich | the landing, the plan taken, a marker to Baldino's door | No marker: Brel, a docker at the bridge's mouth, gives the way (left at the mill, the brass wheel on a mast). The cistern lift has stopped half way with the quarter's water cart; Kell holds the brake and will not let it move with the cart loose and the dockers carrying under it. The stair to the upper landing; the frame's chain let down onto the cart by its hand wheel; the landing bell (it waits for the hook). Kell clears the lane; Vesk answers on the speaking tube and gives the lift the mill line ("we disagree about numbers, not about water"). The feed switch; the deck comes down; he steps on at the cart's bar and rides up with it; a shove sends it along its rails to the filler, its cock opened by hand; the float climbs, the standpipe below runs, Brel fills up. Irsa's bench runs off the cistern: her test pump's dial set to the strip and cranked — the same rhythm, the needle the other way. A wrong setting cranks too and proves nothing. Baldino would not start without that | `story/zeelift.js`, `zlift.js`; Mill Lane between the spaceport's bridge and the Esmer street |

**New flags only** (old saves load and go on): `pr_v2 pr_tap pr_cup pr_zoeOut pr_yard pr_lane pr_pool pr_growth` ·
`ct_v ct_dry ct_worker ct_roomIn ct_diagram ct_felt ct_seen ct_wrong ct_bypass ct_strip ct_plate ct_home ct_tapShut
ct_wback` · `zt_v zt_seen zt_brel zt_kell zt_hook zt_bell zt_feed zt_ride zt_shove zt_water zt_kellThanks zt_irsa
zt_irsa2 zt_bench zt_bal zt_fall`. A thread is on only in a game that reached it with its marker (`pr_v2` set by a new
game; `ct_v` at chapter 2's start, or in a chapter-2 save from before that has not brought the water back yet; `zt_v`
when he lands on Zeelich carrying the strip). Without the marker every new step counts as done: the cup stands in the
sink, the bypass is set right, the lift is mended and the cistern full, and the chapter plays as it did.

**Files.** New: `src/game/story/hometap.js`, `src/game/story/pumpline.js`, `src/game/pumproom.js`,
`src/game/story/zeelift.js`, `src/game/zlift.js`, `src/game/text/thread.js`, `tests/campaign-thread.mjs`,
`tests/fixtures/campaign/`. Hooked into: `story/prologue.js`, `story/chapter1.js`, `story/chapter2.js`, `zeelich.js`
(the build step, the scatter's clear zone, `R.lift`), `sewers.js` (the pump room's door and way out join Citadel's
underground's), `regions.js` (the room `pumproom`, built with chapter 2), `story/life.js` (one line: a room's own few
steps are no longer cancelled), `itemlook.js` (the strip), `engine/voice.js` (three voices, seeds 1801–1803; Vesk's
voice for the speaking tube). `opening.js`, `rig.js`, `workhands.js`, `castrounds.js` are not touched.

**People** (ours, the sequel's; none claimed as LBA canon): Kell, the cistern lift's operator (Esmer; he returns in
the treatment's section 6: the service lift to the archive); Brel, a docker (Quetch); Irsa, the pumpwright who built
Citadel's lane pump No. 14 (Esmer).

**Left open by wave 1** (for the next waves or the coordinator): the pump room has no prompts in chapters 3 onward
(its door is open, the room is as he left it); Bram, who keeps the lane's hand pump, says
nothing about the pump room (his lines are `story/life.js`'s side story).

## 6. The next waves (chapters 4–12 and the aftermath)

Rules for every wave: new flags only, a marker per thread as above (a save from before counts the step as done); every
hand action on a real object; no Earth-style night words; the Vega 8 budget (reuse materials, merge static parts,
report draw calls before and after); the bot's segment and the chapter's suite updated by input; the user's standing
decisions (long chapters are not shortened, nothing is padded, optional stays optional). The thread that runs through
them all is the one wave 1 started: **three kicks and a rest**, first heard in the kitchen wall.

| Wave | Chapters | Build (files) | Flags | Tests |
|---|---|---|---|---|
| 2 | 4 The Dig, 5 Steam and Sand | `story/digtest.js` (new) owned by `dig.js`/`steam.js`; the research post's test stand in `desert.js` (a cutoff lever, an instrument board with two needles, the project's wire). Chapter 4: after the notebook, Dallan runs the scheduled test and needs a second pair of hands at the cutoff; the player throws it, the drill's needle falls, the second needle kicks three and a rest **after** the stop; "again" reproduces it once. Chapter 5: Vesk on the wire diverts heat to Kesh's oasis pump (the oasis' pump of chapter 4 runs: seen); the log Dallan sends is seen on the board with one trace; the copy the player keeps (an item) has two | `dt_v dt_cut dt_second dt_again dt_divert dt_log` | `tests/playthrough/07`, `08`; `tests/chapter3.mjs`, `chapter4.mjs`; a new section in `campaign-thread.mjs` (the test left half way, a save between the two cut-offs) |
| 3 | 6 The Pass, 7 The Observatory | `pass.js`: the winch line's pylons carry the pulse (their lamps and cables shake three and a rest; a surge stops the winch): the two trips are started in the rest between surges (a readable gauge at the winch, a sound cue), a missed start only costs the trip; from the far side the player locks the upper brake so Lhar's people cross without timing. `observatory.js`: the telescope's fourth setting follows the shaking of the snow fields: the line points under the installations, toward Citadel | `ps_v ps_read ps_trip1 ps_trip2 ps_safe ob_dir` | `tests/playthrough/09`, `10`; `tests/chapter5.mjs`, `chapter6.mjs` |
| 4 | 8 Evacuation | `evacuation.js` + `pumpline.js` (reused): the lane of chapter 2 is the district off the list; on arriving the player sees the project's cart pass the lane's closed gate with empty seats (a cut-away, then control); Zoé (played) reads the schedule against the route at the lighthouse and takes the lane's people to the landing; Twinsen opens the lane's old water gate from the pump room (the bypass he knows: the third pipe's cock drains the culvert) so the cart can come through. Bram, the neighbours and Pippa are seen to board. No side quest is needed | `ev_v ev_cart ev_sched ev_gate ev_board` | `tests/playthrough/11`; `tests/chapter7.mjs`; a save in the pump room during the evacuation |
| 5 | 9 The Council (the evidence, the failed shutdown) | `council.js` + `zeelift.js` (Kell): the archive is closed to Twinsen by Vesk's standing order, read on its door; Kell takes him up the cistern lift's service landing to the archive's back gallery (only if the lift was mended on the main route: it always was); the BORE cabinet holds the uncut log (two traces) and the order that cut it, with Vesk's reason in his hand. After the hearing the council orders the stop: the player throws it at the platform's console; the bore's needle falls, the pulse's does not, Mill Lane's taps fail (Kell's lift stops, Brel's jug); Baldino's isolator on the Test Pair bench (`workshop.js`) holds one relay steady at a time: tried by hand | `cn_v cn_closed cn_kell cn_log cn_stop cn_iso` | `tests/playthrough/12`; `tests/chapter8.mjs`; `zeelich-life.mjs` (Mill Lane's states) |
| 6 | 10 Baldino's Network | `network.js`: at each leg the ally walks to the station and takes its handle as the player lets go (seen before he leaves: Irsa at Mill Lane's bypass, Mira at the valve room's wheels, Zoé at the lighthouse dials, Ilka and Dallan at the vent, Yorna and Pim at the dome); Arthur, at home on the radio, counts the knocking (three and a rest, then four): Mira reads the same on the valve room's gauge before anyone acts on it. The hardest station (the damaged connection at the station's code box) stays Twinsen's | `nw_v nw_irsa nw_mira nw_zoe nw_ilka nw_yorna nw_arthur` | `tests/playthrough/13`; `tests/chapter9.mjs`; `cast-rounds.mjs` (the allies' places) |
| 7 | 11 The Shell, 12 The Core | `chapter3.js` + a new `story/answer.js`: in the machinery a damper answers three and a rest with a pattern of its own; the player repeats it at a knocker (a real lever), gets a second reply, and the replies mark the safe catwalks; a failing shutter is held open for him, later the gallery's door is shut behind him (shown first, explained by Sendell after). The banked throw is taught on a safe plate before the stepping stones need it; a checkpoint (autosave) before the core. Chapter 12: the last act in four steps he has done before (reroute one branch at a cock, Irsa's "holding" on the radio, the central lock, the signal to Zoé); Vesk chooses in view; the guards name the cut log and the list | `sh_v sh_knock sh_reply sh_held sh_shut co_branch co_irsa co_lock co_signal` | `tests/playthrough/14`; `tests/chapter10.mjs`; `under-bar.mjs` |
| 8 | Epilogue | `epilogue.js` + `hometap.js` (its parts): after the dinner, control in the kitchen: the tap turned by hand runs cold, Arthur's cup stands under it "just in case", a word with Zoé, then the end screen | `ep_tap` | `tests/epilogue-home.mjs`; `tests/playthrough/14` (its last step); a fresh run 01–14 |

After the last wave: a fresh chain 01–14 from a new game, by input, with its numbers in the table of section 3.
