// Shared paths for the crackle tools: Playwright and Electron from the Test Lab (lba3/tools/testlab, npm install there),
// the game's URL (GAME_URL, as the tests; serve lba3/ first), and where runs are written (CRACKLE_RUNS, default the
// system's temp folder: recordings are large and are never committed).
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.join(HERE, '..', '..', 'testlab', 'node_modules');
export const { _electron: electron } = await import(pathToFileURL(path.join(LAB, 'playwright', 'index.mjs')).href);
export const ELECTRON = path.join(LAB, 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
export const GAME = process.env.GAME_URL || 'http://localhost:8123/';
export const RUNS = process.env.CRACKLE_RUNS || path.join(os.tmpdir(), 'lba3-crackle');
