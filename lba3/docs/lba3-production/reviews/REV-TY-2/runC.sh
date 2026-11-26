#!/bin/bash
# REV-TY-2 pipeline C: Zoe resume -> dials/shield (06's steps) -> the pair with Baldino outside -> Vesk, shaft (06's steps); chapter 10 ISO
cd /home/user/geriatrics-course/lba2-remaster
export GAME_URL=http://localhost:8142/
R=docs/lba3-production/reviews/REV-TY-2
LOAD=$R/save-zoe.json KEEP=$R/save-shield.json timeout 1500 node tests/lib/seg.mjs $R/seg06-zoeResume.mjs > $R/seg06-zoeResume.log 2>&1; echo "zoeResume $?" >> $R/runC.log
cd $R
LOAD=save-shield.json KEEP=save-absent.json timeout 900 node rev.mjs absent > rev-absent.log 2>&1; echo "absent $?" >> runC.log
cd ../../../..
LOAD=$R/save-absent.json KEEP=$R/save-06b.json timeout 1500 node tests/lib/seg.mjs $R/seg06-veskShaft.mjs > $R/seg06-veskShaft.log 2>&1; echo "veskShaft $?" >> $R/runC.log
cd $R
timeout 900 node rev.mjs ch10 > rev-ch10.log 2>&1; echo "ch10 $?" >> runC.log
PAIR=1 SC_TAG=pair timeout 900 node rev.mjs ch10 > rev-ch10-pair.log 2>&1; echo "ch10pair $?" >> runC.log
