"""Baldino's Workshop — the Esmer inventor's house on Zeelich.

Motion, invention, gentle musical humour: a staccato clarinet/bassoon tune built from broken chords, a
woodblock tick-tock, pizzicato, xylophone, a few beeps from a gadget. In the middle the Adventure theme
passes through warmly (Baldino is on Twinsen's side).

  intro   1-2   tick-tock and pizzicato
  A       3-10  clarinet: the workshop tune
  A2     11-18  xylophone + bassoon an octave apart, varied answer
  B      19-26  G minor "gizmo": bassoon stop-start figures, a chromatic slide, flute peeps, gadget beeps
  C      27-34  the Adventure theme in Bb on flute and violins, harp, horn (tick-tock rests)
  D      35-42  call and response between clarinet and bassoon, then together in arpeggios
  A'     43-50  tutti-light reprise: flute + xylophone on top
  coda   51-56  the clockwork runs down (note values double each bar), loops to bar 3
"""
from score import Song, P, pad, arp, bassline, hit
from themes import ADV_A, ADV_B, shift

WS_A1 = "F4:e! Bb4:e! D5:e! F5:e! Eb5:q D5:q | C5:e! A4:e! F4:e! A4:e! C5:h | D5:e! Bb4:e! G4:e! Bb4:e! Eb5:q D5:q | C5:q. D5:e C5:q r:q"
WS_A2 = "F4:e! Bb4:e! D5:e! F5:e! G5:q F5:q | Eb5:e! C5:e! A4:e! C5:e! Eb5:h | D5:e! F5:e! Bb5:e! F5:e! D5:q C5:q | Bb4:h. r:q"
WS_CH = 'Bb | F/A | Gm Eb | F7 | Bb | F7 | Bb | Bb'


def song():
    S = Song('workshop', 500000, title="Baldino's Workshop", role="Baldino's workshop (Zeelich)")
    S.intro_bars, S.body_bars = 2, 54
    S.mix = {'room': {'rt60': 1.3, 'predelay': 0.01, 'bright': 0.55}, 'wet': {'front': 0.18, 'mid': 0.22, 'back': 0.3},
             'lufs': -17.0}
    S.chords(1, 'Bb | F7')
    S.chords(3, WS_CH)
    S.chords(11, WS_CH)
    S.chords(19, 'Gm | D7 | Gm | D7 | Eb | Bb/D | Cm7 | F7')
    S.chords(27, 'Bb | F/A Gm | F | Bb | Bb Eb | Gm | Cm7 F7 | Bb')
    S.chords(35, 'Bb | Bb | Eb | Eb | C7 | F7 | Bb/F F7 | Bb')
    S.chords(43, WS_CH)
    S.chords(51, 'Bb | F7 | Bb | F7 | Bb | Bb')

    cl = S.part('clarinet', 'clarinet', stem='front', pan=52, vol=96, dyn='mf')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=74, vol=100, dyn='mf')
    fl = S.part('flute', 'flute', stem='front', pan=36, vol=88, legato=True, dyn='mf')
    xy = S.part('xylophone', 'xylo', stem='mid', pan=84, vol=76, dyn='mf')
    pz = S.part('pizz', 'pizz', stem='mid', pan=62, vol=96, dyn='mf')
    vn = S.part('violins', 'strings', stem='mid', pan=30, vol=90, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=70, vol=78, dyn='p')
    hp = S.part('harp', 'harp', stem='mid', pan=24, vol=88, dyn='mp')
    hn = S.part('horn', 'horn', stem='back', pan=46, vol=90, legato=True, dyn='mp')
    ce = S.part('celesta', 'celesta', stem='front', pan=96, vol=74, dyn='mp')
    bz = S.part('gadget', 'sine', stem='front', pan=100, vol=52, dyn='mp')
    dr = S.part('perc', 'drums', stem='back', pan=56, vol=78, dyn='mp')

    def ticktock(b0, b1, v=46):
        for b in range(b0, b1):
            for k in range(4):
                hit(dr, b, 'wb_hi' if k % 2 == 0 else 'wb_lo', k, vel=v + (6 if k == 0 else 0), dur=0.25)

    def pizz(b0, b1):
        bassline(pz, b0, b1, 'R:q r:q 5:q r:q', octave=2)

    ticktock(1, 3, 40)
    pizz(1, 3)

    # A
    ticktock(3, 11)
    pizz(3, 11)
    cl.line(3, WS_A1 + ' | ' + WS_A2)
    cl.dyn(3, 'mf')

    # A2: xylophone + bassoon
    ticktock(11, 19)
    pizz(11, 19)
    xy.line(11, WS_A1 + ' | ' + WS_A2, octave=1)
    xy.dyn(11, 'mp')
    bn.line(11, WS_A1 + ' | ' + WS_A2, octave=-1)
    bn.dyn(11, 'mf')
    pad(st, 11, 19, n=3, low=P('D4'), high=P('D5'))

    # B: G minor gizmo
    ticktock(19, 27, 40)
    bn.line(19, 'G2:e! r:e Bb2:e! r:e D3:e! r:e G3:q | F#3:e! r:e A3:e! r:e C4:e! r:e D4:q |'
                'Bb3:e! A3:e! Bb3:e! A3:e! Bb3:e! r:e G3:q | A3:e G#3:e G3:e F#3:e F3:e E3:e D3:q |'
                'Eb3:e! r:e G3:e! r:e Bb3:e! r:e Eb4:q | D4:e! r:e F3:e! r:e Bb3:e! r:e D4:q |'
                'C4:e! Bb3:e! G3:e! Eb3:e! C3:q r:q | F2:q! r:q r:e A2:e! C3:e! Eb3:e!')
    bn.dyn(19, 'mf')
    fl.line(19, 'r:h r:q D6:e! r:e | r:h r:q C6:e! r:e | r:h. Bb5:s C6:s Bb5:e | A5:q! r:h. |'
                'r:h r:q Bb5:e! r:e | r:h r:q F6:e! r:e | r:h. G5:e! Eb5:e! | F5:q! r:h.', legato=False)
    fl.dyn(19, 'mp')
    for b in (19, 21, 23, 25):
        xy.note(S.pos(b), P('G5') if b < 23 else P('Bb5'), 0.5, 54)
    bz.line(20, 'r:h. A6:s r:s A6:s r:s')
    bz.line(22, 'r:h. D7:s r:s A6:s r:s')
    bz.line(26, 'r:h r:q F6:s A6:s C7:s r:s')
    bz.dyn(20, 'p')
    pz.line(19, 'G2:q r:h. | D2:q r:h. | G2:q r:h. | D2:q r:h. | Eb2:q r:h. | D2:q r:h. | C2:q r:h. | F2:q r:h.')

    # C: Adventure theme in Bb
    vn.line(27, shift(ADV_A + ' | ' + ADV_B, -4))
    vn.dyn(27, 'mp')
    vn.hairpin(31, 34, 'mp', 'mf')
    fl.line(27, shift(ADV_A + ' | ' + ADV_B, 8))
    fl.dyn(27, 'mp')
    pad(hn, 27, 35, n=2, low=P('D4'), high=P('Bb4'))
    hn.dyn(27, 'p')
    arp(hp, 27, 35, '0 1 2 3 2 1 2 3', step=0.5, n=4, low=P('Bb2'), high=P('Bb4'), length=1.4)
    hp.dyn(27, 'mp')
    bn.line(27, 'Bb2:w | A2:h G2:h | F2:w | Bb2:w | Bb2:h Eb3:h | G2:w | C3:h F2:h | Bb2:w')
    bn.dyn(27, 'mp')

    # D: call and response
    ticktock(35, 43)
    cl.line(35, 'F5:e! D5:e! Bb4:e! D5:e! r:h | F5:e! G5:e! F5:e! D5:e! r:h | G5:e! Eb5:e! Bb4:e! Eb5:e! r:h | G5:e! Ab5:e! G5:e! Eb5:e! r:h |'
                'E5:e! G5:e! Bb5:e! G5:e! E5:e! G5:e! Bb5:e! G5:e! | A5:e! C6:e! Eb6:e! C6:e! A5:e! F5:e! Eb5:e! C5:e! |'
                'D5:q Bb4:q C5:q A4:q | Bb4:q! r:q r:h')
    cl.dyn(35, 'mf')
    bn.line(35, 'r:h F3:e! D3:e! Bb2:e! D3:e! | r:h F3:e! G3:e! F3:e! D3:e! | r:h G3:e! Eb3:e! Bb2:e! Eb3:e! | r:h G3:e! Ab3:e! G3:e! Eb3:e! |'
                'C3:e! E3:e! G3:e! E3:e! C3:e! E3:e! G3:e! E3:e! | F2:e! A2:e! C3:e! A2:e! F2:e! A2:e! C3:e! Eb3:e! |'
                'F2:q D3:q F2:q Eb3:q | Bb2:q! r:q r:h')
    bn.dyn(35, 'mf')
    xy.line(42, 'r:q Bb4:s D5:s F5:s Bb5:s D6:q! r:q')
    xy.dyn(42, 'mf')

    # A': reprise
    ticktock(43, 51)
    pizz(43, 51)
    fl.line(43, WS_A1 + ' | ' + WS_A2, octave=1, legato=False)
    fl.dyn(43, 'mf')
    xy.line(43, WS_A1 + ' | ' + WS_A2, octave=1)
    xy.dyn(43, 'mp')
    cl.line(43, WS_A1 + ' | ' + WS_A2)
    cl.dyn(43, 'mf')
    bn.line(43, WS_A1 + ' | ' + WS_A2, octave=-1)
    bn.dyn(43, 'mp')
    pad(st, 43, 51, n=3, low=P('D4'), high=P('D5'))
    st.dyn(43, 'p')
    ce.line(46, 'r:h. F6:q')
    ce.line(50, 'r:h. Bb6:q')

    # coda: the clockwork runs down
    xy.line(51, 'F5:e Bb5:e D6:e F6:e r:h | C6:q A5:q F5:q r:q | D6:h Bb5:h | C6:w | r:w | r:w')
    xy.dyn(51, 'mp')
    hit(dr, 51, 'wb_hi', 0, vel=44); hit(dr, 51, 'wb_lo', 1, vel=40); hit(dr, 51, 'wb_hi', 2, vel=40); hit(dr, 51, 'wb_lo', 3, vel=38)
    hit(dr, 52, 'wb_hi', 0, vel=40); hit(dr, 52, 'wb_lo', 2, vel=36)
    hit(dr, 53, 'wb_hi', 0, vel=36); hit(dr, 53, 'wb_lo', 2.5, vel=32)
    hit(dr, 54, 'wb_hi', 0, vel=34)
    hit(dr, 55, 'wb_lo', 0, vel=30)
    pz.line(51, 'Bb2:q r:h. | F2:q r:h. | Bb2:h r:h | F2:w | Bb1:w | r:w')
    bz.line(55, 'r:h. Bb6:s F6:s Bb5:e')
    bz.dyn(55, 'pp')
    return S
