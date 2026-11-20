#!/bin/sh
cd /c/Users/danka/dev/lba3-bench
(node serve8123.mjs 8987 C:/Users/danka/dev/jbbase/lba3 > /dev/null 2>&1 &)
(node serve8123.mjs 8988 C:/Users/danka/dev/jb/lba3 > /dev/null 2>&1 &)
sleep 3
for k in 1 2; do
  timeout 1200 node benchrun.mjs http://127.0.0.1:8987/ meas/joints-street-before-$k.txt street auto > /dev/null 2>&1; echo "before $k rc $?"
  timeout 1200 node benchrun.mjs http://127.0.0.1:8988/ meas/joints-street-after-$k.txt street auto > /dev/null 2>&1; echo "after $k rc $?"
done
for p in 8987 8988; do for q in $(netstat -ano | grep ":$p " | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //F //PID $q > /dev/null; done; done
