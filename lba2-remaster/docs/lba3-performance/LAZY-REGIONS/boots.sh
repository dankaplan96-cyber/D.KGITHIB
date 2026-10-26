#!/bin/sh
# interleaved startup boots: base (8185) and candidate (8184), N rounds, one JSON line each in $1
OUT=$1; N=${2:-2}
cd $(dirname "$0") || exit 1
i=0
while [ $i -lt $N ]; do
  for u in http://localhost:8185/ http://localhost:8184/; do
    GAME_URL=$u TMPDIR=/dev/shm timeout 900 node boot.mjs 2>&1 | grep '^{' >> "$OUT"
  done
  i=$((i+1))
done
echo DONE >> "$OUT"
