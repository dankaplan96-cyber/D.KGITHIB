#!/bin/bash
# HEADING-LOAD-2: q_area.js for each area given, one browser at a time, against GAME_URL; each area's text in
# $OUT/<tag>-<area>.txt (TAG: before / after …). Extra W_* settings pass through (W_VARS, W_SHOTS, W_IVBY …).
#   GAME_URL=http://localhost:8932/ TAG=before OUT=/dev/shm bash sweep.sh zeelich desert hamalayi isle_otringal isle_knartas
cd "$(dirname "$0")"
OUT=${OUT:-/dev/shm}; TAG=${TAG:-run}
for a in "$@"; do
  echo "=== $a $(date +%T)" >> "$OUT/$TAG.log"
  TMPDIR=/dev/shm Q=medium AUTO=1 BATTERY=1 NOPREP=1 W_FAST=${W_FAST:-1} W_AREA="$a" W_TOP=${W_TOP:-14} W_IVBY=${W_IVBY:-1} \
    OUTDIR="${OUTDIR:-$OUT/$TAG-$a}" timeout 1500 node run.mjs q_area.js > "$OUT/$TAG-$a.txt" 2>&1
  echo "exit $? $(date +%T)" >> "$OUT/$TAG.log"
done
echo ALLDONE >> "$OUT/$TAG.log"
