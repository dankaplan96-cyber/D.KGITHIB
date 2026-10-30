#!/bin/bash
# RENDER-INV: interleaved A/B of one probe: base (the commit before, served on BASE_PORT) and the candidate (served
# on NEW_PORT), ROUNDS times, base first in odd rounds and the candidate first in even ones; one browser at a time.
#   OUT=/path/to/dir ROUNDS=2 bash ab.sh mapcost.mjs [ENV=VAL ...]
probe=$1; shift
here=$(cd "$(dirname "$0")" && pwd)
out=${OUT:-$here/out}; mkdir -p "$out"
base=${BASE_PORT:-8177}; new=${NEW_PORT:-8176}; rounds=${ROUNDS:-2}
name=$(basename "$probe" .mjs)
for r in $(seq 1 "$rounds"); do
  if [ $((r % 2)) -eq 1 ]; then order="base:$base new:$new"; else order="new:$new base:$base"; fi
  for side in $order; do
    n=${side%%:*}; p=${side##*:}
    echo "round $r $n (load $(cut -d' ' -f1-3 /proc/loadavg))"
    env "$@" GAME_URL="http://localhost:$p/" timeout 1500 node "$here/$probe" > "$out/$name-$n-$r.txt" 2>&1
    echo "  exit $? → $out/$name-$n-$r.txt"
  done
done
