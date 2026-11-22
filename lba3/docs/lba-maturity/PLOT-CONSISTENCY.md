# PLOT-CONSISTENCY (22.11.2026): contradictions in the plot, opening to epilogue

The user (22.11): "make sure there are no contradictions in the plot." Worker branch from `ccr-c1c2c4b9-dep6ed` @ `bfbc679b`.
Rules kept: the smallest change in character (a line or its gate, never a scene); every changed or new English line has
its Hebrew (`src/game/text/he/<file>.js`, `node tools/he-bundle.mjs`); no save flag renamed or added; a changed gate is
computed from the chapter, so an old save lands in the corrected state on load.

**Spoilers:** every item past chapter 2 is tagged **[>ch2]**. Chapter numbers are the expanded campaign's (a New Game).

**Evidence labels.** *Source*: read in the text and in the code that picks the line (the chapter, the phase, the flag).
No browser suite was run (shared, loaded machine; the coordinator's instruction). `node tests/dialogue-check.mjs`: PASS
after each batch. Played: none.

**Already clean (checked, nothing to change):** Arthur's cup at the sink (OPENING-TUT) is gone from every English and
Hebrew file and from the code; FunFrock is spoken of as dead everywhere ("Twelve years ago you beat FunFrock" is LBA2's
ending); every crossing between planets is by spaceship (Ballastra by the council's freighter; the ferry, Hesk's glider
and the Esmer shuttles stay on their own planet); Esmer and Wannies are used as LBA2 has them (the Esmer the people and
traders of Zeelich, the Wannies its miners); the base campaign (`exp_base`) hears nothing of chapters 10-13 in the
network, the core or the epilogue (`c10_narr`/`c10_narr_exp`, `c3_vesk_over_b7` on `th_vesk`, `NetB8.has()`, the Cradle
Hall and `ep_end_text_bl` on `inCampaign('survey') && wk_awake`); the characters' genders agree everywhere but one (item 2).

## Fixed

| # | Contradiction | Where (file:key) | Fix | Commit |
|---|---|---|---|---|
| 1 | [>ch2] Baldino calls the network's Zeelich station "my mill", but the old mill is Oku's ("The old mill is mine, not the project's", `c2_oku_ask`; `c10_oku_1`, `c10_sub_mill`). | text/ch10.js:`c10_bal_1` | "…Oku's old mill on Zeelich…" (HE "הטחנה הישנה של אוקו בזיליך") | 612ae469 |
| 2 | [>ch2] Sefa is a man everywhere ("Sefa will be at his telescope. He always is.", `c7_yorna_1`; `hl_monk_mend_2`; the Hebrew verbs), but chapter 14's B-8 line said "herself… her log". | text/ballastra.js:`nwb_at_dome` | "himself… his log" (HE masculine) | 612ae469 |
| 3 | [>ch2] On Zeelich in chapter 14 Lissa and Wenna (Oku's household) said "The ground is quiet", while the same chapter has Irsa's switch "jump when the ground knocks" (`nw_irsa_1`) and the code line's joint jump "with every knock" (`nw_bal_joint`); Wenna's "Baldino's relays ride on our mills now" was also heard before the mill's relay is set. | text/zeelife.js:`zh_lissa_network`, `zh_wenna_network` | "The ground still knocks. The flowers don't like it." · "Baldino's relay is for the old mill. Oku pretends he isn't proud." · "The ground still knocks. The post outside is still dark." | 612ae469 |
| 4 | [>ch2] Zeelich's street used its 'late' lines (the ground quiet at last, "First good week in a year", "A quiet day") from chapter 15 on, so they were heard in chapters 15-16, before the shell holds. ferry.js and yearslate.js already keep 'late' for the epilogue, as their comment says zeelife.js does. | story/zeelife.js `talkFirst` (`zl_snuff_i_late`, `zl_bz_i_late`, `zh_lissa_late`, `zh_wenna_late`, `zr_fen_late`, `zr_oma_late`) | inside the shell the street talks as in the network; 'late' only in the epilogue. Nara's and Oku's own turn still asks the unchanged `phase()`. | 612ae469 |
| 5 | [>ch2] Lhar went back into the monastery camp in the expanded campaign's chapters 10-13: the houses emptied ("Lhamo's kitchen is cooking at the monastery now"), the notice read "Don't sleep in the houses", though Lhar had been mending its houses since chapter 8 and mends again in chapter 14. The chapter sets were written before chapters 10-13 existed. | story/hamlife.js `LATE`; storylife.js `MEND` | both sets add `throttle`, `ballastra`, `balances`, `survey`: the mending state runs from chapter 8 to the core, as before for the base campaign. Derived from the chapter, nothing saved. | 612ae469 |
| 6 | [>ch2] Madam Orla (Otringal's bar) sells Twinsen the project's leftover stores' lens from chapter 9; back in her chapters-4-7 line set in chapters 10-13 she said "When they sell, I'll be first in line." | story/islandpeople.js `FAVOUR_LINE`; text/isleslife.js:`ip_ot_boss_ord_sold` (new) | once the lens is bought (`pp_lens`): "The project's spare stores sold, every last bolt. You got the best of them." | 612ae469 |
| 7 | [>ch2] Twinsen called Oren's 304 sleepers "children", but Jory was nineteen when he went in (`wk_we_2`) and Nan Odra's mother sleeps there (`wk_od_mine`). Oren's own word, "young ones", stays (a young mother; Jory at nineteen). | text/ballastra.js:`bl_tw_or3` | "Three hundred and four people, asleep." (HE "אנשים") | 612ae469 |
| 8 | [>ch2] The epilogue's Cradle Hall: "Three lids stand open" (`ep_bl_1`; the scene opens three cradles) and Garrow's later "Two more woke since you were last here" (Jory + 2), but Jory said "Eleven of us awake now". | text/ballastra.js:`ep_bl_jory` | "Three of us awake now." `tests/exp-balances.mjs` reads the new words (and the legacy save's negative check now matches any count). | 612ae469 |
| 9 | [>ch2] Chapter 10's office guard: "The last visitor I had in here said she was looking for the washroom." That excuse is only said when the guard spots Zoé in chapter 2 (`c1_zoe_spotted`, no flag kept); a player who was never seen heard the guard remember a meeting that never happened. | text/throttle.js:`th_guard_1` | "Evacuation committee, is it? Last time Vesk's plan walked out of this room, I never saw who carried it." (true on both paths; his later "I never see you" still lands). `tests/exp-throttle.mjs` reads the new words. | 612ae469 |
| 10 | [>ch2] Vesk on the wire in chapter 9: the ground has knocked "for a week"; the pump room's strip in chapter 2 had already recorded the three kicks "for weeks" (`ct_strip`). | text/cnline.js:`cn_vesk_2` | "…as it has for weeks." | 612ae469 |
| 11 | Two or three different people shared one name, two of them the names of chapter 12-13's principals: Wenna (Jory's sister on Ballastra [>ch2] and a sail-mender at Oku's on Zeelich), Fennick (the House of Balances' clerk [>ch2], a heat-post fitter on Zeelich's street, the School of Magic's master on Citadel), Quill (Knartas's harbourmaster and Float Harbor's weigher [>ch2]), Hobb and Brin (on Citadel and on Ballastra [>ch2]). Speaker labels only; every key, id and flag unchanged. | text/zeelife.js:`n_zh_wenna`, `n_zr_fennick`; storylife.js:`n_sc_master`, `rs_sc_pupa_1`; purposes.js:`pp_oni_2`; ballastra.js:`n_bl_quill`, `n_bl_hobb`, `n_bl_brin`, `bl_te_h2`, `bl_te_h3`, `bl_sub_load`, `wk_ma_hands` | the minor side renamed: Zeelich's Wenna → Vanna, Zeelich's Fennick → Garn, Master Fennick → Master Orbo; Ballastra's Quill → Hollis, Hobb → Tull, Brin → Marten. Ballastra's Wenna and Fennick, Knartas's Quill and Citadel's Hobb and Brin keep their names. | 612ae469 |
| 12 | [>ch2] Expanded campaign, chapter 14: Mira introduced the valve room as new ("The valve room is under this floor…"), though she took Twinsen down there in chapter 10, where Oren's governor sits. | story/network.js (Mira's first talk); text/ch10.js:`c10_mira_1x` (new) | where chapter 10 was played (`og_room`): "The valve room again. The mains run to the fortress, the depot and the lighthouse…". The base campaign keeps `c10_mira_1`. | 0c96ef3e |
| 13 | [>ch2] The temple's carving in chapter 14 showed "Five chalk ticks now, one on each vent", but only two vents were ever opened (desert and ice: "Two vents open.", `c7_tw_v1`). The epilogue's "every vent ticked" stays (the bore no longer draws the heat to one point: `know_dig`). | text/desertlife.js:`dl_carving_net` | "Two chalk ticks, the desert's vent and the ice's, and a ring drawn round Citadel in the middle." | 0c96ef3e |
| 14 | [>ch2] Citadel's passers-by in chapters 15-16: "Warm water, still ground." The ground knocks until the shield (Arthur counts it in chapter 14), and the epilogue's "Four days of quiet ground" (`ro_home_0`) dates the quiet from the end. | text/walkers.js:`ro_deep_2` | "Warm water, warm posts. I don't trust it." (the reply "You don't trust a sunny day either" still fits) | 0c96ef3e |
| 16 | [>ch2] Expanded campaign, chapters 11-13: Gilbert, who took the B-7's lever in chapter 10 ("Then it's mine. I'll hold it.") and whom Twinsen describes to Tessa as "a man holding its lever" (`bl_tw_s2`), said only "Hello, Twinsen." (no `idle_gilbert_<chapter>` line for those chapters). | text/common.js:`idle_gilbert_ballastra`, `idle_gilbert_balances`, `idle_gilbert_survey` (new) | "Nobody touches that lever but me. I only let go to say hello." · "Mira checks my lever twice a day. It hasn't moved. Neither have I, much." · "Sixty-one people, and every one of them gets a wash. My lever did that." (picked by `baseTalk` from the chapter key; no code changed) | 2023496b |
| 15 | [>ch2] Chapter 3: Nara answers "Baldino?" to a question Twinsen never asks (DIALOGUE-2's open item d). | story/chapter2.js (Nara's talk); text/ch2.js:`c2_tw_nara` (new) | Twinsen asks first: "I'm looking for Baldino." (also before her repeat of the directions) | 0c96ef3e |

Examples, before → after, with what each keeps: `th_guard_1` keeps the guard's grudge and the joke on his blindness, now
without a meeting that some players never had; `ep_bl_jory` keeps "Nobody's taught us the new coins"; `ro_deep_2` keeps
the two speakers' rhythm and the reply's joke; the Zeelich network lines keep Oku's pride and the dark post (the west end
gets no heat until the epilogue).

## Open questions (a story decision, not guessed)

1. [>ch2] **Gilbert at the B-7's lever after chapter 10 (staging).** CAMPAIGN-CLARITY says he keeps the lever "in every
   later chapter". His words now say so (item 16), but chapter 10's placement ends with the chapter (`throttle.js place`:
   later chapters place their own), so in chapters 11-13 he stands in the fortress shelter (evacuation.js), not at the
   riser with his hand on the lever. Recommendation: leave (his line covers it), or a mechanics change for the quest
   designer: his chapter-10 spot at the riser kept while the expanded campaign's chapters 11-13 run.
2. [>ch2] **How long Ballastra takes** (DIALOGUE-2 open item a; CAMPAIGN-CLARITY §8). After "The stop bought us some
   days", chapters 11-13 add a flight, three jobs, the House, the rig, an hour's waking, and Tessa crating five B-8s by the
   end of it. No line contradicts it; none says how long. Recommendation: leave unmeasured, or one line from Tessa that
   the crates took her "two days" if the user wants the time said.
3. **Remaining shared names in the base game** (ambient people, no plot role): Joss (Farmer Joss in chapter 8, a pupil in
   Kesh's dormitory, a pupil at Citadel's School of Magic: the last two may be meant as one person), Pema (the spaceport's
   fueller and a child of Lhar), Ossa (Otringal's market and the upper district's Old Ossa). Recommendation: rename the
   spaceport's fueller and one Ossa, and say whether the two pupils named Joss are one boy.
4. [>ch2] **The carving's second tick in chapter 5** (`dl_carving`, STORY-FIX's open item): read after the vent but before
   Zoé's radio names the northern vent; a few minutes' window. Recommendation: leave.
5. Not changed, on purpose: the opening's worker says "Vesk promised" before Zoé names Vesk in chapter 2 (`op_wk_1`):
   the town knows the name, only not the man, and Vesk introduces himself on landing; Kesh's "the ground's been still
   since the vent" stays in later chapters (the desert's own ground, under the opened vent).

## Files changed

Text (EN and HE): `src/game/text/{ballastra,ch2,ch10,cnline,desertlife,isleslife,purposes,storylife,throttle,walkers,zeelife}.js`
and the same names under `src/game/text/he/`; `src/game/he-text.js` (bundle). Gates: `src/game/story/zeelife.js`,
`src/game/story/hamlife.js`, `src/game/storylife.js`, `src/game/story/islandpeople.js`, `src/game/story/network.js`,
`src/game/story/chapter2.js`. Tests reading the changed words: `tests/exp-throttle.mjs`, `tests/exp-balances.mjs`.

## Resume point

Not run (needs a browser): `tests/exp-throttle.mjs` (item 9), `tests/exp-balances.mjs` (item 8), `tests/zeelich-life.mjs`
and `tests/zeelich-doors.mjs` (items 3, 4, 11), `tests/chapter2.mjs` (item 15), `tests/island-people.mjs` (item 6),
`tests/chapter10.mjs` or `tests/playthrough/13-network.mjs` (item 12). Next: the coordinator's answers to the open
questions; then those suites on a quiet machine.
