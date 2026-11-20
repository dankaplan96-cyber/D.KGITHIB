# PUZZLES (P80): the campaign's puzzles, audited and improved

**Team-only. Spoilers** (every chapter is named). The brief: `PUZZLES-BRIEF.md`. Base `ccr-c1c2c4b9-dep6ed` at
`89d3735d` (v105). Labels as in `PROJECT_CONTRACT.md`: **Source-reviewed only** (read in the code), **Automated runtime
only** (a test bot drove it in headless Chromium on SwiftShader). Nobody has played any of this.

## 1. Audit: every puzzle in play order

Read from the story modules (`src/game/story/*.js`, their heads and handlers), their rooms (`condenser.js`,
`hamalayi.js`, `underground.js`, …), the playthrough segments' step lists (`tests/playthrough/01…14`), the chapter
suites and the earlier working lists (TUT-MYSTERY, MIDDLE-VARIETY, MILLS, EXP-3, chapter-balance). Chapter numbers are
the expanded campaign's (`story/index.js` NUMBER). "Verified" names the suite or segment that drives the step in the
campaign (FULL-TEST, 20.11: every one listed PASS). Types: **obs** observation/clue, **ball** a magic-ball target,
**aim** a bank or lob shot, **hand** a lever/valve/wheel by hand, **seq** a sequence or setting, **time** a timing
window, **stealth**, **fight**, **social** a person, **fetch**, **evid** evidence compared, **trav** jumps/climbs.

Problem codes against the brief: **C** clarity (the question is not seen), **A** no visible answer / wrong feedback,
**V** variety (the same decision as a recent puzzle), **F** fairness (hidden, precise, or a long walk after a failure),
**T** text gives the answer (nothing left to notice), **—** none found.

### Main route

| # | Ch | Place | The player must understand | Question shown / answer shown | Type | Problems | Verified |
|---|---|---|---|---|---|---|---|
| 1 | 1 | the house | take the ball before going out | the door holds him; the cupboard marked | hand | — (a gate, short) | prologue, seg 01 |
| 2 | 1 | the kitchen tap | the water is wrong | dry; the pipe knocks (sound + his line) | obs | — | seg 01 |
| 3 | 1 | the yard: Zoé, inventory, garden tap | the knock comes from somewhere | the tap knocks back **behind the near barrel**; the barrel rocks, Zoé turns to it | obs | — (TUT-MYSTERY) | tutor-targets 26/26 |
| 4 | 1 | the yard: the barrels | the ball moves what a hand can't | by hand the barrel rocks and settles ("a good knock with the ball"); the ball shoves it aside: the brass joint, crystals, wet ground | ball | — (reward for the barrels first: the step is not asked again) | tutor-targets |
| 5 | 1 | the yard: the pipe | a jump is allowed | marker on the pipe; walking round also ends the yard | trav | minor **F**: offered as the quick way, not a real shortcut (TUT-MYSTERY risk; walk round ≈ the same) | tutor-targets |
| 6 | 1 | the lane | the pump room is part of it | its pipe knocks (the same three) | obs | — | seg 01 |
| 7 | 1 | the well → Mira | the town won't take his word | Mira refuses; Zoé's furred kettle is the proof | social, evid | — | prologue, seg 01 |
| 8 | 1 | the well lid | Aggressive kicks | "rusted to the rim" → the kick | hand | — | seg 01 |
| 9 | 1 | the harbour | wake Doran without walking in | Doran asleep; the bell high on its post; the ball rings it | ball | — (a reason to hit it) | seg 01 |
| 10 | 1 | Xil, the rope | — | asked | social/fetch | — | seg 01 |
| 11 | 1 | the cave | the warm pool and the growth follow the pump | the pump's cycle heard, the growth moves | obs | — | seg 02 |
| 12 | 1 | the cave | wake the crystals | three crystals, the ball | ball | minor **V**: "hit the three" (first of several) | seg 02 |
| 13 | 2 | the Water Office | the three bypass valves | the pipe map | obs | — | seg 03 |
| 14 | 2 | the caged orchard | lob over the bars | the valve behind a cage | aim | — | seg 04, chapter1 |
| 15 | 2 | the depot | get past the watch | patrols, the guarded yard | stealth/fight | **F** (chapter-balance: the early game's damage spike; stealth route exists) | seg 04, depot-watch |
| 16 | 2 | the Whispering Cliffs | the target raises the stones | target, then stones rise | ball, trav | — | seg 04 |
| 17 | 2 | the pump room (CAMPAIGN-2) | the diagram is wrong: two pipes drawn, three there | **the copper pipe shivers** three and a rest (felt by hand, seen along its run) | obs | — (the campaign's best early "notice it" puzzle) | seg 05 |
| 18 | 2 | the bypass cocks | which cock feeds the houses | upper: more water to the square, Zoé knocks once; lower: two knocks | hand, obs | — (a wrong try gets a clear answer) | seg 05 |
| 19 | 2 | the project office (as Zoé) | the lockers unseen | guards' rounds | stealth | — | seg 05, zoe-resume |
| 20 | 3 | the cistern lift (CAMPAIGN-3) | why Kell won't move the lift | the cart loose on the deck; chain, bell, feed switch, ride, shove, cock | hand, social | minor: a long chain of single presses | seg 06, chapter2 |
| 21 | 3 | Irsa's bench | a pump pushes, the strip is pushed | the needle kicks the other way | evid | — | seg 06 |
| 22 | 3 | the depot locker | — | drones, guard, dog | fight/stealth | **F** (the bot needs an ISO assist; chapter-balance) | seg 06 |
| 23 | 3 | the old mill | climb | the cog at the top | trav | — | seg 06, jumpreach (KNOWN-FAILING) |
| 24 | 3 | the three mills | brake them; it costs the fountain | the mills turn; the fountain stops (MILLS) | ball | — | mills 19/19 |
| 25 | 3 | the lighthouse (as Zoé) | the riddle's order | "what wakes us, what the sea does, what twinkles" | seq | minor **T** (the riddle is easy; fine for a radio call) | seg 06 |
| 26 | 4 | Kesh's wind-pump | listen: one gear grinds | Sani's clue, a gust shows the gear; the ball knocks it; the joint pushed home | obs, ball | — (MIDDLE-VARIETY: a best moment) | seg 07, chapter4 |
| 27 | 4 | the pier → Hesk | — | the rope | fetch | minor (short) | seg 07 |
| 28 | 4 | the research post | move with the sandstorm's cover | the storm's gusts | stealth | — | seg 07 |
| 29 | 4 | the test stand | the ground kicks after the stop | the needle; the kicks 3-rest-3 | time, obs | — | seg 07, digtest |
| 30 | 4 | the dig: keypad | the worn keys and the notebook's order | wear on the keys | obs, seq | — | seg 07 |
| 31 | 4 | the temple door | three of five discs are warm | steam off three; a cold one thuds and resets the open ones | ball, obs | — | seg 07, chapter4 |
| 32 | 5 | Brosk, the oasis | — | jar → water → shovel | fetch | minor (short; each step a person) | seg 08 |
| 33 | 5 | **the condenser hall** | send the bore's steam to the condensers, not the aquifer | **the wall diagram prints the settings** ("1 open, 2 shut, 3 and 4 open", green/red dots); the gauges sit over the wrong valves (the gauge over valve 2 shows line 3's flow, over 3 line 4's, over 4 the aquifer: `condenser.js` gx vs `steam.js updateGauges`); the diagram names a valve 5 that is not there | hand, seq | **T, C, A, V** (chapter 2's diagram again; nothing to work out; the gauges mislead a player who watches them) | seg 08, chapter5 |
| 34 | 5 | the hangar | open the roof | the ball switch on the gantry | ball | minor (find and hit) | seg 08 |
| 35 | 5 | the stand | the log has one trace | read against the carbon | evid | — | seg 08 |
| 36 | 5 | the post | talk past Dallan; open slowly | the gauges; geysers, plumes | social, hand | — | seg 08 |
| 37 | 6 | the gorge | fell the frozen tree | the tree over the gorge | ball | minor (find and hit) | seg 09, chapter6 |
| 38 | 6 | the heating station | the fuse is on Pim's kite | the kite in the icefall | ball, social | — (a best moment) | seg 09 |
| 39 | 6 | the mooring rope | the sword cuts | frozen rope | hand (sword) | — | seg 09 |
| 40 | 6 | the rope lift | start in the green quiet | the gauge kicks 3-rest; a late start costs the trip | time | — | seg 09 |
| 41 | 7 | the observatory | carry two suns to the crystal | the frozen slit (ball); the floor mirrors turn two ways; one beam = faint glow | aim, seq (spatial) | — | seg 10, chapter7 |
| 42 | 7 | the telescope | the fourth setting; the bearing | the ring read: Citadel | obs | — | seg 10 |
| 43 | 7 | the glacier | the heavy drone | — | fight | minor (trivial for the bot) | seg 10 |
| 44 | 7 | **the vent's seal** | three of five discs are warm | steam off three; the ball wakes them; a cold one only rings | ball, obs | **V** (chapter 4's temple door, #31: the same prop and the same decision three chapters on; added for length) | seg 10, chapter7 |
| 45 | 8 | the fort yard | the lever by the cistern | the squad, then the lever | fight, hand | minor (find and pull) | seg 11, chapter8 |
| 46 | 8 | the depot bunker | someone small fits the gap | the door stops a hand's width open on its bar; Lulu goes in (MIDDLE-VARIETY) | ball, social | — | middle-variety 19/19 |
| 47 | 8 | the lighthouse path (as Zoé) | the schedule vs the route | the lane's names crossed off one | evid | — | seg 11 |
| 48 | 8 | the pump room | open the culvert cock in a rest | the copper pipe kicks 3-rest; a kick throws it back | time | — (chapter 6's rule, a new place) | seg 11 |
| 49 | 9 | the street | the stamps | Nara; Oku (the mills if still braked) | social, ball | — | seg 12, mills |
| 50 | 9 | the archive | in by the service door; the archivist's back | Kell's lift; the round; the key ring; the BORE drawer | stealth | — | seg 12, chapter9 |
| 51 | 9 | the drawer | his carbon matches the uncut log | line for line | evid | — | seg 12 |
| 52 | 9 | the bench | the isolator holds one relay, not two | both relays jump; one holds | hand, obs | — | seg 12 |
| 53 | 10 | the valve room | open each bleed **while it kicks** | between kicks it kicks back (no harm) | time | minor **C**: the inverse of chapters 6/8's "in the rest"; the kick-back explains it | seg 12b, exp-throttle |
| 54 | 10 | the project office (as Zoé) | the third crate is the missing one | 212/1, 212/2; the third turned to the wall | evid, search | — | seg 12b |
| 55 | 10 | the shelter's branch | feed off, fit, feed on, band to green | a flange sprays him back; weep / trickle | seq, hand | — | seg 12b |
| 56 | 11 | Float Harbor | the counterweight's balance | the crank works backwards; the crane's load lands only on the middle | hand, ball, spatial | — | exp-ballastra 33/33 |
| 57 | 11 | the Water Gardens | share, don't shut | the bodged tap; the seized bypass (melee); the splitter's gates | hand, ball | — | exp-ballastra |
| 58 | 11 | the Arch District | the spill gate | the chain (sword), the pawl (ball); the silted door | hand, ball | — | exp-ballastra |
| 59 | 12 | the House of Balances | the book contradicts the bench | the needle settles "as if a hand held it" | evid | — | exp-balances 30/30 |
| 60 | 12 | the rig | each neighbour's band | amber/red spills; the neighbour says which way; twice | seq | — | exp-balances |
| 61 | 13 | the Cradle Hall | one hand tires; many hands | the lever fails safe; the bell; handovers between strokes | time, social | — | exp-balances |
| 62 | 14 | the old mill | the climb again | (chapter 3's) | trav, ball | **V** (a deliberate callback; chapter-balance proposes the hop-pack as a choice) | seg 13 |
| 63 | 14 | the valve room (Mira) | each valve feeds two mains, the fourth floods the fortress | three gauges to the green mark | hand, seq (logic) | — (a real combination puzzle) | seg 13, chapter10 |
| 64 | 14 | the lighthouse | the dials, the star moved to the front | Arthur reads the needle | seq | minor **V** (callback with a change) | seg 13 |
| 65 | 14 | the bore relay | hold it against the drones | — | fight | — | seg 13 |
| 66 | 14 | the station's code box | clip the joint in the rest after the fourth | the fourth knock throws a late clip off | time, count | — | seg 13 |
| 67 | 15 | the shaft | the bank shot where nothing shoots back | the receiver behind the stub, its plate | aim | — (teaches #74; optional) | seg 14 |
| 68 | 15 | **the cooling machinery** | cool the exchanger: A and C on, B is a drain | **the wall diagram states it** ("A and C feed the exchanger; B to a drain, crossed out"); valve C on the catwalk (the ball drops the ladder; the knocker latches the vents) | hand, ball, obs | **T, V** (chapter 5's hall again, its drain = the aquifer; the knocker part is good) | seg 14, chapter3 |
| 69 | 15 | the galleries | pillars; the third heart off the mirror | stepping stones rise | ball, aim, trav | — | seg 14 |
| 70 | 16 | the core | bank shots from the plates while it is stunned | the pylons | aim, fight | — | seg 14, chapter3 |
| 71 | 16 | the bleed valve | stun first, then turn | a valve stand on the deck ring | hand, fight | minor | seg 14 |
| 72 | 16 | the last act | the branch cock in the rest; the bar after her two; two knocks | chapters 2/8/14's rules again, each once | time, count | — (a deliberate finale of learned rules) | seg 14, vesk |
| 73 | 17 | the epilogue | — | dinner; Keep Exploring | — | — | epilogue-home, seg 14 |

### Optional (side quests and finds; all optional, none gates the ending)

| # | From ch | Where | Puzzle | Type | Problems | Verified |
|---|---|---|---|---|---|---|
| O1 | 1 | tavern, Tim and Lulu | overhear the boys (Discreet) | stealth/social | — | seg 01 |
| O2 | 1 | the bay rocks | up (Athletic), the warm stones | trav | — | seg 01 |
| O3 | 1 | the depot yard | Funfrock's chest unseen | stealth | — | depot-watch |
| O4 | 1 | under the street (sewers) | the knocking valve box eased shut; Fosse's padlock; the globe's bleed cock | obs, hand | — | sewers, sewers-ways |
| O5 | 2 | the house (pocket set) | the hum leads to the coat, then the loose tile | search (tool) | — (POCKET-SET fixed its first use) | equip2 |
| O6 | 2 | One More Place (U-2) | tune Brix's set by the green eye | seq (dial) | — | one-more-place |
| O7 | 2 | the asylum hostel | the humming crate | search (tool) | — | asylum |
| O8 | 3 | the West Pier, Last Ferry (U-1) | the bridge wheel moves the counterweight off the port; the ball through the port trips the catch | hand, aim, spatial | — | last-ferry |
| O9 | 3 | Zeelich, Twelve Years Late (U-4) | the old picture is the address | obs (spatial) | — | twelve-years-late |
| O10 | 3 | Baldino's workshop | the test pair: relays talk by sight (the hoist), the drip tap | hand, obs | — | workshop |
| O11 | 3 | Nara's Esmer line | the cloud canal lesson | trav (tool) | — | equip2b |
| O12 | 4 | Knartas (ISL-1) | sort Jaspa's stones by warmth | obs, seq | minor **V**: chapter 4's warm rule (before or after the dig; the fork is an alternate tell) | depth-1 |
| O13 | 4 | Off the Wall (U-3) | rebounds: off the wall, clean, the board | aim | — | off-the-wall |
| O14 | 4 | the dig (fork) | the warm crust, the sleeping crystal | tool | — | equip2b |
| O15 | 6 | the waystone (HAM-1) | turn the dome's face to the observatory | spatial | — | depth-1 |
| O16 | 15 | the shaft's riser (U-5) | knock rhythms by valve weight; answer backwards | time, seq | — | quiet-channel |
| O17 | 15 | the galleries (fork) | the stuck crystal wheel | tool | — | equip2b |

### Count

**73 main-route puzzle steps** (chapters 1–17, the expanded campaign) and **17 optional**: 90 in all. Problems found:
**4 major** on the main route — #33 the condenser hall (T, C, A, V), #44 the vent's seal (V), #68 the cooling
machinery (T, V), and the shared one behind #33/#68: two diagrams that print the answer, ten chapters apart, each with a
"wrong drain" valve — plus **16 minor** (#5, #12, #15, #20, #22, #25, #27, #32, #34, #37, #43, #45, #53, #62, #64, #71
and O12, counting #62/#64 as one callback note; most are short "find and hit" or fetch beats that work as pacing). Not a
problem: the "in the rest" timing motif (#40, #48, #66, #72) is one rule in new places, on purpose (MIDDLE-VARIETY);
#53 inverts it and says so by the kick-back.

Chapters skipped by normal progression: none in the expanded campaign (chapters 12–13 are written since EXP-3). A base
campaign save (`exp_base`) skips 10–13 by design.
