#!/usr/bin/env python3
"""R5-OPENING: reads realtime.mjs's log.json (the opening played on the wall clock) and prints
- the frame rate the page drew at (frame intervals), and how far the scene clock was from the music cue
- per subtitle: when it showed and went (wall clock and scene clock) against its scheduled time and length, how long the
  CSS fade took to bring it to full opacity and back, and how long it was readable at full opacity
- per spoken line: the babble's syllables (voice.js): how many, the first one after the text appeared, the last one
  against the end of the line (scheduled on the audio clock), and the longest gap
   python3 rt_analyze.py <log.json>
"""
import json, sys

L = json.load(open(sys.argv[1]))
F, S, Y, D = L['frames'], L['subs'], L['syl'], L['def']
dts = sorted(f['dt'] for f in F[1:] if f['state'] == 'cinematic' and not f['paused'])
q = lambda a, p: a[min(len(a) - 1, int(len(a) * p))]
print(f'frames {len(F)}, wall {L.get("wallSeconds", 0):.0f} s from the click; frame interval p50 {q(dts, .5)*1000:.0f} ms, p95 {q(dts, .95)*1000:.0f} ms, max {dts[-1]*1000:.0f} ms (~{1/q(dts, .5):.1f} fps)')
errs = [f['t'] - f['cue'] for f in F if f['cue'] is not None and f['t'] > 3.5 and not f['paused']]
if errs:
    ae = sorted(abs(e) for e in errs)
    print(f'scene clock vs music cue: median |err| {q(ae, .5)*1000:.0f} ms, p95 {q(ae, .95)*1000:.0f} ms, max {ae[-1]*1000:.0f} ms ({len(errs)} frames)')
print('paused frames', sum(1 for f in F if f['paused']))
print()
print(' # line                         sched t  d    shown@t  gone@t  | fade-in  full-opacity  fade-out (wall s) | syll first  last-vs-end  max-gap')
for i, d in enumerate(D):
    txt = d['text']
    on = next((s for s in S if s['show'] and txt in s['text']), None)
    # gone: the first change after `on` where the element no longer shows this text
    off = None
    if on:
        for s in S:
            if s['w'] > on['w'] and (not s['show'] or txt not in s['text']): off = s; break
    fr = [f for f in F if on and on['w'] <= f['w'] <= (off['w'] + 0.6 if off else 1e18)]
    full = [f for f in fr if f['sub'] >= 0.99 and f['subI'] == i]
    fin = (full[0]['w'] - on['w']) if (on and full) else None
    fout = None
    if off:
        z = next((f for f in F if f['w'] >= off['w'] and f['sub'] <= 0.01), None)
        if z: fout = z['w'] - off['w']
    readable = (full[-1]['w'] - full[0]['w']) if len(full) > 1 else 0
    sy = [y for y in Y if y['line'] == txt[:24]]
    first = (sy[0]['w'] - on['w']) if (sy and on) else None
    gaps = [b['a'] - a['a'] for a, b in zip(sy, sy[1:]) if a['a'] is not None and b['a'] is not None]
    # the line's end on the audio clock: the audio time at the moment the subtitle went
    endA = None
    if off:
        ff = next((f for f in F if f['w'] >= off['w']), None)
    lastVs = (sy[-1]['t'] - (d['t'] + d['d'])) if sy else None
    print(f'{i:2d} {txt[:28]:28s} {d["t"]:6.2f} {d["d"]:4.1f}  ' + (f'{on["t"]:6.2f}' if on else '   -  ') + '  ' + (f'{off["t"]:6.2f}' if off else '   -  ')
          + '  | ' + (f'{fin:5.2f}' if fin is not None else '  -  ') + f'    {readable:5.2f}       ' + (f'{fout:5.2f}' if fout is not None else '  -  ')
          + f'        | {len(sy):3d}  ' + (f'{first:5.2f}' if first is not None else '  -  ') + '  ' + (f'{lastVs:+6.2f}' if lastVs is not None else '   -  ')
          + '       ' + (f'{max(gaps):4.2f}' if gaps else '  - '))
print('\n(scene-clock columns: when the page showed / dropped the line; last-vs-end: the last syllable against the scheduled end, scene seconds; max-gap: the longest pause between syllables on the audio clock)')
print('end:', L.get('end'))
