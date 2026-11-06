#!/bin/bash
# PERF-CALLS: a snapshot of a commit (default HEAD) served on 8323 (/dev/shm/pc-cand), so tests and shots run on a fixed
# candidate while the worktree keeps changing. The old 8323 server (PID in /dev/shm/pc-cand.pid) is stopped first.
REV=${1:-HEAD}; PORT=${2:-8323}; DIR=/dev/shm/pc-cand$([ "$PORT" = 8323 ] || echo "-$PORT")
cd "$(dirname "$0")/../../../.." || exit 1
[ -f "$DIR.pid" ] && kill "$(cat "$DIR.pid")" 2>/dev/null
rm -rf "$DIR" && mkdir -p "$DIR"
git -C .. archive "$REV" lba3 | tar -x -C "$DIR"
setsid nohup python3 -m http.server "$PORT" --directory "$DIR/lba3" >/dev/null 2>&1 < /dev/null &
echo $! > "$DIR.pid"
echo "serving $(git -C .. rev-parse --short "$REV") on $PORT"
