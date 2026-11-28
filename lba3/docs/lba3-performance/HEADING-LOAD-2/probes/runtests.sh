#!/bin/bash
# HEADING-LOAD(-2): the listed tests one at a time against GAME_URL (default this worktree's server on 8843); a line per
# test in $LOG (verdict lines grepped from its output, kept in $OUT/<test>.txt)
#   bash runtests.sh drawcalls perfbudget display ...
cd "$(dirname "$0")/../../../.."
URL=${GAME_URL:-http://localhost:8843/}; LOG=${LOG:-/dev/shm/hl2-tests.log}; OUT=${OUT:-/dev/shm}
for t in "$@"; do
  echo "=== $t $(date +%T)" >> "$LOG"
  TMPDIR=/dev/shm GAME_URL="$URL" timeout 1500 node "tests/$t.mjs" > "$OUT/hl-test-$t.txt" 2>&1
  echo "exit $? $(date +%T) :: $(grep -iE 'PASS|FAIL' "$OUT/hl-test-$t.txt" | tail -2 | tr '\n' ' ')" >> "$LOG"
done
echo ALLDONE >> "$LOG"
