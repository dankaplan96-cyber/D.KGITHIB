// WC-3: the residents where the story goes (src/game/storylife.js): the project's crew on Desert Island, the School of
// Magic, the people of Lhar, Zeelich's council quarter. English only, short. Said through story/citizens.js: the line
// for the area's state first (`_crew`, `_pack`: the dig's crew at work, packing up in chapter 5; `_lhar`, `_mon`: the
// village before and after the lift), then the numbered ones in turn; `_work` while busy with the stop's work.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // ---- the project's crew between the research post and the dig (chapters 4 and 5)
  n_dg_surv: 'Surveyor Anko', n_dg_rod: 'Benno', n_dg_cook: 'Cook Marla', n_dg_haul: 'Gorrum', n_dg_porter: 'Teo',
  n_dg_mech: 'Fitter Ludo', n_dg_dig: 'Kasp', n_dg_clerk: 'Clerk Imre',

  rs_dg_surv_crew: "Three measurements, three answers. The ground here won't sit still.",
  rs_dg_surv_pack: "Orders came. We fold up and wait for a ferry that isn't coming back.",
  rs_dg_surv_0: "Don't stand in front of the tripod. You'd be surprised how often that happens.",

  rs_dg_rod_crew: "I hold the pole, he squints. Ten years of my life, and most of it holding a pole.",
  rs_dg_rod_0: "If he waves, I move left. If he waves twice, I move right. If he shouts, I go for lunch.",

  rs_dg_cook_crew: "Bean stew. Yesterday it was bean stew too. Tomorrow, guess.",
  rs_dg_cook_pack: "Half the crew left on the ferry and nobody told the beans. I still cooked for eight.",
  rs_dg_cook_0: "Sand gets in everything. I call it seasoning.",
  rs_dg_cook_work: "Hot pot! Mind your elbows.",

  rs_dg_haul_crew: "Crate from here, crate to there. Then back for another crate. It's a living.",
  rs_dg_haul_pack: "Now they want every crate back where it came from. I said nothing. Grobos are patient.",
  rs_dg_haul_work: "Heavy one. Don't ask what's in it, I don't know either.",

  rs_dg_porter_crew: "Gorrum carries two to my one. He says it's the shoulders. I say it's showing off.",
  rs_dg_porter_pack: "Packing up. Funny how the crates got heavier.",
  rs_dg_porter_work: "Coming through! Crate first, me second.",

  rs_dg_mech_crew: "The wind takes the fence apart and I put it back together. We're old friends now, the wind and me.",
  rs_dg_mech_0: "Every stake on that rim, I've hammered twice.",
  rs_dg_mech_work: "Hold on, this wire bites.",

  rs_dg_dig_crew: "We dug down to a door and then they told us to stop digging. Typical.",
  rs_dg_dig_0: "Stay out of the pit. Things crawl about down there that never signed on.",

  rs_dg_clerk_crew: "Forty-one crates. No, forty-two. Gorrum, did you sit on one again?",
  rs_dg_clerk_pack: "Everything has a number and a list. Except us. We weren't on the ferry's.",
  rs_dg_clerk_0: "If you're not on my list, you're not here. Officially, you're not here.",

  // ---- the School of Magic (from chapter 4)
  n_sc_master: 'Master Fennick', n_sc_pupa: 'Nisa', n_sc_pupb: 'Joss', n_sc_pupc: 'Rafi',
  n_sc_in1: 'Lila', n_sc_in2: 'Teb', n_sc_in3: 'Oona',

  rs_sc_master_0: "Magic is mostly patience. The rest is not setting your sleeve on fire.",
  rs_sc_master_1: "The herbs need water and the pupils need watching. Some days I mix them up.",
  rs_sc_pupa_0: "We're practising the wind spell. Joss's version mostly moves his hat.",
  rs_sc_pupa_work: "Shh! If I spill this, the sage won't forgive me.",
  rs_sc_pupb_0: "I'm going to be a Weather Wizard like Bersimon. I've already got the eyebrows.",
  rs_sc_pupb_work: "Weeding. It's magic if you do it slowly enough.",
  rs_sc_pupc_0: "Ker'aooc fixed my knee in one go. I'm going to learn that one first.",
  rs_sc_pupc_1: "The big face at the door used to scare me. Now I say hello to it every morning.",
  rs_sc_in1_0: "Rector Hougo says wind before rain, rain before thunder. I wrote it on my hand.",
  rs_sc_in1_work: "I'm listening! I'm listening very hard.",
  rs_sc_in2_0: "You can see the whole hall from up here. And the hall can see you not studying.",
  rs_sc_in3_0: "I'm copying the board. The triangles are the hard part.",
  rs_sc_in3_work: "Two more lines and then I'm a wizard. Probably.",

  // ---- Lhar, then the monastery (chapters 6 and 7)
  n_lh_bero: 'Bero', n_lh_sana: 'Sana', n_lh_old: 'Old Dorje', n_lh_tam: 'Tam', n_lh_kid1: 'Little Kel', n_lh_kid2: 'Pema',
  n_lh_mira: 'Lhamo', n_lh_grum: 'Bodo',

  rs_lh_bero_lhar: "Everything goes on the cart. Then the cart goes up the cliff. Somehow.",
  rs_lh_bero_mon: "The woodpile in the yard was half snow. Ours is drier. Don't tell anyone.",
  rs_lh_bero_work: "One more sack and the house is empty. Strange, an empty house.",
  rs_lh_sana_lhar: "The washing was frozen stiff this morning. Now it drips. The ice is going from underneath.",
  rs_lh_sana_mon: "We camp by the wall till the yard has room. It's cold, but nobody's floor is melting.",
  rs_lh_old_lhar: "I've lived in Lhar seventy winters. The ground was never warm before. I don't like it.",
  rs_lh_old_mon: "Up here the fire smells the same. That helps.",
  rs_lh_tam_lhar: "Wood first. If we're moving, we're moving warm.",
  rs_lh_tam_mon: "Last load off the sledge. My back will remember this lift for years.",
  rs_lh_tam_work: "Mind the logs!",
  rs_lh_kid1_lhar: "We're moving to the monastery! Pema says there are ghosts. There aren't. Are there?",
  rs_lh_kid1_mon: "The monastery has prayer wheels! You spin them and make a wish. I wished for more snow.",
  rs_lh_kid2_lhar: "You're it! No, wait, Kel's it. Run!",
  rs_lh_kid2_mon: "There's more snow up here. That's the best thing about moving.",
  rs_lh_mira_lhar: "Fill the pot, then the jugs, then the pot again. The trough doesn't freeze anymore. That's the worry.",
  rs_lh_mira_mon: "Soup for the whole village on one fire. I've done harder. Not much harder.",
  rs_lh_grum_lhar: "Crates on the cart. If it tips, I'm blaming the cart.",
  rs_lh_grum_mon: "We came up in two trips and an argument. Now we unpack.",

  // ---- Zeelich's council quarter (chapter 9)
  n_zc_guard: 'Council guard', n_zc_clerk: 'Clerk Pelu', n_zc_courier: 'Courier Isse', n_zc_petit: 'Mrs Ardo',
  n_up_clerk: 'Junior clerk Tib', n_up_courier: 'Courier Venn', n_up_wait: 'Mrs Quill', n_up_esmer: 'Old Ossa', n_up_guard: 'Council guard',

  rs_zc_guard_0: "The council is in session. Or about to be. Or just was. Ask the clerk.",
  rs_zc_clerk_0: "Every form has a form that comes before it. That's how you know it's a real form.",
  rs_zc_clerk_1: "The council reads everything. Slowly. Twice.",
  rs_zc_courier_0: "Ship to council, council to the dock, dock to the ship. My feet know the way better than I do.",
  rs_zc_courier_work: "Urgent papers. Well, they were urgent this morning.",
  rs_zc_petit_0: "I came from Twinsun about a stamp. That was a while ago. I've made friends.",
  rs_zc_petit_1: "They said come back tomorrow. I did. They said it again.",
  rs_up_clerk_0: "New notices go up on the left. Old notices also stay up on the left. It's getting crowded.",
  rs_up_courier_0: "Delivery for the council. Sign here. And here. And there, for the signing.",
  rs_up_wait_0: "I've been waiting for my number to be called. They haven't got to numbers yet.",
  rs_up_wait_work: "I'm keeping my place on this bench. It's the only place I've got.",
  rs_up_esmer_0: "I asked for the form to ask for a hearing. The form for that form is out of print.",
  rs_up_guard_0: "Council chamber on the left. The archive is not for visitors. Nothing personal.",
});

// the numbered lines every street resident has besides its state's (tests/walkers.mjs: a name, `_0`, two lines or more)
Object.assign(STR.en, {
  rs_dg_surv_1: "The rim moved a finger's width since spring. I wrote it down. Nobody read it.",
  rs_dg_rod_1: "Best view on the island, the far rim. Mostly of the surveyor's back.",
  rs_dg_cook_1: "The crew eats at sunset. Well, when the sun dips a bit. It never quite goes.",
  rs_dg_haul_0: "Ask Imre what's in the crates. He has a list. He loves his list.",
  rs_dg_haul_1: "Big crates, little crates. My back can't tell them apart anymore.",
  rs_dg_porter_0: "The yacht man waves when he passes. I wave back with a crate. It's harder than it looks.",
  rs_dg_porter_1: "Mind the piles. They're stacked by a system. Gorrum's system.",
  rs_dg_mech_1: "If the drones hum funny, call me. If they hum normally, also call me. They hum a lot.",
  rs_dg_dig_1: "Twelve years ago this was a temple park. Now it's a hole with a fence round it.",
  rs_dg_clerk_1: "Stamps, signatures, crates. The desert doesn't care, but the office does.",
  rs_sc_pupa_1: "Master Fennick says I'm a natural. A natural what, he didn't say.",
  rs_sc_pupb_1: "Don't step on the sage. It sulks for a week.",
  rs_sc_in2_1: "Rector Hougo has eyes in the back of his hat. I'm sure of it.",
  rs_lh_bero_0: "Lhar's had worse winters. Never a warmer one, though. That's the strange part.",
  rs_lh_bero_1: "My grandfather built that house. I'm carrying it up a cliff one sack at a time.",
  rs_lh_sana_0: "Yorna keeps us all in order. Somebody has to.",
  rs_lh_sana_1: "Hang a shirt up here and it's dry before you turn round. Or frozen. Depends on the wind.",
  rs_lh_old_0: "Sit by the fire, lad. Your bones will thank you when they're as old as mine.",
  rs_lh_old_1: "The monastery was old when I was young. It'll outlast the lot of us.",
  rs_lh_tam_0: "Split the wood, carry the wood, burn the wood. Then do it again.",
  rs_lh_tam_1: "Pim lost his kite on the icefall. He's been staring at it all morning.",
  rs_lh_kid1_0: "I can run faster than Pema. Except when she's chasing me.",
  rs_lh_kid1_1: "Can you throw that ball really high? Higher than the flags?",
  rs_lh_kid2_0: "I'm not cold. I'm never cold. My nose is, a bit.",
  rs_lh_kid2_1: "Tag! You're it! Ha, you have to run now. That's the rule.",
  rs_lh_mira_0: "Soup's hot, bowls are cold. Bring your own bowl.",
  rs_lh_mira_1: "The pot's older than me and it's never once boiled over. Mind you, I watch it.",
  rs_lh_grum_0: "A crate a trip. I counted. Then I stopped counting.",
  rs_lh_grum_1: "Yorna says lift. I lift. It's simpler that way.",
  rs_zc_guard_1: "I stand here. That side, then this side. It's an important job.",
  rs_zc_courier_1: "Never run on the bridge. That's rule one. Rule two: run everywhere else.",
});
