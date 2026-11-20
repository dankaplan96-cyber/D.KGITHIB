#!/bin/sh
cd /c/Users/danka/dev/lba3-bench/chain103
(node ../serve8123.mjs 8977 C:/Users/danka/dev/v103w/lba3 > /dev/null 2>&1 &)
sleep 3
prev=""
for f in tests/playthrough/[01][0-9]*-*.mjs; do
  n=$(basename $f | cut -d- -f1); s=$(date +%s)
  LOADARG=""; [ -n "$prev" ] && LOADARG="LOAD=save-$prev.json"
  env BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8977/ ASSIST=1 STATS=st-$n.json KEEP=save-$n.json $LOADARG SHOTS=shots/$n TRACE=trace-$n.txt timeout 3600 node tests/lib/seg.mjs $f > seg-$n.log 2>&1
  rc=$?; echo "$n exit $rc wall $(( $(date +%s)-s ))s"
  if [ ! -f save-$n.json ]; then nn=$(printf %02d $((10#$(echo $n | cut -c1-2)+1))); fx=tests/fixtures/campaign/base-$nn.save.json; echo "  no save at $n"; if [ -f $fx ]; then sed 's#http://localhost:[0-9]*#http://127.0.0.1:8977#g' $fx > save-$n.json; echo "  segment $nn starts from the fixture base-$nn"; else break; fi; fi
  prev=$n
done
for p in $(netstat -ano | grep ':8977 ' | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $p > /dev/null; done
