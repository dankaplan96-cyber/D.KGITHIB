# Automated checks

Headless Chromium (Playwright) playthroughs that drive the real game with deterministic stepping
(`game.testFreeze = true`, `game.step(dt)`). They need the game served on port 8123, or wherever `GAME_URL` points
(e.g. `GAME_URL=http://localhost:8141/ node tests/townlife.mjs`):

```bash
cd lba3 && python3 -m http.server 8123 &
node tests/prologue.mjs        # new game → prologue end → save
node tests/well-town.mjs       # CH1-LONGER: chapter 1's town steps (Mira's proof, the rusted lid, the harbour bell, the bay rocks), Save → Continue at each, an old save
node tests/chapter1.mjs        # chapter 1 end to end, with save → reload in the middle
node tests/chapter2.mjs        # chapter 2 end to end, incl. the confiscated-plan setback
node tests/save-migration.mjs  # v1 save upgrade + backup, missing room, corrupt save recovery
node tests/saveslots.mjs       # SAVE-SLOTS: Save Game / Load Game / Continue = newest / Delete / New Game keeps slots / full storage
node tests/uipass.mjs         # UI-PASS: Back / Esc the same on every screen (also with Pause or Up rebound), Controls: one list from the keys in use (first key in view, B gives up a wait), every settings row says what it does, the inventory's Close, a phone's touch buttons (aside in menus, an Inventory button), long messages wrap
node tests/solidnpc.mjs       # SOLID-NPC: Twinsen never walks into people (Grobo, Sphero, story people, walking residents), pets or the small props; residents sit on a bench's seat; SHOTS=dir for the bench captures
node tests/solidenemy.mjs     # SOLID-ENEMY: enemies are solid as in LBA2: every kind stops him (head on) and slides him (off centre), every attack still connects from there, a drone over his head is walked under, a beaten enemy is not solid, lunges never push him into a wall
node tests/walkers.mjs        # WORLD-LIFE: the residents who walk round Citadel, Zeelich's street and Kesh: routes, benches, chats, avoidance, stuck fallback, talk, LOD cost
node tests/cast-rounds.mjs    # WC-2: the story's people's small rounds in chapters 3–10 and the epilogue (src/game/castrounds.js): stops clear of doors, prompts and other givers, ≥ 2 stops in 60 s, no collider overlap, talk stops them and they face him, scenes and the hero leaving put them on their mark, the excluded (sneak, disguise, dial bank) stand still, cost; MAP=1 prints each area as text; pictures in /dev/shm/cast-rounds-shots/
node tests/residents.mjs      # WC-3: residents where the story goes (src/game/storylife.js): the dig's crew (chapters 4–5), the School of Magic, Lhar then the monastery (chapters 6–7, by the lift's trips), Zeelich's council quarter (chapter 9): at least 6 per area and state, stops clear of marks, doors, prompts, 20 s of free play, the storm, a state change waits until out of sight, asleep away from their area, a talk, save and reload, cost; pictures in /dev/shm/wc3-shots/
node tests/world-consistency.mjs # WC-5, the guard: for each chapter's start state (1–10, the epilogue) the residents in each area it uses (the town, Kesh, Zeelich, WC-3's, the rooms', the spaceports' rosters) and the cast with a round that moves in 30 s of free play, at least today's; every startTransition in src/game/story/ on its allow-list, each planet or region change through its journey film (KNOWN lines list the gaps); CALIBRATE=1 prints today's numbers — run it in every merge's regression set
node tests/interior-life.mjs  # INTERIOR-LIFE: people in the seven Citadel interiors and at both spaceports in chapters 1, 2, 4 and the evacuation (presence, on the floor, off the furniture, facing, talk), Zoé's/Arthur's/Gilbert's/Mira's household rounds (stops, no walls, talk stops her, scenes win), cost; pictures in /dev/shm/interior-life-shots/
node tests/anim-combat.mjs     # Twinsen's combat animation: release/contact timing at 30/60/120 fps, planted feet, interruptions
node tests/autoquality.mjs     # AUTO-QUALITY: the governor and calibration fed synthetic CPU/GPU/display-paced traces (Node only, no browser)
node tests/autoquality-game.mjs # AUTO-QUALITY in the game: Auto setting, migration, Settings line, knobs, commit points, power, calibration cache, Auto benchmark
node tests/weather.mjs         # WEATHER-1: the default test boot is today's look; every state on each planet, smooth blends, the light's floor, indoors, holds (sandstorm), Settings, quality caps, cost
node tests/zeelich-doors.mjs   # ZEELICH-DOORS: every door on Zeelich's street in and out by input (chapters 3 and 5), the shut doors' own reasons, Lissa and Wenna, the HELD crates, a save inside a house; SHOTS=dir for the rooms
node tests/island-doors.mjs   # ISLE-HOMES: every house door on Zeelich's islands, in Kesh and in the Hamalayi in and out by input (chapter 5), each room's own look, in again, the doors kept shut (own line + sign), the keepers, a save inside; SHOTS=dir, ROOMS=a,b
node tests/door-sweep.mjs   # DOOR-SWEEP: every door the story offers in every region (chapters 2-11 by flags) walked in by input straight and 0.3/0.5 m to the sides, every landing clear of the door triggers and staying, the doors between rooms, a save on landing out of Zeelich's terminal; CHAPTERS=, ONLY=, BEFORE=1 (DOOR-CLEAR off: the A/B)
node tests/room-cutaway.mjs   # ROOM-CUTAWAY: the room camera sees him on 99% of each sampled room's floor (ALL=1: all ~110 rooms), an LBA1 lid and Zeelich's porch restored on the next visit, colliders unchanged while a lid is cut; SHOTS=dir, ROOMS=a,b
node tests/citadel-structures.mjs   # CITADEL-STANDS: Corla at the spaceport kiosk (ch. 1, 5, 8: lines, the seat menu, the flight), every Citadel structure's prompt and line, the fountains, the notice boards
node tests/overlaps.mjs        # OVERLAP-1: two surfaces in one plane (z-fighting) found by rays down and across, the ground included: Citadel outdoors and every Citadel interior fail on a seen one ≥ 0.5 m²; REGIONS=1 adds the other areas, ONLY=a,b, SHOTS=dir (red/green pictures), REPORT=file.json
node tests/rocks.mjs           # ROCKS-1: Citadel's cliff rocks closed and outward-wound, triangle budget (+30 % max), the 509 placements, even texel density, no stretch, clear of the paths, deterministic; SHOTS=dir for four cliff views
node tests/slidetraps.mjs      # SLIDE-RESCUE: a slide into a collider (rock, post, wall, the sea's edge) in Citadel, Desert Island and the Hamalayi resolves: no respawn, no life lost, he ends standing on standable ground; SHOW=1 lists every spot
node tests/music-places.mjs   # MUSIC-BY-PLACE: the School of Magic (and its dormitory, the wizard's tent), the Desert, Kesh's houses, the Hamalayi, the monastery hall, Lhar's houses each play their own piece on the audio clock (muffled where heard through walls); the alt fallback without the renders; the renders' loop points and loudness (not a listening test)
```

Playwright is imported from `/opt/node-tools/node_modules/playwright/index.mjs` (the environment's copy);
adjust the import if yours lives elsewhere. Screenshots are written to the current directory.

## Reading a verdict

Every script (and `tests/lib/seg.mjs`, `try.mjs`, `shots.mjs`) uses one result policy, in `tests/lib/boot.mjs`
(R7-VERDICTS). It ends with a block like this:

```
--- verdict (tests/README.md "Reading a verdict") ---
functional: 59 passed, 0 failed
errors:     none
resources:  no required file missing, 0 optional
visual:     2 passed, 0 failed; 3 capture(s) written for review, not judged here
VERDICT: PASS
ALL PASSED
```

- **functional**: the `PASS`/`FAIL` checks on behaviour. The story tests (prologue, chapter1–10) judge each step's
  end state: the chapter reached, the flag set, the objective shown.
- **errors**: every page error (an uncaught exception) and every `console.error` is a FAIL, listed with its
  text. A test that provokes one on purpose declares it with `expectError(regex, why)`: listed as EXPECTED.
- **resources**: a failed request for one of the game's own files (a 404 on a model, texture, sound, script) is a
  FAIL, even when the game carries on without it (a missing character model falls back to its sculpt without a
  word). A failed request to another site is a FAIL too, unless the URL is declared optional (`OPTIONAL` in
  boot.mjs or `optional(regex, why)` in a test): then it is listed as OPTIONAL with its reason and the run still
  passes. The game asks for nothing outside its own folder today, so the list is empty. A request the page or a
  navigation cancelled (`net::ERR_ABORTED`) is listed as a NOTE.
- **visual**: `checkVisual` measurements (a part culled, the camera inside a wall, Twinsen out of view, z-fighting)
  FAIL like any check but are counted apart; every screenshot is listed as a capture for a person to look at,
  never judged by the script.
- **VERDICT** is PASS only with no FAIL of any kind; the exit code is 0 for PASS and non-zero for FAIL, always. A
  FAIL captured after the verdict printed is shown as `LATE FAIL` and still makes the exit code non-zero.

`node tests/verdicts.mjs` is the policy's own self-test: it boots the game with a page error, a console error, a
missing model, a missing texture, an offline optional font, the same font undeclared, a failed check and a late
error, and checks that each verdict and exit code come out as above.
