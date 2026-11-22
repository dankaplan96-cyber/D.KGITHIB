# CAMPAIGN-CLARITY (status.md P90, with P91): why Twinsen acts, and what changes when he does

**Team-only. Spoilers for the whole campaign.** Worker: narrative editor, branch from `ccr-c1c2c4b9-dep6ed` @ `32a518b8`.
Labels used here: **Source** (read in the text and the code that plays it), **Automated runtime** (a headless test drove
the game; it shows the scene runs and the lines are said, not that they read well), **Played** (a person): none.

The campaign as a New Game plays it (the expanded campaign, `flags.exp`, story/index.js `ORDER`): 16 numbered chapters
and the epilogue. Chapter numbers below are the ones the player sees.

## 1. Per chapter: what he knows, why he goes on, what visibly changes

"Why" names the line or objective that tells the player; "Changes" is what the player can see or hear afterwards.
Gap column: **ok** (nothing to fix), **fixed** (this pass; §2), **dep** (needs a mechanics change; §7).

| # | Chapter | Twinsen knows at the start | Why he takes the next step (what tells the player) | What visibly changes when he succeeds | Gap |
|---|---|---|---|---|---|
| 1 | The Well | the tap coughed, ran warm, stopped (opening film) | `op_tw_2` "I'll check the square's well."; Zoé's kettle crystals `pr_zoe_kettle` → Mira's key `pr_mira_kettle`; the lid, Doran's bell and stamp, Xil's rope; objective `pr_obj_well` → `pr_obj_descend` | the cave: warm pool, crystals woken, mites; Sendell `pr_sendell_2` "Someone has reached her."; the growth leans to the pump (`prh_growth_2`) | ok (by design nothing on the surface changes: the well is still dry, `pr_well_after`) |
| 2 | The Joint Project | warm water, crystals, Sendell's "her"; a pump above runs in cycles (`c1_tw_morning_pump`) | Zoé: Vesk knows where the water goes (`c1_zoe_home3`); Vesk's three valves (`c1_vesk_3`, `c1_obj_valves`); his own tap still dry → the pump room (`ct_zoe_dry1`, `ct_ar_dry`, `ct_obj_lane`); Vesk's tour and the "shell" (`c1_vesk_tour2`); the drill notice (`c1_zoe_gate1`) → Zoé's sneak (`c1_obj_zoe`); Baldino's radio (`c1_baldino_2`) → Doran | the well fills steaming, the heat posts light at every door (`c1_water_1`); the houses' taps run cold (`ct_tap_runs`); the benefit is lived: Zoé's hot bath (`c1_zoe_water`), Pippa's potions (`c1_pippa_heat`), Xil's street (`c1_xil_2`); Vesk goes up the beam, the pad is dead (`c1_beam_dead`) | ok |
| 3 | Zeelich | the 30 % plan, the shell, the lane pump's three-kick strip | the guard takes the plan (`c2_guard_dock2` "file a complaint at the depot"); Irsa first (`zt_bal_first`), her bench (`zt_irsa_4`); Baldino's shell and key (`c2_bal_2`–`c2_bal_7`); mills, Zoé's broadcast, the shield | Mill Lane's taps (`zt_kell_done`); the braked mills stop the fountain and the east terraces carry buckets (`c2_oku_dry1`), released after (`c2_oku_back`); Zoé's broadcast; Vesk's ship leaves; the shaft sealed (`c2_sealed_1`) | ok |
| 4 | The Dig | the shaft is sealed; the shell must be learned (`c2_bal_sealed2` "Find her.") | `c4_tw_arrive`, `c4_obj_find`; Tarra's price, the pump (`c4_tarra_2`); Ilka's notebook (`c4_ilka_4`); Dallan's test (`dt_hail_2`) | the oasis fills (`c4_pump_runs`); the ground needle after the stop, the carbon (`dt_strip`); the temple door, the carving's five vents (`c4_carving_1`, `c4_ilka_c2`) | ok |
| 5 | Steam and Sand | the desert vent is under the capped test bore; opened fast it boils Kesh (`c4_ilka_end`) | Ilka: the condensers (`c5_ilka_2`); Dallan seizes the ferry, Kesh not on the list (`c5_dallan_2`); Dallan at the gate (`c5_tw_gate2`) | Kesh's pump puffs on the project's steam (`dt_divert`, seen again in Kesh); the vent's geysers (`c5_vent_1`); Dallan stranded in Kesh (`c5_dallan_k1`); Zoé finds the second vent (`c5_zoe_radio1`) → Hesk's glider | ok |
| 6 | The Pass | second vent under the Hamalayi ice, near an observatory | `c6_tw_1`; Yorna: Lhar must reach the monastery first (`c6_yorna_2`–`c6_yorna_4`) | the villagers ride up between kicks (`ps_read_5`); the brake holds the last of Lhar (`ps_rest_1`); the monks' gates (`c6_monastery`) | ok |
| 7 | The Observatory | the vent is past the monastery (`c6_yorna_end`) | `c7_yorna_1`; the keeper: her shrine, the mirrors (`c7_keeper_2`–`c7_keeper_4`) | the dome's blue light, Sendell speaks (`c7_sendell_2`, `c7_sendell_3`); the vent steams, the ground stops trembling (`c7_vent_open`); the telescope points under the installations toward Citadel (`ob_read_2`) | fixed: Sendell's last line was a vague prophecy (`c7_sendell_4`) |
| 8 | Evacuation | Citadel is evacuating by the list; family not on it (`c7_arthur_2`) | `c7_tw_ar2` "nobody gets left behind"; the list cart turning at the lane (`ev_cart_1`); Zoé's plan (`c8_zoe_3`); Gilbert's tunnels (`c8_gil_2`) | shelters open, the town inside; the lane boards the cart (seen); Vesk's broadcast: full depth in three days (`c8_vesk_1`); Zoé's lighthouse reaches the council (`c8_zoe_lh2`) | ok |
| 9 | The Council | three days; the council can order the bore reversed (`c8_zoe_radio`) | `c9_tw_b1`; the petition, two stamps, the clerk; the archive closed by Vesk's standing order (`cn_order_1`) → Kell's lift; the log of test 14 | the stop at the console: BORE falls, the ground kicks on; Mill Lane dry (cut-away), then running off the isolator (`cn_lane_kell2`); "The stop bought us some days." (`cn_tw_days`) | ok |
| 10 | Borrowed Time | the stop holds the drill but nothing evens the kicks | Mira's call: the mains are hammering the shelters (`og_mira_call1`, `og_mira_call2`) | the hammer eased; Oren holds the mains (`og_oren_1`…); the B-7 found by Zoé (`th_note`), fitted, the washroom runs (`th_gil_right`), Gilbert holds the lever (`th_gil_mine`) and keeps it in every later chapter | **fixed**: why one B-7 per station (`th_bal_exp1`, §2.1) |
| 11 | Ballastra | the B-7 lets a station say no; Tessa's label; Oren is on Ballastra (`th_tw_exp2`) | find who makes them and how many (`th_bal_exp2`); Tessa: one job first (`bl_te_3`); a float from Corvin, Halden's numbers (`bl_te_s5`) | Ferro's boat sails, the harbour bridge and gate open; the Water Gardens and the kiln share the water (rafts green later); the spill gate rises, the lower row comes home (`bl_du_home`); Oren names the 304 sleepers (`bl_or_3`) | ok |
| 12 | The House of Balances | every coil, no regulators (`bl_ba_1`); the numbers are in the House (`bl_te_end4x`) | Baldino: get the numbers, Tessa can't build blind (`bl_ba_2x`); `bh_obj_house`; the order book and the bench against Fennick (`bh_tw_t1`) | HELD chalked on every crate, the SOLD cabinet open (on the spot and every visit); the rig: three right levels, twice (`bh_te_rep`); Tessa starts five B-8s | ok |
| 13 | The Cradles | Oren keeps 304 sleepers; Twinsen promised to come back (`bl_tw_or3`) | Wenna: her brother (`wk_we_1`), **his own words on his card** (`wk_we_2b`), then the hall (`wk_we_3`, `wk_obj_hall`) | the ring stop shut, Twinsen's arm gives out (fail-safe); the flood bell untied and rung, the row comes up; Jory wakes (`wk_jo_1`); the requests board reads ASKING / NOT YET. MY CHOICE (`wk_board2`) | **fixed**: pacing (§3), journal reason (§2.3) |
| 14 | Baldino's Network | five stations, one minute; Tessa's B-8s are crated (`wk_te_1`) | `c10_obj_bal` "Hear Baldino out"; `c10_bal_1`–`c10_bal_3`; the B-8 for the valve room (`nwb_bal`) | each relay's lamp; each friend takes the handle (`nw_mira_hold`, `nw_zoe_hold`, …); at the valve room Oren trims the relay, the B-8 set by Mira's needles, its lever doesn't move for him (`nwb_or_brass`); the blast doors open (`c10_shaft`) | **fixed** (§7.1): a B-8 box on every lit relay; as each other station is done one line says whose hand set its band (`nwb_at_mill` Oku, `nwb_at_light` Zoé, `nwb_at_bore` Dallan, `nwb_at_dome` Sefa); journal `nwb_j_five` |
| 15 | The Shell | Vesk is below with the only console (`c10_bal_p3`) | `c3_obj_shaft`; Baldino on the radio (`c3_bal_radio1`); her knocks answered (`sh_two`) | the shutter held by her crystal (`sh_held`), the arch grown shut behind him; Sendell's chamber | ok |
| 16 | The Core | a child of this world, not ready; a stop only holds the cracks (`c3_sendell_2`, `c3_sendell_3`) | three pylons, the bank shot (`c3_bal_radio2`); Vesk's overload and coil; Mill Lane's branch, the central lock | Kell's cart climbs without Vesk's line (`co_irsa_1`); Vesk's key (`co_vesk_key`); Zoé's signal; the field holds (`co_bal_end`); the council's guards name the cut log and the list (`co_guard_1`) | ok |
| — | Epilogue | the shell holds | `ep_obj_home` "Dinner is waiting" | the kitchen tap runs cold; dinner; the Cradle Hall four days on (three lids open, Nan Odra's choice kept, `ep_bl_odra`); end card | **fixed** (§7.2): `ep_end_text_bl` when the Ballastra chapters were played |

## 2. Gaps found and fixed (text, objectives, journal)

### 2.1 Chapter 10 → 11: why Ballastra (Source)
Baldino's call at the end of chapter 10 (expanded campaign) was "But a relay only passes word along. That B-7 holds a
station by hand." It does not say what a B-7 is *for* in the network, so Twinsen's answer ("We'd need one at every
station") and the trip to another planet followed from nothing the player had just heard. The reason exists in the
game already (Vesk's tag: a station fitted with it can refuse the control room). Now:
- `th_bal_exp1` EN: "Twinsen! The relays are built. But the project's control room can still overrule any station they
  sit on. That B-7 let one station say no." HE: "טווינסן! הממסרים בנויים. אבל חדר הבקרה של המיזם עדיין יכול לגבור על כל
  תחנה שהם יושבים עליה. ה-B-7 הזה נתן לתחנה אחת להגיד לא."
- `tests/exp-ballastra.mjs` reads the new words (its one assertion on this line).

### 2.2 Chapter 7: Sendell's last word was a riddle (Source)
`c7_sendell_4` "When you reach the bottom of the world, you will know her. Not before. Go." (the writing rules: no vague
prophecy) → "She sleeps under the shell. You will meet her when you get there. Not before. Go." Same withholding
(chapter 15 reveals what she is), but the player knows where.

### 2.3 Chapter 13: why he stays on Ballastra while the network waits (Source)
The reason is in two places the player may miss (his promise to Oren in chapter 11, Tessa's "the crates are nearly
done" only if he talks to her). The journal now carries it: `wk_j_wenna` adds "Tessa is building the B-8s, and I told
Oren I'd come back for the sleepers."

### 2.4 Smaller "why" lines tightened while editing (P91, Source)
`c2_bal_sealed2` (the next destination said plainly: the dig, the sacked professor), `c1_vesk_3` (the three valves named
in one breath), `c1_doran_form` (the form, where, why), `nw_bal_iso` (fetch the isolator, why).

## 3. Tessa's tests → Wenna's request: time to read Jory's own wishes (P90 item 3)

**Before** (Source): the rig's last run ends (Tessa: "Then find five somebodies."), the card "Chapter 13 · The Cradles",
and one conversation: Wenna's brother → Twinsen → `wk_we_2` (Jory's name, both ages, the card's words and "I've asked
twenty-four times", all in one box) → "Then let's ask together." → at once `wk_we_3`, the hall's location (the chapter's
first instruction) and the objective.

**After** (story/balances.js `Cradles.begin`, text in ballastra.js / he/ballastra.js, voicemeta):
1. `wk_we_2` "Jory. He was nineteen when he went in. I was nine." (HE "ג'ורי. הוא היה בן תשע־עשרה כשנכנס. אני הייתי בת תשע.")
2. `wk_we_2b` (new) "He left a card: 'Wake me in ten years, or when my sister asks.' I've asked twenty-four times."
   (HE "הוא השאיר כרטיס: "תעירו אותי בעוד עשר שנים, או כשאחותי תבקש." ביקשתי עשרים וארבע פעמים.") Its voice entry puts a
   0.4 s pause before "I've asked twenty-four times" (`p`), the accent on "asks" and "twenty".
3. "Then let's ask together."
4. The conversation ends; 1.6 s of play (game time) before Wenna speaks again.
5. `wk_we_3` the Cradle Hall's place, its own box; only now `wk_started`, the objective and the save.

Jory's wish is the only thing in its box, nothing mechanical follows in the same conversation. Saves: nothing saved in
the pause; a load or a Save & quit inside it restarts the scene (`applyFlags` clears the wait and `begun` while
`wk_started` is unset). No save field added. In the pause Wenna looks off toward the gardens' gate to the Arches (the terrace, the hall) for
1.5 s (`BlChapter.faceFor`, §7.3).

## 4. Kept and checked (P90 item 4; Source)

- **Nan Odra's different choice.** `wk_od_1` (no word against Oren's care, one against the lock) → after the rule
  (`wk_od_rule`, `wk_or_7`) `wk_od_mine` "My mother waits. She'd wake to a daughter older than she ever was. Not yet. But
  it's mine to say now." → `wk_board2` "a few: NOT YET. MY CHOICE." → `wk_od_later` "Still my choice, still not yet." →
  epilogue `ep_bl_odra` "Some of us said not yet. My mother is one. That was ours to say." No later line says every
  sleeper woke (`ep_bl_jory` "Three of us awake now", PLOT-CONSISTENCY item 8). Not undercut. Unchanged.
- **Vesk's practical reasons**, in order: the 30 % as capacity, everyone on it lives (`c1_conf_vesk2`, `c1_conf_vesk3`);
  backing out cracks it faster (`c1_conf_vesk4`); the districts with the hospital and pumps (`c2_vesk_2`); he gives Mill
  Lane the mill line (`zt_vesk_1`) and Kesh the bore's steam (`dt_w5_2`); a stop before the bypass drains the lane
  (`cn_order_1`, `cn_cab_2`); a station that can say no will (`th_vesk_2`); one hand on the bore or the shell goes the
  first hard winter (`c3_vesk_over2`); "everyone I could carry" (`c3_core_vesk2`); "I cut that log so the lane wouldn't
  go dry" (`co_vesk_why`); "I kept the water running. Write that down too." (`co_vesk_guard`). The harm stays his: the
  hidden B-7 (`th_note`), the cut log, the list (`co_guard_1`). Unchanged.
- **Zoé exposing the evacuation plan.** She reads it (`c1_zoe_plan1`–`c1_zoe_plan3`), confronts him first
  (`c1_conf_zoe1`), broadcasts it (`c2_zoe_broadcast`); Vesk's first line on Zeelich now asks "that broadcast from your
  lighthouse: you as well?" and Twinsen answers "That was Zoé." (`c2_tw_vesk1`), so the credit stays hers. Chapter 8
  (the list cart's schedule) and chapter 10 (the register, the crate, the tag) build on it.

## 5. Knowledge and timeline matrix (main cast; what each knows / wants / fears / does / learns)

| Ch. | Twinsen | Zoé | Arthur | Vesk | Baldino | Sendell / Oren |
|---|---|---|---|---|---|---|
| 1 | K: tap warm · W: fix the well, dinner · D: key, lid, rope, cave · L: Sendell's "her" | K: next door's kettle · D: brings the crystal proof | W: to come · D: the bell trick | (not seen) | (not heard) | Sendell: "Someone has reached her." |
| 2 | L: the bore took the water; the "shell"; 30 % | W: the truth · D: sneaks, finds the plan · L: who gets saved | D: fixes the radio, reaches Baldino | W: the power under the shell · D: valves, tour, the plan · leaves by beam | K: a year of readings · D: start code to Doran | — |
| 3 | L: the shell, reversal patches it; the shaft sealed | D: the lighthouse broadcast | D: hears the ship land in the fort (project channel) | D: refuses, flies home, seals the shaft | D: override key · L: needs the shell's nature | — |
| 4–5 | L: vents; the project closes them; the test log cut | (radio) D: reads Ilka's map: Hamalayi | (radio) Bug Street radios | D: cuts the ground trace; gives Kesh steam | (letters to Ilka) | — |
| 6–7 | L: Sendell holds the shell alone, fading | (busy at home) | D: radios the evacuation | D: drone at the vent | — | Sendell: "I cannot do this alone any more." |
| 8 | W: everyone out · L: three days | D: hill families, the list cart's schedule · L: the lighthouse reaches the council | D: packs the shelter kit | D: every watt to the bore, three days | — | — |
| 9 | L: a stop holds, doesn't heal; the doors need every station | (relay) | — | his standing order, the cut log, the stop | L: a network is needed | — |
| 10 | L: Oren; the B-7 lets a station say no | D: by the door this time, finds the B-7 and the tag | (timing the bangs) | D: hid the B-7 ("Do not fit"); on the wire | D: relays built | Oren: helps first, then pushes a lever shut; "a hand gets tired" |
| 11–13 | L: who sells; Oren holds through glaze; the sleepers; hands can do what one hand can't | (home) | (wants a glazed float) | his standing order on Ballastra (evidence only; never there) | asks for the numbers | Oren: refuses, says his fear (Bay 2), accepts the families' rule |
| 14 | D: five stations, the B-8 at the valve room; sees a B-8 on every relay | D: takes the dial bank; reads the lighthouse B-8's band | D: counts four knocks | (below) | D: the code | Oren: trims the relay; the brass lever doesn't move |
| 15–16 | L: "a child of this world"; turns the bore | D: the signal | D: hears Dad's two knocks | D: overload, coil; gives his key; taken | D: shield sketch | Sendell: asks for help, not sacrifice |

### Vesk's location and the deadline (Source)
- Ch. 1–2: Citadel (harbour, station) → beam to his ship → Zeelich (`c1_after_tw`).
- Ch. 3: Zeelich's platform → his ship home → lands inside the old fort, seals the shaft from below (`c2_ar_sealed`, `c2_sealed_1`).
- Ch. 4–16: below Citadel, in the shaft and the core; heard only on the wire / screen (`dt_vesk_*`, `c8_vesk_1`,
  `cn_vesk_2`, `th_vesk_1`); on Ballastra only as paper (the order book). Met in person again in chapter 16.
- Deadline: "Full depth in three days" (`c8_vesk_1`, ch. 8) → the council's stop holds the drill (ch. 9, `cn_tw_days`
  "The stop bought us some days"; the bore rule P83: a stop holds for days, the shell still strained). The only count
  after it is Gilbert's "First quiet in two days" (ch. 10). Ch. 11–13 add travel and an hour's waking; no line names how
  long Ballastra took, and none claims a day count that the trip would break. The epilogue: "Four days later." (both
  `ep_narr` and `ep_bl_1`). **No contradiction found**; the span of chapters 11–13 is unmeasured (open risk, §8).

## 6. Chapters 12–13 from New Game (P90 item 2)

**Source (the story flags followed):** `Story.start()` sets `flags.exp = 1` (a New Game plays the expanded campaign);
`ORDER` has `throttle, ballastra, balances, survey` between `council` and `network`; `Balances` and `Cradles` are real
chapters (not `ChapterShell`, so `nextIndex` does not skip them). The chain: council's isolator on Kell's feed →
throttle (Mira's call) → the B-7 held → `th_bal_exp1`/label → ballastra (the freighter) → the Speaking Steps' `endTalk`
sets `bl_done` when `balances` is next → `Balances` (`bh_done` after the second right run) → `Cradles` (`wk_done` after
Tessa) → the ship's film Ballastra → Zeelich → `network`. Consequences: the network asks `NetB8` (`has()` =
`inCampaign('balances') && bh_test`): Baldino's `nwb_bal`, Oren's trim, the B-8 fitted and set at the valve room
(sub-objective `nwb_sub_fit` / `nwb_sub_band`); the epilogue asks `sleepersScene` (`inCampaign('survey') && wk_awake`)
before the end card. A base-campaign save (`exp_base`) has none of it.

**Automated runtime** (21.11, this branch, SwiftShader on a shared loaded machine):
- `tests/playthrough/12-council.mjs` from `base-12` (chapter 9's start) by input, ASSIST=1 (0 assists used) → PASS, ends
  in `throttle`; its kept save → `12b-throttle.mjs` → PASS, ends with `chapterKey: ballastra` (the expanded campaign's
  real handoff into chapter 11).
- `tests/exp-ballastra.mjs` (staged: chapter 10's last step → chapter 11 → chapter 12's start) 33/33 PASS, incl. the
  new `th_bal_exp1` wording.
- `tests/exp-balances.mjs` (staged: chapter 11's last talk → 12 → 13 → 14's valve-room B-8 → the epilogue's Cradle Hall,
  Save & quit / Continue at each handoff, and a legacy `exp_base` save) 30/30 PASS; Jory's card line (`wk_we_2b`) and the
  hall's directions (`wk_we_3`) said in that order, `wk_started` set. (This run had the pause without the later
  "wait until he is free" guard, a code-only change since.)
No playthrough segment and no fixture exists for chapters 11–13 themselves, so "from New Game" is verified as: the code
path (Source) + segments 12 → 12b's real handoff into chapter 11 + the staged chapter tests. **Verdict: reachable; the
consequences show in the network (the valve room's B-8) and before the end card (the Cradle Hall).**

## 7. Dependencies for the coordinator (mechanics, not text)

1. **Done (21.11, night shift).** Chapter 14, the other four B-8s: `NetB8.dress()` (story/balances.js) puts a small B-8
   (iron body, cream band dial, brass lever; the kit's shared materials, 5 meshes) on the lid of each relay, shown with the
   relay (network.js `showProps` / `lightRelay`); the valve room's once fitted (`nwb_fit`), its pointer on `nwb_band`.
   `Network.stationDone` plays `NetB8.stationLine(s)` (narrator, one line) after the friends are placed and before the
   toast and the save. Journal `nwb_j_five` once all five are held and `nwb_set`. No new flag; base-campaign saves and
   saves without `bh_test` see nothing new.
2. **Done.** The end card: epilogue.js `showEnd` uses `ep_end_text_bl` (text/ballastra.js, HE in he/ballastra.js) when
   `inCampaign('survey') && wk_awake` (the same test as the Cradle Hall's scene), else `ep_end_text`.
3. **Done.** Chapter 13's pause: `BlChapter.faceFor(id, p, s)` (a listener's turn toward a point for s seconds of game
   time, via `listenTo`; `unface()` on applyFlags) turns Wenna toward `GD.exits.toArches` for 1.5 s.
   **Automated runtime only** (21.11, SwiftShader, shared machine): `exp-balances` 37/37 (new: the valve room's box and
   pointer, the four station lines, a box on all five relays and again after applyFlags, the journal line, Wenna's turn
   from 1.47 rad off to 0 and let go, the Ballastra end card; the legacy `exp_base` save keeps the original card and shows
   no box); `exp-ballastra` 33/33; `epilogue-home` 12/12; `world-consistency` 37/37; segment `13-network` from `base-13`
   PASS (0 assists; through to the shell); `14-shell` from `base-14` PASS (1 ISO assist at the core's pylons; the
   original end card, the fixture has no Ballastra flags); `dialogue-check` PASS. Played: none.

## 8. Open risks
- Played: none. Whether the 1.6 s pause reads as a breath or as a hitch needs a person (it is in play, not a frozen
  dialogue).
- The span of chapters 11–13 against "the stop bought us some days" is not stated; a player may ask how long the
  Ballastra trip took. No line contradicts it.
- The other P91 edits were read in context (Source); the runtime tests show they are said, not how they land.

## 9. Resume point
Committed on the worktree branch. Next: a person's play of chapter 13's first minute; the coordinator's choice on §7.
