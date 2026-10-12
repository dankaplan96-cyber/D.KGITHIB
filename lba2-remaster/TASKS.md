# TASKS (priority order)

`[ ]` todo · `[~]` in progress · `[x]` done (evidence in PROGRESS.md). See STORY_BIBLE.md and WORLD_MAP.md.

## 1. Visual standard (Citadel village first, then everything reachable)
- [~] V1 Representative area to target quality: Twinsen + Zoé + one more NPC, the street from the house to the
      square, the house interior, vegetation/terrain, the harbour water. Done when: before/after captures from the
      same game camera show no exposed primitives on characters, no boxy buildings, no flat empty ground, and
      characters read clearly against the background at normal game size.
- [ ] V2 Character pass: Zoé redesigned (own proportions, hair, dress, gestures); hands with a thumb; shoes with
      toe/heel/sole; distinct silhouettes for townsfolk; races checked (Grobo, Rabbibunny, Esmer).
- [ ] V3 Apply the standard to the rest of Citadel, the interiors and Zeelich.
- [ ] V4 Lighting: contact shadows, character/background separation, no plastic look (LBA ramp everywhere).

## 2. Story to the end
- [x] S1 Chapter 2 setback: the evacuation plan confiscated at the Zeelich dock, recovered in the depot;
      Nara/Oku react to it.
- [x] S2 Chapter 3 — The Shell: shaft, deep installation, galleries, Sendell, the core; puzzles from known
      mechanics; guardian boss; allies by radio; Vesk's turn. Done when: playable from ch2 end to the epilogue.
- [x] S3 Epilogue + end screen + free roam; End of Demo screen and DEMO badge removed (tests/chapter3.mjs plays chapter 3 → epilogue → end → free roam).
- [x] S4 Chapter 1 polish: the project's heat posts light up at every front door and Pippa's stall once the station runs; Vesk, Zoé and the townsfolk talk about free heat before the evacuation plan turns up.

## 3. World and exploration
- [~] W1 Optional discoveries with consequences (a shortcut, a locked workshop, a repaired machine changing a route). Done so far: six singing crystals off the paths (5 Citadel, 1 on the old mill on Zeelich), +1 max health each, Sendell remarks on all six in chapter 3.
- [~] W2 Familiar places change after events (NPC lines, objects, routes) — tracked per chapter. Done so far: heat posts light up after the water returns (ch1); bunting over the square and new lines for everyone in the epilogue.

## 4. Animation and interaction
- [ ] A1 Talking gestures, pick-up/use reaches, NPCs face speakers, contextual idle chores.
- [ ] A2 Ball: release timing, trapped-ball recovery, distinct hit feedback.

## 5. Music and sound (parallel agent, then integration)
- [x] M1 Pipeline + Main Theme, Village, Well; music manager (crossfades, combat hysteresis, ducking, volumes).
- [x] M2 Remaining tracks; integration review; docs/MUSIC.md (12 tracks + stealth mix, draft renders, not checked by ear).
- [~] M3 Ambient/environment SFX: water, wind, machinery, footsteps per surface. Done: footsteps on stone/grass/dirt/wood/metal; well water and station machinery by distance; surf only by the sea, wind above the clouds; room hums. Not checked by ear.

## 6. Reliability
- [~] R1 Save format version + migration; save/load tests at each chapter boundary and mid-quest.
- [ ] R2 Full automated playthrough new game → credits; performance note with test conditions.
