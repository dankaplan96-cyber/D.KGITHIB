#!/bin/bash
# shot.sh <save name> <png name>: Continue from a gate save, settle, screenshot (chapters 1-2 only; kept in /dev/shm)
cd /dev/shm/gate1/out || exit 9
export BOOT_TIMEOUT=900000 TMPDIR=/dev/shm/gate1/tmp GAME_URL=http://localhost:8750/
LOAD=/dev/shm/gate1/saves/$1.json SHOT=/dev/shm/gate1/out/$2.png timeout 1200 node /dev/shm/gate1/lba3/tests/lib/try.mjs /dev/shm/gate1/tools/probe-view.js > /dev/shm/gate1/logs/shot-$2.log 2>&1
echo "rc=$?" >> /dev/shm/gate1/logs/shot-$2.log
