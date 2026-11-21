#!/bin/bash
# SHADE-COST: the probes one after another (one browser at a time). Usage: PORT=8742 OUT=<dir> queue.sh q_ab q_class ...
# Medium, battery profile, 1366x768, the benchmark's areas not built (the street and the house's surroundings are Citadel).
cd "$(dirname "$0")"
OUT=${OUT:-/tmp/shade}; mkdir -p "$OUT"
for q in "$@"; do
  TMPDIR=/dev/shm GAME_URL=http://localhost:${PORT:-8742}/ Q=medium BATTERY=1 NOPREP=1 W_SHOTS=${SHOTS:-} OUTDIR="$OUT/img-$q" timeout 1500 node run.mjs "$q.js" > "$OUT/$q.txt" 2>&1
  echo "$q exit $?"
done
