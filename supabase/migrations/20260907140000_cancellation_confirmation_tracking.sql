-- ALTIOR — Nachweis der gesetzlichen Eingangsbestaetigung
--
-- Paragraf 312k Abs. 4 BGB verlangt, den Inhalt der Kuendigungserklaerung
-- sowie Datum und Uhrzeit des Eingangs unverzueglich in Textform zu
-- bestaetigen. Eine Anzeige auf dem Bildschirm genuegt dafuer nicht.
--
-- Bleibt der Versand aus, muss das sichtbar sein — sonst faellt es erst auf,
-- wenn jemand widerspricht.

alter table cancellation_requests
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_error   text;

create index if not exists cancellation_unconfirmed_idx
  on cancellation_requests (submitted_at desc)
  where confirmation_sent_at is null;

create or replace function public.mark_cancellation_confirmed(
  p_id uuid, p_error text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update cancellation_requests
  set confirmation_sent_at = case when p_error is null then now() else null end,
      confirmation_error   = p_error
  where id = p_id;
$$;

revoke execute on function public.mark_cancellation_confirmed(uuid, text)
  from public, anon, authenticated;

-- Rueckgabetyp aendert sich, deshalb erst entfernen.
drop function if exists public.submit_cancellation(text, text, text, cancellation_target, text, text);

create function public.submit_cancellation(
  p_first_name    text,
  p_last_name     text,
  p_email         text,
  p_contract_type cancellation_target default 'unbekannt',
  p_contract_hint text default null,
  p_message       text default null
)
returns table(request_id uuid, received_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
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
  returning cancellation_requests.id, cancellation_requests.submitted_at
  into v_id, v_at;

  request_id := v_id;
  received_at := v_at;
  return next;
end;
$$;

grant execute on function public.submit_cancellation(text, text, text, cancellation_target, text, text)
  to anon, authenticated;
