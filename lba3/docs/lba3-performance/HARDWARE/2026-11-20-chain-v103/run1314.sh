#!/bin/sh
cd /c/Users/danka/dev/lba3-bench/chain103
(node ../serve8123.mjs 8977 C:/Users/danka/dev/v103w/lba3 > /dev/null 2>&1 &)
sleep 3
rm -f save-12b.json save-13.json save-14.json
sed 's#http://localhost:[0-9]*#http://127.0.0.1:8977#g' tests/fixtures/campaign/base-13.save.json > fx-13.json
sed 's#http://localhost:[0-9]*#http://127.0.0.1:8977#g' tests/fixtures/campaign/base-14.save.json > fx-14.json
for n in 13 14; do
  f=$(ls tests/playthrough/$n-*.mjs); s=$(date +%s)
  L=fx-$n.json; [ $n = 14 ] && [ -f save-13.json ] && L=save-13.json
  env BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8977/ ASSIST=1 STATS=st-$n.json KEEP=save-$n.json LOAD=$L SHOTS=shots/$n TRACE=trace-$n.txt timeout 3600 node tests/lib/seg.mjs $f > seg-$n.log 2>&1
  echo "$n exit $? wall $(( $(date +%s)-s ))s from $L"
done
for p in $(netstat -ano | grep ':8977 ' | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $p > /dev/null; done
