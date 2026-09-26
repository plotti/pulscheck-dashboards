---
title: Product Metrics Dive
---

# Product Metrics Dive

Interaktive Gesamtansicht im Stil eines MotherDuck-Dives: Das Zeitfenster-Filter schaltet alle Kacheln und Charts gleichzeitig um, gerechnet wird bei jedem Build live gegen die DuckDB. Stichtag der Daten ist der 30. April 2026 (Europe/Zurich) – die Zeitfenster laufen daher bis zu diesem Stichtag, nicht bis heute. Die MRR-Kachel ist stichtagsbasiert und reagiert nur auf den Länder-Filter.

<Dropdown name=window defaultValue='30' title='Zeitfenster'>
  <DropdownOption value='7'   valueLabel='Letzte 7 Tage' />
  <DropdownOption value='30'  valueLabel='Letzte 30 Tage' />
  <DropdownOption value='90'  valueLabel='Letzte 90 Tage' />
  <DropdownOption value='365' valueLabel='Letzte 12 Monate' />
</Dropdown>

<Dropdown name=country defaultValue='%' title='Land'>
  <DropdownOption value='%'  valueLabel='Alle Länder' />
  <DropdownOption value='CH' valueLabel='Schweiz' />
  <DropdownOption value='DE' valueLabel='Deutschland' />
  <DropdownOption value='AT' valueLabel='Österreich' />
  <DropdownOption value='FR' valueLabel='Frankreich' />
  <DropdownOption value='IT' valueLabel='Italien' />
</Dropdown>

```sql dive_kpis
select
  (select round(sum(p.price_chf), 2)
     from pulscheck.response_packages p
     join pulscheck.customers c on c.id = p.customer_id
     where cast(p.purchased_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
       and cast(p.purchased_at as timestamp) <  timestamp '2026-05-01'
       and c.country like '${inputs.country.value}') as window_revenue_chf,
  (select count(*)
     from pulscheck.response_packages p
     join pulscheck.customers c on c.id = p.customer_id
     where cast(p.purchased_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
       and cast(p.purchased_at as timestamp) <  timestamp '2026-05-01'
       and c.country like '${inputs.country.value}') as window_packages,
  (select count(*)
     from pulscheck.survey_responses r
     where r.is_complete = true
       and cast(r.completed_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
       and cast(r.completed_at as timestamp) <  timestamp '2026-05-01'
       and r.respondent_country like '${inputs.country.value}') as window_answers,
  (select round(avg(r.response_duration_seconds), 0)
     from pulscheck.survey_responses r
     where r.is_complete = true
       and cast(r.completed_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
       and cast(r.completed_at as timestamp) <  timestamp '2026-05-01'
       and r.respondent_country like '${inputs.country.value}') as window_avg_duration_sec
```

<BigValue
  data={dive_kpis}
  value=window_revenue_chf
  fmt='#,##0'
  title='Paket-Umsatz im Zeitfenster (CHF)'
/>

<BigValue
  data={dive_kpis}
  value=window_packages
  fmt='#,##0'
  title='Pakete verkauft'
/>

<BigValue
  data={dive_kpis}
  value=window_answers
  fmt='#,##0'
  title='Abgeschlossene Antworten'
/>

<BigValue
  data={dive_kpis}
  value=window_avg_duration_sec
  fmt='#,##0'
  title='Ø Antwortdauer (Sek.)'
/>

```sql dive_mrr
select
  round(sum(s.monthly_price_chf), 2) as mrr_chf
from pulscheck.subscriptions s
join pulscheck.customers c on c.id = s.customer_id
where cast(s.started_at as timestamp) <= timestamp '2026-04-30 23:59:59'
  and (s.canceled_at is null or cast(s.canceled_at as timestamp) > timestamp '2026-04-30 23:59:59')
  and c.country like '${inputs.country.value}'
```

<BigValue
  data={dive_mrr}
  value=mrr_chf
  fmt='#,##0'
  title='MRR Stichtag (CHF)'
/>

## Antworten pro Tag

Tägliche abgeschlossene Antworten (`is_complete = true`) im gewählten Zeitfenster, gefiltert nach Land der Befragten. Wochenend-Einbrüche und Kampagnen-Spitzen sind hier direkt sichtbar.

```sql daily_answers
select
  cast(r.completed_at as date) as day,
  count(*) as answers
from pulscheck.survey_responses r
where r.is_complete = true
  and cast(r.completed_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
  and cast(r.completed_at as timestamp) <  timestamp '2026-05-01'
  and r.respondent_country like '${inputs.country.value}'
group by 1
order by 1
```

<LineChart
  data={daily_answers}
  x=day
  y=answers
  title='Abgeschlossene Antworten pro Tag'
  yFmt='#,##0'
/>

## Paket-Umsatz pro Tag

Täglicher Paket-Umsatz im selben Zeitfenster. Single Source of Truth ist `response_packages` – `invoices` wird hier nicht additiv einbezogen. Der Länder-Filter bezieht sich auf das Land der Käufer:innen.

```sql daily_revenue
select
  cast(p.purchased_at as date) as day,
  round(sum(p.price_chf), 2) as revenue_chf
from pulscheck.response_packages p
join pulscheck.customers c on c.id = p.customer_id
where cast(p.purchased_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
  and cast(p.purchased_at as timestamp) <  timestamp '2026-05-01'
  and c.country like '${inputs.country.value}'
group by 1
order by 1
```

<AreaChart
  data={daily_revenue}
  x=day
  y=revenue_chf
  title='Paket-Umsatz pro Tag (CHF)'
  yFmt='#,##0'
/>

## Umsatz-Mix nach Paketgrösse

Anteil der Paketgrössen S, M und XL am Umsatz im gewählten Zeitfenster.

```sql revenue_by_size
with q as (
  select
    p.package_size,
    p.price_chf
  from pulscheck.response_packages p
  join pulscheck.customers c on c.id = p.customer_id
  where cast(p.purchased_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
    and cast(p.purchased_at as timestamp) <  timestamp '2026-05-01'
    and c.country like '${inputs.country.value}'
)
select
  package_size,
  count(*) as packages_sold,
  round(sum(price_chf), 2) as revenue_chf,
  round(100.0 * sum(price_chf) / (select sum(price_chf) from q), 1) as share_pct
from q
group by 1
order by revenue_chf desc
```

<BarChart
  data={revenue_by_size}
  x=package_size
  y=revenue_chf
  title='Umsatz pro Paketgrösse (CHF)'
  yFmt='#,##0'
/>

<DataTable data={revenue_by_size}>
  <Column id=package_size title='Paket' />
  <Column id=packages_sold title='Verkauft' fmt='#,##0' />
  <Column id=revenue_chf title='Umsatz (CHF)' fmt='#,##0' />
  <Column id=share_pct title='Anteil (%)' fmt='0.0' />
</DataTable>

## Paketgrösse wählen

Klicken Sie eine Paketgrösse an, um den täglichen Umsatz-Trend und die Top-Kund:innen darunter auf diese Grösse einzugrenzen. Ohne Auswahl bleiben alle Grössen enthalten.

```sql pkg_base
select
  p.package_size as paket,
  p.price_chf
from pulscheck.response_packages p
join pulscheck.customers c on c.id = p.customer_id
where cast(p.purchased_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
  and cast(p.purchased_at as timestamp) <  timestamp '2026-05-01'
  and c.country like '${inputs.country.value}'
```

<DimensionGrid
  data={pkg_base}
  name=pkgsize
  metric='sum(price_chf)'
  metricLabel='CHF'
  fmt='#,##0'
  title='Paketgrösse als Filter'
/>

## Umsatz-Trend nach Paketgrösse

```sql revenue_trend_by_size
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
  where cast(p.purchased_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
    and cast(p.purchased_at as timestamp) <  timestamp '2026-05-01'
    and c.country like '${inputs.country.value}'
)
where ${inputs.pkgsize}
group by 1, 2
order by 1, 2
```

<AreaChart
  data={revenue_trend_by_size}
  x=day
  y=revenue_chf
  series=package_size
  title='Täglicher Paket-Umsatz nach Grösse (CHF)'
  yFmt='#,##0'
/>

## Geografie der Antwortenden

Antworten nach Land der Befragten im gewählten Zeitfenster. Der Länder-Filter oben greift hier auf `respondent_country` durch – bei einem gefilterten Land zeigt der Chart entsprechend nur dieses.

```sql answers_by_country
select
  respondent_country as country,
  count(*) as answers
from pulscheck.survey_responses
where is_complete = true
  and cast(completed_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
  and cast(completed_at as timestamp) <  timestamp '2026-05-01'
  and respondent_country like '${inputs.country.value}'
group by 1
order by answers desc
limit 15
```

<BarChart
  data={answers_by_country}
  x=country
  y=answers
  title='Antworten nach Land der Befragten'
  yFmt='#,##0'
  swapXY=true
/>

## Top-Kund:innen nach Paket-Umsatz

Die umsatzstärksten Kund:innen im gewählten Zeitfenster; die Paketgrössen-Auswahl oben grenzt diese Tabelle ebenfalls ein.

```sql top_customers
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
  where cast(p.purchased_at as timestamp) >= timestamp '2026-05-01' - to_days(cast('${inputs.window.value}' as int))
    and cast(p.purchased_at as timestamp) <  timestamp '2026-05-01'
    and c.country like '${inputs.country.value}'
)
where ${inputs.pkgsize}
group by 1, 2
order by total_chf desc
limit 10
```

<DataTable data={top_customers} rows=10>
  <Column id=country title='Land' />
  <Column id=email title='E-Mail' />
  <Column id=packages_bought title='Pakete' fmt='#,##0' />
  <Column id=total_chf title='Umsatz (CHF)' fmt='#,##0' />
</DataTable>
