#!/bin/sh
cd /c/Users/danka/dev/lba3-bench/chainjb
(node ../serve8123.mjs 8980 C:/Users/danka/dev/jb/lba3 > /dev/null 2>&1 &)
(node ../serve8123.mjs 8981 C:/Users/danka/dev/jbbase/lba3 > /dev/null 2>&1 &)
(node ../serve8123.mjs 8982 C:/Users/danka/dev/v103w/lba3 > /dev/null 2>&1 &)
sleep 3
for k in 1 2 3; do for w in jb:8980 base:8981 v103:8982; do n=${w%%:*}; p=${w##*:}
  env BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:$p/ ASSIST=1 LOAD=s13-$p.json timeout 1200 node tests/lib/seg.mjs tests/playthrough/14-shell.mjs > ab14-$n-$k.log 2>&1
  echo "$n $k: $(grep -E '^VERDICT' ab14-$n-$k.log) $(grep -o 'pylons from their plates: {[^}]*}' ab14-$n-$k.log | grep -o '"shots":[0-9]*,"hurt":[0-9]*,"t":[0-9.]*,"pylons":[0-9],"iso":[0-9]')"; done; done
for p in 8980 8981 8982; do for q in $(netstat -ano | grep ":$p " | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $q > /dev/null; done; done
