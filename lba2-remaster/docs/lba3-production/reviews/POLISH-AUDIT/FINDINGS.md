# POLISH-AUDIT, chapters 3–12 (27.10.2026, at 6720843)

**SPOILERS. The user plays chapters 1–2 only; do not send this list or its screenshots.**
Screenshots stay in the session scratchpad (polish-audit/), not in the repo.

| # | Chapter / place | What is wrong | Source | Size | Status |
|---|---|---|---|---|---|
| 1 | 12 finale | The payoff is text only: Vesk stays upright at an intact console; the coil (3 hits) is a small ball hidden behind him | story/chapter3.js veskFalls, ensureCoil; underground.js console | M | done (FINALE-PAYOFF); the burst flash is a hard translucent sphere, soften later |
| 2 | 8 shelters | The two bunkers are bare grey cubes, the door faces away from the camera, the hatch wheel floats as a gold hoop | story/evacuation.js decorate/bunker | M | done (CH8-SHELTERS): headwall, sliding door facing the approach, wheel on the door, earth mound; story/shelters.js |
| 3 | Bosses (12 guardian, 7 heavy drone) | Scaled-up small drones, no silhouette or phase readout; the 12 pylon stage killed the bot often | enemies.js Guardian; story/observatory.js | M–L | |
| 4 | 5 geysers, 5/7 vents; every hit | White pixel squares and hard tubes; Particles are hard additive squares game-wide | story/steam.js; desert.js plume; hamalayi.js steam; actors.js Particles | M | in progress (FX-SOFT) |
| 5 | 4 Temple of Bù gate | The chapter's reveal renders as an unlit black slab | desert.js ~L1014 | S–M | |
| 6 | Story reveals | No camera work for Sendell ×2, Vesk's descent, the ch10 shaft opening | chapter3.js, observatory.js, chapter2.js, network.js | L (M for three beats) | |
| 7 | 4 sand-yacht | A plank, three discs and one flat triangle sail | desert.js ~L1124 | S–M | |
| 8 | Hamalayi terrain | Sawtooth snow caps on every cliff edge, flat empty glacier basin, a disc for the ice vent | hamalayi.js ~L600 | M | |
| 9 | 10 bore fight | Six enemies at once on a small pad; bot died and was assisted | story/network.js enemyDefs | M | |
| 10 | 6 gorge tree | Rigid pole fall, no landing, a spiky-twig log | hamalayi.js fell() | S | |
| 11 | 8 farm run | Farmers vanish under a fade instead of walking; the heat pipe hides Twinsen | story/evacuation.js | M | done (CH8-SHELTERS): the farmers walk off along the road; the main is buried along the plateau route and no longer loops round the depot shelter (island.js PIPE, bury); the occluder system never fades (VP-10), so no fader was registered; carts and bundles added |
| 12 | Epilogue | Twinsen has his sword drawn at the family dinner | story/epilogue.js begin() | S | done (FINALE-PAYOFF) |
| 13 | Toasts | Grey on bright scenes (shield dome, snow): unreadable | css .toast | S | done (FINALE-PAYOFF) |
| 14 | Hamalayi trail, Citadel pipe | Foreground pine or pipe covers the hero | (check tests/occluders.mjs) | S–M | Citadel plateau part done with #11 (CH8-SHELTERS); the Hamalayi trail is open |
| 15 | 4 Ilka's camp, research post | Sparse: a flat lean-to, a bare pad | desert.js | S–M | |
| 16 | Desert sand | Long parallel streaks like floorboards up close | desert texture | S | |

Known, not re-listed: the Hamalayi rebels' camp, the ch11 galleries' difficulty, the Bug Street Follow snap, the ch6 depot fight's assist.
Not tested: frame rate, audio, human-style fights, the opening cinematic.
