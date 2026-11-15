// U-2 "One More Place" (the user's own side quest, docs/lba-maturity/DEPTH-PLAN.md; story/oneplace.js). English only.
// No night, evening, tonight, sunset, dawn or dusk words: a meal here is just a meal.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  om_title: 'One More Place',
  p_tune: 'Tune', p_sit: 'Sit down',

  // ---- the fourth chair (looked at)
  om_chair_0: '(A fourth chair at the table, with an old green cushion. Zoé put it out.)',
  om_chair_ask: "(Brix's chair. He sits on the benches along the lane these days.)",
  om_chair_yes: "(Brix's chair. He said he'd be along.)",
  om_chair_done: "(Brix's chair. It stays at the table now.)",

  // ---- Zoé, the extra place
  om_zoe_1: "Hot water in the kitchen. I've cooked a proper meal for once.",
  om_zoe_1b: "I've cooked enough for four again.",
  om_tw_1: 'There are four chairs out.',
  om_zoe_2: 'Old habit. That\'s Brix\'s chair. He lived next door and ate with us every week, until he moved up the lane.',
  om_zoe_3: "Nobody's asked him since. Not even me.",
  om_ar_1: 'He sits on the benches along the lane. He tells the gulls off.',
  om_zoe_sit: 'Sit down, all of you, before it goes cold.',
  om_zoe_ready: "Sit down, it's getting cold.",

  // ---- Old Brix on the lane
  om_tw_inv: "Brix! Zoé's laid a place for you. Come and eat with us.",
  om_brix_inv1: "Me? I thought you'd all forgotten the way up the lane.",
  om_brix_inv2: "I'll come. But I'm bringing my radio. Your house always had music in it.",
  om_brix_inv3: 'Go on ahead, lad. I know the short cut through the gardens.',
  om_brix_go: "Go on, lad. I'll be there before you.",

  // ---- Brix at the table, his radio
  om_brix_here1: "There you are. The short cut's still there, by the way.",
  om_brix_here2: "This set hasn't found a station since I moved. It only hisses.",
  om_brix_here3: 'Turn the wheel on top, slowly, and watch the green eye. Wide open means a station.',
  om_ar_here: "Grandpa's radio has an eye like that. Can I watch?",
  om_brix_here4: 'Find your house\'s tune. I heard it through your window every week.',
  om_brix_hint: 'Slowly. Watch the green eye, and listen for your house\'s tune.',
  om_brix_sit: "Sit down, lad. Zoé's been patient long enough.",
  om_brix_sitdown: "Sit, sit. I've only just got comfortable.",

  // ---- the tuning (the radio's own captions, and what the room says)
  om_tune_hint: '{l}{r} Turn the wheel · {e} Let go',
  om_cap_hiss: '(hiss)',
  om_cap_news: 'RADIO: "This is the Joint Project. Hot water for every home on Citadel by the end of the season."',
  om_cap_news_b: 'RADIO: "Weather for Citadel: two suns, a light wind off the sea."',
  om_cap_zee: '♪ horns and bells, far away ♪',
  om_cap_home: '♪ a tune you know ♪',
  om_brix_news: 'Not that. They read it every hour.',
  om_brix_news_b: 'Not the weather. I can see the weather.',
  om_brix_zee: "That's a Zeelich station. Lovely. Not ours.",
  om_tuned_zoe: "That's ours!",
  om_tuned_ar: "The eye's wide open!",
  om_tuned_brix: 'There. Now it sounds like a house.',
  om_ar_radio: 'I turned it slowly, like Mr Brix showed us, till the green eye opened.',

  // ---- the first meal (the film's lines)
  om_m0_1: "Same chair. You've moved the picture.",
  om_m0_2: 'Ages ago, Brix.',
  om_m0_3: "Nobody tells me anything up the lane. That's the trouble with up the lane.",
  om_m0_4: 'Mr Brix, can I look inside your radio?',
  om_m0_5: "If your dad holds the screws. He's good at small things.",
  om_m0_6: 'Come next week. Same chair.',
  om_m0_7: 'Next week, then. I\'ll bring the radio. It sulks if I leave it at home.',
  // ---- later meals: a new conversation once a chapter where there is one; otherwise music and food
  om_m_dig_1: 'Zoé, your voice came out of every radio on the island. I kept mine on all week, in case you said more.',
  om_m_dig_2: 'I said it once. Once was enough.',
  om_m_dig_3: 'Mr Brix, does yours get Zeelich? Mine only gets the harbour.',
  om_m_dig_4: 'Mine gets what it likes. Like me.',
  om_m_steam_1: 'Hedda asked me to ask about her big pot.',
  om_m_steam_2: "Tell Hedda it's in use.",
  om_m_steam_3: 'I\'ll tell her it was full, and I was helping.',
  om_m_steam_4: "That's not lying. He's really helping.",
  om_m_pass_1: "You look like a man who's walked across an island.",
  om_m_pass_2: 'Two, this week.',
  om_m_pass_3: "Then sit longer. Chairs don't go anywhere. I've checked every bench in town.",
  om_m_council_1: 'They put me in the old fortress for two days. It was warmer than my room.',
  om_m_council_2: "You weren't on their list.",
  om_m_council_3: 'Nobody my age was. Gilbert complained the whole time. It helped, somehow.',
  om_m_council_4: "Grandpa Gilbert complains about everything. It's how you know he's fine.",
  om_m_home_1: 'The ground\'s quiet again. I can hear the radio properly now.',
  om_m_home_2: 'Can I take it apart? Just to see. I\'ll put it back.',
  om_m_home_3: 'Ask your dad to hold the screws.',
  om_m_home_4: 'Same time next week, Brix. Your chair stays.',
  om_m_home_5: "I'll bring the radio. It likes it here.",
  om_toast_meal: 'A meal at home: life restored',

  // ---- Brix on the lane afterwards (once a chapter)
  om_after_project: "Tell Zoé the soup was adequate. She'll know what I mean.",
  om_after_mid: "Same chair next week, lad. I've told the radio.",
  om_after_council: 'The fortress was warm. Your table is warmer.',
  om_after_deep: "Whatever you're off to do, come back hungry.",
  om_after_home: "Same time next week. The radio's already asking.",

  // ---- the journal
  om_j_ask: 'Zoé laid a fourth place for Old Brix, our old neighbour. He sits on the benches along the lane.',
  om_j_yes: 'Brix is coming to eat with us, and bringing his old radio.',
  om_j_here: 'Brix\'s radio only hisses. Turn its wheel slowly, watch the green eye, and find our house\'s tune.',
  om_j_tuned: 'The radio plays our tune. Sit down to eat.',
  om_j_done: 'Brix ate with us. His chair stays at the table: when I come home, there may be a meal waiting.',
});
