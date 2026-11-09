"""The High Hamalayi — the mountain: Lhar's village, the paths and the glider landing, the monastery hall, the village's
houses heard from inside (src/game/hamalayi.js, hamrooms.js, ihomes.js 'ham-*'; MUSIC-BY-PLACE, wave C item 6).

Before this piece the Hamalayi outdoors played The Well (a cave piece, D lydian, a low drone for the dark under the
island), Lhar's houses played Twinsen's family theme (Home), and the monastery hall asked for a mood that did not exist
(R.music = 'mountain'): it was silent. A mountain is high, cold and wide, and the village on it is calm and old.

A slow tune in A dorian, 4/4, 80 bpm: long notes over an A drone, open fifths, a raised sixth (F sharp) that keeps the
minor mode bright rather than sad. Pan flute for the thin air, violins and a horn for the width of the valley, a soft
low drum like a far heartbeat, tubular bells for the monastery, and in the middle a unison chant on the choir (the
monks, in C major) over low strings. Nothing of the other pieces' themes is quoted: the mountain is a new place for
Twinsen; its tune is its own.

  intro  1-2    the drone (open fifth A-E, cello and bass), a bell, the wind
  A      3-10   pan flute: the mountain tune; harp in slow quarter notes
  A2    11-18   violins with the tune, its second half reaching up to A5; horn below; the heartbeat drum
  B     19-26   the monastery: the choir's chant in C, bells, low strings
  A'    27-34   pan flute with the cello an octave below; thins to the drone (loops to bar 3)

Original work for this fan project, written by hand note by note; no melody, recording, MIDI or arrangement of the
Little Big Adventure soundtracks (or any other music) was used or consulted (docs/MUSIC.md).
"""
from score import Song, P, pad, arp, bassline, hit

PEAK_A = ("A4:h. E5:q | D5:q. C5:e B4:h | C5:q B4:q A4:q E4:q | F#4:w |"
          "A4:h. C5:q | B4:q. A4:e G4:h | A4:q G4:q F4:q E4:q | A4:h G#4:h")
PEAK_CH = 'Am | G/A | Am | D/A | Am | Em/G | Fmaj7 | Esus4 E'
PEAK_HEAD = '|'.join(PEAK_A.split('|')[:4])


def song():
    S = Song('mountain', 750000, meter=(4, 4), title='The High Hamalayi',
             role="the Hamalayi outdoors, the monastery hall, Lhar's houses")
    S.intro_bars, S.body_bars = 2, 32
    S.mix = {'room': {'rt60': 3.0, 'predelay': 0.03, 'bright': 0.5}, 'wet': {'front': 0.28, 'mid': 0.34, 'back': 0.5},
             'lufs': -18.0}

    S.chords(1, 'A5 | A5')
    S.chords(3, PEAK_CH)
    S.chords(11, 'Am | G/A | Am | D/A | Am | G/B | Fmaj7 G | Am')
    S.chords(19, 'C | G/B | Am | Em | F | C/E | Dm7 | Esus4 E')
    S.chords(27, PEAK_CH)

    pf = S.part('panflute', 'panflute', stem='front', pan=58, vol=96, legato=True, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=96, legato=True, dyn='mp')
    vc = S.part('cello', 'cello', stem='mid', pan=78, vol=92, legato=True, dyn='mp')
    hn = S.part('horn', 'horn', stem='back', pan=44, vol=86, legato=True, dyn='p')
    ch = S.part('chant', 'choir', stem='mid', pan=60, vol=92, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=66, vol=80, dyn='pp')
    dn = S.part('drone', 'cello', stem='mid', pan=70, vol=82, dyn='pp')
    cb = S.part('bass', 'contrabass', stem='mid', pan=86, vol=86, dyn='pp')
    hp = S.part('harp', 'harp', stem='mid', pan=28, vol=86, dyn='mp')
    bl = S.part('bells', 'tubular', stem='back', pan=72, vol=70, dyn='p')
    sw = S.part('wind', 'sweep', stem='back', pan=30, vol=56, dyn='pp')
    dr = S.part('drum', 'drums', stem='back', pan=60, vol=80, dyn='p')

    def slow_harp(b0, b1, low='A3', high='E5', vel=0):
        arp(hp, b0, b1, '0 1 2 3', step=1.0, n=4, low=P(low), high=P(high), length=2.4, vel=vel)

    def heartbeat(b0, b1, v=34):
        for b in range(b0, b1):
            hit(dr, b, 'taiko', 0, vel=v + 6, dur=1.0)
            hit(dr, b, 'taiko_s', 2.5, vel=v - 8, dur=0.5)
            hit(dr, b, 'taiko', 3.0, vel=v - 2, dur=1.0)

    def drone(b0, b1):
        for b in range(b0, b1):
            dn.chord(b, [P('A2'), P('E3')], 4.0)

    # ------------------------------------------------------------ intro (1-2)
    drone(1, 3)
    dn.hairpin(1, 2, 'ppp', 'pp')
    bassline(cb, 1, 3, 'R:w', octave=1)
    bl.line(1, 'A4:w | r:w')
    pad(sw, 1, 3, n=3, low=P('A3'), high=P('E4'))
    sw.hairpin(1, 2, 'ppp', 'pp')

    # ------------------------------------------------------------ A (3-10): pan flute
    pf.line(3, PEAK_A)
    pf.hairpin(3, 5, 'mp', 'mf')
    pf.hairpin(9, 11, 'mf', 'mp')
    drone(3, 9)
    dn.dyn(3, 'pp')
    bassline(cb, 3, 11, 'R:w', octave=1)
    slow_harp(3, 11, vel=-6)

    # ------------------------------------------------------------ A2 (11-18): violins, horn, the heartbeat
    vn.line(11, PEAK_HEAD + ' | E5:h. A5:q | G5:q. F#5:e D5:h | C5:q A4:q B4:q D5:q | A4:w')
    vn.hairpin(11, 15, 'mp', 'mf')
    vn.hairpin(15, 16, 'mf', 'f')
    vn.hairpin(17, 19, 'f', 'mp')
    hn.line(11, 'E4:w | D4:w | E4:w | D4:w | C4:w | B3:w | C4:h D4:h | E4:w')
    hn.hairpin(11, 15, 'p', 'mp')
    hn.hairpin(17, 19, 'mp', 'p')
    pad(st, 11, 19, n=3, low=P('C4'), high=P('C5'))
    st.hairpin(11, 15, 'pp', 'p')
    st.dyn(17, 'pp')
    bassline(cb, 11, 19, 'R:w', octave=1)
    slow_harp(11, 19, low='C4', high='A5', vel=-4)
    heartbeat(11, 19)
    bl.line(11, 'E5:w')

    # ------------------------------------------------------------ B (19-26): the monastery, the choir's chant
    ch.line(19, 'E4:h. D4:q | D4:h B3:h | C4:h. B3:q | G3:h B3:h | A3:h. C4:q | C4:h E4:h | F4:q. E4:e D4:h | E4:w')
    ch.hairpin(19, 21, 'p', 'mp')
    ch.hairpin(23, 25, 'mp', 'mf')
    ch.hairpin(25, 27, 'mf', 'p')
    pad(st, 19, 27, n=3, low=P('F2'), high=P('G3'))
    st.dyn(19, 'p')
    bassline(cb, 19, 27, 'R:w', octave=1)
    cb.dyn(19, 'p')
    bl.line(19, 'E5:w | r:w | r:w | r:w | A4:w | r:w | r:w | r:w')
    bl.dyn(19, 'p')
    arp(hp, 21, 27, '0 2 1 3', step=2.0, n=4, low=P('C4'), high=P('C5'), length=3.0, vel=-12)

    # ------------------------------------------------------------ A' (27-34): pan flute and cello; thins to the drone
    pf.line(27, PEAK_A)
    pf.hairpin(27, 29, 'p', 'mf')
    pf.hairpin(31, 35, 'mf', 'p')
    vc.line(27, PEAK_A, octave=-1)
    vc.hairpin(27, 29, 'p', 'mp')
    vc.hairpin(31, 33, 'mp', 'pp')
    pad(st, 27, 33, n=3, low=P('C4'), high=P('C5'))
    st.dyn(27, 'pp')
    pad(sw, 27, 33, n=3, low=P('A3'), high=P('E4'))
    sw.dyn(27, 'ppp')
    slow_harp(27, 33, vel=-8)
    bassline(cb, 27, 35, 'R:w', octave=1)
    cb.dyn(27, 'pp')
    drone(33, 35)
    dn.dyn(33, 'pp')
    return S
