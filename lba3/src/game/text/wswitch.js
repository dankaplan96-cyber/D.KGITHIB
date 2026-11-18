// WEAPON-SWITCH and POCKET-SET (docs/lba-maturity/WEAPON-SWITCH.md): the weapon pill's key hint (hud.js) and the two
// control tips (tutorial.js 'pset', 'wswitch'). {k}, {w}, {e}: keys as bound (<kbd> in the tips), {w} in ws_*: a name.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  // ---- the weapon pill: the swap key and what it gives next; the hold that goes back to the ball
  ws_next: '{k} ▸ {w}',
  ws_hold: 'hold {k}: {w}',
  // ---- the tips
  tut_wswitch: '{k} Next weapon · hold {k}: back to the Magic Ball · hold {w}: the wheel',
  tut_wswitch_touch: '{k} Next weapon · hold {k}: back to the Magic Ball',
  tut_pset_hold: '{k} Hold out the Pocket Set (press until it is in your hand)',
  tut_pset_find: 'The needle at your feet and the dial show the way · {e} Take it · hold {k}: put it away',
});
