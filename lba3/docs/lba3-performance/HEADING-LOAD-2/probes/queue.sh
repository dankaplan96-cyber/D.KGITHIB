#!/bin/bash
# HEADING-LOAD-2: the A/B probes, one browser at a time, against GAME_URL; each run's text in $OUT/<name>.txt and a line in
# $OUT/queue.log. Lines of $1 (a plan file): <name> <probe> [W_X=… …] (the W_ settings for that run).
cd "$(dirname "$0")"
OUT=${OUT:-/dev/shm}
while read -r name probe rest; do
  [ -z "$name" ] && continue; [[ "$name" == \#* ]] && continue
  echo "=== $name $(date +%T)" >> "$OUT/queue.log"
  env TMPDIR=/dev/shm Q=medium AUTO=1 BATTERY=1 NOPREP=1 OUTDIR="$OUT/$name" $rest timeout 1500 node run.mjs "$probe" > "$OUT/$name.txt" 2>&1
  echo "exit $? $(date +%T) :: $(tail -1 "$OUT/$name.txt" | cut -c1-200)" >> "$OUT/queue.log"
done < "$1"
echo ALLDONE >> "$OUT/queue.log"
