// PURPOSES (the user, 3.11.2026: "whatever stays must give something to the journey"): Tibbo's counter on Citadel,
// the School's dormitory, Marl's dog yard on Zeelich, the kept old houses on Desert Island, Citadel's small pointers
// (src/game/story/purposes.js, story/shops.js). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  pp_title: 'Around the islands',
  p_knock: 'Knock',
  n_tibbo: 'Tibbo', n_marl: 'Marl the dog trainer', n_oni: 'Oni',

  // ---- Tibbo's Fix and Fill (the 'shop' house beside Pippa's stall)
  sh_title_gadget: "Tibbo's Fix and Fill",
  sh_gadget_hi: "Tibbo's Fix and Fill. Darts, cells, wind-up penguins. If it clicks, I sell it or I mend it.",
  sh_gadget_early: "Still unpacking. Come back once the well's sorted. The whole street is waiting on the water.",
  sh_gadget_gift: "First visit? Take a penguin, on the house. The project's guards stop to watch anything that waddles.",
  sh_gadget_gift_full: "First visit? Your pockets are full of penguins. Have five darts instead.",
  sh_gdoor_sign: "TIBBO'S FIX AND FILL. Darts, cells, spare parts. If I'm not at the counter, I'm at lunch.",
  sh_darts10: 'Ten darts', sh_pcell: "A fresh cell for Arthur's pocket set",
  it_pcell: 'Pocket-set cell', itd_pcell: "Tibbo's fresh cell in Arthur's pocket set. It squeals again twice as soon.",
  rs_tibbo_0: "Laser cells come from Zeelich. I only get what the ships bring.",
  rs_tibbo_1: "Arthur's pocket sets are good. Good enough to sell, if he'd let me.",
  rs_tibbo_2: "Bazoo sells darts by the three. I sell them by the ten. We don't talk.",
  rs_tibbo_evac: "I'm staying open. People need darts more than ever.",

  // ---- the School's dormitory (the great hall in the pool) and its study crystal
  pp_oni_1: "This is our dormitory. Our study crystal went to sleep in the last sandstorm. It's too dark in there to read.",
  pp_oni_2: "Master Fennick says a sleeping crystal only wakes to a pure note. Not a shout. I tried a shout.",
  pp_oni_nofork: "The scholars at the dig carry a fork that sings. That's a pure note, isn't it?",
  pp_oni_fork: "You have a singing fork? Strike it by the crystal. Please!",
  pp_oni_wait: "Still dark in there. A pure note, close to the crystal.",
  pp_oni_thanks: "It's bright again! I'll tell Ker'aooc. She owes us pupils a favour, and now she owes you one.",
  pp_oni_after: "We can read again. Joss is learning the wind spell properly. Hats everywhere are safe.",
  rs_oni_0: "The dormitory's ours. Nineteen beds and one snorer. I won't say who.",
  rs_oni_1: "Master says a crystal only sings for someone who listens first.",
  pp_lamp_look: "A study crystal, dark and cold. It hums very faintly, like something asleep.",
  pp_lamp_lit: "The pupils' study crystal, bright and humming.",
  pp_lamp_ball: "It rang for a moment, then went dark again. A ball isn't a pure note.",
  pp_lamp_wake: "There. It's awake.",
  pp_hall_dark: "Pupils' voices behind the door: 'Who's there? We can't see a thing in here!'",
  pp_hall_lit: "Through the door: pages turning, and someone practising the wind spell. A hat hits the wall.",
  pp_ker_offer: "The pupils told me about their lamp. The ward, then, for half: ten kashes.",
  pp_ker_poor: 'Ten kashes. Even half price is a price.',
  pp_ker_thanks: "The pupils' friend! Sit. Your magic too, this time.",
  pp_note_10: '◆ 10',
  pp_j_lamp: "The pupils' study crystal at the School's dormitory has gone to sleep. Only a pure note wakes it.",
  pp_j_ward: "Ker'aooc teaches her ward for half price now.",

  // ---- Marl's dog yard on Zeelich
  pp_marl_1: "These are the project's guard dogs. Well, they will be. Right now they're mostly enthusiasm.",
  pp_marl_2: "The first thing every dog of mine learns is the long call. One long, low note: go home and lie down.",
  pp_marl_noconch: "You need something that carries a long note. A horn, a big shell. Whistling won't do. They think it's a game.",
  pp_marl_conch: "Is that a conch? Perfect. Blow it here by the gate, long and low. Watch them.",
  pp_marl_wait: "Long and low, by the gate. They're listening.",
  pp_marl_learned: "See? Down, all three. Every dog from my yard knows that call. Even the ones at the project's posts.",
  pp_marl_after: "Mind, the long call only sends them home. Hit one and it forgets every lesson.",
  rs_marl_0: "The project pays well for a dog that barks at the right people.",
  rs_marl_1: "A dog that knows your call won't need a fence. Ask me at the gate.",
  pp_toast_call: 'Learned: the long call. The conch sends guard dogs home to lie down.',
  pp_j_call: "Marl, the dog trainer on Zeelich, teaches the long call: one long note on a conch sends a guard dog home.",

  // ---- the kept old houses on Desert Island
  pp_s40_door: "Bashir's house. A girl at the shutters: 'Grandpa's by the loom. He'll talk your ears off.'",
  pp_s28_board: "The dig crew's bunkhouse. A board by the door: rosters, a lost-glove notice, and Surveyor Anko's sketch of the old pipes.",
  pp_s28_take: "Line two is circled: 'to the oasis, never open'. Worth keeping.",
  pp_s28_after: "The crew's board. A new note: 'Who took my pipe sketch? Anko.'",
  it_survey: "Anko's pipe sketch", itd_survey: "The surveyor's sketch of FunFrock's old pipes under Desert Island. Line two is circled: 'to the oasis, never open'.",
  pp_j_survey: "Anko's sketch: line two of FunFrock's old pipes runs to the oasis. Never open it.",
  rs_bashir_2: "The School's pupils sleep in the old hall by the pool. Their reading lamp went dark in the storm.",
  rs_bashir_3: "I live in the big house up the slope. My granddaughter keeps it. I keep out of her way.",

  // ---- Citadel's small pointers
  pp_plaque: "The plaque: 'Twinsen and Zoé, who ended FunFrock's rule. It began in his asylum.'",
  pp_lh_dark: "(The lighthouse door. Locked. The lamp up top has been dark for years.)",
  pp_lh_lit: "(The lighthouse door. Locked. The lamp turns overhead: whoever keeps it is up there now.)",
  pp_plaque_tw: "The asylum's past the fort's east wall. The project has guards there now. I wonder why.",
});
