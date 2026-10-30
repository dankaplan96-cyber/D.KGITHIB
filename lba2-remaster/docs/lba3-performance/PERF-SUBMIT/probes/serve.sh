#!/bin/bash
# PERF-SUBMIT: this worktree's game on 8351 (live). PID in /dev/shm/ps-serve.pid. Snapshots of fixed revisions: snap.sh.
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
[ -f /dev/shm/ps-serve.pid ] && kill "$(cat /dev/shm/ps-serve.pid)" 2>/dev/null
setsid nohup python3 -m http.server 8351 --directory "$ROOT" >/dev/null 2>&1 < /dev/null &
echo $! > /dev/shm/ps-serve.pid
