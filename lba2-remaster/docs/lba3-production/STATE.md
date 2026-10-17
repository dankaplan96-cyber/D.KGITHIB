# STATE (production checkpoint)

Update before a handoff or a session limit. Do not mark a task done twice after resuming: check BACKLOG.md first.

## Build
- Game version 0.28.1 (desktop/package.json; 0.26.1 = TY-3-FIX, 0.27.0 = TY-4 Zeelich twelve years on, 0.28.0 = WPN-1 weapons and gadgets, 0.28.1 = TY-5-FIX; was 0.24.0 when this section was written) on branch `ccr-adf00ea7-37ebl3`: the stabilization pass (0.22.1,
  D1–D18, see QA.md), then Zeelich's islands and Citadel Spaceport.
- Milestone (PRODUCTION.md): 1 — Stabilize.

## Completed and tested (this pass)
- D1–D9 fixed with regression tests (QA.md "Defects"): house floor seam (blocker), refused-exit loop, waterline
  slide trap, death timer in game time, Zoé's save resume (blocker), cliff-brink death loop, menus at 640×360,
  unbounded music log, LBA1 room layouts missing from the desktop/published build.
- Automated: tests/menus, stability, zoe-resume, crosssystem, longsession, display, audio, transitions,
  shipfiles; opening; chapter LOGIC tests 2–10 (see QA.md for the last results and dates).
- Packaged app: Linux unpacked build from desktop/ (`node copy-game.mjs && npx electron-builder --linux dir`),
  `xvfb-run -a node desktop/test-desktop.mjs release/linux-unpacked/lba3-the-awakening` ALL PASSED (window,
  app://, bundled font, new game + opening + save, relaunch → Continue, Quit) after D9; no 404s.
- Player-input playthrough (tests/playthrough/, tests/lib/seg.mjs): prologue (01–02), chapter 2 (03–05) and
  chapter 3 (06, to chapter 4) pass by input, each segment continuing from the previous one's real save.
  One exception, logged: the Zeelich depot fight (2 drones, an armour-2 Grobo guard, a dog, entered with 6/10 HP)
  — the bot can't win it; below 3 HP it stops and an ISO assist beats the rest (QA.md).

## Unfinished
- Playthrough chapters 4–12 + epilogue (07–14): running/next (see QA.md "Story and progression").
- Final run of the whole automated suite on the final state; QA.md results table refresh.
- PROGRESS.md / TASKS.md / NEXT_ACTION.md entries for the pass.

## Blockers (need the user or hardware)
- GPU frame rate / 60 FPS gate: no GPU here (software rendering only). Needs the in-game benchmark from the
  user's PC (pause → Benchmark).
- Audio by ear, gamepad and touch feel: human checks.
- Combat balance of the Zeelich depot fight at low HP: a human playtest (the bot's combat is weaker than a
  player's; not changed).
- Windows/Mac installers: built by the GitHub Actions workflow on push; not run here.

## Tools
- `python3 -m http.server 8123` in lba2-remaster (run detached: `setsid nohup ... &`).
- Playwright + SwiftShader from /opt/node-tools; xvfb-run + electron for the desktop test.
- tests/lib/player.js (input harness), tests/lib/seg.mjs (segment runner; LOAD/KEEP/NORETRY/SHOT env),
  tests/lib/try.mjs (scratch page scripts).

## Open from the stabilization pass
- Final end-to-end rerun on the last code reached chapter 2's last segment (05) and stopped: Zoé died after finding the
  plan (cause not identified) and, after the game-over Retry, talking to Zoé at the gate gave a 2-line reply instead of
  restarting her segment. Not reproduced or diagnosed yet (the user moved the work to the Zeelich islands). The same
  resume through Esc → Save & quit → Continue passes (tests/zoe-resume.mjs).

## Done after the pass (0.23.0)
- Zeelich's seven islands as new regions (src/game/zislands.js; assets/lba2/islands, numbers only) and Citadel
  Spaceport (src/game/spaceport.js, the user's request); Esmer shuttle flights from chapter 4
  (src/game/story/islands.js). tests/zislands.mjs and tests/spaceport.mjs pass; regression set rerun (QA.md).

## Done after the pass (0.24.0–0.27.0)
- Twelve years on (docs/TWELVE_YEARS.md): the first set (house, The Old Pump, the harbour; 0.24.0), Baldino's workshop
  (0.25.0), the reviews' fixes (0.25.1), Desert Island's Kesh and The Wind-Catcher (0.26.0, TY-3: tests/desert-life.mjs,
  captures/desert-ty/; status REVIEW), Zeelich's street and The Second Bake (0.27.0, TY-4: tests/zeelich-life.mjs,
  captures/zeelich-ty/; status REVIEW).

## Done after the pass (0.28.0)
- WPN-1 weapons and gadgets (the user's request): blowgun → Blowtron, the Esmer laser pistol, the Wannie glove, the
  lightning spell; the meca-penguin, the protection ward, Arthur's conch, the lantern; earned at Pippa's stall, Nara's
  case on Zeelich, from Arthur, the School of Magic and Bersimon, in the old Wannie mine on Under Celebration and in
  the house cellar (src/game/weapons.js, gadgets.js, story/arsenal.js). Save format 4 (hero.arms; format 3 migrates).
  tests/arsenal.mjs; QA.md "Weapons and gadgets (WPN-1)"; status REVIEW. No jetpack (no flight in the story bible).
## Done after (ZL-ALL + CONNECT; status REVIEW)
- All of Zeelich: the original's remaining island files identified from numbers (tools/lba2-islands.py: ASCENCE → the
  Lift Dock, a new deck region; CELEBRA2 → Celebration's risen figure; CITABAU = Citadel again; EMERAUDE/MOON = the
  Emerald Moon, not wanted); three places of our own (src/game/zplaces.js: Tralu Rock, the Nectar Orchard, the Old
  Watch), each with a landmark, dressing and a giver.
- Travel (src/game/travel.js): Zeelich separate — Citadel Spaceport ⇄ Zeelich Spaceport (ours) by spaceship only;
  Esmer shuttles between Zeelich's 12 places only; on Twinsun the ferry and three glider fields; gates by chapter.
  The Holomap per planet with his dot (VP-9). tests/travel.mjs, tests/zislands.mjs, tests/spaceport.mjs.

## Done after the pass (0.28.1)
- TY-5-FIX (REV-TY-5's items): the ball way keeps street lines (also after a Continue from a mid-fall save); Snuff is
  not offered from her roof (a generic talk limit: nobody more than 1.8 m below Twinsen, src/main.js TALK_ABOVE);
  asked again, Snuff and Bzizz follow the phase; a room search under his feet no longer takes the prompt from
  a person he faces (the lighthouse dial vs Zoé), and chapter10.mjs no longer depends on Zoé's facing (DONE ×3, forced
  ASSISTED exit 2). N2 (the pump's camera) left open: no camera zones exist. QA.md "REV-TY-5 fixes"; status REVIEW.

## Next exact task
Independent reviews of TY-3 (Desert Island) and TY-4 (Zeelich's street); then twelve years on for the Hamalayi.

## Resume
Saves made through the game's own Save & quit live in the session scratchpad (not in the repo; regenerate by
running the segments in order from a new game: 01 → 14, each with KEEP=<file> and the next with LOAD=<file>).
