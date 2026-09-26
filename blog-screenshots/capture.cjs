// Screenshots für den datapeople-Blogpost — v2.
// Lektion aus v1: Das DimensionGrid re-queried clientseitig (DuckDB-WASM) und
// braucht ~5–10s; Charts erscheinen früher. Also warten wir explizit auf die
// Grid-Zeilen statt auf "kein Loading"-Text. Klicks setzen die Filter für die
// Cross-Filter-Aufnahmen. Ausgabe: datapeople-astro/src/assets/blog/.
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/plotti/code/datapeople-astro/src/assets/blog';
const BASE = 'http://localhost:3000';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chartsSettled(page) {
	await page.waitForFunction(
		() => document.querySelectorAll('canvas').length >= 3,
		{ timeout: 45000 }
	).catch(() => console.warn('  ⚠ keine 3 Canvas nach 45s'));
	await sleep(2500); // echarts-Animationen ausklingen lassen
}

async function gridReady(page, firstLabel) {
	// Warten bis die DimensionGrid-Zeilen gerendert sind (clientseitige Query!)
	await page.waitForFunction(
		(label) =>
			[...document.querySelectorAll('[role="button"]')].some((el) =>
				el.textContent.trim().startsWith(label)
			),
		{ timeout: 45000 },
		firstLabel
	).catch(() => console.warn('  ⚠ Grid-Zeilen nicht gesehen'));
	await sleep(1500);
}

async function sectionRect(page, h2Texts) {
	return page.evaluate((texts) => {
		const h2s = [...document.querySelectorAll('h2')];
		const find = (t) =>
			h2s.find((h) => h.textContent.trim().toLowerCase().includes(t.toLowerCase()));
		const first = find(texts[0]);
		if (!first) return null;
		let bottom = 0;
		let right = 0;
		for (const t of texts) {
			const h = find(t);
			if (!h) continue;
			let next = h.nextElementSibling;
			while (next && next.tagName !== 'H2') {
				const r = next.getBoundingClientRect();
				bottom = Math.max(bottom, r.bottom + window.scrollY);
				right = Math.max(right, r.right);
				next = next.nextElementSibling;
			}
			const hr = h.getBoundingClientRect();
			bottom = Math.max(bottom, hr.bottom + window.scrollY);
			right = Math.max(right, hr.right);
		}
		const top = first.getBoundingClientRect().top + window.scrollY;
		const left = first.getBoundingClientRect().left + window.scrollX;
		return {
			x: Math.max(left - 8, 0),
			y: Math.max(top - 12, 0),
			width: Math.min(right - left + 16, 1100),
			height: bottom - top + 24
		};
	}, h2Texts);
}

async function shot(page, file, opts = {}) {
	if (opts.sections) {
		const rect = await sectionRect(page, opts.sections);
		if (!rect) {
			console.error(`  ✗ Sektion nicht gefunden für ${file}`);
			return;
		}
		await page.screenshot({ path: `${OUT}/${file}`, clip: rect });
	} else {
		await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
	}
	console.log(`  ✓ ${file}`);
}

async function clickGridTile(page, label) {
	const clicked = await page.evaluate((txt) => {
		const el = [...document.querySelectorAll('[role="button"]')].find((b) =>
			b.textContent.trim().startsWith(txt)
		);
		if (!el) return false;
		el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		return true;
	}, label);
	console.log(clicked ? `  · Kachel "${label}" geklickt` : `  ✗ Kachel "${label}" nicht gefunden`);
	return clicked;
}

(async () => {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		userDataDir: '/tmp/pptr-capture-' + Date.now(),
		timeout: 90000,
		args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1440, height: 2400, deviceScaleFactor: 2 });

	console.log('== Survey Engagement ==');
	await page.goto(`${BASE}/survey_engagement/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await chartsSettled(page);
	await gridReady(page, 'de');
	await shot(page, 'agentic-dashboards-calendar-heatmap.png', {
		sections: ['Antwort-Aktivität im Jahresverlauf']
	});
	await shot(page, 'agentic-dashboards-survey-engagement.png');

	console.log('== Survey Engagement, gefiltert (fr) ==');
	await clickGridTile(page, 'fr');
	await sleep(6000); // abhängige Queries via WASM-Engine neu
	await chartsSettled(page);
	await shot(page, 'agentic-dashboards-dimension-grid-language.png', {
		sections: ['Nach Sprache filtern', 'Geografie der Antwortenden']
	});

	console.log('== Package Sales ==');
	await page.goto(`${BASE}/package_sales/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await chartsSettled(page);
	await gridReady(page, 'M');
	await shot(page, 'agentic-dashboards-package-sales.png');

	console.log('== Package Sales, gefiltert (XL) ==');
	await clickGridTile(page, 'XL');
	await sleep(6000);
	await chartsSettled(page);
	await shot(page, 'agentic-dashboards-dimension-grid-packages-xl.png', {
		sections: ['Paketgrösse wählen', 'Monatlicher Umsatz-Trend']
	});

	await browser.close();
	console.log('Fertig.');
})();
