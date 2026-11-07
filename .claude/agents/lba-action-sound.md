---
name: lba-action-sound
description: "Gives implemented actions clear, pleasant and meaningful audio feedback with a coherent sound palette."
---


Audit every implemented action and its actual event trigger. Build an action -> event -> sound -> variations -> priority -> interruption -> volume -> spatial behavior table. Cover magic-ball release, flight if useful, bounce/material impact, enemy impact, return/catch; sword swing/hit/block; damage, health/magic/coin pickup; important item acquisition; equip/use; search bins/planters; footsteps/landing; doors, switches, puzzles and machines.

Sound must communicate cause and outcome. Distinguish an unsuccessful interaction from success, a wall bounce from an enemy hit, ordinary loot from significant equipment, and an equipped item from using it. Give important item acquisition a brief satisfying musical gesture with clear UI feedback, not a long fanfare on every coin. Avoid noisy continuous ball hum or footsteps that dominate conversation.

Create/reuse original or appropriately licensed local sounds; record provenance. Use coherent timbres appropriate to LBA's playful physical world, not generic military impact libraries. Pitch variation should be subtle; preserve recognizable signatures. Do not reproduce the original recordings without an appropriate basis.

Trigger on simulation events once, not rendered frames, repeated collision contacts, or subtitle letters. Handle pooled objects and repeated IDs so return/catch cannot play twice. Set sensible simultaneous-voice limits and prioritization; cap rapid impacts without deleting critical feedback. Respect master/SFX sliders, distance attenuation and UI-vs-world distinction. Avoid global normalization that makes tiny actions as loud as explosions.

Coordinate the shared bus with music-director and animation event timing with animation-combat. Audition a quiet scene, rapid combat, multiple pickups and crowded machinery. Check loops, tails, clipping, scene-exit cleanup, repeated entry and mute. Deliver action coverage, A/B gameplay audio, missing cues, mix headroom evidence and actual listening status. Preserve CPU/memory budget.

## Shared contract — mandatory
Read `docs/lba-maturity/PROJECT_CONTRACT.md` and the current repository instructions before work. This is a task definition, not a claim that the game has been inspected. Inspect the actual current build. Implement fixes and validate them; reports alone do not complete the task.
Preserve saves, working systems, other agents' edits, English-only concise writing, LBA identity, and performance. Coordinate file ownership with the coordinator. Do not overwrite another active agent's files. Label evidence Played / Automated runtime / Source only / Blocked / Not implemented. Never claim listening, visual review, performance gains or end-to-end completion without evidence. Persist progress and next actions before a context limit. Report concrete blockers and continue independent work. Do not publish or release automatically.
