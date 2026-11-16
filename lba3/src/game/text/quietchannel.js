// U-5 "The Quiet Channel" (the user's own side quest, docs/lba-maturity/DEPTH-PLAN.md; story/quietchannel.js). English only.
// No night, evening, tonight, sunset, dawn, dusk or morning words: two suns, no time of day. Matto talks through a pipe
// (a radio-filtered voice: n_qc_piperadio / n_qc_mattoradio), Tolli is the shield crew's Tolli (text/deeplife.js).
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  qc_title: 'The Quiet Channel',
  n_qc_piperadio: 'Voice in the pipe',
  n_qc_mattoradio: 'Matto (in the pipe)',
  n_qc_matto: 'Matto',
  n_dp_tolliradio: 'Tolli (in the pipe)',
  p_qc_big: 'Snap the big valve',
  p_qc_mid: 'Snap the middle valve',
  p_qc_small: 'Snap the small valve',
  p_qc_riser: 'Open the riser',

  // ---- the riser at the bottom of the shaft
  qc_listen_1: "(That's not the ground. Someone is knocking on this pipe by hand: one heavy, two light, then a rest.)",
  qc_listen_2: '(Snap a valve shut and the water hammers the pipe. Big valve, big knock.)',
  qc_listen_0: '(One heavy, two light, a rest. Over and over. Somebody wants an answer.)',
  qc_listen_b: '(Light, middle, heavy, a rest. And I answer it backwards, he said.)',
  qc_listen_c: '(He is waiting for the riser cock. The tag on it says why it is shut.)',
  qc_listen_open: '(The pipe hums all the way up the shaft now. Somebody up there is knocking back.)',
  qc_listen_home: '(Quiet. Nobody has to knock through a pipe any more.)',
  qc_tag: 'RISER, TO STATION. Its cock wears Vesk\'s tag, SHAFT CLOSED, and the knocking stops right here.',

  // ---- the first exchange: he takes Twinsen for his brother
  qc_p1_ok_1: 'Tol! At last! A week I\'ve been knocking at a cold pipe.',
  qc_tw_p1: '(He thinks I\'m somebody called Tol.)',
  qc_p1_ok_2: 'We pinched that beat off the ground, remember: three and a rest. Ours just have weight.',
  qc_p1_ok_3: 'Right, our end-of-shift knock. I knock it, you knock it back to me backwards. Same as always.',
  qc_p1_no_1: "Tol? That's not our knock: one heavy, two light. Have you forgotten in a week?",
  qc_p1_no_2: 'Easy, easy. The big one once, then the little one twice. Then you rest.',

  // ---- the second: backwards; he works out who it is
  qc_p2_no_1: 'Backwards, Tol. Last knock first.',
  qc_p2_no_2: 'Heavy, middle, light. ...Tol never needs telling twice. Who is this?',
  qc_p2_ok_1: "That's it. ...But you knock heavy, and slow. You're not Tol, are you?",
  qc_p2_ok_1b: "That's it! So you're not Tol. Tol would never need telling.",
  qc_tw_p2: "No. I'm Twinsen. I came down the shaft.",
  qc_p2_ok_2: "Twinsen? The Twinsen? I'm Matto, and I mind Pump Two, out on cooling line two.",
  qc_p2_ok_3: 'When Vesk closed the shaft, he shut my tunnel with it, and the phone went dead. This old pipe still carries.',
  qc_p2_ok_4: 'My brother Tolli is up at the station. We knock to each other every shift. Since the shaft closed, nobody knocks back.',
  qc_p2_ok_5: "There's a riser cock beside you, tagged shut. Open it, and my knocking goes all the way up to the control room.",

  // ---- the riser opened
  qc_tw_cock: "(Vesk's tag: SHAFT CLOSED. V. Not any more.)",
  qc_cock_1: "Hear that? It's breathing all the way up. Thank you, Twinsen.",
  qc_cock_2: "If you go up to the station, tell Tol his tea's gone cold.",

  // ---- the control room's speaking horn: what the channel carries, by the story's events
  qc_horn_hot: 'Pump Two to the station. Line two is running hot as soup, and the bore has never been this loud.',
  qc_horn_cool: 'Pump Two. The line just went cool under my hand. Tol, I bet that was the knocker.',
  qc_horn_stones: "Pump Two. The rock out here hums now, like a wet finger round a glass. I don't mind, it's company.",
  qc_horn_home_1: 'Station, this is Pump Two. ...No. This is Matto, downstairs.',
  qc_horn_home_2: 'Stop knocking for fun and come and check the loop.',
  qc_horn_home_3: "We're in the same room, Tol. I can just talk to you.",

  // ---- Tolli at the horn (chapter 11)
  qc_tol_1: "Twinsen, the horn woke up: heavy, light, light. That's Matto knocking. That's my brother!",
  qc_tw_tol: "He's at Pump Two. He says your tea's gone cold.",
  qc_tol_2: "A week I've sat by this horn with the riser shut. Thank you. Now go on, I've got a pipe to answer.",
  qc_tol_hot: "Matto says the line's hot. Whatever Vesk is doing down there, it's cooking his pumps.",
  qc_tol_cool: "The line's cool, Matto says. He's knocking like a happy woodpecker.",
  qc_tol_stones: 'Matto says the rock out there hums now. He talks to it. He talks to everything.',

  // ---- after the ending: the same room
  qc_m_home_1: 'Twinsen! A door, a tunnel, and my brother at the end of it. Nobody tells you how good a door is.',
  qc_t_home_1: 'He knocked on the wall when he came in. Out of habit. The wall.',
  qc_m_home_2: 'Three and a rest, Tol. Some habits are worth keeping.',
  qc_m_home_3: "We still knock at the end of a shift. Same room now, so it's mostly for fun.",
  qc_m_home_4: 'Pump Two runs on its own now. I check it by walking there. Walking!',
  qc_t_home_2: "Matto's on shift with me now. Same room, same kettle. He still knocks before he talks.",

  // ---- journal
  qc_j_heard: 'At the bottom of the shaft someone knocks on a service pipe by hand: one heavy, two light, a rest.',
  qc_j_tol: 'The voice in the pipe took me for his brother, Tol. Their end-of-shift knock: his, answered backwards.',
  qc_j_matto: 'It is Matto, cut off at Pump Two when the shaft closed. His brother Tolli is up at the station. The riser cock is tagged shut.',
  qc_j_open: "I opened the riser. Matto's knocking carries up to the station's control room now.",
  qc_j_home: 'Matto and Tolli are on shift together now, in the same room.',
});
