#!/bin/bash
# run one or more tests in sequence: test.sh name1 name2 ...
cd /dev/shm/gate1/out || exit 9
export BOOT_TIMEOUT=900000 TMPDIR=/dev/shm/gate1/tmp GAME_URL=http://localhost:8750/
for t in "$@"; do
  log=/dev/shm/gate1/logs/t-$t${SUFFIX}.log
  echo "=== $t start $(date -u +%FT%TZ)" > "$log"
  s0=$(date +%s)
  timeout 2400 node /dev/shm/gate1/lba3/tests/$t.mjs >> "$log" 2>&1; rc=$?
  echo "=== $t end rc=$rc wall=$(( $(date +%s)-s0 ))s $(date -u +%FT%TZ)" >> "$log"
  echo "$t${SUFFIX} rc=$rc wall=$(( $(date +%s)-s0 ))s $(date -u +%FT%TZ)" >> /dev/shm/gate1/logs/test-status.txt
done
