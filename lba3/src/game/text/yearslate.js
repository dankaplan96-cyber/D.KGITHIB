// U-4 "Twelve Years Late" (the user's own side quest, docs/lba-maturity/DEPTH-PLAN.md; story/yearslate.js). English only.
// No night, evening, tonight, sunset, dawn, dusk or morning words: Zeelich has no time of day for them.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  tyl_title: 'Twelve Years Late',
  n_tyl_ysel: 'Ysel',
  p_tyl_album: 'Open the album',
  it_tyl_card: 'Old postcard',
  itd_tyl_card: 'A picture of Zeelich\'s street, twelve years old. Addressed to "the lady with the camera, Portraits, Clinic Row". No name, and no such row.',
  it_tyl_album: "Ysel's album",
  itd_tyl_album: 'Pictures of places as they were. Stand where Ysel stood and open it: Clinic Row, the West Pier, Citadel\'s harbour.',

  // ---- the council's board
  tyl_board: 'A postcard pinned beside the council\'s notice. A note under it: UNDELIVERABLE. ANYONE?',
  tyl_card_hint: 'The card',
  tyl_card_to: 'To the lady with the camera|Portraits, Clinic Row|Zeelich',
  tyl_card_msg: 'Your picture of us outside the clinic still hangs over our stove, and Jory\'s arm mended fine. If you\'re ever on Twinsun, the kettle\'s on. Mara',
  tyl_card_stamps: ['CITADEL HARBOUR', 'OTRINGAL: NOT KNOWN', 'KNARTAS: NOT KNOWN', 'MOSQUIBEE: NOT KNOWN', 'RETURN TO COUNCIL'],
  tyl_card_keys: '{e} put it away',
  tyl_tw_card: 'No name. Just a picture of a street. This street, twelve years ago.',
  tyl_tw_card2: 'Clinic Row. There\'s no clinic here now. The picture will have to be the address.',
  tyl_newcards: 'Three new cards of the street, pinned in a row. Each one is signed: Ysel.',

  // ---- Oma (the council's post comes through her)
  tyl_oma_1: 'That card came in with the council\'s post. It has been round every island for twelve years. Every island stamped it NOT KNOWN.',
  tyl_oma_2: 'Clinic Row! The doctor moved up to Otringal before my time. Take it, if you like: somebody should.',
  tyl_oma_hint: 'Clinic Row was this street\'s east end, they say. The picture is your address, dear. Look at the roofs.',

  // ---- knocking at the wrong doors (each answer points at one thing on the card)
  tyl_knock_pel: 'Portraits? I keep the depot\'s books. And your house has no tower; mine has had a minaret since my grandfather.',
  tyl_knock_pel_out: 'No answer. And this house has a minaret. The house on the card has none.',
  tyl_knock_oku: 'No photographers here, dear. On your card the old mill stands right behind the house. From our door it\'s half the street away.',
  tyl_knock_oku_out: 'No answer. The old mill is far off from here. On the card it stands right behind the house.',
  tyl_knock_bak: 'This was the clinic, yes, before my oven! But look how far off it is on your card. Whoever took that stood up the street.',
  tyl_knock_bak_out: 'This was the clinic, the card says so. But on the card it\'s far off to the side. The house I want is up the street.',
  tyl_hint_1: 'Eight walls and a wide, flat cap on the card\'s house. And the old mill right over its shoulder.',
  tyl_hint_2: 'The clinic is far off to the right of it. So the house is up the street from the bakery, on the same side.',

  // ---- the right door
  tyl_lissa_door: 'Portraits? Gran! Somebody\'s got one of your cards!',
  tyl_lissa_in: 'Portraits? That\'s Gran! Gran, look!',
  tyl_ysel_1: 'My card. The glass house, the old mill, the clinic at the end. Where did you find it?',
  tyl_tw_found: 'On the council\'s board. It\'s been round every island for twelve years.',
  tyl_ysel_2: '"The kettle\'s on." Mara and Jory. They came up for his arm and went home with a picture.',
  tyl_ysel_3: "This was my studio. My daughter Nara grows her flowers under my skylights now. Better use of the light, she says.",
  tyl_ysel_4: 'Here. My album. I stood in the same spots for years.',
  tyl_ysel_5: 'Stand where I stood and open it. You\'ll see what changed. Nobody has to tell you.',
  tyl_tw_album: 'I\'ll be careful with it.',
  tyl_ysel_6: 'Careful? It survived twelve years in a drawer. Go on.',
  tyl_toast_album: "Ysel's album: stand where she stood and open it",

  // ---- the album
  tyl_then: 'Then', tyl_now: 'Now',
  tyl_album_keys: '{e} then / now   {b} close',
  tyl_cap_row: 'My glass house, the old mill, the clinic at the end. The doctor always waved. I always told him to hold still.',
  tyl_cap_pier: 'The Patience at the West Pier, before the shuttles. The captain made me wait for the bell.',
  tyl_cap_harbour: 'Citadel\'s harbour, my one trip down. Gulls, nets, a quiet quay. Not one crate from up here.',
  tyl_toast_page: "Ysel's album: {n} of {m}",
  tyl_toast_all: "Ysel's album: every picture, where she stood",

  // ---- Ysel, before anyone brought the card
  tyl_ysel_idle: ['Mind the pots. Nara counts them.', 'The light\'s good in here. It always was.'],
  // ---- Ysel afterwards, at her camera by the door (her first word in each part of the story, then these)
  tyl_ysel_pre: 'Twelve years in a drawer. My hands remember the shutter better than the stairs.',
  tyl_ysel_mid: 'I\'m taking the street again. Same spots. Pelleck\'s scaffold will look historic one day.',
  tyl_ysel_council: 'Everyone is at the council house, so I took the empty street. It looks like my old cards.',
  tyl_ysel_network: 'Baldino asked me to photograph his relays. He wants them to look heroic. They look like kettles.',
  tyl_ysel_late: 'The ground is quiet: good for long exposures. Mara wrote back, by the way. The kettle\'s still on.',
  tyl_ysel_all: 'You stood in all my spots? Then you\'ve seen more of my twelve years than Nara has.',
  tyl_ysel_any: ['Hold still. No, not you. The light.', 'New cards on the council\'s board. Oma says they sell.', 'Stand where I stood. It still works.'],

  // ---- journal
  tyl_j_card: 'A postcard with no name on the council\'s board: "Portraits, Clinic Row". Its picture is this street, twelve years ago. Find the house in it.',
  tyl_j_found: 'The lady with the camera is Ysel, Nara\'s mother. She gave me her album.',
  tyl_j_pages: "Ysel's album: {n} of {m} pictures seen where she stood (Clinic Row, the West Pier, Citadel's harbour).",
});
