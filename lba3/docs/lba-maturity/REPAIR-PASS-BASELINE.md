# REPAIR-PASS-18-11 phase 1: the build before the changes (recorded after the fact, 19.11)

- **Revision before the repair pass**: v99, commit `ba62aa2c` (published 18.11 16:55 UTC; artifact 1795020976-8069).
  The repair pass's changes start after it (v100 = `49a8c02d`, v101 = `ebab5aef`, v102 = `9cf6b27f`).
- **Hardware record (the user's own run, v99)**: GTX 1050 laptop, **on battery**, Chrome (the artifact), D3D11,
  window 1536×819, devicePixelRatio 1.25, no frame limit, Quality Auto → **Medium** (a guess: nothing cached; resolution
  100 %, MSAA 2×, no bloom, shadow map 1024, 4 lamps). Results per route: docs/lba3-performance/HARDWARE/
  2026-11-18-gtx1050-battery/README.md (60 fps in play on every route; arrival stalls behind the black, 116–264 ms).
  Plugged-in (AC) runs: **not yet** — pending the user (Pause → Benchmark: Frame Rates, FPS30.md §6).
  Power, clock and temperature telemetry: **unavailable** from the browser (not collected).
  The earlier Vega 8 results (docs/lba3-performance/HARDWARE/2026-11-16-*) are historical, another machine.
- **Captures before the changes**: the opening's yard and house — captures/opening-tut-2/ (P31's run, the build before
  TUTOR-TARGETS); the characters before CHAR-FORM — captures/char-form/game-before/ and the lookdev `*-before-after`
  pairs (left half); a demanding outdoor scene — the user's benchmark's street and arrival routes (numbers above), and
  captures/char-form/game-before/ (the yard by the town).
- Measurements were kept apart from the Blender builds (CHAR-FORM built in its own worktree; no benchmark ran meanwhile).
