"""Write the bar lines of every track (render.timing) into assets/music/manifest.json without re-rendering.

    tools/music/.venv/bin/python tools/music/timing.py [track ...]

The audio does not change: a render places beat 0 at sample 0, so the bar lines follow from the score alone.
A variant mix (facility_stealth) takes the bar lines of its score.
"""
import importlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import render  # noqa: E402


def main(argv):
    path = os.path.join(render.OUT_DIR, 'manifest.json')
    man = json.load(open(path))
    names = argv or list(man['tracks'])
    for name in names:
        base = name.split('_stealth')[0]
        song = importlib.import_module(f'tracks.{base}').song()
        t = render.timing(song)
        info = man['tracks'][name]
        if info.get('loop'):  # the score must agree with the rendered loop points
            ls, le = song.loop_points_beats()
            assert abs(float(song.sample(ls, render.SR)) - info['loopStartSample']) <= 1, name
            assert abs(float(song.sample(le, render.SR)) - info['loopEndSample']) <= 1, name
        info.update(t)
        print(f"{name:18s} {len(t['bars']):3d} bars, body {t.get('bodyStart', 0):7.3f}-{t.get('bodyEnd', info['duration']):7.3f}s")
    with open(path, 'w') as f:
        json.dump(man, f, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main(sys.argv[1:])
