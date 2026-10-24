// Kesh twelve years on (Desert Island): the cool room and its wind-catcher, Lumi's loom, Hesk's poles
// (src/game/story/kesh.js). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  k_title: 'Kesh',
  p_turn: 'Turn', p_fit: 'Fit',
  it_kscreen: "Lumi's screen", itd_kscreen: "A sand screen Lumi wove for the cool room's wind-catcher. Striped, of course.",
  k_toast_screen: "Lumi's screen",
  k_toast_cool: 'The cool room draws again',
  k_toast_owed: "Brosk's payment: {n} kashes",

  // ---- the cool room's door
  k_door_1: "Kesh's cool room. It was one of FunFrock's blockhouses. Kesh dug the door out of the dune and built a wind-catcher on the roof.",
  k_door_dry: 'Two jars of water on the shelf, going warm. Inside, air like soup.',
  k_door_wet: "Water jars on the shelf, warm as tea. Inside, Lumi's wool and air like soup.",
  k_door_sand: "Sand on the floor, sand on the jars. Brosk is not going to like this.",
  k_door_hint: "(Up on the roof, the wind-catcher's mouth is turned the wrong way.)",
  k_door_hint_fit: "(Lumi's screen is on up there, but the mouth still faces the wrong way.)",
  k_door_hint_screen: "(The mouth takes the wind now. With no screen on it, it takes the sand too.)",
  k_drink: 'Cold water, in the middle of the desert.',

  // ---- the wind-catcher
  k_turn_away: 'The mouth faces away from the wind. Nothing comes down.',
  k_turn_side: 'Side-on to the wind. Barely a breath.',
  k_turn_sand: 'Air rushes down the tower, and half a dune with it.',
  k_turn_sand2: '(It needs a screen over the mouth.)',
  k_fit: "Lumi's screen, tied over the mouth.",
  k_fit_turn: 'Now the mouth goes into the wind.',
  k_draws: 'Air pours down the tower through the screen. Below, the curtain in the door lifts.',
  k_cowl_done: "Tied off. It'll hold till the next storm.",

  // ---- Brosk
  k_brosk_i_dry: "The last two jars of water in Kesh are going warm at the cool room. The storm turned its wind-catcher round and tore Lumi's screen off it.",
  k_brosk_i_wet: 'Now the water needs keeping cold. And the storm turned the cool room\'s wind-catcher round.',
  k_brosk_i_steam: "If that steam boils the oasis, the cool room's jars are all Kesh has. And they're warm. The storm turned the wind-catcher round.",
  k_brosk_i_after: "The ground's gone quiet since the vent. The cool room hasn't cooled down, though. The wind-catcher still faces the wrong way.",
  k_brosk_2: "The stair's up the side. I'd go, but somebody has to mind the stall.",
  k_brosk_wait: "The wind-catcher. On the cool room's roof. Into the wind.",
  k_brosk_sand: 'Sand! In my dates!',
  k_brosk_sand_screen: "You've got the air coming in, I'll give you that. Half the desert with it. That's what Lumi's screens are for.",
  k_brosk_sand_turn: "And still no air in there. Into the wind, and a screen over it. Lumi makes those.",
  k_brosk_sand_fit: "There's a screen on it now? Then turn it into the wind.",
  k_brosk_pay: "Cold dates! Cold water! Here, five kashes. Don't tell Tarra I paid. She'll want her share.",
  k_brosk_done: [
    'People queue for cold water now. I sell them dates while they wait.',
    'FunFrock built that blockhouse to keep us out. Now it keeps the dates cool.',
  ],
  k_brosk_steamdone: [
    "Steam or no steam, the jars stay cold. That's something.",
    "Not on their list. But we've got cold water.",
  ],
  k_brosk_after: [
    'Dallan came in for a cold drink. Paid for it, too. Strange times.',
    'FunFrock built that blockhouse to keep us out. Now it keeps the dates cool.',
  ],

  // ---- Lumi
  k_lumi_drysand: "And now there's sand in the cool room. My wool's in there.",
  k_lumi_1: "The storm tore the screen off the cool room's wind-catcher. I wove a new one.",
  k_lumi_1s: "Sand in the cool room. That's what happens without a screen. I wove a new one.",
  k_lumi_2: "Tie it over the mouth and keep the mouth into the wind, or it's just a chimney. My knees don't do that stair.",
  k_lumi_wait: "The screen goes over the wind-catcher's mouth. Mouth into the wind.",
  k_lumi_fit: "It's on? Good. Now turn it into the wind.",
  k_lumi_done: [
    'The dyes set better in the cool. Look at that red.',
    'Mind the threads.',
  ],
  k_lumi_after: [
    "The ground's been still since the vent. The cowl stays where you put it.",
    'The dyes set better in the cool. Look at that red.',
  ],

  // ---- Sani
  k_sani_wind: "Hesk says the pump's wheel always looks into the wind. And his flags point where the wind goes.",
  k_sani_done: [
    "Best place in Kesh. I'm guarding it.",
    "Mum says it was FunFrock's. Now it's ours.",
  ],
  k_sani_steam: [
    "If the oasis boils, I'm staying in here.",
    "Best place in Kesh. I'm guarding it.",
  ],

  // ---- journal
  k_j_cool: "Kesh's cool room, in FunFrock's old blockhouse, needs its wind-catcher turned into the wind.",
  k_j_screen: 'Lumi wove a new sand screen for its mouth.',
  k_j_paid: 'Brosk paid me five kashes. The dates are cold too.',
});
