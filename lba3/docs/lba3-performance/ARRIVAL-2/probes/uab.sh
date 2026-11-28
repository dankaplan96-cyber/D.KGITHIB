#!/bin/bash
# ARRIVAL-2: the unit probe (units.mjs) on the candidate (8195) and the base (8191), each on a quiet machine if possible
P=/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad
cd $P/probe || exit 1
for w in ${2:-cand base}; do
  port=8195; [ "$w" = base ] && port=8191
  OUT=$P/res/u-$w-$1.txt WAIT=${WAIT:-600} GAME_URL=http://localhost:$port/ AREAS=${AREAS:-zeelich,room} MINU=6 $P/probe/quiet.sh timeout 1500 node units.mjs
done
echo finished
