# Dialogue pass 1 (8.11.2026): the text added on 6–8.11, read in its scene

Scope: `src/game/text/zeelife.js` (Zeelich's street, the four homes, Lissa, Wenna, Fennick, Rezz, Oma), `text/ihomes.js`
(the island and Kesh rooms, six keepers), `text/stands.js` (Corla, boards, fountains, carts, sheds), the depot watch
(`dw_*`, Vesk's and Doran's changed lines in `text/ch1.js`) and chapter-balance's new lines (`text/ch3.js`, `ch7.js`,
`ch9.js`, `ch10.js`). Each line was read against the code that plays it (`story/zeelife.js` phases pre/post/mid/
council/network/late, `story/ihomes.js` + `islandlife.js lineState`, `story/stands.js townState`/`clerkKey`,
`story/depotwatch.js`, `story/observatory.js`, `council.js`, `chapter3.js`, `network.js`) and STORY_BIBLE.md.

Evidence: **Source only** for the reading (no line was heard or seen in play in this pass); the string-asserting tests
were run on a snapshot (**Automated runtime**, results in the commit). Only text values changed: no key, flag or logic.
Only `ch1.js` has Hebrew twins in these files; the one changed line there has its Hebrew changed with it.

## Changed lines

| Key | Before | After | Why |
|---|---|---|---|
| zl_tag_sw | Another dark post, another tag: CONNECTION NEXT QUARTER. The lit ones… | Another dark post, the same tag. The lit ones… | "next quarter" said by every second neighbour; the tag itself is read on the first post |
| zl_flowers | …A project tag: HELD. The shuttles are grounded, and the project's ship takes project cargo first. | …A project tag on each: HELD. Nothing flies but the project. | the crates go to Citadel, another planet: not by shuttle (STORY_BIBLE: spaceship only); Lissa says the cargo rule herself |
| zl_snuff_i_council | If the council stops the bore, I'll want my charcoal cart back. I sold it. | The whole street's arguing about the bore. If it stops, I want my charcoal cart back. | six council-phase lines opened "If the council stops the bore" |
| zl_snuff_i_late | Some days the ground is quiet. The oven should be warm every day. | The ground's quiet at last. Pity about my oven. | the old line did not lead to her cold oven (her next line is the stair) |
| zl_snuff_after_mid[0] | The shuttles bring flour from Citadel now… | The ships bring flour from Citadel now… | Citadel is reached by ship, not shuttle |
| zl_snuff_after_council[1] | Oku says I sold my oven to a drill. I sold a charcoal cart. | The drill crews say my rolls are the best thing on the platform. They're the only thing on the platform. | the charcoal cart was her third mention of it in one chapter |
| zl_bz_i_mid | The shuttles fly again. Forty crates a day, and the depot signs for ten. | Forty crates a day now, and the depot signs for ten. | heard right after Snuff's "The shuttles fly again" |
| zl_bz_after_mid[0] | The shuttles fly again. My cousins carry the heavy crates out to them. | Twice the flights since the shuttles fly again. My cousins carry the heavy crates. | same opening as Snuff, Nara and Oma (kept the phrase the test looks for) |
| zl_pel_council[0] | If the council stops the bore, who keeps the depot's books? Who pays the tilers? | No bore, no depot. No depot, no books. No books, no tilers. | the repeated opening; his clerk's chain of reasoning instead |
| zl_grumm_pre[0] | They put a heat post over our burrow. Connection next quarter. Our tunnels sweat already. | They put a heat post over our burrow, for later. Our tunnels sweat already. | "next quarter" again; the tag says it |
| zl_grumm_network[0] | Baldino's relays on our mills?… | Baldino's relays on Oku's mills?… | the mills are Oku's, not the Wannies' |
| zl_nara[0] | The shuttles fly again. My flowers went out on the first one… | The ships fly again. My flowers went out on the first one… | Citadel by ship |
| zh_nara_slate | XIL - CITADEL. 40 POTS. EVERY SHUTTLE. | XIL - CITADEL. 40 POTS. EVERY FLIGHT. | Citadel by ship |
| zh_nara_crates_gone | Two crates left. The rest went out on the shuttles. | Two crates left. The rest have gone to Citadel. | Citadel by ship |
| zh_lissa_pre[0] | Forty pots for Citadel, and the shuttles grounded… | Forty pots for Citadel, and nothing flying… | Citadel by ship (both are grounded in chapter 3) |
| zh_lissa_mid[0] | They went out on the first shuttle… | They went out on the first ship… | Citadel by ship |
| zh_lissa_council[0] | If the council stops the bore, the frames go cold in winter… | Without the project's heat the frames go cold in winter… | the repeated opening |
| zh_wenna_mid[0] | Charcoal costs more every month. The post outside still says next quarter. | Charcoal costs more every month. Everyone with a lit post stopped buying it. | "next quarter" again; a reason of her own instead |
| zh_wenna_council[1] | Everyone's at the council house. Someone has to grind the flour. | Oku's up at the council house. Someone has to grind the flour. | Lissa next door says "Everyone's at the council house" too |
| zr_fen_pre[1] | The bakery's heat box trips if you look at it wrong. Snuff looks at it wrong a lot. | The bakery's heat box trips the moment its flue chokes. Then Snuff blames me. | the fitter now gives the Second Bake's real clue (the flue), in his voice |
| zr_fen_council[0] | If the council stops the bore, I disconnect the lit posts. Same wrench either way. | Whatever the council decides, I bring the same wrench. | the repeated opening |
| zr_fen_council[1] | Pelleck keeps asking about his post. I keep saying next quarter. | Pelleck asks about his post every morning. I've started taking the long way round. | "next quarter" again |
| zr_fen_network[1] | Steady pressure today. I wrote it down twice. | Steady pressure today. Baldino says that's good. I'll take his word. | "twice" is Pelleck's joke (Form 7-B filed twice) |
| zr_fen_late[1] | They say the west end gets its posts lit at last. They said that last year. | They say the west end gets its posts lit at last. I'll believe it when I fit them. | the next-quarter joke once more |
| zr_oma_mid[0] | The shuttles fly, so petitions come by shuttle now. From Citadel, even. | Petitions come from Citadel now, by ship. They want hearings too. | Citadel by ship; the repeated opening |
| zr_oma_mid[1] | Three dark posts this quarter. Same three as last quarter. | Three dark posts, three petitions about them. Mr Pelleck wrote two. | the next-quarter joke; ties to her job and to Pelleck |
| ih_ossa_net | An inventor bought every coil of wire I had. Paid in full. I'm not asking what it's for. | Somebody bought every coil of wire I had. Now everyone wants wire. I've never been so popular for having none. | three Otringal keepers in a row on "an inventor" (Dobb's ticking parcels, Brem's list kept) |
| ih_liwa_evac | …They drink more tea when they worry. | …I've stopped charging for the second cup. | Ossa next door: "People buy when they're worried" |
| ih_liwa_net | The plaza's busy again. Good. An empty tea room is a sad thing. | The plaza's busy again. Half the talk is relays, the other half is cake. | same shape as Gorrin's "Busy again. Good." |
| ih_dobb_evac | Letters from Twinsun every shuttle now… | Letters from Twinsun on every ship now… | he himself says Twinsun's letters go by spaceship |
| ih_brem_evac | …Somebody down there is buying blankets. | …Somebody over there is buying blankets. | Twinsun is another planet, not below |
| ih_brem_council | The council checks every crate now. My crates are boring. They check them twice. | The council's guards open every crate now. Mine are boring. They open them twice. | Rezz and Corla also had "checks every … now" |
| ih_tesk_net | We lent the inventor two of our relays. Signed for, in triplicate. He signed in a hurry. | We lent the inventor two of our relays. He signed for them in a hurry and left with my pen. | "in triplicate" is a stock joke |
| ih_knartas_25_m22 | …Short nights here. | …Short sleeps here. | R7: no Earth-style night |
| ih_knartas_37_m14 | Bunks for the night shift… | Bunks for the late shift… | R7 |
| ih_knartas_9_32 | …SHIFT CHANGE AT DUSK… | …SHIFT CHANGE AT SIX… | R7 (no dusk under two suns) |
| ihk_wardrobe | A wardrobe. The door doesn't quite close, from the inside. | A wardrobe, too full to close properly. | the old line read as something inside pushing |
| ihk_crates | …Not his to open. | …Not mine to open. | looks are spoken by Twinsen (`n_hero`) |
| ihk_drums | Festival drums. He resists the urge. | Festival drums. I resist the urge. | as above |
| cs_corla_council | Zeelich's council checks every arrival now… | Zeelich's council has guards at the arrivals gate now… | the "checks every" repeat; matches the two council guards in Zeelich's terminal in chapter 9 (WC-4) |
| cs_corla_network | Every other passenger this week carries a crate for an inventor on Zeelich. I don't ask. The crates hum. | Every other crate this week is addressed to Baldino on Zeelich. One of them hums. I keep it at the far end. | the "inventor's parcels" joke was also Dobb's |
| cs_board_square_dry | …Lost: a grey cat. Answers to nothing… | …Lost: a wind-up Meca-Penguin. Answers to nothing… | Twinsun's own things, not an Earth pet |
| cs_board_square_hot | …Grey cat found, unimpressed. | …Meca-Penguin found, still walking. | as above |
| cs_board_lane_home | …Dinner at the Twinsens' tonight, they say… | …Dinner at the Twinsens', they say… | R7 |
| dw_tw_vesk (en + he) | Vesk sent me to open it. / וסק שלח אותי לפתוח אותו. | Vesk sent me to open the valve. / וסק שלח אותי לפתוח את השסתום. | it also follows `dw_warn` (in the yard, away from the valve), where "it" pointed at nothing |
| c7_keeper_sun | She drank the light of both suns, once. The second window, past her crystal, has been frozen shut since the winters went strange. | Her crystal wants the light of both suns. The second window, up past it, is iced shut, and I can't reach it. You have that ball. | "She" is also the being under the shell; the vague "winters went strange" (the ice is melting) out; the hint now names the tool |
| c7_faint | It glows, but only faintly. Half the light. | It glows, but only faintly: one sun's light. The other window is still iced over. | before the ice is broken: points to the window |
| c7_faint_ice | It glows, but only faintly. One sun is not enough. | It glows, but only faintly. Only one of the two beams reaches it. | after the ice: points to the mirrors, not the window (either beam can be the one that arrives: `obsroom.js trace`) |
| c9_cab_locked | BORE: locked, the only one. The archivist's key ring lies on his desk by the door, where he passes every round. | BORE is the only cabinet locked. The archivist's key ring is on his desk by the door, and he passes it every round. | spoken by Twinsen: a sentence, not a label |

"Next quarter" after the pass: the three heat-post tags and Pelleck's radiator tag (signs), Pelleck's two lines (his
joke), Fennick's "next quarter's list" (his job). "The shuttles fly again": Snuff's and Bzizz's mid lines (one each).

## Read and kept

Kept as written: the Second Bake chain (Snuff, Bzizz, the heat box, the hatch, the roof, the pay lines, Tavo), Rezz,
Oma's other lines, Lissa's and Wenna's others, every room look not listed above, the six keepers' other lines, Corla's
other lines, the boards' other notices, the fountains, carts and sheds, the rest of the depot watch (`dw_warn`,
`dw_warn_task` "Nobody told me" pays off Vesk's "stay out of sight"; `dw_radio_*`, `dw_go*`), `c1_vesk_4`,
`c1_doran_drones`, `c1_doran_depot`, `c3_ilka_bleed`, `c3_ilka_bled`, `c3_vesk_coil`, `c3_toast_bleed`, the
other chapter 7 seal and mirror lines, `c9_key_take`, `c10_yorna_broth`.

## Flagged, left

- **Possibly unreachable, not checked in play:** `cs_corla_zeelich` (chapter 3 is spent on Zeelich; Citadel is only
  crossed at its end), `cs_corla_shell` / `cs_corla_core` (chapters 11–12 are underground), the keepers' `*_evac`
  lines (whether Zeelich's islands can be reached during chapter 8).
- `ih_post_cabin0` (Kesh missing from the project's evacuation list) can be read in chapter 4, before Dallan's list
  turns against Kesh in chapter 5. It agrees with the 30 % plan Twinsen already knows, so it reads as foreshadowing;
  campaign-director may prefer it from chapter 5.
- STORY_BIBLE.md contradicts itself: the Esmer shuttles are "for Zeelich's islands only", yet "others cross the skies
  of Citadel, Zeelich and Desert Island". This pass followed the planets-by-spaceship rule. For campaign-director.
- `zh_lissa_council`: "winter" on Zeelich (seasons are not established anywhere). Left.
- `ih_dobb_2` "wish you were here" is an Earth postcard phrase; `ih_gorrin_ord` "better than the gas" is unclear
  (Knartas' gas works?). Left.
- Snuff's "This house was built for watching people" and Bzizz's "I land on the stage now" recur across three phases'
  lists: kept as their signature lines (one per list).
- Bzizz says "Bzz" in four lines: at the limit.
