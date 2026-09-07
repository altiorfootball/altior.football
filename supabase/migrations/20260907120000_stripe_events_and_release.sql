-- ALTIOR — Verarbeitete Stripe-Ereignisse und Freigabe abgebrochener Zahlungen
--
-- Stripe stellt Ereignisse gelegentlich doppelt zu. Der Primaerschluessel auf
-- der Ereignis-ID laesst den zweiten Versuch auflaufen — ohne das bekaeme ein
-- Spieler zwei Buchungen fuer eine Zahlung.

create table if not exists stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

alter table stripe_events enable row level security;
-- Kein Zugriff ueber die API: nur der Server mit vollem Zugriff schreibt hier.
create policy stripe_events_admin on stripe_events
  for select using (private.is_admin());


-- Reservierung zu einer Zahlung sofort freigeben, wenn Stripe meldet, dass
-- der Bezahlvorgang abgebrochen wurde. Ohne das bliebe der Platz die vollen
-- 30 Minuten blockiert, obwohl feststeht, dass niemand zahlt.
create or replace function public.release_reservation_for_payment(p_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select b.id, b.session_id, b.booked_as into r
  from training_bookings b
  where b.payment_id = p_payment_id and b.status = 'reserved'
  for update;

  if not found then
    return false;
  end if;

  update training_bookings
  set status = 'expired', reserved_until = null
  where id = r.id;

  if r.booked_as = 'goalkeeper' then
    update training_sessions set gk_booked = greatest(gk_booked - 1, 0) where id = r.session_id;
  else
    update training_sessions set field_booked = greatest(field_booked - 1, 0) where id = r.session_id;
  end if;

  update payments set status = 'failed' where id = p_payment_id and status = 'pending';
  return true;
end;
$$;

revoke execute on function public.release_reservation_for_payment(uuid) from public, anon, authenticated;
