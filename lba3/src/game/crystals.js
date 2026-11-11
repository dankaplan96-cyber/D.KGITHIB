// COL-1 · Twelve singing crystals (docs/lba-maturity/DEPTH-PLAN.md, section 6). The collectible layer's registry: which
// crystals exist, where each comes from, and which can be had today. Each one is +1 max life (10 → 22 with all twelve:
// main.js applyCrystals counts the ids collected that start with 'sc-').
//
// The first six lie in the world (main.js crystalSpots spawns them): five on Citadel, one on the old mill's top on
// Zeelich. `crystalsAll` keeps its old meaning: these six (Sendell's line in chapter 11, story/chapter3.js), so a save
// from before the layer grew loads with the same flag and the same +6.
// The other six are given by a puzzle each, never found lying on a path. A quest crystal is an owed reward until it is
// in his hand (story/depth.js gives it and catches up an owed one after a load). Whether all twelve are in hand is
// `dx_crystals12` (the twelfth's payoff: Sendell's catch in the core, chapter 12, and an epilogue line: story/depth.js).
//
// built: false = the slot and its reward plumbing exist, but the quest that gives it is a later wave of the plan and is
// NOT built: nothing in the game can give that crystal yet, so today a player can reach at most 8 of 12 and the
// all-twelve payoff cannot happen in normal play (only a staged test reaches it). Building the quest = flipping its
// entry to true and calling Depth.giveCrystal(id, ...) from it.
export const CRYSTAL_WORLD = ['sc-lighthouse', 'sc-orchard', 'sc-pier', 'sc-east', 'sc-north', 'sc-mill'];
export const CRYSTAL_QUEST = {
  'sc-jaspa': { quest: 'ISL-1', region: 'isles', built: true },        // Old Jaspa's warm gems, Knartas (chapter 4 on)
  'sc-waystone': { quest: 'HAM-1', region: 'hamalayi', built: true },  // the pilgrims' waystone, the monastery terrace (chapter 6 on)
  'sc-figures': { quest: 'DES-1', region: 'desert', built: false },    // where the figures look (a buried survey cache)
  'sc-trial': { quest: 'DES-2', region: 'desert', built: false },      // Rector Hougo's third rebound trial
  'sc-pack': { quest: 'HAM-3', region: 'hamalayi', built: false },     // Yorna's brother's pack in the glacier
  'sc-source': { quest: 'UND-1', region: 'underground', built: false },  // the source, the crystal galleries
};
export const CRYSTAL_IDS = [...CRYSTAL_WORLD, ...Object.keys(CRYSTAL_QUEST)];
export const CRYSTAL_TOTAL = CRYSTAL_IDS.length;   // 12
export const isCrystal = (id) => typeof id === 'string' && id.startsWith('sc-');
// the crystal ids in a collected list, each once
export const crystalsIn = (collected) => new Set((collected || []).filter(isCrystal));
// can this crystal be had in the game as built now?
export const obtainable = (id) => CRYSTAL_WORLD.includes(id) || !!CRYSTAL_QUEST[id]?.built;
