---
title: Survey Engagement
---

# Survey Engagement

Veröffentlichte Befragungen, ausgefüllte Antworten und Sprach-/Geo-Verteilung der Antwortenden. „Antworten" bedeutet `is_complete = true` – unvollständige werden nur auf explizite Nachfrage gezeigt.

```sql current_engagement
select
  (select count(*) from pulscheck.surveys
     where status = 'active') as active_surveys,
  (select count(*) from pulscheck.surveys
     where status = 'closed') as closed_surveys,
  (select count(*) from pulscheck.survey_responses
     where is_complete = true
       and completed_at >= '2026-04-01 00:00:00+02:00'
       and completed_at <  '2026-05-01 00:00:00+02:00') as april_responses,
  (select round(avg(response_duration_seconds), 0)
     from pulscheck.survey_responses
     where is_complete = true) as avg_duration_sec
```

<BigValue
  data={current_engagement}
  value=active_surveys
  fmt='#,##0'
  title='Aktive Befragungen'
/>

<BigValue
  data={current_engagement}
  value=closed_surveys
  fmt='#,##0'
  title='Geschlossene Befragungen'
/>

<BigValue
  data={current_engagement}
  value=april_responses
  fmt='#,##0'
  title='Antworten im April'
/>

<BigValue
  data={current_engagement}
  value=avg_duration_sec
  fmt='#,##0'
  title='Ø Antwortdauer (Sek.)'
/>

## Antwort-Aktivität im Jahresverlauf

Jeder Tag als Kachel: So werden Saisonalität, Wochenend-Einbrüche und Kampagnen-Spitzen auf einen Blick sichtbar. Gezählt werden abgeschlossene Antworten (`is_complete = true`) über die zwölf Monate bis zum Stichtag.

```sql daily_responses
select
  cast(r.completed_at as date) as day,
  count(*) as responses
from pulscheck.survey_responses r
where r.is_complete = true
  and r.completed_at >= '2025-05-01 00:00:00+02:00'
  and r.completed_at <  '2026-05-01 00:00:00+02:00'
group by 1
order by 1
```

<CalendarHeatmap
  data={daily_responses}
  date=day
  value=responses
  valueFmt='#,##0'
  title='Abgeschlossene Antworten pro Tag'
  subtitle='Mai 2025 – April 2026 · Europe/Zurich'
/>

## Nach Sprache filtern

Klicken Sie eine Befragungssprache an, um Geografie und aktivste Befragungen darunter auf diese Sprache einzugrenzen – ohne Auswahl bleiben alle Sprachen enthalten. Die Kacheln zeigen zugleich, wo Ihre Reichweite real liegt: Im typischen DACH-Setup dominiert Deutsch; Französisch und Italienisch finden sich vor allem in der Westschweiz und im Tessin.

```sql lang_base
select
  s.language as sprache
from pulscheck.survey_responses r
join pulscheck.surveys s on s.id = r.survey_id
where r.is_complete = true
  and r.completed_at >= '2026-04-01 00:00:00+02:00'
  and r.completed_at <  '2026-05-01 00:00:00+02:00'
```

<DimensionGrid
  data={lang_base}
  name=lang
  metric='count(*)'
  metricLabel='Antw.'
  fmt='#,##0'
  title='Befragungssprache als Filter'
/>

## Geografie der Antwortenden (April 2026)

```sql responses_by_country
select
  country,
  count(*) as responses
from (
  select
    r.respondent_country as country,
    s.language as sprache
  from pulscheck.survey_responses r
  join pulscheck.surveys s on s.id = r.survey_id
  where r.is_complete = true
    and r.completed_at >= '2026-04-01 00:00:00+02:00'
    and r.completed_at <  '2026-05-01 00:00:00+02:00'
)
where ${inputs.lang}
group by 1
order by responses desc
limit 15
```

<BarChart
  data={responses_by_country}
  x=country
  y=responses
  title='Antworten nach Land der Befragten'
  yFmt='#,##0'
  swapXY=true
/>

## Antwortdauer-Verteilung

```sql duration_buckets
select
  case
    when response_duration_seconds <  120 then '0–2 Min'
    when response_duration_seconds <  300 then '2–5 Min'
    when response_duration_seconds <  600 then '5–10 Min'
    when response_duration_seconds < 1200 then '10–20 Min'
    when response_duration_seconds < 1800 then '20–30 Min'
    else '30+ Min'
  end as duration_bucket,
  count(*) as responses
from pulscheck.survey_responses
where is_complete = true
  and completed_at >= '2026-02-01 00:00:00+01:00'
group by 1
order by min(response_duration_seconds)
```

<BarChart
  data={duration_buckets}
  x=duration_bucket
  y=responses
  title='Antwortdauer-Verteilung (letzte 90 Tage)'
  yFmt='#,##0'
/>

## Aktivste Befragungen

```sql top_surveys
select
  title,
  sprache as language,
  status,
  count(response_id) as response_count
from (
  select
    s.title as title,
    s.language as sprache,
    s.status as status,
    r.id as response_id
  from pulscheck.surveys s
  left join pulscheck.survey_responses r
    on r.survey_id = s.id and r.is_complete = true
)
where ${inputs.lang}
group by 1, 2, 3
order by response_count desc
limit 10
```

<DataTable data={top_surveys}>
  <Column id=title title='Befragung' />
  <Column id=language title='Sprache' />
  <Column id=status title='Status' />
  <Column id=response_count title='Antworten' fmt='#,##0' />
</DataTable>
