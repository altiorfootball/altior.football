-- ALTIOR — Registrierungsregeln und automatisches Profil
--
-- Drei Altersgrenzen wirken hier zusammen:
--   10 Jahre — Untergrenze fuer die Registrierung (D1)
--   16 Jahre — darunter ist die Einwilligung der Eltern in die Daten-
--              verarbeitung Pflicht (DSGVO Art. 8, in Deutschland 16)
--   18 Jahre — darunter sind Eltern Vertragspartner und Rechnungsempfaenger
--              (Paragraf 106 BGB)
-- Die Datenbank erzwingt die erste Grenze. Die beiden anderen steuern den
-- Ablauf in der Anwendung und die Rechnungsstellung.

-- Als Trigger und nicht als CHECK, weil sich das Alter mit der Zeit aendert:
-- geprueft wird zum Zeitpunkt der Registrierung, ein bestehender Datensatz
-- wird spaeter nicht ungueltig.
create or replace function public.enforce_minimum_age()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.date_of_birth is null or new.date_of_birth > (current_date - interval '10 years') then
    raise exception 'Eine Registrierung ist ab 10 Jahren moeglich.'
      using errcode = 'check_violation';
  end if;
  if new.date_of_birth < (current_date - interval '100 years') then
    raise exception 'Bitte pruefe das Geburtsdatum.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger players_minimum_age
  before insert on public.players
  for each row execute function public.enforce_minimum_age();

revoke execute on function public.enforce_minimum_age() from public, anon, authenticated;

-- Jede Anmeldung erzeugt automatisch ein Profil. So kann kein Konto ohne
-- zugehoerigen Datensatz entstehen, auch nicht wenn die Anwendung abbricht.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Spieler duerfen ihren eigenen Datensatz anlegen; die Zuordnung zum Konto
-- kann dabei nicht gefaelscht werden.
create policy players_self_insert on public.players
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy guardians_self_insert on public.guardians
  for insert to authenticated
  with check (player_id = private.current_player_id());

create policy guardians_self_update on public.guardians
  for update to authenticated
  using (player_id = private.current_player_id())
  with check (player_id = private.current_player_id());

-- Alter in Jahren, damit Anwendung und Datenbank dieselbe Rechnung nutzen.
create or replace function public.age_years(dob date)
returns int language sql immutable set search_path = pg_catalog, public as $$
  select extract(year from age(current_date, dob))::int;
$$;
