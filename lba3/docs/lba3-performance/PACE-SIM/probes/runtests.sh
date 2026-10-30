#!/bin/sh
# PACE-SIM: the regression tests, one browser at a time, each under a timeout; a log per test and a verdict line each.
#   PORT=8747 OUT=<dir> sh runtests.sh combat anim-combat …
cd "$(dirname "$0")/../../../.." || exit 1
PORT=${PORT:-8747}; OUT=${OUT:-/dev/shm/pacesim-tests}; mkdir -p "$OUT"
for t in "$@"; do
  start=$(date +%s)
  TMPDIR=/dev/shm GAME_URL=http://localhost:$PORT/ timeout 1500 node tests/$t.mjs > "$OUT/$t.log" 2>&1
  code=$?
  v=$(grep -E "^VERDICT" "$OUT/$t.log" | tail -1)
  echo "$t exit=$code $(( $(date +%s) - start ))s ${v:-no verdict}" | tee -a "$OUT/summary.txt"
done
