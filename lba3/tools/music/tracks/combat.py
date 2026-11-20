"""Danger / Combat — drones, mites and guards chasing Twinsen (any area; the music manager switches in and out).
MUSIC-LBA, 17.11.2026 (replaces the earlier piece of the same name).

A light action piece, not a trailer: E minor, 4/4, 144 bpm, a bouncing 8th-note bass and a staccato string
ostinato, marimba, congas, kick and a light snare; Twinsen's hook in E minor on the horns (he is the one being
chased), a punchy low-brass riff answered by the xylophone, then the theme itself in G major on the trumpet (he
fights back), a breakdown on hand drums, and the hook again in tutti. Kept in the low and middle register with
no hi-hats or cymbals, so the game's bright alert / zap / hit cues stay clear. Original.

  intro  1-2   ostinato, bass, a tom pickup
  A      3-10  the hook in E minor, horns
  B     11-18  low-brass riff (trombone, bassoon), xylophone answers, tremolo violins
  C     19-26  Twinsen's theme in G on the trumpet, horns, marimba
  D     27-34  breakdown: congas, marimba, pizzicato, the clarinet's low riff, a swell to the top
  A'    35-42  the hook tutti (horns, violins), timpani
  E     43-50  the riff again, thinning to the loop point (bar 3)
"""
from score import Song, P, pad, arp, bassline, groove, roll, comp
from themes import TWIN_A, shift

HOOK_MIN = ("E4:e F#4:e G4:e C5:q. B4:e G4:e | A4:q. G4:e F#4:q E4:q | D#4:e E4:e F#4:e B4:q. A4:e F#4:e | G4:h. r:e B3:e |"
            "E4:e F#4:e G4:e C5:q. B4:e G4:e | E5:q. D5:e C5:q B4:q | A4:e G4:e F#4:e B4:q. A4:e D#4:e | E4:h. r:q")
HOOK_MIN_CH = 'Em C | Am B7 | B7 | Em | Em C | C Am | Am B7 | Em'
RIFF = ("C3:q! r:e G2:e C3:e! D3:e! E3:q! | D3:q! r:e A2:e D3:e! E3:e! F#3:q! | E3:q! r:e B2:e E3:e! F#3:e! G3:e! B3:e! |"
        "A3:e! G3:e! F#3:e! E3:e! D3:q! B2:q! | C3:q! r:e G2:e C3:e! D3:e! E3:q! | D3:q! r:e A2:e D3:e! E3:e! F#3:q! |"
        "E3:q! r:e B2:e E3:e! F#3:e! A3:q! | D#3:q! F#3:q! A3:q! B3:q!")
RIFF_CH = 'C | D | Em | Em | C | D | B7sus4 | B7'
XY_ANS = ("r:h. E5:e G5:e | r:h. F#5:e A5:e | r:h B5:e A5:e G5:e F#5:e | E5:q r:h. |"
          "r:h. E5:e G5:e | r:h. F#5:e A5:e | r:h. A5:e B5:e | r:h D#5:e F#5:e A5:e B5:e")
BASS8 = 'R:e! R:e! 8:e! R:e! 5:e! R:e! 8:e! 5:e!'
OSTI = '0 0 2 0 1 0 2 1'
KIT = {'kick': 'x.....x...x.....', 'snare': '....o.......o...', 'shaker': 'o.o.o.o.o.o.o.o.',
       'conga': '..x...x...x..x..', 'tumba': '.......x......x.'}


def song():
    S = Song('combat', 416000, title='Danger', role='Combat (drones, mites, guards)')
    S.intro_bars, S.body_bars = 2, 48
    S.mix = {'room': {'rt60': 1.5, 'predelay': 0.012, 'bright': 0.4}, 'wet': {'front': 0.16, 'mid': 0.2, 'back': 0.28},
             'lufs': -16.5, 'eq': {'peaks': [(260, -1.5, 0.9), (2500, -1.0, 0.7)]}}
    S.chords(1, 'Em | Em')
    S.chords(3, HOOK_MIN_CH)
    S.chords(11, RIFF_CH)
    S.chords(19, 'G | C | D7 | G | G | Em C | Am D7 | G')
    S.chords(27, 'Em | Em | C | C | Am | Am | B7 | B7')
    S.chords(35, HOOK_MIN_CH)
    S.chords(43, RIFF_CH)

    hn = S.part('horns', 'horn', stem='back', pan=44, vol=100, legato=True, dyn='f')
    tp = S.part('trumpet', 'trumpet', stem='back', pan=60, vol=90, legato=True, dyn='f')
    tb = S.part('trombones', 'trombone', stem='back', pan=82, vol=92, dyn='f')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=76, vol=88, dyn='mf')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=56, vol=88, dyn='mf')
    xy = S.part('xylo', 'xylo', stem='front', pan=70, vol=100, dyn='mf')
    mb = S.part('marimba', 'marimba', stem='mid', pan=24, vol=86, dyn='mf')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=96, legato=True, dyn='mf')
    os_ = S.part('ostinato', 'strings', stem='mid', pan=66, vol=88, dyn='mf')
    tr = S.part('tremolo', 'trem', stem='mid', pan=30, vol=76, dyn='p')
    pz = S.part('pizz', 'pizz', stem='mid', pan=74, vol=84, dyn='mf')
    bs = S.part('bass', 'fingbass', stem='mid', pan=64, vol=80, dyn='mf')
    ti = S.part('timpani', 'timpani', stem='back', pan=58, vol=96, dyn='mf')
    dr = S.part('kit', 'kit', stem='back', pan=64, vol=84, dyn='mf')

    def drive(b0, b1, lvl='mf', kit=KIT):
        bs.dyn(b0, lvl)
        bassline(bs, b0, b1, BASS8, octave=2)
        os_.dyn(b0, lvl)
        arp(os_, b0, b1, OSTI, step=0.5, n=3, low=P('E3'), high=P('E4'), length=0.3)
        dr.dyn(b0, lvl)
        groove(dr, b0, b1, kit)

    # ------------------------------------------------------------ intro (1-2)
    drive(1, 3, 'mp', {'kick': 'x.......x.......', 'conga': '..x...x...x..x..'})
    dr.dyn(2, 'mf')
    groove(dr, 2, 3, {'tom_lo': '............x.x.', 'tom_mid': '.............x.x'})

    # ------------------------------------------------------------ A (3-10): the hook in E minor, horns
    hn.dyn(3, 'f')
    hn.line(3, HOOK_MIN)
    drive(3, 11)
    mb.dyn(3, 'mp')
    arp(mb, 3, 11, '0 2 1 2 0 2 1 2', step=0.5, n=3, low=P('B3'), high=P('B4'), length=0.4)
    ti.dyn(3, 'mf')
    for b in (3, 7):
        ti.line(b, 'E2:q r:h. ')

    # ------------------------------------------------------------ B (11-18): low-brass riff, xylophone answers
    tb.dyn(11, 'f')
    tb.line(11, RIFF)
    bn.dyn(11, 'mf')
    bn.line(11, RIFF)
    xy.dyn(11, 'mf')
    xy.line(11, XY_ANS)
    tr.dyn(11, 'p')
    tr.hairpin(15, 19, 'p', 'mf')
    pad(tr, 11, 19, n=3, low=P('B4'), high=P('B5'))
    drive(11, 19)

    # ------------------------------------------------------------ C (19-26): Twinsen's theme in G, trumpet
    tp.dyn(19, 'f')
    tp.line(19, shift(TWIN_A, -7))
    hn.dyn(19, 'p')
    pad(hn, 19, 27, n=2, low=P('D4'), high=P('B4'))
    mb.dyn(19, 'mf')
    arp(mb, 19, 27, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('G3'), high=P('G5'), length=0.4)
    bs.dyn(19, 'mf')
    bassline(bs, 19, 27, BASS8, octave=2)
    pz.dyn(19, 'mf')
    comp(pz, 19, 27, [(0.5, 0.3), (1.5, 0.3), (2.5, 0.3), (3.5, 0.3)], n=3, low=P('G3'), high=P('G4'))
    dr.dyn(19, 'mf')
    groove(dr, 19, 27, {**KIT, 'tamb': '....x.......x...'})

    # ------------------------------------------------------------ D (27-34): breakdown
    mb.dyn(27, 'mf')
    arp(mb, 27, 35, '0 1 2 1 0 2 1 2', step=0.5, n=3, low=P('E4'), high=P('E5'), length=0.4)
    pz.dyn(27, 'mp')
    comp(pz, 27, 35, [(0.5, 0.3), (1.5, 0.3), (2.5, 0.3), (3.5, 0.3)], n=2, low=P('E3'), high=P('E4'))
    cl.dyn(27, 'f')
    cl.line(27, 'E4:e G4:e B4:e G4:e F#4:e G4:e A4:e F#4:e | E4:e G4:e B4:e E5:e D5:q B4:q |'
                'C5:e B4:e A4:e G4:e E4:e G4:e A4:e C5:e | B4:q. A4:e G4:q E4:q |'
                'A4:e C5:e E5:e C5:e B4:e C5:e D5:e B4:e | A4:e C5:e E5:e A5:e G5:q E5:q |'
                'F#5:e D#5:e B4:e D#5:e F#5:e A5:e G5:e F#5:e | D#5:h B4:h')
    bs.dyn(27, 'mf')
    bassline(bs, 27, 35, 'R:q. R:e 5:q 8:q', octave=2)
    tr.dyn(31, 'pp')
    tr.hairpin(31, 35, 'pp', 'f')
    pad(tr, 31, 35, n=3, low=P('B3'), high=P('B4'))
    dr.dyn(27, 'mf')
    groove(dr, 27, 35, {'kick': 'x.......x.......', 'conga': '..x.x.x...x.x.xx', 'tumba': '.......x.......x',
                        'bongo': 'x...x...x...x...', 'shaker': 'o.o.o.o.o.o.o.o.'})
    ti.dyn(34, 'p')
    roll(ti, 34, 'B2', 4, 40, 96)

    # ------------------------------------------------------------ A' (35-42): the hook tutti
    hn.dyn(35, 'f')
    hn.line(35, HOOK_MIN)
    vn.dyn(35, 'f')
    vn.line(35, HOOK_MIN, transpose=12)
    tb.dyn(35, 'p')
    pad(tb, 35, 43, n=2, low=P('E3'), high=P('B3'))
    drive(35, 43, 'f')
    ti.dyn(35, 'mf')
    for b in (35, 37, 39, 41):
        ti.line(b, 'E2:q r:h. ')
    mb.dyn(35, 'mf')
    arp(mb, 35, 43, '0 2 1 2 0 2 1 2', step=0.5, n=3, low=P('B3'), high=P('B4'), length=0.4)

    # ------------------------------------------------------------ E (43-50): the riff again, thinning
    tb.dyn(43, 'mf')
    tb.line(43, RIFF)
    bn.dyn(43, 'mf')
    bn.line(43, RIFF)
    xy.dyn(43, 'mp')
    xy.line(43, XY_ANS)
    drive(43, 49)
    drive(49, 51, 'mp', {'kick': 'x.....x...x.....', 'conga': '..x...x...x..x..', 'tumba': '.......x......x.'})
    dr.dyn(50, 'mf')
    groove(dr, 50, 51, {'tom_lo': '............x.x.', 'tom_mid': '.............x.x'})
    return S
