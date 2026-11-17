"""Citadel Village — the town, the harbour, the town interiors (muffled). MUSIC-LBA, 17.11.2026 (replaces the
earlier walking 6/8 piece of the same name).

A bouncy market-town jig in G, 6/8: an oom-pah bass and an off-beat accordion, a clarinet tune that you can hum,
a staccato B strain on xylophone and flute whose fifth bar is Twinsen's hook (three rising notes, a leap of a
fourth, a fall: themes.TWIN_HOOK) in the town's colour, and a wistful E-minor strain on the fiddle. Light kit:
kick on the two big beats, side stick on the "pah", a shaker; a wood block in the B strain. Original.

  intro  1-4   oom-pah vamp, accordion, tambourine
  A1     5-12  the town tune, clarinet
  A2    13-20  the tune on accordion, clarinet countermelody, marimba
  B1    21-28  E minor → G, xylophone + flute staccato, bassoon bouncing, wood block (bar 25: the hook)
  B2    29-36  the B strain legato on violins, accordion answers
  C1    37-44  E minor, the fiddle's tune over a nylon guitar, cello countermelody (gentle melancholy)
  C2    45-52  the same on oboe and fiddle, marimba ripples
  A3    53-60  tutti: accordion, violins and flute with the tune, horns
  B3    61-68  clarinet and marimba with the B strain
  A4    69-76  tin whistle, lighter
  link  77-80  vamp back to bar 5
"""
from score import Song, P, pad, arp, bassline, groove, comp

VA = ("D5:e B4:e G4:e B4:q D5:e | E5:q. C5:e D5:e E5:e | F#5:e E5:e D5:e A4:q C5:e | B4:q. G4:q. |"
      "D5:e B4:e G4:e B4:q D5:e | G5:q. E5:e F#5:e G5:e | A5:e G5:e E5:e D5:e C5:e A4:e | G4:q. r:q.")
VA_CH = 'G | C | D7 | G | G | C | Am7 D7 | G'
VA_BASS = ("G2:q. D2:q. | C3:q. G2:q. | D2:q. F#2:q A2:e | G2:q. B2:q. |"
           "G2:q. D3:q. | C3:q. E3:q. | A2:q. D3:q C3:e | G2:q. D2:q B1:e")
VB = ("B4:e E5:e G5:e F#5:q E5:e | E5:q. C5:q. | D5:e F#5:e A5:e G5:q F#5:e | G5:q. D5:q. |"
      "E5:e F#5:e G5:e C6:q B5:e | A5:q. E5:q. | F#5:e G5:e A5:e D5:q E5:e | G5:q. r:q.")
VB_STAC = ("B4:e! E5:e! G5:e! F#5:q! E5:e! | E5:q. C5:q.! | D5:e! F#5:e! A5:e! G5:q! F#5:e! | G5:q. D5:q.! |"
           "E5:e F#5:e G5:e C6:q. | A5:q.! E5:q.! | F#5:e! G5:e! A5:e! D5:q! E5:e! | G5:q. r:q.")
VB_CH = 'Em | Am | D7 | G | C | Am7 | D7 | G'
VB_BASS = ("E2:q. B2:q. | A2:q. E2:q. | D2:q. A2:q C3:e | B2:q. G2:q. |"
           "C3:q. G2:q. | A2:q. E2:q G2:e | D2:q. F#2:q A2:e | G2:q. D2:q.")
VC = ("E5:q. G5:q B5:e | C6:q. B5:q A5:e | A5:q. F#5:q. | D5:q. F#5:e E5:e D5:e |"
      "E5:q. G5:q E5:e | A5:q. C6:q B5:e | B5:q. D#5:q. | E5:q. r:q.")
VC_CH = 'Em | C | D | Bm | C | Am | B7 | Em'
VC_BASS = ("E2:q. B2:q. | C3:q. G2:q. | D2:q. A2:q. | B1:q. F#2:q. |"
           "C2:q. G2:q. | A1:q. E2:q. | B1:q. D#2:q F#2:e | E2:q. B1:q.")
CL_CTR = ("G4:q. D4:q. | E4:q. G4:q. | A4:q. F#4:q. | G4:e A4:e B4:e D5:q. |"
          "B4:q. G4:q. | C5:q. B4:e A4:e G4:e | E4:q. F#4:q. | G4:q. r:q.")

COMP = [(0.5, 0.4), (1.0, 0.4), (2.0, 0.4), (2.5, 0.4)]
KIT_A = {'kick': 'x.....x.....', 'side': '....x.....x.', 'shaker': 'x.o.o.x.o.o.'}


def song():
    S = Song('village', 385000, meter=(6, 8), title='Citadel Village', role='Citadel town, harbour')
    S.intro_bars, S.body_bars = 4, 76
    S.mix = {'room': {'rt60': 1.6, 'predelay': 0.014, 'bright': 0.6}, 'wet': {'front': 0.18, 'mid': 0.22, 'back': 0.32},
             'lufs': -17.0}

    S.chords(1, 'G | C D7 | G | D7')
    for b in (5, 13, 53, 69):
        S.chords(b, VA_CH)
    for b in (21, 29, 61):
        S.chords(b, VB_CH)
    for b in (37, 45):
        S.chords(b, VC_CH)
    S.chords(77, 'G | C | Am7 | D7')

    cl = S.part('clarinet', 'clarinet', stem='front', pan=56, vol=100, legato=True, dyn='mf')
    xy = S.part('xylo', 'xylo', stem='front', pan=74, vol=112, dyn='f')
    fl = S.part('flute', 'flute', stem='front', pan=68, vol=86, legato=True, dyn='mf')
    fd = S.part('fiddle', 'fiddle', stem='front', pan=48, vol=118, legato=True, dyn='mf')
    ob = S.part('oboe', 'oboe', stem='front', pan=70, vol=82, legato=True, dyn='mp')
    wh = S.part('whistle', 'whistle', stem='front', pan=60, vol=80, legato=True, dyn='mf')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=80, vol=76, dyn='mf')
    ac = S.part('accordion', 'accordion', stem='mid', pan=36, vol=82, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=40, vol=94, legato=True, dyn='mf')
    vc = S.part('cello', 'cello', stem='mid', pan=82, vol=86, legato=True, dyn='mp')
    gt = S.part('guitar', 'nylon', stem='mid', pan=26, vol=92, dyn='mp')
    mb = S.part('marimba', 'marimba', stem='mid', pan=88, vol=84, dyn='mp')
    bs = S.part('bass', 'acbass', stem='mid', pan=64, vol=74, dyn='mf')
    hn = S.part('horns', 'horn', stem='back', pan=44, vol=68, legato=True, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=72, vol=80, dyn='mp')
    dr = S.part('kit', 'kit', stem='back', pan=64, vol=80, dyn='mp')

    def oompah(b0, b1, bass=None, level='mf'):
        bs.dyn(b0, level)
        if bass:
            bs.line(b0, bass)
        else:
            bassline(bs, b0, b1, 'R:q. 5:q.', octave=2)

    # ------------------------------------------------------------ intro (1-4)
    ac.dyn(1, 'mp')
    comp(ac, 1, 5, COMP, n=3, low=P('G3'), high=P('E4'))
    oompah(1, 5)
    dr.dyn(1, 'p')
    groove(dr, 1, 5, {'kick': 'x.....x.....', 'tamb': '....x.....x.'})
    cl.dyn(4, 'mf')
    cl.line(4, 'r:q. D4:e G4:e B4:e')

    # ------------------------------------------------------------ A1 (5-12): clarinet
    cl.line(5, VA)
    comp(ac, 5, 13, COMP, n=3, low=P('G3'), high=P('E4'))
    oompah(5, 13, VA_BASS)
    dr.dyn(5, 'mp')
    groove(dr, 5, 13, KIT_A)
    mb.dyn(8, 'mp')
    mb.line(8, 'r:q. G5:e A5:e B5:e')
    mb.line(12, 'r:q. D5:e G5:e B5:e')

    # ------------------------------------------------------------ A2 (13-20): accordion lead, clarinet counter
    fl.dyn(13, 'mf')
    fl.line(13, VA)
    comp(ac, 13, 21, [(1.0, 0.4), (2.5, 0.4)], n=3, low=P('G3'), high=P('E4'))
    cl.dyn(13, 'p')
    cl.line(13, CL_CTR)
    pz.dyn(13, 'mp')
    comp(pz, 13, 21, COMP, n=3, low=P('G3'), high=P('E4'))
    oompah(13, 21, VA_BASS)
    mb.dyn(13, 'p')
    arp(mb, 13, 21, '0 1 2 1 2 1', step=0.5, n=3, low=P('G4'), high=P('G5'), length=0.5)
    groove(dr, 13, 21, {**KIT_A, 'tamb': '..........x.'})

    # ------------------------------------------------------------ B1 (21-28): xylophone + flute staccato, bassoon
    xy.dyn(21, 'f')
    xy.line(21, VB_STAC)
    fl.dyn(21, 'mf')
    fl.line(21, VB_STAC)
    bn.dyn(21, 'mp')
    bn.line(21, 'E3:e! G3:e! B3:e! E3:e! G3:e! B3:e! | A2:e! C3:e! E3:e! A2:e! C3:e! E3:e! | D3:e! F#3:e! A3:e! D3:e! F#3:e! C3:e! |'
                'G2:e! B2:e! D3:e! G2:e! B2:e! D3:e! | C3:e! E3:e! G3:e! C3:e! E3:e! G3:e! | A2:e! C3:e! E3:e! A2:e! C3:e! E3:e! |'
                'D3:e! F#3:e! A3:e! D3:e! F#3:e! A3:e! | G2:e! B2:e! D3:e! G2:q.')
    oompah(21, 29, VB_BASS, 'mp')
    ac.dyn(21, 'p')
    comp(ac, 21, 29, [(1.0, 0.4), (2.5, 0.4)], n=3, low=P('G3'), high=P('E4'))
    groove(dr, 21, 29, {'kick': 'x.....x.....', 'shaker': 'x.o.o.x.o.o.', 'wb_hi': '....x.......', 'wb_lo': '..........x.'})

    # ------------------------------------------------------------ B2 (29-36): violins legato, accordion answers
    vn.dyn(29, 'mf')
    vn.line(29, VB)
    ac.dyn(29, 'mp')
    ac.line(32, 'r:q. B4:e A4:e G4:e')
    ac.line(36, 'r:q. D5:e C5:e A4:e')
    comp(pz, 29, 37, COMP, n=3, low=P('G3'), high=P('E4'))
    oompah(29, 37, VB_BASS)
    mb.dyn(29, 'mp')
    arp(mb, 29, 37, '0 1 2 1 2 1', step=0.5, n=3, low=P('E4'), high=P('E5'), length=0.5)
    groove(dr, 29, 37, KIT_A)

    # ------------------------------------------------------------ C1 (37-44): E minor, fiddle, nylon guitar, cello
    fd.dyn(37, 'f')
    fd.line(37, VC)
    gt.dyn(37, 'mp')
    arp(gt, 37, 45, '0 1 2 3 2 1', step=0.5, n=4, low=P('E3'), high=P('E5'), length=1.0)
    vc.dyn(37, 'p')
    vc.line(37, 'B3:q. G3:q. | E3:q. G3:q. | F#3:q. A3:q. | B3:q. D4:q. | C4:q. B3:q. | A3:q. E3:q. | F#3:q. B3:q. | G3:q. B3:q.')
    oompah(37, 45, VC_BASS, 'mp')
    dr.dyn(37, 'p')
    groove(dr, 37, 45, {'kick': 'x...........', 'shaker': 'x.o.o.x.o.o.', 'tri': '......x.....'})

    # ------------------------------------------------------------ C2 (45-52): oboe + fiddle, marimba
    ob.dyn(45, 'mf')
    ob.line(45, VC)
    fd.dyn(45, 'mp')
    fd.line(45, VC, transpose=-12)
    mb.dyn(45, 'mp')
    arp(mb, 45, 53, '0 2 1 2 0 2', step=0.5, n=3, low=P('E4'), high=P('E5'), length=0.5)
    arp(gt, 45, 53, '0 1 2 3 2 1', step=0.5, n=4, low=P('E3'), high=P('E5'), length=1.0)
    oompah(45, 53, VC_BASS, 'mp')
    dr.dyn(45, 'mp')
    groove(dr, 45, 53, {'kick': 'x.....x.....', 'side': '..........x.', 'shaker': 'x.o.o.x.o.o.'})
    cl.dyn(52, 'mf')
    cl.line(52, 'r:q. D4:e G4:e B4:e')

    # ------------------------------------------------------------ A3 (53-60): tutti
    ac.dyn(53, 'mf')
    ac.line(53, VA)
    vn.dyn(53, 'mf')
    vn.line(53, VA)
    fl.dyn(53, 'mp')
    fl.line(53, VA, transpose=12)
    hn.dyn(53, 'mp')
    pad(hn, 53, 61, n=2, low=P('D4'), high=P('B4'))
    comp(pz, 53, 61, COMP, n=3, low=P('G3'), high=P('E4'))
    oompah(53, 61, VA_BASS, 'mf')
    dr.dyn(53, 'mp')
    groove(dr, 53, 61, {**KIT_A, 'tamb': '....x.....x.'})

    # ------------------------------------------------------------ B3 (61-68): clarinet + marimba
    cl.dyn(61, 'mf')
    cl.line(61, VB)
    mb.dyn(61, 'mf')
    mb.line(61, VB_STAC, transpose=-12)
    comp(ac, 61, 69, COMP, n=3, low=P('G3'), high=P('E4'))
    ac.dyn(61, 'mp')
    oompah(61, 69, VB_BASS)
    groove(dr, 61, 69, {**KIT_A, 'wb_hi': '....x.......'})

    # ------------------------------------------------------------ A4 (69-76): tin whistle, lighter
    wh.dyn(69, 'mf')
    wh.line(69, VA)
    ac.dyn(69, 'p')
    comp(ac, 69, 77, COMP, n=3, low=P('G3'), high=P('E4'))
    gt.dyn(69, 'p')
    arp(gt, 69, 77, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    oompah(69, 77, VA_BASS, 'mp')
    dr.dyn(69, 'p')
    groove(dr, 69, 77, KIT_A)

    # ------------------------------------------------------------ link (77-80): vamp back to bar 5
    comp(ac, 77, 81, COMP, n=3, low=P('G3'), high=P('E4'))
    oompah(77, 81, None, 'mp')
    groove(dr, 77, 81, {'kick': 'x.....x.....', 'tamb': '....x.....x.'})
    mb.dyn(79, 'mp')
    mb.line(79, 'r:q. A4:e C5:e E5:e | D5:q. r:q.')
    cl.dyn(80, 'mf')
    cl.line(80, 'r:q. D4:e G4:e B4:e')
    return S
