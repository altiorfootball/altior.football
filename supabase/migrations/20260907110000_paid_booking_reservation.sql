-- ALTIOR — Platz waehrend der Bezahlung reservieren
--
-- Ohne Reservierung koennte der Platz weg sein, waehrend der Spieler im
-- Stripe-Formular tippt. Mit unbefristeter Reservierung koennte ein Abbrecher
-- den Platz dauerhaft blockieren. Deshalb: Platz sofort halten, aber nur 30
-- Minuten, und ein Aufraeumlauf gibt ihn auch dann frei, wenn Stripes
-- Rueckmeldung ausbleibt.

alter type booking_status add value if not exists 'reserved';
alter type booking_status add value if not exists 'expired';

alter table training_bookings
  add column if not exists reserved_until timestamptz;

-- Der Eindeutigkeitsindex muss auch Reservierungen erfassen, sonst koennte
-- jemand denselben Termin mehrfach reservieren.
drop index if exists training_bookings_one_confirmed_per_session_player;
create unique index training_bookings_one_open_per_session_player
  on training_bookings (session_id, player_id)
  where status in ('confirmed', 'reserved');


create or replace function public.reserve_training_booking(p_session_id uuid)
returns table(booking_id uuid, payment_id uuid, amount_cents int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player      players%rowtype;
  v_session     training_sessions%rowtype;
  v_price       prices%rowtype;
  v_payment_id  uuid;
  v_booking_id  uuid;
  v_has_consent boolean;
begin
  select * into v_player from players where profile_id = auth.uid();
  if not found then
    raise exception 'ALTIOR_NO_PLAYER: Fuer dieses Konto gibt es kein Spielerprofil.';
  end if;

  if public.age_years(v_player.date_of_birth) < 18 then
    select exists (
      select 1 from guardians g
      where g.player_id = v_player.id and g.consent_given_at is not null
    ) into v_has_consent;
    if not v_has_consent then
      raise exception 'ALTIOR_NO_CONSENT: Fuer Spieler unter 18 Jahren fehlt die Zustimmung eines Elternteils.';
    end if;
  end if;

  select * into v_session from training_sessions where id = p_session_id for update;
  if not found then
    raise exception 'ALTIOR_NO_SESSION: Diesen Termin gibt es nicht.';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'ALTIOR_CANCELLED: Dieser Termin findet nicht statt.';
  end if;
  if v_session.starts_at - interval '2 hours' <= now() then
    raise exception 'ALTIOR_TOO_LATE: Dieser Termin ist nicht mehr buchbar.';
  end if;

  if exists (
    select 1 from training_bookings b
    where b.session_id = p_session_id
      and b.player_id = v_player.id
      and b.status in ('confirmed', 'reserved')
  ) then
    raise exception 'ALTIOR_ALREADY_BOOKED: Du hast diesen Termin bereits gebucht.';
  end if;

  if v_player.player_type = 'goalkeeper' then
    if v_session.gk_booked >= v_session.gk_capacity then
      raise exception 'ALTIOR_FULL_GK: Die Torhueterplaetze sind belegt.';
    end if;
  else
    if v_session.field_booked >= v_session.field_capacity then
      raise exception 'ALTIOR_FULL_FIELD: Die Feldspielerplaetze sind belegt.';
    end if;
  end if;

  select p.* into v_price from prices p where p.id = v_session.price_id;
  if not found then
    raise exception 'ALTIOR_NO_PRICE: Fuer diesen Termin ist kein Preis hinterlegt.';
  end if;

  -- Steuersatz zum Zahlungszeitpunkt einfrieren: eine Rechnung von heute
  -- muss in drei Jahren noch stimmen.
  insert into payments (player_id, price_id, amount_cents, currency, tax_rate, tax_amount_cents, status)
  values (
    v_player.id, v_price.id, v_price.amount_cents, v_price.currency, v_price.tax_rate,
    round(v_price.amount_cents - (v_price.amount_cents / (1 + v_price.tax_rate)))::int,
    'pending'
  )
  returning id into v_payment_id;

  if v_player.player_type = 'goalkeeper' then
    update training_sessions set gk_booked = gk_booked + 1 where id = p_session_id;
  else
    update training_sessions set field_booked = field_booked + 1 where id = p_session_id;
  end if;

  insert into training_bookings
    (session_id, player_id, booked_as, status, payment_id, reserved_until)
  values
    (p_session_id, v_player.id, v_player.player_type, 'reserved', v_payment_id,
     now() + interval '30 minutes')
  returning id into v_booking_id;

  booking_id := v_booking_id;
  payment_id := v_payment_id;
  amount_cents := v_price.amount_cents;
  return next;
end;
$$;

revoke execute on function public.reserve_training_booking(uuid) from public, anon;
grant execute on function public.reserve_training_booking(uuid) to authenticated;


-- Bezahlung bestaetigt: aus der Reservierung wird eine Buchung.
create or replace function public.confirm_reserved_booking(p_payment_id uuid, p_intent text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin
  update payments
  set status = 'succeeded', paid_at = now(), stripe_payment_intent_id = p_intent
  where id = p_payment_id and status <> 'succeeded';

  update training_bookings
  set status = 'confirmed', reserved_until = null
  where payment_id = p_payment_id and status = 'reserved'
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

revoke execute on function public.confirm_reserved_booking(uuid, text) from public, anon, authenticated;


-- Abgebrochen oder abgelaufen: Platz freigeben. Laeuft sowohl ueber den
-- Stripe-Hinweis als auch als Aufraeumlauf, falls der Hinweis ausbleibt —
-- sonst blockiert ein Abbrecher den Platz fuer immer.
create or replace function public.release_expired_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select b.id, b.session_id, b.booked_as, b.payment_id
    from training_bookings b
    where b.status = 'reserved'
      and b.reserved_until is not null
      and b.reserved_until < now()
    for update
  loop
    update training_bookings set status = 'expired', reserved_until = null where id = r.id;

    if r.booked_as = 'goalkeeper' then
      update training_sessions set gk_booked = greatest(gk_booked - 1, 0) where id = r.session_id;
    else
      update training_sessions set field_booked = greatest(field_booked - 1, 0) where id = r.session_id;
    end if;

    update payments set status = 'failed' where id = r.payment_id and status = 'pending';
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
