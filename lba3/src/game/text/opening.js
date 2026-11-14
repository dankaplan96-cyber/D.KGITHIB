// The opening scene (src/game/story/opening.js) and the first objective. English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // where and when (a caption over the island)
  op_cap_place: 'Citadel Island, Twinsun',
  op_cap_time: "Twelve years after Twinsen's last adventure",
  // the harbour: the Joint Project's lift
  n_resident: 'Resident',
  op_res_1: 'When does the harbour row get the heat?',
  op_wk_1: 'Next quarter. Every home gets it. Vesk promised.',
  op_res_2: "What's that hum?",
  op_wk_2: "Just the drill. It's a long way down.",
  // home
  op_ar_1: 'Dad! The mast fits!',
  op_tw_0: 'Told you. Now the sail.',
  op_zoe_1: "Twinsen. The tap's stopped again.",
  op_tw_1: 'I fixed that yesterday.',
  op_zoe_2: 'It worked yesterday.',
  op_ar_2: "The drill again. Lulu says they're digging to the middle of the world.",
  op_zoe_3: "That's warm. It's never warm.",
  op_tw_2: "I'll check the well.",
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
  tut_magic: 'Out of magic: {k} Search the barrels',
  tut_discreet: '{k} Switch to Discreet: sneak up quietly',
  tut_normal: '{k} Back to Normal',
  tut_aggressive: '{k} Switch to Aggressive: kick and punch',
  tut_kick: '{k} Kick the lid',
  tut_dlg_next: ' Next',
  tut_dlg_all: ' Show all',

  // OPENING-TUT: Settings, Game: the tips on or off (index.html; main.js syncSettingsUI)
  tips_set: 'Show control tips', tips_on: 'On', tips_off: 'Off',
  set_h_tips_on: 'Short tips the first time a control is useful. The story is the same either way.',
  set_h_tips_off: 'No control tips. Pause, Controls lists every key.',
});
