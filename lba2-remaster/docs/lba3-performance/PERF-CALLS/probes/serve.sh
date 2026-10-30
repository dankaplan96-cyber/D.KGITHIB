#!/bin/bash
# PERF-CALLS: this worktree's game on 8321, the base build (unpacked to /dev/shm/pc-base) on 8322; PIDs in /dev/shm/pc-serve.pids
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
setsid nohup python3 -m http.server 8321 --directory "$ROOT" >/dev/null 2>&1 < /dev/null &
echo $! > /dev/shm/pc-serve.pids
if [ -d /dev/shm/pc-base/lba2-remaster ]; then
  setsid nohup python3 -m http.server 8322 --directory /dev/shm/pc-base/lba2-remaster >/dev/null 2>&1 < /dev/null &
  echo $! >> /dev/shm/pc-serve.pids
fi
