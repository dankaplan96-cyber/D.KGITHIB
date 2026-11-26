import { _electron as electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
const EXE = 'C:/Users/danka/AppData/Local/Programs/LBA3 The Awakening/LBA3 The Awakening.exe', PROFILE = 'C:/Users/danka/dev/lba3-bench/hw72/profile';
const app = await electron.launch({ executablePath: EXE, args: [`--user-data-dir=${PROFILE}`], timeout: 120000 });
const page = await app.firstWindow();
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(1500);
const fs = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
console.log('start', await fs());
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setFullScreen(false); });
await page.waitForTimeout(1500); console.log('setFullScreen(false) →', await fs());
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.show(); w.focus(); w.moveTop(); });
await page.waitForTimeout(800);
// a real key from the OS (SendKeys to the foreground window)
execSync(`powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $null = $w.AppActivate('LBA3'); Start-Sleep -Milliseconds 400; $w.SendKeys('{F11}')"`);
await page.waitForTimeout(1800); console.log('OS F11 →', await fs());
execSync(`powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $null = $w.AppActivate('LBA3'); Start-Sleep -Milliseconds 400; $w.SendKeys('{F11}')"`);
await page.waitForTimeout(1800); console.log('OS F11 again →', await fs());
await app.close(); process.exit(0);
