#!/bin/sh
# TITLE-LOAD: the round's required suites, one browser at a time; a verdict line each into OUT
#   GAME_URL=http://localhost:8637/ OUT=../results/tests.txt sh runtests.sh [suite ...]
cd "$(dirname "$0")/../../../.."
OUT=${OUT:-docs/lba3-performance/TITLE-LOAD/results/tests.txt}
LOG=${LOG:-/dev/shm/title-load-tests}
mkdir -p "$LOG"
SUITES=${*:-"opening display menus perfbudget drawcalls transitions timing chapter1 travel zislands autoquality-game camfollow"}
for t in $SUITES; do
  s=$(date +%s)
  TMPDIR=/dev/shm timeout 1500 node tests/$t.mjs > "$LOG/$t.log" 2>&1; rc=$?
  v=$(grep -m1 '^VERDICT' "$LOG/$t.log" || echo "no verdict (exit $rc)")
  echo "$t: $v ($(( $(date +%s) - s )) s)" >> "$OUT"
done
