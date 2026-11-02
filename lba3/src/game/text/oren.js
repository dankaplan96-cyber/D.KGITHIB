// OREN-GUARDIAN: chapter 10 "Borrowed Time" (expanded campaign), OG-1 "A Steady Hand", and chapter 11 "Under the
// Well", OG-2 "The Fenced Square" (EXPANSION_PLAN.md R1.11). English only.
// Essential clues (keep their meaning through any text cleanup):
//   OG-1: og_mira_room2 (open a wheel while it kicks, never between kicks), og_oren_3 (Ballastra; the station's drill
//     rings an old stone there), og_oren_6 (green holds; above green the old joints split).
//   OG-2: og2_oren_4 (one cask a family while the drill pulls; the three on the plate must agree), og2_bram_2 and
//     og2_bram_3 (the draw-off's lever), og2_toast_hold and og2_tw_shut (hold on through a thump), og2_oren_shut (let go
//     and he shuts it), og2_ume_2 and og2_tw_u1 (cold water from Mira's tap), og2_pico_2 (the ball on the bell latch),
//     og2_oren_bell (a shock shakes his hold; the lock has no lever, so the bolt stays shut).
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
  og_mk_office: 'Water Office', og_mk_shelter: 'Fortress shelter', og_mk_port: 'Spaceport',
  og_j_call: "Mira called on the lighthouse relay: the mains under Citadel were hammering the shelters' pipes.",
  og_j_steady: 'In the valve room I bled the kicks down the drain. Then a Balance Works governor rang, and a voice called Oren held the mains still.',
  og_j_thanks: 'Gilbert thanked Oren from the fortress shelter, and the children slept through the quiet.',

  // ================================================================ OG-2 "The Fenced Square" (chapter 11)
  // the fortress shelter's door: Gilbert's well
  og2_gil_1: 'Now the pipes are quiet, I want my well back.',
  og2_gil_2: "The council ordered the fence off. Vesk's office says the lock is project property, and so is the key.",
  og2_tw_g1: "Then I'll go and look at the lock.",
  og2_gil_3: "Bram's been queuing at that gate since breakfast. Mostly out of spite.",
  og2_gil_wait: "My well, Twinsen. The square. You can't miss the fence; I've been glaring at it for days.",

  // the queue, before Oren has spoken to him
  og2_bram_0: "Gate's shut. There's a box on it that talks. Go on, say hello.",
  og2_ume_0: "We're queuing for a gate, dear. I've queued for worse. Mostly at the doctor's.",
  og2_pico_0: "The box counted us! It said three, and one of us is small. That's me.",

  // Oren, through the gate's lock (R1.4: Ballastra ware on the project's line; he holds the bolt)
  og2_oren_1: 'Twinsen. I know your step from the valve room.',
  og2_tw_o1: "Oren? You're in the gate as well?",
  og2_oren_2: 'In its lock. The project fitted it from Ballastra stock and cabled it to the station.',
  og2_tw_o2: 'Can you open it?',
  og2_oren_3: 'Yes. This well and your shelters drink the same water, and the drill is pulling it down.',
  og2_oren_4: 'One cask a family, while the drill pulls. Three are waiting on this plate. When the three agree, I open.',
  og2_tw_o3: "And if they don't?",
  og2_oren_5: 'Then it stays shut, and the shelters keep their water.',
  og2_lock_look: 'A glazed lock box, BALANCE WORKS · BALLASTRA. Bronze bands, three small lamps, and no hand lever anywhere on it.',
  og2_lamps0: 'None of the lamps is lit.',
  og2_lamps1: 'One lamp is lit.',
  og2_lamps2: 'Two lamps are lit.',
  og2_lock_open: 'The lamps have gone celadon. The lock hums whenever someone draws a cask.',
  og2_oren_n1: 'One.',
  og2_oren_n2: 'Two.',
  og2_oren_n3: 'Three.',

  // Bram and the draw-off's lever (rule 4: a held lever beats the tone)
  og2_bram_1: "One cask, and a box says when. Next it'll be saying when for everything.",
  og2_bram_1p: "One cask, and a box says when. Next it'll want my pump, and we fixed that one together.",
  og2_bram_2: "That draw-off has a lever, and the box holds it shut. What happens the day it won't let go?",
  og2_tw_b2: "Let's find out.",
  og2_bram_3: 'The lever on the draw-off. Go on, give it a pull.',
  og2_stand_look: "The project's draw-off: a glazed valve on a riser, a spout over a cask, an iron lever. It's shut, and humming.",
  og2_toast_hold: 'Hold the lever through a thump. Move to let go.',
  og2_nudge_lever: "Pull the draw-off's lever and keep hold of it until the drill thumps.",
  og2_bram_shut: 'There. Shut the moment you let go.',
  og2_tw_shut: "It only pushes on the thump. I'll hold on through one.",
  og2_bram_d1: "It's shoving you. Every thump.",
  og2_tw_d1: "It pushes when the drill strikes. It can't take the lever out of my hands.",
  og2_bram_d2: 'Let me feel that.',
  og2_bram_d3: "Ha! Pushes like a mule. Doesn't win, though.",
  og2_bram_d4: 'And if I let go?',
  og2_oren_shut: 'Then I close it. Water should be still.',
  og2_bram_d5: "So it only wins when nobody's holding on. Fine. Somebody will be.",
  og2_bram_yes: 'One cask a family, while the drill pulls. Agreed. And I know where the lever is.',
  og2_bram_wait: "I've said my piece to the box. Now it's the others' turn.",

  // Granny Ume's tonic, and Mira's tap
  og2_ume_1: 'One cask, for me and my tonic? The tonic wants cold, clean water every morning.',
  og2_ume_2: "The well's run warm since the project's pipe went in. Warm water turns the tonic to soup.",
  og2_tw_u1: "Mira's tap runs cold. I'll bring you a bottle.",
  og2_ume_3: "A bottle, dear. Not a bucket. I'm old, not thirsty.",
  og2_ume_where: "Mira's tap, at the Water Office. A bottle will do.",
  og2_tw_u3: "Cold, from Mira's tap.",
  og2_ume_4: 'Bless you. Now I can agree to anything, within reason.',
  og2_ume_yes: "One cask a family. Agreed. I'm a family of one, so I'll be generous.",
  og2_ume_wait: "I've agreed. Don't tell the box I'd have agreed for a biscuit.",
  og2_tw_m1: 'Granny Ume needs a bottle of cold water for her tonic.',
  og2_mira_1: 'From the mains, then. Hold it under the drop.',
  og2_mira_2: 'Hear that? A bucket a minute, before your Oren took the mains. A bottle a minute now.',
  og2_tw_m2: "He's rationing the mains as well.",
  og2_mira_3: 'He calls it holding them at green. My kettle has another word for it.',
  og2_toast_tonic: 'Bottle of cold water',
  og2_mira_0: 'The mains are steady. Steady as a ruler. I check them every hour anyway.',
  og2_mira_after: "The square's open? My gauges noticed before anyone told me.",
  it_tonic: 'Bottle of cold water', itd_tonic: "Cold water from the mains at the Water Office, for Granny Ume's tonic.",

  // Pico and the bell latch (rule 4: a shock shakes his hold; a part with no lever stays as it is)
  og2_pico_1: 'Mum says yes to one cask if the gate says please.',
  og2_pico_2: "Gates can't say please. But you can ring the bell on the latch with your ball. Do that, and it's a yes.",
  og2_tw_p1: "That's not how agreeing works.",
  og2_pico_3: 'It is today.',
  og2_pico_where: "The bell on the latch! With the ball! Mum's waiting!",
  og2_nudge_bell: "Throw the ball at the bell on the gate's latch.",
  og2_oren_bell: 'That shakes my hold for a moment. The bolt stays where it is. It has no lever.',
  og2_pico_bell: 'It jumped! The whole gate jumped!',
  og2_pico_saw: 'I saw it! The bell went bong and the box went all blinky!',
  og2_pico_yes1: 'Okay, that was good. Mum says one cask is fine if I stop washing the dog in it.',
  og2_pico_yes2: "One cask a family! Agreed! That's from my mum!",
  og2_pico_wait: 'Mum agreed. Through me. That counts.',

  // the gate opens; the turn
  og2_oren_open1: 'Three. I will open.',
  og2_tw_turn1: 'Three people in a queue just agreed for the whole town.',
  og2_oren_open2: 'Three were here. The rest will find it open.',
  og2_bram_turn: "He's right about the water. He's wrong about who gets asked.",
  og2_tw_turn2: "Nobody asked the rest whether they want a ration. Gilbert should hear this. It's his well.",
  og2_bram_after: 'Open gate, one cask, and a lever I know how to hold. I can live with that, for now.',
  og2_stand_after: "The draw-off's lever. Bram knows how to hold it now.",
  og2_well_look: "Gilbert's well, with nothing fencing it now. The water down there is warm, and low.",

  // Gilbert's answer, and Baldino's call
  og2_gil_o1: 'Open? My well? Who opened it?',
  og2_tw_go1: 'Oren did, once the three in the queue agreed to one cask a family.',
  og2_gil_o2: "Three people agreed for the whole town? Nobody asked me, and it's my well.",
  og2_tw_go2: 'Nobody asked anyone else either.',
  og2_gil_o3: "Then I'll ask them. A board on the gate: anyone who says no says it to me, not to a box.",
  og2_bal_1: "Twinsen! Baldino. The council's done its bit. Now I need you at the workshop.",
  og2_tw_b1: "I'll take the ship over.",
  og2_gil_after: 'The board is up. Four people have said no already, and one of them was me.',
  og2_tim_1: "Gilbert says the well's his. Mira says the water's everyone's. They've been at it for an hour.",
  og2_lulu_1: "I'm resting my eyes until they stop.",
  og2_tim_2: 'Gilbert made a sign. I did the spelling. He did the shouting.',
  og2_lulu_2: "I'm resting my eyes again. Wake me when it's my turn at the well.",

  // home (optional)
  og2_zoe_1: "Bram's been at that gate all morning. I put him on my register as 'queuing, cross'.",
  og2_zoe_2: "One cask a family, settled at a gate by three neighbours and a box. That's not a rule. It's a suggestion with a lock on it.",
  og2_ar_1: 'Pico says the gate talks. Pico also says he can see through walls.',
  og2_ar_2: "Pico rang the gate's bell with your ball. He's told everyone. Twice.",

  // objectives, markers, journal
  og2_obj_gate: "Open the gate to Gilbert's well, in the square.",
  og2_obj_agree: "Get the queue's agreement at the gate ({n}/3)",
  og2_sub_bram_0: 'Hear Bram out', og2_sub_bram: "Show Bram the draw-off's lever", og2_sub_bram_ok: 'Bram agreed',
  og2_sub_ume_0: 'Hear Granny Ume out', og2_sub_ume: "Bring Granny Ume cold water from Mira's tap", og2_sub_ume2: 'Take the bottle to Granny Ume', og2_sub_ume_ok: 'Granny Ume agreed',
  og2_sub_pico_0: 'Hear Pico out', og2_sub_pico: "Ring the gate's bell latch with the ball, for Pico", og2_sub_pico_ok: 'Pico agreed, for his mum',
  og2_obj_gilbert: 'Tell Gilbert at the fortress shelter.',
  og2_obj_ship: 'Take the ship back to Zeelich, to Baldino.',
  og2_mk_gate: 'Gate',
  og2_j_ask: "Gilbert wants his well back. The council ordered the square's fence off, but Vesk's office keeps the key.",
  og2_j_cond: "Oren holds the gate's lock. He'll open it if the three in the queue agree to one cask a family while the drill pulls.",
  og2_j_lever: "The draw-off's lever showed Bram the rule: Oren pushes on the drill's thump, but a held lever beats him. Let go, and he shuts it.",
  og2_j_mira: "Mira's tap runs a bottle a minute since Oren took the mains. He calls it holding them at green.",
  og2_j_bell: "The ball on the gate's bell shook Oren's hold for a moment. The bolt stayed shut: the lock has no lever.",
  og2_j_open: 'Three people agreed and the gate opened. Nobody asked the rest of the town.',
  og2_j_board: 'Gilbert put a board on the gate, so the town can say no to him and not to a box. Baldino wants me back at his workshop.',
});
