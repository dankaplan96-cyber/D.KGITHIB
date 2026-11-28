# VESK · Vesk's final decision (REVIEW-TASKS-19-11 task 3, status P75) and P81 scenes 1–2

**Team-only. Spoilers.** Branch `worktree-agent-a4b55ce71bff730ed` (from `ccr-c1c2c4b9-dep6ed` @ cf14e7b1).
Labels: Played (a person) / Automated runtime (a test drove it) / Source only.

## What the player now sees (the arc, in order)
| Chapter | Scene | Vesk's belief, shown | Changed here? |
|---|---|---|---|
| 2 Citadel | the harbour, the station, the beam pad | useful (valves, heat posts); "calibration noise"; the 30 % plan: "I calculate capacities" | no |
| 3 Zeelich | Mill Lane's lift (`zt_vesk_1/2`) | gives Kell the mill line: he knows the lane can run without the bore; tells Irsa not to file her strip | no |
| 3 Zeelich | **the platform** (`c2_vesk_*`) | Twinsen asks about the people down by the docks; Vesk: "The ships lift three in ten. I took the districts with the hospital and the pumps, so there's something left to come back to." Then the readings. He rejects the shield idea: "without one number I can check" | **yes** |
| 4–5 | test 14 (`dt_*`) | gives Kesh steam (real help), then files one trace | no |
| 9 | the council (`cn_*`) | the standing order and the cut log, his reason in writing: no stop before Mill Lane has a bypass | no |
| 10 (expanded only) | the B-7 (`th_*`) | "It works… can refuse the control room. Do not fit." The alternative is credible to him, and he hides it | no |
| 12 (expanded only) | Ballastra's House (`bh_*`) | his standing order: every coil, no regulators; the B-7 "failed buyer's test" | no |
| 14 | the network | Irsa builds "the bypass the chief kept promising", by hand | no |
| 16 | **the core** | see below | **yes** |

The arc's point: on Zeelich he refuses the shield for lack of numbers; in the core the numbers are on his own needles and he
refuses anyway. What he can't accept is that the stations get a say. The overload follows from the belief he showed on the
plan and on the B-7 tag. Mill Lane was his stated reason for the cut log, so hearing it run without him is what makes him
hand over the key.

## Before / after (English; Hebrew for every changed line in `text/he/`)
**The overload** (`chapter3.js overload`, `text/ch3.js`): the concrete reason at that moment: the field is about to set.
| Key | Before | After |
|---|---|---|
| c3_vesk_over1 | Three pylons. Clever. You think a sketch beats ten years of my work? | Three pylons. My bore, hanging on a lighthouse, a water office and a windmill. |
| c3_tw_over | The cracks are closing, Vesk. Switch it to shield mode. It is over. | And the cracks are closing. Look at your own needles. |
| c3_vesk_over_read (new, base) / c3_vesk_over_b7 (new, `th_vesk`) | — | I can read a needle. / I can read a needle. I knew the B-7 worked too. I wrote it on the tag. |
| c3_vesk_over2 | Over? I built this machine. Guardian, full overload. Burn the pylons down if you have to. | Once that field sets, every hand up there gets a say in my bore. The first hard winter, one of them lets go, and the shell goes with it. |
| c3_vesk_over3 | If she wakes, better someone who understands her is at the console. | Guardian, full overload! Burn those pylons out! |
| c3_vesk_coil | You're draining it into the sand? Then I'll take what's left myself! | Into the sand? Then what's left comes to this console. Somebody has to hold it. |

**Mill Lane and his key** (P81 scene 1; `answer.js irsaHolding / veskChooses`): one report replaces four "holding" lines
(co_irsa_1, co_irsa_2, co_tw_irsa, Vesk's "the lane holds"). co_irsa_2 and co_tw_irsa are deleted.
| Key | Before | After |
|---|---|---|
| co_tw_lane | Not the bore yet. Mill Lane still hangs on its line. Stop it now and Kell's cart drops again. | Not the lock yet. Mill Lane's branch still runs through it. Lift that bar now and Kell's cart drops again. |
| co_tw_cock | Mill Lane's on the mills. Irsa, can you hear me? | Irsa, the lane's on the mills down here. What's Kell's cart doing? |
| co_irsa_1 | Irsa here, at Kell's switch. It jumped when you turned it... and it's holding. | It is going up. Kell is running a full cart to the cistern, and my hand is off the switch. |
| co_vesk_up_helped | You pulled me out of that. And the lane holds without my line. | You pulled me out of that. And now Kell's cart goes up without my line. |
| co_vesk_why (new, pulled clear only) | — | I cut that log so the lane wouldn't go dry. It doesn't need me. |
| co_vesk_up_left | Don't look at me like that. I heard her. The lane holds without my line. | Don't look at me like that. I heard Irsa. Kell's cart, going up without my line. |
| co_vesk_key | Then I have no reason left to hold it. The lock's yours. | There. My key's out. Lift the bar after her two knocks, in the quiet, or it slams back. *(the lock's clue, both branches)* |
| co_tw_key | Thank you. (both) | Thank you. (pulled clear only) |
| co_guard_1 | …and for the lane you left off the evacuation list. | …and for the people you left off the evacuation list. |
Kept: `co_vesk_guard` "I kept the water running. Write that down too." / `co_guard_2` "It's written down. Next to the rest."
Turning the key does not clear him. The guard arrests him in both branches.

**The Zeelich platform** (P81 scene 2; `chapter2.js talk('vesk')`, `veskDescends`). In trigger order: the shield has just gone
down and Zoé's broadcast is out. Vesk wants to leave. What the player needs next is to wait at the console.
- With Baldino: c2_vesk_1 → **c2_tw_vesk1** "That was Zoé. Your plan picks up Zeelich's upper districts. What about the people
  down by the docks?" → **c2_vesk_2** (three in ten, the hospital and the pumps) → **c2_vesk_2b** (the readings: cracking on its
  own, "I'm just getting there first") → c2_bal_vesk "your drill IS the crack! … run it backwards" → **c2_vesk_3** "You've said so
  for a year, Baldino, without one number I can check. I'm going home to finish the bore." → c2_tw_vesk2 → c2_vesk_4.
- Without Baldino: Twinsen says the drill's argument (**c2_tw_vesk_drill**), and Vesk answers it (**c2_vesk_3b** "Baldino has said
  so…"). After the escape Baldino is on the radio (`balradio`), and **c2_after_bal_r** puts the plans "on the bench for you"
  instead of "Take these".
- The escape is shown by the camera, so `c2_after_tw` ("His ship! He's flying home…") is cut. `c2_ship_bal` is cut too ("To your
  station, then", which contradicted the next line, "Don't run after him yet"). `c2_ship_bal2` now says "the platform's console"
  and makes sense whether Baldino is there in person or on the radio. The old c2_vesk_3 lines "My ship is waiting under the
  deck" are cut as play-by-play.

**Journal**: `c2_j_vesk` (the docks question and his answer). In chapter 16, in order: `c3_j_over` (he read the needles and
overloaded anyway), then `c3_j_help` or `c3_j_left`, then `co_j_lane` (Kell's cart, her hand off the switch), then
`co_j_vesk_helped` (he owned the cut log) or `co_j_vesk` (he got up from where I left him), then `co_j_signal`, then
`co_j_end` (the arrest: the log, the people off the list, "he kept the water running"). Before this change, `co_j_end`
mentioned the overload after the signal.

**Voice** (`voicemeta.js`, which also drives faces): new entries for every changed line. Vesk has a hesitation before "I can
read a needle", a 0.5–0.6 s pause before "And now Kell's cart…" and before "It doesn't need me", and stress on the clue
words ("out", "two"). Dialogue advances on the player's key, so no line has a timed subtitle to cut. The scene keeps its
pauses: Vesk walks to the lock between his realisation and his key line.

## Flags and saves
No new flags. Lines are chosen from existing ones: `c3_veskHelped` (saved by `lastAct`'s save right after the choice), `th_vesk`
(the expanded campaign's chapter 10), and Baldino's presence on the platform. Old saves load: a core save from before this
change gets the new lines. A save without `c3_veskHelped` shows neither choice line in the journal. Base-campaign (`exp_base`)
saves get the version without the B-7.

## Verification: Automated runtime only (`tests/vesk.mjs`, 12/12 PASS, no page errors; SwiftShader, port 8253)
- Z1 with Baldino and Z2 without him (his place empty): the lines in the exact order above. No line narrates the escape. Next
  objective: the console. Journal: `c2_j_vesk`.
- H, the expanded campaign (`th_vesk`), "Pull him clear": a save in the fight, then Continue, then the overload in order with
  the B-7 line. The bleed valve and the coil. The choice menu shows its two answers. After the pull: save, Continue in the last
  act (choice and step kept). The branch is turned in the rest. Order: Irsa's one report, up_helped, why, key, "Thank you". Then
  the lock, the two knocks, the guard's three lines, the journal in order. The end card says "readings every day", and Baldino
  says `ep_baldino_vesk`.
- L, the base campaign (`exp_base`), "Leave him for the council's guards": the overload with "I can read a needle" and no B-7
  line. `c3_vesk_left`. Irsa, then up_left, then the key, with no thanks. Save, then Continue after the key (Vesk at his lock,
  the bar next). The same arrest. The journal shows the left variants. No readings sentence on the card, and no note from
  Baldino.
- `node tests/dialogue-check.mjs`: PASS, Hebrew 5498/5498. `node tools/he-bundle.mjs` was run. No new shipped file (tests are
  not shipped).
- **Not run** (minimal tests while working; they belong in the full test): `chapter2.mjs`, `chapter3.mjs`,
  `playthrough/14-shell.mjs`, `campaign-thread.mjs`, `campaign-hands.mjs`, `epilogue-home.mjs`, `exp-throttle.mjs`. None asserts
  a removed key. They do wait on the same flags, which the last act sets in the same order.

## What remains
- Played: none. Things a person should judge: whether "Once that field sets…" reads as a reason in the middle of a boss fight;
  whether, without the camera beat (`?nocine` was used here), the ship's launch is clear enough with no line describing it.
- Outside this task's files (another worker's): chapter 9's `cn_vesk_2` "Stop wasting my drill" and the bible's "Vesk does not
  turn" (STORY_BIBLE.md line 188). The key he turns (CAMPAIGN-9) is the newer approved decision, so the bible row should be
  updated by whoever owns it. S-1 (stop vs reversal) and S-9 are unchanged.
- The base campaign has no explicit hidden-alternative scene before the core (the B-7 is expanded-only). There the arc rests
  on the Zeelich "no number I can check" and the finale's "I can read a needle".
