# Expansion plan: story and growth (EXP-PLAN)

**Draft for the coordinator's review. Nothing here is coded.** Spoiler content for the whole game: keep it away from
the user. The planet is **Ballastra** (the brief's "Nera", D6). Written 01.11.2026 against `ccr-adf00ea7-37ebl3` at
`0bf9e09` (game 0.48.0, save format 5).

Sources: `EXPANSION_BRIEF.md` (the contract), `EXPANSION_ART_DECISIONS.md` D1–D9, `EXPANSION_WORLD_SPEC.md` (W-1),
`LOCAL_EXPANSION_PROMPT.md` (the split), `GATE_REPORT.md`, `STORY_BIBLE.md`, `STORY_MAP.md`, `STORY_SYNOPSIS.he.md`,
`WORLD_MAP.md`, `TWELVE_YEARS.md`, and the chapter code in `src/game/story/` and `src/game/text/`.

Labels used below: **[canon]** LBA1/LBA2; **[approved]** this sequel's approved story (bible, map, user decisions);
**[new]** proposed here. Everything about Ballastra, the underground's interior, Tessa, Oren and the residents is [new].

**Gate.** `GATE_REPORT.md` says the gate is NOT passed (B-1 chapter-10 lighthouse blocker, T-1 harness, no laptop
performance or human visual review). This plan can be reviewed now; coding of campaign changes waits for the gate,
except the items the brief allows before it (isolated previews, the W-1 slice on the expansion branch).

---

## 1. Where the game is now

**How the minutes were estimated.** No first-time player has been timed, so every figure is an *unvalidated
estimate*. Per chapter: (a) the bot's game time from the gate run's traces (`docs/future/gate-logs/pt-*.trace`, last
stamp; 14 segments, ~71 min total; the bot walks A* routes and skips optional content) × 2 for a newcomer finding the
way, missing throws and retrying; plus (b) reading time: English words in the chapter's text file at ~150 words per
minute (the boxes are clicked through); plus (c) ~1.5 min of thought per distinct puzzle on the main path. Plausible
range ±25%.

| # | Chapter (key) | What actually happens (one line) | Bot min | Est. min |
|---|---|---|---:|---:|
| 1 | The Well (`well`) | Ball from the cupboard; Gilbert and Mira's row for the lid key; kick the lid; Doran's stamp for Xil's ladder; the kids; down the well; mites, three crystals, Sendell. | 6 | 27 |
| 2 | The Joint Project (`project`) | Pipe map; three bypass valves (depot, orchard, cliffs); Vesk's tour; Zoé's office stealth finds the 30% plan; beam pad; Arthur's radio; Doran flies him to Zeelich. | 14 | 47 |
| 3 | Zeelich (`zeelich`) | Plan confiscated; Baldino and the shell; depot locker; mill cog; three mill brakes; override key; Zoé's lighthouse dials; shield; Vesk seals the shaft. | 4 | 27 |
| 4 | The Dig (`dig`) | Wind-pump (Sani's clack); sand-yacht to Ilka; notebook in a sandstorm; keypad; terraces; three discs; Temple of Bù; the carving with five vents. | 6.5 | 32 |
| 5 | Steam and Sand (`steam`) | Brosk's jar; shovel; condenser hall; diagram; valves 1, 3, 4; hangar hatch; Dallan seizes the ferry; relief valve; escape; glider north. | 4 | 20 |
| 6 | The Pass (`pass`) | Fell the frozen tree; Lhar; Pim's kite for the fuse; heat; cut the rope; two winch trips; the monastery. | 4 | 18 |
| 7 | The Observatory (`observatory`) | Keeper Sefa; three mirrors; telescope; heavy drone; vent open; Sendell: "I cannot do this alone"; Arthur: Citadel evacuating. | 2 | 13 |
| 8 | Evacuation (`evacuation`) | Zoé's plan; Gilbert's two shelters (lever, ball wheel); Mira's key; Pippa; Zoé leads three farms; the relay to the council; Vesk: "three days". | 8 | 27 |
| 9 | The Council (`council`) | Form 12-B; Nara's and Oku's stamps (free three mills); clerk; hearing; archive in a borrowed coat; Dallan with Ilka's proof; the vote. | 3.5 | 19 |
| 10 | Baldino's Network (`network`) | Five relays in any order (mill, valve room, lighthouse, bore fight, dome); pulse tool and hop-pack; the shaft opens. | 17 | 50 |
| 11 | The Shell (`shell`) | Shaft; cooling diagram, valves A and C, ladder; crystal galleries' pillars; Sendell's plain truth. | ~3.5 | 15 |
| 12 | The Core (`core`) | Vesk; guardian; three pylons by bank shots (Zoé, Mira, Oku answer); the coil; shield mode; arrest. | ~2.3 | 14 |
| — | Epilogue (`home`) | Dinner, the end card, Keep Exploring with new lines. | — | 3 |
| | **Main path** | | **~75** | **~312 (5.2 h; range 4–6.5 h)** |

Existing optional content (estimates): The Old Pump ~10, The Mislabelled Shipment ~12, The Test Pair ~8, The
Wind-Catcher ~10, The Second Bake ~8, Under the Street ~10, the arsenal's dark places and gifts ~12: **~70 min**, plus
free roaming (LBA1 places, Zeelich's islands), not counted.

**The gap.** Main path 5.2 h → 12 h: **+6.8 h** (~408 min). Optional 1.2 h → 3 h: **+~2 h** (new stories ~2.25 h; the
total lands near 3.4 h and is trimmed at playtest).

---

## 2. The new chapter structure

### 2.1 Order, keys and display numbers

Existing keys stay (`flags.chapterKey` is what a save stores; `NUMBER` is display only). Four new keys.

| Show | Key | Title | Status | Where | Prefix |
|---:|---|---|---|---|---|
| 1–9 | `well` … `council` | as now | existing, deepened (§3) | as now | as now |
| 10 | `throttle` | Borrowed Time | **new** (the bridge) | Zeelich, Citadel, (Hamalayi by radio) | `th_` |
| 11 | `survey` | Under the Well | **new** (first underground visit) | Citadel's well → outer underground | `sv_` |
| 12 | `ballastra` | Ballastra | **new** (N1–N3) | Float Harbor, Water Gardens, Arch District | `bl_` |
| 13 | `balances` | The House of Balances | **new** (N4–N6) | harbour warehouse, House of Balances, gardens' test rig | `bl_` |
| 14 | `network` | Baldino's Network | existing, adapted | all regions | `c10_` |
| 15 | `shell` | The Shell | existing + the second underground passage | shaft → the Wound → deep installation … Sendell | `c3_`, `ur_` |
| 16 | `core` | The Core | existing, enriched | the core | `c3_` |
| — | `home` | Home | existing, extended | Citadel | `ep_` |

`ORDER = ['well','project','zeelich','dig','steam','pass','observatory','evacuation','council','throttle','survey','ballastra','balances','network','shell','core','home']`.
Vesk's bypass milestones are global: `vm_1` (end of `survey`), `vm_2` (end of N3), `vm_3` (start of `network`).

### 2.2 The causal line (brief §5)

1. **Ch. 1–7** gain playable depth (§3) and two Ballastra seeds: a stencil on the project's crate (ch. 1–2) and
   Vesk's own throwaway line about "ceramic regulators that argue with the control room" on the tour (ch. 2).
2. **Ch. 8–9** stay decisive. Ch. 9's archive gains a fourth cabinet, SUPPLIERS: a receipt for a regulator trial
   from Balance Works, Ballastra, "returned". Twinsen notes it without understanding it.
3. **Borrowed Time (10).** Vesk's "three days" assumed every feed station at full. The council's order lets the
   allies throttle three feed stations at once (Zeelich depot, Citadel station, the Hamalayi heating station),
   coordinated by Arthur's radio, which fails once and works when Pim's mountain rule ("say it back") is adopted.
   The cost is shown: dim heat posts, a cold oven on a borrowed hearth, the ferry idle, the shelters on Bram's pump.
   Baldino's bench model proves a fixed shield moves the crack elsewhere. Zoé (playable) matches her register to the
   SUPPLIERS receipt and finds the rejected regulator in the station's store, with Vesk's note: rejected because
   local stations could override central command.
   - The chronology in one exchange: Baldino says throttled, "a fortnight, maybe, until he finds a way round";
     Twinsen says "So it buys time, not a fix."
4. **Under the Well (11).** The throttle drops the well's hot water. Ilka (radio) reads the carving: the well is
   Sendell's old way down. Twinsen places Baldino's three gauges, learns by being blocked that forcing one channel
   moves pressure to the other, and turns mineral facets so Sendell's light shows a safe ledge. He sees the
   station's feed casing break the rock, and one glimpse of her. The readings move like water between linked tanks.
   `vm_1`: Vesk reroutes one feed.
5. **Ballastra (12–13).** Doran flies the project's idle Ballastra freighter (the council's order) from Citadel
   Spaceport. N1–N6 as in §4. `vm_2` after N3: Vesk is buying bypass gear on Ballastra through a contractor.
6. **Network (14).** Tessa comes with the prototype. Each relay becomes a regulator, and each friend sets the
   local band from the local signal. Zoé decides each station keeps a local override, the very thing Vesk rejected,
   and relays his note and order to the council. `vm_3`: Vesk has bypassed the last throttle with the coils he
   bought.
7. **The Shell (15).** The drilling surge has caved the shaft's tunnel. The way runs through the changed outer
   layers (the Wound), where Twinsen's gauges show which way is steady; local bands, not force, open the passage.
   Then the existing deep installation, galleries and Sendell.
8. **The Core (16)** keeps Vesk, the guardian, three pylons and the coil. Now the pylons' stress shifts as she stirs,
   the allies answer in the say-back protocol, and Vesk's central command is refused by the local overrides. The
   coil is Balance Works stock he bought. Arrest, then the homecoming.

Nothing new happens after the core except the human aftermath.

### 2.3 Where each existing hook sits

| Hook | File · flag / moment | Change |
|---|---|---|
| Crate stencil | `opening.js` cargo-lift crate; free look in `prologue.js` after the opening | W-8a stencil; look line `pr_crate` (optional) |
| Feed wheel, returned crate | `chapter1.js` Vesk's tour (`c1_tour` chain, line 221) | new step `c1_feedUp` inside the tour; look `c1_crateSeen` |
| Nell's shelf | `life.js` shipment aftermath (`l_` flags) | one look line on a Ballastra float valve |
| Grumm's burrow route | `chapter2.js` depot step (`c2_cyl`) | alternate entry `c2_burrow`; Grumm lines in `zeelife.js` |
| Ilka's stakes | `dig.js` between `c4_ilka` and `c4_notebook` | `c4_stake1..3`, `c4_stakes` |
| Sani's vent, Dallan's water | `steam.js` alt to `c5_dug`; after `c5_relief` | `c5_saniVent`, `c5_dallanWater` |
| Escort, Pim's set | `pass.js` after `c6_bridge`; at the monastery (`c6_up`) | `c6_escort`, `c6_radio` |
| Two suns, walls, melt race | `observatory.js` `c7_mirrors`, `c7_keeper`, after `c7_droneDown` | `c7_sun2`, `c7_walls`, `c7_race` |
| Shelter in place, asylum way | `evacuation.js` before `startZoe()`'s farms; alt to `c8_fort` | `c8_sip*`, `c8_asylumWay` |
| Hearing, heat, SUPPLIERS | `council.js` `hearing()`/`verdict()`; cabinets (`c9cab`) | `c9_ev*`, `c9_grumm`, `c9_ledger` |
| End of ch. 9 | `council.js` `verdict()` → `nextChapter()` | now leads to `throttle` by ORDER; `c9_bal_c3`, `c9_tw_c3` rewritten |
| Network start, B-1 | `network.js` `begin()` (`c10_started`); lighthouse npcSpots | Tessa, `vm_3`, bands; Zoé and Arthur moved off the dial bank |
| Shell start | `chapter3.js` `begin()`; `underground.js` c3shaft exit `'c3-deep'` | blocked until `ur_done`; new exit to `uw_breach` (hook) |
| Core | `chapter3.js` ALLIES, pylon hits, overload chain | stress lamps, roll call, central override refused |
| Epilogue | `epilogue.js` `begin()`, LINES | homecoming walk, new lines |
| Travel | `travel.js` | Citadel Spaceport ⇄ Ballastra pad, from `ballastra` on, expanded campaign only |
| Areas | `regions.js` CHAPTER_AREAS, groups | new keys and lazy groups |
| Saves | `main.js` SAVE_VERSION, `migrateSave` | v6 (§6) |
| Story | `index.js` ORDER, NUMBER, `make`, journal, side modules | new keys; modules `md`, `ls`, `ym`, `ab`, `sb` |
| Magic levels | `magic.js` per-key table | entries for the new keys |

---

## 3. Deepening chapters 1–9 (and the pacing table)

Pacing target (brief §13) against today's estimates:

| Segment | Now | Target | Added by |
|---|---:|---:|---|
| Ch. 1–3 | 101 | 120 | DP-1, DP-2a/b, DP-3a/b |
| Ch. 4–7 | 83 | 150 | DP-4, DP-5a/b, DP-6a/b, DP-7a/b/c |
| Ch. 8–9 | 46 | 90 | DP-8a/b, DP-9a/b/c |
| Bridge + survey | 0 | 45 | BR-1…4, SV-1…3 |
| Ballastra | 0 | 180 | N1–N6 |
| Network, return, core | 79 | 120 | NW-1/2, UR-1, CORE-1 |
| Homecoming | 3 | 15 | EP-1 |
| **Main** | **312** | **720** | |
| Optional | ~70 | ~200 | OP-1…6 (new ~135) |

Per chapter, target: 1: 30 · 2: 52 · 3: 38 · 4: 42 · 5: 34 · 6: 36 · 7: 38 · 8: 50 · 9: 40 · 10: 22 · 11: 23 · 12:
85 · 13: 95 · 14: 60 · 15: 40 · 16: 20 · ep: 15 = 720.

The deepening cards in §4.6 add up to 29 · 52 · 38 · 42 · 31 · 34 · 36 · 45 · 35 for chapters 1–9. That is ~17 min
short of the ch. 4–9 targets (4–7: 143 of 150; 8–9: 80 of 90). The difference is left on purpose: it is closed after
the first real timings, by changed-place conversations on return visits or by cutting, not by padding now.

Principles: no duplicate of an existing side story (the Old Pump, Shipment, Test Pair, Wind-Catcher, Second Bake and
Under the Street are *reused as payoffs*, never redone); chapters 1–2 (which the user plays by hand) get only seeds
and one short step inside an existing scene; every addition is a place, a person with a reason, a route or a
consequence.

---

## 4. Quest cards

Format per brief §14. **Min** = estimated first-time minutes. Rewards use `ChapterBase.reward` (owed until picked up:
no duplicates on reload). "Recovery" always includes: a save inside a puzzle loads at that room's safe spawn with every
moving part set from flags (instant setters).

### 4.1 The bridge: Borrowed Time (`throttle`, `th_`)

**BR-1 · Form 12-C** — Min 4
- Pre: `c9_vote`. People: Amaru, Sela, Brum, Ottavo, Baldino. Where: council chamber, upper district.
- Objective: "Get the throttle order stamped."
- Actions: the vote's aftermath runs as a short scene (Baldino's arithmetic). Brum objects: "Throttle the feed and
  Zeelich goes cold." Sela drafts the order. Twinsen carries it to Ottavo, who wants a second copy: "One for the
  file, one for the drawer." Twinsen takes the carbon from the archive's desk (the archivist nods him past, now
  friendly or not depending on `c9_coat`). Ottavo stamps both.
- Mechanic: talk and a short walk through rooms the player knows (return visit, changed attitudes).
- States: `th_started` → `th_order` (the item "Throttle order").
- Clue: the chronology line (Baldino: "a fortnight, maybe"). It is also in the journal (`th_j_time`).
- Recovery: nothing to lose. Consequence: the council's order now has teeth above ground.
- Save: `th_started`, `th_order`. Accept: the old "three days" is never repeated after this. The journal says the
  estimate changed and why.
- Lines: Baldino: "Vesk's three days assume every feed station at full. Throttle them, and he crawls." Twinsen:
  "So it buys time, not a fix."

**BR-2 · The Bench Shell** — Min 5
- Pre: `th_order`. People: Baldino. Where: Baldino's workshop (W-8a model on the relay table).
- Objective: "Test Baldino's shield on the bench."
- Actions: five pegs around a glass ring (the five stations), each with low, mid and full. Baldino taps the ring
  ("she stirs"). Twinsen sets any fixed pattern and taps: a hairline runs to the weakest peg, opposite the tap. Two or
  three tries with different patterns all fail somewhere. Baldino calls it.
- Mechanic: a toy that teaches the core's rule before it matters. The model always resets.
- States: `th_model1` (first failure), `th_model` (Baldino's conclusion).
- Clue: Baldino says "Any fixed setting fails somewhere. The pegs would have to answer each other." He hands over
  three pressure gauges, "to hear the real shell."
- Recovery: none needed. Reward: the gauges (item `gauges`, three).
- Save: `th_model1`, `th_model`. Accept: the conclusion only after at least two taps, or a third talk to him (no
  softlock). The gauges are not missable (also given on `th_model` set by a fallback after 3 min of talk).

**BR-3 · Say It Back** — Min 8
- Pre: `th_model`. People: Arthur (radio, home), Mira (control room), Pim (Hamalayi heating station), Yorna, and
  Twinsen at the Zeelich depot's feed wheel (W-8a).
- Objective: "Throttle the depot feed when Arthur calls it."
- Actions:
  1. At the wheel Twinsen calls in. Arthur runs the hub and floods the channel. Mira turns early, and Pim's "done"
     is lost in Arthur's chatter.
  2. The bore's controller sees one station drop and pushes the rest up: the depot pipe surges, steam spits from a
     joint on a short readable cycle, and the wheel kicks back to full. The street's posts flare.
  3. Twinsen times his approach between the spits and winds the wheel back (three turns).
  4. Pim: "On the mountain you say it back, or somebody falls." Arthur proposes call signs: Depot, Mains, Dome.
  5. Second try: each station reports, and Arthur repeats each one. Twinsen answers with a two-option choice:
     "Ready." or "Depot, ready." Only the second gets Arthur's "Heard: depot ready". The wrong one gets Pim's gentle
     "Say which one you are", and the choice comes again.
  6. On "three" Twinsen turns the wheel. All three drop together, and the bore slows.
- Mechanic: the coordination rule, played: acknowledge, then act. The cost is shown at once, and the street's posts
  dim.
- States: `th_try1` → `th_protocol` → `th_throttled`.
- Clue: the mandatory signal knowledge is taught here (not in Arthur's Boat). The journal keeps the call signs.
- Recovery: the steam only knocks him back (1 HP, never lethal at 1 HP: it pushes instead). A save mid-try
  resumes before `th_try1` if `th_protocol` is unset.
- Consequence: dim posts on Zeelich, cold monastery, ferry idle on Twinsun (ch. 10–13). Old Grumm lends the street
  the burrow's charcoal braziers ("We never had heat. We know cold."). Snuff bakes on the watch house's old hearth.
  If The Second Bake was skipped, it stays available: its oven is simply cold for a while.
- Save: `th_try1`, `th_protocol`, `th_throttled`. Accept: the choice cannot be failed. The surge is recoverable.
  The objective names the wheel. Vesk's broadcast follows: "Whoever is touching my feed stations: stop. Paper does
  not reach this deep."

**BR-4 · Return to Sender** (Zoé, playable) — Min 10 (incl. the trip home)
- Pre: `th_throttled`. People: Zoé (played), a packing guard (Watcher), Arthur. Where: home (Zoé's desk and the heat
  meter), the station's project office and a small store behind it (W-8a `projstore`).
- Objective (as Zoé): "Find out what the project sent back."
- Actions:
  1. Twinsen radios what the SUPPLIERS receipt said (if `c9_ledger` is unset he reads it from the order's copy: same
     words; redundancy).
  2. As Zoé: at her desk she reads the register's year books. Her heat-meter note says it jumps when the ground hums;
     one six-week stretch two years ago has no jumps. The dates match the trial.
  3. She goes to the station office (her chapter-2 room, now half packed) and slips past the packing guard into the
     store.
  4. There she finds the crate stencilled BALANCE WORKS · BALLASTRA · REJECTED, seeded in chapter 2. It holds a
     ceramic-and-brass regulator housing (B-7) and the trial log: "Stable under shifting load. Rejected: local
     stations can override central command. — V."
  5. She decides to take the housing home rather than report it. (A notice THEFT FROM PROJECT STORES appears in ch.
     14; Zoé is amused.)
- Mechanic: comparison of three sources (her register, the receipt, the object), then her chapter-2 stealth.
- States: `th_zoeStart` → `th_register` → `th_crate` → `th_zoeDone`.
- Clue: the revelation changes understanding (Vesk knew a distributed design worked and refused it for control) and
  action (a return address: Float Harbor, Tessa's shed). Redundant sources: ch. 2 tour line, ch. 9 receipt, the
  register, the crate.
- Recovery: caught → back to the office door (as in ch. 2). A save mid-run resumes before it (as `c8_zoeStart`).
- Consequence: the B-7 housing sits on the family's kitchen table until N6. Arthur pokes it in idle lines.
- Save: `th_zoeStart`, `th_register`, `th_crate`, `th_zoeDone`, item `b7`. Accept: Zoé's run cannot be failed. The
  housing cannot be lost. The scene with Twinsen at the table follows his spaceship arrival (Zeelich Spaceport →
  Citadel Spaceport, by input).
- Lines: Zoé: "Vesk had the answer two years ago, and he sent it back." Twinsen: "Then we go and ask whoever built
  it." Zoé: "Not with a crate and a hunch. They'll send us back too."

### 4.2 Under the Well (`survey`, `sv_`) — three parts, ~23 min

**SV-1 · The Well, Again** — Min 7
- Pre: `th_zoeDone`. People: Ilka (radio), Arthur at the well top (radio). Where: the town well (lid open since
  ch. 1), the well cave (water low), beyond the broken crystal wall: `uw_entry`, `uw_lake` (W-5).
- Objective: "Place Baldino's gauges where the shell moves."
- Actions:
  1. Ilka (radio): "My carving had her well going down to the shell. Yours is the only well on it." The throttle has
     dropped the water.
  2. Twinsen goes down Xil's ladder into the changed cave, past the crystal wall broken in ch. 1, into warm galleries.
  3. Lake: the low water shows root shelves. One hanging root is tied off high, and the ball drops it as a bridge.
  4. He places gauge 1 on the far shelf.
- Mechanic: traversal; the ball on a visible latch.
- States: `sv_started` → `sv_g1`.
- Recovery: deep water pushes back (W-5 soft edge). Fall → the shelf's safe spot.
- Save: `sv_started`, `sv_g1`. Accept: the cave's ch.-1 state (wall broken, crystals) is preserved.

**SV-2 · Two Channels** — Min 8
- Where: `uw_channels`. The connection: the station's feed casing pierces the ceiling.
- Actions: two pressure channels share a chamber, each with a valve (low, mid, high). Gauge 2's ledge sits between
  their jets.
  1. Closing channel A to cross makes channel B roar across the ledge.
  2. Forcing B makes A roar.
  3. Both set to mid breathe on a short predictable cycle (3 s), and the ledge is crossable.
  4. While he is there the casing bangs, and Arthur at the top says "The station pipe just banged" at the same
     moment.
- Mechanic: the displacement rule, felt, not lectured. Recoverable at any setting.
- States: `sv_forced` (first displacement seen, line "Shut one, and the other takes it"), `sv_g2`, `sv_casing`.
- Recovery: a jet pushes back, never damages. Valves keep their settings across a save.
- Save: `sv_forced`, `sv_g2`, `sv_casing`, `sv_valveA`, `sv_valveB`. Accept: no setting strands him. The line about
  displacement plays the first time a jet blocks the ledge.

**SV-3 · Her Light** — Min 8
- Where: `uw_layers`. People: Sendell (voice and light, D7).
- Actions:
  1. Three mineral facets turn in steps (use, or the ball on their pivots). Lined up, Sendell's light runs through the
     layers and shows a ledge path that is solid only while lit.
  2. He places gauge 3 at the top.
  3. One glimpse (D8): a vast slow shape turns once behind the thick layer as the light passes.
  4. Back at the cave the three gauges read in sequence: a swell rolls from one to the next.
  5. Baldino (radio from the well top): "It moves like water in linked tanks. A fixed shield is a dam with no
     spillway." Zoé: "Ballastra's whole trade is linked water."
- States: `sv_facets` → `sv_g3` → `sv_glimpse` → `sv_done`; sets `vm_1` (Baldino: "He's rerouted the depot feed. We
  lost a few days.").
- Recovery: the lit path's collision only exists while lit. If the facets are turned off mid-path he drops to the
  layer floor (safe), and the facets keep their state.
- Consequence: the gauges stay in place, and they become the beacons of UR-1.
- Save: as listed. Accept: Sendell neither carries him nor solves it (her line: "I can show you where the stone
  holds. I cannot carry you."). Her light is visibly fainter than in ch. 7.

### 4.3 Ballastra (`ballastra` N1–N3, `balances` N4–N6, prefix `bl_`)

Arrival (part of N1): Doran lands the freighter on the pad. Harbourmaster Quill weighs every visitor ("The lift has
opinions about ballast."). The return label on the B-7 crate reads TESSA'S FLOAT REPAIRS, FLOAT HARBOR.

**N1 · Wrong Dock** — Min 30 (incl. arrival) — W-1
- Pre: `sv_done`; the spaceship from Citadel Spaceport (`bl_arrived`). People: Tessa, Hobb (dock worker), Quill, the
  boat's owner (Wenna's cousin Ferro). Where: Float Harbor (`ballastra`, `bl_shed`).
- Objective: "Free the stranded boat." Tessa won't talk measurements until her lift works ("One job. Then we'll see.").
- Actions:
  1. Crank the counterweight to see the deck move: a high weight gives a low deck. The boat dips to the outer water,
     then rises only halfway.
  2. Hobb points at crane B's latch: "Drop that load on the chain and she'll lift." The ball releases it.
  3. The swung load blocks the pedestrian walkway, and the shed's float is cut off (`walkway.blocked`).
  4. Crank to the middle: the deck reaches basin level, the walkway clears, and the boat sails out.
  5. The shortcut opens.
- Mechanic: weight and level (W-1 `counterweight.set`, `crane.release`, `lift.level`, `boat.sailOut`,
  `shortcut.setOpen`). No timing challenge.
- States: `bl_arrived` → `bl_tessa1` → `bl_crank` (first crank seen) → `bl_crane` → `bl_balanced` → `bl_n1`.
- Clue: Tessa at the bench (`shedBench`) reads Baldino's tapes: "That's not a machine fault. That's a load moving
  between basins." She knows the B-7: "I mended that for your project. It came back with REJECTED chalked on it."
- Recovery: every part can go back. Falls return to the nearest deck (`safe`). The crane can be re-latched at its
  lever to retry (needs `crane.reset(instant)`, not in W-1: requested in W-2's header).
- Consequence: traffic resumes (dockers working, boats moving), the shortcut stays open, and Tessa inspects the
  measurements. Reward: Ferro's thanks, 10 kashes.
- Save: as listed + `bl_cw` (counterweight position). Accept: lift and walkway states match flags after reload. Tessa
  agrees to help only with "a bounded job" and sends him to the gardens: "Anyone who balances water here is a
  grower, and the growers' water has stopped."

**N2 · The Missing Water** — Min 28 — W-3
- Pre: `bl_n1`. People: Wenna (grower), two growers, Corvin (kiln owner), Tessa (later). Where: Water Gardens, the
  service tunnel, Corvin's kiln.
- Objective: "Find where the gardens' water goes."
- Actions:
  1. Trace the visible flow: dry rafts, a channel with silt marks.
  2. Compare the two gauges side by side: the upper channel is full, the lower gardens empty.
  3. Enter the service tunnel (hatch). An unrecorded tap feeds Corvin's kiln wheel; the kiln glazes the floats
     everyone uses.
  4. Closing the tap kills the kiln, and Corvin comes running. Opening it fully leaves the gardens dry.
  5. Repair the bypass (a seized valve) and route through the splitter board: three gates, set from the tunnel and
     two across the channel by ball, so the kiln wheel turns "enough" and the gardens get theirs.
- Mechanic: share, don't shut. The same rule as the shield, at garden scale.
- States: `bl_n2Start` → `bl_gauges` → `bl_tap` → `bl_bypass` → `bl_n2`.
- Clue: Wenna: "My beans don't care about history. They care about this week's water."
- Recovery: wrong settings visibly starve one side and can be reset at the board. Rafts recover; nothing dies.
- Consequence: rafts green over two visits (`rafts.setState`), and the kiln runs. Corvin promises to glaze a float
  for "whatever you're building" (a part for N6). Residents mention it later.
- Save: `bl_gate1..3`, plus states. Reward: Wenna's basket (a heart), and Corvin's float (item, in N6).
- Accept: both sides end above their minimum. Corvin is never made a villain.

**N3 · The Uninvited Engineer** — Min 27 — W-2, W-7
- Pre: `bl_n2`. People: Oren, Mags (lower-row representative), a lower-row resident (old Dunn), Tessa. Where: Arch
  District (upper terrace, lower row, Oren's house, the old pump room).
- Objective: "Get the regulator's plans from Oren."
- Actions:
  1. Tessa: "The B-7 is Oren's safeguard in a box. He won't thank you for saying so."
  2. Oren gives a copy of the old plan, not the regulator's numbers: "The rest is in the House. I don't go there."
  3. Mags won't let a stranger into the lower row's pump room until he helps Dunn: a door silted shut at canal
     level. He clears the silt (sword) and kicks it free.
  4. In the pump room, brass plates read UPPER TERRACE · PRIORITY. Comparing Oren's plan with the machine shows his
     drawn spill gate to the lower row; in the room it is chained shut under an old official seal.
  5. Twinsen cuts the chain (sword) and releases the gate's pawl high on the pier (ball). The lower row drains to
     its proper level.
- Mechanic: plan against machine; a resident's repair as the key; physical remnants instead of a history panel.
- States: `bl_n3Start` → `bl_plan` → `bl_dunn` → `bl_pump` → `bl_chain` → `bl_spill` → `bl_n3`; sets `vm_2`.
- Clue: the understanding that the old failure was a choice about whose homes mattered, read from the chain and the
  plates. Oren: "I drew the safeguards. Other people decided which ones to keep."
- Recovery: the spill gate can be closed again at its wheel; the chain cut is permanent but harmless.
- Consequence: residents return to the lower row (washing, open shutters, boats tied). Mags: "One open gate
  doesn't make him a neighbour." `vm_2` (Doran relays Baldino over the freighter's radio): Vesk is buying bypass
  gear through a Ballastra contractor.
- Save: as listed + `canal` level. Reward: Mags gives the Silent Bell's key (unlocks OP-5).
- Accept: Oren contributes incomplete plans; no long speech; Mags stays sceptical through N6.

**N4 · Vesk's Shipment** — Min 30 — W-4 Part A, W-1
- Pre: `bl_n3`. People: Fennick (contractor), two yard hands, a gatehand, Hobb. Where: the harbour warehouse
  (`bl_warehouse`) and yard.
- Objective: "Find what the project is buying."
- Actions:
  1. Follow crates with Balance Works stencils from the quay to Fennick's yard.
  2. Hobb lends a Fennick & Daughters work coat (he works there some days). The ch.-9 coat rule applies: watchers
     notice more slowly.
  3. Take the service route on the crane catwalk, reached by the N1 shortcut.
  4. Inspect the marked crates and the paperwork: a standing order, "Buy every Balance Works coil and gate actuator
     offered. Do not buy regulators. — V.", and the original B-7 test records.
  5. Take the last intact regulator assembly, about to be broken up for its coil.
- Mechanic: stealth with a warning. Detection starts a short fight with two yard hands (knocked out), or Twinsen
  retreats and retries. Perfect stealth is never required.
- States: `bl_n4Start` → `bl_coat` → `bl_order` → `bl_records` → `bl_assembly` → `bl_n4`.
- Revelation: Vesk rejected distributed safeguards and is buying the compatible parts that make his bypass work.
  Fennick, shown the throttle order: "I fill orders. I don't like being lied to about what they're for." He cancels
  the rest, but the first coils have already shipped. Vesk is never on Ballastra.
- Recovery: detection never destroys the assembly (it sits in a locked crate the yard hands don't touch). The quest
  resets to the catwalk.
- Consequence: freight shortcut to the House causeway opens (`freight.setOpen`), the gate is guarded from now on (a
  gatehand who waves Twinsen through after `bl_n4`), crates searched.
- Save: as listed + `bl_detected` (count, for lines only). Reward: the assembly (item), the records (item).
- Accept: reload during detection does not lose items; the order text is quoted the same in the journal.

**N5 · The Filling House** — Min 35 — W-4 Part B
- Pre: `bl_n4`. People: Tessa, Oren (he hasn't been inside since the flood). Where: the House of Balances.
- Objective: "Bring out the old mechanism and its records."
- Actions:
  1. Raise and lower each room's water at its sluice wheel. Floats ride the level and serve as platforms.
  2. Ball releases on high latches; sword cuts the tangled nets.
  3. In the filling hall, a small cracked gate drops if the hall is raised too far while it stands open. Tessa warns
     first, and it resets at its wheel.
  4. Reroute pressure through the float gallery to reach the records chamber: the master Balance and the operating
     ledgers.
  5. On the way out, raising the gallery to float the Balance out makes the main damaged gate fail, as warned. The
     known way back is shut, and Oren leads through the maintenance passages, which stay open as a safe route.
  6. Encounters: three of the old system's keepers, automatons that still shut gates toward the lower side. Ball
     and sword.
- States: `bl_n5Start`, `bl_hallLevel`, `bl_galleryLevel`, `bl_net1..3`, `bl_latch1..3`, `bl_records2`, `bl_balance`,
  `bl_gateFell`, `bl_maint`, `bl_n5`.
- Clue: the allocation log in the records chamber carries Oren's signature on the bypass order; he pockets the page
  (paid off in N6).
- Recovery: drowning or a failed jump restores the room's safe spot with levels as saved. A save in a room sets its
  level from flags. The Balance stays in his pack once taken.
- Consequence: a safe route through the House and a working test chamber (postgame). Reward: the Balance (item), a
  clover in a ledger chest.
- Accept: no item duplication across reloads; the failing gate was shown failing (small gate) before it matters.

**N6 · A Working Test** — Min 25 (+5 return) — W-3 test rig
- Pre: `bl_n5`. People: Tessa, Oren, Mags, Wenna, Corvin, Tib. Where: the gardens' test installation.
- Objective: "Prove the regulator on three basins."
- Actions:
  1. Fit the prototype's parts (B-7 housing, N4 assembly, the Balance's core, Corvin's float, Tessa's frame) into the
     slots.
  2. The three basins stand for three neighbours: Wenna's rafts, Corvin's wheel, Mags' row. Watch how each one's
     level answers the others.
  3. Set each basin's local response range from its own float signal (low, mid, high).
  4. Tib opens the storm sluice, a controlled disturbance. Twinsen moves between basins and hits the three switch
     latches with the ball when a basin's lamp calls for it, never all at once.
  5. Success: no basin spills onto its neighbour. With the Silent Bell repaired (OP-5), residents clear the walkways
     at the warning and the disturbance phase gets more room.
- Mechanic: the finale's rule in miniature: respond to local signals and coordinate.
- States: `bl_n6Start`, `bl_parts` (bits), `bl_range1..3`, `bl_testFail` (count), `bl_tested`, `bl_n6`.
- Human turn: Oren holds out the log page to Mags. Mags: "Keep it. I know what it says. I wanted you to read it."
- Result: plans, a tested prototype, and Tessa's help ("For the fitting. Not the speeches."). Over the freighter's
  radio Baldino names what Twinsun still needs: five stations, a friend at each to set the band. Doran flies Twinsen
  and Tessa to Zeelich Spaceport → `network`.
- Recovery: a spill resets the rig in 3 s. No limit on tries.
- Save: as listed. Accept: the test can't be "won" by toggling every switch (that spills a neighbour); a reload
  mid-test restarts the test, keeping the parts fitted.

### 4.4 The return: network, the Wound, the core, home

**NW-1 · Bands** (network adapted) — +10 min over today's chapter
- Pre: `bl_n6`. People: Baldino, Tessa (workshop and one station), the five friends. Where: as ch. 10 today.
- Change:
  1. Baldino's briefing becomes a two-hander. Tessa: "Your relays shout. Mine listen." The relays now carry a float
     regulator.
  2. After each station's existing task the friend reads the local signal (Mira the gauge, Arthur the needle, Oku the
     sail's speed, Ilka the steam, Pim the mirror) and Twinsen sets the band.
  3. A wrong band lights amber, and a neighbouring friend complains by radio ("Mill here, she's racing!"). Retune;
     no fail.
  4. Fix B-1: Zoé and Arthur stand beside the cabinet, clear of the dial bank and the stairs (GATE_REPORT).
  5. `vm_3` at the start (Baldino: "He's bypassed the last throttle. We're back to the wire.").
- States: `c10_band_mill|valves|light|bore|dome`. Pulse tool and hop-pack unchanged (still this chapter).
- Accept: tests/chapter10 gains a people-aware reach check for every dial and band spot; segment 13 passes
  unmodified.

**NW-2 · Local Override** (Zoé's decision; the roll call) — Min 6
- At the lighthouse station, Baldino (radio) proposes a master key at the platform console "to keep it simple".
- Zoé decides against it: every station keeps the right to refuse a central command. "He sent the regulator back
  for exactly this reason." Baldino agrees, grumbling.
- Zoé relays Vesk's trial note and standing order to the council over the lighthouse link. Amaru: "Then it wasn't a
  mistake. It was a decision." The council sends its guards to the platform.
- At the platform, the roll call uses Arthur's call signs and the say-back ("Mains, holding." "Heard: mains
  holding."), then the blast doors open.
- States: `c10_override`, `c10_council2`, `c10_roll`. Accept: the call signs match BR-3. The council's guards in
  ch. 16 now have a cause the player saw.

**UR-1 · The Wound** (second underground passage, in `shell`) — Min 25 — W-6
- Pre: `c3_started`. Where: shaft bottom → `uw_breach`, `uw_lake2`, `uw_channels2`, `uw_wound` → `c3deep`.
- Actions:
  1. The shaft's tunnel to the deep installation is caved in by the drilling surge, and a breach opens into the outer
     layers.
  2. Familiar places are changed: the lake low and hot, a channel moved, the layers darker.
  3. His three gauges are now beacons. Each shows steady, stressed or dead, and following the steady ones is the safe
     way.
  4. Two linked channel pairs must be set to local bands (the N6 rule) to calm the passage. Forcing one shut throws
     rubble across the path (recoverable).
  5. The Wound itself (C, fragile grandeur): a second, larger glimpse.
  6. Sendell's light is weak. "Many small hands. That I can hold with." Then a lever on the far side clears the cave-in
     for the way back.
- States: `ur_breach`, `ur_beacon1..3`, `ur_band1..2`, `ur_glimpse`, `ur_done`.
- Recovery: rubble resets at its band; falls to safe spots. Accept: the existing deep installation, galleries and
  Sendell's room play as before after `ur_done`. Walking back up works.

**CORE-1 · The Core, Enriched** — +6 min
- Each pylon gets a stress lamp. Through the core floor she stirs (a glimpse), and the stress moves between pylons.
  Twinsen converts or tunes the pylon whose lamp is red. Hitting a green one pushes stress to its neighbour, which
  turns red (recoverable, never a fail).
- The allies answer in the protocol ("Lighthouse, signal out." "Heard."), the three today plus Ilka and Pim for
  their stations.
- Vesk tries central command first ("All stations, central: full feed."). One by one the friends refuse ("Local
  override. Heard, and no."), Zoé's decision paying off. Then the overload, as today.
- The coil carries a brass plate: BALANCE WORKS · COIL 4 OF 6.
- Vesk: "You went shopping on Ballastra? I did my shopping years ago." Unrepentant, arrested as now.
- States: `c3_stress` (per-pylon numbers kept in memory; flags only for converted pylons as now), `c3_central`.
- Accept: the fight is not harder in total HP terms. The coil stays three hits. Vesk's last lines unchanged in
  meaning.

**EP-1 · Home, Changed** — Min 15
- Dinner as now; then a short guided walk (optional to follow) before Keep Exploring:
  - heat posts lit again, each with a small local switch; the harbour row lit, Zoé's board all green;
  - Bram's pump in use anyway;
  - Arthur and Pim on the radio, saying it back for fun;
  - the B-7 housing on the station's wall, labelled RETURNED, AT LAST;
  - a letter from Ballastra: Wenna sent beans, Mags' row dry, Oren seen at the Speaking Steps, not invited, not sent
    away.
- New lines everywhere reflect the optional stories done.
- States: `ep_walk`, `ep_letter`. Accept: no sequel tease; the end card text adds one sentence about the stations'
  local switches.

### 4.5 Optional stories (brief §12)

**OP-1 · Missing Deliveries** (`md_`) — Min 25
- Window: from `c8_pippa` until `network` ends, and postgame (outcome kept). People: Pippa, Mira, Tim, Lulu, Odile.
  Where: Citadel harbour, the baggage-claim building, the depot shelter.
- Actions:
  1. The depot shelter is short of blankets and casks; Pippa's second cart never arrived.
  2. Compare labels: Pippa's chalk SHELTER against the project's stencilled STATION on crates at the cargo lift.
     Odile's ledger shows the reroute.
  3. Open the baggage claim's back store by its old conveyor lever.
  4. The stalled cart sits on the harbour's cargo lift (the opening's lift). Lower it to the path side with the
     lift's control.
  5. Tim and Lulu push it to the shelter.
- States: `md_start`, `md_labels`, `md_store`, `md_lift`, `md_done`.
- Recovery: the lift can be moved back and forth.
- Consequence: the shelter doorway visibly stocked; the baggage claim's back passage stays open (a shortcut from the
  harbour path to the square).
- Reward: a clover, and Pippa's half-price darts.
- Accept: works whether or not The Shipment was done (Odile's lines vary).

**OP-2 · The Last Shift** (`ls_`) — Min 30
- Window: from `th_throttled` until `network` ends, and postgame. People: Tavo (the recurring Zeelich worker), Mr
  Pelleck, two crew, a project foreman (not an enemy). Where: the Zeelich depot's production hall (W-8c `zdepothall`).
- Actions:
  1. Throttled, the hall has power for one and a half lines. The foreman wants the drill-parts press (Vesk's
     priority); the crew wants the heat-cell line that warms the burrows and the west end, never connected
     ("next quarter").
  2. Identify the essential line from the order boards and Pelleck's books.
  3. Isolate the press: its guard is broken; ball its high switch, or cut its belt.
  4. Reroute at the switchboard.
  5. Defend Tavo's belt repair for 60 s against two project drones sent to restore priority.
- States: `ls_start`, `ls_line`, `ls_press`, `ls_power`, `ls_done`.
- Recovery: defeat → retry from the switchboard, with power settings kept.
- Consequence: cells replace Grumm's braziers; the west end's CONNECTION NEXT QUARTER sign comes down in the
  epilogue; the crew builds a hoist at the old mill, a shorter climb at the network's mill station.
- Reward: five crystal cells for the laser pistol, 10 kashes.
- Accept: the mill station is completable without the hoist.

**OP-3 · Yorna's Map** (`ym_`) — Min 25
- Window: from `c7_done` (whenever on the Hamalayi) through postgame. People: Yorna, Pim. Where: the Hamalayi between
  the foothills and the monastery.
- Actions:
  1. Compare three landmarks on Yorna's forty-year-old map with the land now: the falls melted into a gully, Ram's
     Horn rock fallen, the shepherds' store under new snow.
  2. Find the store and dig it out with the ch.-5 shovel (an introduced tool).
  3. Pim plants kite-cloth flags at three posts once Twinsen clears their ice (sword or ball).
- States: `ym_start`, `ym_mark1..3`, `ym_store`, `ym_route`, `ym_done`.
- Recovery: nothing lost; marks persist.
- Consequence: a marked shortcut from the foothills to the monastery (skips the winch on revisits, network's dome
  station included); the monastery's shelf stocked.
- Reward: the store's contents (a heart, a clover, blankets for the monastery).
- Accept: no dependence for the dome station; the shovel is in his inventory from ch. 5 on (verify; if not kept,
  Yorna lends hers).

**OP-4 · Arthur's Boat** (`ab_`) — Min 20
- Window: from `th_protocol`, when on Citadel, through postgame. People: Arthur, Pim (radio). Where: the garden pond,
  the bay by the pier.
- Actions:
  1. Arthur's model has a lamp mast that blinks back. They test steering by signals in the bay.
  2. The boat drifts and snags under the pier: watch the current, then free the line with the ball from the pier end.
  3. Correct the failed test: Arthur's lamp code had no "say it back". Pim suggests it, Arthur adds it.
  4. Second run: the boat answers each signal.
- States: `ab_start`, `ab_snag`, `ab_fixed`, `ab_done`.
- Recovery: a missed throw only leaves the boat where it is.
- Consequence: a family moment on the pier; in the epilogue Arthur beats Lulu's boat; at the network's lighthouse
  station Arthur confirms by lamp as well as by voice (flavour).
- Reward: a clover from Arthur's tin.
- Accept: no new rule here that the main path needs.

**OP-5 · The Silent Bell** (`sb_`) — Min 25
- Window: from `bl_n3` through postgame. People: Mags, Tessa, Tib, Quill. Where: the arch shoulder's flood bell (W-2).
- Actions:
  1. Find why it's silent: the committee minutes on the notice board say "rings for everything". Quill's permit
     (bureaucracy) is needed to untie it.
  2. Test its reach with one ring: the upper terrace reacts, the lower row doesn't (the horn faces up).
  3. Turn one of its three horns toward the lower row.
  4. Set the cam wheel to separate the signals: one tone for "rising", two for "leave the walkways".
- States: `sb_start`, `sb_permit`, `sb_test`, `sb_horn`, `sb_split`, `sb_done`.
- Recovery: every setting can be changed back.
- Consequence: residents clear walkways during N5's return and N6's disturbance (more time); the bell rings
  correctly in postgame.
- Reward: Quill waives the departure weighing fee (a running joke), 10 kashes from the committee box.
- Accept: N6 is completable without it.

**OP-6 · Dallan's Debt** (`k_dallan*`, inside `kesh.js`) — Min 10
- Window: `network`, when on Desert Island, through postgame. People: Dallan, Lumi. Where: Kesh, the research post's
  store.
- Actions:
  1. Lumi's loom shade tore when the vent blew. Twinsen asks her what she actually needs.
  2. He tells Dallan, who unlocks the post's store and carries the canvas and poles himself.
  3. Twinsen hooks the sail's high ring with the ball.
- Turn: action over confession. Lumi: "The sail's straight. That's something."
- Consequence: the shade back; Dallan's later lines change slightly.
- Accept: no apology speech; Lumi is not won over.

### 4.6 Deepening additions (chapters 1–9)

Short cards: pre and place, actions, flags, recovery or consequence, minutes.

- **DP-1 · The Barge Crate** (ch. 1, ~2): after the opening, the crate on the quay carries a W-8a stencil, BALANCE
  WORKS · BALLASTRA · CERAMIC. Look, and Xil: "Project parts. They come, and some go back." `pr_crate`. Optional;
  a seed only.
- **DP-2a · Turn It Up** (ch. 2, ~4): inside Vesk's tour (before `c1_tour` ends), Vesk lets Twinsen open the feed
  wheel for the harbour row. The posts outside light, and at home Zoé's board turns from red to green. He uses the
  infrastructure before learning what it feeds. `c1_feedUp`. Pays off at BR-3, the same kind of wheel turned down.
- **DP-2b · Back They Go** (ch. 2, ~1): a crate in the station yard, REJECTED · RETURN TO SENDER. Vesk: "Ceramic
  regulators from Ballastra. Very clever, and they argue with the control room." `c1_crateSeen`. Optional; a seed.
- **DP-3a · Under the Depot** (ch. 3, ~8): an alternate route to the depot locker. Old Grumm's burrow hatch is warped
  shut; a kick frees it. He asks Twinsen to see why the burrow is warm. Through the moles' tunnel past the bore's
  warm seep, up into the depot from below, skipping the drone yard. `c2_burrow`. Either route works. Grumm's
  braziers in BR-3 and his ch.-9 lines remember it.
- **DP-3b · Pelleck's Books** (ch. 3, ~3): in the depot office the connection book stamps the west end "next quarter"
  three quarters running, while the drill-parts line has "priority". A witnessed contradiction before trust breaks.
  `c2_books`.
- **DP-4 · Ilka's Stakes** (ch. 4, ~10): Ilka's three heat stakes (oasis, dune, post fence), found along Hesk's flags.
  Each storm cycle the post raises test-bore pressure: the oasis stake falls as the dune stake rises. "Push here, it
  comes out there." `c4_stake1..3`, `c4_stakes`. Guided but optional; SV-2 recalls it in one line if set.
- **DP-5a · Sani's Way In** (ch. 5, ~5): an alternate entry to the condenser hall through a blockhouse vent Sani knows.
  The ball knocks its flap open. Fewer troopers, a darker crawl. `c5_saniVent`. Either way works.
- **DP-5b · Dallan's Water** (ch. 5, ~4, plus ~2 for the stake payoff): after the vent, stranded Dallan has to ask Kesh
  for water. Twinsen can carry Tarra's jar to him or let him ask himself (lines only). `c5_dallanWater`,
  `c5_vouched`, which colours ch. 9's and OP-6's lines. If DP-4 was done, the oasis stake now reads high.
- **DP-6a · Across the Gorge** (ch. 6, ~12): the escort the bible promised. Tashi, Dawa and Old Norbu cross after the
  tree bridge. A second crossing on an ice bridge raised by the ball; ice mites target Twinsen only. Villagers wait
  when threatened, and never die. `c6_escort`.
- **DP-6b · Pim's Set** (ch. 6, ~4): at the monastery Pim's scrap radio reaches Arthur. They talk over each other.
  Pim: "You have to say 'over'." `c6_radio`. Seeds BR-3.
- **DP-7a · Two Suns** (ch. 7, ~10): the mirror array's second stage. The dome's shutter chooses which sun feeds the
  array, and the route changes with the source. `c7_sun2`.
- **DP-7b · The Shrine's Walls** (ch. 7, ~5): Sefa shows three murals: Sendell holding the shell; the vents; many
  small lights holding together. A quiet scene. `c7_walls`.
- **DP-7c · The Melt Race** (ch. 7, ~8): after the drone, cross the glacier basin as melt channels open on readable
  cycles to reach the vent's lever. The ice cap reforms if he falls (back at the basin's edge). `c7_race`.
- **DP-8a · Shelter in Place** (ch. 8, ~12, Zoé playable):
  1. The station broadcasts "Unlisted residents: shelter in place; supplies at the square." The square is fenced, so
     the supplies sit useless.
  2. Granny Ume (an existing walker) needs her tonic from the closed pharmacy.
  3. Zoé uses her register to mark three doors with chalk (water, medicine, help moving), and she gets the
     pharmacist's key.
  4. She sends Tim, Lulu and Bram where the marks say.
  `c8_sip1..3`, `c8_sipDone`. Then the farms run as now. Covers brief §11 (Zoé's shelter-supply test) and the
  "help one excluded resident when the evacuation plan bites" beat.
- **DP-8b · The Asylum Way** (ch. 8, ~6): FunFrock's asylum cellar tunnel leads into the station yard behind the
  crowd-control squad, so the lever can be pulled by stealth instead of the yard fight. From the tunnel's grille,
  the BALANCE WORKS crate in the project store. `c8_asylumWay`.
- **DP-9a · The Hearing** (ch. 9, ~8): each councillor's objection is answered with a piece of evidence Twinsen
  carries:
  - Brum's cold: Pelleck's books, if seen, or the bakery's heat;
  - Sela's charts: the plans' margin;
  - Amaru's proof: Dallan's arrival.
  A wrong item gets a dry rebuff, and he can try again. `c9_ev1..3`.
- **DP-9b · Who Has Heat** (ch. 9, ~5): on the street Old Grumm and Brum's constituents argue. The council house is
  warm and the burrows never were. Brum's ch.-10 line remembers it. `c9_grumm`.
- **DP-9c · SUPPLIERS** (ch. 9, ~3): the archive's fourth cabinet holds a receipt: "Balance Works, Ballastra: trial
  regulator B-7, Citadel station. Returned." `c9_ledger`. Clue for BR-4 (redundant).

Card count: 4 bridge + 3 survey + 6 Ballastra + 5 return/home + 6 optional + 18 deepening = **42**.

---

## 5. Cast

### 5.1 Ballastra (all [new]; compact canal dwellers unless noted, D4)

| Name | Role | Wants / avoids | Quests | Line |
|---|---|---|---|---|
| **Tessa** | float mechanic, Float Harbor | working things, testable promises / owning someone's grand plan | N1, N2, N3, N5, N6, OP-5, network, (epilogue letter) | "Show me it repeats, then we'll talk." |
| **Oren** (D9: taller, upper-district coat, keeps from the water) | the old system's designer | his work understood / the people it harmed | N3, N5, N6, letter | "I drew the safeguards. Other people decided which ones to keep." |
| **Hobb** | dock worker, some days at Fennick's | the harbour moving | N1, N4 | "Four days stuck halfway. Halfway's the worst place to be stuck." |
| **Wenna** | grower, Water Gardens | this week's water | N2, N6, letter | "My beans don't care about history." |
| **Corvin** | kiln owner (glazes the floats) | a steady wheel / asking where it comes from | N2, N6 | "I never asked where the steady came from." |
| **Mags** | lower-row representative | dry doorsteps, a voice / being thanked instead of heard | N3, N6, OP-5 | "When the upper gates shut, our doorsteps went under. Every time." |
| **Quill** | harbourmaster, weighs visitors | correct forms / exceptions | arrival, OP-5 | "Visitors are weighed. The lift has opinions about ballast." |
| **Fennick** | contractor, Fennick & Daughters | orders filled / being lied to | N4 | "I fill orders. I don't read them out loud." |
| Tib (Wenna's son), Dunn (old lower-row resident), Ferro (boat owner) | small parts | — | N1, N3, N6, OP-5 | — |

Physical history instead of a lecture: brass PRIORITY plates, the chained spill gate with its seal, water lines on
lower-row walls, the keepers still shutting gates toward the lower side, and Oren's signature in the allocation log.
Residents disagree: Corvin thinks the old system "kept things tidy"; Mags doesn't.

### 5.2 Twinsun cast, deepened through actions

- **Twinsen** [canon/approved]: practical; asks concrete questions (to Tessa, "What breaks first?"); helps Dunn's
  door while the shell cracks.
- **Zoé** [approved]: DP-8a (a local answer to a failed central order), BR-4 (playable discovery: register,
  receipt, crate; and the decision to take it), NW-2 (the decision on local override; relays the evidence that gets
  Vesk arrested). She stays on Twinsun (see §9 Q2).
- **Arthur** [approved]: overloads the radio in BR-3 and owns the mistake (no blame), invents the call signs, runs
  the hub. OP-4 is his boat. "Station ready" in ch. 14 and the roll call make the coordination his, not a destiny.
- **Pim** [approved]: brings his grandmother's mountain rule (say it back), DP-6b, OP-3, holds the mirror in ch. 14.
- **Baldino** [canon/approved]: his bench model fails (BR-2) and he says so; after Ballastra he combines his relays
  with Tessa's float. Calibration and heat matter in NW-1. He is never made foolish.
- **Vesk** [approved]: DP-2b (the throwaway line), BR-3 (his broadcast), the trial note (BR-4), the standing order
  (N4), the bypasses (`vm_1..3`), the central command and coil (CORE-1). He knew, chose control, and is arrested
  unrepentant. Never on Ballastra.
- **Sendell** [canon]: D7 only (light in the layers, voice), weaker each visit; she shows the way but cannot carry
  him; she accepts "many small hands". Never evil.
- **Dallan** [approved]: DP-5b, ch. 9 as now, ch. 14 at the bore, OP-6: useful action, no warmth on demand.
- **Mira, Oku, Ilka, Yorna, Gilbert, Pippa, Bram, Grumm, Snuff, Tavo, Pelleck**: reused as the throttle's and the
  side stories' people. No new quest-givers on Twinsun.

### 5.3 Character knowledge timeline (who knows what, from when)

| Fact | Vesk | Zoé | Twinsen | Baldino | Council | Tessa / Oren | Mags et al. |
|---|---|---|---|---|---|---|---|
| A Ballastra regulator worked in trial | 2 years ago | BR-4 | BR-4 (radio, then at home) | BR-4 end (Zoé radios) | NW-2 | always (Tessa mended it) / Oren: N3 | — |
| It was rejected for local override | wrote it | BR-4 | BR-4 | BR-4 end | NW-2 | Tessa: N1 (the chalk); Oren: N3 | — |
| The shell's stress moves between points | suspects (his readings) | SV-3 (radio) | SV-2 | SV-3 | NW-2 | N1 (tapes) | — |
| The throttle buys about a fortnight | BR-3 (fights it) | BR-3 | BR-1 | BR-1 | BR-1 | N1 (Twinsen) | — |
| Vesk buys coils, not regulators | his order | NW-1 | N4 | N3 end (`vm_2`, guessed), N4 (radio) | NW-2 | N4 (Fennick tells Tessa) | — |
| The old spill gate was chained shut on purpose | — | — | N3 | — | — | Oren always; Tessa N3 | always (lived it) |
| Each station keeps a local override | learns in the core | decides NW-2 | NW-2 | NW-2 | NW-2 | Tessa NW-1 | — |

Before these points nobody mentions them. Afterwards the lines show it (e.g. Arthur pokes the B-7 from BR-4; Hobb
waves at the freight shortcut after N4; Snuff's hearth lines from BR-3 until the epilogue).

---

## 6. Saves

**Format 6** (`main.js` `SAVE_VERSION = 6`). The storage key stays; the v5 save is kept untouched beside the migrated
one (existing practice), so an older build can still load its own copy.

New flag families (all plain booleans or small integers in `flags`):
- `exp` (1 = expanded campaign) and `exp_base` (1 = legacy campaign, see below);
- `vm_1`, `vm_2`, `vm_3`;
- `th_*`, `sv_*`, `bl_*` (N1–N6, the lift and water positions), `ur_*`;
- `c10_band_*`, `c10_override`, `c10_council2`, `c10_roll`;
- `c3_central`, `ep_walk`, `ep_letter`;
- the deepening flags listed in §4.6;
- optional families `md_`, `ls_`, `ym_`, `ab_`, `sb_`, `k_dallan*`.

New items: `order`, `gauges`, `b7`, `assembly`, `records`, `balance`, `float`.

**Migration v5 → v6**
1. `flags.chapter` is recomputed from `chapterKey` against the new ORDER (as v4→v5 did).
2. **Pre-insertion saves** (`chapterKey` ∈ well … council): `exp = 1`; play continues and reaches `throttle` after
   the vote. Deepening in chapters already passed simply didn't happen. Nothing later depends on it (seeds are
   redundant: BR-4 has four sources and needs only the receipt *or* the order's copy). Optional stories whose window
   is still open become available.
3. **Mid-network, shell, core and completed saves** (`chapterKey` ∈ network, shell, core, home): `exp_base = 1`. They
   continue exactly as the base game (no bands, no Wound, base core, base epilogue, no Ballastra route). The Nera
   journey is never presented as happening after Vesk's arrest. Completed saves keep their postgame.
   - The Load menu offers, for such a slot, **"Expanded campaign: start at chapter 10"**. It writes a *new* slot
     (asks for an empty one, or confirms an overwrite of a slot the player picks; never the source).
   - The new save: every flag up to `council` kept; `c10_*`, `c3_*`, `ep_*`, `ur_*`, the hop-pack and pulse tool
     removed; `chapterKey = 'throttle'`, `exp = 1`; room `council`; magic levels set to the ch.-9 table value; hero
     HP, money and arms kept.
4. **Mid-puzzle states in new chapters** load from flags: lift, counterweight, canal, pools, valves and bands use
   instant setters. Zoé's BR-4 run, the BR-3 try, an N4 detection and an N6 test restart at their start (as
   `c8_zoeStart` does). Rewards are owed until picked up.
5. Unknown future keys: if a v6 save names a key the build lacks, the loader falls back to the last known chapter
   before it and logs it (a guard for branch builds).

Tests (cloud): `save-migration` gains cases for each of the three classes (a council-before-vote save, a network save,
a completed save), the chapter-start option, a reload at every new state family, and no duplicate rewards.

---

## 7. The world orders

W-2 … W-8 are written in `EXPANSION_WORLD_SPEC.md` (marked "Draft, the coordinator reviews"), in W-1's style, with the
handles each card above uses. One note on W-1 for the builder: N1 lets the player retry, so `crane.reset(instant)`
is wanted beside `crane.release` (recorded in W-2's header so W-1 isn't reopened).

---

## 8. Implementation order (cloud batches)

Each batch ends playable from a real save, with its tests, a bot route and a timing note (bot floor + estimate).

| # | Batch | Needs from the world | Contents |
|---|---|---|---|
| 0 | Gate fixes (base) | — | B-1 (lighthouse spots), T-1 (harness), the no-night line cleanup (§9 C4), chain rerun |
| 1 | Foundation | — | ORDER/NUMBER/keys behind the expansion branch; save v6, migration, chapter-start option; empty chapter shells that pass straight through; tests |
| 2 | The slice: arrival + N1 | **W-1 accepted** | the spaceship route, Quill, Tessa, N1; dev chapter-start into `ballastra` |
| 3 | Deepening I (ch. 3–7) | small props from W-8c only where noted | DP-3a/b, DP-4, DP-5a/b, DP-6a/b, DP-7a/b/c (mostly existing geometry; can run while W-2+ is built) |
| 4 | The bridge | **W-8a** | BR-1…4, the throttle's costs, `vm_` scaffolding |
| 5 | The survey | **W-5** (+ W-8a well hooks) | SV-1…3 |
| 6 | Ballastra I | **W-2, W-3, W-7** (Oren after his rig contract) | N2, N3, OP-5 |
| 7 | Ballastra II | **W-4**, W-3's test rig | N4, N5, N6, the return flight |
| 8 | Network adapted | **W-8b** | NW-1, NW-2, Tessa on Zeelich |
| 9 | The Wound + core | **W-6**, W-8b core lamps | UR-1, CORE-1 |
| 10 | Deepening II (ch. 1–2, 8–9) + seeds | W-8a stencils/crate | DP-1, DP-2a/b, DP-8a/b, DP-9a/b/c |
| 11 | Optional stories | **W-8c**, W-2 bell | OP-1…4, OP-6 |
| 12 | Homecoming, postgame | W-8b | EP-1, Ballastra postgame, all NPC aftermath lines |
| 13 | Full regression | — | chain 01→N unmodified, skip-all-optional run, all-optional run, migration, timing table vs §3 |

Clarity editor: essential clues (the chronology line, the say-back form, the receipt text, the trial note, the
standing order, the band rule) are listed in each card and must survive text cleanup word for word in meaning.

---

## 9. Risks, conflicts and open questions

### Open questions for the user (genuine story forks)
1. **The shaft's planet.** In the built game Vesk goes down a shaft on *Zeelich's* drill platform into the shell
   under *Twinsun* (Baldino on Zeelich even says "our planet"). With "planets distinct, spacecraft only", should the
   expansion:
   - (a) leave it as is;
   - (b) say plainly that the bore's head and its shell are Zeelich's own and Sendell guards both worlds' shells.
     This is a canon question, not recommended;
   - (c) move the shaft's top to Citadel's station (the fort that "drills"), with chapter 3's ending changed so Vesk
     flies home and seals it there.
   The plan works with (a) or (c). (c) makes the first visit (Citadel's well) and the second (the shaft) one place.
2. **Does Zoé travel to Ballastra?** Default: no. She leads on Twinsun (DP-8a, BR-4, NW-2) and Tessa is the
   Ballastra partner. Alternative: she comes, and N3/N4 become hers to lead.
3. **Oren at the end.** Default: he stays on Ballastra, repairing the lower row, tolerated, not forgiven. Alternative:
   he comes to Twinsun to help fit the stations (more redemption, less of the brief's caution).

### Conflicts between the brief and the game as built
- **C1 · Shaft on Zeelich into Twinsun's shell**: above, Q1.
- **C2 · Five pylons vs three.** The brief's appendix and the bible say five core pylons; the game has three (Zoé,
  Mira, Oku). Plan: keep three pylons (no rebuild of the core). Ilka and Pim answer by radio in the roll call, so all
  five stations are heard.
- **C3 · Zoé's archive comparison "in ch. 8–9".** In ch. 9 Zoé is on Citadel. Plan: ch. 9 gives the receipt (DP-9c);
  her playable comparison opens the bridge (BR-4).
- **C4 · Earth-style night in text.**
  - `common.js`: Spheros, Magus and Mosquibee lines say "hums at night";
  - `ch2.js` `c2_nara_2`: "day and night … until morning";
  - `ch2.js` `c2_radio_freq`: "what keeps watch at night" (the star dial's riddle);
  - `ch5.js` `c5_narr`: "That evening".
  These need rewording in batch 0 (the star riddle needs care: the dials' answer must not change).
- **C5 · The gate isn't passed** (B-1, T-1, laptop performance, human visual review). The brief forbids campaign
  changes until it is. Batch 0 is the base game's.
- **C6 · Bible out of date**: chapters 9–10 shown "to build", five pylons, and "Dalan"/"Dallan" (code says Dallan).
- **C7 · Spaceport boards** say ZEELICH SPACEPORT only. Ballastra adds a destination at Citadel Spaceport from ch.
  12 (expanded campaign only).
- **C8 · Hop-pack and pulse tool** stay at the network chapter (now 14), so Ballastra and the survey are designed
  without them. Postgame Ballastra with the hop-pack must not break water puzzles (they're finished by then; check
  the hop-pack's "no lift over water" rule on floats).
- **C9 · The ferry is idle in ch. 10–13** (throttle cost). Desert Island stays reachable by Hesk's glider (open since
  ch. 8). Nothing on that path needs the ferry.

### Risks
- **Time estimates are unvalidated.** The plan aims at the centre of §3. Each batch reports bot floor + estimate, and
  real first-time timings must come from people.
- **The user plays ch. 1–2.** Changes there are seeds and one step inside Vesk's tour (DP-2a). They should be shown as
  a small, labelled change in the next ch. 1–2 build.
- **Laptop budget for four Ballastra regions and two underground sets**: lazy groups, measured per W-order.
- **Water-puzzle saves**: everything flag-driven with instant setters; reload tests at every state family.


---

## Coordinator review (1.11.2026, night)

- **Accepted as the working plan.** Coding starts with batch 0, the gate fixes (B-1, T-1; GATE-FIX is running), and
  waits on W-1.
- **W-1:** `crane.reset(instant)` is added to its handles. `src/game/expworld/` is the builder's for W-8
  (LOCAL_EXPANSION_PROMPT.md §4).
- **Defaults until the user says otherwise:**
  - Q2: Zoé stays on Twinsun and leads there; Tessa is the partner on Ballastra.
  - Q3: Oren stays on Ballastra, tolerated but not forgiven.
- **Q1 (the shaft from Zeelich into Twinsun's shell):** it touches the user's rule that the planets are separate.
  - It goes to the user, phrased without spoilers.
  - Until then: no change to chapter 3, and the expansion's underground is reached from Citadel.
- **Night words in the text** ("at night", "evening"): to fix in the base game (a text pass), keeping the dial riddle's
  answer.
- **STORY_BIBLE.md** (chapters 9–10 "to build", five pylons, Dalan/Dallan) is being updated by GATE-FIX.
