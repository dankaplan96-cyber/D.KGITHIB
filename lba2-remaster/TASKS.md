# TASKS (priority order)

`[ ]` todo · `[~]` in progress · `[x]` done (evidence in PROGRESS.md). See STORY_BIBLE.md and WORLD_MAP.md.

## 1. Visual standard (Citadel village first, then everything reachable)
- [~] V1 Representative area to target quality: Twinsen + Zoé + one more NPC, the street from the house to the
      square, the house interior, vegetation/terrain, the harbour water. Done when: before/after captures from the
      same game camera show no exposed primitives on characters, no boxy buildings, no flat empty ground, and
      characters read clearly against the background at normal game size.
- [ ] V2 Character pass: Zoé rebuilt from the original's sections, Twinsen at the original's head size, the cast in
      LBA2's language (ball hands, plain cloth, Grobo bodies, Rabbibunny snouts) — pass 8, 0.13.0. Still open:
      Zoé's gestures; the Esmers after the original; the user's verdict in their game.
- [x] V2b LBA2's friends and creatures: Zeelich's peoples, Joe the Elf, the Esmers' shuttles, the Temple of Bù, the
      guard dogs (bodies 51–53, enemies) + the poodle and the dog-training yard, the wizards (Bersimon's tent, the School
      of Magic, Rector Hougo, Ker'aooc) (0.17.0–0.18.0).
- [x] V2c LBA1 brought back: the Spheros, FunFrock's fat troopers (enemies), and the first rooms rebuilt from LBA1's
      layouts: FunFrock's asylum under Citadel's fort, the Temple of Bù's maze and halls (0.19.0–0.21.0).
      Next candidates: the painted clones, Rabbibunny soldiers, the tanks, Twinsen's LBA1 house, the Maritime
      Museum, the band, the elves.
- [ ] V3 Apply the standard to the rest of Citadel, the interiors and Zeelich.
- [ ] V4 Lighting: contact shadows, character/background separation, no plastic look (LBA ramp everywhere).

## 2. Story to the end (12 chapters, see STORY_BIBLE.md)
- [x] Chapters 4–10 playable with tests (tests/chapter4–10.mjs).
- [ ] Split the current chapter 'shell' into 11 The Shell and 12 The Core (five pylons, one per station).
- [x] S1 Chapter 2 setback: the evacuation plan confiscated at the Zeelich dock, recovered in the depot;
      Nara/Oku react to it.
- [x] S2 Chapter 3 — The Shell: shaft, deep installation, galleries, Sendell, the core; puzzles from known
      mechanics; guardian boss; allies by radio; Vesk's turn. Done when: playable from ch2 end to the epilogue.
- [x] S3 Epilogue + end screen + free roam; End of Demo screen and DEMO badge removed (tests/chapter3.mjs plays chapter 3 → epilogue → end → free roam).
- [x] S4 Chapter 1 polish: the project's heat posts light up at every front door and Pippa's stall once the station runs; Vesk, Zoé and the townsfolk talk about free heat before the evacuation plan turns up.

## 3. World and exploration
- [~] W1 Optional discoveries with consequences (a shortcut, a locked workshop, a repaired machine changing a route). Done so far: six singing crystals off the paths (5 Citadel, 1 on the old mill on Zeelich), +1 max health each, Sendell remarks on all six in chapter 3.
- [~] W2 Familiar places change after events (NPC lines, objects, routes) — tracked per chapter. Done so far: heat posts light up after the water returns (ch1); bunting over the square and new lines for everyone in the epilogue.
- [x] W3 Zeelich's seven islands as extra regions (the original's layouts as numbers, our art) and Citadel Spaceport with Esmer shuttle flights from chapter 4 (0.23.0; tests/zislands.mjs, tests/spaceport.mjs). Next: people on the islands; Mosquibee's ledges.
- [~] W4 Twelve years on (docs/TWELVE_YEARS.md): first set done (0.24.0) — the family's house, The Old Pump, the harbour's trade and The Mislabelled Shipment (tests/townlife.mjs); second set (0.25.0) — Baldino's workshop and The Test Pair (tests/workshop.mjs). Next: Desert Island, the Hamalayi and Zeelich.

## 4. Animation and interaction
- [ ] A1 Talking gestures, pick-up/use reaches, NPCs face speakers, contextual idle chores.
- [x] A2 Ball: release timing, trapped-ball recovery, distinct hit feedback (combat pass, docs/COMBAT.md).
- [~] A3 Engine pass (0.22.0): doors walk through (out as the screen darkens, in as it clears); the screen holds
      black while a new scene's shaders compile; the room camera follows the floor's height; actions and stops
      settle back (no one-frame snap); jabs draw back, snap out and return to a guard; sword strikes ease back to
      a guard through their recovery. Next: the rooms (see NEXT_ACTION), landings and turns, NPC gaits.

## 4b. Combat (docs/COMBAT.md)
- [x] C1 Input: attack/dodge/focus/swap/selector actions, mouse aim, gamepad layout, buffer, rebinding.
- [x] C2 Targeting: soft target with line of sight, lock-on with release rules, switch, marker, target health bar.
- [x] C3 Ball: explicit states, substepped collision, ricochet rules, charge, recall, never lost, preview arc.
- [x] C4 Sword (chapter 6) with a 3-strike combo, heavy strike, swept hits in active frames; dodge with i-frames.
- [x] C5 Enemy roles: cautious mite, drone with aim-line tell, shielded sentry, crawler with slam ring; attack
      director, grace periods, poise; difficulty / aim assist / lock mode settings.
- [x] C6 Pulse tool (chapter 10) and encounters on Desert Island and the Hamalayi ridge.
- [ ] C7 Feel checks with a real gamepad and touch screen; audio balance by ear (not possible here).

## 5. Music and sound (parallel agent, then integration)
- [x] M1 Pipeline + Main Theme, Village, Well; music manager (crossfades, combat hysteresis, ducking, volumes).
- [x] M2 Remaining tracks; integration review; docs/MUSIC.md (12 tracks + stealth mix, draft renders, not checked by ear).
- [~] M3 Ambient/environment SFX: water, wind, machinery, footsteps per surface. Done: footsteps on stone/grass/dirt/wood/metal; well water and station machinery by distance; surf only by the sea, wind above the clouds; room hums. Not checked by ear.

## 6. Reliability
- [~] R1 Save format version + migration; save/load tests at each chapter boundary and mid-quest.
- [x] R2 Full automated playthrough new game → credits: tests/playthrough/01–14 by player input (0.22.1; logged ISO
      assists for fights the bot can't win, QA.md). Performance on a GPU: still needs the user's benchmark.
- [x] R3 Stabilization pass (0.22.1): D1–D17 fixed with regression tests (docs/lba3-production/QA.md).
