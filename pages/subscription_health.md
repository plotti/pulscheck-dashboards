---
title: Subscription Health
---

# Subscription Health

MRR-Verlauf, Churn und Plan-Verteilung der PulsCheck-Subscription-Basis. Stichtag der Daten: 30. April 2026.

```sql current_state
select
  round(sum(monthly_price_chf), 2) as mrr_chf,
  count(*) as active_subscriptions
from pulscheck.subscriptions
where started_at <= '2026-04-30 23:59:59+02:00'
  and (canceled_at is null or canceled_at > '2026-04-30 23:59:59+02:00')
```

<BigValue
  data={current_state}
  value=mrr_chf
  fmt='#,##0'
  title='MRR Ende April 2026 (CHF)'
/>

<BigValue
  data={current_state}
  value=active_subscriptions
  fmt='#,##0'
  title='Aktive Subscriptions'
/>

## MRR-Verlauf (12 Monate)

```sql mrr_history
with months as (
  select
    date_trunc('month', d) as month
  from generate_series(
    timestamp '2025-05-01',
    timestamp '2026-04-01',
    interval '1 month'
  ) as t(d)
)
select
  m.month,
  round(sum(s.monthly_price_chf), 2) as mrr_chf,
  count(s.id) as active_subscriptions
from months m
left join pulscheck.subscriptions s
  on cast(s.started_at as timestamp) <= m.month + interval '1 month' - interval '1 second'
  and (s.canceled_at is null
       or cast(s.canceled_at as timestamp) > m.month + interval '1 month' - interval '1 second')
group by 1
order by 1
```

<LineChart
  data={mrr_history}
  x=month
  y=mrr_chf
  title='MRR-Verlauf (CHF)'
  yFmt='#,##0'
/>

<LineChart
  data={mrr_history}
  x=month
  y=active_subscriptions
  title='Aktive Subscriptions im Zeitverlauf'
  yFmt='#,##0'
/>

## Plan-Verteilung

```sql plan_distribution
select
  current_plan,
  count(*) as customers
from pulscheck.customers
group by current_plan
order by customers desc
```

<BarChart
  data={plan_distribution}
  x=current_plan
  y=customers
  title='Kund:innen nach Plan-Status'
  yFmt='#,##0'
/>

## Churn-Verlauf (12 Monate)

```sql churn_history
with months as (
  select date_trunc('month', d) as month
  from generate_series(timestamp '2025-05-01', timestamp '2026-04-01', interval '1 month') as t(d)
)
select
  m.month,
  count(s.id) as churned_customers,
  round(sum(s.monthly_price_chf), 2) as lost_mrr_chf
from months m
left join pulscheck.subscriptions s
  on cast(s.canceled_at as timestamp) >= m.month
  and cast(s.canceled_at as timestamp) <  m.month + interval '1 month'
  and cast(s.started_at as timestamp) < m.month
group by 1
order by 1
```

<AreaChart
  data={churn_history}
  x=month
  y=lost_mrr_chf
  title='Verlorener MRR durch Churn (CHF)'
  yFmt='#,##0'
/>

## Cohort-Retention (Anmeldemonat → Status nach 90 Tagen)

```sql cohort_retention
with cohorts as (
  select
    date_trunc('month', cast(c.signup_date as timestamp)) as cohort_month,
    c.id as customer_id,
    s.id as subscription_id,
    cast(s.started_at as timestamp) as started_at,
    cast(s.canceled_at as timestamp) as canceled_at
  from pulscheck.customers c
  left join pulscheck.subscriptions s on s.customer_id = c.id
  where c.signup_date >= '2024-06-01'
    and c.signup_date <  '2026-02-01'
)
select
  strftime(cohort_month, '%Y-%m') as cohort,
  count(distinct customer_id) as cohort_size,
  count(distinct case
    when subscription_id is not null
      and started_at is not null
      and (canceled_at is null
           or canceled_at > started_at + interval '90 days')
    then customer_id
  end) as retained_after_90d,
  round(100.0 * count(distinct case
    when subscription_id is not null
      and started_at is not null
      and (canceled_at is null
           or canceled_at > started_at + interval '90 days')
    then customer_id
  end) / nullif(count(distinct customer_id), 0), 1) as retention_pct
from cohorts
group by 1
order by 1
```

<DataTable data={cohort_retention} rows=20>
  <Column id=cohort title='Anmeldemonat' />
  <Column id=cohort_size title='Kohorten-Grösse' fmt='#,##0' />
  <Column id=retained_after_90d title='Aktiv nach 90 Tagen' fmt='#,##0' />
  <Column id=retention_pct title='Retention (%)' fmt='0.0' />
</DataTable>
