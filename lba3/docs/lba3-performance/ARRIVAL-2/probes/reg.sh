#!/bin/bash
# ARRIVAL-2: the regression suites on the candidate (8195), one browser at a time
P=/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad
cd /home/user/D.KGITHIB/.claude/worktrees/agent-a9cb06280a984a6cd/lba3 || exit 1
for t in ${@:-merge travel lazyregions}; do
  OUT=$P/res/reg-$t.txt WAIT=${WAIT:-300} GAME_URL=http://localhost:8195/ $P/probe/quiet.sh timeout 2400 node tests/$t.mjs
  echo "$t: $(grep -m1 '^VERDICT' $P/res/reg-$t.txt)"
done
echo finished
