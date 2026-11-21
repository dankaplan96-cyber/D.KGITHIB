// GATE-1 harness workaround (not a game change, not a change to tests/): segment 01 unchanged except its "Mira: the key"
// step. On 0f77b57 the walk from Zoé's house to Mira passes a pickup at (-29.3, 40.4) whose one-line remark ("It hums,
// like the crystals in the well...") opens a dialog mid-walk; P.talk takes that dialog for the conversation and the
// step stops with "no key". Here the bot, like a player, finishes the remark and talks to Mira again (input only).
import { steps as orig } from '/dev/shm/gate1/lba3/tests/playthrough/01-prologue-surface.mjs';
export const steps = orig.map((s) => s[0] !== 'Mira: the key' ? s : ['Mira: the key', () => {
  let r = P.talk('mira', { run: true }); const first = { to: r.to, lines: r.lines };
  if (!game.flags.key) { P.settle(); r = P.talk('mira', { run: true }); }
  return { ...r, first, fail: game.flags.key ? null : 'no key' };
}]);
