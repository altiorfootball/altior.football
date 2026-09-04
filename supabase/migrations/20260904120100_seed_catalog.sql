-- ALTIOR — Katalogdaten (Produkte, Preise, Membership-Stufen)
-- Grundlage: PRODUCT MASTER v1.0, Abschnitt 2
--
-- Steuersatz steht auf 0.0000 (Kleinunternehmerregelung nach Paragraf 19 UStG).
-- Der Wechsel in die Regelbesteuerung ist damit ein UPDATE, kein Umbau.

insert into products (key, name, type) values
  ('training',              'Pro Player Training',        'one_time'),
  ('online_session',        'Online Development Session', 'one_time'),
  ('video_analysis',        'Videoanalyse + Feedback',    'one_time'),
  ('scouting',              'Spielsichtung + Feedback',   'one_time'),
  ('assessment_individual', 'Player Assessment Individual','one_time'),
  ('assessment_day',        'Player Assessment Day',      'one_time'),
  ('evolution',             '12 Week Evolution',          'one_time'),
  ('evolution_repeat',      '12 Week Evolution Next Level','one_time'),
  ('evolution_installment', '12 Week Evolution Rate',     'subscription'),
  ('membership_bronze',     'Pro Player Membership Bronze','subscription'),
  ('membership_silver',     'Pro Player Membership Silver','subscription'),
  ('membership_gold',       'Pro Player Membership Gold', 'subscription'),
  ('career_support',        'Career Support',             'subscription');

insert into prices (product_id, amount_cents, audience, interval)
select id, v.cents, v.aud::price_audience, v.iv::price_interval
from products p
join (values
  ('training',                3500,  'standard',    null),
  ('online_session',          3900,  'standard',    null),
  ('video_analysis',         14900,  'standard',    null),
  ('scouting',               22900,  'standard',    null),
  -- Mitgliederpreis Gold: welcher Preis gilt, entscheidet die Anwendung
  -- anhand des aktiven Gold-Memberships, nicht der Aufrufer.
  ('scouting',               18900,  'member_gold', null),
  ('assessment_individual',  24900,  'standard',    null),
  ('assessment_day',         16900,  'standard',    null),
  ('evolution',              79900,  'standard',    null),
  ('evolution_repeat',       67900,  'standard',    null),
  ('evolution_installment',  27900,  'standard',    'month'),
  ('membership_bronze',       5900,  'standard',    'month'),
  ('membership_silver',      12900,  'standard',    'month'),
  ('membership_gold',        26900,  'standard',    'month'),
  ('career_support',          9900,  'standard',    'month')
) as v(key, cents, aud, iv) on v.key = p.key;

insert into membership_plans
  (key, name, trainings_per_month, online_sessions_per_month, video_analyses_per_month, max_seats, product_id)
select v.k::membership_key, v.name, v.tr, v.os, v.va, v.seats, p.id
from (values
  ('bronze', 'Bronze', 2, 0, 0, null::int, 'membership_bronze'),
  ('silver', 'Silver', 4, 1, 0, null::int, 'membership_silver'),
  -- Gold ist auf 10 Plaetze begrenzt: pro Mitglied entstehen monatlich
  -- rund 2,5 Stunden Analysezeit (D31).
  ('gold',   'Gold',   4, 1, 1, 10,        'membership_gold')
) as v(k, name, tr, os, va, seats, product_key)
join products p on p.key = v.product_key;

