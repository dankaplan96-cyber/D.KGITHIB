# Automated checks

Headless Chromium (Playwright) playthroughs that drive the real game with deterministic stepping
(`game.testFreeze = true`, `game.step(dt)`). They need the game served on port 8123, or wherever `GAME_URL` points
(e.g. `GAME_URL=http://localhost:8141/ node tests/townlife.mjs`):

```bash
cd lba2-remaster && python3 -m http.server 8123 &
node tests/prologue.mjs        # new game → prologue end → save
node tests/chapter1.mjs        # chapter 1 end to end, with save → reload in the middle
node tests/chapter2.mjs        # chapter 2 end to end, incl. the confiscated-plan setback
node tests/save-migration.mjs  # v1 save upgrade + backup, missing room, corrupt save recovery
```

Playwright is imported from `/opt/node-tools/node_modules/playwright/index.mjs` (the environment's copy);
adjust the import if yours lives elsewhere. Each script prints its checkpoints and `no errors` when the page
raised none; screenshots are written to the current directory.
