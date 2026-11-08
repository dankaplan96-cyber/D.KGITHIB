# The Hamalayi as a player meets it: an inventory against Citadel's bar (8.11.2026)

Worker: world-campaign-finisher (cloud), the Hamalayi's own Citadel-bar pass. Base: `ccr-c1c2c4b9-dep6ed` at `f023e47e`.
The bar is `citadel-bar.md`. Evidence labels as in `PROJECT_CONTRACT.md`. Runtime evidence is SwiftShader in headless
Chromium (960×540, Follow camera, Medium): **Automated runtime only**. Pictures were looked at; nobody has played this.
No frame-rate claims. Probes and pictures: the worker's scratchpad `hamalayi/` (`base/`, `rooms-base/` before; `ph/`,
`cam/` after), not in the repo.

**Resemblance.** Lhar, the landing, the monastery and the observatory are our places (LBA1's Hamalayi gave the old gate
and the waystone only: `props-lba1hamalayi.js`). They carry the world's identity, not an invented original. Unscored:
the laptop's curator scores them.

## Where the Hamalayi comes in the story

| Chapter (key) | On the Hamalayi | Areas built (`regions.js` CHAPTER_AREAS) |
|---|---|---|
| 6 `pass` (`story/pass.js`) | the whole chapter: the glider down; the tree over the gorge (ball); Lhar; Yorna; the heat station's fuse for Pim's kite (ball); the winch thawed; the mooring rope (sword); two trips and the ice mites; the ride up; the monastery | hamalayi |
| 7 `observatory` (`story/observatory.js`) | the whole chapter: the ridge; Sefa; the mirrors and the second sun's ice; Sendell; the telescope melts the vent's cap; the heavy drone; the seal's three warm discs; the glider off the monks' slope | hamalayi, obsv |
| 8 `evacuation`, 9 `council` | optional: the glider field links Citadel, Desert Island and the Hamalayi from chapter 8 (`travel.js`) | — |
| 10 `network` (`story/network.js`) | Sefa's dome relay: Yorna and Pim at the monastery, the ridge's crawler and mites, Pim at the big mirror | hamalayi, obsv (and the others) |
| epilogue `home` (`story/epilogue.js`) | optional: Lhar lived in again (Yorna, Pim and the three on the square) | — |

## Before this pass (base `f023e47e`; probe `base.mjs`, `rooms.mjs`)

| Area | What is there | Against the bar | Evidence |
|---|---|---|---|
| Camera | VP-10 since wave 1: nothing fades; 25 camera volumes (`roomocc.js`) | met; REVIEW-HAMALAYI left 6 camera spots "for the cloud" (the gorge's south bank, the bridge's north end, Lhar by the falls, the observatory door, the heat station, the trail's bend) | probe `cam.mjs` (below) |
| The landing | Hesk and his glider (chapter 6), the shepherd's hut (door → `ih_ham_landing0`: harnesses, a logbook), the fold, the windsock | the hut's line named a field keeper nobody has | `rooms-base/pass-ih_ham_landing0.jpg` |
| Lhar's five houses | doors → `ih_ham_lhar0…4` (wave 3, original-mechanics), the planner's furniture | **empty in every chapter**; the same in every phase (no packing on moving day, a lit hearth in an abandoned village, chimneys smoking all through); the rooms' owners did not match the residents' rounds (Bero carried his sacks out of house 3, which was "Sana's loom"; Sana took her washing into house 4, "Lhamo's kitchen") | `rooms-base/*.jpg`, `base/inv.json` |
| Lhar's people | the story's five (Yorna, Pim, Tashi, Dawa, Old Norbu) and 8 residents (`storylife.js`): packing in Lhar, then the monastery's camp | lines only for two phases (Lhar, the camp); nobody ever goes home; in a save with only a later chapter's key (chapters 7–10) Yorna, Pim and the three stood in Lhar's square while their neighbours camped by the monastery | `base/council-square.jpg` |
| Lhar's things | notice board, trough, fire, carts, sledges, a goat pen, woodpiles | the notice board and the pen look usable and did nothing; the pen is empty with no reason | source (`hamalayi.js`) |
| The heat station and the lift | the story's (chapter 6) | met (REV-HAM-ART moved the shed) | — |
| The monastery | the hall (two golden roofs, a porch, **a red double door**), the yard, the prayer wheels, the camp east of the walls | **the hall's door did nothing** (no prompt, no line): the biggest building of the region, the village's refuge; nobody of the monastery anywhere though the story says "the monks have opened the gates"; the prayer wheels did nothing | `base/pass1-yard.jpg`, probe: `hallDoor: null` in every phase |
| The observatory | the drum, the dome, the door (chapter 7, 10, the epilogue → `obsv`), Sefa's house next door (→ `ih_ham_obs0`) | **the dome's door was silent in chapters 6, 8 and 9**; Sefa's house empty in every chapter | probe: `obsDoor: null` |
| Music | the region `hamalayi` (Prayer Flags), the rooms `home` | the hall needs its own | — |

## What this pass did (HAMALAYI-LIFE)

(filled in below as each step lands)
