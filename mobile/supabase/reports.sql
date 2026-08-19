-- Execute este script no SQL Editor do projeto Supabase.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  item_id integer references public.items(id) on delete set null,
  reporter_id text not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolution text,
  reviewed_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.reports alter column item_id drop not null;
alter table public.reports drop constraint if exists reports_item_id_fkey;
alter table public.reports add constraint reports_item_id_fkey
  foreign key (item_id) references public.items(id) on delete set null;

alter table public.notifications drop constraint if exists notifications_item_id_fkey;
alter table public.notifications add constraint notifications_item_id_fkey
  foreign key (item_id) references public.items(id) on delete cascade;

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_item_id_idx on public.reports(item_id);
create index if not exists reports_reporter_id_idx on public.reports(reporter_id);

alter table public.reports enable row level security;

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports" on public.reports for insert
  to authenticated with check (auth.uid()::text = reporter_id);

drop policy if exists "Users and admins can read reports" on public.reports;
create policy "Users and admins can read reports" on public.reports for select
  to authenticated using (
    auth.uid()::text = reporter_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
        and (profiles.adm = true or profiles.adm::text = 'true')
    )
  );

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
        and (profiles.adm = true or profiles.adm::text = 'true')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
        and (profiles.adm = true or profiles.adm::text = 'true')
    )
  );