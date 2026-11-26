#!/bin/sh
# Stamp src/build-stamp.js with the current time (UTC), right before publishing the game (the artifact).
# Run from lba3/: sh tools/stamp-build.sh
cd "$(dirname "$0")/.." || exit 1
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
sed -i "s/^export const BUILT = '[^']*';/export const BUILT = '$now';/" src/build-stamp.js
grep "^export const BUILT" src/build-stamp.js
