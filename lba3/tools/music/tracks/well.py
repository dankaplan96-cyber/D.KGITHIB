"""The Well — the cave under Citadel's dry well (prologue), reused for underground spaces until chapter 3.

Water, underground space, an unexpected discovery. Sparse: a low D pedal, water drops on celesta /
vibraphone / harp written into the gaps, and the Entity cell (D A B G#) on a solo flute with long
silences after each phrase. The harmony stays on a lydian tonic pedal (D, E/D) — wonder, not danger.

  intro  1-2   pedal + drops
  A      3-10  flute: the Entity cell twice, answered by silence and drops (D lydian pedal)
  B     11-18  clarinet: a flowing "water" arabesque in B minor, ending on F#7
  C     19-26  discovery: F#7 slips up to Gmaj7#11; violins carry the cell in G, soft voices, harp
  D     27-34  a glimpse of the troubled harmony (Dm6, Bb7) under the same cell, then wonder again
  E     35-38  only the drops and the pedal; loops to bar 3
"""
from score import Song, P, pad, arp, roll

DROPS = {  # composed water drops (pentatonic D E F# A B so they sit on every chord of the section)
    'a': 'r:q. A6:e r:h',
    'b': 'r:h E6:e r:e B5:e r:e',
    'c': 'F#6:e r:e r:q r:e D6:e r:q',
    'd': 'r:q B5:e r:e r:h',
    'e': 'r:h. A5:e E6:e',
    'f': 'r:w',
}


def song():
    S = Song('well', 908000, title='The Well', role='Well cave (underground)')
    S.intro_bars, S.body_bars = 2, 36
    S.mix = {'room': {'rt60': 4.2, 'predelay': 0.035, 'bright': 0.35}, 'wet': {'front': 0.36, 'mid': 0.44, 'back': 0.55},
             'lufs': -18.0}

    S.chords(1, 'D | E/D')
    S.chords(3, 'D | E/D | D | E/D | Gmaj7/D | E/D | Bm7/D | E/D')
    S.chords(11, 'Bm | Bm/A | Gmaj7 | Gmaj7 | Em7 | Em7/D | F#7sus4 | F#7')
    S.chords(19, 'Gmaj7#11 | A/G | Gmaj7#11 | A/G | F#m7 | Bm9 | Em9 | A7sus4')
    S.chords(27, 'Dm6 | Bb7 | C7/E | Dm | D | E/D | D | E/D')
    S.chords(35, 'D | E/D | D | E/D')

    fl = S.part('flute', 'flute', stem='front', pan=58, vol=92, legato=True, dyn='p')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=70, vol=92, legato=True, dyn='p')
    vn = S.part('violins', 'strings_slow', stem='mid', pan=44, vol=92, legato=True, dyn='pp')
    va = S.part('violas', 'strings_slow', stem='mid', pan=74, vol=80, dyn='pp')
    vc = S.part('cello', 'cello', stem='mid', pan=80, vol=88, legato=True, dyn='pp')
    cb = S.part('bass', 'contrabass', stem='mid', pan=60, vol=96, dyn='pp')
    hp = S.part('harp', 'harp', stem='mid', pan=30, vol=88, dyn='p')
    ce = S.part('celesta', 'celesta', stem='front', pan=20, vol=80, dyn='p')
    vb = S.part('vibes', 'vibes', stem='mid', pan=100, vol=78, dyn='p')
    ch = S.part('voices', 'oohs', stem='back', pan=64, vol=78, dyn='pp')
    gl = S.part('glass', 'glass', stem='back', pan=50, vol=60, dyn='pp')
    ti = S.part('timpani', 'timpani', stem='back', pan=64, vol=90, dyn='pp')
    tr = S.part('tremolo', 'trem', stem='mid', pan=36, vol=70, dyn='pp')

    def drops(part, bar, keys, octave=0):
        for i, k in enumerate(keys.split()):
            part.line(bar + i, DROPS[k], octave=octave)

    # ------------------------------------------------------------ pedal through intro + A + E
    cb.line(1, 'D2:w~ | D2:w | D2:w~ | D2:w~ | D2:w~ | D2:w | D2:w~ | D2:w~ | D2:w~ | D2:w')
    cb.hairpin(1, 3, 'ppp', 'pp')
    gl.line(1, 'A3+D4:w | B3+E4:w')
    gl.hairpin(1, 3, 'pppp', 'pp')
    pad(gl, 3, 11, n=2, low=P('A3'), high=P('E4'))
    drops(ce, 1, 'a b')
    drops(vb, 3, 'f c f e')
    drops(ce, 3, 'd f a f')
    drops(ce, 7, 'b f c d')
    drops(vb, 7, 'f a f e')

    # ------------------------------------------------------------ A (3-10): the cell, flute
    fl.line(3, 'D4:h A4:q B4:q | G#4:w | r:w | r:h A4:q B4:q | F#4:h. E4:q | G#4:w | r:w | r:h. F#4:q')
    fl.hairpin(3, 5, 'p', 'mp')
    fl.hairpin(6, 9, 'p', 'mp')
    vc.line(5, 'r:h A3:h | B3:w')
    vc.dyn(5, 'pp')
    hp.line(9, 'D3:e A3:e E4:e F#4:e B4:e E5:e r:q | D3:e A3:e E4:e G#4:e B4:e r:e r:q')
    hp.dyn(9, 'p')

    # ------------------------------------------------------------ B (11-18): clarinet arabesque, B minor
    cl.line(11, 'r:q F#5:e E5:e D5:e C#5:e B4:q | A4:h. r:q | r:q D5:e C#5:e B4:e A4:e F#4:q | G4:h. r:q |'
                'r:q B4:e A4:e G4:e F#4:e E4:q | D4:h. r:q | r:q E5:e C#5:e B4:h | A#4:w')
    cl.hairpin(11, 13, 'p', 'mp')
    cl.hairpin(17, 19, 'mp', 'p')
    cb.line(11, 'B1:w | A1:w | G1:w~ | G1:w | E2:w | D2:w | F#2:w~ | F#2:w')
    cb.dyn(11, 'pp')
    pad(va, 11, 19, n=3, low=P('D4'), high=P('D5'))
    va.dyn(11, 'pp')
    va.hairpin(15, 19, 'pp', 'p')
    arp(hp, 11, 19, '0 1 2 r 3 r r r', step=0.5, n=4, low=P('B2'), high=P('B4'), length=2.5)
    hp.dyn(11, 'p')
    vb.line(12, 'r:h. F#6:q')
    vb.line(14, 'r:h. B5:q')
    vb.line(16, 'r:h. E6:q')
    vb.line(18, 'r:h. C#6:q')
    ce.line(13, 'r:h r:e A6:e r:q')
    ce.line(15, 'r:q. G6:e r:h')

    # ------------------------------------------------------------ C (19-26): discovery in G lydian
    vn.line(19, 'G4:h D5:q E5:q | C#5:h. A4:q | G4:h D5:q E5:q | C#5:w | A4:h C#5:q E5:q | D5:w | B4:h F#5:q G5:q | E5:w')
    vn.hairpin(19, 23, 'p', 'mf')
    vn.hairpin(23, 27, 'mf', 'p')
    ch.line(19, 'B3+D4:w | C#4+E4:w | B3+D4:w | C#4+E4:w | C#4+E4:w | D4+F#4:w | D4+F#4:w | D4+E4:w')
    ch.hairpin(19, 23, 'pp', 'p')
    ch.hairpin(25, 27, 'p', 'ppp')
    arp(hp, 19, 27, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('G2'), high=P('D5'), length=2.0)
    hp.dyn(19, 'mp')
    cb.line(19, 'G1:w~ | G1:w~ | G1:w~ | G1:w | F#1:w | B1:w | E2:w | A1:w')
    cb.dyn(19, 'p')
    vc.line(21, 'r:h B3:h | A3:w | C#4:h B3:h | B3:w | G3:h. F#3:q | E3:w')
    vc.dyn(21, 'p')
    ce.line(20, 'r:h. C#7:q')
    ce.line(22, 'r:h. E6:q')
    vb.line(24, 'r:h F#5:q B5:q')
    vb.line(26, 'r:h E6:q A5:q')

    # ------------------------------------------------------------ D (27-34): the troubled glimpse, then wonder
    cl.line(27, 'D4:h A4:q B4:q | G#4:h. F#4:q | E4:h Bb4:q C5:q | A4:w')
    cl.dyn(27, 'p')
    cl.hairpin(28, 30, 'p', 'mp')
    cl.dyn(30, 'p')
    cb.line(27, 'D2:w | Bb1:w | E2:w | D2:w~ | D2:w~ | D2:w | D2:w~ | D2:w')
    cb.dyn(27, 'p')
    tr.line(28, 'Ab3+D4:w | G3+Bb3+E4:w')
    tr.hairpin(28, 30, 'pp', 'p')
    tr.dyn(30, 'ppp')
    roll(ti, 28, 'D2', 4, 22, 46)
    pad(va, 27, 31, n=3, low=P('D4'), high=P('C5'))
    va.dyn(27, 'pp')
    fl.line(31, 'D5:h A5:q B5:q | G#5:w | r:h A4:q B4:q | E4:w')
    fl.dyn(31, 'p')
    fl.hairpin(31, 33, 'p', 'mp')
    fl.hairpin(33, 35, 'p', 'pp')
    pad(gl, 31, 39, n=2, low=P('A3'), high=P('E4'))
    gl.dyn(31, 'pp')
    drops(ce, 31, 'f a f b')

    # ------------------------------------------------------------ E (35-38): drops and pedal
    cb.line(35, 'D2:w~ | D2:w~ | D2:w~ | D2:w')
    cb.dyn(35, 'pp')
    drops(ce, 35, 'a b c d')
    drops(vb, 35, 'f e f a')
    return S
