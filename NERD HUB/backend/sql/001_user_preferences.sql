create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme_preference text not null default 'dark' check (theme_preference in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "users_can_read_own_preferences" on public.user_preferences;
create policy "users_can_read_own_preferences"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users_can_insert_own_preferences" on public.user_preferences;
create policy "users_can_insert_own_preferences"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users_can_update_own_preferences" on public.user_preferences;
create policy "users_can_update_own_preferences"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
