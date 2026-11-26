// #18 / #28 (the user's choice, 26.11): chapter 7's vent seal as a new stage, "the mountain's pulse", in place of the
// five discs that repeat chapter 4's dig (docs/lba-maturity/CH7-STAGE.md). Behind the URL switch ?ch7stage=new, so the
// user can compare; without it the game is exactly as before (the discs, PUZZLES P-B). Read once, at load.
//   hamalayi.js     builds the seal's turning ring and its five grooves instead of the discs
//   story/ventring.js  the stage itself (the kicks, the turns, the opening); story/observatory.js asks it first
const q = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('ch7stage') || ''; } catch { return ''; } })();
// The user's pick (26.11): the new stage is the default; ?ch7stage=old brings back the discs (for comparison and the old tests)
export const CH7_NEW = q !== 'old';
