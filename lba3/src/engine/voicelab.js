// VOICE-2: a developer-only voice audition view, opened by the URL flag ?voicelab (index.html?voicelab). Not in any
// menu. Character, intention, variant, style (Classic / Words as on 14.11 / Words after VOICE-2 / Expressive), play and
// stop. It plays through the game's own Babble (voice.js) and a copy of the game's voice bus (audio.js: the voice
// slider, compressor, presence, makeup, limiter), on an audio context of its own, so what it plays is what the game
// plays. Nothing here runs unless the flag is given.
import * as V from './voice.js';
import { expandMeta } from '../game/text/voicemeta.js';

const CAST = [['hero', 'Twinsen'], ['zoe', 'Zoé'], ['arthur', 'Arthur'], ['vesk', 'Vesk'], ['baldino', 'Baldino'], ['sendell', 'Sendell'],
  ['gilbert', 'Gilbert'], ['mira', 'Mira'], ['doran', 'Doran'], ['farmer1', 'Joss (Quetch man)'], ['councilB', 'Sela (Quetch woman)'], ['tim', 'Tim (Quetch child)'],
  ['dtrader', 'Brosk (Grobo man)'], ['yorna', 'Yorna (Grobo woman)'], ['tilde', 'Tilde (Rabbibunny)'], ['nara', 'Nara (Esmer)'], ['aven', 'Aven (Esmer man)']];
// a few lines for each intention (the game's own lines where one fits); the variant picks among them
const LINES = {
  neutral: ['I fixed that yesterday.', 'The control room. The needles jump every time the ground shakes.', 'Delivery forms. And a very old sandwich.', 'Next quarter. Every home gets it.'],
  curious: ['The shell? What shell?', 'Have you seen the pump?', 'When you get back, will you tell me what space looks like?', 'Can you fly it to Zeelich?'],
  uncertain: ['Maybe. I think it was the pipe...', 'I was going to put them back. Today. Probably.', 'Well... it might hold.', 'I suppose so?'],
  pleased: ['People like them. Zoé is already planning a hot bath.', 'It counts, Arthur.', 'Sit. Eat. Then tell us everything.', 'Well done. The water is back!'],
  relieved: ['There you are!', 'It holds! The field is stable.', 'You came back!', 'Water! Steaming hot.'],
  concerned: ['Dry again. But listen. Something is still knocking in there.', 'That\'s warm. It\'s never warm.', 'Be careful up there, Twinsen. And come back.', 'He just... vanished into the light.'],
  urgent: ['Baldino! Vesk took the beam up to his ship!', 'Get away from my console!', 'The needle is jumping. Not that one!', 'Look out! Behind you!'],
  annoyed: ['Then give the water back.', 'My pipes are fine! I kick them every morning.', 'No.', 'I paid my water bill! So where is my water?'],
};
const STYLES = [['expressive', 'Expressive (VOICE-2)'], ['words2', 'Words (after VOICE-2)'], ['words', 'Words (before, 14.11)'], ['classic', 'Classic']];

export function openVoiceLab() {
  let ctx = null, audio = null, B = null;
  const el = document.createElement('div');
  el.id = 'voicelab';
  el.style.cssText = 'position:fixed;left:16px;top:16px;z-index:99999;background:rgba(14,18,28,0.95);color:#e8eef8;font:14px/1.4 system-ui,sans-serif;padding:14px 16px;border-radius:10px;box-shadow:0 6px 30px #0008;min-width:380px';
  const sel = (id, opts) => `<select id="vl-${id}" style="margin:2px 0 8px;width:100%">${opts.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>`;
  el.innerHTML = `<b>Voice audition</b> <small style="opacity:.7">(developer view, ?voicelab)</small><br>
    Character ${sel('who', CAST)} Intention ${sel('int', Object.keys(LINES).map((k) => [k, k]))}
    Variant ${sel('var', [0, 1, 2, 3].map((i) => [i, `line ${i + 1}`]))} Style ${sel('style', STYLES)}
    <div id="vl-text" style="margin:4px 0 10px;opacity:.85;font-style:italic"></div>
    <button id="vl-play">Play</button> <button id="vl-stop">Stop</button> <button id="vl-ab">Play all styles</button> <button id="vl-close" style="float:right">Close</button>
    <div id="vl-info" style="margin-top:8px;font-size:12px;opacity:.7"></div>`;
  document.body.appendChild(el);
  const $ = (id) => el.querySelector('#vl-' + id);
  const line = () => LINES[$('int').value][+$('var').value % LINES[$('int').value].length];
  const show = () => { $('text').textContent = `"${line()}"`; };
  ['int', 'var'].forEach((k) => $(k).addEventListener('change', show)); show();
  function init() {
    if (ctx) return;
    ctx = new AudioContext();
    // (the game's voice bus, audio.js init)
    const bus = ctx.createGain(); bus.gain.value = 0.8 * 2.2;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.18;
    const makeup = ctx.createGain(); makeup.gain.value = 2.2;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
    const master = ctx.createGain(); master.gain.value = 0.8;
    bus.connect(comp).connect(makeup).connect(lim).connect(master).connect(ctx.destination);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    audio = { ctx, voiceBus: bus, vol: { voice: 0.8 }, noiseBuf: nb, duck() {} };
    B = new V.Babble(audio);
    let last = 0;
    const tick = () => { B.mt = ctx.currentTime; B.pump(); requestAnimationFrame(tick); if (ctx.currentTime - last > 0.5) { last = ctx.currentTime; $('info').textContent = `sources alive ${B.live} · lines ${B.lines} · ${B.played.slice(-3).join(' ')}`; } };
    tick();
  }
  async function play(style) {
    init();
    await ctx.resume();
    V.setWordsLegacy(style === 'words');
    V.setVoiceMode(style === 'words2' ? 'words' : style);
    const key = 'n_' + $('who').value, text = line(), meta = expandMeta($('int').value);
    B.stop();
    await B.prepare([key], { wait: true });
    B.start(key, { meta });
    B.chars(text, 0, 1);
    return text;
  }
  $('play').onclick = () => play($('style').value);
  $('stop').onclick = () => B?.stop();
  $('ab').onclick = async () => { for (const [s] of STYLES) { $('style').value = s; await play(s); await new Promise((r) => setTimeout(r, 4200)); } };
  $('close').onclick = () => { B?.stop(); el.remove(); ctx?.close(); };
  return el;
}
