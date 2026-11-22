// Chapter 10 of the expanded campaign — "Borrowed Time" (key 'throttle', story/throttle.js). English only; the Hebrew
// is he/throttle.js. OG-1 "A Steady Hand" (og_: the valve room, Oren's first word) and EXP-1's own steps (th_: Zoé in
// the project office, the B-7 on the fortress shelter's branch, Vesk on the wire).
// Essential clues (keep their meaning through any text cleanup):
//   og_mira_room2 (open a wheel while it kicks, never between kicks), og_oren_3 (Ballastra; the kicks under the town ring
//   an old stone there), og_oren_6 (green holds; above green the old joints split), th_reg (the register names crate
//   212/3), th_crateB1 (the crate under the top one is turned to the wall), th_tw_spray (shut the feed before the flange),
//   th_sub_band / th_gil_joint / th_gil_trickle (the needle on green: weeping is too much, a trickle too little),
//   th_oren_hand (a hand on the lever beats him).
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  n_oren: 'Oren',
  p_governor: 'Inspect', p_hold: 'Hold',

  // ---- OG-1: the call (he is on Mill Lane, Zeelich; Mira on Zoé's lighthouse relay)
  og_mira_call1: "Twinsen? It's Mira, on Zoé's lighthouse relay. The mains under town are hammering.",
  og_mira_call2: 'Every kick goes straight to the shelters. Gilbert says the old joints are weeping.',
  og_tw_call: "I'm on the next ship. Keep everyone off the pipes.",
  og_mira_call3: "Come to the Water Office. I'll take you down.",

  // the Water Office, then the valve room
  og_mira_office1: 'There you are. Listen to the floor.',
  og_tw_office: "That's the mains?",
  og_mira_office2: 'Every three seconds since the stop. Come down.',
  og_mira_room1: 'Nothing evens the kicks out now. The shelters get a slug of water, then nothing.',
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
  og_oren_3: "On Ballastra, a long way from you. Something under your town strikes an old stone with every kick, and I hear it.",
  og_oren_4: 'Sixty-one people in your two shelters. Nine are lying down.',
  og_mira_s2: 'How does it know that?',
  og_oren_5: 'Weight on the floors. The pipes run under them.',
  og_mira_wheel: 'Gilbert wants his washroom back. A little more on four.',
  og_oren_6: 'Green holds. Above green, the old joints split.',
  og_mira_s3: "He's right. I hate that he's right.",
  og_tw_o3: "Thank you, Oren. Whatever you are.",
  og_oren_7: 'Keep the wheels shut. Water should be still.',
  og_mira_plate: 'The plate says Balance Works, Ballastra. The project fitted it. I never saw the order.',
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
  og_gil_wait: "Mira's down in the valve room with it. Whatever it is.",
  og_tim_wait: "It goes bang, bang, bang. Lulu counts them.",
  og_lulu_wait: 'Forty-one bangs. Forty-two.',

  // home (optional)
  og_zoe_1: "Mira called here too. Go. I'll keep the register.",
  og_zoe_2: "Sixty-one in the shelters. That's my count too. How does a voice in a pipe know that?",
  og_ar_1: 'The floor goes bang every three seconds. I timed it.',
  og_ar_2: "A pipe that counts people. I'm writing that down.",

  // ---- the washroom, and Zoé on the relay
  th_gil_wash: 'Mira says the washroom stays shut. Green holds, the pipe says. Sixty-one people, one bucket.',
  th_tw_wash: 'Balance Works. Zoé, are you on the relay?',
  th_zoe_r1: "I heard. Balance Works is in the project's delivery register. I saw it the day I took the plan.",
  th_tw_z1: 'Can you get back in there?',
  th_zoe_r2: "By the door, this time. The council opened the project's records to the evacuation committee. That's me.",

  // ---- Zoé in the project office
  th_guard_1: "Evacuation committee, is it? Last time Vesk's plan walked out of this room, I never saw who carried it.",
  th_zoe_g1: "Council's order. The project's records are open to the evacuation committee.",
  th_guard_2: "The records, fine. The crates are Vesk's.",
  th_zoe_g2: "We'll see.",
  th_reg: "(The delivery register.) Day 212: from Balance Works, Ballastra, one trial regulator, model B-7, in crate 212/3. Day 214: 'Returned to sender.' Signed V.",
  th_zoe_reg: "Crate 212/3. If it went back, the crate went with it.",
  th_crateA: 'Stencilled 212/1. Filter cloth, a whole crate of it.',
  th_crateC: 'Stencilled 212/2. Gauge glass. FRAGILE, three times, in three hands.',
  th_crateB1: 'Two crates. The top one says 198/4, monitor screens. The one under it is turned to the wall.',
  th_crateB2: '(Zoé hauls the bottom crate round.) Stencilled 212/3.',
  th_guard_3: 'That one came back from somewhere and never left. He said if anyone asked, it went back.',
  th_crate_open: '(Inside, in straw: a brass regulator with a red hand lever, and a tag tied to the lever.)',
  th_note: "(The tag, in Vesk's hand: 'B-7. It works. A station fitted with this can refuse the control room. Do not fit. Log as returned. V.')",
  th_zoe_note1: 'Returned. It never left the room.',
  th_zoe_note2: "Sixty-one people and one bucket. They can have it.",
  th_guard_after: "I didn't see you. I never see you.",
  th_zoe_more: 'Crate 212/3. Somewhere in here.',

  // ---- the hand-over at the shelter
  th_zoe_hand1: 'Your Balance Works, model B-7. Vesk wrote that it went back. It was by the door.',
  th_tw_hand: 'It has a hand lever.',
  th_zoe_hand2: "That's why he hid it. Read the tag.",

  // ---- the branch
  th_spray: '(Water bursts out of the open flange and knocks him back.)',
  th_tw_spray: 'Feed first. Then the flange.',
  th_fit: '(He seats the B-7 between the flanges and runs the bolts down.)',
  th_gil_joint: "That old joint's weeping again!",
  th_gil_less: 'Less. Still weeping.',
  th_gil_trickle: "That's a trickle. The kettle would win.",
  th_gil_right: 'Listen. Water, and no bang.',
  th_gil_shut: "It's shutting itself!",
  th_branch_look: "The shelter's branch: the washroom line, an old joint, a feed wheel near the ground.",
  th_gauge_look: 'A little gauge on the branch, green in the middle of its face.',

  // Oren tries the lever; a hand holds it
  th_oren_push: 'That part has a lever.',
  th_hold: '(He takes the lever and holds it open.)',
  th_oren_hand: 'A hand on the lever. I do not push against a hand.',
  th_gil_mine: "Then it's mine. I'll hold it.",
  th_oren_tired: 'Hold it, then. A hand gets tired. I do not.',

  // Vesk on the wire
  th_vesk_1: "Twinsen. The fortress branch just stopped answering my board. That's a B-7, isn't it. I sent those back.",
  th_tw_v1: 'You wrote that you did. It was in your office.',
  th_vesk_2: 'A station that can say no will say no, the first day the town is frightened. I keep the whole line, or nobody keeps any of it.',
  th_zoe_v1: 'Then nobody keeps it. These people can turn their own water on.',
  th_vesk_3: "You'll see what a frightened town does with sixty-one levers.",

  // the end of the chapter
  th_bal_end1: 'Twinsen! The relays are built. All five, and four of them work. Come and see the fifth.',
  th_tw_end: 'On my way.',
  th_zoe_end: 'Go. Gilbert has the lever, and I have Gilbert.',

  // after (the shelter, the office)
  th_gil_after: "My lever. Mira comes by to look at it like it's a new baby.",
  th_tim_after: "Gilbert won't let go of the lever. Not even to scratch.",
  th_lulu_after: "I'm holding it too. In my head.",
  th_zoe_after: 'Vesk wanted every lever in one hand. His.',

  // ---- objectives, markers, items, journal
  og_obj_ship: "Take the ship home to Citadel",
  og_obj_office: "Find Mira at the Water Office",
  og_obj_hammer: "Ease the hammer in the valve room",
  og_sub_bleed: 'Bleed a kick ({n}/3)',
  og_obj_gilbert: "Tell Gilbert at the fortress shelter",
  th_obj_zoe_reg: "Zoé: find Balance Works in the project's register",
  th_obj_zoe_crate: 'Zoé: find crate 212/3',
  th_obj_zoe_take: 'Zoé: take the regulator to the fortress shelter',
  th_obj_fit: "Fit the B-7 on the shelter's branch",
  th_sub_feed: "Shut the branch's feed",
  th_sub_fit: 'Fit the regulator between the flanges',
  th_sub_open: 'Open the feed again',
  th_sub_band: 'Turn its band until the needle sits on green',
  th_obj_hold: "Hold the B-7's lever",
  og_mk_office: 'Water Office', og_mk_shelter: 'Fortress shelter', th_mk_projoffice: 'Project office',
  it_b7: 'B-7 regulator', itd_b7: 'A Balance Works regulator with a red hand lever. Vesk wrote that it went back.',
  og_j_call: "Mira called on the lighthouse relay: the mains under Citadel were hammering the shelters' pipes.",
  og_j_steady: 'In the valve room I bled the kicks down the drain. Then a Balance Works governor rang, and a voice called Oren held the mains still.',
  og_j_thanks: 'Gilbert thanked Oren from the fortress shelter. The washroom stayed shut: green holds, Oren said.',
  th_j_zoe: 'Zoé found the B-7 in the project office. Vesk\'s tag says it works, and that a station fitted with it can refuse the control room. He logged it as returned.',
  th_j_fit: "I fitted the B-7 on the fortress shelter's branch and set its band on green. The washroom has water.",
  th_j_hold: 'Oren tried to shut the B-7. A hand on its lever stops him, so Gilbert holds it now.',
  th_j_vesk: 'Vesk on the wire: a station that can say no will say no. Zoé told him the people in the shelter can turn their own water on.',
});
