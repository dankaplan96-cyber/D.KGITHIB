#!/bin/sh
# Downloads the soundfont the soundtrack is rendered with (not committed: 215 MB).
# MuseScore_General.sf2 v0.2 by S. Christian Collins, MIT licence (derived from FluidR3 by Frank Wen, MIT).
# Without it, render.py falls back to /usr/share/sounds/sf2/FluidR3_GM.sf2 (but the bank-17 "Expr." presets
# the scores use exist only in MuseScore_General, so the result would differ).
set -e
cd "$(dirname "$0")/soundfonts"
BASE=https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General
curl -fL -o MuseScore_General.sf2 "$BASE/MuseScore_General.sf2"
curl -fL -o MuseScore_General_License.md "$BASE/MuseScore_General_License.md"
echo "ee51d2c4b1525e70f19a45909c4fd7a2e26d91d115fa89dbf5a6bc413d8b9bf3  MuseScore_General.sf2" | sha256sum -c -
