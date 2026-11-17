"""Zeelich — Esmer, the floating isles; heard muffled in Zeelich's halls. MUSIC-LBA, 17.11.2026 (replaces the
earlier 7/8 piece of the same name).

Airy and a little strange, but with a tune: A lydian (the raised D# is the clouds), 7/8 grouped 2+2+3 at 150, so
the bar limps happily. Ocarina tune over a kalimba ostinato, vibraphone and harp, a fretless bass that slides, hand
drums and a shaker; an F#-minor strain on the koto with a sitar shadow; then Twinsen's hook bent into 7/8 and
lydian on celesta and harp, and again on steel drum and flute. Original.

  intro  1-4   kalimba ostinato, glass pad, bongos
  A      5-12  the cloud tune, ocarina
  A'    13-20  vibraphone and flute, violins underneath
  B     21-28  F# minor: the koto's tune, sitar answers, congas
  B'    29-36  the same on violins and koto, kalimba
  C     37-44  Twinsen's hook in 7/8 lydian, celesta and harp
  C'    45-52  the hook on steel drum and flute, the fullest groove
  A''   53-60  the cloud tune on ocarina and violins, thinning to the loop point (bar 5)
"""
from score import Song, P, pad, arp, bassline, groove, comp

ZA = ("E5:q A5:q G#5:e F#5:e E5:e | D#5:q F#5:q B5:q. | C#6:e B5:e A5:q G#5:q E5:e | F#5:q E5:q C#5:q. |"
      "E5:q A5:q B5:e C#6:e D#6:e | E6:q. D#6:q B5:q | C#6:e B5:e G#5:q A5:e B5:e C#6:e | B5:q. r:q r:q")
ZA_CH = 'A | B/A | A | F#m7 | A | B/A | G#m7:h C#m7:q. | B'
ZB = ("F#4:e G#4:e A4:e D5:q C#5:q | B4:q. G#4:q E4:q | F#4:e A4:e D5:e F#5:q E5:q | C#5:q. B4:q G#4:q |"
      "F#4:e G#4:e A4:e D5:q C#5:q | F#5:q. E5:q D5:q | C#5:e D5:e E5:e A5:q G#5:q | E5:q. r:q r:q")
ZB_CH = 'F#m | E | D | C#m | F#m | D | A:h E:q. | E'
ZC = ("A4:e B4:e C#5:e F#5:q E5:e C#5:e | D#5:q. C#5:q B4:q | G#4:e A4:e B4:e E5:q D#5:e B4:e | C#5:q. r:q r:q |"
      "A4:e B4:e C#5:e F#5:q E5:e C#5:e | A5:q. G#5:q F#5:q | E5:e F#5:e G#5:e C#6:q B5:e G#5:e | A5:q. r:q r:q")
ZC_CH = 'F#m7 | B | E | A | F#m7 | B/D# | E | A'
SITAR = ("r:q. r:q A4:e C#5:e | r:q. B4:q G#4:q | r:q. r:q D5:e F#5:e | r:q. G#4:q E4:q |"
         "r:q. r:q A4:e C#5:e | r:q. E5:q D5:q | r:q. r:q E5:q | r:q. B4:e G#4:e E4:q")
BASS = 'R:q 5:q 8:e 5:e R:e'
OSTI = '0 2 1 2 0 2 1'
KIT = {'kick': 'x.......x.....', 'bongo': '....x.....x.x.', 'shaker': 'x.o.x.o.x.o.o.'}
KIT_FULL = {'kick': 'x.......x.....', 'bongo': '....x.....x.x.', 'shaker': 'x.o.x.o.x.o.o.',
            'conga': '..x.....x...x.', 'tumba': '......x......x', 'tri': '........x.....'}


def song():
    S = Song('zeelich', 400000, meter=(7, 8), title='Zeelich', role='Zeelich island (Esmer town)')
    S.intro_bars, S.body_bars = 4, 56
    S.mix = {'room': {'rt60': 2.4, 'predelay': 0.022, 'bright': 0.6}, 'wet': {'front': 0.24, 'mid': 0.3, 'back': 0.4, 'pluck': 0.3},
             'lufs': -17.0}
    S.chords(1, 'A | B/A | A | B/A')
    for b in (5, 13, 53):
        S.chords(b, ZA_CH)
    for b in (21, 29):
        S.chords(b, ZB_CH)
    for b in (37, 45):
        S.chords(b, ZC_CH)

    oc = S.part('ocarina', 'ocarina', stem='front', pan=58, vol=104, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=72, vol=100, legato=True, dyn='mf')
    ko = S.part('koto', 'koto', stem='front', pan=46, vol=127, dyn='mf')
    ce = S.part('celesta', 'celesta', stem='front', pan=30, vol=120, dyn='mf')
    sd = S.part('steeldrum', 'steeldrum', stem='front', pan=64, vol=110, dyn='mf')
    vb = S.part('vibes', 'vibes', stem='mid', pan=70, vol=92, dyn='mf')
    # (the kalimba renders on a stem of its own: sharing a synth with the other plucked parts, its voices came out
    # of FluidSynth's pool in a different order on the two passes of the loop and the seam differed by -45 dB)
    ka = S.part('kalimba', 'kalimba', stem='pluck', pan=22, vol=86, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=84, vol=84, dyn='mp')
    si = S.part('sitar', 'sitar', stem='mid', pan=88, vol=72, dyn='mp')
    gl = S.part('glass', 'glass', stem='mid', pan=50, vol=64, dyn='pp')
    vn = S.part('violins', 'strings', stem='mid', pan=38, vol=88, legato=True, dyn='mp')
    bs = S.part('bass', 'fretless', stem='mid', pan=64, vol=76, dyn='mf')
    dr = S.part('kit', 'kit', stem='back', pan=64, vol=78, dyn='mp')

    def bed(b0, b1, lvl='mp', kit=KIT):
        ka.dyn(b0, lvl)
        arp(ka, b0, b1, OSTI, step=0.5, n=3, low=P('E4'), high=P('E5'), length=0.5)
        bs.dyn(b0, 'mf')
        bassline(bs, b0, b1, BASS, octave=2)
        dr.dyn(b0, lvl)
        groove(dr, b0, b1, kit)

    # ------------------------------------------------------------ intro (1-4)
    ka.dyn(1, 'mp')
    arp(ka, 1, 5, OSTI, step=0.5, n=3, low=P('E4'), high=P('E5'), length=0.5)
    gl.dyn(1, 'p')
    pad(gl, 1, 5, n=3, low=P('C#4'), high=P('C#5'))
    dr.dyn(3, 'p')
    groove(dr, 3, 5, {'bongo': '....x.....x.x.', 'shaker': 'x.o.x.o.x.o.o.'})
    bs.dyn(3, 'mp')
    bassline(bs, 3, 5, 'R:h. r:e', octave=2)

    # ------------------------------------------------------------ A (5-12): ocarina
    oc.dyn(5, 'mf')
    oc.line(5, ZA)
    bed(5, 13)
    hp.dyn(5, 'p')
    arp(hp, 9, 13, '0 1 2 3 2 1 0', step=0.5, n=4, low=P('A3'), high=P('A5'), length=1.0)

    # ------------------------------------------------------------ A' (13-20): vibraphone + flute, violins
    vb.dyn(13, 'mf')
    vb.line(13, ZA)
    fl.dyn(13, 'mf')
    fl.line(13, ZA)
    vn.dyn(13, 'p')
    vn.line(13, 'C#4:q. D#4:q. r:e | D#4:q. F#4:q. r:e | E4:q. C#4:q. r:e | C#4:q. A3:q. r:e |'
                'C#4:q. E4:q. r:e | F#4:q. D#4:q. r:e | D#4:q. E4:q. r:e | D#4:q. F#4:q. r:e')
    bed(13, 21, 'mp')

    # ------------------------------------------------------------ B (21-28): koto in F# minor, sitar answers
    ko.dyn(21, 'f')
    ko.line(21, ZB)
    si.dyn(21, 'mp')
    si.line(21, SITAR)
    hp.dyn(21, 'p')
    arp(hp, 21, 29, '0 1 2 3 2 1 0', step=0.5, n=4, low=P('F#3'), high=P('F#5'), length=1.0)
    bed(21, 29, 'mp', KIT_FULL)

    # ------------------------------------------------------------ B' (29-36): violins + koto
    vn.dyn(29, 'mf')
    vn.line(29, ZB)
    ko.dyn(29, 'mp')
    ko.line(29, ZB, transpose=12)
    bed(29, 37, 'mf', KIT_FULL)
    gl.dyn(29, 'pp')
    pad(gl, 29, 37, n=3, low=P('C#4'), high=P('C#5'))

    # ------------------------------------------------------------ C (37-44): Twinsen's hook, celesta and harp
    ce.dyn(37, 'f')
    ce.line(37, ZC)
    hp.dyn(37, 'mf')
    hp.line(37, ZC, transpose=-12)
    vb.dyn(37, 'mp')
    comp(vb, 37, 45, [(0.0, 1.0), (2.0, 1.4)], n=3, low=P('E4'), high=P('C#5'))
    bed(37, 45, 'mp')

    # ------------------------------------------------------------ C' (45-52): steel drum and flute
    sd.dyn(45, 'mf')
    sd.line(45, ZC)
    fl.dyn(45, 'mf')
    fl.line(45, ZC)
    vn.dyn(45, 'mp')
    pad(vn, 45, 53, n=3, low=P('E4'), high=P('E5'))
    bed(45, 53, 'mf', KIT_FULL)

    # ------------------------------------------------------------ A'' (53-60): ocarina + violins, thinning
    oc.dyn(53, 'mf')
    oc.line(53, ZA)
    vn.dyn(53, 'mp')
    vn.line(53, ZA, transpose=-12)
    hp.dyn(53, 'p')
    arp(hp, 53, 61, '0 1 2 3 2 1 0', step=0.5, n=4, low=P('A3'), high=P('A5'), length=1.0)
    bed(53, 59, 'mp')
    bed(59, 61, 'p', {'bongo': '....x.....x.x.', 'shaker': 'x.o.x.o.x.o.o.'})
    return S
