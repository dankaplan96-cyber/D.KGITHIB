"""Island Exploration — Citadel island outside the village (beaches, cliffs, lighthouse, camp), Citadel Spaceport's
terminal. MUSIC-LBA, 17.11.2026 (replaces the earlier string-ostinato piece of the same name).

Out walking in the sun: C major, 4/4 at 120. A skipping recorder tune with a rest in the middle of its bar (the
skip), a strummed steel guitar, marimba, pizzicato, a bass that bounces, shaker, tambourine and congas; an A-minor
strain on oboe and violins whose middle bars rise like the hook; then Twinsen's theme itself in C on the horns,
the island's broad moment. Original.

  intro  1-2   guitar strum, bass, shaker
  A      3-10  the walking tune, recorder
  A'    11-18  clarinet and flute, marimba, pizzicato
  B     19-26  A minor: oboe, violins underneath, harp
  C     27-34  Twinsen's theme in C, horns and violins, timpani on the arrivals
  A''   35-46  the tune on recorder and violins (12 bars: the last four a quiet walk back to bar 3)
"""
from score import Song, P, pad, arp, bassline, groove, comp
from themes import TWIN_A, shift

IA = ("G4:e C5:e E5:e G5:e r:e E5:e G5:q | A5:q. G5:e F5:e E5:e D5:e C5:e | D5:q. G4:e B4:e D5:e G5:q | E5:q. D5:e C5:h |"
      "A4:e C5:e E5:e A5:e r:e G5:e E5:q | F5:q. E5:e D5:e C5:e A4:e C5:e | F5:q. E5:e D5:q B4:q | C5:h. r:q")
IA_CH = 'C | F | G | C | Am | F | Dm7 G7 | C'
IB = ("E5:q. A4:e C5:e E5:e A5:q | G5:q. E5:e B4:h | A4:e C5:e F5:e A5:q. G5:e F5:e | E5:q. D5:e C5:h |"
      "D5:e E5:e F5:e A5:q. G5:e F5:e | G5:q. F5:e E5:q D5:q | C5:e D5:e E5:e A5:q. G5:e E5:e | D5:h. r:q")
IB_CH = 'Am | Em | F | C/E | Dm | G | Am F | G7'
BASS = 'R:q. 5:e 8:q 5:e 3:e'
STRUM = [(0.0, 0.9), (1.5, 0.4), (2.0, 0.9), (3.0, 0.4), (3.5, 0.4)]
KIT = {'kick': 'x.....x.x.......', 'side': '....x.......x...', 'shaker': 'o.x.o.x.o.x.o.x.'}
KIT_FULL = {**KIT, 'tamb': '....x.......x...', 'conga': '..x.......x..x..', 'tumba': '.......x.......x'}


def song():
    S = Song('island', 500000, title='Island Exploration', role='Citadel island outdoors')
    S.intro_bars, S.body_bars = 2, 44
    S.mix = {'room': {'rt60': 2.0, 'predelay': 0.02, 'bright': 0.55}, 'wet': {'front': 0.2, 'mid': 0.26, 'back': 0.38},
             'lufs': -17.0}
    S.chords(1, 'C | G7')
    for b in (3, 11, 35):
        S.chords(b, IA_CH)
    S.chords(19, IB_CH)
    S.chords(27, 'C | F | G7 | C | C | Am F | Dm G7 | C')
    S.chords(43, 'C | F | Dm7 | G7')

    rc = S.part('recorder', 'recorder', stem='front', pan=56, vol=110, legato=True, dyn='mf')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=48, vol=96, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=70, vol=84, legato=True, dyn='mp')
    ob = S.part('oboe', 'oboe', stem='front', pan=62, vol=96, legato=True, dyn='mf')
    gt = S.part('guitar', 'steelgtr', stem='mid', pan=32, vol=86, dyn='mp')
    mb = S.part('marimba', 'marimba', stem='mid', pan=84, vol=84, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=72, vol=80, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=24, vol=80, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=40, vol=92, legato=True, dyn='mp')
    bs = S.part('bass', 'fingbass', stem='mid', pan=64, vol=78, dyn='mf')
    hn = S.part('horns', 'horn', stem='back', pan=44, vol=96, legato=True, dyn='mf')
    ti = S.part('timpani', 'timpani', stem='back', pan=58, vol=80, dyn='mp')
    dr = S.part('kit', 'kit', stem='back', pan=64, vol=78, dyn='mp')

    def bed(b0, b1, lvl='mp', kit=KIT):
        gt.dyn(b0, lvl)
        comp(gt, b0, b1, STRUM, n=4, low=P('C3'), high=P('C5'))
        bs.dyn(b0, 'mf')
        bassline(bs, b0, b1, BASS, octave=2)
        dr.dyn(b0, lvl)
        groove(dr, b0, b1, kit)

    # ------------------------------------------------------------ intro (1-2)
    bed(1, 3, 'mp', {'shaker': 'o.x.o.x.o.x.o.x.', 'kick': 'x.......x.......'})

    # ------------------------------------------------------------ A (3-10): recorder
    rc.dyn(3, 'mf')
    rc.line(3, IA)
    bed(3, 11)
    mb.dyn(6, 'mp')
    mb.line(6, 'r:h. E5:e G5:e')
    mb.line(10, 'r:h. G5:e B4:e')

    # ------------------------------------------------------------ A' (11-18): clarinet + flute, marimba, pizzicato
    cl.dyn(11, 'mf')
    cl.line(11, IA)
    fl.dyn(11, 'mp')
    fl.line(11, IA, transpose=12)
    mb.dyn(11, 'mp')
    arp(mb, 11, 19, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('G3'), high=P('G5'), length=0.4)
    pz.dyn(11, 'mp')
    comp(pz, 11, 19, [(0.5, 0.3), (1.5, 0.3), (2.5, 0.3), (3.5, 0.3)], n=3, low=P('G3'), high=P('G4'))
    bed(11, 19, 'mp', KIT_FULL)

    # ------------------------------------------------------------ B (19-26): A minor, oboe, violins, harp
    ob.dyn(19, 'mf')
    ob.line(19, IB)
    vn.dyn(19, 'p')
    vn.line(19, 'C4:h E4:h | B3:h. D4:q | C4:h A3:h | G3:h C4:h | A3:h F4:h | D4:h B3:h | C4:h C4:h | B3:h. r:q')
    hp.dyn(19, 'mp')
    arp(hp, 19, 27, '0 1 2 3 2 1 2 3', step=0.5, n=4, low=P('A3'), high=P('A5'), length=1.0)
    bed(19, 27, 'p', {'kick': 'x.......x.......', 'side': '....x.......x...', 'shaker': 'o.x.o.x.o.x.o.x.'})

    # ------------------------------------------------------------ C (27-34): Twinsen's theme in C, horns
    hn.dyn(27, 'mf')
    hn.line(27, shift(TWIN_A, -14))
    vn.dyn(27, 'mf')
    vn.line(27, shift(TWIN_A, -2))
    mb.dyn(27, 'mp')
    arp(mb, 27, 35, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('G3'), high=P('G5'), length=0.4)
    comp(pz, 27, 35, [(0.5, 0.3), (1.5, 0.3), (2.5, 0.3), (3.5, 0.3)], n=3, low=P('G3'), high=P('G4'))
    ti.dyn(27, 'mp')
    for b in (27, 30, 31, 34):
        ti.line(b, 'C2:q r:h. ' if b in (27, 31) else 'r:h. G2:q' if b == 30 else 'C2:h r:h')
    bed(27, 35, 'mf', KIT_FULL)

    # ------------------------------------------------------------ A'' (35-46): recorder + violins, a quiet walk back
    rc.dyn(35, 'mf')
    rc.line(35, IA)
    vn.dyn(35, 'mp')
    vn.line(35, IA, transpose=-12)
    bed(35, 43, 'mp', KIT_FULL)
    bed(43, 47, 'p')
    mb.dyn(43, 'p')
    mb.line(44, 'r:h. A4:e C5:e')
    mb.line(46, 'r:h G4:e B4:e D5:e F5:e')
    return S
