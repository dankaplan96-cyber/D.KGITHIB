#!/bin/sh
cd /c/Users/danka/dev/lba3-bench/chainjb
(node ../serve8123.mjs 8979 C:/Users/danka/dev/jb/lba3 > /dev/null 2>&1 &)
sleep 3
prev=""
for f in tests/playthrough/[01][0-9]*-*.mjs; do
  n=$(basename $f | cut -d- -f1); s=$(date +%s)
  LOADARG=""; [ -n "$prev" ] && LOADARG="LOAD=save-$prev.json"
  env BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8979/ ASSIST=1 STATS=st-$n.json KEEP=save-$n.json $LOADARG SHOTS=shots/$n TRACE=trace-$n.txt timeout 3600 node tests/lib/seg.mjs $f > seg-$n.log 2>&1
  rc=$?; echo "$n exit $rc wall $(( $(date +%s)-s ))s"
  if [ ! -f save-$n.json ]; then nn=$(printf %02d $((10#$(echo $n | cut -c1-2)+1))); fx=tests/fixtures/campaign/base-$nn.save.json; echo "  no save at $n"; if [ -f $fx ]; then sed 's#http://localhost:[0-9]*#http://127.0.0.1:8979#g' $fx > save-$n.json; echo "  segment $nn starts from the fixture base-$nn"; else break; fi; fi
  prev=$n
done
for p in $(netstat -ano | grep ':8979 ' | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $p > /dev/null; done
