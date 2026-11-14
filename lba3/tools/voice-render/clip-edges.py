#!/usr/bin/env python3
# VOICE-FLOW (wave 5): where each phrase clip's sound really begins and ends, written into assets/voice/manifest.json
# as `a` (the first 5 ms frame within 40 dB of the clip's loudest) and `e` (the last frame within 35 dB of it, never
# later than the clip's speech mark `sp`), in seconds from the clip's start.
#
#   python3 tools/voice-render/clip-edges.py            (every bank; run after piper-banks.py renders)
#
# Why: the playback (src/engine/voice.js _clips) used to start a clause's clip at the previous clip's `sp` plus the
# planned pause, but a Piper clip's sound ends a median 80-110 ms before `sp` and the next clip's sound starts a median
# 85-110 ms after its own start: every comma became about 0.3 s of silence and every full stop about 0.5 s (measured,
# tools/voice-render/diagnose.mjs). With these edges the silence between two clauses is the planned pause itself.
# Decoded as the game decodes the banks (48 kHz); needs ffmpeg and numpy. Changes nothing else in the manifest.
import json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'voice'))
SR, HOP = 48000, 240   # 5 ms frames

def edges(seg, sp):
    n = len(seg) // HOP
    if n < 2: return 0.0, sp
    env = np.sqrt((seg[:n * HOP].reshape(n, HOP).astype(np.float64) ** 2).mean(1))
    mx = env.max() or 1e-9
    on = np.nonzero(env > mx * 10 ** (-40 / 20))[0]
    off = np.nonzero(env > mx * 10 ** (-35 / 20))[0]
    a = on[0] * HOP / SR if len(on) else 0.0
    e = (off[-1] + 1) * HOP / SR if len(off) else sp
    return a, min(e, sp)

def main():
    global VOICE
    import sys
    if len(sys.argv) > 1: VOICE = sys.argv[1]   # (VOICE-2: assets/voice2, the Expressive banks)
    mfile = os.path.join(VOICE, 'manifest.json')
    man = json.load(open(mfile))
    for bid, b in man['banks'].items():
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(VOICE, b['file']), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, dtype=np.float32)
        gaps = []
        for c in b['clips'].values():
            s = int(round(c['o'] * SR)); seg = x[s:s + int(round(c['d'] * SR))]
            a, e = edges(seg, c['sp'])
            c['a'], c['e'] = round(a, 3), np.floor(e * 1000) / 1000   # (e rounded down: never past sp)
            gaps.append((c['sp'] - e) + a)
        print(f'{bid:13s} {len(b["clips"]):2d} clips, silence the old scheduling added at a join: median {np.median(gaps) * 1000:.0f} ms')
    with open(mfile, 'w') as fh: json.dump(man, fh, separators=(',', ':'))

if __name__ == '__main__':
    main()
