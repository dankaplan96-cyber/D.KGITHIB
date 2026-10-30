"""Home — Twinsen's house (also the lighthouse lamp room with Zoe).

Calm and warm, few instruments: the Home theme itself, in F major 3/4.

  intro   1-2   guitar alone
  A       3-10  clarinet: the theme (A + A2); guitar, cello roots
  A'     11-18  the cello takes the tune an octave lower, the flute holds a high descant
  B      19-26  flute: the D-minor bridge (B + B2); soft strings, celesta bells at phrase ends
  A''    27-34  clarinet + flute in thirds/sixths, a walking cello line
  C      35-42  interlude: the motif in quick notes on celesta (Arthur's toy-box), low clarinet
  A'''   43-50  violins with the theme, warm but quiet, cello countermelody
  coda   51-54  a closing tag on the clarinet, guitar alone again (loops to bar 3)
"""
from score import Song, P, pad, arp, bassline
from themes import HOME_A, HOME_A2, HOME_B, HOME_B2, HOME_CHORDS_A, HOME_CHORDS_A2, HOME_CHORDS_B, HOME_CHORDS_B2


def song():
    S = Song('home', 716000, meter=(3, 4), title='Home', role="Twinsen's house")
    S.intro_bars, S.body_bars = 2, 52
    S.mix = {'room': {'rt60': 1.5, 'predelay': 0.012, 'bright': 0.45}, 'wet': {'front': 0.2, 'mid': 0.24, 'back': 0.3},
             'lufs': -18.0}
    A_CH = HOME_CHORDS_A + ' | ' + HOME_CHORDS_A2
    S.chords(1, 'F | Bb/F')
    S.chords(3, A_CH)
    S.chords(11, A_CH)
    S.chords(19, HOME_CHORDS_B + ' | ' + HOME_CHORDS_B2)
    S.chords(27, A_CH)
    S.chords(35, 'Bb | F/A | Gm7 | C7 | Bb | F/A | Gm7 | C7sus4 C7')
    S.chords(43, A_CH)
    S.chords(51, 'Dm7 | Gm7 C7 | F | Bb/F')

    cl = S.part('clarinet', 'clarinet', stem='front', pan=56, vol=96, legato=True, dyn='mp')
    fl = S.part('flute', 'flute', stem='front', pan=74, vol=88, legato=True, dyn='p')
    gt = S.part('guitar', 'nylon', stem='mid', pan=40, vol=96, dyn='mp')
    vc = S.part('cello', 'cello', stem='mid', pan=82, vol=94, legato=True, dyn='p')
    vn = S.part('violins', 'strings', stem='mid', pan=32, vol=92, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=64, vol=80, dyn='pp')
    ce = S.part('celesta', 'celesta', stem='front', pan=22, vol=84, dyn='mp')
    cb = S.part('bass', 'contrabass', stem='mid', pan=90, vol=84, dyn='pp')

    GT = '0 1 2 3 2 1'
    for b0, b1 in ((1, 3), (3, 11), (11, 19), (19, 27), (27, 35), (35, 43), (43, 51), (51, 55)):
        arp(gt, b0, b1, GT, step=0.5, n=4, low=P('C3'), high=P('C5'), length=1.2)
    gt.dyn(19, 'p')
    gt.dyn(27, 'mp')
    gt.dyn(35, 'p')
    gt.dyn(43, 'mp')
    gt.dyn(51, 'p')

    # A: clarinet
    cl.line(3, HOME_A + ' | ' + HOME_A2)
    cl.hairpin(5, 7, 'mp', 'mf')
    cl.dyn(7, 'mp')
    bassline(cb, 3, 11, 'R:h.', octave=2)

    # A': cello tune, flute descant
    vc.line(11, HOME_A + ' | ' + HOME_A2, octave=-1)
    vc.dyn(11, 'mp')
    vc.hairpin(13, 15, 'mp', 'mf')
    vc.dyn(15, 'mp')
    fl.line(11, 'C6:h. | D6:h. | D6:h Bb5:q | C6:h. | C6:h. | A5:h. | Bb5:h E5:q | F5:h.')
    fl.dyn(11, 'p')

    # B: flute bridge, soft strings
    fl.line(19, HOME_B + ' | ' + HOME_B2)
    fl.dyn(19, 'mp')
    fl.hairpin(20, 22, 'mp', 'mf')
    fl.hairpin(25, 27, 'mf', 'mp')
    pad(st, 19, 27, n=3, low=P('D4'), high=P('D5'))
    st.hairpin(19, 23, 'pp', 'p')
    bassline(cb, 19, 27, 'R:h.', octave=2)
    cb.dyn(19, 'pp')
    ce.line(22, 'r:h C#6:q')
    ce.line(26, 'r:h E6:q')
    ce.dyn(22, 'p')

    # A'': clarinet + flute in thirds, walking cello
    cl.line(27, HOME_A + ' | ' + HOME_A2)
    cl.dyn(27, 'mp')
    fl.line(27, 'C5:q. Bb4:e A4:q | F5:h. | D5:q. C5:e Bb4:q | F5:q. E5:q. | C5:q. Bb4:e A4:q | A5:h G5:q | F5:q. E5:e Bb4:q | A4:h.')
    fl.dyn(27, 'mp')
    vc.line(27, 'F2:h. | D3:h. | G2:h. | C3:h. | A2:h. | D3:h. | G2:q. C3:q. | F2:h.')
    vc.dyn(27, 'mp')

    # C: interlude — the motif in quick notes on celesta
    ce.line(35, 'D6:e C6:e Bb5:e F6:e D6:q | C6:q. A5:e F5:q | Bb5:e A5:e G5:e D6:e Bb5:q | C6:h. |'
                'D6:e C6:e Bb5:e F6:e D6:q | C6:q A5:q C6:q | Bb5:q. A5:e G5:q | F5:h E5:q')
    ce.dyn(35, 'mp')
    cl.line(35, 'D4:h. | C4:h. | Bb3:h. | Bb3:h. | D4:h. | C4:h. | D4:h. | C4:h Bb3:q')
    cl.dyn(35, 'p')
    bassline(cb, 35, 43, 'R:h.', octave=2)
    cb.dyn(35, 'pp')

    # A''': violins, cello countermelody
    vn.line(43, HOME_A + ' | ' + HOME_A2)
    vn.dyn(43, 'mp')
    vn.hairpin(45, 47, 'mp', 'mf')
    vn.hairpin(48, 51, 'mf', 'mp')
    vc.line(43, 'C3:h. | D3:h F3:q | Bb2:h. | C3:h E3:q | F3:h. | F3:h E3:q | D3:q. C3:q. | F2:h.')
    vc.dyn(43, 'mp')
    pad(st, 43, 51, n=3, low=P('C4'), high=P('C5'))
    st.dyn(43, 'pp')
    bassline(cb, 43, 51, 'R:h.', octave=2)
    cb.dyn(43, 'p')

    # coda
    cl.line(51, 'D5:q. C5:e A4:q | Bb4:q. A4:e G4:q | F4:h. ')
    cl.dyn(51, 'mp')
    cl.hairpin(52, 54, 'mp', 'p')
    bassline(cb, 51, 55, 'R:h.', octave=2)
    cb.dyn(51, 'pp')
    return S
