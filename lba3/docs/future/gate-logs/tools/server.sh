#!/bin/bash
# start the gate server on 8750 serving the snapshot
mkdir -p /dev/shm/gate1/logs /dev/shm/gate1/saves /dev/shm/gate1/out /dev/shm/gate1/tmp
if ss -ltn | grep -q ':8750 '; then echo "port 8750 busy"; exit 1; fi
setsid nohup python3 -m http.server 8750 --bind 127.0.0.1 --directory /dev/shm/gate1/lba3 > /dev/shm/gate1/logs/server-8750.log 2>&1 < /dev/null &
echo $! > /dev/shm/gate1/server.pid
sleep 1
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8750/index.html
