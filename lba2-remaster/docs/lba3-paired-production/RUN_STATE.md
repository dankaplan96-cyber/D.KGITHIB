# Paired production: run state (coordinator-only file)

Started 2026-10-28 by the main session (coordinator), from the user's pack "LBA3_Whole_Game_Paired_Agents".

Baseline: branch ccr-adf00ea7-37ebl3 at 8141e42 (0.34.0 = desktop build 241 + AUDIO-BUFFER e0d28f4, not yet built)
Target hardware: the user's AMD Vega 8 laptop, 1366×768, 60 Hz (benchmarks pasted by the user; nothing here is Vega 8 evidence: this container renders with SwiftShader)

Current group / pair: none yet (waiting for the two slots). The two active workers come from before this workflow, and both count toward the cap of two:
  1. PERF-HIGH (lba3-frame-pacing-hardware-engineer, carrying the lba3-60fps-engineer brief): src/engine/** (except audio.js), bench, perf tests, docs/lba3-performance/**
  2. CH1-LONGER (lba3-adventure-design-researcher): src/game/story/** chapter 1 (prologue.js / chapter1.js / their text), tests/playthrough 01–05 + chapter tests; WORKLIST #41.
     This counts as Group 1's quest-design work (Round 2, partial); Round 2 for G1 resumes after it is integrated.

Order of work (each group runs Round 1 → 4, with an integration gate after each pair):
  G1 Citadel ch.1–2 (house, well, street, harbour, office/control/projoffice, cellar, lighthouse, cliffs) ← the user's own play area: highest priority
  G2 Zeelich (zeelich, workshop, lighttop, upper) ch.3, ch.9
  G3 Desert Island (desert, butemple, condA, Kesh, school, wtent) ch.4–5
  G4 Hamalayi (hamalayi, obsv) ch.6–7
  G5 ch.8 evacuation + ch.10 network (valves, all regions revisited)
  G6 ch.11 shell (c3shaft) + ch.12 core (c3core) + epilogue (home)
  G7 optional places: 11 shuttle islands, asylum, Bù maze, spaceport, arena, underground

Next exact action: when PERF-HIGH and CH1-LONGER have both returned and been integrated, start G1 Round 1 (lba3-character-art + lba3-camera-director) with the ownership in OWNERSHIP.md.

User rules that bind every worker: no spoilers to the user (they play only ch.1–2; agents verify ch.3–12; only ch.1–2 images go to the user);
story rules (Twinsen protagonist, Zoé active, Arthur has agency, no Earth-style night, no sequel promise, FunFrock dead, Vesk villain,
Twinsun ≠ Zeelich); no original LBA assets in the repo; at most 2 agents; small focused tasks, 1–3 relevant tests per worker,
full suite at night; merge --no-ff and check the merged tree matches the tested one; [build] only for user-facing versions.
