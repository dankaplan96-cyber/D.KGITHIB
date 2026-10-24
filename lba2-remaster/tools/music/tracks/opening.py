"""Opening — the new-game scene (src/game/story/opening.js), one-shot, ~86 s, F major 3/4.

Written to the scene's clock: the cue starts 2.5 s into the scene (after a moment of harbour sound), and each
section's tempo is set so its first bar lands on its shot. Scene time = 2.5 s + cue time.

  A   1-5    harbour (cue 0-10.5 s)      harp, a pad; the flute alone with the Adventure head, softly, in F
  B   6-12   the lift (10.5-26.5 s)      light pizzicato under an oboe line: people at work
  C   13-18  home (26.5-38.5 s)          the Home theme on the clarinet over the guitar (home.py's colour)
  D   19-26  the tap, the exchange (38.5-56.7 s)   almost nothing: guitar, a soft pad, two celesta notes for
                                         Arthur; room for the lines and the sounds of the tap
  E   27-29  "That's warm." (56.7-64 s)  the Entity cell, troubled, on celesta over D minor / Bb7, very quiet
  F   30-33  the decision (64-73.5 s)    the Home motif on violins, with a purpose
  G   34-36  the title (73.5-80.5 s)     a small hopeful phrase: the Adventure head on horn and flute
  H   37-38  tail                         F major held, slowing; the game's own Home track follows

Nothing loud: the scene is a household problem. No percussion.
"""
from score import Song, P, pad, arp, bassline
from themes import HOME_A, HOME_CHORDS_A


def song():
    S = Song('opening', 700000, meter=(3, 4), title='Opening', role='New-game opening scene (one-shot)')
    S.loop = False
    S.end_bars = 38
    S.tail_sec = 6.0
    # section tempi (quarter-note microseconds) so each section starts on its shot
    S.tempo(1, 700000)    # A: 5 bars of 2.10 s
    S.tempo(6, 762000)    # B: 7 bars of 2.286 s
    S.tempo(13, 667000)   # C: 6 bars of 2.00 s
    S.tempo(19, 758000)   # D: 8 bars of 2.274 s
    S.tempo(27, 811000)   # E: 3 bars of 2.433 s
    S.tempo(30, 792000)   # F: 4 bars of 2.376 s
    S.tempo(34, 778000)   # G: 3 bars of 2.334 s
    S.rit(37, 39, 800000, 1050000)
    S.mix = {'room': {'rt60': 2.0, 'predelay': 0.016, 'bright': 0.5}, 'wet': {'front': 0.24, 'mid': 0.3, 'back': 0.36},
             'lufs': -19.0}

    S.chords(1, 'F | Bb/F | F | C/E | Dm7')
    S.chords(6, 'Bb | F/A | Gm7 | C | Dm | Bb | Csus4 C')
    S.chords(13, HOME_CHORDS_A + ' | F | Dm7')
    S.chords(19, 'Bb | Gm7 | F/A | Bb | Gm7 | C7sus4 | F | F')
    S.chords(27, 'Dm6 | Bb7 | Bb7')
    S.chords(30, 'F/C | Bb | Gm7 | C7')
    S.chords(34, 'F | Bb/D | C/E C')
    S.chords(37, 'F | F')

    fl = S.part('flute', 'flute', stem='front', pan=70, vol=86, legato=True, dyn='p')
    ob = S.part('oboe', 'oboe', stem='front', pan=58, vol=84, legato=True, dyn='p')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=54, vol=94, legato=True, dyn='mp')
    hn = S.part('horn', 'horn', stem='back', pan=46, vol=88, legato=True, dyn='p')
    hp = S.part('harp', 'harp', stem='mid', pan=26, vol=84, dyn='p')
    gt = S.part('guitar', 'nylon', stem='mid', pan=40, vol=92, dyn='p')
    pz = S.part('pizz', 'pizz', stem='mid', pan=36, vol=82, dyn='p')
    ce = S.part('celesta', 'celesta', stem='front', pan=24, vol=82, dyn='p')
    vn = S.part('violins', 'strings', stem='mid', pan=32, vol=88, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=64, vol=78, dyn='pp')
    vc = S.part('cello', 'cello', stem='mid', pan=82, vol=88, legato=True, dyn='p')
    cb = S.part('bass', 'contrabass', stem='mid', pan=90, vol=80, dyn='pp')

    # A — the harbour
    arp(hp, 1, 6, '0 1 2 3 2 1', step=0.5, n=4, low=P('F3'), high=P('F5'), length=1.6)
    hp.hairpin(1, 3, 'pp', 'p')
    pad(st, 2, 6, n=3, low=P('A3'), high=P('C5'))
    st.hairpin(2, 4, 'ppp', 'pp')
    bassline(cb, 1, 6, 'R:h.', octave=2)
    fl.line(3, 'F5:q. C5:e F5:q | A5:h G5:q | F5:q. E5:e C5:q')
    fl.hairpin(3, 5, 'p', 'mp')
    fl.dyn(5, 'p')

    # B — the lift: people at work
    arp(pz, 6, 13, '0 2 1 2 0 2', step=0.5, n=3, low=P('C3'), high=P('C5'), length=0.3)
    pz.hairpin(6, 8, 'pp', 'p')
    ob.line(7, 'C5:q. A4:e F4:q | Bb4:h D5:q | C5:q. E5:e G5:q | F5:h. | D5:q. C5:e Bb4:q | C5:h.')
    ob.hairpin(7, 10, 'p', 'mp')
    ob.dyn(11, 'p')
    vc.line(6, 'Bb2:h. | A2:h. | G2:h. | C3:h. | D3:h. | Bb2:h. | C3:h.')
    vc.dyn(6, 'pp')
    pad(st, 9, 13, n=3, low=P('A3'), high=P('D5'))

    # C — home: the Home theme
    arp(gt, 13, 27, '0 1 2 3 2 1', step=0.5, n=4, low=P('C3'), high=P('C5'), length=1.2)
    gt.dyn(13, 'mp')
    gt.dyn(19, 'p')
    cl.line(13, HOME_A + ' | A4:q. G4:e F4:q | F5:h E5:q')
    cl.hairpin(15, 17, 'mp', 'mf')
    cl.dyn(17, 'mp')
    bassline(cb, 13, 19, 'R:h.', octave=2)
    cb.dyn(13, 'pp')

    # D — the tap, the exchange: room for the lines
    pad(st, 19, 27, n=3, low=P('A3'), high=P('D5'))
    st.dyn(19, 'ppp')
    vc.line(21, 'G2:h. | F2:h. | Bb2:h. | G2:h. | C3:h. | F2:h.')
    vc.dyn(21, 'pp')
    ce.line(25, 'r:h C6:q | A5:h.')
    ce.dyn(25, 'p')

    # E — "That's warm.": the Entity cell, troubled, barely there
    ce.line(27, 'D5:h A5:q | B5:h G#5:q | F#5:h.')
    ce.dyn(27, 'pp')
    pad(st, 27, 30, n=3, low=P('D3'), high=P('D4'))
    st.hairpin(27, 29, 'ppp', 'pp')
    cb.line(27, 'D2:h. | Bb1:h. | Bb1:h.')
    cb.dyn(27, 'pp')

    # F — the decision: the Home motif with a purpose
    vn.line(30, 'A4:q. G4:e F4:q | D5:h C5:q | Bb4:q. A4:e G4:q | C5:h.')
    vn.hairpin(30, 32, 'p', 'mp')
    bassline(vc, 30, 34, 'R:q 5:q 8:q', octave=2)
    vc.dyn(30, 'p')
    pad(hn, 32, 34, n=2, low=P('F3'), high=P('C4'))
    hn.dyn(32, 'pp')

    # G — the title: a small hopeful phrase
    hn.line(34, 'F4:q. C4:e F4:q | A4:h Bb4:q | C5:h. ')
    hn.hairpin(34, 36, 'p', 'mp')
    fl.line(35, 'r:q A5:h | G5:q. A5:e Bb5:q')
    fl.dyn(35, 'p')
    pad(st, 34, 39, n=4, low=P('F3'), high=P('F5'))
    st.hairpin(34, 36, 'pp', 'p')
    arp(hp, 34, 39, '0 1 2 3 4 3', step=0.5, n=5, low=P('F3'), high=P('A5'), length=2.0)
    hp.dyn(34, 'p')
    bassline(cb, 34, 39, 'R:h.', octave=2)
    cb.dyn(34, 'p')

    # H — tail: F major held, slowing into the game's Home track
    ce.line(37, 'r:h F6:q | C6:h.')
    ce.dyn(37, 'pp')
    st.hairpin(37, 39, 'p', 'ppp')
    hp.hairpin(37, 39, 'p', 'pp')
    return S
