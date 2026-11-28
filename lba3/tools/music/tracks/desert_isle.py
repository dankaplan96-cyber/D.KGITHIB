"""Desert Island — the Desert outdoors (first piece of its playlist), Kesh's houses and the other Desert rooms
(muffled). MUSIC-LBA, 17.11.2026 (replaces the lazier 96 bpm piece of the same name).

Sunny and dusty, with a skip in its step: D mixolydian (the C natural is the sand), 4/4 at 104. A syncopated
harmonica tune over a strummed steel guitar, banjo rolls, a fretless bass that walks, congas, a guiro and a side
stick; a B-minor strain on the fiddle; Twinsen's theme quoted on the tin whistle with the island's flat seventh
(themes.TWIN_A with C natural). Original.

  intro  1-2   steel guitar, bass, shaker
  A      3-10  the desert tune, harmonica
  A'    11-18  flute and marimba with the tune, banjo rolls, the harmonica's fills
  B     19-26  B minor → D, the fiddle, horns underneath
  C     27-34  Twinsen's theme in mixolydian, tin whistle, marimba, the busiest drums
  A''   35-42  harmonica and fiddle together, horns; thins in its last bar back to bar 3
"""
from score import Song, P, pad, arp, bassline, groove, comp

DA = ("A4:e D5:e r:e D5:e E5:q F#5:e A5:e | G5:q. E5:e C5:q r:e A4:e | B4:e D5:e E5:e G5:e B5:q. A5:e | F#5:q. E5:e D5:h |"
      "A4:e D5:e r:e D5:e E5:q F#5:e A5:e | C6:q. B5:e A5:q G5:q | B5:e A5:e G5:e E5:e D5:q E5:e C5:e | D5:h. r:q")
DA_CH = 'D | C | G | D | D | C | G Am7 | D'
DB = ("F#5:q. D5:e B4:q A4:q | B4:q. D5:e G5:q F#5:e E5:e | E5:q. C#5:e A4:q B4:e C#5:e | D5:q. F#5:e A5:h |"
      "B5:q. A5:e F#5:q D5:q | E5:q. G5:e B5:q A5:e G5:e | E5:q G5:q A5:e G5:e E5:e C#5:e | D5:h r:h")
DB_CH = 'Bm | G | A | D | Bm | G | C A7 | D'
DC = ("D5:e E5:e F#5:e B5:q. A5:e F#5:e | G5:q. F#5:e E5:q D5:q | C5:e D5:e E5:e A5:q. G5:e E5:e | F#5:h. r:q |"
      "D5:e E5:e F#5:e B5:q. A5:e F#5:e | D6:q. C6:e B5:q A5:q | G5:e F#5:e E5:e C6:q. B5:e G5:e | D5:h. r:q")
DC_CH = 'D | G | C | D | D | G | C Am7 | D'
HM_FILL = ("r:w | r:h. r:e C5:e | r:w | r:h G4:e A4:e C5:e D5:e | r:w | r:h. r:e D5:e | r:w | r:h F#4:e A4:e C5:e D5:e")
BASS = 'R:q. 5:e 8:q 5:e 3:e'
STRUM = [(0.0, 0.9), (1.5, 0.4), (2.0, 0.9), (3.0, 0.4), (3.5, 0.4)]
KIT = {'kick': 'x.....x...x.....', 'side': '....x.......x...', 'shaker': 'o.x.o.x.o.x.o.x.',
       'conga': '..x..x.x..x.....', 'guiro': '..x.......x.....'}


def song():
    S = Song('desert_isle', 576000, meter=(4, 4), title='Desert Island',
             role="Desert Island outdoors, Kesh's houses, the post's cabins, the crew's bunkhouse")
    S.intro_bars, S.body_bars = 2, 40
    S.mix = {'room': {'rt60': 1.6, 'predelay': 0.015, 'bright': 0.55}, 'wet': {'front': 0.18, 'mid': 0.24, 'back': 0.36},
             'lufs': -17.5}
    S.chords(1, 'D | C D')
    for b in (3, 11, 35):
        S.chords(b, DA_CH)
    S.chords(19, DB_CH)
    S.chords(27, DC_CH)

    hm = S.part('harmonica', 'harmonica', stem='front', pan=56, vol=127, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=70, vol=84, legato=True, dyn='mf')
    fd = S.part('fiddle', 'fiddle', stem='front', pan=44, vol=118, legato=True, dyn='mf')
    wh = S.part('whistle', 'whistle', stem='front', pan=60, vol=80, legato=True, dyn='mf')
    mb = S.part('marimba', 'marimba', stem='mid', pan=84, vol=84, dyn='mf')
    bj = S.part('banjo', 'banjo', stem='mid', pan=24, vol=74, dyn='mp')
    gt = S.part('guitar', 'steelgtr', stem='mid', pan=34, vol=88, dyn='mp')
    bs = S.part('bass', 'fretless', stem='mid', pan=64, vol=74, dyn='mf')
    vn = S.part('strings', 'strings_slow', stem='mid', pan=50, vol=66, dyn='pp')
    hn = S.part('horns', 'horn', stem='back', pan=42, vol=56, legato=True, dyn='mp')
    dr = S.part('kit', 'kit', stem='back', pan=64, vol=80, dyn='mp')

    def bed(b0, b1, lvl='mp', kit=KIT):
        gt.dyn(b0, lvl)
        comp(gt, b0, b1, STRUM, n=4, low=P('D3'), high=P('D5'))
        bs.dyn(b0, 'mf')
        bassline(bs, b0, b1, BASS, octave=2)
        dr.dyn(b0, lvl)
        groove(dr, b0, b1, kit)

    # ------------------------------------------------------------ intro (1-2)
    bed(1, 3, 'mp', {'shaker': 'o.x.o.x.o.x.o.x.', 'kick': 'x.......x.......'})

    # ------------------------------------------------------------ A (3-10): harmonica
    hm.dyn(3, 'f')
    hm.line(3, DA)
    bed(3, 11)

    # ------------------------------------------------------------ A' (11-18): flute + marimba, banjo, harmonica fills
    fl.dyn(11, 'mf')
    fl.line(11, DA)
    mb.dyn(11, 'mp')
    mb.line(11, DA, transpose=-12)
    hm.dyn(11, 'mp')
    hm.line(11, HM_FILL)
    bj.dyn(11, 'mp')
    arp(bj, 11, 19, '0 1 2 3 1 2 3 2', step=0.5, n=4, low=P('D4'), high=P('D5'), length=0.5)
    bed(11, 19)

    # ------------------------------------------------------------ B (19-26): fiddle in B minor, horns
    fd.dyn(19, 'mf')
    fd.line(19, DB)
    hn.dyn(19, 'p')
    pad(hn, 19, 27, n=2, low=P('D4'), high=P('B4'))
    vn.dyn(19, 'pp')
    pad(vn, 19, 27, n=3, low=P('F#3'), high=P('F#4'))
    mb.dyn(19, 'p')
    arp(mb, 19, 27, '0 2 1 2 0 2 1 2', step=0.5, n=3, low=P('B3'), high=P('B4'), length=0.4)
    bed(19, 27, 'mp', {'kick': 'x.......x.......', 'side': '....x.......x...', 'shaker': 'o.x.o.x.o.x.o.x.',
                       'conga': '..x.......x..x..'})

    # ------------------------------------------------------------ C (27-34): Twinsen's theme, tin whistle
    wh.dyn(27, 'mf')
    wh.line(27, DC)
    mb.dyn(27, 'mf')
    arp(mb, 27, 35, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('A3'), high=P('A5'), length=0.4)
    bj.dyn(27, 'mp')
    arp(bj, 27, 35, '0 1 2 3 1 2 3 2', step=0.5, n=4, low=P('D4'), high=P('D5'), length=0.5)
    hn.dyn(30, 'mp')
    hn.line(30, 'r:h E4:e F#4:e A4:q')
    hn.line(34, 'r:h F#4:e A4:e C5:q')
    bed(27, 35, 'mf', {**KIT, 'tumba': '.......x.......x', 'cowbell': '..........x.....'})

    # ------------------------------------------------------------ A'' (35-42): harmonica + fiddle, horns
    hm.dyn(35, 'f')
    hm.line(35, DA)
    fd.dyn(35, 'mp')
    fd.line(35, DA, transpose=-12)
    hn.dyn(35, 'p')
    pad(hn, 35, 42, n=2, low=P('D4'), high=P('B4'))
    bj.dyn(35, 'p')
    arp(bj, 35, 42, '0 1 2 3 1 2 3 2', step=0.5, n=4, low=P('D4'), high=P('D5'), length=0.5)
    bed(35, 42)
    bed(42, 43, 'p', {'shaker': 'o.x.o.x.o.x.o.x.', 'kick': 'x.......x.......'})
    return S
