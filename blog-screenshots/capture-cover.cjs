// Cover-Screenshot für den MotherDuck-Dives-Blogpost.
// Zeigt den Dive mit aktiven Filtern (12 Monate + Schweiz) um die
// Interaktivität des Tools zu betonen.
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/plotti/code/datapeople-astro/src/assets/blog';
const BASE = 'http://localhost:3001';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    userDataDir: '/tmp/pptr-cover-' + Date.now(),
    timeout: 90000,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  // 16:9 cover, @2x für Schärfe
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  console.log('Lade App…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Warten bis mindestens 2 Canvas-Elemente da sind (Charts geladen)
  await page.waitForFunction(
    () => document.querySelectorAll('canvas').length >= 2,
    { timeout: 60000 }
  ).catch(() => console.warn('⚠ Charts nicht vollständig nach 60s'));
  await sleep(3000);

  // "Letzte 12 Monate" klicken
  const clicked12m = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    const btn = btns.find((b) => b.textContent.trim().includes('12 Monate'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log(clicked12m ? '✓ 12 Monate geklickt' : '✗ 12-Monate-Button nicht gefunden');
  await sleep(2000);

  // "Schweiz" im Land-Dropdown wählen
  const clickedCH = await page.evaluate(() => {
    const sel = document.querySelector('select');
    if (!sel) return false;
    const opt = [...sel.options].find((o) => o.text.toLowerCase().includes('schweiz') || o.value === 'CH');
    if (!opt) return false;
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  console.log(clickedCH ? '✓ Schweiz gewählt' : '✗ Schweiz-Option nicht gefunden');
  await sleep(4000);

  // Charts nochmal abwarten nach Filteränderung
  await page.waitForFunction(
    () => document.querySelectorAll('canvas').length >= 2,
    { timeout: 30000 }
  ).catch(() => {});
  await sleep(2500);

  const outPath = `${OUT}/motherduck-dives-cover.png`;
  await page.screenshot({ path: outPath });
  console.log(`✓ Cover gespeichert: ${outPath}`);

  await browser.close();
})();
