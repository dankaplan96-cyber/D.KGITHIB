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
| 4 The Dig (`dig`, dig.js + digtest.js) | Kesh's pier; Mother Tarra | the oasis pump's jammed gear (ball), the pipe joint · Hesk's rope, the sand-yacht ride · the notebook in the sandstorm (the gate guard) · ● out of the gate, taken for Dallan's new hand · ● the cutoff pulled on the red: the ground needle kicks three, rests, three AFTER the stop · ● the drill run up again by the lever and cut on the red again (too soon: nothing after it) · ● the carbon torn off the recorder · the keypad (worn keys, the notebook's order; ● dark while the test is on) · the terraces · three warm seals (ball) · Bu's temple | Brosk and Sani diagnose the pump · ● Vesk on the wire calls the kicks settling; Dallan has never seen it settle in threes · Ilka explains the crystals and, at the carving, the vents | the great carving is read |
| 5 Steam and Sand (`steam`, steam.js + digtest.js) | Brosk's jar | water carried, the shovel, the buried door dug out · the condenser hall: the diagram, the old trooper, valves 1, 3, 4 · the hangar, the glider's hatch (ball) · ● at the stand, the heat line thrown over to KESH (Kesh's pump puffs and turns faster, seen at once and again in Kesh) · ● the tape of what was sent to Citadel read: one trace · Dallan (● shown what he sent) · the relief valve · the run out before the vent blows | Dallan takes the ferry and lists the evacuees (told) · ● Vesk on the wire: Kesh keeps its water, wind or no wind; then "drill channel only" · Zoé reads the shell map on the radio (told) | Hesk flies him north in the cargo glider |
| 6 The Pass (`pass`, pass.js) | the gorge | the frozen tree felled (ball) · the heating station: Pim's kite (ball), the fuse · the frozen rope (sword) · two winch trips, ice mites between · the ride up | Yorna knows the road | Lhar is safe in the monastery |
| 7 The Observatory (`observatory`, observatory.js) | the monastery gate | the frozen window (ball), four mirrors, the telescope · the heavy drone · the seal's warm discs (ball) · the vent | Sendell speaks openly (told) · Arthur's radio: Citadel is evacuating (told) | the second vent is open |
| 8 Evacuation (`evacuation`, evacuation.js + shelters.js + laneline.js) | home, changed; ● from the plateau the list cart is seen at the lane's shut water gate, every seat empty (a cut-away) | Gilbert, Mira, Pippa recruited · the fortress lever (control drones) · the depot wheel (ball) · Zoé's run with the hill families (played as Zoé) · the lighthouse gathering · ● as Zoé: the cart's schedule read against the driver's route on the lighthouse path's board, Bram, Hedda and Tobin brought to the landing · ● as Twinsen: the culvert's cock in the pump room, opened in the rest between the copper pipe's kicks · the control room | Vesk's message from below (told) · Mira finds the old valve room (told) · ● Bram knows the float gate · ● the cart comes through the open gate and the lane boards it (seen) | he boards a project ship for Zeelich |
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
| 4 The excavation — a test with a cost | 4 The Dig and 5 Steam and Sand | the research post, Dallan, the test bore under pressure, the relief valve | **built (wave 2, section 5b)**: Vesk is sealed in the shaft by then: the controlled test is run with **Dallan** at the instruments and Vesk on the project's wire, the player at the cutoff; the second vibration comes after the stop (three and a rest); Vesk diverts heat to Kesh's oasis pump (a real help); the filed log shows one vibration |
| 5 Hamalayi — the road under the ice | 6 The Pass and 7 The Observatory | the gorge, the winch trips, Yorna, the mirrors and the telescope | **built (wave 3, section 5c)**: the winch line's supports carry the pulse: the trips are started between surges (seen and heard, read on a gauge); the upper brake from the far side; the telescope's fourth setting gives the direction: under the installations, toward Citadel |
| 7 The evacuation — Zoé finds the omission | 8 Evacuation | Zoé's run (played), the shelters, the 30 % list | **built (wave 4, section 5d)**: the omitted district is the lane of chapter 2 (the pump room's lane): the project's list cart comes to its shut water gate with empty seats and turns away; Zoé reads its schedule against the driver's route and brings the lane's people to the landing; Twinsen opens the gate through the pump room (the culvert's cock on the copper pipe); Bram, Hedda and Tobin (the neighbours) and Pippa are seen to board. (The treatment has this after its section 6; the game's order keeps it before the council) |
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
| 1 | 333 → **394** (segments 01 + 02: 241 + 93 → 287 + 107) | 776 → 804 | 64 · 702 → 80 · 894 | 18.7 → **22.6** | the tap, the cup, the two pipes outside (+46 s); the catch basin and the pump's cycle (+14 s) |
| 2 | 676 → **879** (03 + 04 + 05: 81 + 210 + 386 → 81 + 227 + 571) | 1,471 → 1,823 | 72 · 1,206 → 104 · 1,691 | 32.6 → **43.5** | home, the lane, the pump room and back (+185 s; segment 04's +17 s is the bot's depot fight, not a change) |
| 3 | 235 → **416** (06) | 471 → 594 | 53 · 829 → 81 · 1,305 | 16.8 → **26.9** | Brel, the lift's hand actions and the ride, the cart, the bench (about +135 s; the rest is the bot's depot fight, longer in this run) |

**Re-measured 11.11 after the merge** of `ccr-c1c2c4b9-dep6ed` (NO-AIR, depth wave 1, ZOE-LOOK, STEALTH-COVER, P12) into
this branch: a fresh chain 01–06 from a new game, by input, Save & quit → Continue between segments, no failed segment,
**0 deaths**, **1 ISO assist** (segment 06's depot fight, below 3 HP, as before):

| Ch | bot s of free play (segments) | walked m | lines · words | est. first play (min) |
|---|---|---|---|---|
| 1 | **402** (01 + 02: 319 + 83) | 812 | 80 · 894 | about 22.8 |
| 2 | **828** (03 + 04 + 05: 81 + 183 + 564) | 1,783 | 104 · 1,691 | about 42.0 |
| 3 | **332** (06) | 533 | 81 · 1,305 | about 24.4 |

The minutes are the earlier wave-1 estimates moved by 1.8 × the change in bot seconds: **estimates**. Chapter 3's drop
against the run above is mostly the bot's depot fight (shorter in this run); chapter 2's, the bot's walks. Runs in
`/dev/shm/t920run/a` (the session's scratch, not in the repository). After the last fixes (the trivet, the crank, Brel)
segments 01 and 06 were played again: 01 passed (289 bot s, no death); 06 from the chain's save stopped once after the
depot fight (the bot stuck on its way to the locker: "go:stuck", outside this job's places) and passed on the re-run
(416 bot s, no death, 1 ISO assist in the depot fight).

The estimates use `chapter-balance.md`'s formula with one more deduction step counted in chapter 1 (which pipe), two in
chapter 2 (which pipe is the new one; which cock) and two in chapter 3 (hook before bell; the dial). They are
**estimates**. The runs: base in `/dev/shm/c1010/base`, wave 1 in `/dev/shm/c1010/new2` (logs, stats, traces, a picture
after every step; the session's scratch, not in the repository). Each chain is a new game played by input with Esc →
Save & quit → Continue between segments; no death in either. The wave-1 chain passed every segment at the first try;
its segment 06 used one assisted finish in the depot fight (the bot's "ISO assist below 3 HP", as in every run recorded
in `chapter-balance.md`: that fight is the chapter's as it was, not part of this wave). Chapters 1 and 3 are now above
125 % of the old median and chapter 2 further above it: the three chapters the player meets first are the three with a
problem found by hand, and the median moves only when the later chapters get theirs (section 6).

**Chapters 6–7, wave 3** (12.11; base = this branch at `77813b9f` before the wave, the wave's build after; both run in
this session by the same bot, ASSIST=1, segment 09 from the chain's own save after 08 (fixture `base-09`, made by segment 08
from `base-07`), segment 10 from 09's save; Save & quit → Continue between them; no death, no ISO assist in any run):

| Ch | bot s of free play: base → wave 3 | of which the new steps | lines · words (segment) | est. first play (min): base → wave 3 | what the seconds are |
|---|---|---|---|---|---|
| 6 | 247.0 → **278.2**, final build **263.7** | 27.3, final 24.3 (the first trip +2.2, the second +9.1 to +10.5 — the wait for the green —, the ride in Yorna's quiet +7.5, the brake 5.5 to 7.0) | 28 · 430 → 41 · 624 / 40 · 608 | 14.0 → **about 16.8** | the line read, the trips on the green, the brake; the rest swings with the bot's mites fight (9.9 to 19.4 s) |
| 7 | 171.9 → **178.3**, final build **218.9** | 7.6 (the lever 5.8, the ring 1.8; the glacier's turn 6.3 against 8.3) | 34 · 549 → 39 · 624 / 40 · 642 | 13.3 → **about 15.0** | the fourth setting and the ring; the final run's +39 s is the bot's walk to the dome after the snow remark stopped it (115 m against 80: a re-planned route), not a step |

The minutes are **estimates**: the 9.11 estimate moved by 1.8 × the new steps' bot seconds, 60 s for one more deduction
step each (chapter 6: start on the green; chapter 7: what the ring's bearing means) and the new reading (200 words a
minute, 0.6 s a line). The bot starts every trip on the green at the first try; a player who starts one too late loses
the trip (about 8 s of ride, about 15 s more at the formula's factor). Against the old median (16.9) chapter 6 is now
about 0.99, chapter 7 about 0.89. Logs `/dev/shm/logs/w3-*.log`, stats `/dev/shm/w3/*st0[9]*.json`,
`/dev/shm/w3/*st10*.json` (the session's scratch, not in the repository).

**Chapters 4–5, wave 2** (11.11; base `65a451bc` and the wave's build, both run in this session by the same bot, ASSIST=1,
segment 07 from the chain's own save after segment 06 (fixture `base-06`), segment 08 from 07's save; Save & quit → Continue
between them; no death, no ISO assist in either run):

| Ch | bot s of free play: base → wave 2 | of which the new steps | walked m | lines · words | est. first play (min): base → wave 2 | what the seconds are |
|---|---|---|---|---|---|---|
| 4 | 224.6 → **291.4**, final build **228.4** | 32.3, final 28.5 (the hail 2.6, the first cut 12–15.7, the second run 10.7, the carbon 3.2) | 533 → 563 / 502 | 53 · 902 → 73 · 1,131 | 18.5 → **about 21.8** | the test at the stand; the rest swings with the bot's sneak for the notebook (107 s, 64 s against the base's 74 s: the storm's timing, not a change) |
| 5 | 262.1 → **277.1**, final build **289.8** | 31.0 both runs (the wire 16.4, the heat line 14.0, the tape 0.5) | 577 → 589 / 610 | 33 · 499 → 49 · 702 | 16.2 → **about 19.3** | the stand: the wire, the lever, the tape; the rest swings with the bot's walks and the hall's trooper (43 s, 55 s) |

The minutes are **estimates**: the 9.11 estimate of the chapter moved by 1.8 × the new steps' bot seconds, 60 s for one more
deduction step each (chapter 4: cut only when the bit is down — a cut too soon shows nothing; chapter 5: the tape against the
carbon), and the new reading (200 words a minute, 0.6 s a line). The kicks are watched in a close look at the dials
(about 6 s a run, a scene, not counted). Against the old median (16.9) chapter 4 is now about 1.29, chapter 5 about 1.14:
the first five chapters all have their problem found by hand; the median moves when the later waves add theirs. Logs:
`/dev/shm/logs/w2-*.log`, stats `/dev/shm/w2/*-st0[78].json` (the session's scratch, not in the repository).

**Chapter 8, wave 4** (12.11; base = this branch at `24b3e51a` before the wave, served as its own build beside the wave's;
both played by the same bot, ASSIST=1, from the same save `base-11` — chapter 8 at its start, made on the build before the
wave —, in three parts with Save & quit → Continue between them: to Pippa, Zoé's run, the rest; no death, no ISO assist in
either):

| Ch | bot s of free play: base → wave 4 | of which the new steps | lines · words | scenes (not counted) | est. first play (min): base → wave 4 | what the seconds are |
|---|---|---|---|---|---|---|
| 8 | 403.9 (201.2 + 110.4 + 92.3) → **475.7** (193.5 + 188.9 + 93.3) | 94.3 (the board 6.5; Bram 36.3 and Hedda 12.6 as Zoé, mostly the walk from the lighthouse path to the lane; the landing 17.4; the pump room 7.5; the cock 8.8, one turn kicked back; the walk up to the boarding 5.2) | 33 · 631 → 67 · 1,140 | 7.2 → 35.1 s (the arrival's cut-away 8.9 s, the boarding 19.1 s) | 18.5 → **about 26** | the lane, Zoé's half and Twinsen's; the rest swings with the bot (to Pippa −7.7 s, the control room and the ship −20.6 s: its stuck walk to the station in the base run) |

The minutes are **estimates**: the 9.11 estimate moved by 1.8 × the new steps' bot seconds (+2.8 min), 60 s for each of two
more deduction steps (the schedule against the route; which pipe drains the culvert and when to turn its cock: +2.0 min) and
the new reading (+509 words at 200 a minute, +34 lines at 0.6 s: +2.9 min). Against the old median (16.9) chapter 8 is now
about 1.55, over the 125 % line (it was 1.10). Nothing in it is padding: the walk Zoé makes from the lighthouse path back
to the lane is the longest new piece (about 40 s of the bot's), and it is the lane the player sees her save. The user's
decision of 8.11 (long chapters are not shortened) is kept; no step was cut to make room. Logs `/dev/shm/w4/base-*.log`,
`new2-a.log`, `fin-b.log`, `new-c.log`, stats `/dev/shm/w4/*st11*.json` (the session's scratch, not in the repository).

## 4. The missing playable step, chapter by chapter

Did the player discover the problem, test an idea and see the result — or did a person do all three?

| Ch | Discover | Test | See the result | The missing step |
|---|---|---|---|---|
| 1 (base) | told (the film; "I'll check the well") | played (the well's steps) | told (Sendell) | the household problem itself was never in his hands → **built**: the tap, the cup, the knocking, the pool, the growth |
| 2 (base) | told (Vesk names the three valves) | played (the valves) | shown (the well fills) | nothing he found himself; the departure came from a radio call → **built**: the dry lane, the pump room, the strip and the plate |
| 3 (base) | told (Baldino explains the shell) | played (parts, mills) | shown (the shield, Vesk's ship) | no reason to trust Vesk was ever seen; the street was a list of errands → **built**: the lift, the cistern, the bench |
| 4 | told (Brosk, Sani, Ilka) | played (pump, keypad, seals) | told (Ilka at the carving) | the test itself: he never runs the bore's cutoff, never sees the second vibration → **built (wave 2)**: he pulls the cutoff, sees the kicks after the stop and runs it again himself |
| 5 | told (the diagram; Dallan) | played (valves, the relief valve) | shown (the vent, the geysers) | the cost: Vesk's diversion that helps Kesh, and the log that leaves the second vibration out → **built (wave 2)**: he throws Vesk's heat line, reads the cut log, holds the carbon |
| 6 | told (Yorna) | played (tree, kite, rope, winch) | shown (the lift runs) | the pulse is not in the pass at all: nothing here moves because of it → **built (wave 3)**: the line kicks, he reads it on the gauge, starts each trip in the quiet (a late start costs the trip) and locks the upper brake for the last of Lhar |
| 7 | told (Sendell) | played (mirrors, discs) | shown (the vent) | the direction is told, not read off an instrument he sets → **built (wave 3)**: the snow fields shake in threes; he sets the telescope to four, it follows the shaking, he reads the bearing: Citadel |
| 8 | told (the list is known since chapter 2) | played (shelters, Zoé's run) | shown (the gathering) | the omission is never seen happening (the cart that passes the gate) → **built (wave 4)**: the cart is seen to turn away at the shut gate; Zoé reads the schedule against the route herself; he drains the culvert by the copper pipe's cock in a rest; the lane is seen to board |
| 9 | told (the council) | played (stamps, the archive) | told (the turn) | what the cabinet proves is not his own test; the shutdown everyone argues about is never tried |
| 10 | told (Baldino) | played (five relays) | told (radio) | the allies are voices; nobody is seen taking a station over |
| 11 | told (Sendell) | played (valves, pillars) | told | nothing answers him; the installation is a set of locks |
| 12 | told (Vesk) | played (pylons, coil) | shown (the shell holds) | the last act is a boss pattern, not a decision made with the things he has learned |
| Epilogue | — | — | told (dinner) | the tap is never turned again |

## 5. Wave 1, as built (the treatment's sections 1–3)

**Status (11.11, after the merge): Automated runtime only.** Built and verified by the bot and the suites on SwiftShader;
nobody has played it, nothing was listened to, no frame rate measured. Verified on the merged build: campaign-thread,
prologue, chapter1, chapter2, zoe-resume, depot-watch, depot-corner, zeelich-life, zeelich-doors, sewers, save-migration,
resume, opening, no-air (states 0–4, chapters 1–3, one process each: 0 offenders of hand or foot), overlaps,
world-consistency, the new `tests/campaign-hands.mjs` (the hero's own hand at the thing, at the moment each campaign hand
action takes effect, and the thread's working people), and the chain 01–06 above. The fixtures' old saves
(`tests/fixtures/campaign/base-*`, and `save-migration`'s) load and play on. Pictures (game camera, deviceScaleFactor 1):
`captures/campaign-wave1/` (`u*`: chapters 1–2; `x*`: the cup and chapter 3, not for sending).

After the merge: Brel at the standpipe kneels at the trough under the spout (`kneelWork`, hands 0.4 / 0.9 cm from it);
his standing `use` there had nothing at that height before him and the NO-AIR layer stood him down. Arthur's cup stands
on a small iron trivet on the stove top (the set-down hand was 8.2 cm above the cup; now 0.6 cm), and the bench crank
is taken by its wheel's rim at the hub's height (6.6 cm off its empty middle; now 0.5 cm). `campaign-hands.mjs` on the
final build: every campaign hand action of the hero within 5 cm of the thing (the kitchen tap 5.0 cm, the rest
0.0–4.4 cm; one of the two bypass cocks is measured); Kell's hands on the brake 0.2 / 0.9 cm. A new game's door waits for the
tap, so `tests/lib/player.js` `P.through` tries the kitchen tap first (by input, `P.homeTap`; `P.tapFirst = false`
leaves the door to refuse), and `opening.mjs`, `sewers.mjs` expect the thread's first objective, Zoé at the sink and the
garden pipe's line on the way. The hero's hand actions are his own (`story/reach.js`); `workhands.js` is on NPCs only and
never solves his arm, so the two do not meet.

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
nothing about the pump room (his lines are `story/life.js`'s side story). Suites outside the list above that start a
new game and walk out of the house now go through `P.homeTap` (in `P.through`); those that set the hero outside by hand,
or check the old first objective text ("Check the well") right after the opening, were not run here and may need the
same change as `opening.mjs` (e.g. `camera-doors`, `clarity`, `door-sweep`, `epilogue-home`, `interior-life`,
`longsession`, `stability`, `well-town`). In the kitchen at the game camera the hero at the sink and Arthur's cup are
small (the cup is a few pixels): the beat reads from its lines and the objective more than from the
picture. The worker's last "hand-contact rework of the home module" was found already done at fe6dd248 (the tap, the
cup, the catch basin through `story/reach.js`); nothing further was changed there.

## 5b. Wave 2, as built (the treatment's section 4, in chapters 4 and 5)

**Status (12.11): Automated runtime only.** Built and verified by the bot and the suites on SwiftShader; nobody has played
it, nothing was listened to, no frame rate measured.

**Wave 2's verification** (port 9210 snapshot of this branch; one suite at a time): `campaign-thread` PASS (A, B, C1–C7
on the wave's build; D and E re-run on the final build after a server stop broke the first full run at D3: D 9/9, E 7/7),
`campaign-hands` PASS (every hero hand of the campaign within 5 cm: the cutoff 0.4 / 2.4 / 0.5 cm, the carbon 0.6 cm,
the heat line 2.8 cm; Dallan at the wire's shelf in chapter 4, hands 0.2 / 0.7 cm; in chapter 5 NO-AIR stands him down,
idle, which the rule allows), `chapter4` PASS (the bore test by input after the notebook; the format-3 save with the
notebook plays the test), `chapter5` PASS (the wire, the heat line, the tape by input), `no-air` states 5–9 and the new
21 (0 offenders), `save-migration` PASS, `resume` PASS, `chapter1` PASS (smoke), segments 07 and 08 by input from the
chain's save after 06 (twice: PASS, no death, no ISO assist). Pictures in `captures/campaign-wave2/` (`x-*`, for the
coordinator).

| Chapter | Before (base) | Now: what the player does | Where |
|---|---|---|---|
| 4 The Dig | the post was only a place to steal the notebook from; the bore and its "pressure" were a memo on a desk and a line of Ilka's | The drill on the derrick turns (heard near it) from his arrival. Out of the gate with Ilka's notebook in his pocket, the storm gone, Dallan at the bore's test stand outside the fence (nobody stands inside it during a pressure test) takes him for the technician Citadel promised on the ferry ("Easy, you lot. He's with me": the post's watch leaves him be). Vesk, on the project's wire from the sealed shaft, has the load at the red. Twinsen pulls the cutoff: the drill winds down, its needle falls, and after the stop the GROUND needle kicks three times, rests, kicks three more (a knock at the board and a rattle in the derrick; a close look at the dials). Vesk: settling, log it ("Clean cut"). Dallan has never seen it settle in threes; "run it again, then". The lever is Twinsen's: up, the drill winds up, its needle climbs; a cut before the red brings nothing after it ("Too soon. The bit wasn't down"); a cut at the red brings the same three and a rest. "Something down there answers the drill." Vesk: rock, settling, log both runs. Dallan keeps the drill off until Citadel has read the strip and lets his "new man" tear off the recorder's carbon (the item: two traces). The dig's barrier runs off the post's line and is dark while the test is on (its tag says so). At the carving Dallan knows him: "Citadel's new hand, my foot." | `story/digtest.js`, `teststand.js`; the post's gate on Desert Island |
| 5 Steam and Sand | Dallan let him through the gate because he was told he knew about the thirty percent | With FunFrock's valves set he comes back to the post. Dallan is at the stand on the wire. Vesk: Kesh is off the evacuation list, so Kesh keeps its water, wind or no wind: the bore's spare heat goes to the steam drive bolted to Kesh's pump (cold since chapter 4, its pipe under the sand toward the post: a look shows it) — and since that was Twinsen's hand on the cutoff, he can throw the heat line. He does: far off the pump puffs and turns faster (a cut-away while he says so). Then "the log of test 14, drill channel only: the ground channel is settling noise; I won't have the council reading noise". The teleprinter chatters; its tape on the desk: one trace. "My carbon still has them." Dallan before the tape is read: "It's on the tape, if you want to read it." After: Twinsen puts to him what he sent and what they both saw; Dallan: "Vesk says it is noise. And he just gave Kesh steam." The gate opens ("the pressure is higher than the reports say"). Back in Kesh the pump turns steady on steam; Sani: "It puffs like Brosk's pipe!", Brosk: "Steam from the project, after they took our ferry. Make up your minds." Tarra, with her clover: "We will drink it. We will not forget the ferry." | `story/digtest.js`; the stand, Kesh's pump |

**Why this shape.** The treatment's "Twinsen and Vesk work well together" is the test run over the wire, Vesk not knowing
whose hand is on his lever until chapter 5 ("So that was your hand on the lever. A good hand."). His help is real and his
own decision (Kesh's pump on the bore's heat), and so is the concealment (the ground channel cut from the log), in one
call. The player knows what is missing because he ran the test twice himself and holds the carbon. Dallan follows the
plan but pushes back once (the drill stays off until Citadel has read the strip). Kesh takes the steam and does not
forget the ferry. Wind, weather and the cool room's side story are untouched (the pump already ran on the wind; the steam
makes it independent of it). The carbon (`tstrip`) is kept for the evidence chapter (wave 5: `cn_log`).

**New flags only** (old saves load and go on): `dt_v dt_hail dt_dark dt_cut dt_second dt_early dt_again dt_strip dt_wire
dt_divert dt_sent dt_log dt_pumpSeen`. The marker `dt_v` is set when chapter 4 begins, or on loading a chapter-4 save from
before whose dig gate is still shut (the test is ahead of it). Without it every new step counts as done: the drill stands,
the heat line stays on the bore, nothing was sent, Dallan is where he was, and both chapters play as they did.

**Hands.** The cutoff (pulled, pushed up, pulled again), the carbon and the heat line go through `story/reach.js`
(`tinker` for the lever knobs at about 1.2 m, `setDown` for the paper's end at the desk's edge); measured in
`tests/campaign-hands.mjs`. Dallan works at the wire's box on its post (`tinker`, NO-AIR's `workhands.js` puts his hands
on its top), clear of the lever so its prompt is the player's.

**Files.** New: `src/game/story/digtest.js` (the thread, one instance for both chapters: `story._dt`),
`src/game/teststand.js` (the stand, the drill string on the derrick, the steam drive at the pump), `src/game/text/digtest.js`.
Hooked into: `story/dig.js`, `story/steam.js` (asked first, as wave 1's threads), `desert.js` (the two builds, `R.stand`,
`R.pump.drive`), `story/index.js` (one call: the drill's hum and the drive's puffs on Desert Island in every chapter
from the fourth), `engine/voice.js` (`veskwire` speaks with Vesk's voice), `itemlook.js` (the carbon looks like a leaflet).
Tests: `tests/playthrough/07`, `08`, `tests/chapter4.mjs`, `chapter5.mjs`, `campaign-thread.mjs` (C5–C7, D, E),
`campaign-hands.mjs`, `no-air.mjs` (state 21); fixtures `tests/fixtures/campaign/base-06`, `base-07-dig`, `base-07`
(made on the build before the wave) and `new-07-notebook`, `new-08-routed` (made by this wave's playthrough).
Pictures (for the coordinator only, chapters past 2): `captures/campaign-wave2/x-*.jpg`.

**Left open by wave 2:** the drill's turning string sits high in the derrick and is seldom in the play camera (heard more
than seen); the two dials read from the game camera at the stand but are small further off (the close look carries the
kicks). The derrick at Citadel's station and the shell's later machinery do not yet echo the test (waves 4–7 take the
thread on). The cool room's windcatcher quest is untouched.

## 5c. Wave 3, as built (the treatment's section 5, in chapters 6 and 7)

**Status (12.11): Automated runtime only.** Built and verified by the bot and the suites on SwiftShader; nobody has played
it, nothing was listened to (the knocks, the pawl's click and the ratchet are the game's existing synthesized sounds), no
frame rate measured.

**Wave 3's verification** (port 8920 snapshot of this branch; one suite at a time; the machine shared): 

| Suite | Verdict | What it covered |
|---|---|---|
| `tests/playthrough/09-pass.mjs` (seg.mjs, by input, ASSIST=1, from `base-09`) | PASS, twice (before and after the last fixes); 0 deaths, 0 ISO assists | the whole chapter with the thread on: the line read at boarding, both trips started on the green at the first try, the ride in Yorna's quiet, the brake |
| `tests/playthrough/10-observatory.mjs` (from the chain's save after 09) | PASS on the final build (after one STOP: the snow remark stopped `P.through` on the way to the dome; the step now reads it and walks on, as a player would); 0 deaths, 0 ISO assists | the snow shaking beside him, the fourth setting, the ring, the rest of the chapter |
| `tests/chapter6.mjs` (The Pass) | PASS 24/24 | the lamps swing when the winch thaws (said); the gauge red/green/amber through a cycle; boarding and the reading; a start in the amber stopped part way (the riders back down, the trip lost); the retry in the green; trip 2; Yorna does not crank in a surge; the monastery waits; the brake, Tam and Bodo through a kick, held |
| `tests/chapter7.mjs` (The Observatory) | PASS 20/20 | the snow beside him out of the yard (12 bursts, said once); the fourth setting first; the lever (six jerks, pointing down); the ring (Citadel); the glacier; the pulse on until the vent, off after |
| `tests/campaign-thread.mjs` ONLY=C, F, G | PASS (C 13/13, F 12/12 twice, G 5/5 twice) | C8–C11: four saves from before the wave; F: boarded and read, Save & quit with them boarded, the amber start and the retry, a save between the trips, a save before the brake (the monastery waits), the brake, a return after completion; G: the setting by hand, a save between the follow and the reading, the ring, the glacier, a return after completion |
| `tests/campaign-hands.mjs` | PASS (after one FAIL: the crank's grip 9.3 cm above the hand, the brake reached from the wrong side; both fixed) | every campaign hand action within 5 cm: the crank 0.3 cm, the brake 0.0 cm, the telescope's lever 0.1 cm (waves 1–2's unchanged) |
| `tests/no-air.mjs` STATES=10, 11, 12, 13, 22 (new), 23 (new) | PASS each, one process each; 0 offenders of hand or foot | chapters 6 and 7 before, between and after the trips; up with the brake not locked (the last of Lhar still in Lhar); chapter 7 with the bearing read |
| `tests/save-migration.mjs` | PASS (14 checks, 3 new) | `base-09`, `base-09-trip1`, `base-10-scope` from the build before load without an error; the thread on only where its steps are ahead |
| `tests/resume.mjs` | PASS | unchanged |

Not run here: the full `campaign-thread` A–E (waves 1–2; their code is not touched), `residents.mjs` and `hamalayi-life.mjs` (they set
chapter 6's flags by hand; `LAST` counts `c6_done` as up for them), `story-journeys`, `chapter10`, `cast-rounds`.

| Chapter | Before (base) | Now: what the player does | Where |
|---|---|---|---|
| 6 The Pass | the lift was a frozen winch to thaw; the two trips were one press each (a fade, a ride), the ice mites between; nothing in the pass moved because of the pulse | When the winch thaws, its line kicks as he looks: the lamps on the guide rails swing and flicker, the hauling cable jumps, three kicks and a rest (said once: "the cable jumps with them"). E at the winch boards the trip's riders (under the black, as before). The first time, a kick comes as Tashi and Dawa stand on the platform: Tashi feels the drum kick back, Twinsen knows the knock (the kitchen wall, the dig's needle), Dawa says what it does ("a kick halfway up, and the drum runs back down"), and he reads the line's gauge by the winch: RED through the kicks, GREEN in the quiet while a whole trip still fits before the next kick, AMBER after. Then E at the crank (his hand on its grip): started in the green the platform is up before the next kick; started in the amber (or the red) the next kick stops the winch part way, kicks the crank out of his hand, and the platform runs back down with them (said once, then a toast: the trip is lost, nothing else). The same for Yorna, Pim and Old Norbu after the mites. Standing on the platform he waits for Yorna's quiet (she will not crank in a surge). At the top Yorna stays at her crank: Tam, Bodo and the rest of Lhar are still below with the last packs and "can't count a winch with their arms full"; the old upper brake by the frame holds the drum when the cliff kicks, and nobody has set it since the melt. He locks it (his hand on its lever); the platform goes down and comes up with Tam and Bodo, a kick hits it half way, it jolts and holds on the pawl, then rides on. "Nobody has to count any more." The monastery ends the chapter only after the brake (a save from before plays the old way) | `story/passline.js`, `winchline.js`; the lift at Lhar's cliff |
| 7 The Observatory | Sefa said "turn the telescope"; one look melted the vent's ice | At the chapter's start, in the monastery's yard, the snow fields shake as he looks: powder jumps off them in threes, marching down from the peak toward the project's heat station. After Sendell, Sefa: before the glacier, his fourth setting, which follows the snow fields when they shake. The telescope has a setting lever on its mount (1 STARS, 2 SUNS, 3 ICE, 4 SNOW): he sets it to four by hand; the tube jerks three times, rests, jerks three more and stops pointing below the horizon. He reads the bearing ring under it: the pointer stands on DESERT ISLE, and past it CITADEL. Sefa has never seen it point below the snow; "under the project's station, under the dig... toward home". Then setting three, the glacier, as before (the dome turns, the vent's ice melts). The line's pulse (the lift's lamps, the snow fields) goes on outside until the vent breathes, then the mountain is still (the existing line "the ground stops trembling" now holds) | `story/passline.js`, `obsroom.js`; the dome, the monastery yard |

**Why this shape.** The treatment's "a familiar crossing becomes unsafe; a maintenance worker knows an older route, but its
supports carry the same pulse" is the base game's own: the ledge is cut by the slide and Yorna knows the old lift; its
rails are the supports. The player reads the pulse twice before he must use it (the lamps when the winch thaws, then the
gauge with the riders aboard), and the cost of a wrong start is small and shown (the platform runs back down with them).
"From the far side, open a safe way through for the residents" is the upper brake: only reachable from the top, it takes
the timing away for the people who cannot do it themselves, and two of Lhar's residents are seen to ride up through a kick.
The direction is read off an instrument he sets (the treatment's section 5: "the disturbance is traveling below the
installations, beyond the excavation"), and it points where chapter 8 goes: Arthur's call about Citadel comes right after.
Kept: the tree, the kite and fuse, the rope and the sword, the mites, Yorna cranking him up, the mirrors, Sendell, the drone,
the seal's discs. No new fight, no longer walk: the brake stands by the frame he arrives at.

**New flags only** (old saves load and go on): `ps_v ps_lamps ps_read ps_miss ps_trip1 ps_trip2 ps_safe` · `ob_v ob_snow
ob_follow ob_dir`. The markers: `ps_v` is set when chapter 6 begins, or on loading a chapter-6 save from before whose first
trip is still ahead; `ob_v` when chapter 7 begins, or on loading a chapter-7 save from before whose telescope is unturned.
Without them every new step counts as done: the trips are one press each, no brake is asked for, the telescope is one look.
The last of Lhar (`storylife.js` LAST: Tam, Bodo, Old Dorje, Pema; Dorje's house) wait in Lhar until the brake only in a
game with `ps_v`; in every other game they go up with the second trip as before.

**Found and fixed on the way:** a chapter-6 save made on the platform at the top (`c6_up`, the autosave as he arrives) loaded
him under it at the cliff's foot with no way up: the platform rose on its own after the load. It now stands at the top at
once on a load (`R.lift.snap`), so he is stood on it up there (base saves included).

**Hands.** The crank's grip, the upper brake's lever and the telescope's setting lever go through `story/reach.js`
(`tinker`); the crank's resting angle is worked out from the ground where he stands (a little below the winch's boards), so
the grip is at his hand. Measured in `tests/campaign-hands.mjs`: the crank 0.3 cm, the brake 0.0 cm, the setting lever 0.1 cm from the thing at the moment each takes effect.

**Vega 8 budget** (draw calls and triangles of one frame, all passes, the same saves and camera spots, 1280×720, Medium;
`/dev/shm` probe, SwiftShader: counts only, no timing): 

| Save, place | draw calls: base → wave 3 | triangles: base → wave 3 |
|---|---|---|
| chapter 6 (`base-09`), at the winch | 56 → 63 | 350,092 → 351,872 |
| chapter 6, the lift's top | 57 → 63 | 380,146 → 381,962 |
| chapter 6, Lhar (the lift in the distance) | 114 → 121 | 491,326 → 493,106 |
| chapter 7 (`base-10`), at the winch | 64 → 67 | 346,606 → 348,022 |
| chapter 7, the lift's top | 79 → 79 | 396,932 → 397,656 |
| chapter 7, Lhar | 90 → 88 (the residents' rounds) | 458,952 → 459,340 |
| chapter 7, the dome at the telescope | 53 → 55 | 21,290 → 21,654 |

At most +7 calls where the whole line is in view (the seven moving meshes), +0.5 % triangles. The lamps are two instanced meshes for all three (their
cage and their glass), the brackets, the sheave, the crank's axle, the gauge's post and housing and the brake's stand join
the lift's existing Kit (merged per material); the moving parts (the cable, the crank, the gauge's face and needle, the brake
lever) are one mesh each. In the dome the tube left the room's merged Kit for a yoke and a pitch (it turns), the ring and the
lever are one mesh each.

**Files.** New: `src/game/story/passline.js` (the thread, one instance for both chapters: `story._ps`),
`src/game/winchline.js` (the line's lamps, cable, crank, gauge and upper brake, and its pulse clock), `src/game/text/passline.js`.
Hooked into: `story/pass.js`, `story/observatory.js` (asked first, as waves 1 and 2), `hamalayi.js` (the build call, the
platform's speed, halt, jolt and snap), `obsroom.js` (the telescope's yoke, ring, lever), `storylife.js` and
`story/hamlife.js` (the last of Lhar wait for the brake). `walkers.js` and `actors.js` are not touched.
Tests: `tests/playthrough/09`, `10`, `tests/chapter6.mjs`, `chapter7.mjs` (the chapter suites of The Pass and The
Observatory), `campaign-thread.mjs` (C8–C11, F, G), `campaign-hands.mjs`, `no-air.mjs` (states 22, 23), `save-migration.mjs`;
fixtures `tests/fixtures/campaign/base-09`, `base-09-trip1`, `base-10`, `base-10-scope` (made on the build before the wave)
and `new-09-lift`, `new-09-top`, `new-10-lit` (made by this wave's playthrough). Pictures (for the coordinator only):
`captures/campaign-wave3/x-*.jpg`.

**Left open by wave 3:** the lamps and the gauge read well near the winch but are small further off (the knock and the pawl's
click carry the rhythm there); the bearing ring's names are too small to read in the play camera (Twinsen reads them out).
The reveal-camera beats written for the rides (the platform from beside the winch; the last of Lhar from the top) are off
in the tests (`?nocine`) and were not looked at through the game's own beat: the pictures `x-*-cam` are framed by a fixed
camera set for the picture. The snow fields' puffs were checked by count, not in a picture. The rhythm is a fixed cycle of
11 s (three kicks in 0.84 s, a 4 s green window): nobody has judged whether a first-time player finds the green easily.
Chapter 7 is still short (about 15 estimated minutes, 0.89 of the old median): its new steps are the set and the read.
The full `campaign-thread` (A–E) and the residents' suites were not rerun on this build.


## 5d. Wave 4, as built (the treatment's section 7, in chapter 8)

**Status (12.11): Automated runtime only.** Built and verified by the bot and the suites on SwiftShader; nobody has played
it, nothing was listened to (the cart's horn and rumble, the gate's clang, the pipe's knock and the drain's gurgle are the
game's existing synthesized sounds), no frame rate measured.

**Wave 4's verification** (port 8920 snapshot of this branch; one suite at a time; the machine shared — one no-air page
died under memory pressure and was run again alone):

| Suite | Verdict | What it covered |
|---|---|---|
| `tests/playthrough/11-evacuation.mjs` (seg.mjs, by input, ASSIST=1, from `base-11`, in three parts with Save & quit → Continue between them) | PASS, every part (part B again after the board moved); 0 deaths, 0 ISO assists | the arrival's cut-away from a save before the wave, the shelters, Zoé's run, the board's two sheets, Bram, Hedda and Tobin, the landing, the pump room, the cock (first try kicked back, the second in the rest), the boarding, the control room, the ship to chapter 9 |
| `tests/chapter8.mjs` (Evacuation's chapter suite) | PASS 20/20, three times (the last on the final build) | the gate shut over a full culvert at a new chapter 8's start and the cart's cut-away skipped with E; the relay with Zoé staying on; the sheets one by one (Pippa to the landing); the three told and walked to the landing; the handover; the culvert looked at, the cock kicked back in a kick and opened in the rest; the boarding seen (the cart in the lane, four seated); the bridge; the control room; the ship |
| `tests/campaign-thread.mjs` ONLY=H, I | PASS (H 5/5, I 14/14) | C12–C14: three saves from before the wave; I: the board half read and Save & quit (her run resumes before it), the run again to the landing, a Save & quit in the pump room, the kicked-back turn and the turn in the rest, a save after the cock and before the boarding, the boarding, the bridge and the landing after a reload, the control room |
| `tests/campaign-hands.mjs` | PASS | the culvert's cock 0.0 cm and 0.2 cm (a kicked-back turn and the opening one); waves 1–3's unchanged |
| `tests/no-air.mjs` STATES=14, 24 (new), 25 (new), 26 (new), one process each | PASS each (0 offenders of hand or foot) | chapter 8 without the lane, at its start with it, the lane waiting at the landing, the lane in the bridge's queue. 24 and 26 died on their first pages in the first sweep (memory: other browsers on the machine) and passed run again alone, 26 on the final build |
| `tests/save-migration.mjs` | PASS (17 checks, 3 new) | `base-11`, `base-11-town`, `base-11-relay` load without an error; the thread on only where the relay is ahead; the arrival counted as seen once home |
| `tests/resume.mjs`, `tests/chapter1.mjs`, `tests/opening.mjs` | PASS each | unchanged (the gate's posts stand in the lane in every chapter, open) |
| `tests/cast-rounds.mjs` | PASS (after one FAIL: its chapter-8 states set only `c8_started`, which is a save from before the wave at the chapter's start: the arrival played over its free play; the states now say the arrival was seen) | the story people's rounds in chapters 3–10 |
| `tests/world-consistency.mjs` | FAIL, not this wave's: its static journey check lists two `startTransition` calls of wave 3's `story/passline.js` (`board`, `restUp`) as not on its allow-list; this wave's `backToTwinsen` is on it. Chapter 8's residents and rounds pass | the residents and the cast per chapter; the journeys' allow-list |

| Chapter | Before (base) | Now: what the player does | Where |
|---|---|---|---|
| 8 Evacuation | the 30 % list was known since chapter 2 and never seen to leave anyone out; Zoé's run ended at the lighthouse with the relay; the lane by Twinsen's home played no part | **Arriving** on the plateau, a cut-away: the project's list cart (a teal motor wagon, two side benches, the project's worker at the wheel) comes down the plaza's road to the lane's old water gate, stops at it (a toot of the horn: it is shut, a sheet of water over the culvert's grate behind it, the float up in its cage), and turns off to the fields with every seat empty. E skips it after a moment. "From up here I can see our lane." At home he tells Zoé; she knows the gate ("shut since they closed Mira's office; the culvert under it is full") and will read the timetable the project posts at every stop. **As Zoé**, after the hill farms and the relay at the lighthouse (as before), the board at the lighthouse path's stop: the SCHEDULE (stop 4, LANE GATE: Bram, Hedda, Tobin, every round) and the driver's ROUTE (the lane crossed out: GATE SHUT, NO STOP), read in either order: "On paper the lane is picked up every round. On the road nobody stops." She goes to the lane: Bram at his pump ("the man on the bridge said wait for the cart; it came to the gate and went away again; twice"), Hedda and Tobin outside their door (packed since breakfast); told, they walk to the cart landing inside the gate (a flagged stop by the pump house); Pippa is there already with bread for the lane. Zoé at the landing: back to **Twinsen**, beside her: Bram knows it is a float gate ("culvert full, gate shut; Mira's pump used to empty it"); every pipe on the lane meets in the pump room. **Below**, the copper pipe kicks in threes again, harder, and the floor grate brims: the culvert's cast-iron pipe climbs out of it and drops into the copper pipe, with a cock of its own. Looked at: "The copper one pulls toward the fortress: it pulled our water away in spring." Turned by hand in a kick, the pipe kicks the handle back out of his hand (said once; then a toast); turned in the rest, it opens: the grate gurgles dry down the project's own pipe, and up on the lane something heavy clanks. **Up in the lane**, a cut-away: the cart comes down the road and in through the open gate to the landing; the driver ("Gate's open, so the lane's on my route. That's how routes work"), Bram, Hedda, Tobin and Pippa ("I'm not on any list. I'm on the cart") board one by one onto the benches; the cart backs out and drives off to the bridge. Zoé goes back to the hill families; the control room is next, as before. At the bridge the lane stands in the queue for the ships, Pippa sells from there | `story/laneline.js`, `lanegate.js`, `pumproom.js`; the lane's mouth on Citadel (Bug Street), the pump room, the lighthouse path, the spaceport bridge |

**Why this shape.** The treatment's "Zoé compares the evacuation schedule with the actual transport route; an inhabited
lower district has no pickup; the player arrives in time to see a vehicle pass its closed gate with empty seats" is played
as written, with the lane the player knows from chapters 1–2 (his own street) as that district. The omission is a system's,
not a speech: the water office was called non-essential, so the culvert filled, so the float gate shut, so the driver's
route was drawn round the lane while the schedule kept its names. Zoé finds it with her own eyes on two sheets; Twinsen
"reopens a usable route through infrastructure he knows": the pump room's copper pipe, the one that took the lane's water
in chapter 2, drains the culvert, and it is turned in the rest between the kicks he learned to read in chapter 6 (the thread
"three kicks and a rest", used where it fits: the pipe is the pulse's own). Nothing is missable or optional: the board, the
three people and the cock are on the main route, each marked; the chapter's own steps are kept (the shelters, the farms,
the relay, Vesk on the screen). The treatment's "residents from chapter 3 board" is the lane's people here (the plan's
decision): Bram from chapter 2's lane, Hedda (the neighbour of chapter 1's kettle) and her husband Tobin (new), Pippa.

**New flags only** (old saves load and go on): `ev_v ev_cart ev_s ev_r ev_sched ev_bram ev_hedda ev_landing ev_in ev_seen
ev_kick ev_gate ev_board`. The marker `ev_v` is set when chapter 8 begins, or on loading a chapter-8 save from before whose
relay (the end of Zoé's run) is still ahead; in such a save made after he has been home the arrival counts as seen
(`ev_cart: 'past'`: no journal line for a cut-away he never saw). Without the marker every new step counts as done: the gate
stands open, no board, no cart, no stop; Zoé's run ends at the lighthouse and he is put at the control room, as before. A
save during Zoé's run resumes before it, as every save in her run always did; the lane's part of it (the sheets read, the
people told) resets with it. The water gate and the landing stand in every chapter, the gate open (only the chapter-8 lane
shuts it until the cock is turned); the board and the cart are chapter 8's.

**Hands.** One new hand action: the culvert's cock (`story/reach.js` `tinker`, the handle at 1.2 m like chapter 2's two
cocks), both the kicked-back turn and the turn that opens it. Measured in `tests/campaign-hands.mjs`: 0.0 cm and 0.2 cm from the
cock's drawn surface at the moment each takes effect. Zoé's reading of the board is a look (no hand). The riders step up to the
cart's side and sit on its benches (the rig's `sit`, their feet on the bed); the driver sits at the wheel.

**Vega 8 budget** (draw calls and triangles of one frame, all passes, the same save `base-11-town` and camera spots,
1280×720, Medium; SwiftShader: counts only, no timing):

| Spot (save `base-11-town`) | draw calls: base → wave 4 | triangles: base → wave 4 |
|---|---|---|
| the lane at the landing, looking north (the gate) | 300 → 307 | 1,140,658 → 1,144,588 |
| the plaza's south end, looking at the lane | 182 → 194 | 974,803 → 983,923 |
| the lighthouse path's stop (the board) | 294 → 298 | 1,041,544 → 1,045,204 |
| the pump room by the pier (the culvert's pipe) | 33 → 35 | 49,290 → 52,684 |
| the spaceport bridge | 270 → 275 | 1,222,016 → 1,223,310 |
| the lane, the cart at the landing (wave 4 only) | — → 320 | — → 1,146,316 |
| the lane waiting at the landing, five people (wave 4 only) | — → 329 | — → 1,159,776 |
| the spaceport bridge, the lane in the queue (wave 4 only) | — → 295 | — → 1,241,858 |

At most +12 calls where the gate and Hedda and Tobin at their door are in view (the plaza's end), +7 at the gate itself,
+0.9 % triangles. The static parts (the posts and caps, the grate's frame and bars and its dark floor, the landing, its stone
bench, the signs) are one Kit of three materials (the posts' sand stone, iron, one atlas texture for every sign and both
sheets); the two leaves are one instanced mesh; the float and its rod one mesh; the water over the grate one. The board is
a Kit of two (its wood, the atlas), shown only in chapter 8. The cart is a Batch of five materials (its teal, iron, planks,
the hazard stripes, the atlas), drawn only while it drives (+13 calls then). The people are the story's own (Hedda, Tobin:
two more in the lane in chapter 8, the most of the cost when the five wait). The counts were taken after the gate's moving
parts and materials were folded together (first measure: 309, 194, 300, 35, 276).

**Files.** New: `src/game/story/laneline.js` (the thread: `story._ev`, owned by evacuation.js and asked first),
`src/game/lanegate.js` (the gate, its posts, float and grate, the landing, the board, the list cart and its paths),
`src/game/text/laneline.js`. Hooked into: `story/evacuation.js` (npcDefs, decorate, place, begin, interactables,
interact, talk at home, `endZoe` keeps Zoé on in a game with the lane, a new `backToTwinsen` at the landing, the control
room waits for the boarding, update, applyFlags, objective, markers, journal, `talkFirst`), `pumproom.js` (the culvert's
pipe out of a grated sump, its cock and the sump's water; `surge`: the copper pipe kicks whatever the bypass), `story/index.js`
(one call: a chapter's own `talkFirst` before the town's stories), `engine/voice.js` (Hedda in the lane speaks with Hedda's
voice; Tobin a man's). `pumpline.js` (chapter 2's thread) is untouched: its room is reused. The farmers' walk in Zoé's run
(farmer 2) goes round the garden railing's west end instead of through the lane's mouth, where the gate is now.
Tests: `tests/playthrough/11`, `tests/chapter8.mjs` (the chapter suite of Evacuation), `campaign-thread.mjs` (H: C12–C14,
the saves from before; I: the lane by input), `campaign-hands.mjs`, `no-air.mjs` (states 24–26), `save-migration.mjs` (3 new),
`world-consistency.mjs` (the new transition on its allow-list); fixtures `tests/fixtures/campaign/base-11`, `base-11-town`,
`base-11-relay` (made on the build before the wave) and `new-11-town`, `new-11-landing` (made by this wave's playthrough).
Pictures (for the coordinator only): `captures/campaign-wave4/x-*.jpg`.

**Left open by wave 4:** the arrival's cut-away and the boarding are reveal beats (a hard cut to a camera in the lane and
back); in the tests (`?nocine`) they play without the beat, and the pictures `x-ch8-1`, `x-ch8-6*` are framed by a fixed
camera set for the picture, not the game's own beat. From the plateau the lane is far below (the line says he sees it);
whether a first-time player links the cut-away to the lane he is walking home to is not judged. The kick window at the
cock is the pump room's own cycle (three beats in 0.75 s, a rest of 1.65 s; a turn lands about half a second after E):
nobody has judged whether it is easy to find; a wrong turn costs about two seconds. The riders sit on the side benches in
the rig's `sit` pose; Bram's big frame overlaps his neighbour a little (seen in `x-ch8-6c-seated`). The board and the
landing's sign are readable at the board, small from the play camera's distance. Zoé's walk from the lighthouse path to
the lane is the longest new piece of the chapter. The walkers' planner routes Hedda and Tobin round their garden; a player
watching may see them take the long way. `tests/world-consistency.mjs` needs wave 3's two transitions on its allow-list (not
this wave's file to change: wave 3 just merged). Chapter 8 is now over the 125 % line by the estimate (about 1.55 of the old
median).

## 6. The next waves (chapters 4–12 and the aftermath)

Rules for every wave: new flags only, a marker per thread as above (a save from before counts the step as done); every
hand action on a real object; no Earth-style night words; the Vega 8 budget (reuse materials, merge static parts,
report draw calls before and after); the bot's segment and the chapter's suite updated by input; the user's standing
decisions (long chapters are not shortened, nothing is padded, optional stays optional). The thread that runs through
them all is the one wave 1 started: **three kicks and a rest**, first heard in the kitchen wall.

| Wave | Chapters | Build (files) | Flags | Tests |
|---|---|---|---|---|
| 2 (**built**, 5b) | 4 The Dig, 5 Steam and Sand | `story/digtest.js` (new) owned by `dig.js`/`steam.js`; the research post's test stand in `desert.js` (a cutoff lever, an instrument board with two needles, the project's wire). Chapter 4: after the notebook, Dallan runs the scheduled test and needs a second pair of hands at the cutoff; the player throws it, the drill's needle falls, the second needle kicks three and a rest **after** the stop; "again" reproduces it once. Chapter 5: Vesk on the wire diverts heat to Kesh's oasis pump (the oasis' pump of chapter 4 runs: seen); the log Dallan sends is seen on the board with one trace; the copy the player keeps (an item) has two | `dt_v dt_cut dt_second dt_again dt_divert dt_log` | `tests/playthrough/07`, `08`; `tests/chapter3.mjs`, `chapter4.mjs`; a new section in `campaign-thread.mjs` (the test left half way, a save between the two cut-offs) |
| 3 (**built**, 5c) | 6 The Pass, 7 The Observatory | `pass.js`: the winch line's pylons carry the pulse (their lamps and cables shake three and a rest; a surge stops the winch): the two trips are started in the rest between surges (a readable gauge at the winch, a sound cue), a missed start only costs the trip; from the far side the player locks the upper brake so Lhar's people cross without timing. `observatory.js`: the telescope's fourth setting follows the shaking of the snow fields: the line points under the installations, toward Citadel | `ps_v ps_read ps_trip1 ps_trip2 ps_safe ob_dir` (as built: also `ps_lamps ps_miss ob_v ob_snow ob_follow`) | `tests/playthrough/09`, `10`; `tests/chapter6.mjs`, `chapter7.mjs` (the suites of The Pass and The Observatory) |
| 4 (**built**, 5d) | 8 Evacuation | `evacuation.js` + `pumpline.js` (reused): the lane of chapter 2 is the district off the list; on arriving the player sees the project's cart pass the lane's closed gate with empty seats (a cut-away, then control); Zoé (played) reads the schedule against the route at the lighthouse and takes the lane's people to the landing; Twinsen opens the lane's old water gate from the pump room (the bypass he knows: the third pipe's cock drains the culvert) so the cart can come through. Bram, the neighbours and Pippa are seen to board. No side quest is needed | `ev_v ev_cart ev_sched ev_gate ev_board` (as built: also `ev_s ev_r ev_bram ev_hedda ev_landing ev_in ev_seen ev_kick`) | `tests/playthrough/11`; `tests/chapter8.mjs` (the chapter suite of Evacuation); a save in the pump room during the evacuation (`campaign-thread` I5) |
| 5 | 9 The Council (the evidence, the failed shutdown) | `council.js` + `zeelift.js` (Kell): the archive is closed to Twinsen by Vesk's standing order, read on its door; Kell takes him up the cistern lift's service landing to the archive's back gallery (only if the lift was mended on the main route: it always was); the BORE cabinet holds the uncut log (two traces) and the order that cut it, with Vesk's reason in his hand. After the hearing the council orders the stop: the player throws it at the platform's console; the bore's needle falls, the pulse's does not, Mill Lane's taps fail (Kell's lift stops, Brel's jug); Baldino's isolator on the Test Pair bench (`workshop.js`) holds one relay steady at a time: tried by hand | `cn_v cn_closed cn_kell cn_log cn_stop cn_iso` | `tests/playthrough/12`; `tests/chapter8.mjs`; `zeelich-life.mjs` (Mill Lane's states) |
| 6 | 10 Baldino's Network | `network.js`: at each leg the ally walks to the station and takes its handle as the player lets go (seen before he leaves: Irsa at Mill Lane's bypass, Mira at the valve room's wheels, Zoé at the lighthouse dials, Ilka and Dallan at the vent, Yorna and Pim at the dome); Arthur, at home on the radio, counts the knocking (three and a rest, then four): Mira reads the same on the valve room's gauge before anyone acts on it. The hardest station (the damaged connection at the station's code box) stays Twinsen's | `nw_v nw_irsa nw_mira nw_zoe nw_ilka nw_yorna nw_arthur` | `tests/playthrough/13`; `tests/chapter9.mjs`; `cast-rounds.mjs` (the allies' places) |
| 7 | 11 The Shell, 12 The Core | `chapter3.js` + a new `story/answer.js`: in the machinery a damper answers three and a rest with a pattern of its own; the player repeats it at a knocker (a real lever), gets a second reply, and the replies mark the safe catwalks; a failing shutter is held open for him, later the gallery's door is shut behind him (shown first, explained by Sendell after). The banked throw is taught on a safe plate before the stepping stones need it; a checkpoint (autosave) before the core. Chapter 12: the last act in four steps he has done before (reroute one branch at a cock, Irsa's "holding" on the radio, the central lock, the signal to Zoé); Vesk chooses in view; the guards name the cut log and the list | `sh_v sh_knock sh_reply sh_held sh_shut co_branch co_irsa co_lock co_signal` | `tests/playthrough/14`; `tests/chapter10.mjs`; `under-bar.mjs` |
| 8 | Epilogue | `epilogue.js` + `hometap.js` (its parts): after the dinner, control in the kitchen: the tap turned by hand runs cold, Arthur's cup stands under it "just in case", a word with Zoé, then the end screen | `ep_tap` | `tests/epilogue-home.mjs`; `tests/playthrough/14` (its last step); a fresh run 01–14 |

After the last wave: a fresh chain 01–14 from a new game, by input, with its numbers in the table of section 3.
