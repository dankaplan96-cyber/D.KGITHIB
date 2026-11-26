#!/bin/bash
# ARRIVAL-2: run a command once no other browser runs on the machine (waits up to WAIT s), and note how many seconds
# another agent's browser (a gpu-process not under this command) ran beside it. Usage: OUT=file quiet.sh cmd...
WAIT=${WAIT:-1500}
others() { pgrep -f "chrome-headless-shell.real --type=gpu-process" | grep -v -x -f <(for p in $(pgrep -f "chrome-headless-shell.real --type=gpu-process"); do a=$p; while [ "$a" -gt 1 ]; do [ "$a" = "$$" ] && echo $p && break; a=$(ps -o ppid= -p $a | tr -d ' '); [ -z "$a" ] && break; done; done) | wc -l; }
t=0; while [ "$(others)" -gt 0 ] && [ $t -lt $WAIT ]; do sleep 5; t=$((t+5)); done
echo "waited ${t}s for other browsers; load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$OUT"
( n=0; while sleep 2; do [ "$(others)" -gt 0 ] && n=$((n+2)) && echo $n > "$OUT.busy"; done ) & mon=$!
"$@" >> "$OUT" 2>&1; rc=$?
kill $mon 2>/dev/null
echo "another browser ran beside it for $(cat "$OUT.busy" 2>/dev/null || echo 0)s; load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$OUT"
rm -f "$OUT.busy"
exit $rc
