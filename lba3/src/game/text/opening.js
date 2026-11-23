// The opening scene (src/game/story/opening.js) and the first objective. English only.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  // where and when (a caption over the island)
  op_cap_place: 'Citadel Island, Twinsun',
  op_cap_time: "Twelve years after Twinsen's last adventure",
  // (P83 / S-7: the originals in two lines, for a newcomer; the classic cut)
  op_cap_lore: "Sendell, Twinsun's goddess, chose Twinsen to stop FunFrock.",
  op_cap_lore_sub: 'FunFrock is dead. His clones never got the message.',
  // (LBA3-RUN: the originals over Twinsen's notebook, a line a page, for a newcomer; LBA1, then LBA2. The notebook cut's;
  //  the classic cut keeps P83 / S-7's two lines above)
  op_nb_1: 'FunFrock ruled Twinsun with clones and teleporters.',
  op_nb_2: 'Twinsen stood up to him and set Twinsun free.',
  op_nb_3: 'Later, lightning struck his Dino-Fly.',
  op_nb_4: "He rescued Twinsun's children from Zeelich.",
  // the harbour: the Joint Project's lift
  n_resident: 'Resident',
  op_res_1: 'When does the harbour row get the heat?',
  op_wk_1: 'Next quarter. Every home. Vesk promised.',
  op_res_2: "What's that hum?",
  op_wk_2: "Just the drill. It's a long way down.",
  // home
  op_ar_1: 'Dad! The mast fits!',
  op_tw_0: 'Told you. Now the sail.',
  op_zoe_1: "Twinsen. The tap's stopped again.",
  op_tw_1: 'I fixed that yesterday.',
  op_zoe_2: 'It worked yesterday.',
  op_ar_2: "Lulu says they're drilling to the middle of the world.",
  op_zoe_3: "That's warm. It's never warm.",
  op_tw_2: "I'll check the square's well.",
  op_zoe_4: "I'll ask next door.",
  op_zoe_5: 'Take your magic ball. Just in case.',
  pr_obj_well: 'Check the well',
  pr_tw_ballfirst: "I'd better take the magic ball along. It's in the cupboard.",
  pr_zoe_next: ["Same next door. Their tap coughed and stopped too.", 'And what came out was warm. Go on, the well.'],

  // OPENING-TUT: the yard's barrels, the magic ball's practice target (src/game/story/prologue.js ballHit)
  pr_barrel_hit: '(Still got it.)',
  pr_barrel_hit_ar: "(Still got it. Somebody tell Tim.)",

  // OPENING-TUT: the control tips (src/game/tutorial.js). One short instruction each; {k} and the like are the real
  // bindings in the device in use, as <kbd> keys
  tut_move: '{k} Move',
  tut_move_classic: '{w} Walk · {lr} Turn',
  tut_move_pad: '<kbd>Left stick</kbd> Move',
  tut_move_touch: 'Drag the stick to move',
  tut_inv: '{k} Open Inventory',
  tut_cam: '{k} Turn the camera · or drag with the right mouse button',
  tut_cam_pad: '<kbd>Right stick</kbd> Turn the camera',
  tut_cam_touch: 'Drag with a free finger to turn the camera',
  tut_cam_lba: '{k} Camera behind Twinsen',
  tut_athletic: '{k} Switch to Athletic: run and jump',
  tut_jump: '{k} Jump',
  tut_aim_face: 'Face the barrels.',
  tut_aim_mouse: 'Point at the barrels.',
  tut_aim_pad: 'Aim at the barrels with the left stick.',
  tut_ball: '{aim} {k} Throw the magic ball',
  tut_arc: 'Hold {k} to see where it lands',
  tut_magic: 'Out of magic: the ball still flies, but no longer bounces. Flasks refill it.',
  tut_discreet: '{k} Switch to Discreet: sneak up quietly',
  tut_normal: '{k} Back to Normal',
  tut_aggressive: '{k} Switch to Aggressive: kick and punch',
  tut_kick: '{k} Kick the lid',
  tut_dodge: '{k} Dodge',
  tut_dlg_next: ' Next',
  tut_dlg_all: ' Show all',

  // OPENING-TUT-2 (P31): the opening's steps (src/game/story/openingsteps.js). The goal line in the tip panel (always
  // shown), the key under it (Show control tips), Zoé's word over her head as a step begins, her call from the yard
  t2_goal_ball: 'Take your magic ball from the cupboard',
  t2_goal_out: 'Go out to the yard',
  t2_goal_zoe: 'Talk to Zoé',
  t2_goal_inv: 'Look at the Kettle Crystals in your inventory',
  t2_goal_tap: 'Try the garden tap by the front door',
  t2_goal_barrels: 'Knock the barrel by the house aside with the magic ball',
  t2_goal_pipe: 'Jump the copper pipe on your way out, or walk round it',
  t2_k_search: '{k} Search the cupboard',
  t2_k_talk: '{k} Talk',
  t2_k_try: '{k} Try the tap',
  t2_k_jump: '{k} Jump · take a run at it',
  t2_zoe_call: 'Twinsen! Over here.',
  t2_ask_inv: 'Have a good look at those.',
  t2_ask_tap: "Try the garden tap. If that's dry too, it isn't just our kitchen.",
  t2_ask_barrels: "That barrel jumped. Your joint from yesterday is behind it. Knock it aside with your ball.",
  t2_ask_pipe: "Over the project's pipe is quicker. You used to clear fences twice that high.",
  t2_zoe_done: "Not bad for an old hero. And be back for dinner.",
  t2_zoe_close: "Close enough. And be back for dinner.",
  // TUT-MYSTERY: her one call as he leaves the yard with steps open (over her head, or at the screen's edge)
  t2_call_kettle: "Twinsen! Take the kettle, Mira won't open the well on our word! And be back for dinner!",
  t2_call_go: 'Twinsen! Show Mira those crystals. And be back for dinner!',
  t2_back_zoe: "Twinsen! Wait, I've news from next door.",
  t2_back_inv: "Twinsen! You haven't even looked at those crystals.",
  t2_back_tap: "Twinsen! The garden tap first. It's right here.",
  t2_back_barrels: "Twinsen! The barrels. Arthur's got a bet on you.",
  t2_back_pipe: 'Twinsen! The pipe first. Then the well.',
  t2_back_again: "Where are you off to? I'm not finished with you.",
  // TUTOR-TARGETS (P67): the gold marker's name at the screen's edge, where the thing is (the panel, after a while),
  // Zoé's own reminder of what she means (over her head, after a longer while)
  t2_n_ball: 'Cupboard', t2_n_out: 'Front door', t2_n_zoe: 'Zoé', t2_n_tap: 'Garden tap', t2_n_barrels: 'Barrels', t2_n_pipe: 'Copper pipe',
  t2_where_ball: 'The tall wooden cupboard in the kitchen, under the gold marker',
  t2_where_out: 'The front door, under the gold marker',
  t2_where_zoe: 'Zoé is in the yard, by the garden tap',
  t2_where_inv: 'Open your inventory: the crystals are already picked out',
  t2_where_tap: 'A brass tap on a stone foot, a bucket under it, a few steps from the door',
  t2_where_barrels: "The near barrel at the house's corner. The pipe goes into the wall behind it",
  t2_where_pipe: 'The long copper pipe beside the lane, just past the yard',
  t2_hint_inv: 'The crystals, Twinsen. Open your things and look.',
  t2_hint_tap: 'The brass tap, right here by me. The one with the bucket.',
  t2_hint_barrels: 'The barrel by the wall, Twinsen. A good knock with the ball.',
  t2_hint_pipe: 'The copper pipe along the lane. Take a run and jump.',

  // OPENING-TUT: Settings, Game: the tips on or off (index.html; main.js syncSettingsUI)
  tips_set: 'Show control tips', tips_on: 'On', tips_off: 'Off',
  set_h_tips_on: 'Short tips the first time a control is useful. The story is the same either way.',
  set_h_tips_off: 'No control tips. Pause, Controls lists every key.',
});
