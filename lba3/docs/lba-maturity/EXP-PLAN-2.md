# EXP-PLAN-2 · The expansion re-planned against today's game (17.11.2026)

**Team-only. Spoilers for the whole game.** The coordinator shows the user chapters 1–2 only: nothing in this file, and
no picture of chapters 9–16 or of Ballastra (`docs/future/world/W-*`, any capture a test of these chapters writes), goes
to the user. Supersedes `docs/future/EXPANSION_PLAN.md` §2–§8 and Revision R1 where they disagree (that plan was written
against game 0.48 on 1–2.11; the campaign has had waves 1–7, OPENING-TUT-2, U-1…U-5, CITADEL-ORIG-2 since). Everything
not contradicted here (the cards' detail, the cast, Oren's rules of reach R1.4) still stands as reference.

Labels: **Played** (a person), **Automated runtime** (a test drove it), **Source only**, **Not implemented**.

## 1. What exists after EXP-1's merge (commit `bda5ac2d` and after, on top of `fb4443e7`)

| Part | State | Evidence |
|---|---|---|
| Expanded campaign framework: `ORDER` with four keys between `council` and `network`, `EXP_KEYS`, `exp` / `exp_base`, display numbers by campaign, `ChapterShell` pass-through, save format 6, Load menu's "Expanded campaign: start at chapter 10" (`expandedStart`) | merged, live | save-migration (Automated runtime) |
| Chapter 10 `throttle` "Borrowed Time" | **built** (EXP-1, §3.1) | `tests/exp-throttle.mjs`, playthrough 12b (Automated runtime) |
| Chapter 11 `ballastra` "Ballastra" | **built** (EXP-2, §3.2) | `tests/exp-ballastra.mjs` (Automated runtime) |
| Chapters 12 `balances`, 13 `survey` | empty shells: the story passes straight through | `Story.nextIndex` |
| W-1 Float Harbor + Tessa's shed, W-2 Arch District + 3 rooms, W-3 Water Gardens + tunnel + kiln | merged; built **on demand only** (regions.js groups `ballastra`, `bl_arches`, `bl_gardens`); unreachable in play (no chapter or travel stop goes there yet) | ballastra-harbor / -arches / -gardens (Automated runtime) |
| The Ballastra cast's models (tessa, docker1–3: 3.4 MB) | not preloaded (`characters.js ONDEMAND_POLYS`, `loadPolys()` before a chapter builds them) | Source only |
| OG-2 "The Fenced Square" (survey.js), OG-6 "Coils and Consent" (coils.js), NW-1 "Bands" (bands.js), their text and tests | **parked** in `tools/expansion-parked/` (not loaded): built against the old chapter 10, they doubled the main game's CAMPAIGN-8 takeovers; re-wired by §3.4 and §4 | — |
| Oren's presence and the Balance Works governor (orenpresence.js), his voice (voice.js seed 1004), his tone (audio.js) | live (chapter 10) | exp-throttle |
| W-4 … W-12 | drafts only | `EXPANSION_WORLD_SPEC.md` |

Measured cost of the merge for a player who never reaches the expansion (perfbudget, Medium, SwiftShader, two runs of
the base `fb4443e7` and the merged tree back to back on the shared container; Automated runtime only): Citadel's street
149 → 149 draw calls (p95 197 → 196/197, shadow 22 → 22), the interior route 60/61 → 60/61, shader programs 86 → 86;
startup "total" 10.8 / 9.1 s → 9.9 / 9.4 s and page boot 80.9 / 84.3 s → 82.5 / 87.6 s (the container's noise is
larger than the difference; a small parse cost of the Ballastra modules is not ruled out). Chapter 10's shelter
branch: +12 main and +3 shadow draws where it stands (exp-throttle).

## 2. The order

```
9 council (main game: the vote, the stop, the isolator, Mill Lane)
10 throttle   "Borrowed Time"           Citadel (from Mill Lane)          BUILT (EXP-1)
11 ballastra  "Ballastra"               Float Harbor, Water Gardens, Arch District   BUILT (EXP-2)
12 balances   "The House of Balances"   the warehouse, the House, the test rig, the Low Terrace
13 survey     "Under the Well"          home: Citadel's square and well   (OG-2 parked, re-verify)
14 network    "Baldino's Network"       all regions (main game's wave 6, unchanged in the base campaign)
15 shell / 16 core / home               main game's wave 7 and the aftermath
```

`ORDER = [... 'council', 'throttle', 'ballastra', 'balances', 'survey', 'network', 'shell', 'core', 'home']`.

What changed from the old plan and why:
- **`survey` moves from 11 to 13.** Its old content (Twinsen's first underground visit by the well, gauges, Sendell's
  facets, "someone answers on an old line") is now taken by the main game: chapter 1 goes down the well, and chapter 11
  (wave 7) is exactly "a mechanism answers a pattern he did not send" (the treatment's section 8). Played before
  Ballastra it repeated chapter 1 and spoiled chapter 11. After Ballastra it is the way home: the town in the square
  under a condition set by Oren's grown reach (OG-2, built), and Sendell, from the well's cave, hearing the old line
  Twinsen now knows the other end of. The key stays (`survey`); no released save has it.
- **The bridge (`throttle`) no longer throttles feed stations.** The main game's chapter 9 already plays the stop and
  its cost (Mill Lane dry, Baldino's isolator holding one branch). BR-1…BR-3 would have doubled it. The chapter is now
  "the town on borrowed time while Baldino builds": the hammer in the mains, Oren's first help, and the B-7 found and
  fitted (§3.1).
- **Chapter 9's end stays as it is** ("a network! … Then let's call everybody"). The network's first line in the
  expanded campaign is `c10_narr_exp` ("Baldino's workshop again.") instead of "hours later".

Causal line through the four chapters (what makes each one necessary):
1. 10 → 11: the B-7 holds one shelter's branch with a hand lever; the network will need one at every station, and
   only Balance Works made them. The tag says Vesk rejected them *because* they let a station refuse his board. The
   crate's return label (to add with chapter 11: "TESSA'S FLOAT REPAIRS, FLOAT HARBOR") names who mended it. The council
   lends the project's idle freighter (Doran). Oren's voice said "Ballastra": the player wants to see who that was.
2. 11 → 12: N1–N3 (the harbour lift, the gardens' water shared not shut, Halden's chained spill gate) earn Tessa's
   bounded help and show the human layer of Ballastra (who was protected, who was not). `vm_2`: Vesk buys coils there.
3. 12 → 13: N4 (Vesk's standing order: buy every coil, no regulators) and N5–N6 (the House, the working test) give the
   regulators and Tessa; WK-1 (the Cradles, Jory and Wenna) shows what Oren's protection costs. Flying home, Oren's
   reach on Twinsun has grown with Vesk's coils.
4. 13 → 14: home, the square fenced under Oren's condition (OG-2) and Sendell's word; Baldino calls: the stations,
   now with regulators a friend can set by hand (the network as the main game plays it, §3.4).

## 3. The chapters

Estimates are first-play estimates by chapter-balance.md's formula (never a measurement). The band: the median core
chapter is ~22 min (chapter-balance.md's 15-hour ledger), so 16.7–27.9 min.

### 3.1 `throttle` — Borrowed Time (BUILT, EXP-1; prefixes `og_`, `th_`)
Starts where chapter 9 ends (Mill Lane, Zeelich). The player:
1. hears Mira on the lighthouse relay: since the stop nothing evens the kicks out; takes the ship home (a seen crossing);
2. in FunFrock's valve room reads the hammer and opens a wheel **in** the kick (in the rest it kicks back: the inverse of
   the campaign's "act in the rest", read from the same needles) ×3; the Balance Works governor rings and **Oren** holds
   the mains (helpful first: the treatment's section 8); Mira's wheel IV turns itself back ("Green holds");
3. at the fortress shelter: Gilbert's thanks, his washroom still shut; Zoé on the relay knows the plate's name;
4. **as Zoé** (her consequential choice) in the project office of chapter 2, by its door this time: the guard who never
   saw her; the register (crate 212/3, "returned"); 212/1 and 212/2 read; the stack's bottom crate turned to the wall
   (stop and think: the crate she needs is the one she cannot read); the B-7 and **Vesk's tag** ("It works. A station
   fitted with this can refuse the control room. Do not fit. Log as returned. V.": his decision, his hand); she walks it
   to the shelter;
5. **as Twinsen** at the shelter's branch: the flange opened with the feed on sprays him back (the wrong attempt);
   feed shut, B-7 fitted, feed opened; the band turned until the branch gauge reads green (the valve room's lesson,
   applied: weeping = too much, a trickle = too little);
6. Oren swings the lever shut ("That part has a lever."); a hand on it beats him (R1.4 rule 4); Gilbert takes it ("A
   hand gets tired. I do not.": the seed of the shelters' hush, OG-5);
7. Vesk on the wire gives his reason ("A station that can say no will say no, the first day the town is frightened");
   Zoé answers; Baldino calls; the ship to Zeelich; the next chapter.
- Changed on return: the B-7 stays on the shelter's branch with its lever open in every later chapter.
- World pieces: existing rooms only (Water Office, valve room, project office, the fortress shelter) + the branch prop
  (built on first reach in the expanded campaign; a base-game save never builds it).
- People: Mira, Gilbert, Tim, Lulu, Zoé (played and NPC), the project office's guard, Oren, Vesk (wire), Baldino (radio).
  No new speaker.
- Estimate: ~22 min first play (call and ship 2, office and valve room 5, Oren 2.5, Zoé 6, the branch 4, the end 2.5).
  Bot game time: from `exp-throttle.mjs` (Automated runtime only).
- Open: in the transitional campaign (11–13 shells) it is followed directly by the network, so the valve room comes
  twice in a row (different mechanics); Oren is not mentioned again until the Ballastra chapters exist.

### 3.2 `ballastra` — Ballastra (BUILT, EXP-2; prefix `bl_`; the plan as it was ordered, then as built)
N1 Wrong Dock (W-1: counterweight and level; the crane latch by ball; the boat), N2 The Missing Water (W-3: the two
gauges, the tunnel's unrecorded tap, share-don't-shut at the splitter: three gates, two set by ball across the channel),
N3 The Uninvited Engineer (W-2: Halden's plan against the pump room's machine, Dunn's silted door by sword and kick, the
chained spill gate: chain by sword, pawl by ball). OG-3's first look at the Low Terrace (the lift that runs down only)
as the chapter's last beat. ~25 min estimate (the old cards' 85 min is cut to the main path; N1's lift and N2's splitter
are the stop-and-think puzzles).
Needs: travel Citadel Spaceport ⇄ Ballastra pad (TRAVEL-1 film and cabin; travel.js stop from `ballastra` on, expanded
campaign only); `loadPolys()` before the cast is built; voices for Tessa, the dockers, Quill, Halden, Mags, Dunn, Wenna,
Corvin, Tib (voice.js, unique seeds); throttle's end-call variant for this chapter (Doran and the freighter); the B-7
crate's return label line. World: W-1–W-3 built; W-9 (the Low Terrace's edge only) missing.

**As built (EXP-2, 17.11; `story/ballastra.js`, `text/ballastra.js`, `text/he/ballastra.js`, `tests/exp-ballastra.mjs`).**
Chapter 10's end changes in the expanded campaign when this chapter follows: Baldino on the radio says a relay only
passes word along while the B-7 holds a station by hand; Zoé's return label (TESSA'S FLOAT REPAIRS · FLOAT HARBOR ·
BALLASTRA) is read; Twinsen remembers Oren said Ballastra; the council's freighter, Doran flies it. The player:
1. **Citadel Spaceport** (under the card): Doran by Vesk's idle freighter; Zoé and Arthur at home have a line each
   (optional). Talking to Doran is the boarding: the ship's film from Citadel Spaceport to Float Harbor's pad (the travel
   point `ballastra_port`, the planet's own backdrop and cabin colour). The cast's models are fetched here (loadPolys).
2. **Float Harbor** (W-1): Quill hails him on the quay ("Visitors are weighed"), weighs him on the cargo balance (the
   lift "has opinions about ballast"; optional humour that names the puzzle); the shed is locked, its chalk says AT THE
   LIFT. Tessa at the lift: one job first. **N1**: the crank moves the counterweight a notch (low → middle → high →
   middle …), the narrator reads the weight and the deck (high weight, low deck: Tessa: "backwards"); no notch alone
   lifts the boat. Hobb: crane B's load onto the counterweight, its latch up the jib for the ball (the latch sits on the
   mast: it is struck from the lift's side). The **wrong attempt**: struck with the weight high or low, the load lies on
   the walkway (shut: the shed's side cut off) and the deck stops halfway or jams; the crank to the middle seats it.
   Balanced: the boat sails, Ferro tosses 10 kashes, Hobb swings the pier bridge back, the district gate opens.
   Tessa and the label: she mended the B-7 for Balance Works and was told it was rejected; forty stations — she does
   not sign up for anyone's grand plan, but will build the box (a bounded job); it needs a glazed float (only Corvin's
   kiln glazes them) and Halden's numbers. (Her shed's drawings, optional: "B-8: no glaze in the lever", R1.4 rule 2.)
3. **The Arch District** (W-2, passed through): the lower row under water, Mags's hail; the terrace gate on.
4. **N2 The Water Gardens** (W-3): Wenna; the two gauges read (full above, dry below). The tunnel: a copper tap bodged
   onto the main takes everything into the kiln's leat before the splitter board. The **wrong attempt**: shut it with
   the old bypass seized and nothing reaches the gardens or the kiln, it all goes over into the sea; Corvin comes down
   the ladder ("I never asked where the steady came from"). The bypass gives to two blows (a kick in Aggressive, the
   fists or the sword). The board then shares by its gates (shut / half / open): gate 1 (the gardens) by its wheel in
   the tunnel; gates 2 (the kiln) and 3 (the sea) by their latches across the channel, by the ball (each blow drops the
   leaf a notch; from shut it springs back open). Every change says where the water goes (dry / a trickle / steady /
   strong / full). Shared only with the gardens open, the kiln half and the sea shut (gardens 2/3, kiln 1/3, the copper
   tap shut): the basins rise, the rafts recover (green on a later visit), Wenna's clover. Corvin by his wheel: slower,
   steady, he will glaze Tessa's float "off a recorded gate this time".
5. **N3** (W-2): Halden (bl_oren, the upper terrace) gives a copy of his old plan, not the regulator's numbers ("in the
   House of Balances; I don't go there"): a spill gate for the lower row drawn on it. The pump room: UPPER TERRACE ·
   PRIORITY plates; the plan against the machine: the gate chained under the council's seal. The wheel is held (the
   chain: "wants an edge"); the sword cuts it; the wheel then stops dead (a pawl high on the pier wall); the ball flips
   the pawl; the wheel opens the gate and the canal falls to balanced. **Oren** speaks from the glazed pumps (his tone,
   no prop): when the council would not open the gate they gave the row's young ones to him "to sleep, until the water
   settled. … Three hundred and four. They are still safe." (the Cradles, set up for chapter 12 without W-9). Dunn's door
   on the now-dry walkway: three blows on the silt, a kick; the lower row comes home (washing out, shutters open, the
   market's people back at their doors). Mags: "One open gate doesn't make Halden a neighbour."
6. **The Speaking Steps**: Tessa, Mags, Halden and Quill there; Tessa will draw the box; Doran's set: Baldino says
   someone on Ballastra buys every Balance Works coil for the project and no regulators (`vm_2`); "Come home". Back over
   the harbour to the freighter: Doran flies him home (the ship's film to Zeelich) and the next chapter begins (the
   network, chapter 14, while 12–13 are not written; to chapter 12 when it is: the end stays on Ballastra).
- The Low Terrace beat (OG-3's first look) is left for chapter 12 with W-9: the Arch District's notice board says the
  Low Terrace lift runs down only, by the keepers' order (optional read), and Oren's lines name the sleepers.
- People (all with lines by stage): Tessa, Quill, Hobb, Ferro, Wenna, Corvin, Halden, Mags, Dunn, Sorrel (a grower),
  Brin and Ottie (the lower row: on the market float while flooded, at their doors after), Nuna (tea); Doran; Oren
  (voice); Baldino (radio). Models: tessa, docker1–3 with DRESS-1's dresses (13 people on 4 bodies), on demand.
- Voices: `tessa`, `bl_quill` … `bl_nuna` (voice.js, seeds 1901–1913, from the Quetch and Grobo families with phrase
  banks); Doran's set is Doran's voice (`n_doranradio`).
- Saves: every step is a flag (`bl_`, listed in the module's head); a load sets each place from them (the lift and
  the crane, the shed's lock and the district gate, the gardens' tap, bypass, gates, channels, gauges, basins, rafts and
  kiln, the canal, the chain, the pawl, the gate, the silt, Dunn's door, the row). Owed rewards settle on a load.
  A save past this chapter keeps the places as they were left (the cast at their after-spots for a return visit).
- Travel: `ballastra_port` (Float Harbor's pad) ⇄ Citadel Spaceport and ⇄ Zeelich Spaceport by spaceship, in the
  expanded campaign once he has landed there; the holomap knows Ballastra's three areas.
- Not done: W-9 and the Low Terrace; Tib; OP-5 (the Silent Bell: the bell's handles are unused); the regulator itself
  (chapter 12, N5–N6).

### 3.3 `balances` — The House of Balances (prefix `bl_`, `wk_`)
N4 Vesk's Shipment (W-4 part A, the warehouse: stealth with a warning, the standing order), N5 The Filling House (W-4
part B: water levels as platforms, a small gate shown failing before the big one), N6 A Working Test (W-3's rig: three
basins, local ranges, the storm sluice: the finale's rule in miniature), and WK-1 Wake Jory (W-9, W-12: one safe local
waking against Oren's lock) in either order with N4–N6. ~27 min estimate (main path); WK-1's later steps optional.
World: W-4, W-9, W-10 (service passages), W-12 missing. Tessa joins for the fitting.

### 3.4 `survey` — Under the Well (the way home; prefixes `og2_`, `sv_`)
Home on Citadel: OG-2 The Fenced Square (built, parked: the square's gate opens on the queue's agreement; Bram's lever,
Granny Ume's tonic, Pico's bell latch; Oren holds the bolt) re-verified against today's Citadel (CITADEL-ORIG-2 moved
the harbour, residents' rounds changed), then the well's cave: Sendell hears the old line, her hope and her limits
(R1.7), her word to carry. Ends with Baldino's call → the network. ~20 min estimate.

### 3.5 The network, the shell, the core, the aftermath (main game kept)
- `network`: the main game's wave 6 in both campaigns (friends take the handle he holds; Irsa; Arthur's count). In the
  expanded campaign only, later: the regulator at each station — the friend sets its band from what they read as they
  take the handle (NW-1 folded into the takeover, not a second step); OG-6's coil swap only where it does not double
  Irsa's lane; `vm_3`. Never a second tour.
- `shell`, `core`: wave 7 kept. Oren's conflict is resolved separately from Vesk's (the treatment: "possession must not
  excuse Vesk's decisions"); FIN-1's coil and Sendell's "her own sleep, this time" only in the expanded campaign, after
  the base finale is proven unchanged.
- Aftermath: the kitchen (main game) first; the shelter's B-7 lever is the ordinary place that shows the change; an
  optional Ballastra visit (EP-BL) after the end card.

## 4. World pieces

| Piece | For | State |
|---|---|---|
| W-1 Float Harbor, Tessa's shed | 11 | built, accepted (4.11) |
| W-2 Arch District + Halden's house, Mags' house, the pump room | 11 | built, accepted (6–7.11) |
| W-3 Water Gardens + tunnel + Corvin's kiln + the test rig | 11, 12 | built, accepted (9.11) |
| W-4 warehouse, House of Balances | 12 | draft |
| W-5 the well's cave second visit | 13 | draft (small: the prologue's cave exists) |
| W-6 the Wound | 15 (expanded) | draft; may not be needed (wave 7's shell already plays the answering) |
| W-7 Oren's, the residents', the keepers' cast | 11–13 | draft (Tessa, dockers built) |
| W-8a the bridge's seeds | 10 | done differently: the B-7 branch prop (EXP-1) |
| W-8b network/core/homecoming parts | 14–16 | draft |
| W-9 Low Terrace, W-10 service passages, W-11 Register Room, W-12 Cradle Control | 11–12 | draft |

## 5. Saves

- `flags.chapterKey` is what a save stores; positions are redone on load. Format 6 (main.js `migrateSave`): a save in
  `well` … `council` plays the expanded campaign (`exp`); a save in `network`, `shell`, `core` or `home` goes on
  **exactly as before** as the base game (`exp_base`: the four keys are not in its campaign, its numbers stay 10–12,
  nothing new is set, nothing is paid twice). The Load menu offers such a save a fresh expanded start at chapter 10 in
  another slot (never written over it).
- Display numbers shift only in the expanded campaign (network 14, shell 15, core 16).
- Reordering `ballastra`/`balances`/`survey` is safe: no released build had them; an unknown key falls back to the last
  known key before it in the save's own `order`.
- New state only under its prefix (`og_`, `th_`; later `bl_`, `wk_`, `og2_`, `sv_`, `vm_n`); `EXP_START_DROP` in main.js
  lists the families a fresh expanded start removes. Old saves load with nothing made up (save-migration).
- Mid-chapter saves in `throttle`: the valve room keeps its bleeds; Zoé's part comes back as Zoé where she stood, her
  finds kept; the branch's feed, fitting, band and lever load from flags.

## 6. The 15-hour ledger

Main route (chapter-balance.md, after wave 7): ~277 min estimated. The expansion's main paths: 10 ~22 (built) + 11
~25 + 12 ~27 + 13 ~20 = **~94 min estimated** (all four inside the 16.7–27.9 band), about 6.2 h with the base. The rest
of the 15 hours is the optional content and the user's own pace; nothing claimed until measured. Each new chapter keeps
the anti-boredom checks (WORKPLAN-2026-11-09): no walk longer than the old one without something on it, no repeated
fight, no fetch without a person's reason, something new on return, inside the band.

## 7. Order of work

1. EXP-1 (this): merge, re-plan, chapter 10. **Done** (see the report; Automated runtime only).
2. **Done (EXP-2, 17.11; Automated runtime only: exp-ballastra 33/33):** chapter 11 `ballastra` (travel stop and film, the cast's voices and on-demand models, N1–N3 on the built
   places, throttle's end variant). Its test by input, Hebrew the same day.
3. EXP-3: W-4 (warehouse, House) with the laptop's art; then chapter 12 `balances` (N4–N6; WK-1 needs W-9/W-12).
4. EXP-4: chapter 13 `survey`: un-park OG-2, re-verify on today's Citadel, the well's scene.
5. EXP-5: the network's expanded additions (regulator bands in the takeovers), then the expanded finale's separate
   Oren resolution, each proven not to change the base campaign.
Chapter length changes go through chapter-balance.md (the coordinator).

## 8. Kept decisions

The user's decisions in status.md (long chapters not shortened; Retry with full health; no actions in the air; side
quests reward something new; the treatment; ~15 h without padding; no clutter; LBA1/LBA2 main buildings and entrances
kept), the playtest inbox P1–P45 fixes (nothing here touches them), TWELVE_YEARS.md (twelve years, two suns: no night
words in either language), the planets joined by spaceship only (2.11), Oren an original invention and not a puppet
master of Vesk, Sendell not secretly evil, FunFrock not resurrected, the base finale unchanged while the expanded one
is incomplete.

## 9. Risks

- The transitional campaign is now 10 → 11 → 14: Oren speaks in 10 and 11, then not until 12–13 exist; chapter 11 ends
  with Tessa drawing a box nobody fits yet and Baldino calling him home to a network that never mentions regulators
  (acceptable only while the expansion is in progress). Chapter 11's end goes straight on when 12 is written
  (`Ballastra.end`: no film when the next chapter is `balances`); EXP-3 rewrites its last lines (`bl_ba_2`,
  `bl_te_end4`, `bl_do_home`) for the way into the warehouse.
- Chapter 11 sits at the top of the band (~27 min estimated, 12.5 min bot floor); N2's board is the longest thinking step.
- Crane B's latch is inside the mast's collider: the ball reaches it only from the lift's side (a strike within 1.55 m
  counts). Thrown from the quay's east side the ball bounces off the mast; the nudge after 60 s says where the latch
  is. A laptop playtest should confirm it reads.
- The Ballastra cast (4 models, 3.4 MB) loads on demand for every expanded save from chapter 11 on.
- OG-2 was written against old Citadel; it may need more than a re-test.
- W-4 and W-9–W-12 need art the laptop has not started.
