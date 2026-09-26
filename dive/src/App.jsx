import { useEffect, useState } from 'react'
import { initDuckDB, rows } from './duckdb'
import * as q from './queries'
import { fmtInt, fmtPct } from './format'
import { AnswersLine, GeoBars, RevenueArea, SizeBars, TrendBySize } from './charts'

function pivotTrend(rowsIn) {
  const sizes = [...new Set(rowsIn.map((r) => r.package_size))]
  const byDay = new Map()
  for (const r of rowsIn) {
    const key = String(r.day)
    if (!byDay.has(key)) {
      const entry = { day: r.day }
      for (const s of sizes) entry[s] = 0
      byDay.set(key, entry)
    }
    byDay.get(key)[r.package_size] = r.revenue_chf
  }
  return { data: [...byDay.values()], sizes }
}

function Kpi({ title, value, sub, accent }) {
  return (
    <div className={'kpi' + (accent ? ' kpi-accent' : '')}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function Section({ title, text, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {text && <p className="section-text">{text}</p>}
      {children}
    </section>
  )
}

export default function App() {
  const [conn, setConn] = useState(null)
  const [initStatus, setInitStatus] = useState('Initialisiere DuckDB (WebAssembly) …')
  const [totalRows, setTotalRows] = useState(null)
  const [error, setError] = useState(null)

  const [days, setDays] = useState(30)
  const [country, setCountry] = useState('%')
  const [pkg, setPkg] = useState(null)

  const [result, setResult] = useState(null)
  const [ms, setMs] = useState(null)

  // Einmalige Initialisierung: WASM starten, Parquet laden, Views anlegen.
  useEffect(() => {
    let live = true
    initDuckDB((s) => live && setInitStatus(s))
      .then(async (c) => {
        if (!live) return
        const [{ n }] = await rows(
          c.conn,
          `select sum(n) as n from (
             select count(*) as n from pulscheck.customers
             union all select count(*) from pulscheck.invoices
             union all select count(*) from pulscheck.response_packages
             union all select count(*) from pulscheck.subscriptions
             union all select count(*) from pulscheck.survey_responses
           )`,
        )
        if (!live) return
        setTotalRows(Number(n))
        setConn(c.conn)
      })
      .catch((e) => live && setError(String(e)))
    return () => {
      live = false
    }
  }, [])

  // Bei jeder Filter-Änderung: alle Queries erneut — im Browser, in Millisekunden.
  useEffect(() => {
    if (!conn) return
    let live = true
    const t0 = performance.now()
    Promise.all([
      rows(conn, q.kpis(days, country)),
      rows(conn, q.mrr(country)),
      rows(conn, q.dailyAnswers(days, country)),
      rows(conn, q.dailyRevenue(days, country)),
      rows(conn, q.revenueBySize(days, country)),
      rows(conn, q.pkgChips(days, country)),
      rows(conn, q.revenueTrendBySize(days, country, pkg)),
      rows(conn, q.answersByCountry(days, country)),
      rows(conn, q.topCustomers(days, country, pkg)),
    ])
      .then(([kpis, mrr, dailyAnswers, dailyRevenue, bySize, chips, trend, geo, top]) => {
        if (!live) return
        setMs(Math.max(1, Math.round(performance.now() - t0)))
        setResult({
          kpi: kpis[0],
          mrr: mrr[0]?.mrr_chf,
          dailyAnswers,
          dailyRevenue,
          bySize,
          chips,
          trend: pivotTrend(trend),
          geo,
          top,
        })
      })
      .catch((e) => live && setError(String(e)))
    return () => {
      live = false
    }
  }, [conn, days, country, pkg])

  const windowLabel = q.WINDOWS.find((w) => w.days === days)?.label ?? ''

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <div className="brand">PulsCheck <span className="brand-accent">· Product Metrics Dive</span></div>
          <p className="lead">
            Interaktive Gesamtansicht im Stil eines MotherDuck-Dives: React + SQL,
            DuckDB läuft als WebAssembly in Ihrem Browser. Stichtag der Daten: 30.&nbsp;April 2026
            (Europe/Zurich) — die Zeitfenster laufen bis zu diesem Stichtag. Die MRR-Kachel ist
            stichtagsbasiert und reagiert nur auf den Länder-Filter.
          </p>
        </div>
        <div className="header-meta">
          <span className="badge">Live Queries · DuckDB WASM</span>
          {totalRows != null && (
            <span className="meta-line">{fmtInt(totalRows)} Zeilen im Browser</span>
          )}
          {ms != null && <span className="meta-line latency">{ms} ms Abfragezeit</span>}
        </div>
      </header>

      <div className="filters">
        <div className="filter-group">
          <span className="filter-label">Zeitfenster</span>
          <div className="seg">
            {q.WINDOWS.map((w) => (
              <button
                key={w.days}
                className={'seg-btn' + (days === w.days ? ' active' : '')}
                onClick={() => setDays(w.days)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Land</span>
          <select
            className="select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {q.COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {!conn && !error && <div className="loading">{initStatus}</div>}

      {result && (
        <>
          <div className="kpi-grid">
            <Kpi title={`Paket-Umsatz ${windowLabel} (CHF)`} value={fmtInt(result.kpi.window_revenue_chf)} />
            <Kpi title="Pakete verkauft" value={fmtInt(result.kpi.window_packages)} />
            <Kpi title="Abgeschlossene Antworten" value={fmtInt(result.kpi.window_answers)} />
            <Kpi title="Ø Antwortdauer (Sek.)" value={fmtInt(result.kpi.window_avg_duration_sec)} />
            <Kpi title="MRR Stichtag (CHF)" value={fmtInt(result.mrr)} sub="Stand 30.04.2026" accent />
          </div>

          <Section
            title="Antworten pro Tag"
            text="Tägliche abgeschlossene Antworten (is_complete = true) im gewählten Zeitfenster, gefiltert nach Land der Befragten. Wochenend-Einbrüche und Kampagnen-Spitzen sind direkt sichtbar."
          >
            <AnswersLine data={result.dailyAnswers} />
          </Section>

          <Section
            title="Paket-Umsatz pro Tag"
            text="Täglicher Paket-Umsatz im selben Zeitfenster. Single Source of Truth ist response_packages — invoices wird nicht additiv einbezogen. Der Länder-Filter bezieht sich auf das Land der Käufer:innen."
          >
            <RevenueArea data={result.dailyRevenue} />
          </Section>

          <Section title="Umsatz-Mix nach Paketgrösse"
            text={`Anteil der Paketgrössen S, M und XL am Umsatz ${windowLabel.toLowerCase()}.`}
          >
            <SizeBars data={result.bySize} />
            <table className="table">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th className="num">Verkauft</th>
                  <th className="num">Umsatz (CHF)</th>
                  <th className="num">Anteil (%)</th>
                </tr>
              </thead>
              <tbody>
                {result.bySize.map((r) => (
                  <tr key={r.package_size}>
                    <td>{r.package_size}</td>
                    <td className="num">{fmtInt(r.packages_sold)}</td>
                    <td className="num">{fmtInt(r.revenue_chf)}</td>
                    <td className="num">{fmtPct(r.share_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section
            title="Paketgrösse wählen"
            text="Klicken Sie eine Paketgrösse an, um den täglichen Umsatz-Trend und die Top-Kund:innen darunter auf diese Grösse einzugrenzen. Erneuter Klick hebt die Auswahl auf."
          >
            <div className="chips">
              {result.chips.map((c) => (
                <button
                  key={c.paket}
                  className={'chip' + (pkg === c.paket ? ' active' : '')}
                  onClick={() => setPkg(pkg === c.paket ? null : c.paket)}
                >
                  {c.paket} · {fmtInt(c.chf)} CHF
                </button>
              ))}
            </div>
          </Section>

          <Section title="Umsatz-Trend nach Paketgrösse">
            <TrendBySize data={result.trend.data} sizes={result.trend.sizes} />
          </Section>

          <Section
            title="Geografie der Antwortenden"
            text={`Antworten nach Land der Befragten ${windowLabel.toLowerCase()}. Der Länder-Filter greift hier auf respondent_country durch — bei einem gefilterten Land zeigt der Chart entsprechend nur dieses.`}
          >
            <GeoBars data={result.geo} />
          </Section>

          <Section
            title="Top-Kund:innen nach Paket-Umsatz"
            text={`Die umsatzstärksten Kund:innen ${windowLabel.toLowerCase()}; die Paketgrössen-Auswahl grenzt diese Tabelle ebenfalls ein.`}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Land</th>
                  <th>E-Mail</th>
                  <th className="num">Pakete</th>
                  <th className="num">Umsatz (CHF)</th>
                </tr>
              </thead>
              <tbody>
                {result.top.map((r) => (
                  <tr key={r.email}>
                    <td>{r.country}</td>
                    <td>{r.email}</td>
                    <td className="num">{fmtInt(r.packages_bought)}</td>
                    <td className="num">{fmtInt(r.total_chf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <footer className="footer">
            React + SQL · sämtliche Queries in <code>src/queries.js</code> auditierbar ·
            DuckDB rechnet lokal in Ihrem Browser (Dual-Execution-Prinzip) ·
            synthetische Demo-Daten (Seed 42), Stichtag 30. April 2026
          </footer>
        </>
      )}
    </div>
  )
}
