// Zeelich's street twelve years on: the watch house bakery, the heat posts, the burrow, the scaffold, and The Second
// Bake (src/game/story/zeelife.js). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  zl_title: 'Zeelich',
  p_shove: 'Shove', p_roll: 'Take a roll',
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
  zl_tag_sw: 'Another dark post, the same tag. The lit ones are by the council house, the depot and the bakery.',
  zl_tag_burrow: 'CONNECTION NEXT QUARTER, over the Wannies\' burrow. Warm air comes out of their vent anyway.',
  zl_burrow: 'Warm air breathes out of the Wannies\' vent. It smells of earth and root tea.',
  zl_flowers: 'Nara\'s cloud flowers, crated for Citadel. A project tag on each: HELD. Nothing flies but the project.',

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
  zl_snuff_i_council: 'The whole street\'s arguing about the bore. If it stops, I want my charcoal cart back.',
  zl_snuff_i_network: 'Baldino says the bore will make a shield instead. Do shields bake bread?',
  zl_snuff_i_late: 'The ground\'s quiet at last. Pity about my oven.',
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
    'The ships bring flour from Citadel now. And Citadel buys my rolls.',
    'This house was built for watching people. Now it feeds them.',
  ],
  zl_snuff_after_council: [
    'Half my bread goes to the drill crews. If the council stops the bore, who buys it?',
    'The drill crews say my rolls are the best thing on the platform. They\'re the only thing on the platform.',
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
  zl_bz_i_mid: 'Forty crates a day now, and the depot signs for ten.',
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
    'Twice the flights since the shuttles fly again. My cousins carry the heavy crates.',
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
    'No bore, no depot. No depot, no books. No books, no tilers.',
    'I do not panic. I file.',
  ],
  zl_pel_network: [
    'A shield instead of a bore. I asked for the form. There isn\'t one yet.',
    'Half a dome is still a dome.',
  ],

  // ---- Old Grumm (the burrow)
  zl_grumm_pre: [
    'They put a heat post over our burrow, for later. Our tunnels sweat already.',
    'Up top they wait for heat. Down below we open the vents. Somebody\'s got it wrong.',
  ],
  zl_grumm_mid: [
    'The vent breathes warmer every week. I told the project. They sent a form.',
    'Up top they wait for heat. Down below we open the vents.',
  ],
  zl_grumm_council: [
    'Tell the council the Wannies say stop. Nobody asks Wannies. Ask anyway.',
    'The vent breathes warmer every week.',
  ],
  zl_grumm_network: [
    'Baldino\'s relays on Oku\'s mills? Hmph. Anything that cools my tunnels.',
    'Up top they wait for heat. Down below we open the vents.',
  ],

  // ---- Tavo (once the oven is hot)
  zl_tavo_done: [
    'Snuff pays me to carry rolls to the depot. The depot pays her. My cousin on the platform eats them. Everybody\'s paid.',
    'Nice day for a walk. Nicer with warm bread.',
  ],

  // ---- Nara and Oku, when no chapter needs them
  zl_nara: [
    'The ships fly again. My flowers went out on the first one. Xil sells them on at Citadel\'s harbour.',
    'The project brought people up from Twinsun. People buy flowers. I\'m not complaining.',
  ],
  zl_oku: [
    'The project put new sails on my mills. Paid for them, too. Then you braked them.',
    'Snuff bakes with the project\'s heat. Her grandmother baked with charcoal and complained less.',
  ],

  // ---- ZEELICH-DOORS: inside the street's houses (src/game/zhomes.js)
  n_zh_lissa: 'Lissa', n_zh_wenna: 'Wenna',
  room_zh_pelleck: 'Mr Pelleck\'s house', room_zh_nara: 'Nara\'s flower house', room_zh_oku: 'Oku\'s house', room_zh_bakery: 'Snuff\'s bakehouse',
  zh_pel_radiator: 'A heat radiator, fitted and polished. Its pipe ends in the wall. A tag: NEXT QTR.',
  zh_pel_tiles: 'Tile samples. Two violet, six blue. The violet ones are the last of their kind.',
  zh_pel_forms: 'Form 7-B, Application for Heat Connection. Two copies, both stamped RECEIVED.',
  zh_nara_slate: 'XIL - CITADEL. 40 POTS. EVERY FLIGHT.',
  zh_nara_crates: 'Crates for Citadel, stacked to the beams. Every tag says HELD.',
  zh_nara_crates_gone: 'Two crates left. The rest have gone to Citadel.',
  zh_oku_stove: 'A charcoal stove. No heat post lit at this end of the street.',
  zh_oku_quern: 'A hand quern. The flour from the mills is ground finer here, by hand.',
  zh_oku_sail: 'A mill sail on a mending frame. One new pink panel, stitched in.',
  zh_bak_oven: 'The oven is cold. The copper feed from the project runs into its back.',
  zh_bak_oven_hot: 'The oven glows. The copper feed ticks as it warms.',
  zh_bak_racks: 'Empty bread racks.',
  zh_bak_racks_full: 'Loaves on every board. It smells like morning.',
  zh_closed_council: 'A notice on the door: COUNCIL. HEARINGS BY PETITION ONLY. Barred.',
  zh_closed_mill_old: 'The old mill\'s door is nailed shut. Its stair goes round the outside.',
  zh_closed_mill: 'Oku\'s padlock. Nobody goes in while the sails turn.',
  zh_closed_depot: 'PROJECT STORES. STAFF ONLY. The lock is new.',
  zh_closed_hut: 'The project\'s control hut. Locked.',
  zh_lissa_pre: [
    'Forty pots for Citadel, and nothing flying. I water them twice a day so they don\'t notice.',
    'Aunt Nara says the project\'s ship takes project cargo first. Flowers aren\'t project cargo.',
  ],
  zh_lissa_mid: [
    'They went out on the first ship. Now I\'m growing the next forty.',
    'Xil writes from Citadel: the flowers sell before he unpacks them.',
  ],
  zh_lissa_council: [
    'Without the project\'s heat the frames go cold in winter. Aunt Nara says we\'ll manage.',
    'Everyone\'s at the council house. I\'m watering.',
  ],
  zh_lissa_network: [
    'Xil wants sixty pots next time. Sixty!',
    'The ground is quiet. The flowers like quiet.',
  ],
  zh_lissa_late: [
    'Xil wants sixty pots next time. Sixty!',
    'The ground is quiet. The flowers like quiet.',
  ],
  zh_wenna_pre: [
    'Oku\'s at the plaza arguing about sails. I mend them, he argues.',
    'No heat post lit at our end. Charcoal, like my mother.',
  ],
  zh_wenna_braked: [
    'Somebody braked all three mills. Oku hasn\'t stopped talking since. Was that you?',
    'A braked mill doesn\'t tear its sails. I won\'t complain.',
  ],
  zh_wenna_mid: [
    'Charcoal costs more every month. Everyone with a lit post stopped buying it.',
    'The project paid for new sails. I still mend the old ones. Waste not.',
  ],
  zh_wenna_council: [
    'Oku wants the council to stop the bore. I want the heat post lit. We\'ll vote differently.',
    'Oku\'s up at the council house. Someone has to grind the flour.',
  ],
  zh_wenna_network: [
    'Baldino\'s relays ride on our mills now. Oku pretends he isn\'t proud.',
    'The ground is quiet. The post outside is still dark.',
  ],
  zh_wenna_late: [
    'Baldino\'s relays ride on our mills now. Oku pretends he isn\'t proud.',
    'The ground is quiet. The post outside is still dark.',
  ],

  // ---- ZEELICH-LIFE: the street's working people (story/zeelife.js streetFolk)
  n_zr_fennick: 'Fennick', n_zr_rezz: 'Rezz', n_zr_oma: 'Oma',
  zr_fen_pre: [
    'Three posts lit, three tagged. Hanging the tags is my job too.',
    'The bakery\'s heat box trips the moment its flue chokes. Then Snuff blames me.',
  ],
  zr_fen_mid: [
    'Next quarter\'s list is longer than this quarter\'s.',
    'The feed under the street runs hotter every week. I note it. Somebody files it.',
  ],
  zr_fen_council: [
    'Whatever the council decides, I bring the same wrench.',
    'Pelleck asks about his post every morning. I\'ve started taking the long way round.',
  ],
  zr_fen_network: [
    'Baldino wants a reading from every post. He says the heat tells him how the shell is.',
    'Steady pressure today. Baldino says that\'s good. I\'ll take his word.',
  ],
  zr_fen_late: [
    'Quiet ground, steady pressure. First good week in a year.',
    'They say the west end gets its posts lit at last. I\'ll believe it when I fit them.',
  ],
  zr_rez_pre: [
    'Grounded. The project says the sky is busy. It looks empty to me.',
    'I fly Nara\'s flowers, Bzizz\'s nectar and the council\'s post. Today I fly this bench.',
  ],
  zr_rez_council: [
    'The council checks every departure now. Twenty minutes a flight, for a stamp.',
    'Grounded again, more or less. At least the bench knows me.',
  ],
  zr_oma_pre: [
    'Petitions go in the box. Hearings when there are enough. There are never enough.',
    'I count the tags on the dark posts. The council likes numbers.',
  ],
  zr_oma_mid: [
    'Petitions come from Citadel now, by ship. They want hearings too.',
    'Three dark posts, three petitions about them. Mr Pelleck wrote two.',
  ],
  zr_oma_council: [
    'Enough petitions at last. The council has to sit!',
    'Everyone wants a stamp today. I\'ve run out of ink twice.',
  ],
  zr_oma_network: [
    'The council voted. Now everyone wants to petition about the vote.',
    'Baldino\'s relays need a permit. I wrote the permit. Nobody asked for it.',
  ],
  zr_oma_late: [
    'The council voted. Now everyone wants to petition about the vote.',
    'A quiet day. I put up a notice saying so.',
  ],

  // ---- journal
  zl_j_oven: 'Mother Snuff bakes in Zeelich\'s old watch house, on the project\'s heat. Her oven is cold: something sits on its flue.',
  zl_j_paid: 'Snuff paid me five kashes. The street has bread again.',
});
