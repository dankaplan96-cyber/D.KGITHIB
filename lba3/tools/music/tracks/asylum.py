"""The Old Asylum — FunFrock's asylum on Citadel twelve years on: officially the Joint Project's hostel for its Esmer
workers, behind it Vesk's hidden store (LBA1's room 0 rebuilt; src/game/lba1places.js, src/game/asylumhostel.js).

ORDER 19 (the user: "the asylum should have a different tune"). Until then the asylum shared the project's own piece
with the fort outside (Energy Facility, its stealth mix), so walking in through the front door on the fort's terrace
changed nothing that a player hears. This is a place of its own: an old building that still remembers being a prison,
lived in now by tired workers, with something humming behind a locked door.

An uneasy music-box waltz in B minor, 3/4, slow (76 bpm): a small mechanism that keeps turning in an empty hall.
Quiet and sparse (no brass, no drums; a wood-block clock), chamber colours unlike the facility's mechanical 4/4 pulse:
music box, low clarinet, bassoon, English horn, pizzicato, a few muted strings and a glass hum. The Entity cell is
heard only once, bent and transposed (B F# G# then down to F natural, over Bm6 G7 A7/C#: the facility's troubled
harmony moved down a minor third), in the section for the store behind the locked door.

  intro  1-4    the music box alone over a pizzicato B, the clock
  A      5-12   low clarinet: the asylum tune (B minor), the music box under it
  A2    13-20   the tune climbs, violas hold the harmony; the last bar is the music box alone
  B     21-28   the hostel lived in: bassoon in D major over a walking pizzicato, warmer, the box silent
  C     29-36   the store behind the door: English horn with the bent cell, string tremolo, glass hum, the clock
  A'    37-44   the tune high on a flute, the music box back; thins out to the box and the bass (loops to bar 5)

Original work for this fan project, written by hand note by note; no melody, recording, MIDI or arrangement of the
Little Big Adventure soundtracks was used or consulted (docs/MUSIC.md).
"""
from score import Song, P, pad, arp, bassline, hit


def song():
    S = Song('asylum', 790000, meter=(3, 4), title='The Old Asylum', role="FunFrock's old asylum (the project hostel)")
    S.intro_bars, S.body_bars = 4, 40
    S.mix = {'room': {'rt60': 2.6, 'predelay': 0.022, 'bright': 0.38}, 'wet': {'front': 0.28, 'mid': 0.34, 'back': 0.46},
             'lufs': -18.5}

    S.chords(1, 'Bm | Gmaj7/B | Bm | F#7/A#')
    S.chords(5, 'Bm | Bm/A | Gmaj7 | Em6 | Bm/F# | C#m7b5 | F#7sus4 | F#7')
    S.chords(13, 'Bm | Bm/A | Gmaj7 | G#m7b5 | Gmaj7 | F#7/A# | Bm | Bm')
    S.chords(21, 'D | A/C# | Bm | F#m/A | G | D/F# | Em7 | F#7sus4 F#7')
    S.chords(29, 'Bm6 | G7 | A7/C# | Bm | Bm6 | G7 | Em6/G | F#7')
    S.chords(37, 'Bm | Bm/A | Gmaj7 | G#m7b5 | Em | F#7/A# | Bm | F#7')

    cl = S.part('clarinet', 'clarinet', stem='front', pan=56, vol=92, legato=True, dyn='mp')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=72, vol=90, legato=True, dyn='mp')
    eh = S.part('ehorn', 'ehorn', stem='front', pan=46, vol=88, legato=True, dyn='p')
    fl = S.part('flute', 'flute', stem='front', pan=38, vol=86, legato=True, dyn='p')
    mb = S.part('musicbox', 'musicbox', stem='mid', pan=26, vol=78, dyn='mp')
    va = S.part('violas', 'strings_slow', stem='mid', pan=70, vol=80, legato=True, dyn='pp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=60, vol=92, dyn='mp')
    cb = S.part('bass', 'contrabass', stem='mid', pan=64, vol=90, legato=True, dyn='pp')
    tr = S.part('tremolo', 'trem', stem='back', pan=40, vol=70, dyn='pp')
    gl = S.part('hum', 'glass', stem='back', pan=54, vol=58, dyn='pp')
    dr = S.part('clock', 'drums', stem='back', pan=66, vol=74, dyn='p')

    def box(b0, b1, vel=0):
        # the music box: a broken chord, six eighths a bar, high and dry
        arp(mb, b0, b1, '0 2 1 2 3 2', step=0.5, n=4, low=P('B4'), high=P('D6'), length=0.9, vel=vel)

    def clock(b0, b1, v=26):
        # an old wall clock in the corridor: tick on every beat, the first a little lower
        for b in range(b0, b1):
            for k in range(3):
                hit(dr, b, 'wb_lo' if k == 0 else 'wb_hi', k, vel=v + (4 if k == 0 else 0), dur=0.25)

    # ------------------------------------------------------------ intro (1-4)
    box(1, 5, vel=-6)
    mb.hairpin(1, 3, 'p', 'mp')
    bassline(pz, 1, 5, 'R:q r:h', octave=2)
    pz.dyn(1, 'p')
    clock(1, 5, 22)

    # ------------------------------------------------------------ A (5-12): the tune, low clarinet
    box(5, 13)
    mb.dyn(5, 'p')
    cl.line(5, 'F#4:h B4:q | A4:q. G4:e F#4:q | G4:h D4:q | E4:h. |'
               'F#4:q. G4:e A4:q | G4:h E4:q | F#4:h. | E4:q D4:q C#4:q')
    cl.hairpin(5, 9, 'p', 'mp')
    cl.hairpin(11, 13, 'mp', 'p')
    bassline(pz, 5, 13, 'R:q r:q 8:q', octave=2)  # (the octave, not the fifth: C#m7b5 and G#m7b5 have no perfect fifth)
    pz.dyn(5, 'mp')

    # ------------------------------------------------------------ A2 (13-20): the tune climbs, violas below
    box(13, 20)
    cl.line(13, 'F#4:h D5:q | C#5:q. B4:e A4:q | B4:h F#4:q | G#4:h. |'
                'G4:q. F#4:e E4:q | C#5:h A#4:q | B4:h. | r:h.')
    cl.hairpin(13, 15, 'mp', 'mf')
    cl.hairpin(17, 20, 'mf', 'p')
    pad(va, 13, 20, n=3, low=P('D3'), high=P('B3'))
    va.hairpin(13, 16, 'pp', 'p')
    va.hairpin(17, 20, 'p', 'pp')
    bassline(pz, 13, 21, 'R:q r:q 8:q', octave=2)
    box(20, 21, vel=-8)  # (the box alone for a bar)

    # ------------------------------------------------------------ B (21-28): the hostel lived in, bassoon in D
    bn.line(21, 'F#3:q A3:q D4:q | C#4:h A3:q | B3:q. A3:e F#3:q | A3:h. |'
                'G3:q B3:q D4:q | F#4:q. E4:e D4:q | E4:q G3:q B3:q | B3:q. A#3:e C#4:q')
    bn.hairpin(21, 25, 'mp', 'mf')
    bn.hairpin(27, 29, 'mf', 'mp')
    bassline(pz, 21, 29, 'R:q 5:q 8:q', octave=2)
    pz.dyn(21, 'mp')
    pad(va, 21, 29, n=3, low=P('F#3'), high=P('D4'))
    va.dyn(21, 'pp')

    # ------------------------------------------------------------ C (29-36): the store behind the door
    eh.line(29, 'B3:h F#4:e G#4:e | F4:h. | E4:h G4:q | F#4:h. |'
                'B3:h F#4:e G#4:e | F4:h D4:q | E4:h C#4:q | A#3:h.')
    eh.hairpin(29, 31, 'p', 'mp')
    eh.hairpin(33, 37, 'mp', 'p')
    pad(tr, 29, 37, n=3, low=P('D3'), high=P('B3'))
    tr.hairpin(29, 33, 'ppp', 'pp')
    tr.hairpin(33, 37, 'pp', 'ppp')
    pad(gl, 29, 37, n=2, low=P('B3'), high=P('F#4'))
    gl.dyn(29, 'pp')
    cb.line(29, 'B1:h.~ | B1:h. | C#2:h. | B1:h. | B1:h.~ | B1:h. | G1:h. | F#1:h.')
    cb.dyn(29, 'pp')
    clock(29, 37, 24)

    # ------------------------------------------------------------ A' (37-44): the tune high, the box back; thins out
    box(37, 45, vel=-4)
    mb.dyn(37, 'p')
    fl.line(37, 'F#5:h B5:q | A5:q. G5:e F#5:q | G5:h D5:q | D5:h B4:q |'
                'E5:q. D5:e B4:q | C#5:h. | B4:h. | r:h.')
    fl.hairpin(37, 39, 'p', 'mp')
    fl.hairpin(41, 44, 'mp', 'pp')
    pad(va, 37, 42, n=3, low=P('D3'), high=P('B3'))
    va.dyn(37, 'pp')
    bassline(pz, 37, 45, 'R:q r:q 8:q', octave=2)
    pz.hairpin(41, 45, 'mp', 'p')
    clock(43, 45, 20)
    return S
