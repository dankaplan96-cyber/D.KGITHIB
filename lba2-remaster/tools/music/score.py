"""A small, readable score DSL for writing the LBA3 soundtrack in Python.

Music is written by hand as text, bar by bar, e.g.

    fl.line(5, "A4:q. G4:e F4:q | D5:h C5:q | Bb4:q. A4:e G4:q | C5:h.")

Token grammar (space separated, `|` marks a barline and is checked against the meter):
    PITCH[+PITCH...]:DUR[mods]      a note or chord     e.g.  D5:q.   F4+A4+C5:h   Bb3:e!
    r:DUR                           a rest
    DUR   w h q e s x (=32nd)  t (=triplet eighth, 1/3 beat)  qt (=triplet quarter, 2/3 beat)
          a number of quarter notes (1.5), sums with '+' (h+e), '.' dots the value
    mods  !  staccato     -  tenuto      >  accent      ^  marcato (accent + short)
          ~  tie into the next note of the same pitch       (vNN)  explicit velocity offset

Positions are bars (1-based) plus an optional `beat` offset in quarter notes (for pickups).
All times inside the module are in quarter-note beats.

Dynamics: each part has a dynamic curve (velocity units 1..127) set with `dyn()` / `hairpin()`.
"Expressive" instruments (MuseScore_General bank 17 presets) are shaped with CC2 (breath/dynamics)
both by the curve and by a small swell on long notes; other instruments use velocity and CC11.

Everything is deterministic: humanisation uses a seeded generator per part, so re-running a build
produces identical MIDI and audio (which the loop-seam method relies on).
"""
from __future__ import annotations

import itertools
import math
import random
import re
from dataclasses import dataclass, field

import mido

PPQ = 480

DYN = {'pppp': 18, 'ppp': 28, 'pp': 38, 'p': 50, 'mp': 62, 'mf': 76, 'f': 90, 'ff': 104, 'fff': 116}

# name -> (bank, program, expressive)  — MuseScore_General.sf2 (GM layout; bank 17 = CC2 "Expr." presets)
INSTR = {
    'piano': (0, 0, False), 'celesta': (0, 8, False), 'glock': (0, 9, False), 'musicbox': (0, 10, False),
    'vibes': (0, 11, False), 'marimba': (0, 12, False), 'xylo': (0, 13, False), 'tubular': (0, 14, False),
    'dulcimer': (0, 15, False), 'nylon': (0, 24, False), 'harp': (0, 46, False), 'timpani': (0, 47, False),
    'pizz': (0, 45, False), 'kalimba': (0, 108, False), 'acbass': (0, 32, False), 'synbass': (0, 38, False),
    'crystal': (0, 98, False), 'echodrops': (0, 102, False), 'koto': (0, 107, False), 'steeldrum': (0, 114, False),
    'violin': (17, 40, True), 'viola': (17, 41, True), 'cello': (17, 42, True), 'contrabass': (17, 43, True),
    'trem': (17, 44, True), 'strings': (17, 48, True), 'strings_slow': (17, 49, True), 'synstr': (17, 50, True),
    'choir': (17, 52, True), 'oohs': (17, 53, True),
    'trumpet': (17, 56, True), 'trombone': (17, 57, True), 'tuba': (17, 58, True), 'mute_tpt': (17, 59, True),
    'horn': (17, 60, True), 'brass': (17, 61, True),
    'oboe': (17, 68, True), 'ehorn': (17, 69, True), 'bassoon': (17, 70, True), 'clarinet': (17, 71, True),
    'piccolo': (17, 72, True), 'flute': (17, 73, True), 'recorder': (17, 74, True), 'panflute': (17, 75, True),
    'shakuhachi': (17, 77, True), 'ocarina': (17, 79, True),
    'warmpad': (17, 89, True), 'polysynth': (17, 90, True), 'spacevoice': (17, 91, True), 'glass': (17, 92, True),
    'halo': (17, 94, True), 'sweep': (17, 95, True), 'atmos': (17, 99, True), 'star': (17, 103, True),
    'sine': (18, 80, True), 'drums': (128, 48, False),  # orchestra kit (channel 10)
}

# Orchestra kit notes (MuseScore_General 128:48)
KIT = {'bd': 36, 'bd2': 35, 'snare': 38, 'rim': 37, 'crash': 57, 'crash2': 59, 'tamb': 54, 'tri': 81, 'tri_m': 80,
       'wb_hi': 76, 'wb_lo': 77, 'shaker': 82, 'sleigh': 83, 'belltree': 84, 'taiko': 87, 'taiko_s': 86,
       'castanet': 39, 'clave': 75, 'cabasa': 69, 'splash': 55, 'hh': 27, 'hh_open': 29, 'sticks': 31,
       'conga': 63, 'tumba': 64, 'bongo': 61, 'guiro': 73}

_NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def P(name: str) -> int:
    """'C4' -> 60, 'F#3' -> 54, 'Bb2' -> 46."""
    m = re.fullmatch(r'([A-G])([#b]*)(-?\d+)', name.strip())
    if not m:
        raise ValueError(f'bad pitch {name!r}')
    return 12 * (int(m[3]) + 1) + _NAMES[m[1]] + m[2].count('#') - m[2].count('b')


_DUR = {'w': 4.0, 'h': 2.0, 'q': 1.0, 'e': 0.5, 's': 0.25, 'x': 0.125, 't': 1 / 3, 'qt': 2 / 3, 'ht': 4 / 3}


def dur_of(s: str) -> float:
    total = 0.0
    for part in s.split('+'):
        dots = len(part) - len(part.rstrip('.'))
        base = part.rstrip('.')
        v = _DUR[base] if base in _DUR else float(base)
        total += v * (2 - 0.5 ** dots)
    return total


@dataclass
class Tok:
    pitches: list  # midi numbers, [] = rest
    dur: float
    stacc: bool = False
    ten: bool = False
    acc: int = 0
    tie: bool = False


def parse(text: str, transpose: int = 0, meter_beats: float | None = None, first_bar_offset: float = 0.0):
    """Parse a line of tokens into Tok objects (barlines are validated when meter_beats is given)."""
    toks = []
    bar_acc = first_bar_offset
    bar_no = 0
    for raw in text.replace('\n', ' ').replace('|', ' | ').split():
        if raw == '|':
            if meter_beats is not None and abs(bar_acc - meter_beats) > 1e-6 and not (bar_no == 0 and first_bar_offset):
                raise ValueError(f'bar {bar_no + 1} of {text[:40]!r}… has {bar_acc} beats, expected {meter_beats}')
            bar_acc = 0.0
            bar_no += 1
            continue
        m = re.fullmatch(r'([^:]+):([0-9a-z.+/]+)([!\-^>~]*)(?:\(v(-?\d+)\))?', raw)
        if not m:
            raise ValueError(f'bad token {raw!r}')
        p, d, mods, v = m.groups()
        dur = dur_of(d)
        pitches = [] if p == 'r' else [P(x) + transpose for x in p.split('+')]
        t = Tok(pitches, dur, stacc='!' in mods or '^' in mods, ten='-' in mods,
                acc=(10 if '>' in mods else 0) + (14 if '^' in mods else 0) + (int(v) if v else 0), tie='~' in mods)
        toks.append(t)
        bar_acc += dur
    if meter_beats is not None and bar_acc > meter_beats + 1e-6:
        raise ValueError(f'last bar of {text[:40]!r}… has {bar_acc} beats, more than {meter_beats}')
    return toks


def _hash(*xs) -> int:
    h = 1469598103934665603
    for x in xs:
        for c in str(x):
            h = ((h ^ ord(c)) * 1099511628211) & 0xFFFFFFFFFFFF
    return h


@dataclass
class Note:
    beat: float
    pitch: int
    dur: float
    vel: int
    legato: bool = False


def _trim_repeats(out, S):
    """A repeated pitch must be released before it is struck again (a later note-off would cut the new note)."""
    by_pitch = {}
    for k, e in enumerate(out):
        by_pitch.setdefault(e[3], []).append(k)
    for ks in by_pitch.values():
        ks.sort(key=lambda k: out[k][1])
        for a, b in zip(ks, ks[1:]):
            nb, on, off, pi, v = out[a]
            nxt = out[b][1]
            if off > nxt - 0.01:
                out[a] = (nb, on, max(on + 0.01, nxt - 0.012 / S.sec_per_beat(nxt)), pi, v)


class Part:
    def __init__(self, song, name, instr, ch, pan=64, vol=100, stem='mid', human=1.0, legato=False, dyn='mf',
                 swell=True, sustain_pedal=False, art_len=0.92):
        self.song, self.name, self.instr, self.ch = song, name, instr, ch
        self.bank, self.prog, self.expr = INSTR[instr]
        self.pan, self.vol, self.stem = pan, vol, stem
        self.human, self.legato, self.swell, self.pedal = human, legato, swell, sustain_pedal
        self.art_len = art_len
        self.notes: list[Note] = []
        self.ccs: list[tuple[float, int, int]] = []  # (beat, cc, value) explicit
        self.curve: list[tuple[float, float]] = [(0.0, float(DYN[dyn]))]
        self.rng = random.Random(_hash(song.name, name))
        self.mono = True  # becomes False when chords are written (affects CC2 shaping)

    # ---------------------------------------------------------------- dynamics
    def dyn(self, bar, level, beat=0.0):
        b = self.song.pos(bar, beat)
        v = DYN[level] if isinstance(level, str) else float(level)
        self.curve = [c for c in self.curve if c[0] < b - 1e-9] + [(b - 1e-6, self.level(b)), (b, v)]
        self.curve.sort()
        return self

    def hairpin(self, bar0, bar1, lv0, lv1, beat0=0.0, beat1=0.0):
        b0, b1 = self.song.pos(bar0, beat0), self.song.pos(bar1, beat1)
        v0 = DYN[lv0] if isinstance(lv0, str) else float(lv0)
        v1 = DYN[lv1] if isinstance(lv1, str) else float(lv1)
        self.curve = [c for c in self.curve if c[0] < b0 - 1e-9 or c[0] > b1 + 1e-9]
        self.curve += [(b0, v0), (b1, v1)]
        self.curve.sort()
        return self

    def level(self, beat):
        c = self.curve
        if beat <= c[0][0]:
            return c[0][1]
        for (b0, v0), (b1, v1) in zip(c, c[1:]):
            if b0 <= beat <= b1:
                return v0 if b1 - b0 < 1e-9 else v0 + (v1 - v0) * (beat - b0) / (b1 - b0)
        return c[-1][1]

    # ---------------------------------------------------------------- writing
    def line(self, bar, text, beat=0.0, transpose=0, vel=0, legato=None, check=True, octave=0):
        """Write a melodic line starting at bar/beat. Returns the beat after the last token."""
        start = self.song.pos(bar, beat)
        meter = self.song.bar_beats if check else None
        toks = parse(text, transpose + 12 * octave, meter, first_bar_offset=beat if beat else 0.0)
        t = start
        leg = self.legato if legato is None else legato
        pending = {}
        for i, k in enumerate(toks):
            if k.pitches:
                if len(k.pitches) > 1:
                    self.mono = False
                for p in k.pitches:
                    if p in pending:  # continuation of a tie
                        pending[p].dur += k.dur
                        n = pending.pop(p)
                    else:
                        v = self.level(t) + k.acc + vel
                        n = Note(t, p, k.dur, int(v), legato=leg and not k.stacc)
                        n._stacc, n._ten = k.stacc, k.ten
                        self.notes.append(n)
                    if k.tie:
                        pending[p] = n
                    else:
                        n._stacc = getattr(n, '_stacc', False) or k.stacc
                        n._ten = getattr(n, '_ten', False) or k.ten
            t += k.dur
        return t

    def note(self, beat, pitch, dur, vel=None, stacc=False, legato=False):
        p = P(pitch) if isinstance(pitch, str) else pitch
        n = Note(beat, p, dur, int(self.level(beat) if vel is None else vel), legato=legato)
        n._stacc, n._ten = stacc, False
        self.notes.append(n)
        return n

    def chord(self, bar, pitches, dur, beat=0.0, vel=0, stagger=0.0):
        b = self.song.pos(bar, beat)
        self.mono = False
        for i, p in enumerate(pitches):
            n = self.note(b + i * stagger, p, dur - i * stagger, int(self.level(b) + vel))
            n._ten = True
        return b + dur

    def cc(self, bar, num, val, beat=0.0):
        self.ccs.append((self.song.pos(bar, beat), num, int(val)))

    def pedal(self, bar, beat=0.0, down=True):
        self.cc(bar, 64, 127 if down else 0, beat)

    # ---------------------------------------------------------------- realisation
    def realise(self, end_beat):
        """-> (notes, ccs): notes = [(nominal_beat, on, off, pitch, vel)], ccs = [(beat, num, val)],
        after articulation + humanisation. Dynamics CCs are written every 1/8 beat up to end_beat so the
        controller state at any moment depends only on the score at that moment (needed for clean loops)."""
        S = self.song
        out = []
        notes = sorted(self.notes, key=lambda n: (n.beat, n.pitch))
        sd = 0.006 * self.human
        for i, n in enumerate(notes):
            r = random.Random(_hash(S.name, self.name, n.pitch, round(n.beat * 960)))
            dt = max(-0.016, min(0.016, r.gauss(0, sd))) if self.ch != 9 else max(-0.006, min(0.006, r.gauss(0, sd * 0.5)))
            spb = S.sec_per_beat(n.beat)
            on = max(0.0, n.beat + dt / spb)
            if getattr(n, '_stacc', False):
                length = min(n.dur * 0.45, 0.4 / spb)
            elif n.legato:
                length = n.dur + 0.035 / spb
            elif getattr(n, '_ten', False):
                length = n.dur * 0.98
            else:
                length = n.dur * self.art_len if n.dur < 1.5 else n.dur - 0.12 / spb
            off = max(on + 0.02, n.beat + length + dt / spb * 0.5)
            vel = max(1, min(127, int(round(n.vel + r.uniform(-3, 3) * self.human))))
            # quantise to MIDI ticks here, so loop copies (shifted by whole bars) land on exactly the same ticks
            out.append((n.beat, round(on * PPQ) / PPQ, round(off * PPQ) / PPQ, n.pitch, vel))
        _trim_repeats(out, S)
        ccs = list(self.ccs)
        if self.ch != 9:
            ccs += self._dyn_events(2 if self.expr else 11, notes, end_beat)
        return out, ccs

    def _dyn_events(self, num, notes, end_beat):
        step = 0.125
        out = []
        ns = sorted(notes, key=lambda n: n.beat)
        shaped = self.expr and self.mono and self.swell
        idx = 0
        k = 0
        while k * step < end_beat:
            b = k * step
            v = self.level(b)
            if shaped and ns:
                while idx + 1 < len(ns) and ns[idx + 1].beat <= b + 1e-9:
                    idx += 1
                n = ns[idx]
                if n.beat <= b < n.beat + n.dur and n.dur >= 1.0:
                    x = (b - n.beat) / n.dur
                    v *= 0.88 + 0.16 * math.sin(math.pi * min(1.0, x * 1.15)) - 0.06 * max(0.0, x - 0.75) / 0.25
            if not self.expr:
                v = 127 * min(1.0, (v / 104) ** 0.5)  # CC11 is a gentler control: map the curve into its upper range
            out.append((b, num, max(0, min(127, int(round(v))))))
            k += 1
        return out


class Song:
    """A piece: tempo, meter, parts, and the loop layout (intro bars, loop body bars)."""

    def __init__(self, name, tempo_us, meter=(4, 4), title='', role=''):
        self.name, self.title, self.role = name, title, role
        self.num, self.den = meter
        self.bar_beats = self.num * 4 / self.den
        self.tempo_map = [(0.0, tempo_us)]  # (beat, microseconds per quarter)
        self.parts: list[Part] = []
        self.intro_bars = 0
        self.body_bars = 0
        self.loop = True
        self.end_bars = None  # for one-shot pieces: total bars
        self.tail_sec = 7.0
        self.harm = []  # (beat, symbol)
        self._ch = itertools.count()
        self.mix = {}  # render settings (see render.py)

    # -------------------------------------------------------------- time
    def pos(self, bar, beat=0.0):
        return (bar - 1) * self.bar_beats + beat

    def tempo(self, bar, tempo_us, beat=0.0):
        b = self.pos(bar, beat)
        self.tempo_map = [t for t in self.tempo_map if t[0] < b - 1e-9] + [(b, tempo_us)]

    def rit(self, bar0, bar1, us0, us1, steps_per_beat=2, beat0=0.0, beat1=0.0):
        b0, b1 = self.pos(bar0, beat0), self.pos(bar1, beat1)
        n = max(1, int((b1 - b0) * steps_per_beat))
        for i in range(n + 1):
            b = b0 + (b1 - b0) * i / n
            us = us0 + (us1 - us0) * (i / n) ** 1.5
            self.tempo_map = [t for t in self.tempo_map if abs(t[0] - b) > 1e-9] + [(b, int(us))]
        self.tempo_map.sort()

    def sec_per_beat(self, beat):
        us = self.tempo_map[0][1]
        for b, u in self.tempo_map:
            if b <= beat + 1e-9:
                us = u
        return us / 1e6

    def seconds(self, beat):
        t = 0.0
        tm = self.tempo_map + [(1e12, 0)]
        for (b0, us), (b1, _) in zip(tm, tm[1:]):
            if beat <= b0:
                break
            t += (min(beat, b1) - b0) * us / 1e6
        return t

    def sample(self, beat, sr=48000):
        """Exact sample position (Fraction) of a beat, via integer MIDI ticks and the tempo map."""
        from fractions import Fraction
        tk = round(beat * PPQ)
        acc, prev_tk, prev_spt = Fraction(0), None, None
        for b, us in self.tempo_map:
            t = round(b * PPQ)
            if t > tk:
                break
            if prev_tk is not None:
                acc += (t - prev_tk) * prev_spt
            prev_tk, prev_spt = t, Fraction(us * sr, PPQ * 1_000_000)
        return acc + (tk - prev_tk) * prev_spt

    @property
    def body_start(self):
        return self.pos(self.intro_bars + 1)

    @property
    def body_end(self):
        return self.pos(self.intro_bars + self.body_bars + 1)

    @property
    def total_beats(self):
        if self.loop:
            return self.body_end
        return self.pos(self.end_bars + 1)

    # -------------------------------------------------------------- parts
    def part(self, name, instr, **kw):
        if instr == 'drums':
            ch = 9
        else:
            ch = next(self._ch)
            if ch == 9:
                ch = next(self._ch)
        if ch > 15:
            raise ValueError('too many parts for one MIDI file')
        p = Part(self, name, instr, ch, **kw)
        self.parts.append(p)
        return p

    # -------------------------------------------------------------- harmony helpers
    def chords(self, bar, text):
        """Harmony track: 'F | Bb | Gm7 C7 | F' — a bar may hold 1, 2, 3 or 4 symbols (split evenly),
        or explicit durations 'Gm7:h. C7:q'."""
        b = self.pos(bar)
        for bar_txt in text.split('|'):
            syms = bar_txt.split()
            if not syms:
                b += self.bar_beats
                continue
            if any(':' in s for s in syms):
                for s in syms:
                    sym, d = s.split(':')
                    self.harm.append((b, sym))
                    b += dur_of(d)
            else:
                d = self.bar_beats / len(syms)
                for s in syms:
                    self.harm.append((b, s))
                    b += d
        self.harm.sort()

    def chord_at(self, beat):
        cur = None
        for b, s in self.harm:
            if b <= beat + 1e-9:
                cur = s
            else:
                break
        return cur

    def chord_spans(self, b0, b1):
        """[(start, end, symbol)] of the harmony between two beats."""
        pts = sorted(set([b for b, _ in self.harm if b0 < b < b1] + [b0, b1]))
        return [(x, y, self.chord_at(x)) for x, y in zip(pts, pts[1:])]

    # -------------------------------------------------------------- MIDI
    def events(self, parts=None):
        """All note/cc events (beat-based) for the chosen parts, laid out for rendering: loop pieces get
        [intro][body][copy of the first `head` beats of the body], so the loop seam can sit inside the body
        where both passes sound identical (same notes, same controller state, same reverb tail)."""
        parts = parts or self.parts
        out = []
        dyn_end = self.body_end if self.loop else self.total_beats + 8
        for p in parts:
            notes, ccs = p.realise(dyn_end)
            if self.loop:
                B0, B1 = self.body_start, self.body_end
                L, head = B1 - B0, self.head_beats()
                seam = self.loop_points_beats()[0]
                for (nb, on, off, pi, v) in notes:
                    if nb < B0 - 1e-9 and off > B0 + 2 * self.bar_beats:  # short overlaps decay long before the seam
                        print(f'warning: {self.name}/{p.name}: a note from the intro (beat {nb:g}) sustains into the loop body; '
                              f'pass 2 will not have it (seam at beat {seam:g})')
                notes += [(nb + L, on + L, off + L, pi, v) for (nb, on, off, pi, v) in notes if B0 - 1e-9 <= nb < B0 + head]
                ccs += [(b + L, num, val) for (b, num, val) in ccs if B0 - 1e-9 <= b < B0 + head]
                _trim_repeats(notes, self)
            for (nb, on, off, pi, v) in notes:
                out.append((on, p, 'on', (pi, v)))
                out.append((off, p, 'off', (pi,)))
            for (b, num, val) in ccs:
                out.append((b, p, 'cc', (num, val)))
        return sorted(out, key=lambda e: (round(e[0] * PPQ), {'off': 0, 'cc': 1, 'on': 2}[e[2]]))

    def head_beats(self):
        """Beats of the body that are rendered twice (≥ tail_sec, whole bars)."""
        bars = 1
        while self.seconds(self.body_start + bars * self.bar_beats) - self.seconds(self.body_start) < self.tail_sec + 1.5:
            bars += 1
        return bars * self.bar_beats

    def loop_points_beats(self):
        """Seam placed `tail` into the body: loopStart = body_start + seam, loopEnd = body_end + seam."""
        seam = self.head_beats() - self.bar_beats  # leave the last copied bar as look-ahead margin
        return self.body_start + seam, self.body_end + seam

    def render_end_beat(self):
        if self.loop:
            return self.body_end + self.head_beats()
        return self.total_beats

    def write_midi(self, path, parts=None, tail_sec=6.0):
        parts = parts or self.parts
        mf = mido.MidiFile(type=1, ticks_per_beat=PPQ)
        t0 = mido.MidiTrack()
        mf.tracks.append(t0)
        t0.append(mido.MetaMessage('track_name', name=self.title or self.name, time=0))
        t0.append(mido.MetaMessage('time_signature', numerator=self.num, denominator=self.den, time=0))
        last = 0
        for b, us in self.tempo_map:
            tick = round(b * PPQ)
            t0.append(mido.MetaMessage('set_tempo', tempo=int(us), time=tick - last))
            last = tick
        end_beat = self.render_end_beat()
        end_tick = round(end_beat * PPQ) + round(tail_sec / self.sec_per_beat(end_beat) * PPQ)
        t0.append(mido.MetaMessage('end_of_track', time=max(0, end_tick - last)))
        evs = self.events(parts)
        for p in parts:
            tr = mido.MidiTrack()
            mf.tracks.append(tr)
            tr.append(mido.MetaMessage('track_name', name=p.name, time=0))
            msgs = []
            if p.ch != 9:
                msgs += [(0, mido.Message('control_change', channel=p.ch, control=0, value=p.bank)),
                         (0, mido.Message('control_change', channel=p.ch, control=32, value=0)),
                         (0, mido.Message('program_change', channel=p.ch, program=p.prog))]
            else:
                msgs += [(0, mido.Message('program_change', channel=9, program=p.prog))]
            msgs += [(0, mido.Message('control_change', channel=p.ch, control=7, value=p.vol)),
                     (0, mido.Message('control_change', channel=p.ch, control=10, value=p.pan)),
                     (0, mido.Message('control_change', channel=p.ch, control=91, value=0)),
                     (0, mido.Message('control_change', channel=p.ch, control=93, value=0))]
            for (b, pp, k, d) in evs:
                if pp is not p:
                    continue
                tick = max(1, round(b * PPQ))
                if k == 'on':
                    msgs.append((tick, mido.Message('note_on', channel=p.ch, note=d[0], velocity=d[1])))
                elif k == 'off':
                    msgs.append((tick, mido.Message('note_off', channel=p.ch, note=d[0], velocity=0)))
                else:
                    msgs.append((tick, mido.Message('control_change', channel=p.ch, control=d[0], value=d[1])))
            msgs.sort(key=lambda m: (m[0], 0 if m[1].type == 'note_off' else 1 if m[1].type == 'control_change' else 2))
            last = 0
            for tick, m in msgs:
                tr.append(m.copy(time=tick - last))
                last = tick
            # keep the file running to the end (so the renderer keeps the reverb/release tail)
            tr.append(mido.Message('control_change', channel=p.ch, control=110, value=0, time=max(0, end_tick - last)))
        mf.save(path)
        return end_tick


# ------------------------------------------------------------------ harmony / voicing
_Q = {
    '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], 'dim': [0, 3, 6],
    'dim7': [0, 3, 6, 9], 'm7b5': [0, 3, 6, 10], 'sus4': [0, 5, 7], 'sus2': [0, 2, 7], '7sus4': [0, 5, 7, 10],
    'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], '9': [0, 4, 7, 10, 14],
    'maj9': [0, 4, 7, 11, 14], 'm9': [0, 3, 7, 10, 14], 'aug': [0, 4, 8], '7b9': [0, 4, 7, 10, 13], '5': [0, 7],
    'maj7#11': [0, 4, 7, 11, 18], 'm(maj7)': [0, 3, 7, 11], '6/9': [0, 4, 7, 9, 14], 'add2': [0, 2, 4, 7],
}


def parse_chord(sym):
    """'Bbmaj7/D' -> (root_pc, [intervals], bass_pc)."""
    if sym in (None, 'N', 'NC'):
        return None
    main, _, bass = sym.partition('/')
    m = re.fullmatch(r'([A-G][#b]?)(.*)', main)
    root = (_NAMES[m[1][0]] + m[1][1:].count('#') - m[1][1:].count('b')) % 12
    q = m[2]
    if q not in _Q:
        raise ValueError(f'unknown chord quality {sym!r}')
    bpc = root
    if bass:
        bpc = (_NAMES[bass[0]] + bass[1:].count('#') - bass[1:].count('b')) % 12
    return root, _Q[q], bpc


def chord_pcs(sym):
    c = parse_chord(sym)
    return {(c[0] + i) % 12 for i in c[1]} if c else set()


def bass_pc(sym):
    c = parse_chord(sym)
    return c[2] if c else None


def voice(sym, prev=None, n=4, low=P('F3'), high=P('E5'), keep_root=False):
    """Closest-motion voicing of a chord symbol with n voices in [low, high]."""
    root, ivs, _ = parse_chord(sym)
    pcs = [(root + i) % 12 for i in ivs]
    essential = {pcs[1]} if len(pcs) > 1 else set()  # the third (or sus tone)
    if len(pcs) >= 4:
        essential.add(pcs[3])  # 7th / colour tone
    if keep_root:
        essential.add(root)
    cand = [p for p in range(low, high + 1) if p % 12 in pcs]
    best, best_cost = None, 1e9
    for combo in itertools.combinations(cand, n):
        s = set(x % 12 for x in combo)
        if not essential <= s:
            continue
        if len(s) < min(n, len(pcs)) - (1 if len(pcs) > n else 0):
            continue
        if any(b - a > 12 for a, b in zip(combo[1:], combo[2:])):
            continue
        if any(b - a < 1 for a, b in zip(combo, combo[1:])):
            continue
        thirds = sum(1 for x in combo if x % 12 == pcs[1]) if len(pcs) > 1 else 0
        cost = 3 * max(0, thirds - 1)
        if prev:
            cost += sum(abs(a - b) for a, b in zip(sorted(prev), combo))
        else:
            mid = (low + high) / 2
            cost += sum(abs(x - mid) for x in combo) * 0.3
        if len(combo) > 1 and combo[1] - combo[0] < 3 and combo[0] < P('C4'):
            cost += 4  # muddy close voicing low down
        if cost < best_cost:
            best, best_cost = combo, cost
    if best is None:
        # too few chord tones in the range: widen it a little, then thin the voicing
        if high - low < 24:
            return voice(sym, prev, n, low - 3, high + 3, keep_root)
        if n > 2:
            return voice(sym, prev, n - 1, low, high, keep_root)
        raise ValueError(f'cannot voice {sym} in range')
    return list(best)


def pad(part, bar0, bar1, n=4, low=P('F3'), high=P('E5'), vel=0, restrike=False, prev=None, beat0=0.0, beat1=0.0):
    """Sustained chords following the song's harmony, with smooth voice leading (common tones held)."""
    S = part.song
    b0, b1 = S.pos(bar0, beat0), S.pos(bar1, beat1)
    part.mono = False
    held = {}
    for (x, y, sym) in S.chord_spans(b0, b1):
        if not sym or sym == 'N':
            for p, nt in held.items():
                nt.dur = x - nt.beat
            held = {}
            continue
        v = voice(sym, prev, n, low, high)
        new = {}
        for p in v:
            if p in held and not restrike:
                held[p].dur = y - held[p].beat
                new[p] = held[p]
            else:
                nt = part.note(x, p, y - x, int(part.level(x) + vel))
                nt._ten = True
                new[p] = nt
        held = new
        prev = v
    return prev


def arp(part, bar0, bar1, pattern, step=0.5, n=4, low=P('C4'), high=P('C6'), vel=0, accent_every=None, length=None,
        beat0=0.0, beat1=0.0, prev=None):
    """Broken-chord figure: `pattern` indexes the voiced chord tones (0 = lowest); 'r' rests.
    The pattern restarts with every chord change and wraps within it."""
    S = part.song
    b0, b1 = S.pos(bar0, beat0), S.pos(bar1, beat1)
    pat = pattern.split() if isinstance(pattern, str) else pattern
    for (x, y, sym) in S.chord_spans(b0, b1):
        if not sym or sym == 'N':
            continue
        v = voice(sym, prev, n, low, high)
        prev = v
        k = 0
        t = x
        while t < y - 1e-6:
            tok = pat[k % len(pat)]
            if tok != 'r':
                octv = 0
                while tok.endswith("'"):
                    octv += 12
                    tok = tok[:-1]
                p = v[int(tok) % len(v)] + octv + (12 * (int(tok) // len(v)))
                acc = 6 if (accent_every and k % accent_every == 0) else 0
                part.note(t, p, length or step * 1.6, int(part.level(t) + vel + acc))
            k += 1
            t += step
    return prev


def bassline(part, bar0, bar1, pattern='R:w', octave=2, vel=0, beat0=0.0, beat1=0.0):
    """Bass from the harmony: pattern tokens R (bass note), 5 (fifth above), 8 (octave), L (fifth below)
    with durations, e.g. 'R:q. 5:e R:h'. Repeats per chord span."""
    S = part.song
    b0, b1 = S.pos(bar0, beat0), S.pos(bar1, beat1)
    toks = []
    for t in pattern.split():
        d, _, dd = t.partition(':')
        toks.append((d.rstrip('!'), dur_of(dd.rstrip('!')), d.endswith('!') or dd.endswith('!')))
    for (x, y, sym) in S.chord_spans(b0, b1):
        if not sym or sym == 'N':
            continue
        bp = bass_pc(sym)
        root = parse_chord(sym)[0]
        base = 12 * (octave + 1) + bp
        if base < P('E1'):
            base += 12
        t, k = x, 0
        while t < y - 1e-6:
            d, dur, st = toks[k % len(toks)]
            dur = min(dur, y - t)
            if d != 'r':
                p = {'R': base, '5': 12 * (octave + 1) + (root + 7) % 12, '8': base + 12, 'L': base - 5,
                     '3': 12 * (octave + 1) + (root + (3 if 3 in parse_chord(sym)[1] else 4)) % 12}[d]
                if d == '5' and p < base:
                    p += 12
                n = part.note(t, p, dur, int(part.level(t) + vel), stacc=st)
            t += dur
            k += 1


def roll(part, bar, pitch, beats, v0, v1, beat=0.0, rate=0.125):
    """Tremolo roll (timpani / cymbal / snare): repeated strokes with a velocity ramp."""
    S = part.song
    b = S.pos(bar, beat)
    p = KIT[pitch] if pitch in KIT else (P(pitch) if isinstance(pitch, str) else pitch)
    n = int(round(beats / rate))
    for k in range(n):
        x = k / max(1, n - 1)
        part.note(b + k * rate, p, rate * 1.5, int(v0 + (v1 - v0) * x + (3 if k % 2 else 0)))
    return b + beats


def hit(part, bar, name, beat=0.0, vel=80, dur=1.0):
    """One percussion stroke (orchestra kit name from KIT, or a pitch)."""
    p = KIT[name] if name in KIT else P(name)
    return part.note(part.song.pos(bar, beat), p, dur, vel)
