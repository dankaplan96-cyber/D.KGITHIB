#!/bin/bash
# PERF-CPU: the regression tests one after another; each test's output in /dev/shm/perfcpu/t-<name>.txt, a summary line
# per test in /dev/shm/perfcpu/summary.txt
cd /home/user/geriatrics-course/.claude/worktrees/agent-a194390c66326c1d7/lba2-remaster || exit 1
export TMPDIR=/dev/shm GAME_URL=http://localhost:8213/
for t in "$@"; do
  start=$(date +%s)
  case "$t" in
    perfbudget_*) q=${t#perfbudget_}; QUALITIES=$q ROUTES=street timeout 5400 node tests/perfbudget.mjs > /dev/shm/perfcpu/t-$t.txt 2>&1 ;;
    *) timeout 5400 node tests/$t.mjs > /dev/shm/perfcpu/t-$t.txt 2>&1 ;;
  esac
  echo "$t exit $? $(( $(date +%s) - start )) s $(grep -h 'VERDICT' /dev/shm/perfcpu/t-$t.txt | tail -1)" >> /dev/shm/perfcpu/summary.txt
done
echo done >> /dev/shm/perfcpu/summary.txt
