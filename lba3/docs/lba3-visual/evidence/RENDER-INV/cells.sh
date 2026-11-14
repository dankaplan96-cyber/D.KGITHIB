#!/bin/bash
# RENDER-INV: who.mjs at several draw-batch cell sizes (CELL=-1: batches off).
#   VIEWS=street,harbour,door bash cells.sh medium -1 48 96 128
here=$(cd "$(dirname "$0")" && pwd); q=$1; shift
for c in "$@"; do
  GAME_URL=${GAME_URL:-http://localhost:8176/} QUALITY=$q CELL=$c TOP=0 timeout 1200 node "$here/who.mjs" > "$here/results/who-$q-cell$c${TAG:-}.json" 2>&1
  python3 "$here/whosum.py" "$here/results/who-$q-cell$c${TAG:-}.json"
done
