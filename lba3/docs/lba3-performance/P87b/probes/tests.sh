#!/bin/bash
# P87b: the four regression tests, one browser at a time, against the candidate (port 8212)
P=/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad
cd /home/user/D.KGITHIB/.claude/worktrees/agent-a770eb3895d11b933/lba3 || exit 1
for t in ${TESTS:-merge arrival-steps lazyregions travel}; do
  echo "load before $(cut -d' ' -f1-3 /proc/loadavg); other gpu-processes $(pgrep -fc 'type=gpu-process')" > "$P/res/test-$t.txt"
  GAME_URL=http://localhost:${PORT:-8212}/ timeout 3000 node tests/$t.mjs >> "$P/res/test-$t.txt" 2>&1
  echo "exit $? load after $(cut -d' ' -f1-3 /proc/loadavg)" >> "$P/res/test-$t.txt"
done
echo all done > "$P/res/tests.done"
