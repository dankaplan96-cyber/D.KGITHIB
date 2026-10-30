#!/bin/bash
# PERF-CPU: every runtime switch of PERF-CPU off (A) vs on (B), in blocks of 16 frames in one browser (cpu.mjs AB_BLOCK),
# on three views. The changes without a switch (garbage, HUD, keys, merged joints) are in both A and B.
#   cd lba3/docs/lba3-performance/PERF-CPU/probes && bash ab-all.sh   (GAME_URL defaults to :8214)
export TMPDIR=/dev/shm GAME_URL=${GAME_URL:-http://localhost:8214/}
OFF="window.__mw.cached = false; game.drawBatch.fast = false; game.shadowCull.fast = false; game.shadowCull.shadowsOn = () => true; game.farCull.anim.on = false"
ON="window.__mw.cached = true; game.drawBatch.fast = true; game.shadowCull.fast = true; game.shadowCull.shadowsOn = () => game.renderer.renderer.shadowMap.enabled; game.farCull.anim.on = true"
OUT=${OUT:-/dev/shm/perfcpu/ab-all.txt}
for spec in "Q=low BATTERY=1 CAM=follow ROUTE=street" "Q=medium CAM=follow ROUTE=street" "Q=low BATTERY=1 ROUTE=combat"; do
  env $spec FRAMES=${FRAMES:-224} AB_BLOCK=16 AB_A="$OFF" AB_B="$ON" timeout 5000 node cpu.mjs >> $OUT 2>&1
done
