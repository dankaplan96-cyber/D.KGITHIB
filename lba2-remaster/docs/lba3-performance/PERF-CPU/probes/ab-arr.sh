#!/bin/bash
# PERF-CPU: draw calls and triangles with the texture arrays off / as shipped (every piece at its old place in the order) /
# every foldable piece unordered (`exact = false`, ?arrall), in 16-frame blocks in one browser (cpu.mjs AB). Calls are exact; ms relative.
#   cd lba2-remaster/docs/lba3-performance/PERF-CPU/probes && bash ab-arr.sh
export TMPDIR=/dev/shm GAME_URL=${GAME_URL:-http://localhost:8214/}
OUT=${OUT:-/dev/shm/perfcpu/ab-arr2.txt}
OFF="game.drawBatch.arrays = false; game.drawBatch.exact = true; game.drawBatch.reset()"
ON="game.drawBatch.arrays = true; game.drawBatch.exact = true; game.drawBatch.reset()"
ALL="game.drawBatch.arrays = true; game.drawBatch.exact = false; game.drawBatch.reset()"
while IFS= read -r spec; do
  [ -z "$spec" ] && continue
  env $spec FRAMES=${FRAMES:-64} AB_BLOCK=16 AB_A="$OFF" AB_B="$ON" timeout 5000 node cpu.mjs >> $OUT 2>&1
  env $spec FRAMES=${FRAMES:-64} AB_BLOCK=16 AB_A="$ALL" AB_B="$ON" timeout 5000 node cpu.mjs >> $OUT 2>&1
done <<< "${SPECS:-Q=low BATTERY=1 CAM=follow ROUTE=street
Q=low BATTERY=1 ROUTE=arrival
Q=medium CAM=follow ROUTE=street}"
