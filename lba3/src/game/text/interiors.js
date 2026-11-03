// INTERIOR-LIFE: the people of Citadel's interiors and of the two spaceports (src/game/roomlife.js, story/interiors.js).
// English only. Said through story/citizens.js: the first line depends on what they are doing and on the town, then
// they cycle. `_dry`: before the well has water again (chapter 1, chapter 2 until the valves); `_hot`: chapter 2 with
// the water back; `_gone`: after the light over the old fortress (chapter 2's end); `_evac`: the evacuation (chapter 8);
// `_home`: the epilogue; `_work`: while seated or busy at their stop. The spaceports: `_g0…` while passenger flights are
// grounded (chapters 1–3), `_f0…` once they run (from chapter 4). The plain `_0…` lines hold in every chapter.
// WC-4: `_e0…` in the evacuation (chapter 8), `_c0…` in chapter 9, `_a0…` in chapter 10 and the epilogue (without
// them a port person says the `_f` lines). Rollo and Mrs Pell in the evacuation's queue speak as `rs_rollo_q_…`,
// `rs_pell_q_…`.
// Luc, Mr Bazoo and the pharmacist are LBA2's own people of these places, twelve years older; nothing here says more
// about them than that. The ferry runs between Citadel's harbour and Desert Island; Zeelich is reached by spaceship.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  n_luc: 'Luc', n_hobb: 'Hobb', n_sanna: 'Sanna', n_fenn: 'Old Fenn', n_kip: 'Kip',
  n_mrbazoo: 'Mr Bazoo', n_pell: 'Mrs Pell', n_ines: 'Ines', n_rollo: 'Rollo', n_pharmacist: 'The Pharmacist',
  n_hedda: 'Hedda', n_wim: 'Wim', n_osk: 'Osk',
  n_ama: 'Ama', n_gurt: 'Gurt', n_bern: 'Port Guard', n_lomba: 'Mrs Lomba', n_dov: 'Dov',
  n_ressa: 'Old Ressa', n_ollo: 'Ollo', n_esren: 'Esren', n_gunda: 'Gunda', n_bibi: 'Bibi',
  n_velo: 'Velo', n_ennu: 'Ennu', n_oshra: 'Oshra', n_tavi: 'Tavi', n_pask: 'Pask',
  n_zt_guard: 'Council Guard', n_zt_guard2: 'Council Guard', n_rollo_q: 'Rollo', n_pell_q: 'Mrs Pell',   // (WC-4: the same two, in the evacuation's queue)

  // ---- Chez Luc
  rs_luc_dry: "No water in the well, so it's all bottled from the harbour. Prices up, tempers down. Mostly.",
  rs_luc_hot: "Water's back, and it comes out hot. I've stopped boiling the kettle. I just ask the tap nicely.",
  rs_luc_gone: "Everyone saw that light over the old fortress. Nobody agrees what it was. Arguing is good for business.",
  rs_luc_evac: "Lists, ships, shouting. I'm locking the cellar and taking the good glasses. The rest can fend for themselves.",
  rs_luc_home: "Everyone's back, and everyone's thirsty. I've never been so glad to be tired.",
  rs_luc_work: "Twelve years I've polished this glass. It's still not clean. I think it's the glass.",
  rs_luc_0: 'Chez Luc. Same sign, same stools. Older landlord.',
  rs_luc_1: 'The dock crews drink here now. Louder than the old crowd, but they tip in Zeelich coin.',
  rs_luc_2: "The cellar's full of Esmer crates these days. I can't read the labels. I serve them anyway.",

  rs_hobb_dry: "Hauled water crates all morning. Now I'm the one who's dry.",
  rs_hobb_hot: 'Hot water on the quay! I washed my hands twice. Didn\'t need to. Just could.',
  rs_hobb_work: "Shh. This stool knows my shape. Don't distract it.",
  rs_hobb_0: 'Cargo lift, crane, crates. Esmer glaze one way, our fruit the other. Same backache both ways.',
  rs_hobb_1: "Zeelich crates are square. Ours are crate-shaped. You'd be surprised the difference.",

  rs_sanna_dry: 'The ferry carries water tanks now. Half the town wants a ride just to wash.',
  rs_sanna_hot: "Hot taps and a ferry that runs on light. Twelve years ago you'd have called that magic.",
  rs_sanna_work: 'My one sit-down of the day. Ask me again in an hour.',
  rs_sanna_0: 'I work the ferry to Desert Island. Out with the first sun, back with the second.',
  rs_sanna_1: "No sails on the ferry any more. I miss the sails. The sails didn't need a manual.",

  rs_fenn_dry: 'A dry well. In my day it was the fish who complained about water.',
  rs_fenn_work: "I'm resting. Fishermen rest professionally.",
  rs_fenn_0: 'Forty years on the boats. Now I sit on this sofa and tell the young ones they\'re doing it wrong.',
  rs_fenn_1: 'That jukebox plays three tunes. Kip thinks it plays four.',

  rs_kip_hot: "Has the hot water reached the harbour row yet? No? Then I'm still washing at my aunt's.",
  rs_kip_work: "Shh, this is the good bit.",
  rs_kip_0: 'I run the cargo lift on the pier. Up, down, up. This box is my day off.',
  rs_kip_1: "Fenn says three tunes. There are four. The fourth is the first one, louder.",

  // ---- Mr Bazoo's shop
  rs_mrbazoo_dry: "No water, no washing up. I'm selling more cups than ever. People keep buying new ones.",
  rs_mrbazoo_hot: "Hot water's back. Kettles have stopped selling. Cups are holding up.",
  rs_mrbazoo_evac: 'Packing the good stock first. The rabbit stays. Nobody has ever bought the rabbit.',
  rs_mrbazoo_home: 'Open again, same as before. The rabbit is still for sale.',
  rs_mrbazoo_work: 'Every price on that board is fair. Some are fairer than others.',
  rs_mrbazoo_0: "Mr Bazoo's. Twelve years on, still the only shop on Citadel with a terracotta rabbit.",
  rs_mrbazoo_1: "The Esmer jars sell to visitors. The visitors are mostly Esmers. I don't ask.",
  rs_mrbazoo_2: 'Browse all you like. Buying is extra.',

  rs_pell_dry: "I need a bigger water jug. Mr Bazoo says this one's bigger. It isn't.",
  rs_pell_hot: "Everyone's buying tea now the water's hot. I'm buying a teapot. Ahead of the crowd.",
  rs_pell_work: "Don't mind me. I'm comparing two identical jars.",
  rs_pell_0: 'I come in for one thing and leave with three. Never the one thing.',
  rs_pell_1: 'That rabbit has been here longer than I have. I like to check on it.',

  // ---- the ticket office
  rs_ines_home: "Every seat's booked for a week. Everyone wants a holiday after all that.",
  rs_ines_work: 'One moment. The till sticks when it thinks.',
  rs_ines_0: 'The ferry to Desert Island, twice a day. Ships to Zeelich leave from the spaceport, not here. I get asked a lot.',
  rs_ines_1: "The ship on that poster is our ferry. It's had three coats of paint since. The poster's had none.",

  rs_rollo_dry: 'Desert Island has more water than Citadel this week. Never thought I\'d say that.',
  rs_rollo_work: "Mind the case. It's mostly cheese.",
  rs_rollo_0: "Waiting for the ferry home to Desert Island. I've read the timetable eleven times.",
  rs_rollo_1: "This case is all Citadel cheese. My village can't get enough of it.",

  // ---- the pharmacy
  rs_pharmacist_dry: "People keep asking me for something for thirst. It's called water. I'm out of it too.",
  rs_pharmacist_hot: "Scalds this week, all from hot taps. Test the water first, Twinsen.",
  rs_pharmacist_work: "Measuring. If I talk, it's two spoons instead of one.",
  rs_pharmacist_0: 'Same shelves, same jars. Twelve years older, both of us.',
  rs_pharmacist_1: 'The amber jars are Mosquibee honey, from Zeelich. Good for a sore throat. And for toast.',

  // ---- the neighbours' house
  rs_hedda_dry: "Our kettle's furred with crystals since breakfast. Zoé took some to show Mira.",
  rs_hedda_hot: 'The tap runs hot now. Hot! I keep putting my hand under it just to check.',
  rs_hedda_work: "Stew. Don't lift the lid. It gets shy.",
  rs_hedda_0: 'Tell Zoé she can borrow the big pot whenever she likes. She knows where it is. She\'s had it since spring.',
  rs_hedda_1: "Arthur waved at me from the pond. He's getting so tall. And you're getting so... busy.",

  // ---- Nell's house
  rs_wim_hot: 'Since the heat came on, every engine on the quay wants looking at.',
  rs_wim_work: 'Hand me that... no, the other... never mind, found it.',
  rs_wim_0: "I'm Nell's apprentice. She does the quick fixes at her stall. The stubborn ones come in here to me.",
  rs_wim_1: "This Esmer engine has more pipes than parts. Or more parts than pipes. I'm still counting.",

  // ---- the baggage claim
  rs_osk_dry: "Crates of bottled water all morning, every one marked URGENT. They're all urgent this week.",
  rs_osk_work: 'Sign here. And here. And there. That one is for the other copy.',
  rs_osk_0: 'Parcels for Zeelich go to the spaceport. Parcels from Zeelich come here. Eventually.',
  rs_osk_1: "That teal crate's been on the belt all week. Nobody claims it. I've started saying good morning to it.",

  // ---- Citadel Spaceport (SPACEPORT-1: Ama at the terminal's ticket counter, Tavi at its café, the guard at its gate)
  rs_ama_g0: "No passenger flights to Zeelich. The project's grounded them. I still sell the tickets, just not the flights.",
  rs_ama_g1: 'Refunds at this window, complaints at that one. That one is also this one.',
  rs_ama_f0: 'Zeelich Spaceport, pad one. For the islands, change there to an Esmer shuttle.',
  rs_ama_f1: 'Flights are running again. People still complain. Now it\'s about the seats.',
  rs_ama_e0: "Project ships go by the project's list. My seats go by ticket. Both are full.",
  rs_ama_e1: "I've never sold so many one-way tickets. Nobody has asked for a return.",
  rs_ama_a0: 'Return tickets are back. Everyone wants to come home. I like this kind of busy better.',

  rs_gurt_work: "Hold this. No, don't. It's hot.",
  rs_gurt_g0: "Grounded or not, the engines get checked. Engines don't read notes.",
  rs_gurt_g1: 'Esmer ships are spotless inside. You could eat off the fuel line. I did once. Don\'t.',
  rs_gurt_f0: "She came in this morning. I'm checking her over before she goes out again.",
  rs_gurt_f1: 'Crates for Zeelich on this side, crates from Zeelich on that side. Mixing them up is the fun part.',
  rs_gurt_e0: 'Project ships in, project ships out. I check every one twice. Nobody flies a dodgy ship today.',
  rs_gurt_e1: "Full ones out, empty ones back. I haven't sat down since the first sun.",

  rs_bern_g0: 'The gate stays shut. Project orders. Read the notice. It says the same, only longer.',
  rs_bern_g1: "Only project flights this week. I don't make the rules. I just stand next to them.",
  rs_bern_e0: "The project's list. Your name's on it, you board. If it isn't... I'm sorry. I really am.",
  rs_bern_e1: "I've read these names out so often I know them by heart. I'd rather not.",

  rs_lomba_work: "Mind the case. It's presents. Mostly jam.",
  rs_lomba_g0: "I've a sister on Zeelich and a ticket in my hand. And a seat. I've got a seat.",
  rs_lomba_g1: 'Grounded! By a project! Since when do projects ground people?',
  rs_lomba_e0: "I'm on the list! First time in my life I've been glad to be on a list.",
  rs_lomba_e1: "My sister always said come any time. I don't think she meant this time.",
  rs_lomba_a0: "Home from my sister's. It took an evacuation to get there and one ordinary flight back.",
  rs_lomba_a1: 'I took her a case of jam. She sent me home with two.',

  rs_dov_g0: "I've been here since the first sun came up. The ship hasn't moved. Neither have I.",
  rs_dov_g1: "Ask the guard inside when we fly. He'll say 'not today'. He's been right every day so far.",
  rs_dov_e0: "Not on the list. I've waited on this bench so long, I'll wait here for the next one too.",
  rs_dov_e1: "I help with the bags. If I can't go, my arms can at least be useful.",

  rs_tavi_work: 'Coffee, tea, or the Zeelich stuff that glows a bit. The glow is free.',
  rs_tavi_g0: 'No flights means nobody in a hurry. Best week for the café since it opened.',
  rs_tavi_g1: 'Mrs Lomba has had six teas. I have started giving her the pot.',
  rs_tavi_f0: 'Ten minutes to boarding and everyone wants a coffee. Nine minutes, and they want it now.',
  rs_tavi_f1: 'The cups go to Zeelich and back more than I do. I get postcards from them. Not really.',
  rs_tavi_e0: 'The café stays open till the last ship. Tea for anyone in the queue. Nobody pays today.',
  rs_tavi_e1: 'Mrs Lomba wanted a tea for the flight. I gave her the pot. Again.',
  rs_tavi_a0: "Everyone's back, and everyone wants a coffee. I may never sit down again.",

  rs_ressa_f0: 'My first flight in thirty years. I packed a cushion. Esmer seats are firm.',
  rs_ressa_f1: 'My grandson works on Zeelich now. He says the clouds are lovely from underneath. Or above. One of those.',
  rs_ressa_e0: "They put me on the list for my age. First time my age has got me anything.",
  rs_ressa_e1: "I've brought my cushion again. Some things you don't leave behind.",

  rs_ollo_f0: 'Business trip. Spice one way, our cheese the other. The cheese pays better.',
  rs_ollo_f1: "The board says pad one. There's only one pad. They print it anyway.",
  rs_ollo_e0: 'Not on the list. Thirty years of business trips, and not the one that matters.',
  rs_ollo_e1: "I asked if my cheese could go in my place. It isn't on the list either.",
  // (WC-4: Rollo and Mrs Pell, out of their emptied rooms, in the evacuation's queue)
  rs_rollo_q_work: "Mind the case. It's still mostly cheese.",
  rs_rollo_q_e0: "I'm on the list, so it's a spaceship instead of the ferry. My village won't believe a word.",
  rs_rollo_q_e1: "Some people packed clothes. I packed cheese. We'll see who's right on Zeelich.",
  rs_pell_q_work: "One bag each, they said. This is one bag. It just has other bags in it.",
  rs_pell_q_e0: "Mr Bazoo asked me to look after his good teapot. We're both on the list, me and the teapot.",
  rs_pell_q_e1: "Mr Bazoo is selling everything at half price. He says it's the only time he'll ever do it.",

  rs_esren_f0: 'Your departures board is very calm. Ours on Zeelich flashes. I think I prefer calm.',
  rs_esren_f1: 'I came to see your two suns from the ground. It is very bright down here.',

  rs_gunda_work: "That case has everything in it. Twice. Except the snacks.",
  rs_gunda_f0: "Our first trip with the little one. I've packed everything twice and forgotten the snacks once.",
  rs_gunda_f1: "Don't run near the pad! ...Sorry. That was for him, not you.",
  rs_gunda_e0: "We're on the list, the two of us. I've checked it four times. I'll check it again.",

  rs_bibi_f0: "We're going in a SPACESHIP. Have you ever been in a spaceship? Oh. You have.",
  rs_bibi_f1: "I'm going to wave at Citadel from the window. You have to wave back.",
  rs_bibi_e0: "Everybody's going on a spaceship today. Even the man on the bench. No, not him.",

  // ---- Zeelich Spaceport (SPACEPORT-1: Velo at the terminal's counter, Pask the porter inside)
  rs_velo_g0: 'Passenger ships to Twinsun are held by the project. The project says when. I say sorry.',
  rs_velo_g1: 'Welcome to Zeelich Spaceport. The clouds outside look soft. They are not.',
  rs_velo_f0: 'Ships to Citadel leave from the pad, through that gate. For the islands, take an Esmer shuttle from the dock.',
  rs_velo_f1: 'Welcome to Zeelich Spaceport. The clouds outside look soft. They are not.',
  rs_velo_e0: "Quiet in here this week. Twinsun's people come on the project's ships, and the project has its own gate.",
  rs_velo_e1: 'Welcome to Zeelich Spaceport. If you came with the project, the benches outside are yours.',
  rs_velo_c0: "The council's guards check every departure now. I check the guards. Somebody has to.",
  rs_velo_c1: 'Tickets at this counter. Permission at that gate. Both of them are slow today.',
  rs_velo_a0: "The council's guards have gone. One left his chair. We are keeping it, just in case.",

  rs_pask_work: 'Mind your feet. This one is heavier than it looks. They always are.',
  rs_pask_g0: 'No ships, but the cases keep coming down the lifts. People pack in hope.',
  rs_pask_g1: 'Twelve cases by the gate, all for Twinsun. I know them all by name now.',
  rs_pask_f0: 'Off the ship, down to the gate, up the lifts. Repeat until the suns change.',
  rs_pask_f1: 'A Twinsun case is always heavier. They pack fruit. They always pack fruit.',
  rs_pask_e0: 'No passengers this week, but the project sends crates. They never say please.',
  rs_pask_c0: 'Two guards at the gate. They watch me carry every case. Neither of them offers.',
  // (WC-4, chapter 9: the council's guards in the terminal)
  rs_zt_guard_c0: 'By order of the council, every departure is checked. You may pass. Slowly.',
  rs_zt_guard_c1: 'Arrivals we watch. Departures we check. In between, we stand.',
  rs_zt_guard2_c0: 'The council wishes to know who comes and who goes. So far it is mostly the porter.',
  rs_zt_guard2_c1: 'I am told to look stern. I am told I look worried. It is the same face.',

  rs_ennu_work: 'Everything I own for a week, in one case. It was a very careful week.',
  rs_ennu_g0: 'I was to see Twinsun and its two suns this week. The ship is not to see anywhere.',
  rs_ennu_f0: 'Twinsun, for the first time. I hear the ground there does not float. Remarkable.',
  rs_ennu_f1: 'I have packed a hat. Two suns, I am told.',

  rs_oshra_g0: 'Held again. I shall write a strongly worded letter. In my best ink.',
  rs_oshra_g1: "I trade glaze on Citadel. Twinsun's harbour folk drive a hard bargain. I miss them.",
  rs_oshra_f0: "I trade glaze on Citadel. Twinsun's harbour folk drive a hard bargain. I like them.",
  rs_oshra_f1: 'The view from this rail is better than the view from the ship. Do not tell the pilots.',
});
