// SHOPS-1: Citadel's shops and the Esmer trading house (story/shops.js). English only. The keepers' everyday lines are
// INTERIOR-LIFE's and WORLD-LIFE's (text/interiors.js, text/walkers.js); these are what they say when they sell. The
// ferry runs between Citadel and Desert Island; Zeelich is reached by spaceship.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // ---- the shops' titles
  sh_title_bazoo: "Mr Bazoo's", sh_title_bazoo_sale: "Mr Bazoo's: everything must go",
  sh_title_pharmacy: 'The Pharmacy', sh_title_ticket: 'Ferry Tickets', sh_title_esmer: 'The Esmer Trading House',

  // ---- goods (the flask, the clover, the potion, darts, penguins and cells keep their own names)
  sh_honey: 'Mosquibee honey', sh_ticket: 'Cabin ticket, Desert Island ferry', sh_tea: 'Zeelich spice tea: refill magic',
  sh_why_hp: "You're in good health.", sh_why_mp: 'Your magic is full.', sh_why_carry: "You can't carry any more.",

  // ---- the inventory
  it_honey: 'Mosquibee Honey', itd_honey: 'Honey from the Mosquibees of Zeelich, in a glazed jar. When life runs low, a spoonful is taken by itself: half your life back. Up to three jars.',
  it_ticket: 'Cabin Ticket', itd_ticket: 'For the ferry between Citadel and Desert Island. The deck is free; the cabin has cushions and tea. Board with it and you step off with full life and magic. Up to three.',
  it_parcel: "Sefa's Parcel", itd_parcel: 'A teal Zeelich parcel with brass bands, stamped twice by Officer Odile. Sefa is waiting for it at the Esmer trading house.',

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
  sh_door_sign: 'ESMER TRADING HOUSE. Zeelich goods by the crate or by the jar. Ask for Sefa.',
  sh_door_evac: 'Shut. A note on the door: GONE WITH THE TOWN. BACK WHEN IT IS. - SEFA',
  sh_ph_closed: 'A card on the counter: CLOSED. GONE TO THE DEPOT WITH EVERYONE ELSE. FIRST AID AT THE QUEUE.',
  sh_tk_closed: 'A card on the till: NO CROSSINGS UNTIL FURTHER NOTICE.',

  // ---- journal
  sh_j_title: 'Harbour trade',
  sh_j_ask: 'Sefa at the Esmer trading house is one parcel short. Osk at the baggage claim may have it',
  sh_j_take: 'Take the teal parcel to Sefa at the Esmer trading house',
});
