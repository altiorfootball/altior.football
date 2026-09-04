-- ALTIOR — Buchungslogik
--
-- Die gesamte Buchung laeuft in EINER Datenbankfunktion und damit in einer
-- Transaktion. Der Termin wird per FOR UPDATE gesperrt: buchen zwei Spieler
-- gleichzeitig den letzten Platz, wartet der zweite, sieht den erhoehten
-- Zaehler und wird sauber abgewiesen. Zusammen mit dem CHECK auf den
-- Zaehlerspalten ist Ueberbuchung technisch ausgeschlossen.
--
-- Fehlermeldungen tragen ein Praefix, damit die Anwendung sie zuordnen kann,
-- ohne auf Formulierungen angewiesen zu sein.

create or replace function public.book_training_session(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player          players%rowtype;
  v_session         training_sessions%rowtype;
  v_period_id       uuid;
  v_booking_id      uuid;
  v_is_minor        boolean;
  v_has_consent     boolean;
begin
  select * into v_player from players where profile_id = auth.uid();
  if not found then
    raise exception 'ALTIOR_NO_PLAYER: Fuer dieses Konto gibt es kein Spielerprofil.';
  end if;

  -- Unter 18 ist ein Elternteil Vertragspartner. Ohne dessen Einwilligung
  -- darf keine Buchung zustande kommen (Paragraf 106 BGB).
  v_is_minor := public.age_years(v_player.date_of_birth) < 18;
  if v_is_minor then
    select exists (
      select 1 from guardians g
      where g.player_id = v_player.id and g.consent_given_at is not null
    ) into v_has_consent;
    if not v_has_consent then
      raise exception 'ALTIOR_NO_CONSENT: Fuer Spieler unter 18 Jahren fehlt die Zustimmung eines Elternteils.';
    end if;
  end if;

  -- Termin sperren. Ab hier kann niemand sonst die Zaehler veraendern.
  select * into v_session from training_sessions where id = p_session_id for update;
  if not found then
    raise exception 'ALTIOR_NO_SESSION: Diesen Termin gibt es nicht.';
  end if;

  if v_session.status <> 'scheduled' then
    raise exception 'ALTIOR_CANCELLED: Dieser Termin findet nicht statt.';
  end if;

  -- Buchbar bis 2 Stunden vor Beginn (Product Master 3.2).
  if v_session.starts_at - interval '2 hours' <= now() then
    raise exception 'ALTIOR_TOO_LATE: Dieser Termin ist nicht mehr buchbar.';
  end if;

  if exists (
    select 1 from training_bookings b
    where b.session_id = p_session_id
      and b.player_id = v_player.id
      and b.status = 'confirmed'
  ) then
    raise exception 'ALTIOR_ALREADY_BOOKED: Du hast diesen Termin bereits gebucht.';
  end if;

  -- Welches Platzkontingent belegt wird, entscheidet die Position des
  -- Spielers — nicht seine Auswahl.
  if v_player.player_type = 'goalkeeper' then
    if v_session.gk_booked >= v_session.gk_capacity then
      raise exception 'ALTIOR_FULL_GK: Die Torhueterplaetze sind belegt.';
    end if;
  else
    if v_session.field_booked >= v_session.field_capacity then
      raise exception 'ALTIOR_FULL_FIELD: Die Feldspielerplaetze sind belegt.';
    end if;
  end if;

  -- Deckung: laufendes Monatskontingent, falls vorhanden und nicht verbraucht.
  select ep.id into v_period_id
  from entitlement_periods ep
  join memberships m on m.id = ep.membership_id
  where m.player_id = v_player.id
    and m.status = 'active'
    and ep.period_start = date_trunc('month', current_date)::date
    and ep.trainings_used < ep.trainings_total
  limit 1
  for update;

  if v_period_id is null then
    -- Ohne Kontingent ist die Buchung kostenpflichtig. Die Bezahlung laeuft
    -- ueber Stripe und wird separat angestossen.
    raise exception 'ALTIOR_NEEDS_PAYMENT: Fuer diese Buchung ist eine Zahlung noetig.';
  end if;

  update entitlement_periods
  set trainings_used = trainings_used + 1
  where id = v_period_id;

  if v_player.player_type = 'goalkeeper' then
    update training_sessions set gk_booked = gk_booked + 1 where id = p_session_id;
  else
    update training_sessions set field_booked = field_booked + 1 where id = p_session_id;
  end if;

  insert into training_bookings
    (session_id, player_id, booked_as, status, entitlement_period_id)
  values
    (p_session_id, v_player.id, v_player.player_type, 'confirmed', v_period_id)
  returning id into v_booking_id;

  -- Wer gebucht hat, steht nicht mehr auf der Warteliste.
  delete from waitlist_entries
  where session_id = p_session_id and player_id = v_player.id;

  return v_booking_id;
end;
$$;

revoke execute on function public.book_training_session(uuid) from public, anon;
grant execute on function public.book_training_session(uuid) to authenticated;


create or replace function public.cancel_training_booking(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking   training_bookings%rowtype;
  v_session   training_sessions%rowtype;
  v_player    players%rowtype;
  v_in_time   boolean;
  v_status    booking_status;
begin
  select * into v_player from players where profile_id = auth.uid();
  if not found then
    raise exception 'ALTIOR_NO_PLAYER: Fuer dieses Konto gibt es kein Spielerprofil.';
  end if;

  select * into v_booking from training_bookings where id = p_booking_id;
  if not found or v_booking.player_id <> v_player.id then
    raise exception 'ALTIOR_NOT_FOUND: Diese Buchung gibt es nicht.';
  end if;

  if v_booking.status <> 'confirmed' then
    raise exception 'ALTIOR_NOT_CONFIRMED: Diese Buchung ist bereits storniert.';
  end if;

  select * into v_session from training_sessions where id = v_booking.session_id for update;

  -- Kostenfrei stornierbar bis 24 Stunden vor Beginn (Product Master 3.3).
  v_in_time := v_session.starts_at - interval '24 hours' > now();
  v_status  := case when v_in_time then 'cancelled_in_time' else 'cancelled_late' end;

  update training_bookings
  set status = v_status, cancelled_at = now()
  where id = p_booking_id;

  -- Der Platz wird in jedem Fall frei, damit jemand anders trainieren kann.
  if v_booking.booked_as = 'goalkeeper' then
    update training_sessions set gk_booked = greatest(gk_booked - 1, 0) where id = v_session.id;
  else
    update training_sessions set field_booked = greatest(field_booked - 1, 0) where id = v_session.id;
  end if;

  -- Das Kontingent kommt nur bei fristgerechter Stornierung zurueck.
  -- Nach Fristablauf verfaellt es (Product Master 3.3, D22).
  if v_in_time and v_booking.entitlement_period_id is not null then
    update entitlement_periods
    set trainings_used = greatest(trainings_used - 1, 0)
    where id = v_booking.entitlement_period_id;
  end if;

  return v_status::text;
end;
$$;

revoke execute on function public.cancel_training_booking(uuid) from public, anon;
grant execute on function public.cancel_training_booking(uuid) to authenticated;


create or replace function public.join_waitlist(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player   players%rowtype;
  v_session  training_sessions%rowtype;
  v_next_pos int;
  v_id       uuid;
begin
  select * into v_player from players where profile_id = auth.uid();
  if not found then
    raise exception 'ALTIOR_NO_PLAYER: Fuer dieses Konto gibt es kein Spielerprofil.';
  end if;

  select * into v_session from training_sessions where id = p_session_id;
  if not found or v_session.status <> 'scheduled' then
    raise exception 'ALTIOR_NO_SESSION: Diesen Termin gibt es nicht.';
  end if;

  if v_session.starts_at - interval '2 hours' <= now() then
    raise exception 'ALTIOR_TOO_LATE: Dieser Termin ist nicht mehr buchbar.';
  end if;

  if exists (
    select 1 from training_bookings b
    where b.session_id = p_session_id and b.player_id = v_player.id and b.status = 'confirmed'
  ) then
    raise exception 'ALTIOR_ALREADY_BOOKED: Du hast diesen Termin bereits gebucht.';
  end if;

  -- Getrennte Wartelisten je Platzart.
  select coalesce(max(position), 0) + 1 into v_next_pos
  from waitlist_entries
  where session_id = p_session_id and waitlist_for = v_player.player_type;

  insert into waitlist_entries (session_id, player_id, waitlist_for, position)
  values (p_session_id, v_player.id, v_player.player_type, v_next_pos)
  on conflict (session_id, player_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.join_waitlist(uuid) from public, anon;
grant execute on function public.join_waitlist(uuid) to authenticated;
