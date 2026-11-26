"""Musical numbers per score (MUSIC-LBA): why a piece reads as busy or static. Reads the scores, renders nothing.

    python3 tools/music/analyse.py [track ...] [--md]

Over the loop body (a one-shot: the whole piece), from the written notes after articulation:
  bpm        tempo in the body (quarter-note beats per minute)
  loop       length of the body in seconds (what the player hears before the music repeats)
  top st     range of the top line (the highest sounding note, sampled every 16th: where the ear finds the tune),
             5th to 95th percentile, in semitones
  top/s      pitch changes of the top line per second (melodic motion; a held or drone top line scores low)
  bass/bar   pitch changes of the bottom line (the lowest sounding note, every 16th) per bar: a bass that moves
  all/s      pitched note onsets per second, every part
  drum/bar   percussion strokes per bar
  rhythm     entropy (bits) of where onsets fall in the bar on a 16th grid, all parts (0 = always the same
             place; 4 = evenly everywhere in a 4/4 bar)
  sync %     front-stem onsets that are not on a beat
  durs       distinct note values in the front stem
  chg/bar    chord changes per bar (the harmony track), chords = distinct chord symbols
  pad %      share of the pitched note-time held by notes a bar long or longer (pads, drones, pedals)
  tune %     share of the body during which a front-stem note sounds (a soloist is playing)
"""
import importlib
import math
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tracks import ORDER  # noqa: E402


def analyse(name):
    S = importlib.import_module(f'tracks.{name}').song()
    if S.loop:
        b0, b1 = S.body_start, S.body_end
    else:
        b0, b1 = 0.0, S.total_beats
    secs = S.seconds(b1) - S.seconds(b0)
    bars = (b1 - b0) / S.bar_beats
    front, pitched, drums, held = [], [], 0, 0.0
    total_time = 0.0
    grid = Counter()
    for p in S.parts:
        notes, _ = p.realise(b1)
        for (nb, on, off, pi, v) in notes:
            if not (b0 - 1e-9 <= nb < b1 - 1e-9):
                continue
            pos = round(((nb - b0) % S.bar_beats) * 4)
            grid[pos] += 1
            if p.ch == 9:
                drums += 1
                continue
            d = off - on
            pitched.append((nb, pi, d))
            total_time += d
            if d >= S.bar_beats - 1e-6:
                held += d
            if p.stem == 'front':
                front.append((nb, pi, nb + (off - on), p.name))
    # the top line: highest pitched note sounding at each 16th
    steps = int(round((b1 - b0) * 4))
    top = [None] * steps
    for (nb, pi, d) in pitched:
        k0 = max(0, int(math.ceil((nb - b0) * 4 - 1e-6)))
        k1 = min(steps, int(math.ceil((nb + d - b0) * 4 - 1e-6)))
        for k in range(k0, k1):
            if top[k] is None or pi > top[k]:
                top[k] = pi
    bot = [None] * steps
    for (nb, pi, d) in pitched:
        k0 = max(0, int(math.ceil((nb - b0) * 4 - 1e-6)))
        k1 = min(steps, int(math.ceil((nb + d - b0) * 4 - 1e-6)))
        for k in range(k0, k1):
            if bot[k] is None or pi < bot[k]:
                bot[k] = pi
    bmoves = sum(1 for a, b in zip(bot, bot[1:]) if a is not None and b is not None and a != b)
    tl = [x for x in top if x is not None]
    fp = sorted(tl)
    moves = sum(1 for a, b in zip(top, top[1:]) if a is not None and b is not None and a != b)

    def pct(a, q):
        return a[min(len(a) - 1, max(0, int(round(q * (len(a) - 1)))))] if a else 0
    n = sum(grid.values())
    ent = -sum(c / n * math.log2(c / n) for c in grid.values()) if n else 0
    sync = sum(1 for x in front if abs(x[0] - round(x[0])) > 1e-6) / max(1, len(front))
    durs = len({round(x[2] - x[0], 2) for x in front})
    # coverage of the tune: union of front-stem intervals
    iv = sorted((x[0], x[2]) for x in front)
    cov, cur_s, cur_e = 0.0, None, None
    for s, e in iv:
        s, e = max(s, b0), min(e, b1)
        if cur_e is None or s > cur_e:
            if cur_e is not None:
                cov += cur_e - cur_s
            cur_s, cur_e = s, e
        else:
            cur_e = max(cur_e, e)
    if cur_e is not None:
        cov += cur_e - cur_s
    harm = [(b, s) for b, s in S.harm if b0 - 1e-9 <= b < b1 - 1e-9]
    chg = sum(1 for (a, s), (b, t) in zip(harm, harm[1:]) if s != t)
    bpm = 60 / S.sec_per_beat(b0 + 1e-6)
    return {'track': name, 'bpm': round(bpm), 'meter': f'{S.num}/{S.den}', 'loop': round(secs, 1),
            'top_st': pct(fp, 0.95) - pct(fp, 0.05), 'top_s': round(moves / secs, 2),
            'bass_bar': round(bmoves / bars, 1), 'all_s': round(len(pitched) / secs, 2), 'drum_bar': round(drums / bars, 1), 'rhythm': round(ent, 2),
            'sync': round(100 * sync), 'durs': durs, 'chg_bar': round(chg / bars, 2), 'chords': len({s for _, s in harm}),
            'pad': round(100 * held / max(1e-9, total_time)), 'tune': round(100 * cov / (b1 - b0))}


COLS = ['track', 'bpm', 'meter', 'loop', 'top_st', 'top_s', 'bass_bar', 'all_s', 'drum_bar', 'rhythm', 'sync', 'durs', 'chg_bar',
        'chords', 'pad', 'tune']
HEAD = ['Track', 'bpm', 'meter', 'loop s', 'top-line range st', 'top-line moves/s', 'bass moves/bar', 'all notes/s', 'drum/bar', 'rhythm bits',
        'sync %', 'durs', 'chord chg/bar', 'chords', 'pad %', 'tune %']


def main(argv):
    names = [a for a in argv if not a.startswith('--')] or ORDER
    rows = [analyse(n) for n in names]
    if '--md' in argv:
        print('| ' + ' | '.join(HEAD) + ' |')
        print('|' + '---|' * len(HEAD))
        for r in rows:
            print('| ' + ' | '.join(str(r[c]) for c in COLS) + ' |')
    else:
        print(' '.join(f'{h:>8s}' for h in COLS))
        for r in rows:
            print(' '.join(f'{str(r[c]):>8s}' for c in COLS))


if __name__ == '__main__':
    main(sys.argv[1:])
