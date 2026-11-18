#!/bin/bash
# AUDIT-FIX chain runner (from RELEASE-AUDIT-v96's chain-run.sh): segments FROM..TO on the /dev/shm/t983 snapshot,
# each loading the previous segment's save; no override files (the harness as committed); one retry on a crash
cd /dev/shm/t983
export GAME_URL=http://localhost:8983/ BOOT_TIMEOUT=900000 TMPDIR=/dev/shm ASSIST=1
D=/dev/shm/t983-chain; mkdir -p $D
FROM=${FROM:-1}; TO=${TO:-14}
for n in $(seq $FROM $TO); do
  i=$(printf "%02d" $n)
  f=$(ls tests/playthrough/${i}-*.mjs)
  prev=$(printf "%02d" $((n-1)))
  LOADARG=""
  [ "$i" != "01" ] && LOADARG="${LOADFILE:-$D/save-$prev.json}"
  LOADFILE=""
  for attempt in 1 2; do
    echo "=== $i $f load=$LOADARG attempt $attempt $(date -u +%H:%M:%S)" >> $D/chain.log
    LOAD=$LOADARG KEEP=$D/save-$i.json STATS=$D/stats-$i.json SHOTS=$D/shots/$i TRACE=$D/trace-$i.txt \
      timeout 5400 node tests/lib/seg.mjs $f > $D/seg-$i.log 2>&1
    rc=$?
    echo "=== $i rc=$rc $(date -u +%H:%M:%S)" >> $D/chain.log
    if [ $rc -eq 0 ]; then break; fi
    cp $D/seg-$i.log $D/seg-$i.attempt$attempt.log
    if grep -q "STOP:" $D/seg-$i.log; then break; fi   # a real step failure: no retry
  done
  if [ $rc -ne 0 ]; then echo "chain stopped at $i" >> $D/chain.log; exit 1; fi
done
echo "chain done $FROM-$TO $(date -u +%H:%M:%S)" >> $D/chain.log
