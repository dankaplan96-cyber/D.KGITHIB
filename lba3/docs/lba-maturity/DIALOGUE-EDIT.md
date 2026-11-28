# DIALOGUE-EDIT (the user's dialogue brief of 15.11.2026)

Worker: lba-dialogue-editor (cloud), branch from `ccr-c1c2c4b9-dep6ed` at `b910a1c6`. Brief: `.claude/agents/lba-dialogue-editor.md`
("Mission of 15.11"). Rewrite the dialogue in its scenes, keep IDs, speakers, placeholders and quest conditions; fix wrong
triggers rather than bending lines; coverage, verification, resume point.

**Evidence labels.** *Source only*: the exchange was read with the code that plays it (story module, conditions, order);
nobody here has heard or played it. *Automated runtime (in game)*: the scene's test suite drove the game in headless
Chromium (SwiftShader) with the edited text and passed; that shows the text loads and the scene still runs to its end,
not that a line reads well or that humour lands. No line was listened to.

**References.** The original LBA1/LBA2 text is not in this session: the user's game files (TEXT.HQR, `$S/lba2data`,
`$S/lba1data` in `docs/lba3-team/SOURCE_INVENTORY.md`) are not on this machine, and the project keeps only notes about
them (used only to identify actors). No original line was read, quoted or matched. The character guide (STORY_BIBLE.md
"Cast" and "Writing rules", the agent brief's voices) was used instead.

**Language.** The game is English-only (main.js forces `settings.lang = 'en'`); a few files still carry dead Hebrew twins
(`STR.he`); they were left as they are.

## Tooling: `tests/dialogue-check.mjs` (node, no browser)

Loads every text module through i18n.js as the game does and reads the code under `src/` for the keys it names.
Fails on: a key spoken in a conversation (`[speaker, key]` pairs) or named by `t()/say()/toast()` with no text; a
conversation speaker with no `n_<id>` name; a `t('key', {vars})` whose text has a `{placeholder}` the call doesn't give;
night/evening/tonight/sunset/dawn/dusk in any English string; a key binding spoken in a conversation line; a voicemeta
accented word no longer in its line. Warns (not failing) on spoken lines over three sentences or 230 characters and on
keys defined twice. `--list` shows every warning, `--unused [regex]` lists keys no code names (dead text, or keys built
at runtime such as `'c1_mk_' + id`).

Result at each commit: PASS (about 4460 keys, 1280 spoken in conversations). Warnings: ~200 long lines, most of them
four short sentences (kept where the scene earns it).

## Tests (Automated runtime, headless Chromium on SwiftShader, snapshot on 127.0.0.1, a loaded shared machine)

| Test | Result | Notes |
|---|---|---|
| `node tests/dialogue-check.mjs` | PASS at every commit | static |
| `tests/dialogue-scenes.mjs` | PASS 8/8 | Arthur's three states, Zoé's two kettle branches, every line fits its box; captures D1-D3 |
| `tests/dialogue-scenes.mjs ch3` | PASS 3/3 (twice) | Baldino's reordered first scene after Irsa's bench; capture D4 shows his answer |
| `tests/opening.mjs` | PASS 41/41 | |
| `tests/opening-tutorial.mjs` | PASS 40/40 | |
| `tests/chapter1.mjs` (chapter 2) | PASS 32/32 | the first try crashed the page (renderer, memory); passed on the retry |
| `tests/chapter2.mjs` (chapter 3) | PASS 21/21 | Baldino's chain without the strip (the reorder's other branch) |
| `tests/well-town.mjs` | 31/32, then fixed | it read Doran's old "*Stamp.*": the assertion now reads "stamped" (intended wording change, commit 048ea0b5) |
| `tests/voice-phrase.mjs` | PASS 64/64 | |
| `tests/voices.mjs` | 26/27: "every named speaker has an own voice" misses `lf_ossel`, `lf_wick` | the user's U-1 ferry speakers (text/ferry.js, before this pass): not caused by this pass, which adds no speaker; for the voices owner |
| `tests/prologue.mjs` | edited build: PASS 29/29 on the third run (28/29 on two runs, plus one page crash); base commit on the same snapshot: 29/29 once | the FAIL in two runs was "the well's mites beaten with the ball": all 4 mites killed, but Twinsen ended outside the well room after the test teleports him round them. status.md lists this check as random ("3 of 4, passed on the rerun"), and it passed here on the rerun too. Every dialogue step passed in every run (Zoé's kettle, Mira's key, the lid, Doran's bell and stamp, Xil's rope, the kids, the stones, the pool). Line lengths change how much game time the test's talk-through steps, so the mites stand elsewhere when the fight starts: the placement is the test's fragility, for its owner |
| `tests/workshop.mjs` | every dialogue check PASS (Baldino's first talk "as before", the test pair, the looks); 1 FAIL "collision: … barrel stuck" | a walk to the barrel got stuck (movement, not text); the retry crashed the page. Not compared with the base |
| `tests/save-migration.mjs` | **Blocked**: the page crashed on the first fixture's load, twice (run 1 also hung ~80 min before the batch's 2 h limit) | the shared machine's memory (load ~18-30). This pass changes no save field; it adds one optional flag, read as false when absent (`pr_pippaMet`); the other new branches (`c1_doran_due`, `pr_ar_early`, `pr_ar_told`, `pr_zoe_kettle2b`, `zt_tw_bench`) are text keys chosen from existing flags |

Also checked: every regex literal in `tests/*.mjs` against the 58 English strings this pass changed (old text from the base
commit, new text from the worktree): the only assertion on old wording was well-town's `/Stamp/` (fixed above).

## Coverage

Status: **edited** (lines changed), **kept** (read in context, nothing needed), **flagged** (a problem wording can't fix).

| Chapter | Scene | Characters | Status | Evidence |
|---|---|---|---|---|
| 1 The Well | opening film (`op_*`) | resident, worker, Arthur, Twinsen, Zoé | kept | Automated runtime (opening.mjs 41/41) |
| 1 | home: tap, Arthur at his boat, the cupboard, the door (`prh_*`, `pr_tw_ballfirst`, `pr_cupboard`) | Twinsen, Arthur | kept (tutorial tips literal; no key spoken) | Automated runtime (opening-tutorial.mjs 40/40, prologue.mjs) |
| 1 | the yard: Zoé back from next door, the kettle crystals | Zoé, Twinsen | **edited**: where Mira is, what the proof does; no repeat after Twinsen already met Mira's refusal (`pr_zoe_kettle2b`, condition on `pr_miraNo`) | Automated runtime (dialogue-scenes.mjs both branches, captures D2-D3; prologue.mjs) |
| 1 | Arthur indoors after the ball | Arthur | **edited (trigger)**: the sneaking hint (the optional's solution) only once the kids brushed Twinsen off; before, what he saw (`pr_ar_early`); after Tim confessed, `pr_ar_told` | Automated runtime (dialogue-scenes.mjs: all three states; capture D1) |
| 1 | the square: Gilbert and Mira's row, the lid key, the rusted lid | Gilbert, Mira, Twinsen | kept; `pr_lid_kicked` "Twelve years of rust" (caption nod) out | Automated runtime (prologue.mjs, well-town.mjs) |
| 1 | the harbour: Xil, Doran, the bell | Xil, Doran, Arthur | **edited**: Xil's introduction shorter; Doran's "*Stamp.*" stage direction out of the subtitle | Automated runtime (prologue.mjs, well-town.mjs) |
| 1 | the kids, the bay rocks | Tim, Lulu | kept | Automated runtime (prologue.mjs, well-town.mjs) |
| 1 | Pippa's shop | Pippa | kept (her opener repeats each visit: acceptable for a shop) | Source only |
| 1 | the well's bottom, Sendell | Twinsen, Sendell | **edited**: "Crystals? Down a town well?"; his last thought leads into chapter 2 (who is pumping) | Automated runtime (prologue.mjs, well-town.mjs) |
| 1 | after the prologue | Zoé, Arthur | **edited** Zoé's after-line | Source only |
| 2 The Joint Project | the morning, home, Zoé on Sendell | Twinsen, Gilbert, Zoé, Arthur | **edited** | Automated runtime (chapter1.mjs 32/32) |
| 2 | Vesk at the harbour, the valves, the depot | Vesk, Twinsen, Doran, Mira | **edited** (Vesk credible, the valves' directions kept) | Automated runtime (chapter1.mjs) |
| 2 | the lane stays dry, the pump room | Zoé, Arthur, worker | **edited** Zoé's knock plan, Arthur's pump room line; the pump room's own lines **left to PLAYTEST-15** (P37/P39) | Source only |
| 2 | the station tour, the gate, Zoé's search, the confrontation | Vesk, Zoé, guard | **edited** Vesk's tour opener and his two confrontation lines; Zoé's search kept | Automated runtime (chapter1.mjs) |
| 2 | the radio, Doran, the ship | Arthur, Baldino, Zoé, Doran | **edited** Baldino's two radio lines | Automated runtime (chapter1.mjs) |
| 2 | residents (`c1_*` idles, `rs_*_hot`, `rs_*_gone`) | Gilbert, Xil, Pippa, Mira, Doran, Tim, walkers | **edited (trigger)**: Doran "saw the ferry come in" before it had: new `c1_doran_due` on `!c1_arrived`; Tim's drone chased "a cat" (no cats on Twinsun since pass 1) -> Pico's Meca-Penguin; the rest kept | Source only |
| 3 Zeelich | arrival, the dock guard, the cistern lift, Irsa | Doran, guard, Brel, Kell, Vesk (tube), Irsa | **edited** the guard exchange; the lift and Irsa kept | Automated runtime (chapter2.mjs 21/21) |
| 3 | Baldino's first scene | Baldino, Twinsen | **edited (order)**: no answer to an unspoken report, no double "At last!" (new `zt_tw_bench`, chain reordered) | Automated runtime (chapter2.mjs; dialogue-scenes.mjs ch3, capture D4) |
| 3 | Nara, Oku, the mills, the cog | Nara, Oku | **edited** Oku's contradiction | Automated runtime (chapter2.mjs) |
| 3 | Zoé's broadcast, the platform, Vesk leaves, the seal | Zoé, Vesk, Baldino, Arthur, Doran | **edited** broadcast, Vesk's last lines, Twinsen's reaction | Automated runtime (chapter2.mjs) |
| 4 The Dig | Kesh, the pump, Tarra, Hesk, Ilka, the post, the dig, the temple, Dallan; the bore test (`dt_*`) | Sani, Brosk, Lumi, Tarra, Hesk, Ilka, Dallan, Vesk (wire) | kept | Source only |
| 5 Steam and Sand | the plan, the requisition, the hall, the relief valve, the radio, the glider | Ilka, Hesk, Tarra, Dallan, Doran, Zoé | **edited** Doran (ferry not "Baldino's"), Twinsen's unclear "dry in the good way", Zoé's repeated sign-off | Source only |
| 6 The Pass | landing, the gorge, Lhar, Pim's kite, the sword, the lift (`c6_*`, `ps_*`) | Hesk, Yorna, Pim, villagers | kept | Source only |
| 7 The Observatory | Sefa, the mirrors, Sendell, the vent, Arthur's call (`c7_*`, `ob_*`) | Sefa, Sendell, Arthur, Hesk | **edited** Arthur's call shorter | Source only |
| 8 Evacuation | home, Gilbert, Mira, Pippa, shelters, the farms, the lighthouse, Vesk on screen; the lane cart (`ev_*`) | Zoé, Arthur, Gilbert, Mira, Pippa, farmers, Vesk, Bram, Hedda, Tobin | kept | Source only |
| 9 The Council | Baldino, the petition, Nara, Oku, the clerk, the council, the archive, Dallan; Kell's way in (`cn_*`) | Baldino, Nara, Oku, Ottavo, councillors, archivist, Dallan, Kell | **edited** Baldino's stage directions, Dallan's speech, Kell's "twelve years", one objective | Source only |
| 10 Baldino's Network | the plan, Hesk, the five stations, the code (`c10_*`, `nw_*`) | Baldino, Hesk, Oku, Mira, Zoé, Arthur, Ilka, Dallan, Yorna, Pim, Sefa, Irsa | **edited** Hesk's offer, Ilka's game-pickup pointer, Twinsen's last line | Source only |
| 11 The Shell | shaft, engine room, galleries, Sendell (`c3_*`, `sh_*`) | Twinsen, Baldino, Sendell | kept | Source only |
| 12 The Core | Vesk, the guardian, the pylons, the overload, the choice, the end (`c3_*`, `co_*`) | Vesk, Twinsen, Zoé, Mira, Oku, Ilka, Pim, Baldino, guard | **edited** Vesk's four theatrical lines, Twinsen's answer | Source only |
| Epilogue | dinner, free roam (`ep_*`, `idle_*_home`) | family, everyone | kept | Source only |
| Residents | Citadel (`life.js`, `walkers.js`), story places (`storylife.js`) | Bram, Odile, Nell, walkers, crews, pupils, Lhar | **edited** two "shuttle" lines on Citadel; rest kept | Source only |
| Residents | Zeelich street, isles, Kesh homes, stands (`zeelife`, `ihomes`, `stands`) | — | not re-read in this pass (dialogue pass 1, 8.11, covered them) | — |
| Residents | `interiors` (Citadel), `islandpeople`, `desertlife`, `hamlife` | Luc, Sanna, Mr Bazoo, the pharmacist, Hedda; Zeelich's isles; Kesh; Lhar and the monks | read: **edited** four lines (repeated "twelve years", a Zeelich bee knowing Twinsun's underground, Dawa's goats contradicting three other lines), rest kept | Source only |
| Residents | `deeplife`, `hostel`, `sewers`, `kesh`, `shops`, `purposes`, `magic`, `kit2` | crews under the shell, the hostel, Fosse, Bersimon, Lumi, Brosk, Neska, Osk, Marl | skimmed (every line's text, not every condition): kept | Source only |
| Residents | `kit2b`, `depth`, `workshop` | Ilka, Nara, Tashi, Jaspa, Tenpa, Baldino | skimmed: kept | Source only |
| Residents | `isleslife`, `arsenal` | Avra, Ione, Jaspa, Zuzz, Zett, isle folk; Nara, Hougo, Bersimon, Ker'aooc, Baldino | read (isleslife) and skimmed (arsenal): kept; isleslife already varies its lines by each favour's state | Source only |
| Side quests | U-1 The Last Ferry (`ferry.js`), U-2 One More Place (`oneplace.js`) | Ossel, Wick, Oshra; Brix, the family | light review: kept as written (the user's brief; Ossel's "twelve years" is his character) | Source only |
| Spaceport | `spaceport.js`, `terminal.js`, kiosk lines | Corla, staff | left to SPACEPORT-2 | — |

## Before / after (a selection, in context)

| Where (who, to whom, when) | Before | After | Why |
|---|---|---|---|
| Ch. 1, the yard: Zoé back from next door, Twinsen has not yet met Mira | "Mira's telling everyone it's Gilbert's old pipes. Show her these. Then the well." | "Mira's at the well telling everyone it's Gilbert's old pipes. Show her these, and she'll have to open it." | where to go and what the proof does |
| … the same, but Twinsen has just told her "Mira won't open the well" | (the same line: she told him what he had just told her) | "Then show her these. Pipes don't grow crystals." | new `pr_zoe_kettle2b`, chosen on `pr_miraNo` |
| Ch. 1, Arthur indoors after the ball, before the kids were met | "Dad, Tim tells Lulu all his secrets when he thinks nobody's listening. You'd have to sneak up really quietly." | "Tim and Lulu were at the well first thing. Tim had his guilty face on. Worse than usual." (the sneaking hint comes once the kids have brushed him off) | an optional puzzle's solution before its problem; Arthur observant, not the source of every answer |
| Ch. 1, Twinsen after Sendell's "Someone has reached her." | "(The pump again. It runs in cycles, and that growth moves with every one. I'm not leaving the island before I've watched the next.)" | "(The pump again. Every time it runs, that growth moves. Somebody up there is pumping, and I want to know who.)" | nobody had raised leaving; the new reason points at chapter 2 |
| Ch. 2, Vesk at the harbour, after Twinsen reports the warm well | "…To do that, we diverted the groundwater. Your well was collateral damage. I apologise." | "…We're drilling for the planet's heat, and to do it we diverted the groundwater. Your well paid for it. I apologise." | charming and credible first, not a villain's vocabulary |
| Ch. 2, Vesk at the beam pad, refusing to stop | "Stopping now would be more dangerous than carrying on. Goodbye, Twinsen. I hope one day you understand." | "Stopping now would crack it faster than drilling on. I've run the numbers, Twinsen. You haven't. Goodbye." | a specific reason and his pride instead of a stock farewell |
| Ch. 2, Gilbert, the morning after the well | "Twinsen! You were down there for hours! The well's still dry. And the Joint Project ferry comes in today, round from Desert Island. They say the chief engineer himself is aboard." | "Twinsen! Hours down there, and the well's still dry. The project ferry comes in today with the chief engineer aboard. He can explain my bill." | shorter; Gilbert's own concern (his bill) |
| Ch. 3, Baldino after Irsa's bench | Baldino: "The kick comes from below? Her bench says so? Ha! A year I've said it!" then "Twinsen! At last! Mind the… ah." | Baldino: "Twinsen! Mind the… ah. Never mind, I have another one." Twinsen: "Irsa's bench says it isn't her pump knocking. Something at the far end is pushing back up the pipe." Baldino: "From below! And her bench says so, not just me! Ha! A year I've said it!" | he answered a report nobody had given, and greeted twice |
| Ch. 3, the dock guard on Zeelich | Twinsen: "Evidence. Your engineer's evacuation plan." Guard: "Project property. Confiscated…" | Twinsen: "Papers. Mine." Guard: "On project letterhead. Project property, then. Confiscated. You can file a complaint at the depot." | Twinsen would not announce it; the bureaucracy is the joke |
| Ch. 12, Vesk beaten | "You've doomed two worlds to the cold, Twinsen. Remember that I warned you." / Twinsen: "The council can listen to your warnings. From a cell." | "Half heat, for two worlds, for good. You'll hear about it every winter, Twinsen." / "Tell the council. Their guards are on the way down." | a complaint that matches the end card's half heat; no theatrical curse |
| Ch. 2, Doran at the harbour before the project ferry has arrived | "Saw the project ferry come in. No sails, no oars, and no respect for the sea." (heard before it came) | "The project ferry's due in today, round from Desert Island. On light, they say. I'll believe it when it ties up." (the old line after it has) | a line heard in the wrong state: fixed by its condition, both lines kept |
| Ch. 5, Twinsen as the desert vent opens | "It's breathing. And Kesh is dry. In the good way." | "It's breathing. And the oasis is still water, not soup." | the old line said the opposite of what it meant |

## Story issues for a separate repair (flagged, not invented away)

1. **Dallan and the dock guard.** STORY_BIBLE says Dallan is the guard who confiscated the plan on Zeelich; in the game
   the dock guard is an unnamed "Project security" (`c2_guard_dock*`), and later lines half-assume it was Dallan ("You
   knew that on Zeelich", `c5_tw_gate2`; "Your guards took…", `c4_tw_d1`). Either name the dock guard Dallan (and give
   him Dallan's model in chapter 3) or keep both lines vague, as they are now.
2. **Chapter 8 has two evacuations of the lane.** The main path takes the town into FunFrock's shelters; the lane thread
   (`laneline.js`) puts Bram, Hedda and Tobin on the project's list cart to the bridge. Both read well alone; together a
   player may wonder why the lane boards the project's cart while everyone else hides from it. A narrative owner should
   decide whether the cart takes them to the shelters' gate or to the ships.
3. **Gilbert is "Grandpa Gilbert" to Arthur** (`c8_ar_2`, the user's own `om_m_council_4`) and "Grandpa's radio" is fixed
   in chapter 2, but the Well chapter treats Gilbert as a neighbour arguing his bill with no family tie, and Twinsen calls
   him "Gilbert". If he is family, one line in chapter 1 should say so; if "Grandpa" is a child's title for an old
   neighbour, nothing needs to change. Left as it is (the user wrote "Grandpa Gilbert" in U-2).
4. **`rs_lh_tam_1`** ("Pim lost his kite on the icefall. He's been staring at it all morning") was one of the numbered
   lines with no state, heard after the kite was freed. **Fixed by wording** (a line true in every phase): "Pim talks about
   that kite of his more than his dinner…".
5. **`c7_sendell_4`** ("When you reach the bottom of the world, you will see her. Not before.") stays a withheld answer by
   design (Sendell's truth comes in chapter 11); kept.

## Missing dialogue states (found by reading prologue.js baseTalk)

- **Fixed:** Pippa's chapter-1 greeting ("I hear the well's broken") was what she said in every later chapter without its
  own line for her (`baseTalk`): now `pr_pippa_again` in chapter 1 and `pr_pippa_shop` from chapter 2 on.
- **Written:** in a chapter with no line of its own for them, Citadel's Gilbert, Mira, Xil, Tim and Lulu (and Zoé and
  Arthur at home outside their chapters' scenes) fell back to `idle_generic`, "Hello, Twinsen." (Zoé greeting her husband
  back from the desert that way). New `idle_<id>_<chapter>` lines in `text/common.js` (40 lines: dig, steam, pass,
  observatory, council, network, and the evacuation for Xil, Tim and Lulu, whom chapter 8 does not voice), each about
  what that person would know then (the broadcast, the list, the heat posts, Mira's valve room). They are only heard if
  the person is present in that chapter; where a chapter has its own line, that line still wins. Source only (no
  chapter suite visits them).

## Dead or unreachable text (found by `--unused`)

`pr_intro_1/2`, `pr_zoe_1..4`, `pr_tw_1`, `pr_ar_1/2`, `pr_doran_1` (the old opening before the film), `pr_zoe_next`
(the yard line before the kettle), `c1_tim`, `c1_lulu`, `c1_tim_heat`, `c1_lulu_heat` (reached by a built key
`'c1_' + id`: live), `c1_mk_*`, `c1_valve_*`, `ct_feel_*` (built keys: live). The dead ones were left in place: removing
keys is a migration with no player benefit, and voicemeta entries for `prh_zoe_*`/`prh_ar_1/2` point at removed text
(harmless: looked up by text).

## Remaining work and resume point

Done in this pass: every chapter's main text (ch1-ch10, ch3 = 11/12 and the epilogue), the campaign threads (thread,
digtest, passline, laneline, cnline, netline, answer), the residents of Citadel, the story places, Zeelich's isles, Kesh,
Lhar (read or skimmed as the coverage table says), a light review of U-1 and U-2.

Next, in this order:
1. The conditions behind the residents
   that were skimmed (`story/deeplife.js`, `hostel.js`, `sewers.js`, `kesh.js` phases) for lines heard in the wrong state
   (like `rs_lh_tam_1`, flagged above).
2. The spaceport and terminal lines (`interiors.js` `_g/_f/_e/_c/_a` port people, `stands.js` Corla, `islands.js`) once
   SPACEPORT-2 has merged.
3. The pump room's objectives and lines in `thread.js` (`ct_obj_room`, `ct_sub_*`, `ct_feel_*`, `ct_bypass_see`,
   `ct_cock_*`, `ct_pulse`, `ct_worker_*`) after PLAYTEST-15's P37/P39 fix: re-read them in the scene.
4. Story issues 1-4 above go to the campaign director / narrative owner; no line was changed to hide them.

For each: read the story module's conditions, edit only what needs it, `node tests/dialogue-check.mjs`, then the
region's test, and `tests/dialogue-scenes.mjs` for the exchanges it covers.
