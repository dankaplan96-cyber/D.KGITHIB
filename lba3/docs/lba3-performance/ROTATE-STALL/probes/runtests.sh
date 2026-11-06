#!/bin/bash
# ROTATE-STALL: the regression tests one after another (args: test names); each test's output in
# /dev/shm/rotate/t-<name>.txt, a summary line per test in /dev/shm/rotate/summary.txt. PORT: the worktree's server.
cd "$(dirname "$0")/../../../.." || exit 1
mkdir -p /dev/shm/rotate
export TMPDIR=/dev/shm GAME_URL=http://localhost:${PORT:-8641}/
for t in "$@"; do
  start=$(date +%s)
  timeout 1500 node "tests/$t.mjs" > "/dev/shm/rotate/t-$t.txt" 2>&1
  echo "$t exit $? $(( $(date +%s) - start )) s $(grep -h 'VERDICT' "/dev/shm/rotate/t-$t.txt" | tail -1)" >> /dev/shm/rotate/summary.txt
done
echo done >> /dev/shm/rotate/summary.txt
