import { useSQLQuery, useDiveState } from '@motherduck/react-sql-query';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ReactNode, CSSProperties } from 'react';

export const REQUIRED_DATABASES = [
  { type: 'database', path: 'md:pulscheck', alias: 'pulscheck' },
];

// ── Palette ─────────────────────────────────────────────────────────
const accent    = '#FF9538';
const accentSoft= '#fff3e6';
const ink       = '#1f2937';
const inkSoft   = '#6b7280';
const line      = '#e8e5df';
const bg        = '#faf9f7';
const card      = '#ffffff';

// ── Helpers ─────────────────────────────────────────────────────────
const N    = (v: unknown): number => (v != null ? Number(v) : 0);
const fmtN = (v: unknown) => Math.round(N(v)).toLocaleString('de-CH');
const fmtP = (v: unknown) => `${N(v).toFixed(1)} %`;
// '2026-04-30' → '04-30'
const day  = (s: string) => String(s).slice(5);

// ── SQL builders ─────────────────────────────────────────────────────
const END  = "timestamp '2026-05-01'";
const snc  = (d: number) => `${END} - to_days(${d})`;
const tw   = (col: string, d: number) =>
  `cast(${col} as timestamp) >= ${snc(d)} AND cast(${col} as timestamp) < ${END}`;

// ── Trend pivot ──────────────────────────────────────────────────────
function pivotTrend(rows: readonly Record<string, unknown>[]) {
  const sizes = [...new Set(rows.map(r => String(r.package_size)))] as string[];
  const map = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const k = String(r.day);
    if (!map.has(k)) { const e: Record<string, unknown> = { day: day(k) }; sizes.forEach(s => (e[s] = 0)); map.set(k, e); }
    map.get(k)![String(r.package_size)] = N(r.revenue_chf);
  }
  return { data: [...map.values()], sizes };
}

// ── Chart helpers ────────────────────────────────────────────────────
const ax  = { fontSize: 11, fill: inkSoft };
const tip = { borderRadius: 8, border: `1px solid ${line}`, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };
const TREND_COLORS: Record<string, string> = { S: '#60a5fa', M: '#FF9538', XL: '#34d399' };

// ── Table styles ─────────────────────────────────────────────────────
const TH: CSSProperties = {
  textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
  color: inkSoft, borderBottom: `1px solid ${line}`, padding: '8px 10px', fontWeight: 600,
};
const THR: CSSProperties = { ...TH, textAlign: 'right' };
const TD: CSSProperties  = { padding: '8px 10px', borderBottom: '1px solid #f2f0ec', fontSize: 13 };
const TDR: CSSProperties = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

// ── UI atoms ─────────────────────────────────────────────────────────
function Skel({ h }: { h: number }) {
  return <div style={{ height: h, background: '#e5e7eb', borderRadius: 8, marginTop: 4 }} />;
}
function Err({ err }: { err: Error | null }) {
  return <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{String(err)}</p>;
}
function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: card, border: `1px solid ${line}`, borderRadius: 12, padding: 20, marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}
function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: text ? 4 : 12 }}>{title}</div>
      {text && <p style={{ fontSize: 13, color: inkSoft, lineHeight: 1.5, margin: '0 0 14px' }}>{text}</p>}
      {children}
    </Card>
  );
}
function Kpi({ title, value, sub, hi, loading, isError }: {
  title: string; value: string; sub?: string; hi?: boolean; loading: boolean; isError: boolean;
}) {
  return (
    <div style={{ background: hi ? accentSoft : card, border: `1px solid ${hi ? accent : line}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: inkSoft, marginBottom: 6, minHeight: 28, lineHeight: 1.3 }}>{title}</div>
      {loading
        ? <div style={{ height: 30, width: 80, background: '#e5e7eb', borderRadius: 4 }} />
        : isError
        ? <div style={{ fontSize: 26, fontWeight: 700 }}>—</div>
        : <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      }
      {sub && <div style={{ fontSize: 11, color: inkSoft, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Filter constants ─────────────────────────────────────────────────
const WINDOWS = [
  { days: 7,   label: 'Letzte 7 Tage' },
  { days: 30,  label: 'Letzte 30 Tage' },
  { days: 90,  label: 'Letzte 90 Tage' },
  { days: 365, label: 'Letzte 12 Monate' },
];
const COUNTRIES = [
  { value: '%',  label: 'Alle Länder' },
  { value: 'CH', label: 'Schweiz' },
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'FR', label: 'Frankreich' },
  { value: 'IT', label: 'Italien' },
];

// ── Main Dive ─────────────────────────────────────────────────────────
export default function PulsCheckDive() {
  const [days,        setDays]        = useDiveState<number>('days', 30);
  const [country,     setCountry]     = useDiveState<string>('country', '%');
  const [selectedPkg, setSelectedPkg] = useDiveState<string | null>('pkg', null);

  const wLabel = WINDOWS.find(w => w.days === days)?.label ?? '';
  const cc = `c.country LIKE '${country}'`;
  const rc = `r.respondent_country LIKE '${country}'`;

  // ── KPI + MRR ──────────────────────────────────────────────────────
  const kpiQ = useSQLQuery(`
    SELECT
      (SELECT round(sum(p.price_chf), 2)
         FROM "pulscheck"."main"."response_packages" p
         JOIN "pulscheck"."main"."customers" c ON c.id = p.customer_id
         WHERE ${tw('p.purchased_at', days)} AND ${cc}) AS window_revenue_chf,
      (SELECT count(*)
         FROM "pulscheck"."main"."response_packages" p
         JOIN "pulscheck"."main"."customers" c ON c.id = p.customer_id
         WHERE ${tw('p.purchased_at', days)} AND ${cc}) AS window_packages,
      (SELECT count(*)
         FROM "pulscheck"."main"."survey_responses" r
         WHERE r.is_complete = true AND ${tw('r.completed_at', days)} AND ${rc}) AS window_answers,
      (SELECT round(avg(r.response_duration_seconds), 0)
         FROM "pulscheck"."main"."survey_responses" r
         WHERE r.is_complete = true AND ${tw('r.completed_at', days)} AND ${rc}) AS window_avg_duration_sec,
      (SELECT round(sum(s.monthly_price_chf), 2)
         FROM "pulscheck"."main"."subscriptions" s
         JOIN "pulscheck"."main"."customers" c ON c.id = s.customer_id
         WHERE cast(s.started_at as timestamp) <= timestamp '2026-04-30 23:59:59'
           AND (s.canceled_at IS NULL OR cast(s.canceled_at as timestamp) > timestamp '2026-04-30 23:59:59')
           AND ${cc}) AS mrr_chf
  `);
  const kpi = Array.isArray(kpiQ.data) ? kpiQ.data[0] : undefined;

  // ── Daily answers (date spine) ──────────────────────────────────────
  const answersQ = useSQLQuery(`
    SELECT
      strftime(spine.day, '%Y-%m-%d') AS day,
      COALESCE(count(r.completed_at), 0) AS answers
    FROM generate_series((${snc(days)})::DATE, DATE '2026-04-30', INTERVAL 1 DAY) AS spine(day)
    LEFT JOIN "pulscheck"."main"."survey_responses" r
      ON cast(r.completed_at AS DATE) = spine.day
      AND r.is_complete = true
      AND r.respondent_country LIKE '${country}'
    GROUP BY 1 ORDER BY 1
  `);
  const answersChart = (Array.isArray(answersQ.data) ? answersQ.data : [])
    .map(r => ({ day: day(String(r.day)), answers: N(r.answers) }));

  // ── Daily revenue (date spine) ──────────────────────────────────────
  const cJoin = country !== '%'
    ? `AND EXISTS (SELECT 1 FROM "pulscheck"."main"."customers" c WHERE c.id = p.customer_id AND c.country = '${country}')`
    : '';
  const dailyRevQ = useSQLQuery(`
    SELECT
      strftime(spine.day, '%Y-%m-%d') AS day,
      COALESCE(round(sum(p.price_chf), 2), 0) AS revenue_chf
    FROM generate_series((${snc(days)})::DATE, DATE '2026-04-30', INTERVAL 1 DAY) AS spine(day)
    LEFT JOIN "pulscheck"."main"."response_packages" p
      ON cast(p.purchased_at AS DATE) = spine.day ${cJoin}
    GROUP BY 1 ORDER BY 1
  `);
  const revenueChart = (Array.isArray(dailyRevQ.data) ? dailyRevQ.data : [])
    .map(r => ({ day: day(String(r.day)), revenue_chf: N(r.revenue_chf) }));

  // ── Revenue by size ─────────────────────────────────────────────────
  const sizeQ = useSQLQuery(`
    SELECT package_size, packages_sold, revenue_chf,
      round(100.0 * revenue_chf / sum(revenue_chf) OVER (), 1) AS share_pct
    FROM (
      SELECT p.package_size, count(*) AS packages_sold,
        round(sum(p.price_chf), 2) AS revenue_chf
      FROM "pulscheck"."main"."response_packages" p
      JOIN "pulscheck"."main"."customers" c ON c.id = p.customer_id
      WHERE ${tw('p.purchased_at', days)} AND ${cc}
      GROUP BY 1
    ) ORDER BY revenue_chf DESC
  `);
  const sizeRows = (Array.isArray(sizeQ.data) ? sizeQ.data : []).map(r => ({
    package_size: String(r.package_size),
    packages_sold: N(r.packages_sold),
    revenue_chf: N(r.revenue_chf),
    share_pct: N(r.share_pct),
  }));

  // ── Package chips ───────────────────────────────────────────────────
  const chipsQ = useSQLQuery(`
    SELECT p.package_size AS paket, round(sum(p.price_chf), 2) AS chf
    FROM "pulscheck"."main"."response_packages" p
    JOIN "pulscheck"."main"."customers" c ON c.id = p.customer_id
    WHERE ${tw('p.purchased_at', days)} AND ${cc}
    GROUP BY 1 ORDER BY 1
  `);
  const chips = (Array.isArray(chipsQ.data) ? chipsQ.data : []).map(r => ({
    paket: String(r.paket), chf: N(r.chf),
  }));

  // ── Revenue trend by size ───────────────────────────────────────────
  const pkgWhere = selectedPkg ? `AND p.package_size = '${selectedPkg}'` : '';
  const trendQ = useSQLQuery(`
    SELECT
      strftime(cast(p.purchased_at AS DATE), '%Y-%m-%d') AS day,
      p.package_size AS package_size,
      round(sum(p.price_chf), 2) AS revenue_chf
    FROM "pulscheck"."main"."response_packages" p
    JOIN "pulscheck"."main"."customers" c ON c.id = p.customer_id
    WHERE ${tw('p.purchased_at', days)} AND ${cc} ${pkgWhere}
    GROUP BY 1, 2 ORDER BY 1, 2
  `);
  const trend = pivotTrend(
    (Array.isArray(trendQ.data) ? trendQ.data : []) as readonly Record<string, unknown>[]
  );

  // ── Geography ───────────────────────────────────────────────────────
  const geoQ = useSQLQuery(`
    SELECT respondent_country AS country, count(*) AS answers
    FROM "pulscheck"."main"."survey_responses"
    WHERE is_complete = true AND ${tw('completed_at', days)}
      AND respondent_country LIKE '${country}'
    GROUP BY 1 ORDER BY answers DESC LIMIT 15
  `);
  const geoRows = (Array.isArray(geoQ.data) ? geoQ.data : []).map(r => ({
    country: String(r.country ?? ''), answers: N(r.answers),
  }));

  // ── Top customers ───────────────────────────────────────────────────
  const topQ = useSQLQuery(`
    SELECT c.country, c.email,
      count(*) AS packages_bought,
      round(sum(p.price_chf), 2) AS total_chf
    FROM "pulscheck"."main"."response_packages" p
    JOIN "pulscheck"."main"."customers" c ON c.id = p.customer_id
    WHERE ${tw('p.purchased_at', days)} AND ${cc} ${pkgWhere}
    GROUP BY c.country, c.email
    ORDER BY total_chf DESC LIMIT 10
  `);
  const topRows = (Array.isArray(topQ.data) ? topQ.data : []).map(r => ({
    country: String(r.country ?? ''), email: String(r.email ?? ''),
    packages_bought: N(r.packages_bought), total_chf: N(r.total_chf),
  }));

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 20px 48px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: bg, color: ink, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
            PulsCheck <span style={{ color: accent, fontWeight: 600 }}>· Product Metrics Dive</span>
          </div>
          <p style={{ margin: '8px 0 0', maxWidth: 600, fontSize: 13, lineHeight: 1.55, color: inkSoft }}>
            Interaktive Gesamtansicht: React&nbsp;+&nbsp;SQL, DuckDB läuft als WebAssembly im Browser via MotherDuck Dive.
            Stichtag: 30.&nbsp;April&nbsp;2026 – Zeitfenster und MRR laufen bis zu diesem Datum.
          </p>
        </div>
        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: ink, color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Live Queries · MotherDuck
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', padding: '14px 16px', background: card, border: `1px solid ${line}`, borderRadius: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zeitfenster</span>
          <div style={{ display: 'flex', background: bg, border: `1px solid ${line}`, borderRadius: 8, padding: 2 }}>
            {WINDOWS.map(w => (
              <button key={w.days} onClick={() => setDays(w.days)} style={{ border: 'none', background: days === w.days ? accent : 'transparent', color: days === w.days ? '#fff' : inkSoft, padding: '6px 12px', fontSize: 13, borderRadius: 6, cursor: 'pointer', fontWeight: days === w.days ? 600 : 400 }}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Land</span>
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ padding: '7px 10px', fontSize: 13, border: `1px solid ${line}`, borderRadius: 8, background: '#fff', color: ink, cursor: 'pointer' }}>
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Kpi title={`Paket-Umsatz ${wLabel} (CHF)`}  value={fmtN(kpi?.window_revenue_chf)}       loading={kpiQ.isLoading} isError={kpiQ.isError} />
        <Kpi title="Pakete verkauft"                   value={fmtN(kpi?.window_packages)}            loading={kpiQ.isLoading} isError={kpiQ.isError} />
        <Kpi title="Abgeschlossene Antworten"          value={fmtN(kpi?.window_answers)}             loading={kpiQ.isLoading} isError={kpiQ.isError} />
        <Kpi title="Ø Antwortdauer (Sek.)"             value={fmtN(kpi?.window_avg_duration_sec)}    loading={kpiQ.isLoading} isError={kpiQ.isError} />
        <Kpi title="MRR Stichtag (CHF)" sub="Stand 30.04.2026" hi value={fmtN(kpi?.mrr_chf)} loading={kpiQ.isLoading} isError={kpiQ.isError} />
      </div>

      {/* Antworten pro Tag */}
      <Section title="Antworten pro Tag" text="Tägliche abgeschlossene Antworten (is_complete = true) im gewählten Zeitfenster, gefiltert nach Land der Befragten. Wochenend-Einbrüche und Kampagnen-Spitzen sind direkt sichtbar.">
        {answersQ.isLoading ? <Skel h={260} /> : answersQ.isError ? <Err err={answersQ.error} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={answersChart} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="day" tick={ax} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={ax} tickLine={false} axisLine={false} tickFormatter={fmtN} width={48} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [fmtN(v), 'Antworten']} />
              <Line type="monotone" dataKey="answers" stroke={accent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Paket-Umsatz pro Tag */}
      <Section title="Paket-Umsatz pro Tag" text="Täglicher Paket-Umsatz im selben Zeitfenster. Single Source of Truth ist response_packages — invoices wird nicht additiv einbezogen.">
        {dailyRevQ.isLoading ? <Skel h={260} /> : dailyRevQ.isError ? <Err err={dailyRevQ.error} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueChart} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="day" tick={ax} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={ax} tickLine={false} axisLine={false} tickFormatter={fmtN} width={48} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [`${fmtN(v)} CHF`, 'Umsatz']} />
              <Area type="monotone" dataKey="revenue_chf" stroke={accent} fill="url(#revFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Umsatz-Mix */}
      <Section title="Umsatz-Mix nach Paketgrösse" text={`Anteil der Paketgrössen S, M und XL am Umsatz ${wLabel.toLowerCase()}.`}>
        {sizeQ.isLoading ? <Skel h={260} /> : sizeQ.isError ? <Err err={sizeQ.error} /> : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sizeRows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="package_size" tick={ax} tickLine={false} axisLine={false} />
                <YAxis tick={ax} tickLine={false} axisLine={false} tickFormatter={fmtN} width={48} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [`${fmtN(v)} CHF`, 'Umsatz']} />
                <Bar dataKey="revenue_chf" fill={accent} radius={[6, 6, 0, 0]} maxBarSize={80} />
              </BarChart>
            </ResponsiveContainer>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14 }}>
              <thead><tr>
                <th style={TH}>Paket</th>
                <th style={THR}>Verkauft</th>
                <th style={THR}>Umsatz (CHF)</th>
                <th style={THR}>Anteil (%)</th>
              </tr></thead>
              <tbody>
                {sizeRows.map(r => (
                  <tr key={r.package_size}>
                    <td style={TD}>{r.package_size}</td>
                    <td style={TDR}>{fmtN(r.packages_sold)}</td>
                    <td style={TDR}>{fmtN(r.revenue_chf)}</td>
                    <td style={TDR}>{fmtP(r.share_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Section>

      {/* Chips */}
      <Section title="Paketgrösse wählen" text="Klicken Sie eine Paketgrösse an, um Trend und Top-Kund:innen einzugrenzen. Erneuter Klick hebt die Auswahl auf.">
        {chipsQ.isLoading ? <Skel h={44} /> : chipsQ.isError ? <Err err={chipsQ.error} /> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {chips.map(c => (
              <button key={c.paket} onClick={() => setSelectedPkg(selectedPkg === c.paket ? null : c.paket)}
                style={{ border: `1px solid ${selectedPkg === c.paket ? accent : line}`, background: selectedPkg === c.paket ? accent : bg, padding: '8px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', color: selectedPkg === c.paket ? '#fff' : ink, fontWeight: selectedPkg === c.paket ? 600 : 400 }}>
                {c.paket} · {fmtN(c.chf)} CHF
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Trend by size */}
      <Section title="Umsatz-Trend nach Paketgrösse">
        {trendQ.isLoading ? <Skel h={280} /> : trendQ.isError ? <Err err={trendQ.error} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend.data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="day" tick={ax} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={ax} tickLine={false} axisLine={false} tickFormatter={fmtN} width={48} />
              <Tooltip contentStyle={tip} formatter={(v: number, name: string) => [`${fmtN(v)} CHF`, `Paket ${name}`]} />
              {trend.sizes.map(s => (
                <Area key={s} type="monotone" dataKey={s} stackId="1"
                  stroke={TREND_COLORS[s] ?? '#94a3b8'} fill={TREND_COLORS[s] ?? '#94a3b8'}
                  fillOpacity={0.45} strokeWidth={1.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Geography */}
      <Section title="Geografie der Antwortenden" text={`Antworten nach Land der Befragten ${wLabel.toLowerCase()}.`}>
        {geoQ.isLoading ? <Skel h={220} /> : geoQ.isError ? <Err err={geoQ.error} /> : (
          <ResponsiveContainer width="100%" height={Math.max(200, geoRows.length * 34 + 40)}>
            <BarChart data={geoRows} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
              <XAxis type="number" tick={ax} tickLine={false} axisLine={false} tickFormatter={fmtN} />
              <YAxis type="category" dataKey="country" tick={ax} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [fmtN(v), 'Antworten']} />
              <Bar dataKey="answers" fill="#fbbf77" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Top customers */}
      <Section title="Top-Kund:innen nach Paket-Umsatz" text={`Umsatzstärkste Kund:innen ${wLabel.toLowerCase()}; die Paketgrössen-Auswahl grenzt diese Tabelle ein.`}>
        {topQ.isLoading ? <Skel h={200} /> : topQ.isError ? <Err err={topQ.error} /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={TH}>Land</th>
              <th style={TH}>E-Mail</th>
              <th style={THR}>Pakete</th>
              <th style={THR}>Umsatz (CHF)</th>
            </tr></thead>
            <tbody>
              {topRows.map(r => (
                <tr key={r.email}>
                  <td style={TD}>{r.country}</td>
                  <td style={TD}>{r.email}</td>
                  <td style={TDR}>{fmtN(r.packages_bought)}</td>
                  <td style={TDR}>{fmtN(r.total_chf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <div style={{ marginTop: 28, fontSize: 12, color: inkSoft, lineHeight: 1.6 }}>
        React + SQL · MotherDuck Dive · synthetische Demo-Daten (Seed&nbsp;42) · Stichtag 30.&nbsp;April&nbsp;2026
      </div>
    </div>
  );
}
