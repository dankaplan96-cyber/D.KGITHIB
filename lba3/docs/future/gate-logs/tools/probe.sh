#!/bin/bash
# probe.sh <segment.mjs> <stopLabel> <probe.js> <logname> [LOAD save]
cd /dev/shm/gate1/out || exit 9
export BOOT_TIMEOUT=900000 TMPDIR=/dev/shm/gate1/tmp GAME_URL=http://localhost:8750/
if [ -n "$5" ]; then export LOAD=$5; fi
timeout 2400 node /dev/shm/gate1/tools/probe-seg.mjs "$1" "$2" "$3" > /dev/shm/gate1/logs/$4.log 2>&1
echo "rc=$?" >> /dev/shm/gate1/logs/$4.log
