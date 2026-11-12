// CAMPAIGN-7 (wave 5): chapter 9's evidence and the stop that fails (story/cnline.js, story/zeelift.js KellThread). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  p_service: 'Service door', p_compare: 'Lay the carbon on it', p_stop: 'Throw the stop', p_clip: 'Clip the isolator on',
  n_cn_iso: 'Isolator',

  // ---- the archive's door: Vesk's standing order
  cn_order_0: '(A sheet pinned beside the archive door, in a square, careful hand.)',
  cn_order_1: '"STANDING ORDER. Twinsen of Citadel is not to be admitted to the project\'s records. A stop ordered before the Mill Lane bypass exists cuts that quarter\'s water. I will not have one ordered off a fright. V."',
  cn_order_2: '(Under it, an older brass plate: DELIVERIES BY THE MILL LANE SERVICE LANDING. RING FOR KELL.)',
  cn_tw_order: "Mill Lane. Kell's lift brings their paper up. And Kell said that if I ever needed his lift, it was mine.",
  cn_tw_order_b: "Mill Lane. Kell's lift brings their paper up. I'll ask him.",
  cn_order_again: '"Not to be admitted." Deliveries by the Mill Lane service landing. Ring for Kell.',
  cn_clerk_order: "Standing orders are the project's, not the council's. I only file them. ...Though I notice it says nothing about deliveries.",
  cn_bal_order: "(whispering) His own handwriting, on our council's door. He's frightened of something in there.",

  // ---- Kell
  cn_kell_1: "The archive? I haul its paper up every week. Crates of it, and nobody has ever asked me what's in them.",
  cn_tw_kell: "Vesk's order is on the front door. Is there one on your landing?",
  cn_kell_2: "Not on my landing. The service door's at the top, by the cistern, and it opens on their back gallery. You got my cart up when nobody else would.",
  cn_kell_2b: "Not on my landing. The service door's at the top, by the cistern, and it opens on their back gallery. Twelve years I've carried that paper. If something in it is cracking the island, somebody ought to read it.",
  cn_kell_3: "Step on the deck. I'm coming up with you. The key is on my belt and it stays there.",
  cn_kell_wait: 'Deck first. Step on when she is down.',
  cn_kell_door: "There. Up the steps inside, and you're on their gallery. The archivist does a round below it. He has the ears of a bat.",
  cn_kell_after: "I'll leave it on the latch. If anyone asks, you came with the paper.",
  cn_tw_gallery: 'The back gallery. Below me the archive, and someone walking his round.',

  // ---- the BORE cabinet
  cn_cab_1: "BORE. The master plans, and under them a log: TEST 14, DESERT STATION. Two traces. The drill's, and the ground's.",
  cn_cab_2: 'Clipped to it, a note in the same square hand: "File drill channel only. Reason: a council that reads the ground trace orders a stop. A stop before the bypass cuts Mill Lane\'s water. I will not drain a quarter over noise. V."',
  cn_tw_cab: "Test 14. That was my hand on the cutoff.",
  cn_compare_1: "(He lays Dallan's carbon over the log. Kick, kick, kick, rest. Kick, kick, kick. Line for line.)",
  cn_tw_compare: "The same three kicks after the stop. He had the whole of it, and he cut it out himself.",
  cn_compare_toast: 'The uncut log of test 14, and the order that cut it',
  cn_obj_order: 'Get into the project archive',
  cn_obj_kell: 'Ask Kell at the cistern lift on Mill Lane',
  cn_obj_ride: 'Ride up with Kell to the service door',
  cn_obj_door: 'Go through the service door',
  cn_obj_cab: 'Search the BORE cabinet',
  cn_obj_compare: 'Compare the log with your carbon',
  cn_sub_log: 'The log of test 14',

  // ---- the verdict, in a game with the thread: the council orders the stop
  cn_tw_log: "And this. The log of test 14, uncut, with two traces, and Vesk's order cutting the second one. I ran that test. Here is my own carbon of it.",
  cn_councilC_log: '"I will not drain a quarter over noise." He wrote down his reason. Mill Lane is my ward.',
  cn_chair_stop: "The council has heard enough. By vote of this council, the Joint Project's bore is to be stopped. Now, not when it suits him.",
  cn_councilC_stop: "And if he was right about Mill Lane?",
  cn_chair_stop2: "Then we will know that too. Twinsen, the platform's console takes the council's word. Throw the stop yourself, so nobody says a project hand did it gently.",
  cn_bal_stop: "I'll meet you at the platform. I want to see those needles with my own eyes.",
  cn_obj_stop: "Throw the stop at the platform's console",
  cn_chair_wait: 'The order is given. The console is on the platform.',

  // ---- the platform
  cn_guard_1: "A council order? Then it's the council's lever, not mine. My sister lives on Mill Lane. Mind that.",
  cn_bal_wait: 'Go on. The red one. I am watching the needles.',
  cn_stop_1: '(BORE: the needle drops to nothing. The drill below Citadel winds down.)',
  cn_stop_2: '(GROUND: kick, kick, kick. Rest. Kick, kick, kick. It does not care.)',
  cn_bal_stop1: "The drill's stopped. The kicks haven't. Twinsen, that isn't the drill any more. Something down there keeps the beat on its own.",
  cn_cut_kell: "Power's gone! Brake! Everybody out from under it!",
  cn_cut_brel: '...Nothing. Not a drop. The project valve shuts when the line drops. Safe, they told us.',
  cn_vesk_1: "Twinsen. I see the line has dropped. So has Mill Lane's. I wrote it on your door.",
  cn_vesk_2: "And the ground goes on knocking, as it has for a week. Now the council knows what I knew. Stop wasting my drill.",
  cn_tw_vesk: "You knew both, and you cut one out of the log.",
  cn_bal_stop2: "He's right about one thing: the stop only reached the drill. The bore's own switch is at the bottom of the shaft, behind the blast doors, and they open to a code from every station at once.",
  cn_bal_stop3: "And the lane hangs on the platform's line. Come to my bench. I have something that holds a line steady. One line.",
  cn_obj_bench: "Try Baldino's isolator on the Test Pair bench",
  cn_sub_a: 'On the first relay', cn_sub_b: 'On the second relay',

  // ---- the bench
  cn_bal_bench1: "Listen to my bench. Everything with a wire in it jumps in threes now. The line is loose.",
  cn_bal_bench2: "This is the isolator. It holds whatever it's clipped to, whatever the line does. Clip it to a relay's terminal and watch.",
  cn_iso_a: '(The first relay steadies. Its lamp burns. The one on the hoist still jumps: three and a rest.)',
  cn_iso_b: '(The second relay steadies. The first one starts jumping again.)',
  cn_iso_again: '(Steady where it is clipped. Jumping everywhere else.)',
  cn_bal_iso1: "Held. Now move it to the other one.",
  cn_bal_iso2: 'One isolator, one relay. Never two. I tried. Twice. The second time I lost an eyebrow.',
  cn_tw_iso: "Kell's lift is one relay.",
  cn_bal_iso3: "Then Kell's lift gets it. The feed box on his motor house. Every other station Vesk wired is a relay too, and every one of them will need a hand on it at once.",
  cn_obj_lane: "Clip the isolator on Kell's feed box",
  cn_iso_toast: "Baldino's isolator",
  it_iso: 'Isolator', itd_iso: "Baldino's isolator. It holds one relay steady against a loose line. One.",

  // ---- Mill Lane, dry and back
  cn_lane_kell: 'Half way, with the cart on, and the brake holding. Where have I seen this before?',
  cn_lane_brel: 'Look in my jug. Go on. Air.',
  cn_lane_irsa: 'The bench is dead and the cistern is shut. The chief warned us, in writing. I hate that he was right.',
  cn_lane_clip: '(The isolator snaps onto the feed box. The motor coughs, turns over, holds.)',
  cn_lane_kell2: "She runs! Off the mills, not the platform. Up she goes.",
  cn_lane_brel2: 'Water! Cold, too.',
  cn_lane_kell3: "You stopped it and you started it again. I'll stop asking what the project's doing and ask you.",
  cn_bal_end1: "Kell's running? Good. One relay, one isolator, one friend standing by it. Now multiply.",
  cn_bal_end2: "Every station Vesk wired, held at once, and the code goes down the shaft. A network! Five places, five friends, one signal.",
  cn_tw_end: "Then let's call everybody.",
  cn_kell_late: 'She runs off the mills now. Baldino\'s box is on my feed, and nobody touches it.',
  cn_brel_late: 'Full jug. I check it twice now.',

  // ---- journal
  cn_j_order: "Vesk's standing order closes the project archive to me: a stop before a bypass would cut Mill Lane's water. Its deliveries come up Kell's lift.",
  cn_j_kell: 'Kell took me up his lift to the service door. It opens on the archive\'s back gallery.',
  cn_j_log: "In the BORE cabinet: the uncut log of test 14, the test I ran, and Vesk's note cutting the ground trace, in his own hand. My carbon matches it line for line.",
  cn_j_vote: "After Dallan brought Ilka's rubbings and readings, the council ordered the bore stopped, and sent me to throw the stop myself.",
  cn_j_stop: "The council ordered the bore stopped and I threw the stop. The drill stopped. The kicks did not. Mill Lane lost its water, as Vesk wrote it would.",
  cn_j_iso: "Baldino's isolator holds one relay against the loose line, never two.",
  cn_j_lane: "The isolator on Kell's feed box gave Mill Lane its lift and its water back. Every other station will need the same, all at once.",
});
