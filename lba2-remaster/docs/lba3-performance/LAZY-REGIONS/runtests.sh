#!/bin/sh
# run tests one at a time (R7 verdict policy), each log in $OUTDIR/<name>.log, a summary line per test in $OUTDIR/summary.txt
# usage: runtests.sh OUTDIR test1 test2 ...   (names without .mjs; playthrough segments as playthrough/01-...)
OUTDIR=$1; shift
mkdir -p "$OUTDIR"
cd "$OUTDIR" || exit 1
T=$(git rev-parse --show-toplevel)/lba2-remaster/tests
for t in "$@"; do
  name=$(echo "$t" | tr '/' '_')
  start=$(date +%s)
  GAME_URL=${GAME_URL:-http://localhost:8184/} TMPDIR=/dev/shm REGIONS_LOG=1 timeout 3600 node "$T/$t.mjs" > "$OUTDIR/$name.log" 2>&1
  rc=$?
  end=$(date +%s)
  v=$(grep -a "^VERDICT" "$OUTDIR/$name.log" | tail -1)
  r=$(grep -ac "^REGIONS" "$OUTDIR/$name.log")
  echo "$t rc=$rc $((end-start))s regions-on-access=$r $v" >> "$OUTDIR/summary.txt"
done
echo DONE >> "$OUTDIR/summary.txt"
