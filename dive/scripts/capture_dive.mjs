// Capture-Session für den Blog: lädt den Dive vollständig (WASM + Parquet +
// Chart-Animationen), klickt dann durch die Filter und macht pro Zustand
// einen Frame für das GIF. Dazu ein statisches Hero-/Cover-Shot am Ende.
//
// Ausführen:  node dive/scripts/capture_dive.mjs   (Dev-Server auf :5173 muss laufen)

import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = 'http://localhost:5173/'
const OUT = '/tmp/dive_frames'

mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Klick auf einen Button anhand seines Textes (Segment-Buttons und Chips).
const clickByText = (page, selector, text) =>
  page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) =>
        e.textContent.includes(t),
      )
      if (!el) throw new Error('nicht gefunden: ' + t)
      el.click()
    },
    selector,
    text,
  )

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  dumpio: true,
  args: ['--disable-gpu', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 2 })

// 1) Vollständig laden: WASM initialisieren, Parquet laden, KPIs befüllen,
//    Recharts-Surfaces zeichnen — und Animationen ausklingen lassen.
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 })
await page.waitForSelector('.kpi-grid', { timeout: 90000 })
await page.waitForFunction(
  () => {
    const v = document.querySelector('.kpi-value')
    return v && v.textContent.trim() !== '–'
  },
  { timeout: 90000 },
)
await page.waitForSelector('.recharts-surface', { timeout: 30000 })
await sleep(3500)

// 2) Frames für das GIF — nach jedem Klick warten, bis Queries + Animation fertig.
const shot = (n) => page.screenshot({ path: `${OUT}/frame${n}.png` })

await shot(1) // Ausgangszustand: letzte 30 Tage, alle Länder

await clickByText(page, '.seg-btn', 'Letzte 90 Tage')
await sleep(2300)
await shot(2)

await clickByText(page, '.seg-btn', 'Letzte 12 Monate')
await sleep(2500)
await shot(3)

await page.select('.select', 'CH') // Land: Schweiz
await sleep(2300)
await shot(4)

await clickByText(page, 'button.chip', 'M ·') // Paketgrösse M als Cross-Filter
await sleep(2300)
await shot(5)

// 3) Frischer Zustand für Hero- und Cover-Shot.
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('.kpi-grid', { timeout: 90000 })
await sleep(4000)
await page.screenshot({ path: `${OUT}/hero-full.png`, fullPage: true })

await page.setViewport({ width: 1360, height: 1000, deviceScaleFactor: 1 })
await sleep(600)
await page.screenshot({ path: `${OUT}/cover.png` })

await browser.close()
console.log('Capture fertig:', OUT)
