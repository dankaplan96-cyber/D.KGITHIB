#!/bin/bash
# RENDER-INV: regions.mjs at Medium and High, results in results/regions-<q>.json, one after the other.
here=$(cd "$(dirname "$0")" && pwd)
for q in ${QUALITIES:-medium high}; do
  GAME_URL=${GAME_URL:-http://localhost:8176/} QUALITY=$q timeout 5400 node "$here/regions.mjs" > "$here/results/regions-$q.json" 2> "$here/results/regions-$q.err"
  echo "$q exit $?"
done
