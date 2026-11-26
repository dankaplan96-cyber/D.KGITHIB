#!/bin/bash
# AUDIT-FIX: run suites one at a time on the /dev/shm/t983 snapshot; usage: suite.sh <tag> name1 name2 ...
# one retry when a run ends with no verdict (a crash or a timeout), never on a FAIL verdict
cd /dev/shm/t983
export GAME_URL=http://localhost:8983/ BOOT_TIMEOUT=900000 TMPDIR=/dev/shm
D=/dev/shm/t983-logs
tag=$1; shift
for s in "$@"; do
  f=tests/$s.mjs; [ -f "$f" ] || f=$s
  b=$(basename $s .mjs)
  for attempt in 1 2; do
    t0=$(date +%s)
    timeout ${TMO:-5400} node $f > $D/$tag-$b.txt 2>&1
    rc=$?
    dt=$(( $(date +%s) - t0 ))
    v=$(grep -E "^VERDICT" $D/$tag-$b.txt | grep -v "no verdict printed" | tail -1)
    if [ -n "$v" ] || [ $attempt -eq 2 ]; then break; fi
    mv $D/$tag-$b.txt $D/$tag-$b.attempt1.txt
  done
  printf "%s\t%s\t%s\t%s\t%ss\tattempt%s\t%s\n" "$tag" "$b" "$rc" "${v:-NO VERDICT}" "$dt" "$attempt" "$(date -u +%H:%M)" >> $D/results.tsv
done
