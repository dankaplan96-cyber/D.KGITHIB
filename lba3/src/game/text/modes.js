// BEHAVIOUR-MODES (P125, docs/lba-maturity/BEHAVIOUR-MODES.md): the mode caption shown for a moment after a behaviour
// switch (hud.js modeCap): the behaviour's name (i18n.js beh_*) and what the action key does in it. {k}: the action key
// as bound (a <kbd>), shown only with Show control tips on.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  bm_normal: '{k} Talk, search',
  bm_athletic: '{k} Jump',
  bm_aggressive: '{k} Strike',
  bm_discreet: 'Hold {k} to hide',
});
