"""Danger / Combat — drones, mites and guards chasing Twinsen (any area; the music manager switches in and out).

Readable rhythm and energy, ~80 s loop. Kept mostly in the low and middle register (low strings, horns,
trombones, taiko, timpani) so the game's high, bright warning cues (alert, zap, hit) stay audible.
The Adventure head returns in E minor (Twinsen fighting back); the Entity cell in its troubled form is
the threat (the project's machines).

  intro  1     taiko + the ostinato starts
  A      2-9   horns: the Adventure head in E minor over a cello/bass 8th ostinato and drums
  B     10-17  trombones: the troubled Entity cell; violas tremolo; the ostinato goes on
  C     18-25  drive: violins in short 8ths, snare, woodwind stabs
  D     26-33  breathing space: timpani, pizzicato, low clarinet ostinato (still in tempo)
  E     34-41  climax: the theme in horns + celli in octaves, taiko in 8ths
  link  42-45  ostinato and a crescendo roll back to bar 2
"""
from score import Song, P, pad, arp, bassline, roll, hit

ADV_MINOR = "E4:q. B3:e E4:q G4:q | F#4:q. E4:e C4:h | D#4:q. E4:e F#4:q B4:q | G4:h. r:q"
ADV_MINOR_2 = "E4:q. B3:e E4:q A4:q | G4:q. F#4:e E4:e D4:e C4:q | A4:q. G4:e F#4:q B4:q | E4:h. r:q"


def song():
    S = Song('combat', 456000, title='Danger', role='Combat (drones, mites, guards)')
    S.intro_bars, S.body_bars = 1, 44
    S.mix = {'room': {'rt60': 1.6, 'predelay': 0.012, 'bright': 0.4}, 'wet': {'front': 0.16, 'mid': 0.2, 'back': 0.28},
             'lufs': -16.5, 'eq': {'peaks': [(260, -1.5, 0.9), (2500, -1.0, 0.7)]}}
    S.chords(1, 'Em')
    S.chords(2, 'Em | C Am | B7 | Em | Em | C | Am B7 | Em')
    S.chords(10, 'Em6 | C7 | D7/F# | Em | Em6 | C7 | B7sus4 | B7')
    S.chords(18, 'C | D | Em | Em | C | D | B7sus4 | B7')
    S.chords(26, 'Am | Em | Am | Em | C | Am | B7sus4 | B7')
    S.chords(34, 'Em | C Am | B7 | Em | Em | C | Am B7 | Em')
    S.chords(42, 'Em | C | Am | B7')

    hn = S.part('horns', 'horn', stem='mid', pan=46, vol=104, legato=True, dyn='f')
    tb = S.part('trombones', 'trombone', stem='back', pan=78, vol=96, legato=True, dyn='f')
    vn = S.part('violins', 'strings', stem='mid', pan=36, vol=90, dyn='mf')
    va = S.part('violas', 'trem', stem='mid', pan=66, vol=84, dyn='mp')
    vc = S.part('celli', 'cello', stem='mid', pan=74, vol=100, dyn='f')
    cb = S.part('basses', 'contrabass', stem='mid', pan=86, vol=96, dyn='f')
    ost = S.part('ostinato', 'strings', stem='mid', pan=58, vol=92, dyn='f')
    pz = S.part('pizz', 'pizz', stem='mid', pan=60, vol=96, dyn='mf')
    cl = S.part('clarinet', 'clarinet', stem='front', pan=54, vol=90, dyn='mf')
    ob = S.part('oboe', 'oboe', stem='front', pan=70, vol=80, dyn='mf')
    ti = S.part('timpani', 'timpani', stem='back', pan=62, vol=100, dyn='f')
    dr = S.part('drums', 'drums', stem='back', pan=64, vol=96, dyn='f')

    OST = 'R:e R:e 8:e R:e R:e 8:e 5:e R:e'
    for b0, b1 in ((1, 26), (34, 46)):
        bassline(ost, b0, b1, OST, octave=2)
    ost.dyn(1, 'mf')
    ost.hairpin(42, 46, 'mf', 'f')

    def drums(b0, b1, fill=True, light=False):
        for b in range(b0, b1):
            v = 64 if light else 84
            hit(dr, b, 'taiko', 0, vel=v + 8, dur=1)
            hit(dr, b, 'bd', 1.5, vel=v - 10, dur=0.5)
            hit(dr, b, 'bd', 2, vel=v - 4, dur=0.5)
            hit(dr, b, 'taiko_s', 3, vel=v - 14, dur=0.5)
            if fill and (b - b0) % 4 == 3:
                hit(dr, b, 'taiko_s', 3.5, vel=v - 6, dur=0.5)
                hit(dr, b, 'taiko', 3.75, vel=v, dur=0.25)

    # intro
    hit(dr, 1, 'taiko', 0, vel=100, dur=2)
    hit(dr, 1, 'crash', 0, vel=50, dur=2)
    ti.line(1, 'E2:q r:h B2:e B2:e')

    # A: Adventure head in E minor, horns
    hn.line(2, ADV_MINOR + ' | ' + ADV_MINOR_2)
    hn.dyn(2, 'f')
    vc.line(2, 'E2:w | C3:h A2:h | B2:w | E2:h. B2:q | E2:w | C3:w | A2:h B2:h | E2:w')
    cb.line(2, 'E1:w | C2:h A1:h | B1:w | E1:w | E1:w | C2:w | A1:h B1:h | E1:w')
    drums(2, 10)
    ti.line(5, 'r:h. B2:q')
    ti.line(9, 'r:h B2:q B2:q')

    # B: the troubled Entity cell, trombones
    tb.line(10, 'E3:h B3:q C#4:q | A#3:h. G#3:q | F#3:h C4:q D4:q | B3:w |'
                'E3:h B3:q C#4:q | A#3:h. G#3:q | F#3:h E3:h | D#3:w')
    tb.dyn(10, 'f')
    va.line(10, 'G4+B4:w | G4+Bb4:w | F#4+A4:w | G4+B4:w | G4+B4:w | G4+Bb4:w | A4+B4:w | A4+B4:w')
    va.hairpin(10, 18, 'mp', 'mf')
    pad(hn, 10, 18, n=2, low=P('E4'), high=P('B4'))
    hn.dyn(10, 'mf')
    bassline(cb, 10, 18, 'R:w', octave=1)
    drums(10, 18)

    # C: drive
    arp(vn, 18, 26, '0 1 0 2 0 1 0 2', step=0.5, n=3, low=P('E4'), high=P('E5'), length=0.3, accent_every=4)
    vn.dyn(18, 'mf')
    for b in range(18, 26):
        hit(dr, b, 'snare', 1, vel=56, dur=0.25)
        hit(dr, b, 'snare', 3, vel=60, dur=0.25)
        hit(dr, b, 'snare', 3.5, vel=44, dur=0.25)
    for b in (18, 19, 22, 23):
        hit(dr, b, 'taiko', 0, vel=88, dur=1)
        hit(dr, b, 'bd', 2, vel=74, dur=0.5)
    ob.line(19, 'r:h. F#5:e! A5:e!')
    ob.line(23, 'r:h. F#5:e! A5:e!')
    cl.line(21, 'r:h B4:e! r:e B4:e! r:e')
    cl.line(25, 'r:h B4:e! r:e A4:e! r:e')
    hn.line(18, 'E4:w | F#4:w | G4:h. B4:q | B4:w | E4:w | F#4:w | E4:w | D#4:w')
    hn.dyn(18, 'mf')
    bassline(cb, 18, 26, 'R:h R:h', octave=1)

    # D: breathing space
    bassline(pz, 26, 34, 'R:e r:e 5:e r:e 8:e r:e 5:e r:e', octave=2)
    pz.dyn(26, 'mf')
    arp(cl, 26, 34, '0 1 2 1 0 1 2 1', step=0.5, n=3, low=P('E3'), high=P('E4'), length=0.35)
    cl.dyn(26, 'mp')
    ti.line(26, 'A2:q r:q E2:q r:q | E2:q r:q B2:q r:q | A2:q r:q E2:q r:q | E2:q r:q B2:q r:q |'
                'r:w | A2:q r:q E2:q r:q | B2:q r:q B2:q r:q | B2:q B2:e B2:e B2:q B2:q')
    ti.dyn(26, 'mf')
    ti.hairpin(32, 34, 'mf', 'f')
    va.line(30, 'C4+E4:w | A3+E4:w | B3+E4:w | B3+D#4:w')
    va.hairpin(30, 34, 'p', 'mf')

    # E: climax
    hn.line(34, ADV_MINOR + ' | ' + ADV_MINOR_2)
    hn.dyn(34, 'ff')
    vc.line(34, ADV_MINOR + ' | ' + ADV_MINOR_2, octave=-1)
    vc.dyn(34, 'f')
    tb.line(34, 'E3:w | E3:h E3:h | D#3:w | E3:w | E3:w | E3:w | E3:h D#3:h | E3:w')
    tb.dyn(34, 'f')
    bassline(cb, 34, 42, 'R:h R:h', octave=1)
    for b in range(34, 42):
        for k in range(8):
            hit(dr, b, 'taiko_s' if k % 2 else 'taiko', k * 0.5, vel=72 + (14 if k in (0, 3, 6) else 0), dur=0.5)
    hit(dr, 34, 'crash', 0, vel=62, dur=2)
    hit(dr, 38, 'crash', 0, vel=56, dur=2)

    # link
    roll(ti, 44, 'B2', 8, 40, 92)
    pad(va, 42, 46, n=2, low=P('E4'), high=P('B4'))
    va.hairpin(42, 46, 'p', 'f')
    for b in range(42, 46):
        hit(dr, b, 'bd', 0, vel=70, dur=1)
        hit(dr, b, 'bd', 2, vel=64, dur=1)
    return S
