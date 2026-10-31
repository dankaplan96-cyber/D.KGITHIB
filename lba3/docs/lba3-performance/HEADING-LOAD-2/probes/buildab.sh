#!/bin/bash
# HEADING-LOAD-2: the build A/B per area and heading — base (two runs) against this build, people and particles left out
# of all three frames (q_area.js W_VARS=no_characters+no_particles/blobs, images in $OUT/<tag>-<area>/)
#   OUT=/dev/shm bash buildab.sh before before2 final zeelich desert hamalayi isle_otringal isle_knartas
cd "$(dirname "$0")"
OUT=${OUT:-/dev/shm}; A=$1; A2=$2; B=$3; shift 3
for a in "$@"; do
  for k in 0 1 2 3 4 5 6 7; do
    f=h$k-no_characters_no_particles_blobs.png
    echo -n "$a $((k * 45))°: "; python3 -I pxdiff.py "$OUT/$A-$a/$f" "$OUT/$B-$a/$f" - "$OUT/$A2-$a/$f" | tr '\n' ' '; echo
  done
done
