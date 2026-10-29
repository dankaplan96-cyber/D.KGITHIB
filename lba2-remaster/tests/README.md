# Automated checks

Headless Chromium (Playwright) playthroughs that drive the real game with deterministic stepping
(`game.testFreeze = true`, `game.step(dt)`). They need the game served on port 8123, or wherever `GAME_URL` points
(e.g. `GAME_URL=http://localhost:8141/ node tests/townlife.mjs`):

```bash
cd lba2-remaster && python3 -m http.server 8123 &
node tests/prologue.mjs        # new game → prologue end → save
node tests/well-town.mjs       # CH1-LONGER: chapter 1's town steps (Mira's proof, the rusted lid, the harbour bell, the bay rocks), Save → Continue at each, an old save
node tests/chapter1.mjs        # chapter 1 end to end, with save → reload in the middle
node tests/chapter2.mjs        # chapter 2 end to end, incl. the confiscated-plan setback
node tests/save-migration.mjs  # v1 save upgrade + backup, missing room, corrupt save recovery
node tests/saveslots.mjs       # SAVE-SLOTS: Save Game / Load Game / Continue = newest / Delete / New Game keeps slots / full storage
node tests/solidnpc.mjs       # SOLID-NPC: Twinsen never walks into people (Grobo, Sphero, story people, walking residents), pets or the small props; residents sit on a bench's seat; SHOTS=dir for the bench captures
node tests/walkers.mjs        # WORLD-LIFE: the residents who walk round Citadel, Zeelich's street and Kesh: routes, benches, chats, avoidance, stuck fallback, talk, LOD cost
node tests/anim-combat.mjs     # Twinsen's combat animation: release/contact timing at 30/60/120 fps, planted feet, interruptions
node tests/autoquality.mjs     # AUTO-QUALITY: the governor and calibration fed synthetic CPU/GPU/display-paced traces (Node only, no browser)
node tests/autoquality-game.mjs # AUTO-QUALITY in the game: Auto setting, migration, Settings line, knobs, commit points, power, calibration cache, Auto benchmark
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
