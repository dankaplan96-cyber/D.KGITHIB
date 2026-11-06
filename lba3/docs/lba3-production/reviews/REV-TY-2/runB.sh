#!/bin/bash
# REV-TY-2 pipeline B: before the intro; segment 06 sliced with a Zoe resume and the pair done with Baldino outside
cd /home/user/geriatrics-course/lba2-remaster/docs/lba3-production/reviews/REV-TY-2
export GAME_URL=http://localhost:8142/
R=docs/lba3-production/reviews/REV-TY-2
LOAD=save-05.json timeout 1200 node rev.mjs pre > rev-pre.log 2>&1; echo "pre $?" >> runB.log
cd ../../../..
LOAD=$R/save-05.json KEEP=$R/save-zoe.json timeout 2400 node tests/lib/seg.mjs $R/seg06-toZoe.mjs > $R/seg06-toZoe.log 2>&1; echo "toZoe $?" >> $R/runB.log
cd $R
LOAD=save-zoe.json KEEP=save-zoe2.json timeout 900 node rev.mjs zoeres > rev-zoeres.log 2>&1; echo "zoeres $?" >> runB.log
cd ../../../..
LOAD=$R/save-zoe2.json KEEP=$R/save-shield.json timeout 1500 node tests/lib/seg.mjs $R/seg06-dialsShield.mjs > $R/seg06-dialsShield.log 2>&1; echo "dialsShield $?" >> $R/runB.log
cd $R
LOAD=save-shield.json KEEP=save-absent.json timeout 900 node rev.mjs absent > rev-absent.log 2>&1; echo "absent $?" >> runB.log
cd ../../../..
LOAD=$R/save-absent.json KEEP=$R/save-06b.json timeout 1500 node tests/lib/seg.mjs $R/seg06-veskShaft.mjs > $R/seg06-veskShaft.log 2>&1; echo "veskShaft $?" >> $R/runB.log
cd $R
timeout 900 node rev.mjs ch10 > rev-ch10.log 2>&1; echo "ch10 $?" >> runB.log
