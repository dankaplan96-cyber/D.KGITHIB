#!/bin/bash
# cap.sh <VP-n> <scenario> <W> <H> <TAG> [save]   → logs/<scenario>-<W>-<TAG>.log
# PORT: 8164 = the before build (copy of 5941bb5), 8154 = this worktree (after)
ROOT=/home/user/geriatrics-course/.claude/worktrees/agent-a3c80fad9d148cfb7/lba2-remaster
SP=/tmp/claude-0/-home-user-geriatrics-course/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/scratchpad/vp26
PORT=${PORT:-8154}
E=$ROOT/docs/lba3-visual/evidence/$1
mkdir -p $E/logs
cd $ROOT
export GAME_URL=http://localhost:$PORT/ TAG=$5
if [ -n "$6" ]; then sed "s#http://localhost:[0-9]*#http://localhost:$PORT#g" $SP/$6 > $SP/load-$PORT-$$.json; export LOAD=$SP/load-$PORT-$$.json; else unset LOAD; fi
node $ROOT/docs/lba3-visual/evidence/VP-5/scripts/run.mjs $E/scripts/$2.mjs $3 $4 > $E/logs/$2-$3-$5.log 2>&1
echo "rc $? $1 $2 $3 $5"
rm -f $SP/load-$PORT-$$.json
