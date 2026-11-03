// NW-1 "Bands" (chapter 14 of the expanded campaign, story/bands.js; EXPANSION_PLAN.md §4.4 NW-1, R1.11 "As built").
// English only.
// Essential clues (keep their meaning through any text cleanup):
//   nw1_bal_float (every relay has a float; somebody at each station sets its band);
//   every nw1_<station>_low and nw1_<station>_high line (which way to turn: "set too low" wants a higher band, "set
//     too high" a lower one), nw1_nudge_band (the same rule);
//   nw1_oren_trim and nw1_mira_trim (Oren cut the relay's share on his own: the band must follow), nw1_zoe_fog2 (the fog
//     call takes some of the set's power), nw1_ilka_surge and nw1_pim_cloud (the source changed).
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // Baldino's briefing (vm_3; the floats)
  nw1_bal_vm3: "The council's order has sat on Vesk's desk for days. His drill hasn't missed a stroke, so we're back to my wire.",
  nw1_bal_float: 'And every relay carries one of my brass floats now, to keep its power steady. Somebody at each station has to set its band.',

  nw1_band_low: 'LOW', nw1_band_mid: 'MID', nw1_band_high: 'HIGH',
  nw1_float_look: "Baldino's brass float on the relay. Its band reads {b}.",
  nw1_nudge_band: 'Listen to {who}. Band set too low: turn it up. Set too high: keep turning, it goes round to LOW.',

  // the valve room (Mira reads the needles; Oren trims the relay's share)
  nw1_valves_high: "The needles are sagging under green. Your float's band is set too high.",
  nw1_valves_low: "Now they're climbing past green. The band's set too low for this pressure.",
  nw1_valves_right1: 'Green, all three. Leave it there.',
  nw1_valves_trim: "A thump runs through the pipes on the drill's stroke, and the governor's hum drops a note.",
  nw1_oren_trim: 'Your box drinks. The shelters drink first.',
  nw1_mira_trim: "He's cut the relay's share. Nobody asked me.",
  nw1_valves_right2: "Green again. So he trims, and I follow. That's my job now.",
  nw1_bal_ration: 'He rations the mains? Then your float follows him, Mira, and you follow the float.',
  nw1_mira_after: 'Every stroke, I watch for his trims. Nobody touches my valves, or my float.',

  // the lighthouse (Arthur reads the needle; Zoé's fog call)
  nw1_light_low: "Dad, the needle's banging on the pin! The relay's band is set too low.",
  nw1_light_high: "Now it's sagging, Dad. The band's set too high.",
  nw1_light_right1: "It's still! Right in the middle.",
  nw1_zoe_fog1: "Haze coming in off the sea. The boats out there can't see the light.",
  nw1_zoe_fog2: "I'm putting the fog call out on the harbour channel. It'll take some of the set's power.",
  nw1_tw_fog: "The boats first. We'll follow it.",
  nw1_ar_mine: "Still again! Dad, can I mind the band? I can read this needle better than anyone.",
  nw1_zoe_yes: "He can. I'll keep the boats.",
  nw1_zoe_wait: "Arthur's reading the needle. Set the band by what he says.",
  nw1_ar_after: "Needle's still. I'm minding the band, Dad.",
  nw1_zoe_after: "The boats are in. Arthur hasn't let go of that band.",

  // the bore (Ilka reads the steam; the vent breathes out hard)
  nw1_ilka_won: "That's the last of them. Now look at your relay.",
  nw1_bore_low: "It's spitting steam from every joint. The band's set too low.",
  nw1_bore_high: "It's barely wheezing. The band's set too high.",
  nw1_bore_right1: "That's a steady breath. Leave it.",
  nw1_bore_surge: 'The ground shivers. The vent roars, and steam pours out harder than before.',
  nw1_ilka_surge: 'She breathes out hard every so often. That was one.',
  nw1_ilka_mine: "There. Reading this vent is my trade anyway. I'll keep the band.",
  nw1_ilka_after: 'She breathes, I watch the band, Dallan watches the sky.',

  // the dome (Pim reads the light; a cloud over the peak)
  nw1_dome_low: "Twinsen, the relay's ticking like a kettle! The band's set too low.",
  nw1_dome_high: "It's gone all dim. The band's set too high.",
  nw1_dome_right1: "That's it! It's glowing nice and even.",
  nw1_dome_cloud: 'A cloud slides over the peak, and the dome goes grey.',
  nw1_pim_cloud: 'Hey! Where did the sun go?',
  nw1_pim_mine: "Bright again! I'll watch the clouds and set it. I've got the best eyes up here.",
  nw1_keeper_wait: 'Do as the boy says. He can see the relay better than I can.',
  nw1_pim_after: "I'm holding the chain and watching the clouds. Both!",

  // a wrong band, heard on the line by a station already on it
  nw1_rad_oku: "Mill here. Something on the line is shouting, and my relay's lamp is jumping.",
  nw1_rad_mira: "Mira here. My relay's flickering. Somebody's band is wrong.",
  nw1_rad_arthur: "Lighthouse here! The needle's twitching. Is that you, Dad?",
  nw1_rad_ilka: "Ilka here. My relay's lamp is stuttering. Is that your end?",
  nw1_rad_pim: 'Pim here! My relay keeps blinking! Is that you?',

  // HUD
  nw1_sub_valves: "Citadel: set the valve room relay's band (Mira reads the needles)",
  nw1_sub_light: "Citadel: set the lighthouse relay's band (Arthur reads the needle)",
  nw1_sub_bore: "Desert Island: set the bore relay's band (Ilka reads the steam)",
  nw1_sub_dome: "The Hamalayi: set the dome relay's band (Pim reads the light)",
  nw1_j_vm3: "The council's order has sat on Vesk's desk for days, and his drill hasn't missed a stroke.",
  nw1_j_float: "Every relay carries one of Baldino's brass floats. Somebody at each station sets its band.",
  nw1_j_valves: "Oren cut the valve room relay's share of the mains without asking anyone. Mira follows his trims with the band.",
  nw1_j_light: 'Zoé put the fog call out to the boats, and the band had to follow. Arthur minds it now.',
  nw1_j_bore: "The bore's vent breathes out hard now and then. Ilka reads it and keeps the band.",
  nw1_j_dome: 'Clouds cross the peak. Pim watches them and keeps the dome relay\'s band.',
});
