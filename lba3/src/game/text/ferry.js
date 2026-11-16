// U-1 "The Last Ferry" (the user's own side quest, docs/lba-maturity/DEPTH-PLAN.md; story/ferry.js). English only.
// No night, evening, tonight, dawn or dusk words: the game has no time of day for them.
import { STR } from '../i18n.js';
import './he/ferry.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  lf_title: 'The Last Ferry',
  n_lf_ossel: 'Captain Ossel', n_lf_wick: 'Wick',
  p_sail: 'Sail', p_turn: 'Turn', p_bell: 'Ring',

  // ---- the sailings board on the West Pier (read)
  lf_board_closed: 'SKY-FERRY "PATIENCE". WEST PIER - MILL LANE. SAILINGS ON THE BELL. Pasted across it: LINE CLOSED. SHUTTLES SERVE ALL STOPS.',
  lf_board_closed2: 'Someone has chalked under it, in a neat hand: NEXT SAILING ON TIME.',
  lf_board_open: 'SKY-FERRY "PATIENCE". WEST PIER - MILL LANE. SAILINGS ON THE BELL. The LINE CLOSED strip is gone. Chalk: RUNNING.',
  lf_board_tea: 'Chalked at the bottom: TEA ON DECK. ASK OSHRA.',
  lf_board_mill: 'MILL LANE STEPS. SKY-FERRY TO WEST PIER. RING FOR THE FERRY.',

  // ---- Captain Ossel, before the line runs
  lf_ossel_1: 'Sailing for Mill Lane, on time. As always.',
  lf_ossel_2: "The ferry's been tied up since the shuttles came. They closed the line. Nobody closed the captain.",
  lf_ossel_3: "She's sound. It's the catch on the cable drum. It only lets go from the far side, and nobody's been round there in years.",
  lf_ossel_4: "The winch house is behind the gateway. Bridge down first. That's how she was built.",
  lf_ossel_wait: 'Bridge down first, then the catch. The winch house, behind the gateway.',
  lf_ossel_wait2: "The bridge is down. Now the catch, from its far side. You'll not get a hand round that drum.",
  lf_ossel_grounded: "The project grounded everything that flies. A ferry floats. I checked the form.",
  lf_ossel_free: "She's off the catch! Twelve years I've rung that bell for nobody.",
  lf_ossel_free2: 'You freed her. You ring her off. The handle by the cabin, all the way down.',
  lf_ossel_board: 'Come aboard. The handle by the cabin, all the way down.',

  // ---- the winch house
  lf_hut_plate: 'A brass plate by the door: 1. BRIDGE DOWN. 2. TRIP THE CATCH. 3. RING OFF.',
  lf_wheel_look: "A hand wheel. Its shaft goes out through the wall to the loading bridge's cable.",
  lf_wheel_turn: '(Stiff... then round. The bridge goes down outside, and something heavy goes up in here.)',
  lf_wheel_down: 'The loading bridge is down. The wheel turns no further.',
  lf_wheel_back: '(The bridge is down and the counterweight is up. Turning it back would only block the hole again.)',
  lf_drum: "The cable drum. Twelve years of cable, wound tight. The catch holds it from the back, where I can't reach.",
  lf_catch_hand: "I can see the catch's release, behind the drum. My arm won't go round. Something has to get there that isn't my arm.",
  lf_weight_down: "A counterweight hangs right in front of the hole in the partition. While the bridge is up, it's in the way.",
  lf_weight_up: 'The counterweight is up in its frame. Through the hole: the drum, and the catch behind it.',
  lf_port_blocked: '(The ball hit the counterweight. It hangs right in front of the hole.)',
  lf_catch_free: '(Clunk. The catch drops. The drum runs, and the cable goes slack.)',
  lf_free_hut: 'The catch is off. The drum turns freely now.',

  // ---- the telegraph on the ferry's deck
  lf_tel_look: 'An engine telegraph. STOP, SLOW, AHEAD. The handle is stuck at STOP.',
  lf_tel_held: 'The handle is locked. The cable from the winch house still holds her.',
  lf_tel_nobridge: "I can't get aboard. The loading bridge is still up.",

  // ---- the first sailing
  lf_first_tw: 'Bell rung. Handle down.',
  lf_first_ossel1: 'Listen to her. Twelve years, and she still knows the way.',
  lf_first_ossel2: 'The project grounded the shuttles. The lane will be glad of a boat.',
  lf_first_tw2: 'How long were you going to keep coming?',
  lf_first_ossel3: 'Until the timetable said otherwise. It never did.',
  lf_first_oshra: 'A ferry! Running! Wait for me, I have a kettle.',
  lf_first_wick: 'Room for a Wannie and his roots? I hate shuttles. Too high.',
  lf_first_ossel4: 'Climb aboard. Next sailing on the bell.',

  // ---- after: aboard and at the landings
  lf_ossel_on: [
    'Sailings on the bell. The handle by the cabin, whenever you like.',
    'On time, every time. Ask anyone. Well, ask Wick.',
  ],
  lf_ossel_on_mid: ['Not one sailing missed since you freed her. Not one.', 'The shuttles fly again. My regulars still come. Shuttles don\'t wait while you find your hat.'],
  lf_ossel_on_council: ['The council asked me for a sailing list. I sent the timetable. It hasn\'t changed in twelve years.', 'Clerks on every sailing. They take minutes of the view.'],
  lf_ossel_on_network: ['Baldino wants one of his boxes on my wheelhouse. I said after the season.', 'Engineers on every sailing. They tip in bolts.'],
  lf_ossel_on_late: ['The line is on the council\'s map now. Printed. In ink.', 'Ring when you like. She\'ll come.'],
  lf_wick_on: ["I don't get off. Getting off is where the trouble starts.", 'Roots for the west end market. Well. One day I\'ll take them there.'],
  lf_oshra_hi: 'Tea? Two kashes. Glaze cup included, while it lasts.',
  lf_oshra_tea: 'There. Hot, strong, and in my best glaze. Mind, it\'s full.',
  lf_oshra_free: "No kashes? Then it's on the house. Don't tell the captain.",
  lf_oshra_full: "You've had one. Have another and you'll float before the ferry does.",
  lf_bell_ring: '(The bell carries over the clouds.)',
  lf_bell_none: '(The bell carries over the clouds. The ferry stays tied up.)',
  lf_bell_here: 'The ferry is right here.',
  lf_bell_coming: 'The ferry is on its way.',
  lf_tel_moving: 'We are under way.',
  lf_toast_tea: 'Tea: magic refilled',
  lf_rescued: '(Back on the landing.)',

  // ---- the sailings (subtitles; who speaks is the key's middle part)
  // ch. 3, before the shield drops
  lf_s_pre_w1: 'The project grounded everything that flies. Nobody thought to ground a ferry.',
  lf_s_pre_o1: 'My glaze is held at the spaceport with my ship. My kettle wasn\'t.',
  lf_s_pre_c1: 'Mill Lane, on time. I said she\'d sail.',
  lf_s_pre_w2: 'That platform hums all day now. My burrow hums with it.',
  lf_s_pre_o2: 'Everyone on the street works for the project or sells to it. Me included, when they let me fly.',
  lf_s_pre_c2: 'West Pier, on time. Mind the step.',
  // ch. 3, after the shield drops
  lf_s_post_w1: 'A ship went over the clouds in a great hurry. The platform\'s gone quiet.',
  lf_s_post_o1: 'They say the man in charge left first. Usually he waits for the tea.',
  lf_s_post_c1: 'Quiet up on the platform. A ferry likes quiet.',
  lf_s_post_w2: 'No drill hum from the platform. My roots will grow straight again.',
  // chapters 4-8: the ships fly again
  lf_s_mid_w1: 'The shuttles fly again. I still take the ferry. Too high, shuttles.',
  lf_s_mid_o1: 'My glaze goes to Citadel by ship now. I stay here and pour. Tea sells better.',
  lf_s_mid_c1: 'Not one sailing missed. You can set your watch by her. I do.',
  lf_s_mid_w2: 'My burrow breathes warmer every week. Grumm says it\'s the drill. Grumm says that about everything.',
  lf_s_mid_o2: 'Citadel folk buy my cups and ask for tea in them. I send them here.',
  lf_s_mid_c2: 'Wick has ridden every sailing this season. He has never once got off.',
  // chapter 9: the council
  lf_s_council_w1: 'The council is hearing the bore. Half this deck wants it stopped. The other half wants its heat.',
  lf_s_council_o1: 'Clerks ride with me to the council steps. They don\'t tip. They take minutes.',
  lf_s_council_c1: 'Whatever they decide up there, the ferry sails on the bell.',
  lf_s_council_w2: 'Nobody asks Wannies. Grumm went to the council anyway. Took his own chair.',
  lf_s_council_o2: 'If they stop the bore, I lose half my customers. If they don\'t, I lose my nerve.',
  // chapter 10: the network
  lf_s_network_w1: 'Baldino\'s boxes on Oku\'s mills, and the bore making a shield. I\'ll believe it when my burrow cools.',
  lf_s_network_o1: 'Engineers on every sailing. They drink it strong and talk about relays.',
  lf_s_network_c1: 'Baldino asked if she could carry a relay. She carried a council. She can carry a box.',
  lf_s_network_w2: 'The mills turn, the boxes blink. My burrow is a touch cooler. A touch.',
  lf_s_network_o2: 'Baldino came aboard for tea. He paid in a spring. I kept it.',
  // after the ending
  lf_s_late_w1: 'The ground\'s gone still. I ride anyway. I\'ve got used to the view.',
  lf_s_late_o1: 'The shield crew comes up for tea between shifts. Two sugars, every one of them.',
  lf_s_late_c1: 'The line is on the council\'s map now. Printed. In ink.',
  lf_s_late_w2: 'I got off once, at Mill Lane. Bought a hat. Got straight back on.',
  lf_s_late_o2: 'The ships fly, the ferry sails, and nobody drills. I can hear the kettle again.',

  // ---- journal and objective lines
  lf_j_ask: 'Captain Ossel still turns up for a ferry that has not sailed in years. The catch on the cable drum holds her.',
  lf_j_bridge: 'In the winch house: the loading bridge first. Its counterweight hangs in front of the hole to the catch.',
  lf_j_catch: 'The catch lets go from its far side only. Something has to reach it through the hole.',
  lf_j_free: 'The ferry is free. The captain wants me to start her myself: the handle by the cabin.',
  lf_j_line: 'The ferry runs again between the West Pier and Mill Lane. Ring the bell at either landing to call her.',
});
