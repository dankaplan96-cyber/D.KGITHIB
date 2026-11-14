"""Cloud Gardens — the second piece of Zeelich (Esmer town, the floating islands, the sky-ferry piers) (MUSIC-2), in
rotation with the Zeelich groove.

A through-composed piece with an ending (not a loop), heard once and followed by a silence outdoors. Where the
Zeelich track dances in 7/8, this one floats: a slow 4/4 in A mixolydian (the flattened seventh, G, and the plagal
G -> A cadence give it its open, unhurried air), a shakuhachi tune over a koto ostinato and bowed-glass pads, the
"gardens" in F major sung by a soft choir, a livelier market episode with hand drums, koto and kalimba trading
phrases over a synth arpeggio, then the tune back with strings and a quiet ending on A.
Original material, written for this project (MUSIC-2); not based on any existing tune.

  intro   1-4   bowed glass + koto ostinato + wind; a soft taiko on the first beats
  A       5-12  shakuhachi: the cloud tune (a suspension resolving at each phrase end)
  A2     13-20  flute an octave up, the second half climbing; kalimba and violins join
  B      21-28  the gardens: choir in F major (bVI), koto arpeggios, cello line; back through G to A
  C      29-36  Esmer market: hand drums, synth arpeggio, koto tune with kalimba answers
  B'     37-40  the choir phrase on a horn, short
  A'     41-48  shakuhachi and violins together, then in octaves; harp, the full texture
  coda   49-54  slowing: the tune's first phrase, kalimba echoes, the last chord held
"""
from score import Song, P, pad, arp, bassline, roll, hit

CLOUD_A = ("E5:h. C#5:e D5:e | B4:q. G4:e A4:h | F#5:q. E5:e D5:q A5:q | E5:w |"
           "C#5:q. E5:e F#5:q A5:q | B5:q. A5:e G5:q D5:q | E5:q G5:q F#5:q. E5:e | D5:h C#5:h")
CLOUD_A_CH = 'A | G/A | D/A | A | F#m7 | G | Em7 D | Asus4 A'
CLOUD_HEAD = '|'.join(CLOUD_A.split('|')[:4])
CLOUD_A2_END = "C#6:q. E6:e F#6:q E6:q | D6:q. B5:e G5:q B5:e D6:e | G5:q. F#5:e E5:q D5:q | E5:h. r:q"
GARDEN = "A4:h C5:h | G4:h. E4:q | F4:q A4:q C5:q D5:q | B4:w | C5:h E5:h | D5:h B4:h | A4:h B4:h | D5:h C#5:h"
GARDEN_CH = 'F | C/E | Dm7 | G | Fmaj7 | Em7 | Dm7 G | Asus4 A'


def song():
    S = Song('zeelich_b', 750000, title='Cloud Gardens', role='Zeelich (second piece)')
    S.loop = False
    S.intro_bars = 4
    S.end_bars = 54
    S.rit(51, 55, 750000, 980000)
    S.tail_sec = 8.0
    S.mix = {'room': {'rt60': 2.8, 'predelay': 0.026, 'bright': 0.6}, 'wet': {'front': 0.26, 'mid': 0.32, 'back': 0.44},
             'lufs': -17.5}

    S.chords(1, 'A | G/A | A | G/A')
    S.chords(5, CLOUD_A_CH)
    S.chords(13, CLOUD_A_CH)
    S.chords(21, GARDEN_CH)
    S.chords(29, 'A | G | D | A | F#m7 | G | Em7 | D')
    S.chords(37, 'F | C/E | Dm7 | G')
    S.chords(41, CLOUD_A_CH)
    S.chords(49, 'A | G/A | D/A | A | G/A | Aadd9')

    sh = S.part('shakuhachi', 'shakuhachi', stem='front', pan=56, vol=100, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=70, vol=88, legato=True, dyn='mf')
    ch = S.part('choir', 'oohs', stem='mid', pan=48, vol=92, legato=True, dyn='mp')
    hn = S.part('horn', 'horn', stem='back', pan=40, vol=90, legato=True, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=34, vol=96, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=68, vol=84, dyn='p')
    vc = S.part('cello', 'cello', stem='mid', pan=80, vol=90, legato=True, dyn='mp')
    ko = S.part('koto', 'koto', stem='mid', pan=24, vol=96, dyn='mp')
    ka = S.part('kalimba', 'kalimba', stem='mid', pan=88, vol=96, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=76, vol=84, dyn='mp')
    sy = S.part('arp', 'polysynth', stem='back', pan=96, vol=58, dyn='p')
    gl = S.part('glass', 'glass', stem='back', pan=60, vol=70, dyn='p')
    bs = S.part('bass', 'acbass', stem='mid', pan=62, vol=96, dyn='mp')
    sw = S.part('wind', 'sweep', stem='back', pan=30, vol=56, dyn='pp')
    dr = S.part('perc', 'drums', stem='back', pan=56, vol=82, dyn='p')

    def ostinato(b0, b1, length=0.7):
        arp(ko, b0, b1, '0 2 1 3 2 4 1 3', step=0.5, n=5, low=P('E4'), high=P('E5'), length=length)

    def hands(b0, b1, v=42):
        for b in range(b0, b1):
            hit(dr, b, 'tumba', 0, vel=v + 8, dur=0.5)
            hit(dr, b, 'conga', 1.5, vel=v, dur=0.5)
            hit(dr, b, 'bongo', 2.5, vel=v - 4, dur=0.5)
            hit(dr, b, 'conga', 3.0, vel=v + 2, dur=0.5)
            for k in range(8):
                hit(dr, b, 'shaker', k * 0.5, vel=v - 14 + (8 if k % 2 == 0 else 0), dur=0.25)

    # ---------------------------------------------------------------- intro (1-4)
    pad(gl, 1, 5, n=4, low=P('E4'), high=P('E5'))
    gl.hairpin(1, 3, 'pp', 'p')
    ostinato(1, 5)
    ko.hairpin(1, 5, 'p', 'mp')
    sw.line(1, 'A2+E3:w | G2+D3:w | A2+E3:w | G2+D3:w')
    sw.hairpin(1, 5, 'pp', 'p')
    for b in (1, 3):
        hit(dr, b, 'taiko', 0, vel=46, dur=2.0)
    bs.line(3, 'A1:w | G1:w')
    bs.dyn(3, 'p')

    # ---------------------------------------------------------------- A (5-12): shakuhachi
    sh.line(5, CLOUD_A)
    sh.dyn(5, 'mf')
    ostinato(5, 13)
    pad(gl, 5, 13, n=4, low=P('E4'), high=P('E5'))
    gl.dyn(5, 'p')
    bassline(bs, 5, 13, 'R:h. 5:q', octave=1)
    bs.dyn(5, 'mp')
    for b in (5, 9):
        hit(dr, b, 'taiko', 0, vel=42, dur=2.0)

    # ---------------------------------------------------------------- A2 (13-20): flute up, kalimba + violins join
    fl.line(13, "E6:h. C#6:e D6:e | B5:q. G5:e A5:h | F#6:q. E6:e D6:q A6:q | E6:w |" + CLOUD_A2_END)
    fl.dyn(13, 'mf')
    sh.line(16, 'r:h A5:q. E5:e')
    sh.dyn(16, 'mp')
    ostinato(13, 21)
    arp(ka, 13, 21, '0 1 2 1 3 2 1 2', step=0.5, n=4, low=P('A4'), high=P('A5'), length=0.5)
    ka.dyn(13, 'p')
    pad(st, 13, 21, n=4, low=P('C#4'), high=P('C#5'))
    st.hairpin(13, 17, 'pp', 'p')
    bassline(bs, 13, 21, 'R:h. 5:q', octave=1)
    vc.line(17, 'F#3:w | G3:w | E3:h D3:h | D3:h C#3:h')
    vc.dyn(17, 'mp')
    hands(17, 21, 30)

    # ---------------------------------------------------------------- B (21-28): the gardens, choir in F
    ch.line(21, GARDEN)
    ch.dyn(21, 'mp')
    ch.hairpin(25, 27, 'mp', 'mf')
    ch.hairpin(27, 29, 'mf', 'mp')
    arp(ko, 21, 29, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('C4'), high=P('C6'), length=0.9)
    ko.dyn(21, 'mp')
    vc.line(21, 'F3:w | E3:w | D3:w | G2:h B2:h | F3:w | E3:w | D3:h G3:h | A2:w')
    vc.dyn(21, 'mp')
    pad(gl, 21, 29, n=4, low=P('C4'), high=P('C5'))
    gl.dyn(21, 'p')
    bassline(bs, 21, 29, 'R:w', octave=1)
    bs.dyn(21, 'p')
    hp.line(24, 'r:h. G5:e B5:e')
    hp.line(28, 'r:h. C#6:e E6:e')
    hp.dyn(24, 'mp')

    # ---------------------------------------------------------------- C (29-36): Esmer market
    ko.line(29, 'A5:e E5:e A5:e B5:e C#6:q B5:q | D6:q B5:e G5:e A5:q G5:q | F#5:e A5:e D6:e A5:e F#5:q E5:q | C#5:h. r:q |'
                'A5:e C#6:e E6:e C#6:e A5:q E5:q | D6:q B5:q G5:e A5:e B5:q | E5:e G5:e B5:e D6:e E6:q D6:q | A5:h. r:q')
    ko.dyn(29, 'mf')
    ka.line(32, 'r:h E5:e A5:e C#6:e E6:e')
    ka.line(36, 'r:h F#5:e A5:e D6:e F#6:e')
    ka.dyn(32, 'mf')
    arp(sy, 29, 37, '0 1 2 3 2 1', step=0.25, n=4, low=P('A4'), high=P('A5'), length=0.2)
    sy.hairpin(29, 33, 'pp', 'p')
    bassline(bs, 29, 37, 'R:q. R:e 5:q 8:q', octave=1)
    bs.dyn(29, 'mf')
    hands(29, 37, 46)
    pad(st, 29, 37, n=3, low=P('E4'), high=P('E5'))
    st.dyn(29, 'pp')

    # ---------------------------------------------------------------- B' (37-40): horn
    hn.line(37, GARDEN.split('|')[0] + '|' + '|'.join(GARDEN.split('|')[1:4]))
    hn.dyn(37, 'mp')
    hn.hairpin(39, 41, 'mp', 'mf')
    pad(ch, 37, 41, n=3, low=P('A3'), high=P('A4'))
    arp(hp, 37, 41, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('C3'), high=P('C5'), length=1.4)
    bassline(bs, 37, 41, 'R:w', octave=1)
    bs.dyn(37, 'mp')
    roll(dr, 40, 'crash2', 2, 16, 44, beat=2)

    # ---------------------------------------------------------------- A' (41-48): shakuhachi + violins
    sh.line(41, CLOUD_HEAD)
    sh.line(45, CLOUD_A2_END, octave=-1)  # (the shakuhachi drops below while the violins climb)
    sh.dyn(41, 'mf')
    vn.line(41, CLOUD_HEAD + '|' + CLOUD_A2_END)
    vn.dyn(41, 'mp')
    vn.hairpin(45, 47, 'mp', 'mf')
    vn.hairpin(47, 49, 'mf', 'mp')
    ostinato(41, 49)
    arp(hp, 41, 49, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('A2'), high=P('A4'), length=1.4)
    hp.dyn(41, 'mp')
    pad(gl, 41, 49, n=4, low=P('E4'), high=P('E5'))
    bassline(bs, 41, 49, 'R:h. 5:q', octave=1)
    vc.line(45, 'F#3:w | G3:w | E3:h D3:h | D3:h C#3:h')
    vc.dyn(45, 'mf')
    hands(41, 49, 36)

    # ---------------------------------------------------------------- coda (49-54)
    sh.line(49, 'E5:h. C#5:e D5:e | B4:q. G4:e A4:h | r:w | r:w | B4:q. G4:e A4:h | A4:w')
    sh.hairpin(49, 55, 'mp', 'p')
    ka.line(51, 'F#5:q. E5:e D5:q A5:q | E5:w')
    ka.dyn(51, 'p')
    ostinato(49, 53, length=0.9)
    ko.hairpin(49, 53, 'mp', 'p')
    arp(ko, 54, 55, '0 1 2 3 4 5', step=0.25, n=6, low=P('A3'), high=P('E5'), length=3.0)
    pad(gl, 49, 55, n=4, low=P('E4'), high=P('E5'))
    gl.hairpin(49, 55, 'p', 'pp')
    pad(st, 51, 55, n=4, low=P('C#4'), high=P('B4'))
    st.hairpin(51, 55, 'pp', 'p')
    bs.line(49, 'A1:w | G1:w | D2:w | A1:w | G1:w | A1:w')
    bs.hairpin(49, 55, 'mp', 'p')
    hit(dr, 54, 'taiko', 0, vel=40, dur=3.0)
    sw.line(53, 'A2+E3:w | A2+E3:w')
    sw.dyn(53, 'pp')
    return S
