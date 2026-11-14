#!/bin/bash
# chain playthrough segments: chain.sh <startNN> <endNN> [prevSave]
# env SUFFIX appended to log names; ASSIST passed through to seg.mjs
# a harness workaround module /dev/shm/gate1/tools/segNN-gate.mjs, when present, replaces segment NN (logged as SRC=)
cd /dev/shm/gate1/out || exit 9
export BOOT_TIMEOUT=900000 TMPDIR=/dev/shm/gate1/tmp GAME_URL=http://localhost:8750/
prev="$3"
if [ -n "$prev" ] && [ "${prev:0:1}" != "/" ]; then prev=/dev/shm/gate1/saves/$prev.json; fi
for f in /dev/shm/gate1/lba3/tests/playthrough/*.mjs; do
  n=$(basename "$f" | cut -c1-2); name=$(basename "$f" .mjs)
  if [ "$((10#$n))" -lt "$((10#$1))" ] || [ "$((10#$n))" -gt "$((10#$2))" ]; then continue; fi
  log=/dev/shm/gate1/logs/pt-$name${SUFFIX}.log
  src=$f; if [ -f /dev/shm/gate1/tools/seg$n-gate.mjs ]; then src=/dev/shm/gate1/tools/seg$n-gate.mjs; fi
  echo "=== $name start $(date -u +%FT%TZ) LOAD=$prev ASSIST=${ASSIST:-} SRC=$src" > "$log"
  s0=$(date +%s)
  if [ -n "$prev" ]; then
    LOAD=$prev KEEP=/dev/shm/gate1/saves/$name${SUFFIX}.json TRACE=/dev/shm/gate1/logs/pt-$name${SUFFIX}.trace timeout 2400 node /dev/shm/gate1/lba3/tests/lib/seg.mjs "$src" >> "$log" 2>&1; rc=$?
  else
    KEEP=/dev/shm/gate1/saves/$name${SUFFIX}.json TRACE=/dev/shm/gate1/logs/pt-$name${SUFFIX}.trace timeout 2400 node /dev/shm/gate1/lba3/tests/lib/seg.mjs "$src" >> "$log" 2>&1; rc=$?
  fi
  echo "=== $name end rc=$rc wall=$(( $(date +%s)-s0 ))s $(date -u +%FT%TZ)" >> "$log"
  echo "$name${SUFFIX} rc=$rc wall=$(( $(date +%s)-s0 ))s $(date -u +%FT%TZ)" >> /dev/shm/gate1/logs/chain-status.txt
  if [ $rc -ne 0 ]; then exit $rc; fi
  prev=/dev/shm/gate1/saves/$name${SUFFIX}.json
done
