-- ALTIOR — Inhaber wird bei der Registrierung automatisch Administrator
--
-- Ohne das muesste die Rolle nach jeder Neuanlage von Hand gesetzt werden.
-- Die Liste steht bewusst in einer eigenen Tabelle und nicht im Code:
-- so laesst sich ein zweiter Trainer spaeter ohne Migration ergaenzen (D26).

create table if not exists private.admin_emails (
  email text primary key
);

insert into private.admin_emails (email)
values ('steffen@altior.football')
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when exists (select 1 from private.admin_emails a where lower(a.email) = lower(new.email))
      then 'admin'::public.user_role
      else 'player'::public.user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Falls das Konto schon existiert, Rolle nachziehen.
update public.profiles p
set role = 'admin'
where exists (select 1 from private.admin_emails a where lower(a.email) = lower(p.email))
  and p.role <> 'admin';
