#!/bin/bash
# PERF-CPU: shots of one view with URL variants (VARS, ; separated, first = reference), each diffed against the first
#   SPEC="Q=medium ROUTE=interior" VARS="&notexarray;&x=1" bash shots-var.sh   (then python3 -I patches.py on the pair)
cd "$(dirname "$0")"
export TMPDIR=/dev/shm GAME_URL=${GAME_URL:-http://localhost:8214/}
D=${D:-/dev/shm/perfcpu/shots6}; mkdir -p $D
SPEC=${SPEC:-Q=medium ROUTE=interior}
VARS=${VARS:-&notexarray;&x=1}
tag=$(echo "$SPEC" | tr ' =' '__')
IFS=';' read -ra L <<< "$VARS"
i=0
for v in "${L[@]}"; do
  env $SPEC QS="$v" OUT=$D/$tag-$i.png timeout 2400 node shot.mjs > $D/$tag-$i.txt 2>&1
  if [ $i -gt 0 ]; then
    echo "$SPEC [${L[0]}] $(tail -1 $D/$tag-0.txt) vs [$v] $(tail -1 $D/$tag-$i.txt): $(python3 -I diff.py $D/$tag-0.png $D/$tag-$i.png $D/$tag-d$i.png 2>&1 | tail -1)" >> $D/summary.txt
  fi
  i=$((i+1))
done
