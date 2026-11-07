# Alignment, cloud ↔ laptop — 7.11.2026 (the user: "line up with the local agent: what tasks were given in the last week, what was done, what wasn't, and the order of work")

Baseline: artifact **v56** (commit `f28d5d2d`, 7.11 16:43 UTC). Orders = `tools/testlab/CLOUD_ORDERS.md`; reports =
`tools/testlab/WORLD_ART_REQUESTS.md`. **Laptop: read this, correct any row that is wrong (in your reply, ALIGN-1), then
work in the order of §3.** Evidence labels as in `PROJECT_CONTRACT.md`.

## 1. The laptop's orders this week (1–31)

| # | Order | Status | Where |
|---|---|---|---|
| 1 | ASYLUM-2: the asylum's two entrances as LBA1 | Done | ASYLUM-2, ASYLUM-3 |
| 2, 7, 9 | Real-GPU checks of the cloud's changes; playthrough chain on the GPU; skies | Done (reports) | GPU-7, GPU-9, SKY-9 |
| 3 | "Cacophony": the harbour's styles; Otringal fewer buildings | Done | HARBOUR-1, OTRINGAL-1 |
| 4 | W-1 Float Harbor (expansion) | **Waiting on the user** (pictures) | — |
| 5 | The paved climb up to the asylum | Done | CLIMB-1 |
| 6, 10 | Zeelich closer to LBA2 | **Partly done** (ZEELICH-2); the user, 7.11: "not polished at all", buildings fade | ZEELICH-2 |
| 8 | The hostel's leftovers | Done | ASYLUM-3 |
| 11 | Chapter 10's glider take-off | Done | GLIDER-1 |
| 12 | Expansion W-2 "The Arch District" | **In progress** (the user: "looks good so far", 6.11); expansion branch not merged since 6.11 | EXPANSION_WORLD_SPEC |
| 13 | Desert Island's grey rock | Done | ROCK-13 |
| 14 | The polish passes' visual leftovers | Done (a–g); (h) the School pupils' looks → DRESS-1 covers colour | POLISH-14, GLIDER-1 |
| 15 | The climb's likeness to LBA2 | Done | CLIMB-15 |
| 16 | The asylum flight's top (three photos) | Done (a, b, d) | CLIMB-2 |
| 17, 21 | The climb's foot straight; the east flight's slide trap | Done — **but the user finds the new foot "very strange" → order 30** | CLIMB-17 |
| 18 | Player's-eye art reviews: (a) Zeelich + isles + Otringal, (b) Hamalayi, (c) underground | (b), (c) Done; **(a) Zeelich not done** | REVIEW-HAMALAYI, REVIEW-UNDER |
| 19 | Music by place | Done (the cloud rendered the asylum's piece) | MUSIC-19 |
| 20 | The asylum against LBA1's own files | Done, merged in v56 | ASYLUM-20 |
| 22 | Desert Island's art follow-ups (a–h) | **Not done** | — |
| 23 | Zeelich's art: (a) Esmer looks, (b) bar door, (c) dog-yard gate, (d) rope, (e) summit plaza, (f) music | (f) Done (MUSIC-19); **(a)–(e) not done** ((a) folds into 28) | — |
| 24 | DRESS-2: shape variants for the most shared models | **Not done** (folds into 28) | — |
| 25 | The Hamalayi's art follow-ups (REV-HAM-ART) | **Not done** | — |
| 26 | Citadel's art follow-ups (REVIEW-CITADEL-ART) | **Not done** | — |
| 27 | Maturity pack roles: (a) reference curator, (b) music crackle, (c) performance lab, (d) world art | **Not started**; the Blender bridge is in (db5a1c9c) | — |
| 28 | Character polish in Blender, region by region | **Not started** (bridge ready: chest round trip proven) | — |
| 29 | Every door against LBA2, the sewer first (DOORS-LBA2) | **Not done**; the cloud's `door-map.md` is ready | — |
| 30 | The climb's new foot reads very oddly (CLIMB-30) | **Not done** | — |
| 31 | The Whispering Cliffs' stepping stones as rock (STONES-31) | **Not done** | — |

## 2. The cloud's side this week (for the record)

Done and published (v53–v56): music by place and the asylum's piece rendered; REVIEW-DESERT / ZEELICH / HAMALAYI / UNDER /
CITADEL fixes; DRESS-1 (no two people the same, by colour); CAM-WALKSWING / RECOVER; SLIDE-RESCUE (10 respawns → 0 on 78
steep spots); CLIMB-17/21 applied; the Zoé-can-run lock (P7); the pack installed with `status.md`, the Citadel bar, the
playtest inbox and `door-map.md`.

Running now (cloud workers): **Zeelich finisher** (P1 buildings fading → VP-10 camera in every outdoor room, then doors,
interiors, people), **camera pass 3** (P8 the narrow passage first, then Citadel's spots by keyboard), **animation** (P2 the
residents' slow-motion walk and stretched legs, the hands).

Not done on the cloud: the chapter-2 travel check "Doran goes ahead to the spaceport" (fails on the base too); P3 the
spaceport's empty kiosk + a sweep of empty structures; P9 the depot's enemies without a reason; Citadel chapters 3–9 and
real saves (paused review); the SLIDE-RESCUE keyboard review (paused); chapter balance; dialogue; voices; action sounds;
the expansion branch's merge since 6.11.

## 3. The order of work from now

**Laptop (one at a time, report each before the next):**
1. **30 CLIMB-30** and **31 STONES-31** — Citadel, chapter 1, where the user plays now. Small; send as soon as each is ready.
2. **29 DOORS-LBA2** — Citadel's sewer and every Citadel door first (the cloud's buildings worker waits on it), then Zeelich,
   then Desert Island.
3. **27a reference curator** — Citadel, then Zeelich (name each district): `WORLD_RESEMBLANCE_TEMPLATE.md` per place with the
   score's evidence, `BUILDING_REGISTER_TEMPLATE.csv` rows. With it, **18a / 23 (b)–(e)**: Zeelich's art review and fixes.
4. **27b music crackle** on the user's own computer (only there can it be reproduced).
5. **28 cast polish** (with 23a, 24): the Zeelich batch first, then each region as the cloud brings it to Citadel's level.
6. **26, 22, 25**: Citadel's, Desert Island's, the Hamalayi's art follow-ups, in that order, as each region's turn comes.
7. **27c performance lab** on the Vega 8 after each published version (a short pass; no claims for other machines).
8. **4, 12 expansion**: the user approved it (7.11, order 33): W-2 accepted, **W-3 the Water Gardens ordered** on `expansion/ballastra`; build it after 30/31, in turns with 29.

**Cloud (two workers + an urgent third while the user is playing):**
1. Now: Zeelich finisher (P1), camera pass 3 (P8), animation (P2). Publish as each lands with tests.
2. Next free slot: **campaign director** — P9 the depot's enemies, chapter 2's Doran travel failure, the paused Citadel
   chapters 3–9 + real saves review.
3. Then **buildings-interiors** — P3 the kiosk and the empty-structure sweep on Citadel; P4 the doors from DOORS-LBA2.
4. Then **chapter balance** across every chapter; then the pack's waves 3–7 (cutaways, art/animation, dialogue/voices,
   action sound, polish) region by region against `citadel-bar.md`; **release auditor** last.
5. The expansion branch merged with main after each published version.
