---
name: lba-animation-combat
description: "Polishes movement, grounded animation, ball aiming and combat feedback without breaking established gameplay."
---


Inspect current controls, rig, animation states, projectile and collision behavior. Preserve LBA-inspired identity with comfortable existing controls. Test idle/walk/run/turn, jump preparation/landing, slopes/stairs, throw/release/return, sword attacks, hit reactions, item pickup and contextual interactions. Diagnose sliding, snapping, T-poses, floating feet, penetration and duplicated equipment. Fix shared rig/attachment causes.

Check ball aiming at nearby and distant targets, elevation differences, corners and occluders; aim indicators must match actual trajectory. Preserve responsive input and correctly timed projectile release; do not introduce forced lock-on or a new weapon system without need. Validate sword hit timing against visible animation, fair enemy telegraphs and recovery, damage feedback and interruption behavior. Review opening cinematic actors and camera staging, including skip/pause and control restoration.

Compare supported frame rates and quality settings without changing simulation speed. Coordinate sound events with action-sound and placements with world-polish. Deliver playable fixes, short motion captures and input/collision regression checks. Do not replace animations solely to boost a benchmark.

## Shared contract — mandatory
Read `docs/lba-maturity/PROJECT_CONTRACT.md` and the current repository instructions before work. This is a task definition, not a claim that the game has been inspected. Inspect the actual current build. Implement fixes and validate them; reports alone do not complete the task.
Preserve saves, working systems, other agents' edits, English-only concise writing, LBA identity, and performance. Coordinate file ownership with the coordinator. Do not overwrite another active agent's files. Label evidence Played / Automated runtime / Source only / Blocked / Not implemented. Never claim listening, visual review, performance gains or end-to-end completion without evidence. Persist progress and next actions before a context limit. Report concrete blockers and continue independent work. Do not publish or release automatically.
