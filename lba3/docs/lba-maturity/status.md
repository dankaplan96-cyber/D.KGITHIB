# LBA3 maturity — status, ownership and waves

Coordinator: the cloud session (branch `ccr-c1c2c4b9-dep6ed`, merged into the laptop's `ccr-adf00ea7-37ebl3`).
Pack: the user's LBA3 Maturity Agent Pack (7.11.2026), installed as `.claude/agents/lba-*.md` and this folder.
Contract: `PROJECT_CONTRACT.md` (here). Baseline: commit `c838d476` = artifact v55 (published 7.11.2026 15:12 UTC).
Evidence labels: Verified in play / Automated runtime only / Source-reviewed only / Implemented unverified / Blocked / Not implemented.
All cloud evidence is SwiftShader in headless Chromium: no frame-rate claims, no listening. Pictures are looked at, not "played".

## Who does what

The cloud and the laptop each run their own workers. The cloud keeps to **two editing workers at a time** (the pack's limit;
the coordinator does not edit in parallel with them beyond merges, stamps and docs).

| Role (pack agent) | Owner | Why there |
|---|---|---|
| maturity-coordinator | **cloud** | integration, merges, publishing, this table |
| world-campaign-finisher (Zeelich first) | **cloud** | quests, placements, doors, residents: code and tests |
| chapter-balance | **cloud** | scripted route timings per chapter (automated runtime); first-play estimates labelled as such |
| campaign-director | **cloud** | story causality, saves, flags |
| dialogue-editor | **cloud** | text files |
| buildings-interiors | **cloud** builds, **laptop** gives the references | doors/interiors are code; original layouts come from the curator |
| original-mechanics (entry, roof/wall cutaways) | **cloud** | renderer/room code |
| animation-combat | **cloud** | rig/actors/combat code |
| action-sound | **cloud** | sound events and synthesis; listening by the user |
| character-voices | **cloud** | voice pipeline; A/B files for the user to listen to (neither machine can listen) |
| world-polish (camera, grounding, slides) | **cloud** | continues CAM-WALKSWING/RECOVER, SLIDE-RESCUE |
| world-reference-curator (85/100 rubric) | **laptop** | it holds the user's LBA1/LBA2 files (read-only; numbers and descriptions only, nothing redistributed) |
| world-art | **laptop** | Blender models, baked colours, the cast's shapes (DRESS-2) |
| music-director (crackle) | **laptop** first, cloud renders | the crackle is on the user's computer: reproduce it there; scores rendered where the soundfont is |
| performance-lab | **laptop** | the target hardware (Ryzen 5 3500U / Vega 8); the cloud cannot measure it |
| release-auditor | **cloud**, after the last wave | independent of the workers |

## Waves (cloud)

| Wave | Workers | Status |
|---|---|---|
| 0 | in-flight work before the pack: camera pass 3 (Citadel spots by keyboard), Citadel chapters 3–9 + real saves, SLIDE-RESCUE review | paused by the usage limit; camera pass 3 resumes as part of wave 1 (world-polish), the other two fold into waves 2 and 7 |
| 1 | world-campaign-finisher (Zeelich: entrances, identity, life) + world-polish (camera pass 3, resumed) | starting |
| 2 | chapter-balance (all chapters) + campaign-director (incl. the paused Citadel 3–9/saves review) | pending |
| 3 | buildings-interiors + original-mechanics (serialize shared transition code) | pending; needs the curator's building references |
| 4 | animation-combat (+ laptop world-art in parallel) | pending |
| 5 | dialogue-editor + character-voices | pending |
| 6 | action-sound (+ laptop music-director) | pending |
| 7 | world-polish remainder (SLIDE-RESCUE keyboard review) | pending; laptop performance-lab in parallel |
| 8 | release-auditor | after all others |

## Laptop orders
CLOUD_ORDERS 27 (this pack): curator, world-art, music crackle, performance-lab. Earlier open: 24 (DRESS-2 shapes), 25
(Hamalayi art), 26 (Citadel art).

## Done before the pack (for the auditor; all Automated runtime only unless marked)
- v53–v55: music by place and the asylum's own piece; REVIEW-DESERT/ZEELICH/HAMALAYI/UNDER/CITADEL fixes; DRESS-1 (147
  people on 51 models get their own clothes and hair; pictures looked at); CLIMB-17/21 (the climb's foot straight, no slide
  trap on the east flight); CAM-WALKSWING/RECOVER; SLIDE-RESCUE (78 steep spots: 10 respawns/lives lost → 0).
- Known failing checks, failing the same on the base: travel.mjs "Doran goes ahead to the spaceport" (chapter 2);
  camfollow's 4 (Modern then Up, backing up, full turn, Far); camclear's pipeline 0.149 m; overlaps' two Lhar roof spots.
