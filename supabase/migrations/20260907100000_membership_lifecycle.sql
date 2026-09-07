-- ALTIOR — Wechsel, Kuendigung und Monatslauf der Memberships
--
-- Upgrade wirkt sofort, Downgrade zum Monatsersten: Wer mehr bezahlt, bekommt
-- die Leistung sofort; wer weniger bucht, verliert nichts, was er bereits
-- bezahlt hat. Der geplante Wechsel wird mit Stichdatum vorgemerkt und vom
-- Monatslauf ausgefuehrt — dadurch ist der Lauf gefahrlos wiederholbar und
-- richtet auch mitten im Monat keinen Schaden an.

alter table memberships
  add column if not exists pending_plan_id      uuid references membership_plans (id),
  add column if not exists pending_effective_on date,
  add column if not exists plan_changed_at      timestamptz;

-- Rangfolge der Stufen, um Upgrade von Downgrade zu unterscheiden.
create or replace function private.plan_rank(p membership_key)
returns int language sql immutable set search_path = pg_catalog as $$
  select case p when 'bronze' then 1 when 'silver' then 2 when 'gold' then 3 end;
$$;

grant execute on function private.plan_rank(membership_key) to authenticated, service_role;


create or replace function public.change_membership_plan(p_new_plan membership_key)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player     players%rowtype;
  v_membership memberships%rowtype;
  v_old        membership_plans%rowtype;
  v_new        membership_plans%rowtype;
  v_active     int;
  v_period_id  uuid;
begin
  select * into v_player from players where profile_id = auth.uid();
  if not found then
    raise exception 'ALTIOR_NO_PLAYER: Fuer dieses Konto gibt es kein Spielerprofil.';
  end if;

  select * into v_membership from memberships
  where player_id = v_player.id and status = 'active'
  for update;
  if not found then
    raise exception 'ALTIOR_NO_MEMBERSHIP: Du hast kein aktives Membership.';
  end if;

  if v_membership.cancelled_at is not null then
    raise exception 'ALTIOR_CANCELLED_MEMBERSHIP: Dein Membership ist bereits gekuendigt.';
  end if;

  select * into v_old from membership_plans where id = v_membership.plan_id;
  select * into v_new from membership_plans where key = p_new_plan;
  if not found then
    raise exception 'ALTIOR_NO_PLAN: Diese Stufe gibt es nicht.';
  end if;

  if v_new.id = v_old.id then
    raise exception 'ALTIOR_SAME_PLAN: Du bist bereits in dieser Stufe.';
  end if;

  -- Begrenzte Stufen pruefen, bevor gewechselt wird (Gold: 10 Plaetze, D31).
  if v_new.max_seats is not null then
    select count(*) into v_active from memberships
    where plan_id = v_new.id and status = 'active';
    if v_active >= v_new.max_seats then
      raise exception 'ALTIOR_PLAN_FULL: Diese Stufe ist ausgebucht.';
    end if;
  end if;

  if private.plan_rank(p_new_plan) > private.plan_rank(v_old.key) then
    -- Upgrade: sofort. Das laufende Kontingent wird auf die neuen Werte
    -- angehoben, bereits Verbrauchtes bleibt verbraucht.
    update memberships
    set plan_id = v_new.id,
        pending_plan_id = null,
        pending_effective_on = null,
        plan_changed_at = now()
    where id = v_membership.id;

    select id into v_period_id from entitlement_periods
    where membership_id = v_membership.id
      and period_start = date_trunc('month', current_date)::date;

    if v_period_id is not null then
      update entitlement_periods
      set trainings_total       = greatest(trainings_total,       v_new.trainings_per_month),
          online_sessions_total = greatest(online_sessions_total, v_new.online_sessions_per_month),
          video_analyses_total  = greatest(video_analyses_total,  v_new.video_analyses_per_month)
      where id = v_period_id;
    else
      perform public.ensure_entitlement_period(v_membership.id);
    end if;

    return 'sofort';
  else
    -- Downgrade: erst zum Monatsersten. Bis dahin gilt die bezahlte Stufe.
    update memberships
    set pending_plan_id = v_new.id,
        pending_effective_on = (date_trunc('month', current_date) + interval '1 month')::date,
        plan_changed_at = now()
    where id = v_membership.id;

    return 'zum_monatsende';
  end if;
end;
$$;

revoke execute on function public.change_membership_plan(membership_key) from public, anon;
grant execute on function public.change_membership_plan(membership_key) to authenticated;


create or replace function public.cancel_membership()
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player     players%rowtype;
  v_membership memberships%rowtype;
  v_ends       date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
begin
  select * into v_player from players where profile_id = auth.uid();
  if not found then
    raise exception 'ALTIOR_NO_PLAYER: Fuer dieses Konto gibt es kein Spielerprofil.';
  end if;

  select * into v_membership from memberships
  where player_id = v_player.id and status = 'active'
  for update;
  if not found then
    raise exception 'ALTIOR_NO_MEMBERSHIP: Du hast kein aktives Membership.';
  end if;

  if v_membership.cancelled_at is not null then
    return v_membership.ends_at;
  end if;

  -- Monatlich kuendbar, keine Frist, wirksam zum Monatsende. Das Kontingent
  -- bleibt bis dahin nutzbar (D36) — der Monat ist bezahlt.
  update memberships
  set cancelled_at = now(), ends_at = v_ends,
      pending_plan_id = null, pending_effective_on = null
  where id = v_membership.id;

  return v_ends;
end;
$$;

revoke execute on function public.cancel_membership() from public, anon;
grant execute on function public.cancel_membership() to authenticated;


-- Monatslauf: beendet gekuendigte Memberships, fuehrt faellige Downgrades aus
-- und legt die neuen Kontingentperioden an. Ungenutztes verfaellt dabei von
-- selbst, weil nichts uebertragen wird.
create or replace function public.run_monthly_membership_job()
returns table(beendet int, gewechselt int, perioden int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ended   int := 0;
  v_changed int := 0;
  v_periods int := 0;
  r record;
begin
  update memberships
  set status = 'ended'
  where status = 'active' and ends_at is not null and ends_at < current_date;
  get diagnostics v_ended = row_count;

  -- Nur faellige Wechsel ausfuehren.
  update memberships
  set plan_id = pending_plan_id,
      pending_plan_id = null,
      pending_effective_on = null
  where status = 'active'
    and pending_plan_id is not null
    and pending_effective_on is not null
    and pending_effective_on <= current_date;
  get diagnostics v_changed = row_count;

  for r in select id from memberships where status = 'active'
  loop
    perform public.ensure_entitlement_period(r.id);
    v_periods := v_periods + 1;
  end loop;

  beendet := v_ended; gewechselt := v_changed; perioden := v_periods;
  return next;
end;
$$;

revoke execute on function public.run_monthly_membership_job() from public, anon, authenticated;
