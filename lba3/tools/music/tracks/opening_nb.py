"""Opening, the notebook cut (LBA3-RUN; switchable, ?opening=notebook: src/game/story/opening.js) — one-shot, ~94 s with its tail.

Written to the scene's clock: the cue starts 0.6 s into the scene, with the first page of Twinsen's notebook, and each
section's tempo is set so its first bar lands on its shot. Scene time = 0.6 s + cue time.

  A   1-8    the notebook (cue 0-17.0 s)  harp and a pad; the flute alone with the Adventure head as Twinsen stands up
                                         to FunFrock (bar 3); Dm7 for the storm (bar 5); the oboe for the children
                                         brought home (bar 6); the Home motif on the clarinet as we see his face twelve
                                         years on (bars 7-8)
  G   9-10   the title over the island (17.0-22.0 s)  the Adventure head on horn, the flute answering
  B   11-17  the lift (22.0-38.0 s)      light pizzicato under an oboe line: people at work
  C   18-23  home (38.0-50.0 s)          the Home theme on the clarinet over the guitar (home.py's colour)
  D   24-31  the tap, the exchange (50.0-68.2 s)   almost nothing: guitar, a soft pad, two celesta notes for
                                         Arthur; room for the lines and the sounds of the tap
  E   32-34  "That's warm." (68.2-75.5 s)  the Entity cell, troubled, on celesta over D minor / Bb7, very quiet
  F   35-38  the decision (75.5-85.0 s)  the Home motif on violins, with a purpose
  H   39-40  tail                         F major held, slowing; the game's own Home track follows

(LBA3-RUN: A was the harbour, 5 bars from 2.5 s; the notebook came before it and the title moved from the end — G, after
F — to the island after the notebook. B to F are as they were, a section later; F now runs straight into the tail.)
Nothing loud: the scene is a household problem. No percussion.
"""
from score import Song, P, pad, arp, bassline
from themes import HOME_A, HOME_CHORDS_A


def song():
    S = Song('opening_nb', 708333, meter=(3, 4), title='Opening (notebook cut)', role='New-game opening scene, the notebook cut (one-shot; LBA3-RUN, switchable)')
    S.loop = False
    S.end_bars = 40
    S.tail_sec = 6.0
    # section tempi (quarter-note microseconds) so each section starts on its shot
    S.tempo(1, 708333)    # A: 8 bars of 2.125 s
    S.tempo(9, 833333)    # G: 2 bars of 2.5 s
    S.tempo(11, 762000)   # B: 7 bars of 2.286 s
    S.tempo(18, 667000)   # C: 6 bars of 2.00 s
    S.tempo(24, 758000)   # D: 8 bars of 2.274 s
    S.tempo(32, 811000)   # E: 3 bars of 2.433 s
    S.tempo(35, 792000)   # F: 4 bars of 2.376 s
    S.rit(39, 41, 800000, 1050000)
    S.mix = {'room': {'rt60': 2.0, 'predelay': 0.016, 'bright': 0.5}, 'wet': {'front': 0.24, 'mid': 0.3, 'back': 0.36},
             'lufs': -19.0}

    S.chords(1, 'F | Bb/F | F | C/E | Dm7 | Bb | F | Gm7 C7')
    S.chords(9, 'F | C/E')
    S.chords(11, 'Bb | F/A | Gm7 | C | Dm | Bb | Csus4 C')
    S.chords(18, HOME_CHORDS_A + ' | F | Dm7')
    S.chords(24, 'Bb | Gm7 | F/A | Bb | Gm7 | C7sus4 | F | F')
    S.chords(32, 'Dm6 | Bb7 | Bb7')
    S.chords(35, 'F/C | Bb | Gm7 | C7')
    S.chords(39, 'F | F')

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

    # A — the notebook (bars 1-5 are the old harbour section's, over the first spread and the storm)
    arp(hp, 1, 9, '0 1 2 3 2 1', step=0.5, n=4, low=P('F3'), high=P('F5'), length=1.6)
    hp.hairpin(1, 3, 'pp', 'p')
    pad(st, 2, 9, n=3, low=P('A3'), high=P('C5'))
    st.hairpin(2, 4, 'ppp', 'pp')
    bassline(cb, 1, 9, 'R:h.', octave=2)
    fl.line(3, 'F5:q. C5:e F5:q | A5:h G5:q | F5:q. E5:e C5:q')
    fl.hairpin(3, 5, 'p', 'mp')
    fl.dyn(5, 'p')
    vc.line(5, 'D3:h.')                       # the storm: the cello under Dm7
    vc.dyn(5, 'pp')
    ob.line(6, 'D5:q. C5:e Bb4:q')            # the children brought home
    ob.dyn(6, 'p')
    cl.line(7, 'A4:q. G4:e F4:q | D5:h C5:q')  # his face, twelve years on: the Home motif
    cl.dyn(7, 'p')

    # G — the title over the island: a small hopeful phrase
    hn.line(9, 'F4:q. C4:e F4:q | A4:h Bb4:q')
    hn.hairpin(9, 10, 'p', 'mp')
    fl.line(10, 'r:q A5:h')
    fl.dyn(10, 'p')
    pad(st, 9, 11, n=4, low=P('F3'), high=P('F5'))
    st.hairpin(9, 10, 'pp', 'p')
    arp(hp, 9, 11, '0 1 2 3 4 3', step=0.5, n=5, low=P('F3'), high=P('A5'), length=2.0)
    hp.dyn(9, 'p')
    bassline(cb, 9, 11, 'R:h.', octave=2)
    cb.dyn(9, 'p')

    # B — the lift: people at work
    arp(pz, 11, 18, '0 2 1 2 0 2', step=0.5, n=3, low=P('C3'), high=P('C5'), length=0.3)
    pz.hairpin(11, 13, 'pp', 'p')
    ob.line(12, 'C5:q. A4:e F4:q | Bb4:h D5:q | C5:q. E5:e G5:q | F5:h. | D5:q. C5:e Bb4:q | C5:h.')
    ob.hairpin(12, 15, 'p', 'mp')
    ob.dyn(16, 'p')
    vc.line(11, 'Bb2:h. | A2:h. | G2:h. | C3:h. | D3:h. | Bb2:h. | C3:h.')
    vc.dyn(11, 'pp')
    pad(st, 14, 18, n=3, low=P('A3'), high=P('D5'))
    st.dyn(14, 'pp')

    # C — home: the Home theme
    arp(gt, 18, 32, '0 1 2 3 2 1', step=0.5, n=4, low=P('C3'), high=P('C5'), length=1.2)
    gt.dyn(18, 'mp')
    gt.dyn(24, 'p')
    cl.line(18, HOME_A + ' | A4:q. G4:e F4:q | F5:h E5:q')
    cl.dyn(18, 'mp')
    cl.hairpin(20, 22, 'mp', 'mf')
    cl.dyn(22, 'mp')
    bassline(cb, 18, 24, 'R:h.', octave=2)
    cb.dyn(18, 'pp')

    # D — the tap, the exchange: room for the lines
    pad(st, 24, 32, n=3, low=P('A3'), high=P('D5'))
    st.dyn(24, 'ppp')
    vc.line(26, 'G2:h. | F2:h. | Bb2:h. | G2:h. | C3:h. | F2:h.')
    vc.dyn(26, 'pp')
    ce.line(30, 'r:h C6:q | A5:h.')
    ce.dyn(30, 'p')

    # E — "That's warm.": the Entity cell, troubled, barely there
    ce.line(32, 'D5:h A5:q | B5:h G#5:q | F#5:h.')
    ce.dyn(32, 'pp')
    pad(st, 32, 35, n=3, low=P('D3'), high=P('D4'))
    st.hairpin(32, 34, 'ppp', 'pp')
    cb.line(32, 'D2:h. | Bb1:h. | Bb1:h.')
    cb.dyn(32, 'pp')

    # F — the decision: the Home motif with a purpose
    vn.line(35, 'A4:q. G4:e F4:q | D5:h C5:q | Bb4:q. A4:e G4:q | C5:h.')
    vn.hairpin(35, 37, 'p', 'mp')
    bassline(vc, 35, 39, 'R:q 5:q 8:q', octave=2)
    vc.dyn(35, 'p')
    pad(hn, 37, 39, n=2, low=P('F3'), high=P('C4'))
    hn.dyn(37, 'pp')

    # H — tail: F major held, slowing into the game's Home track (Twinsen turns to the cupboard; control)
    pad(st, 39, 41, n=4, low=P('F3'), high=P('F5'))
    st.dyn(39, 'p')
    arp(hp, 39, 41, '0 1 2 3 4 3', step=0.5, n=5, low=P('F3'), high=P('A5'), length=2.0)
    hp.dyn(39, 'p')
    bassline(cb, 39, 41, 'R:h.', octave=2)
    cb.dyn(39, 'p')
    ce.line(39, 'r:h F6:q | C6:h.')
    ce.dyn(39, 'pp')
    st.hairpin(39, 41, 'p', 'ppp')
    hp.hairpin(39, 41, 'p', 'pp')
    return S
