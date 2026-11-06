"""Parse every score without rendering (bar lengths, chord symbols, voicings): tools/music/.venv/bin/python tools/music/lint.py"""
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tracks import ORDER  # noqa: E402

bad = 0
for name in sys.argv[1:] or ORDER:
    try:
        song = importlib.import_module(f'tracks.{name}').song()
        song.events()
        print(f'{name:12s} ok  {len(song.parts)} parts, {sum(len(p.notes) for p in song.parts)} notes')
    except Exception as e:  # noqa: BLE001
        bad += 1
        print(f'{name:12s} ERROR {e}')
sys.exit(1 if bad else 0)
