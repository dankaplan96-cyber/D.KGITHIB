#!/bin/bash
# ARRIVAL-2 A/B: tests/arrival-steps.mjs on the candidate (8195) and the base (8191), each on a quiet machine if possible.
# Usage: ab.sh TAG ORDER   (ORDER "cand base" or "base cand")
P=/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad
cd /home/user/D.KGITHIB/.claude/worktrees/agent-a9cb06280a984a6cd/lba3 || exit 1
for w in ${2:-cand base}; do
  port=8195; [ "$w" = base ] && port=8191
  OUT=$P/res/q-$w-$1.txt GAME_URL=http://localhost:$port/ $P/probe/quiet.sh timeout 1500 node tests/arrival-steps.mjs
done
echo finished
