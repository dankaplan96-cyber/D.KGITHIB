# What the Test Lab needs from the game

The Test Lab changes no game file. These additions to the game would make its tests stronger. They are listed by
value, each with what it would let the tool do. Everything else it uses already exists (`game.perf`, `perf.onRecord`,
`game.bench`, `game.regions`, `game.autoQ`, `game.snapshot/applySave`, `game.save`, `game.enterRoom/exitRoom`,
`game.devArena`).

1. **A seed for gameplay randomness** (`?seed=N`, or `game.seed(n)` before New Game). `Math.random` drives enemies,
   people and effects. With a seed, two runs of the same input timeline would see the same game, so comparisons
   between builds would need fewer repeats and a reproduced issue would play out the same way.
2. **Structured benchmark results.** `bench.run/runAuto/visits` return text only. Returning `{ text, data }`
   (`data` = the phase rows as objects, as `phaseStats` already builds them) would end the parsing of report lines
   in the tool.
3. **GPU time on the frame record.** The timer query resolves a few frames later into `gpuTimer.ms`, without the
   frame it belongs to. Adding the frame's `end` to each resolved sample (`{ end, ms }`) would let the tool give GPU
   time per frame and per stall, not only per window.
4. **Loading state on the frame record**, beyond `black`. A field such as `f.phase = 'fade' | 'reveal-hold' |
   'shader-hold' | 'play'` would let "visible" and "behind loading" stalls be told apart exactly, including the
   reveal's camera beats.
5. **Region events.** `regions.log` has builds. An event or log entry for the moment a region becomes visible
   (revealed) would give region load → reveal timing. Unload does not exist today: say so in `regions.summary()`,
   so the tool can report "never released" as a fact instead of an absence.
6. **Animation checks.** `hero.rig.anim` gives the current animation name. Also needed: a list of the clips the rig
   has, a warning (console or `rig.missing[]`) when a requested clip does not exist, and the mixer time of the
   current clip. Then "missing clip" and "frozen playback" could be asserted for every character, not only Twinsen.
7. **Dialogue hook.** An event per dialogue line (speaker, line id, gesture played) would let dialogue tests assert
   that a line and its gesture played, without reading the screen.
8. **URL parameters named in comments but not parsed:** `?arena` (arena.js) and `?bench` (bench.js). Either parse
   them or remove them from the comments. The tool uses `game.devArena()` and `game.bench.*` meanwhile.
9. **The debugging connection.** The production EXE accepts Playwright's connection today (0.43.3). If the build ever
   turns that off (Electron fuses), keep a "test build" variant that allows it, named as such in its version string.
