#!/bin/bash
# AUDIT-FIX chain runner by segment names: chain2.sh <prev-save-tag> seg1 seg2 ... (e.g. 12 12b 13 14), each loading the
# previous one's save; one retry on a crash, none on a step's STOP
cd /dev/shm/t983
export GAME_URL=http://localhost:8983/ BOOT_TIMEOUT=900000 TMPDIR=/dev/shm ASSIST=1
D=/dev/shm/t983-chain; mkdir -p $D
prev=$1; shift
for i in "$@"; do
  f=$(ls tests/playthrough/${i}-*.mjs)
  for attempt in 1 2; do
    echo "=== $i $f load=$D/save-$prev.json attempt $attempt $(date -u +%H:%M:%S)" >> $D/chain.log
    LOAD=$D/save-$prev.json KEEP=$D/save-$i.json STATS=$D/stats-$i.json SHOTS=$D/shots/$i TRACE=$D/trace-$i.txt \
      timeout 5400 node tests/lib/seg.mjs $f > $D/seg-$i.log 2>&1
    rc=$?
    echo "=== $i rc=$rc $(date -u +%H:%M:%S)" >> $D/chain.log
    if [ $rc -eq 0 ]; then break; fi
    cp $D/seg-$i.log $D/seg-$i.attempt$attempt.log
    if grep -q "STOP:" $D/seg-$i.log; then break; fi
  done
  if [ $rc -ne 0 ]; then echo "chain stopped at $i" >> $D/chain.log; exit 1; fi
  prev=$i
done
echo "chain done $* $(date -u +%H:%M:%S)" >> $D/chain.log
