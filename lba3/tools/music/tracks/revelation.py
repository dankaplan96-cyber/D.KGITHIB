"""Revelation — story cue (one-shot, ~75 s): Sendell's call in the well, Zoe finding the evacuation list,
and other moments where the truth about the entity / the project comes out.

Room for emotion, not continuously dense. The Entity theme starts in wonder (celesta, high strings),
turns troubled (oboe over Dm6 / Bb7, low brass), swells to one dissonant peak, breaks off; a clarinet
answers with the Home motif in D minor (what it means for the family); the cell returns on celesta and
the piece ends open on the lydian chord, unresolved.
"""
from score import Song, P, pad, arp, roll, hit


def song():
    S = Song('revelation', 1000000, title='Revelation', role='Story cue (revelations)')
    S.loop = False
    S.end_bars = 18
    S.tempo(1, 1000000)
    S.rit(11, 13, 1000000, 1180000)
    S.tempo(13, 1050000)
    S.rit(17, 19, 1050000, 1300000)
    S.mix = {'room': {'rt60': 3.4, 'predelay': 0.03, 'bright': 0.45}, 'wet': {'front': 0.3, 'mid': 0.36, 'back': 0.46},
             'lufs': -17.5}
    S.chords(1, 'D | E/D | C#m7 | Dmaj7')
    S.chords(5, 'Dm6 | Bb7 | C7/E | Dm')
    S.chords(9, 'Dm6 | Bb7 | Gm6/Bb | Bb7')
    S.chords(13, 'Dm | Gm6 | Dm/F | A7sus4')
    S.chords(17, 'D | E/D')

    ce = S.part('celesta', 'celesta', stem='front', pan=30, vol=86, dyn='mp')
    fl = S.part('flute', 'flute', stem='front', pan=54, vol=88, legato=True, dyn='p')
    ob = S.part('oboe', 'oboe', stem='front', pan=70, vol=90, legato=True, dyn='mp')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=50, vol=92, legato=True, dyn='p')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=96, legato=True, dyn='mp')
    hi = S.part('high strings', 'strings_slow', stem='mid', pan=60, vol=82, dyn='pp')
    lo = S.part('low strings', 'strings_slow', stem='mid', pan=80, vol=92, dyn='pp')
    cb = S.part('basses', 'contrabass', stem='mid', pan=88, vol=92, dyn='pp')
    hp = S.part('harp', 'harp', stem='mid', pan=24, vol=86, dyn='p')
    hn = S.part('horns', 'horn', stem='back', pan=46, vol=92, legato=True, dyn='p')
    tb = S.part('trombones', 'trombone', stem='back', pan=80, vol=90, legato=True, dyn='p')
    ti = S.part('timpani', 'timpani', stem='back', pan=62, vol=94, dyn='p')
    dr = S.part('perc', 'drums', stem='back', pan=60, vol=80, dyn='p')

    # wonder
    ce.line(1, 'D6:h A6:q B6:q | G#6:w')
    pad(hi, 1, 5, n=3, low=P('A4'), high=P('A5'))
    hi.hairpin(1, 3, 'ppp', 'pp')
    arp(hp, 1, 5, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('D3'), high=P('F#5'), length=2.0)
    fl.line(3, 'E5:h B5:q C#6:q | A5:w')
    fl.hairpin(3, 5, 'p', 'mp')
    cb.line(1, 'D2:w | D2:w | C#2:w | D2:w')
    cb.dyn(1, 'ppp')

    # troubled
    ob.line(5, 'D5:h A5:q B5:q | G#5:h. F#5:q | E5:h Bb5:q C6:q | A5:w')
    ob.hairpin(5, 7, 'mp', 'mf')
    ob.hairpin(7, 9, 'mf', 'mp')
    pad(lo, 5, 9, n=3, low=P('D3'), high=P('D4'))
    lo.hairpin(5, 9, 'pp', 'p')
    cb.line(5, 'D2:w | Bb1:w | E2:w | D2:w')
    cb.dyn(5, 'p')
    hn.line(6, 'Ab3+D4:w | G3+Bb3:w | F3+A3:w')
    hn.dyn(6, 'p')

    # the swell to one dissonant peak, then it breaks off
    vn.line(9, 'D5:h A5:q B5:q | G#5:h. F#5:q | E5:h Bb5:q D6:q | Ab5:w')
    vn.hairpin(9, 12, 'mp', 'f')
    vn.hairpin(12, 13, 'f', 'ff')
    tb.line(9, 'D3:w | Bb2:w | Bb2:w | Bb2+Ab3:w')
    tb.hairpin(9, 13, 'p', 'f')
    pad(lo, 9, 13, n=3, low=P('D3'), high=P('D4'))
    lo.hairpin(9, 13, 'p', 'f')
    cb.line(9, 'D2:w | Bb1:w | Bb1:w | Bb1:w')
    cb.hairpin(9, 13, 'p', 'f')
    hn.line(10, 'r:h D4+F4:h | E4+G4:w | E4+G#4:w')
    hn.hairpin(10, 13, 'mp', 'f')
    roll(ti, 11, 'Bb2', 8, 30, 104)
    hit(dr, 12, 'crash2', 0, vel=48, dur=4)

    # silence, then the human answer (Home motif in D minor)
    cb.line(13, 'D2:w | D2:w | D2:w | A1:w')
    cb.dyn(13, 'pp')
    cl.line(13, 'F4:q. E4:e D4:h | Bb4:h. A4:q | G4:q. F4:e E4:h | E4:w')
    cl.dyn(13, 'mp')
    cl.hairpin(15, 17, 'mp', 'p')
    pad(lo, 14, 17, n=3, low=P('D3'), high=P('D4'))
    lo.dyn(14, 'pp')

    # the cell again, open ending
    ce.line(17, 'D6:h A6:q B6:q | G#6:w')
    ce.dyn(17, 'mp')
    pad(hi, 17, 19, n=3, low=P('A4'), high=P('A5'))
    hi.hairpin(17, 19, 'pp', 'ppp')
    cb.line(17, 'D2:w | D2:w')
    arp(hp, 18, 19, '0 1 2 3 4 r r r', step=0.5, n=5, low=P('D3'), high=P('F#5'), length=4.0)
    return S
