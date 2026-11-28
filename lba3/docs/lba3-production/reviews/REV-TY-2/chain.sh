#!/bin/bash
# REV-TY-2: segments 01-05 by input on the reviewed build (0.25.0), chained by real saves (Save & quit -> Continue)
cd /home/user/geriatrics-course/lba2-remaster
D=docs/lba3-production/reviews/REV-TY-2
export GAME_URL=http://localhost:8142/
prev=""
for s in 01-prologue-surface 02-prologue-cave 03-project-a 04-project-valves 05-project-b; do
  n=${s:0:2}
  if [ -n "$prev" ]; then LOAD=$prev KEEP=$D/save-$n.json timeout 1500 node tests/lib/seg.mjs tests/playthrough/$s.mjs > $D/seg$n.log 2>&1
  else KEEP=$D/save-$n.json timeout 1500 node tests/lib/seg.mjs tests/playthrough/$s.mjs > $D/seg$n.log 2>&1; fi
  echo "$s exit $?" >> $D/chain.log
  prev=$D/save-$n.json
  [ -f $prev ] || break
done
