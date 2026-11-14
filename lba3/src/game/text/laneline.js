// The campaign thread of chapter 8 (CAMPAIGN-TREATMENT, section 7 "The evacuation — Zoé finds the omission"): the list
// cart that drives past the lane's shut water gate, the schedule read against the route, the lane's people at the landing,
// the culvert's cock in the pump room, the boarding. English only (i18n.t falls back to it).
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  n_ev_hedda: 'Hedda', n_ev_tobin: 'Tobin',
  p_sched: 'Read Schedule', p_route: 'Read Route',

  // ------------------------------------------------------------ the arrival: the cart at the shut gate
  ev_cart_1: "(From up here I can see our lane. The project's cart came down to its gate, found it shut, and turned off to the fields. Every seat empty.)",
  ev_tw_cart: "On the way down I watched the project's cart come to our lane's gate and turn round. Empty.",
  ev_zoe_cart: "That gate's been shut since they closed Mira's office. The culvert under it is full, so the gate stays shut. The project posts its timetable at every stop. I'll read the one on the lighthouse path.",

  // ------------------------------------------------------------ Zoé at the lighthouse path's stop
  ev_obj_sched: "Zoé: compare the list cart's schedule with its route",
  ev_sub_sched: 'The schedule',
  ev_sub_route: "The driver's route",
  ev_z_sched: '(SCHEDULE, EVERY ROUND. Stop four, LANE GATE: Bram, Hedda, Tobin. They are on it. Every round.)',
  ev_z_route: "(The driver's route. Bridge, plaza, fields, lighthouse path. The lane is crossed out: GATE SHUT, NO STOP.)",
  ev_z_both: 'So on paper the lane is picked up every round. On the road nobody stops. They are sitting on their cases waiting for a cart that turns round.',
  ev_z_go: "Then they wait at the cart's own stop, where the driver can't miss them. The landing by the pump house.",

  // ------------------------------------------------------------ the lane's people
  ev_obj_lane: "Zoé: bring the lane's people to the landing ({n}/2)",
  ev_obj_landing: 'Zoé: go to the landing by the pump house',
  ev_bram_z0: "Zoé. The man on the bridge said: wait for the cart. So I'm waiting.",
  ev_bram_z1: 'The man on the bridge said wait for the cart. I waited. It came to the gate and went away again. Twice.',
  ev_zoe_bram: "Bring your bag to the landing, Bram. This time it stops.",
  ev_bram_z2: 'If you say so. Somebody had better tell the cart.',
  ev_hedda_z0: "Packed since breakfast, Zoé. Tobin's sat on the cases twice to shut them.",
  ev_tobin_z0: 'Three times.',
  ev_hedda_tw0: "Twinsen! We're packed. The project says wait here for the cart, so here we wait.",
  ev_tobin_tw0: 'On the cases. They shut better that way.',
  ev_zoe_hedda: "To the landing, both of you. By the pump house. The cart is coming in.",
  ev_hedda_z1: 'Tobin. The cases.',
  ev_tobin_z1: 'I know, I know.',
  ev_pippa_land: "Bread for the lane. Nobody else thought of the lane, so I did.",
  ev_zoe_land: "Everyone's here. Now the cart has to get through that gate.",
  ev_bram_float: "It's a float gate. Culvert full, gate shut. Mira's pump used to empty it, before they called her office non-essential.",
  ev_tw_room: "Every pipe on this lane meets in the pump room. The culvert must drain down there too.",

  // ------------------------------------------------------------ the pump room
  ev_obj_gate: "Open the lane's water gate (the pump room)",
  ev_sub_culvert: "Find the culvert's pipe",
  ev_sub_cock: 'Open its cock',
  ev_room_in: "(The copper pipe is kicking again. Harder than in spring. And the floor grate is brimming: the culvert's water, all the way up.)",
  ev_culvert: "(CULVERT. A cast-iron pipe out of the floor grate, with a cock of its own. It drops into the copper pipe. The copper one pulls toward the fortress: it pulled our water away in spring.)",
  ev_kick_1: "(The copper pipe kicks the handle straight back out of my hand. Three kicks, then a rest. In the rest, then.)",
  ev_kick_2: '(Kicked back. Wait for the rest.)',
  ev_cock_open: "(It turns. The copper pipe pulls, and the grate gurgles. The culvert is going down the project's own pipe.)",
  ev_gate_clank: '(Up on the lane, something heavy clanks. The float has dropped.)',
  ev_cock_look: "(The culvert's cock, open. The grate is dry.)",
  ev_toast_kick: 'Kicked back: wait for the rest',

  // ------------------------------------------------------------ the boarding
  ev_obj_board: 'Up to the landing',
  ev_drv_1: "Gate's open, so the lane's on my route. That's how routes work.",
  ev_bram_board: 'Fifty years I kept that pump, and I leave sitting down.',
  ev_hedda_board: 'Tobin, the cases go under the bench. Not on my feet.',
  ev_tobin_board: 'Yes, Hedda.',
  ev_pippa_board: "I'm not on any list. I'm on the cart. Shove up, Bram.",
  ev_drv_2: "She's not on my sheet.",
  ev_pippa_board2: "I've got bread.",
  ev_drv_3: '...Sit down, then.',
  ev_zoe_board: 'There. Now they are out of the lane, and not just on paper.',
  ev_zoe_board2: "I'm going back to the hill families. You wanted to know what Vesk is telling his stations: the control room hears all of it.",

  // ------------------------------------------------------------ waiting, and after
  ev_bram_wait: "Float gate. It opens when the culvert's empty, and not a moment before.",
  ev_hedda_wait: "We'll wait. We're good at it by now.",
  ev_tobin_wait: "Three cases. I've counted. Twice.",
  ev_pippa_wait: 'The bread is still warm. Hurry up with that gate.',
  ev_zoe_wait: "The pump room, Twinsen. That gate won't open itself.",
  ev_bram_bridge: "Hard seats, and the driver talked the whole way. But here we are. I've had worse days.",
  ev_hedda_bridge: "Tobin's counting the cases again. We have three. He keeps getting four.",
  ev_tobin_bridge: 'There is a fourth. I can feel it.',
  ev_pippa_bridge: 'Saw them to the bridge. Bram complained about the seats the whole way. What can I sell you?',

  // ------------------------------------------------------------ the journal
  ev_j_cart: "From the plateau I watched the project's cart come down to our lane's shut gate and turn away, every seat empty.",
  ev_j_sched: "At the lighthouse path Zoé read the cart's schedule against the driver's route: the lane's people were on one and crossed off the other.",
  ev_j_lane: 'Zoé brought Bram, Hedda and Tobin to the landing by the pump house. Pippa was already there, with bread.',
  ev_j_gate: "In the pump room I opened the culvert's cock in the rest between the copper pipe's kicks. The culvert drained, and the lane's water gate opened.",
  ev_j_board: 'The cart came in through the gate, and the lane boarded it.',
});
