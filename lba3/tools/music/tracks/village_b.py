"""Market Day — the second piece of Citadel town and the harbour (MUSIC-2), in rotation with Citadel Village.

A through-composed piece with an ending (not a loop): the player hears it once, then a silence. Morning market and
harbour in A major, 4/4, walking pace: a recorder tune over nylon guitar and pizzicato, an accordion answering, a warm
accordion episode in F# minor, a harbour interlude of steel drum and kalimba over a soft synth pulse, a small
mystery in an alley (clarinet over a walking bass), then the tune back with the whole band and a slow close.
Original material, written for this project (MUSIC-2); not based on any existing tune.

  intro   1-4   guitar + pizzicato + shaker; the recorder's pickup
  A       5-12  recorder: the market tune
  A2     13-20  the tune again, its second half climbing higher; the accordion answers, marimba joins
  B      21-28  accordion in F# minor, harp, cello line, warm pad
  C      29-36  harbour: steel drum calls, kalimba answers, a soft synth pulse, hand drums (D lydian colour)
  D      37-44  the alley: clarinet in its low register over walking pizzicato; ends on the dominant
  B'     45-52  violins take the accordion tune, flute descant above
  A'     53-60  the tune with violins and flute, horns, tambourine, a timpani roll into it
  A''    61-68  accordion and recorder trade the tune's halves; it thins
  coda   69-74  slowing: the head of the tune on the recorder, last chord with harp and kalimba
"""
from score import Song, P, pad, arp, bassline, roll, hit

MARKET_A = ("E5:q A5:e G#5:e F#5:q E5:q | D5:q. C#5:e B4:q A4:q | C#5:e D5:e E5:q A5:q. G#5:e | F#5:h E5:h |"
            "E5:q A5:e G#5:e F#5:q E5:q | D5:q. E5:e F#5:q D5:q | C#5:q B4:e C#5:e D5:q B4:q | A4:h. r:q")
MARKET_A_CH = 'A | Bm7 | A/C# | D E | A | D | A/C# E7 | A'
MARKET_HEAD = '|'.join(MARKET_A.split('|')[:4])  # the first phrase (4 bars)
MARKET_A2_END = "E5:q A5:e B5:e C#6:q B5:q | A5:q. G#5:e F#5:q E5:q | D5:q C#5:e D5:e E5:q G#4:q | A4:h. r:q"
MARKET_A2_CH = 'A | Bm7 | A/C# | D E | F#m7 | D | Bm7 E7 | A'
MARKET_B = ("C#5:q. B4:e A4:q F#4:q | A4:q. B4:e A4:h | B4:q. C#5:e D5:q F#5:q | E5:w |"
            "C#5:q. D5:e E5:q F#5:q | A5:q. G#5:e F#5:h | D5:q. C#5:e B4:q E5:q | C#5:h. r:q")
MARKET_B_CH = 'F#m | D | Bm7 | E | F#m7 | D | Bm7 E7 | A'


def song():
    S = Song('village_b', 577000, title='Market Day', role='Citadel town, harbour (second piece)')
    S.loop = False
    S.intro_bars = 4
    S.end_bars = 74
    S.rit(71, 75, 577000, 760000)
    S.tail_sec = 7.0
    S.mix = {'room': {'rt60': 1.8, 'predelay': 0.016, 'bright': 0.6}, 'wet': {'front': 0.2, 'mid': 0.26, 'back': 0.36},
             'lufs': -17.0}

    S.chords(1, 'A | D/A | A | E7sus4 E7')
    S.chords(5, MARKET_A_CH)
    S.chords(13, MARKET_A2_CH)
    S.chords(21, MARKET_B_CH)
    S.chords(29, 'D | E/D | C#m7 | F#m7 | Bm7 | E | Dmaj7 | E7sus4 E7')
    S.chords(37, 'F#m | F#m/E | D | C#7 | F#m | Bm6 | G#m7b5 C#7 | E7sus4 E7')
    S.chords(45, 'F#m7 | Dmaj7 | Bm7 | E7sus4 E | F#m7 | Dmaj7 | Bm7 E7 | A')
    S.chords(53, MARKET_A_CH)
    S.chords(61, MARKET_A2_CH)
    S.chords(69, 'A | Bm7 | A/C# | D E7sus4 | Dmaj7 | Aadd9')

    rec = S.part('recorder', 'recorder', stem='front', pan=58, vol=94, legato=True, dyn='mf')
    acc = S.part('accordion', 'accordion', stem='front', pan=44, vol=84, legato=True, dyn='mp')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=52, vol=92, legato=True, dyn='mp')
    fl = S.part('flute', 'flute', stem='front', pan=68, vol=86, legato=True, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=98, legato=True, dyn='mp')
    vc = S.part('cello', 'cello', stem='mid', pan=82, vol=92, legato=True, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=70, vol=100, dyn='mf')
    gt = S.part('guitar', 'nylon', stem='mid', pan=28, vol=92, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=22, vol=88, dyn='mp')
    mb = S.part('marimba', 'marimba', stem='mid', pan=88, vol=78, dyn='mp')
    sd = S.part('steeldrum', 'steeldrum', stem='front', pan=40, vol=110, dyn='mf')
    ka = S.part('kalimba', 'kalimba', stem='mid', pan=84, vol=104, dyn='mp')
    hn = S.part('horns', 'horn', stem='back', pan=42, vol=90, legato=True, dyn='mp')
    pd = S.part('pad', 'warmpad', stem='back', pan=64, vol=64, dyn='p')
    sy = S.part('pulse', 'polysynth', stem='back', pan=94, vol=54, dyn='p')
    pc = S.part('perc', 'drums', stem='back', pan=56, vol=78, dyn='p')

    def strum(b0, b1, pattern='0 2 1 3 2 1 3 2'):
        arp(gt, b0, b1, pattern, step=0.5, n=4, low=P('E3'), high=P('E5'), length=0.9)

    def shaker(b0, b1, v=34):
        for b in range(b0, b1):
            for k in range(8):
                hit(pc, b, 'shaker', k * 0.5, vel=v + (8 if k % 2 == 0 else 0), dur=0.25)

    # ---------------------------------------------------------------- intro (1-4)
    strum(1, 5)
    bassline(pz, 1, 5, 'R:q r:q 5:q r:q', octave=2)
    shaker(1, 5, 28)
    gt.dyn(1, 'mp')
    rec.line(4, 'r:h r:q E4:e A4:e', check=True)

    # ---------------------------------------------------------------- A (5-12)
    rec.line(5, MARKET_A)
    rec.dyn(5, 'mf')
    strum(5, 13)
    bassline(pz, 5, 13, 'R:q r:q 5:q r:q', octave=2)
    shaker(5, 13)
    pad(vn, 9, 13, n=3, low=P('C#4'), high=P('C#5'))
    vn.hairpin(9, 13, 'pp', 'p')

    # ---------------------------------------------------------------- A2 (13-20): higher second half, fiddle answers
    rec.line(13, MARKET_HEAD + '|' + MARKET_A2_END)
    rec.dyn(13, 'mf')
    acc.line(16, 'r:h C#5:e D5:e E5:e G#5:e')
    acc.line(20, 'r:h E5:e F#5:e G#5:e B5:e')
    acc.dyn(16, 'mp')
    strum(13, 21)
    arp(mb, 13, 21, '0 2 1 2 0 2 1 2', step=0.5, n=3, low=P('A4'), high=P('A5'), length=0.45)
    mb.dyn(13, 'p')
    bassline(pz, 13, 21, 'R:q r:q 5:q r:q', octave=2)
    shaker(13, 21)
    vc.line(13, 'A2:h E3:h | B2:h D3:h | C#3:h A2:h | D3:h E3:h | F#3:h C#3:h | D3:h A2:h | B2:h E3:h | A2:h. r:q')
    vc.dyn(13, 'mp')

    # ---------------------------------------------------------------- B (21-28): accordion in F# minor
    acc.line(21, MARKET_B)
    acc.dyn(21, 'mf')
    acc.hairpin(25, 27, 'mf', 'f')
    acc.hairpin(27, 29, 'f', 'mp')
    arp(hp, 21, 29, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('F#3'), high=P('F#5'), length=1.2)
    hp.dyn(21, 'mp')
    vc.line(21, 'F#3:w | D3:w | B2:w | E3:h G#3:h | F#3:w | D3:h F#3:h | B2:h E3:h | A2:h. r:q')
    vc.dyn(21, 'mp')
    pad(pd, 21, 29, n=4, low=P('A3'), high=P('A4'))
    pd.dyn(21, 'p')
    for b in range(21, 29):
        hit(pc, b, 'tri', 0, vel=26 if b % 2 else 32, dur=1.0)

    # ---------------------------------------------------------------- C (29-36): harbour, steel drum and kalimba
    sd.line(29, 'F#5:e A5:e D6:q r:e A5:e B5:q | G#5:e B5:e E6:q r:e B5:e C#6:q')
    ka.line(31, 'E5:e G#5:e B5:e C#6:e r:h | A5:e C#6:e E6:e F#6:e r:h')
    sd.line(33, 'D6:q. C#6:e B5:q F#5:q | E6:q. D6:e B5:q G#5:q | C#6:h A5:h | B5:h. r:q')
    ka.line(35, 'r:h E5:e A5:e C#6:e E6:e | r:h D5:e E5:e G#5:e B5:e')
    sd.dyn(29, 'f')
    ka.dyn(31, 'mf')
    arp(sy, 29, 37, '0 1 2 1', step=0.25, n=3, low=P('D5'), high=P('D6'), length=0.2)
    sy.dyn(29, 'p')
    sy.hairpin(29, 33, 'p', 'mp')
    bassline(pz, 29, 37, 'R:q. R:e r:q 5:q', octave=2)
    pz.dyn(29, 'mp')
    pad(pd, 29, 37, n=4, low=P('F#3'), high=P('F#4'))
    for b in range(29, 37):
        hit(pc, b, 'conga', 0, vel=52, dur=0.5)
        hit(pc, b, 'bongo', 1.5, vel=44, dur=0.5)
        hit(pc, b, 'conga', 2.5, vel=46, dur=0.5)
        hit(pc, b, 'tumba', 3.0, vel=50, dur=0.5)
    shaker(29, 37, 32)

    # ---------------------------------------------------------------- D (37-44): the alley, clarinet low
    cl.line(37, 'F#4:q A4:e G#4:e F#4:q C#5:q | C#5:q. B4:e A4:q F#4:q | D5:q. C#5:e B4:q A4:q | G#4:h E#4:h |'
                'F#4:q A4:e G#4:e F#4:q C#5:q | D5:q. C#5:e B4:q G#4:q | F#4:q G#4:q E#4:q G#4:q | B4:h G#4:h')
    cl.dyn(37, 'mp')
    cl.hairpin(41, 43, 'mp', 'mf')
    pz.line(37, 'F#2:q C#3:q F#3:q C#3:q | E2:q B2:q E3:q B2:q | D2:q A2:q D3:q A2:q | C#2:q G#2:q C#3:q E#2:q |'
                'F#2:q C#3:q F#3:q A2:q | B2:q F#2:q D3:q B2:q | G#2:q D3:q C#3:q G#2:q | E2:q B2:q E3:q E2:q')
    pz.dyn(37, 'mp')
    pad(vn, 37, 45, n=3, low=P('A3'), high=P('A4'))
    vn.dyn(37, 'pp')
    mb.line(38, 'r:h. C#6:e A5:e')
    mb.line(42, 'r:h. G#5:e F#5:e')
    mb.dyn(38, 'p')
    for b in range(37, 45):
        hit(pc, b, 'wb_lo' if b % 2 else 'wb_hi', 3.5, vel=24, dur=0.25)

    # ---------------------------------------------------------------- B' (45-52): violins, flute descant
    vn.line(45, MARKET_B)
    vn.dyn(45, 'mp')
    vn.hairpin(49, 51, 'mp', 'mf')
    vn.hairpin(51, 53, 'mf', 'mp')
    fl.line(45, 'r:w | F#6:h E6:h | D6:w | B5:h. r:q | r:w | F#6:h A6:h | F#6:h G#6:h | A6:h. r:q')
    fl.dyn(45, 'p')
    vc.line(45, 'F#3:w | D3:w | B2:w | E3:w | F#3:w | D3:w | B2:h E3:h | A2:h. r:q')
    vc.dyn(45, 'mp')
    arp(hp, 45, 53, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('F#3'), high=P('F#5'), length=1.4)
    pad(pd, 45, 53, n=4, low=P('A3'), high=P('A4'))
    pd.dyn(45, 'p')
    roll(pc, 52, 'crash2', 2, 18, 46, beat=2)

    # ---------------------------------------------------------------- A' (53-60): the whole band
    vn.line(53, MARKET_A)
    vn.dyn(53, 'mf')
    fl.line(53, MARKET_A, octave=1)
    fl.dyn(53, 'mp')
    pad(hn, 53, 61, n=3, low=P('E3'), high=P('C#4'))
    hn.dyn(53, 'mp')
    strum(53, 61)
    arp(mb, 53, 61, '0 2 1 2 0 2 1 2', step=0.5, n=3, low=P('A4'), high=P('A5'), length=0.45)
    mb.dyn(53, 'mp')
    bassline(pz, 53, 61, 'R:q r:q 5:q r:q', octave=2)
    pz.dyn(53, 'mf')
    vc.line(53, 'A2:h E3:h | B2:h D3:h | C#3:h A2:h | D3:h E3:h | A2:h E3:h | D3:h F#3:h | C#3:h E3:h | A2:h. r:q')
    vc.dyn(53, 'mf')
    for b in range(53, 61):
        hit(pc, b, 'tamb', 1.0, vel=34, dur=0.5)
        hit(pc, b, 'tamb', 3.0, vel=38, dur=0.5)
    shaker(53, 61, 30)

    # ---------------------------------------------------------------- A'' (61-68): fiddle and recorder, thinning
    acc.line(61, MARKET_HEAD)
    acc.dyn(61, 'mf')
    rec.line(65, MARKET_A2_END)
    rec.dyn(65, 'mp')
    strum(61, 69)
    gt.hairpin(65, 69, 'mp', 'p')
    bassline(pz, 61, 69, 'R:q r:q 5:q r:q', octave=2)
    pz.hairpin(61, 69, 'mf', 'mp')
    pad(vn, 61, 69, n=3, low=P('C#4'), high=P('C#5'))
    vn.dyn(61, 'p')
    shaker(61, 65, 26)

    # ---------------------------------------------------------------- coda (69-74): slowing, the head of the tune
    rec.line(69, 'E5:q A5:e G#5:e F#5:q E5:q | D5:q. C#5:e B4:h | C#5:e D5:e E5:q A5:h | F#5:h E5:h | E5:w | E5:w')
    rec.hairpin(69, 73, 'mp', 'p')
    rec.hairpin(73, 75, 'p', 'pp')
    strum(69, 73)
    gt.dyn(69, 'p')
    pz.line(69, 'A2:h r:h | B2:h r:h | C#3:h r:h | D3:h E3:h | D3:w | A2:w')
    pz.dyn(69, 'mp')
    pad(vn, 69, 75, n=4, low=P('C#4'), high=P('C#5'))
    vn.hairpin(69, 75, 'p', 'pp')
    pad(pd, 73, 75, n=4, low=P('A3'), high=P('B4'))
    arp(hp, 74, 75, '0 1 2 3 4 5 6 7', step=0.25, n=8, low=P('A2'), high=P('E6'), length=4.0)
    hp.dyn(74, 'mp')
    ka.line(74, 'E6:q A6:q B6:q C#7:q')
    ka.dyn(74, 'p')
    vc.line(73, 'D3:w | A2:w')
    vc.dyn(73, 'p')
    return S
