#!/bin/bash
# RELEASE-AUDIT-v96 suite lane: node tests/<name>.mjs one at a time; one retry when a run ends with no verdict
# (a timeout or a crash), never on a FAIL verdict. usage: run.sh name1 name2 ...   (ENV passes through)
cd /dev/shm/t986
export GAME_URL=http://localhost:8986/ BOOT_TIMEOUT=900000 TMPDIR=/dev/shm
D=/dev/shm/t986-audit/suite
for s in "$@"; do
  f=tests/$s.mjs; [ -f "$f" ] || f=$s
  tag=$(basename $s .mjs)
  for attempt in 1 2; do
    t0=$(date +%s)
    timeout ${TMO:-3600} node $f > $D/log-$tag.txt 2>&1
    rc=$?
    dt=$(( $(date +%s) - t0 ))
    v=$(grep -E "^VERDICT" $D/log-$tag.txt | tail -1)
    fc=$(grep -E "^functional:" $D/log-$tag.txt | tail -1)
    if [ -n "$v" ] || [ $attempt -eq 2 ]; then break; fi
    mv $D/log-$tag.txt $D/log-$tag.attempt1.txt
  done
  printf "%s\t%s\t%s\t%s\t%ss\tattempt%s\t%s\n" "$tag" "$rc" "${v:-NO VERDICT}" "$fc" "$dt" "$attempt" "$(date -u +%H:%M)" >> $D/results.tsv
done
