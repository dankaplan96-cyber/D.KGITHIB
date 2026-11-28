#!/bin/sh
cd /c/Users/danka/dev/lba3-bench/chainjb
(node ../serve8123.mjs 8980 C:/Users/danka/dev/jb/lba3 > /dev/null 2>&1 &)
(node ../serve8123.mjs 8982 C:/Users/danka/dev/v103w/lba3 > /dev/null 2>&1 &)
sleep 3
env BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8980/ ASSIST=1 KEEP=abb-1.json LOAD=v103s04-8980.json timeout 1200 node tests/lib/seg.mjs tests/playthrough/05-project-b.mjs > ab05b-jb-v103save.log 2>&1
echo "jb code + v103's save-04: exit $? $(grep -E '^VERDICT' ab05b-jb-v103save.log) $(grep -o 'cannot reach[^"]*' ab05b-jb-v103save.log | head -1)"
env BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8982/ ASSIST=1 KEEP=abb-2.json LOAD=s04-8982.json timeout 1200 node ../chain103/tests/lib/seg.mjs ../chain103/tests/playthrough/05-project-b.mjs > ab05b-v103-jbsave.log 2>&1
echo "v103 code + jb's save-04: exit $? $(grep -E '^VERDICT' ab05b-v103-jbsave.log) $(grep -o 'cannot reach[^"]*' ab05b-v103-jbsave.log | head -1)"
for p in 8980 8982; do for q in $(netstat -ano | grep ":$p " | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $q > /dev/null; done; done
