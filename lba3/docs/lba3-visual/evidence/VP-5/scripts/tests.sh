#!/bin/bash
# regression tests against the after build (8154); cwd = a scratch dir so test screenshots stay out of the repo
ROOT=/home/user/geriatrics-course/.claude/worktrees/agent-a3c80fad9d148cfb7/lba2-remaster
SP=/tmp/claude-0/-home-user-geriatrics-course/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/scratchpad/vp26
export GAME_URL=http://localhost:${PORT:-8154}/
mkdir -p $SP/testcwd $SP/tlogs
cd $SP/testcwd
for t in ${TESTS:-townlife workshop desert-life stability opening menus display transitions}; do
  timeout 3600 node $ROOT/tests/$t.mjs > $SP/tlogs/$t.log 2>&1
  echo "rc $? $t $(grep -cE '^FAIL' $SP/tlogs/$t.log) fails | $(tail -2 $SP/tlogs/$t.log | tr '\n' ' ' | cut -c1-160)"
done
echo TESTSDONE
