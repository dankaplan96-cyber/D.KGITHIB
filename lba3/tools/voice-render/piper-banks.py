#!/usr/bin/env python3
# VOICES-PIPER (the user, 3.11: our own synthesis "sounds monotonous and not varied"; approved: voices made with Piper,
# a free offline neural speech engine, speaking made-up words): renders the phrase banks the game speaks from
# (assets/voice/*.ogg + manifest.json) with Piper and the LibriTTS-R voice model (CC BY 4.0).
#
#   python3 tools/voice-render/piper-banks.py [bank ...]          (no names: every bank)
#   python3 tools/voice-render/piper-banks.py --measure           (the loudness of the banks on disk, nothing written)
#
# Needs: piper-tts (1.3 or later) and onnx (for the phoneme timings the talking mouth follows), sox, ffmpeg with libopus.
# Neither Piper nor the model is part of the game; the game only plays the rendered Ogg Opus files. Where they live:
#   PIPER_SITE   a site-packages folder holding piper (and onnx), when they are not importable already
#   PIPER_MODEL  the voice model (default /dev/shm/pvm/en_US-libritts_r-medium.onnx; its .onnx.json beside it)
#   PIPER_F0     optional {speaker id: median f0 Hz} (default /dev/shm/pg/f0.json); otherwise measured from the bank
#
# Each bank is one speaker's short performances, each clip one connected gesture of made-up words (one to six) in the
# speaker's own sounds, for an intention (tell, cont = a clause that goes on, ask, excl, no = refuse, worry, warm) and a
# length in syllables, a few variants of each. Every clip has its own seeded palette (a few of the speaker's consonants
# and vowels), its own pace and expressiveness around the speaker's, and the punctuation that gives it its tune (a
# question rises, a worry trails off). The playback (src/engine/voice.js) picks the clip of a clause's intention and
# nearest length, never the one just used. The main cast have one bank each; each resident family (people x m/f/kid)
# has three speakers, and a resident always speaks with the same one (a hash of their id picks it).
# The mouth: Piper's phoneme timings give each clip's syllables (onset, vowel, how far the vowel opens the mouth).
# Comfort: the top tamed (a shelf down from 5 kHz, a low-pass at 7.5 kHz), sibilants held down (a de-esser), and of up to
# six renderings of a clip (Piper's performances vary) the first without a hard attack.
# Loudness: every clip to the same speech level, then every bank to the same integrated loudness (EBU R128, as the old
# banks were), soft-limited under -1.5 dBFS. Robots and Mosquibees have no bank and keep the synthesis.
import argparse, glob, json, os, random, re, subprocess, sys, tempfile, zlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LBA3 = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(LBA3, 'assets', 'voice')
MODEL = os.environ.get('PIPER_MODEL', '/dev/shm/pvm/en_US-libritts_r-medium.onnx')
SR = 22050                 # Piper's rate (the medium models)
OUT_SR = 24000             # Opus's own rate nearest to it
BITRATE = '20k'
TARGET_LUFS = -20.0        # integrated loudness of each bank's speech (the old synthesised banks: see --measure)
GAP = 0.03                 # silence between clips in a bank
LEAD, TAIL = 0.03, 0.12    # silence before a clip's first sound, and after its last (plus any room tail)

# ------------------------------------------------------------------------------------------------ who speaks how
# sid: LibriTTS-R speaker; ls: length scale (pace; > 1 slower); ns: expressiveness (noise scale); c, v: the consonants
# and vowels of their made-up words; ps: pitch shift (semitones, sox); room: a subtle room (sox reverb, wet dB).
# mods: per intention, (pace multiplier, ending punctuation(s)).
BASE_MODS = {'tell': (1.0, ['.']), 'cont': (1.0, [',']), 'ask': (1.0, ['?']), 'excl': (0.93, ['!']),
             'no': (0.92, ['.']), 'worry': (1.1, ['...', '?']), 'warm': (1.06, ['.'])}
CAST = {
    # warm, direct, lightly curious; may hesitate ("hm") before answering
    'hero': dict(sid=392, ls=1.0, ns=0.8, c='mlntvsrdk', v=['a', 'e', 'o', 'i'], hm=True),
    # clear and assured, connected; concern sharpens her (quicker, not shriller)
    'zoe': dict(sid=161, ls=0.95, ns=0.9, c='lnmsvrt', v=['e', 'i', 'a', 'ee'], mods={'worry': (0.97, ['?', '...'])}),
    # lively and quick, a comfortable pitch (two semitones up, no more)
    'arthur': dict(sid=693, ls=0.85, ns=0.95, c='bpdtkmn', v=['i', 'a', 'o', 'oo'], ps=2),
    # gathers momentum, then stops short at the awkward part (a comma and a trailing last word in long clips)
    'baldino': dict(sid=441, ls=0.82, ns=1.0, c='bdlnpz', v=['o', 'i', 'a', 'e'], trail=True),
    # measured and persuasive; clipped and decisive when he refuses
    'vesk': dict(sid=637, ls=1.15, ns=0.6, c='vskrtn', v=['e', 'a', 'o'], mods={'no': (0.84, ['.']), 'excl': (0.95, ['.', '!'])}),
    # calm and spacious: a gentle voice, slower, a light pitch shift, a small room (not an echo)
    'sendell': dict(sid=756, ls=1.25, ns=0.7, c='lmnvsh', v=['a', 'e', 'oo', 'ai'], ps=1, room=-10,
                    mods={'excl': (1.05, ['.']), 'no': (1.1, ['.'])}),
    'gilbert': dict(sid=182, ls=1.1, ns=0.75, c='grbdhm', v=['o', 'u', 'a', 'oo']),
    'mira': dict(sid=595, ls=0.92, ns=0.9, c='mlrsvn', v=['a', 'i', 'e', 'ai']),
    # the old harbour master: deep, unhurried
    'doran': dict(sid=413, ls=1.15, ns=0.7, c='brdgmn', v=['o', 'u', 'a'], ps=-1),
}
PEOPLE = {   # each people's sounds
    'quetch': dict(c='mlntvsrdk', v=['a', 'e', 'o', 'i']),
    'grobo': dict(c='bgdmnrh', v=['o', 'u', 'a', 'oo']),
    'bunny': dict(c='pbtlnmk', v=['i', 'e', 'a', 'ee']),
    'esmer': dict(c='szvlnr', v=['e', 'i', 'a', 'ai']),
}
# the families: three speakers each (by median pitch, from the model's speakers), pace and expressiveness, pitch shift
FAMILIES = {
    'quetch-m': dict(people='quetch', sids=[399, 385, 609], ls=1.0, ns=0.8),
    'quetch-f': dict(people='quetch', sids=[77, 434, 665], ls=0.97, ns=0.85),
    'quetch-kid': dict(people='quetch', sids=[378, 539, 301], ls=0.9, ns=0.9, ps=2),
    'grobo-m': dict(people='grobo', sids=[805, 518, 700], ls=1.1, ns=0.75),
    'grobo-f': dict(people='grobo', sids=[714, 119, 791], ls=1.05, ns=0.8),
    'grobo-kid': dict(people='grobo', sids=[280, 322, 567], ls=0.95, ns=0.9, ps=3),
    'bunny-m': dict(people='bunny', sids=[483, 763, 357], ls=0.9, ns=0.9),
    'bunny-f': dict(people='bunny', sids=[420, 833, 707], ls=0.88, ns=0.95),
    'esmer-m': dict(people='esmer', sids=[35, 728, 476], ls=1.05, ns=0.7),
    'esmer-f': dict(people='esmer', sids=[553, 581, 14], ls=1.0, ns=0.75),
}
# the clips: intention -> (lengths in syllables, variants)
OWN_INV = {'tell': ([1, 2, 3, 4, 6, 8, 11], 3), 'cont': ([2, 4, 7], 2), 'ask': ([1, 3, 5, 8], 2), 'excl': ([1, 3, 6], 2),
           'no': ([1, 3, 6], 2), 'worry': ([2, 4, 7], 2), 'warm': ([2, 4, 7], 2)}
FAM_INV = {'tell': ([1, 2, 3, 5, 7, 10], 2), 'cont': ([3, 6], 1), 'ask': ([2, 5], 2), 'excl': ([2, 5], 1),
           'no': ([1, 4], 1), 'worry': ([3, 6], 1), 'warm': ([3, 6], 1)}

F0 = json.load(open(os.environ.get('PIPER_F0', '/dev/shm/pg/f0.json'))) if os.path.exists(os.environ.get('PIPER_F0', '/dev/shm/pg/f0.json')) else {}
def seed_of(*parts): return zlib.crc32('|'.join(map(str, parts)).encode())

# ------------------------------------------------------------------------------------------------ the made-up words
REAL = set('''a i o an am as at be by do go he if in is it me my no of on or so to up us we ma pa mo na la lo me ne ni
mama papa nana dad mom man men lane lone line lean meal mile mine more most moon name nine none note load lead dead
kill sin sex dam damn die dead tit nut not net ten tin ton sit set sat rat rot vat sea see sore sir son sun tea tie
toe two too dino tina dora mona lisa lima rome oslo nice moto data diva viva solo memo demo item into onto also'''.split())
def word(rng, n, cons, vows, first):
    for _ in range(20):
        w = ''
        for i in range(n):
            if not (i == 0 and not first and rng.random() < 0.12):   # now and then a word starting on its vowel
                w += rng.choice(cons)
            w += rng.choice(vows)
        if rng.random() < 0.28: w += rng.choice('nlrs')
        if w.endswith('e') and not w.endswith('ee'): w += 'h'           # (a final e would be silent)
        if w not in REAL: return w
    return w
def gibberish(rng, n, cons, vows, intent, end, trail=False):
    # n syllables in one to six words of one to three syllables
    lo, hi = max(1, -(-n // 3)), min(6, n)
    nw = rng.randint(lo, max(lo, min(hi, lo + 2)))
    sizes = [1] * nw
    for _ in range(n - nw):
        i = rng.choice([k for k in range(nw) if sizes[k] < 3] or [0]); sizes[i] += 1
    words = [word(rng, s, cons, vows, i == 0) for i, s in enumerate(sizes)]
    if intent == 'no' and nw > 1: words[0] += ','                       # "Nah, ..." the refusal first, then why
    elif trail and nw >= 3 and rng.random() < 0.7: words[-2] += ','      # (Baldino: momentum, then the awkward part)
    elif nw >= 4 and rng.random() < 0.5: words[nw // 2 - 1] += ','       # a long one breathes in the middle
    s = ' '.join(words)
    return s[0].upper() + s[1:] + end

# ------------------------------------------------------------------------------------------------ Piper
def load_piper():
    for p in filter(None, os.environ.get('PIPER_SITE', '').split(os.pathsep)): sys.path.insert(0, p)
    for p in glob.glob('/dev/shm/pv/lib/python3*/site-packages') + ['/dev/shm/pvx']:
        if os.path.isdir(p) and p not in sys.path: sys.path.append(p)
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    return PiperVoice.load(MODEL, include_alignments=True), SynthesisConfig

VOWEL = {'a': 'a', 'ɑ': 'a', 'æ': 'a', 'ɐ': 'a', 'ʌ': 'a', 'e': 'e', 'ɛ': 'e', 'ə': 'e', 'ɜ': 'e', 'ɚ': 'e', 'ɝ': 'e', 'ᵻ': 'i',
         'i': 'i', 'ɪ': 'i', 'y': 'y', 'ʏ': 'y', 'o': 'o', 'ɔ': 'o', 'ɒ': 'o', 'u': 'u', 'ʊ': 'u', 'ɯ': 'u', 'ɨ': 'i'}
CONS = {'m': 'm', 'n': 'n', 'l': 'l', 'ɹ': 'r', 'r': 'r', 'ɾ': 'd', 'w': 'w', 'j': 'y', 'v': 'v', 'z': 'z', 's': 's', 'f': 'f',
        'h': 'h', 'b': 'b', 'd': 'd', 'ɡ': 'g', 'g': 'g', 'p': 'p', 't': 't', 'k': 'k', 'ʃ': 's', 'ʒ': 'z', 'θ': 'f', 'ð': 'd',
        'ŋ': 'n', 'ʔ': 't'}
def syllables(al, start):
    # al: [(phoneme, samples)] -> [[t, cd, vd, vk, c, amp]] (seconds from the clip's start; start: samples trimmed)
    # (a stress mark has a duration of its own in Piper's timings: its first half is the onset's, its second the vowel's)
    out, pos, onset, stress, cur, mid = [], 0, None, False, None, None
    for ph, ns in al:
        t0, t1 = (pos - start) / SR, (pos + ns - start) / SR
        pos += ns
        if ph in VOWEL or ph == 'ː':
            if cur is not None and (ph == 'ː' or cur['open']):          # a long vowel or a diphthong goes on
                cur['end'] = t1; continue
            if ph == 'ː': continue
            c = onset or (None, t0)
            cur = dict(t=c[1], v0=min(t0, mid) if mid is not None else t0, end=t1, vk=VOWEL[ph], c=c[0] or '', amp=1.15 if stress else 0.9, open=True)
            out.append(cur); onset, stress, mid = None, False, None
            continue
        if cur is not None: cur['open'] = False
        if ph in ('ˈ', 'ˌ'):
            stress = ph == 'ˈ'; mid = (t0 + t1) / 2
            if onset is None: onset = (None, t0)
            continue
        if ph in CONS:
            if onset is None or onset[0] is None: onset = (CONS[ph], onset[1] if onset else t0)
            continue
        onset, stress, mid = None, False, None   # (a pause: a space, punctuation, the start or the end)
    res = []
    for s in out:
        cd = max(0.0, min(0.12, s['v0'] - s['t'])); t = s['v0'] - cd
        res.append([round(max(0.0, t), 3), round(cd, 3), round(max(0.04, s['end'] - s['v0']), 3), s['vk'], s['c'], s['amp']])
    return res

# a de-esser: the band above 4 kHz is held under a share of the clip's speech level, 5 ms at a time (an "s" stays an
# "s", only softer; the vowels keep their brightness). Under the game's voice compressor (4 ms of attack, then a
# makeup gain) a loud sibilant otherwise came through as a hard, hissing burst.
def deess(x, share=0.12, fc=4000):
    n = 101; k = np.arange(n) - n // 2
    h = np.sinc(2 * fc / SR * k) * (2 * fc / SR) * np.hamming(n); h /= h.sum()       # linear-phase low-pass
    lo = np.convolve(x, h, 'same'); hi = x - lo
    w = int(0.005 * SR); env = np.sqrt(np.convolve(hi * hi, np.ones(w) / w, 'same')) + 1e-9
    g = np.minimum(1.0, share * speech_rms(x) / env)
    g = np.convolve(g, np.hanning(2 * w) / np.hanning(2 * w).sum(), 'same')            # (smoothed: no zipper)
    return (lo + hi * g).astype(np.float32)

def sox(x, args, same_length=True):
    if not args: return x
    p = subprocess.run(['sox', '-q', '-t', 'raw', '-r', str(SR), '-e', 'floating-point', '-b', '32', '-c', '1', '-',
                        '-t', 'raw', '-'] + args, input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    y = np.frombuffer(p.stdout, np.float32).copy()
    return y[:len(x)] if same_length else y

def render(voice, Cfg, spk, text, ls, ns, nw, ps=0, room=None):
    pcm, al = [], []
    for ch in voice.synthesize(text, Cfg(speaker_id=spk, length_scale=ls, noise_scale=ns, noise_w_scale=nw), include_alignments=True):
        a = ch.audio_float_array.astype(np.float32)
        if ch.phoneme_alignments: al += [(x.phoneme, int(x.num_samples)) for x in ch.phoneme_alignments]
        if ch.phoneme_alignments and sum(n for _, n in al[-len(ch.phoneme_alignments):]) < len(a):   # (keep timings in step)
            al.append(('$', len(a) - sum(n for _, n in al[-len(ch.phoneme_alignments):])))
        pcm.append(a)
    x = np.concatenate(pcm)
    # trim to the speech (with LEAD before it), fade the edges
    env = np.convolve(np.abs(x), np.ones(220) / 220, 'same')
    on = np.nonzero(env > env.max() * 0.02)[0]
    a0, a1 = max(0, on[0] - int(0.015 * SR)), min(len(x), on[-1] + int(0.04 * SR))
    x = x[a0:a1]
    f = int(0.005 * SR); x[:f] *= np.linspace(0, 1, f); f = int(0.03 * SR); x[-f:] *= np.linspace(1, 0, f)
    pad = int(LEAD * SR)
    speech = len(x)
    x = np.concatenate([np.zeros(pad, np.float32), x, np.zeros(int(TAIL * SR), np.float32)])
    fx = ['highpass', '70']
    if ps: fx += ['pitch', str(int(ps * 100))]
    # (tame the top: nothing piercing on laptop speakers, and no sharp sample-to-sample steps where the game's voice
    #  compressor, 4 ms of attack, lets a syllable's onset through before it acts)
    fx += ['treble', '-4', '5000', 'lowpass', '7500']
    if room is not None: fx += ['reverb', '18', '60', '25', '0', '8', str(room)]
    y = sox(x, fx)
    if room is not None:                                              # (the room's own short tail, then silence)
        y = y[:len(x)]
        f = int(0.06 * SR); y[-f:] *= np.linspace(1, 0, f)
    y = deess(y)
    syl = syllables(al, a0 - pad) if al else []
    syl = [s for s in syl if s[0] < (pad + speech) / SR]
    return y.astype(np.float32), (pad + speech) / SR, syl

# ------------------------------------------------------------------------------------------------ levels
def speech_rms(x):
    fr = int(0.02 * SR); n = len(x) // fr
    e = (x[:n * fr].reshape(n, fr) ** 2).mean(1)
    keep = e[e > e.max() / 100]
    return float(np.sqrt(keep.mean())) if len(keep) else 1e-6
def lufs(path):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', p.stderr); pk = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', p.stderr)
    return (float(i[-1]) if i else None), (float(pk[-1]) if pk else None)
def soft_limit(x, ceil=10 ** (-1.5 / 20), knee=0.7):
    a = np.abs(x); T = ceil * knee
    over = a > T
    a2 = a.copy(); a2[over] = T + (ceil - T) * np.tanh((a[over] - T) / (ceil - T))
    return np.sign(x) * a2
def median_f0(x):
    fr = int(0.04 * SR); out = []
    rms = np.sqrt((x ** 2).mean()) + 1e-9
    for s in range(0, len(x) - fr, fr * 2):
        w = x[s:s + fr]
        if np.sqrt((w ** 2).mean()) < rms * 0.7: continue
        c = np.correlate(w, w, 'full')[fr - 1:]; lo, hi = int(SR / 450), int(SR / 65)
        k = lo + int(np.argmax(c[lo:hi]))
        if c[k] > 0.3 * c[0]: out.append(SR / k)
    return int(round(float(np.median(out)))) if out else 0

# a clip's hardest attack, as the game's click check measures it (tests/lib/voicelab.js: a sample's second difference
# against the second difference around it, +-5 ms, at 48 kHz), heard through the game's voice bus (audio.js: the
# clip level and the voice slider, a compressor, makeup, a limiter; Web Audio's compressors add a makeup gain of their
# own). A voice onset straight after a stop's silence, or a creaky phrase end lifted by the compressor, can stand out
# like a click; a clip's renderings differ in it.
ATTEMPTS, ATTACK_OK = 6, 6.3
def compress(x, thr, knee, ratio, att, rel, sr=48000):
    B = 48; n = len(x) // B
    pk = np.abs(x[:n * B]).reshape(n, B).max(1)
    env = np.empty(n); e = 0.0; ka, kr = np.exp(-B / (att * sr)), np.exp(-B / (rel * sr))
    for i, v in enumerate(pk):
        e = ka * e + (1 - ka) * v if v > e else kr * e + (1 - kr) * v
        env[i] = e
    def gr(lv):   # dB of gain reduction at a level (soft knee)
        o = lv - thr
        return np.where(o <= -knee / 2, 0, np.where(o >= knee / 2, o * (1 - 1 / ratio), (1 - 1 / ratio) * (o + knee / 2) ** 2 / (2 * knee)))
    g = 10 ** (-gr(20 * np.log10(np.maximum(env, 1e-9))) / 20)
    makeup = (1 / 10 ** (-gr(np.array(0.0)) / 20)) ** 0.6
    g = np.interp(np.arange(len(x)), np.arange(n) * B + B / 2, g) if n else np.ones(len(x))
    return x * g * makeup
def game_bus(y):
    v = y * 0.225 * 0.8 * 2.2                                   # CLIP_LEVEL, the voice slider (0.8) x the bus boost
    v = compress(v, -20, 12, 3.5, 0.004, 0.18) * 2.2             # compressor, makeup
    return compress(v, -4, 4, 12, 0.003, 0.15) * 0.8             # limiter, master
def attack(x):
    y = game_bus(sox(x * (0.1 / speech_rms(x)), ['rate', '-v', '48000'], False).astype(np.float64))
    d2 = np.zeros(len(y)); d2[2:] = y[2:] - 2 * y[1:-1] + y[:-2]
    half = 240; cum = np.concatenate([[0], np.cumsum(d2 * d2)])
    i = np.arange(len(y)); lo = np.maximum(0, i - half); hi = np.minimum(len(y), i + half + 1)
    a = np.abs(d2); loc = np.sqrt(np.maximum(1e-12, (cum[hi] - cum[lo] - a * a) / (hi - lo - 1)))
    return float(np.where(a >= 0.004, a / loc, 0).max())

# ------------------------------------------------------------------------------------------------ a bank
def build_bank(voice, Cfg, bid, spec, inv, people_sounds, family=None):
    clips, parts, lens, nvars, pos = {}, [], {}, {}, 0.0
    mods = {**BASE_MODS, **spec.get('mods', {})}
    def add(cid, x, sp, syl):
        nonlocal pos
        clips[cid] = dict(o=round(pos, 4), d=round(len(x) / SR, 4), sp=round(sp, 4), s=syl or [[LEAD, 0, round(sp - LEAD, 3), 'a', '', 1]])
        parts.extend([x, np.zeros(int(GAP * SR), np.float32)])
        pos += len(x) / SR + GAP
    rendered = []
    for intent, (ls_list, nv) in inv.items():
        lens[intent] = ls_list; nvars[intent] = nv
        pace, ends = mods[intent]
        for n in ls_list:
            for k in range(nv):
                rng = random.Random(seed_of(bid, intent, n, k))
                # this clip's palette: a few of the speaker's consonants and vowels
                cons = rng.sample(people_sounds['c'], min(len(people_sounds['c']), rng.randint(4, 6)))
                vows = rng.sample(people_sounds['v'], min(len(people_sounds['v']), rng.randint(2, 3)))
                text = gibberish(rng, n, cons, vows, intent, ends[k % len(ends)], spec.get('trail') and intent in ('tell', 'excl'))
                ls = spec['ls'] * pace * rng.uniform(0.94, 1.06)
                ns = max(0.4, spec['ns'] + rng.uniform(-0.08, 0.08))
                nw = rng.uniform(0.75, 1.0)
                # (Piper's performances vary from one rendering to the next: of up to six, the first without a hard
                #  attack, else the softest)
                best = None
                for _ in range(ATTEMPTS):
                    r = render(voice, Cfg, spec['sid'], text, ls, ns, nw, spec.get('ps', 0), spec.get('room'))
                    c = attack(r[0])
                    if best is None or c < best[0]: best = (c, r)
                    if c < ATTACK_OK: break
                x, sp, syl = best[1]
                rendered.append((f'{intent}.{n}.{k}', x, sp, syl, text))
    if spec.get('hm'):
        lens['hm'] = [1]; nvars['hm'] = 2
        for k, t in enumerate(['Hmm.', 'Hm...']):
            x, sp, syl = render(voice, Cfg, spec['sid'], t, spec['ls'] * 1.05, 0.6, 0.8, spec.get('ps', 0), spec.get('room'))
            rendered.append((f'hm.1.{k}', x, sp, [[s[0], s[1], s[2], 'm', '', 0.8] for s in syl[:1]] or None, t))
    # every clip to the same speech level (a bank sounds even), then the bank to the target loudness
    for cid, x, sp, syl, text in rendered:
        x *= 0.1 / speech_rms(x)
        add(cid, x, sp, syl)
    pcm = np.concatenate(parts)
    # the speaker's median pitch (the model's speakers measured once, /dev/shm/pg/f0.json style {sid: Hz}), shifted
    f0 = F0.get(str(spec['sid'])) and round(F0[str(spec['sid'])] * 2 ** (spec.get('ps', 0) / 12))
    return dict(pcm=pcm, clips=clips, len=lens, var=nvars, family=family, f0=f0, texts=[r[4] for r in rendered])

def encode(bid, b, man_entry_extra):
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, 'b.f32')
        # level: measure, gain to the target, soft-limit the rare peak
        b['pcm'].astype(np.float32).tofile(wav)
        tmpw = os.path.join(td, 'b.wav')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', wav, tmpw], check=True)
        L, _ = lufs(tmpw)
        g = 10 ** ((TARGET_LUFS - L) / 20)
        pcm = soft_limit(b['pcm'] * g).astype(np.float32)
        pcm.tofile(wav)
        f = bid + '.ogg'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', wav, '-af',
                        'aresample=resampler=soxr', '-ar', str(OUT_SR), '-c:a', 'libopus', '-b:a', BITRATE, '-application', 'voip',
                        '-map_metadata', '-1', os.path.join(OUT, f)], check=True)
    L2, pk = lufs(os.path.join(OUT, f))
    e = dict(file=f, f0=b['f0'] or median_f0(pcm), **man_entry_extra, len=b['len'], var=b['var'], clips=b['clips'])
    return e, L2, pk

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('banks', nargs='*')
    ap.add_argument('--measure', action='store_true')
    a = ap.parse_args()
    mfile = os.path.join(OUT, 'manifest.json')
    if a.measure:
        man = json.load(open(mfile))
        for bid, b in man['banks'].items():
            L, pk = lufs(os.path.join(OUT, b['file'])); print(f'{bid:13s} {L} LUFS, peak {pk} dBFS')
        return
    voice, Cfg = load_piper()
    jobs = []   # (bank id, spec, inventory, sounds, family, entry extras)
    for cid, spec in CAST.items(): jobs.append((cid, spec, OWN_INV, spec, None, {}))
    for fam, fs in FAMILIES.items():
        for i, sid in enumerate(fs['sids']):
            spec = dict(fs, sid=sid)
            jobs.append((f'{fam}-{i + 1}', spec, FAM_INV, PEOPLE[fs['people']], fam, {'family': fam}))
    want = set(a.banks)
    if want: jobs = [j for j in jobs if j[0] in want or (j[4] or '') in want]
    man = json.load(open(mfile)) if os.path.exists(mfile) and want else {}
    man = dict(version=2, sr=OUT_SR, engine='piper', credit='Character voices generated with Piper (offline) using the LibriTTS-R voice model (CC BY 4.0)',
               families={f: [f'{f}-{i + 1}' for i in range(len(s['sids']))] for f, s in FAMILIES.items()},
               speakers={**{k: v['sid'] for k, v in CAST.items()}, **{f'{f}-{i + 1}': s for f, v in FAMILIES.items() for i, s in enumerate(v['sids'])}},
               banks=man.get('banks', {}))
    # the old synthesised banks' files go (a family's bank is now its speakers')
    for bid in list(man['banks']):
        if bid in FAMILIES: del man['banks'][bid]
    for f in FAMILIES:
        p = os.path.join(OUT, f + '.ogg')
        if os.path.exists(p): os.remove(p)
    for bid, spec, inv, sounds, fam, extra in jobs:
        b = build_bank(voice, Cfg, bid, spec, inv, sounds, fam)
        e, L, pk = encode(bid, b, extra)
        man['banks'][bid] = e
        kb = os.path.getsize(os.path.join(OUT, e['file'])) / 1024
        with open(mfile, 'w') as fh: json.dump(man, fh, separators=(',', ':'))   # (after each bank: a stopped run keeps its work)
        print(f'{bid:13s} sid {spec["sid"]:3d} {len(b["clips"]):2d} clips {len(b["pcm"]) / SR:5.1f} s {kb:4.0f} KB {L} LUFS pk {pk} f0 {e["f0"]}  e.g. {b["texts"][3]!r}', flush=True)
    man['banks'] = dict(sorted(man['banks'].items()))
    with open(mfile, 'w') as fh: json.dump(man, fh, separators=(',', ':'))
    tot = sum(os.path.getsize(os.path.join(OUT, b['file'])) for b in man['banks'].values())
    print(f'assets/voice: {len(man["banks"])} banks, {tot / 1048576:.2f} MB + manifest {os.path.getsize(mfile) / 1024:.0f} KB')

if __name__ == '__main__':
    main()
