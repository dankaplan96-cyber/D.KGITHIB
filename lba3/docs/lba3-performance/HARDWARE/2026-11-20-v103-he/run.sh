#!/bin/sh
# chapters 1-2 (segments 01-06) on v103, Hebrew, subtitles extra large, 1920x1080, a picture after every step
cd /c/Users/danka/dev/lba3-bench/chainhe
(node ../serve8123.mjs 8984 C:/Users/danka/dev/v103w/lba3 > /dev/null 2>&1 &)
sleep 3
prev=""
for f in tests/playthrough/0[1-6]-*.mjs; do
  n=$(basename $f | cut -d- -f1); s=$(date +%s)
  if [ -z "$prev" ]; then L="LOAD=he-settings.json MENU=new"; else L="LOAD=save-$prev.json"; fi
  env VW=1920 VH=1080 BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8984/ ASSIST=1 KEEP=save-$n.json $L SHOTS=shots/$n timeout 3600 node tests/lib/seg.mjs $f > seg-$n.log 2>&1
  echo "$n exit $? wall $(( $(date +%s)-s ))s $(grep -E '^VERDICT' seg-$n.log)"
  [ -f save-$n.json ] || break
  prev=$n
done
for p in $(netstat -ano | grep ':8984 ' | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $p > /dev/null; done
