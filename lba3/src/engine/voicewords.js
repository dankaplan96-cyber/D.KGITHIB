// P18-VOICES (the user, 12.11: "The characters' voices are fine. I want it to sound more like English in terms of the
// letters, if possible"): a line's babble shaped by its own English words. Pure planning, no audio.
//
// The line's text is read with simple English letter-to-sound rules: consonant digraphs (th, sh, ch, ph, wh, ck, ng,
// qu, tch, dge), vowel digraphs (ee, ea, oo, ou, ow, ai, ay, oa, oi, au, igh ...), a silent final e that lengthens the
// vowel before it (name, time, hope), soft c and g, an s between vowels voiced, a short list of common words that
// break the rules (the, one, said, would ...), r after a vowel, -tion, -le. The phones are put into syllables (the
// most consonants that can start an English syllable go to the next one), each word gets its stress (content words;
// the small words are left unstressed and quick), and the line's punctuation gives its clauses, pauses and
// intentions (voiceplan.js clauses()). The phones are the voice tables' own (VOWELS, CONS).
//
// It stays babble, not speech: each consonant may move to a neighbour of the same kind (p t k, b d g, f th s sh, m n,
// l r ...), more readily to one the speaker or their people favour (VOICES cons, voiceplan PHON), a few vowels move to
// the next one, and each people colours the sounds (Esmers soften stops, moles hum, Mosquibees buzz, machines clip).
// The word's shape (its length, stress, vowels, where its consonants are) is kept; most of its letters are not.
//
// The speaker keeps their pace, melody, manner and range (the same formulas as voiceplan.js gesture()), and the line
// keeps about the length the classic plan gives it (planClassic), so the typing and the voice end together: a long
// line's small words go first, then it is spoken up to a quarter quicker, then (a cinematic's subtitle) its last
// clauses go.
import { VOWELS, CONS, rng, hashStr, clauses, speech, planClassic } from './voiceplan.js';

// ---------------------------------------------------------------- phones
// vowels: the VOWELS key, and for a diphthong the one it glides to
const V = {
  iy: ['i'], ih: ['ih'], ey: ['e', 'ih'], eh: ['e'], ae: ['ae'], aa: ['a'], ao: ['o'], ow: ['o', 'uu'], uh: ['uu'], uw: ['u'],
  ah: ['uh'], ax: ['ax'], er: ['er'], ay: ['a', 'ih'], aw: ['a', 'uu'], oy: ['o', 'ih'],
};
const LONG = new Set(['iy', 'ey', 'ow', 'uw', 'ay', 'aw', 'oy', 'er', 'ao']);
const isV = (p) => p.replace(/[012]$/, '') in V;

// words that break the rules (ARPAbet-like; a 1 marks the stressed vowel of a word of more than one syllable)
const EXC = {
  the: 'dh ax', a: 'ax', an: 'ax n', and: 'ax n d', to: 't ax', of: 'ax v', you: 'y uw', your: 'y ao r', i: 'ay', is: 'ih z',
  was: 'w ax z', are: 'aa r', were: 'w er', do: 'd uw', does: 'd ah z', done: 'd ah n', said: 's eh d', says: 's eh z',
  one: 'w ah n', once: 'w ah n s', two: 't uw', who: 'h uw', whose: 'h uw z', what: 'w ah t', where: 'w eh r', there: 'dh eh r',
  here: 'h iy r', their: 'dh eh r', they: 'dh ey', have: 'h ae v', give: 'g ih v', live: 'l ih v', come: 'k ah m', some: 's ah m',
  love: 'l ah v', above: 'ax b ah1 v', move: 'm uw v', gone: 'g ao n', been: 'b ih n', again: 'ax g eh1 n', any: 'eh1 n iy',
  many: 'm eh1 n iy', eye: 'ay', oh: 'ow', ok: 'ow k ey1', okay: 'ow k ey1', could: 'k uh d', would: 'w uh d', should: 'sh uh d',
  through: 'th r uw', though: 'dh ow', enough: 'ih n ah1 f', thought: 'th ao t', bought: 'b ao t', brought: 'b r ao t',
  laugh: 'l ae f', island: 'ay1 l ax n d', people: 'p iy1 p ax l', water: 'w ao1 t er', door: 'd ao r', floor: 'f l ao r',
  poor: 'p uh r', sure: 'sh uh r', busy: 'b ih1 z iy', women: 'w ih1 m ih n', woman: 'w uh1 m ax n', friend: 'f r eh n d',
  head: 'h eh d', dead: 'd eh d', bread: 'b r eh d', ready: 'r eh1 d iy', heavy: 'h eh1 v iy', weather: 'w eh1 dh er',
  breakfast: 'b r eh1 k f ax s t', instead: 'ih n s t eh1 d', ahead: 'ax h eh1 d', break: 'b r ey k', great: 'g r ey t',
  heart: 'h aa r t', hear: 'h iy r', year: 'y iy r', early: 'er1 l iy', earth: 'er th', learn: 'l er n', heard: 'h er d',
  fire: 'f ay r', hour: 'aw r', our: 'aw r', four: 'f ao r', for: 'f ao r', from: 'f r ah m', off: 'ao f', into: 'ih1 n t uw',
  only: 'ow1 n l iy', very: 'v eh1 r iy', every: 'eh1 v r iy', nothing: 'n ah1 th ih ng', something: 's ah1 m th ih ng',
  mother: 'm ah1 dh er', brother: 'b r ah1 dh er', other: 'ah1 dh er', another: 'ax n ah1 dh er', front: 'f r ah n t',
  month: 'm ah n th', money: 'm ah1 n iy', son: 's ah n', young: 'y ah ng', touch: 't ah ch', country: 'k ah1 n t r iy',
  double: 'd ah1 b ax l', trouble: 't r ah1 b ax l', father: 'f aa1 dh er', together: 't ax g eh1 dh er', whether: 'w eh1 dh er',
  either: 'iy1 dh er', rather: 'r ae1 dh er', put: 'p uh t', push: 'p uh sh', pull: 'p uh l', full: 'f uh l', book: 'b uh k',
  look: 'l uh k', good: 'g uh d', foot: 'f uh t', took: 't uh k', stood: 's t uh d', wood: 'w uh d', food: 'f uw d',
  get: 'g eh t', girl: 'g er l', gift: 'g ih f t', begin: 'b ih g ih1 n', "you're": 'y ao r', "it's": 'ih t s',
  "i'm": 'ay m', "i'll": 'ay l', "i've": 'ay v', "i'd": 'ay d', "don't": 'd ow n t', "won't": 'w ow n t', "can't": 'k ae n t',
  "isn't": 'ih1 z ax n t', "doesn't": 'd ah1 z ax n t', "didn't": 'd ih1 d ax n t', "let's": 'l eh t s', "that's": 'dh ae t s',
  "what's": 'w ah t s', "there's": 'dh eh r z', "he's": 'h iy z', "she's": 'sh iy z', "we're": 'w iy r', "they're": 'dh eh r',
  everyone: 'eh1 v r iy w ah n', everybody: 'eh1 v r iy b aa d iy', everything: 'eh1 v r iy th ih ng', anyone: 'eh1 n iy w ah n',
  someone: 's ah1 m w ah n', nobody: 'n ow1 b aa d iy', lighthouse: 'l ay1 t h aw s', yesterday: 'y eh1 s t er d ey', hi: 'h ay', hey: 'h ey', mr: 'm ih1 s t er', mrs: 'm ih1 s ax z', dr: 'd aa1 k t er', zoe: 'z ow1 iy', zoé: 'z ow1 iy', twinsen: 't w ih1 n s ax n',
  baldino: 'b ae l d iy1 n ow', vesk: 'v eh s k', sendell: 's eh1 n d ax l', arthur: 'aa1 r th er', citadel: 's ih1 t ax d eh l',
  zeelich: 'z iy1 l ih ch', funfrock: 'f ah1 n f r aa k', kashes: 'k ae1 sh ax z', hello: 'h ax l ow1', yes: 'y eh s',
  no: 'n ow', so: 's ow', go: 'g ow', also: 'ao1 l s ow', hm: 'm', hmm: 'm', mm: 'm', shh: 'sh', psst: 'p s t',
};
// the small words: unstressed and quick, the first to go from a long line
const FUNC = new Set(('a an the and or but if of to in on at by for from with as is am are was were be been it its it\'s he she we ' +
  'they you i me him her us them my your his our their this that these those do does did has have had will would shall should ' +
  'can could may might must so than then there up out just too into onto about i\'m i\'ll you\'re').split(' '));
// first syllables that are a prefix (the stress moves to the next one)
const PREFIX = /^(a|be|re|de|un|in|im|ex|for|to|per|pro|con|com|dis|mis|pre|sus|ab|ad|ob|en|em)/;
const ONSETS = new Set(['pl', 'bl', 'kl', 'gl', 'fl', 'sl', 'pr', 'br', 'tr', 'dr', 'kr', 'gr', 'fr', 'thr', 'shr', 'sw', 'tw', 'kw',
  'dw', 'sm', 'sn', 'sp', 'st', 'sk', 'spl', 'spr', 'str', 'skr', 'skw', 'thw', 'py', 'by', 'ky', 'fy', 'my', 'hy', 'vy']);
const VOICED = new Set(['b', 'd', 'g', 'v', 'dh', 'z', 'zh', 'j', 'm', 'n', 'ng', 'l', 'r', 'w', 'y']);

const AE = 'aeiouy';
const isVL = (ch) => !!ch && AE.includes(ch);   // (a vowel letter; '' past the word's end is none)
// one written word -> phones ('dh', 'ax', 'ey1' ...)
export function g2p(word) {
  let w = word.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-zà-ÿ']/g, '');
  if (!w) return [];
  if (EXC[w]) return EXC[w].split(' ');
  // possessive / contracted endings: the word, then its ending
  let tail = [];
  const m = w.match(/^(.+?)'(s|ll|re|ve|d|m|t)$/);
  if (m) {
    const base = g2p(m[1]); const last = base[base.length - 1]?.replace(/[012]$/, '');
    const suf = { s: [last && /^(s|z|sh|zh|ch|j)$/.test(last) ? 'ax' : null, last && !VOICED.has(last) && !isV(last) ? 's' : 'z'], ll: ['l'], re: ['r'], ve: ['v'], d: ['d'], m: ['m'], t: ['t'] }[m[2]].filter(Boolean);
    return [...base, ...suf];
  }
  w = w.replace(/'/g, '').replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i').replace(/[òóôö]/g, 'o').replace(/[ùúûü]/g, 'u');
  // a plural or past ending on a word with a silent e (names, hoped, times): read the stem, then the ending
  let m2;
  if ((m2 = w.match(/^(.*[^aeiou][aeiou][^aeiouwxy])e(s|d)$/)) && m2[1].length >= 2) {
    const base = g2p(m2[1] + 'e'); const last = base[base.length - 1];
    if (m2[2] === 's') tail = /^(s|z|sh|zh|ch|j)$/.test(last) ? ['ax', 'z'] : [VOICED.has(last) ? 'z' : 's'];
    else tail = /^(t|d)$/.test(last) ? ['ih', 'd'] : [VOICED.has(last) || isV(last) ? 'd' : 't'];
    return [...base, ...tail];
  }
  const out = [];
  const n = w.length;
  const at = (i) => w[i] || '';
  const vowelAt = (i) => isVL(at(i)) && !(at(i) === 'y' && isVL(at(i + 1)));
  // silent final e: a single vowel, one consonant (or th, ch, sh ...), then a final e: that vowel is long
  const magic = (i) => {
    const r = w.slice(i + 1);
    return /^(th|ch|sh|ph|[bcdfgklmnprstvz])e$/.test(r) && !(w === 'there' || w === 'where');
  };
  for (let i = 0; i < n;) {
    const c = at(i), r = w.slice(i);
    const firstSyl = i === 0;
    // ---- endings and longer spellings first
    if (r === 'tion' || r === 'tions') { out.push('sh', 'ax', 'n'); if (r.endsWith('s')) out.push('z'); i = n; continue; }
    if (r === 'sion') { out.push(isVL(at(i - 1)) ? 'zh' : 'sh', 'ax', 'n'); i = n; continue; }
    if (r === 'ture') { out.push('ch', 'er'); i = n; continue; }
    if (r === 'oes') { out.push('ow', 'z'); i = n; continue; }
    if (r === 'ous') { out.push('ax', 's'); i = n; continue; }
    if (r === 'le' && i > 0 && !isVL(at(i - 1))) { out.push('ax', 'l'); i = n; continue; }
    if (r === 'ed' && i > 1 && !vowelAt(i - 1)) { const l = out[out.length - 1]; if (l === 't' || l === 'd') out.push('ih', 'd'); else out.push(VOICED.has(l) ? 'd' : 't'); i = n; continue; }
    if (r === 'es' && i > 1 && /(s|z|x|sh|ch)$/.test(w.slice(0, i))) { out.push('ax', 'z'); i = n; continue; }
    if (r.startsWith('igh')) { out.push('ay'); i += 3; continue; }
    if (r.startsWith('eigh')) { out.push('ey'); i += 4; continue; }
    if (r.startsWith('ough')) { out.push('ao'); i += 4; continue; }
    if (r.startsWith('augh')) { out.push('ao'); i += 4; continue; }
    if (r.startsWith('tch')) { out.push('ch'); i += 3; continue; }
    if (r.startsWith('dge')) { out.push('j'); i += 3; continue; }
    if (r.startsWith('sch')) { out.push('s', 'k'); i += 3; continue; }
    // ---- consonant pairs
    const two = r.slice(0, 2);
    if (two === 'th') { out.push((/ther/.test(r) && i > 0) || /^th(at|is|ese|ose|em|en|an|us|y|ee|ine)$/.test(w) ? 'dh' : 'th'); i += 2; continue; }
    if (two === 'sh') { out.push('sh'); i += 2; continue; }
    if (two === 'ch') { out.push('ch'); i += 2; continue; }
    if (two === 'ph') { out.push('f'); i += 2; continue; }
    if (two === 'wh') { out.push('w'); i += 2; continue; }
    if (two === 'ck') { out.push('k'); i += 2; continue; }
    if (two === 'ng') { if (/[eiy]/.test(at(i + 2))) out.push('n', 'j'); else out.push('ng'); i += 2; continue; }
    if (two === 'nk') { out.push('ng', 'k'); i += 2; continue; }
    if (two === 'qu') { out.push('k', 'w'); i += 2; continue; }
    if (two === 'gh') { if (firstSyl) out.push('g'); i += 2; continue; }
    if (firstSyl && (two === 'kn' || two === 'gn')) { out.push('n'); i += 2; continue; }
    if (firstSyl && two === 'wr') { out.push('r'); i += 2; continue; }
    if (two === 'mb' && i + 2 === n) { out.push('m'); i += 2; continue; }
    // ---- vowel pairs
    if (two === 'ee') { out.push('iy'); i += 2; continue; }
    if (two === 'ea') { out.push('iy'); i += 2; continue; }
    if (two === 'ei') { out.push('ey'); i += 2; continue; }
    if (two === 'ey') { out.push(i + 2 === n && n > 3 ? 'iy' : 'ey'); i += 2; continue; }
    if (two === 'ie') { out.push(i + 2 === n ? 'ay' : 'iy'); i += 2; continue; }
    if (two === 'oo') { out.push(/^oo(k|d)/.test(r) ? 'uh' : 'uw'); i += 2; continue; }
    if (two === 'oa') { out.push('ow'); i += 2; continue; }
    if (two === 'oe' && i + 2 === n) { out.push('ow'); i += 2; continue; }
    if (two === 'oi' || two === 'oy') { out.push('oy'); i += 2; continue; }
    if (two === 'ou') { out.push(/^oul/.test(r) ? 'uh' : 'aw'); i += 2; continue; }
    if (two === 'ow') {
      const end = i + 2 === n || (i + 3 === n && /[ns]/.test(at(i + 2)));
      out.push(end && !/^(how|now|cow|wow|allow|vow|brow)/.test(w) && !/(down|town|brown|clown|crown|gown|frown)$/.test(w) ? 'ow' : 'aw'); i += 2; continue;
    }
    if (two === 'au' || two === 'aw') { out.push('ao'); i += 2; continue; }
    if (two === 'ai' || two === 'ay') { out.push('ey'); i += 2; continue; }
    if (two === 'ew' || two === 'ue' || two === 'ui' || two === 'eu') { out.push('uw'); i += 2; continue; }
    // ---- r after a vowel
    if (/^(er|ir|ur)/.test(r) && !vowelAt(i + 2)) { out.push('er'); i += 2; continue; }
    if (/^ar/.test(r) && !vowelAt(i + 2)) { out.push(at(i - 1) === 'w' ? 'ao' : 'aa', 'r'); i += 2; continue; }
    if (/^or/.test(r) && !vowelAt(i + 2)) { out.push(at(i - 1) === 'w' ? 'er' : 'ao', 'r'); i += 2; continue; }
    // ---- single letters
    if (vowelAt(i)) {
      const long = magic(i);
      let p;
      if (c === 'a') p = long ? 'ey' : /^a(ll|lk|lt)/.test(r) ? 'ao' : at(i - 1) === 'w' && !/^a(ck|g|x)/.test(r) ? 'aa' : i + 1 === n ? 'ax' : 'ae';
      else if (c === 'e') p = long ? 'iy' : i + 1 === n ? (n <= 3 && !out.some(isV) ? 'iy' : null) : 'eh';
      else if (c === 'i') p = long ? 'ay' : /^i(nd|ld)/.test(r) ? 'ay' : i + 1 === n ? 'iy' : 'ih';
      else if (c === 'o') p = long ? 'ow' : /^o(ld|lt|st$)/.test(r) || i + 1 === n ? 'ow' : 'aa';
      else if (c === 'u') p = long ? 'uw' : /^u(ll|sh)/.test(r) && /[bpf]/.test(at(i - 1)) ? 'uh' : 'ah';
      else p = i + 1 === n ? (out.some(isV) ? 'iy' : 'ay') : 'ih';   // y as a vowel
      if (p) out.push(p);   // (a final e after a vowel sound is silent: p is null)
      i++;
      continue;
    }
    if (c === 'e' && i + 1 === n) { i++; continue; }   // (silent)
    if (c === at(i + 1) && !isVL(c)) { i++; continue; }   // (a double consonant is one)
    if (c === 'c') { out.push(/[eiy]/.test(at(i + 1)) ? 's' : 'k'); i++; continue; }
    if (c === 'g') { out.push(/[eiy]/.test(at(i + 1)) && i > 0 && at(i - 1) !== 'g' ? 'j' : 'g'); i++; continue; }
    if (c === 'h' && i > 0 && !vowelAt(i + 1)) { i++; continue; }   // (oh, ah: silent)
    if (c === 's') { out.push(i > 0 && vowelAt(i - 1) && vowelAt(i + 1) ? 'z' : i + 1 === n && i > 1 && (VOICED.has(out[out.length - 1]) || isV(out[out.length - 1] || '')) && !/ss$|us$|is$/.test(w) ? 'z' : 's'); i++; continue; }
    if (c === 'x') { out.push(...(i === 0 ? ['z'] : ['k', 's'])); i++; continue; }
    if (c === 'y') { out.push('y'); i++; continue; }
    if (c === 'j') { out.push('j'); i++; continue; }
    if (c === 'q') { out.push('k'); i++; continue; }
    if ('bdfhklmnprtvwz'.includes(c)) { out.push(c); i++; continue; }
    i++;
  }
  return out;
}

// phones -> syllables [{ on: [cons], v: vowel phone, co: [cons], stress }]; a word with no vowel is one hum
export function syllabify(ph, word) {
  const idx = []; ph.forEach((p, i) => { if (isV(p)) idx.push(i); });
  if (!idx.length) return ph.length ? [{ on: ph.filter((p) => p !== 'm' && CONS[p]), v: 'hum', co: [], stress: 0 }] : [];
  const syl = idx.map((i) => ({ on: [], v: ph[i].replace(/[012]$/, ''), co: [], stress: /1$/.test(ph[i]) ? 1 : 0 }));
  syl[0].on = ph.slice(0, idx[0]);
  for (let k = 0; k < idx.length - 1; k++) {
    const mid = ph.slice(idx[k] + 1, idx[k + 1]);
    // the most consonants that can begin a syllable go to the next one
    let split = mid.length;
    for (let j = 0; j < mid.length; j++) { const o = mid.slice(j); if (o.length === 1 ? o[0] !== 'ng' : ONSETS.has(o.join(''))) { split = j; break; } }
    syl[k].co = mid.slice(0, split); syl[k + 1].on = mid.slice(split);
  }
  syl[syl.length - 1].co = ph.slice(idx[idx.length - 1] + 1);
  // the word's stress: marked, else the first syllable, the second after a prefix, the one before -tion / -ic
  if (!syl.some((s) => s.stress)) {
    let k = 0;
    const w = (word || '').toLowerCase();
    if (syl.length >= 2) {
      if (/(tion|sion|ic|ical|ity|ian)s?$/.test(w)) k = Math.max(0, syl.length - 2);
      else if (/(ee|eer|oon|ese|ique)s?$/.test(w)) k = syl.length - 1;
      else if (PREFIX.test(w) && w.length > 4 && syl.length >= 2 && !/^(under|over|after|ever|every|enter|open|other|answer|any|ever)/.test(w)) k = 1;
    }
    syl[k].stress = 1;
  }
  return syl;
}

// ---------------------------------------------------------------- keeping it babble, in the speaker's colour
// the neighbours a consonant may move to: same manner, same voicing
const KIN = [['p', 't', 'k'], ['b', 'd', 'g'], ['f', 'th', 's', 'sh'], ['v', 'dh', 'z', 'zh'], ['m', 'n'], ['l', 'r'], ['w', 'y']];
const kinOf = (p) => KIN.find((g) => g.includes(p)) || [p];
const VNEAR = { iy: 'ih', ih: 'iy', eh: 'ae', ae: 'eh', aa: 'ah', ah: 'aa', ao: 'aa', uw: 'uh', uh: 'uw', ey: 'eh', ow: 'ao', er: 'ah', ax: 'ah', ay: 'aa', aw: 'ao', oy: 'ao' };
// the peoples' colours: what happens to a sound in their mouths (probability per sound)
const RACE_SUB = {
  esmer: [0.5, { p: 'b', t: 'd', k: 'g', ch: 'j', s: 'z', f: 'v' }],               // sung and soft: voiced stops and fricatives
  mole: [0.45, { b: 'm', p: 'm', d: 'n', t: 'n', g: 'ng', k: 'ng', v: 'm', z: 'n' }], // a closed-mouth hum
  bee: [0.55, { s: 'z', th: 'z', sh: 'zh', f: 'v', ch: 'j', t: 'd' }],              // a buzz
  tri: [0.4, { f: 'p', s: 't', sh: 't', th: 't', v: 'b', z: 'd', l: 'd', r: 'd' }],   // clipped
  robot: [0.6, { f: 'p', s: 't', sh: 't', th: 't', v: 'b', z: 'd', l: 'd', r: 'd', w: 'b', y: 'd', h: 'k' }],
  spirit: [0.4, { p: 'b', t: 'd', k: 'h', ch: 'sh', g: 'h', b: 'm' }],              // breathy, no hard edges
  beast: [0.7, { p: 'b', t: 'd', k: 'g', s: 'h', f: 'h', sh: 'h', ch: 'g', l: 'm', r: 'm', n: 'm' }],
  sphero: [0.35, { t: 'd', k: 'g', p: 'b', s: 'z' }],
};
// one consonant as the speaker says it
function colourCons(p, v, r, fav) {
  const R = RACE_SUB[v.race];
  if (R && R[1][p] && r() < R[0]) p = R[1][p];
  // the blur: often enough that the word is not heard as a word, more readily for a sound the speaker doesn't favour
  const kin = kinOf(p);
  if (kin.length > 1 && r() < (fav.has(p) ? 0.22 : 0.4)) {
    const others = kin.filter((x) => x !== p), fv = others.filter((x) => fav.has(x));
    const from = fv.length && r() < 0.7 ? fv : others;
    p = from[Math.floor(r() * from.length)];
  }
  return CONS[p] ? p : 'n';
}

// ---------------------------------------------------------------- the line
// the speaker's favoured consonants as phones
function favoured(v, S) {
  const f = new Set();
  for (const ch of S.cons) f.add(ch);
  return f;
}
const PENTA = [0, 2, 4, 7, 9, 12];
function quantize(st, mode) {
  if (mode === 'whole') return Math.round(st / 2) * 2;
  const o = Math.floor(st / 12), rr = st - o * 12;
  let best = 0, bd = 99;
  for (const p of PENTA) { const d = Math.abs(p - rr); if (d < bd) { bd = d; best = p; } }
  return o * 12 + best;
}

// a clause's words: [{ w, fn, syl: [{ on, v, co, stress }] }]
export function clauseWords(s) {
  const out = [];
  for (const w of s.match(/[A-Za-zÀ-ÿ']+|\d+/g) || []) {
    let word = w;
    if (/^\d+$/.test(w)) word = ['oh', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][+w[w.length - 1]] + (w.length > 1 ? 'ty' : '');
    const lw = word.toLowerCase().replace(/^'+|'+$/g, '');
    if (!lw) continue;
    const syl = syllabify(g2p(lw), lw);
    if (!syl.length) continue;
    const fn = FUNC.has(lw);
    if (fn) for (const x of syl) x.stress = 0;
    out.push({ w: lw, fn, syl });
  }
  return out;
}

// one clause, spoken: the gesture voiceplan.js makes ({ syl, dur, leg, breath }), its syllables from its words.
// words: from clauseWords (some may be marked .drop); o: { speed, quiet, hesitate, squeeze (how much the small words
// and unstressed vowels are shortened, 0-1) }
// VOICE-2 (o.v2, the Words voice after 14.11): the stressed syllables longer and louder, the small words quicker and
// softer, a wider melody with a clear accent on the clause's key word (o.emph, from the metadata), a question's rise
// larger; measured before: every syllable within about 2 dB of the next (the Piper phrases 3-8 dB), the melody's
// spread 1.2-2.6 semitones (the phrases 2-3.4)
const X1 = { range: 1, sd: 1.2, ud: 0.82, sa: 1.12, fa: 0.86, nuc: 0.38, nucA: 1.06, rise: 1 };
const X2 = { range: 1.45, sd: 1.3, ud: 0.72, sa: 1.28, fa: 0.72, nuc: 0.55, nucA: 1.12, rise: 1.4 };
function speakClause(v, words, intent, seed, o = {}) {
  const X = o.v2 ? X2 : X1;
  const r = rng(seed), S = speech(v), R0 = S.range, fav = favoured(v, S);
  const mod = [...({ tell: [1, 0, 1, 1], ask: [1, 0.05, 1, 1], excl: [1.35, 0.18, 0.95, 1.1], no: [0.65, -0.12, 0.92, 1], worry: [0.5, 0.12, 1.08, 0.85], warm: [1, 0.05, 1.06, 0.92], cont: [1, 0, 0.98, 1], unsure: [0.7, 0.02, 1.12, 0.85] }[intent] || [1, 0, 1, 1])];
  if (intent === 'worry' && v.manner === 'sharp') { mod[0] = 0.7; mod[1] = 0.08; mod[2] = 0.94; mod[3] = 0.95; }
  const R = R0 * mod[0] * X.range, off = mod[1] * R0, dScale = mod[2] / (o.speed || 1), ampI = mod[3] * (o.quiet ? 0.72 : 1);
  const clipped = (S.manner === 'clipped' && (intent === 'no' || intent === 'excl')) || (S.manner === 'sharp' && intent === 'worry');
  const sq = o.squeeze || 0;
  const W = words.filter((x) => !x.drop);
  const n = W.reduce((a, x) => a + x.syl.length, 0);
  const syl = [];
  let t = 0, k = 0;
  if (o.hesitate) { syl.push({ t: 0, c: '', cd: 0, vk: 'm', vd: 0.2, coda: '', a: -0.25 * R0, b: -0.4 * R0, amp: 0.45, stress: false, wEnd: true, last: false, hum: true, on: [], co: [] }); t = 0.32; }
  const ask = S.ask === 'mix' ? (r() < 0.6 ? 'rise' : 'high') : S.ask;
  // the clause's nuclear accent: its last stressed syllable
  let nucK = -1; { let kk = 0; for (const x of W) for (const s of x.syl) { if (s.stress) nucK = kk; kk++; } }
  // (VOICE-2: the word the metadata names carries the accent)
  if (o.emph) { const e = String(o.emph).toLowerCase().replace(/[^\p{L}\d']/gu, ''); let kk = 0; for (const x of W) { if (x.w === e) { const j = Math.max(0, x.syl.findIndex((s) => s.stress)); nucK = kk + j; x.syl[j].stress = 1; break; } kk += x.syl.length; } }
  for (let wi = 0; wi < W.length; wi++) {
    const word = W[wi], lastWord = wi === W.length - 1;
    if (S.manner === 'momentum' && lastWord && n >= 5) t += 0.17;
    if (S.manner === 'spacious' && wi > 0) t += 0.05;
    if (wi > 0) t += Math.max(0, 1.05 - S.legato) * 0.2 / dScale;
    for (let j = 0; j < word.syl.length; j++, k++) {
      const P = word.syl[j], p = n > 1 ? k / (n - 1) : 1, last = k === n - 1, stress = !!P.stress, nuclear = k === nucK;
      const wEnd = j === word.syl.length - 1;
      // the sounds, as this speaker says them
      const on = P.on.map((c) => colourCons(c, v, r, fav)), co = P.co.map((c) => colourCons(c, v, r, fav));
      let vp = P.v === 'hum' ? 'hum' : P.v;
      if (vp !== 'hum') {
        // an unstressed short vowel in a content word mostly reduces to a schwa; a few vowels move to the next
        if (!stress && !word.fn && /^(ae|eh|aa|ah|ao)$/.test(vp) && r() < 0.55) vp = 'ax';
        else if (r() < 0.14 && VNEAR[vp]) vp = VNEAR[vp];
      }
      const VV = vp === 'hum' ? ['m'] : V[vp];
      // the length: the speaker's pace, longer when stressed, at the end of a word and (most) at the end of the clause
      let base = 1 / S.pace;
      if (S.manner === 'momentum') base *= 1.15 - 0.32 * Math.min(1, p / 0.7) + (lastWord ? 0.3 : 0);
      if (S.manner === 'spacious') base *= 1.2;
      if (clipped) base *= 0.86;
      const cl = on.length > 1 ? 0.72 : 1;
      // (a voiceless stop's closure a little shorter than the table's: a silent gap is the one thing that breaks a line)
      const clo = (c) => (CONS[c].k === 'stop' && !CONS[c].vo ? 0.8 : 1);
      const ons = on.map((c) => +(CONS[c].d * clo(c) * cl * (clipped ? 0.85 : 1) * (word.fn ? 0.8 : 1) * dScale).toFixed(4));
      const cos = co.map((c) => +(CONS[c].d * clo(c) * 0.8 * (co.length > 1 ? 0.75 : 1) * (word.fn ? 0.8 : 1) * dScale).toFixed(4));
      const cd = ons.reduce((a, x) => a + x, 0), cod = cos.reduce((a, x) => a + x, 0);
      // (the vowel gives up most of its consonants' time: a syllable heavy with consonants is about as long as a light
      //  one, so the speaker keeps their syllables a second)
      let vd = base * (stress ? X.sd : word.fn ? 0.66 - 0.12 * sq : X.ud - 0.1 * sq) - cd * 0.8 - cod * 0.75;
      if (VV.length > 1 || LONG.has(vp)) vd *= 1.12; else if (vp === 'ax') vd *= 0.72;
      vd = Math.max(word.fn ? 0.04 : 0.05, vd);
      if (wEnd) vd *= 1.06;
      if (last) vd *= clipped ? 1.1 : intent === 'cont' ? 1.15 : intent === 'warm' ? 1.5 : 1.35;
      if (k === 0 && o.hesitate) vd *= 1.25;
      if (vp === 'hum') vd *= 1.6;   // (a word with no vowel, hm, shh: a held hum)
      vd *= dScale * (0.93 + r() * 0.14);
      // the melody (as voiceplan.js gesture(): declination, the speaker's contour, accents, the intention's ending)
      let st = R * (0.3 - 0.6 * p) * ({ fall: 1.3, flat: 0.4, step: 0.8 }[v.contour] ?? 1) + off;
      switch (v.contour) {
        case 'arc': st += 0.35 * R * Math.sin(Math.PI * Math.min(1, p * 1.1)); break;
        case 'sing': st += 0.3 * R * Math.sin(2 * Math.PI * (p * 1.1 + (v.seed % 7) / 7)); break;
        case 'bounce': st += (k % 2 ? 0.16 : -0.1) * R; break;
        case 'zigzag': st += [0.24, -0.16, 0.12, -0.08][k % 4] * R; break;
        case 'boing': st += 0.2 * R * Math.sin(Math.PI * p); break;
      }
      if (stress) st += (nuclear ? X.nuc : 0.22) * R * (intent === 'excl' ? 1.3 : intent === 'no' ? 0.5 : 1);
      else if (word.fn) st -= 0.08 * R;
      st += (r() - 0.5) * 0.24 * R * Math.min(1, v.jit / 0.45);
      let a = st, b = st - 0.06 * R;
      if (last) {
        if (intent === 'ask' && ask === 'rise') { b = a + Math.max(3, 0.6 * R0) * X.rise; }
        else if (intent === 'ask') { a += 0.45 * R0; b = a + 0.1 * R0; }
        else if (intent === 'cont') b = a + 0.15 * R0;
        else if (intent === 'unsure') b = a + 0.22 * R0;
        else if (intent === 'warm') { a += 0.15 * R0; b = a - 0.55 * R0; }
        else if (intent === 'worry') b = a - 0.15 * R0;
        else if (intent === 'excl') b = a - 0.5 * R0;
        else b = a - (intent === 'no' ? 0.45 : 0.35) * R0;
      } else if (intent === 'ask' && ask === 'high' && nuclear) { a += 0.45 * R0; b = a; }
      if (v.quant === 'penta' || v.quant === 'whole') { a = quantize(a, v.quant); b = last ? b : a; }
      a = Math.max(-1.2 * R0 - 2, Math.min(1.4 * R0 + 3, a)); b = Math.max(-1.2 * R0 - 3, Math.min(1.4 * R0 + 5, b));
      const amp = ampI * (stress ? X.sa : word.fn ? X.fa : 0.94) * (nuclear ? X.nucA : 1) * (1 - 0.2 * p) * (last ? 0.9 : 1) * (0.95 + r() * 0.1);
      syl.push({
        t, c: on[0] || '', cd: +cd.toFixed(4), vk: VV[0], vk2: VV[1] || null, vd: +vd.toFixed(4), coda: '', cod: +cod.toFixed(4),
        on: on.map((c, i) => [c, ons[i]]), co: co.map((c, i) => [c, cos[i]]),
        a: +a.toFixed(3), b: +b.toFixed(3), amp: +amp.toFixed(3), stress, wEnd, last, hum: vp === 'hum' || undefined,
      });
      t += cd + vd + cod;
    }
  }
  const mid = syl.filter((x) => !x.hum).map((x) => (x.a + x.b) / 2).sort((x, y) => x - y)[Math.floor(syl.length / 2)] || 0;
  for (const x of syl) { x.a = +(x.a - mid * 0.85).toFixed(3); x.b = +(x.b - mid * 0.85).toFixed(3); }
  return { syl, dur: t, leg: S.legato, breath: intent === 'worry' ? 1.3 : intent === 'warm' ? 1.2 : 1 };
}

// the whole line from its words: the same shape as planClassic's ({ phrases, dur, syl }), about as long.
// o: { maxDur, seed, hesitate }
export function planWords(v, text, o = {}) {
  const cl = clauses(text, o.meta || null);
  const h = (o.seed ?? 0) ^ hashStr(text) ^ v.seed;
  // (today's length, so the typing and the voice end together: for a speaker heard from a phrase bank the length of
  //  the clips the classic line would play, o.target (voice.js); else the classic plan's)
  const target = o.target ?? planClassic(v, text, o).dur;
  const S = speech(v);
  const W = cl.map((c) => clauseWords(c.s || ''));
  const build = (speed, squeeze) => {
    const phrases = []; let t = 0;
    cl.forEach((c, i) => {
      let words = W[i];
      if (!words.filter((x) => !x.drop).length) words = [{ w: 'm', fn: false, syl: [{ on: [], v: 'hum', co: [], stress: 1 }] }];
      const g = speakClause(v, words, c.intent, h + i * 7919, { quiet: c.quiet, speed, squeeze, hesitate: i === 0 && o.hesitate, v2: !!o.v2, emph: c.emph });
      phrases.push({ t0: t, g, intent: c.intent, n: g.syl.filter((x) => !x.hum).length, quiet: c.quiet });
      t += g.dur + c.pause * (S.manner === 'spacious' ? 1.4 : 1) / speed;
    });
    return { phrases, dur: t };
  };
  let p = build(1, 0);
  // too long: the small words and unstressed vowels shortened, a little quicker (up to 15 %), then the small words of
  // the longer clauses left out (the clause with most syllables first, its last small word), then quicker again (up to
  // 30 % in all); a cinematic's subtitle may still drop the last clauses
  const hard = o.maxDur || 99;
  const goal = Math.min(hard, target * 1.08);
  if (p.dur > goal) p = build(1, 1);
  let sp = 1;
  while (p.dur > goal && sp < 1.149) { sp += 0.05; p = build(sp, 1); }
  const syl = (ws) => ws.reduce((a, x) => a + (x.drop ? 0 : x.syl.length), 0);
  // (never fewer than 70 % of the written syllables: past that the words would no longer shape the line; it is let run
  //  a little longer instead)
  const written = W.reduce((a, ws) => a + syl(ws), 0), keep = Math.ceil(0.7 * written);
  const left = () => W.reduce((a, ws) => a + syl(ws), 0);
  for (;;) {
    if (!(p.dur > goal) || left() <= keep) break;
    const cands = W.filter((ws) => syl(ws) >= 4 && ws.some((x) => x.fn && !x.drop));
    if (!cands.length) break;
    const ws = cands.reduce((a, b) => (syl(b) > syl(a) ? b : a));
    const f = [...ws].reverse().find((x) => x.fn && !x.drop);
    if (left() - f.syl.length < keep) break;
    f.drop = true;
    p = build(sp, 1);
  }
  // then a long word's unstressed middle syllables are swallowed (every-thing, yes-ter-day: as quick speech does),
  // the longest words first
  for (;;) {
    if (!(p.dur > goal) || left() <= keep) break;
    let best = null;
    for (const ws of W) for (const x of ws) if (!x.drop) { const i = x.syl.findIndex((y, j) => j > 0 && j < x.syl.length - 1 && !y.stress); if (i > 0 && (!best || x.syl.length > best.x.syl.length)) best = { x, i }; }
    if (!best) break;
    const [gone] = best.x.syl.splice(best.i, 1);
    best.x.syl[best.i - 1].co = [...best.x.syl[best.i - 1].co, ...gone.on.slice(0, 1)];
    p = build(sp, 1);
  }
  while (p.dur > goal && sp < (o.v2 ? 1.399 : 1.299)) { sp += 0.05; p = build(sp, 1); }   // (VOICE-2: its longer stressed syllables may need a little more)
  // too short (a line of a few long words): a little slower, never below the speaker's own pace by more than a tenth
  if (p.dur < target * 0.8) { const b = build(0.9, 0); if (b.dur <= target * 1.08) p = b; }
  while (p.dur > hard && p.phrases.length > 1) { p.phrases.pop(); const l = p.phrases[p.phrases.length - 1]; p.dur = l.t0 + l.g.dur; }
  p.syl = [];
  for (const ph of p.phrases) for (const s of ph.g.syl) p.syl.push({ ...s, t: s.t + ph.t0 });
  p.target = target; p.words = true;
  return p;
}

// (tests and the docs: a line as its phones, before the speaker's colouring)
export function phonesOf(text) {
  return clauses(text).map((c) => clauseWords(c.s || '').map((x) => x.syl.map((s) => [...s.on, s.v + (s.stress ? '1' : ''), ...s.co].join(' ')).join(' . ')).join(' | '));
}
