#!/bin/bash
# SHADE-COST: the round's tests one after another (one browser at a time). Usage: PORT=8742 OUT=<dir> runtests.sh [tests…]
cd "$(dirname "$0")/../../../.."
OUT=${OUT:-/tmp/shade-tests}; mkdir -p "$OUT"
T=${*:-drawcalls perfbudget display chapter1 transitions camfollow worldfit well-town travel zislands desert-life opening house combat}
for t in $T; do
  TMPDIR=/dev/shm GAME_URL=http://localhost:${PORT:-8742}/ timeout 1500 node tests/$t.mjs > "$OUT/$t.txt" 2>&1
  echo "$t exit $? $(grep -m1 '^VERDICT' "$OUT/$t.txt")"
done
