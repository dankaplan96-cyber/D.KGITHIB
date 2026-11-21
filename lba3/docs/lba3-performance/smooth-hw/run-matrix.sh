#!/bin/bash
# order 61 SMOOTH-HW: tests/smooth-routes.mjs (a local copy with this machine's Chrome GPU flags) against base and after
# usage: run-matrix.sh <power tag> "<quality:fps> ..."
P=$1; shift
cd /c/Users/danka/dev/sm-after/lba3
export PLAYWRIGHT='C:\Users\danka\dev\D.KGITHIB\lba3\tools\testlab\node_modules\playwright\index.mjs' HEADED=1 CHANNEL=chrome RUNS=3 MODE=real,synth RES=100 AA=msaa
for c in "$@"; do q=${c%%:*}; f=${c##*:}
  for b in ${BUILDS:-before:8124 after:8123}; do n=${b%%:*}; port=${b##*:}
    O=/c/Users/danka/dev/lba3-bench/smooth/$n-$P-$q-$f
    echo "== $(date +%T) $n $P $q $f"
    GAME_URL=http://localhost:$port/ QUALITY=$q FPS=$f OUT=$O LABEL="$n $P $q $f" timeout 1800 node tests/smooth-routes-local.mjs > $O.txt 2>&1
    grep -E "real #|load hung|Error|min\)" $O.txt | cut -c1-200
  done
done
echo "== done $(date +%T)"
