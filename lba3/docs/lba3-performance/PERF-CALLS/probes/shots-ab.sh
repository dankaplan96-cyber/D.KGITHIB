#!/bin/bash
# PERF-CALLS: the same view on two servers (A: the base build, B: this one), or two URL variants, diffed.
#   VIEWS="AREA=desert;AREA=zeelich YAW=2;ROUTE=street CAM=follow" A=http://localhost:8322/ B=http://localhost:8321/ \
#   QA= QB= Q=medium BATTERY=1 D=/dev/shm/pc-shots bash shots-ab.sh
# Each view: "<label>: A calls … · B calls … · diff.py · patches.py" in $D/summary.txt
cd "$(dirname "$0")"
export TMPDIR=/dev/shm
D=${D:-/dev/shm/pc-shots}; mkdir -p "$D"
A=${A:-http://localhost:8322/}; B=${B:-http://localhost:8321/}
IFS=';' read -ra L <<< "${VIEWS:-AREA=desert}"
for v in "${L[@]}"; do
  tag=$(echo "$v" | tr ' =.' '___')
  env $v GAME_URL="$A" QS="$QA" OUT="$D/$tag-A.png" timeout 2400 node areashot.mjs > "$D/$tag-A.txt" 2>&1
  env $v GAME_URL="$B" QS="$QB" OUT="$D/$tag-B.png" timeout 2400 node areashot.mjs > "$D/$tag-B.txt" 2>&1
  echo "$v · A $(grep '^{' "$D/$tag-A.txt" | tail -1) · B $(grep '^{' "$D/$tag-B.txt" | tail -1) · $(python3 -I ../../PERF-CPU/probes/diff.py "$D/$tag-A.png" "$D/$tag-B.png" "$D/$tag-d.png" 2>&1 | tail -1) · $(python3 -I ../../PERF-CPU/probes/patches.py "$D/$tag-A.png" "$D/$tag-B.png" 2>&1 | tail -1)" >> "$D/summary.txt"
done
echo done >> "$D/summary.txt"
