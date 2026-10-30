"""Finale — chapter 3's last confrontation (the Bore Guardian, the final switch): mood 'boss' / 'finale'.

Develops and combines the three themes, loopable for a fight of any length.

  intro  1-2   D-minor ostinato, timpani
  A      3-10  trombones + horns: the Entity cell, troubled and augmented; violins answer with the
               Adventure head in D minor as counterpoint
  B     11-18  battle: the Adventure head climbs in sequence (Dm Eb F G ...), snare and taiko
  C     19-26  hope: the Home theme (Bb major, 4/4) on a solo horn over the still-running pulse
  D     27-34  combination: the Adventure theme in D MAJOR on trumpet + violins while the low brass
               play the Entity cell underneath — its G# now rising to A (the resolution begins)
  E     35-42  the Entity theme resolved, tutti
  F     43-50  the ostinato returns in D minor and builds back to the top (the fight goes on)
"""
from score import Song, P, pad, arp, bassline, roll, hit
from themes import ADV_A, ADV_B, ADV_CHORDS_A, shift


def song():
    S = Song('finale', 500000, title='Finale', role='Chapter 3 finale / boss')
    S.intro_bars, S.body_bars = 2, 48
    S.mix = {'room': {'rt60': 2.4, 'predelay': 0.022, 'bright': 0.5}, 'wet': {'front': 0.22, 'mid': 0.28, 'back': 0.4},
             'lufs': -16.5}
    S.chords(1, 'Dm | Dm')
    S.chords(3, 'Dm6 | Bb7 | C7/E | Dm | Dm6 | Bb7 | Gm6/Bb | A7')
    S.chords(11, 'Dm | Eb | F | G | Gm | A7 | Bb | A7')
    S.chords(19, 'Bb | Eb | Cm7 | F | Bb | Gm7 | Cm7 F7 | Bb A7')
    S.chords(27, ADV_CHORDS_A + ' | D G | Bm | E7 A7 | D')
    S.chords(35, 'D | E/D D | C#m7 | D | D | E/D D | Bm7 E7 | A7sus4 A7')
    S.chords(43, 'Dm | Dm | Bb | A7 | Dm | Dm | Bb | A7')

    tp = S.part('trumpets', 'trumpet', stem='back', pan=66, vol=92, legato=True, dyn='f')
    hn = S.part('horns', 'horn', stem='mid', pan=44, vol=104, legato=True, dyn='f')
    tb = S.part('trombones', 'trombone', stem='back', pan=80, vol=98, legato=True, dyn='f')
    tu = S.part('tuba', 'tuba', stem='back', pan=86, vol=88, legato=True, dyn='mf')
    v1 = S.part('violins', 'strings', stem='mid', pan=34, vol=102, legato=True, dyn='f')
    ost = S.part('ostinato', 'strings', stem='mid', pan=60, vol=92, dyn='f')
    vc = S.part('celli', 'cello', stem='mid', pan=76, vol=98, legato=True, dyn='f')
    cb = S.part('basses', 'contrabass', stem='mid', pan=90, vol=94, dyn='f')
    fl = S.part('flute', 'flute', stem='front', pan=54, vol=86, legato=True, dyn='mf')
    hp = S.part('harp', 'harp', stem='mid', pan=24, vol=88, dyn='mf')
    ch = S.part('choir', 'choir', stem='back', pan=62, vol=80, legato=True, dyn='mp')
    ti = S.part('timpani', 'timpani', stem='back', pan=60, vol=100, dyn='f')
    dr = S.part('perc', 'drums', stem='back', pan=64, vol=92, dyn='f')

    OST = 'R:e R:e 8:e R:e R:e 8:e 5:e R:e'

    def drums(b0, b1, snare=False):
        for b in range(b0, b1):
            hit(dr, b, 'taiko', 0, vel=86, dur=1)
            hit(dr, b, 'bd', 1.5, vel=70, dur=0.5)
            hit(dr, b, 'taiko_s', 2, vel=74, dur=0.5)
            hit(dr, b, 'bd', 3, vel=66, dur=0.5)
            if snare:
                for k in (1, 3, 3.5):
                    hit(dr, b, 'snare', k, vel=52 if k != 3.5 else 40, dur=0.25)

    # intro + A: the cell, troubled, against the Adventure head
    for b0, b1 in ((1, 19), (43, 51)):
        bassline(ost, b0, b1, OST, octave=2)
    ost.dyn(1, 'mf')
    ost.hairpin(47, 51, 'mf', 'f')
    ti.line(1, 'D2:q r:q D2:q r:q | D2:q r:q A2:q A2:q')
    tb.line(3, 'D3:h A3:q B3:q | G#3:h. F#3:q | E3:h Bb3:q C4:q | A3:w | D3:h A3:q B3:q | G#3:h. F#3:q | D3:h F3:q E3:q | C#3:w')
    hn.line(3, 'D4:h A4:q B4:q | G#4:h. F#4:q | E4:h Bb4:q C5:q | A4:w | D4:h A4:q B4:q | G#4:h. F#4:q | D4:h F4:q E4:q | C#4:w')
    tb.dyn(3, 'f')
    hn.dyn(3, 'f')
    v1.line(3, 'D5:q. A4:e D5:q F5:q | E5:q. D5:e Bb4:h | C5:q. D5:e E5:q G5:q | F5:h. r:q |'
               'D5:q. A4:e D5:q F5:q | E5:q. D5:e Bb4:h | Bb4:q. C5:e D5:q G5:q | E5:h C#5:h', octave=1)
    v1.dyn(3, 'mf')
    bassline(cb, 3, 11, 'R:w', octave=1)
    tu.line(3, 'D2:w | Bb1:w | E2:w | D2:w | D2:w | Bb1:w | Bb1:w | A1:w')
    drums(3, 11)

    # B: the head climbs
    hn.line(11, 'D4:q. A3:e D4:q F4:q | Eb4:q. Bb3:e Eb4:q G4:q | F4:q. C4:e F4:q A4:q | G4:q. D4:e G4:q B4:q |'
                'Bb4:q. G4:e D4:h | C#5:q. A4:e E4:h | D5:q. Bb4:e F4:q D5:q | C#5:h E5:h')
    hn.dyn(11, 'f')
    hn.hairpin(15, 19, 'f', 'ff')
    v1.line(11, 'D5:q. A4:e D5:q F5:q | Eb5:q. Bb4:e Eb5:q G5:q | F5:q. C5:e F5:q A5:q | G5:q. D5:e G5:q B5:q |'
                'Bb5:q. G5:e D5:h | C#6:q. A5:e E5:h | D6:q. Bb5:e F5:q D6:q | C#6:h E6:h')
    v1.dyn(11, 'f')
    tb.line(11, 'D3:w | Eb3:w | F3:w | G3:w | G3:w | A3:w | Bb3:w | A3:w')
    tb.dyn(11, 'mf')
    bassline(cb, 11, 19, 'R:h R:h', octave=1)
    drums(11, 19, snare=True)
    roll(ti, 18, 'A2', 4, 60, 100)
    hit(dr, 11, 'crash', vel=60, dur=2)

    # C: hope — the Home theme in Bb on a solo horn
    bassline(ost, 19, 27, 'R:e r:e R:e r:e R:e r:e R:e r:e', octave=2)
    ost.dyn(19, 'p')
    hn.line(19, 'D5:q. C5:e Bb4:h | G5:h. F5:q | Eb5:q. D5:e C5:h | F5:w | D5:q. C5:e Bb4:h | Bb5:h. A5:q | G5:q. F5:e C5:h | Bb4:h A4:h', octave=-1)
    hn.dyn(19, 'mf')
    pad(v1, 19, 27, n=3, low=P('D4'), high=P('D5'))
    v1.dyn(19, 'p')
    v1.hairpin(23, 27, 'p', 'mf')
    arp(hp, 19, 27, '0 1 2 3 4 3 2 1', step=0.5, n=5, low=P('Bb2'), high=P('D5'), length=1.6)
    vc.line(19, 'Bb2:w | Eb3:w | C3:w | F2:w | Bb2:w | G2:w | C3:h F2:h | Bb2:h A2:h')
    vc.dyn(19, 'mp')
    fl.line(23, 'r:w | D6:h. C6:q | Bb5:w | r:h C#6:h')
    fl.dyn(23, 'mp')

    # D: combination — Adventure (major) over the Entity cell resolving
    tp.line(27, ADV_A + ' | ' + ADV_B)
    tp.dyn(27, 'f')
    v1.line(27, ADV_A + ' | ' + ADV_B, octave=1)
    v1.dyn(27, 'f')
    tb.line(27, 'D3:w | A2:h B2:h | G#2:w | A2:w | D3:h. A3:q | B3:w | G#3:h A3:h | D3:w')
    tb.dyn(27, 'f')
    hn.line(27, 'F#4:q. F#4:e F#4:q A4:q | A4:q. F#4:e F#4:h | E4:q. F#4:e A4:q C#5:q | A4:h. D4:e E4:e |'
                'F#4:q. F#4:e F#4:q B4:q | B4:q. G4:e F#4:e E4:e D4:q | B4:q. A4:e G#4:q C#5:q | A4:q. G4:e F#4:h')
    hn.dyn(27, 'f')
    bassline(ost, 27, 35, OST, octave=2)
    ost.dyn(27, 'f')
    bassline(cb, 27, 35, 'R:h R:h', octave=1)
    drums(27, 35)
    hit(dr, 27, 'crash', vel=66, dur=2)
    hit(dr, 31, 'crash', vel=60, dur=2)

    # E: the Entity theme resolved, tutti
    ch.line(35, 'D4+F#4:w | E4+G#4:h D4+A4:h | E4+G#4:w | D4+F#4+A4:w | D4+F#4:w | E4+G#4:h D4+A4:h | D4+F#4:h D4+G#4:h | E4+A4:h C#4+E4+A4:h')
    ch.hairpin(35, 39, 'mp', 'f')
    ch.dyn(39, 'mf')
    ch.hairpin(39, 43, 'mf', 'f')
    v1.line(35, 'D5:h A5:q B5:q | G#5:h A5:h | E5:h B5:q C#6:q | D6:w | D5:h A5:q B5:q | G#5:h A5:h | B5:h D6:q E6:q | E6:h C#6:h')
    v1.dyn(35, 'ff')
    hn.line(35, 'D4:h A4:q B4:q | G#4:h A4:h | E4:h B4:q C#5:q | D5:w | D4:h A4:q B4:q | G#4:h A4:h | B4:h D5:q E5:q | E5:h C#5:h')
    hn.dyn(35, 'ff')
    tp.line(38, 'r:h D5:q F#5:q | A5:w | r:w | r:h. E5:q | A5:w')
    tp.dyn(38, 'f')
    tb.line(35, 'D3:w | D3:h D3:h | C#3:w | D3:w | D3:w | D3:h D3:h | B2:h E3:h | A2:w')
    tb.dyn(35, 'f')
    tu.line(35, 'D2:w | D2:w | C#2:w | D2:w | D2:w | D2:w | B1:h E2:h | A1:w')
    tu.dyn(35, 'f')
    arp(hp, 35, 43, '0 1 2 3 4 3', step=0.5, n=5, low=P('D3'), high=P('D6'), length=1.2)
    hp.dyn(35, 'f')
    ti.line(35, 'D2:q r:h. | r:w | r:w | D2:q r:q A2:q r:q | D2:q r:h. | r:w | r:h E2:q E2:q | A2:q r:h.')
    ti.dyn(35, 'f')
    roll(ti, 42, 'A2', 2, 60, 100, beat=2)
    hit(dr, 35, 'crash', vel=74, dur=4)
    hit(dr, 39, 'crash', vel=70, dur=4)

    # F: the fight goes on — back to D minor
    hn.line(43, 'D4:h A4:q B4:q | G#4:w | r:w | r:w | D4:h A4:q B4:q | G#4:h. F#4:q | F4:w | E4:w')
    hn.dyn(43, 'mf')
    hn.hairpin(47, 51, 'mf', 'f')
    tb.line(47, 'D3:w | D3:w | Bb2:w | A2:w')
    tb.hairpin(47, 51, 'mp', 'f')
    bassline(cb, 43, 51, 'R:w', octave=1)
    for b in range(43, 51):
        hit(dr, b, 'taiko', 0, vel=70 + (b - 43) * 3, dur=1)
        hit(dr, b, 'taiko_s', 2, vel=60 + (b - 43) * 3, dur=0.5)
    roll(ti, 50, 'A2', 4, 50, 100)
    return S
