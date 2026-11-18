#!/bin/bash
# refresh the /dev/shm/t983 snapshot from the worktree's lba3 (src, tests, index, assets changed files)
SRC=/home/user/D.KGITHIB/.claude/worktrees/agent-afca2a163fb271a41/lba3
if command -v rsync >/dev/null; then
  rsync -a --delete --exclude=/tools/music/soundfonts --exclude=node_modules --exclude=/captures "$SRC/" /dev/shm/t983/
else
  tar -C "$SRC" --exclude=./tools/music/soundfonts --exclude=node_modules --exclude=./captures -cf /dev/shm/t983.tar . && tar -C /dev/shm/t983 -xf /dev/shm/t983.tar && rm /dev/shm/t983.tar
fi
echo synced
