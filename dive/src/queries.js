// Alle SQL-Queries des Dives an einem Ort — auditierbar, versionierbar,
// identisch in der Logik zur DuckDB-Source. React rendert, DuckDB rechnet.
//
// Stichtag: der Datenraum endet am 30. April 2026 (Europe/Zurich). Die
// Zeitfenster laufen daher bis zum 1. Mai 2026 (exklusiv), nicht bis heute.

export const WINDOWS = [
  { days: 7, label: 'Letzte 7 Tage' },
  { days: 30, label: 'Letzte 30 Tage' },
  { days: 90, label: 'Letzte 90 Tage' },
  { days: 365, label: 'Letzte 12 Monate' },
]

export const COUNTRIES = [
  { value: '%', label: 'Alle Länder' },
  { value: 'CH', label: 'Schweiz' },
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'FR', label: 'Frankreich' },
  { value: 'IT', label: 'Italien' },
]

const WINDOW_END = "timestamp '2026-05-01'"

const since = (days) => `${WINDOW_END} - to_days(${days})`
const until = () => WINDOW_END
const ownerCountry = (country) => `c.country like '${country}'`

// Zeitfenster-Bound für eine Tabelle mit Zeitstempel-Spalte.
const inWindow = (col, days) =>
  `cast(${col} as timestamp) >= ${since(days)} and cast(${col} as timestamp) < ${until()}`

// KPI-Kacheln: Paket-Umsatz, Pakete, Antworten, Ø Antwortdauer.
// SSOT: Paket-Umsatz ausschliesslich aus response_packages (niemals invoices),
// Antworten ausschliesslich is_complete = true.
export const kpis = (days, country) => `
select
  (select round(sum(p.price_chf), 2)
     from pulscheck.response_packages p
     join pulscheck.customers c on c.id = p.customer_id
     where ${inWindow('p.purchased_at', days)}
       and ${ownerCountry(country)}) as window_revenue_chf,
  (select count(*)
     from pulscheck.response_packages p
     join pulscheck.customers c on c.id = p.customer_id
     where ${inWindow('p.purchased_at', days)}
       and ${ownerCountry(country)}) as window_packages,
  (select count(*)
     from pulscheck.survey_responses r
     where r.is_complete = true
       and ${inWindow('r.completed_at', days)}
       and r.respondent_country like '${country}') as window_answers,
  (select round(avg(r.response_duration_seconds), 0)
     from pulscheck.survey_responses r
     where r.is_complete = true
       and ${inWindow('r.completed_at', days)}
       and r.respondent_country like '${country}') as window_avg_duration_sec
`

// MRR ist stichtagsbasiert (nicht fensterbasiert) und reagiert nur auf den
// Länder-Filter. Quelle: subscriptions.monthly_price_chf.
export const mrr = (country) => `
select round(sum(s.monthly_price_chf), 2) as mrr_chf
from pulscheck.subscriptions s
join pulscheck.customers c on c.id = s.customer_id
where cast(s.started_at as timestamp) <= timestamp '2026-04-30 23:59:59'
  and (s.canceled_at is null or cast(s.canceled_at as timestamp) > timestamp '2026-04-30 23:59:59')
  and ${ownerCountry(country)}
`

export const dailyAnswers = (days, country) => `
select
  cast(r.completed_at as date) as day,
  count(*) as answers
from pulscheck.survey_responses r
where r.is_complete = true
  and ${inWindow('r.completed_at', days)}
  and r.respondent_country like '${country}'
group by 1
order by 1
`

export const dailyRevenue = (days, country) => `
select
  cast(p.purchased_at as date) as day,
  round(sum(p.price_chf), 2) as revenue_chf
from pulscheck.response_packages p
join pulscheck.customers c on c.id = p.customer_id
where ${inWindow('p.purchased_at', days)}
  and ${ownerCountry(country)}
group by 1
order by 1
`

// Umsatz-Mix mit Anteil über Window-Funktion statt Subquery.
export const revenueBySize = (days, country) => `
select
  package_size,
  packages_sold,
  revenue_chf,
  round(100.0 * revenue_chf / sum(revenue_chf) over (), 1) as share_pct
from (
  select
    p.package_size,
    count(*) as packages_sold,
    round(sum(p.price_chf), 2) as revenue_chf
  from pulscheck.response_packages p
  join pulscheck.customers c on c.id = p.customer_id
  where ${inWindow('p.purchased_at', days)}
    and ${ownerCountry(country)}
  group by 1
)
order by revenue_chf desc
`

// Werte für die klickbaren Paketgrössen-Chips (Cross-Filter wie DimensionGrid).
export const pkgChips = (days, country) => `
select paket, round(sum(price), 2) as chf
from (
  select
    p.package_size as paket,
    p.price_chf as price
  from pulscheck.response_packages p
  join pulscheck.customers c on c.id = p.customer_id
  where ${inWindow('p.purchased_at', days)}
    and ${ownerCountry(country)}
)
group by 1
order by 1
`

const pkgFilter = (pkg) => (pkg ? `where paket = '${pkg}'` : 'where true')

export const revenueTrendBySize = (days, country, pkg) => `
select
  day,
  paket as package_size,
  round(sum(price), 2) as revenue_chf
from (
  select
    cast(p.purchased_at as date) as day,
    p.package_size as paket,
    p.price_chf as price
  from pulscheck.response_packages p
  join pulscheck.customers c on c.id = p.customer_id
  where ${inWindow('p.purchased_at', days)}
    and ${ownerCountry(country)}
)
${pkgFilter(pkg)}
group by 1, 2
order by 1, 2
`

export const answersByCountry = (days, country) => `
select
  respondent_country as country,
  count(*) as answers
from pulscheck.survey_responses
where is_complete = true
  and ${inWindow('completed_at', days)}
  and respondent_country like '${country}'
group by 1
order by answers desc
limit 15
`

export const topCustomers = (days, country, pkg) => `
select
  country,
  email,
  count(*) as packages_bought,
  round(sum(price), 2) as total_chf
from (
  select
    c.country as country,
    c.email as email,
    p.package_size as paket,
    p.price_chf as price
  from pulscheck.response_packages p
  join pulscheck.customers c on c.id = p.customer_id
  where ${inWindow('p.purchased_at', days)}
    and ${ownerCountry(country)}
)
${pkgFilter(pkg)}
group by 1, 2
order by total_chf desc
limit 10
`
