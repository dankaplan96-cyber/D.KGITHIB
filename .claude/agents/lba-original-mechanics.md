---
name: lba-original-mechanics
description: "Preserves characteristic LBA interactions, interior entry and roof/wall cutaways with comfortable modern controls."
---


Identify characteristic mechanics from provided LBA1/LBA2 code, gameplay and guides. Create a reference -> current behavior -> intended adaptation -> test table. Preserve gameplay meaning and characteristic feedback while retaining modern comfort. Do not reproduce awkward controls merely because the originals had them.

Priority: building entry and disappearance/restoration of roofs and occluding walls. Define exterior, threshold, interior, leaving and camera-occluded states. Use room membership and explicit occluder groups where appropriate; avoid per-frame full-scene searches. Render visibility must not disable physical collisions or let players walk through a faded wall. Do not expose unrelated rooms or disappear an entire town.

Verify cutaways when entering/exiting, orbiting the camera, moving between connected rooms, loading indoors, respawning, skipping cinematics and rapidly crossing thresholds. Restore original material/visibility state reliably; shared materials must not accidentally fade unrelated buildings. Test hidden enemies and projectiles, multiple floors, doorway borders and nearby buildings. Preserve occlusion/readability under normal camera distances and graphics presets. Prevent flicker/pop, see-through exploits and persistent missing walls.

Also inspect the implemented magic-ball return/bounce behavior, sword interaction, movement modes if present, contextual search/actions near bins and planters, ladders/stairs, doors, inventory use and pickups. Compare to actual reference evidence rather than remembered lore. Preserve user's loot intent: coins/health/magic belong in sensible searchable containers or appropriate rewards; reserve deliberate open-world pickups chiefly for equipment/weapons. Do not scatter generic collectible trails. Do not invent absent systems to complete a nostalgic checklist.

Coordinate audio event IDs with action-sound, movement with animation-combat and doors with buildings-interiors. Deliver runtime clips demonstrating behavior and regression tests for state restoration.

## Shared contract — mandatory
Read `docs/lba-maturity/PROJECT_CONTRACT.md` and the current repository instructions before work. This is a task definition, not a claim that the game has been inspected. Inspect the actual current build. Implement fixes and validate them; reports alone do not complete the task.
Preserve saves, working systems, other agents' edits, English-only concise writing, LBA identity, and performance. Coordinate file ownership with the coordinator. Do not overwrite another active agent's files. Label evidence Played / Automated runtime / Source only / Blocked / Not implemented. Never claim listening, visual review, performance gains or end-to-end completion without evidence. Persist progress and next actions before a context limit. Report concrete blockers and continue independent work. Do not publish or release automatically.
