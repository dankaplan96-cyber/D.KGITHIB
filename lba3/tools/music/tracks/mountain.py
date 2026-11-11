"""Prayer Flags — the Hamalayi: the snow terraces, Lhar under its frozen waterfall, the monastery on the upper terrace,
the observatory on the peak (src/game/hamalayi.js, obsroom.js).

ORDER 25 (REV-HAM-ART). The Hamalayi outdoors and the observatory played The Well, the cave piece, so the high snow
sounded like the caves under Citadel. This is the mountain's own piece: thin cold air, a long view, a village of stone
houses with flags strung from roof to roof, and monks keeping the old monastery.

A slow modal piece in A dorian, 4/4, 72 bpm. A pan flute tune over a low hummed drone and a harp that rings in open
fifths; a temple bell; snow glints on the celesta. The monastery is the same notes heard from C (C lydian, the same
key signature): a plain chant for low voices over a hummed drone, the bell on every other bar, no harp. On the peak the
Entity cell (themes.py ENT_A, up a fifth from its D: A E F# D#) on a solo flute in A lydian, its wonder harmony moved
with it (A, B/A, G#m7, Amaj7) — the shrine where Sendell speaks — then back through E7sus4 to the tune.
No drums but a bell tree and one soft timpani roll; no brass but one horn answering the tune.

  intro  1-4    wind, the hummed drone on A and E, the bell, snow on the celesta
  A      5-12   pan flute: the mountain tune (A dorian), the harp under it, the drone in the bass
  A2    13-20   the tune an octave up, a horn answers it from across the valley; strings below
  B     21-28   the monastery: low chant in C lydian over the drone, the bell; a timpani roll into the peak
  C     29-36   the peak: the Entity cell on the flute in A lydian, glass and harp, a bell tree; E7sus4 leads home
  A'    37-44   the tune on the flute, the harp; thins out to the drone and the bell (loops to bar 5)

Original work for this fan project, written by hand note by note; no melody, recording, MIDI or arrangement of the
Little Big Adventure soundtracks was used or consulted (docs/MUSIC.md).
"""
from score import Song, P, pad, arp, bassline, roll, hit
from themes import ENT_A, shift

TUNE = ('E5:h. D5:e E5:e | A4:q. B4:e C5:q D5:q | E5:h G5:q F#5:q | E5:w |'
        'D5:h. C5:e D5:e | E5:q. D5:e C5:q B4:q | A4:q. B4:e G4:q E4:q | A4:w')


def song():
    S = Song('mountain', 833333, title='Prayer Flags', role='the Hamalayi outdoors, the observatory')
    S.intro_bars, S.body_bars = 4, 40
    S.mix = {'room': {'rt60': 3.6, 'predelay': 0.03, 'bright': 0.42}, 'wet': {'front': 0.32, 'mid': 0.4, 'back': 0.5},
             'lufs': -18.0}

    S.chords(1, 'A5 | G/A | A5 | Em/A')
    S.chords(5, 'Am | Am | Em/G | Am | G | C | Am Em | Am')
    S.chords(13, 'Am | Am C | C | G | Em | Am Em | C G | Am')
    S.chords(21, 'C | D/C | C | D/C | Am7 | Bm7 | Cmaj7 | D')
    S.chords(29, 'A | B/A | G#m7 | Amaj7 | F#m7 | Dmaj7 | Bm7 | E7sus4')
    S.chords(37, 'Am | Am | Em/G | Am | G | C | Am | A5')

    pf = S.part('panflute', 'panflute', stem='front', pan=54, vol=92, legato=True, dyn='mp')
    fl = S.part('flute', 'flute', stem='front', pan=60, vol=88, legato=True, dyn='p')
    hn = S.part('horn', 'horn', stem='back', pan=82, vol=84, legato=True, dyn='p')
    chn = S.part('chant', 'choir', stem='mid', pan=50, vol=86, legato=True, dyn='p')
    hum = S.part('hum', 'oohs', stem='back', pan=64, vol=74, legato=True, dyn='pp')
    bell = S.part('bell', 'tubular', stem='back', pan=40, vol=70, dyn='p')
    cel = S.part('celesta', 'celesta', stem='mid', pan=30, vol=70, dyn='p')
    hp = S.part('harp', 'harp', stem='mid', pan=36, vol=86, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=70, vol=80, legato=True, dyn='pp')
    gl = S.part('glass', 'glass', stem='back', pan=56, vol=60, dyn='pp')
    wind = S.part('wind', 'atmos', stem='back', pan=24, vol=58, dyn='pp')
    cb = S.part('bass', 'contrabass', stem='mid', pan=64, vol=88, legato=True, dyn='pp')
    tp = S.part('timpani', 'timpani', stem='back', pan=60, vol=80, dyn='p')
    dr = S.part('perc', 'drums', stem='back', pan=50, vol=70, dyn='p')

    def ring(b0, b1, vel=0):
        # the harp: open fifths ringing up and back, two notes a beat
        arp(hp, b0, b1, '0 1 2 3 2 1 2 1', step=0.5, n=4, low=P('A3'), high=P('E5'), length=1.3, vel=vel)

    def drone(b0, b1, notes='A2+E3'):
        hum.line(b0, ' | '.join([f'{notes}:w'] * (b1 - b0)))

    # ------------------------------------------------------------ intro (1-4): wind, drone, bell, snow
    pad(wind, 1, 5, n=2, low=P('A3'), high=P('E4'))
    wind.hairpin(1, 3, 'ppp', 'pp')
    drone(1, 5)
    hum.hairpin(1, 3, 'ppp', 'pp')
    hit(bell, 1, 'A4', vel=56, dur=3.5)
    hit(bell, 3, 'E4', vel=50, dur=3.5)
    cel.line(1, 'r:q E6:e r:e r:h | r:h. B5:e r:e | r:q A6:e r:e r:q E6:e r:e | r:w')
    cb.line(3, 'A1:w | A1:w')
    cb.hairpin(3, 5, 'ppp', 'pp')

    # ------------------------------------------------------------ A (5-12): the tune on the pan flute
    pf.line(5, TUNE)
    pf.hairpin(5, 8, 'p', 'mp')
    pf.hairpin(11, 13, 'mp', 'p')
    ring(5, 13)
    hp.dyn(5, 'p')
    bassline(cb, 5, 13, 'R:w', octave=1)
    cb.dyn(5, 'pp')
    drone(5, 9)
    cel.line(9, 'r:h. B5:e r:e | r:w | r:q E6:e r:e r:h | r:w')

    # ------------------------------------------------------------ A2 (13-20): an octave up; a horn answers
    pf.line(13, 'A5:h. G5:e A5:e | E5:q. F#5:e G5:q A5:q')
    pf.line(17, 'G5:h. F#5:e G5:e | A5:q. G5:e E5:q D5:q | E5:h D5:q B4:q | A4:w')
    pf.hairpin(13, 15, 'mp', 'mf')
    pf.hairpin(17, 21, 'mf', 'p')
    hn.line(15, 'E4:h C4:q D4:q | B3:h. r:q')
    hn.line(19, 'G3:h B3:h | A3:w')
    hn.hairpin(15, 17, 'p', 'mp')
    hn.hairpin(19, 21, 'mp', 'pp')
    pad(st, 13, 21, n=4, low=P('E3'), high=P('C5'))
    st.hairpin(13, 17, 'pp', 'p')
    st.hairpin(17, 21, 'p', 'pp')
    ring(13, 21, vel=-4)
    bassline(cb, 13, 21, 'R:w', octave=1)
    hit(bell, 13, 'A4', vel=50, dur=3.5)

    # ------------------------------------------------------------ B (21-28): the monastery, low chant in C lydian
    chn.line(21, 'E4:h E4:q D4:q | E4:q F#4:q E4:h | G4:h. E4:q | D4:w |'
                 'E4:h C4:q D4:q | B3:h D4:h | E4:h. D4:q | D4:h. r:q')
    chn.hairpin(21, 25, 'p', 'mp')
    chn.hairpin(26, 29, 'mp', 'p')
    pad(hum, 21, 29, n=2, low=P('C3'), high=P('G3'))
    hum.dyn(21, 'pp')
    for b, p in ((21, 'C5'), (23, 'G4'), (25, 'C5'), (27, 'E4')):
        hit(bell, b, p, vel=54, dur=3.5)
    bassline(cb, 21, 29, 'R:w', octave=1)
    pad(st, 25, 29, n=3, low=P('E3'), high=P('B3'))
    st.dyn(25, 'pp')
    roll(tp, 28, 'A2', 4, 26, 52)

    # ------------------------------------------------------------ C (29-36): the peak, the Entity cell in A lydian
    fl.line(29, shift(ENT_A, 7))   # A4 E5 F#5 D#5 … (the cell, up a fifth from D)
    fl.line(33, 'C#5:q. B4:e A4:q C#5:q | F#5:h. E5:q | D5:q. C#5:e B4:q D5:q | E5:h. r:q')
    fl.hairpin(29, 31, 'p', 'mp')
    fl.hairpin(34, 37, 'mp', 'p')
    hit(dr, 29, 'belltree', vel=40, dur=2)
    pad(gl, 29, 37, n=3, low=P('A3'), high=P('E4'))
    gl.hairpin(29, 33, 'ppp', 'pp')
    arp(hp, 29, 37, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('A3'), high=P('C#6'), length=1.3, vel=-6)
    arp(cel, 29, 37, '4 r r r 3 r r r', step=0.5, n=5, low=P('A5'), high=P('E7'), length=1.0, vel=-10)
    pad(wind, 29, 37, n=2, low=P('A3'), high=P('E4'))
    wind.dyn(29, 'ppp')
    bassline(cb, 29, 37, 'R:w', octave=1)

    # ------------------------------------------------------------ A' (37-44): the tune on the flute; thins out
    fl.line(37, 'E5:h. D5:e E5:e | A4:q. B4:e C5:q D5:q | E5:h G5:q F#5:q | E5:w |'
                'D5:h. C5:e D5:e | E5:q. D5:e C5:q B4:q | A4:h. r:q | r:w')
    fl.hairpin(37, 39, 'p', 'mp')
    fl.hairpin(41, 44, 'mp', 'pp')
    ring(37, 43, vel=-4)
    hp.hairpin(41, 43, 'p', 'pp')
    pad(st, 37, 42, n=4, low=P('E3'), high=P('C5'))
    st.dyn(37, 'pp')
    bassline(cb, 37, 43, 'R:w', octave=1)
    cb.line(43, 'A1:w | A1:w')
    drone(41, 45)
    hum.hairpin(41, 45, 'pp', 'ppp')
    hit(bell, 43, 'A4', vel=48, dur=3.5)
    cel.line(43, 'r:q E6:e r:e r:h | r:h. B5:e r:e')
    pad(wind, 41, 45, n=2, low=P('A3'), high=P('E4'))
    wind.dyn(41, 'ppp')
    return S
