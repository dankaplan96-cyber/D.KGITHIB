#!/bin/sh
# segment 05 from the joints branch's own save-04, on the branch and on its base (b94ab3d9), twice each
cd /c/Users/danka/dev/lba3-bench/chainjb
(node ../serve8123.mjs 8980 C:/Users/danka/dev/jb/lba3 > /dev/null 2>&1 &)
(node ../serve8123.mjs 8981 C:/Users/danka/dev/jbbase/lba3 > /dev/null 2>&1 &)
sleep 3
for k in 1 2; do for w in jb:8980 base:8981; do n=${w%%:*}; p=${w##*:}; rm -f ab-$n-$k.json
  env BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:$p/ ASSIST=1 KEEP=ab-$n-$k.json LOAD=s04-$p.json timeout 1200 node tests/lib/seg.mjs tests/playthrough/05-project-b.mjs > ab05-$n-$k.log 2>&1
  echo "$n run $k: exit $? $(grep -E '^VERDICT' ab05-$n-$k.log) $(grep -o 'cannot reach[^"]*' ab05-$n-$k.log | head -1)"; done; done
for p in 8980 8981; do for q in $(netstat -ano | grep ":$p " | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $q > /dev/null; done; done
