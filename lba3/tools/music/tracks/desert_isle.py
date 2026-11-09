"""Desert Island — Kesh under the sun: the desert outdoors, Kesh's houses, the project post's cabins, the dig crew's
bunkhouse (src/game/desert.js, ihomes.js 'kesh-*', 'post-*', 's28'; MUSIC-BY-PLACE, wave C item 6).

Before this piece the Desert had no music of its own: its playlist was Citadel's island pieces (Sea Wind, Island
Exploration), and its houses heard them through the walls. Desert Island is a different island: hot, slow, bright,
a small town of sun-baked houses round a well, a dig on its edge.

A relaxed tune in D mixolydian, 4/4, 96 bpm: syncopated (eighth-quarter-eighth), lazy in the heat, the flattened
seventh (C natural) instead of the leading note; an oboe for the dry air, a fiddle answering, nylon and steel guitars,
fretless bass and a hand-drum groove (low "dum" and high "tek"). In the middle a short gust: the tune's head on horns
sequenced down through C and B flat over a D pedal, with tremolo strings and the wind. Nothing of the other pieces'
themes is quoted; the island has its own tune.

  intro  1-2    steel guitar alone (D5, C/D), the wind, one low drum
  A      3-10   oboe: the Kesh tune; guitar, fretless bass
  A2    11-18   fiddle with the tune, its second half higher; the groove enters, soft strings
  B     19-26   noon: B minor; the nylon guitar sings, the flute answers; the groove
  C     27-30   a gust: the tune's head on horns over a D pedal (D, C/D, Bb/D, C/D), tremolo strings, wind, a roll
  A'    31-38   oboe with the fiddle a third below, the whole band; the drums drop in the last two bars (loops to 3)

Original work for this fan project, written by hand note by note; no melody, recording, MIDI or arrangement of the
Little Big Adventure soundtracks (or any other music) was used or consulted (docs/MUSIC.md).
"""
from score import Song, P, pad, arp, bassline, hit, roll

KESH_A = ("F#4:e A4:q B4:e A4:q F#4:q | G4:e E4:q C4:e E4:h | F#4:e A4:q B4:e D5:q C5:q | A4:h. r:q |"
          "B4:e D5:q E5:e D5:q B4:q | C5:e E5:q G5:e E5:h | D5:q. B4:e A4:q G4:q | F#4:h. r:q")
KESH_CH = 'D | C/D | D | Am7 | G | C | Em7 A7 | D'
KESH_HEAD = '|'.join(KESH_A.split('|')[:4])
# the fiddle's harmony a third (or a sixth) below the tune, for A'
KESH_LOW = ("D4:e F#4:q G4:e F#4:q D4:q | E4:e C4:q G3:e C4:h | D4:e F#4:q G4:e A4:h | E4:h. r:q |"
            "G4:e B4:q C5:e B4:q G4:q | G4:e C5:q E5:e C5:h | B4:q. G4:e E4:q C#4:q | D4:h. r:q")


def song():
    S = Song('desert_isle', 625000, meter=(4, 4), title='Desert Island',
             role="Desert Island outdoors, Kesh's houses, the post's cabins, the crew's bunkhouse")
    S.intro_bars, S.body_bars = 2, 36
    S.mix = {'room': {'rt60': 1.6, 'predelay': 0.015, 'bright': 0.55}, 'wet': {'front': 0.18, 'mid': 0.24, 'back': 0.36},
             'lufs': -17.5}

    S.chords(1, 'D5 | C/D')
    S.chords(3, KESH_CH)
    S.chords(11, 'D | C/D | D | Am7 | Bm7 | C | G/B A7 | D')
    S.chords(19, 'Bm | G | A | F#7sus4 F#7 | Bm | G | Em7 | A7sus4 A7')
    S.chords(27, 'D5 | C/D | Bb/D | C/D')
    S.chords(31, KESH_CH)

    ob = S.part('oboe', 'oboe', stem='front', pan=56, vol=94, legato=True, dyn='mf')
    fd = S.part('fiddle', 'fiddle', stem='front', pan=74, vol=90, legato=True, dyn='mp')
    fl = S.part('flute', 'flute', stem='front', pan=40, vol=88, legato=True, dyn='mp')
    ng = S.part('nylon', 'nylon', stem='front', pan=48, vol=104, dyn='mf')
    sg = S.part('guitar', 'steelgtr', stem='mid', pan=30, vol=86, dyn='mp')
    hn = S.part('horns', 'horn', stem='back', pan=44, vol=92, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=66, vol=80, dyn='pp')
    tr = S.part('tremolo', 'trem', stem='back', pan=58, vol=74, dyn='pp')
    bs = S.part('bass', 'fretless', stem='mid', pan=62, vol=96, dyn='mp')
    sw = S.part('wind', 'sweep', stem='back', pan=24, vol=58, dyn='pp')
    dr = S.part('hands', 'drums', stem='back', pan=56, vol=82, dyn='p')

    def strum(b0, b1, low='D3', high='D5', vel=0):
        arp(sg, b0, b1, '0 2 1 3 2 1 3 2', step=0.5, n=4, low=P(low), high=P(high), length=1.1, vel=vel)

    def groove(b0, b1, v=40):
        # dum on 1 and the "and" of 3, tek on 2 and 4, a soft ka between; shaker eighths
        for b in range(b0, b1):
            hit(dr, b, 'tumba', 0, vel=v + 8, dur=0.5)
            hit(dr, b, 'bongo', 1.0, vel=v, dur=0.25)
            hit(dr, b, 'conga', 1.5, vel=v - 10, dur=0.25)
            hit(dr, b, 'tumba', 2.5, vel=v + 2, dur=0.5)
            hit(dr, b, 'bongo', 3.0, vel=v - 2, dur=0.25)
            hit(dr, b, 'conga', 3.5, vel=v - 12, dur=0.25)
            for k in range(8):
                hit(dr, b, 'shaker', k * 0.5, vel=v - 18 + (6 if k % 2 == 0 else 0), dur=0.25)

    # ------------------------------------------------------------ intro (1-2)
    strum(1, 3, vel=-6)
    sg.hairpin(1, 3, 'p', 'mp')
    pad(sw, 1, 3, n=3, low=P('A3'), high=P('F#4'))
    sw.hairpin(1, 2, 'ppp', 'pp')
    hit(dr, 1, 'tumba', 0, vel=40, dur=1.0)
    hit(dr, 2, 'tumba', 0, vel=36, dur=1.0)

    # ------------------------------------------------------------ A (3-10): oboe, the Kesh tune
    ob.line(3, KESH_A)
    ob.hairpin(3, 5, 'mp', 'mf')
    ob.hairpin(9, 11, 'mf', 'mp')
    strum(3, 11)
    bassline(bs, 3, 11, 'R:q. 5:e r:q R:q', octave=2)
    bs.dyn(3, 'mp')
    for b in range(3, 11):
        hit(dr, b, 'tumba', 0, vel=34, dur=0.5)
        hit(dr, b, 'tumba', 2.5, vel=28, dur=0.5)

    # ------------------------------------------------------------ A2 (11-18): fiddle, the groove, soft strings
    fd.line(11, KESH_HEAD + ' | D5:e F#5:q A5:e F#5:q D5:q | C5:e E5:q G5:e E5:h | B4:q. D5:e C#5:q E5:q | D5:h. r:q')
    fd.hairpin(11, 15, 'mp', 'mf')
    fd.hairpin(17, 19, 'mf', 'mp')
    strum(11, 19)
    bassline(bs, 11, 19, 'R:q. 5:e r:q R:q', octave=2)
    groove(11, 19)
    pad(st, 11, 19, n=3, low=P('F#4'), high=P('E5'))
    st.hairpin(11, 15, 'pp', 'p')
    st.dyn(17, 'pp')

    # ------------------------------------------------------------ B (19-26): noon, B minor; nylon guitar and flute
    ng.line(19, 'B4:e C#5:e D5:e F#5:e E5:q D5:q | B4:h. r:q | A4:e B4:e C#5:e E5:e C#5:q A4:q | B4:h A#4:h')
    ng.dyn(19, 'mf')
    fl.line(23, 'F#5:q. E5:e D5:q B4:q | D5:q. C#5:e B4:q G4:q | E5:q. D5:e B4:q G4:q | A4:h C#5:h')
    fl.hairpin(23, 25, 'mp', 'mf')
    fl.hairpin(25, 27, 'mf', 'mp')
    pad(st, 19, 27, n=3, low=P('D4'), high=P('D5'))
    st.dyn(19, 'p')
    strum(19, 27, low='B2', high='B4', vel=-8)
    bassline(bs, 19, 27, 'R:q. 5:e r:q R:q', octave=2)
    groove(19, 27, v=38)

    # ------------------------------------------------------------ C (27-30): a gust; the head on horns over a D pedal
    hn.line(27, 'F#4:e A4:q B4:e A4:q F#4:q | G4:e E4:q C4:e E4:h | F4:e D4:q Bb3:e D4:h | E4:h. r:q')
    hn.hairpin(27, 29, 'mp', 'mf')
    hn.hairpin(29, 31, 'mf', 'mp')
    pad(tr, 27, 31, n=3, low=P('D3'), high=P('C4'))
    tr.hairpin(27, 29, 'pp', 'p')
    tr.hairpin(29, 31, 'p', 'pp')
    pad(sw, 27, 31, n=3, low=P('A3'), high=P('F#4'))
    sw.hairpin(27, 29, 'pp', 'p')
    sw.hairpin(29, 31, 'p', 'pp')
    bassline(bs, 27, 31, 'R:h R:h', octave=2)
    for b in range(27, 31):
        hit(dr, b, 'tumba', 0, vel=46, dur=1.0)
        hit(dr, b, 'taiko_s', 2.0, vel=30, dur=0.5)
    roll(dr, 30, 'tamb', 2.0, 18, 44, beat=2.0)

    # ------------------------------------------------------------ A' (31-38): oboe and fiddle, the whole band
    ob.line(31, KESH_A)
    ob.dyn(31, 'mf')
    ob.hairpin(37, 39, 'mf', 'mp')
    fd.line(31, KESH_LOW)
    fd.dyn(31, 'mp')
    fd.hairpin(37, 39, 'mp', 'p')
    strum(31, 39)
    sg.hairpin(37, 39, 'mp', 'p')
    bassline(bs, 31, 39, 'R:q. 5:e r:q R:q', octave=2)
    pad(st, 31, 37, n=3, low=P('F#4'), high=P('E5'))
    st.dyn(31, 'pp')
    groove(31, 37)
    for b in range(37, 39):
        hit(dr, b, 'tumba', 0, vel=32, dur=0.5)
    return S
