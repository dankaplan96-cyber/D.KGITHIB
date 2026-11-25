// SHOPS-1: Citadel's shops and the Esmer trading house (story/shops.js). English only. The keepers' everyday lines are
// INTERIOR-LIFE's and WORLD-LIFE's (text/interiors.js, text/walkers.js); these are what they say when they sell. The
// ferry runs between Citadel and Desert Island; Zeelich is reached by spaceship.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  // ---- the shops' titles
  sh_title_bazoo: "Mr Bazoo's", sh_title_bazoo_sale: "Mr Bazoo's: everything must go",
  sh_title_pharmacy: 'The Pharmacy', sh_title_ticket: 'Ferry Tickets', sh_title_esmer: 'The Esmer Trading House',

  // ---- goods (the flask, the clover, the potion, darts, penguins and cells keep their own names)
  sh_honey: 'Mosquibee honey', sh_ticket: 'Cabin ticket, Desert Island ferry', sh_tea: 'Zeelich spice tea: refill magic',
  sh_why_hp: "You're in good health.", sh_why_mp: 'Your magic is full.', sh_why_carry: "You can't carry any more.",

  // ---- SHOP-UI (the user, 22.11: "it doesn't say what each thing does"): under the selected good's name and price
  // (hud.js shopWhat: shd_<item id>, or the item's own `desc`), one line: what it does and how it is used. Every shop's
  // goods: Pippa's stall (main.js SHOP), the town's shops (story/shops.js), the arsenal's stalls (story/arsenal.js),
  // the islands' counters (story/islandpeople.js)
  shd_potion: 'Drunk on the spot: all your life back.',
  shd_flask: 'Drunk on the spot: half your magic back.',
  shd_tea: 'Drunk on the spot: all your magic back.',
  shd_cordial: 'Drunk on the spot: all your magic back.',
  shd_clover: 'Kept for later. When your life runs out, it puts you back on your feet. Up to nine, one more for each clover box.',
  shd_honey: 'When your life runs low, a spoonful is taken by itself: half your life back. Carry up to three.',
  shd_ticket: 'Board the Desert Island ferry with it and step off with full life and magic. Carry up to three.',
  shd_blowgun: 'A weapon. Choose it and Attack fires darts, fast and straight; light damage. Six darts come with it.',
  shd_darts: 'Three more darts for your blowgun. You carry up to thirty.',
  shd_darts10: 'Ten more darts for your blowgun. You carry up to thirty.',
  shd_blowtron: "A weapon. It fires the blowgun's darts twice as fast, and harder.",
  shd_penguin: 'Set it down from your inventory on open ground: it waddles off, enemies go for it, then it goes bang. Up to five.',
  shd_laser: 'A weapon. Choose it and Attack fires straight shots, hardest on machines. Comes with one cell: five shots.',
  shd_cell: 'Five more laser shots. With no cell left, each shot burns 2 magic.',
  shd_lantern: 'Switch it on from your inventory: it lights dark corners and shows what they hide.',
  shd_line: 'Choose it and Attack casts it, 14 m at most: a cord ring reels you across; a loose thing or a light enemy comes to you.',
  shd_lens: 'The glass a harbour light shines through. Fit it to a light that has gone dark.',
  shd_pcell: "Fitted to Arthur's pocket set, its squeal is ready again twice as soon.",

  // ---- the inventory
  it_honey: 'Mosquibee Honey', itd_honey: 'Honey from the Mosquibees of Zeelich, in a glazed jar. When life runs low, a spoonful is taken by itself: half your life back. Up to three jars.',
  it_ticket: 'Cabin Ticket', itd_ticket: 'For the ferry between Citadel and Desert Island. The deck is free; the cabin has cushions and tea. Board with it and you step off with full life and magic. Up to three.',
  it_parcel: "Neska's Parcel", itd_parcel: 'A teal Zeelich parcel with brass bands, stamped twice by Officer Odile. Neska is waiting for it at the Esmer trading house.',

  // ---- toasts
  sh_toast_carry: '{n}: {c} carried', sh_toast_honey: 'A spoonful of honey: +{n} life', sh_toast_cabin: 'Cabin ticket: you step off rested',

  // ---- the keepers, the first time (then their own lines: text/interiors.js)
  sh_bazoo_hi: "Mr Bazoo's. Flasks, clovers, anything useful. The rabbit's for sale too. Nobody believes me.",
  sh_bazoo_sale: "Half price on anything I can't carry. Saves me boxing it.",
  sh_pharmacy_hi: 'Potions for now, honey for later. A spoonful when you\'re hurt does wonders.',
  sh_ticket_hi: 'The deck is free for islanders. A cabin ticket gets you a cushion and a pot of tea. You step off rested.',
  sh_esmer_hi: 'Welcome to the Esmer house. Honey from the Mosquibees, spice tea in glazed jars. Cheaper than in town. Don\'t tell Mr Bazoo.',

  // ---- the Esmers' parcel
  sh_sefa_ask: 'One thing. My list says nine parcels came through customs. I count eight. Could you ask Osk at the baggage claim?',
  sh_osk_give1: "A parcel for the Esmers? The teal one! Take it. Please. It's been on the belt all week.",
  sh_tw_osk: "Don't I have to sign something?",
  sh_osk_give2: 'Here. And here. And there. That one is for the other copy.',
  sh_osk_after: 'The Esmers have their parcel. Now I say good morning to the other teal one.',
  sh_sefa_thanks: 'My ninth parcel! Both of Odile\'s stamps and everything. Fifteen kashes for your trouble, and a jar of honey. Honey\'s cheaper for you from now on.',

  // ---- the trading house's door; the shut counters in the evacuation
  sh_door_sign: 'ESMER TRADING HOUSE. Zeelich goods by the crate or by the jar. Ask for Neska.',
  sh_door_evac: 'Shut. A note on the door: GONE WITH THE TOWN. BACK WHEN IT IS. - NESKA',
  sh_ph_closed: 'A card on the counter: CLOSED. GONE TO THE DEPOT WITH EVERYONE ELSE. FIRST AID AT THE QUEUE.',
  sh_tk_closed: 'A card on the till: NO CROSSINGS UNTIL FURTHER NOTICE.',

  // ---- journal
  sh_j_title: 'Harbour trade',
  sh_j_ask: 'Neska at the Esmer trading house is one parcel short. Osk at the baggage claim may have it',
  sh_j_take: 'Take the teal parcel to Neska at the Esmer trading house',
});
