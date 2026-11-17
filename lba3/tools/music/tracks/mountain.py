"""The High Hamalayi — the Hamalayi outdoors (first piece of its playlist), the monastery hall, Lhar's houses
(muffled). MUSIC-LBA, 17.11.2026 (replaces the slower drone piece of the same name).

A mountain trail at a walking trot: A dorian, 4/4 at 92. A pan-flute tune over a hammered dulcimer and kalimba
ostinato, a bass that climbs, soft low toms and a shaker like a caravan's bells; a broad strain for horn and
violins in C; then the monastery: Twinsen's theme sits naturally in the mode (themes.TWIN_A in G = the notes of A
dorian), the pan flute plays it, and a short unison chant answers with tubular bells. No drone. Original.

  intro  1-2   dulcimer ostinato, toms
  A      3-10  the trail tune, pan flute
  A'    11-18  the tune on shakuhachi with violins, harp
  B     19-26  C major, horn and violins, broad; kalimba
  C     27-34  Twinsen's theme in the mode on the pan flute (27-30), the chant and bells (31-34)
  A''   35-38  the first half of the tune, pan flute and cello; back to bar 3
"""
from score import Song, P, pad, arp, bassline, groove, comp
from themes import TWIN_A, shift

MA = ("E5:q. A5:e G5:e E5:e D5:q | D5:e E5:e G5:e A5:e B5:h | A5:q. F#5:e E5:q D5:q | E5:h. r:q |"
      "E5:q. A5:e G5:e E5:e D5:q | C5:e D5:e E5:e G5:q. E5:e G5:e | A5:q. G5:e F#5:q E5:q | A4:h. r:q")
MA_CH = 'Am | G | D/F# | Am | Am | C | D Em | Am'
MB = ("G4:q. C5:e E5:q G5:q | D5:q. E5:e D5:q B4:q | C5:q. E5:e A5:q G5:q | F#5:q. E5:e D5:h |"
      "E5:q. G5:e C6:q B5:q | A5:q. G5:e D5:h | E5:q. D5:e B4:q A4:q | A4:h. r:q")
MB_CH = 'C | G/B | Am | D | C | G | Em7 D | Am'
HOOK = '|'.join(shift(TWIN_A, -7).split('|')[0:4])
CHANT = "A3:q C4:q D4:q E4:q | G4:h E4:h | F#4:q E4:q D4:q B3:q | A3:h. r:q"
BASS = 'R:q. 5:e 8:q 5:q'
KIT = {'kick': 'x.......x.......', 'tom_lo': '......x.......x.', 'shaker': 'o.x.o.x.o.x.o.x.', 'tri': '............x...'}


def song():
    S = Song('mountain', 652000, meter=(4, 4), title='The High Hamalayi',
             role="the Hamalayi outdoors, the monastery hall, Lhar's houses")
    S.intro_bars, S.body_bars = 2, 36
    S.mix = {'room': {'rt60': 2.6, 'predelay': 0.026, 'bright': 0.5}, 'wet': {'front': 0.24, 'mid': 0.3, 'back': 0.44},
             'lufs': -18.0}
    S.chords(1, 'Am | G Am')
    S.chords(3, MA_CH)
    S.chords(11, MA_CH)
    S.chords(19, MB_CH)
    S.chords(27, 'Em7 | Am7 | D | G | Am | Em | D | Am')
    S.chords(35, 'Am | G | D/F# | Am')

    pf = S.part('panflute', 'panflute', stem='front', pan=58, vol=104, legato=True, dyn='mf')
    sk = S.part('shakuhachi', 'shakuhachi', stem='front', pan=46, vol=100, legato=True, dyn='mf')
    hn = S.part('horn', 'horn', stem='back', pan=42, vol=86, legato=True, dyn='mf')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=90, legato=True, dyn='mp')
    vc = S.part('cello', 'cello', stem='mid', pan=80, vol=88, legato=True, dyn='mp')
    ch = S.part('chant', 'oohs', stem='mid', pan=60, vol=96, legato=True, dyn='mf')
    tu = S.part('bells', 'tubular', stem='back', pan=70, vol=70, dyn='mp')
    dl = S.part('dulcimer', 'dulcimer', stem='mid', pan=26, vol=110, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=86, vol=80, dyn='mp')
    ka = S.part('kalimba', 'kalimba', stem='mid', pan=20, vol=80, dyn='mp')
    bs = S.part('bass', 'acbass', stem='mid', pan=64, vol=78, dyn='mf')
    dr = S.part('kit', 'kit', stem='back', pan=64, vol=76, dyn='mp')

    def bed(b0, b1, lvl='mp', kit=KIT):
        dl.dyn(b0, lvl)
        arp(dl, b0, b1, '0 1 2 1 3 1 2 1', step=0.5, n=4, low=P('A3'), high=P('A5'), length=0.6)
        bs.dyn(b0, 'mf')
        bassline(bs, b0, b1, BASS, octave=2)
        dr.dyn(b0, lvl)
        groove(dr, b0, b1, kit)

    # ------------------------------------------------------------ intro (1-2)
    dl.dyn(1, 'mp')
    arp(dl, 1, 3, '0 1 2 1 3 1 2 1', step=0.5, n=4, low=P('A3'), high=P('A5'), length=0.6)
    dr.dyn(1, 'p')
    groove(dr, 1, 3, {'tom_lo': '......x.......x.', 'shaker': 'o.x.o.x.o.x.o.x.'})

    # ------------------------------------------------------------ A (3-10): pan flute
    pf.dyn(3, 'mf')
    pf.line(3, MA)
    bed(3, 11)

    # ------------------------------------------------------------ A' (11-18): shakuhachi, violins, harp
    sk.dyn(11, 'mf')
    sk.line(11, MA)
    vn.dyn(11, 'p')
    vn.line(11, 'C4:h. B3:q | B3:h D4:h | D4:h A3:h | C4:h. B3:q | C4:h. E4:q | E4:h. D4:q | D4:h E4:h | E4:h. r:q')
    hp.dyn(11, 'mp')
    arp(hp, 11, 19, '0 1 2 3 2 1 2 3', step=0.5, n=4, low=P('A3'), high=P('A5'), length=1.0)
    bed(11, 19)

    # ------------------------------------------------------------ B (19-26): horn and violins in C, kalimba
    hn.dyn(19, 'mf')
    hn.line(19, shift(MB, -12))
    vn.dyn(19, 'mf')
    vn.line(19, MB)
    ka.dyn(19, 'mp')
    arp(ka, 19, 27, '0 2 1 2 0 2 1 2', step=0.5, n=3, low=P('C5'), high=P('C6'), length=0.5)
    bed(19, 27, 'mp', {**KIT, 'conga': '..x.......x..x..'})

    # ------------------------------------------------------------ C (27-34): Twinsen's theme in the mode, then the chant
    pf.dyn(27, 'mf')
    pf.line(27, HOOK)
    hp.dyn(27, 'mp')
    arp(hp, 27, 31, '0 1 2 3 2 1 2 3', step=0.5, n=4, low=P('E3'), high=P('E5'), length=1.0)
    ch.dyn(31, 'mf')
    ch.line(31, CHANT)
    vc.dyn(31, 'mp')
    vc.line(31, shift(CHANT, -12))
    tu.dyn(31, 'mp')
    tu.line(31, 'A4:h r:h | E5:h r:h | D5:h r:h | A4:w')
    bed(27, 31, 'mp')
    bed(31, 35, 'p', {'kick': 'x.......x.......', 'tom_lo': '......x.......x.', 'tri': '............x...'})

    # ------------------------------------------------------------ A'' (35-38): first half of the tune
    pf.dyn(35, 'mf')
    pf.line(35, '|'.join(MA.split('|')[0:4]))
    vc.dyn(35, 'mp')
    vc.line(35, 'A3:h. G3:q | G3:h. B3:q | A3:h F#3:h | A3:h. r:q')
    bed(35, 39)
    return S
