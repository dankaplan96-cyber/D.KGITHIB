#!/bin/bash
# 62 after, plugged in: the cloud's tests/fps30-feel.mjs (from the after tree, local copy with the d3d11 flags) on before (a333b00d, :8127) and after (v121, :8125)
cd /c/Users/danka/dev/v121w/lba3
export PLAYWRIGHT='C:\Users\danka\dev\D.KGITHIB\lba3\tools\testlab\node_modules\playwright\index.mjs' HEADED=1 CHANNEL=chrome
O=/c/Users/danka/dev/lba3-bench/feel/cloud62
for b in before:8127 after:8125; do n=${b%%:*}; port=${b##*:}
  echo "== $(date +%T) $n 30"
  GAME_URL=http://localhost:$port/ RUNS=3 TESTS=T1,T2,T3 PATHS=kbd RATES=real,30@60,30@59.9 PROBES=1 OUT=$O/$n-30 LABEL="$n plugged" timeout 2400 node tests/fps30-feel-local.mjs > $O/$n-30.txt 2>&1
  grep -E "real #|Error|min\)" $O/$n-30.txt | cut -c1-170
  echo "== $(date +%T) $n real60 T3"
  GAME_URL=http://localhost:$port/ RUNS=3 TESTS=T3 PATHS=kbd RATES=real60 PROBES=0 OUT=$O/$n-60 LABEL="$n plugged 60" timeout 1200 node tests/fps30-feel-local.mjs > $O/$n-60.txt 2>&1
  grep -E "real60 #|Error|min\)" $O/$n-60.txt | cut -c1-170
done
echo "== done $(date +%T)"
