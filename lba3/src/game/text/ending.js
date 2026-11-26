// The ending film (src/game/story/ending.js, task #13): after the epilogue's dinner, before the end card. English is the
// source; the Hebrew is in he/ending.js. Every line restates what the epilogue already says (no new story facts).
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  // at the table: the story, told slowly (Zoé's "Then tell us everything. Slowly.")
  en_tw_1: 'So there I was, deep under the island...',
  en_ar_1: 'With Sendell!',
  en_zoe_1: 'Slowly.',
  // the square: the well runs cool; Gilbert's refund came (ep_zoe_2, ep_gilbert)
  en_gilbert: 'Cold water at last. And my refund came.',
  // the harbour: everyone's back, and Doran will sleep for a week (ep_doran)
  en_doran: "Everyone's back. Now, a week of sleep.",
  // captions (the end card's own facts: ep_end_text)
  en_cap_bore: 'The bore still turns',
  en_cap_bore_sub: 'a shield now, run by both worlds',
  en_cap_isles: 'Across the sea',
  en_cap_isles_sub: 'Kesh has its oasis, and Lhar its village',
  // home again: Arthur asks again (ep_ar_1: "Can I go down there?" / ep_tw_2: "Yes, yes, and no.")
  en_ar_2: 'So now can I go down there?',
  en_zoe_2: 'No.',
  en_tw_2: 'No.',
  en_zoe_3: 'Welcome home.',
});
