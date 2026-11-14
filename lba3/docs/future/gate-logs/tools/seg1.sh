#!/bin/bash
# rerun one segment with a trace: seg1.sh <segfile> <logname> [LOAD save] ; env passes through (ASSIST, SHOT, KEEP)
cd /dev/shm/gate1/out || exit 9
export BOOT_TIMEOUT=900000 TMPDIR=/dev/shm/gate1/tmp GAME_URL=http://localhost:8750/
log=/dev/shm/gate1/logs/$2.log
echo "=== $2 start $(date -u +%FT%TZ) LOAD=${3:-} ASSIST=${ASSIST:-}" > "$log"
s0=$(date +%s)
if [ -n "$3" ]; then LOAD=$3 TRACE=/dev/shm/gate1/logs/$2.trace timeout 2400 node /dev/shm/gate1/lba3/tests/lib/seg.mjs "$1" >> "$log" 2>&1; rc=$?
else TRACE=/dev/shm/gate1/logs/$2.trace timeout 2400 node /dev/shm/gate1/lba3/tests/lib/seg.mjs "$1" >> "$log" 2>&1; rc=$?; fi
echo "=== $2 end rc=$rc wall=$(( $(date +%s)-s0 ))s" >> "$log"
echo "$2 rc=$rc wall=$(( $(date +%s)-s0 ))s $(date -u +%FT%TZ)" >> /dev/shm/gate1/logs/chain-status.txt
