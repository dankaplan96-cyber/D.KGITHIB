// EXPANSION WAVE 1 (story/relays.js): chapter 15's relays down the shaft (H-1, card C11-1) and chapter 16's feeds at the
// deck ring (H-2, card C12-1). English only.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  // H-1: Baldino's two relays (handed over at the collar)
  rl_bal_hook: "Below the shaft my radio goes blind, my boy. Relays talk by sight: one in each hall, on a bracket that sees both doors. A green lamp means it sees that door.",
  rl_tw_hook: 'Two relays. One for each hall.',
  rl_bal_deep: "There! Clear as a bell, the whole hall. Leave that one where it is.",
  rl_bal_gal: "Got you, my boy. Both relays talking. Down at the core they'll all hear you now.",
  rl_red_on_deep: "Green for the tunnel, red for the shutter. From down here it can't see along that wall. The catwalk runs right beside it.",
  rl_red_in_deep: "Green for the shutter, red for the tunnel. Baldino's end is the tunnel.",
  rl_red_on_gal: "Green for the tunnel, red for the old arch. A pillar stands in the way. It wants the far side.",
  rl_red_in_gal: "Green for the arch, red for the tunnel. The pillars hide it from here. Nearer the arch, maybe.",
  rl_red_both: 'Both lamps red. It sees neither door from here.',
  rl_block_deep: 'Not yet. Past this shutter Baldino loses me, unless a relay sees both doors.',
  rl_block_gal: "Baldino's relay first. One that sees the tunnel and this arch.",
  rl_bal_sendell: "Still with you, Twinsen. Her light carries my signal better than any relay. This chamber is hers, though.",
  rl_sub: 'Set a relay where it sees both doors',
  rl_toast_block: 'Set a relay where both its lamps are green',
  rl_toast_red: 'A red lamp: that door is out of sight',
  rl_toast_spare: 'The spare relay unclipped and taken along',
  rl_toast_hand: 'Relays carried: {n}',
  rl_nudge: 'A red lamp: take the relay and try another bracket',

  // H-2: the allies' feeds at the junction boxes
  fd_tw_prime: "The pylon's drawing on it. It can't get up while the pylon is open.",
  fd_bal_through: 'Your relays carry them all the way down. Listen!',
  fd_zoe_ask: "Twinsen, it's me! The LIGHTHOUSE box by your pylon. Set its three dials for my signal, the same as always.",
  fd_zoe_wrong: 'Star, sun, wave, love. The same as always.',
  fd_mira_ask: 'The MAINS box, Twinsen. Turn its wheel and watch the needle. Two marks on every gauge: stop between them.',
  fd_mira_trip: 'Past the second mark it trips, back to nothing. Slower this time.',
  fd_oku_ask: "The MILLS coupling, lad! Its flywheel's running wild. Brake it with your ball, the mark at the top, like the mill brakes.",
  fd_oku_wrong: "The mark's not on top. It slips loose. Wait for it to come round.",
  fd_obj_light: "Set the LIGHTHOUSE box's three dials for Zoé",
  fd_obj_mains: 'Bring the MAINS needle between its two marks for Mira',
  fd_obj_mills: "Brake the MILLS flywheel for Oku, its mark at the top",
  fd_toast_trip: 'Tripped: back to nothing',
  fd_toast_wrong: 'Wrong order',
  fd_toast_slip: 'It slips loose',
  fd_nudge_light: "Zoé's signal: star, sun, wave",
  fd_nudge_mains: 'Stop turning while the needle is between the two marks',
  fd_nudge_mills: 'Throw the ball at the flywheel as its mark comes up to the top',
});
