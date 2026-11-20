# EXP-3 · Ballastra → the network: chapters 12 `balances` and 13 `survey` (task 2 of REVIEW-TASKS-19-11, P74)

**Team-only. Spoilers.** Status: **paused by the coordinator on 19.11 before any code was written.** This file holds the
design and the exact resume point. Branch: `worktree-agent-a8706d79953d4ff8b` (from `ccr-c1c2c4b9-dep6ed` @ 31dc84b9).

## Resume point (exact)
- Done: read the brief (REVIEW-TASKS-19-11 row 2), NEXT-SESSION, EXP-PLAN-2, DEPTH-PLAN, DIALOGUE-2 (S-4), FRESH-EYES
  §12–13, EXPANSION_PLAN R1.3–R1.11 (Oren's rules, the Cradles, WK-1, N4–N6, NW-1, OG-2), and the code listed below.
  Designed the three parts (below). **No source file changed yet.**
- Next, in order (commit after each):
  1. **M1, chapter 12**: rewrite ch.11's end for `balances` next; build the room `bl_house` in `gardenrooms.js`; add it
     to the `bl_gardens` group (`regions.js` add() list, `AT`, `BALLASTRA_AT`); open the gardens' existing
     `exits.toHouse` from the story; new `src/game/story/balances.js` with class `Balances`; register it in
     `story/index.js` (`make.balances`); `CHAPTER_AREAS.balances = ['bl_arches', 'bl_gardens']`; text into
     `text/ballastra.js`.
  2. **M2, chapter 13**: the room `bl_cradles` in `archrooms.js` (the `bl_arches` group), entered through the existing
     empty "third house" on the upper terrace's south plaza (`arches.js`, `P(38.2, TER, 11.8, -π/2)`, door ≈ (36.35,
     11.8) local, facing the bell); class `Cradles` in `story/balances.js`; `make.survey`; retitle `chapter_survey`.
  3. **M3**: the network payoff in the valve room (hook in `network.js` `c10valve` all-green branch) and the epilogue
     cutaway (`epilogue.js` before `showEnd`).
  4. **M4**: Hebrew (`text/he/ballastra.js`, `node tools/he-bundle.mjs`), voicemeta entries, `node tests/dialogue-check.mjs`,
     a new `tests/exp-balances.mjs` (ch.11 → 12 → 13 → 14 with save and reload at each handoff), the legacy `exp_base`
     run to its original ending, `EXP_START_DROP` (main.js constant only) gets `bh_`, `wk_`, `nwb_`.
- File budget: 508 shipped now; this plan adds one file (`story/balances.js`) → 509.

## Code facts found (for whoever resumes)
- `story/index.js`: `balances`/`survey` are `ChapterShell` (pass-through via `Story.nextIndex`); `make` maps keys.
- `story/ballastra.js` `end()`: when the next key is `balances` it already skips the film (`go(null)`). The end is
  `endTalk` (Steps) → `bl_endTalk` → Doran → `bl_done`. Lines to rewrite for the new way on: `bl_ba_2`, `bl_te_end4`,
  `bl_do_home`. A save standing at `bl_endTalk` without `bl_done` must end the chapter on load (set `bl_done`).
- Ballastra's `talk`/`interactables` answer only while it is the current chapter: chapters 12–13 must give the
  Ballastra cast their own (or reused after-chapter) lines, or they fall through to `baseTalk`.
- The gardens (`gardens.js`) already have: `exits.toHouse` (room `bl_house`, inactive), `entries.bl_house`, and the
  test rig (`H.rig`: setPart ×5, setRange ×3, setLevels, setLamp, spill, setSluice; stands `tessa_rig`, `mags_rig`,
  `wenna_rig`, `oren_rig` (Halden), `tib_sluice`, `rigWatch1–4`; spots `rigSlot0–4`, `rigRange0–2`; ball targets
  `rigSwitch0–2`).
- The Arch District has the unused flood bell (`H.bell`: untie, setHorn(i, 0 terrace | 1 lower row | 2 gardens),
  setCam, ring; spots `bellPull`, `bellHorn0–2`). Its notice board line `bl_board_read` mentions "the Low Terrace
  lift": change it to the Cradle Hall when the Cradles move into the terrace house.
- The established lever rule: `th_oren_hand` "A hand on the lever. I do not push against a hand." and `th_oren_tired`
  "Hold it, then. A hand gets tired. I do not." (text/throttle.js). Act-in-the-rest rule: network's `FOUR`, ch.10.
- Choices: `g.setState('shop'); g.hud.openMenu(titleKey, items, pick, onCancel)` (chapter3.js `veskChoice`).
- Hero hiding for a cutaway: `h.rig.root.visible`, `h.shadow.visible` (travelfilm.js `heroShow`).
- Oren's presence: `buildOrenPresence()` (orenpresence.js); scale it ×4 for the Rings in the Cradle Hall.
- The valve station: `network.js` `c10valve` → all gauges 2 → `lightRelay('valves')` → CAMPAIGN-8 `T.valvesDone`
  (Mira takes the wheel) → `stationDone('valves')`. Ch.10's Oren governor stays on the inlet in the expanded campaign.
- Parked `tools/expansion-parked/story/bands.js` (NW-1, four stations) and `coils.js` (OG-6) are **not** brought back
  here (EXP-PLAN-2: never a second tour; one station carries the payoff). `survey.js` (OG-2) stays parked.

## Design decisions
Approved where it decides (EXP-PLAN-2 §3.3: the House N4–N6 condensed; WK-1's beats), the user's row 2 where it does
not. One structural change to EXP-PLAN-2, for the coordinator to confirm: **chapter 13 (key `survey`, kept) becomes
the sleepers on Ballastra, "The Cradles"**, instead of "Under the Well" at home (OG-2 + Sendell). Reasons: the user's
row 2 asks for the sleepers and not for OG-2; W-9/W-12 (Low Terrace, Cradle Control) do not exist, so WK-1 goes into
an interior room; OG-2 was written against old Citadel. Chapter cards then run 11, 12, 13, 14 (S-5 closed).

### Chapter 12 `balances` "The House of Balances" (prefix `bh_`)
- **Entry**: the Steps (ch.11's end, expanded): Baldino: the relays are up but without regulators they only shout;
  find who sells and get the numbers. Tessa: the figures are in the House, across the causeway past Corvin's wheel;
  "Fennick will say it's all in order. It always is."
- **The House** (room `bl_house`, through the gardens' causeway gate): Fennick (new, the House's broker, docker3 model
  with a dress; "I fill orders. I don't read them out loud."), the counter under the great balance beam, the order
  book on its stand, the test bench (a Balance Works coil, a knock lever, a needle, an empty regulator saddle with its
  test card), crates for the project (one marked REGULATORS · TO BE BROKEN UP FOR COILS), the SOLD cabinet.
- **Investigation** (any order; the objective lists what is left): (a) Fennick refuses: the B-7's figures were sold
  with the design and every copy; (b) the order book: Vesk's standing order (every coil and actuator, no regulators)
  and the sale "B-7 design, figures and all copies … reason: failed buyer's test"; (c) the bench, played: the knock
  lever strikes, the coil settles the needle by itself "as if someone held it" — Oren: "I am holding it." — and the
  card on the empty saddle: B-7, repaired T., House test passed, held by hand.
- **Fennick's defence** (credible): forty kiln families eat because the project pays a year ahead; Halden's
  regulators were fitted here once and the council used them to keep the lower row shut out ("a lever is only as fair
  as the hand on it"); the House does not test a buyer's reasons.
- **Turn**: with (b) and (c) found, Twinsen sets the House's own records against each other, and adds what Vesk wrote
  on the tag (ch.10: "It works. Do not fit."). Fennick: he sold her figures so a man could bury a part that works; he
  would still sell the coils ("they hold"). The House keeps one test copy of everything it tests: he gives it
  (item `bh_figures`) and holds the next shipment on the quay. State changes on return: the crates chalked HELD.
- **The working test** (the gardens' rig, Tessa, Wenna, Corvin, Mags): run 1, with the figures as written (glazed
  lever): every lamp green while Wenna's rafts sit on mud — a contradiction seen; Oren: "Steady. I keep them steady."
  Tessa: steady isn't right; she fits the brass lever from her drawing ("B-8: no glaze in the lever", ch.11). Run 2:
  the player sets each basin's band (dial LOW/MID/HIGH) from the need of the person standing there (A rafts HIGH,
  B wheel MID, C the row LOW); Tessa opens the storm sluice; a wrong band lights amber or spills (3 s reset, no
  limit); all right → "Again" → it repeats → "Five. Two days and Corvin's kiln." This teaches the network's rule
  (set from the local reading; a brass lever he cannot push) before it is relied on.
- Flags: `bh_started, bh_fen1, bh_book, bh_bench, bh_oren, bh_crates, bh_turn, bh_fig, bh_rig1, bh_brass, bh_band0–2,
  bh_run, bh_test, bh_done`. No save inside the sluice run (it restarts with the bands kept).

### Chapter 13 `survey` "The Cradles" (prefix `wk_`)
- **Face to face**: Wenna, at the rig: "You said you'd come back for them. One of them is my brother." Jory Mell,
  asleep 34 years; his terms card: "Wake me in ten years, or when my sister asks." She has asked 24 times.
- **The Cradle Hall** (room `bl_cradles`, under the keepers' house beside the flood bell; the bell tied KEEP SILENT ·
  THE CRADLES SLEEP): Garrow (keepers' foreman, paid by the harbour council; "Every family says that."), Nan Odra
  (elder keeper; her mother since the Flood: "He held my mother through the Flood. I won't say a word against that.
  I'll say one against the lock."), the cradles in rows, J-17, the Rings (Oren ×4). Records: the terms card, the
  deferral ledger (DEFERRED · conditions ×24), the Bay 2 plaque (a waking with the ring left open cooled two
  neighbours; keepers held them by hand for a day).
- **What waking needs / what Oren fears / where protection becomes imprisonment**: Wenna asks; Oren: "Not ready." Fear:
  the water rising, Bay 2. Wenna: "You kept him safe for thirty-four years. Now you're keeping him from me." Waking
  needs the ring shut (Garrow: "We knew that. He never let us try again.") and the warming lever held for the whole
  hour against Oren's hush.
- **The rule, played**: Twinsen holds alone; Oren does not push against a hand; his grip gives out at about a quarter
  ("A hand gets tired. I do not."); the cradle cools, Jory sleeps on (fails safe, no fail state).
- **The community**: the flood bell. Its horns are set to the upper terrace (priority, like the water rota): untie it,
  turn a horn to the lower row, ring. Mags: "That bell meant run. What does it mean today?" — "Hands." The row comes
  up (Mags, Dunn, Brin, Ottie, Nuna, Wenna).
- **The rota**: hand to hand at the lever, each handover in the rest between Oren's strokes (on a stroke the lever
  slips a notch: "Between my strokes, not on them."); a holder who tires lets go, the next takes it; warmth only
  pauses. No fail.
- **Waking**: Jory: "Wen? You got old." Wenna: "You got lazy." Oren: "Then the next one is yours to answer for."
  Mags: "Ours." Who decides from now on (said by the people, not by Twinsen): the family asks, the keepers shut the
  ring, Oren warms, hands hold. Oren: "I will keep the others warm until you ask." Nan Odra keeps her mother asleep,
  her choice now.
- **End**: Tessa with five B-8s; the ship's film Ballastra → Zeelich (no walk back) → chapter 14.
- Flags: `wk_started, wk_door, wk_card, wk_ledger, wk_bay2, wk_ask, wk_ring, wk_solo, wk_bell (untied), wk_horn,
  wk_rung, wk_warm (0–100, saved in steps), wk_awake, wk_rule, wk_done`. A reload mid-rota restarts the rota at the
  last saved step (holders reset).

### The payoff in the network (chapter 14, expanded campaign with `bh_test`; prefix `nwb_`)
- Valve room only (the one station on the project's metal where Oren's governor sits, ch.10): after the gauges are
  green and the relay lights, Oren trims on a stroke ("Your box drinks. The shelters drink first."), the relay falters.
  Twinsen fits Tessa's B-8 on the relay's feed and sets its band from Mira's needles (as on the rig); Oren's next
  stroke cannot move its brass lever ("That one has no clay in it."); then the existing takeover (Mira) and
  `stationDone`. Baldino's briefing gains one line: Tessa's boxes are on every relay; only Mira's is within Oren's
  reach. Base campaign and saves without `bh_test`: unchanged.
- Flags `nwb_trim, nwb_fit, nwb_band, nwb_set`; a load with the gauges green and `nwb_trim` offers the relay again.

### Before the credits (epilogue, expanded with `wk_awake`)
After the dinner, before the end card: a short cutaway to the Cradle Hall (hero hidden), four days on: open lids
(who is awake: Jory and the others whose families asked), shut ones (who still waits: Nan Odra's mother, by choice),
the requests board on the door (who decides: the families). Three to five lines (Jory, Wenna, Nan Odra, Oren). Then
back to the kitchen and the end card.

## Not done (all of it)
Every item under "Next" above. Nothing verified; no test run; no Hebrew written.
