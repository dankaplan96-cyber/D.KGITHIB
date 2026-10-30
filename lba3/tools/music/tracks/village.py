"""Citadel Village — the town exterior, the harbour, the town interiors (muffled).

Everyday life: light and curious, in a walking 6/8. The village has its own tune (A: a rising
"good-morning" arpeggio with a neighbour note, answered by a stepwise turn); its B-section quotes the
Home motif (mi-re-do, then the sixth la-sol) because this is Twinsen's own town.

  intro   1-4   guitar + pizzicato vamp
  A       5-12  the village tune, clarinet
  B      13-20  flute; second half = Home motif quote; clarinet answers in the gaps
  A'     21-28  oboe + flute in thirds, reharmonised (D/F#, Em7, Cmaj7, D7sus4), marimba enters
  C1     29-36  C major: bassoon and clarinet trade the tune's head; a staccato chatter in thirds
  C2     37-44  E minor "afternoon": violins in long notes, celli countermelody, harp
  C3     45-52  the tune in E minor over a chromatic walking bass (E D# D C# C B) — something to discover
  A''    53-60  violins with the tune, flute descant, horns, a soft tambourine: the square at its busiest
  B''    61-68  the Home quote on a horn, clarinet countermelody
  A'''   69-76  clarinet again, fragmenting
  vamp   77-84  thins back to the opening vamp; the clarinet pickup leads into bar 5
"""
from score import Song, P, pad, arp, bassline, hit

VILLAGE_A = ("G4:e B4:e D5:e E5:q D5:e | C5:q A4:e F#4:q A4:e | G4:e B4:e D5:e G5:q F#5:e | E5:q. D5:q. |"
             "G4:e B4:e D5:e E5:q D5:e | C5:q E5:e A5:q G5:e | F#5:q D5:e E5:q C5:e | B4:q. G4:q.")
VILLAGE_A_CH = 'G | D7/F# | Em | C D | G | Am7 | D7 | G'
VILLAGE_B = ("E5:q. B4:q. | C5:q B4:e A4:q G4:e | F#4:q A4:e D5:q C5:e | B4:q. r:q. |"
             "B4:q A4:e G4:q. | E5:q. D5:q. | C5:q B4:e A4:q D5:e | G4:q. r:q.")
VILLAGE_B_CH = 'Em | Am | D7 | G | G | Cadd9 | Am7 D7 | G'


def song():
    S = Song('village', 556000, meter=(6, 8), title='Citadel Village', role='Citadel town, harbour')
    S.intro_bars, S.body_bars = 4, 80
    S.mix = {'room': {'rt60': 1.7, 'predelay': 0.016, 'bright': 0.6}, 'wet': {'front': 0.2, 'mid': 0.26, 'back': 0.36},
             'lufs': -17.0}

    S.chords(1, 'G | C/G | G | D7')
    S.chords(5, VILLAGE_A_CH)
    S.chords(13, VILLAGE_B_CH)
    S.chords(21, 'G | D/F# | Em7 | Cmaj7 D | G/B | Am7 | D7sus4 D7 | G')
    S.chords(29, 'C | G7/B | C | F | C | Dm7 | G7 | C B7')
    S.chords(37, 'Em | C | Am7 | B7 | Em | Am | F#m7b5 B7 | Em')
    S.chords(45, 'Em | B7/D# | Em/D | A/C# | Am/C | Em/B | B7 | Em D7')
    S.chords(53, VILLAGE_A_CH)
    S.chords(61, VILLAGE_B_CH)
    S.chords(69, VILLAGE_A_CH)
    S.chords(77, 'G | C/G | G | C/G | G | C/G | Am7 | D7')

    cl = S.part('clarinet', 'clarinet', stem='front', pan=58, vol=96, legato=True, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=72, vol=90, legato=True, dyn='mp')
    ob = S.part('oboe', 'oboe', stem='front', pan=46, vol=88, legato=True, dyn='mp')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=78, vol=96, dyn='mf')
    hn = S.part('horn', 'horn', stem='back', pan=40, vol=92, legato=True, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=100, legato=True, dyn='mp')
    va = S.part('strings2', 'strings_slow', stem='mid', pan=70, vol=84, dyn='p')
    vc = S.part('cello', 'cello', stem='mid', pan=82, vol=94, legato=True, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=68, vol=100, dyn='mf')
    gt = S.part('guitar', 'nylon', stem='mid', pan=30, vol=92, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=24, vol=90, dyn='mp')
    mb = S.part('marimba', 'marimba', stem='mid', pan=86, vol=78, dyn='mp')
    gl = S.part('glock', 'glock', stem='front', pan=64, vol=64, dyn='p')
    pc = S.part('perc', 'drums', stem='back', pan=56, vol=80, dyn='p')

    # ---------------------------------------------------------------- intro + vamp texture
    arp(gt, 1, 5, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    bassline(pz, 1, 5, 'R:q. 5:q.', octave=2)
    cl.line(4, 'r:q. D4:e E4:e F#4:e')

    # ---------------------------------------------------------------- A  (5-12)
    cl.line(5, VILLAGE_A)
    arp(gt, 5, 13, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    bassline(pz, 5, 13, 'R:q. 5:q.', octave=2)
    pad(va, 9, 13, n=3, low=P('B3'), high=P('B4'))
    va.hairpin(9, 13, 'pp', 'p')

    # ---------------------------------------------------------------- B  (13-20)
    fl.line(13, VILLAGE_B)
    fl.dyn(13, 'mf')
    cl.line(16, 'r:q. D5:e C5:e A4:e')
    cl.line(20, 'r:q. D4:e E4:e F#4:e')
    cl.dyn(16, 'mp')
    arp(gt, 13, 21, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    bassline(pz, 13, 21, 'R:q. 5:q.', octave=2)
    pad(va, 13, 21, n=3, low=P('B3'), high=P('C5'))
    va.dyn(13, 'p')
    vc.line(17, 'G3:h. | E3:q. G3:q. | A3:q. F#3:q. | G3:h.')
    vc.dyn(17, 'p')

    # ---------------------------------------------------------------- A' (21-28): oboe + flute in thirds
    ob.line(21, VILLAGE_A)
    ob.dyn(21, 'mf')
    fl.line(21, 'B4:e D5:e F#5:e G5:q F#5:e | E5:q C5:e A4:q C5:e | B4:e D5:e F#5:e B5:q A5:e | G5:q. F#5:q. |'
                'B4:e D5:e G5:e G5:q F#5:e | E5:q G5:e C6:q B5:e | A5:q F#5:e G5:q E5:e | D5:q. B4:q.')
    fl.dyn(21, 'mp')
    arp(mb, 21, 29, '2 1 0 1 2 1', step=0.5, n=3, low=P('G4'), high=P('G5'), length=0.5)
    arp(gt, 21, 29, '0 2 1 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    bassline(pz, 21, 29, 'R:q. 5:q.', octave=2)
    vc.line(21, 'G3:q. F#3:q. | D3:h. | E3:q. D3:q. | C3:q. D3:q. | B2:q. D3:q. | A2:q. C3:q. | D3:h. | G2:q. D3:q.')
    vc.dyn(21, 'mp')

    # ---------------------------------------------------------------- C1 (29-36): C major, bassoon/clarinet
    bn.line(29, 'C3:e E3:e G3:e A3:q G3:e | F3:q D3:e B2:q D3:e')
    cl.line(31, 'C4:e E4:e G4:e C5:q B4:e | A4:q. G4:q.')
    cl.dyn(31, 'mf')
    cl.line(33, 'E5:e! D5:e! C5:e! D5:q! r:e | F5:e! E5:e! D5:e! E5:q! r:e | D5:e! C5:e! B4:e! A4:e! B4:e! G4:e! | C5:q. D#5:q.')
    bn.line(33, 'C4:e! B3:e! A3:e! B3:q! r:e | D4:e! C4:e! B3:e! C4:q! r:e | B3:e! A3:e! G3:e! F3:e! G3:e! D3:e! | E3:q. F#3:q.')
    bassline(pz, 29, 37, 'R:q r:e 5:q r:e', octave=2)
    pz.dyn(29, 'mp')
    arp(hp, 29, 37, '0 2 1 3 r r', step=0.5, n=4, low=P('C4'), high=P('C6'), length=1.0)
    hp.dyn(29, 'p')
    hit(pc, 34, 'wb_hi', beat=2.5, vel=34)
    hit(pc, 33, 'wb_lo', beat=2.5, vel=30)

    # ---------------------------------------------------------------- C2 (37-44): E minor afternoon, strings
    vn.line(37, 'E5:q. B4:q. | C5:q D5:e E5:q. | G5:q. E5:q. | F#5:h. | G5:q F#5:e E5:q. | C6:q B5:e A5:q. | A5:q. D#5:q. | E5:h.')
    vn.dyn(37, 'mp')
    vn.hairpin(40, 42, 'mp', 'mf')
    vn.hairpin(43, 45, 'mf', 'p')
    vc.line(37, 'B3:h. | G3:h. | A3:q. G3:q. | F#3:h. | E3:q. G3:e B3:q | A3:q. C4:q. | C4:q. B3:q. | B3:h.', check=False)
    vc.dyn(37, 'mp')
    pad(va, 37, 45, n=3, low=P('G3'), high=P('G4'))
    va.dyn(37, 'p')
    arp(hp, 37, 45, '0 1 2 3 4 3', step=0.5, n=5, low=P('E3'), high=P('E5'), length=1.4)
    hp.dyn(37, 'mp')
    bassline(pz, 37, 45, 'R:h.', octave=2)
    pz.dyn(37, 'p')

    # ---------------------------------------------------------------- C3 (45-52): E minor, chromatic bass
    ob.line(45, 'E4:e G4:e B4:e C5:q B4:e | A4:q F#4:e D#4:q F#4:e | E4:e G4:e B4:e E5:q D5:e | C#5:q. A4:q. |'
                'C5:e B4:e A4:e E5:q C5:e | B4:q. G4:q. | F#4:q A4:e D#5:q F#5:e | E5:q. D5:q.')
    ob.dyn(45, 'mp')
    pz.line(45, 'E3:q. E3:q. | D#3:q. D#3:q. | D3:q. D3:q. | C#3:q. C#3:q. | C3:q. C3:q. | B2:q. B2:q. | B2:q. A2:q. | E2:q. D3:q.')
    pz.dyn(45, 'mp')
    arp(mb, 45, 53, '0 2 1 2 0 2', step=0.5, n=3, low=P('E4'), high=P('E5'), length=0.5)
    mb.dyn(45, 'p')
    gl.line(48, 'r:q. C#6:q. ')
    gl.line(52, 'r:q. F#6:q.')
    hit(pc, 45, 'tri', vel=36)
    hit(pc, 49, 'tri', vel=32)
    vc.line(49, 'r:q. E3:q. | G3:h. | F#3:h. | G3:q. F#3:q.')
    vc.dyn(49, 'p')

    # ---------------------------------------------------------------- A'' (53-60): tutti light
    vn.line(53, VILLAGE_A)
    vn.dyn(53, 'mf')
    fl.line(53, 'D6:h. | C6:h. | B5:h. | C6:q. A5:q. | B5:h. | C6:h. | A5:q. C6:q. | B5:h.')
    fl.dyn(53, 'mp')
    pad(hn, 53, 61, n=2, low=P('D4'), high=P('B4'))
    hn.dyn(53, 'mp')
    arp(gt, 53, 61, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    arp(mb, 53, 61, '2 1 0 1 2 1', step=0.5, n=3, low=P('G4'), high=P('G5'), length=0.5)
    mb.dyn(53, 'mp')
    bassline(pz, 53, 61, 'R:q. 5:q.', octave=2)
    pz.dyn(53, 'mf')
    vc.line(53, 'G3:q. F#3:q. | D3:h. | E3:q. D3:q. | C3:q. D3:q. | B2:q. D3:q. | A2:q. C3:q. | D3:h. | G2:q. D3:q.')
    vc.dyn(53, 'mf')
    for b in range(53, 61):
        hit(pc, b, 'tamb', beat=1.5, vel=34 + (6 if b % 2 else 0), dur=0.5)

    # ---------------------------------------------------------------- B'' (61-68): Home quote on the horn
    hn.line(61, VILLAGE_B)
    hn.dyn(61, 'mf')
    cl.line(61, 'G4:h. | E4:q. E4:q. | D4:q. F#4:q. | G4:q A4:e B4:e C5:e D5:e |'
                'D5:h. | G4:q. B4:q. | E4:q. F#4:q. | G4:q. r:q.')
    cl.dyn(61, 'mp')
    pad(va, 61, 69, n=3, low=P('B3'), high=P('C5'))
    va.dyn(61, 'p')
    arp(hp, 61, 69, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.6)
    hp.dyn(61, 'mp')
    bassline(pz, 61, 69, 'R:q. 5:q.', octave=2)
    pz.dyn(61, 'mp')

    # ---------------------------------------------------------------- A''' (69-76): clarinet, fragmenting
    cl.line(69, 'G4:e B4:e D5:e E5:q D5:e | C5:q A4:e F#4:q A4:e | G4:e B4:e D5:e G5:q F#5:e | E5:q. D5:q. |'
                'G4:e B4:e D5:e E5:q D5:e | r:h. | G4:e B4:e D5:e r:q. | r:h.')
    cl.dyn(69, 'mf')
    cl.hairpin(73, 77, 'mf', 'mp')
    arp(gt, 69, 77, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    bassline(pz, 69, 77, 'R:q. 5:q.', octave=2)
    pz.dyn(69, 'mf')
    gl.line(74, 'r:q. G5:e B5:e D6:e')
    gl.line(76, 'r:q. D6:e B5:e G5:e')

    # ---------------------------------------------------------------- vamp (77-84) back to the top
    arp(gt, 77, 85, '0 1 2 3 2 1', step=0.5, n=4, low=P('D3'), high=P('D5'), length=1.0)
    bassline(pz, 77, 85, 'R:q. 5:q.', octave=2)
    mb.line(83, 'r:q. A4:e C5:e E5:e | D5:q. r:q.')
    mb.dyn(83, 'p')
    cl.line(84, 'r:q. D4:e E4:e F#4:e')
    cl.dyn(84, 'mf')
    gt.dyn(77, 'mp')
    return S
