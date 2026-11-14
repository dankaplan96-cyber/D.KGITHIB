#!/bin/bash
# REV-TY-2 pipeline A: the side task by input from the chained arrival save, then chapter 3's segment 06 after it
cd /home/user/geriatrics-course/lba2-remaster/docs/lba3-production/reviews/REV-TY-2
export GAME_URL=http://localhost:8142/
LOAD=save-05.json KEEP2=save-ready.json KEEP=save-ws.json timeout 2400 node rev.mjs main > rev-main.log 2>&1; echo "main $?" >> runA.log
LOAD=save-ready.json timeout 900 node rev.mjs race > rev-race.log 2>&1; echo "race $?" >> runA.log
LOAD=save-ready.json timeout 900 node rev.mjs tapshut > rev-tapshut.log 2>&1; echo "tapshut $?" >> runA.log
LOAD=save-ready.json timeout 900 node rev.mjs loss > rev-loss.log 2>&1; echo "loss $?" >> runA.log
cd ../../../..
LOAD=docs/lba3-production/reviews/REV-TY-2/save-ws.json KEEP=docs/lba3-production/reviews/REV-TY-2/save-06-afterpair.json timeout 2400 node tests/lib/seg.mjs tests/playthrough/06-zeelich.mjs > docs/lba3-production/reviews/REV-TY-2/seg06-afterpair.log 2>&1; echo "seg06-afterpair $?" >> docs/lba3-production/reviews/REV-TY-2/runA.log
