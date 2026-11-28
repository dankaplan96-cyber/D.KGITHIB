#!/bin/bash
# PERF-CALLS: regression tests one after another against the snapshot server (8323, snap.sh) — each test's output in
# $D/t-<name>.txt, one summary line per test in $D/summary.txt.   D=/dev/shm/pc-tests bash runtests.sh autoquality timing …
cd "$(dirname "$0")/../../../.." || exit 1
export TMPDIR=/dev/shm GAME_URL=${GAME_URL:-http://localhost:8323/} BOOT_TIMEOUT=${BOOT_TIMEOUT:-900000}
D=${D:-/dev/shm/pc-tests}; mkdir -p "$D"
for t in "$@"; do
  start=$(date +%s)
  case "$t" in
    perfbudget_*) q=${t#perfbudget_}; QUALITIES=$q ROUTES=street timeout 7200 node tests/perfbudget.mjs > "$D/t-$t.txt" 2>&1 ;;
    *) timeout 7200 node "tests/$t.mjs" > "$D/t-$t.txt" 2>&1 ;;
  esac
  echo "$t exit $? $(( $(date +%s) - start )) s $(grep -h 'VERDICT' "$D/t-$t.txt" | tail -1)" >> "$D/summary.txt"
done
echo done >> "$D/summary.txt"
