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

## Before / after (a selection, in context)

| Where (who, to whom, when) | Before | After | Why |
|---|---|---|---|
| Ch. 1, the yard: Zoé, after the crystals; the film showed her at the kitchen tap | "Is our tap knocking too? Try it." | "Try the garden tap. If that's dry too, it isn't just our kitchen." | which tap, and why it matters |
| Ch. 1, the yard: Zoé, the pipe step | "And the project's pipe? You used to clear it at a run." | "And the project's pipe. You used to clear fences twice that high at a run." | the pipe is new; the tease is about him |
| Ch. 1, the square: Mira, shown the crystals | "Fine. Find the fault and I'll waive his bill this month. Here's the key to the lid." | "All right, it's the well. Here's the key to the lid. Find the fault and I'll waive his bill this month." | Gilbert's "And last month too" now answers the waiver |
| Ch. 1, the harbour: Xil, Twinsen has seen the well | (no rope mentioned; Xil hands one over after the stamp) | Twinsen: "I need a rope for the town well. Is there any on that barge?" Xil: "Rope ladders, a whole crate. Wake that man, bring me my stamp, and one is yours." | the objective's deal is now said |

## FRESH-EYES findings and what was done

(The outside reader's report is in progress; filled in when the coordinator says it is complete.)

## Story contradictions for a separate repair

(none new so far)

## Resume point

Next: chapter 3 "Zeelich" (`text/ch2.js`, `story/chapter2.js`, `zeelift.js`; FRESH-EYES §6). Then chapters 4-12 in order, the epilogue, then residents (DIALOGUE-EDIT remaining items 1-2),
the post-15.11 texts (wswitch, arsenal, kit2, ballastra).
