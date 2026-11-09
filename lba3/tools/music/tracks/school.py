"""The School of Magic — Rector Hougo's school on Desert Island, its pupils' dormitory, and Bersimon's tent
(src/game/wizards.js, ihomes.js 'hall'; MUSIC-BY-PLACE, wave C item 6).

Before this piece the School heard the Desert's island pieces through its walls (Sea Wind, Island Exploration:
Citadel's travel music), and Bersimon's tent played Twinsen's family theme (Home). A school of magic is neither: it is
a quiet stone hall where children learn small wonders.

A lesson tune in G major, 4/4, 100 bpm: curious eighth-note runs that climb a sixth and settle, answered a third lower,
over harp and pizzicato; chamber colours (clarinet, flute, celesta, harp, bassoon, strings, a soft choir and a glass
hum), no brass, no drums but a wood block in the mischief episode. The magic is the project's own Entity cell (themes.py
ENT_A, wonder form), moved to G lydian: magic in this world is Sendell's gift, so the school's spells are made of the
same notes as the well's wonder. The raised fourth (C sharp) is the school's sparkle throughout: the celesta's little
"spell" figure at phrase ends is the cell played fast.

  intro  1-2    harp and glass hum, the celesta's spell (G, A/G)
  A      3-10   clarinet: the lesson tune; harp, pizzicato steps
  A2    11-18   flute: the tune an octave up, its second half climbing; celesta answers
  B     19-26   cello in E minor: the hall's quiet study; soft choir and strings
  C     27-34   a spell goes a little wrong (bassoon staccato in B minor, wood block, pizzicato: B A G F#7), then works:
                the Entity cell in G lydian on the flute over celesta and glass
  A'    35-42   violins with the tune, flute descant; the last two bars thin to the harp (loops to bar 3)

Original work for this fan project, written by hand note by note; no melody, recording, MIDI or arrangement of the
Little Big Adventure soundtracks (or any other music) was used or consulted (docs/MUSIC.md).
"""
from score import Song, P, pad, arp, bassline, hit
from themes import ENT_A, shift

LESSON_A = "G4:e A4:e B4:e D5:e E5:q. D5:e | B4:q G4:q E4:h | E4:e F#4:e G4:e B4:e C5:q. B4:e | A4:h. r:q"
LESSON_B = "G4:e A4:e B4:e D5:e G5:q. F#5:e | E5:q D5:e C#5:e E5:h | C5:q. B4:e A4:q F#4:q | G4:h. r:q"
LESSON_CH = 'G | Em7 | Cmaj7 | D7sus4 D | G | Em7 A7 | Am7 D7 | G'


def song():
    S = Song('school', 600000, meter=(4, 4), title='The School of Magic',
             role="the School of Magic (Desert Island), its dormitory, the weather wizard's tent")
    S.intro_bars, S.body_bars = 2, 40
    S.mix = {'room': {'rt60': 2.4, 'predelay': 0.02, 'bright': 0.55}, 'wet': {'front': 0.24, 'mid': 0.3, 'back': 0.45},
             'lufs': -18.0}

    S.chords(1, 'G | A/G')
    S.chords(3, LESSON_CH)
    S.chords(11, 'G | Em7 | Cmaj7 | D7sus4 D | G/B | Cmaj7 | Am7 D7 | G')
    S.chords(19, 'Em | C | Am7 | B7sus4 B7 | Em | C | Am7 D7 | G F#7')
    S.chords(27, 'Bm | A | G | F#7')
    S.chords(31, 'G | A/G | F#m7 | Em7 D7sus4')
    S.chords(35, LESSON_CH)

    cl = S.part('clarinet', 'clarinet', stem='front', pan=54, vol=94, legato=True, dyn='mp')
    fl = S.part('flute', 'flute', stem='front', pan=76, vol=88, legato=True, dyn='mp')
    ce = S.part('celesta', 'celesta', stem='front', pan=30, vol=86, dyn='mp')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=70, vol=92, dyn='mp')
    hp = S.part('harp', 'harp', stem='mid', pan=36, vol=90, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=78, vol=90, dyn='mp')
    vc = S.part('cello', 'cello', stem='mid', pan=82, vol=94, legato=True, dyn='mp')
    vn = S.part('violins', 'strings', stem='mid', pan=34, vol=94, legato=True, dyn='mp')
    st = S.part('strings', 'strings_slow', stem='mid', pan=64, vol=78, dyn='pp')
    cb = S.part('bass', 'contrabass', stem='mid', pan=88, vol=84, dyn='pp')
    oo = S.part('choir', 'oohs', stem='back', pan=50, vol=70, dyn='pp')
    gl = S.part('hum', 'glass', stem='back', pan=60, vol=60, dyn='pp')
    dr = S.part('wood', 'drums', stem='back', pan=66, vol=72, dyn='p')

    def ripple(b0, b1, n=4, low='G3', high='D5', vel=0):
        arp(hp, b0, b1, '0 1 2 3 2 1 2 1', step=0.5, n=n, low=P(low), high=P(high), length=1.4, vel=vel)

    def spell(bar, root='G5', beat=2.0, vel=0):
        # the celesta's spell: the Entity cell played fast (up a fifth, up a step, down a minor third onto the raised
        # fourth), on the given root
        r = P(root)
        for k, d in enumerate((0, 7, 9, 6)):
            ce.note(S.pos(bar, beat + 0.5 * k), r + d, 0.9, int(ce.level(S.pos(bar, beat)) + vel))

    # ------------------------------------------------------------ intro (1-2)
    ripple(1, 3, vel=-8)
    hp.hairpin(1, 3, 'p', 'mp')
    pad(gl, 1, 3, n=3, low=P('B3'), high=P('A4'))
    gl.hairpin(1, 2, 'ppp', 'pp')
    spell(2, 'G5', beat=1.0, vel=-4)

    # ------------------------------------------------------------ A (3-10): clarinet, the lesson tune
    cl.line(3, LESSON_A + ' | ' + LESSON_B)
    cl.hairpin(3, 5, 'mp', 'mf')
    cl.hairpin(9, 11, 'mf', 'mp')
    ripple(3, 11)
    bassline(pz, 3, 11, 'R:q r:q 5:q r:q', octave=2)
    pz.dyn(3, 'mp')
    spell(6, 'D6')
    spell(10, 'G5')

    # ------------------------------------------------------------ A2 (11-18): flute an octave up, climbing
    fl.line(11, LESSON_A, octave=1)
    fl.line(15, 'D5:e E5:e G5:e A5:e B5:q. A5:e | G5:q E5:e F#5:e G5:h | A5:q. G5:e F#5:q A5:q | G5:h. r:q')
    fl.hairpin(11, 15, 'mp', 'mf')
    fl.hairpin(17, 19, 'mf', 'mp')
    ripple(11, 19, low='B3', high='G5')
    bassline(pz, 11, 19, 'R:q 5:q 8:q 5:q', octave=2)
    pad(st, 11, 19, n=3, low=P('D4'), high=P('D5'))
    st.hairpin(11, 15, 'pp', 'p')
    st.dyn(17, 'pp')
    spell(14, 'D6', vel=4)
    spell(18, 'G5', vel=2)

    # ------------------------------------------------------------ B (19-26): cello, the quiet study
    vc.line(19, 'E3:q. F#3:e G3:q B3:q | C4:h. B3:q | A3:q. B3:e C4:q E4:q | F#4:h D#4:h |'
                'E4:q. D4:e B3:q G3:q | A3:q. G3:e E3:q G3:q | C4:q. B3:e A3:q F#3:q | G3:h A#3:h')
    vc.hairpin(19, 22, 'mp', 'mf')
    vc.hairpin(23, 27, 'mf', 'mp')
    pad(oo, 19, 27, n=3, low=P('G4'), high=P('E5'))
    oo.hairpin(19, 23, 'ppp', 'pp')
    oo.hairpin(25, 27, 'pp', 'ppp')
    pad(st, 19, 27, n=3, low=P('E3'), high=P('B3'))
    st.dyn(19, 'pp')
    arp(hp, 19, 27, '0 1 2 3', step=1.0, n=4, low=P('E4'), high=P('E5'), length=2.2, vel=-10)
    bassline(cb, 19, 27, 'R:w', octave=2)
    cb.dyn(19, 'pp')
    ce.line(22, 'r:h r:q D#6:q')
    ce.line(26, 'r:h r:q A#5:q')

    # ------------------------------------------------------------ C (27-34): a spell goes a little wrong, then works
    bn.line(27, 'B2:e! D3:e! F#3:e! D3:e! B2:e! C#3:e! D3:q | A2:e! C#3:e! E3:e! C#3:e! A2:e! B2:e! C#3:q |'
                'G2:e! B2:e! D3:e! B2:e! G2:e! A2:e! B2:q | A#2:e! C#3:e! E3:e! C#3:e! F#3:q r:q')
    bn.hairpin(27, 30, 'mp', 'mf')
    bassline(pz, 27, 31, 'r:e 5:e! r:e 8:e! r:e 5:e! r:e 8:e!', octave=2)
    pz.dyn(27, 'mp')
    for b in range(27, 31):
        for k in range(4):
            hit(dr, b, 'wb_hi' if k % 2 else 'wb_lo', k, vel=30 + (6 if k == 0 else 0), dur=0.25)
    ce.line(28, 'r:h r:e B6:e! A#6:e! B6:e!')
    ce.line(30, 'r:h. r:e C#7:e!')
    # …and works: the Entity cell (themes.ENT_A, wonder) in G lydian
    fl.line(31, shift(ENT_A, 5))
    fl.hairpin(31, 33, 'p', 'mf')
    fl.hairpin(33, 35, 'mf', 'p')
    pad(gl, 31, 35, n=3, low=P('B3'), high=P('A4'))
    gl.hairpin(31, 33, 'pp', 'p')
    gl.dyn(34, 'pp')
    ripple(31, 35, low='D4', high='A5', vel=-6)
    bassline(cb, 31, 35, 'R:w', octave=2)
    spell(31, 'G5', beat=0.0, vel=-6)
    spell(34, 'G5', beat=0.0, vel=-6)

    # ------------------------------------------------------------ A' (35-42): violins, flute descant; thins out
    vn.line(35, LESSON_A + ' | ' + LESSON_B)
    vn.hairpin(35, 37, 'mp', 'mf')
    vn.hairpin(39, 43, 'mf', 'p')
    fl.line(35, 'D6:w | B5:w | C6:w | A5:h. r:q | B5:w | B5:h C#6:h')
    fl.dyn(35, 'p')
    fl.hairpin(39, 41, 'p', 'pp')
    pad(st, 35, 41, n=3, low=P('B3'), high=P('B4'))
    st.dyn(35, 'pp')
    ripple(35, 43)
    hp.hairpin(41, 43, 'mp', 'p')
    bassline(pz, 35, 41, 'R:q r:q 5:q r:q', octave=2)
    bassline(cb, 35, 41, 'R:w', octave=2)
    cb.dyn(35, 'pp')
    spell(38, 'D6', vel=-2)
    return S
