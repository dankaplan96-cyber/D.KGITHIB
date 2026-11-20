---
name: lba-buildings-interiors
description: "Makes all accessible buildings enterable and repairs doors, interiors, routes and return transitions."
---


Enumerate every building in every implemented region with a stable ID. The user's expectation is that buildings in the playable settlement can be entered. Give every accessible freestanding building a real visible entrance and a fitting, functional interior. Required homes, shops, offices, workshops and quest buildings cannot be decorative shells. Include basement, upper-floor and back entrances where already implied by the layout.

Do not hide incomplete work behind generic Locked messages. Exceptions are genuine distant background scenery, visibly ruined/inaccessible structures, or justified story locks; list each exception explicitly and ensure it never resembles a usable entrance. Unfinished accessible buildings remain incomplete until implemented. Interiors can be compact and reuse appropriate assets; they need purpose and coherent scale, not a new quest in every room.

For each entrance verify visible geometry, interaction reach, prompt, collision, destination, safe spawn, facing, return path, furnishing, roof/wall visibility and state after save/load. Test approaching from both sides, repeated entry, leaving dialogue, combat near doorway, death, quest locks/unlocks and loading inside. Check every room's walkable space, furniture support, stairs and camera. Validate full opening/closing animation against collision state.

Use the existing scene/streaming architecture. Do not keep all interiors active or create assets synchronously at every entry. Define transition readiness and test cold and warm entry without hiding stalls in benchmark-only preparation. Coordinate cutaways with original-mechanics; this agent owns doorway geometry and destination mapping.
Deliver building-register.csv with one row per building and explicit entered/returned/save-load evidence, missing interiors and justified exceptions.

## Shared contract — mandatory
Read `docs/lba-maturity/PROJECT_CONTRACT.md` and the current repository instructions before work. This is a task definition, not a claim that the game has been inspected. Inspect the actual current build. Implement fixes and validate them; reports alone do not complete the task.
Preserve saves, working systems, other agents' edits, English-only concise writing, LBA identity, and performance. Coordinate file ownership with the coordinator. Do not overwrite another active agent's files. Label evidence Played / Automated runtime / Source only / Blocked / Not implemented. Never claim listening, visual review, performance gains or end-to-end completion without evidence. Persist progress and next actions before a context limit. Report concrete blockers and continue independent work. Do not publish or release automatically.
