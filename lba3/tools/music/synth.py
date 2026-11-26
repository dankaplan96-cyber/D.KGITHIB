"""Sample-accurate rendering with libfluidsynth (ctypes), bypassing FluidSynth's MIDI-file player.

Why: the file player turns its sample clock into milliseconds and ticks; at large absolute times its event
timing drifts by a block now and then, so two identical passes of a loop (pass 1 near the start of the
file, pass 2 a couple of minutes later) do not render identically. Here every event is placed on a fixed
64-sample grid (FluidSynth's internal block) computed from the score's own tempo map, and the synth is
driven block by block — the same events always produce the same samples, wherever they are in the file.
"""
import ctypes
import ctypes.util
import math
from fractions import Fraction

import numpy as np

BLOCK = 64
_lib = None


def lib():
    global _lib
    if _lib is None:
        name = ctypes.util.find_library('fluidsynth') or 'libfluidsynth.so.3'
        L = ctypes.CDLL(name)
        L.new_fluid_settings.restype = ctypes.c_void_p
        L.new_fluid_synth.restype = ctypes.c_void_p
        L.new_fluid_synth.argtypes = [ctypes.c_void_p]
        L.fluid_settings_setnum.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_double]
        L.fluid_settings_setint.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
        L.fluid_settings_setstr.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
        L.fluid_synth_sfload.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
        L.fluid_synth_set_gain.argtypes = [ctypes.c_void_p, ctypes.c_float]
        for fn in ('fluid_synth_noteon', 'fluid_synth_cc', 'fluid_synth_program_select'):
            getattr(L, fn).restype = ctypes.c_int
        L.fluid_synth_noteon.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        L.fluid_synth_noteoff.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int]
        L.fluid_synth_cc.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        L.fluid_synth_program_select.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        L.fluid_synth_write_float.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p, ctypes.c_int, ctypes.c_int,
                                              ctypes.c_void_p, ctypes.c_int, ctypes.c_int]
        L.delete_fluid_synth.argtypes = [ctypes.c_void_p]
        L.delete_fluid_settings.argtypes = [ctypes.c_void_p]
        _lib = L
    return _lib


_sf_cache = {}


def render(song, parts, sf2, sr=48000, gain=0.45, tail_sec=6.0):
    """Render the given parts of a score.Song -> float64 array (n, 2)."""
    L = lib()
    st = L.new_fluid_settings()
    L.fluid_settings_setnum(st, b'synth.sample-rate', float(sr))
    L.fluid_settings_setint(st, b'synth.reverb.active', 0)
    L.fluid_settings_setint(st, b'synth.chorus.active', 0)
    L.fluid_settings_setint(st, b'synth.polyphony', 1024)
    L.fluid_settings_setint(st, b'synth.cpu-cores', 1)
    L.fluid_settings_setstr(st, b'synth.midi-bank-select', b'gs')
    syn = L.new_fluid_synth(st)
    sfid = L.fluid_synth_sfload(syn, sf2.encode(), 1)
    if sfid < 0:
        raise RuntimeError('cannot load soundfont ' + sf2)
    L.fluid_synth_set_gain(syn, gain)
    for p in parts:
        L.fluid_synth_program_select(syn, p.ch, sfid, p.bank, p.prog)
        for num, val in ((7, p.vol), (10, p.pan), (91, 0), (93, 0)):
            L.fluid_synth_cc(syn, p.ch, num, val)
    evs = []
    for (b, p, k, d) in song.events(parts):
        s = math.floor(song.sample(b, sr) / BLOCK + Fraction(1, 2)) * BLOCK
        order = {'off': 0, 'cc': 1, 'on': 2}[k]
        evs.append((s, order, p.ch, k, d))
    evs.sort(key=lambda e: (e[0], e[1]))
    end_beat = song.render_end_beat()
    total = int(np.ceil((song.seconds(end_beat) + tail_sec) * sr / BLOCK)) * BLOCK
    out = np.zeros((total, 2), dtype=np.float32)
    left = np.zeros(BLOCK * 256, dtype=np.float32)
    right = np.zeros(BLOCK * 256, dtype=np.float32)
    pos = 0

    def run(upto):
        nonlocal pos
        while pos < upto:
            n = min(upto - pos, left.shape[0])
            L.fluid_synth_write_float(syn, n, left.ctypes.data, 0, 1, right.ctypes.data, 0, 1)
            out[pos:pos + n, 0] = left[:n]
            out[pos:pos + n, 1] = right[:n]
            pos += n

    for (s, _, ch, k, d) in evs:
        run(min(s, total))
        if k == 'on':
            L.fluid_synth_noteon(syn, ch, d[0], d[1])
        elif k == 'off':
            L.fluid_synth_noteoff(syn, ch, d[0])
        else:
            L.fluid_synth_cc(syn, ch, d[0], d[1])
    run(total)
    L.delete_fluid_synth(syn)
    L.delete_fluid_settings(st)
    return out.astype(np.float64)
