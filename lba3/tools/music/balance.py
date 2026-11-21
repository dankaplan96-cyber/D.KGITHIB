"""Part balance of a score, measured (MUSIC-LBA): each part rendered alone, dry, its loudness per section.

    python3 tools/music/balance.py TRACK [bar bar ...]

Prints a table: one row per part, one column per section (sections start at the given bars; default every 8 bars of
the body), values in LUFS-like dB (K-weighted, ungated short-term mean) or '.' when the part is silent there.
The tune should stand 3-8 dB above any single accompanying part. Renders nothing to disk.
"""
import importlib
import os
import sys

import numpy as np
import pyloudnorm

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import render  # noqa: E402
import synth  # noqa: E402

SR = 48000


def main(argv):
    name = argv[0]
    S = importlib.import_module(f'tracks.{name}').song()
    starts = [int(a) for a in argv[1:]] or list(range(S.intro_bars + 1, S.intro_bars + S.body_bars + 1, 8))
    ends = starts[1:] + [S.intro_bars + S.body_bars + 1]
    sf2 = render.soundfont()
    meter = pyloudnorm.Meter(SR)
    print(f'{"part":12s}' + ''.join(f'{b:>7d}' for b in starts))
    for p in S.parts:
        x = synth.render(S, [p], sf2, SR)
        row = []
        for b0, b1 in zip(starts, ends):
            i0, i1 = int(S.seconds(S.pos(b0)) * SR), int(S.seconds(S.pos(b1)) * SR)
            seg = x[i0:i1]
            if np.max(np.abs(seg)) < 1e-4:
                row.append('      .')
                continue
            f = meter._filters if hasattr(meter, '_filters') else None
            y = seg.copy()
            for _, flt in (f or {}).items():
                y = flt.apply_filter(y)
            ms = np.mean(y ** 2)
            row.append(f'{10 * np.log10(ms + 1e-12) - 0.691:7.1f}')
        print(f'{p.name:12s}' + ''.join(row))


if __name__ == '__main__':
    main(sys.argv[1:])
