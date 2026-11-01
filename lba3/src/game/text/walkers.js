// WORLD-LIFE: the people who walk round Citadel (src/game/walkers.js, walkrounds.js). English only.
// Each has a few short lines. The first one said depends on what they are doing; after that they cycle. `_dry`: before the
// well has water again (chapter 1); `_work`: while they do their stop's work (sitting, carrying, tending).
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  n_oda: 'Oda', n_brix: 'Old Brix', n_maro: 'Maro', n_tilde: 'Tilde', n_garrick: 'Garrick',
  n_ilo: 'Ilo', n_aven: 'Aven', n_kira: 'Kira', n_safi: 'Safi', n_tamu: 'Tamu', n_bashir: 'Old Bashir',
  n_pico: 'Pico', n_dot: 'Dot', n_marda: 'Marda', n_tobb: 'Tobb', n_ume: 'Granny Ume',

  rs_oda_dry: "The well's dry again. I fetch my water from the harbour tap now. My arms are very strong.",
  rs_oda_0: "Pippa's pears are the best on the island. Don't tell her I said so. She'd put the price up.",
  rs_oda_1: "Morning, Twinsen. Or is it afternoon? I stopped counting.",
  rs_oda_work: "Careful with the basket. It's my whole week.",

  rs_brix_dry: "Dry well, dry pump. In my day we dug deeper.",
  rs_brix_0: "I've sat on every bench in this town. This one has the best view of everybody's business.",
  rs_brix_1: "Walk a bit slower, lad. The lane's not going anywhere.",
  rs_brix_work: "Shh. I'm resting my eyes. They've seen a lot.",

  rs_maro_dry: "Do you think the well will come back? Tilde says yes. Tilde also thought the pump was haunted.",
  rs_maro_0: "Tilde and I meet every day by the benches. She says it's for the gossip. It's for the gossip.",
  rs_maro_1: "Late again. She's always late. I love her for it.",
  rs_maro_work: "Hush, I'm in the middle of a story.",

  rs_tilde_dry: "Don't ask me about water. Ask me about gossip. I have plenty.",
  rs_tilde_0: "Maro talks and I nod. It works for us.",
  rs_tilde_1: "Pippa should name a price and stick to it. I told her so. Twice.",
  rs_tilde_work: "Not now, dear. Maro's getting to the good part.",

  rs_garrick_dry: "I'm watering with what the harbour tap gives me. The tulips don't complain. Much.",
  rs_garrick_0: "Tulips want water twice a day and a kind word once. They get the water.",
  rs_garrick_1: "Zoé's beds are the neat ones. Mine are the colourful ones.",
  rs_garrick_work: "Mind the can. It leaks on the left.",

  rs_pico_0: "Race you to the well! Too slow, Twinsen.",
  rs_pico_1: "Arthur's boat is the best boat. Lulu says hers is. Lulu is wrong.",
  rs_pico_2: "I'm not running. I'm walking very fast.",

  rs_dot_0: "I'm carrying a message. It's a secret. It's for the baker.",
  rs_dot_1: "My trunk isn't short. It's still growing. Mama says.",
  rs_dot_2: "Don't tell Pico I'm following him.",

  rs_marda_dry: "Two hundred steps to the quay and back, every day. And still no water at the well.",
  rs_marda_0: "Two hundred steps to the quay and back, every day. Doctor's orders.",
  rs_marda_1: "The ferry's late. It's always late. That's why I walk.",
  rs_marda_work: "Give me a minute. These benches are the best part of the doctor's orders.",

  rs_tobb_0: "Crates from the quay to the stall, stall to the quay. They get heavier. I'm sure of it.",
  rs_tobb_1: "Customs kept me half the morning. Ask Officer Odile about her paperwork. Actually, don't.",
  rs_tobb_work: "Mind your toes. It's heavy, and I'm not looking.",

  rs_ume_dry: "A well that won't give and a pump that won't pump. Whatever next.",
  rs_ume_0: "Slowly, dear. The lane's long and I've all day.",
  rs_ume_1: "You have a kind face. A bit tired. Have you been sleeping?",
  rs_ilo_0: "Mind your step, Twinsen. Everything on Zeelich is slightly uphill from the clouds.",
  rs_ilo_1: "The fountain has never once been rebuilt. We're very proud of it.",
  rs_ilo_work: "Careful with the basket. The apricots are shy.",

  rs_aven_0: "I count the street's benches every week. Six. Always six. It calms me.",
  rs_aven_1: "From here you can watch all three mills turn. The wind works overtime.",
  rs_aven_work: "Sit if you like. The view doesn't change, and nor do I.",

  rs_kira_0: "These planters are older than the project. They like being talked to. I talk to them a lot.",
  rs_kira_1: "Orb-stalks glow when they're happy. This one's been dim since the heat posts went up. Coincidence, I'm sure.",
  rs_kira_work: "Watering. Please don't make me lose count.",

  rs_safi_0: "The oasis is lower than last year. Everyone says so. Nobody says it to the oasis.",
  rs_safi_1: "Twelve jars a day, from the water to the cool room. I stopped counting at eleven.",
  rs_safi_work: "Don't jog my arm. This jar is the village's whole afternoon.",

  rs_tamu_0: "I'm the fastest in Kesh. Don't ask who's second. Nobody's second.",
  rs_tamu_1: "Hesk says the ferry's late because the wind is rude. I think Hesk is late.",
  rs_tamu_2: "Race you to the board! Ah. You didn't say yes. I still won.",

  rs_bashir_0: "Lumi makes the sails, the screens, the curtain, the shade. I make sure nobody forgets it.",
  rs_bashir_1: "I came for one summer. That was the year before the first sandstorm.",
  rs_bashir_work: "Quiet, please. The loom has a rhythm, and I'm counting it.",

  rs_ume_work: "Sit if you like. This bench has room for two and a half.",
});

// G1 world-life: what the residents say once the water is back (hot) and the project's heat posts are lit (chapter 2). `_hot`
// is said first, then the numbered lines.
Object.assign(STR.en, {
  rs_oda_hot: "The well's running again! Hot, mind. I made tea straight from the bucket and burned my tongue. Worth it.",
  rs_brix_hot: "That post by the shop is wonderful for the knees. The well can keep its steam, though.",
  rs_maro_hot: "Hot water straight from the well! I call it progress. Tilde has other words for it.",
  rs_tilde_hot: "Too hot to drink, too hot to wash in. Maro calls it progress. I call it tea without the tea.",
  rs_garrick_hot: "I'm letting the can cool before the tulips get it. Patience is a gardener's virtue. Mine's nearly gone.",
  rs_pico_hot: "The well's steaming! Dot says it's a dragon. It's not a dragon. Probably.",
  rs_dot_hot: "The posts are warm! Look, my hand's warm! Pico says don't touch. I'm touching.",
  rs_marda_hot: "A warm post at every door. I walk past them twice as slowly now. Doctor's orders.",
  rs_tobb_hot: "Heavy crates and a warm post at every corner. I take longer breaks. Don't tell the project.",
  rs_ume_hot: "A warm post and a bench. At my age, that's all the project I need. The tea, though, I'll let cool.",
});

// TOWN-LIFE-2: what the residents say once Vesk has gone (chapter 2, after the beam over the old fortress took him). `_gone`
// is said first. Nobody in town has seen the plan: they saw a light over the fortress, and hear talk of an "evacuation
// drill" (as Mira and Pippa say then, text/ch1.js c1_mira_gone, c1_pippa_2).
Object.assign(STR.en, {
  rs_oda_gone: "Did you see that light over the fortress? I dropped a whole basket of pears. Pippa wasn't amused.",
  rs_brix_gone: "Engineers come, engineers go. The benches stay.",
  rs_maro_gone: "Tilde says the light over the fortress was a signal. Tilde says a lot of things.",
  rs_tilde_gone: "That light over the fortress wasn't a sun, dear. We have two of those already.",
  rs_garrick_gone: "The tulips didn't like that light over the fortress. Neither did I.",
  rs_pico_gone: "I saw the beam! It went whoosh, straight up! Dot missed it. Ha.",
  rs_dot_gone: "Pico says he saw the beam. I saw it better. I was standing on a bench.",
  rs_marda_gone: "Everyone on the quay was staring at the sky. I did my two hundred steps round them.",
  rs_tobb_gone: "No project crates today. A lighter day for me. I don't trust it.",
  rs_ume_gone: "The engineer left in a hurry, they say. The polite ones always do.",
});

// TOWN-LIFE-2: a few words over someone's head when Twinsen walks into them (nothing to answer: he walks on). By who they
// are (the children, the old folk, the others); one carrying something minds its load first.
Object.assign(STR.en, {
  rb_kid_0: "Hey! No pushing!",
  rb_kid_1: "Tag! You're it!",
  rb_kid_2: "Ow. Not really. But ow.",
  rb_old_0: "Easy, young man. These knees are older than the lighthouse.",
  rb_old_1: "In my day, heroes said excuse me.",
  rb_old_2: "Ooh! A little warning next time.",
  rb_adult_0: "Oops! After you, Twinsen.",
  rb_adult_1: "Steady! Where's the fire?",
  rb_adult_2: "Big feet, small street!",
  rb_adult_3: "Mind where you're going, hero.",
  rb_crate: "Mind the crate! It's heavier than it looks.",
  rb_basket: "Careful! Those are Pippa's pears.",
  rb_can: "Watch out, it leaks on the left!",
  rb_sack: "Mind the sack!",
});

// TOWN-LIFE-2: what Maro and Tilde talk about between the plaza's benches, heard when Twinsen comes close (a line for each
// turn they take; Maro's are the even ones). The well dry; the water back, hot; after Vesk's departure.
Object.assign(STR.en, {
  ro_dry_0: "Not a drop from the well this morning.",
  ro_dry_1: "Mira says it's the pipes. Gilbert says it's Mira.",
  ro_dry_2: "And what do you say?",
  ro_dry_3: "I say I've got a kettle and nothing to put in it.",
  ro_dry_4: "The project people were digging by the pump again.",
  ro_dry_5: "They're always digging. One day they'll find the bottom.",
  ro_hot_0: "Hot water, straight from the well! No more boiling.",
  ro_hot_1: "No more cold water either. My fish are sulking.",
  ro_hot_2: "That engineer fixed it in a day.",
  ro_hot_3: "Twinsen fixed it. The engineer pointed.",
  ro_hot_4: "A warm post at every door now.",
  ro_hot_5: "And a child sitting on every one of them.",
  ro_gone_0: "Did you see the light over the old fortress?",
  ro_gone_1: "A beam, straight up into the sky. Then nothing.",
  ro_gone_2: "And now Mira's office is full of people asking about an evacuation drill.",
  ro_gone_3: "A drill. Of course. Nobody drills that quietly.",
  ro_gone_4: "The heat's still on, at least.",
  ro_gone_5: "For now. I've filled every bucket I own.",
});
