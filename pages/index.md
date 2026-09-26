---
title: PulsCheck Analytics
---

# PulsCheck Analytics

Schweizer Online-Befragungsplattform · Datenraum bis 30. April 2026

```sql kpi_overview
select
  (select count(*) from pulscheck.customers
     where current_plan = 'subscription_active') as active_customers,
  (select round(sum(monthly_price_chf), 2) from pulscheck.subscriptions
     where canceled_at is null) as current_mrr_chf,
  (select count(*) from pulscheck.surveys
     where status = 'active') as active_surveys,
  (select count(*) from pulscheck.survey_responses
     where is_complete = true) as total_complete_responses
```

<BigValue
  data={kpi_overview}
  value=current_mrr_chf
  fmt='#,##0'
  title='MRR (CHF)'
/>

<BigValue
  data={kpi_overview}
  value=active_customers
  fmt='#,##0'
  title='Aktive Subscriptions'
/>

<BigValue
  data={kpi_overview}
  value=active_surveys
  fmt='#,##0'
  title='Aktive Befragungen'
/>

<BigValue
  data={kpi_overview}
  value=total_complete_responses
  fmt='#,##0'
  title='Antworten gesamt'
/>

## Dashboards

- [**Product Metrics Dive**](/product_metrics_dive) – Interaktive Gesamtansicht mit Zeitfenster-Filter (Dive-Stil)
- [**Subscription Health**](/subscription_health) – MRR-Verlauf, Plan-Verteilung, Cohort-Retention
- [**Response Package Sales**](/package_sales) – Paket-Umsatz nach Grösse und Land
- [**Survey Engagement**](/survey_engagement) – Aktive Befragungen, Sprachverteilung, Geo-Reichweite

## Über dieses Projekt

Dieses Evidence-Projekt ist das Begleit-Repo zum Blogbeitrag **„Agentic Dashboards mit Evidence statt Tableau-Beratung"**. Alle drei Dashboards wurden mit Claude generiert auf Basis von `RULES.md` (Geschäftsregeln) und `DASHBOARD_RULES.md` (Konventionen). Die Datenquelle ist eine DuckDB-Datei mit reproduzierbaren Seed-Daten – siehe `README.md`.

---

*© 2026 PulsCheck AG · Zürich – synthetische Demo-Daten (Seed 42), Stichtag 30. April 2026.*
