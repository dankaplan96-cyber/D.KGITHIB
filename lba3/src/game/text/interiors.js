// INTERIOR-LIFE: the people of Citadel's interiors and of the two spaceports (src/game/roomlife.js, story/interiors.js).
// English only. Said through story/citizens.js: the first line depends on what they are doing and on the town, then
// they cycle. `_dry`: before the well has water again (chapter 1, chapter 2 until the valves); `_hot`: chapter 2 with
// the water back; `_gone`: after the light over the old fortress (chapter 2's end); `_evac`: the evacuation (chapter 8);
// `_home`: the epilogue; `_work`: while seated or busy at their stop. The spaceports: `_g0…` while passenger flights are
// grounded (chapters 1–3), `_f0…` once they run (from chapter 4). The plain `_0…` lines hold in every chapter.
// Luc, Mr Bazoo and the pharmacist are LBA2's own people of these places, twelve years older; nothing here says more
// about them than that. The ferry runs between Citadel's harbour and Desert Island; Zeelich is reached by spaceship.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  n_luc: 'Luc', n_hobb: 'Hobb', n_sanna: 'Sanna', n_fenn: 'Old Fenn', n_kip: 'Kip',
  n_mrbazoo: 'Mr Bazoo', n_pell: 'Mrs Pell', n_ines: 'Ines', n_rollo: 'Rollo', n_pharmacist: 'The Pharmacist',
  n_hedda: 'Hedda', n_wim: 'Wim', n_osk: 'Osk',
  n_ama: 'Ama', n_gurt: 'Gurt', n_bern: 'Port Guard', n_lomba: 'Mrs Lomba', n_dov: 'Dov',
  n_ressa: 'Old Ressa', n_ollo: 'Ollo', n_esren: 'Esren', n_gunda: 'Gunda', n_bibi: 'Bibi',
  n_velo: 'Velo', n_ennu: 'Ennu', n_oshra: 'Oshra',

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

  // ---- Citadel Spaceport
  rs_ama_g0: "No passenger flights to Zeelich. The project's grounded them. I still sell the tickets, just not the flights.",
  rs_ama_g1: 'Refunds at this window, complaints at that one. That one is also this one.',
  rs_ama_f0: 'Zeelich Spaceport, pad one. For the islands, change there to an Esmer shuttle.',
  rs_ama_f1: 'Flights are running again. People still complain. Now it\'s about the seats.',

  rs_gurt_work: "Hold this. No, don't. It's hot.",
  rs_gurt_g0: "Grounded or not, the engines get checked. Engines don't read notes.",
  rs_gurt_g1: 'Esmer ships are spotless inside. You could eat off the fuel line. I did once. Don\'t.',
  rs_gurt_f0: "She came in this morning. I'm checking her over before she goes out again.",
  rs_gurt_f1: 'Crates for Zeelich on this side, crates from Zeelich on that side. Mixing them up is the fun part.',

  rs_bern_g0: 'The hatch stays shut. Project orders. Read the note. It says the same, only longer.',
  rs_bern_g1: "Only project flights this week. I don't make the rules. I just stand next to them.",

  rs_lomba_work: "Mind the case. It's presents. Mostly jam.",
  rs_lomba_g0: "I've a sister on Zeelich and a ticket in my hand. And a bench. I've got a bench.",
  rs_lomba_g1: 'Grounded! By a project! Since when do projects ground people?',

  rs_dov_g0: "I've been here since the first sun came up. The ship hasn't moved. Neither have I.",
  rs_dov_g1: "Ask the guard when we fly. He'll say 'not today'. He's been right every day so far.",

  rs_ressa_f0: 'My first flight in thirty years. I packed a cushion. Esmer seats are firm.',
  rs_ressa_f1: 'My grandson works on Zeelich now. He says the clouds are lovely from underneath. Or above. One of those.',

  rs_ollo_f0: 'Business trip. Spice one way, our cheese the other. The cheese pays better.',
  rs_ollo_f1: "The board says pad one. There's only one pad. They print it anyway.",

  rs_esren_f0: 'Your departures board is very calm. Ours on Zeelich flashes. I think I prefer calm.',
  rs_esren_f1: 'I came to see your two suns from the ground. It is very bright down here.',

  rs_gunda_work: "That case has everything in it. Twice. Except the snacks.",
  rs_gunda_f0: "Our first trip with the little one. I've packed everything twice and forgotten the snacks once.",
  rs_gunda_f1: "Don't run near the pad! ...Sorry. That was for him, not you.",

  rs_bibi_f0: "We're going in a SPACESHIP. Have you ever been in a spaceship? Oh. You have.",
  rs_bibi_f1: "I'm going to wave at Citadel from the window. You have to wave back.",

  // ---- Zeelich Spaceport
  rs_velo_g0: 'Passenger ships to Twinsun are held by the project. The project says when. I say sorry.',
  rs_velo_g1: 'Welcome to Zeelich Spaceport. Mind the rail. The clouds look soft. They are not.',
  rs_velo_f0: 'Ships to Citadel leave from this pad. For the islands, take an Esmer shuttle from the dock.',
  rs_velo_f1: 'Welcome to Zeelich Spaceport. Mind the rail. The clouds look soft. They are not.',

  rs_ennu_work: 'Everything I own for a week, in one case. It was a very careful week.',
  rs_ennu_g0: 'I was to see Twinsun and its two suns this week. The ship is not to see anywhere.',
  rs_ennu_f0: 'Twinsun, for the first time. I hear the ground there does not float. Remarkable.',
  rs_ennu_f1: 'I have packed a hat. Two suns, I am told.',

  rs_oshra_g0: 'Held again. I shall write a strongly worded letter. In my best ink.',
  rs_oshra_g1: "I trade glaze on Citadel. Twinsun's harbour folk drive a hard bargain. I miss them.",
  rs_oshra_f0: "I trade glaze on Citadel. Twinsun's harbour folk drive a hard bargain. I like them.",
  rs_oshra_f1: 'The view from this rail is better than the view from the ship. Do not tell the pilots.',
});
