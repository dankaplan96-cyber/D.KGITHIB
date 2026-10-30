// REV-TY-2: Continue from a save made during Zoe's lighthouse sequence (which resets it), talk to Baldino by input
// (the main path must restart Zoe's broadcast, not the workshop's side lines), then tests/playthrough/06-zeelich.mjs's
// own steps for the dials and the platform shield, unchanged.
import { steps as all } from '../../../../tests/playthrough/06-zeelich.mjs';
export const steps = [
  ['after Continue: where, which body', () => ({ room: game.room?.id, body: game.hero.body, zoeStart: !!game.flags.c2_zoeStart, key: !!game.flags.c2_key, obj: document.querySelector('#objective')?.textContent })],
  ['talk to Baldino (story needs him)', () => { const r = P.talk('baldino'); P.wait(1); P.settle(); return { r: r.r, room: game.room?.id, body: game.hero.body, fail: game.room?.id === 'lighttop' ? null : 'no lighthouse' }; }],
  ...all.slice(9, 11),
];
