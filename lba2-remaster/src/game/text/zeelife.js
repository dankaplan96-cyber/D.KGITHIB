// Zeelich's street twelve years on: the watch house bakery, the heat posts, the burrow, the scaffold, and The Second
// Bake (src/game/story/zeelife.js). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  zl_title: 'Zeelich',
  p_shove: 'Shove', p_roll: 'Take a roll',
  zl_toast_oven: "Snuff's oven is hot again",
  zl_toast_owed: "Snuff's payment: {n} kashes",

  // ---- looks
  zl_hatch_1: 'An old watch house, older than the council. Someone chiselled the crest off the lintel. The guards\' window is a bread hatch now.',
  zl_hatch_cold: 'The oven inside is cold. So is the counter.',
  zl_hatch_hint: '(The heat box on the east wall shows a red lamp.)',
  zl_roll: 'A warm roll, straight out of the guards\' window.',
  zl_box_red: 'The project\'s heat box. Red lamp. A plate: SAFETY CUT-OUT. RESETS WHEN THE FLUE DRAWS.',
  zl_box_green: 'Green lamp. The feed pipe ticks as it warms.',
  zl_flue_hot: 'Hot air shimmers out of the flue.',
  zl_tag_pelleck: 'A tag on the dark post: CONNECTION NEXT QUARTER. Mr Pelleck\'s house.',
  zl_tag_sw: 'Another dark post, another tag: CONNECTION NEXT QUARTER. The lit ones are by the council house, the depot and the bakery.',
  zl_tag_burrow: 'CONNECTION NEXT QUARTER, over the moles\' burrow. Warm air comes out of their vent anyway.',
  zl_burrow: 'Warm air breathes out of the moles\' vent. It smells of earth and root tea.',
  zl_flowers: 'Nara\'s cloud flowers, crated for Citadel. A project tag: HELD. The shuttles are grounded, and the ferry takes project cargo first.',

  // ---- the roof
  zl_shoved: 'Off the flue it goes. It can sit on the stage like the others.',
  zl_knocked: 'Oops.',
  zl_draws: 'Somewhere below, the heat box clicks. The lamp turns green.',
  zl_draws_st: 'The heat box on the wall clicks. Its lamp turns green.',

  // ---- Mother Snuff
  zl_snuff_1: 'Oven\'s cold. Again. And the street is waiting for its bread.',
  zl_snuff_i_pre: 'I sold my charcoal cart when the project\'s heat came. Bread\'s a third cheaper now. When the oven works.',
  zl_snuff_i_post: 'Shield or no shield, the heat still comes up the pipe. Whatever they\'re doing down there hasn\'t stopped.',
  zl_snuff_i_mid: 'The shuttles fly again, so Bzizz flies twice as much. And lands on my roof twice as much.',
  zl_snuff_i_council: 'If the council stops the bore, I\'ll want my charcoal cart back. I sold it.',
  zl_snuff_i_network: 'Baldino says the bore will make a shield instead. Do shields bake bread?',
  zl_snuff_i_late: 'Some days the ground is quiet. The oven should be warm every day.',
  zl_snuff_2: 'The heat box shuts itself off when the flue can\'t breathe. Something\'s sitting on my flue. Bzizz, I\'d bet. The guards\' stair is round the side.',
  zl_snuff_wait: 'Up the guards\' stair. Something on my flue.',
  zl_snuff_warm: 'Warm! The oven\'s warm!',
  zl_snuff_pay: 'Hot, and the dough didn\'t even sulk. Five kashes. And mind the stair.',
  zl_snuff_pay_b: 'Hot oven, sticky grass, one sad Mosquibee. Five kashes. I\'ll make it up to him in rolls.',
  zl_snuff_paynoask: 'Was that you on my roof? The oven\'s warm! Here, five kashes.',
  zl_snuff_paynoask_b: 'Was that your ball? Nectar on my grass, and the oven\'s warm! Here, five kashes.',
  zl_snuff_after_pre: [
    'Tavo carries the rolls to the depot. The crews pay on time. Say what you like about the project.',
    'This house was built for watching people. Now it feeds them.',
  ],
  zl_snuff_after_mid: [
    'The shuttles bring flour from Citadel now. And Citadel buys my rolls.',
    'This house was built for watching people. Now it feeds them.',
  ],
  zl_snuff_after_council: [
    'Half my bread goes to the drill crews. If the council stops the bore, who buys it?',
    'Oku says I sold my oven to a drill. I sold a charcoal cart.',
  ],
  zl_snuff_after_network: [
    'Turn the bore into a shield, then. Just leave my heat box alone.',
    'This house was built for watching people. Now it feeds them.',
  ],

  // ---- Bzizz
  zl_bz_1: 'Bzz! That roof is the flattest landing on the island. The old guards built well.',
  zl_bz_2: 'My crate up there is for the depot. It stays on the stage till they sign for it. Rules.',
  zl_bz_wait: 'The depot hasn\'t signed. My crate stays put. Bzz.',
  // (asked again: the street's news first, by phase; 'post' shares 'pre')
  zl_bz_i_pre: 'No shuttles, so everything waits on my stage. Crates, nectar, me.',
  zl_bz_i_mid: 'The shuttles fly again. Forty crates a day, and the depot signs for ten.',
  zl_bz_i_council: 'The council talks. The depot waits for the council. My crate waits for the depot.',
  zl_bz_i_network: 'Everyone\'s busy with Baldino\'s relays. Nobody\'s busy signing for nectar.',
  zl_bz_i_late: 'The ground\'s quiet now. The depot isn\'t. Still no signature.',
  zl_bz_nectar: 'My nectar!',
  zl_bz_shoved: 'You moved my crate off Snuff\'s flue? That was a flue? Bzz. It\'s the right height for a table.',
  zl_bz_broken: 'Forty crates to fly. Thirty-nine to deliver. The depot can sign for a puddle.',
  zl_bz_after_pre: [
    'The project\'s heat makes the flowers bloom twice. Twice the nectar, twice the flights.',
    'I land on the stage now. Not on the flue. Snuff chalked a line.',
  ],
  zl_bz_after_mid: [
    'The shuttles fly again. My cousins carry the heavy crates out to them.',
    'I land on the stage now. Not on the flue.',
  ],
  zl_bz_after_council: [
    'If the bore stops, the flowers bloom once a year again. Half the honey. Half the work.',
    'Madam Zuzzara says the ground is wrong. She says it about everything. This time I listen.',
  ],
  zl_bz_after_network: [
    'Turned into a shield, the bore still makes heat? Nobody can tell me. Bzz.',
    'I land on the stage now. Not on the flue.',
  ],

  // ---- Mr Pelleck (his dome, re-tiled)
  zl_pel_pre: [
    'I keep the depot\'s books now. The project pays on time. Hence: tiles.',
    'They don\'t make the old violet any more. Blue it is.',
    'Connection next quarter. I filed Form 7-B twice. One copy for the project, one for my peace of mind.',
  ],
  zl_pel_mid: [
    'The tilers come when a shuttle brings the tiles. Half a dome is still a dome.',
    'Connection next quarter. It was next quarter last quarter.',
  ],
  zl_pel_council: [
    'If the council stops the bore, who keeps the depot\'s books? Who pays the tilers?',
    'I do not panic. I file.',
  ],
  zl_pel_network: [
    'A shield instead of a bore. I asked for the form. There isn\'t one yet.',
    'Half a dome is still a dome.',
  ],

  // ---- Old Grumm (the burrow)
  zl_grumm_pre: [
    'They put a heat post over our burrow. Connection next quarter. Our tunnels sweat already.',
    'Up top they wait for heat. Down below we open the vents. Somebody\'s got it wrong.',
  ],
  zl_grumm_mid: [
    'The vent breathes warmer every week. I told the project. They sent a form.',
    'Up top they wait for heat. Down below we open the vents.',
  ],
  zl_grumm_council: [
    'Tell the council the moles say stop. Nobody asks moles. Ask anyway.',
    'The vent breathes warmer every week.',
  ],
  zl_grumm_network: [
    'Baldino\'s relays on our mills? Hmph. Anything that cools my tunnels.',
    'Up top they wait for heat. Down below we open the vents.',
  ],

  // ---- Tavo (once the oven is hot)
  zl_tavo_done: [
    'Snuff pays me to carry rolls to the depot. The depot pays her. My cousin on the platform eats them. Everybody\'s paid.',
    'Nice day for a walk. Nicer with warm bread.',
  ],

  // ---- Nara and Oku, when no chapter needs them
  zl_nara: [
    'The shuttles fly again. My flowers went out on the first one. Xil sells them on at Citadel\'s harbour.',
    'The project brought people up from Twinsun. People buy flowers. I\'m not complaining.',
  ],
  zl_oku: [
    'The project put new sails on my mills. Paid for them, too. Then you braked them.',
    'Snuff bakes with the project\'s heat. Her grandmother baked with charcoal and complained less.',
  ],

  // ---- journal
  zl_j_oven: 'Mother Snuff bakes in Zeelich\'s old watch house, on the project\'s heat. Her oven is cold: something sits on its flue.',
  zl_j_paid: 'Snuff paid me five kashes. The street has bread again.',
});
