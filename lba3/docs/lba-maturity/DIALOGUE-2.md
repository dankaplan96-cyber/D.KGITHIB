# DIALOGUE-2 (status.md P71): the dialogue's second pass, 19.11.2026

Worker: lba-dialogue-editor, branch `worktree-agent-a207d6cab32da00d2` from `ccr-c1c2c4b9-dep6ed` at `6d7bd926`. Brief: the
"Mission of 15.11" in `.claude/agents/lba-dialogue-editor.md` (re-sent by the user 19.11). The first pass is
DIALOGUE-EDIT.md; this pass goes scene by scene through what it left "kept, source only", its remaining items 1-3, and the
text written since 15.11 (the opening's tutorial steps and markers, weapon switching, the arsenal, SPACEPORT-3, chapter 11).

**Evidence labels.** *Source only*: the exchange was read with the code that plays it (story module, its conditions and
order). *Automated runtime*: a test drove the game headless with the edited text. Nobody listened to or played a line.

**References.** The original LBA1/LBA2 text is not on this machine (as in DIALOGUE-EDIT); no original line was read or
quoted. The character guide (STORY_BIBLE.md, the brief's voices) was used.

**Rules kept.** IDs, speakers, placeholders and quest flags unchanged unless a line is listed as new; every changed or new
English line has its Hebrew in `text/he/` (then `node tools/he-bundle.mjs`); voicemeta entries keep one intention per
sentence; `node tests/dialogue-check.mjs` PASS at every commit.

## Tests (Automated runtime: headless Chromium on SwiftShader, this worktree served on 127.0.0.1:8317, a shared machine)

| Test | Result | Notes |
|---|---|---|
| `node tests/dialogue-check.mjs` | PASS at every commit (Hebrew 100 %) | static: keys, speakers, placeholders, voicemeta accents |
| `tests/dialogue-scenes.mjs` | PASS 10/10 | updated for this pass: Zoé's padlock line, and a new pair of scenes for Xil's rope (first meeting with the well seen: the ask and the deal; asked again: no second ask); every line fits its box; capture D5 |
| `tests/dialogue-scenes.mjs ch3` | PASS 3/3 | Baldino's rewritten revelation chain in order, every line fits its box |
| `tests/prologue.mjs` | 23 checks PASS, then FAIL "the well's mites beaten with the ball" twice (all 4 mites killed, Twinsen outside the well room after the test's teleports), which ends the run | the same check DIALOGUE-EDIT and status.md list as random (the test's placement, not text); every dialogue step before it passed (the kettle, Mira's key, the lid, the bell, the stamp, Xil's rope with the new branch, the kids, the stones). The Sendell scene after it was not reached in game: source only |

## Coverage

Status: **edited** (lines or a line's condition changed), **kept** (read in its scene, nothing needed), **flagged**.

| Ch. | Scene | Characters | Status | Evidence |
|---|---|---|---|---|
| 1 | opening film (`op_*`) | resident, worker, Arthur, Twinsen, Zoé | kept (timed subtitles; the lines already short and in character) | Source only |
| 1 | home: Arthur at his boat, the kitchen tap, the cupboard (`prh_*`, `pr_cupboard`, `pr_tw_ballfirst`) | Arthur, Twinsen | kept | Source only |
| 1 | the yard: Zoé's steps (`t2_ask_*`, `t2_back_*`, `t2_hint_*`, `t2_where_*`, `t2_goal_*`) | Zoé | **edited**: the tap step names the garden tap and why (the film's tap was the kitchen's: "Is our tap knocking too?" asked about a tap she had just seen stop); the barrels as Arthur's bet; the pipe line no longer says he "used to" clear a pipe the project laid recently | Source only (opening-tutorial.mjs checks the keys, not the words) |
| 1 | the kettle crystals | Zoé, Twinsen | kept (edited in pass 1) | Source only |
| 1 | the square: Gilbert and Mira, the key, the lid | Gilbert, Mira | **edited** `pr_mira_2b`: she concedes, gives the key, then the waiver, so Gilbert's "And last month too" answers the line before it ("Fine." after her own admission read as the wrong reaction) | Source only |
| 1 | the harbour: Xil, Doran, the bell | Xil, Doran, Twinsen | **edited (branch)**: the objective named "Xil needs Doran's stamp" as the way to a rope, but nobody ever mentioned a rope before Xil handed one over. Once Twinsen has seen the well he now asks for one (`pr_tw_xil_rope`, `pr_xil_rope`, once: flag `pr_xilRope`, optional, false when absent) | Source only |
| 1 | the kids | Tim, Lulu | **edited** `pr_tim_2a`: Tim found the stone "on the beach", two lines later "up on the big rocks at the bay": now the bay rocks in both | Source only |
| 1 | the well's bottom, Sendell | Twinsen, Sendell | kept | Source only |
| 1 | after the prologue (`pr_zoe_after`, `pr_ar_after`) | Zoé, Arthur | unreachable: `endPrologue` goes straight to chapter 2's transition; left in place | Source only |
| 1 | FRESH-EYES pass over chapter 1 | Twinsen, Zoé, Mira, Tim, Sendell | **edited**: `op_tw_2` "the square's well" (the film's link from the tap to the well); `prh_tap_1` "Stopped again… three times, then nothing" (the film showed it run; plants the three knocks later lines call back to); `pr_zoe_kettle2` says Mira has the well padlocked; `pr_locked` "They've gone to the square" (Zoé had just been next door); `pr_mira_no` a reason that survives a look at the dry well (wells go low in a dry month, his pipes leak, no unlocking on a rumour); `pr_tw_tim2` spoken to Tim: "One stone doesn't stop a well" (the red herring cleared); `pr_tw_sendell` says who Sendell is; `pr_obj_done` "Chapter complete" (not "Prologue"); `t2_zoe_done`/`t2_zoe_close` "And be back for dinner" (the epilogue's bookend now set up on the main path) | Source only |
| 1→2 | the chapter's last word | Twinsen | **edited (order)**: the pump thought (`prh_tw_cycle`) no longer follows Sendell's "Someone has reached her."; it opens chapter 2's morning instead (`c1_tw_morning_pump`, for games with the well's v2 scene; older saves keep `c1_tw_morning`) | Source only |
| 2 | the morning, home | Twinsen, Gilbert, Zoé, Arthur | **edited** `c1_zoe_home1` ("didn't come up till morning": he spent the night below and nobody remarked on it) | Source only |
| 2 | Vesk at the harbour | Vesk, Twinsen | **edited** `c1_vesk_4`: why Twinsen and not his crews (all on the bore; he knows the island), and "use my name" with the depot's watch, which the watch then ignores ("Nobody told me") until the station radios: the contrivance becomes Vesk's slip | Source only |
| 2 | the pump room thread (`ct_*`) | Twinsen, Zoé, Arthur, worker | **edited**: `ct_obj_home` "Go home and talk to Zoé" (the step completes on her, not on the tap); `ct_obj_street` "Back home to Zoé" (its marker is the house); `ct_feel_upper` says the heat comes up in the well itself (the square's pipe is cold, its well steams); the rest kept (DIALOGUE-EDIT item 3: read in the scene after P37/P39; the cocks' prompts name their lines, the subs follow the room's order) | Source only |
| 2 | Zoé at home after the water (`c1_zoe_water`) | Zoé | **edited (branch)**: after the pump room she had already said "It runs! Cold, too": new `c1_zoe_water2` ("Cold water from our tap, heat from his post… Ask him about that pipe anyway.") on games with the thread | Source only |
| 2 | the station tour, the gate | Vesk, Twinsen, Zoé | **edited** `c1_tw_tour1` (no "But" against a line that was not an argument); `c1_zoe_gate1` the leaflet's "Marked streets only" (zone A was never paid off; the plan picks up some streets) | Source only |
| 2 | after the radio | Zoé, Doran | **edited (branch)** `c1_zoe_go0` "Find Doran at the harbour" until Doran has been told (she put him at the spaceport while he stood at the harbour); `c1_doran_ferry1` says who grounded the flights; `c1_doran_drones` "Slow is the one thing I can teach you" | Source only |
| 2 | the spaceport (SPACEPORT-3: Ama, Bern, the gate card) and the port people (`rs_ama_*`, `rs_bern_*`, `rs_velo_*`…) | Ama, Bern, Gurt, Lomba, Velo, Pask, Ennu, Oshra | kept (DIALOGUE-EDIT item 2: each line's phase read against `portPhase`; `tm_pilot` is reached only before the errand existed, the counter's own business comes first) | Source only |
| 3 | arrival, Baldino's first scene (`c2_bal_2`…`c2_bal_7`) | Baldino, Twinsen | **edited**: one clear picture each: the shell "like an egg's", something asleep in it, Sendell watching (the "nut" had it backwards); Vesk drills into it for its heat; "run it backwards: push the heat back down, and the bore becomes a patch" (what "reverse" means, said once, and the later "shield" now has a picture); the key's parts; the mills; Zoé waits "not before, or Vesk shuts his platform tight" (why her warning waits for the key). Same six lines, each shorter; the journal `c2_j_bal` says the same | Automated runtime (dialogue-scenes.mjs ch3: the chain in order, every line fits its box) |
| 3 | arrival, the dock guard, the lift (`zt_*`) | Twinsen, guard, Kell | **edited**: `c2_tw_arrive`/`zt_tw_arrive` "Doran says" (Baldino never said where his workshop is); `c2_tw_dock2` "(The depot. Good to know.)"; Kell's three reminders no longer repeat the objective in three beats (`zt_kell_wait*`: his arm on the brake, who holds it if he throws the switch); the rest kept | Source only |
| 3 | Vesk leaves, the sealed shaft | Baldino, Arthur, Zoé, Doran | **edited**: `c2_ship_bal2` gives the reason to wait (his ship is twice as fast; the console hears the bore's channel); `c2_ar_sealed` "Grandpa's radio picks up the project's channel now" (sets up how Arthur hears it); `c2_doran_sealed` "nobody's thought to change my codes" (one line for the heroes riding the project's ship and ferry) | Source only |
| 3 | Nara, Oku, the mills, the lighthouse, Vesk on the platform | Nara, Oku, Zoé, Vesk | kept | Source only |
| 4 | Kesh, the pump, Tarra, Hesk (`c4_*`) | Sani, Brosk, Lumi, Tarra, Hesk | kept, except `c4_hesk_wait` ("No rope, no ride. There's a coil on the pier, stranger.": the three-beat reminder in his voice) | Source only |
| 4 | Ilka's camp | Ilka, Twinsen | **edited**: `c4_ilka_2` reacts to Baldino's name ("He still writes to me. In capitals."); `c4_ilka_4` says what the Temple of Bù is ("the old god's house") | Source only |
| 4 | the post's memo, the bore test (`dt_*`) | Dallan, Vesk (wire), Twinsen | **edited**: the memo ("Run test 14, then cap it", also on the cabin's desk `ih_post_cabin0_dry`) no longer says "Keep drilling" against Dallan's "stays capped"; Dallan's two reminders in his voice (`dt_dallan_wait`, `_wait2`); the test scene kept | Source only |
| 4 | the dig, the seals, the carving, Dallan | Ilka, Dallan, Twinsen | **edited**: `c4_tw_d1` (he has the plan back: "You've seen Vesk's evacuation plan, Dallan."); the vent: `c4_ilka_end`, `c4_j_dallan`, `c5_ilka_1` say the vent "comes up under" the capped test bore (one thing, the shell's vent; the bore sits on it), not that the vent *is* the bore | Source only |
| 5 | the plan, the requisition, the hall, the relief valve (`c5_*`, `dt_w5_*`) | Ilka, Hesk, Tarra, Dallan, Doran, Brosk, Vesk (wire) | **edited** `c5_trader_wait` (Brosk, not a three-beat objective); the gate exchange plays once (`digtest.js` replaces `steam.js`'s in new games: the near-duplicate `dt_tw_gate2`/`c5_tw_gate1` is never heard twice); rest kept | Source only |
| 5 | the radio, the glider | Ilka, Zoé, Hesk, Dallan | **edited** `c5_ilka_radio` ("I've told her about the carving", not sent a carving by radio); `c5_hesk_k1` "if the wind likes us"; `c5_zoe_radio1` "Gilbert's charts" kept (STORY-FIX's decision) | Source only |
| 6 | the landing, the gorge, Lhar, Pim, the sword, the lift, the line (`c6_*`, `ps_*`) | Hesk, Yorna, Pim, Tashi, Dawa, Norbu | kept (`ps_read_2`'s "the kitchen wall knocked like that" now has its three in `prh_tap_1`) | Source only |
| 7 | the observatory, the mirrors, the fourth setting (`c7_*`, `ob_*`) | Sefa, Yorna | **edited** `ob_keeper_wait` (Sefa's courtesy, not a two-beat order); rest kept | Source only |
| 7 | Sendell in the dome | Twinsen, Sendell | **edited** `c7_tw_s1` "Is it true? Is the shell cracking?" (he was briefing a goddess on her own news); her answer begins "Yes." | Source only |
| 7 | Arthur's call | Arthur, Twinsen | **edited** `c7_arthur_2` "Grandpa Gilbert's not on it" (Arthur's own name for him, as everywhere else) | Source only |
| 8 | home, Gilbert's tunnels, Mira, Pippa, the shelters (`c8_*`) | Zoé, Arthur, Gilbert, Mira, Pippa | **edited** `c8_gil_3`: the fort's guards went down to the spaceport queue, "so nobody's on the gate" (chapter 3 left the station gate shut and guarded; Twinsen now walks in with a reason); `c8_tw_z2` no longer recaps the whole errand to Zoé | Source only |
| 8 | the farms, the lighthouse | Zoé, Joss, Bryn, Grull | **edited** `c8_zoe_lh2` quieter (no exclamations announcing a plot point); rest kept | Source only |
| 8 | Vesk on the control room's screen | Vesk, Twinsen, Zoé | **edited** `c8_vesk_1` names the vents (Desert Island, the Hamalayi), not "FunFrock's old vents" (they are older than FunFrock); `c8_tw_c2` "list or no list" | Source only |
| 8 | the lane thread (`ev_*`, laneline.js) | Bram, Hedda, Tobin, Zoé | kept (STORY-FIX 2 settled the cart) | Source only |
| 9 | Baldino, the petition, Nara, Oku, the clerk (`c9_*`) | Baldino, Nara, Oku, Ottavo | **edited** `c9_tw_n1`: what a crack does, said as the story knows it (what sleeps under it wakes too soon; nobody knows what that does to two worlds' heat), not "the cold comes in" | Source only |
| 9 | the council, the archive, Kell's way in, Dallan (`c9_*`, `cn_*`) | Amaru, Sela, Brum, Dallan, Kell, archivist | **edited**: `c9_dallan_2` "Hesk flew me to Citadel" (a glider cannot reach Zeelich); `c9_dallan_3` "I ran that dig… its guards answered to me" (foreman, not security; STORY-FIX 1); `cn_tw_log` "I pulled the cutoff on that test" | Source only |
| 9 | the council's stop (`cn_chair_stop`, `cn_bal_stop`) and Vesk's refusal in chapter 2 (`c1_conf_vesk4`) | Amaru, Baldino, Vesk | **edited** to hold the game's own rule: Vesk's danger is *backing the bore out* halfway ("Backing it out now would crack it faster"), Baldino's in chapter 3 is pulling it out; the chair says why the council orders a stop and not a reversal (a reversal needs the project's engineers; a stop needs only their vote); Baldino says the danger aloud ("Stopped, not reversed. Well. A drill held still is not a drill pulled out.") The rest of the conflict is a story item (S-1) | Source only |
| 10 | Borrowed Time: Mira's call, the valve room, Oren, the shelter (`og_*`) | Mira, Oren, Gilbert, Tim, Lulu, Zoé, Arthur | **edited**: Twinsen reacts to the voice in the pipes ("Thank you, Oren. Whatever you are."); `og_oren_3` "On Ballastra, a long way from you" (the place's first mention says it is far); the four objectives lose their stray full stops | Source only |
| 10 | the B-7: Zoé in the project office, the fitting, Vesk on the wire (`th_*`) | Zoé, guard, Gilbert, Oren, Vesk | **edited** `th_guard_1` (no longer contradicts Zoé's "By the door, this time": "The last visitor I had in here said she was looking for the washroom", the chapter-2 excuse); rest kept (Vesk's "A station that can say no…" protected) | Source only |
| 11 | Ballastra (team-only): the freighter, Quill, the lift, Tessa, the gardens, Halden, the pump room, Dunn, the Steps (`bl_*`) | Tessa, Quill, Hobb, Ferro, Wenna, Corvin, Halden, Mags, Dunn, Oren, Doran, Baldino | **edited**: Twinsen reacts to Oren's 304 sleepers (new `bl_tw_or3`: "Their families are on that row, Oren. I'll be back for them."; the payoff is chapter 12's, S-4); "four days" and "thirty-four years" kept where they first land, cut from the repeats (`bl_te_done`, `bl_te_met`, `bl_fe_after`, `bl_du_1`, `bl_du_2`); the network's count "Five to start", not "Forty" (`bl_tw_s3`, `bl_te_s4`); Hobb's reminder in his voice | Source only |
| 14 | the Network: Baldino's plan, the pulse tool (`c10_bal_*`) | Baldino | **edited**: "Five stations, five friends, one minute" first, then one picture a line (the relays talk through each station's machine; each runs on what is there; one minute, a friend by each); the "test pair" (an optional workshop toy) no longer assumed; the pulse tool in two short lines | Source only |
| 14 | the stations (`c10_*`, `nw_*`) | Oku, Mira, Zoé, Arthur, Ilka, Dallan, Yorna, Pim, Sefa, Irsa | **edited**: `c10_ilka_w2` introduces "one of FunFrock's old clone soldiers… They take orders from nobody alive" (Twinsen's later "the clone" now has its antecedent, and they are not "Vesk's men"); `c10_dallan_1` "running this bore" (foreman); `c10_dallan_stand` "The council speaks for the project now" (true whether the council ordered a stop or a reversal); `nw_bal_ar` says what the fourth knock means ("Something down there has started answering. Three is the shell; that little fourth isn't."); `nw_ar_mic` "Station ready" from home kept (Zoé gave him the kitchen pipe: his station) | Source only |
| 15 | the shaft, the machinery, Sendell (`c3_*`, `sh_*`) | Twinsen, Baldino, Sendell | **edited**: `c3_arrive_stop` (new): after the council's stop, "the bore is turning again: the council's stop never reached this console" (it "ground on" with no word after Twinsen stopped it); the knock language stated once and kept: `sh_two` "The three is the shell, as it's knocked since our kitchen tap. The two come from that damper. Something down here is answering it."; `sh_k3` "I knock three, like the shell, and she answers two."; `c7_sendell_4` "you will know her" (nothing at the bottom shows her: the promise is kept by her answer, not a sight) | Source only |
| 16 | the core: Vesk, the pylons, the overload, the end (`c3_*`, `co_*`) | Vesk, Zoé, Mira, Oku, Ilka, Pim, Baldino, Irsa, Arthur, guard | **edited**: `c3_core_vesk2` keeps his logic ("It was everyone I could carry. You chose everyone, Twinsen, and you'll lose them all.") instead of a late turn to greed (journal `c3_j_core` with it); the signal's order is the network channel's, "Star, sun, wave" (`c3_pylon_1`, `co_zoe_sig`); the protected lines kept (`co_ar_two`, `co_vesk_guard`/`co_guard_2`) | Source only |
| Epilogue | dinner, free roam (`ep_*`, `idle_*_home`) | family, everyone | **edited**: Kell and Irsa get closing lines (`zt_kell_home`, `zt_irsa_home`, new: the lane on its own switch; the strip taken down from over her bench); the dinner bookend's set-up now on the main path (`t2_zoe_done`); rest kept | Source only |
| Side | One More Place, Off the Wall, Twelve Years Late, The Last Ferry, The Quiet Channel, Depth (`om_`, `ow_`, `tyl_`, `lf_`, `qc_`, `dx_`) | Brix, Tali, Ysel, Lissa, Ossel, the brothers, Jaspa | **edited** `tyl_ysel_3` "My daughter Nara" (the journal said so; no line did); rest kept (`om_m_council_4` "Grandpa Gilbert" is Arthur's line; `om_zoe_2` "lived next door, until he moved up the lane" explains the new neighbours) | Source only |
| Residents | walkers, story places, interiors (`rs_*`) | Tilde, the Zeelich clerk, Gunda | **edited** three of the nine "...Twice." endings (`rs_tilde_1`, `rs_zc_clerk_1`, `rs_gunda_work`); the rest kept where the count is the speaker's own (Arthur, Tobin, Bram, Baldino's eyebrow) | Source only |
| Residents | `deeplife`, `sewers`, `hostel`, `kesh` conditions (DIALOGUE-EDIT item 1) | crews under the shell, Fosse, Bersimon, the hostel, Kesh | read: deeplife's lines go by its explicit phases (shell / core / home), sewers' by their own flags; hostel and Kesh were fixed by STORY-FIX 4; nothing heard in the wrong state found | Source only |
| Post-15.11 | the opening's steps and markers (`t2_*`, TUTOR-TARGETS) | Zoé | **edited** (chapter 1 above); `t2_where_*`, `t2_n_*`, `t2_goal_*` kept (literal, no keys spoken) | Source only |
| Post-15.11 | weapon switching (`ws_*`, `tut_wswitch*`, `tut_pset_*`), the pocket set and the lance (`e2_*`) | Arthur, Bram | kept (tips literal; Arthur explaining his own invention is his character) | Source only |
| Post-15.11 | the arsenal (`a_*`) | Nara, Hougo, Bersimon, Ker'aooc, Baldino, Arthur | **edited** `a_jet_hint` (Baldino's comparison read backwards: "Hesk gets you between islands; this gets you up the last storey"); rest kept | Source only |
| Post-15.11 | SPACEPORT-3 (`c1_doran_form`, `c1_ama_*`, `c1_bern_*`, `c1_gate_form`) | Doran, Ama, Bern | kept (one exchange each; the user's own request) | Source only |

## Before / after (a selection, in context)

| Where (who, to whom, when) | Before | After | Why |
|---|---|---|---|
| Ch. 1, the yard: Zoé, after the crystals; the film showed her at the kitchen tap | "Is our tap knocking too? Try it." | "Try the garden tap. If that's dry too, it isn't just our kitchen." | which tap, and why it matters |
| Ch. 1, the yard: Zoé, the pipe step | "And the project's pipe? You used to clear it at a run." | "And the project's pipe. You used to clear fences twice that high at a run." | the pipe is new; the tease is about him |
| Ch. 1, the square: Mira, shown the crystals | "Fine. Find the fault and I'll waive his bill this month. Here's the key to the lid." | "All right, it's the well. Here's the key to the lid. Find the fault and I'll waive his bill this month." | Gilbert's "And last month too" now answers the waiver |
| Ch. 1, the harbour: Xil, Twinsen has seen the well | (no rope mentioned; Xil hands one over after the stamp) | Twinsen: "I need a rope for the town well. Is there any on that barge?" Xil: "Rope ladders, a whole crate. Wake that man, bring me my stamp, and one is yours." | the objective's deal is now said |
| Ch. 1, the square: Mira, before the crystals, at a visibly dry well | "It isn't the well, Twinsen. It's the old pipes on his street. I don't unlock the town well for a pipe fault." | "Wells go low in a dry month, Twinsen, and his street's pipes leak. I don't unlock the town well on a rumour." | a refusal that survives a look at the well |
| Ch. 2, Vesk at the harbour, sending Twinsen to the valves | "…And mind the depot: drones, a guard and his dog, and nobody has told them about you. Stay out of sight." | "…My crews are all on the bore, and you know this island better than they do. The depot's watch may not have heard of you yet: use my name, and keep clear of the dog." | why he sends Twinsen; the guard's "Nobody told me" becomes Vesk's slip, not the writer's |
| Ch. 3, Baldino's revelation | "Twinsun sits inside a shell, like a nut. Beneath the shell sleeps the being Sendell watches over." … "It has to be reversed" | "Deep under Twinsun there's a shell, like an egg's, and something sleeps inside it." … "Run it backwards instead: push the heat back down, and the bore becomes a patch." | the game's central idea as one picture |
| Ch. 3, Arthur on the radio | "Dad? It's Arthur, on the project's channel." | "Dad? It's Arthur. Grandpa's radio picks up the project's channel now." | how a boy in a kitchen hears the project |
| Ch. 9, the council orders a stop (a game with the thread) | "The council has heard enough. By vote of this council, the Joint Project's bore is to be stopped." Baldino: "I'll meet you at the platform. I want to see those needles with my own eyes." | "...A reversal needs the project's own engineers; a stop needs only our vote. By vote of this council..." Baldino: "Stopped, not reversed. Well. A drill held still is not a drill pulled out. I'll meet you at the platform, and I'll watch those needles very closely." | the game's own rule said aloud where it is tested |
| Ch. 14, Arthur's count reaches Baldino | "Then I time the code to the rest after four. If the boy counted right." | "Then something down there has started answering. Three is the shell; that little fourth isn't. I'll time the code to the rest after four, if the boy counted right." | what the change in the knocking means, once |
| Ch. 16, Vesk at the core | "Thirty percent was never a mistake. It's who I chose. Zeelich's upper districts will never be cold again, and the rest will learn to live with less." | "Thirty percent was never a mistake. It was everyone I could carry. You chose everyone, Twinsen, and you'll lose them all." | the pragmatist of chapters 3, 9 and 10, not a late turn to greed |
| Ch. 10, the guard at the project office; Zoé is back "by the door, this time" | "You again. Last time you came in by that door too, and I never saw you." | "Evacuation committee, is it? The last visitor I had in here said she was looking for the washroom." | no contradiction, and chapter 2's excuse comes back |

## FRESH-EYES findings and what was done

Report: `docs/lba-maturity/FRESH-EYES.md` (19.11, on `ccr-c1c2c4b9-dep6ed`). The reader saw text only, so each finding
was weighed in its scene. Section numbers are the report's.

| § | Finding (keys) | Weight | Done |
|---|---|---|---|
| 3 | `op_tw_2` "the well" from nowhere | real | **fixed**: "I'll check the square's well." |
| 3 | `op_zoe_3` warm vs `prh_tap_1` "not a drop" | real (minor) | **fixed**: "(Stopped again…)", and the knock counted three (the later "the kitchen wall knocked like that" now has its three) |
| 3 | `t2_ask_pipe` "used to clear it" | real | **fixed** |
| 3 | `t2_ask_tap` "too" | real | **fixed**: names the garden tap and why |
| 3 | `pr_zoe_kettle2` Mira, Gilbert bare names | partly: Zoé speaks to her husband, who knows them; the player needs the padlock | **fixed**: "Mira's got the well padlocked" |
| 3 | `pr_locked` neighbours "out" right after Zoé's visit | real | **fixed**: "They've gone to the square, like everyone else." |
| 3 | `t2_goal_inv` nothing comes of looking | kept: the item text (`itd_kettle` "furred since breakfast. Still warm.") is what he reads; the step teaches the key |
| 4.1 | `pr_mira_no` refusal at a dry well | real | **fixed** (see the before/after) |
| 4.1 | `pr_mira_2b` "Fine" / "his bill" | partly: Gilbert stands in the row when the crystals are shown | **fixed** (order: concede, key, waiver) |
| 4.1 | Xil's rope never spoken | real | **fixed** (new lines, once, after the well is seen; in game) |
| 4.1 | the film's project barge vs Xil's barge waiting for a stamp | kept: the film's lift unloads the project's own barge; Xil's is a trader's ("for the project" as its buyer); no wording needed |
| 4.1 | `pr_tim_2b` red herring never cleared | real | **fixed**: `pr_tw_tim2` spoken to Tim, "One stone doesn't stop a well, Tim." |
| 4.1 | `prh_tw_cycle` ends chapter 1 on a pump after Sendell | real | **fixed (order)**: the thought opens chapter 2 (`c1_tw_morning_pump`) |
| 4.2 | Sendell never introduced | real | **fixed** at her first word: `pr_tw_sendell` "(Sendell. Twinsun's goddess. Twelve years, and not a word from her until now.)"; a caption over the film is a story/film decision (story item S-7) |
| 4.2 | `pr_obj_done` "Prologue complete" | real | **fixed**: "Chapter complete" |
| 4.3 | "Grandpa Gilbert" vs "Gilbert" | decided by STORY-FIX: Arthur's name for the old neighbour | Arthur's own lines checked as reached (ch. 7 below); Zoé uses it only to Arthur |
| 5.1 | `c1_gil_morning`/`c1_zoe_home1` the night below | real (minor) | **fixed**: Zoé "didn't come up till morning" |
| 5.1 | `c1_vesk_3/4` Vesk sends a civilian past his own guards | real | **fixed** by wording (see the before/after) |
| 5.1 | `c1_zoe_go` Doran "at the spaceport" | real | **fixed (branch)** `c1_zoe_go0` |
| 5.1 | the beam pad, his ship, the ferry, the project ship | partly: the pad and the beam are on screen in the scene | kept; S-6 lists the vehicles for a naming pass |
| 5.1 | why the flights are grounded | real | **fixed** in `c1_doran_ferry1` ("The project's grounded the passenger flights, but its own ships still fly.") |
| 5.1 | why Doran gets the start code | kept: his "Doran can sail anything that floats" is the answer the scene wants; no invented backstory |
| 5.1 | `ct_feel_upper` cold pipe vs a steaming well | real | **fixed**: "so the heat comes up in the well itself" (the well's bottom is where chapter 1 found it warm) |
| 5.1 | `c1_tw_tour1b`→`c1_tw_tour1` "But" | real | **fixed** |
| 5.2 | `c1_valve_depot` "the old camp" | kept (a place on the holomap with its marker) |
| 5.2 | `c1_doran_drones` "Slow, I can teach" | real | **fixed** |
| 5.2 | `c1_zoe_gate1` zone A never paid off | real | **fixed**: "Marked streets only." (the plan's pick-up points) |
| 5.2 | `c1_obj_confront` the beam pad first named in an objective | kept (the pad is on screen in the station yard; S-6) |
| 5.3 | the flight-form errand is friction | kept: the user's own request (SPACEPORT-3, P62); its lines are one exchange each |
| 6 | `c2_tw_arrive` Baldino never said where | real | **fixed** ("Doran says") |
| 6 | `c2_bal_2` nut backwards; `c2_bal_4` "reversed" unexplained; six lines of lecture | real | **fixed**: egg, patch, one picture per line, shorter (in game) |
| 6 | `c2_bal_7` Zoé's warning waits for the key | real | **fixed**: the reason said |
| 6 | `c2_tw_dock2` stiff | real | **fixed** |
| 6 | `c2_ship_bal2` waiting hours while Vesk flies off | real | **fixed**: the reason said (his ship is faster; the console will tell them) |
| 6 | `c2_ar_sealed` Arthur on the project's channel | real | **fixed** |
| 6 | the heroes ride the project's ship/ferry/freighter | real, recurring | **fixed** once in `c2_doran_sealed` ("nobody's thought to change my codes"); later uses checked in their chapters |
| 6 | three mechanisms in one chapter (shield, key, network code) | story pacing | kept; listed as S-2 with the concepts |
| 7 | `c4_dallan_note` "Keep drilling" vs `c4_dallan_2` "stays capped" | real | **fixed** (the memo: run test 14, then cap it) |
| 7 | "vents" three things (`c4_ilka_c1`, `c4_ilka_end`, `c8_vesk_1`) | real | **fixed** in chapter 4/5 wording (the vent comes up under the bore); `c8_vesk_1` in chapter 8 |
| 7 | `c4_tw_ilka1` Ilka doesn't react to Baldino | real (minor) | **fixed** |
| 7 | `c4_ilka_4` Bù, Temple-Park unexplained | real (minor) | **fixed** ("the old god's house") |
| 7 | `c4_tw_d1` reads as if he lost the plan | real | **fixed** |
| 7 | `c4_arrive` / `c5_doran_1` Doran's ferry | kept: chapter 4's arrival has him take over the project's ferry, and chapter 5's "I'm the one who sails it!" follows from that |
| 8 | `c5_trader_1` a fetch inside a fetch | kept (Brosk's "Business is business" is the scene); his reminder rewritten |
| 8 | `c5_zoe_radio1` Gilbert's charts never set up | kept: STORY-FIX chose the wording; a set-up line is S-8 |
| 8 | `c5_ilka_radio` a carving sent by radio | real | **fixed** |
| 8 | `c5_hesk_k1` glider to the mountains | real (minor) | **fixed** ("if the wind likes us") |
| 8 | Doran leaves the story after chapter 5 | kept: noted for the campaign (S-6) |
| 8 | `dt_tw_gate2` duplicates `c5_tw_gate1` | checked: only one of the two chains plays in a game |
| 9 | `c7_sendell_4` "you will see her" never paid off | real | see chapter 12 below |
| 9 | `c7_tw_s1` Twinsen briefing a goddess | real | **fixed** |
| 9 | `ps_read_2` the kitchen's three knocks applied backwards | real | **fixed** at the source (`prh_tap_1` counts three) |
| 9 | `c7_arthur_2` "Gilbert" from Arthur | real | **fixed** ("Grandpa Gilbert") |
| 10 | the sealed, guarded fortress walked into in chapter 8 | real | **fixed** in `c8_gil_3` (the guards went to the spaceport queue) |
| 10 | `c8_zoe_lh2` a plot point announced | real (minor) | **fixed** (quieter; the beat is lh3's "So when I broadcast, the council heard me") |
| 10 | `c8_vesk_1` "FunFrock's old vents" | real | **fixed** |
| 10 | `c8_tw_c2` boarding without the list | real (minor) | **fixed** ("list or no list"; chapter 9's arrival shows nobody checks) |
| 10 | `c8_tw_z2` recap | real (minor) | **fixed** |
| 11 | council orders the bore *stopped* against the rule | real, the biggest | **partly fixed by wording** (see coverage row); the rule itself (the bible's "Stopping the drill now would crack the shell anyway") and the finale's "grinds on" are S-1 |
| 11 | `cn_tw_log` "I ran that test" | real (minor) | **fixed** |
| 11 | `cn_order_1` Vesk's reasons on a public notice | kept: it is the clue, and it is Vesk (he writes his reasons down; the note in the cabinet says the same) |
| 11 | `c9_tw_n1` "The cold comes in" | real | **fixed** |
| 11 | `c9_dallan_2` Hesk's glider to Zeelich | real | **fixed** |
| 11 | `c9_dallan_2/3` foreman or security | real | **fixed** |
| 12 | `og_mira_office2` "since the stop" | follows chapter 9 (now argued there) | kept |
| 12 | Oren and Ballastra never introduced; nobody asks what he is | real | **fixed** by reaction (`og_tw_o3`, `og_oren_3`); what Oren *is* is the expansion's (S-4) |
| 12 | `th_zoe_r2` vs `th_guard_1` | real | **fixed** |
| 12 | plumbing jargon in the objectives | kept: the objectives name the parts the prompts name (band, feed, flanges); literal on purpose |
| 12 | the three-day deadline dropped | real, story | S-3 |
| 13 | `bl_or_2/3` 304 children, no reaction | real | **fixed** (a reaction and a promise); the payoff is S-4 |
| 13 | House of Balances, coils, Tessa's box never paid off | real, story (chapters 12-13 unwritten) | S-4 |
| 13 | chapter cards 11 → 14 | real, story/UI (`story/index.js` NUMBER) | S-5 (not dialogue; not changed here) |
| 13 | `bl_doran_1` how is Doran here | kept: he flies the council's freighter from Citadel; his chapter-8 absence is S-6 |
| 13 | "thirty-four years" ×5, "four days" ×6 | real | **fixed** (kept where each first lands) |
| 13 | "Forty" vs five stations | real | **fixed** ("Five to start") |
| 13 | `th_bal_end1` vs chapter 14 re-explaining | checked: the expanded campaign plays `th_bal_exp1` instead; chapter 14's opening is edited below |
| 14 | `c10_bal_1`-`4` a lecture | real | **fixed** (shorter, one picture a line; "Five stations, five friends, one minute" leads) |
| 14 | `c10_bal_2` the test pair | real (minor) | **fixed** (removed) |
| 14 | Vesk's men or FunFrock's machines; "the clone" | real | **fixed** in `c10_ilka_w2` |
| 14 | `nw_ar_2` four knocks, nobody says what it means | real | **fixed** in `nw_bal_ar` |
| 14 | `nw_ar_mic` "Station ready" from the kitchen | kept: Zoé's line before it gives him the kitchen pipe as his job; the dial's chalk in the epilogue pays it off |
| 15 | `c3_arrive` the bore "grinds on" after the stop | real | **fixed** (`c3_arrive_stop` when the stop was thrown) |
| 15 | `co_tw_lane` Mill Lane's thread fragile | kept (the chapter-14 lane hand-off and the core's branch are the same thread, said by Irsa on the radio) |
| 15 | knock language unreadable | real | **fixed** by stating it once (`sh_two`, `sh_k3`, `nw_bal_ar`); the rest of the lines keep that vocabulary |
| 15 | `c3_core_vesk2` motive flips | real | **fixed** |
| 15 | `c3_vesk_over1` "ten years" vs a new project | kept: Irsa's "ten years" on Zeelich agrees; the project is new on Citadel, not on Zeelich. S-6 lists a line saying so |
| 15 | `c3_pylon_1` "Sun, wave, star" after the star moved first | real | **fixed** (and `co_zoe_sig`) |
| 15 | `c3_sendell_2` the reveal in one line; `c7_sendell_4` "see her" | partly | **fixed** the promise ("know her"); a visual of the child would be new art (S-7) |
| 15 | `ep_zoe_1` bookend never set up | real | **fixed** (`t2_zoe_done`, `t2_zoe_close`) |
| 15 | `ep_end_text` "shield" without a picture | **fixed** upstream: chapter 3 now says what the shield is (the bore run backwards, pushing the heat back down) |
| 15 | the epilogue misses Irsa, Kell, Ballastra | real | **fixed** for Irsa and Kell; Ballastra's closing belongs to its unwritten chapters (S-4) |
| 15b | `om_m_council_4` "Grandpa Gilbert"; `om_zoe_2` "lived next door" | kept: Arthur's name for him (STORY-FIX); Brix "moved up the lane", so the kettle's neighbours are newer |
| 15b | `tyl_j_found` Ysel is Nara's mother, said by no one | real | **fixed** (`tyl_ysel_3`) |
| 15b | `lf_ossel_grounded` explains the grounding only in a side quest | real | **fixed** on the main path (`c1_doran_ferry1`) |
| 15b | the Quiet Channel's fourth rhythm | kept: it is the side quest's own code (a knock answered backwards), and the main path now names its counts plainly |
| 16 | one clipped voice for the side cast | real | **fixed** in the reminders where it was worst (Kell x3, Hesk, Dallan x2, Brosk, Sefa, Hobb); Tessa keeps hers (her character); Irsa and the Esmer keep their uncontracted speech (Zeelich's register) |
| 16 | repeated tics ("Twice." x9, "four days" x6, "thirty-four years" x5) | real | **fixed** (kept where each lands first or belongs to the speaker) |
| 16 | Twinsen narrates the screen | partly: many brackets are his reactions ("Somebody eats lunch down here") | kept where they react; recaps cut where he told people what they knew (`c8_tw_z2`, `c7_tw_s1`) |
| 16 | Mira's report gag, Gilbert's refund | works | kept, no new uses |
| 16 | lore for newcomers (Sendell, FunFrock, the Esmer, clones) | real | **fixed** where it bites: Sendell at her first word, the clones at their first appearance, Bu's temple at the dig; an opening caption is S-7 |
| 16 | cast size in chapter 1 | partly | the plot names now come with their job (Mira's padlock, Xil's rope); ambient residents kept |


## Story contradictions for a separate repair

For the campaign director / narrative owner. Wording was changed where it helped (listed above); none was invented away.

| # | Contradiction (keys) | What the wording now does | Proposed repair |
|---|---|---|---|
| S-1 | **The bore's rule vs the council's stop.** STORY_BIBLE: "Stopping the drill now would crack the shell anyway"; the thread's council orders a stop (`cn_chair_stop`), Twinsen throws it (`cn_stop_1`); the core's `co_lock_ok` winds the drill down again; `c3_sendell_3` "Stopping it will not close the cracks" | Vesk's danger is now *backing out* (`c1_conf_vesk4`), Baldino's *pulling out halfway* (`c2_bal_4`); the chair says why a stop and not a reversal; Baldino worries aloud; chapter 15 says the bore was restarted below (`c3_arrive_stop`) | Decide the rule once: a stop holds the drill (survivable for days, the shell still strained), backing out cracks it, only reversal heals. Update the bible's sentence; then `c3_sendell_3` and `cn_bal_stop2` can say "held, not healed". **Done (P83, 20.11):** the bible's sentence (and chapter 3's "stopping halfway") states the rule; `c3_sendell_3`, `c3_j_sendell`, `cn_bal_stop2` and `co_lock_ok` say held, not healed; `c3_arrive_stop` already agrees (Vesk restarted the drill below the council's stop), unchanged |
| S-2 | **Three mechanisms in chapter 3** (the shield, the override key, the network code), a fourth in chapter 14 (relays) | each now has one picture (`c2_bal_4`, `c10_bal_1-3`) | a journal "what we know" page per chapter, or fold the override key into the shield. **Done (P83, 20.11):** one "What we know" line at the top of every chapter's journal page (`know_<chapter key>`, text/common.js; story/index.js `KNOW`/`knows()`), shown once the chapter has shown its mechanism and always on a chapter behind us. Chapter 3's line changes once the shaft is sealed (`know_zeelich` → `know_zeelich_done`: the override key gives way to the network code); chapter 9 has `know_council` (the stop) and `know_council_b` (a save without the thread). The epilogue has none |
| S-3 | **The three-day deadline** (`c8_vesk_1`, `c8_tw_c1`, `c9_tw_arrive`, `c9_tw_b1`) is dropped after chapter 9; chapters 10-11 spend days away | none | after the stop, say the clock moved ("The stop bought us some days."), or keep the deadline only in the base campaign. **Done (P83, 20.11):** `cn_tw_days` (new, Twinsen, after `cn_bal_stop2` in the platform's chain, both campaigns): "The drill isn't going deeper, at least. The stop bought us some days." The journal's `know_council` says it too; `c3_arrive_stop` restarts the clock (Vesk turned the drill again below) |
| S-4 | **Ballastra's open threads** (team-only): Oren's 304 sleepers (`bl_or_2/3`), the House of Balances and the coils (`bl_te_end2`, `bl_ba_1`), Tessa's box (`bl_te_end4`), what Oren is | Twinsen now reacts and promises to come back (`bl_tw_or3`) | chapters 12-13 (EXP-PLAN-2 3.3-3.4) pay them off; until then consider cutting the number (keep "the young ones sleep") |
| S-5 | **Chapter cards 11 -> 14** (story/index.js `NUMBER`) while 12-13 are shells | not dialogue | number the cards from the chapters that play in this build |
| S-6 | **The project's vehicles** (the ferry, Vesk's ship and beam pad, the project ship, the freighter) never told apart, and the heroes ride them; Doran gone after chapter 5; the project's age (new on Citadel, "ten years" on Zeelich: `c3_vesk_over1`, `zt_irsa_later`) | one line covers the riding (`c2_doran_sealed`); "ten years" is consistent on Zeelich | one naming line in chapter 2 ("his ship's up in orbit; the ferry's for the islands"); one line that Zeelich's half of the project is ten years old. **Done (P83, 20.11), items 1-2 of this row only:** `c1_doran_ships` (new, Doran, between `c1_tw_ferry` and `c1_doran_ferry2`) names the ferry, Vesk's ship and beam, and the project's ship; `c2_nara_2` now says the project has been on Zeelich ten years and the drill on Twinsun is new; the bible's established facts record both. The freighter and Doran's absence after chapter 5 are not touched |
| S-7 | **Newcomer lore**: Sendell, FunFrock, the Esmer, Bu, the clones; the child under the shell is never seen | named at first use where it matters (`pr_tw_sendell`, `c4_ilka_4`, `c10_ilka_w2`); Sendell's promise is now "you will know her" | a two-line caption over the film (the old `pr_intro_1/2` cut down); a visual of the child at the core if art allows. **Done (P83, 20.11), the caption only:** `op_cap_lore` / `op_cap_lore_sub` (new), the film's second caption over the island (story/opening.js `caps`: 7.0-13.8 s; the first caption now 1.6-6.6 s, was 1.6-8.6), "Sendell, Twinsun's goddess, chose Twinsen to stop the tyrant FunFrock." / "FunFrock is dead. His clones never got the message." The film's length and every other event are unchanged; not seen in a browser here |
| S-8 | **Gilbert's charts** (`c5_zoe_radio1`): why the man with the water bill has survey charts | kept (STORY-FIX's wording) | one line in chapter 2 or 8 (he carried the buckets for FunFrock's tunnels: the charts could be from then) |
| S-9 | **Vesk's valves errand** (`c1_vesk_3/4`) | now his choice and his slip (crews on the bore; "use my name", which the watch ignores) | fine as is unless the director wants Vesk's motive (keep Twinsen busy) said by someone later |

## Resume point

Done: every chapter 1-16 in order, the epilogue, the side quests, the residents' conditions and the post-15.11 texts
(source only, except the scenes in the test table). If another pass continues: (1) S-1 to S-9 with the campaign director;
(2) in-game checks not run here: `tests/opening-tutorial.mjs` (the tap step's new line), `tests/chapter9.mjs` with the
council thread, `tests/chapter11.mjs` (`c3_arrive_stop`), `tests/exp-ballastra.mjs` (`bl_tw_or3` added to Oren's chain),
`tests/prologue.mjs` past the well's mites (the Sendell chain is one line shorter); (3) residents not re-read line by line
this pass: `zeelife`, `ihomes`, `islandpeople`, `isleslife`, `hamlife`, `desertlife` (read in pass 1).
