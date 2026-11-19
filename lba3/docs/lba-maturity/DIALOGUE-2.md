# DIALOGUE-2 (status.md P71): the dialogue's second pass, 19.11.2026

Worker: lba-dialogue-editor, branch `worktree-agent-a207d6cab32da00d2` from `ccr-c1c2c4b9-dep6ed` at `6d7bd926`. Brief: the
"Mission of 15.11" in `.claude/agents/lba-dialogue-editor.md` (re-sent by the user 19.11). The first pass is
DIALOGUE-EDIT.md; this pass goes scene by scene through what it left "kept, source only", its remaining items 1-3, and the
text written since 15.11 (the opening's tutorial steps and markers, weapon switching, the arsenal, SPACEPORT-3, chapter 11).

**Evidence labels.** *Source only*: the exchange was read with the code that plays it (story module, its conditions and
order). *Automated runtime*: a test drove the game headless with the edited text. Nobody listened to or played a line.

**References.** The original LBA1/LBA2 text is not on this machine (as in DIALOGUE-EDIT); no original line was read or
quoted. The character guide (STORY_BIBLE.md, the brief's voices) was used.

**Rules kept.** IDs, speakers, placeholders and quest flags unchanged unless a line is listed as new; every changed or new
English line has its Hebrew in `text/he/` (then `node tools/he-bundle.mjs`); voicemeta entries keep one intention per
sentence; `node tests/dialogue-check.mjs` PASS at every commit.

## Coverage

Status: **edited** (lines or a line's condition changed), **kept** (read in its scene, nothing needed), **flagged**.

| Ch. | Scene | Characters | Status | Evidence |
|---|---|---|---|---|
| 1 | opening film (`op_*`) | resident, worker, Arthur, Twinsen, Zoé | kept (timed subtitles; the lines already short and in character) | Source only |
| 1 | home: Arthur at his boat, the kitchen tap, the cupboard (`prh_*`, `pr_cupboard`, `pr_tw_ballfirst`) | Arthur, Twinsen | kept | Source only |
| 1 | the yard: Zoé's steps (`t2_ask_*`, `t2_back_*`, `t2_hint_*`, `t2_where_*`, `t2_goal_*`) | Zoé | **edited**: the tap step names the garden tap and why (the film's tap was the kitchen's: "Is our tap knocking too?" asked about a tap she had just seen stop); the barrels as Arthur's bet; the pipe line no longer says he "used to" clear a pipe the project laid recently | Source only (opening-tutorial.mjs checks the keys, not the words) |
| 1 | the kettle crystals | Zoé, Twinsen | kept (edited in pass 1) | Source only |
| 1 | the square: Gilbert and Mira, the key, the lid | Gilbert, Mira | **edited** `pr_mira_2b`: she concedes, gives the key, then the waiver, so Gilbert's "And last month too" answers the line before it ("Fine." after her own admission read as the wrong reaction) | Source only |
| 1 | the harbour: Xil, Doran, the bell | Xil, Doran, Twinsen | **edited (branch)**: the objective named "Xil needs Doran's stamp" as the way to a rope, but nobody ever mentioned a rope before Xil handed one over. Once Twinsen has seen the well he now asks for one (`pr_tw_xil_rope`, `pr_xil_rope`, once: flag `pr_xilRope`, optional, false when absent) | Source only |
| 1 | the kids | Tim, Lulu | **edited** `pr_tim_2a`: Tim found the stone "on the beach", two lines later "up on the big rocks at the bay": now the bay rocks in both | Source only |
| 1 | the well's bottom, Sendell | Twinsen, Sendell | kept | Source only |
| 1 | after the prologue (`pr_zoe_after`, `pr_ar_after`) | Zoé, Arthur | unreachable: `endPrologue` goes straight to chapter 2's transition; left in place | Source only |
| 1 | FRESH-EYES pass over chapter 1 | Twinsen, Zoé, Mira, Tim, Sendell | **edited**: `op_tw_2` "the square's well" (the film's link from the tap to the well); `prh_tap_1` "Stopped again… three times, then nothing" (the film showed it run; plants the three knocks later lines call back to); `pr_zoe_kettle2` says Mira has the well padlocked; `pr_locked` "They've gone to the square" (Zoé had just been next door); `pr_mira_no` a reason that survives a look at the dry well (wells go low in a dry month, his pipes leak, no unlocking on a rumour); `pr_tw_tim2` spoken to Tim: "One stone doesn't stop a well" (the red herring cleared); `pr_tw_sendell` says who Sendell is; `pr_obj_done` "Chapter complete" (not "Prologue"); `t2_zoe_done`/`t2_zoe_close` "And be back for dinner" (the epilogue's bookend now set up on the main path) | Source only |
| 1→2 | the chapter's last word | Twinsen | **edited (order)**: the pump thought (`prh_tw_cycle`) no longer follows Sendell's "Someone has reached her."; it opens chapter 2's morning instead (`c1_tw_morning_pump`, for games with the well's v2 scene; older saves keep `c1_tw_morning`) | Source only |
| 2 | the morning, home | Twinsen, Gilbert, Zoé, Arthur | **edited** `c1_zoe_home1` ("didn't come up till morning": he spent the night below and nobody remarked on it) | Source only |
| 2 | Vesk at the harbour | Vesk, Twinsen | **edited** `c1_vesk_4`: why Twinsen and not his crews (all on the bore; he knows the island), and "use my name" with the depot's watch, which the watch then ignores ("Nobody told me") until the station radios: the contrivance becomes Vesk's slip | Source only |
| 2 | the pump room thread (`ct_*`) | Twinsen, Zoé, Arthur, worker | **edited**: `ct_obj_home` "Go home and talk to Zoé" (the step completes on her, not on the tap); `ct_obj_street` "Back home to Zoé" (its marker is the house); `ct_feel_upper` says the heat comes up in the well itself (the square's pipe is cold, its well steams); the rest kept (DIALOGUE-EDIT item 3: read in the scene after P37/P39; the cocks' prompts name their lines, the subs follow the room's order) | Source only |
| 2 | Zoé at home after the water (`c1_zoe_water`) | Zoé | **edited (branch)**: after the pump room she had already said "It runs! Cold, too": new `c1_zoe_water2` ("Cold water from our tap, heat from his post… Ask him about that pipe anyway.") on games with the thread | Source only |
| 2 | the station tour, the gate | Vesk, Twinsen, Zoé | **edited** `c1_tw_tour1` (no "But" against a line that was not an argument); `c1_zoe_gate1` the leaflet's "Marked streets only" (zone A was never paid off; the plan picks up some streets) | Source only |
| 2 | after the radio | Zoé, Doran | **edited (branch)** `c1_zoe_go0` "Find Doran at the harbour" until Doran has been told (she put him at the spaceport while he stood at the harbour); `c1_doran_ferry1` says who grounded the flights; `c1_doran_drones` "Slow is the one thing I can teach you" | Source only |
| 2 | the spaceport (SPACEPORT-3: Ama, Bern, the gate card) and the port people (`rs_ama_*`, `rs_bern_*`, `rs_velo_*`…) | Ama, Bern, Gurt, Lomba, Velo, Pask, Ennu, Oshra | kept (DIALOGUE-EDIT item 2: each line's phase read against `portPhase`; `tm_pilot` is reached only before the errand existed, the counter's own business comes first) | Source only |
| 3 | arrival, Baldino's first scene (`c2_bal_2`…`c2_bal_7`) | Baldino, Twinsen | **edited**: one clear picture each: the shell "like an egg's", something asleep in it, Sendell watching (the "nut" had it backwards); Vesk drills into it for its heat; "run it backwards: push the heat back down, and the bore becomes a patch" (what "reverse" means, said once, and the later "shield" now has a picture); the key's parts; the mills; Zoé waits "not before, or Vesk shuts his platform tight" (why her warning waits for the key). Same six lines, each shorter; the journal `c2_j_bal` says the same | Automated runtime (dialogue-scenes.mjs ch3: the chain in order, every line fits its box) |
| 3 | arrival, the dock guard, the lift (`zt_*`) | Twinsen, guard, Kell | **edited**: `c2_tw_arrive`/`zt_tw_arrive` "Doran says" (Baldino never said where his workshop is); `c2_tw_dock2` "(The depot. Good to know.)"; Kell's three reminders no longer repeat the objective in three beats (`zt_kell_wait*`: his arm on the brake, who holds it if he throws the switch); the rest kept | Source only |
| 3 | Vesk leaves, the sealed shaft | Baldino, Arthur, Zoé, Doran | **edited**: `c2_ship_bal2` gives the reason to wait (his ship is twice as fast; the console hears the bore's channel); `c2_ar_sealed` "Grandpa's radio picks up the project's channel now" (sets up how Arthur hears it); `c2_doran_sealed` "nobody's thought to change my codes" (one line for the heroes riding the project's ship and ferry) | Source only |
| 3 | Nara, Oku, the mills, the lighthouse, Vesk on the platform | Nara, Oku, Zoé, Vesk | kept | Source only |

## Before / after (a selection, in context)

| Where (who, to whom, when) | Before | After | Why |
|---|---|---|---|
| Ch. 1, the yard: Zoé, after the crystals; the film showed her at the kitchen tap | "Is our tap knocking too? Try it." | "Try the garden tap. If that's dry too, it isn't just our kitchen." | which tap, and why it matters |
| Ch. 1, the yard: Zoé, the pipe step | "And the project's pipe? You used to clear it at a run." | "And the project's pipe. You used to clear fences twice that high at a run." | the pipe is new; the tease is about him |
| Ch. 1, the square: Mira, shown the crystals | "Fine. Find the fault and I'll waive his bill this month. Here's the key to the lid." | "All right, it's the well. Here's the key to the lid. Find the fault and I'll waive his bill this month." | Gilbert's "And last month too" now answers the waiver |
| Ch. 1, the harbour: Xil, Twinsen has seen the well | (no rope mentioned; Xil hands one over after the stamp) | Twinsen: "I need a rope for the town well. Is there any on that barge?" Xil: "Rope ladders, a whole crate. Wake that man, bring me my stamp, and one is yours." | the objective's deal is now said |
| Ch. 1, the square: Mira, before the crystals, at a visibly dry well | "It isn't the well, Twinsen. It's the old pipes on his street. I don't unlock the town well for a pipe fault." | "Wells go low in a dry month, Twinsen, and his street's pipes leak. I don't unlock the town well on a rumour." | a refusal that survives a look at the well |
| Ch. 2, Vesk at the harbour, sending Twinsen to the valves | "…And mind the depot: drones, a guard and his dog, and nobody has told them about you. Stay out of sight." | "…My crews are all on the bore, and you know this island better than they do. The depot's watch may not have heard of you yet: use my name, and keep clear of the dog." | why he sends Twinsen; the guard's "Nobody told me" becomes Vesk's slip, not the writer's |
| Ch. 3, Baldino's revelation | "Twinsun sits inside a shell, like a nut. Beneath the shell sleeps the being Sendell watches over." … "It has to be reversed" | "Deep under Twinsun there's a shell, like an egg's, and something sleeps inside it." … "Run it backwards instead: push the heat back down, and the bore becomes a patch." | the game's central idea as one picture |
| Ch. 3, Arthur on the radio | "Dad? It's Arthur, on the project's channel." | "Dad? It's Arthur. Grandpa's radio picks up the project's channel now." | how a boy in a kitchen hears the project |

## FRESH-EYES findings and what was done

Report: `docs/lba-maturity/FRESH-EYES.md` (19.11, on `ccr-c1c2c4b9-dep6ed`). The reader saw text only, so each finding
was weighed in its scene. Section numbers are the report's.

| § | Finding (keys) | Weight | Done |
|---|---|---|---|
| 3 | `op_tw_2` "the well" from nowhere | real | **fixed**: "I'll check the square's well." |
| 3 | `op_zoe_3` warm vs `prh_tap_1` "not a drop" | real (minor) | **fixed**: "(Stopped again…)", and the knock counted three (the later "the kitchen wall knocked like that" now has its three) |
| 3 | `t2_ask_pipe` "used to clear it" | real | **fixed** |
| 3 | `t2_ask_tap` "too" | real | **fixed**: names the garden tap and why |
| 3 | `pr_zoe_kettle2` Mira, Gilbert bare names | partly: Zoé speaks to her husband, who knows them; the player needs the padlock | **fixed**: "Mira's got the well padlocked" |
| 3 | `pr_locked` neighbours "out" right after Zoé's visit | real | **fixed**: "They've gone to the square, like everyone else." |
| 3 | `t2_goal_inv` nothing comes of looking | kept: the item text (`itd_kettle` "furred since breakfast. Still warm.") is what he reads; the step teaches the key |
| 4.1 | `pr_mira_no` refusal at a dry well | real | **fixed** (see the before/after) |
| 4.1 | `pr_mira_2b` "Fine" / "his bill" | partly: Gilbert stands in the row when the crystals are shown | **fixed** (order: concede, key, waiver) |
| 4.1 | Xil's rope never spoken | real | **fixed** (new lines, once, after the well is seen; in game) |
| 4.1 | the film's project barge vs Xil's barge waiting for a stamp | kept: the film's lift unloads the project's own barge; Xil's is a trader's ("for the project" as its buyer); no wording needed |
| 4.1 | `pr_tim_2b` red herring never cleared | real | **fixed**: `pr_tw_tim2` spoken to Tim, "One stone doesn't stop a well, Tim." |
| 4.1 | `prh_tw_cycle` ends chapter 1 on a pump after Sendell | real | **fixed (order)**: the thought opens chapter 2 (`c1_tw_morning_pump`) |
| 4.2 | Sendell never introduced | real | **fixed** at her first word: `pr_tw_sendell` "(Sendell. Twinsun's goddess. Twelve years, and not a word from her until now.)"; a caption over the film is a story/film decision (story item S-7) |
| 4.2 | `pr_obj_done` "Prologue complete" | real | **fixed**: "Chapter complete" |
| 4.3 | "Grandpa Gilbert" vs "Gilbert" | decided by STORY-FIX: Arthur's name for the old neighbour | Arthur's own lines checked as reached (ch. 7 below); Zoé uses it only to Arthur |
| 5.1 | `c1_gil_morning`/`c1_zoe_home1` the night below | real (minor) | **fixed**: Zoé "didn't come up till morning" |
| 5.1 | `c1_vesk_3/4` Vesk sends a civilian past his own guards | real | **fixed** by wording (see the before/after) |
| 5.1 | `c1_zoe_go` Doran "at the spaceport" | real | **fixed (branch)** `c1_zoe_go0` |
| 5.1 | the beam pad, his ship, the ferry, the project ship | partly: the pad and the beam are on screen in the scene | kept; S-6 lists the vehicles for a naming pass |
| 5.1 | why the flights are grounded | real | **fixed** in `c1_doran_ferry1` ("The project's grounded the passenger flights, but its own ships still fly.") |
| 5.1 | why Doran gets the start code | kept: his "Doran can sail anything that floats" is the answer the scene wants; no invented backstory |
| 5.1 | `ct_feel_upper` cold pipe vs a steaming well | real | **fixed**: "so the heat comes up in the well itself" (the well's bottom is where chapter 1 found it warm) |
| 5.1 | `c1_tw_tour1b`→`c1_tw_tour1` "But" | real | **fixed** |
| 5.2 | `c1_valve_depot` "the old camp" | kept (a place on the holomap with its marker) |
| 5.2 | `c1_doran_drones` "Slow, I can teach" | real | **fixed** |
| 5.2 | `c1_zoe_gate1` zone A never paid off | real | **fixed**: "Marked streets only." (the plan's pick-up points) |
| 5.2 | `c1_obj_confront` the beam pad first named in an objective | kept (the pad is on screen in the station yard; S-6) |
| 5.3 | the flight-form errand is friction | kept: the user's own request (SPACEPORT-3, P62); its lines are one exchange each |
| 6 | `c2_tw_arrive` Baldino never said where | real | **fixed** ("Doran says") |
| 6 | `c2_bal_2` nut backwards; `c2_bal_4` "reversed" unexplained; six lines of lecture | real | **fixed**: egg, patch, one picture per line, shorter (in game) |
| 6 | `c2_bal_7` Zoé's warning waits for the key | real | **fixed**: the reason said |
| 6 | `c2_tw_dock2` stiff | real | **fixed** |
| 6 | `c2_ship_bal2` waiting hours while Vesk flies off | real | **fixed**: the reason said (his ship is faster; the console will tell them) |
| 6 | `c2_ar_sealed` Arthur on the project's channel | real | **fixed** |
| 6 | the heroes ride the project's ship/ferry/freighter | real, recurring | **fixed** once in `c2_doran_sealed` ("nobody's thought to change my codes"); later uses checked in their chapters |
| 6 | three mechanisms in one chapter (shield, key, network code) | story pacing | kept; listed as S-2 with the concepts |


## Story contradictions for a separate repair

(none new so far)

## Resume point

Next: chapter 4 "The Dig" (`text/ch4.js`, `story/dig.js`, `digtest.js`; FRESH-EYES §7). Then chapters 5-12 in order, the epilogue, then residents (DIALOGUE-EDIT remaining items 1-2),
the post-15.11 texts (wswitch, arsenal, kit2, ballastra).
