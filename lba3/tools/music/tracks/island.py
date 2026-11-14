"""Island Exploration — Citadel island outside the village (beaches, cliffs, lighthouse, camp).

Space and motion, no forced danger: the Adventure theme in its main version, over a running 8th-note
string ostinato.

  intro  1-2   ostinato + harp
  A      3-10  violins: Adventure A + B; horns hold the harmony
  A'    11-18  flute + oboe in octaves, re-harmonised; pizzicato and harp; clarinet countermelody
  C     19-26  the bridge through B minor (clarinet, then horn answering)
  D     27-34  "travel": a broad new tune from the head motif in long notes (horn + celli, G major)
  E     35-42  development in E minor: the head motif passed between instruments, one bar each
  A''   43-50  the theme broad (horns + violins), timpani, the arrival
  F     51-58  horizon: flute in long notes over a D pedal
  link  59-62  the ostinato alone, back to the top
"""
from score import Song, P, pad, arp, bassline, roll, hit
from themes import ADV_A, ADV_B, ADV_C, ADV_CHORDS_A, ADV_CHORDS_B, ADV_CHORDS_C


def song():
    S = Song('island', 556000, title='Island Exploration', role='Citadel island outdoors')
    S.intro_bars, S.body_bars = 2, 60
    S.mix = {'room': {'rt60': 2.3, 'predelay': 0.022, 'bright': 0.55}, 'wet': {'front': 0.22, 'mid': 0.28, 'back': 0.42},
             'lufs': -17.0}
    S.chords(1, 'D | G/D')
    S.chords(3, ADV_CHORDS_A + ' | ' + ADV_CHORDS_B)
    S.chords(11, 'D Dmaj7/C# | Bm7 | Gmaj7 A | D | Bm G | Em7 | Gmaj7 A7 | D')
    S.chords(19, ADV_CHORDS_C + ' | Bm | Em7 | Gmaj7 | A7sus4 A7')
    S.chords(27, 'G | Em | C | D | G | C | G/D | B7')
    S.chords(35, 'Em | Am | D | G | C | F#m7b5 B7 | Em | A7sus4 A7')
    S.chords(43, ADV_CHORDS_A + ' | ' + ADV_CHORDS_B)
    S.chords(51, 'D | Gmaj7/D | D | Gmaj7/D | Bm | G | Em7 | A7sus4')
    S.chords(59, 'D | G/D | Em7 | A7')

    fl = S.part('flute', 'flute', stem='front', pan=60, vol=92, legato=True, dyn='mf')
    ob = S.part('oboe', 'oboe', stem='front', pan=72, vol=88, legato=True, dyn='mf')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=50, vol=92, legato=True, dyn='mp')
    hn = S.part('horns', 'horn', stem='mid', pan=44, vol=98, legato=True, dyn='mp')
    v1 = S.part('violins1', 'strings', stem='mid', pan=36, vol=102, legato=True, dyn='mf')
    v2 = S.part('ostinato', 'strings', stem='mid', pan=66, vol=86, dyn='mp')
    vc = S.part('celli', 'cello', stem='mid', pan=80, vol=96, legato=True, dyn='mp')
    cb = S.part('basses', 'contrabass', stem='mid', pan=92, vol=90, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=70, vol=90, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=26, vol=92, dyn='mp')
    tp = S.part('trumpet', 'trumpet', stem='back', pan=62, vol=78, legato=True, dyn='mf')
    ti = S.part('timpani', 'timpani', stem='back', pan=60, vol=96, dyn='mp')
    pc = S.part('perc', 'drums', stem='back', pan=64, vol=84, dyn='mp')

    OST = '0 1 2 1 0 1 2 1'
    # the running ostinato: almost everywhere, with breathing room in F
    for b0, b1 in ((1, 11), (19, 51), (59, 63)):
        arp(v2, b0, b1, OST, step=0.5, n=3, low=P('A3'), high=P('A4'), length=0.42, accent_every=4)
    v2.dyn(1, 'mp')
    v2.dyn(27, 'p')
    v2.hairpin(39, 43, 'p', 'mf')
    v2.dyn(59, 'mp')
    arp(hp, 1, 3, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('D3'), high=P('D5'), length=1.6)

    # A
    v1.line(3, ADV_A + ' | ' + ADV_B)
    v1.hairpin(9, 10, 'mf', 'f')
    v1.dyn(10, 'mf', beat=2)
    pad(hn, 3, 11, n=2, low=P('D4'), high=P('B4'))
    hn.dyn(3, 'mp')
    vc.line(3, 'D3:q. D3:e A2:q D3:q | C#3:h B2:h | A2:q. A2:e C#3:q E3:q | D3:h. A2:q |'
               'D3:h G2:h | B2:q. B2:e F#2:h | E2:q. E2:e A2:h | D3:h. A2:q')
    bassline(cb, 3, 11, 'R:h R:h', octave=1)
    hit(pc, 3, 'tri', vel=48)
    hit(pc, 7, 'tri', vel=44)

    # A': flute + oboe, re-harmonised; pizzicato and harp
    fl.line(11, ADV_A + ' | ' + ADV_B, octave=1)
    ob.line(11, ADV_A + ' | ' + ADV_B)
    fl.dyn(11, 'mp')
    ob.dyn(11, 'mf')
    cl.line(11, 'r:h A4:h | B4:h. D5:q | B4:h C#5:h | D5:q A4:q F#4:h | r:h B4:h | G4:h. A4:q | B4:h C#5:h | A4:h. r:q')
    cl.dyn(11, 'mp')
    bassline(pz, 11, 19, 'R:q 5:q 8:q 5:q', octave=2)
    arp(hp, 11, 19, '0 1 2 3', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.2)
    hp.dyn(11, 'mp')

    # C: the bridge
    cl.line(19, ADV_C)
    cl.hairpin(19, 23, 'mp', 'mf')
    hn.line(23, 'B4:q. F#4:e B4:q D5:q | C#5:q. B4:e G4:h | B4:q. A4:e G4:q E4:q | E4:h. r:q')
    hn.dyn(23, 'mf')
    vc.line(19, 'D3:w | E3:w | E3:h C#3:h | D3:h C#3:h | B2:w | G2:w | G2:w | A2:w')
    vc.dyn(19, 'mp')
    bassline(cb, 19, 27, 'R:w', octave=1)
    arp(hp, 19, 27, '0 2 1 3', step=1.0, n=4, low=P('B3'), high=P('B5'), length=2.0)
    hp.dyn(19, 'p')

    # D: travel tune
    hn.line(27, 'D5:h. G4:q | B4:h D5:h | C5:h. B4:q | A4:w | D5:h. G4:q | B4:h E5:h | D5:h. C5:q | B4:h A4:h')
    hn.dyn(27, 'mf')
    vc.line(27, 'D4:h. G3:q | B3:h D4:h | C4:h. B3:q | A3:w | D4:h. G3:q | B3:h E4:h | D4:h. C4:q | B3:h A3:h')
    vc.dyn(27, 'mf')
    bassline(cb, 27, 35, 'R:w', octave=1)
    cb.dyn(27, 'mp')
    arp(hp, 27, 35, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('G2'), high=P('G4'), length=1.5)
    fl.line(30, 'r:h F#5:q. G5:e')
    fl.line(34, 'r:h D#5:q. E5:e')
    fl.dyn(30, 'mp')

    # E: development in E minor
    v1.line(35, 'E5:q. B4:e E5:q G5:q')
    cl.line(36, 'A4:q. E4:e A4:q C5:q')
    fl.line(37, 'D5:q. A4:e D5:q F#5:q')
    v1.line(38, 'G5:q. D5:e G5:q B5:q')
    hn.line(39, 'E4:q. C4:e E4:q G4:q')
    v1.line(40, 'A5:h F#5:q D#5:q | E5:h. B4:q | D5:h C#5:h')
    for p_, b in ((v1, 35), (cl, 36), (fl, 37), (v1, 38), (hn, 39)):
        p_.dyn(b, 'mf')
    v1.hairpin(40, 43, 'mf', 'f')
    vc.line(35, 'E3:h B2:h | A2:h C3:h | D3:h F#2:h | G2:h B2:h | C3:h E3:h | F#2:h B2:h | E2:h G2:h | A2:h A2:h')
    vc.dyn(35, 'mf')
    bassline(cb, 35, 43, 'R:h R:h', octave=1)
    roll(ti, 42, 'A2', 4, 50, 86)

    # A'': broad
    hn.line(43, ADV_A + ' | ' + ADV_B)
    hn.dyn(43, 'f')
    v1.line(43, ADV_A + ' | ' + ADV_B, octave=1)
    v1.dyn(43, 'f')
    v1.hairpin(49, 51, 'f', 'mf')
    tp.line(47, 'r:h D5:q G5:q | F#5:w | G5:h A5:h | F#5:h. r:q')
    tp.dyn(47, 'mf')
    vc.line(43, 'D3:q. D3:e A2:q D3:q | C#3:h B2:h | A2:q. A2:e C#3:q E3:q | D3:h. A2:q |'
                'D3:h G2:h | B2:q. B2:e F#2:h | E2:q. E2:e A2:h | D3:h. r:q')
    vc.dyn(43, 'f')
    bassline(cb, 43, 51, 'R:h R:h', octave=1)
    cb.dyn(43, 'mf')
    arp(hp, 43, 51, '0 1 2 3 4 3', step=0.5, n=5, low=P('D3'), high=P('D6'), length=1.2)
    hp.dyn(43, 'mf')
    ti.line(43, 'D2:q r:h. | r:w | r:h A2:q r:q | D2:q r:h A2:q | D2:q r:h. | r:w | r:h A2:q A2:q | D2:q r:h.')
    ti.dyn(43, 'mf')
    hit(pc, 43, 'crash', vel=56, dur=4)
    hit(pc, 47, 'tri', vel=50)
    hit(pc, 51, 'tri', vel=40)

    # F: horizon
    fl.line(51, 'F#5:w | E5:h D5:h | A5:w | G5:h F#5:h | D5:h. B4:q | D5:h E5:h | G5:h F#5:h | E5:w')
    fl.dyn(51, 'mp')
    fl.hairpin(53, 55, 'mp', 'mf')
    fl.hairpin(57, 59, 'mf', 'p')
    pad(v1, 51, 59, n=3, low=P('D4'), high=P('D5'))
    v1.dyn(51, 'p')
    cb.line(51, 'D2:w~ | D2:w~ | D2:w~ | D2:w | B1:w | G1:w | E2:w | A1:w')
    cb.dyn(51, 'p')
    arp(hp, 51, 59, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('D3'), high=P('F#5'), length=2.0)
    hp.dyn(51, 'p')

    # link
    vc.line(59, 'D3:w | G2:w | E2:w | A2:w')
    vc.dyn(59, 'mp')
    pz.line(59, 'D2:q r:q D2:q r:q | G2:q r:q G2:q r:q | E2:q r:q E2:q r:q | A2:q r:q A2:q C#3:q')
    pz.dyn(59, 'mp')
    return S
