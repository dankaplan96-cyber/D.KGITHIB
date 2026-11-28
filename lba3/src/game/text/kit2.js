// EQUIP-2a: Arthur's pocket set and Bram's pump lance (src/game/tools.js, story/kit2.js). English only.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  // ---- names (HUD, wheel, inventory)
  wp_pocketset: 'Pocket Set', wp_lance: 'Pump Lance',
  it_pocketset: "Arthur's Pocket Set", itd_pocketset: "Hold it out to find hidden things that hum within 12 m: the whistle quickens, the dial rises, a needle at your feet points the way. Attack: a squeal that throws project drones off aim for 3 s.",
  it_lance: "Bram's Pump Lance", itd_lance: "Bram's spare hand pump on a tank. Attack: a jet of water. It cools what is too hot to touch and pushes an enemy 3 m back; crystal mites freeze for 2 s. It hurts nobody. 8 jets a tank: fill it at any water (a trough, a well, a barrel, the sea).",
  p_fill: 'Fill', p_turn: 'Turn', p_lift: 'Lift',
  // ---- the pocket set
  e2_ar_hint: "Dad! I made you something. It's on the rug by my radio!",
  e2_set_look: 'A little wooden box with a dial, a red needle and a wire aerial. It whistles very softly.',
  e2_ar_set1: "It's a pocket set. I built it from my radio's spare parts.",
  e2_ar_set2b: 'Hold it out in front of you. The nearer you get to something that hums, the faster it whistles and the higher its needle swings.',
  e2_tw_set: 'Things that hum?',
  e2_ar_hide: 'I hid one of my old radio valves in the house. It still hums. Go on, find it!',
  e2_ar_set3: "Something in the cellar hums too, and it isn't mine. I hear it when the house is quiet.",
  e2_ar_set4: 'And if you turn it right up, it squeals. Drones hate that.',
  e2_set_note2: "A note under it, in Arthur's writing: DAD, HOLD IT OUT. IT WHISTLES FASTER NEAR THINGS THAT HUM. I HID A RADIO VALVE IN THE HOUSE. FIND IT! - A.",
  e2_toast_sethow: 'Pocket Set: {r} until it is in your hand (or hold {w}: the wheel). {k}: squeal',
  e2_tube_lift: "In my coat on the stand by the door: one of Arthur's old radio valves, still humming.",
  e2_ar_tube1: "You found it! Told you it works. I'll put it back in my radio.",
  e2_tube_note: 'Another note in the pocket: WELL DONE, DAD! SOMETHING IN THE CELLAR HUMS TOO. AND IF YOU TURN IT RIGHT UP, IT SQUEALS. DRONES HATE THAT. - A.',
  e2_j_tube: 'Arthur hid one of his radio valves in the house to try his Pocket Set on.',
  // (POCKET-SET: the dial on the weapon pill: right on top of a hum / nothing humming within reach)
  ps_here: 'here!', ps_quiet: 'quiet',
  e2_tin_lift: 'A loose tile. Under it, an old tin, humming.',
  e2_tin_clover: 'My old hiding place! I forgot it years ago. A clover, and a little crystal that still hums.',
  e2_tin_kashes: 'My old hiding place! I forgot it years ago. Some kashes, and a little crystal that still hums.',
  e2_j_set: 'Arthur says something hums in the cellar. His Pocket Set will find it.',
  e2_j_set2: 'Arthur says something hums in the cellar too.',
  // ---- the pump lance
  e2_bram_l0: 'Twinsen! I meant to give you this.',
  e2_bram_l1: 'And take this. My spare pump, on a tank. Eight good squirts in it.',
  e2_bram_l2: 'Fill it at my trough. Any water does.',
  e2_bram_l3: "See my old stop-cock by their new pipe? Too hot to touch since they laid it. Cool it and give it a turn, would you?",
  e2_toast_lancehow: 'Pump Lance: {r} until it is in your hand (or hold {w}: the wheel). {k}: a jet of water',
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
