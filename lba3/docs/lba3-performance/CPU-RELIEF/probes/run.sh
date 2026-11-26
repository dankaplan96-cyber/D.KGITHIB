#!/bin/bash
# CPU-RELIEF: run a probe (SCRIPT, default sections.mjs here; or a path) with the environment given, output to OUT
# (default /dev/shm/cpurelief/<TAG>.txt).
#   TAG=base JOBS=street:medium,zeelich:medium bash run.sh
#   TAG=alloc SCRIPT=../../PERF-CPU/probes/alloc.mjs Q=medium ROUTE=street FRAMES=120 bash run.sh
cd "$(dirname "$0")"
mkdir -p /dev/shm/cpurelief
export TMPDIR=/dev/shm GAME_URL=${GAME_URL:-http://localhost:8347/}
OUT=${OUT:-/dev/shm/cpurelief/${TAG:-run}.txt}
timeout ${LIMIT:-3000} node ${SCRIPT:-sections.mjs} > "$OUT" 2>&1
echo "exit $? -> $OUT"
