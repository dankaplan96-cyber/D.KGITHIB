#!/bin/sh
# TITLE-LOAD: the title view, base build against this one, and this one with each visible option (one browser at a time).
#   BASE=http://localhost:8638/ NEW=http://localhost:8637/ OUT=../results SHOTS=<dir> sh titleruns.sh
cd "$(dirname "$0")"
OUT=${OUT:-../results}; SH=${SHOTS:-/tmp/title-shots}
export TMPDIR=${TMPDIR:-/dev/shm}
run() { # name url query vars
  GAME_URL=$2 QUERY=$3 W_VARS=$4 W_SHOTS=1 OUTDIR=$SH/$1 JSONOUT=$OUT/title-$1.json timeout 1500 node run.mjs q_title.js > $OUT/title-$1.txt 2>&1
  echo "$1 done: $(tail -3 $OUT/title-$1.txt | head -1)"
}
run base "$BASE" "" ""
run after "$NEW" "" "fogOff|unplacedShown"
run far150 "$NEW" "&titlefar=150" ""
run lod40 "$NEW" "&titlelod=40" ""
run frame95 "$NEW" "&titler=95&titleh=36" ""
