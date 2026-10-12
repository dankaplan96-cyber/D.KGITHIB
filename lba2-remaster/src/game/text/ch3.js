// Chapter 3 — "The Shell" — and the epilogue. English only (the game ships in English; other languages
// can add their own Object.assign(STR.<lang>, …) block with the same keys).
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  n_balradio: 'Baldino (radio)', n_zoeradio: 'Zoé (radio)', n_miraradio: 'Mira (radio)', n_okuradio: 'Oku (radio)',
  p_up: 'Go Up', p_down: 'Descend',

  // the shaft
  c3_arrive: 'The lift stops at the bottom of the shaft. Overhead, the bore grinds on.',
  c3_tw_arrive: "Vesk's lift. Empty. He's gone on ahead.",
  c3_bal_radio1: "Twinsen? Can you hear me? The bore's machinery must be close. If Vesk speeds up the drill, the cooling is the first thing he'll touch.",

  // the deep installation
  c3_deep_in: "The drill's engine room. And a maintenance drone on patrol.",
  c3_diagram: 'A cooling diagram. Valves A and C feed the heat exchanger. B runs to a drain, crossed out in red.',
  c3_diagram_tw: '(The shutter is jammed by the heat. Cool the exchanger and it should open.)',
  c3_diagram_high: '(Valve C is up on the catwalk. There has to be a way up.)',
  c3_toast_valve_open: 'Valve {v} open',
  c3_toast_valve_closed: 'Valve {v} closed',
  c3_valve_drain: 'That one dumps the coolant down the drain. Better close it.',
  c3_ladder: 'That dropped the catwalk ladder.',
  c3_cooled: "The exchanger hisses. The shutter's lock lets go.",
  c3_toast_door: 'The shutter opens',

  // the crystal galleries
  c3_gallery_in: 'The crystals from the well. These are as big as houses.',
  c3_gallery_hint: '(Those pillars hum like the crystals in the well. Wake them, and maybe the stones rise, like on the cliffs.)',
  c3_toast_pillar: 'Crystal pillar lit ({n}/3)',
  c3_stones_all: "That's a path. Athletic mode, and don't look down.",

  // Sendell
  c3_sendell_1: 'Twinsen.',
  c3_tw_sendell1: 'Sendell. Who is "her"? What is under the shell?',
  c3_sendell_2: 'A child of this world. She is not ready to wake, and the drill has cracked her shell.',
  c3_tw_sendell2: 'Then we stop the drill.',
  c3_sendell_3: 'Stopping it will not close the cracks. I have held them alone for weeks. I cannot hold them much longer.',
  c3_tw_sendell3: 'Baldino says the bore can be turned around. Into a shield.',
  c3_sendell_4: 'Then turn it. I will hold on as long as I can.',
  c3_sendell_crystals: 'You carry six of her splinters. They sang to you, so she knows you. Go.',
  c3_bal_radio2: "Twinsen! The conversion plans. Three pylons around the core. Hit each one and it switches, but each needs power from up here.",
  c3_bal_radio3: "Zoé's at the lighthouse for the signal. Mira's opening the valves. Oku and Nara are releasing the mills. You take the pylons.",

  // the core
  c3_core_vesk1: "You came all this way. Look at these readings, Twinsen. The shell is failing. I'm finishing the bore so the heat comes out where we can control it.",
  c3_core_tw1: "Sendell says that wakes her too early. Baldino's network turns the bore into a shield. Help us.",
  c3_core_vesk2: 'Baldino\'s network is a sketch. I have a schedule, and thirty percent of two worlds to save.',
  c3_core_vesk3: 'Guardian. Keep him away from the pylons.',
  c3_toast_fight: 'Convert the three pylons: stand on a glowing plate and bounce the ball off the brass panels.',
  c3_pylon_1: 'Signal is out. Sun, wave, star. Just like last time!',
  c3_pylon_2: 'All three valves open. If anyone asks, the water office did this.',
  c3_pylon_3: 'The mills are free. Listen to that wind!',
  c3_toast_pylon: 'Pylon converted ({n}/3)',
  c3_exit_block: 'Not now. The pylons first.',
  c3_vesk_turn1: "The pressure is dropping... the cracks are closing. She's settling.",
  c3_tw_turn: 'It works. But the bore still has to switch to shield mode, and only your console can do that.',
  c3_vesk_turn2: "I was wrong about the plan. Not about the danger. I'll switch it, and I'll stay to run it.",
  c3_vesk_turn3: 'Shield mode. Now.',
  c3_sendell_end: 'Thank you, Twinsen. She is asleep again.',

  c3_obj_shaft: "Find the bore's machinery",
  c3_obj_cool: 'Cool the exchanger to open the shutter',
  c3_sub_diagram: 'Read the cooling diagram',
  c3_sub_up: 'Reach the catwalk',
  c3_obj_gallery: 'Cross the crystal galleries',
  c3_obj_deeper: 'Go deeper',
  c3_obj_core: 'Reach the core',
  c3_obj_pylons: 'Convert the three pylons ({n}/3)',
  c3_j_shaft: 'I followed Vesk down the shaft.',
  c3_j_cool: "I cooled the drill's exchanger and opened the shutter.",
  c3_j_gallery: "The galleries are full of the well's crystals, grown huge.",
  c3_j_sendell: "Sendell: under the shell sleeps a child of this world, waking too early. Stopping the drill won't close the cracks.",
  c3_j_pylons: 'With Zoé, Mira, Oku and Baldino, I converted the three pylons.',
  c3_j_vesk: 'Vesk switched the bore to shield mode and stayed to run it.',

  // epilogue
  ep_narr: 'Four days later. Citadel Island.',
  ep_zoe_1: "You said you'd be back for dinner.",
  ep_tw_1: "I am back for dinner. Just not that one.",
  ep_ar_1: 'Dad! Did you really see Sendell? Did the drill really turn into a shield? Can I go down there?',
  ep_tw_2: 'Yes, yes, and no.',
  ep_zoe_2: 'Everyone came back from the hills. Gilbert says the well water is finally cold. He wants his refund.',
  ep_zoe_3: 'Sit. Eat. Then tell us everything. Slowly.',
  ep_end_title: 'The End',
  ep_end_text: 'The bore still turns under the island, now as a shield run by both worlds. Vesk answers to the joint council. The well runs cool.<br><br>Thanks for playing LBA3: The Awakening.',
  ep_obj_home: 'Go home. Dinner is waiting',
  ep_obj_free: 'Explore Citadel Island',
  ep_gilbert: "My refund came. Two months' worth. I almost miss having something to complain about.",
  ep_mira: 'My report says the water office saved the island. Nobody has argued yet.',
  ep_doran: "The ferry's back. I'm back. Everyone's back. I'm going to sleep for a week.",
  ep_pippa: 'Clover leaves are half price. Funny, nobody wants them now.',
  ep_tim: "Mum found out about the stone. I'm grounded until I'm thirty.",
  ep_lulu: 'I told nobody. Well. Almost nobody.',
  ep_xil: 'The project hired me to carry the new shield parts. Business is good.',
  ep_arthur: 'Dad, can I fix the next radio too?',
  ep_zoe_idle: 'Arthur wants to be an engineer now. Thank you, Vesk.',
  ep_j_home: 'Home for dinner. A few days late.',
});
