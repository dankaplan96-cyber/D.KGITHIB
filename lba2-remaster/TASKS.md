# TASKS (priority order)

Status: `[ ]` todo · `[~]` in progress · `[x]` done (with verification noted in PROGRESS.md)

## A. Foundations
- [ ] A1 Story director: chapters as modules (prologue, ch1, ch2, ch3, epilogue) sharing chain()/speaker();
      NPC presence/placement per chapter (`when(flags)`); prologue ending flows into chapter 1 (no "to be continued").
      Done when: new game → prologue → ch1 starts without reload; save/load restores chapter.
- [ ] A2 Regions: second outdoor map (Zeelich) with its own terrain, sky/palette, cloud sea instead of ocean;
      travel between regions with a transition. Done when: hero can travel Citadel⇄Zeelich, physics/camera/minimap work in both.
- [ ] A3 Room-to-room exits (`to: 'room:<id>'`) and per-room iso camera; multi-room underworld chain.
- [ ] A4 Inventory + journal screen (items with drawn icons, quest log per chapter); minimal HUD.
- [ ] A5 Save slots: autosave + manual save in pause menu; continue restores region/room/chapter.
- [ ] A6 Failure: death → respawn at last checkpoint with clover/without, no big progress loss; boss retry.

## B. Characters & animation
- [ ] B1 Hero animation set: idle variants, walk/run/sneak, start/stop/turn, jump/air/land, throw windup/release/recover,
      hurt, knockdown + get-up, death + respawn, pick-up, use/push lever, open door, talk gestures. State machine with blends.
- [ ] B2 Vesk (new design: tall Zeelich engineer, long coat, goggles, brace arm) + Baldino (old inventor, white beard, goggles,
      apron) + Zeelich townsfolk (2–3 designs) + project workers.
- [ ] B3 Zoe playable (Zoe rig drives with hero controller, no ball, sneak + interact).
- [ ] B4 NPC reactions: turn to speaker, gestures per line, listen pose, idle chores (sweep, fish, read).
- [ ] B5 Fix throw crease on tunic; check foot sliding at all speeds.

## C. World art (target quality everywhere reachable)
- [ ] C1 Citadel outer areas: rebuild lighthouse, harbour (pier, shed, boats), remove/replace pyramid tents, crates (bevelled/banded),
      fortress = project station (stone walls with crenellations, gate, machinery, pipes, tanks, gantries).
- [ ] C2 Interiors: house furniture pass (sculpted bed/table/chairs/cupboard), Water Office, station control room, project office.
- [ ] C3 Zeelich region art: floating island, Esmer domes/arches, wind-mills, purple-pink sky, cloud sea, drill platform.
- [ ] C4 Underworld rooms: shaft, crystal galleries, Sendell chamber, pylon rooms, core arena.
- [ ] C5 Enemies: Warden drone (sculpted, telegraphed zap), crystal mites (exists), Esmer project guard, Bore Guardian boss.

## D. Content
- [ ] D1 Chapter 1 complete (see PROJECT_BRIEF) incl. Zoe infiltration segment.
- [ ] D2 Chapter 2 complete incl. Zoe lighthouse broadcast.
- [ ] D3 Chapter 3 complete incl. boss and Vesk's turn.
- [ ] D4 Epilogue + credits + end screen; post-game free roam.
- [ ] D5 All texts in i18n (HE + EN), no placeholders on the critical path.

## E. Audio
- [ ] E1 Melodic original music per region/mood (Citadel, station, Zeelich, underworld, boss, ending) via the generative engine.
- [ ] E2 SFX for new actions (valves, lifts, drone zaps, boss).

## F. Verification & delivery
- [ ] F1 Automated playthrough per chapter (Playwright, deterministic stepping) + full run new game → credits.
- [ ] F2 Save/load mid-chapter tests for each chapter; region/room transitions.
- [ ] F3 Visual review screenshots per area from the gameplay camera; collision sweep (no wall/floor penetration).
- [ ] F4 Performance note (test conditions), README (HE) with run instructions + controls, final screenshots.
