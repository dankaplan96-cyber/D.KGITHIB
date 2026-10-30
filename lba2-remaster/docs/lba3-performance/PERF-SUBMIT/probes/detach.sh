#!/bin/bash
# PERF-SUBMIT: run a probe detached (survives the shell's time limits): detach.sh <out-file> <env/command…>; prints the PID
out=$1; shift
cd "$(dirname "$0")" || exit 1
setsid nohup env TMPDIR=/dev/shm BOOT_TIMEOUT=900000 "$@" > "$out" 2>&1 < /dev/null &
echo $!
