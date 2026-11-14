// EQUIP-2a: Arthur's pocket set and Bram's pump lance (src/game/tools.js, story/kit2.js). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // ---- names (HUD, wheel, inventory)
  wp_pocketset: 'Pocket Set', wp_lance: 'Pump Lance',
  it_pocketset: "Arthur's Pocket Set", itd_pocketset: "Arthur built it from his radio's spare parts. Held out, it whistles louder near hidden things that hum, and a needle at your feet points the way within 12 m. Attack: a feedback squeal. Project drones within 10 m lose their aim for 3 s. People and animals don't mind. 8 s to recover.",
  it_lance: "Bram's Pump Lance", itd_lance: "Bram's spare hand pump on a tank. Attack: a jet of water. It cools what is too hot to touch and pushes an enemy 3 m back; crystal mites freeze for 2 s. It hurts nobody. 8 jets a tank: fill it at any water (a trough, a well, a barrel, the sea).",
  p_fill: 'Fill', p_turn: 'Turn', p_lift: 'Lift',
  // ---- the pocket set
  e2_ar_hint: "Dad! I made you something. It's on the rug by my radio!",
  e2_set_look: 'A little wooden box with a dial, a red needle and a wire aerial. It whistles very softly.',
  e2_ar_set1: "It's a pocket set. I built it from my radio's spare parts.",
  e2_ar_set2: 'Hold it out. It whistles louder near things that hum, and the needle shows you where.',
  e2_tw_set: 'Things that hum?',
  e2_ar_set3: 'Something in the cellar hums. I hear it when the house is quiet. Find it!',
  e2_ar_set4: 'And if you turn it right up, it squeals. Drones hate that.',
  e2_set_note: "A note under it, in Arthur's writing: DAD, IT WHISTLES AT THINGS THAT HUM. SOMETHING HUMS IN THE CELLAR. - A.",
  e2_toast_sethow: 'Pocket Set: choose it on the weapon wheel ({w}) or in the inventory. {k}: squeal',
  e2_tin_lift: 'A loose tile. Under it, an old tin, humming.',
  e2_tin_clover: 'My old hiding place! I forgot it years ago. A clover, and a little crystal that still hums.',
  e2_tin_kashes: 'My old hiding place! I forgot it years ago. Some kashes, and a little crystal that still hums.',
  e2_j_set: 'Arthur says something hums in the cellar.',
  // ---- the pump lance
  e2_bram_l0: 'Twinsen! I meant to give you this.',
  e2_bram_l1: 'And take this. My spare pump, on a tank. Eight good squirts in it.',
  e2_bram_l2: 'Fill it at my trough. Any water does.',
  e2_bram_l3: "See my old stop-cock by their new pipe? Too hot to touch since they laid it. Cool it and give it a turn, would you?",
  e2_toast_lancehow: 'Pump Lance: choose it on the weapon wheel ({w}) or in the inventory. {k}: a jet of water',
  e2_toast_empty: 'The tank is empty. Fill it at any water',
  e2_toast_filled: 'Tank filled: {n} jets',
  e2_toast_cooled: 'The stop-cock hisses and cools. Quick, turn it!',
  e2_toast_notyet: "The water runs off. It isn't hot yet",
  e2_valve_hot: "Bram's old stop-cock. Hot as a kettle: the heat pipe runs right past it. I can't touch it.",
  e2_valve_hot2: 'Too hot to touch. A jet of cold water first.',
  e2_valve_turn: 'It turns! Water gurgles down the old line.',
  e2_valve_later: "Bram's basin is filling. He'll be pleased.",
  e2_bram_valve: "Ha! My basin's filling. First water in it since spring. Here, for your trouble.",
  e2_valve_open: "Open. Bram's basin is full.",
  e2_j_valve: "Bram's stop-cock by the heat pipe is too hot to turn.",
  e2_coupler_jet: 'Hiss! One cold jet, and the coupler settles right there on the bench.',
});
