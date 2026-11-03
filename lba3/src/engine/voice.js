// Gibberish voices (in the spirit of LBA2's babble): when a character takes a turn they "talk" in a voice of their
// own. No speech engine and no recordings: original gibberish, synthesised.
//
// VOICE-PHRASE (the user, 3.11: "the characters' voices are still not pleasant to the ear"): the phrase is the unit of
// speech, not the typed letter. Before, every few typed letters started a syllable of its own that rose from and fell
// back to silence (measured: most joins between syllables dropped 15–22 dB, evenly spaced, the voice exactly as long
// as the typing): a stream of blips. Now a line is planned whole when it starts (voiceplan.js: clauses, their
// intentions, connected gestures of syllables in the speaker's own sounds, pace and melody) and is played either
//   - from the speaker's pre-rendered phrases (assets/voice, made offline by tools/voice-render from the same plans
//     with a sample-level formant synthesiser): one clip per clause, chosen by intention and length, or
//   - synthesised live on a pooled chain (below), the whole line scheduled at once: one tone per line, voicing
//     carried through the voiced consonants, a soft release at the end of each clause.
// The typing no longer drives the voice; skipping the text or closing the box releases it (a 25 ms fade).
//
// A voice = its race's colour (RACES) + the character's own values (VOICES): pitch f0 (Hz) and range (semitones),
// formant scale k (bigger = smaller head), source tilt (higher = darker, softer), breath, brightness, nasality,
// syllable rate, legato, an intonation contour, vibrato, a fixed seed, and for the main cast their sounds (cons, vow),
// their manner (hesitate, momentum, clipped, spacious, sharp) and how they ask (rise, high). The same line from the
// same speaker always gets the same plan, like a recorded line.
//
// Cost: nothing per frame (pump only checks a line waiting for its bank). Synthesis: the filter chains are built once
// per audio context and pooled; a line makes its few sources. Phrases: a bank is fetched and decoded once, off the
// main thread; a line makes one buffer source per clause.
import { VOWELS, CONS, MOUTH_OPEN, MOUTH_ROUND, planLine, hashStr } from './voiceplan.js';

const BW = [90, 120, 170]; // the synthesis's formant bandwidths (Hz)

// Race colours. Fields: k formant scale, vowel [F1, F2] multipliers (rounded / closed mouths), f3 third-formant
// weight, tilt (source roll-off exponent), breath, bright (lowpass Hz), nasal (0–1: hum + anti-formant), rate
// (syllables), legato (voiced share of a syllable), swing (long-short alternation), foot (stress every n),
// contour, range (semitones), jit (melodic randomness), quant (snap the melody to a scale), vib [Hz, cents],
// trem [Hz, depth], glide (portamento s), atk / rel (s), level, mouth (how wide the talking mouth opens, 0-1: FACES-HANDS).
// (VOICE-SOFT, the user 2.11: "too annoying, too robotic, a clipped voice": softer edges and smoother glides; every voice's
//  syllables join at least 60 % (Babble.syllable))
const BASE = { k: 1, vowel: [1, 1], f3: 1, tilt: 1.75, breath: 0.07, bright: 3800, nasal: 0.15, rate: 1, legato: 0.72, swing: 0.12, foot: 2,
  contour: 'arc', range: 4, jit: 0.45, quant: null, vib: [5.2, 12], trem: null, glide: 0.035, atk: 0.032, rel: 0.05, level: 1, mouth: 1 };
export const RACES = {
  // Quetch (Twinsen's people): the plain, warm speaking voice everyone else is heard against
  quetch: {},
  // Grobos: big heads and chests, low formants, slow and heavy, statements that fall
  grobo: { k: 0.8, tilt: 2.1, breath: 0.05, bright: 2500, nasal: 0.35, rate: 0.8, legato: 0.86, swing: 0.22, foot: 3, contour: 'fall', range: 3, jit: 0.35, vib: [4.2, 9], glide: 0.06, level: 1.1 },
  // Rabbibunnies: small and quick, bright, a little nasal and breathy, hopping up and down
  bunny: { k: 1.22, tilt: 1.55, breath: 0.12, bright: 5000, nasal: 0.3, rate: 1.18, legato: 0.5, swing: 0.28, contour: 'bounce', range: 5, jit: 0.4, vib: [6.2, 15], glide: 0.02, level: 1.15 },
  // Spheros: round "oo"/"oh" vowels, smooth, every syllable a little upward bounce
  sphero: { k: 1.08, vowel: [0.95, 0.72], tilt: 2.0, breath: 0.03, bright: 2000, nasal: 0.2, rate: 1.25, legato: 0.5, swing: 0.3, contour: 'boing', range: 10, jit: 0.3, vib: [5, 10], glide: 0.07, level: 0.9 },
  // Esmers: airy and chiming (a strong third formant), sung rather than spoken, on a five-note scale
  esmer: { k: 1.06, f3: 1.8, tilt: 1.5, breath: 0.17, bright: 5400, nasal: 0.05, rate: 0.88, legato: 1.05, swing: 0.06, foot: 3, contour: 'sing', range: 5, quant: 'penta', jit: 0.45, vib: [5.6, 22], glide: 0.05, level: 1 },
  // Mosquibees: high and fast with a soft wing flutter (tremolo), not a square-wave buzz
  bee: { k: 1.38, tilt: 1.5, breath: 0.09, bright: 5200, nasal: 0.1, rate: 1.4, legato: 0.62, swing: 0.15, contour: 'bounce', range: 4, jit: 0.5, vib: [7, 16], trem: [26, 0.35], glide: 0.015, level: 1.15 },
  // the moles: a closed-mouth, snuffly hum, dark, a sniff at the start of a phrase
  mole: { k: 0.95, vowel: [0.8, 0.78], tilt: 2.3, breath: 0.1, bright: 1700, nasal: 0.85, rate: 0.85, legato: 0.82, swing: 0.2, foot: 3, contour: 'fall', range: 3, jit: 0.4, vib: [4.5, 12], glide: 0.05, snuffle: true, level: 0.6, mouth: 0.4 },
  // elves and gnomes: small, quick, sharp up-and-down jumps
  elf: { k: 1.3, tilt: 1.6, breath: 0.08, bright: 4800, nasal: 0.25, rate: 1.25, legato: 0.55, swing: 0.2, contour: 'zigzag', range: 6, jit: 0.4, vib: [6, 14], glide: 0.02, level: 0.95 },
  // Zeelich's triangle-heads: clipped, even, stepping between whole tones
  tri: { k: 1.02, tilt: 1.8, breath: 0.05, bright: 3600, nasal: 0.1, rate: 1.1, legato: 0.45, swing: 0.05, foot: 3, contour: 'step', quant: 'whole', range: 4, jit: 0.5, vib: [5, 8], glide: 0.025, level: 1.4 },
  // machines: a pure, dark tone in exact steps, no vibrato
  robot: { k: 1, tilt: 2.6, breath: 0, bright: 3000, nasal: 0, rate: 1.3, legato: 0.45, swing: 0, foot: 4, contour: 'step', quant: 'whole', range: 5, jit: 0.6, vib: [0, 0], glide: 0.004, level: 0.8 },
  // Sendell: not quite of this world: slow, breathy, sung, long soft edges
  spirit: { mouth: 0.6, k: 1.3, tilt: 2.6, breath: 0.28, bright: 4200, nasal: 0, rate: 0.6, legato: 1.3, swing: 0, foot: 4, contour: 'sing', quant: 'penta', range: 7, jit: 0.3, vib: [4.5, 25], glide: 0.12, atk: 0.06, rel: 0.12, level: 0.5 },
  // a big, sleepy creature's rumble
  beast: { k: 0.7, tilt: 2.4, breath: 0.08, bright: 1300, nasal: 0.6, rate: 0.55, legato: 0.95, swing: 0.2, contour: 'fall', range: 4, jit: 0.3, vib: [3.5, 30], glide: 0.1, level: 1.2 },
};

// VOICE-STYLE (the user, 3.11: "the characters' voices are still not pleasant to the ear"): how every voice is rendered,
// on top of its own values. bw: formant bandwidth scale (wider = rounder, less whistly), cons: consonant noise (0 none),
// tilt: added source roll-off, bright: a ceiling on the lowpass (Hz), rate: syllable rate scale, legato: a floor,
// atk / rel: edge scale, vib: vibrato depth scale, range: melody range scale, breath: scale, level: scale, pres: the voice
// bus's presence lift in dB (audio.js). Of the three heard side by side the user found `soft` "the closest to the
// direction": it is the default, and the base the phrases (VOICE-PHRASE) are rendered on. (classic: the voice before.)
export const STYLES = {
  classic: { bw: 1, cons: 1, tilt: 0, bright: 99999, rate: 1, legato: 0, atk: 1, rel: 1, vib: 1, range: 1, breath: 1, level: 1, pres: 3 },
  soft: { bw: 2.2, cons: 0.35, tilt: 0.4, bright: 2600, brightK: 0.62, rate: 0.9, legato: 0.8, legAdd: 0.08, atk: 1.6, rel: 1.6, vib: 0.7, range: 1, breath: 0.6, level: 0.8, pres: 0 },
  hum: { bw: 3.2, cons: 0, tilt: 1.1, bright: 1500, rate: 0.68, legato: 0.92, atk: 2.2, rel: 2.2, vib: 0.55, range: 0.75, breath: 0.25, level: 0.28, pres: -2, hum: true },
};
let STYLE = STYLES.soft;   // (the user, 3.11, of A classic, B soft, C hum: "B is the closest to the direction")
export function setVoiceStyle(name) { STYLE = STYLES[name] || STYLES.soft; return STYLE; }
export function voiceStyle() { return STYLE; }
function styled(v) {
  const S = STYLE;
  v.consLvl = S.cons; v.bwScale = S.bw / 2.2;   // (the offline phrase synthesiser's consonant noise and formant widths)
  if (S === STYLES.classic) return v;
  // (soft keeps the voices apart: brightness and legato move by the same ratio or step for everyone, not to one ceiling or
  //  floor, so the voices test's distances between speakers survive; the hum flattens them on purpose)
  v.tilt += S.tilt; v.rate *= S.rate;
  if (S.brightK) v.bright = Math.min(v.bright * S.brightK, 3400); else v.bright = Math.min(v.bright, S.bright * Math.sqrt(v.k));
  v.legato = S.legAdd ? Math.min(1.3, v.legato + S.legAdd) : Math.max(v.legato, S.legato);
  v.atk *= S.atk; v.rel *= S.rel; v.vib = [v.vib[0], v.vib[1] * S.vib]; v.range *= S.range; v.breath *= S.breath; v.level *= S.level;
  if (S.hum) { v.vowel = [v.vowel[0] * 0.85, v.vowel[1] * 0.8]; v.f3 *= 0.4; v.jit *= 0.7; }
  return v;
}

// Every named speaker: race, a fixed seed and what sets them apart inside the race.
export const VOICES = {
  // --- the family and the friends who must be unmistakable
  // Twinsen and Zoé keep the original's median pitch (measured from the English voices: about 195 and 254 Hz)
  // (VOICE-PHRASE: cons / vow: their own sounds, most used first; manner; ask: how a question goes)
  hero: { race: 'quetch', seed: 101, f0: 195, cons: 'mnldbvt', vow: 'aeoi', manner: 'hesitate', ask: 'rise' },   // warm, direct, lightly curious; may hesitate before an answer
  zoe: { race: 'quetch', seed: 102, f0: 252, k: 1.14, contour: 'sing', range: 6, rate: 1.08, legato: 0.86, breath: 0.1, tilt: 1.55, bright: 4800, vib: [5.8, 14], swing: 0.08, level: 0.8,
    cons: 'lndmvs', vow: 'eaiy', manner: 'sharp', ask: 'mix' },                    // clear and assured, connected; concern sharpens her, never shrill
  arthur: { race: 'quetch', seed: 103, kid: true, f0: 335, k: 1.32, contour: 'bounce', range: 4, rate: 1.18, legato: 0.62, swing: 0.3, tilt: 1.6, bright: 6000, vib: [6.5, 12], level: 1.2,
    cons: 'pbtdkn', vow: 'aieo', ask: 'rise' },                                    // lively and quick, a comfortable pitch (no squeaks)
  baldino: { race: 'grobo', seed: 104, f0: 132, k: 0.9, nasal: 0.6, contour: 'zigzag', range: 6, rate: 1.3, legato: 0.3, swing: 0.08, foot: 2, tilt: 1.7, bright: 3200, vib: [6.2, 18], glide: 0.03, level: 0.85,
    cons: 'bdgmnrz', vow: 'oaei', manner: 'momentum', ask: 'rise' },               // gathers speed on an idea, stops short before the awkward part
  vesk: { race: 'quetch', seed: 105, f0: 98, k: 0.86, contour: 'flat', range: 3, rate: 0.7, legato: 0.95, swing: 0.02, foot: 4, tilt: 2.25, breath: 0.12, bright: 2100, nasal: 0.1, vib: [3.8, 5], glide: 0.09, jit: 0.2, level: 1.5,
    cons: 'vsnmrlt', vow: 'aeo', manner: 'clipped', ask: 'high' },                 // measured, persuasive; clipped and decisive when challenged
  // --- Quetch villagers
  gilbert: { race: 'quetch', seed: 106, f0: 132, k: 0.97, contour: 'fall', rate: 0.95 },
  tim: { race: 'quetch', seed: 107, kid: true, f0: 318, k: 1.27, rate: 1.15, contour: 'zigzag', range: 6, legato: 0.6 },
  lulu: { race: 'quetch', seed: 108, kid: true, f0: 305, k: 1.26, rate: 1.15, contour: 'sing', range: 7, breath: 0.12 },
  nilo: { race: 'quetch', seed: 109, kid: true, f0: 282, k: 1.2, rate: 1.1, contour: 'bounce' },
  dkid: { race: 'quetch', seed: 110, kid: true, f0: 335, k: 1.3, rate: 1.15, contour: 'bounce', range: 6 },          // Sani
  worker: { race: 'quetch', seed: 111, f0: 138, k: 0.98, rate: 1.05, legato: 0.6, contour: 'fall' },
  archivist: { race: 'quetch', seed: 112, f0: 150, rate: 0.82, legato: 0.85, contour: 'flat', range: 3, tilt: 1.9 },
  councilB: { race: 'quetch', seed: 113, f0: 205, k: 1.08, contour: 'arc', rate: 0.9 },                           // Councillor Sela
  farmer1: { race: 'quetch', seed: 114, f0: 128, k: 0.96, rate: 1.15, contour: 'fall', swing: 0.2, legato: 0.28},             // Farmer Joss
  lhar1: { race: 'quetch', seed: 115, f0: 152, k: 1.0, rate: 1.0, contour: 'sing', range: 4 },                    // Tashi
  lhar2: { race: 'quetch', seed: 116, f0: 215, k: 1.1, contour: 'sing', range: 5, breath: 0.1 },                  // Dawa
  tarra: { race: 'quetch', seed: 117, f0: 222, k: 1.12, rate: 0.95, contour: 'arc', range: 5 },
  dallan: { race: 'quetch', seed: 118, f0: 144, k: 1.0, rate: 1.05, contour: 'arc' },
  nell: { race: 'quetch', seed: 119, f0: 210, k: 1.1, rate: 1.1, legato: 0.6, contour: 'bounce', range: 5 },
  sage: { race: 'quetch', seed: 120, f0: 112, k: 0.95, rate: 0.75, vib: [5.5, 28], contour: 'fall', tilt: 2.0 },
  radio: { race: 'quetch', seed: 121, f0: 160 },
  resident: { race: 'quetch', seed: 122, f0: 172, k: 1.04, rate: 1.1, legato: 0.6, contour: 'bounce', range: 5, swing: 0.2 }, // the opening's harbour-row resident (OPEN-2)
  // --- Grobos
  doran: { race: 'grobo', seed: 201, f0: 92, k: 0.78, rate: 0.75, vib: [4.8, 26], legato: 0.7, range: 6 },                                 // old harbour master
  guard: { race: 'grobo', seed: 202, f0: 118, k: 0.78, rate: 0.95, legato: 0.55, contour: 'flat', range: 2, swing: 0.05, foot: 2 }, // clipped orders
  councilC: { race: 'grobo', seed: 203, f0: 122, k: 0.82, rate: 0.82 },                                             // Councillor Brum
  farmer3: { race: 'grobo', seed: 204, f0: 110, k: 0.8, vib: [4.6, 18] },                                            // Grull
  yorna: { race: 'grobo', seed: 205, f0: 190, k: 0.9, rate: 0.9, contour: 'arc', range: 4 },
  pim: { race: 'grobo', seed: 206, kid: true, f0: 285, k: 1.05, rate: 1.05, contour: 'bounce', range: 5 },
  hesk: { race: 'grobo', seed: 207, f0: 150, k: 0.86, rate: 0.95, legato: 0.75 },
  dtrader: { race: 'grobo', seed: 208, f0: 115, k: 0.8, rate: 1.0, contour: 'arc' },                                // Brosk
  bram: { race: 'grobo', seed: 209, f0: 104, k: 0.79, rate: 0.85 },
  // --- WORLD-LIFE: the people who walk round Citadel (src/game/walkrounds.js)
  oda: { race: 'quetch', seed: 131, f0: 218, k: 1.1, rate: 1.05, contour: 'arc', range: 5 },
  garrick: { race: 'quetch', seed: 132, f0: 124, k: 0.96, rate: 0.9, contour: 'fall' },
  pico: { race: 'quetch', seed: 133, kid: true, f0: 330, k: 1.3, rate: 1.2, contour: 'bounce', range: 7, legato: 0.55 },
  brix: { race: 'grobo', seed: 231, f0: 100, k: 0.8, rate: 0.7, vib: [4.8, 22], legato: 0.75 },
  dot: { race: 'grobo', seed: 232, kid: true, f0: 292, k: 1.05, rate: 1.1, contour: 'zigzag', range: 6 },
  marda: { race: 'grobo', seed: 233, f0: 184, k: 0.9, rate: 0.95, contour: 'arc', range: 4 },
  tobb: { race: 'grobo', seed: 234, f0: 108, k: 0.82, rate: 0.85, contour: 'fall', legato: 0.7 },
  maro: { race: 'bunny', seed: 331, f0: 212, k: 1.2, rate: 1.0, contour: 'bounce', legato: 0.55 },
  tilde: { race: 'bunny', seed: 332, f0: 188, k: 1.14, rate: 1.1, contour: 'zigzag', range: 4, legato: 0.5 },
  ilo: { race: 'esmer', seed: 531, f0: 252, k: 1.14, rate: 1.0, legato: 0.7 },
  aven: { race: 'esmer', seed: 532, f0: 148, k: 0.96, rate: 0.9, legato: 0.8, contour: 'flat' },
  kira: { race: 'quetch', seed: 134, f0: 198, k: 1.08, rate: 1.0, contour: 'arc', range: 5 },
  safi: { race: 'quetch', seed: 135, kid: true, f0: 300, k: 1.22, rate: 1.1, contour: 'sing', range: 6, breath: 0.1 },
  tamu: { race: 'quetch', seed: 136, kid: true, f0: 322, k: 1.28, rate: 1.2, contour: 'zigzag', range: 7, legato: 0.55 },
  bashir: { race: 'quetch', seed: 137, f0: 118, k: 0.94, rate: 0.78, contour: 'fall', vib: [5, 20], tilt: 2.0 },
  ume: { race: 'bunny', seed: 333, f0: 158, k: 1.06, rate: 0.75, vib: [5.2, 26], contour: 'fall', legato: 0.8 },
  // --- INTERIOR-LIFE's people and Sefa (VOICE-OWN: each named speaker its own voice and seed; the sex lists shape them)
  luc: { race: 'quetch', seed: 940, f0: 112, k: 0.94, rate: 0.8, contour: 'fall', legato: 0.45 },
  hobb: { race: 'grobo', seed: 941, f0: 123, k: 1.07, rate: 0.97, contour: 'sing', legato: 0.52 },
  sanna: { race: 'quetch', seed: 942, f0: 226, k: 1.2, rate: 1.14, contour: 'zigzag', legato: 0.59 },
  fenn: { race: 'bunny', seed: 943, f0: 145, k: 1.03, rate: 0.91, contour: 'bounce', legato: 0.66 },
  kip: { race: 'quetch', seed: 944, f0: 156, k: 1.16, rate: 1.08, contour: 'fall', legato: 0.73 },
  mrbazoo: { race: 'grobo', seed: 945, f0: 115, k: 0.99, rate: 0.85, contour: 'sing', legato: 0.8 },
  pell: { race: 'quetch', seed: 946, f0: 220, k: 1.12, rate: 1.02, contour: 'zigzag', legato: 0.47 },
  ines: { race: 'quetch', seed: 947, f0: 227, k: 0.95, rate: 1.19, contour: 'bounce', legato: 0.54 },
  rollo: { race: 'grobo', seed: 948, f0: 148, k: 1.08, rate: 0.96, contour: 'fall', legato: 0.61 },
  pharmacist: { race: 'bunny', seed: 949, f0: 241, k: 1.21, rate: 1.13, contour: 'sing', legato: 0.68 },
  hedda: { race: 'bunny', seed: 950, f0: 214, k: 1.04, rate: 0.9, contour: 'zigzag', legato: 0.75 },
  wim: { race: 'quetch', seed: 951, f0: 129, k: 1.17, rate: 1.07, contour: 'bounce', legato: 0.82 },
  osk: { race: 'quetch', seed: 952, f0: 140, k: 1.0, rate: 0.84, contour: 'fall', legato: 0.49 },
  ama: { race: 'quetch', seed: 953, f0: 235, k: 1.13, rate: 1.01, contour: 'sing', legato: 0.56 },
  gurt: { race: 'grobo', seed: 954, f0: 162, k: 0.96, rate: 1.18, contour: 'zigzag', legato: 0.63 },
  bern: { race: 'quetch', seed: 955, f0: 121, k: 1.09, rate: 0.95, contour: 'bounce', legato: 0.7 },
  lomba: { race: 'bunny', seed: 956, f0: 222, k: 1.22, rate: 1.12, contour: 'fall', legato: 0.77 },
  dov: { race: 'quetch', seed: 957, f0: 143, k: 1.05, rate: 0.89, contour: 'sing', legato: 0.84 },
  ressa: { race: 'quetch', seed: 958, f0: 236, k: 1.18, rate: 1.06, contour: 'zigzag', legato: 0.51 },
  ollo: { race: 'quetch', seed: 959, f0: 113, k: 1.01, rate: 0.83, contour: 'bounce', legato: 0.58 },
  esren: { race: 'esmer', seed: 960, f0: 124, k: 1.14, rate: 1.0, contour: 'fall', legato: 0.65 },
  gunda: { race: 'grobo', seed: 961, f0: 223, k: 0.97, rate: 1.17, contour: 'sing', legato: 0.72 },
  bibi: { race: 'grobo', seed: 962, kid: true, f0: 310, k: 1.1, rate: 0.94, contour: 'zigzag', legato: 0.79 },
  velo: { race: 'esmer', seed: 963, f0: 157, k: 1.23, rate: 1.11, contour: 'bounce', legato: 0.46 },
  ennu: { race: 'esmer', seed: 964, f0: 116, k: 1.06, rate: 0.88, contour: 'fall', legato: 0.53 },
  oshra: { race: 'esmer', seed: 965, f0: 217, k: 1.19, rate: 1.05, contour: 'sing', legato: 0.6 },
  sefa: { race: 'esmer', seed: 966, f0: 224, k: 1.02, rate: 0.82, contour: 'zigzag', legato: 0.67 },
  tavi: { race: 'quetch', seed: 968, f0: 226, k: 1.12, rate: 1.1, contour: 'bounce', legato: 0.55 },   // the terminal's cafe keeper
  pask: { race: 'esmer', seed: 969, f0: 131, k: 1.0, rate: 0.86, contour: 'fall', legato: 0.7 },        // the Zeelich terminal's porter
  // --- WC-4: the council's guards in Zeelich Spaceport's terminal (chapter 9)
  zt_guard: { race: 'esmer', seed: 1133, f0: 124, k: 0.92, rate: 0.84, contour: 'fall', legato: 0.46 },
  zt_guard2: { race: 'esmer', seed: 1134, f0: 145, k: 1.04, rate: 0.98, contour: 'arc', legato: 0.58 },
  // --- WC-3: the residents where the story goes (src/game/storylife.js)
  dg_surv: { race: 'quetch', seed: 1101, f0: 138, k: 0.98, rate: 0.92, contour: 'flat', legato: 0.62 },
  dg_rod: { race: 'quetch', seed: 1102, f0: 116, k: 0.93, rate: 1.04, contour: 'bounce', legato: 0.5 },
  dg_cook: { race: 'bunny', seed: 1103, f0: 228, k: 1.17, rate: 1.08, contour: 'sing', legato: 0.6 },
  dg_haul: { race: 'grobo', seed: 1104, f0: 96, k: 0.8, rate: 0.78, contour: 'fall', legato: 0.74 },
  dg_porter: { race: 'quetch', seed: 1105, f0: 150, k: 1.02, rate: 1.16, contour: 'zigzag', legato: 0.48 },
  dg_mech: { race: 'quetch', seed: 1106, f0: 109, k: 0.95, rate: 0.88, contour: 'arc', legato: 0.68 },
  dg_dig: { race: 'quetch', seed: 1107, f0: 126, k: 0.9, rate: 0.98, contour: 'fall', legato: 0.56 },
  dg_clerk: { race: 'quetch', seed: 1108, f0: 145, k: 1.06, rate: 1.2, contour: 'flat', legato: 0.44 },
  sc_master: { race: 'bunny', seed: 1109, f0: 118, k: 1.0, rate: 0.8, contour: 'sing', legato: 0.8, vib: [5, 18] },
  sc_pupa: { race: 'quetch', seed: 1110, kid: true, f0: 312, k: 1.25, rate: 1.12, contour: 'sing', legato: 0.6 },
  sc_pupb: { race: 'quetch', seed: 1111, kid: true, f0: 284, k: 1.18, rate: 1.18, contour: 'bounce', legato: 0.5 },
  sc_pupc: { race: 'quetch', seed: 1112, kid: true, f0: 296, k: 1.21, rate: 1.24, contour: 'zigzag', legato: 0.46 },
  sc_in1: { race: 'quetch', seed: 1113, kid: true, f0: 318, k: 1.27, rate: 1.04, contour: 'arc', legato: 0.62 },
  sc_in2: { race: 'quetch', seed: 1114, kid: true, f0: 276, k: 1.16, rate: 1.0, contour: 'fall', legato: 0.58 },
  sc_in3: { race: 'quetch', seed: 1115, kid: true, f0: 326, k: 1.3, rate: 1.14, contour: 'bounce', legato: 0.54 },
  // PURPOSES (3.11.2026): Tibbo at his counter, Marl at her dog yard, Oni at the dormitory
  tibbo: { race: 'quetch', seed: 1301, f0: 132, k: 0.97, rate: 1.22, contour: 'zigzag', legato: 0.42, range: 6 },
  marl: { race: 'esmer', seed: 1302, f0: 236, k: 1.1, rate: 0.92, contour: 'fall', legato: 0.78, vib: [4.5, 16] },
  oni: { race: 'quetch', seed: 1303, kid: true, f0: 302, k: 1.23, rate: 0.94, contour: 'fall', legato: 0.7 },
  lh_bero: { race: 'quetch', seed: 1116, f0: 112, k: 0.92, rate: 0.9, contour: 'arc', legato: 0.66 },
  lh_sana: { race: 'quetch', seed: 1117, f0: 232, k: 1.14, rate: 1.0, contour: 'fall', legato: 0.64 },
  lh_old: { race: 'bunny', seed: 1118, f0: 132, k: 1.04, rate: 0.72, contour: 'fall', legato: 0.82, vib: [5.4, 24] },
  lh_tam: { race: 'quetch', seed: 1119, f0: 154, k: 0.97, rate: 1.1, contour: 'bounce', legato: 0.52 },
  lh_kid1: { race: 'quetch', seed: 1120, kid: true, f0: 306, k: 1.24, rate: 1.26, contour: 'zigzag', legato: 0.5 },
  lh_kid2: { race: 'grobo', seed: 1121, kid: true, f0: 298, k: 1.08, rate: 1.16, contour: 'sing', legato: 0.56 },
  lh_mira: { race: 'bunny', seed: 1122, f0: 238, k: 1.2, rate: 0.98, contour: 'arc', legato: 0.7 },
  lh_grum: { race: 'grobo', seed: 1123, f0: 101, k: 0.82, rate: 0.84, contour: 'flat', legato: 0.6 },
  zc_guard: { race: 'esmer', seed: 1124, f0: 120, k: 0.94, rate: 0.82, contour: 'flat', legato: 0.5 },
  zc_clerk: { race: 'esmer', seed: 1125, f0: 152, k: 1.08, rate: 1.14, contour: 'zigzag', legato: 0.72 },
  zc_courier: { race: 'esmer', seed: 1126, f0: 236, k: 1.16, rate: 1.22, contour: 'bounce', legato: 0.56 },
  zc_petit: { race: 'quetch', seed: 1127, f0: 224, k: 1.1, rate: 1.06, contour: 'zigzag', legato: 0.66 },
  up_clerk: { race: 'esmer', seed: 1128, f0: 160, k: 1.12, rate: 1.18, contour: 'sing', legato: 0.62 },
  up_courier: { race: 'esmer', seed: 1129, f0: 141, k: 1.02, rate: 1.08, contour: 'arc', legato: 0.48 },
  up_wait: { race: 'bunny', seed: 1130, f0: 219, k: 1.13, rate: 0.86, contour: 'flat', legato: 0.74 },
  up_esmer: { race: 'esmer', seed: 1131, f0: 112, k: 0.98, rate: 0.74, contour: 'fall', legato: 0.84, vib: [4.8, 22] },
  fosse: { race: 'grobo', seed: 1135, f0: 98, k: 0.8, rate: 0.82, contour: 'fall', range: 3, legato: 0.6 },   // the sewer man: a grumble
  up_guard: { race: 'esmer', seed: 1132, f0: 130, k: 0.9, rate: 0.88, contour: 'flat', legato: 0.42 },
  // --- Rabbibunnies
  mira: { race: 'bunny', seed: 301, f0: 236, k: 1.25, rate: 1.6, contour: 'bounce', legato: 0.25, bright: 5600, range: 2, vol: 1.12 },
  pippa: { race: 'bunny', seed: 302, f0: 210, k: 1.22, rate: 1.4, contour: 'zigzag', range: 8, legato: 0.45, vol: 1.1 },                     // the merchant: quick patter
  bersimon: { race: 'bunny', seed: 303, f0: 150, k: 1.1, rate: 0.95, vib: [5.8, 26], contour: 'sing' },
  magus: { race: 'bunny', seed: 304, f0: 125, k: 1.06, rate: 0.85, legato: 0.75, contour: 'fall' },                 // Rector Hougo
  farmer2: { race: 'bunny', seed: 305, f0: 214, k: 1.16, rate: 1.05 },                                               // Mother Bryn
  lhar3: { race: 'bunny', seed: 306, f0: 128, k: 1.08, rate: 0.85, vib: [5.2, 24], contour: 'fall' },               // Old Norbu
  ilka: { race: 'bunny', seed: 307, f0: 205, k: 1.15, rate: 1.0, legato: 0.65, contour: 'arc' },
  weaver: { race: 'bunny', seed: 308, f0: 180, k: 1.14, rate: 0.95, contour: 'sing' },                              // Lumi
  odile: { race: 'bunny', seed: 309, f0: 198, k: 1.16, rate: 1.1, legato: 0.45, contour: 'flat', range: 3 },         // the officer
  // --- Spheros
  sphero1: { race: 'sphero', seed: 401, f0: 250, rate: 1.15, range: 14, legato: 0.2},                                                       // Pom
  sphero2: { race: 'sphero', seed: 402, f0: 250, k: 1.18, rate: 1.0, range: 7 },                                     // Madam Rondo
  // --- Esmers
  nara: { race: 'esmer', seed: 501, f0: 330, k: 1.16 },
  oku: { race: 'esmer', seed: 502, f0: 128, k: 0.92, rate: 0.75, vib: [5, 26], level: 1.4 },
  xil: { race: 'esmer', seed: 503, f0: 178, k: 1.04, rate: 1.0 },
  chair: { race: 'esmer', seed: 504, f0: 134, k: 0.98, rate: 0.8 },                                                 // Councillor Amaru
  clerk: { race: 'esmer', seed: 505, f0: 168, k: 1.03, rate: 1.1, legato: 0.75 },                                  // Clerk Ottavo
  keeper: { race: 'esmer', seed: 506, f0: 126, k: 0.96, rate: 0.85, vib: [5, 20] },                               // Sefa
  // --- Mosquibees
  zbee1: { race: 'bee', seed: 601, f0: 470, rate: 1.8, range: 7 },                                                            // Bzizz
  zbee2: { race: 'bee', seed: 602, f0: 280, k: 1.3, rate: 1.25, contour: 'arc' },                                   // Madam Zuzzara
  // --- the moles
  zmole1: { race: 'mole', seed: 701, f0: 128, k: 0.9, rate: 0.8, vib: [4.5, 18] },                                  // Old Grumm
  zmole2: { race: 'mole', seed: 702, f0: 270, k: 1.05, rate: 0.95, contour: 'arc' },                               // Mother Snuff
  // --- elves, gnomes and wizards
  joe: { race: 'elf', seed: 801, f0: 230, rate: 1.25, vib: [6, 20], legato: 0.7, range: 7, nasal: 0.5 },
  keraooc: { race: 'elf', seed: 802, f0: 175, k: 1.15, rate: 1.05, contour: 'sing', vib: [5.5, 22] },
  // --- Zeelich's triangle-heads
  ztri1: { race: 'tri', seed: 901, f0: 165, rate: 1.45, k: 1.2, legato: 0.35 },                                                           // Mr Pelleck
  ztri2: { race: 'tri', seed: 902, f0: 170, k: 1.06, rate: 1.0, contour: 'arc', quant: null },                      // Tavo
  // --- others
  sendell: { race: 'spirit', seed: 1001, f0: 410, manner: 'spacious', ask: 'high', vol: 0.72 },   // calm and spacious, clear even when quiet (no echo)
  drones: { race: 'robot', seed: 1002, f0: 300 },
  dinofly: { race: 'beast', seed: 1003, f0: 86 },
};
// other spellings of the same speaker (n_balradio is Baldino on the radio)
const ALIAS = { bal: 'baldino', rollo_q: 'rollo', pell_q: 'pell' };   // (WC-4: Rollo and Mrs Pell in the evacuation's queue, roomlife.js)
// names that are not people (signs, notes, places): no voice
const SILENT = new Set(['note', 'search_nothing', 'taken', 'sealed', 'idle', 'back', 'after', 'snore', 'village', 'town', 'harbour', 'quay',
  'lighthouse', 'cliffs', 'orchard', 'depot', 'station', 'fort', 'pipe', 'camp']);

// the voice for a speaker's name key ('n_zoe', 'n_zoeradio', ''), or null
// VOICE-SEX (the user 2.11: "tell men and women apart more"): the grown women and men among the named speakers. A woman's
// voice in the ambiguous middle moves up (to at least about 215 Hz) with a smaller head's formants and a little more
// breath; a man's moves down (to about 170 Hz at most) with a slightly bigger head's. Children keep their own voices; Twinsen and Zoé keep the original's measured pitch.
const WOMEN = new Set(['councilB', 'lhar2', 'tarra', 'nell', 'yorna', 'marda', 'oda', 'tilde', 'ilo', 'kira', 'ume', 'mira', 'pippa', 'farmer2', 'ilka',
  'weaver', 'odile', 'nara', 'maro',
  // (those still without a voice of their own: the fallback below gives them a woman's)
  'sanna', 'pell', 'ines', 'hedda', 'ama', 'lomba', 'ressa', 'gunda', 'oshra', 'bibi', 'tavi',
  'dg_cook', 'lh_sana', 'lh_mira', 'zc_courier', 'zc_petit', 'up_wait', 'marl']);
const MEN = new Set(['baldino', 'vesk', 'gilbert', 'worker', 'archivist', 'farmer1', 'lhar1', 'dallan', 'sage', 'resident', 'doran', 'guard', 'councilC',
  'farmer3', 'hesk', 'dtrader', 'bram', 'garrick', 'brix', 'tobb', 'aven', 'bashir', 'bersimon', 'magus', 'lhar3', 'oku', 'xil', 'chair',
  'clerk', 'keeper', 'joe', 'keraooc', 'ztri1', 'ztri2',
  'luc', 'hobb', 'fenn', 'fosse', 'mrbazoo', 'rollo', 'wim', 'osk', 'gurt', 'bern', 'dov', 'ollo', 'pask',
  'dg_surv', 'dg_rod', 'dg_haul', 'dg_porter', 'dg_mech', 'dg_dig', 'dg_clerk', 'sc_master', 'lh_bero', 'lh_old', 'lh_tam', 'lh_grum',
  'zc_guard', 'zc_clerk', 'up_clerk', 'up_courier', 'up_esmer', 'up_guard', 'zt_guard', 'zt_guard2', 'tibbo']);
const PEOPLE = new Set(['quetch', 'grobo', 'bunny', 'esmer', 'elf', 'tri']);   // (Spheros, Mosquibees and moles keep their own kind of voice)
function sexed(v, sex) {
  if (v.kid || v.id === 'hero' || v.id === 'zoe' || !PEOPLE.has(v.race)) return v;
  // (only a voice in the ambiguous middle moves; the others already read as a woman or a man and keep their place)
  if (sex === 'f' && v.f0 < 210) { v.f0 = Math.round(215 + (v.f0 - 175) * 0.6); v.k = Math.max(v.k, 1.12); v.breath += 0.02; }
  else if (sex === 'm' && v.f0 > 160) { v.f0 = Math.round(160 + (v.f0 - 160) * 0.4); v.k *= 0.97; }
  return v;
}

export function voiceFor(nameKey) {
  if (!nameKey || !nameKey.startsWith('n_')) return null;
  let id = nameKey.slice(2);
  const radio = id.endsWith('radio') && id !== 'radio';
  if (radio) id = id.slice(0, -5);
  id = ALIAS[id] || id;
  if (SILENT.has(id)) return null;
  let own = VOICES[id];
  if (!own) { // someone without a voice of their own: a Quetch voice from the name, stable
    const h = hashStr(id);
    // (VOICE-SEX: a clearly male or a clearly female voice, never the ambiguous middle)
    const f = WOMEN.has(id) ? 1 : MEN.has(id) ? 0 : (h >>> 27) & 1;
    own = { race: 'quetch', seed: h, f0: f ? 212 + (h % 44) : 105 + (h % 45), k: f ? 1.13 + ((h >>> 8) % 8) / 100 : 0.9 + ((h >>> 8) % 9) / 100,
      rate: 0.9 + ((h >>> 16) % 25) / 100, contour: ['arc', 'fall', 'sing', 'bounce'][(h >>> 20) % 4], sex: f ? 'f' : 'm' };
  }
  const v = sexed({ ...BASE, ...RACES[own.race || 'quetch'], ...own, id, radio: radio || id === 'radio' }, own.sex || (WOMEN.has(id) ? 'f' : MEN.has(id) ? 'm' : null));
  if (v.radio) v.level *= 0.9;
  return styled(v);
}
// a voice from values of its own (the phrase banks' resident families, the cast sampler): as voiceFor makes one
export function makeVoice(own, id = 'custom') {
  return styled(sexed({ ...BASE, ...RACES[own.race || 'quetch'], ...own, id, radio: false }, own.sex || null));
}

// the glottal-like source: harmonics falling off as 1/n^tilt (a sawtooth is 1/n: buzzy; 2+ is soft and round)
const WAVES = new WeakMap();
function waveFor(ctx, tilt) {
  let m = WAVES.get(ctx);
  if (!m) WAVES.set(ctx, (m = new Map()));
  const key = Math.round(tilt * 10);
  let w = m.get(key);
  if (!w) {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) im[n] = Math.pow(n, -key / 10);
    w = ctx.createPeriodicWave(re, im);
    m.set(key, w);
  }
  return w;
}

// ---------------------------------------------------------------- the pre-rendered phrases (VOICE-PHRASE)
// assets/voice/manifest.json lists one bank per voice: the main cast's own, and the residents' families (a resident
// speaks with the family of their people, sex and age, moved to their own pitch: the same person every visit).
// A bank is one Ogg Opus file of short phrases (a "sprite"), fetched when its speaker is first heard of (prepare) and
// decoded off the main thread at the game's own sample rate; at most BANKS_KEPT stay decoded (about 14 MB a bank of the
// main cast's, 6 MB a family speaker's, at 48 kHz).
// VOICES-PIPER: the phrases are made-up words spoken by Piper (offline, the LibriTTS-R voice model, CC BY 4.0), rendered
// by tools/voice-render/piper-banks.py; a resident family has several speakers, and a resident keeps theirs.
// A voice without a bank (the rarer peoples, machines), or whose bank isn't ready in time, is synthesised.
const BANKS_KEPT = 5;
const BANK_WAIT = 0.3;   // a line whose bank is still decoding waits at most this long, then is synthesised
let BANK_URL = (typeof window !== 'undefined' && window.LBA_VOICE_URL) || 'assets/voice/';
let MANIFEST = null, MANIFEST_P = null;
const BANKS = new Map();  // id -> { state: 'loading' | 'ready' | 'failed', buf, used, p }
const DECODERS = new Map();   // sample rate -> an OfflineAudioContext that only decodes
// where the banks are (tests and the render tools; null: none, synthesis only)
export function voiceBanks(url) { BANK_URL = url; MANIFEST = null; MANIFEST_P = null; BANKS.clear(); }
function manifest() {
  if (MANIFEST || MANIFEST_P || !BANK_URL || typeof fetch !== 'function') return MANIFEST_P;
  MANIFEST_P = fetch(BANK_URL + 'manifest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((m) => (MANIFEST = m));
  return MANIFEST_P;
}
// the bank a voice speaks from: [bank id, playback rate] or null
const FAMILY_RACES = new Set(['quetch', 'grobo', 'bunny', 'esmer']);
export function bankOf(v) {
  if (!v || !MANIFEST) return null;
  const B = MANIFEST.banks;
  if (B[v.id] && !B[v.id].family) return [v.id, 1];
  if (!FAMILY_RACES.has(v.race)) return null;
  const sex = v.kid ? 'kid' : v.sex === 'f' || WOMEN.has(v.id) ? 'f' : v.sex === 'm' || MEN.has(v.id) ? 'm' : v.f0 >= 190 ? 'f' : 'm';
  // VOICES-PIPER: a family has several speakers (manifest.families); the resident's id picks one, the same every visit
  const F = MANIFEST.families || {};
  let fam = `${v.race}-${sex}`;
  if (!F[fam] && !B[fam]) fam = sex === 'kid' ? 'quetch-kid' : `quetch-${sex}`;
  const list = (F[fam] || [fam]).filter((b) => B[b]);
  if (!list.length) return null;
  const bid = list[(hashStr(v.id) >>> 3) % list.length];
  // (moved toward the resident's own pitch, within a semitone and a half of the speaker's: a recorded voice moved
  //  further begins to sound sped up)
  const st = Math.max(-1.5, Math.min(1.5, 12 * Math.log2(v.f0 / (B[bid].f0 || v.f0))));
  return [bid, Math.pow(2, st / 12)];
}
function loadBank(id, sr = 48000) {
  let e = BANKS.get(id);
  if (e) { e.used = Date.now(); return e.p; }
  const info = MANIFEST?.banks?.[id];
  if (!info) return Promise.resolve(null);
  e = { state: 'loading', buf: null, used: Date.now() };
  e.p = fetch(BANK_URL + info.file).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then((ab) => {
      // (decoded by a context of its own, off the main thread, at the rate it will play at: played from 16 kHz, the
      //  browser's linear resampling left images at 12–20 kHz, about 52 dB down)
      let D = DECODERS.get(sr);
      if (!D) DECODERS.set(sr, (D = new OfflineAudioContext(1, 1, sr)));
      return new Promise((res, rej) => D.decodeAudioData(ab, res, rej));
    })
    .then((buf) => { e.buf = buf; e.state = 'ready'; evict(); return buf; })
    .catch((err) => { console.warn('voice bank failed', id, err); e.state = 'failed'; return null; });
  BANKS.set(id, e);
  return e.p;
}
function evict() {
  // (the least recently wanted go first, and only those nobody asked for in the last half minute: a scene's whole cast
  //  stays, however large)
  const now = Date.now(), ready = [...BANKS.entries()].filter(([, b]) => b.state === 'ready');
  const old = ready.filter(([, b]) => now - b.used > 30000).sort((x, y) => x[1].used - y[1].used);
  for (const [k] of old.slice(0, Math.max(0, ready.length - BANKS_KEPT))) BANKS.delete(k);
}
// the clip for a clause: its intention, the nearest length, a variant not used lately
function clipFor(bank, intent, n, recent, seed) {
  const key = bank.len[intent] ? intent : 'tell', L = bank.len[key];
  let best = L[0]; for (const l of L) if (Math.abs(l - n) < Math.abs(best - n)) best = l;
  const nv = bank.var[key] || 1;
  let vi = seed % nv;
  for (let k = 0; k < nv; k++) { const id = `${key}.${best}.${(vi + k) % nv}`; if (!recent.includes(id)) { vi = (vi + k) % nv; break; } }
  const id = `${key}.${best}.${vi}`;
  recent.push(id); if (recent.length > 6) recent.shift();
  return bank.clips[id] ? { id, ...bank.clips[id] } : null;
}

// ---------------------------------------------------------------- the voices
// VOICE-PHRASE: the synthesis's loudness, syllable by syllable. Through the chain below (a tone whose harmonics fall as
// 1/n^tilt, three formant band-passes and a nasal hum, a brightness low-pass) a vowel's loudness depends on where its
// formants sit against the voice's harmonics: measured, an "i" or "u" came out about 12 dB louder than an "a", a high
// voice louder than a low one, and the line rose and fell in loudness with its melody. Each syllable's gain now divides
// out the chain's power for its vowel at its pitch and gives the vowel its natural weight instead (an open "a" the
// fullest); every voice and vowel is brought to the level of Twinsen's "a". (Before, each voice's `level` was set by
// hand.) A voiced consonant's dip is measured against its own formants the same way.
const VOWEL_WEIGHT = { a: 1, o: 0.92, e: 0.86, u: 0.72, i: 0.68, y: 0.7, m: 0.5 };
function chainPower(v, vk, f0, Fc = null) {
  const bp = (f, fc, Q) => 1 / (1 + Q * Q * (f / fc - fc / f) ** 2);                          // |H|^2, a band-pass of peak 1
  const lp = (f, fc, Q) => 1 / ((1 - (f / fc) ** 2) ** 2 + (f / (fc * Q)) ** 2);               // |H|^2, a two-pole low-pass
  const F = Fc || VOWELS[vk] || VOWELS.a, G = [1, 0.36, 0.0484 * v.f3 * v.f3], mur = (0.06 + v.nasal * 0.3) ** 2;
  const Fz = Fc ? [Fc[0] * Math.sqrt(v.k), Fc[1] * v.k, Fc[2] * v.k] : [0, 1, 2].map((j) => F[j] * v.k * (j < 2 ? v.vowel[j] : 1));
  const Q = Fz.map((x, j) => x / (BW[j] * STYLE.bw * Math.sqrt(v.k)));
  let P = 0;
  for (let n = 1; n < 40; n++) {
    const f = n * f0; if (f > 12000) break;
    const h = G[0] * bp(f, Fz[0], Q[0]) + G[1] * bp(f, Fz[1], Q[1]) + G[2] * bp(f, Fz[2], Q[2]) + mur * lp(f, 320, 0.6);
    P += Math.pow(n, -2 * v.tilt) * h * (v.radio ? bp(f, 1700, 0.9) : lp(f, v.bright, 0.5));
  }
  return P;
}
let REF = 0;
function sylGain(v, vk, f0) {
  REF ||= chainPower(voiceFor('n_hero'), 'a', 195);
  return Math.max(0.05, Math.min(8, Math.sqrt(REF / chainPower(v, vk, f0)))) * (VOWEL_WEIGHT[vk] ?? 0.8);
}
function consGain(v, C, f0) { return C.F ? Math.max(0.05, Math.min(8, Math.sqrt(REF / chainPower(v, null, f0, C.F)))) : 1; }
const LEVEL = 0.37;       // the synthesis's peak syllable gain (Twinsen's "a": sylGain) into the voice bus (before the voice volume)
const CLIP_LEVEL = 0.23;  // the pre-rendered phrases' gain into the voice bus (they are normalised alike, tools/voice-render; VOICES-PIPER: 0.21 -> 0.23 keeps a chapter-1 conversation as loud as with the synthesised banks, -16.8 LUFS)
const LEAD = 0.03;        // schedule this far ahead of the audio clock (never in the past: no clicks)
const CHANNELS = 3;       // pooled synthesis chains: one speaking, the others free or fading
const FADE = 0.025;       // a line cut short (skipped, closed) fades with this time constant, its sources end 0.15 s later
let LAST_HEARD = { key: null, intent: null };   // (Twinsen hesitates before answering a question or a worry)

export class Babble {
  constructor(audio) {
    this.audio = audio;
    this.v = null; this.count = 0; this.key = null; this.text = null; this.opts = {};
    this.ctx = null; this.chans = null; this.utt = null; this.waiting = null;
    this.mev = []; this.mt = 0;   // (FACES-HANDS: the talking mouth's syllables; the game clock, set each frame by driveMouth)
    this.recent = new Map();      // bank id -> the clips it used last (no immediate repeats)
    this.clips = new Set();       // clip sources alive
    this.lines = 0;               // lines spoken (tests)
    this.played = [];             // the last phrases played (bank.clip ids; tests and the render tools)
  }

  // a new speaker (a dialogue box opens, a subtitle starts): the previous voice is released softly.
  // opts.maxDur: the line must fit this many seconds (a cinematic's subtitle)
  start(nameKey, opts = {}) {
    this.hush();
    this.key = nameKey;
    this.v = voiceFor(nameKey);
    this.text = null; this.opts = opts;
    this.audio.duck?.(!!this.v);
    if (this.v) this.prepare([nameKey]);
  }
  // the speaker is done (dialogue closed, scene over): silence now, softly
  stop() { this.hush(); this.v = null; this.audio.duck?.(false); }
  // load the banks these speakers will need (a scene's people, a cinematic's cast); { wait: true } resolves when ready
  prepare(keys, o = {}) {
    const mp = manifest();
    const sr = this.audio.ctx?.sampleRate;
    const go = () => Promise.all(keys.map((k) => { const b = bankOf(voiceFor(k)); return b ? loadBank(b[0], sr) : null; }));
    if (MANIFEST) return o.wait ? go() : (go(), null);
    return mp ? (o.wait ? mp.then(go) : (mp.then(go), null)) : null;
  }
  // FACES-HANDS: the clock the voice is scheduled on: the audio clock while the voice can be heard, the game clock (mt)
  // when it can't (muted, a suspended or missing audio context), so the mouth moves in time with the line either way
  _live() { const A = this.audio, c = A.ctx; return !!(c && c.state === 'running' && A.vol.voice > 0 && A.voiceBus); }

  // the line `text` has typed out from `from` to `to` characters. VOICE-PHRASE: the typing no longer drives the voice:
  // the first characters of a line start its whole utterance, planned at once; later calls change nothing.
  // Returns true when this speaker has a voice (the plain typing blip is then not needed).
  chars(text, from, to) {
    if (!this.v) return false;
    if (text !== this.text || from === 0) { this.text = text; this._line(text); }
    return true;
  }
  // called every frame while a line is up: a line waiting for its bank starts when the bank is ready, or synthesised
  // once it has waited BANK_WAIT
  pump() {
    const W = this.waiting;
    if (!W) return;
    const e = BANKS.get(W.bank[0]);
    const now = this._live() ? this.audio.ctx.currentTime : this.mt;
    if (e?.state === 'ready' || e?.state === 'failed' || now - W.t >= BANK_WAIT) { this.waiting = null; this._speak(W.plan, W.text); }
  }
  // the talking mouth now: {o: how open (0-1), r: how round}; the visible syllables are the audible ones, same timing
  mouth(now = this.mt) {
    const L = this.mev;
    while (L.length && L[0].a + L[0].d < now - 0.2) L.shift();
    let o = 0, r = 0;
    for (const e of L) {
      if (e.a > now) break;
      const u = (now - e.a) / e.d;
      if (u >= 1) continue;
      const k = Math.pow(Math.sin(Math.PI * u), 0.75) * e.o;
      if (k > o) { o = k; r = e.r; }
    }
    return { o, r };
  }
  // is a line being spoken (or about to be)
  get speaking() { return !!this.v && (!!this.waiting || this.mev.some((e) => e.a + e.d > this.mt)); }
  // stop the sound but keep the speaker (the text was skipped to its end, the game paused)
  hush() {
    this.mev.length = 0; this.waiting = null;
    const ctx = this.audio.ctx;
    if (this.utt && ctx) this._release(this.utt, ctx.currentTime);
    this.utt = null;
  }
  // sources alive (for tests: 0 a moment after stop / hush): the synthesis's tones and the phrases playing
  get live() { return (this.chans ? this.chans.filter((c) => c.src).length : 0) + this.clips.size; }
  // utterances that can still be heard, not fading (for tests: never more than one)
  get active() { const t = this.audio.ctx?.currentTime ?? 0; return (this.utt && !this.utt.released && this.utt.end > t ? 1 : 0); }

  // ---------------------------------------------------------------- a line
  _line(text) {
    this.hush();   // (a new line of the same speaker: the last one's voice is released)
    const v = this.v;
    // Twinsen hesitates, sometimes, before answering a question or a worry
    const heard = LAST_HEARD;
    const hes = v.manner === 'hesitate' && heard.key && heard.key !== this.key && (heard.intent === 'ask' || heard.intent === 'worry') && (hashStr(text) % 3) !== 0;
    const plan = planLine(v, text, { maxDur: this.opts.maxDur, hesitate: hes });
    LAST_HEARD = { key: this.key, intent: plan.phrases.length ? plan.phrases[plan.phrases.length - 1].intent : null };
    this.lines++;
    if (!plan.phrases.length) return;
    // the pre-rendered phrases when this voice has them (waiting a moment for a bank still decoding)
    const bank = this._live() && bankOf(v);
    if (bank) {
      const e = BANKS.get(bank[0]);
      if (!e || e.state === 'loading') {
        if (!e) loadBank(bank[0], this.audio.ctx.sampleRate);
        this.waiting = { plan, text, bank, t: this.audio.ctx.currentTime };
        return;
      }
    }
    this._speak(plan, text);
  }
  _speak(plan, text) {
    const live = this._live(), A = this.audio, ctx = A.ctx;
    const now = live ? ctx.currentTime : this.mt;
    const T0 = now + LEAD;
    let syl = null;
    if (live) {
      const b = bankOf(this.v), e = b && BANKS.get(b[0]);
      if (e?.state === 'ready') { e.used = Date.now(); syl = this._clips(plan, text, b, e, T0); }
      if (!syl) syl = this._synth(plan, T0);
      this.count += syl.filter((s) => !s.hum).length;
    } else syl = plan.syl;
    // the talking mouth: one open-and-close per syllable, as far as its vowel opens it, lips shut on m b p v w
    const wall = this.mt + (T0 - now), v = this.v;
    for (const s of syl) {
      const C = s.c && CONS[s.c];
      this.mev.push({ a: wall + s.t + s.cd * 0.5, d: Math.max(0.07, s.vd + s.cd * 0.5), o: (MOUTH_OPEN[s.vk] ?? 0.6) * (C?.lips ? 0.55 : 1) * (s.stress ? 1 : 0.88) * Math.min(1, 0.7 + 0.3 * s.amp) * v.mouth, r: MOUTH_ROUND[s.vk] ?? 0 });
    }
  }

  // ---------------------------------------------------------------- the pre-rendered phrases
  // each clause: the bank's phrase of the same intention and about the same length, one after another with the
  // clause's pause between; returns the syllables (for the mouth), timed from T0
  _clips(plan, text, [id, rate], bank, T0) {
    const ctx = this.audio.ctx, info = MANIFEST.banks[id];
    const recent = this.recent.get(id) || []; this.recent.set(id, recent);
    const h = hashStr(text);
    const out = ctx.createGain(); out.gain.value = CLIP_LEVEL * (info.gain ?? 1) * (this.v.radio ? 1.6 : 1) * (plan.phrases[0]?.quiet ? 0.72 : 1);   // (an aside in parentheses, under the breath)
    let dest = out;
    if (this.v.radio) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.9; out.connect(bp); dest = bp; }
    dest.connect(this.audio.voiceBus);
    const utt = { gain: out, srcs: [], released: false, end: T0, nodes: dest === out ? [out] : [out, dest] };
    const syl = [];
    let t = 0, i = 0, alive = 0;
    const play = (c, r) => {
      const s = ctx.createBufferSource(); s.buffer = bank.buf; s.playbackRate.value = r;
      s.connect(out);
      s.start(T0 + t, c.o, c.d);
      this.clips.add(s); alive++;
      // (the utterance's own nodes go when its last phrase has ended)
      s.onended = () => { s.disconnect(); this.clips.delete(s); if (--alive === 0) for (const n of utt.nodes) n.disconnect(); };
      utt.srcs.push(s);
      this.played.push(`${id}:${c.id}`); if (this.played.length > 128) this.played.shift();
      for (const [st, cd, vd, vk, c0, amp] of c.s) syl.push({ t: t + st / r, cd: cd / r, vd: vd / r, vk, c: c0, amp, stress: amp > 1, hum: vk === 'm' && !c0 });
    };
    // Twinsen's hesitation: his short "hm", then the answer
    if (plan.phrases[0]?.g.syl[0]?.hum && info.len.hm) {
      const c = clipFor(info, 'hm', 1, recent, h);
      if (c) { play(c, rate); t += c.sp + 0.12; }
    }
    for (const ph of plan.phrases) {
      const c = clipFor(info, ph.intent, ph.n, recent, h + i * 31);
      i++;
      if (!c) continue;
      // (a touch of variety each time: within a third of a semitone)
      const r = rate * Math.pow(2, (((h >>> (i % 16)) % 7) - 3) * 0.1 / 12);
      play(c, r);
      // the next clause after this one's speech (its tail of release overlaps the pause) and the pause
      const next = plan.phrases[i];
      t += c.sp / r + (next ? Math.max(0.08, next.t0 - (ph.t0 + ph.g.dur)) : 0);
    }
    if (!alive) for (const n of utt.nodes) n.disconnect();
    utt.end = T0 + t + 0.25;
    this.utt = utt;
    return syl;
  }

  // ---------------------------------------------------------------- the synthesis
  _build(ctx) {
    this.ctx = ctx;
    this.chans = [];
    for (let c = 0; c < CHANNELS; c++) {
      const ch = { src: null, v: null, free: 0 };
      ch.in = ctx.createGain();                                   // tone + breath
      ch.breath = ctx.createGain(); ch.breath.gain.value = 0; ch.breath.connect(ch.in);
      ch.env = ctx.createGain(); ch.env.gain.value = 0;           // the syllables
      ch.F = [0, 1, 2].map(() => {
        const f = ctx.createBiquadFilter(); f.type = 'bandpass';
        const g = ctx.createGain(); ch.in.connect(f); f.connect(g); g.connect(ch.env);
        return { f, g };
      });
      ch.mur = ctx.createBiquadFilter(); ch.mur.type = 'lowpass'; ch.mur.frequency.value = 320; ch.mur.Q.value = 0.6; // the nasal hum
      ch.murG = ctx.createGain(); ch.in.connect(ch.mur); ch.mur.connect(ch.murG); ch.murG.connect(ch.env);
      ch.trem = ctx.createGain(); ch.trem.gain.value = 1; ch.env.connect(ch.trem);
      ch.anti = ctx.createBiquadFilter(); ch.anti.type = 'peaking'; ch.anti.frequency.value = 1000; ch.anti.Q.value = 1.4; ch.trem.connect(ch.anti);
      ch.tone = ctx.createBiquadFilter(); ch.tone.type = 'lowpass'; ch.tone.Q.value = 0.5; ch.anti.connect(ch.tone);
      ch.cons = ctx.createBiquadFilter(); ch.cons.type = 'bandpass'; ch.cons.Q.value = 1.2;   // consonant noise
      ch.consG = ctx.createGain(); ch.consG.gain.value = 0; ch.cons.connect(ch.consG); ch.consG.connect(ch.tone);
      ch.out = ctx.createGain(); ch.tone.connect(ch.out);
      ch.gate = ctx.createGain(); ch.gate.gain.value = 0; ch.out.connect(ch.gate);   // (a line cut short fades here)
      ch.gate.connect(this.audio.voiceBus);
      this.chans.push(ch);
    }
  }
  // fade an utterance out and let its sources end (never revive an ended one)
  _release(u, now) {
    if (u.released) return;
    u.released = true;
    // (held where it is now, then faded: reading .value and setting it again jumped when the value read was a render
    //  quantum stale, e.g. a line released just as it began; a click)
    const g = u.gain.gain;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now); else g.cancelScheduledValues(now);
    g.setTargetAtTime(0, now, FADE);
    const until = now + 0.15;
    for (const s of u.srcs) { if (!s.until || s.until > until) { s.until = until; try { s.stop(until); } catch { /* not started */ } } }
    if (u.ch) u.ch.free = until + 0.01;
    if (u.src) u.src.until = Math.min(u.src.until, until);
  }
  // the whole planned line on one pooled chain: one tone for the line, its syllables joined (voicing carries through
  // the voiced consonants inside a word), pitch and formants gliding; scheduled now, nothing per frame
  _synth(plan, T0) {
    const ctx = this.audio.ctx, v = this.v;
    if (ctx !== this.ctx) this._build(ctx);
    const now = ctx.currentTime;
    // the chain that is free soonest (a line cut short a moment ago may still be fading on another)
    const ch = this.chans.reduce((a, b) => (b.free < a.free ? b : a));
    const t0 = Math.max(T0, ch.free);
    const S = STYLE, dur = plan.dur;
    // ---- configure the chain for this voice
    const P = [ch.env.gain, ch.consG.gain, ch.murG.gain, ch.gate.gain, ...ch.F.flatMap((F) => [F.f.frequency, F.f.Q])];
    for (const p of P) p.cancelScheduledValues(now);
    ch.env.gain.setValueAtTime(0, t0); ch.consG.gain.setValueAtTime(0, t0);
    ch.gate.gain.setValueAtTime(1, t0);   // (t0 is after anything still fading on this chain has ended)
    ch.F[0].g.gain.value = 1; ch.F[1].g.gain.value = 0.6; ch.F[2].g.gain.value = 0.22 * v.f3;
    const mur = 0.06 + v.nasal * 0.3 + (S.hum ? 0.5 : 0);
    ch.murG.gain.setValueAtTime(mur, t0);
    ch.mur.frequency.value = S.hum ? 480 * Math.sqrt(v.k) : 320;
    ch.breath.gain.value = v.breath * 2.2;
    ch.anti.frequency.value = 1050 * v.k; ch.anti.gain.value = -v.nasal * 10;
    if (v.radio) { ch.tone.type = 'bandpass'; ch.tone.frequency.value = 1700; ch.tone.Q.value = 0.9; }
    else { ch.tone.type = 'lowpass'; ch.tone.frequency.value = v.bright; ch.tone.Q.value = 0.5; }
    ch.out.gain.value = v.radio ? 1.6 : 1;   // (each syllable's own gain balances the voices: sylGain)
    ch.v = v;
    // ---- the sources: one tone (with its vibrato), the noise, a bee's flutter, for the whole line
    if (ch.src && ch.src.until > t0) for (const n of ch.src.nodes) { try { n.stop(t0); } catch { /* ended */ } }   // (never later than it was to stop)
    const end = t0 + dur + 0.45;
    const o = ctx.createOscillator(); o.setPeriodicWave(waveFor(ctx, v.tilt));
    const f = (st) => v.f0 * Math.pow(2, st / 12);
    o.frequency.setValueAtTime(f(plan.syl[0].a), t0);
    o.connect(ch.in);
    const vib = ctx.createOscillator(); vib.frequency.value = v.vib[0] || 5;
    const vg = ctx.createGain(); vg.gain.value = 0; vib.connect(vg); vg.connect(o.detune);
    vg.gain.setValueAtTime(0, t0); vg.gain.setTargetAtTime(v.vib[1], t0 + 0.08, 0.15);
    const nodes = [o, vib], all = [o, vib, vg];
    let n = null;
    if (this.audio.noiseBuf) {
      n = ctx.createBufferSource(); n.buffer = this.audio.noiseBuf; n.loop = true;
      n.connect(ch.breath); n.connect(ch.cons); nodes.push(n); all.push(n);
    }
    if (v.trem) {
      const tl = ctx.createOscillator(); tl.frequency.value = v.trem[0];
      const tg = ctx.createGain(); tg.gain.value = v.trem[1] / 2; tl.connect(tg); tg.connect(ch.trem.gain);
      ch.trem.gain.setValueAtTime(1 - v.trem[1] / 2, t0);
      nodes.push(tl); all.push(tl, tg);
    } else ch.trem.gain.setValueAtTime(1, t0);
    const src = { nodes, until: end };
    for (const x of nodes) { x === n ? x.start(t0, (hashStr(this.text || '') % 997) / 997) : x.start(t0); x.stop(end); }
    o.onended = () => { for (const x of all) x.disconnect(); if (ch.src === src) ch.src = null; };
    ch.src = src;
    ch.free = end;
    // ---- the syllables
    const env = ch.env.gain, fr = o.frequency, cg = ch.consG.gain, mg = ch.murG.gain;
    const atk = v.atk / 3, rel = v.rel / 3, dip = Math.min(1.25, 0.35 + 0.8 * Math.min(1.1, v.legato));   // (a legato voice keeps more voicing through a consonant)
    let first = true;
    const syl = plan.syl;
    for (let i = 0; i < syl.length; i++) {
      const s = syl[i], C = s.c ? CONS[s.c] : null, T = t0 + s.t, Tv = T + s.cd;
      const peak = LEVEL * (v.vol ?? 1) * s.amp * sylGain(v, s.vk, f((s.a + s.b) / 2)), prev = syl[i - 1];
      const joined = prev && s.t - (prev.t + prev.cd + prev.vd + (prev.coda ? 0.05 : 0)) < 0.02;   // (no pause before)
      // the consonant: voicing carries on through a voiced one (lower), stops for a voiceless one
      if (C) {
        const lvl = (C.k === 'nasal' ? 0.22 : C.k === 'liquid' ? 0.28 : C.k === 'glide' ? 0.34 : C.k === 'fric' && C.vo ? 0.15 : C.k === 'stop' && C.vo ? 0.06 : 0.02) * dip;
        const pc = LEVEL * (v.vol ?? 1) * s.amp * consGain(v, C, f(s.a));
        env.setTargetAtTime(pc * lvl, T, first || !joined ? atk : 0.01);
        if (C.F) for (let j = 0; j < 3; j++) { const Fz = (j === 0 ? C.F[0] * Math.sqrt(v.k) : C.F[j] * v.k); ch.F[j].f.frequency.setTargetAtTime(Fz, T, 0.015); ch.F[j].f.Q.setTargetAtTime(Fz / (BW[j] * S.bw * Math.sqrt(v.k)), T, 0.015); }
        if (C.k === 'nasal') { mg.setTargetAtTime(mur + 0.12, T, 0.012); mg.setTargetAtTime(mur, Tv, 0.02); }
        if (C.nz && S.cons > 0) {
          const ca = peak * (C.k === 'stop' ? 0.25 : C.vo ? 0.12 : 0.2) * S.cons;
          const ta = C.k === 'stop' ? Tv - 0.012 : T + 0.005, td = C.k === 'stop' ? 0.008 : s.cd * 0.6;
          ch.cons.frequency.setValueAtTime(C.nz * Math.sqrt(v.k), ta);
          cg.setTargetAtTime(ca, ta, 0.004); cg.setTargetAtTime(0, ta + td, 0.012);
        }
      } else if (!first && joined) env.setTargetAtTime(peak * 0.3 * dip, T - 0.015, 0.008);  // (a vowel after a vowel: a light break)
      else if (first || !joined) env.setTargetAtTime(0, T, 0.005);
      // the vowel: formants (and the pitch) glide to it, the voice opens to its peak, then eases off a little
      const vow = VOWELS[s.vk] || VOWELS.a;
      for (let j = 0; j < 3; j++) {
        const Fz = vow[j] * v.k * (j < 2 ? v.vowel[j] : 1);
        ch.F[j].f.frequency.setTargetAtTime(Fz, Tv - 0.008, 0.02);
        ch.F[j].f.Q.setTargetAtTime(Fz / (BW[j] * S.bw * Math.sqrt(v.k)), Tv - 0.008, 0.02);
      }
      if (s.hum) { mg.setTargetAtTime(mur + 0.45, Tv, 0.02); mg.setTargetAtTime(mur, Tv + s.vd, 0.03); }
      fr.setTargetAtTime(f(s.a), Math.max(t0, Tv - 0.025), Math.max(0.008, v.glide / 3));
      fr.setTargetAtTime(f(s.b), Tv + s.vd * 0.35, s.vd * 0.35);
      env.setTargetAtTime(peak, Tv, first || !joined ? atk : 0.012);
      env.setTargetAtTime(peak * 0.84, Tv + Math.max(0.04, s.vd * 0.3), s.vd * 0.6);
      // the end of a clause (or before a pause): a soft release
      const next = syl[i + 1];
      const gapAfter = next ? next.t - (s.t + s.cd + s.vd) : 1;
      if (s.coda) { const cF = CONS[s.coda].F; ch.F[1].f.frequency.setTargetAtTime(cF[1] * v.k, Tv + s.vd, 0.015); env.setTargetAtTime(peak * 0.3, Tv + s.vd, 0.012); mg.setTargetAtTime(mur + 0.3, Tv + s.vd, 0.012); mg.setTargetAtTime(mur, Tv + s.vd + 0.06, 0.02); }
      if (gapAfter > 0.07 || s.last) env.setTargetAtTime(0, Tv + s.vd * 0.85 + (s.coda ? 0.05 : 0), rel * (s.last ? 1.4 : 1));
      first = false;
    }
    const utt = { gain: ch.gate, srcs: nodes, released: false, end: t0 + dur + 0.1, ch, src };
    this.utt = utt;
    return syl.map((s) => ({ ...s, t: s.t + (t0 - T0) }));
  }
}

// FACES-HANDS: whoever is speaking opens and closes their mouth with the voice's syllables (rig.speakMouth; the rig eases it
// and closes it the moment nothing drives it). Called once a frame. The speaker is the actor a dialogue line was given
// (game.say), else the one the voice's name key names ('n_zoe' -> the NPC with id 'zoe', 'n_hero' -> Twinsen): a cinematic's
// subtitles speak by key only. A radio voice has no mouth in the room.
export function driveMouth(game) {
  const B = game.audio?.babble, v = B?.v;
  if (B) B.mt = game.time;
  // VOICE-PHRASE: once a second, the phrase banks of the family and of the people near Twinsen load ahead of their lines
  if (B && game.audio.ctx && !(game.time < (B._nearT ?? 0))) {
    B._nearT = game.time + 1;
    const h = game.hero?.pos, keys = ['n_hero', 'n_zoe', 'n_arthur'];
    if (h) for (const n of game.npcs || []) if (n.present && n.def?.id && n.pos && n.pos.distanceToSquared?.(h) < 400) keys.push('n_' + n.def.id);
    B.prepare(keys);
  }
  if (!v || v.radio || !B.mev.length) return;
  const { o, r } = B.mouth();
  let a = game.state === 'dialog' ? game.speaker : null;
  if (!a && B.key?.startsWith('n_')) {
    const id = B.key.slice(2);
    a = id === 'hero' ? game.hero : game.npcs?.find((n) => n.def?.id === id && n.present);
  }
  a?.rig?.speakMouth?.(o, r);
}
