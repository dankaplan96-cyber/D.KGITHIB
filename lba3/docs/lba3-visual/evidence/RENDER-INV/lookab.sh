#!/bin/bash
# RENDER-INV: same-frame captures on the base (BASE_PORT) and the candidate (NEW_PORT), then their difference.
#   OUT=dir QUALITY=medium VIEWS=square-a,house bash lookab.sh
here=$(cd "$(dirname "$0")" && pwd); out=${OUT:-$here/look}; q=${QUALITY:-medium}
GAME_URL=http://localhost:${BASE_PORT:-8177}/ QUALITY=$q OUT=$out/before node "$here/look.mjs"
GAME_URL=http://localhost:${NEW_PORT:-8176}/ QUALITY=$q OUT=$out/after node "$here/look.mjs"
python3 "$here/lookdiff.py" "$out/before" "$out/after" "$out/cmp"
