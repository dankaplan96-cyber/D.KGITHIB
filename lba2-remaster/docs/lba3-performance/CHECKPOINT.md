# RENDER-INV checkpoint

Branch `worktree-agent-a92b7c2d617fda38d` (worktree .claude/worktrees/agent-a92b7c2d617fda38d), on top of 9faa1a8.

## Done (committed)
- Map background build (MAP-1) in short slices (mapdraw.js yields) and once per displayed frame (main.js `_inner`);
  LOD / light pool once per displayed frame. Measured: chunks p95 7–10 ms → 0.4–1.1 ms (mapchunks.mjs).
- Benchmark: GPU timer (perf.js GpuTimer, on while benchmarking), arrival route, startup/memory lines, FRAME-1's
  "limited by" estimate (wip patch applied), sim p95.
- Probes in docs/lba3-visual/evidence/RENDER-INV/ (audit, profile, breakdown, mapcost, mapchunks, memory,
  firstuse, shadowparts, benchrun, ab.sh).

## Servers
- Candidate: `cd lba2-remaster && python3 -m http.server 8176`
- Base copy (9faa1a8) for A/B: scratchpad/base/lba2-remaster on 8177 (`git archive 9faa1a8 lba2-remaster | tar -x`).

## Next
1. firstuse.mjs results → audit; A/B breakdown.mjs base vs candidate.
2. Write docs/lba3-performance/PERFORMANCE_AUDIT.md (RENDERING_AUDIT.md = pointer), results JSON, bench steps.
3. Regression tests one at a time with GAME_URL=http://localhost:8176/: stability, transitions, timing, menus, dynres,
   perfbudget, doorcull, occluders, camclear, townlife, opening, chapter1, chapter4, travel, deaths, holomap.
4. BACKLOG (RENDER-INV row), QA.md, STATE.md; merge origin/ccr-adf00ea7-37ebl3; re-run what the merge touches.
