"""Homecoming / Credits — the ending screens (chapter ends, epilogue, credits).

Emotional resolution, in F major 3/4 like Home. The three themes come back changed:
the Entity cell is resolved (the raised fourth B finally rises to C), the Home theme gets the full
orchestra, and the Adventure theme returns as a broad waltz.

  intro   1-4   celesta + harp: the Entity cell resolved
  A       5-20  violins: the Home theme in full (A, A2, the D-minor bridge B, B2); horn countermelody
  B      21-36  the Adventure theme as a waltz in F: horns + violins, light timpani and triangle
  C      37-52  the Entity theme resolved — flute and strings softly, then broad (horns, celli, violins)
  D      53-68  the Home theme intimate again (clarinet + harp), flute bridge, the resolved cell as a
                tail; loops to bar 5
"""
from score import Song, P, pad, arp, bassline, roll, hit
from themes import HOME_A, HOME_A2, HOME_B, HOME_B2, HOME_CHORDS_A, HOME_CHORDS_A2, HOME_CHORDS_B, HOME_CHORDS_B2

ADV_WALTZ = ("F5:q. C5:e F5:q | A5:h. | G5:q. F5:e E5:q | D5:h. | E5:q. F5:e G5:q | C6:h. | A5:h. | r:h C5:q |"
             "F5:q. C5:e F5:q | Bb5:h. | A5:q. G5:e F5:q | E5:q D5:h | Bb5:q. A5:e G5:q | C6:h. | A5:q. G5:e F5:q | F5:h.")
ADV_WALTZ_CH = 'F | F | C/E | Dm | C | C | F | F | F | Bb | Dm | Dm | Gm7 | C7 | F | F'
CELL = 'F5:h C6:q | D6:q B5:h | C6:h. | E5:h. | A5:h F5:q | G5:q D5:h | D5:h F5:q | E5:h.'


def song():
    S = Song('homecoming', 788000, meter=(3, 4), title='Homecoming', role='Ending screens / credits')
    S.intro_bars, S.body_bars = 4, 64
    S.mix = {'room': {'rt60': 2.6, 'predelay': 0.024, 'bright': 0.5}, 'wet': {'front': 0.24, 'mid': 0.32, 'back': 0.44},
             'lufs': -17.0}
    S.chords(1, 'F | G/F | F | C7sus4')
    S.chords(5, ' | '.join([HOME_CHORDS_A, HOME_CHORDS_A2, HOME_CHORDS_B, HOME_CHORDS_B2]))
    S.chords(21, ADV_WALTZ_CH)
    S.chords(37, 'F | G/F | F | Am7 | Dm7 | Gm7 | Bb | C7')
    S.chords(45, 'F | G/F | F | Am7 | Dm7 | Gm7 | Bb | C7sus4 C7')
    S.chords(53, HOME_CHORDS_A + ' | ' + HOME_CHORDS_A2)
    S.chords(61, HOME_CHORDS_B2)
    S.chords(65, 'F | G/F | F | C7sus4')

    ce = S.part('celesta', 'celesta', stem='front', pan=26, vol=84, dyn='mp')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=56, vol=94, legato=True, dyn='mp')
    fl = S.part('flute', 'flute', stem='front', pan=70, vol=88, legato=True, dyn='mp')
    hn = S.part('horns', 'horn', stem='mid', pan=44, vol=98, legato=True, dyn='mp')
    v1 = S.part('violins', 'strings', stem='mid', pan=34, vol=102, legato=True, dyn='mf')
    st = S.part('strings', 'strings_slow', stem='mid', pan=66, vol=84, dyn='p')
    vc = S.part('celli', 'cello', stem='mid', pan=80, vol=96, legato=True, dyn='mp')
    cb = S.part('basses', 'contrabass', stem='mid', pan=90, vol=90, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=22, vol=92, dyn='mp')
    ti = S.part('timpani', 'timpani', stem='back', pan=60, vol=92, dyn='mp')
    dr = S.part('perc', 'drums', stem='back', pan=64, vol=80, dyn='mp')

    HARP = '0 1 2 3 4 3'

    # intro: the cell resolved
    ce.line(1, 'F5:h C6:q | D6:q B5:h | C6:h. | r:h. ')
    arp(hp, 1, 5, HARP, step=0.5, n=5, low=P('F2'), high=P('C5'), length=1.6)
    hp.dyn(1, 'p')
    pad(st, 1, 5, n=3, low=P('A3'), high=P('A4'))
    st.hairpin(1, 5, 'pp', 'p')

    # A: the Home theme in full
    v1.line(5, ' | '.join([HOME_A, HOME_A2, HOME_B, HOME_B2]))
    v1.dyn(5, 'mp')
    v1.hairpin(7, 9, 'mp', 'mf')
    v1.hairpin(13, 15, 'mf', 'f')
    v1.hairpin(17, 21, 'f', 'mf')
    hn.line(5, 'C4:h. | D4:h. | D4:h F4:q | F4:q. E4:q. | C4:h. | C4:h. | D4:q. E4:q. | F4:h. |'
               'F4:h. | E4:h. | D4:h. | C#4:h. | D4:h. | C4:h. | Bb3:h D4:q | F4:q. E4:q.')
    hn.dyn(5, 'mp')
    arp(hp, 5, 21, HARP, step=0.5, n=5, low=P('F2'), high=P('C5'), length=1.6)
    hp.dyn(5, 'mp')
    bassline(vc, 5, 21, 'R:h.', octave=2)
    vc.dyn(5, 'mp')
    bassline(cb, 5, 21, 'R:h.', octave=1)
    pad(st, 13, 21, n=3, low=P('D4'), high=P('D5'))
    st.dyn(13, 'p')

    # B: the Adventure waltz
    hn.line(21, ADV_WALTZ, octave=-1)
    hn.dyn(21, 'f')
    v1.line(21, ADV_WALTZ)
    v1.dyn(21, 'f')
    arp(st, 21, 37, 'r 1 2 r 1 2', step=0.5, n=3, low=P('A3'), high=P('A4'), length=0.45)
    st.dyn(21, 'mf')
    bassline(vc, 21, 37, 'R:q r:q r:q', octave=2)
    vc.dyn(21, 'mf')
    bassline(cb, 21, 37, 'R:q r:h', octave=1)
    cb.dyn(21, 'mf')
    fl.line(29, 'r:h. | D6:h. | C6:h. | A5:h. | D6:h. | E6:h. | C6:h. | A5:h. ')
    fl.dyn(29, 'mp')
    for b in (21, 25, 29, 33):
        hit(dr, b, 'tri', 0, vel=48)
    ti.line(27, 'F2:q r:h | r:h C2:q')
    ti.line(35, 'F2:q r:q C2:q | F2:q r:h')
    ti.dyn(27, 'mf')

    # C: the Entity theme resolved — soft, then broad
    fl.line(37, CELL)
    fl.dyn(37, 'mp')
    pad(st, 37, 45, n=4, low=P('C4'), high=P('C5'))
    st.dyn(37, 'p')
    arp(hp, 37, 45, HARP, step=0.5, n=5, low=P('F2'), high=P('C5'), length=1.6)
    hp.dyn(37, 'p')
    bassline(cb, 37, 45, 'R:h.', octave=1)
    cb.dyn(37, 'p')
    hn.line(45, CELL, octave=-1)
    hn.dyn(45, 'f')
    vc.line(45, CELL, octave=-2)
    vc.dyn(45, 'f')
    v1.line(45, CELL, octave=1)
    v1.dyn(45, 'f')
    v1.hairpin(51, 53, 'f', 'mp')
    pad(st, 45, 53, n=4, low=P('C4'), high=P('C5'))
    st.dyn(45, 'mf')
    bassline(cb, 45, 53, 'R:h.', octave=1)
    cb.dyn(45, 'mf')
    roll(ti, 45, 'F2', 3, 40, 80)
    hit(dr, 47, 'crash', vel=50, dur=3)

    # D: intimate Home again, the tail
    cl.line(53, HOME_A + ' | ' + HOME_A2)
    cl.dyn(53, 'mp')
    arp(hp, 53, 65, HARP, step=0.5, n=5, low=P('F2'), high=P('C5'), length=1.6)
    hp.dyn(53, 'mp')
    bassline(cb, 53, 65, 'R:h.', octave=2)
    cb.dyn(53, 'p')
    fl.line(61, HOME_B2)
    fl.dyn(61, 'mp')
    pad(st, 57, 65, n=3, low=P('C4'), high=P('C5'))
    st.dyn(57, 'pp')
    ce.line(65, 'F5:h C6:q | D6:q B5:h | C6:h. | r:h. ')
    ce.dyn(65, 'mp')
    arp(hp, 65, 69, HARP, step=0.5, n=5, low=P('F2'), high=P('C5'), length=1.6)
    pad(st, 65, 69, n=3, low=P('A3'), high=P('A4'))
    st.dyn(65, 'p')
    return S
