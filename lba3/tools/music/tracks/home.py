"""Home — Twinsen's house, the cellar, the lighthouse lamp room, the neighbours' homes. MUSIC-LBA, 17.11.2026
(replaces the slower 84 bpm piece of the same name).

A warm, light-footed waltz in F (3/4, 120): a new house tune that turns and climbs, the family's own Home motif
(themes.HOME_A / HOME_B) on the cello and horn in the middle strain, Twinsen's hook (three rising notes, a leap of a
fourth, a fall) on the flute as the house's answer, and a short D-minor evening strain. Nylon guitar and pizzicato
oom-pah-pah, harp, celesta and kalimba sparkles, an accordion in the second tune, a brush kit on the off-beats.
Kept transparent (dialogue happens here; the music ducks under it). Original.

  intro  1-2   guitar waltz alone
  A      3-18  the house tune, clarinet (16 bars), harp
  B     19-34  the Home motif on the cello, its answer on the horn; then Twinsen's hook on the flute, celesta
  A'    35-50  the house tune on flute, the clarinet's countermelody, accordion off-beats, pizzicato
  C     51-58  evening: D minor, bassoon and clarinet, the hook in minor, music-box kalimba
  link  59-66  guitar, harp and the celesta tease the hook; back to bar 3
"""
from score import Song, P, pad, arp, bassline, groove, comp
from themes import HOME_A, HOME_B, shift

HOUSE = ("A4:q C5:q F5:q | E5:q. D5:e C5:q | D5:q. E5:e F5:q | G5:h F5:q |"
         "Bb4:e C5:e D5:q G5:q | F5:q. E5:e D5:q | C5:q A5:q G5:e F5:e | G5:h. |"
         "A4:q C5:q F5:q | E5:q. D5:e C#5:q | D5:e E5:e F5:q A5:q | Bb5:h A5:q |"
         "D6:q. C6:e Bb5:q | A5:q. G5:e F5:q | G5:h E5:q | F5:h.")
HOUSE_CH = 'F | C/E | Dm | Bb | Gm7 | C7 | F/A Bb | C7 | F | A7/E | Dm | Bb | Bb | F/C | Gm7 C7 | F'
HOUSE_BASS = ("F2:q A2:q C3:q | E2:q G2:q C3:q | D2:q F2:q A2:q | Bb1:q D2:q F2:q |"
              "G2:q Bb2:q D3:q | C2:q E2:q G2:q | A1:q. Bb1:q. | C2:q G2:q E2:q |"
              "F2:q A2:q C3:q | E2:q A2:q C#3:q | D2:q F2:q A2:q | Bb1:q D2:q F2:q |"
              "Bb1:q F2:q D2:q | C2:q F2:q A2:q | G2:q. C2:q. | F2:q C2:q A1:q")
CL_CTR = ("F4:h. | G4:h. | A4:h. | D4:q. E4:e F4:q | D4:h. | Bb4:q. A4:e G4:q | A4:q. D4:q. | E4:h. |"
          "F4:h. | G4:h. | A4:h. | F4:q. G4:e A4:q | Bb4:h. | C5:q. Bb4:e A4:q | Bb4:q. G4:q. | A4:h.")
HOOK_WALTZ = ("F5:e G5:e A5:e D6:q. | C6:q A5:q F5:q | E5:e F5:e G5:e C6:q. | A5:h. |"
              "F5:e G5:e A5:e D6:q. | C6:q Bb5:q G5:q | Bb5:q. A5:e G5:q | E5:h.")

WALTZ = [(1.0, 0.6), (2.0, 0.6)]
BRUSH = {'kick': 'x.....', 'snare': '..o.o.', 'shaker': '.o.o.o'}


def song():
    S = Song('home', 500000, meter=(3, 4), title='Home', role="Twinsen's house")
    S.intro_bars, S.body_bars = 2, 64
    S.mix = {'room': {'rt60': 1.5, 'predelay': 0.012, 'bright': 0.5}, 'wet': {'front': 0.2, 'mid': 0.24, 'back': 0.3},
             'lufs': -18.0}
    S.chords(1, 'F | C7')
    S.chords(3, HOUSE_CH)
    S.chords(19, 'F | Bb | Gm7 | Csus4 C | Dm | A/C# | Bb | A')
    S.chords(27, 'Bb | F/A | C7 | F | Dm | Gm | C7 | C7')
    S.chords(35, HOUSE_CH)
    S.chords(51, 'Dm | Bb | Gm7 | A7 | Dm | Bb | Gm7 C7 | C7')
    S.chords(59, 'F | Dm7 | Gm7 | C7 | F | Dm7 | Gm7 | C7')

    cl = S.part('clarinet', 'clarinet', stem='front', pan=56, vol=96, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=72, vol=90, legato=True, dyn='mf')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=80, vol=88, legato=True, dyn='mp')
    ce = S.part('celesta', 'celesta', stem='front', pan=24, vol=104, dyn='mp')
    gt = S.part('guitar', 'nylon', stem='mid', pan=38, vol=94, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=26, vol=82, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=70, vol=80, dyn='mp')
    ka = S.part('kalimba', 'kalimba', stem='mid', pan=90, vol=78, dyn='mp')
    ac = S.part('accordion', 'accordion', stem='mid', pan=34, vol=70, dyn='p')
    vc = S.part('cello', 'cello', stem='mid', pan=82, vol=92, legato=True, dyn='mf')
    st = S.part('strings', 'strings_slow', stem='mid', pan=60, vol=72, dyn='pp')
    bs = S.part('bass', 'acbass', stem='mid', pan=64, vol=68, dyn='mf')
    hn = S.part('horn', 'horn', stem='back', pan=46, vol=72, legato=True, dyn='mp')
    dr = S.part('kit', 'brushkit', stem='back', pan=64, vol=70, dyn='mp')

    # ------------------------------------------------------------ intro (1-2)
    gt.dyn(1, 'mp')
    bs.dyn(1, 'mp')
    bs.line(1, 'F2:q A2:q C3:q | C2:q E2:q G2:q')
    comp(gt, 1, 3, WALTZ, n=3, low=P('A3'), high=P('F4'))

    # ------------------------------------------------------------ A (3-18): the house tune, clarinet
    cl.line(3, HOUSE)
    bs.dyn(3, 'mf')
    bs.line(3, HOUSE_BASS)
    comp(gt, 3, 19, WALTZ, n=3, low=P('A3'), high=P('F4'))
    hp.dyn(3, 'p')
    arp(hp, 11, 19, '0 1 2 3 2 1', step=0.5, n=4, low=P('F3'), high=P('F5'), length=1.2)
    dr.dyn(3, 'p')
    groove(dr, 3, 19, BRUSH, step=0.5)
    ka.line(10, 'r:h C6:e A5:e')
    ka.line(18, 'r:h A5:e C6:e')

    # ------------------------------------------------------------ B (19-34): the Home motif, then Twinsen's hook
    vc.dyn(19, 'mf')
    vc.line(19, shift(HOME_A, -12))
    hn.dyn(23, 'mf')
    hn.line(23, shift(HOME_B, -12))
    st.dyn(19, 'pp')
    pad(st, 19, 27, n=3, low=P('A3'), high=P('A4'))
    arp(hp, 19, 27, '0 1 2 3 2 1', step=0.5, n=4, low=P('F3'), high=P('F5'), length=1.2)
    pz.dyn(19, 'mp')
    comp(pz, 19, 35, WALTZ, n=3, low=P('A3'), high=P('F4'))
    bs.dyn(19, 'mp')
    bassline(bs, 19, 27, 'R:q 5:q. 3:e', octave=2)
    fl.dyn(27, 'mf')
    fl.line(27, HOOK_WALTZ)
    ce.dyn(27, 'mp')
    ce.line(30, 'r:q A5:e C6:e F6:q')
    ce.line(34, 'r:q G5:e Bb5:e C6:q')
    bs.dyn(27, 'mf')
    bassline(bs, 27, 35, 'R:q 5:q 8:q', octave=2)
    groove(dr, 19, 35, BRUSH, step=0.5)

    # ------------------------------------------------------------ A' (35-50): flute, clarinet counter, accordion
    fl.dyn(35, 'mf')
    fl.line(35, HOUSE)
    cl.dyn(35, 'mp')
    cl.line(35, CL_CTR)
    ac.dyn(35, 'p')
    comp(ac, 35, 51, WALTZ, n=3, low=P('A3'), high=P('F4'))
    pz.dyn(35, 'mp')
    bs.dyn(35, 'mf')
    bs.line(35, HOUSE_BASS)
    arp(hp, 35, 43, '0 2 1 3 2 1', step=0.5, n=4, low=P('F3'), high=P('F5'), length=1.0)
    ka.line(42, 'r:h C6:e A5:e')
    ka.line(50, 'r:h F5:e A5:e')
    dr.dyn(35, 'mp')
    groove(dr, 35, 51, BRUSH, step=0.5)

    # ------------------------------------------------------------ C (51-58): evening, D minor
    bn.dyn(51, 'mp')
    bn.line(51, 'F4:q. E4:e D4:q | D4:h C4:q | Bb3:q. A3:e G3:q | A3:h.')
    cl.dyn(55, 'mf')
    cl.line(55, 'D5:e E5:e F5:e Bb5:q. | A5:q F5:q D5:q | G5:q. F5:e E5:q | C5:h.')
    ka.dyn(51, 'p')
    arp(ka, 51, 59, '0 1 2 1 2 1', step=0.5, n=3, low=P('D5'), high=P('D6'), length=0.6)
    gt.dyn(51, 'mp')
    comp(gt, 51, 59, WALTZ, n=3, low=P('A3'), high=P('F4'))
    st.dyn(51, 'pp')
    pad(st, 51, 59, n=3, low=P('A3'), high=P('A4'))
    bs.dyn(51, 'mp')
    bassline(bs, 51, 59, 'R:q 5:q 8:q', octave=2)
    dr.dyn(51, 'p')
    groove(dr, 51, 59, {'kick': 'x.....', 'shaker': '.o.o.o'}, step=0.5)

    # ------------------------------------------------------------ link (59-66): back to bar 3
    gt.dyn(59, 'mp')
    comp(gt, 59, 67, WALTZ, n=3, low=P('A3'), high=P('F4'))
    hp.dyn(59, 'p')
    arp(hp, 59, 67, '0 1 2 3 2 1', step=0.5, n=4, low=P('F3'), high=P('F5'), length=1.2)
    bs.dyn(59, 'mp')
    bassline(bs, 59, 67, 'R:q 5:q 8:q', octave=2)
    ce.dyn(61, 'mp')
    ce.line(61, 'C5:e D5:e E5:e A5:q. | G5:h. ')
    ce.line(65, 'F5:e G5:e A5:e D6:q. | C6:h. ')
    dr.dyn(59, 'p')
    groove(dr, 59, 67, {'kick': 'x.....', 'shaker': '.o.o.o'}, step=0.5)
    return S
