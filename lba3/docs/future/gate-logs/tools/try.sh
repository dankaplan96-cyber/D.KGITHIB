#!/bin/bash
# run a page-side probe through tests/lib/try.mjs: try.sh <script.js> <logname>
cd /dev/shm/gate1/out || exit 9
export BOOT_TIMEOUT=900000 TMPDIR=/dev/shm/gate1/tmp GAME_URL=http://localhost:8750/
timeout 2400 node /dev/shm/gate1/lba3/tests/lib/try.mjs "$1" > /dev/shm/gate1/logs/$2.log 2>&1
echo "rc=$?" >> /dev/shm/gate1/logs/$2.log
