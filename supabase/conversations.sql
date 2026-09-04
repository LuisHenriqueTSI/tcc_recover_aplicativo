-- Conversas persistentes, separadas por publicação.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  item_id integer references public.items(id) on delete set null,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint conversations_distinct_participants check (participant_a <> participant_b)
);

create unique index if not exists conversations_unique_participants_item
  on public.conversations (participant_a, participant_b, coalesce(item_id, 0));

alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

alter table public.conversations enable row level security;

create policy "Participants can view conversations"
  on public.conversations for select to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Participants can create conversations"
  on public.conversations for insert to authenticated
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Participants can close conversations"
  on public.conversations for update to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b)
  with check (auth.uid() = participant_a or auth.uid() = participant_b);
