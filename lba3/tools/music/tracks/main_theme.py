"""Main Theme — the title screen: Twinsen's Theme (MUSIC-LBA, 17.11.2026; replaces the slower orchestral title).

Twinsen's own tune (themes.TWIN_A / TWIN_B), stated whole, bright and bouncy: pan flute, marimba, kalimba, pizzicato,
a fingered bass that walks, light percussion with a bounce (kick, side stick, shaker, congas). The place pieces
quote its hook (three rising notes, a leap, a fall) in their own colours. Original, written by hand.

  intro  1-4   marimba ostinato, kalimba, the hook teased on the pan flute; bass and shaker come in
  A      5-12  the theme on pan flute
  A'    13-20  the theme on violins and flute, a horn countermelody, pizzicato off-beats, congas
  B     21-28  B minor strain on oboe over accordion oom-pah, cello answer (a little wistful)
  C     29-36  adventure episode in G: the hook sequenced on the tin whistle, horns answering, the busiest groove
  A''   37-44  the theme on trumpet, violins and flute; thins in its last bar back to the pan flute (bar 5)
"""
from score import Song, P, pad, arp, bassline, groove, comp
from themes import TWIN_A, TWIN_A_CH, TWIN_B, TWIN_B_CH

BASS_A = ("D2:q. A2:e D3:q A2:q | G2:q. D3:e G2:q B2:q | A2:q. E3:e A2:q C#3:q | D3:q. A2:e F#2:q A2:q |"
          "D2:q. A2:e D3:q C#3:q | B2:q. F#2:e G2:q. D3:e | E2:q. B2:e A2:q. E2:e | D2:q A2:q D3:e C#3:e B2:e A2:e")
BASS_B = ("B1:q. F#2:e B2:q A2:q | E2:q. B2:e F#2:q. A#1:e | B1:q. F#2:e G2:q. D2:e | A1:q. E2:e A2:q A1:q |"
          "G1:q. D2:e G2:q B1:q | A1:q. E2:e A2:q C#2:q | E2:q. B1:e E2:q D2:q | A1:q. E2:e A1:q C#2:e E2:e")
C_LEAD = ("B4:e C5:e D5:e G5:q. F#5:e D5:e | E5:q. D5:e B4:h | C5:e D5:e E5:e A5:q. G5:e E5:e | F#5:h. r:q |"
          "B4:e C5:e D5:e G5:q. A5:e B5:e | C#6:q. B5:e A5:q G5:q | F#5:e G5:e A5:e D6:q. C#6:e B5:e | A5:h. r:e A4:e")
HORN_CTR = ("F#4:h A4:h | B4:h. A4:q | G4:h E4:q C#4:q | D4:q. E4:e F#4:q A4:q |"
            "A4:h F#4:h | F#4:h G4:h | G4:h E4:q C#4:q | D4:q. E4:e F#4:q A4:q")

KICK = 'x.....x.x.......'
SIDE = '....x.......x...'
SHAKE = 'o.x.o.x.o.x.o.x.'


def song():
    S = Song('main_theme', 536000, title='Main Theme', role='Title screen')
    S.intro_bars, S.body_bars = 4, 40
    S.mix = {'room': {'rt60': 2.0, 'predelay': 0.018, 'bright': 0.55}, 'wet': {'front': 0.2, 'mid': 0.24, 'back': 0.34},
             'lufs': -16.5}

    S.chords(1, 'D | G/D | D | A7sus4 A7')
    S.chords(5, TWIN_A_CH)
    S.chords(13, TWIN_A_CH)
    S.chords(21, TWIN_B_CH)
    S.chords(29, 'G | Em | C | D | G | A7 | Bm G | A7sus4 A7')
    S.chords(37, TWIN_A_CH)

    pf = S.part('panflute', 'panflute', stem='front', pan=58, vol=104, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=70, vol=84, legato=True, dyn='mp')
    wh = S.part('whistle', 'whistle', stem='front', pan=52, vol=82, legato=True, dyn='mf')
    ob = S.part('oboe', 'oboe', stem='front', pan=46, vol=92, legato=True, dyn='mf')
    ac = S.part('accordion', 'accordion', stem='mid', pan=34, vol=78, dyn='mp')
    mb = S.part('marimba', 'marimba', stem='mid', pan=84, vol=96, dyn='mf')
    ka = S.part('kalimba', 'kalimba', stem='mid', pan=24, vol=88, dyn='mf')
    hp = S.part('harp', 'harp', stem='mid', pan=30, vol=84, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=72, vol=90, dyn='mp')
    bs = S.part('bass', 'fingbass', stem='mid', pan=64, vol=84, dyn='mf')
    vn = S.part('violins', 'strings', stem='mid', pan=40, vol=96, legato=True, dyn='mp')
    vc = S.part('cello', 'cello', stem='mid', pan=80, vol=90, legato=True, dyn='mp')
    hn = S.part('horns', 'horn', stem='back', pan=44, vol=72, legato=True, dyn='mp')
    tp = S.part('trumpet', 'trumpet', stem='back', pan=62, vol=92, legato=True, dyn='mf')
    tb = S.part('trombone', 'trombone', stem='back', pan=86, vol=54, dyn='p')
    dr = S.part('kit', 'kit', stem='back', pan=64, vol=88, dyn='mp')

    # ------------------------------------------------------------ intro (1-4)
    mb.hairpin(1, 4, 'mp', 'mf')
    arp(mb, 1, 5, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('A3'), high=P('A5'), length=0.6)
    ka.line(1, 'r:q A5:e D6:e r:h | r:q B5:e D6:e r:h')
    vn.hairpin(1, 5, 'pp', 'p')
    pad(vn, 1, 5, n=3, low=P('A3'), high=P('A4'))
    pf.dyn(3, 'mp')
    pf.line(3, 'r:h r:e D5:e E5:e F#5:e | B5:h r:q. A4:e')
    bs.line(3, 'D2:q. A2:e D3:q A2:q | A1:q. E2:e A2:q G2:q')
    groove(dr, 3, 5, {'shaker': SHAKE})
    groove(dr, 4, 5, {'conga': '........x.x.x.xx', 'tumba': '.............x..'}, vel=-6)

    # ------------------------------------------------------------ A (5-12): the theme, pan flute
    pf.dyn(5, 'mf')
    pf.line(5, TWIN_A)
    mb.dyn(5, 'mp')
    arp(mb, 5, 13, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('A3'), high=P('A5'), length=0.6)
    bs.line(5, BASS_A)
    ka.line(8, 'r:h. F#5:e A5:e')
    ka.line(12, 'r:h. D6:e A5:e')
    groove(dr, 5, 13, {'kick': KICK, 'side': SIDE, 'shaker': SHAKE})
    vn.dyn(12, 'mf')
    vn.line(12, 'r:h. r:e A4:e')

    # ------------------------------------------------------------ A' (13-20): violins + flute, horn countermelody
    vn.line(13, TWIN_A)
    fl.dyn(13, 'mp')
    fl.line(13, TWIN_A)
    hn.dyn(13, 'mp')
    hn.line(13, HORN_CTR)
    pz.dyn(13, 'mp')
    comp(pz, 13, 21, [(0.5, 0.4), (1.5, 0.4), (2.5, 0.4), (3.5, 0.4)], n=3, low=P('A3'), high=P('A4'))
    arp(mb, 13, 21, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('A3'), high=P('A5'), length=0.6)
    bs.line(13, BASS_A)
    ka.line(16, 'r:h. A5:e D6:e')
    groove(dr, 13, 21, {'kick': KICK, 'side': SIDE, 'shaker': SHAKE, 'tamb': '....x.......x...',
                        'conga': '..x.......x..x..', 'tumba': '.......x.......x'})

    # ------------------------------------------------------------ B (21-28): B minor, oboe over accordion
    ob.dyn(21, 'mf')
    ob.line(21, TWIN_B)
    ac.dyn(21, 'mp')
    comp(ac, 21, 29, [(1, 0.7), (3, 0.7)], n=3, low=P('F#3'), high=P('E4'))
    bs.dyn(21, 'mp')
    bs.line(21, BASS_B)
    hp.dyn(21, 'p')
    arp(hp, 21, 29, '0 1 2 3 2 1 2 3', step=0.5, n=4, low=P('B3'), high=P('B5'), length=1.2)
    vc.dyn(25, 'mp')
    vc.line(25, 'B3:h D4:h | C#4:h E4:h | D4:h B3:h | D4:h C#4:h')
    vn.dyn(21, 'pp')
    pad(vn, 21, 29, n=3, low=P('D4'), high=P('D5'))
    groove(dr, 21, 29, {'kick': 'x.......x.......', 'side': SIDE, 'shaker': SHAKE}, vel=-6)

    # ------------------------------------------------------------ C (29-36): adventure episode in G
    wh.dyn(29, 'mf')
    wh.line(29, C_LEAD)
    hn.dyn(30, 'mf')
    hn.line(30, 'r:h E4:e F#4:e G4:q')
    hn.line(32, 'r:h D4:e E4:e F#4:q')
    hn.line(34, 'r:h E4:e F#4:e G4:q')
    hn.line(36, 'r:h C#4:e D4:e E4:q')
    mb.dyn(29, 'mf')
    arp(mb, 29, 37, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('A3'), high=P('A5'), length=0.6)
    comp(pz, 29, 37, [(0.5, 0.4), (1.5, 0.4), (2.5, 0.4), (3.5, 0.4)], n=3, low=P('A3'), high=P('A4'))
    bs.dyn(29, 'mf')
    bassline(bs, 29, 37, 'R:q. 5:e 8:q 5:q', octave=2)
    ka.line(32, 'r:h. B5:e D6:e')
    groove(dr, 29, 37, {'kick': 'x.....x.x.....x.', 'side': SIDE, 'shaker': SHAKE, 'tamb': '....x.......x...',
                        'conga': '..x..x....x..x.x', 'tumba': '.......x.......x'})

    # ------------------------------------------------------------ A'' (37-44): tutti, thinning at the end
    tp.dyn(37, 'mf')
    tp.line(37, TWIN_A)
    vn.dyn(37, 'mf')
    vn.line(37, TWIN_A)
    fl.dyn(37, 'mp')
    fl.line(37, TWIN_A)
    hn.dyn(37, 'mp')
    hn.line(37, HORN_CTR)
    tb.dyn(37, 'p')
    pad(tb, 37, 44, n=2, low=P('D3'), high=P('D4'))
    mb.dyn(37, 'mp')
    arp(mb, 37, 45, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P('A3'), high=P('A5'), length=0.6)
    comp(pz, 37, 44, [(0.5, 0.4), (1.5, 0.4), (2.5, 0.4), (3.5, 0.4)], n=3, low=P('A3'), high=P('A4'))
    bs.line(37, BASS_A)
    groove(dr, 37, 44, {'kick': KICK, 'side': SIDE, 'shaker': SHAKE, 'tamb': '....x.......x...',
                        'conga': '..x.......x..x..', 'tumba': '.......x.......x'})
    dr.hairpin(44, 45, 'mp', 'p')
    groove(dr, 44, 45, {'shaker': SHAKE, 'kick': 'x...............'})
    pf.line(44, 'r:h. r:e A4:e')
    return S
