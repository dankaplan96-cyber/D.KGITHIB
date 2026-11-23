# LBA3-RUN · lba3-story: the critical path and its narrative logic (wave 1)

**Team-only. Spoilers for the whole campaign.** Agent `lba3-story`, paired with `lba3-opening` (the film is theirs:
`story/opening.js` and the `op_*` text were not touched or judged here).

- **Revision:** branch `ccr-c1c2c4b9-dep6ed` at `e16f51eb` (START.md's starting record on top of `41e38829`).
- **Role:** read-only on game code. This file is the only file written. Every fix below is a proposal for the
  coordinator, with file, key/flag and change; English lines come with a Hebrew draft for `src/game/text/he/`.
- **Built on, not repeated:** `docs/lba-maturity/CAMPAIGN-CLARITY.md` (per-chapter why/changes, the cast matrix, Vesk's
  location), `PLOT-CONSISTENCY.md` (16 fixed 22.11), `DIALOGUE-2.md` (S-1…S-9, all closed or decided), `STORY-FIX.md`,
  `VESK.md`. Their findings were spot-checked against the current text and code; where they still hold, this file says
  "as CAMPAIGN-CLARITY" instead of restating them.

**Evidence labels.** *Source* = the line read together with the code that plays it (chapter, gate, flag).
*Automated runtime (staged)* = headless Chromium/SwiftShader at `localhost:8921`, a campaign fixture loaded and the story
driven by its own API (not by player input). *Played* = a person: **none**. Nothing here is a normal-input playthrough.

Tools used (scratchpad, not committed): `txt.mjs` (English text by key / regex from the live `STR.en`), `flow.mjs`
(every `[speaker, key]` in a story module in code order, with its English), `fix.mjs` (each fixture's chapter key and
flags), `refix.mjs` (a fixture's origin rewritten for the probe server), `probe-posts.js` (run by `tests/lib/try.mjs`).
Baseline: `node tests/dialogue-check.mjs` → PASS (5582 keys, Hebrew 5587/5587).

---

## 1. Chapter map, home to aftermath (as the code plays it)

Order: `story/index.js` `ORDER` (New Game, `flags.exp = 1`, 16 numbered chapters + epilogue). The base campaign
(`exp_base`: saves that had reached the network before the expansion) plays `BASE_ORDER` = `ORDER` without
`throttle, ballastra, balances, survey`, numbered by `BASE_NUMBER` (network 10, shell 11, core 12). Every chapter change
goes through `Story.nextChapter()` (card, `begin()`, objective, autosave); the exit column names the flag set and the
call site.

| # exp (base) | Key · module | Starts (where, how) | Twinsen knows at the start | His reason to act (what tells the player) | The player does | What changes / who reacts | Exit trigger |
|---|---|---|---|---|---|---|---|
| 1 (1) | `well` · prologue.js | the opening film's harbour → home (opening.js, not audited here) | the tap coughed, ran warm, stopped | `op_tw_2` the square's well; Zoé's kettle crystals → Mira's key | ball from the cupboard; Gilbert/Mira's key; Doran's stamp → Xil's rope; overhear Tim (optional, Discreet); down the well; mites, three crystals | Sendell: "Someone has reached her." (`pr_sendell_2`); `pr_tw_sendell` names her for newcomers | `endPrologue` → `prologueDone` (prologue.js:925) |
| 2 (2) | `project` · chapter1.js | home, next morning (`c1_tw_morning_pump`) | warm water, crystals, Sendell's "her"; a pump runs in cycles | Zoé: Vesk knows where the water goes (`c1_zoe_home3`); Vesk's three valves (`c1_vesk_3`) | depot / orchard / cliffs valves; pump-room thread (`ct_*`); Vesk's tour; **Zoé's office sneak (playable)**; confrontation; Arthur's radio; Doran, form, ship | well steams, heat posts light (`station.setActive(true)`), Zoé's hot bath, Pippa, Xil: **the benefit is lived**; Vesk leaves by beam, link cut | `toZeelich()` (chapter1.js:922) via `crossByShip` |
| 3 (3) | `zeelich` · chapter2.js | Zeelich Spaceport, Doran's ship (`c2_arrive`) | the 30 % plan, the shell, the lane pump's three-kick strip | find Baldino (`c2_tw_nara`); the guard takes the plan → the depot (`c2_tw_dock2`) | depot locker; Irsa; Baldino's shell/key; mill cog; three mills braked; **Zoé's lighthouse broadcast (playable)**; platform shield | Mill Lane taps; mills stop then return; Vesk flies home; hours later SHAFT SEALED FROM BELOW; Arthur hears the ship land in the fort | `toShell()`→`crossHome()` → `c2_done` (chapter2.js:586–606) |
| 4 (4) | `dig` · dig.js | Kesh's pier by the ferry (`c4_arrive`, "two days south") | shaft sealed; Baldino: "First we learn what the shell is… Find her." (`c2_bal_sealed2`) | Ilka, the sacked professor | Tarra's wind-pump; Hesk's yacht; notebook in the sandstorm; keypad; terraces; three discs; temple; carving | oasis fills; the carving: five vents; Ilka: the project closes them; Dallan's test log | `readCarving` → `c4_done` (dig.js:401–410) |
| 5 (5) | `steam` · steam.js | Kesh | the desert vent under the capped test bore; fast = boil Kesh (`c4_ilka_end`) | Ilka's condensers; Dallan seizes the ferry, Kesh off the list | jar, water, shovel; condenser hall; diagram; trooper; valves; hangar; relief valve; escape | Kesh's pump on project steam; vent opened; Dallan stranded, doubting; Zoé reads the map: Hamalayi (`c5_zoe_radio1`) | `board()` → `c5_done`, glider film (steam.js:221–228) |
| 6 (6) | `pass` · pass.js | Hamalayi foothills off Hesk's glider | second vent under the ice, near an observatory | Yorna: Lhar to the monastery first | tree, fuse, Pim's kite, rope, winch trips, ride up | Lhar safe in the monastery | reach the yard → `c6_done` (pass.js:243–246) |
| 7 (7) | `observatory` · observatory.js | monastery | the vent is past the monastery (`c6_yorna_end`) | Yorna/Sefa: the shrine, the mirrors | windows, three mirrors, telescope, heavy drone, vent | **Sendell speaks openly and is fading** (`c7_sendell_2/3`); ground stops trembling; Arthur: Citadel evacuating by the list, family not on it (`c7_arthur_2`) | `leave()` → `c7_done`, glider film (observatory.js:214–223) |
| 8 (8) | `evacuation` · evacuation.js | Citadel's glider field (`c8_narr`) | Citadel evacuating by the list | `c7_tw_ar2` "Nobody gets left behind."; the empty list cart turning off the lane (`ev_cart_1`) | cistern + lever, depot wheel, Mira, Pippa, Gilbert's tunnels; **Zoé's hill-family run (playable)**; relay; control room | shelters open; heat posts dark (`setActive(false)`); Vesk on screen: **full depth in three days** (`c8_vesk_1`); the lighthouse reaches the council (`c8_zoe_lh2`) | `c8ship` → `c8_done` (evacuation.js:269–271) |
| 9 (9) | `council` · council.js + cnline.js | Zeelich Spaceport | three days; the council can overrule Vesk | `c9_tw_arrive` "Baldino first." | petition, two stamps, Oku's mills; clerk; archive (BORE: the cut test log); hearing; Dallan arrives with Ilka's proof; the stop; Kell's isolator | **the stop:** BORE needle falls, the knocks go on (`cn_bal_stop1`); Mill Lane dry, then on the isolator; "The stop bought us some days." (`cn_tw_days`) | `KellThread.end()` (cnline.js:282–286) |
| 10 (—) | `throttle` · throttle.js | Zeelich, Mira's relay call (`og_mira_call1`) | stop holds the drill; nothing evens the kicks | Mira: the mains hammer the shelters | valve room, the hammer, Oren's governor; Zoé finds the B-7 in the project office; fit it; Vesk on the wire | Oren holds the mains; Gilbert takes the lever (`th_gil_mine`); Baldino: the control room can overrule any station (`th_bal_exp1`) | `end()` (throttle.js:532–537) |
| 11 (—) | `ballastra` · ballastra.js | Float Harbor, Vesk's idle freighter, Doran flies | the B-7 lets a station say no; Tessa's label | find who makes them, how many (`th_bal_exp2`) | Tessa's jobs; Corvin, Halden; spill gate | the lower row home; Oren's 304 sleepers; Twinsen's promise (`bl_tw_or3`) | `end()` → `bl_done` (ballastra.js:235–240) |
| 12 (—) | `balances` · balances.js `Balances` | Ballastra | coils bought, no regulators; the numbers are in the House | Baldino: Tessa can't build blind (`bl_ba_2x`) | the House, order book, bench vs Fennick, the rig | HELD crates; Tessa starts five B-8s | `bh_done` (balances.js:159) |
| 13 (—) | `survey` · balances.js `Cradles` | Ballastra | 304 sleepers; his promise | Wenna's brother's card (`wk_we_2b`) | ring stop, flood bell, the hour on the lever | Jory wakes; ASKING / NOT YET. MY CHOICE | `end()` (balances.js:437–441), ship film to Zeelich |
| 14 (10) | `network` · network.js | Baldino's workshop, Zeelich | five stations, one minute (`c10_bal_1–3`) | `c10_obj_bal` | five relays in any order (mill, valve room [+ B-8 in exp], lighthouse, bore, dome); Hesk's glider; the code box | a friend holds each relay; blast doors open (`c10_shaft`); Baldino: "Go and change his mind." | rest chain → `c10_done` (network.js:484–491) |
| 15 (11) | `shell` · chapter3.js `Chapter3` | bottom of the shaft | Vesk below with the only console | `c3_arrive_stop`: the bore is turning again | machinery (cooling diagram, valves), knocks answered, galleries, Sendell | **Sendell: a child of this world; a stop only holds** (`c3_sendell_2/3`); she asks for help, not sacrifice | `toCore()` (chapter3.js:127–131) |
| 16 (12) | `core` · chapter3.js `ChapterCore` + answer.js | core room | three pylons, the bank shot | Vesk: "I'm finishing the bore." | pylons from plates (Zoé/Mira/Oku by radio); Vesk's overload + coil; help him or leave him; Mill Lane's branch; Vesk's key; Arthur hears the two knocks; Zoé's signal | field holds; Sendell: "She is asleep again."; guards take Vesk for the cut log and the list | `finish()` → `c3_done` (chapter3.js:358–364) |
| — | `home` · epilogue.js | home, "Four days later." | the shell holds | `ep_obj_home` Dinner is waiting | dinner; end card; Keep Exploring | posts glow at half heat for every house; everyone home with a line | end card → free roam |

## 2. Traces the brief asks for

**Zoé's discovery (Source).** Seeded before it happens without spoiling it: her connections board (`l_desk_0/1/2`,
the red harbour row), the meter note (`l_meter_1`), the mailbox drill notice (`c1_zoe_gate1`). She *plays* the
discovery (office sneak, `c1_obj_zoe`), confronts Vesk first (`c1_conf_zoe1`), broadcasts it on Zeelich (playable,
`c2_zoe_broadcast`), and the credit stays hers (`c2_tw_vesk1` "That was Zoé."). It changes the island: residents' lines
from chapter 4 (`idle_gilbert_dig` "Zoé said on the radio the ships take three in ten", `idle_mira_dig`, `idle_tim_dig`).
Later she leads the hill families (ch 8, playable), finds the B-7 (ch 10), holds the lighthouse relay (ch 14) and sends
the signal (ch 16). No line gives "30 %" before she reads it (grep of every pre-plan key: none). **Clean.**

**Arthur's agency, no chosen-one (Source).** Ch 2 fixes Gilbert's radio and reaches Baldino; ch 3 hears the ship land in
the fort on the project's channel; ch 7 radios the evacuation; ch 8 packs the shelter kit; ch 14 holds the kitchen-pipe
station ("Station ready!"), counts the fourth knock; ch 16 hears Dad's two knocks first (`co_ar_two`); epilogue wants to be
"an engineer… Not like Vesk". A grep for *chosen / destin / prophec / the one who / meant to be* finds no Arthur line
(the only "chose" is Sendell choosing Twinsen against FunFrock in LBA1, `op_cap_lore`). **Clean.**

**Vesk earns, then loses, trust (Source).** Earns: the apology and the valves (`c1_vesk_2/3`), the heat posts at every door
(`c1_vesk_tour1b`, lived in `c1_zoe_water`, `c1_pippa_heat`, `ro_hot_*`), Mill Lane's line (`zt_vesk_1`), Kesh's steam.
Cracks: "calibration noise" vs the crystals (`c1_vesk_tour2`), the lane strip (`ct_vesk_strip`). Loses: the 30 % plan
and his refusal (`c1_conf_vesk2–4`), the cut beam, the sealed shaft, the cut test log (`cn_cab_2`), the hidden B-7
(exp), the overload. His reasons stay practical (CAMPAIGN-CLARITY §4) and the harm stays his: the guards name the cut
log and the list (`co_guard_1`). He does not repent (`co_vesk_guard`). **Clean.**

**Sendell's limits demonstrated, not secretly evil (Source).** She speaks only through the warm crystals (ch 1), needs the
dome's mirrors to carry two suns' light to hers (ch 7: a puzzle the player solves *for* her), says she is fading and
asks for help from "all of you" (`c7_sendell_3`), cannot close the cracks (`c3_sendell_3`), only holds on while Twinsen
turns the bore (`c3_sendell_4`), and warns against the child's own over-protection (`sh_sendell_keep`: "Not her, and not
Vesk"). Her one act of force, the crystal across the arch, is the child's (`sh_sendell_door` "Her too"); the journal's
paraphrase is ambiguous (issue 4). **Clean apart from issue 4.**

**Optional lore never supplies a mandatory premise (Source).** Checked the premises each chapter rests on: the water
(film + main path), Vesk/the valves (main), the plan (Zoé's playable segment), the shell (Baldino, main), the vents
(the carving, main), the second vent (Zoé's radio, main), Sendell fading (main), three days (Vesk's broadcast, main),
the stop's rule (`cn_bal_stop2`, main chain), Oren and the B-7 (main, exp), the child (Sendell, main). The optional
threads only add: the Discreet overhearing and Tim's confession (the descent needs only the lid and the rope,
prologue.js:419; the warm stones are a bonus, not the premise), the pump-room `ct_*` thread (Baldino's Irsa
pointer has its main-path twin `zt_bal_first`), Gilbert's charts (set up on the main path, `c5_zoe_radio1` +
`c8_gil_2`), Sendell's crystals line gated on `crystalsAll`, the sewer trip, U-1…U-5. **No mandatory premise found that
only optional content supplies.**

**Vesk's location and the deadline (Source).** As CAMPAIGN-CLARITY §5: Citadel (ch 2) → beam → Zeelich (ch 3) → flies
home, seals the shaft from below (ch 3 end) → below Citadel, heard only on the wire/screen (ch 4–14; on Ballastra only
as paper) → met at the core (ch 16) → a Zeelich cell (epilogue). Deadline: "three days" (ch 8) → the council's stop holds
the drill ("some days", ch 9) → no count in ch 10–14 except Gilbert's "First quiet in two days" → ch 15 "the bore is
turning again" at 140 % (`dp_console_hot`). **The one gap is when Vesk restarted the drill** (issue 1): unstated, so a
player can reckon that the Ballastra trip (ch 11–13: a flight, three jobs, the House, the rig, an hour's waking, five
crates built) ran past "three days" with the drill turning.

**Knowledge arriving too early (Source).** Greps of every key outside its chapter for: 30 % / three in ten; Oren,
Ballastra, B-7/B-8, Tessa, sleepers; "child"/the being's nature; vents before ch 4; the Hamalayi vent before ch 5;
"three days" before ch 8; network before ch 3's end. All gated (life.js desk lines on `c1_plan`, Vesk's B-7 line on
`th_vesk`, etc.). PLOT-CONSISTENCY's 16 items still read fixed in the current text. **None new found.**

## 3. Ending / payoff checklist (epilogue and Keep Exploring; Source)

| Set-up (chapter) | Payoff | Where | State |
|---|---|---|---|
| "Back for dinner" (film, ch 1) | "I am back for dinner. Just not that one." | `ep_zoe_1`, `ep_tw_1` | ✔ |
| The well, Gilbert's bill and refund (ch 1–2) | cold well water; "My refund came. Two months' worth." | `ep_zoe_2`, `ep_gilbert`, end card "The well runs cool." | ✔ |
| Mira's report (ch 2) | "the water office saved the island" | `ep_mira` | ✔ |
| Tim's warm stone (ch 1) | grounded; Lulu "told nobody. Almost." | `ep_tim`, `ep_lulu` | ✔ |
| Arthur's radio (ch 2) / station (ch 14) | "can I fix the next radio"; STATION READY chalk on the lighthouse dial | `ep_arthur`, `ep_lighthouse`, `ep_zoe_idle` | ✔ |
| The 30 % list (ch 2, 8) | half heat "for every house, on the list or not"; Vesk charged for the list | `ep_end_text`, `co_guard_1` | ✔ |
| Evacuation: tunnels, hill families, goats (ch 8) | tunnels empty, goats down, farmers' lines | `ep_zoe_2`, `idle_farmer1–3_home` | ✔ |
| Heat posts dark (ch 8) | glow again (`station.setActive(true)` in `begin`/`applyFlags`) | epilogue.js:71,110; `ro_home_1` | ✔ (but see issue 2 for ch 15–16) |
| Vesk (whole game) | a cell, the joint council's judgement; helped → asks for the readings, sends Baldino corrections | `ep_vesk_helped/left`, `ep_baldino_vesk` | ✔ |
| Sendell fading (ch 7, 15) | "She is asleep again."; Sefa's stars quiet; her light breathing in the deep | `c3_sendell_end`, `idle_keeper_home`, `dp_pool_home` | ✔ |
| Kesh's oasis, Dallan's doubt (ch 4–5, 9) | oasis kept; Dallan carries Tarra's water, unforgiven, not asking | end card, `idle_dallan_home`, `idle_tarra_home` | ✔ |
| Ilka sacked (ch 4) | job back, keeps the gate code; SURVEY POST | `idle_ilka_home`, `dl_post_home` | ✔ |
| Lhar's slides (ch 6) | home, cold mountain, monks' cheese | `idle_yorna_home`, `idle_lhar1–3_home`, `hl_notice_home` | ✔ |
| Pim's mirror (ch 14) | "held the mirror for the whole minute" | `idle_pim_home` | ✔ |
| Zeelich lives on the project (ch 3, 9) | half heat for the docks too; mills grind only flour | `idle_nara_home`, `idle_oku_home` | ✔ |
| Mill Lane / Kell's cart (ch 9, 16) | the cart climbs without Vesk's line | `co_irsa_1` (ch 16) | ✔ |
| The shield is real work (ch 16) | shield crew, SHIELD LOOP chalk, the second coolant loop (Vesk's warning) | `dp_*_home`, `dp_tolli_home` | ✔ |
| Ballastra's sleepers (exp ch 11–13) | Cradle Hall four days on, three lids, Nan Odra's "not yet" kept; `ep_end_text_bl` | `sleepersScene`, `ep_bl_*` | ✔ (exp only, gated `inCampaign('survey') && wk_awake`) |
| Gilbert's B-7 lever (exp ch 10) | his lines in ch 11–13; nothing in the epilogue | `idle_gilbert_*` | ◐ (no epilogue line; PLOT-CONSISTENCY open Q1 on his staging stands) |
| No sequel promise | none found in the epilogue/end card | — | ✔ |

## 4. Confirmed issues, ranked, with the smallest fix (for the coordinator)

### 1. [High · ch 14→15, both campaigns] The drill's restart is never noticed before the shaft, and its timing is open
**Issue.** Ch 9 stops the drill ("The drill below Citadel winds down", `cn_stop_1`; "that isn't the drill any more",
`cn_bal_stop1`) and Baldino promises "I'll watch those needles very closely" (`cn_bal_stop`). Ch 15's first line then
says "Overhead, the bore is turning again" (`c3_arrive_stop`) and the console reads 140 % (`dp_console_hot`). Nobody,
Baldino included, notices the restart in ch 10–14, so (a) his promise vanishes, (b) the reveal lands with no set-up,
and (c) since nothing bounds *when* Vesk restarted, a player can count the expanded campaign's days on Ballastra against
the ch 8 "three days" with the drill turning. **Cause:** S-1's fix (DIALOGUE-2) put the restart only into ch 15's first line.
**Evidence:** Source (`story/chapter3.js:96` gates `c3_arrive_stop` on `cn_stop`; `story/network.js:484–491` the shaft's
rest chain; `story/deeplife.js:95`).
**Fix (one new line, gated as `c3_arrive_stop` is):** `src/game/story/network.js` rest chain (line ~488):
`[['baldino', 'c10_bal_p3'], ...(f.cn_stop ? [['baldino', 'c10_bal_needle']] : []), ['hero', 'c10_tw_p2']]`.
New key in `src/game/text/ch10.js`:
- EN `c10_bal_needle`: "And Twinsen, my bore needle just moved. He's started the drill again, down where the council's stop can't reach."
- HE (he/ch10.js): "ועוד דבר, טווינסן: המחוג של הקידוח שלי זז עכשיו. הוא הפעיל את המקדחה שוב, למטה, איפה שהעצירה של המועצה לא מגיעה."
Then `c3_arrive_stop` (unchanged) confirms what the player already heard; Baldino keeps his promise; "just" bounds the
restart to the moment the doors open, so no travel in ch 10–14 contradicts the deadline. Twinsen's existing answer
`c10_tw_p2` ("I'll turn it around…") still fits. Voice meta: one `voicemeta.js` entry if the coordinator wants an accent
(not required by dialogue-check). Tests to rerun: `tests/playthrough/13-network.mjs` (plays through the doors into the shell), `dialogue-check`.

### 2. [Medium · ch 15–16, both campaigns] The station and Citadel's heat posts differ between playing on and loading
**Issue.** Played on from ch 14, the shell and core keep `W.station.active = false` (machinery still, heat posts dark,
set by `evacuation.js` in ch 8 and never cleared), while the narration says the bore is turning again and the walkers'
ch 15–16 line is "Warm water, warm posts. I don't trust it." (`ro_deep_2`, townbusy.js phase `deep`). Loading the same
chapter gives `active = true`, because `Chapter1.applyFlags` lights it on `c1_water` and `Evacuation.applyFlags` returns
early for `shell`/`core` (its list stops at `network`). Twinsen can ride back up in ch 15 (`dp_bal_shell0`), so the
town is reachable in both states.
**Reproduced — Automated runtime (staged), SwiftShader:** `GAME_URL=http://localhost:8921/ LOAD=<new-13-five, origin
rewritten> node tests/lib/try.mjs probe-posts.js` →
`loaded {key: network, stationActive: false}` → `story.nextChapter()` → `after {key: shell, stationActive: false}` →
`story.applyFlags()` (what a load does) → `afterApply {key: shell, stationActive: true}`. Verdict block PASS, no errors.
**Fix (mechanics, one call):** in `src/game/story/network.js`'s doors-open callback (line ~486, beside
`station?.setSealed?.(false)`), add `this.game.world.station?.setActive?.(true);` (the bore turning again, issue 1's
needle). Load and play-on then agree (load already yields `true`), the derrick runs as `c3_arrive_stop` says, and
`ro_deep_2` is true. No flag, no save change. If the coordinator prefers the chapter to own it: the same call at the top
of `Chapter3.begin()` (chapter3.js:79). Rerun: `tests/world-consistency.mjs` (it lists every story `startTransition`
and residents per chapter state), `14-shell` segment from `base-14`.
**Visible change (P107):** in ch 15–16 Citadel's heat posts glow and the station's machinery/steam runs when played on
(today only after a load). List it for the user's pick.

### 3. [Medium · ch 14, expanded campaign] The valve room's B-8 scene calls the knock "the drill's stroke"
**Issue.** `nwb_trim` "(A thump runs through the pipes on the drill's stroke…)" and `nwb_push` "(On the next stroke the
governor rings…)" are said while the drill is stopped (ch 9's rule: the kicks are no longer the drill's, `cn_bal_stop1`;
Arthur's count in the same chapter: "Three is the shell", `nw_bal_ar`). **Evidence:** Source (`story/balances.js:682,705`,
`NetB8`, gated on `inCampaign('balances') && bh_test`).
**Fix (text only, same keys):**
- `nwb_trim` EN: "(A thump runs through the pipes with the ground's knock. The governor's hum drops a note, and the relay's lamp sinks to a glimmer.)"
  HE (he/ballastra.js): "(דפיקה עוברת בצינורות עם הנקישה של האדמה. הזמזום של הווסת יורד בצליל, והמנורה של הממסר שוקעת להבהוב.)"
- `nwb_push` EN: "(On the next knock the governor rings. The B-8's lever doesn't move.)"
  HE: "(בנקישה הבאה הווסת מצלצל. הידית של ה-B-8 לא זזה.)"
Keeps every clue (the thump, the governor, the glimmering lamp, the lever that won't move). `tests/exp-balances.mjs`
checks `nwb_trim`'s flag and Oren's "shelters drink first", not these words (line 239; its label says "on a stroke":
a comment-only update there).

### 4. [Low · ch 15 journal, both campaigns] "Sendell says it was her" reads as Sendell trapping him
**Issue.** `sh_j_shut` "Crystal grew across the arch behind me. Sendell says it was her: she keeps what she cares for
where she thinks it is safe." In the scene "her" is the child (`sh_sendell_door` "Her too", after `c3_sendell_2`), but the
journal, read cold, makes Sendell the one who sealed him in, against "Sendell not secretly evil". The Hebrew has the same
ambiguity. **Evidence:** Source (`story/answer.js:120` shows it only after `c3_sendell`, so "the child" is known).
**Fix (text only):**
- EN: "Crystal grew across the arch behind me. Sendell says the child did it: she keeps what she cares for where she thinks it is safe."
- HE (he/answer.js): "גביש צמח לרוחב הקשת מאחוריי. סנדל אומרת שהילדה עשתה את זה: היא שומרת את מה שיקר לה איפה שהיא חושבת שבטוח."

### 5. [Low · docs] The story map and the synopsis lag the build
`docs/lba3-production/STORY_MAP.md` still says chapters 11–13 are "empty shells" (the `throttle` row) and has no rows for
`ballastra`, `balances`, `survey`; `docs/STORY_SYNOPSIS.he.md` describes the 12-chapter base game and repeats its
chapter 11/12 sections twice. Neither is player-facing. Proposal: the coordinator (owner of shared docs) points both at
§1 of this file, or adds the three rows from CAMPAIGN-CLARITY §1. Not edited here (not allocated to this agent).

### Checked and not raised (so the next pass need not redo them)
- Chapter transitions are each motivated by a line and a seen journey (glider/ship/ferry films, TRAVEL-1); no chapter
  starts without its reason (table §1). Ch 6 → 7 is short by design (the vent past the monastery).
- Base campaign: hears nothing of ch 10–13 (PLOT-CONSISTENCY's checks re-read: `th_vesk`-gated B-7 line, `NetB8.has()`,
  `ep_end_text_bl`).
- No night, FunFrock dead everywhere (greps), every inter-planet crossing by ship (Ballastra by the council's freighter).
- Walkers' ch 9/14 lines speak of the tunnels in the past tense (`ro_council_0`, `ro_network_5`) while the shelters still
  hold 61 people (`og_zoe_2`, `nwb_or_trim`). Readable as people up for a walk; left (judgement, not a contradiction).

## 5. Dependencies for the coordinator (mechanics, not text)
1. **Issue 2** — `network.js` doors-open callback: `station.setActive(true)` (visible change: posts and machinery in ch 15–16).
2. **Issue 1** — a one-element gated insertion in the same rest chain (`f.cn_stop`); new key + Hebrew; `he-bundle` +
   `dialogue-check`.
3. Issues 3–4 are text-only (same keys, EN + HE), then `node tools/he-bundle.mjs` and `node tests/dialogue-check.mjs`.
Issues 1 and 2 touch the same callback in `network.js`: one owner, one commit.

## 6. Remaining uncertainty
- Played: none. Whether Baldino's needle line reads as urgency or as one line too many at a triumphant moment needs a
  person; the alternative is to fold it into `c10_bal_p3` (longer turn, no new key).
- Issue 2's staged probe drove `nextChapter()` directly, not the network's last relay by input; the play-on path through
  the real chain reaches the same `nextChapter()` call (network.js:491), so the result should hold (inspected, not run).
- Ch 11–13's span remains unmeasured by any line (CAMPAIGN-CLARITY §8); with issue 1 it no longer conflicts with a running
  drill, only with Sendell's "I cannot hold them much longer", which states no number.

## 7. Resume point
This file committed on the worktree branch; nothing else changed. Next: the coordinator implements issues 1–4 (one owner
for `network.js`), reruns `dialogue-check`, `13-network` from `base-13` (or `new-13-five`), `14-shell` from `base-14`,
`world-consistency`, `exp-balances`; then lists issue 2's visible change for the user (P107).
