---
title: Response Package Sales
---

# Response Package Sales

Verkaufsperformance der Response-Pakete (S, M, XL). Single Source of Truth: `response_packages` – nicht zusätzlich aus `invoices` rechnen, das wäre Doppelzählung.

<Dropdown name=country defaultValue='%' title='Land'>
  <DropdownOption value='%'  valueLabel='Alle Länder' />
  <DropdownOption value='CH' valueLabel='Schweiz' />
  <DropdownOption value='DE' valueLabel='Deutschland' />
  <DropdownOption value='AT' valueLabel='Österreich' />
  <DropdownOption value='FR' valueLabel='Frankreich' />
  <DropdownOption value='IT' valueLabel='Italien' />
</Dropdown>

```sql current_month_packages
select
  round(sum(p.price_chf), 2) as revenue_chf,
  count(*) as packages_sold
from pulscheck.response_packages p
join pulscheck.customers c on c.id = p.customer_id
where p.purchased_at >= '2026-04-01 00:00:00+02:00'
  and p.purchased_at <  '2026-05-01 00:00:00+02:00'
  and c.country like '${inputs.country.value}'
```

<BigValue
  data={current_month_packages}
  value=revenue_chf
  fmt='#,##0'
  title='Paket-Umsatz April (CHF)'
/>

<BigValue
  data={current_month_packages}
  value=packages_sold
  fmt='#,##0'
  title='Pakete verkauft'
/>

## Umsatzanteile nach Paketgrösse (letzte 90 Tage)

```sql revenue_by_size
with q as (
  select p.package_size, p.price_chf
  from pulscheck.response_packages p
  join pulscheck.customers c on c.id = p.customer_id
  where p.purchased_at >= '2026-02-01 00:00:00+01:00'
    and p.purchased_at <  '2026-05-01 00:00:00+02:00'
    and c.country like '${inputs.country.value}'
)
select
  package_size,
  round(sum(price_chf), 2) as revenue_chf,
  count(*) as packages_sold,
  round(100.0 * sum(price_chf) / (select sum(price_chf) from q), 1) as share_pct
from q
group by 1
order by revenue_chf desc
```

<BarChart
  data={revenue_by_size}
  x=package_size
  y=revenue_chf
  title='Umsatz pro Paketgrösse (CHF, 90 Tage)'
  yFmt='#,##0'
/>

<DataTable data={revenue_by_size}>
  <Column id=package_size title='Paket' />
  <Column id=packages_sold title='Verkauft' fmt='#,##0' />
  <Column id=revenue_chf title='Umsatz (CHF)' fmt='#,##0' />
  <Column id=share_pct title='Anteil (%)' fmt='0.0' />
</DataTable>

## Paketgrösse wählen

Klicken Sie eine Paketgrösse an, um den Umsatz-Trend und die Top-Käufer:innen darunter auf diese Grösse einzugrenzen. Ohne Auswahl werden alle Grössen gezeigt. Die Kacheln respektieren den Länder-Filter oben.

```sql pkg_base
select
  p.package_size as paket,
  p.price_chf
from pulscheck.response_packages p
join pulscheck.customers c on c.id = p.customer_id
where p.purchased_at >= '2026-02-01 00:00:00+01:00'
  and p.purchased_at <  '2026-05-01 00:00:00+02:00'
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

## Monatlicher Umsatz-Trend

```sql revenue_trend
select
  month,
  paket as package_size,
  round(sum(price), 2) as revenue_chf
from (
  select
    date_trunc('month', cast(p.purchased_at as timestamp)) as month,
    p.package_size as paket,
    p.price_chf as price
  from pulscheck.response_packages p
  join pulscheck.customers c on c.id = p.customer_id
  where p.purchased_at >= '2025-05-01 00:00:00+02:00'
    and c.country like '${inputs.country.value}'
)
where ${inputs.pkgsize}
group by 1, 2
order by 1, 2
```

<AreaChart
  data={revenue_trend}
  x=month
  y=revenue_chf
  series=package_size
  title='Monatlicher Paket-Umsatz nach Grösse (CHF)'
  yFmt='#,##0'
/>

## Top-Käufer:innen (letzte 90 Tage)

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
  where p.purchased_at >= '2026-02-01 00:00:00+01:00'
    and p.purchased_at <  '2026-05-01 00:00:00+02:00'
    and c.country like '${inputs.country.value}'
)
where ${inputs.pkgsize}
group by 1, 2
order by total_chf desc
limit 20
```

<DataTable data={top_customers} rows=10>
  <Column id=country title='Land' />
  <Column id=email title='E-Mail' />
  <Column id=packages_bought title='Pakete' fmt='#,##0' />
  <Column id=total_chf title='Umsatz (CHF)' fmt='#,##0' />
</DataTable>
