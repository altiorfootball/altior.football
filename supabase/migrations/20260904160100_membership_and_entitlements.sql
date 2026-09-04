-- ALTIOR — Membership anlegen und Monatskontingente fuehren
--
-- Das Kontingent wird zum Monatsersten zurueckgesetzt, Ungenutztes verfaellt.
-- Umgesetzt ist das als neue Periode je Monat: die alte bleibt als Historie
-- stehen, uebertragen wird nichts.

-- Legt fuer ein Membership die Periode des laufenden Monats an, falls sie
-- fehlt. Die Werte werden aus dem Plan KOPIERT, nicht verwiesen — aendert
-- sich der Plan spaeter, gelten fuer laufende Perioden weiter die alten Werte.
create or replace function public.ensure_entitlement_period(p_membership_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan  membership_plans%rowtype;
  v_start date := date_trunc('month', current_date)::date;
  v_end   date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_id    uuid;
begin
  select mp.* into v_plan
  from membership_plans mp
  join memberships m on m.plan_id = mp.id
  where m.id = p_membership_id;

  if not found then
    return null;
  end if;

  insert into entitlement_periods (
    membership_id, period_start, period_end,
    trainings_total, online_sessions_total, video_analyses_total
  )
  values (
    p_membership_id, v_start, v_end,
    v_plan.trainings_per_month, v_plan.online_sessions_per_month, v_plan.video_analyses_per_month
  )
  on conflict (membership_id, period_start) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from entitlement_periods
    where membership_id = p_membership_id and period_start = v_start;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.ensure_entitlement_period(uuid) from public, anon, authenticated;


-- Monatsjob: legt fuer jedes aktive Membership die neue Periode an.
create or replace function public.roll_entitlement_periods()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in select id from memberships where status = 'active'
  loop
    perform public.ensure_entitlement_period(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.roll_entitlement_periods() from public, anon, authenticated;


-- Membership vergeben. Vorerst der Weg fuer den Administrator; ab Woche 12
-- loest stattdessen der Stripe-Webhook diese Funktion aus.
create or replace function public.grant_membership(p_player_id uuid, p_plan membership_key)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan      membership_plans%rowtype;
  v_active    int;
  v_id        uuid;
begin
  if not private.is_admin() then
    raise exception 'ALTIOR_FORBIDDEN: Nur Administratoren duerfen Memberships vergeben.';
  end if;

  select * into v_plan from membership_plans where key = p_plan;
  if not found then
    raise exception 'ALTIOR_NO_PLAN: Diese Stufe gibt es nicht.';
  end if;

  if exists (select 1 from memberships where player_id = p_player_id and status = 'active') then
    raise exception 'ALTIOR_ALREADY_MEMBER: Dieser Spieler hat bereits ein aktives Membership.';
  end if;

  -- Gold ist auf 10 Plaetze begrenzt (D31). Die Pruefung laeuft hier, damit
  -- sie auch der Stripe-Weg spaeter durchlaeuft.
  if v_plan.max_seats is not null then
    select count(*) into v_active
    from memberships m
    where m.plan_id = v_plan.id and m.status = 'active';

    if v_active >= v_plan.max_seats then
      raise exception 'ALTIOR_PLAN_FULL: Diese Stufe ist ausgebucht.';
    end if;
  end if;

  insert into memberships (player_id, plan_id, status, started_at)
  values (p_player_id, v_plan.id, 'active', current_date)
  returning id into v_id;

  perform public.ensure_entitlement_period(v_id);
  return v_id;
end;
$$;

revoke execute on function public.grant_membership(uuid, membership_key) from public, anon;
grant execute on function public.grant_membership(uuid, membership_key) to authenticated;
