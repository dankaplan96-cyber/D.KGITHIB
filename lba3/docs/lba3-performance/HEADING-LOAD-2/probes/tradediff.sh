#!/bin/bash
# HEADING-LOAD-2: a trade-off's price per heading from a q_area.js run with W_SHOTS=1 and one variant: the triangle
# change and the differing pixels of the variant's frame against the as-is frame (the same frozen state).
#   bash tradediff.sh /dev/shm/trade2-otringal island_trees_coarse
cd "$(dirname "$0")"
D=$1; V=$2
grep -E "^heading|^   \[" "$D.txt" | sed -E 's/ · shadow.*\(Δ/ (Δ/; s/ · shadow.*//' | paste - - | cut -c1-200
for k in 0 1 2 3 4 5 6 7; do
  [ -f "$D/h$k-base.png" ] || continue
  echo -n "h$k: "; python3 -I pxdiff.py "$D/h$k-base.png" "$D/h$k-$V.png" "$D/diff-h$k.png"
done
