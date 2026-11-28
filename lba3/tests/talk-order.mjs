// TALK-ORDER (the user, 24.11; maturity.md "gifts before a chapter's own talk"): a side story's gift, thank-you or
// payment waits behind the chapter's own talk with the same person (story/index.js ownTalkFirst, base.js pendingTalk).
// Chapter 14 of the expanded campaign (the network) on Desert Island, fixture new-13-desert: Ilka has her notebook back
// from chapter 4 and has never given the singing fork, and the chapter's greeting at the bore is still to be had.
//   1. the first talk is the chapter's: "Dallan said you'd come", no fork, no thanks for the notebook
//   2. the second talk gives the fork (its lines unchanged), the fork owned, saved
//   3. Ilka's greeting no longer pending; a person with only a repeat line here (Dallan) never was
// By input (walk, E, the lines read with E) from a loaded old save. SERVE=1: this checkout's files by request routing.
// Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { serveLocal } from './lib/serve.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
const save = (name) => { const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8')); for (const o of j.origins || []) o.origin = ORIGIN; return j; };
const { browser, context, page } = await launch({ storageState: save('new-13-desert') });
if (process.env.SERVE) await serveLocal(context);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'continue');
await ev(() => {
  P.settle();
  window._said = []; const sv = game.say;
  game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines).map(String)); return sv.call(this, n, lines, ...a); };
  // talk by input, then read to the end (a found-object box is closed with E, as a player does)
  window.talkTo = (id) => {
    window._said.length = 0;
    const r = P.talk(id);
    for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found' || game.state === 'dialog') P.tap('KeyE', 0.2); P.settle(); }
    return { r: r.r, said: window._said.slice(), fork: !!game.hero.arms?.fork, c10_ilka: !!game.flags.c10_ilka, state: game.state };
  };
});
const st = await ev(() => ({ ch: game.story.cur.key, room: game.room?.id, ilka: !!P.npc('ilka')?.present, fork: !!game.hero.arms?.fork, nb: !!game.flags.c4_notebook, c10_ilka: !!game.flags.c10_ilka, pend: game.story.cur.pendingTalk('ilka') }));
check('the old save loads into chapter 14 on Desert Island: notebook back, no fork, the greeting still to come', st.ch === 'network' && st.room === 'desert' && st.ilka && st.nb && !st.fork && !st.c10_ilka && st.pend === true, st);

const t1 = await ev(() => talkTo('ilka'));
const greet = t1.said.findIndex((s) => /Dallan said you'd come/.test(s)), thanks = t1.said.findIndex((s) => /notebook back/.test(s));
check("1. the first talk is the chapter's greeting; the fork and the notebook's thanks wait", t1.r === 'talked' && greet >= 0 && thanks < 0 && !t1.fork && t1.c10_ilka, t1);

const t2 = await ev(() => talkTo('ilka'));
const f1 = t2.said.findIndex((s) => /You got my notebook back/.test(s));
check('2. the next talk gives the fork, its lines unchanged and first', t2.r === 'talked' && f1 === 0 && t2.said.some((s) => /singing fork/.test(s)) && t2.fork, t2);
const kept = await ev(() => { game.save(false); const s = JSON.parse(localStorage.getItem('lba3_save_v1')); return { fork: !!s.hero?.arms?.fork, c10_ilka: !!s.flags?.c10_ilka }; });
check('2b. the fork and the greeting are kept in the save', kept.fork && kept.c10_ilka, kept);

const after = await ev(() => ({ ilka: game.story.cur.pendingTalk('ilka'), dallan: game.story.cur.pendingTalk('dallan'), nara: game.story.cur.pendingTalk('nara') }));
check('3. nothing pending after the greeting; a repeat line (Dallan) or no talk here (Nara) never holds a gift', !after.ilka && !after.dallan && !after.nara, after);

await browser.close();
done();
