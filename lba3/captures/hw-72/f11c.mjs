import { _electron as electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const EXE = 'C:/Users/danka/AppData/Local/Programs/LBA3 The Awakening/LBA3 The Awakening.exe', PROFILE = 'C:/Users/danka/dev/lba3-bench/hw72/profile';
console.log('prefs', fs.existsSync(PROFILE + '/window.json') ? fs.readFileSync(PROFILE + '/window.json', 'utf8') : 'none');
const app = await electron.launch({ executablePath: EXE, args: [`--user-data-dir=${PROFILE}`], timeout: 120000 });
const page = await app.firstWindow(); await page.waitForTimeout(4000);
console.log('fullscreen at relaunch', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen()));
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setFullScreen(true)); await page.waitForTimeout(1200);
await app.close(); process.exit(0);
