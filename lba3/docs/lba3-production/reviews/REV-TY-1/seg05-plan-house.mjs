// REV-TY-1: segment 05's steps up to "home: Arthur's radio" (Zoé finds the plan, by input), then the house's looks
// and the new people's lines in that state. node tests/lib/seg.mjs <this> with LOAD=save-04.json
import { steps as s05 } from '../../../../tests/playthrough/05-project-b.mjs';
const upto = s05.findIndex((s) => s[0].startsWith('home'));
export const steps = [
  ...s05.slice(0, upto + 1),
  ['hook', () => { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; return { plan: !!game.flags.c1_plan, water: !!game.flags.c1_water, chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['house looks', () => { const H = game.rooms.house.life, out = {}; for (const w of ['desk', 'meter', 'bench']) { const p = { desk: H.zoeDesk, meter: H.meter, bench: H.bench }[w]; P.use(p.x, p.z, { near: 0.5 }); out[w] = window._said.splice(0); } return out; }],
  ['nell (harbour row posts)', () => { P.talk('nell', { run: true }); return window._said.splice(0); }],
  ['bram', () => { P.talk('bram', { run: true }); return window._said.splice(0); }],
];
