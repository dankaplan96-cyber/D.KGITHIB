#!/bin/bash
# P87b: run a page probe with the ARRIVAL-STEPS runner. Usage: run.sh PORT OUTNAME PROBE.js  (env passes through: NOPREP, W_*)
P=/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad
cd /home/user/D.KGITHIB/.claude/worktrees/agent-a770eb3895d11b933/lba3/docs/lba3-performance/ARRIVAL-STEPS/probes || exit 1
echo "load before $(cut -d' ' -f1-3 /proc/loadavg); other gpu-processes $(pgrep -fc 'type=gpu-process')" > "$P/res/$2.txt"
GAME_URL=http://localhost:$1/ Q=${Q:-medium} timeout ${TO:-2400} node run.mjs "$3" >> "$P/res/$2.txt" 2>&1
echo "exit $? load after $(cut -d' ' -f1-3 /proc/loadavg)" >> "$P/res/$2.txt"
