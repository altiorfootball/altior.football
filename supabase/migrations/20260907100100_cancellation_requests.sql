-- ALTIOR — Kuendigungserklaerungen ueber den Kuendigungsbutton (Paragraf 312k BGB)
--
-- Der Button muss ohne Anmeldung erreichbar sein. Deshalb nimmt diese Tabelle
-- Erklaerungen von nicht angemeldeten Personen entgegen.
--
-- Bewusst NICHT automatisch ausgefuehrt: Wuerde allein anhand der E-Mail
-- sofort gekuendigt, koennte jeder fremde Vertraege beenden. Das Gesetz
-- verlangt die sofortige Bestaetigung des Eingangs und die Wirksamkeit zum
-- Erklaerungsdatum — nicht die automatische Ausfuehrung. Der Zeitstempel
-- haelt das Datum fest, die Ausfuehrung erfolgt durch den Betreiber.

create type cancellation_target as enum ('membership', 'career_support', 'unbekannt');

create table cancellation_requests (
  id             uuid primary key default gen_random_uuid(),
  first_name     text not null,
  last_name      text not null,
  email          text not null,
  contract_type  cancellation_target not null default 'unbekannt',
  contract_hint  text,
  message        text,
  -- Massgeblich fuer die Wirksamkeit der Kuendigung.
  submitted_at   timestamptz not null default now(),
  processed_at   timestamptz,
  processed_note text,
  membership_id  uuid references memberships (id) on delete set null
);

create index cancellation_requests_open_idx
  on cancellation_requests (submitted_at desc) where processed_at is null;

alter table cancellation_requests enable row level security;

-- Jeder darf eine Kuendigung erklaeren, auch ohne Konto.
create policy cancellation_insert_anyone on cancellation_requests
  for insert to anon, authenticated
  with check (true);

-- Lesen und bearbeiten darf nur der Betreiber. Ohne diese Trennung koennte
-- man ueber die Liste fremde Namen und Adressen abrufen.
create policy cancellation_admin_read on cancellation_requests
  for select using (private.is_admin());

create policy cancellation_admin_update on cancellation_requests
  for update using (private.is_admin()) with check (private.is_admin());


-- Entgegennahme ueber eine Funktion statt ueber ein direktes INSERT, weil das
-- Zurueckgeben des Zeitstempels sonst am Zeilenschutz scheitert: Einfuegen
-- darf jeder, Lesen nur der Betreiber. Ohne Zeitstempel gaebe es aber keine
-- Eingangsbestaetigung — und die verlangt Paragraf 312k ausdruecklich.
-- Die Funktion gibt nur den Zeitpunkt zurueck, keine fremden Daten.
create or replace function public.submit_cancellation(
  p_first_name    text,
  p_last_name     text,
  p_email         text,
  p_contract_type cancellation_target default 'unbekannt',
  p_contract_hint text default null,
  p_message       text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz;
begin
  if coalesce(btrim(p_first_name), '') = ''
     or coalesce(btrim(p_last_name), '') = ''
     or coalesce(btrim(p_email), '') = '' then
    raise exception 'ALTIOR_INCOMPLETE: Vorname, Nachname und E-Mail werden benoetigt.';
  end if;

  if p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'ALTIOR_BAD_EMAIL: Diese E-Mail-Adresse sieht nicht gueltig aus.';
  end if;

  insert into cancellation_requests
    (first_name, last_name, email, contract_type, contract_hint, message)
  values (
    left(btrim(p_first_name), 100),
    left(btrim(p_last_name), 100),
    left(btrim(p_email), 200),
    p_contract_type,
    left(nullif(btrim(coalesce(p_contract_hint, '')), ''), 500),
    left(nullif(btrim(coalesce(p_message, '')), ''), 2000)
  )
  returning submitted_at into v_at;

  return v_at;
end;
$$;

grant execute on function public.submit_cancellation(text, text, text, cancellation_target, text, text)
  to anon, authenticated;
