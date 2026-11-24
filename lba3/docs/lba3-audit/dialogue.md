# LBA3-RUN · lba3-dialogue (wave 2)

**Team-only; spoilers.** Agent `lba3-dialogue`, paired with `lba3-world` (scene, prop and puzzle files are theirs; the
dialogue and locale files, `src/game/text/*.js` and `text/he/*.js`, are mine). No text change was routed to me by
`lba3-world` during this wave; the opening agent's hand-off (`op_nb_1`…`op_nb_4`, "the Hebrew for a native reader") is
taken up below.

- **Revision:** branch `ccr-c1c2c4b9-dep6ed` at `c1f9af84` (wave 1 checkpoint), this worktree's branch on top of it.
- **Evidence labels.** *Played*: a person: **none**. *Automated*: headless Chromium on SwiftShader against this worktree
  (`127.0.0.1:8467`), driven by the suites' own input helpers; the machine was shared with three other suites
  (opening, arm-clear, second-shift), so runs were slow. *Inspected*: the line read with the code that plays it (story
  module, its order, gates and repeats) or a picture looked at by the agent. *Untested*: said where it applies.
- **Built on, not repeated:** `docs/lba-maturity/TALK-LBA.md` (presentation, LBA2 length stats), `DIALOGUE-2.md` (three
  passes, every chapter), `PLOT-CONSISTENCY.md`, `docs/lba3-audit/story.md` (wave 1; its four text fixes are in the
  build and were re-read in place: `c10_bal_needle`, `nwb_trim`/`nwb_push`, `sh_j_shut`).

## 1. References (LBA1/LBA2), read and not borrowed

`quotes.magicball.net` serves its data as `lba1-en.json` / `lba2-en.json` (964 and 1,388 messages, by area). Both were
read in the scratchpad only (`scratchpad/lba3-dialogue/ref/`, not committed); no original line is quoted here beyond a
few words. What was read: LBA2's Citadel Island in id order (home and Zoé, the neighbours and children, the ferry and
museum clerks, the tavern, the pharmacy, the Esmer arrival, the kidnapping), LBA1's Citadel (clone guards, the ferry
clerk, the tavern, "it is forbidden to talk about it" residents). What the originals do, as a yardstick for ours:

| Register | LBA1/LBA2 pattern (described, not quoted) | Ours, measured or read |
|---|---|---|
| Home | Zoé teases ("milord" goes adventuring instead of caring for the Dino-Fly), sends him on errands with a reason, follows up with a short "did you…?" | Zoé's yard steps, the kettle, the radio calls: the same register (tease + reason). One place where she skipped a family beat (Arthur's snow, ch 8): **fixed** |
| Minor residents | Each answers the hero's question from their own life (the mushroom picker was out picking when she last heard the guitar; the cow likes rain for the grass) and changes with the phase (storm, aliens, after) | Gilbert's bill and refund, Tim's stone, the Kesh trader ("who said it was the shaking? I said it"), Snuff's flue, Bzizz's crate: already in this pattern. Kept |
| Officials | Procedure insisted on, often against the hero's fame (the museum clerk who never recognises him and always charges; "you need a ticket") | Mira ("the bill covers the connection, not the water"), Bern ("I only read them"), the council clerk ("I don't make the rules. I file them."), Odile ("Properly is the important word"), Quill ("Visitors are weighed"). Kept; this is our strongest register |
| Clues | Folded into a character's memory ("last time I saw him…"), seldom a recap | The tap's three knocks, the kettle, Tim's stone, the strip, test 14: every clue is said once by someone with a reason. Kept |
| Serious scenes | Short; broken lines; little explanation | The confrontation, the core, Sendell: short already. One answer that did not answer (Vesk at the core): **fixed** |
| Length | LBA2 dialogue (this data, inventory and signs left out): 1,104 messages, median 63 chars, 48 % ≤ 60, 80 % ≤ 140 (TALK-LBA's own HQR count: median 62) | Ours (`stats.mjs` over the 1,865 lines spoken in conversations): median 70 chars, 13 words, 2 sentences; 39 % ≤ 60, 94 % ≤ 140, 99 % ≤ 200, max 262. Hebrew median 57. A little longer at the middle, much tighter at the top. No length pass needed |
| Voices | The CD versions had recorded actors | Kept: our nonverbal voices are the user's choice (PROJECT_CONTRACT); the voices are planned from the English words |

## 2. What was checked game-wide (the sweep) and how

| Check | Method | Result |
|---|---|---|
| Second speaker answers the first | `qa.mjs`: every `chain()` step that ends in a question, with the next speaker's line (all 41 story modules: 29 pairs); plus each exchange read below in play order | 3 non-answers found and fixed (Tarra ch 4, Arthur's snow ch 8, Vesk at the core ch 16; the core one is a plea, not a question, found by reading). Sendell's "Who is she?" → "You will meet her when you get there. Not before." kept as an intentional refusal (her reveal belongs to ch 15) |
| Recap tails, vague warnings, identical banter | regex over every spoken line (`stats.mjs grep`/`dup`): an instruction sentence at the end of a line; "be careful / something's wrong / watch out / take care"; identical texts under different keys | Recap tails: 13 candidates, all a character's own errand with a reason (Tessa's figures, Gilbert's cake, Baldino's "change his mind"); none cut. Vague warnings: 5, of which Zoé's "Be careful up there… And come back." is family, kept; Mira's cliff warning carries a clue. Identical banter: 4 pairs, all different situations of one short phrase (e.g. "I'll bring it back."); kept |
| Hebrew gender | `gender.mjs`: first-person present forms per speaker (masc./fem.); `addr.mjs`: a woman's name next to a masculine second person | No speaker mixes forms; every flagged line addresses Twinsen and names a woman in the third person. 0 fixes needed |
| RTL | `tests/hebrew.mjs` (automated) | see Tests |
| Placeholders | `tests/dialogue-check.mjs` (static: placeholders, list lengths, markup, speakers) | PASS, Hebrew 5592/5592 |
| Cue IDs | dialogue-check's voicemeta warnings; every `say(…, 'op_*')` and caption key in `story/opening.js` resolved to a text | **5 voice cues for lines that no longer exist** (`prh_zoe_1..3`, `prh_ar_1..2`): removed. `c2_bal_build` "6 intentions for 3 sentences" is the checker's count (it does not split at "..."; the voice planner does): the entry is right, left. All opening cue keys exist |
| Subtitle timing | `subs.mjs`: chars per second of each timed subtitle and caption in `story/opening.js`, EN and HE, against 17/s | 7 over 17/s before; after: 2 left (`op_tw_2` 17.1/s, kept; the notebook cut's place/time card 20.6/s, a timing in `opening.js`, handed on). See §4 |
| Tap and barrels against the real map | `probe-yard.js` (automated, a new game): the house, door, garden tap, near barrel, Zoé, the copper pipe, the well; the committed picture `captures/opening-tut-2/07-yard-barrels-step.jpg` looked at | see §3 |

## 3. The opening tutorial's tap and barrels on the real map (automated + inspected)

Positions from the running game (new game, before the ball): house centre (−50.6, 79.8), 9.4 × 7.4 m; front door
(−46.15, 77.2); garden tap (−43.9, 74.7), **3.4 m from the door**; Zoé (−42.6, 73.7), **1.6 m from the tap**; the near
barrel (−48.2, 74.5), 1.6 m out from the house's north wall, at its corner with the door's side; the copper pipe
x −43.5, z 66.0–72.1, **north of the yard**, along the lane; the square's well (−42, −4), far north up the same lane.

| Line | Says | On the map | Verdict |
|---|---|---|---|
| `t2_goal_tap` | the garden tap by the front door | 3.4 m from the door | ✔ |
| `t2_where_tap` | brass tap, stone foot, bucket, a few steps from the door | the picture shows exactly that, beside the LIGHTHOUSE/SQUARE post | ✔ |
| `t2_where_zoe` | Zoé in the yard by the garden tap | 1.6 m | ✔ |
| `t2_where_barrels`, `t2_goal_barrels` | the near barrel at the house's corner; the pipe goes into the wall behind it | at the corner, the wall behind it; the marker on it | ✔ |
| `prh_yard`, `prh_joint_2`, `prh_lane` | the line runs under the lane toward the square | the pipe and the lane run north; the well is north | ✔ |
| `t2_where_pipe`, `t2_goal_pipe` | the long copper pipe beside the lane, just past the yard | 6 m pipe north of the yard on the lane's east side | ✔ |
| `t2_ask_barrels` | "Behind the barrels? That's the joint…" | the barrel rocks when he tries the tap and Zoé turns to it (`hometap.js` `lead`); but his "behind the barrels" was a thought in brackets, and she repeated it as if she had heard it | **edited**: she says what she saw (below) |
| The tip "Face the barrels." vs the goal "the barrel" | a group, then the one to knock | two barrels at the corner; the hit counts on either | consistent; kept |

## 4. Before / after (actual lines, in their scene)

| # | Ch. | Scene, who to whom, when | Before | After | Why |
|---|---|---|---|---|---|
| 1 | 1 (opening, notebook cut) | the history captions over the book, 3.2 / 2.6 / 2.65 s | "FunFrock once ruled Twinsun with his clones and teleporters." · "Later, lightning struck his friend the Dino-Fly." · "On Zeelich, he brought Twinsun's stolen children home." | "FunFrock ruled Twinsun with clones and teleporters." · "Later, lightning struck his Dino-Fly." · "He rescued Twinsun's children from Zeelich." | 18.8 / 18.5 / 20.4 chars a second → 15.9 / 14.2 / 16.2; the same history. HE shortened on its own terms (17.5 → 14.4 and 18.1 → 12.5/s; `op_nb_3` HE drops "his friend" with the English) |
| 2 | 1 (opening film) | the lift worker answers the resident; Arthur at the hum | "Next quarter. Every home gets it. Vesk promised." · "The drill again. Lulu says they're digging to the middle of the world." | "Next quarter. Every home. Vesk promised." · "Lulu says they're drilling to the middle of the world." | 18.5 → 15.4/s and 18.4 → 14.2/s; Arthur keeps his own piece of playground lore. HE unchanged (13.5 and 12.6/s already) |
| 3 | 1 (the yard) | Zoé, after the barrel rocked under his knock at the tap | "Behind the barrels? That's the joint you fixed yesterday. Knock one aside with your ball." | "That barrel jumped. Your joint from yesterday is behind it. Knock it aside with your ball." | she answers what she saw, not his unspoken thought; also right when she is asked again. HE: "החבית הזאת קפצה. המחבר שתיקנת אתמול מאחוריה. תזיז אותה במכה של הכדור." |
| 4 | 4 (Kesh) | Tarra, when the pump already runs before she asked; Twinsen's reply is "I'm not with the project." | "You are the one who started our pump? Before anyone asked you?" | "You started our pump before anyone asked you. So you are not from the project?" | his reply now answers her; her uncontracted voice kept. `tests/chapter4.mjs` expectation updated (intended) |
| 5 | 8 (home) | Zoé, right after Arthur's "Did you bring me snow?" | "The ships take only the list. Vesk switched the heat posts off yesterday: every bit of power goes to his bore. Everyone on the list is queuing at the spaceport. The rest were told to wait." | "Snow later, Arthur. The ships take only the list, Twinsen. Vesk switched the heat posts off yesterday to feed his bore. The list is queuing at the spaceport, and the rest of us were told to wait." | a mother answers the boy, then her husband; "the rest of us" says the family is off the list; same facts, same length |
| 6 | 9 (the platform) | Vesk on the wire, after Twinsen threw the council's stop | "…So has Mill Lane's. I wrote it on your door." | "…So has Mill Lane's. I said it would, on the archive door." | "your door" read as Twinsen's house; he means his standing order by the archive (`cn_order_1`). Twinsen's "You knew both, and you cut one out of the log" stays unanswered: Vesk's silence, kept |
| 7 | 16 (the core) | Twinsen to Vesk, between "I'm finishing the bore" and Vesk's "Thirty percent was never a mistake…" | "She's alive, Vesk. Waking her this early cracks the whole shell. Baldino's network turns the bore into a shield. Stop." | "She's alive, Vesk. Wake her this early and the shell cracks under everyone, list or no list. Baldino's network turns the bore into a shield. Stop." | Vesk's answer is about the list; now it answers him. Under pressure his answer moves from the heat (vesk1) to the list (vesk2) to force (the guardian), as written |
| — | 1 (opening, classic) | the second caption | "…chose Twinsen to stop the tyrant FunFrock." | "…chose Twinsen to stop FunFrock." | 17.8 → 16.2/s with its sub-line |
| — | 9 (Mill Lane cut-away) | Kell, the line gone, HE only | "החשמל נעלם! בלם! כולם מתחת לזה החוצה!" | "החשמל נפל! בלם! כולם לצאת מתחת לעגלה!" | the Hebrew read as a word list; "נפל" as the line "נפל" two lines on. English unchanged |

**Left unchanged on purpose:** `op_zoe_2`, Zoé at the tap in the film: "It worked yesterday." (after his "I fixed that
yesterday."). It is the family in four words: she does not argue, she hands his own word back. It is the protected
opening exchange (P91), it reads at 11.1/s, and anything added would explain the joke.

## 5. Coverage ledger

Status: **edited**, **kept** (read in play order with its repeat / failure / success branches, nothing needed),
**measured** (by a script only), **not covered**.

| Ch. | Scene (keys) | Register | Branches read | Status | Evidence |
|---|---|---|---|---|---|
| 1 film | the opening (`op_*`, both cuts' captions) | home | timed, no branches | **edited** (timing) | measured; opening.mjs not rerun (no wording checked there; see Tests) |
| 1 | house: Arthur's boat, the kitchen tap (`prh_*`) | home, clue | first / again (`prh_tap_2`) / Arthur in reach or not | kept | inspected (`hometap.js`) |
| 1 | the yard steps (`t2_*`) | home | first ask / asked again (`talk()`) / left early (`t2_call_*`) / done / close enough | **edited** `t2_ask_barrels`; rest kept | inspected + automated (opening-tutorial, tutor-targets keys) |
| 1 | the square: Gilbert, Mira (`pr_gil_*`, `pr_mira_*`) | official | no proof / kettle shown / key / lid kick / after | kept | inspected |
| 1 | harbour: Xil, Doran, the bell (`pr_xil_*`, `pr_doran_*`) | minor | asleep / bell rung with and without the errand / stamped / after | kept | inspected |
| 1 | the kids (`pr_tim_*`, `pr_lulu_*`), Pippa | minor, clue | overheard or asked / after | kept | inspected |
| 2 | Vesk at the harbour, the tour, the confrontation (`c1_vesk_*`, `c1_conf_*`) | serious, official | wait / busy / tour / plan read | kept (his answer already moves: "not meant to read that" → "I calculate capacities" → "I've run the numbers. Goodbye.") | inspected |
| 2 | home: Zoé, Arthur (`c1_zoe_home*`, `c1_ar_*`) | home | morning / radio / after | kept | inspected |
| 2 | spaceport clerks (`c1_ama_*`, `c1_bern_*`) | official | no form / form / after | kept | inspected |
| 3 | Zeelich residents (`zeelife.js`: Snuff, Bzizz, Tavo, Nara, Oku) | minor | cold / flue cleared / paid with or without asking / after | kept | inspected |
| 4 | Kesh: Tarra, the trader, the kid, Hesk, Ilka (`c4_*`) | minor, clue | pump before or after Tarra asks / leak / fixed | **edited** `c4_tarra_early` | inspected + automated (chapter4) |
| 5 | Kesh: Ilka's plan, Dallan's requisition, the shovel trade, the gate, Zoé's radio (`c5_*`) | official, minor, home | trader: jar first / wait / done; Dallan at the gate (his "Thirty percent. I know." quoted back from ch 4, checked) | kept | inspected |
| 6 | Lhar: Hesk, Yorna, Pim's kite swap, the villagers (`c6_*`, `ps_*`) | minor | wait lines; Pim before/after the kite | kept (the keeper is "he", as PLOT-CONSISTENCY settled; the speaker `sefa` is Neska the trader, so her feminine Hebrew is right) | inspected |
| 7 | the dome: Sefa, the mirrors, Sendell, Arthur's call (`c7_*`) | serious, home | keeper first / after; Sendell's "Who is she?" | kept (Arthur's "WE'RE not on it!" is the child's own alarm; Sendell's refusal is the scene) | inspected |
| 8 | home, Gilbert's tunnels, the lighthouse (`c8_*`) | home, serious | first / wait / after | **edited** `c8_zoe_2` | inspected |
| 9 | Baldino, Nara, Oku, the clerk, the chair, Dallan (`c9_*`) | official | none / one stamp / two / after / archive | kept | inspected |
| 9 | the stop and Vesk's wire (`cn_*`) | serious | the stop chain; the order notice read and again | **edited** `cn_vesk_1`, HE `cn_cut_kell` | inspected |
| 10 | the B-7 and Vesk's wire (`th_*`) | serious | both campaigns' endings (`toBallastra`) | kept ("A station that can say no will say no…" protected) | inspected |
| 11 | Quill's harbour rule (`bl_qu_*`) | official | hail / weigh / wait / after | kept | inspected |
| 14 | the network thread: Zoé, Arthur's count, Mira, Irsa and Kell, the radios (`nw_*`, `c10_radio_*`) | home, serious | first / again / after per station; the clip on the third vs fourth knock | kept (Arthur counts "ten times" and holds his radio; Zoé "The frequency's mine") | inspected |
| 15 | Sendell's dome and the shell (`c7_*`, `c3_sendell_*`) | serious | — | kept (her refusal to say who "she" is is the scene) | inspected |
| 16 | the core: Vesk (`c3_core_*`, `c3_vesk_*`) | serious | helped / left | **edited** `c3_core_tw1` | inspected |
| all | every question in a chain (29 pairs, 41 modules) | — | — | measured; 3 fixed above | `qa.mjs` |
| all | length, recap tails, vague warnings, duplicates, Hebrew gender | — | — | measured | `stats.mjs`, `gender.mjs`, `addr.mjs` |
| 10–13 | the rest of those chapters' scenes (ch 10's wire and ch 11's Quill excepted) | — | — | **not covered line by line this wave** (DIALOGUE-2's three passes read them; covered here only by the game-wide scripts) | — |

## 6. Tests

All on the committed text (`5980f1c6`). Reduced on the user's word (23.11, via the coordinator: "why so many tests?
reduce the tests"): dialogue-check, hebrew, and one suite for the one chapter whose checked wording changed, each once.

| Suite | Kind | Result |
|---|---|---|
| `node tools/he-bundle.mjs`, `node tests/dialogue-check.mjs` | static | **PASS**, 5587 keys, Hebrew 5592/5592; warnings 227 → 222 (the five orphan voice cues gone) |
| `tests/hebrew.mjs` | automated (RTL, Hebrew layout, prompts) | **PASS 24/24**, no errors, 919 s on a shared machine |
| `tests/chapter4.mjs` | automated (Tarra's early branch by input; its expectation updated for the intended wording) | **PASS 59/59**, no errors (Tarra after the pump already runs: her new line, then trust and Ilka, by input), 2444 s |

Not run (by the instruction above): `dialogue-scenes`, `opening-tutorial`, `chapter1`. What they would have covered:
`t2_ask_barrels` is checked by key in `opening-tutorial` A13 and `tutor-targets` R1.10 (said, not its words); no suite
checks the wording of the opening's captions, `c8_zoe_2`, `cn_vesk_1` or `c3_core_tw1` (grep of `tests/`). A first
`opening-tutorial` run was begun before the edits and stopped at A6 (all PASS to there) so that no run mixed two texts.

## 7. Decisions for the user

1. **The talk camera.** (a) FACE-2's talk shots, as now. (b) LBA2's way: the play camera never moves during a talk.
   (c) (a) by default with (b) as a Settings choice. *Recommendation: (c), after a look at both* (TALK-LBA §3 #2: a flag
   `?talkcam=lba` would show them side by side; not built here: camera code is not a text file).
2. **The speaker's name tag.** (a) Keep it. (b) LBA2's way: colour and side only. (c) Both: the tag stays, a side
   bubble is added. *Recommendation: (a)* for now: our cast is larger than LBA2's town and many residents are met once;
   the colour alone would not tell Kell from Brel.
3. **Overhead one-line remarks** (LBA2's type-9 bubbles: a line over a resident's head, the game not paused). (a) As
   now: Zoé's yard bubble and residents' talk-ahead lines only; every talk opens the box. (b) One-line greetings and
   "after" lines of minor residents as bubbles. *Recommendation: (b), residents only*, never for a line that carries a
   clue or a choice. A UI change, not text; for the controls or UI owner.
   **The user picked (b), residents only (23.11); built 24.11 as P116** (`docs/lba-maturity/P116.md`): a minor
   resident (a person from the residents' modules, never a chapter's cast, a side story or a shopkeeper) whose talk is
   one line of ≤ 80 characters and ≤ 2 sentences, changing no flag, coin or life, says it over its head; everything
   else keeps the box. `?remarks=box` shows the old way, `?remarks=strict` one sentence only.
4. **The notebook cut's place/time card** (`op_cap_place` + `op_cap_time`, 66 chars in 3.2 s = 20.6/s). (a) Give it
   the time to 17.55 s (it ends at 16.85 today; the picture opens out from 16.9). (b) Shorten the shared sub-line to
   "Twelve years later" (it also changes the classic card, where nothing has yet said later than what). *Recommendation:
   (a)*, a timing edit in `story/opening.js` for the opening's owner. The classic cut's card is 13.2/s.
5. **The notebook's fourth caption.** "He rescued Twinsun's children from Zeelich." drops "stolen". (a) As built. (b)
   Keep "stolen" by giving the caption 0.5 s more. *Recommendation: (a)*: "rescued" carries the danger; the Hebrew
   ("הציל") the same.

## 8. Handed to the coordinator

- `story/opening.js` timing (decision 4); `op_tw_2` reads at 17.1/s (1.7 s), kept.
- `tests/dialogue-check.mjs` counts sentences without splitting at "...", the voice planner splits there: its
  `c2_bal_build` warning is a false positive (a checker fix, not text).
- The Second Shift worker (P109) is writing Kell and Brum lines in the same files I edited (`cnline.js`: `cn_vesk_1`,
  `cn_cut_kell`); a merge may touch the same block.
- Native Hebrew reading is still the user's: the Hebrew here is the agent's.

## 9. Remaining uncertainty

- Nobody played or listened. Whether "Snow later, Arthur." lands as warmth or as a brush-off needs a person; the
  alternative is a one-word reply from Twinsen in the chain (a story-file change).
- The shortened captions were measured, not watched; the opening suites were not rerun (they check keys and timing,
  not wording). `opening-tutorial`, `chapter1` and `dialogue-scenes` were not run (reduced testing): the yard line is
  untested in play.
- Chapters 10–13 were covered line by line only where listed in the ledger; elsewhere by the game-wide scripts.

## 10. Resume point

Committed on this worktree's branch. Scratch tools (not committed):
`/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/lba3-dialogue/` (`txt.mjs`,
`flow.mjs`, `stats.mjs`, `qa.mjs`, `gender.mjs`, `addr.mjs`, `subs.mjs`, `probe-yard.js`, `run.sh`). Next pass: read
chapters 10–13 in play order with the same scripts; the decisions above.
