// Chapter 10 — "Baldino's Network" (all five islands). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  n_ilkaradio: 'Ilka (radio)', n_yornaradio: 'Yorna (radio)', n_heskradio: 'Hesk (radio)', n_pimradio: 'Pim (radio)',
  p_relay: 'Set relay', p_fly: 'Fly', p_station: 'Console',
  fly_title: "Hesk's glider: where to?",
  fly_zeelich: 'Zeelich', fly_citadel: 'Citadel Island', fly_desert: 'Desert Island', fly_hamalayi: 'The Hamalayi',
  fly_done: '(done)', fly_here: '(you are here)',

  c10_narr: "Baldino's workshop, late into the night. Every bench is covered in wire.",
  c10_bal_1: "Five stations. Five places where the project's old machines can still be made to talk: the mains under Citadel, the lighthouse transmitter, my mill on Zeelich, the bore on Desert Island, and Sefa's dome on the Hamalayi.",
  c10_bal_2: "My relays: the test pair from my table, grown up. Each one hooks into a station's old machine and talks through it. When all five hear each other at once, the shaft's blast doors will hear them too.",
  c10_bal_3: "Now the limits. Each relay runs on power from where it stands: water, wind, steam, light. And together they hold the signal only a minute, so every station needs a friend standing by.",
  c10_tw_b1: "Then we need friends at five stations, and a way to reach them all.",
  c10_bal_pulse1: "Oh, and before I forget. Take this. My pulse tool: a little thunder in a box. It jams anything with gears or wires for a few seconds. Drones, automatons, mills, doors.",
  c10_bal_pulse2: "It does nothing at all to anything alive, and it needs a few seconds to recharge. Don't wave it at mites and expect miracles.",
  c10_toast_pulse: 'Pulse Tool · hold X to choose it · jams machines for a moment',
  c10_bal_4: "The way is already here. Listen.",
  c10_hesk_1: "Hesk here! I got the council's message. The glider's moored on Zeelich, by the dock. I'll fly you anywhere with a flat bit of ground. Not into the shaft, mind. She's a glider, not a mole.",
  c10_toast_relays: 'Baldino\'s relays (5)',
  c10_bal_after: "Five relays, five friends. And Twinsen, the relays are delicate. Don't throw the ball at them.",

  c10_hesk_fly: 'Where to?',
  c10_hesk_land: 'Down we go. Mind the step.',
  c10_hesk_idle: "She's light, she's fast, and she lands anywhere flat. Just say where.",

  // Zeelich: Oku's mill
  c10_oku_1: "Baldino's relay on the old mill? The wind's the only power up there. I'll hold her steady while you climb, but you'll have to put the brake on first. You know how.",
  c10_oku_brake: "That's it. Up you go, and don't look at the clouds.",
  c10_relay_mill: "Twinsen sets the relay on the mill's balcony and runs its wire to the sail shaft. The little lamp glows as the sails take up the wind again.",
  c10_oku_2: "I'll stay by her. If the wind drops, I'll turn the sails by hand. My grandmother did it once, in the year of the long calm.",

  // Citadel: Mira's valves
  c10_mira_1: "You still have my key. Good. The valve room is under this floor. The mains run to the fortress, the depot and the lighthouse: the oldest pipes on the island, and still the best.",
  c10_mira_2: "The relay needs pressure, two marks on every gauge. Each valve feeds two of the mains. Except the fourth: that one's FunFrock's own, and it only floods the fortress. Come down, I'll show you.",
  c10_valves_in: 'FunFrock\'s valve room. Four wheels, three gauges. Mira watches from the stairs with her arms folded.',
  c10_valve_hint: '(Each gauge should rest on the green mark: two.)',
  c10_valves_ok: 'All three needles settle on the green mark. The pipes hum, and Baldino\'s relay on the manifold blinks awake.',
  c10_mira_3: "Steady as a heartbeat. I'll stay down here and keep it that way. Nobody touches my valves.",

  // Citadel: the lighthouse
  c10_zoe_1: "There you are. The transmitter's warm, and Arthur's been reading the needle for an hour.",
  c10_ar_1: "It's on the wrong channel, Dad! I can tell. When it's right, the needle sits still.",
  c10_zoe_2: "Baldino's network channel is star, sun, wave. Set the dials, and Arthur will tell you if it's right. I'll hold the frequency.",
  c10_ar_wrong: 'The needle is jumping. Not that one!',
  c10_ar_close: "Closer! It's only wobbling now!",
  c10_ar_right: "It's still! It's sitting completely still!",
  c10_ar_mic: "Can I say it? Please? ...This is Arthur, at the lighthouse of Citadel Island. Station ready!",
  c10_zoe_3: "Station ready. Go on, Twinsen. We'll hold the lighthouse.",
  c10_zoe_after: "Arthur hasn't taken his eyes off that needle. Neither will I.",

  // Desert Island: the bore
  c10_ilka_1: "Twinsen! Dallan said you'd come. The bore vent is still breathing since you opened it. Steam, all day, all night. If your relay wants power, there's plenty.",
  c10_ilka_2: "Set it on the bore's frame. And keep your ball handy: the project's drones don't like anything they didn't build.",
  c10_relay_bore: 'The relay clicks onto the bore\'s frame. Steam rattles through its little pipe, and the lamp lights up.',
  c10_drones: 'Drones! Three of them, coming in low over the post.',
  c10_toast_drones: 'Protect the relay at the bore',
  c10_ilka_3: "That's the last of them. Dallan and I will keep the vent clear. Go, go!",
  c10_dallan_1: "I spent a year guarding this bore for the project. I can guard it a little longer for everyone else.",

  // The Hamalayi: the dome
  c10_yorna_1: "Back again, and with a box on your back. Sefa's dome?",
  c10_pim_1: "I'm coming! The big mirror's chain needs someone light to hold it, and I'm the lightest one here. Mum said so.",
  c10_yorna_2: "He's right, and he'll be careful. Won't you, Pim. Go on, both of you. Up the ridge.",
  c10_keeper_1: "The relay wants light? Then it shall have the dome's. Set it beside the telescope, and turn the dome to the sun.",
  c10_relay_dome: 'The relay sits beside the telescope. Pim takes the big mirror\'s chain in both hands.',
  c10_scope: 'The dome swings round, and the mirror pours light straight into the relay. Its lamp burns like a little sun.',
  c10_pim_2: "I've got it! I'm holding it! ...It's not even heavy!",
  c10_keeper_2: "The light will hold as long as the boy does. And I suspect he'll hold it for a very long time.",
  c10_mites: 'Ice mites, on the ridge!',

  // all five
  c10_toast_station: 'Relay lamps lit: {n} of 5',
  c10_all_1: 'Five lamps! All five! Twinsen, come to the drill platform on Zeelich. Time to call everyone at once.',
  c10_bal_p1: "Here's the console the project used to send its codes to the shaft. Ours goes out on all five relays at once. Everyone has to hold for one minute.",
  c10_tw_p1: 'Then everyone hold on.',
  c10_radio_mira: 'Mains steady. The fortress gauge hasn\'t moved a hair.',
  c10_radio_zoe: 'Lighthouse holding. Arthur says the needle is perfectly still.',
  c10_radio_oku: 'The sails are turning. My grandmother would be proud.',
  c10_radio_ilka: 'The steam is pouring. Dallan is guarding the frame like it\'s a crown.',
  c10_radio_pim: "I'm holding the mirror! I'm still holding it!",
  c10_bal_p2: "Sending now. Five voices, one signal...",
  c10_shaft: 'Far below the platform, something enormous groans. The blast doors of the shaft grind open, one after another, all the way down.',
  c10_bal_p3: "It worked. It actually worked! Every one of them held. Twinsen, Vesk is at the bottom of that shaft, with the only console that can turn the bore around. Go and change his mind.",
  c10_tw_p2: "I'll bring him back, and the bore with him.",

  c10_obj_bal: 'Hear Baldino out',
  c10_obj_stations: "Set Baldino's relays at the five stations ({n}/5)",
  c10_sub_mill: "Zeelich: the old mill (Oku)",
  c10_sub_valves: "Citadel: the valve room (Mira)",
  c10_sub_light: 'Citadel: the lighthouse (Zoé and Arthur)',
  c10_sub_bore: 'Desert Island: the bore (Ilka and Dallan)',
  c10_sub_dome: 'The Hamalayi: the dome (Yorna, Pim and Sefa)',
  c10_sub_fly: "(Hesk's glider is at the dock on Zeelich)",
  c10_obj_platform: 'Go to the drill platform on Zeelich',
  c10_j_plan: "Baldino's network: five relays at five stations, each powered by what's there, each held by a friend.",
  c10_j_fly: 'Hesk flies me between the islands in his glider.',
  c10_j_all: 'All five stations held at once. The shaft is open.',
  it_relay: 'Relay', itd_relay: "Baldino's relays: a box, a mast, a bit of genius.",
});
