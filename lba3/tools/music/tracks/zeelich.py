"""Zeelich — the floating Esmer island above the pink cloud sea (sky-ferry pier, street, wind-mills, depot).

A distinct colour: a foreign place full of life. 7/8 in groups of 2+2+3, E lydian (the raised fourth A#
gives it its airy brightness), acoustic pan flute / kalimba / hand drums / acoustic bass mixed with
electronic pads and a poly-synth arpeggio. The Adventure head appears bent into 7/8 in the C section.

  intro   1-2   kalimba + bass + drums groove
  A       3-10  pan flute: the Zeelich tune
  A2     11-18  pan flute answer, higher; synth pad joins
  B      19-26  flute: the street tune in C# minor, marimba
  C      27-34  horn + violins: the Adventure head in 7/8 (lydian), synth arpeggio
  D      35-42  breakdown: kalimba, pad and conga; pan-flute calls with written echoes
  A'     43-50  oboe + pan flute in thirds, full groove
  A2'    51-58  marimba + strings take the answer
  link   59-62  groove alone, back to bar 3
"""
from score import Song, P, pad, arp, bassline, hit

Z_A = ("B4:q E5:q F#5:e G#5:e A#5:e | B5:q. A#5:q G#5:q | G#5:q F#5:q E5:e F#5:e G#5:e | E5:q. B4:q. r:e |"
       "C#5:q E5:q A5:e G#5:e F#5:e | F#5:q. D#5:q B4:q | G#5:q F#5:q D#5:e E5:e F#5:e | E5:h. r:e")
Z_A_CH = 'E | F#/E | E | C#m7 | A | B | G#m7 | B7sus4'
Z_A2 = ("B4:q E5:q F#5:e G#5:e A#5:e | C#6:q. B5:q A#5:q | B5:q G#5:q F#5:e G#5:e B5:e | C#6:q. G#5:q. r:e |"
        "A5:q E5:q C#5:e E5:e A5:e | G#5:q. D#5:q E5:q | F#5:q D#5:q B4:e C#5:e D#5:e | E5:h. r:e")
Z_A2_CH = 'E | F#/E | G#m7 | C#m7 | A | Amaj7#11 | B | E'


def song():
    S = Song('zeelich', 600000, meter=(7, 8), title='Zeelich', role='Zeelich island (Esmer town)')
    S.intro_bars, S.body_bars = 2, 60
    S.mix = {'room': {'rt60': 2.4, 'predelay': 0.02, 'bright': 0.65}, 'wet': {'front': 0.24, 'mid': 0.28, 'back': 0.36},
             'lufs': -17.0}
    S.chords(1, 'E | F#/E')
    S.chords(3, Z_A_CH)
    S.chords(11, Z_A2_CH)
    S.chords(19, 'C#m | A | E | B | C#m | A | F#m7 | B7')
    S.chords(27, 'E | C#m7 | A | B | E | F#/E | A | B7sus4 B7')
    S.chords(35, 'C#m7 | Amaj7 | C#m7 | Amaj7 | F#m7 | B | E | B7sus4')
    S.chords(43, Z_A_CH)
    S.chords(51, Z_A2_CH)
    S.chords(59, 'E | F#/E | E | B7sus4')

    pf = S.part('panflute', 'panflute', stem='front', pan=56, vol=96, legato=True, dyn='mf')
    ob = S.part('oboe', 'oboe', stem='front', pan=70, vol=86, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=40, vol=88, legato=True, dyn='mf')
    ka = S.part('kalimba', 'kalimba', stem='mid', pan=30, vol=96, dyn='mf')
    mb = S.part('marimba', 'marimba', stem='mid', pan=86, vol=84, dyn='mf')
    bs = S.part('bass', 'acbass', stem='mid', pan=64, vol=100, dyn='mf')
    hn = S.part('horn', 'horn', stem='mid', pan=44, vol=94, legato=True, dyn='mf')
    vn = S.part('violins', 'strings', stem='mid', pan=34, vol=92, legato=True, dyn='mf')
    pd = S.part('pad', 'halo', stem='back', pan=64, vol=70, dyn='p')
    sy = S.part('arp', 'polysynth', stem='back', pan=96, vol=60, dyn='p')
    ce = S.part('celesta', 'celesta', stem='front', pan=100, vol=70, dyn='mp')
    dr = S.part('hands', 'drums', stem='back', pan=58, vol=88, dyn='mf')

    KAL = '0 2 1 3 0 2 4'

    def groove(b0, b1, light=False):
        arp(ka, b0, b1, KAL, step=0.5, n=4, low=P('E4'), high=P('E5'), length=0.6, accent_every=None)
        bassline(bs, b0, b1, 'R:q R:q 5:q.', octave=2)
        v = 40 if light else 56
        for b in range(b0, b1):
            hit(dr, b, 'tumba', 0, vel=v + 12, dur=0.5)
            hit(dr, b, 'conga', 1.0, vel=v + 4, dur=0.5)
            hit(dr, b, 'conga', 2.0, vel=v + 8, dur=0.5)
            hit(dr, b, 'bongo', 3.0, vel=v - 4, dur=0.5)
            for k in range(7):
                hit(dr, b, 'shaker', k * 0.5, vel=v - 18 + (8 if k in (0, 2, 4) else 0), dur=0.25)

    groove(1, 3, light=True)
    ka.dyn(1, 'mp')

    # A
    groove(3, 11)
    pf.line(3, Z_A)
    pf.dyn(3, 'mf')

    # A2
    groove(11, 19)
    pf.line(11, Z_A2)
    pf.hairpin(11, 15, 'mf', 'f')
    pf.dyn(15, 'mf')
    pad(pd, 11, 19, n=4, low=P('E4'), high=P('E5'))
    pd.dyn(11, 'p')

    # B: street tune
    groove(19, 27)
    fl.line(19, 'G#4:q C#5:q E5:q. | E5:q. C#5:q A4:q | B4:q E5:q G#5:q. | F#5:q. D#5:q B4:q |'
                'G#5:q C#6:q B5:e A5:e G#5:e | A5:q. E5:q C#5:q | F#5:q A5:q G#5:e F#5:e E5:e | D#5:h. r:e')
    fl.dyn(19, 'mf')
    arp(mb, 19, 27, '0 1 2 1 0 2 1', step=0.5, n=3, low=P('G#4'), high=P('G#5'), length=0.5)
    mb.dyn(19, 'mp')

    # C: the Adventure head in 7/8, lydian
    groove(27, 35)
    hn.line(27, 'E5:q. B4:e E5:e G#5:q | F#5:q. E5:e C#5:q. | D#5:q. E5:e F#5:e B5:q | F#5:h. r:e |'
                'E5:q. B4:e E5:e B5:q | A#5:q. G#5:e F#5:e E5:e F#5:e | C#6:q. B5:e A5:q. | B5:h. r:e', octave=-1)
    hn.dyn(27, 'mf')
    vn.line(27, 'E5:q. B4:e E5:e G#5:q | F#5:q. E5:e C#5:q. | D#5:q. E5:e F#5:e B5:q | F#5:h. r:e |'
                'E5:q. B4:e E5:e B5:q | A#5:q. G#5:e F#5:e E5:e F#5:e | C#6:q. B5:e A5:q. | B5:h. r:e')
    vn.dyn(27, 'mf')
    vn.hairpin(31, 35, 'mf', 'f')
    arp(sy, 27, 35, '0 1 2 3 2 1 0', step=0.25, n=4, low=P('E5'), high=P('E6'), length=0.2)
    sy.dyn(27, 'p')
    pad(pd, 27, 35, n=4, low=P('E4'), high=P('E5'))

    # D: breakdown
    arp(ka, 35, 43, KAL, step=0.5, n=4, low=P('E4'), high=P('E5'), length=0.8)
    ka.dyn(35, 'mp')
    pad(pd, 35, 43, n=4, low=P('C#4'), high=P('C#5'))
    pd.hairpin(35, 39, 'p', 'mp')
    pd.hairpin(39, 43, 'mp', 'p')
    bs.line(35, 'C#2:h. r:e | A1:h. r:e | C#2:h. r:e | A1:h. r:e | F#1:h. r:e | B1:h. r:e | E2:h. r:e | B1:q B1:q B1:q.')
    for b in range(35, 43):
        hit(dr, b, 'conga', 0, vel=46, dur=0.5)
        hit(dr, b, 'tumba', 2.0, vel=40, dur=0.5)
    pf.line(36, 'r:q. G#5:q E5:q')
    pf.line(37, 'r:q. G#5:q E5:q', vel=-20)
    pf.line(38, 'r:q. A5:q E5:q')
    pf.line(39, 'r:q. A5:q E5:q', vel=-20)
    pf.line(40, 'r:q. A5:q F#5:q | r:q. B5:q F#5:q')
    pf.dyn(36, 'mp')
    ce.line(41, 'r:h B6:e G#6:e E6:e | r:q. F#6:q D#6:q')
    ce.dyn(41, 'mp')

    # A': oboe + pan flute in thirds
    groove(43, 51)
    pf.line(43, Z_A)
    pf.dyn(43, 'mf')
    ob.line(43, "G#4:q B4:q D#5:e E5:e F#5:e | G#5:q. F#5:q E5:q | E5:q D#5:q B4:e D#5:e E5:e | B4:q. G#4:q. r:e |"
                "A4:q C#5:q E5:e E5:e D#5:e | D#5:q. B4:q F#4:q | E5:q D#5:q B4:e C#5:e D#5:e | B4:h. r:e")
    ob.dyn(43, 'mp')

    # A2': marimba + strings
    groove(51, 59)
    mb.line(51, Z_A2)
    mb.dyn(51, 'mf')
    vn.line(51, Z_A2)
    vn.dyn(51, 'mp')
    vn.hairpin(55, 59, 'mp', 'p')
    pad(pd, 51, 59, n=4, low=P('E4'), high=P('E5'))
    pd.dyn(51, 'p')

    # link
    groove(59, 63, light=True)
    return S
