"""Energy Facility — the project station in Funfrock's old fortress, the control room; and (as the synced
"stealth" mix without brass, drums and synth bass) Zoe sneaking through the project office.

Mechanical pulse, building tension. The project drills toward the entity, so the Entity cell is heard in
its troubled harmonisation (Dm6, Bb7, C7/E) — first on a low clarinet, finally on the trombones.
A second idea, the "machine" motif (three repeated notes and a leap), belongs to the project itself.
Electronic colour: a synth bass pulse and a quiet poly-synth arpeggio.

  intro  1-2   ticking + synth pulse
  A      3-10  clarinet: the troubled Entity cell over the pulse and pizzicato
  B     11-18  oboe: the machine motif; viola ostinato and horns join
  C     19-26  a chromatic rising bass (D Eb E F F# G G# A), brass stabs, the cell in horns
  D     27-34  drop: only the pulse, a glassy hum and fragments (stealth-friendly)
  E     35-42  everything: brass chords, timpani, the cell on trombones
  F     43-50  layers fall away back to the opening pulse
"""
from score import Song, P, pad, arp, bassline, roll, hit

VARIANTS = {'_stealth': {'back'}}
GROUP = 'facility'
CELL_T = "D4:h A4:q B4:q | G#4:h. F#4:q | E4:h Bb4:q C5:q | A4:w"


def song():
    S = Song('facility', 536000, title='Energy Facility', role='Project station, control room')
    S.intro_bars, S.body_bars = 2, 48
    S.mix = {'room': {'rt60': 2.0, 'predelay': 0.018, 'bright': 0.45}, 'wet': {'front': 0.22, 'mid': 0.26, 'back': 0.34},
             'lufs': -17.0, 'variant_lufs': {'_stealth': -18.5}}
    S.group = GROUP
    S.chords(1, 'Dm | Dm')
    S.chords(3, 'Dm6 | Bb7 | C7/E | Dm | Dm6 | Bb7 | Gm6/Bb | A7')
    S.chords(11, 'Dm | Dm/C | Bbmaj7 | A7 | Dm | Dm/C | Gm/Bb | A7sus4 A7')
    S.chords(19, 'Dm | Ebmaj7 | Em7b5 | Fmaj7 | F#dim7 | Gm | G#dim7 | A7')
    S.chords(27, 'Dm | Dm | Bb/D | Dm | Dm | Dm | Gm/D | A/D')
    S.chords(35, 'Dm6 | Bb7 | C7/E | Dm | Dm6 | Bb7 | Gm6/Bb | A7')
    S.chords(43, 'Dm | Dm/C | Bbmaj7 | A7 | Dm | Dm | Dm | A7')

    cl = S.part('clarinet', 'clarinet', stem='front', pan=54, vol=94, legato=True, dyn='mp')
    bn = S.part('bassoon', 'bassoon', stem='front', pan=70, vol=92, legato=True, dyn='mp')
    ob = S.part('oboe', 'oboe', stem='front', pan=40, vol=88, dyn='mf')
    va = S.part('violas', 'strings', stem='mid', pan=66, vol=88, dyn='mp')
    vc = S.part('celli', 'cello', stem='mid', pan=80, vol=94, legato=True, dyn='mp')
    pz = S.part('pizz', 'pizz', stem='mid', pan=56, vol=96, dyn='mf')
    sy = S.part('synth', 'polysynth', stem='mid', pan=30, vol=64, dyn='p')
    gl = S.part('hum', 'glass', stem='mid', pan=50, vol=62, dyn='pp')
    hn = S.part('horns', 'horn', stem='back', pan=44, vol=98, legato=True, dyn='mf')
    tb = S.part('trombones', 'trombone', stem='back', pan=82, vol=94, legato=True, dyn='mf')
    sb = S.part('synbass', 'synbass', stem='back', pan=64, vol=88, dyn='mf')
    ti = S.part('timpani', 'timpani', stem='back', pan=62, vol=96, dyn='mf')
    dr = S.part('perc', 'drums', stem='back', pan=60, vol=84, dyn='mf')

    def pulse(b0, b1, vel=0):
        bassline(sb, b0, b1, 'R:e! R:e! R:e! 8:e! R:e! R:e! 5:e! R:e!', octave=1, vel=vel)

    def ticks(b0, b1, v=40):
        for b in range(b0, b1):
            for k in range(8):
                hit(dr, b, 'rim' if k % 2 else 'hh', k * 0.5, vel=v + (8 if k == 0 else 0), dur=0.25)
            hit(dr, b, 'wb_lo', 3.5, vel=v, dur=0.25)

    # intro
    ticks(1, 3, 34)
    pulse(1, 3, vel=-12)

    # A: the troubled cell on a low clarinet
    pulse(3, 11)
    ticks(3, 11)
    cl.line(3, CELL_T + ' | ' + "D4:h A4:q B4:q | G#4:h. F#4:q | D4:h F4:q E4:q | C#4:w")
    cl.hairpin(3, 7, 'mp', 'mf')
    bassline(pz, 3, 11, 'R:q r:q R:q 5:q', octave=2)
    arp(sy, 3, 11, '0 1 2 3 2 1 0 2', step=0.25, n=4, low=P('D4'), high=P('D5'), length=0.2)
    sy.dyn(3, 'pp')

    # B: the machine motif
    pulse(11, 19)
    ticks(11, 19, 44)
    ob.line(11, 'A4:e A4:e A4:e D5:e C5:q A4:q | C5:e C5:e C5:e F5:e D5:h | Bb4:e Bb4:e Bb4:e D5:e C5:q A4:q | E5:h. C#5:q |'
                'A4:e A4:e A4:e D5:e F5:q D5:q | C5:e C5:e C5:e F5:e E5:q C5:q | Bb4:e Bb4:e Bb4:e D5:e G5:q D5:q | D5:h C#5:h')
    ob.dyn(11, 'mf')
    arp(va, 11, 19, '0 1 2 1', step=0.5, n=3, low=P('D4'), high=P('D5'), length=0.35, accent_every=4)
    va.dyn(11, 'mp')
    pad(hn, 11, 19, n=2, low=P('D4'), high=P('A4'))
    hn.hairpin(11, 19, 'p', 'mf')
    vc.line(11, 'D3:w | C3:w | Bb2:w | A2:w | D3:w | C3:w | Bb2:w | A2:w')
    arp(sy, 11, 19, '0 1 2 3 2 1 0 2', step=0.25, n=4, low=P('D4'), high=P('D5'), length=0.2)

    # C: chromatic rise, brass stabs, the cell in horns
    pulse(19, 27, vel=6)
    ticks(19, 27, 48)
    vc.line(19, 'D3:w | Eb3:w | E3:w | F3:w | F#3:w | G3:w | G#3:w | A3:w')
    vc.hairpin(19, 27, 'mp', 'f')
    hn.line(19, CELL_T + ' | ' + "D4:h A4:q B4:q | G#4:h. A4:q | Bb4:h B4:h | C#5:w")
    hn.hairpin(19, 27, 'mf', 'f')
    for b in range(19, 27):
        tb.chord(b, [P('D3'), P('A3')] if b < 23 else [P('F3'), P('C4')], 0.5, beat=2.5, vel=4)
    tb.dyn(19, 'mf')
    arp(va, 19, 27, '0 1 2 1', step=0.5, n=3, low=P('D4'), high=P('D5'), length=0.35, accent_every=4)
    va.hairpin(19, 27, 'mp', 'f')
    roll(ti, 26, 'A2', 4, 50, 96)

    # D: the drop
    pulse(27, 35, vel=-16)
    pad(gl, 27, 35, n=3, low=P('D4'), high=P('D5'))
    gl.hairpin(27, 31, 'pp', 'p')
    bn.line(28, 'r:h A3:q B3:q | G#3:w | r:w | r:h F3:q E3:q | D3:w | r:w | r:h A3:q Bb3:q | A3:w')
    bn.dyn(28, 'mp')
    cl.line(30, 'r:h. A4:e A4:e | A4:e D5:e r:h. ')
    cl.line(34, 'r:h. A4:e A4:e')
    cl.dyn(30, 'p')
    bassline(pz, 27, 35, 'R:q r:h. ', octave=2)
    pz.dyn(27, 'mp')
    for b in range(27, 35):
        hit(dr, b, 'hh', 0, vel=30, dur=0.25)
        hit(dr, b, 'hh', 2, vel=26, dur=0.25)

    # E: everything
    pulse(35, 43, vel=10)
    ticks(35, 43, 52)
    tb.line(35, CELL_T + ' | ' + "D4:h A4:q B4:q | G#4:h. F#4:q | D4:h F4:q E4:q | C#4:w", octave=-1)
    tb.dyn(35, 'f')
    tb.hairpin(39, 43, 'f', 'ff')
    pad(hn, 35, 43, n=3, low=P('D4'), high=P('C5'), restrike=True)
    hn.dyn(35, 'f')
    arp(va, 35, 43, '0 1 2 1', step=0.5, n=3, low=P('D4'), high=P('D5'), length=0.35, accent_every=4)
    va.dyn(35, 'f')
    vc.line(35, 'D3:h D3:h | Bb2:h Bb2:h | E3:h E3:h | D3:h D3:h | D3:h D3:h | Bb2:h Bb2:h | Bb2:h Bb2:h | A2:h A2:h')
    vc.dyn(35, 'f')
    ob.line(35, 'A5:e A5:e A5:e D6:e C6:q A5:q | r:w | Bb5:e Bb5:e Bb5:e D6:e C6:q A5:q | r:w |'
                'A5:e A5:e A5:e D6:e F6:q D6:q | r:w | Bb5:e Bb5:e Bb5:e D6:e G6:q D6:q | E6:h C#6:h')
    ob.dyn(35, 'mf')
    ti.line(35, 'D2:q r:q D2:q r:q | r:w | r:w | D2:q r:q A2:q r:q | D2:q r:q D2:q r:q | r:w | r:w | A2:q A2:q A2:q A2:q')
    ti.dyn(35, 'f')
    hit(dr, 35, 'crash', vel=54, dur=2)
    hit(dr, 39, 'crash', vel=60, dur=2)

    # F: winding down
    pulse(43, 51)
    ticks(43, 47, 42)
    ticks(47, 51, 34)
    ob.line(43, 'A4:e A4:e A4:e D5:e C5:q A4:q | r:w | Bb4:e Bb4:e Bb4:e D5:e C5:h | r:w')
    ob.dyn(43, 'mp')
    cl.line(47, 'D4:h A4:q B4:q | G#4:w | r:w | r:w')
    cl.dyn(47, 'p')
    vc.line(43, 'D3:w | C3:w | Bb2:w | A2:w')
    vc.dyn(43, 'mp')
    pad(gl, 47, 51, n=2, low=P('D4'), high=P('A4'))
    gl.dyn(47, 'pp')
    return S
