#!/usr/bin/env python3
# VOICE-2 (the user, 14.11: "the voices resemble English, but sound monotonous, robotic and excessively deep; they
# lack expression and natural phrasing"): the phrase banks of the Expressive voices (assets/voice2/*.ogg +
# manifest.json), made offline with Piper and the LibriTTS-R voice model (CC BY 4.0), as VOICES-PIPER's banks were
# (tools/voice-render/piper-banks.py, kept for the Classic voices in assets/voice).
#
#   python3 tools/voice-render/piper-expressive.py [bank ...]        (no names: every bank)
#   python3 tools/voice-render/piper-expressive.py --preview <dir> bank   (a few clips as WAV with their scores)
#
# Needs: piper-tts, praat-parselmouth (pitch analysis and PSOLA), numpy, sox, ffmpeg with libopus. PIPER_SITE,
# PIPER_MODEL as piper-banks.py. Neither Piper nor the model is part of the game: the game plays the Ogg Opus files.
#
# What is new against the Classic banks:
#   1. A fictional language of its own, not near-English nonsense: the made-up words are written as phonemes, not
#      letters (Piper's [[ ]] input), so no English spelling rules turn them into English diphthongs (o -> "oh-oo",
#      a -> "ay"): open syllables, pure vowels (a e i o u as in Italian), each people's own consonants and vowels, few
#      closing consonants, no harsh clusters. Words that are English are rejected.
#   2. The brief's intentions, each performed, not randomised: neutral (tell), a clause that goes on (cont), curious
#      (ask), uncertain (unsure: a short "mm" or "eh" and a pause first), pleased (warm, some with a released breath
#      first), concerned (worry), urgent (excl), annoyed (no). Each sets the punctuation that gives Piper its tune,
#      the pace, Piper's expressiveness, and which word carries the accent (early or late, by the stress marks).
#   3. Each clip is the best of several renderings for its intention, measured (pitch track, loudness, timing): a
#      curious question that does not rise or peak, an urgent one no higher than a neutral one, a pleased one with a
#      flat melody, a hard attack, a squeak: not chosen. The accent each clip actually carries is measured and written
#      to the manifest, so the game can pick the clip whose accent sits where the line's emphasis is.
#   4. Pitch: speakers chosen nearer each character's age and build (Twinsen a young man, about 160 Hz, not 130;
#      Vesk measured, not a 90 Hz rumble), and where a speaker is moved, by PSOLA (praat's Change gender, formants
#      kept) by at most about two semitones, not by sox's resampling pitch shift that moves the formants too. A
#      speaker whose melody is narrow is widened a little the same way (the range factor), the whole contour at once.
#   5. Lighter on the top-end filtering than the Classic banks (air above 3 kHz is part of a natural voice), a gentle
#      high-pass under each voice's own floor so a deep voice does not boom.
import argparse, importlib.util, json, os, random, re, subprocess, sys, tempfile, zlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LBA3 = os.path.normpath(os.path.join(HERE, '..', '..'))
spec_ = importlib.util.spec_from_file_location('pb', os.path.join(HERE, 'piper-banks.py'))
PB = importlib.util.module_from_spec(spec_); spec_.loader.exec_module(PB)
for p in filter(None, os.environ.get('PIPER_SITE', '/dev/shm/pvx').split(os.pathsep)):
    if p not in sys.path: sys.path.insert(0, p)
import parselmouth
from parselmouth.praat import call

OUT = os.path.join(LBA3, 'assets', 'voice2')
SR = PB.SR
TARGET_LUFS = -20.0
GAP, LEAD, TAIL = 0.03, 0.03, 0.12

# ------------------------------------------------------------------------------------------------ the language
# consonant letters -> phonemes (all of them English phonemes the model knows; a flap for d between vowels)
IC = {'m': 'm', 'n': 'n', 'l': 'l', 'r': 'ɹ', 'v': 'v', 'd': 'd', 't': 't', 's': 's', 'k': 'k', 'b': 'b', 'g': 'ɡ', 'p': 'p',
      'z': 'z', 'h': 'h', 'w': 'w', 'y': 'j', 'f': 'f', 'sh': 'ʃ'}
# pure vowels: stressed long, unstressed short (never reduced to a schwa: the words keep their colour)
IVS = {'a': 'ɑː', 'e': 'ɛ', 'i': 'iː', 'o': 'ɔː', 'u': 'uː'}
IVU = {'a': 'ɑ', 'e': 'ɛ', 'i': 'i', 'o': 'ɔ', 'u': 'ʊ'}
# each people's sounds (consonants, vowels, closing consonants, how often a word closes)
PEOPLE = {
    'quetch': dict(c='mnlvdtsrk', v='aeoi', coda='nls', cp=0.18),
    'grobo': dict(c='bgdmnrhl', v='oauo', coda='mnr', cp=0.25),
    'bunny': dict(c='pbtlnmkv', v='ieaio', coda='n', cp=0.1),
    'esmer': dict(c='szvlnrh', v='eiaeo', coda='ls', cp=0.15),
}
# English words and near-words to avoid (by their letters)
REAL = set('''a i o an am as at be by do go he if in is it me my no of on or so to up us we ma pa mo na la lo ne ni
mama papa nana dad mom man men lane lone line lean meal mile mine more most moon name nine none note load lead dead
kill sin sex dam die tit nut not net ten tin ton sit set sat rat rot vat sea see sore sir son sun tea tie toe two too
dino tina dora mona lisa lima rome oslo nice moto data diva viva solo memo demo item into onto also bomb rib nob mob
tomato potato hello sorry tell well bell dell sell nell mall ball doll dull kid kit kin kim bob bon ben bin den don
tom tim tam sam mat met mit mad mud bad bed bid bud god gun sun sad seed need deed mood good food boom doom room lol
naan nanny lolly molly dolly holly sally tally rally mammy daddy'''.split())

def word(rng, n, P, first, coda_p):
    for _ in range(30):
        w = []
        prev = ''
        for i in range(n):
            c = '' if (i == 0 and not first and rng.random() < 0.15) else rng.choice(P['c'])
            if c == prev: c = P['c'][(P['c'].index(c) + 1) % len(P['c'])]
            v = rng.choice(P['v'])
            w.append((c, v)); prev = c
        coda = rng.choice(P['coda']) if rng.random() < coda_p else ''
        letters = ''.join(c + v for c, v in w) + coda
        if letters not in REAL and not any(letters.startswith(r) and len(r) >= 4 for r in REAL): return w, coda
    return w, coda

# a phrase of n syllables: [(word syllables, coda)], the stressed syllable of each word (first, or second of a long word)
def phrase(rng, n, P):
    lo, hi = max(1, -(-n // 3)), min(6, n)
    nw = rng.randint(lo, max(lo, min(hi, lo + 2)))
    sizes = [1] * nw
    for _ in range(n - nw):
        i = rng.choice([k for k in range(nw) if sizes[k] < 3] or [0]); sizes[i] += 1
    return [word(rng, s, P, i == 0, P['cp']) + (0 if s < 3 or rng.random() < 0.7 else 1,) for i, s in enumerate(sizes)]

# the phrase as phonemes: the accented word's stress primary, the others secondary (a one-syllable word between two
# others unmarked), the punctuation that gives it its tune; `pre`: a hesitation or a breath before it, `mid`: a comma
# after this word (a long one breathes in the middle)
def ipa(words, acc, end, pre='', mid=-1):
    out = []
    for wi, (syls, coda, st) in enumerate(words):
        s = ''
        for si, (c, v) in enumerate(syls):
            stressed = si == st
            mark = ('ˈ' if wi == acc else ('ˌ' if len(syls) > 1 or wi in (0, len(words) - 1) else '')) if stressed else ''
            cc = IC.get(c, '')
            if c in ('d', 'r') and si > 0 and not stressed: cc = 'ɾ'   # (between vowels a light tap, not the English r)
            s += cc + mark + (IVS[v] if stressed else IVU[v])
        s += IC.get(coda, '')
        out.append(s + (',' if wi == mid else ''))
    return '[[ ' + pre + ' '.join(out) + end + ' ]]'

# ------------------------------------------------------------------------------------------------ the intentions
# pace (length scale multiplier), expressiveness (noise scale added), timing freedom (noise w), endings (by variant),
# accent (where the main stress goes: 'late' the last word, 'early' the first, 'both' alternate by variant),
# pre: what may come before (hesitation, breath), and the measured shape a rendering is chosen for (score())
INT = {
    'tell':   dict(pace=1.0, ns=0.0, nw=0.85, ends=['.'], acc='both'),
    'cont':   dict(pace=0.97, ns=-0.03, nw=0.8, ends=[','], acc='late'),
    'ask':    dict(pace=1.0, ns=0.05, nw=0.85, ends=['?'], acc='both'),
    'unsure': dict(pace=1.12, ns=0.03, nw=1.0, ends=['...', '?'], acc='late', pre=['ʌːm, ', 'ɛː... ', 'hmː, ']),
    'warm':   dict(pace=1.04, ns=0.08, nw=0.85, ends=['.', '!'], acc='both', pre=['', 'hɑː, ']),
    'worry':  dict(pace=1.08, ns=-0.04, nw=0.9, ends=['...', '.'], acc='late'),
    'excl':   dict(pace=0.9, ns=0.1, nw=0.75, ends=['!'], acc='both'),
    'no':     dict(pace=0.92, ns=-0.08, nw=0.6, ends=['.', '!'], acc='early'),
}
# the clips: intention -> (lengths in syllables, variants); variants alternate the accent where 'both'
OWN_INV = {'tell': ([1, 2, 3, 4, 5, 6, 8, 10, 12], 4), 'cont': ([2, 3, 4, 6, 8, 10], 2), 'ask': ([1, 2, 3, 4, 6, 8, 10], 4),
           'unsure': ([2, 3, 5, 7, 10], 2), 'warm': ([1, 2, 3, 5, 7, 10], 3), 'worry': ([2, 3, 5, 7, 10], 2),
           'excl': ([1, 2, 3, 5, 7, 10], 3), 'no': ([1, 2, 3, 5, 7, 10], 2)}
FAM_INV = {'tell': ([1, 2, 3, 5, 7, 10], 2), 'cont': ([3, 6], 1), 'ask': ([2, 4, 7], 2), 'unsure': ([3, 6], 1),
           'warm': ([2, 4, 7], 1), 'worry': ([3, 6], 1), 'excl': ([2, 5], 1), 'no': ([2, 5], 1)}

# ------------------------------------------------------------------------------------------------ who speaks how
# sid: LibriTTS-R speaker; f0: the median pitch the voice is brought to (PSOLA, only when the speaker is more than
# 0.7 semitone off, at most 2.5); rf: the melody's range factor (1 = the speaker's own); ls: pace (> 1 slower);
# ns: expressiveness; hp: high-pass (Hz); people / c / v: the sounds; hm: Twinsen's "hm"; trail: Baldino's beat.
CAST = {
    'hero':    dict(sid=None, f0=158, rf=1.1, ls=0.98, ns=0.75, hp=85, people='quetch', c='mnlvdtsk', v='aeoi', hm=True),
    'zoe':     dict(sid=None, f0=218, rf=1.1, ls=0.95, ns=0.8, hp=110, people='quetch', c='lnmsvrt', v='eiae'),
    'arthur':  dict(sid=None, f0=262, rf=1.05, ls=0.88, ns=0.85, hp=130, people='quetch', c='bpdtkmn', v='iaoe'),
    'baldino': dict(sid=None, f0=142, rf=1.15, ls=0.86, ns=0.9, hp=85, people='grobo', c='bdlnpz', v='oiae', trail=True),
    'vesk':    dict(sid=None, f0=112, rf=1.0, ls=1.12, ns=0.55, hp=80, people='quetch', c='tkvsdrn', v='eao', coda='stn', cp=0.3),
    'sendell': dict(sid=372, f0=250, rf=1.0, ls=1.35, ns=0.5, hp=140, people='esmer', c='lmnvsh', v='aeou',
                    fx={'tail': 0.75, 'top': ['treble', '-1', '6000', 'lowpass', '9000'], 'spirit': {'octave': -18, 'verb': (45, 75, -8)}}),
    'gilbert': dict(sid=None, f0=112, rf=1.05, ls=1.08, ns=0.7, hp=80, people='grobo', c='grbdhm', v='ouao'),
    'mira':    dict(sid=595, f0=228, rf=1.05, ls=0.92, ns=0.85, hp=110, people='quetch', c='mlrsvn', v='aieo'),
    'doran':   dict(sid=None, f0=108, rf=1.0, ls=1.1, ns=0.7, hp=75, people='grobo', c='brdgmn', v='oua'),
}
# the families: three speakers each, the pitch they are brought towards (each keeps their own within it)
FAMILIES = {
    'quetch-m': dict(people='quetch', sids=[], f0=(125, 140), ls=1.0, ns=0.8, hp=85),
    'quetch-f': dict(people='quetch', sids=[], f0=(205, 225), ls=0.97, ns=0.85, hp=110),
    'quetch-kid': dict(people='quetch', sids=[], f0=(255, 280), ls=0.9, ns=0.9, hp=130),
    'grobo-m': dict(people='grobo', sids=[], f0=(108, 122), ls=1.08, ns=0.75, hp=75),
    'grobo-f': dict(people='grobo', sids=[], f0=(175, 195), ls=1.04, ns=0.8, hp=100),
    'grobo-kid': dict(people='grobo', sids=[], f0=(245, 270), ls=0.95, ns=0.9, hp=125),
    'bunny-m': dict(people='bunny', sids=[], f0=(135, 150), ls=0.9, ns=0.9, hp=95),
    'bunny-f': dict(people='bunny', sids=[], f0=(220, 240), ls=0.88, ns=0.95, hp=120),
    'esmer-m': dict(people='esmer', sids=[], f0=(140, 155), ls=1.04, ns=0.7, hp=95),
    'esmer-f': dict(people='esmer', sids=[], f0=(215, 235), ls=1.0, ns=0.75, hp=115),
}
SPEAKERS_FILE = os.path.join(HERE, 'expressive-speakers.json')   # (the chosen sids, from choose-speakers.py)
if os.path.exists(SPEAKERS_FILE):
    _S = json.load(open(SPEAKERS_FILE))
    for k, sid in _S.get('cast', {}).items():
        if k in CAST and CAST[k]['sid'] is None: CAST[k]['sid'] = sid
    for k, sids in _S.get('families', {}).items():
        if k in FAMILIES and not FAMILIES[k]['sids']: FAMILIES[k]['sids'] = sids

GAIN = {'tell': 0, 'cont': -0.5, 'ask': 0, 'unsure': -2, 'warm': 0.5, 'worry': -1.5, 'excl': 2, 'no': 0.5, 'hm': -3}   # dB

def seed_of(*parts): return zlib.crc32('|'.join(map(str, parts)).encode())

# ------------------------------------------------------------------------------------------------ analysis
def analyse(x, syl, floor=60, ceil=500):
    # the pitch track (praat, 10 ms), the loudness (praat intensity), per syllable: mean pitch (st against the clip's
    # median), loudness (dB), length; the accent: the most prominent syllable (pitch + loudness + length, z-scores)
    snd = parselmouth.Sound(x.astype(np.float64), SR)
    p = snd.to_pitch(time_step=0.01, pitch_floor=floor, pitch_ceiling=ceil)
    f = p.selected_array['frequency']; ts = p.xs()
    it = snd.to_intensity(minimum_pitch=max(60, floor), time_step=0.01)
    iv, its = it.values[0], it.xs()
    v = f[f > 0]
    if len(v) < 5: return None
    med = float(np.median(v))
    st = 12 * np.log2(np.maximum(f, 1) / med)
    vi = np.nonzero(f > 0)[0]
    last = vi[-1]; tail = vi[vi > last - 25]
    q = max(1, len(tail) // 3)
    end = float(st[tail[-q:]].mean() - st[tail[:q]].mean()) if len(tail) >= 6 else 0.0
    r90 = float(np.percentile(st[vi], 90) - np.percentile(st[vi], 10))   # (the 10th-90th percentile span; robust to a stray frame)
    sd = float(st[vi].std())
    pros = []
    for s in syl:
        a, b = s[0] + s[1], s[0] + s[1] + s[2]
        m = (ts >= a) & (ts <= b) & (f > 0)
        mi = (its >= a) & (its <= b)
        pros.append((float(st[m].mean()) if m.any() else np.nan, float(iv[mi].max()) if mi.any() else np.nan, s[2]))
    acc, accPos = None, None
    if len(pros) >= 2:
        P = np.array(pros, dtype=float)
        for j in range(3):
            col = P[:, j]; ok = ~np.isnan(col)
            if ok.sum() >= 2 and col[ok].std() > 1e-6: P[:, j] = np.where(ok, (col - col[ok].mean()) / col[ok].std(), -1)
            else: P[:, j] = 0
        score = P[:, 0] + P[:, 1] * 0.8 + P[:, 2] * 0.5
        acc = int(np.argmax(score)); accPos = acc / (len(pros) - 1)
    # the loudest 10 ms against the speech level: a hard, shouted peak
    loud = float(iv.max() - np.median(iv[iv > iv.max() - 30])) if len(iv) else 0
    # the highest pitch against the median (a squeak) and the last syllables' pitch against the first (the melody's slope)
    hi = float(np.percentile(st[vi], 97))
    return dict(med=med, end=end, r90=r90, sd=sd, acc=acc, accPos=accPos, loud=loud, hi=hi, dur=len(x) / SR, voiced=len(v) * 0.01)

# how well a rendering performs its intention (higher is better): soft targets, a sum of penalties
def score(intent, A, base, variant, n):
    if A is None: return -99
    rel = 12 * np.log2(A['med'] / base) if base else 0.0
    pen = 0.0
    def want(x, lo, hi, w=1.0):
        nonlocal pen
        if x < lo: pen += (lo - x) * w
        elif x > hi: pen += (x - hi) * w
    if A['hi'] > 9: pen += (A['hi'] - 9) * 2            # (no squeaks anywhere)
    want(rel + A['hi'], -99, 8, 1.5)                     # (nor a peak far above the speaker's own level: excited, not shrill)
    if intent == 'tell': want(rel, -1, 1); want(A['r90'], 3, 9, 0.4); want(A['end'], -6, -0.5)
    elif intent == 'cont': want(rel, -1, 1.5); want(A['end'], -0.5, 4)
    elif intent == 'ask':
        want(rel, -0.5, 3)
        if variant % 2 == 0 or n <= 2: want(A['end'], 2.5, 9)          # a rise at the end
        else: want(A['end'], -2, 2, 0.5); want(rel, 0.5, 3); want(A['r90'], 4, 9, 0.5)   # a high key word, no big rise
    elif intent == 'unsure': want(rel, -1, 1.5); want(A['end'], -1, 3)
    elif intent == 'warm': want(rel, 0, 2.5); want(A['r90'], 4.5, 10, 0.7); want(A['end'], -7, -1)
    elif intent == 'worry': want(rel, 0.2, 2.5); want(A['r90'], 2, 9, 0.4); want(A['end'], -2.5, 1.5)
    elif intent == 'excl': want(rel, 1, 3.2); want(A['r90'], 4, 10, 0.5); want(A['end'], -7, 0)
    elif intent == 'no': want(rel, -1.5, 1); want(A['r90'], 2, 8, 0.4); want(A['end'], -7, -1.5)
    # the accent where it was asked for (variants alternate early and late where the intention allows both)
    acc = INT[intent]['acc']
    if A['accPos'] is not None and n >= 4:
        target = 0.0 if acc == 'early' or (acc == 'both' and variant % 2 == 1) else 1.0
        pen += abs(A['accPos'] - target) * 1.2
    return -pen

# ------------------------------------------------------------------------------------------------ one clip
def psola(x, ratio, rf, floor, ceil):
    # the clip's own melody moved by `ratio` (its own median times the speaker's move, so a raised urgent clip stays
    # raised against a neutral one) and widened by `rf` about its median; praat's Change gender: PSOLA, formants kept
    if abs(12 * np.log2(ratio)) < 0.3 and abs(rf - 1) < 0.02: return x
    snd = parselmouth.Sound(x.astype(np.float64), SR)
    f = snd.to_pitch(pitch_floor=floor, pitch_ceiling=ceil).selected_array['frequency']; v = f[f > 0]
    if len(v) < 5: return x
    y = call(snd, 'Change gender', floor, ceil, 1.0, float(np.median(v)) * ratio, rf, 1.0)
    out = y.values[0].astype(np.float32)
    return out[:len(x)] if len(out) >= len(x) else np.concatenate([out, np.zeros(len(x) - len(out), np.float32)])

def render_clip(voice, Cfg, spec, text, ls, ns, nw, f0_from, floor, ceil):
    # Piper, trimmed and edged as piper-banks.render does, then the speaker's pitch move (PSOLA), then the colour
    fx_ = dict(spec.get('fx') or {})
    fx_.setdefault('hp', spec.get('hp', 80))
    fx_.setdefault('top', ['treble', '-2', '6000', 'lowpass', '9000'])     # (lighter than the Classic banks' -4 dB at 5 kHz, 7.5 kHz)
    pcm, al = [], []
    for ch in voice.synthesize(text, Cfg(speaker_id=spec['sid'], length_scale=ls, noise_scale=ns, noise_w_scale=nw), include_alignments=True):
        a = ch.audio_float_array.astype(np.float32)
        if ch.phoneme_alignments:
            al += [(x.phoneme, int(x.num_samples)) for x in ch.phoneme_alignments]
            s = sum(int(x.num_samples) for x in ch.phoneme_alignments)
            if s < len(a): al.append(('$', len(a) - s))
        pcm.append(a)
    x = np.concatenate(pcm)
    if f0_from:
        st = max(-2.5, min(2.5, 12 * np.log2((spec.get('f0') or f0_from) / f0_from)))   # (at most two and a half semitones)
        x = psola(x, 2 ** (st / 12), spec.get('rf', 1.0), floor, ceil)
    env = np.convolve(np.abs(x), np.ones(220) / 220, 'same')
    on = np.nonzero(env > env.max() * 0.02)[0]
    a0, a1 = max(0, on[0] - int(0.015 * SR)), min(len(x), on[-1] + int(0.04 * SR))
    x = x[a0:a1].copy()
    f = int(0.005 * SR); x[:f] *= np.linspace(0, 1, f); f = int(0.03 * SR); x[-f:] *= np.linspace(1, 0, f)
    pad = int(LEAD * SR); speech = len(x); tail = fx_.get('tail', TAIL)
    x = np.concatenate([np.zeros(pad, np.float32), x, np.zeros(int(tail * SR), np.float32)])
    fx = ['highpass', str(fx_['hp'])] + fx_.get('eq', []) + fx_['top']
    y = PB.sox(x, fx)
    if fx_.get('spirit'): y = PB.spirit(y, fx_['spirit']).astype(np.float32); y = y[:len(x)]; ff = int(min(0.25, tail / 2) * SR); y[-ff:] *= np.linspace(1, 0, ff)
    y = PB.deess(y)
    syl = PB.syllables(al, a0 - pad) if al else []
    syl = [s for s in syl if s[0] < (pad + speech) / SR]
    return y.astype(np.float32), (pad + speech) / SR, syl

def speaker_f0(voice, Cfg, sid):
    # the speaker's own median pitch, from three neutral phrases, each rendered three times (Piper's renderings vary)
    vals = []
    for t in ['[[ mˈɑːlɔ vˈɛni tˌiːsɑ. ]]', '[[ dˈɛlɑ nˈiːmɔ sˌɑːvi lɛ. ]]', '[[ kˈɑːtɛ mˈiːlɑ. ]]'] * 3:
        x = np.concatenate([c.audio_float_array for c in voice.synthesize(t, Cfg(speaker_id=sid, length_scale=1.0, noise_scale=0.667, noise_w_scale=0.8))])
        p = parselmouth.Sound(x.astype(np.float64), SR).to_pitch(pitch_floor=60, pitch_ceiling=500).selected_array['frequency']
        vals += list(p[p > 0])
    return float(np.median(vals))

# ------------------------------------------------------------------------------------------------ a bank
def build_bank(voice, Cfg, bid, spec, inv, family=None, log=print, candidates=6):
    P = dict(PEOPLE[spec['people']])
    if spec.get('c'): P['c'] = spec['c']
    if spec.get('v'): P['v'] = spec['v']
    if spec.get('coda'): P['coda'] = spec['coda']
    if spec.get('cp') is not None: P['cp'] = spec['cp']
    own = speaker_f0(voice, Cfg, spec['sid'])
    target = spec.get('f0') or own
    floor, ceil = (60, 300) if target < 170 else (90, 550)
    clips, rendered, lens, nvars = {}, [], {}, {}
    stats = dict(own=round(own), target=round(target), chosen=[], rejected=0)
    for intent, (ls_list, nv) in inv.items():
        I = INT[intent]; lens[intent] = ls_list; nvars[intent] = nv
        for n in ls_list:
            for k in range(nv):
                rng = random.Random(seed_of('v2', bid, intent, n, k))
                best = None
                for c in range(candidates):
                    r2 = random.Random(seed_of('v2', bid, intent, n, k, c // 2))   # (every two renderings, new words)
                    words = phrase(r2, n, P)
                    acc = 0 if I['acc'] == 'early' or (I['acc'] == 'both' and k % 2 == 1) else len(words) - 1
                    end = I['ends'][(k + c) % len(I['ends'])]
                    pre = ''
                    if I.get('pre'): pre = I['pre'][(k + c) % len(I['pre'])] if intent == 'unsure' else (I['pre'][1] if (intent == 'warm' and k == 1) else '')
                    mid = -1
                    if len(words) >= 4 and n >= 7 and r2.random() < 0.5: mid = len(words) // 2 - 1
                    if spec.get('trail') and len(words) >= 3 and intent in ('tell', 'excl') and r2.random() < 0.6: mid = len(words) - 2
                    text = ipa(words, acc, end, pre, mid)
                    ls = spec['ls'] * I['pace'] * rng.uniform(0.95, 1.05)
                    ns = max(0.35, spec['ns'] + I['ns'] + rng.uniform(-0.05, 0.05))
                    nw = I['nw'] * rng.uniform(0.9, 1.1)
                    x, sp, syl = render_clip(voice, Cfg, spec, text, ls, ns, nw, own, floor, ceil)
                    A = analyse(x[:int(sp * SR)], syl, floor, ceil)
                    s = score(intent, A, target, k, n)
                    atk = PB.attack(x)
                    if atk > PB.ATTACK_OK: s -= (atk - PB.ATTACK_OK) * 2
                    if best is None or s > best[0]: best = (s, x, sp, syl, text, A)
                    if s > -0.3 and c >= 1: break
                s, x, sp, syl, text, A = best
                cid = f'{intent}.{n}.{k}'
                rendered.append((cid, x, sp, syl, text, A, s))
                stats['chosen'].append(round(float(s), 2))
                log(f'  {cid:12s} {s:6.2f}  {text}  ' + (f"rel {12 * np.log2(A['med'] / target):+.1f} r90 {A['r90']:.1f} end {A['end']:+.1f} acc {A['accPos']}" if A else ''))
    if spec.get('hm'):
        lens['hm'] = [1]; nvars['hm'] = 2
        for k, t in enumerate(['[[ hmː. ]]', '[[ mː... ]]']):
            x, sp, syl = render_clip(voice, Cfg, spec, t, spec['ls'] * 1.05, 0.6, 0.8, own, floor, ceil)
            rendered.append((f'hm.1.{k}', x, sp, [[s[0], s[1], s[2], 'm', '', 0.8] for s in syl[:1]] or None, t, None, 0))
    parts, pos = [], 0.0
    for cid, x, sp, syl, text, A, s in rendered:
        # every clip to the same speech level, then each intention's own loudness (an urgent clip a little louder, a
        # worried or unsure one a little softer; the voice bus's compressor takes part of it back)
        x = x * (0.1 / PB.speech_rms(x)) * 10 ** (GAIN.get(cid.split('.')[0], 0) / 20)
        e = dict(o=round(pos, 4), d=round(len(x) / SR, 4), sp=round(sp, 4), s=syl or [[LEAD, 0, round(sp - LEAD, 3), 'a', '', 1]])
        if A and A.get('accPos') is not None: e['acc'] = round(A['accPos'], 2)
        if A: e['f0'] = round(A['med']); e['end'] = round(A['end'], 1)
        if text.startswith('[[ hɑː'): e['br'] = 1
        if text.startswith('[[ ʌːm') or text.startswith('[[ ɛː') or text.startswith('[[ hmː,'): e['hes'] = 1
        clips[cid] = e
        parts.extend([x, np.zeros(int(GAP * SR), np.float32)])
        pos += len(x) / SR + GAP
    return dict(pcm=np.concatenate(parts), clips=clips, len=lens, var=nvars, family=family, f0=round(target), stats=stats,
                texts=[r[4] for r in rendered])

def encode(bid, b, extra):
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        f32 = os.path.join(td, 'b.f32'); wav = os.path.join(td, 'b.wav')
        b['pcm'].astype(np.float32).tofile(f32)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', f32, wav], check=True)
        L, _ = PB.lufs(wav)
        pcm = PB.soft_limit(b['pcm'] * 10 ** ((TARGET_LUFS - L) / 20)).astype(np.float32)
        pcm.tofile(f32)
        f = bid + '.ogg'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', f32, '-af', 'aresample=resampler=soxr',
                        '-ar', str(PB.OUT_SR), '-c:a', 'libopus', '-b:a', PB.BITRATE, '-application', 'voip', '-map_metadata', '-1', os.path.join(OUT, f)], check=True)
    L2, pk = PB.lufs(os.path.join(OUT, f))
    return dict(file=f, f0=b['f0'], **extra, len=b['len'], var=b['var'], clips=b['clips']), L2, pk

def jobs():
    J = []
    for cid, spec in CAST.items(): J.append((cid, dict(spec), OWN_INV, None, {}))
    for fam, fs in FAMILIES.items():
        lo, hi = fs['f0']
        for i, sid in enumerate(fs['sids']):
            # (each of a family's speakers at their own place in the family's range)
            spec = dict(fs, sid=sid, f0=round(lo + (hi - lo) * (i / max(1, len(fs['sids']) - 1))), rf=1.05)
            J.append((f'{fam}-{i + 1}', spec, FAM_INV, fam, {'family': fam}))
    return J

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('banks', nargs='*')
    ap.add_argument('--preview')
    ap.add_argument('--candidates', type=int, default=6)
    a = ap.parse_args()
    voice, Cfg = PB.load_piper()
    J = jobs()
    want = set(a.banks)
    if want: J = [j for j in J if j[0] in want or (j[3] or '') in want]
    if a.preview:
        os.makedirs(a.preview, exist_ok=True)
        for bid, spec, inv, fam, extra in J:
            small = {k: ([v[0][len(v[0]) // 2]], min(2, v[1])) for k, v in inv.items()}
            b = build_bank(voice, Cfg, bid, spec, small, fam, candidates=a.candidates)
            for cid, e in b['clips'].items():
                o, d = int(e['o'] * SR), int(e['d'] * SR)
                p = os.path.join(a.preview, f'{bid}-{cid}.f32'); b['pcm'][o:o + d].astype(np.float32).tofile(p)
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', p, p[:-4] + '.wav'], check=True); os.remove(p)
            print(bid, json.dumps(b['stats']))
        return
    mfile = os.path.join(OUT, 'manifest.json')
    man = json.load(open(mfile)) if os.path.exists(mfile) else {}
    man = dict(version=3, sr=PB.OUT_SR, engine='piper-expressive', credit='Character voices generated with Piper (offline) using the LibriTTS-R voice model (CC BY 4.0)',
               intents=list(INT), families={f: [f'{f}-{i + 1}' for i in range(len(s['sids']))] for f, s in FAMILIES.items()},
               speakers={**{k: v['sid'] for k, v in CAST.items()}, **{f'{f}-{i + 1}': s for f, v in FAMILIES.items() for i, s in enumerate(v['sids'])}},
               banks=man.get('banks', {}))
    for bid, spec, inv, fam, extra in J:
        if not spec.get('sid') and spec.get('sid') != 0: print('no speaker for', bid); continue
        print(f'== {bid} (sid {spec["sid"]})', flush=True)
        b = build_bank(voice, Cfg, bid, spec, inv, fam, candidates=a.candidates)
        e, L, pk = encode(bid, b, extra)
        man['banks'][bid] = e
        with open(mfile, 'w') as fh: json.dump(man, fh, separators=(',', ':'))
        kb = os.path.getsize(os.path.join(OUT, e['file'])) / 1024
        ch = b['stats']['chosen']
        print(f'{bid:13s} sid {spec["sid"]:3d} own {b["stats"]["own"]} -> {b["stats"]["target"]} Hz  {len(b["clips"])} clips {len(b["pcm"]) / SR:5.1f} s {kb:4.0f} KB {L} LUFS pk {pk}  score median {np.median(ch):.2f} worst {min(ch):.2f}', flush=True)
    man['banks'] = dict(sorted(man['banks'].items()))
    with open(mfile, 'w') as fh: json.dump(man, fh, separators=(',', ':'))
    # the clips' measured sound edges (a / e), as the Classic banks have them
    subprocess.run([sys.executable, os.path.join(HERE, 'clip-edges.py'), OUT], check=True)
    tot = sum(os.path.getsize(os.path.join(OUT, b['file'])) for b in man['banks'].values())
    print(f'assets/voice2: {len(man["banks"])} banks, {tot / 1048576:.2f} MB + manifest {os.path.getsize(mfile) / 1024:.0f} KB')

if __name__ == '__main__':
    main()
