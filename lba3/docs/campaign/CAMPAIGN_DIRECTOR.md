# Campaign director: LBA3 The Awakening, opening to aftermath (3.11.2026)

Branch `campaign/director` (cut from `8077139`). Base game only: the Ballastra/Oren expansion is on hold and is not
reviewed or touched here. Evidence words used below: **Played** = reached by input from a new game, segment after
segment, each continuing from the previous one's real save (tests/playthrough/01–14 through `tests/lib/seg.mjs`; fights
the bot loses are finished by a logged ISO assist, never counted as input). **Reproduced separately** = reached with
chapter flags set by a test (ISO), then played from there. **Source-reviewed only** = read in the code and text, not run.

## 1. The story as the player now experiences it

Citadel, twelve years after LBA2. Zoé's tap coughs warm and stops; the neighbours' kettle is furred with warm crystals.
Twinsen proves to Mira that the fault is at the spring, kicks the rusted lid open, trades Doran's stamp for Xil's rope,
learns from Tim (in Discreet mode) that he threw a humming stone into the well, and climbs down: crystal mites, three
crystals woken with the ball, and Sendell's first words in twelve years: "Someone has reached her."

Vesk arrives on a ferry that runs on light. He is useful first: he admits his bore diverted the water and sends Twinsen
to open FunFrock's three bypass valves. The water comes back hot, and the project's heat posts light every door; Zoé
"could almost like this Vesk". At the station the same crystals grow in his pipes and he calls the shell readings
calibration noise. Zoé (played) sneaks into the project office and finds the evacuation plan: ships for 30 %, chosen by
him. Confronted, he leaves by the beam. Arthur's repaired radio brings Baldino's call; Doran flies Twinsen to Zeelich.

On Zeelich the plan is confiscated at the dock and recovered from the depot; Oku and Nara read it and side with him.
Baldino explains the shell. The cog, the code cylinder, three mills braked with the ball, Zoé's broadcast from Citadel's
lighthouse (played: sun, wave, star), the platform shield down. Vesk will not stop: his thirty percent is "everyone who
can be saved". He flies home and seals the shaft at Citadel from below; only a code from every project station at once
opens it. Baldino gives the next move: learn what the shell is from the professor the project sacked, on Desert Island.

In Kesh nobody talks to someone off the project's ferry until Twinsen restarts the wind-pump the test bore's tremors
broke (Sani hears which gear grinds). Hesk's sand-yacht, Ilka's notebook stolen from the research post in a sandstorm,
the dig's gate, three warm seals, and the Temple of Bù's carving: the shell has vents, and the project is closing them by
drawing all the heat to one point. Dallan, Vesk's foreman, throws them out but admits he knows the 30 %. In chapter 5
Dallan requisitions the ferry for project staff only; Kesh is not on the list. Twinsen routes the capped bore's steam
through FunFrock's condensers so the oasis does not boil; Dallan, who knows his list leaves sixty people behind, opens
the gate, and then the ferry leaves without him too. The vent breathes, Zoé reads the second vent off the carving, and
Hesk flies FunFrock's glider north.

In the Hamalayi the ice melts from below and Lhar is moving to the monastery. A felled tree, Pim's kite for the
project's missing fuse (the project's heating station, never switched on, now thaws the lift's winch), two winch trips
with ice mites between. At the observatory Sendell speaks openly: she holds the shell with her own light and is fading.
Mirrors, the telescope, a project drone, and the second vent opens; the ground stops shaking. Arthur radios: the project
ships are evacuating Citadel by the list.

Home is changed: queues at the spaceport, the square fenced, the heat posts dark. **Vesk switched them off** to send every
watt to his bore. Gilbert's FunFrock tunnels become shelters, Mira brings water, Pippa supplies, and Zoé (played) leads
the hill families to the lighthouse cliffs, where she finds the transmitter still tuned to Zeelich's council. In the
control room **Vesk answers the opened vents**: the pressure is falling, it changes nothing, full depth in three days.

On Zeelich the council will not act on a story: a petition, two stamps (Oku's for freeing the mills Twinsen braked),
the hearing, the project archive in a borrowed coat, the master plans ("Integrity: not assessed"), and Dallan with Ilka's
proof. The council orders the bore reversed, but only Vesk's console at the bottom can do it. Baldino's network: five
relays at five places the player already knows, each held by a friend (Oku, Mira, Zoé and Arthur, Ilka and Dallan, Pim
and Sefa). At the bore on Desert Island the project's drones and Vesk's men still fight for him; **Dallan orders his old
guard to stand down**, and only FunFrock's machines keep fighting. The doors open; the shaft, the machinery, the crystal
galleries, Sendell (the child under the shell is not ready to wake), the core: three pylons powered by Zoé, Mira and Oku
above, Vesk's guardian, his overload coil broken, and Twinsen switches the bore to a shield himself.

Four days later, dinner at home. The end card answers the 30 %: the heat posts glow again at half heat for every house,
Kesh has its oasis, Lhar its village, Vesk waits in a cell. In Keep Exploring everyone is back where they live and says
so: Gilbert by his cool well, Doran on his quay, the hill families at their farms, Baldino at his bench, Nara and Oku on
the street, Ilka, Dallan (carrying water for the people he left off his list), Tarra and Hesk in Kesh, Yorna, Pim and
Lhar's people home in their village.

## 2. Chapter coverage

One chain from a new game to Keep Exploring, 3.11.2026, on this branch with the fixes in place (LIGHTHOUSE-GATHER was
made after segment 11 had run, so that segment was played again from the chain's chapter-7 save), served at
http://localhost:8130/, headless Chromium (SwiftShader). The segments of tests/playthrough/ each continue from the
previous one's real save (Esc → Save & quit → Continue).

| Chapter | Status | Evidence (segment: verdict) | ISO assists, retries |
|---|---|---|---|
| 1 The Well | Played | 01 surface: PASS, 02 cave: PASS | none (01 ran twice: the first run's reload after Save & quit timed out under load; its play passed both times) |
| 2 The Joint Project | Played | 03, 04, 05: PASS | none (03 ran twice, the same reload timeout) |
| 3 Zeelich | Played | 06: PASS on the third run | the depot fight: 2 of 4 enemies finished by ISO (bot at 2 HP). The old mill: the bot missed the hop from the 6th to the 7th stair-stone on every attempt in runs 1 and 2 (STOP: climb) and made it by input in run 3; the same hop works 5/5 from a standing start (probe) |
| 4 The Dig | Played | 07: PASS | none |
| 5 Steam and Sand | Played | 08: PASS | none |
| 6 The Pass | Played | 09: PASS | none |
| 7 The Observatory | Played | 10: PASS | none |
| 8 Evacuation | Played | 11: PASS in the chain, PASS again from the chapter-7 save with the gathering moved | none |
| 9 The Council | Played | 12: PASS | none |
| 10 Baldino's Network | Played | 13: PASS (the guard stood down: `c10_guardDown` in the kept save) | the bore: one drone, the clone and the sentry by ISO (bot at 1–4 HP) |
| 11 The Shell | Played | 14: PASS | none; the stepping stones crossed by input this time |
| 12 The Core | Played | 14: PASS | none |
| Epilogue, Keep Exploring on Citadel | Played | 14: PASS (dinner, The End, free roam, "See how everyone is doing") | none |
| Keep Exploring on Zeelich, Desert Island, the Hamalayi | Reproduced separately | the chain's final save, the travel network's own move (ISO), a talk with each person; tests/epilogue-home.mjs | — |
| Ballastra / Oren expansion | Not reviewed | on hold by instruction | — |

Routes off the ideal path that were run: Save & quit → Continue at the 13 segment boundaries; old saves (v1; v4 in the
core, the shell and the epilogue; a missing room; a corrupt save: tests/save-migration.mjs PASS); a reload into chapter 8
with the new gathering (segment 11 replayed). Read in the source only: a save made mid wave 2 at the bore before this
branch (the guard is stood down when he appears), a save during Zoé's run (applyFlags restarts her run, as before).

## 3. The important fixes

**1. Zoé's gathering was not at the lighthouse (chapter 8, LIGHTHOUSE-GATHER, `bc17a5da`).**
*Before:* Zoé says she will take the hill families to "the lighthouse cliffs"; the objective says "Zoé: go to the
lighthouse"; every signpost marks LIGHTHOUSE on the south-west headland, a short walk from her own door. Her run ended
only within 6 m of (-66, -55), on the northern plateau by the glider field, 150 m away past the town and the fort, and the
farmers marched north. A player following the words or the signs reaches the tower and nothing happens. (The bot never
noticed: it walks to coordinates.)
*Change:* the gathering is on the lighthouse path's last flat stretch below the headland (-89, 96.5); the farmers'
lanes lead there (A* routes from each farm); they face the lighthouse; the landing line no longer calls the plateau
"above the lighthouse"; the tests read the spot from the game.
*Verified:* tests/playthrough/11-evacuation.mjs by input from the chain's chapter-7 save: PASS (the gathering 2 s after the
last farm instead of 15 s across the island); tests/chapter8.mjs PASS (13); tests/cast-rounds.mjs `ONLY='chapter 8'` PASS
(38); two wide screenshots of the families on the sand below the headland.

**2. The ending did not reach the people the player helped (EPILOGUE-HOME, `e1c9df76`).**
*Before (played: the chain's final save, talking to each in turn):* Gilbert at the fortress shelter's door, Tim and Lulu at
the depot bunker, Ilka and Dallan at the bore, Yorna and Lhar's villagers in the monastery yard; Doran, Nara, Oku, Hesk
and Pim not in the world; Baldino at his bench behind a door with no prompt; everyone away from Citadel said "Hello,
Twinsen." Zoé's dinner line had everyone "back from the hills" though the town had gone into FunFrock's tunnels. The end
card never answered Vesk's last threat ("doomed two worlds to the cold").
*Change:* the epilogue puts everyone back where they live, each with one line about what changed: Dallan carries Kesh's
water every morning and Tarra has not forgiven him ("It will take a great many jars"); Yorna's village is home again;
Nara reports the council's vote for half heat for everyone, docks included; Baldino was hired as the shield's engineer.
Lhar's residents come home with them. Baldino's workshop and Sefa's dome open again. The end card: the heat posts glow
again at half heat for every house, on the list or not; Kesh has its oasis and Lhar its village. The objective: "See how
everyone is doing".
*Verified:* tests/epilogue-home.mjs (new): 11 passed; the chain's final save probed before and after.

**3. The antagonist reacted to nothing the player did between chapters 3 and 12 (chapter 8, VESK-ANSWERS, `4e063ed7`).**
*Before:* Twinsen opened two vents (chapters 5 and 7) that the carving says relieve the shell; Vesk's broadcast only gave
the deadline, and the heat posts were dark "to save power", nobody's decision.
*Change:* Vesk says somebody is opening FunFrock's old vents, the pressure is falling, and it changes nothing: every watt
to the bore, three days. Zoé says Vesk switched off the heat posts. Twinsen: "He knows the vents are open. So he drills
faster."
*Verified:* played in segment 11 (the chain, and the replay); text only.

**4. Every opponent fought on like a machine after the council's vote (chapter 10, STAND-DOWN, `eb7dc5e8`).**
*Before:* at the bore Vesk's guard, FunFrock's clone and the sentry all came at Twinsen, while Dallan, who turned in
chapter 5 and spoke at the hearing, stood by. Wave 2 was the hardest stretch of the late game for the bot (QA.md).
*Change:* when the Grobo guard comes out of his cabin, Dallan orders him to stand down under the council's order ("you
were on my roster for a year"); he lowers his rifle and walks back in, nothing drops, he stays gone after a reload.
Twinsen notes that the clone and the sentry are FunFrock's machines still keeping old orders, and those are fought.
*Verified:* tests/chapter10.mjs with a new check: 27 passed; played in segment 13 (the guard never fought, `c10_guardDown`
in the kept save).

**5. The core's radio repeated a solved errand (chapter 12, ALLIES-STILL-THERE, `2494703d`).** Baldino had Oku and Nara
"releasing the mills" that Twinsen freed in chapter 9 and that turned for the relay in chapter 10; now the friends are
"still at their stations". Played in segment 14.

What each fix carries forward from LBA1/LBA2: a familiar place changed on return (the epilogue's homes, Lhar lived in
again), a person solving what a fight would (Dallan and his old guard, as LBA2's inhabitants open ways the ball can't),
and the island's own landmarks meaning what they say (the lighthouse).

## 4. The opposition: motives in play

| Who | Wants | Who supports them, and why | Afraid of losing | The harmful decision they make | After Twinsen interferes | Where the player sees, challenges or suffers it |
|---|---|---|---|---|---|---|
| Vesk, chief engineer | the power under the shell for the project ("it will be ours"), and his chosen 30 % warm forever | the Zeelich upper districts and Councillor Brum (first warm winter), drill crews and their families (jobs), Councillor Sela (trusts his charts), Dallan (orders) | ten years of work; the bore | the 30 % list (ch 2); sealing the shaft behind him (ch 3); switching off Citadel's heat posts and drilling faster once the vents open (ch 8); the overload (ch 12) | flies home and seals the shaft (ch 3); a drone at the second vent (ch 7); answers the opened vents by drilling faster (ch 8); sends the guardian, then the overload (ch 12) | valves and heat posts (useful, ch 2); the plan in the office (ch 2); the platform (ch 3); dark posts and the queue (ch 8); the control-room screen (ch 8); the core fight (ch 12) |
| Dallan, project foreman on Desert Island | to follow the plan | his guards (he signed their roster) | his post; being blamed | caps the test bore and keeps Kesh off the list (ch 4–5) | left off his own list, opens the gate (ch 5); brings Ilka's proof to the council (ch 9); stands down the bore guard (ch 10) | the memo on his desk, the dig (ch 4); the requisitioned ferry (ch 5); the hearing (ch 9); the bore fight (ch 10); carrying Kesh's water after the end, not forgiven |
| The Zeelich council (Amaru, Sela, Brum) | heat for Zeelich | citizens who had their first warm winter | the cold | refuse to act on "a story" (ch 9) | demand proof; Brum turns when his cousin on the bore is named; vote to reverse (ch 9); vote half heat for everyone after (epilogue, Nara) | the hearing and the archive (ch 9) |
| Project guards and workers | wages, orders | — | their jobs | confiscate the plan (ch 3); guard the depot, the post, the bore | the platform guard gives way (ch 3); Bren stands down to Dallan (ch 10) | the dock (ch 3); the research post in the storm (ch 4); the bore (ch 10) |
| FunFrock's machines (drones, clones, the sentry), reactivated by the project | nothing: old orders | — | — | attack anything not the project's | they never change: the contrast with the people who do (ch 10) | depot (ch 2–3), condenser hall (ch 5), the bore (ch 10) |
| Vesk's bore guardian | — (his tool) | — | — | keeps Twinsen from the pylons, then overloaded on Vesk's order | — | the core (ch 12) |
| Crystal and ice mites | creatures of the cracks where heat leaks | — | — | swarm where the shell leaks | — | the well (ch 1), the pass (ch 6), the ridge (ch 10), the galleries (ch 11) |

Sendell is not an adversary: she asks for help instead of saving everyone (ch 7, 11).

## 5. The opening's promises against the ending

| The opening shows | Paid off |
|---|---|
| Zoé's tap stops, then runs warm; the well is dry | the well returns hot (ch 2) and runs cool at the end (Gilbert wants his refund) |
| A resident asks when the harbour row gets the heat: "every home gets it, Vesk promised" | the heat posts light the town (ch 2), go dark by Vesk's order (ch 8), and glow again at half heat for every house (the end card; Nara on Zeelich) |
| "What's that hum?" "Just the drill." Lulu: digging to the middle of the world | the bore through the shell to the child Sendell guards (ch 11), turned into a shield (ch 12) |
| Sendell: "Someone has reached her." | her shrine (ch 7) and her chamber (ch 11): the child is not ready to wake; "She is asleep again" (ch 12) |
| Arthur wants to see something interesting; Grandpa's radio | Baldino's call (ch 2), the project channel (ch 3), radios for Bug Street (ch 5), the evacuation call (ch 7), "Station ready!" at the lighthouse (ch 10), "can I fix the next radio too?" |
| Zoé goes next door and comes back with proof | the evacuation plan (ch 2), the warning broadcast (ch 3), the hill families and the council relay (ch 8), the frequency (ch 10) |
| "Take your magic ball. Just in case." | every chapter's mechanisms; the core's bank shots off brass under fire (ch 12) |
| Arthur's model boat ("now the sail") | not paid off (small; left as it is) |

## 6. Runs and verdicts (this branch)

| Run | Verdict |
|---|---|
| tests/playthrough 01–14 chained from a new game (a scratch copy of tests/lib/seg.mjs that waits longer for the reload after Save & quit; one retry per segment) | all 14 PASS; reruns: 01 and 03 (reload timeouts; the play passed), 06 (the bot missed a stair-stone hop twice; PASS by input on the third run) |
| tests/playthrough/11-evacuation.mjs again from the chain's chapter-7 save, with LIGHTHOUSE-GATHER | PASS |
| tests/epilogue-home.mjs (new) | PASS, 11 checks |
| tests/chapter10.mjs | PASS, 27 checks (with the stand-down) |
| tests/chapter8.mjs | PASS, 13 checks |
| tests/cast-rounds.mjs `ONLY='chapter 8'` | PASS, 38 checks |
| tests/save-migration.mjs | PASS, 11 checks |

Not run (the laptop): the whole of cast-rounds, residents (Lhar's residents now go home after the ending: only that branch
of storylife.js changed), chapter3.mjs (its epilogue path is segment 14's), the other chapter tests.

## 7. Unresolved

- **No objective marker on the map outside Citadel.** Chapters 3–7 and 9–12 return no markers (the story modules'
  `markers()`), and the holomap only shows Citadel (main.js `mapMarkers`). The objective text carries the hints; a player
  lost on Desert Island or Zeelich has nothing on the map. Source-reviewed only.
- **The old mill's stair-stones (chapter 3, again in 10):** the bot missed the hop from the 6th to the 7th stone on all
  attempts in two of three runs of segment 06, and made it in the third; from a standing start it works 5/5. Probably the
  bot's run-up, but the spot deserves a human try.
- **Fights finished by ISO:** the Zeelich depot (chapter 3) and the bore (chapter 10, now one enemy fewer), with the bot at
  1–4 HP. Balance by a human is still untested (as QA.md says).
- **Allies at the core:** three pylons (Zoé, Mira, Oku); Ilka and Dallan, Pim and Sefa, who held relays in chapter 10, are
  not heard in the finale. The Hebrew synopsis still describes five pylons and repeats chapters 11 and 12; STORY_MAP.md
  still says the Core sits inside the Shell. Docs not changed here.
- **Dallan's way to Zeelich in chapter 9** ("Ilka sent me on the second ship") is thin after he was stranded in Kesh.
- **Vesk's fate** is told by Baldino's radio line and the end card; there is no scene with him after the coil.
- **The lighthouse lamp room** stays shut after the ending (CONNECTIONS_AUDIT C-3).
- **The new gathering spot:** the cart and bundles there were not checked from close up (two wide screenshots show the
  families on the sand below the headland).
- Chapter 5: after the valves the objective jumps to the relief valve while the hangar's glider and hatch are still in
  front of the player (segment 08); minor.
- Text for chapters 3, 8, 10 and the epilogue is English only.
