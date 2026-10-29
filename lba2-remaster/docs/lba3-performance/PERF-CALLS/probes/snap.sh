#!/bin/bash
# PERF-CALLS: a snapshot of a commit (default HEAD) served on 8323 (/dev/shm/pc-cand), so tests and shots run on a fixed
# candidate while the worktree keeps changing. The old 8323 server (PID in /dev/shm/pc-cand.pid) is stopped first.
REV=${1:-HEAD}
cd "$(dirname "$0")/../../../.." || exit 1
[ -f /dev/shm/pc-cand.pid ] && kill "$(cat /dev/shm/pc-cand.pid)" 2>/dev/null
rm -rf /dev/shm/pc-cand && mkdir -p /dev/shm/pc-cand
git -C .. archive "$REV" lba2-remaster | tar -x -C /dev/shm/pc-cand
setsid nohup python3 -m http.server 8323 --directory /dev/shm/pc-cand/lba2-remaster >/dev/null 2>&1 < /dev/null &
echo $! > /dev/shm/pc-cand.pid
echo "serving $(git -C .. rev-parse --short "$REV") on 8323"
