// OREN-GUARDIAN: chapter 10 "Borrowed Time" (expanded campaign), OG-1 "A Steady Hand" (EXPANSION_PLAN.md R1.11).
// English only. Essential clues (keep their meaning through any text cleanup): og_mira_room2 (open a wheel while it
// kicks, never between kicks), og_oren_3 (Ballastra; the station's drill rings an old stone there), og_oren_6 (green
// holds; above green the old joints split).
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  n_oren: 'Oren',
  p_governor: 'Inspect',

  // the call, in the council chamber (Mira on Zoé's lighthouse relay, chapter 8's link to the chamber)
  og_mira_call1: "Twinsen? It's Mira, on Zoé's lighthouse relay. The mains under town are hammering.",
  og_mira_call2: 'Every kick goes straight to the shelters. Gilbert says the old joints are weeping.',
  og_tw_call: "I'm on the next ship. Keep everyone off the pipes.",
  og_mira_call3: "Come to the Water Office. I'll take you down.",

  // the Water Office, then the valve room
  og_mira_office1: 'There you are. Listen to the floor.',
  og_tw_office: "That's the mains?",
  og_mira_office2: 'Every three seconds since the vote. Come down.',
  og_mira_room1: 'The station grabs the pressure and lets it go. The shelters get a slug of water, then nothing.',
  og_mira_room2: 'Open a wheel while it kicks, and the kick goes down the drain. Between kicks it does nothing.',
  og_tw_early: "Nothing's moving yet. Wait for the kick.",
  og_mira_bleed1: "That's it. That's also water the shelters won't get.",
  og_mira_bleed2: "Once more. After that we're only draining their supply.",
  og_nudge: 'Turn a wheel just as the needles jump.',

  // the governor rings: Oren
  og_mira_s1: "That's not me. I haven't touched a thing.",
  og_oren_1: 'It was too loud to hold. It is quiet now.',
  og_tw_o1: "Who's that?",
  og_oren_2: 'Oren. I keep water still where I can reach it.',
  og_tw_o2: 'Where are you?',
  og_oren_3: 'On Ballastra. Your station\'s drill rings an old stone there, and I hear it.',
  og_oren_4: 'Sixty-one people in your two shelters. Nine are lying down.',
  og_mira_s2: 'How does it know that?',
  og_oren_5: 'Weight on the floors. The pipes run under them.',
  og_mira_wheel: 'Gilbert wants his washroom back. A little more on four.',
  og_oren_6: 'Green holds. Above green, the old joints split.',
  og_mira_s3: "He's right. I hate that he's right.",
  og_tw_o3: 'Thank you, Oren. Really.',
  og_oren_7: 'Keep the wheels shut. Water should be still.',
  og_mira_s4: "Go and tell Gilbert at the fortress shelter. He'll want to hear it from you.",
  og_gov_look: "A glazed governor on the inlet, BALANCE WORKS · BALLASTRA on its plate. It's warm, and humming very quietly.",
  og_mira_after: "It hums when nobody's running water. Like it's listening.",

  // the fortress shelter's door
  og_gil_1: 'The pipes stopped shouting. Was that you?',
  og_tw_g1: 'Partly. Someone called Oren did the rest.',
  og_gil_2: 'Then thank Oren for us. First quiet in two days.',
  og_tim_1: 'The little ones slept right through. Even Lulu.',
  og_lulu_1: "I wasn't asleep. I was resting my eyes.",
  og_gil_3: 'Oren, if you can hear this: thank you.',
  og_bal_1: "Twinsen! Baldino. The council's done its bit. Now I need you at the workshop.",
  og_tw_b1: "I'll take the ship over.",
  og_gil_wait: "Mira's down in the valve room with it. Whatever it is.",
  og_gil_after: "Quiet pipes. I'd forgotten what that sounds like.",
  og_tim_wait: "It goes bang, bang, bang. Lulu counts them.",
  og_lulu_wait: 'Forty-one bangs. Forty-two.',
  og_tim_after: 'Can we see the valve room? Mira never lets anyone see the valve room.',
  og_lulu_after: "I'm resting my eyes again. Don't tell Tim.",

  // home (optional)
  og_zoe_1: "Mira called here too. Go. I'll keep the register.",
  og_zoe_2: "Sixty-one in the shelters. That's my count too. How does a voice in a pipe know that?",
  og_ar_1: 'The floor goes bang every three seconds. I timed it.',
  og_ar_2: "A pipe that counts people. I'm writing that down.",

  // objectives and journal
  og_obj_ship: 'Take the ship home to Citadel.',
  og_obj_office: 'Find Mira at the Water Office.',
  og_obj_hammer: 'Ease the hammer in the valve room.',
  og_sub_bleed: 'Bleed a kick ({n}/3)',
  og_obj_gilbert: 'Tell Gilbert at the fortress shelter.',
  og_obj_back: 'Take the ship back to Zeelich, to Baldino.',
  og_mk_office: 'Water Office', og_mk_shelter: 'Fortress shelter', og_mk_port: 'Spaceport',
  og_j_call: "Mira called on the lighthouse relay: the mains under Citadel were hammering the shelters' pipes.",
  og_j_steady: 'In the valve room I bled the kicks down the drain. Then a Balance Works governor rang, and a voice called Oren held the mains still.',
  og_j_thanks: 'Gilbert thanked Oren from the fortress shelter. Baldino wants me back at his workshop.',
});
