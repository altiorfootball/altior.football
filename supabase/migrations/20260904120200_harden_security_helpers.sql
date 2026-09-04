-- ALTIOR — Sicherheits-Helfer aus dem oeffentlichen Schema entfernen
--
-- is_admin() und current_player_id() sind Helfer fuer die Zeilenschutz-Regeln,
-- keine API-Endpunkte. Im Schema "public" waeren sie ueber /rest/v1/rpc/...
-- aufrufbar. Das Schema "private" wird von PostgREST nicht veroeffentlicht;
-- die Regeln nutzen die Funktionen weiter, die API sieht sie nicht mehr.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function private.current_player_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.players where profile_id = auth.uid();
$$;

grant execute on function private.is_admin()          to anon, authenticated, service_role;
grant execute on function private.current_player_id() to anon, authenticated, service_role;

-- Fester search_path, damit die Funktion nicht ueber untergeschobene Objekte
-- manipuliert werden kann.
create or replace function public.enforce_max_two_evolution_enrollments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.evolution_enrollments where player_id = new.player_id) >= 2 then
    raise exception 'Ein Spieler darf hoechstens zweimal am 12 Week Evolution teilnehmen.';
  end if;
  return new;
end;
$$;

drop function if exists public.is_admin() cascade;
drop function if exists public.current_player_id() cascade;

-- Regeln ohne Funktionsbezug ueberleben das CASCADE, deshalb alle explizit loesen.
drop policy if exists profiles_self_select on profiles;
drop policy if exists profiles_self_update on profiles;
drop policy if exists profiles_admin_all on profiles;
drop policy if exists players_self on players;
drop policy if exists players_self_update on players;
drop policy if exists players_admin_all on players;
drop policy if exists guardians_own on guardians;
drop policy if exists guardians_admin_all on guardians;
drop policy if exists products_read on products;
drop policy if exists products_admin on products;
drop policy if exists prices_read on prices;
drop policy if exists prices_admin on prices;
drop policy if exists membership_plans_read on membership_plans;
drop policy if exists membership_plans_admin on membership_plans;
drop policy if exists training_sessions_read on training_sessions;
drop policy if exists training_sessions_admin on training_sessions;
drop policy if exists assessment_days_read on assessment_days;
drop policy if exists assessment_days_admin on assessment_days;
drop policy if exists evolution_programs_read on evolution_programs;
drop policy if exists evolution_programs_admin on evolution_programs;
drop policy if exists memberships_own on memberships;
drop policy if exists memberships_admin on memberships;
drop policy if exists entitlement_own on entitlement_periods;
drop policy if exists entitlement_admin on entitlement_periods;
drop policy if exists bookings_own on training_bookings;
drop policy if exists bookings_admin on training_bookings;
drop policy if exists waitlist_own on waitlist_entries;
drop policy if exists waitlist_admin on waitlist_entries;
drop policy if exists appointments_own on appointments;
drop policy if exists appointments_admin on appointments;
drop policy if exists assessment_bookings_own on assessment_bookings;
drop policy if exists assessment_bookings_admin on assessment_bookings;
drop policy if exists assessments_own on assessments;
drop policy if exists assessments_admin on assessments;
drop policy if exists assessment_scores_own on assessment_scores;
drop policy if exists assessment_scores_admin on assessment_scores;
drop policy if exists evolution_enrollments_own on evolution_enrollments;
drop policy if exists evolution_enrollments_admin on evolution_enrollments;
drop policy if exists career_own on career_subscriptions;
drop policy if exists career_admin on career_subscriptions;
drop policy if exists video_analyses_own on video_analyses;
drop policy if exists video_analyses_admin on video_analyses;
drop policy if exists scouting_own on scouting_observations;
drop policy if exists scouting_admin on scouting_observations;
drop policy if exists payments_own on payments;
drop policy if exists payments_admin on payments;
drop policy if exists installment_plans_own on installment_plans;
drop policy if exists installment_plans_admin on installment_plans;
drop policy if exists installments_own on installments;
drop policy if exists installments_admin on installments;
drop policy if exists invoices_own on invoices;
drop policy if exists invoices_admin on invoices;

create policy profiles_self_select on profiles for select using (id = auth.uid() or private.is_admin());

create policy profiles_self_update on profiles for update using (id = auth.uid() or private.is_admin());

create policy profiles_admin_all   on profiles for all    using (private.is_admin()) with check (private.is_admin());

create policy players_self on players for select using (profile_id = auth.uid() or private.is_admin());

create policy players_self_update on players for update using (profile_id = auth.uid() or private.is_admin());

create policy players_admin_all on players for all using (private.is_admin()) with check (private.is_admin());

create policy guardians_own on guardians for select using (player_id = private.current_player_id() or private.is_admin());

create policy guardians_admin_all on guardians for all using (private.is_admin()) with check (private.is_admin());

create policy products_read           on products          for select using (true);

create policy products_admin          on products          for all    using (private.is_admin()) with check (private.is_admin());

create policy prices_read             on prices            for select using (true);

create policy prices_admin            on prices            for all    using (private.is_admin()) with check (private.is_admin());

create policy membership_plans_read   on membership_plans  for select using (true);

create policy membership_plans_admin  on membership_plans  for all    using (private.is_admin()) with check (private.is_admin());

create policy training_sessions_read  on training_sessions for select using (true);

create policy training_sessions_admin on training_sessions for all    using (private.is_admin()) with check (private.is_admin());

create policy assessment_days_read    on assessment_days   for select using (true);

create policy assessment_days_admin   on assessment_days   for all    using (private.is_admin()) with check (private.is_admin());

create policy evolution_programs_read on evolution_programs for select using (true);

create policy evolution_programs_admin on evolution_programs for all  using (private.is_admin()) with check (private.is_admin());

create policy memberships_own           on memberships           for select using (player_id = private.current_player_id() or private.is_admin());

create policy memberships_admin         on memberships           for all    using (private.is_admin()) with check (private.is_admin());

create policy entitlement_own           on entitlement_periods   for select using (
  membership_id in (select id from memberships where player_id = private.current_player_id()) or private.is_admin());

create policy entitlement_admin         on entitlement_periods   for all    using (private.is_admin()) with check (private.is_admin());

create policy bookings_own              on training_bookings     for select using (player_id = private.current_player_id() or private.is_admin());

create policy bookings_admin            on training_bookings     for all    using (private.is_admin()) with check (private.is_admin());

create policy waitlist_own              on waitlist_entries      for select using (player_id = private.current_player_id() or private.is_admin());

create policy waitlist_admin            on waitlist_entries      for all    using (private.is_admin()) with check (private.is_admin());

create policy appointments_own          on appointments          for select using (player_id = private.current_player_id() or private.is_admin());

create policy appointments_admin        on appointments          for all    using (private.is_admin()) with check (private.is_admin());

create policy assessment_bookings_own   on assessment_bookings   for select using (player_id = private.current_player_id() or private.is_admin());

create policy assessment_bookings_admin on assessment_bookings   for all    using (private.is_admin()) with check (private.is_admin());

create policy assessments_own           on assessments           for select using (
  (player_id = private.current_player_id() and published_at is not null) or private.is_admin());

create policy assessments_admin         on assessments           for all    using (private.is_admin()) with check (private.is_admin());

create policy assessment_scores_own     on assessment_scores     for select using (
  assessment_id in (select id from assessments where player_id = private.current_player_id() and published_at is not null)
  or private.is_admin());

create policy assessment_scores_admin   on assessment_scores     for all    using (private.is_admin()) with check (private.is_admin());

create policy evolution_enrollments_own   on evolution_enrollments for select using (player_id = private.current_player_id() or private.is_admin());

create policy evolution_enrollments_admin on evolution_enrollments for all    using (private.is_admin()) with check (private.is_admin());

create policy career_own                on career_subscriptions  for select using (player_id = private.current_player_id() or private.is_admin());

create policy career_admin              on career_subscriptions  for all    using (private.is_admin()) with check (private.is_admin());

create policy video_analyses_own        on video_analyses        for select using (player_id = private.current_player_id() or private.is_admin());

create policy video_analyses_admin      on video_analyses        for all    using (private.is_admin()) with check (private.is_admin());

create policy scouting_own              on scouting_observations for select using (player_id = private.current_player_id() or private.is_admin());

create policy scouting_admin            on scouting_observations for all    using (private.is_admin()) with check (private.is_admin());

create policy payments_own              on payments              for select using (player_id = private.current_player_id() or private.is_admin());

create policy payments_admin            on payments              for all    using (private.is_admin()) with check (private.is_admin());

create policy installment_plans_own     on installment_plans     for select using (player_id = private.current_player_id() or private.is_admin());

create policy installment_plans_admin   on installment_plans     for all    using (private.is_admin()) with check (private.is_admin());

create policy installments_own          on installments          for select using (
  plan_id in (select id from installment_plans where player_id = private.current_player_id()) or private.is_admin());

create policy installments_admin        on installments          for all    using (private.is_admin()) with check (private.is_admin());

create policy invoices_own              on invoices              for select using (
  payment_id in (select id from payments where player_id = private.current_player_id()) or private.is_admin());

create policy invoices_admin            on invoices              for all    using (private.is_admin()) with check (private.is_admin());
