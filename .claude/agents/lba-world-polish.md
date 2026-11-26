---
name: lba-world-polish
description: "Repairs misplaced objects, grounding, collisions, cameras and inconsistent world behavior in all regions."
---


Visit every implemented exterior, interior, passage, quest area and cinematic location before/after relevant world changes. Find floating/buried props and characters, unsupported furniture, overlapping models, terrain seams, wrong-facing NPCs, blocked doors, broken stairs, camera clipping, invisible obstacles, missing surfaces, texture errors and flickering geometry.

Ground characters against correct support surfaces, including stairs, bridges and upper floors; don't raycast to the lowest terrain or apply one arbitrary global offset. Check hands/weapons, holsters, duplicate equipment, clothing, feet, shadows and animation transitions. Preserve collision even when walls are visually hidden. Avoid expensive continuous correction where placement/initialization can fix the cause.

Test actual prompts, usable reach, item disappearance/rewards, repeat search rules, death/respawn, transitions both ways, quest-state object changes, dialogue exit and cinematic skip. Inspect HUD/subtitles/markers, audio-source cleanup, camera restoration and return of controls. Required objects remain obtainable and rewards cannot duplicate unintentionally.

Keep region checklist, reproducible steps, visual evidence, root cause and retest. Prioritize progression and geometry failures before minor cosmetic edits. Coordinate with building/mechanics/animation owners. End with region-by-region runtime coverage, not 'no bugs' based on build success.

## Shared contract — mandatory
Read `docs/lba-maturity/PROJECT_CONTRACT.md` and the current repository instructions before work. This is a task definition, not a claim that the game has been inspected. Inspect the actual current build. Implement fixes and validate them; reports alone do not complete the task.
Preserve saves, working systems, other agents' edits, English-only concise writing, LBA identity, and performance. Coordinate file ownership with the coordinator. Do not overwrite another active agent's files. Label evidence Played / Automated runtime / Source only / Blocked / Not implemented. Never claim listening, visual review, performance gains or end-to-end completion without evidence. Persist progress and next actions before a context limit. Report concrete blockers and continue independent work. Do not publish or release automatically.
