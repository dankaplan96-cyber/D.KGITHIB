"""Build the soundtrack: tools/music/.venv/bin/python tools/music/build.py [track ...] [--keep-stems]

Each module in tools/music/tracks/ defines `song()` -> score.Song and optionally VARIANTS
({suffix: stems to drop}) for alternate mixes rendered from the same performance.
"""
import importlib
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import render  # noqa: E402
from tracks import ORDER  # noqa: E402


def main(argv):
    names = [a for a in argv if not a.startswith('--')] or ORDER
    keep = '--keep-stems' in argv
    sf2 = render.soundfont()
    print('soundfont:', sf2)
    entries = []
    for n in names:
        t0 = time.time()
        mod = importlib.import_module(f'tracks.{n}')
        song = mod.song()
        res = render.build(song, sf2, keep_stems=keep, variants=getattr(mod, 'VARIANTS', None))
        for name, info in res:
            loop = f"loop {info['loopStart']:.2f}-{info['loopEnd']:.2f}s seam {info['seamMaxDiff']:.1e}" if info['loop'] else 'one-shot'
            print(f"{name:18s} {info['duration']:7.1f}s  {info['lufs']:6.1f} LUFS  TP {info['truePeak']:5.1f} dBTP  "
                  f"GR {info['limiterGR']:5.1f} dB  {loop}  {info['bytes'] / 1e6:.2f} MB  ({time.time() - t0:.0f}s)")
        entries += res
    render.update_manifest(entries)


if __name__ == '__main__':
    main(sys.argv[1:])
