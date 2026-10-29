#!/bin/bash
# PERF-CPU: the same views with a switch off (URL parameter, e.g. &notexarray) and on; pixels compared (diff.py).
#   cd lba2-remaster/docs/lba3-performance/PERF-CPU/probes && OFF='&notexarray' bash shots-ab.sh
#   SPECS='Q=medium ROUTE=street;Q=low ROUTE=street CAM=follow' (views separated by ;) picks the views
export TMPDIR=/dev/shm GAME_URL=${GAME_URL:-http://localhost:8214/}
OFF=${OFF:-&notexarray}; DIR=${DIR:-/dev/shm/perfcpu/shots}; mkdir -p $DIR
SPECS=${SPECS:-Q=medium ROUTE=street;Q=low ROUTE=street;Q=high ROUTE=street;Q=medium ROUTE=street CAM=follow;Q=medium ROUTE=arrival T=4;Q=medium ROUTE=interior}
IFS=';' read -ra LIST <<< "$SPECS"
for spec in "${LIST[@]}"; do
  tag=$(echo "$spec" | tr ' =' '__')
  env $spec QS="$OFF" OUT=$DIR/$tag-off.png timeout 2400 node shot.mjs > $DIR/$tag-off.txt 2>&1
  env $spec OUT=$DIR/$tag-on.png timeout 2400 node shot.mjs > $DIR/$tag-on.txt 2>&1
  echo "$spec: off $(tail -1 $DIR/$tag-off.txt) · on $(tail -1 $DIR/$tag-on.txt) · $(python3 -I diff.py $DIR/$tag-off.png $DIR/$tag-on.png $DIR/$tag-diff.png 2>&1 | tail -1)" >> $DIR/summary.txt
done
