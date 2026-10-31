"""The three recurring themes of the LBA3 score (original material), in their reference keys.

Every track quotes or develops these; transpose with `shift(text, semitones)`.

1. HOME (family, the house, Zoe and Arthur) — F major, 3/4, lilting.
   Signature: a gentle falling third (mi-re-do, dotted) answered by an upward leap of a sixth that sighs
   back down by step. The second half reaches an octave higher (the family growing) and closes home.

2. ADVENTURE (exploring, travel, victories) — D major, 4/4.
   Signature: the "long-short" dotted step at the start of every bar, a leap up a fourth to the tonic,
   then a rising third — curious and optimistic. The answer climbs higher (to G, then B) and cadences 3-2-1.

3. THE ENTITY (Sendell's charge under the shell, and the project that drills toward it) — D lydian, slow 4/4.
   Signature cell: up a fifth, up a step, down a minor third onto the raised fourth  (D A B G#),
   long-short-short-long. Wonder: lydian harmony over a tonic pedal (D, E/D, C#m7, Dmaj7).
   Troubled: the same cell over minor/ dominant-seventh harmony a tritone away (Dm6, Bb7) with the
   continuation bent by a semitone. Resolved: the raised fourth finally steps up to the fifth (G# -> A).
"""
import re

from score import P

# ---------------------------------------------------------------- 1. HOME (F major, 3/4)
HOME_A = "A4:q. G4:e F4:q | D5:h C5:q | Bb4:q. A4:e G4:q | C5:h."
HOME_A2 = "A4:q. G4:e F4:q | F5:h E5:q | D5:q. C5:e G4:q | F4:h."
HOME_B = "D5:q. E5:e F5:q | E5:h A4:q | D5:q. C5:e Bb4:q | A4:h."
HOME_B2 = "Bb4:q. C5:e D5:q | C5:h F4:q | G4:q. A4:e Bb4:q | C5:h."
HOME_CHORDS_A = "F | Bb | Gm7 | Csus4 C"
HOME_CHORDS_A2 = "F | Dm7 | Gm7 C7 | F"
HOME_CHORDS_B = "Dm | A/C# | Bb | A"
HOME_CHORDS_B2 = "Bb | F/A | Gm7 | C7sus4 C7"

# ---------------------------------------------------------------- 2. ADVENTURE (D major, 4/4)
ADV_A = "D5:q. A4:e D5:q F#5:q | E5:q. D5:e B4:h | C#5:q. D5:e E5:q A5:q | F#5:h. r:q"
ADV_B = "D5:q. A4:e D5:q G5:q | F#5:q. E5:e D5:e C#5:e B4:q | G5:q. F#5:e E5:q A5:q | F#5:q. E5:e D5:h"
ADV_CHORDS_A = "D | A/C# Bm | A | D"
ADV_CHORDS_B = "D G | Bm | Em7 A7 | D"
# the bridge: the head motif sequenced through the relative minor
ADV_C = "B4:q. F#4:e B4:q D5:q | C#5:q. B4:e G4:h | A4:q. B4:e C#5:q E5:q | D5:h C#5:h"
ADV_CHORDS_C = "Bm | Em | A7sus4 A7 | D F#/C#"

# ---------------------------------------------------------------- 3. THE ENTITY (D lydian, 4/4)
ENT_A = "D4:h A4:q B4:q | G#4:h. F#4:q | E4:h B4:q C#5:q | A4:w"
ENT_CHORDS_WONDER = "D | E/D | C#m7 | Dmaj7"
ENT_A_TROUBLED = "D4:h A4:q B4:q | G#4:h. F#4:q | E4:h Bb4:q C5:q | A4:w"
ENT_CHORDS_TROUBLED = "Dm6 | Bb7 | C7/E | Dm"
ENT_A_RESOLVED = "D4:h A4:q B4:q | G#4:h A4:h | E4:h B4:q C#5:q | D5:w"
ENT_CHORDS_RESOLVED = "D | E/D D | C#m7 | D"


def shift(text, semis, prefer_flats=None):
    """Transpose every pitch in a token string by `semis` semitones."""
    names_s = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    names_f = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    names = names_f if prefer_flats else names_s

    def tr(m):
        n = P(m.group(0)) + semis
        return f'{names[n % 12]}{n // 12 - 1}'
    out = []
    for tok in text.split():
        if ':' in tok:
            p, rest = tok.split(':', 1)
            if p != 'r':
                p = '+'.join(re.sub(r'[A-G][#b]*-?\d+', tr, x) for x in p.split('+'))
            out.append(p + ':' + rest)
        else:
            out.append(tok)
    return ' '.join(out)


def shift_chords(text, semis, prefer_flats=True):
    names_s = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    names_f = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    names = names_f if prefer_flats else names_s
    pcs = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

    def tr(m):
        pc = (pcs[m.group(1)] + m.group(2).count('#') - m.group(2).count('b') + semis) % 12
        return names[pc]
    return re.sub(r'(?<![a-z])([A-G])([#b]?)', tr, text)


def rhythm(text, factor):
    """Augment/diminish durations (e.g. 2 = twice as slow). Uses numeric durations."""
    from score import dur_of
    out = []
    for tok in text.split():
        if ':' in tok:
            p, rest = tok.split(':', 1)
            m = re.match(r'([0-9a-z.+/]+)(.*)', rest)
            d = dur_of(m.group(1)) * factor
            out.append(f'{p}:{d:g}{m.group(2)}')
        else:
            out.append(tok)
    return ' '.join(out)
