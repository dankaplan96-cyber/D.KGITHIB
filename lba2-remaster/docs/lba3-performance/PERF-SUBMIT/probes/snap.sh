#!/bin/bash
# PERF-SUBMIT: a snapshot of a commit served on its own port (default HEAD on 8353), so A/B runs and tests use fixed
# builds while the worktree changes.   snap.sh <rev> <port>   (base: snap.sh 2a6389a 8352)
REV=${1:-HEAD}; PORT=${2:-8353}; DIR=/dev/shm/ps-snap-$PORT
cd "$(dirname "$0")/../../../.." || exit 1
[ -f "$DIR.pid" ] && kill "$(cat "$DIR.pid")" 2>/dev/null
rm -rf "$DIR" && mkdir -p "$DIR"
git -C .. archive "$REV" lba2-remaster | tar -x -C "$DIR"
setsid nohup python3 -m http.server "$PORT" --directory "$DIR/lba2-remaster" >/dev/null 2>&1 < /dev/null &
echo $! > "$DIR.pid"
echo "serving $(git -C .. rev-parse --short "$REV") on $PORT"
