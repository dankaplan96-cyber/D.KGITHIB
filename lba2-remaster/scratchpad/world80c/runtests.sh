#!/bin/bash
# usage: runtests.sh <port> <outdir> <test> [test...]   (one at a time; tests run from the base dir given by $BASE)
PORT=$1; OUT=$2; shift 2
BASE=${BASE:-/home/user/geriatrics-course/.claude/worktrees/agent-a732bb5d1d8fddeac/lba2-remaster}
mkdir -p "$OUT"
for t in "$@"; do
  s=$(date +%s)
  ( cd "$BASE" && GAME_URL=http://localhost:$PORT/ TMPDIR=/dev/shm timeout 3000 node tests/$t.mjs > "$OUT/$t.log" 2>&1 )
  rc=$?
  v=$(grep -m1 '^VERDICT' "$OUT/$t.log")
  echo "$t rc=$rc $(( $(date +%s) - s ))s $v" >> "$OUT/summary.txt"
done
echo DONE >> "$OUT/summary.txt"
