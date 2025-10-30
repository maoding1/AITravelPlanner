create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  travelers integer not null,
  budget numeric not null,
  currency text not null default 'CNY',
  preferences jsonb not null,
  plan_days jsonb not null,
  budget_items jsonb not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists itineraries_user_id_idx on public.itineraries(user_id);

create function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger on_itineraries_updated
before update on public.itineraries
for each row execute procedure public.handle_updated_at();
