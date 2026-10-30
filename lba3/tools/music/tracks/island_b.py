"""Sea Wind — the second piece of the open island (beaches, cliffs, the lighthouse road) and the Desert (MUSIC-2),
in rotation with Island Exploration.

A through-composed piece with an ending (not a loop), heard once and followed by a silence. Where Island Exploration
strides (the Adventure theme over a string ostinato), this one wanders: 12/8, an unhurried walk by the sea in E
dorian (the bright A major chord of the mode keeps it warm, not sad), a flute tune over a hammered dulcimer and a
soft 12/8 hand-drum groove, an ocarina answering, a broad string melody in G/C lydian in the middle, a quiet
"lighthouse" breakdown with bells, then the tune back and an open ending on E minor with its ninth.
Original material, written for this project (MUSIC-2); not based on any existing tune.

  intro   1-3   dulcimer + warm pad + a wind sweep
  A       4-11  flute: the sea tune
  A2     12-19  the tune again, its second half climbing; ocarina echoes, cello countermelody, the groove enters
  B      20-27  violins in long lines (C lydian, G major), horns below, harp
  C      28-31  breakdown: ocarina call over dulcimer and bells
  A'     32-39  flute with oboe below, strings, the full groove; the climbing second half
  coda   40-44  slowing: the head of the tune passed between ocarina and flute, last chord Em9
"""
from score import Song, P, pad, arp, bassline, hit

SEA_A = ("B4:q. E5:q F#5:e G5:q. F#5:e E5:e D5:e | C#5:q. E5:q. A5:q. G5:e F#5:e E5:e | F#5:q. G5:e F#5:e E5:e B4:h. |"
         "D5:q. F#5:q. A5:q. B5:q. | C6:q. B5:e A5:e G5:e B5:q. E5:q. | D5:q. G5:q. F#5:q. D5:q. |"
         "E5:q. C5:q. D5:q. F#5:q. | E5:h. r:q. B4:q.")
SEA_A_CH = 'Em7 | A | Em7 | Bm7 | Cmaj7 | G/B | Am7 D | Em'
SEA_HEAD = '|'.join(SEA_A.split('|')[:4])
SEA_A2_END = "A5:q. C6:q. E6:q. D6:e C6:e B5:e | A5:q. F#5:q. D5:q. E5:q. | G5:q. E5:q. F#5:q. D#5:q. | E5:h. r:h."
SEA_A2_CH = 'Em7 | A | Em7 | Bm7 | Am7 | D | Cmaj7 B7 | Em'


def song():
    S = Song('island_b', 666667, meter=(12, 8), title='Sea Wind', role='Citadel island outdoors, the Desert (second piece)')
    S.loop = False
    S.intro_bars = 3
    S.end_bars = 44
    S.rit(42, 45, 666667, 860000)
    S.tail_sec = 7.0
    S.mix = {'room': {'rt60': 2.5, 'predelay': 0.024, 'bright': 0.55}, 'wet': {'front': 0.24, 'mid': 0.3, 'back': 0.44},
             'lufs': -17.5}

    S.chords(1, 'Em9 | A/E | Em9')
    S.chords(4, SEA_A_CH)
    S.chords(12, SEA_A2_CH)
    S.chords(20, 'C | D/C | Bm7 | Em7 | Am7 | D | Gmaj7 | B7sus4 B7')
    S.chords(28, 'Em9 | Cmaj7 | Am9 | B7sus4')
    S.chords(32, 'Em9 | A | Em9 | Bm7 | Am7 | D | Cmaj7 B7 | Em')
    S.chords(40, 'Em9 | Cmaj7 | Am9 | Bm7 | Em9')

    fl = S.part('flute', 'flute', stem='front', pan=58, vol=94, legato=True, dyn='mf')
    oc = S.part('ocarina', 'ocarina', stem='front', pan=76, vol=90, legato=True, dyn='mp')
    ob = S.part('oboe', 'oboe', stem='front', pan=44, vol=86, legato=True, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=100, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=66, vol=84, dyn='p')
    vc = S.part('cello', 'cello', stem='mid', pan=80, vol=92, legato=True, dyn='mp')
    hn = S.part('horns', 'horn', stem='back', pan=46, vol=90, legato=True, dyn='mp')
    dl = S.part('dulcimer', 'dulcimer', stem='mid', pan=26, vol=92, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=84, vol=86, dyn='mp')
    bs = S.part('bass', 'fretless', stem='mid', pan=62, vol=96, dyn='mp')
    pd = S.part('pad', 'warmpad', stem='back', pan=64, vol=66, dyn='p')
    sw = S.part('wind', 'sweep', stem='back', pan=30, vol=58, dyn='pp')
    cr = S.part('bells', 'crystal', stem='front', pan=96, vol=64, dyn='p')
    dr = S.part('hands', 'drums', stem='back', pan=56, vol=80, dyn='p')

    def ripple(b0, b1, n=4, low='E4', high='E5', length=0.9):
        arp(dl, b0, b1, '0 1 2 3 2 1', step=0.5, n=n, low=P(low), high=P(high), length=length)

    def groove(b0, b1, v=40):
        for b in range(b0, b1):
            hit(dr, b, 'conga', 0, vel=v + 8, dur=0.5)
            hit(dr, b, 'bongo', 2.5, vel=v - 4, dur=0.5)
            hit(dr, b, 'conga', 3.0, vel=v + 2, dur=0.5)
            hit(dr, b, 'tumba', 4.5, vel=v + 4, dur=0.5)
            hit(dr, b, 'bongo', 5.5, vel=v - 8, dur=0.5)
            for k in range(12):
                hit(dr, b, 'shaker', k * 0.5, vel=v - 14 + (8 if k % 3 == 0 else 0), dur=0.25)

    # ---------------------------------------------------------------- intro (1-3)
    ripple(1, 4)
    dl.hairpin(1, 3, 'p', 'mp')
    pad(pd, 1, 4, n=4, low=P('D4'), high=P('D5'))
    pd.hairpin(1, 3, 'pp', 'p')
    sw.line(1, 'E3+B3:w. | E3+B3:w. | E3+A3:w.')
    sw.hairpin(1, 4, 'pp', 'p')
    bs.line(2, 'r:h. r:q. E2:q.')

    # ---------------------------------------------------------------- A (4-11)
    fl.line(4, SEA_A)
    fl.dyn(4, 'mf')
    ripple(4, 12)
    bassline(bs, 4, 12, 'R:q. r:q. 5:q. r:q.', octave=2)
    bs.dyn(4, 'mp')
    pad(pd, 4, 12, n=4, low=P('D4'), high=P('D5'))
    pd.dyn(4, 'p')
    cr.line(7, 'r:h. r:q. B6:q. | r:w. | r:w. | r:h. r:q. A6:q.')
    cr.dyn(7, 'p')

    # ---------------------------------------------------------------- A2 (12-19)
    fl.line(12, SEA_HEAD + '|' + SEA_A2_END)
    fl.hairpin(16, 18, 'mf', 'f')
    fl.dyn(18, 'mf')
    oc.line(12, 'r:w. | r:h. r:q. C#6:q. | r:w. | r:h. r:q. B5:q.')
    oc.dyn(12, 'mp')
    vc.line(12, 'E3:h. G3:h. | A3:h. C#4:h. | B3:h. G3:h. | F#3:h. D3:h. | C3:h. E3:h. | F#3:h. A3:h. | E3:h. D#3:h. | E3:w.')
    vc.dyn(12, 'mp')
    ripple(12, 20)
    bassline(bs, 12, 20, 'R:q. r:q. 5:q. r:q.', octave=2)
    groove(12, 20, 38)
    pad(st, 16, 20, n=3, low=P('E4'), high=P('E5'))
    st.hairpin(16, 20, 'pp', 'p')

    # ---------------------------------------------------------------- B (20-27): broad strings, C lydian / G
    vn.line(20, 'E5:h. G5:q. F#5:q. | A5:h. F#5:h. | B5:q. A5:q. F#5:q. D5:q. | G5:h. E5:h. |'
                'C6:h. B5:q. A5:q. | F#5:h. A5:q. D6:q. | B5:q. A5:q. G5:q. F#5:q. | E5:h. D#5:h.')
    vn.dyn(20, 'mf')
    vn.hairpin(24, 26, 'mf', 'f')
    vn.hairpin(26, 28, 'f', 'mp')
    hn.line(20, 'G3:h. A3:h. | F#3:w. | D4:h. A3:h. | B3:w. | E4:h. C4:h. | A3:h. F#3:h. | D4:h. B3:h. | A3:h. F#3:h.')
    hn.dyn(20, 'mp')
    arp(hp, 20, 28, '0 1 2 3 4 3', step=0.5, n=5, low=P('C3'), high=P('C5'), length=1.6)
    hp.dyn(20, 'mp')
    bassline(bs, 20, 28, 'R:h. 5:q. 8:q.', octave=2)
    pad(st, 20, 28, n=4, low=P('G3'), high=P('G4'))
    st.dyn(20, 'p')
    groove(20, 28, 34)

    # ---------------------------------------------------------------- C (28-31): breakdown, the lighthouse
    oc.line(28, 'r:h. B5:q. E6:q. | D6:h. B5:h. | C6:q. B5:q. A5:h. | F#5:w.')
    oc.dyn(28, 'mf')
    ripple(28, 32, n=5, low='E3', high='E5', length=1.4)
    dl.dyn(28, 'p')
    cr.line(28, 'E6:h. r:h. | G6:h. r:h. | E6:h. r:h. | D#6:w.')
    cr.dyn(28, 'p')
    pad(pd, 28, 32, n=4, low=P('E4'), high=P('E5'))
    pd.hairpin(28, 30, 'p', 'mp')
    pd.hairpin(30, 32, 'mp', 'p')
    sw.line(28, 'E3+B3:w. | C3+G3:w. | A2+E3:w. | B2+F#3:w.')
    sw.dyn(28, 'p')
    bs.line(28, 'E2:w. | C2:w. | A1:w. | B1:w.')

    # ---------------------------------------------------------------- A' (32-39): the tune back, full
    fl.line(32, SEA_HEAD + '|' + SEA_A2_END)
    fl.dyn(32, 'mf')
    fl.hairpin(36, 38, 'mf', 'f')
    fl.dyn(38, 'mf')
    ob.line(32, 'E4:h. G4:h. | E4:h. C#5:h. | B4:w. | A4:h. F#4:h. | G4:h. E4:h. | D4:h. F#4:h. | C5:h. A4:h. | B4:w.')
    ob.dyn(32, 'mp')
    vc.line(32, 'E3:h. G3:h. | A3:h. C#4:h. | B3:h. G3:h. | F#3:h. D3:h. | C3:h. E3:h. | F#3:h. A3:h. | E3:h. D#3:h. | E3:w.')
    vc.dyn(32, 'mf')
    ripple(32, 40)
    dl.dyn(32, 'mp')
    bassline(bs, 32, 40, 'R:q. r:q. 5:q. r:q.', octave=2)
    pad(st, 32, 40, n=4, low=P('E4'), high=P('E5'))
    st.dyn(32, 'p')
    groove(32, 40, 42)
    cr.line(39, 'r:h. r:q. B6:q.')

    # ---------------------------------------------------------------- coda (40-44)
    oc.line(40, 'B4:q. E5:q F#5:e G5:h. | E5:h. r:h.')
    oc.dyn(40, 'mp')
    fl.line(42, 'B4:q. E5:q F#5:e G5:q. A5:q. | F#5:w. | E5:w.')
    fl.hairpin(42, 45, 'mp', 'p')
    ripple(40, 44, n=4, low='E4', high='E5', length=1.2)
    dl.hairpin(40, 44, 'mp', 'p')
    arp(dl, 44, 45, '0 1 2 3 4 5', step=0.5, n=6, low=P('E3'), high=P('F#5'), length=3.0)
    pad(st, 40, 45, n=4, low=P('D4'), high=P('F#5'))
    st.hairpin(40, 45, 'p', 'pp')
    pad(pd, 40, 45, n=4, low=P('D4'), high=P('D5'))
    pd.hairpin(42, 45, 'p', 'pp')
    bs.line(40, 'E2:w. | C2:w. | A1:w. | B1:w. | E2:w.')
    bs.hairpin(40, 45, 'mp', 'p')
    groove(40, 42, 30)
    cr.line(44, 'B6:q. E7:q. F#7:h.')
    cr.dyn(44, 'pp')
    return S
