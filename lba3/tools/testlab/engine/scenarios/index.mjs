// Every test, in run order. A test lists the suites it belongs to; tests of one session kind ('fresh': a new empty
// profile; 'warm': the kept test profile) share a launch while they run in a row.
import { coldLaunch, titleToPlay, streetTraversal } from './core.mjs';

export const SCENARIOS = [coldLaunch, titleToPlay, streetTraversal];
