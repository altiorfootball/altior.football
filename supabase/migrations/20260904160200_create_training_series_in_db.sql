-- ALTIOR — Serienanlage in der Datenbank statt im Anwendungscode
--
-- Grund: Die Uhrzeit ist als deutsche Ortszeit gemeint. Wird der Zeitpunkt in
-- JavaScript aus der lokalen Zeit des Servers gebaut, haengt das Ergebnis
-- davon ab, in welcher Zone der Server laeuft — auf Vercel ist das UTC, und
-- aus 18:00 wuerde 20:00. Hier ist die Zone ausdruecklich benannt, und
-- Postgres rechnet die Sommer- und Winterzeit korrekt um. Das ist wichtig,
-- weil die Umstellung am 25.10.2026 mitten in einen Serienzeitraum fallen kann.

create or replace function public.create_training_series(
  p_from      date,
  p_to        date,
  p_time      time,
  p_weekdays  int[],
  p_location  text,
  p_duration  int  default 60,
  p_field     int  default 8,
  p_gk        int  default 2
)
returns table(angelegt int, uebersprungen int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price_id uuid;
  v_day      date;
  v_start    timestamptz;
  v_created  int := 0;
  v_skipped  int := 0;
begin
  if not private.is_admin() then
    raise exception 'ALTIOR_FORBIDDEN: Nur Administratoren duerfen Termine anlegen.';
  end if;

  if p_to < p_from then
    raise exception 'ALTIOR_BAD_RANGE: Das Enddatum liegt vor dem Startdatum.';
  end if;

  if p_to - p_from > 366 then
    raise exception 'ALTIOR_RANGE_TOO_LONG: Bitte hoechstens ein Jahr auf einmal anlegen.';
  end if;

  if p_weekdays is null or array_length(p_weekdays, 1) is null then
    raise exception 'ALTIOR_NO_WEEKDAY: Waehle mindestens einen Wochentag.';
  end if;

  select pr.id into v_price_id
  from prices pr
  join products pd on pd.id = pr.product_id
  where pd.key = 'training' and pr.audience = 'standard' and pr.valid_to is null
  limit 1;

  v_day := p_from;
  while v_day <= p_to loop
    if extract(dow from v_day)::int = any (p_weekdays) then
      -- Ortszeit ausdruecklich benannt: Postgres beruecksichtigt die
      -- Zeitumstellung selbst.
      v_start := (v_day + p_time) at time zone 'Europe/Berlin';

      if exists (
        select 1 from training_sessions
        where starts_at = v_start and status <> 'cancelled'
      ) then
        -- Zwei Trainings zur selben Zeit kann niemand leiten.
        v_skipped := v_skipped + 1;
      else
        insert into training_sessions
          (starts_at, duration_minutes, location, field_capacity, gk_capacity, price_id)
        values
          (v_start, p_duration, p_location, p_field, p_gk, v_price_id);
        v_created := v_created + 1;
      end if;
    end if;
    v_day := v_day + 1;
  end loop;

  angelegt := v_created;
  uebersprungen := v_skipped;
  return next;
end;
$$;

revoke execute on function public.create_training_series(date, date, time, int[], text, int, int, int) from public, anon;
grant execute on function public.create_training_series(date, date, time, int[], text, int, int, int) to authenticated;
