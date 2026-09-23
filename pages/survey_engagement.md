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

## Antworten pro Sprache

Die Verteilung der Antworten nach Befragungssprache zeigt, wo Ihre Reichweite real liegt – unabhängig davon, in welchen Märkten Ihre Kund:innen ihren Sitz haben. Im typischen DACH-Setup dominiert Deutsch; Französisch und Italienisch finden sich vor allem in der Westschweiz und im Tessin.

```sql responses_by_language
select
  s.language,
  count(*) as responses
from pulscheck.survey_responses r
join pulscheck.surveys s on s.id = r.survey_id
where r.is_complete = true
  and r.completed_at >= '2026-04-01 00:00:00+02:00'
  and r.completed_at <  '2026-05-01 00:00:00+02:00'
group by 1
order by responses desc
```

<BarChart
  data={responses_by_language}
  x=language
  y=responses
  title='Antworten nach Befragungssprache (April 2026)'
  yFmt='#,##0'
/>

## Geografie der Antwortenden (April 2026)

```sql responses_by_country
select
  r.respondent_country as country,
  count(*) as responses
from pulscheck.survey_responses r
where r.is_complete = true
  and r.completed_at >= '2026-04-01 00:00:00+02:00'
  and r.completed_at <  '2026-05-01 00:00:00+02:00'
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
  s.title,
  s.language,
  s.status,
  count(r.id) as response_count
from pulscheck.surveys s
left join pulscheck.survey_responses r
  on r.survey_id = s.id and r.is_complete = true
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
