# GATE-FIX re-run: the commands as run (one shell line each; this session could not run script files).
# Snapshot of the candidate commit, served on its own port (checked free first):
#   git archive -o /dev/shm/gatefix/c.tar <commit> lba3 && tar -xf /dev/shm/gatefix/c.tar -C /dev/shm/gatefix/c
#   python3 -m http.server 8772 --bind 127.0.0.1 --directory /dev/shm/gatefix/c/lba3
# The chain, 01 → 14, each segment continuing from the previous one's kept save (Esc → Save & quit → Continue),
# unmodified segment files, no ASSIST (segments 06 and 13 call their declared fight assist themselves):
prev=""; for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14; do
  f=$(ls /dev/shm/gatefix/c/lba3/tests/playthrough/$n-*.mjs); name=$(basename $f .mjs); s0=$(date +%s)
  echo "=== $name start $(date -u +%FT%TZ) LOAD=$prev SRC=$f" > /dev/shm/gatefix/logs/f/pt-$name.log
  if [ -n "$prev" ]; then
    BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:8772/ LOAD=$prev KEEP=/dev/shm/gatefix/saves/f/$n.json \
      TRACE=/dev/shm/gatefix/logs/f/pt-$name.trace timeout 2400 node /dev/shm/gatefix/c/lba3/tests/lib/seg.mjs $f >> /dev/shm/gatefix/logs/f/pt-$name.log 2>&1; rc=$?
  else
    BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:8772/ KEEP=/dev/shm/gatefix/saves/f/$n.json \
      TRACE=/dev/shm/gatefix/logs/f/pt-$name.trace timeout 2400 node /dev/shm/gatefix/c/lba3/tests/lib/seg.mjs $f >> /dev/shm/gatefix/logs/f/pt-$name.log 2>&1; rc=$?
  fi
  echo "$name rc=$rc wall=$(( $(date +%s)-s0 ))s $(date -u +%FT%TZ)" >> /dev/shm/gatefix/logs/f/chain-status.txt
  [ $rc -ne 0 ] && break; prev=/dev/shm/gatefix/saves/f/$n.json
done
# The other tests, one at a time (chapter10 writes screenshots to the working directory: run from a scratch one):
#   BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:8772/ timeout 2400 node -e "process.chdir('/dev/shm/gatefix/cwd'); import('/dev/shm/gatefix/c/lba3/tests/chapter10.mjs')"
#   (chapter1, prologue, controls, transitions, saveslots the same way)
# The cast scan of a kept save (the save's origin is the port it was made on: scan on the same port):
#   BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:8772/ LOAD=/dev/shm/gatefix/saves/f/12.json node scan-cast.mjs /dev/shm/gatefix/c rooms > scan-f12.json
#   python3 sumscan.py scan-f*.json
# The lamp-room map (chapter 10 by flags, as tests/chapter10.mjs; CANDS='[{"name":..,"zoe":[deg,r],"arthur":[deg,r]}]' rates spots):
#   GAME_URL=http://localhost:8772/ node probe-lt.mjs /dev/shm/gatefix/c
