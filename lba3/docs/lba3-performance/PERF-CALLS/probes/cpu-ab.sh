#!/bin/bash
# PERF-CALLS: PERF-CPU's cpu.mjs on two servers at once (the base build and the candidate, the same load on both),
# ROUNDS times; each run's "frame work" line and sections in $D. SwiftShader main-thread ms: relative only.
#   ROUTE=street Q=medium BATTERY=1 FRAMES=120 ROUNDS=2 A=http://localhost:8322/ B=http://localhost:8323/ bash cpu-ab.sh
cd "$(dirname "$0")/../../PERF-CPU/probes"
export TMPDIR=/dev/shm
D=${D:-/dev/shm/pc-cpu}; mkdir -p "$D"
A=${A:-http://localhost:8322/}; B=${B:-http://localhost:8323/}
for k in $(seq 1 "${ROUNDS:-2}"); do
  GAME_URL="$A" timeout 3000 node cpu.mjs > "$D/${ROUTE:-street}-A$k.txt" 2>&1 &
  GAME_URL="$B" timeout 3000 node cpu.mjs > "$D/${ROUTE:-street}-B$k.txt" 2>&1
  wait
  echo "round $k A: $(grep 'frame work' "$D/${ROUTE:-street}-A$k.txt")" >> "$D/summary.txt"
  echo "round $k B: $(grep 'frame work' "$D/${ROUTE:-street}-B$k.txt")" >> "$D/summary.txt"
done
echo done >> "$D/summary.txt"
