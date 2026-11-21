#!/bin/bash
# ARRIVAL-2: Zeelich then the return to Citadel, frame by frame (q_look.js: the ARRIVAL-STEPS arrival probe + why pieces
# leave their batches), on the candidate (8195) and the base (8191). Usage: cab.sh TAG "cand base"
P=/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad
cd /home/user/D.KGITHIB/.claude/worktrees/agent-a9cb06280a984a6cd/lba3/docs/lba3-performance/ARRIVAL-STEPS/probes || exit 1
for w in ${2:-cand base}; do
  port=8195; [ "$w" = base ] && port=8191
  OUT=$P/res/c-$w-$1.txt WAIT=${WAIT:-600} GAME_URL=http://localhost:$port/ Q=medium W_SEQ=${SEQ:-zeelich,citadel} W_CYCLES=1 W_SECS=1 W_FLUSH=${FLUSH:-1} $P/probe/quiet.sh timeout 2400 node run.mjs $P/probe/q_look.js
done
echo finished
