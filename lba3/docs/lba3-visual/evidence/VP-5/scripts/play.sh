#!/bin/bash
# player-input playthrough 01–06 chained through real saves (Esc → Save & quit → Continue), ASSIST as QA.md
ROOT=/home/user/geriatrics-course/.claude/worktrees/agent-a3c80fad9d148cfb7/lba2-remaster
SP=/tmp/claude-0/-home-user-geriatrics-course/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/scratchpad/vp26
export GAME_URL=http://localhost:${PORT:-8154}/
mkdir -p $SP/testcwd $SP/plogs
cd $SP/testcwd
prev=""
for s in ${SEGS:-01-prologue-surface 02-prologue-cave 03-project-a 04-project-valves 05-project-b 06-zeelich}; do
  n=${s%%-*}
  A=""; if [ "$n" = 04 ] || [ "$n" = 06 ]; then A=1; fi
  if [ -n "$prev" ]; then L=$SP/play-$prev.json; else L=${START:-}; fi
  LOAD=$L KEEP=$SP/play-$n.json ASSIST=$A timeout 7200 node $ROOT/tests/lib/seg.mjs $ROOT/tests/playthrough/$s.mjs > $SP/plogs/$s.log 2>&1
  rc=$?
  echo "rc $rc $s | $(grep -E 'STOP|deaths|ISO assists:|errors' $SP/plogs/$s.log | tr '\n' ' ' | cut -c1-300)"
  [ $rc -ne 0 ] && break
  prev=$n
done
echo PLAYDONE
