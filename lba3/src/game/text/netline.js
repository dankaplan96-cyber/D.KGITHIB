// CAMPAIGN-8 (wave 6): chapter 10's friends at their stations, and the knocking that turns from three to four
// (story/netline.js). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  p_unclip: 'Unclip the isolator', p_joint: 'Clip the isolator on the joint',
  n_zl_irsaradio: 'Irsa (radio)',

  // ---- the workshop: Baldino wants his isolator back
  nw_bal_iso: "One more thing. The code line at the station is old project cable, and its joint is cracked. Nothing holds a cracked joint but my isolator, so I want it back off Kell's feed box. Irsa says she'll hold the lane by hand. Fetch it on your way to the port.",

  // ---- Mill Lane: Irsa takes the bypass
  nw_irsa_1: "Baldino wants his clip back? Then I hold the lane. I've run the mills' line onto Kell's feed switch: the bypass the chief kept promising. It jumps when the ground knocks, so a hand stays on it.",
  nw_irsa_wait: "Take the clip off when you're ready. I'm ready.",
  nw_unclip: '(The isolator comes off the feed box. The motor coughs...)',
  nw_irsa_2: "...and holds. Got her. Go on, take your clip.",
  nw_kell_irsa: "Is that you holding my lift up, Irsa?",
  nw_irsa_3: "It's me. Don't lean on anything.",
  nw_irsa_after: "Still holding. Tell Baldino I want a proper switch when this is over.",

  // ---- Citadel: Arthur on the radio, at home
  nw_ar_1: "Dad? It's Arthur. I'm home, by the radio, like Mum said. The kitchen pipe is knocking again.",
  nw_ar_2: "Three, and a rest. Three, and a rest... and now there's four. Four, and a rest. A little one at the end. I counted it ten times.",
  nw_tw_ar: "Four? It was always three. In the kitchen, at the dig, in the pump room.",
  nw_bal_ar: "Then I time the code to the rest after four. If the boy counted right.",
  nw_tw_ar2: "Mira's gauges sit on the old mains. They'll know.",
  nw_ar_home: "Shh. I'm counting. ...Four, and a rest. Still four. Mum gave me the pipe and I'm keeping it.",

  // ---- the valve room: Mira reads her gauge before anyone acts on it
  nw_mira_1: "Arthur's count went to Baldino, and Baldino's came to me. Nobody touches a wheel on a boy's count. Watch the fortress needle with me.",
  nw_mira_1b: "Baldino says the knocking has changed. Nobody touches a wheel until we've counted it. Watch the fortress needle with me.",
  nw_gauge: 'The FORTRESS needle kicks: one, two, three... and a beat late, a small fourth. Then it rests.',
  nw_mira_2: "Four. The boy's right. Now set my wheels: two marks on every gauge.",
  nw_mira_hold: "It kicks like a mule. Let go, I've got it. Nobody turns my valves but me.",
  nw_mira_after: "Four, and a rest. I'm counting along with your boy.",

  // ---- the lighthouse: Zoé alone, Arthur home
  nw_zoe_1: "There you are. The transmitter's warm. Arthur wanted to come; I gave him the kitchen pipe instead. He's home on the radio.",
  nw_zoe_2: "Baldino's channel is my old warning with the star moved to the front. Set the dials. I'll read the needle: when it's right, it sits still.",
  nw_zoe_again: "Star, sun, wave. I'm watching the needle.",
  nw_zoe_right: "Still. Completely still.",
  nw_ar_mic: "This is Arthur, at home on Citadel. I heard the hum go quiet. Station ready!",
  nw_zoe_hold: "Hands off, Twinsen. The frequency's mine.",
  nw_zoe_after: "The needle hasn't moved, and neither have I.",

  // ---- Desert Island: Ilka at the relief wheel, Dallan at the relay
  nw_ilka_2: "Set it on the frame, then open the relief wheel a quarter turn: that's its steam. And keep your ball handy. The project's drones don't like anything they didn't build.",
  nw_relay_bore: "The relay clicks onto the frame. A quarter turn of the relief wheel, and steam rattles up its little pipe. The lamp lights. The wheel kicks in his hands.",
  nw_ilka_hold: "Go! I've got the wheel.",
  nw_ilka_after: "The wheel kicks four, and rests. I've stopped noticing.",

  // ---- the Hamalayi: Yorna and Pim up at the dome
  nw_yorna_2: "He's right. And I'm coming too: somebody has to tell him when to let go. Up the ridge, both of you.",
  nw_keeper_1: "The relay wants light? Then it shall have the dome's. Set it beside the telescope, and put the lever on the suns.",
  nw_relay_dome: 'The relay sits beside the telescope. Pim takes the nearest mirror by its frame.',
  nw_scope: "He sets the lever to SUNS. The tube swings up, the mirror catches the light and pours it into the relay. The lamp burns like a little sun.",
  nw_yorna_hold: "Let go. I've held a winch through worse than a little sunlight.",
  nw_yorna_after: "Pim's holding the light, and I'm holding Pim's light. Go on.",

  // ---- the station: the cracked joint, his own hand
  nw_bal_joint: "The project's own code line into the shaft, and here's its joint: cracked through. It jumps with every knock. Clip my isolator on it in a rest, and it will hold while the code goes.",
  nw_bal_joint_b: "Irsa sent my isolator over on my ship; she's holding Kell's lane by hand. Here's the code line's joint: cracked through. Clip it on in a rest, and it will hold while the code goes.",
  nw_tw_joint: "In the rest after four.",
  nw_kick: "(The fourth knock throws the clip off the joint. Four, not three.)",
  nw_toast_kick: 'Kicked loose. Wait for the fourth knock.',
  nw_clip: '(The isolator bites. The joint jumps on the next knock, and holds.)',
  nw_radio_irsa: "Kell's lane is holding. So am I.",
  nw_radio_arthur: "Four, and a rest, Dad. Still four. I'm holding the radio!",

  nw_sub_irsa: "Mill Lane: Baldino's isolator (Irsa)",
  nw_sub_light: 'Citadel: the lighthouse (Zoé)',
  nw_radio_zoe: 'Lighthouse holding. The needle is perfectly still, and so am I.',
  nw_bal_p2: 'Sending now. Five stations, one signal...',
  nw_j_all: "Oku, Irsa, Mira, Zoé, Ilka and Dallan, and Pim, Yorna and Sefa held their stations for a minute, Arthur counting at home, and the shaft's blast doors ground open. Vesk is at the bottom with the only console that can turn the bore around.",
  nw_obj_joint: "Clip the isolator on the code line's joint, in a rest",
  nw_j_irsa: "Irsa holds Mill Lane by hand on the mills' line, so Baldino's isolator could come with me.",
  nw_j_four: "Arthur counted the kitchen pipe from home: the knocking is four now, not three. Mira read the same on her fortress gauge.",
  nw_j_held: "At every station a friend took the handle as I let go: Irsa, Mira, Zoé, Ilka and Dallan, Yorna and Pim.",
});
