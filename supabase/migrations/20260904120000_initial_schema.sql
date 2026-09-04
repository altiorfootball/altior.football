-- ALTIOR — Initiales Schema
-- Grundlage: DATENMODELL.md v0.1 · PRODUCT MASTER v1.0
--
-- Leitprinzip: Die kritischen Geschäftsregeln werden in der Datenbank erzwungen,
-- nicht nur im Anwendungscode. Bei gleichzeitigen Zugriffen entscheidet die
-- Datenbank, nicht der Zufall.

-- ---------------------------------------------------------------------------
-- 1 · Enums
-- ---------------------------------------------------------------------------

create type user_role            as enum ('player', 'admin');
create type player_type          as enum ('field', 'goalkeeper');
create type strong_foot          as enum ('left', 'right', 'both');

create type product_type         as enum ('one_time', 'subscription');
create type tax_behavior         as enum ('inclusive', 'exclusive');
create type price_audience       as enum ('standard', 'member_gold');
create type price_interval       as enum ('month');

create type membership_key       as enum ('bronze', 'silver', 'gold');
create type membership_status    as enum ('active', 'cancelled', 'ended');

create type session_status       as enum ('scheduled', 'cancelled', 'completed');
create type booking_status       as enum ('confirmed', 'cancelled_in_time', 'cancelled_late', 'no_show');

create type appointment_type     as enum ('online_session', 'video_analysis_debrief', 'scouting_debrief',
                                          'career_call', 'career_review', 'evolution_feedback');
create type appointment_status   as enum ('scheduled', 'completed', 'cancelled');

create type assessment_source    as enum ('assessment_day', 'individual', 're_assessment');
create type assessment_bk_status as enum ('confirmed', 'cancelled', 'completed');

create type payment_mode         as enum ('full', 'installments');
create type payment_status       as enum ('pending', 'succeeded', 'failed', 'refunded');
create type analysis_status      as enum ('requested', 'in_progress', 'completed');
create type invoice_recipient    as enum ('player', 'guardian');
create type subscription_status  as enum ('active', 'cancelled', 'ended');

-- ---------------------------------------------------------------------------
-- 2 · Nutzer und Spieler
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        user_role   not null default 'player',
  email       text        not null,
  first_name  text,
  last_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table players (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null unique references profiles (id) on delete cascade,
  date_of_birth      date not null,
  -- Steuert bei jeder Buchung, welches der beiden Platzkontingente belegt wird.
  player_type        player_type not null,
  position           text,
  club               text,
  team               text,
  league             text,
  strong_foot        strong_foot,
  height_cm          int check (height_cm between 100 and 250),
  development_goals  text,
  created_at         timestamptz not null default now()
);

create table guardians (
  id                   uuid primary key default gen_random_uuid(),
  player_id            uuid not null references players (id) on delete cascade,
  first_name           text not null,
  last_name            text not null,
  email                text,
  phone                text,
  is_invoice_recipient boolean not null default false,
  consent_given_at     timestamptz,
  photo_consent        boolean not null default false,
  created_at           timestamptz not null default now()
);

create index guardians_player_idx on guardians (player_id);

-- ---------------------------------------------------------------------------
-- 3 · Produkte, Preise, Steuer
-- Alle Preise liegen zentral. Der Wechsel in die Regelbesteuerung ist damit
-- eine Datenänderung, kein Umbau.
-- ---------------------------------------------------------------------------

create table products (
  id     uuid primary key default gen_random_uuid(),
  key    text unique not null,
  name   text not null,
  type   product_type not null,
  active boolean not null default true
);

create table prices (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products (id) on delete restrict,
  -- Immer Ganzzahl in Cent. Fließkommazahlen führen zu Rundungsfehlern.
  amount_cents    int not null check (amount_cents >= 0),
  currency        text not null default 'EUR',
  tax_rate        numeric(5,4) not null default 0.0000,
  tax_behavior    tax_behavior not null default 'inclusive',
  audience        price_audience not null default 'standard',
  interval        price_interval,
  stripe_price_id text,
  valid_from      timestamptz not null default now(),
  valid_to        timestamptz,
  constraint prices_validity_order check (valid_to is null or valid_to > valid_from)
);

create index prices_product_idx on prices (product_id, audience, valid_from desc);

-- ---------------------------------------------------------------------------
-- 4 · Membership und Kontingent
-- ---------------------------------------------------------------------------

create table membership_plans (
  id                        uuid primary key default gen_random_uuid(),
  key                       membership_key unique not null,
  name                      text not null,
  trainings_per_month       int not null check (trainings_per_month >= 0),
  online_sessions_per_month int not null check (online_sessions_per_month >= 0),
  video_analyses_per_month  int not null check (video_analyses_per_month >= 0),
  -- Gold ist auf 10 Plätze begrenzt (D31). NULL = unbegrenzt.
  max_seats                 int check (max_seats is null or max_seats > 0),
  product_id                uuid references products (id)
);

create table memberships (
  id                     uuid primary key default gen_random_uuid(),
  player_id              uuid not null references players (id) on delete cascade,
  plan_id                uuid not null references membership_plans (id) on delete restrict,
  status                 membership_status not null default 'active',
  started_at             date not null,
  cancelled_at           timestamptz,
  ends_at                date,
  stripe_subscription_id text,
  created_at             timestamptz not null default now()
);

-- Ein Spieler hat höchstens ein aktives Membership.
create unique index memberships_one_active_per_player
  on memberships (player_id) where status = 'active';

create index memberships_player_idx on memberships (player_id);

-- Das Herzstück der Kontingentlogik: ein Datensatz je Membership und Kalendermonat.
create table entitlement_periods (
  id                     uuid primary key default gen_random_uuid(),
  membership_id          uuid not null references memberships (id) on delete cascade,
  period_start           date not null,
  period_end             date not null,
  trainings_total        int not null default 0 check (trainings_total >= 0),
  trainings_used         int not null default 0 check (trainings_used >= 0),
  online_sessions_total  int not null default 0 check (online_sessions_total >= 0),
  online_sessions_used   int not null default 0 check (online_sessions_used >= 0),
  video_analyses_total   int not null default 0 check (video_analyses_total >= 0),
  video_analyses_used    int not null default 0 check (video_analyses_used >= 0),
  created_at             timestamptz not null default now(),

  -- Verbrauch über das Guthaben hinaus ist technisch unmöglich,
  -- unabhängig vom Anwendungscode.
  constraint entitlement_trainings_within_total       check (trainings_used       <= trainings_total),
  constraint entitlement_online_sessions_within_total check (online_sessions_used <= online_sessions_total),
  constraint entitlement_video_analyses_within_total  check (video_analyses_used  <= video_analyses_total),
  constraint entitlement_period_order                 check (period_end > period_start),
  constraint entitlement_starts_on_first              check (extract(day from period_start) = 1),
  unique (membership_id, period_start)
);

create index entitlement_periods_membership_idx on entitlement_periods (membership_id, period_start desc);

-- ---------------------------------------------------------------------------
-- 5 · Trainings und Buchungen
-- ---------------------------------------------------------------------------

create table training_sessions (
  id                  uuid primary key default gen_random_uuid(),
  starts_at           timestamptz not null,
  duration_minutes    int not null default 60 check (duration_minutes > 0),
  location            text not null,
  field_capacity      int not null default 8 check (field_capacity >= 0),
  gk_capacity         int not null default 2 check (gk_capacity >= 0),
  field_booked        int not null default 0,
  gk_booked           int not null default 0,
  price_id            uuid references prices (id),
  status              session_status not null default 'scheduled',
  cancellation_reason text,
  created_at          timestamptz not null default now(),

  -- Überbuchungsschutz. Buchung und Zählererhöhung laufen in einer Transaktion:
  -- Versuchen zwei Spieler gleichzeitig den letzten Platz, verletzt die zweite
  -- Transaktion diesen CHECK und wird abgewiesen. Es gibt keine Race Condition.
  constraint session_field_within_capacity check (field_booked >= 0 and field_booked <= field_capacity),
  constraint session_gk_within_capacity    check (gk_booked    >= 0 and gk_booked    <= gk_capacity)
);

create index training_sessions_starts_idx on training_sessions (starts_at);

create table training_bookings (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references training_sessions (id) on delete cascade,
  player_id             uuid not null references players (id) on delete cascade,
  -- Zum Buchungszeitpunkt kopiert: ein späterer Positionswechsel des Spielers
  -- darf bestehende Buchungen nicht rückwirkend verschieben.
  booked_as             player_type not null,
  status                booking_status not null default 'confirmed',
  entitlement_period_id uuid references entitlement_periods (id) on delete restrict,
  payment_id            uuid,
  booked_at             timestamptz not null default now(),
  cancelled_at          timestamptz,

  -- Genau eine Deckungsquelle: Kontingent oder Zahlung, nie beides, nie keines.
  constraint booking_exactly_one_coverage
    check (num_nonnulls(entitlement_period_id, payment_id) = 1)
);

-- Niemand bucht denselben Termin zweimal.
create unique index training_bookings_one_confirmed_per_session_player
  on training_bookings (session_id, player_id) where status = 'confirmed';

create index training_bookings_player_idx  on training_bookings (player_id);
create index training_bookings_session_idx on training_bookings (session_id);

create table waitlist_entries (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references training_sessions (id) on delete cascade,
  player_id    uuid not null references players (id) on delete cascade,
  -- Getrennte Wartelisten je Platzart.
  waitlist_for player_type not null,
  position     int not null,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  unique (session_id, player_id)
);

create index waitlist_entries_session_idx on waitlist_entries (session_id, waitlist_for, position);

-- ---------------------------------------------------------------------------
-- 6 · Einzeltermine
-- ---------------------------------------------------------------------------

create table appointments (
  id                    uuid primary key default gen_random_uuid(),
  player_id             uuid not null references players (id) on delete cascade,
  type                  appointment_type not null,
  starts_at             timestamptz not null,
  duration_minutes      int not null check (duration_minutes > 0),
  meeting_url           text,
  status                appointment_status not null default 'scheduled',
  entitlement_period_id uuid references entitlement_periods (id) on delete restrict,
  payment_id            uuid,
  notes                 text,
  created_at            timestamptz not null default now()
);

create index appointments_player_idx on appointments (player_id, starts_at desc);

-- ---------------------------------------------------------------------------
-- 7 · Assessment
-- ---------------------------------------------------------------------------

create table assessment_days (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  starts_at  timestamptz not null,
  location   text not null,
  capacity   int not null check (capacity > 0),
  booked     int not null default 0,
  -- Fixpreis, beim Anlegen gesetzt: die Gruppengröße ist unternehmerisches
  -- Risiko, nicht Kundenrisiko (P3).
  price_id   uuid references prices (id),
  created_at timestamptz not null default now(),
  constraint assessment_day_within_capacity check (booked >= 0 and booked <= capacity)
);

create table assessment_bookings (
  id                uuid primary key default gen_random_uuid(),
  assessment_day_id uuid not null references assessment_days (id) on delete cascade,
  player_id         uuid not null references players (id) on delete cascade,
  payment_id        uuid,
  status            assessment_bk_status not null default 'confirmed',
  created_at        timestamptz not null default now()
);

create unique index assessment_bookings_one_confirmed
  on assessment_bookings (assessment_day_id, player_id) where status = 'confirmed';

create table assessments (
  id                   uuid primary key default gen_random_uuid(),
  player_id            uuid not null references players (id) on delete cascade,
  source               assessment_source not null,
  assessment_day_id    uuid references assessment_days (id) on delete set null,
  conducted_on         date not null,
  -- Verweist auf das Erst-Assessment: so wird Fortschritt vergleichbar.
  is_reassessment_of   uuid references assessments (id) on delete set null,
  summary              text,
  published_at         timestamptz,
  created_at           timestamptz not null default now()
);

create index assessments_player_idx on assessments (player_id, conducted_on desc);

-- Bewusst flexibel, solange die Testkategorien offen sind (D7).
create table assessment_scores (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  category      text not null,
  metric        text not null,
  value         numeric not null,
  unit          text,
  scale_min     numeric,
  scale_max     numeric,
  sort_order    int not null default 0
);

create index assessment_scores_assessment_idx on assessment_scores (assessment_id, sort_order);

-- ---------------------------------------------------------------------------
-- 8 · Evolution, Career, Analysen
-- ---------------------------------------------------------------------------

create table evolution_programs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  starts_on  date not null,
  ends_on    date not null,
  capacity   int not null default 6 check (capacity > 0),
  booked     int not null default 0,
  created_at timestamptz not null default now(),
  constraint evolution_program_within_capacity check (booked >= 0 and booked <= capacity),
  constraint evolution_program_date_order      check (ends_on > starts_on)
);

create table evolution_enrollments (
  id                        uuid primary key default gen_random_uuid(),
  program_id                uuid not null references evolution_programs (id) on delete restrict,
  player_id                 uuid not null references players (id) on delete cascade,
  is_repeat                 boolean not null default false,
  payment_mode              payment_mode not null default 'full',
  trainings_total           int not null default 12,
  trainings_used            int not null default 0,
  online_sessions_total     int not null default 3,
  online_sessions_used      int not null default 0,
  analysis_done             boolean not null default false,
  reassessment_done         boolean not null default false,
  feedback_done             boolean not null default false,
  created_at                timestamptz not null default now(),
  constraint evolution_trainings_within_total check (trainings_used      <= trainings_total),
  constraint evolution_sessions_within_total  check (online_sessions_used <= online_sessions_total),
  unique (program_id, player_id)
);

create index evolution_enrollments_player_idx on evolution_enrollments (player_id);

-- Höchstens zwei Teilnahmen je Spieler: einmal regulär, einmal als Repeat.
create or replace function enforce_max_two_evolution_enrollments()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from evolution_enrollments where player_id = new.player_id) >= 2 then
    raise exception 'Ein Spieler darf hoechstens zweimal am 12 Week Evolution teilnehmen.';
  end if;
  return new;
end;
$$;

create trigger evolution_enrollments_max_two
  before insert on evolution_enrollments
  for each row execute function enforce_max_two_evolution_enrollments();

create table career_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  player_id              uuid not null references players (id) on delete cascade,
  status                 subscription_status not null default 'active',
  started_on             date not null,
  -- Vor diesem Datum ist eine Kuendigung nur zum Ende der Mindestlaufzeit
  -- moeglich, danach zum Monatsende (P4).
  minimum_term_ends_on   date not null,
  cancelled_at           timestamptz,
  ends_on                date,
  anamnesis_done_at      timestamptz,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  constraint career_minimum_term_after_start check (minimum_term_ends_on > started_on)
);

create unique index career_subscriptions_one_active_per_player
  on career_subscriptions (player_id) where status = 'active';

create table video_analyses (
  id                    uuid primary key default gen_random_uuid(),
  player_id             uuid not null references players (id) on delete cascade,
  video_url             text,
  status                analysis_status not null default 'requested',
  debrief_appointment_id uuid references appointments (id) on delete set null,
  entitlement_period_id uuid references entitlement_periods (id) on delete restrict,
  payment_id            uuid,
  report                text,
  created_at            timestamptz not null default now(),
  constraint video_analysis_exactly_one_coverage
    check (num_nonnulls(entitlement_period_id, payment_id) = 1)
);

create table scouting_observations (
  id                     uuid primary key default gen_random_uuid(),
  player_id              uuid not null references players (id) on delete cascade,
  match_date             date,
  opponent               text,
  location               text,
  status                 analysis_status not null default 'requested',
  debrief_appointment_id uuid references appointments (id) on delete set null,
  entitlement_period_id  uuid references entitlement_periods (id) on delete restrict,
  payment_id             uuid,
  report                 text,
  created_at             timestamptz not null default now(),
  constraint scouting_exactly_one_coverage
    check (num_nonnulls(entitlement_period_id, payment_id) = 1)
);

-- ---------------------------------------------------------------------------
-- 9 · Zahlungen und Rechnungen
-- ---------------------------------------------------------------------------

create table payments (
  id                       uuid primary key default gen_random_uuid(),
  player_id                uuid not null references players (id) on delete restrict,
  price_id                 uuid references prices (id) on delete restrict,
  amount_cents             int not null check (amount_cents >= 0),
  currency                 text not null default 'EUR',
  -- Zum Zahlungszeitpunkt eingefroren: eine Rechnung von 2027 muss 2030 noch stimmen.
  tax_rate                 numeric(5,4) not null default 0.0000,
  tax_amount_cents         int not null default 0 check (tax_amount_cents >= 0),
  status                   payment_status not null default 'pending',
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  created_at               timestamptz not null default now()
);

create index payments_player_idx on payments (player_id, created_at desc);

-- Verweise auf payments erst jetzt, da die Tabelle vorher noch nicht existierte.
alter table training_bookings     add constraint training_bookings_payment_fk     foreign key (payment_id) references payments (id) on delete restrict;
alter table appointments          add constraint appointments_payment_fk          foreign key (payment_id) references payments (id) on delete restrict;
alter table assessment_bookings   add constraint assessment_bookings_payment_fk   foreign key (payment_id) references payments (id) on delete restrict;
alter table video_analyses        add constraint video_analyses_payment_fk        foreign key (payment_id) references payments (id) on delete restrict;
alter table scouting_observations add constraint scouting_observations_payment_fk foreign key (payment_id) references payments (id) on delete restrict;

create table installment_plans (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references players (id) on delete restrict,
  enrollment_id  uuid references evolution_enrollments (id) on delete set null,
  total_cents    int not null check (total_cents >= 0),
  installments   int not null check (installments > 0),
  created_at     timestamptz not null default now()
);

create table installments (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references installment_plans (id) on delete cascade,
  sequence     int not null check (sequence > 0),
  due_on       date not null,
  -- Jede Rate wird als eigene payment gefuehrt, damit die Buchhaltung stimmt.
  payment_id   uuid references payments (id) on delete set null,
  unique (plan_id, sequence)
);

create table invoices (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null unique references payments (id) on delete restrict,
  recipient_type     invoice_recipient not null default 'player',
  guardian_id        uuid references guardians (id) on delete set null,
  lexware_invoice_id text,
  -- Rechnungsnummern kommen ausschliesslich von Lexware Office.
  -- Eigene Nummernkreise waeren ein GoBD-Risiko.
  invoice_number     text,
  pdf_url            text,
  synced_at          timestamptz,
  -- Sorgt dafuer, dass eine fehlgeschlagene Uebertragung sichtbar bleibt,
  -- statt still zu verschwinden.
  sync_error         text,
  created_at         timestamptz not null default now()
);

create index invoices_sync_error_idx on invoices (created_at) where sync_error is not null;

-- ---------------------------------------------------------------------------
-- 10 · Row Level Security
-- Ohne sie koennte ein technisch versierter Nutzer ueber die API die Daten
-- anderer Spieler abrufen. Bei Minderjaehrigen ein ernsthaftes Datenschutzproblem.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from players where profile_id = auth.uid();
$$;

alter table profiles              enable row level security;
alter table players               enable row level security;
alter table guardians             enable row level security;
alter table products              enable row level security;
alter table prices                enable row level security;
alter table membership_plans      enable row level security;
alter table memberships           enable row level security;
alter table entitlement_periods   enable row level security;
alter table training_sessions     enable row level security;
alter table training_bookings     enable row level security;
alter table waitlist_entries      enable row level security;
alter table appointments          enable row level security;
alter table assessment_days       enable row level security;
alter table assessment_bookings   enable row level security;
alter table assessments           enable row level security;
alter table assessment_scores     enable row level security;
alter table evolution_programs    enable row level security;
alter table evolution_enrollments enable row level security;
alter table career_subscriptions  enable row level security;
alter table video_analyses        enable row level security;
alter table scouting_observations enable row level security;
alter table payments              enable row level security;
alter table installment_plans     enable row level security;
alter table installments          enable row level security;
alter table invoices              enable row level security;

-- Eigenes Profil lesen und aendern
create policy profiles_self_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update using (id = auth.uid() or is_admin());
create policy profiles_admin_all   on profiles for all    using (is_admin()) with check (is_admin());

-- Eigenes Spielerprofil
create policy players_self on players for select using (profile_id = auth.uid() or is_admin());
create policy players_self_update on players for update using (profile_id = auth.uid() or is_admin());
create policy players_admin_all on players for all using (is_admin()) with check (is_admin());

create policy guardians_own on guardians for select using (player_id = current_player_id() or is_admin());
create policy guardians_admin_all on guardians for all using (is_admin()) with check (is_admin());

-- Katalog: fuer alle Angemeldeten lesbar, nur Admin schreibt
create policy products_read           on products          for select using (true);
create policy products_admin          on products          for all    using (is_admin()) with check (is_admin());
create policy prices_read             on prices            for select using (true);
create policy prices_admin            on prices            for all    using (is_admin()) with check (is_admin());
create policy membership_plans_read   on membership_plans  for select using (true);
create policy membership_plans_admin  on membership_plans  for all    using (is_admin()) with check (is_admin());

-- Termine sind oeffentlich sichtbar: die Seite "Naechste Termine" zeigt freie Plaetze
create policy training_sessions_read  on training_sessions for select using (true);
create policy training_sessions_admin on training_sessions for all    using (is_admin()) with check (is_admin());
create policy assessment_days_read    on assessment_days   for select using (true);
create policy assessment_days_admin   on assessment_days   for all    using (is_admin()) with check (is_admin());
create policy evolution_programs_read on evolution_programs for select using (true);
create policy evolution_programs_admin on evolution_programs for all  using (is_admin()) with check (is_admin());

-- Alles Spielerbezogene: nur eigene Zeilen
create policy memberships_own           on memberships           for select using (player_id = current_player_id() or is_admin());
create policy memberships_admin         on memberships           for all    using (is_admin()) with check (is_admin());

create policy entitlement_own           on entitlement_periods   for select using (
  membership_id in (select id from memberships where player_id = current_player_id()) or is_admin());
create policy entitlement_admin         on entitlement_periods   for all    using (is_admin()) with check (is_admin());

create policy bookings_own              on training_bookings     for select using (player_id = current_player_id() or is_admin());
create policy bookings_admin            on training_bookings     for all    using (is_admin()) with check (is_admin());

create policy waitlist_own              on waitlist_entries      for select using (player_id = current_player_id() or is_admin());
create policy waitlist_admin            on waitlist_entries      for all    using (is_admin()) with check (is_admin());

create policy appointments_own          on appointments          for select using (player_id = current_player_id() or is_admin());
create policy appointments_admin        on appointments          for all    using (is_admin()) with check (is_admin());

create policy assessment_bookings_own   on assessment_bookings   for select using (player_id = current_player_id() or is_admin());
create policy assessment_bookings_admin on assessment_bookings   for all    using (is_admin()) with check (is_admin());

-- Assessment-Ergebnisse erst nach Freigabe sichtbar
create policy assessments_own           on assessments           for select using (
  (player_id = current_player_id() and published_at is not null) or is_admin());
create policy assessments_admin         on assessments           for all    using (is_admin()) with check (is_admin());

create policy assessment_scores_own     on assessment_scores     for select using (
  assessment_id in (select id from assessments where player_id = current_player_id() and published_at is not null)
  or is_admin());
create policy assessment_scores_admin   on assessment_scores     for all    using (is_admin()) with check (is_admin());

create policy evolution_enrollments_own   on evolution_enrollments for select using (player_id = current_player_id() or is_admin());
create policy evolution_enrollments_admin on evolution_enrollments for all    using (is_admin()) with check (is_admin());

create policy career_own                on career_subscriptions  for select using (player_id = current_player_id() or is_admin());
create policy career_admin              on career_subscriptions  for all    using (is_admin()) with check (is_admin());

create policy video_analyses_own        on video_analyses        for select using (player_id = current_player_id() or is_admin());
create policy video_analyses_admin      on video_analyses        for all    using (is_admin()) with check (is_admin());

create policy scouting_own              on scouting_observations for select using (player_id = current_player_id() or is_admin());
create policy scouting_admin            on scouting_observations for all    using (is_admin()) with check (is_admin());

create policy payments_own              on payments              for select using (player_id = current_player_id() or is_admin());
create policy payments_admin            on payments              for all    using (is_admin()) with check (is_admin());

create policy installment_plans_own     on installment_plans     for select using (player_id = current_player_id() or is_admin());
create policy installment_plans_admin   on installment_plans     for all    using (is_admin()) with check (is_admin());

create policy installments_own          on installments          for select using (
  plan_id in (select id from installment_plans where player_id = current_player_id()) or is_admin());
create policy installments_admin        on installments          for all    using (is_admin()) with check (is_admin());

create policy invoices_own              on invoices              for select using (
  payment_id in (select id from payments where player_id = current_player_id()) or is_admin());
create policy invoices_admin            on invoices              for all    using (is_admin()) with check (is_admin());
