#!/bin/bash
# P96 confirm: v121 (8125) vs v122 (8126) at 30, in the 57 Hz state: tests/fps30-feel.mjs RATE=real T1-T3 (kbd) and
# tests/smooth-routes.mjs street at FPS=30; local copies with this machine's Chrome GPU flags; interleaved, 2 rounds
cd /c/Users/danka/dev/v122w/lba3
export PLAYWRIGHT='C:\Users\danka\dev\D.KGITHIB\lba3\tools\testlab\node_modules\playwright\index.mjs' HEADED=1 CHANNEL=chrome
O=/c/Users/danka/dev/lba3-bench/p96
for round in 1 2; do for b in v121:8125 v122:8126; do n=${b%%:*}; port=${b##*:}
  echo "== $(date +%T) round $round $n feel"
  GAME_URL=http://localhost:$port/ RUNS=3 TESTS=T1,T2,T3 PATHS=kbd RATES=real PROBES=0 OUT=$O/$n-feel-$round LABEL="$n round $round" timeout 1500 node tests/fps30-feel-local.mjs > $O/$n-feel-$round.txt 2>&1
  grep -E "real #" $O/$n-feel-$round.txt | cut -c1-150
  echo "== $(date +%T) round $round $n street"
  GAME_URL=http://localhost:$port/ RUNS=3 MODE=real ROUTES=street QUALITY=medium FPS=30 RES=100 AA=msaa OUT=$O/$n-street-$round LABEL="$n round $round" timeout 1500 node tests/smooth-routes-local.mjs > $O/$n-street-$round.txt 2>&1
  grep -E "real #|Error" $O/$n-street-$round.txt | cut -c1-150
done; done
echo "== done $(date +%T)"
