-- ALTIOR — Korrekturen aus den Zahlungstests
--
-- 1. Die Reservierung muss laenger halten als Stripes Bezahlseite offen ist.
--    Stripes Mindestdauer betraegt 30 Minuten. Waeren beide gleich lang,
--    koennte der Platz freigegeben werden, waehrend die Zahlung noch
--    verarbeitet wird. Reservierung deshalb 35 Minuten.
--
-- 2. Bricht jemand die Bezahlung ab, meldet Stripe das NICHT — es meldet erst
--    den Ablauf nach 30 Minuten. Ohne eigenen Rueckweg bliebe der Platz so
--    lange blockiert, und der Spieler koennte es nicht einmal sofort erneut
--    versuchen: seine eigene Reservierung stuende im Weg.

-- Reservierungsdauer auf 35 Minuten (siehe reserve_training_booking in
-- 20260907110000; hier nur noch der Rueckweg fuer den Abbruch).

create or replace function public.release_own_reservation(p_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player uuid;
  r record;
begin
  select id into v_player from players where profile_id = auth.uid();
  if v_player is null then
    return false;
  end if;

  -- Die Pruefung auf den Eigentuemer ist wesentlich: sonst koennte jemand mit
  -- einer fremden Zahlungskennung die Reservierung eines anderen aufloesen.
  select b.id, b.session_id, b.booked_as into r
  from training_bookings b
  where b.payment_id = p_payment_id
    and b.player_id = v_player
    and b.status = 'reserved'
  for update;

  if not found then
    return false;
  end if;

  update training_bookings set status = 'expired', reserved_until = null where id = r.id;

  if r.booked_as = 'goalkeeper' then
    update training_sessions set gk_booked = greatest(gk_booked - 1, 0) where id = r.session_id;
  else
    update training_sessions set field_booked = greatest(field_booked - 1, 0) where id = r.session_id;
  end if;

  update payments set status = 'failed' where id = p_payment_id and status = 'pending';
  return true;
end;
$$;

revoke execute on function public.release_own_reservation(uuid) from public, anon;
grant execute on function public.release_own_reservation(uuid) to authenticated;
