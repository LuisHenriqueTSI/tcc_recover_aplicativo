create table if not exists public.account_deletion_jobs (
  user_id uuid primary key,
  storage_paths jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public, anon, authenticated;
grant all on public.account_deletion_jobs to service_role;

alter table public.messages alter column sender_id drop not null;
alter table public.messages alter column receiver_id drop not null;
alter table public.messages add column if not exists sender_deleted boolean not null default false;

alter table public.conversations alter column participant_a drop not null;
alter table public.conversations alter column participant_b drop not null;
alter table public.conversations add column if not exists item_title_snapshot text;
alter table public.conversations drop constraint if exists conversations_participant_a_fkey;
alter table public.conversations drop constraint if exists conversations_participant_b_fkey;
alter table public.conversations
  add constraint conversations_participant_a_fkey
  foreign key (participant_a) references auth.users(id) on delete set null;
alter table public.conversations
  add constraint conversations_participant_b_fkey
  foreign key (participant_b) references auth.users(id) on delete set null;

do $$
begin
  if to_regclass('public.success_stories') is not null
     and exists (
       select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'success_stories' and column_name = 'user_id'
     ) then
    execute 'alter table public.success_stories alter column user_id drop not null';
  end if;
end;
$$;

do $$
declare
  fk record;
  definition text;
begin
  for fk in
    select c.oid, c.conname, c.conrelid::regclass as relation, c.conkey
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.contype = 'f'
      and c.conrelid = 'public.messages'::regclass
      and a.attname in ('sender_id', 'receiver_id')
  loop
    definition := pg_get_constraintdef(fk.oid, true);
    execute format('alter table %s drop constraint %I', fk.relation, fk.conname);
    definition := regexp_replace(
      definition,
      ' ON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION)',
      ' ON DELETE SET NULL',
      'i'
    );
    if definition !~* ' ON DELETE ' then
      definition := definition || ' ON DELETE SET NULL';
    end if;
    execute format('alter table %s add constraint %I %s', fk.relation, fk.conname, definition);
  end loop;
end;
$$;

create or replace function public.delete_account_rows(
  p_table text,
  p_column text,
  p_user_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regclass(format('public.%I', p_table)) is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table
      and column_name = p_column
  ) then
    return;
  end if;

  execute format(
    'delete from public.%I where %I::text = $1',
    p_table,
    p_column
  ) using p_user_id;
end;
$$;

revoke all on function public.delete_account_rows(text, text, text) from public, anon, authenticated;
grant execute on function public.delete_account_rows(text, text, text) to service_role;

create or replace function public.prepare_account_deletion(
  p_user_id uuid,
  p_storage_paths jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_paths jsonb;
  account_email text;
  item_ids text[];
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  select storage_paths
    into existing_paths
    from public.account_deletion_jobs
   where user_id = p_user_id
   for update;

  if found then
    return existing_paths;
  end if;

  select email into account_email
    from auth.users
   where id = p_user_id;

  if account_email is null then
    raise exception 'Authenticated account was not found';
  end if;

  select coalesce(array_agg(id::text), '{}'::text[])
    into item_ids
    from public.items
   where owner_id::text = p_user_id::text;

  update public.conversations c
     set item_title_snapshot = coalesce(c.item_title_snapshot, i.title)
    from public.items i
   where c.item_id = i.id
     and i.owner_id::text = p_user_id::text;

  update public.messages
     set sender_deleted = case when sender_id::text = p_user_id::text then true else sender_deleted end,
         sender_id = case when sender_id::text = p_user_id::text then null else sender_id end,
         receiver_id = case when receiver_id::text = p_user_id::text then null else receiver_id end,
         photo_url = null
   where sender_id::text = p_user_id::text
      or receiver_id::text = p_user_id::text;

  update public.conversations
     set participant_a = case when participant_a = p_user_id then null else participant_a end,
         participant_b = case when participant_b = p_user_id then null else participant_b end
   where participant_a = p_user_id or participant_b = p_user_id;

  update public.conversations
     set item_id = null
   where item_id::text = any(item_ids);

  if to_regclass('public.sightings') is not null then
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'sightings' and column_name = 'item_id'
    ) then
      execute 'delete from public.sightings where item_id::text = any($1)' using item_ids;
    end if;
    perform public.delete_account_rows('sightings', 'user_id', p_user_id::text);
  end if;

  if to_regclass('public.item_photos') is not null then
    execute 'delete from public.item_photos where item_id::text = any($1)' using item_ids;
  end if;
  if to_regclass('public.item_claims') is not null then
    execute 'delete from public.item_claims where item_id::text = any($1) or claimant_id::text = $2'
      using item_ids, p_user_id::text;
  end if;
  if to_regclass('public.rewards') is not null then
    execute 'delete from public.rewards where item_id::text = any($1)' using item_ids;
  end if;
  if to_regclass('public.reward_claims') is not null then
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'reward_claims' and column_name = 'item_id'
    ) then
      execute 'delete from public.reward_claims where item_id::text = any($1)' using item_ids;
    end if;
    perform public.delete_account_rows('reward_claims', 'user_id', p_user_id::text);
  end if;

  delete from public.items where owner_id::text = p_user_id::text;

  perform public.delete_account_rows('notifications', 'user_id', p_user_id::text);
  perform public.delete_account_rows('foster_volunteers', 'user_id', p_user_id::text);
  perform public.delete_account_rows('success_story_likes', 'user_id', p_user_id::text);
  perform public.delete_account_rows('user_ratings', 'reviewer_id', p_user_id::text);
  perform public.delete_account_rows('user_ratings', 'target_user_id', p_user_id::text);
  perform public.delete_account_rows('signup_verifications', 'email', account_email);
  perform public.delete_account_rows('reports', 'reporter_id', p_user_id::text);

  if to_regclass('public.reports') is not null then
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'reports' and column_name = 'reviewed_by'
    ) then
      execute 'update public.reports set reviewed_by = null where reviewed_by::text = $1'
        using p_user_id::text;
    end if;
  end if;

  if to_regclass('public.success_stories') is not null
     and exists (
       select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'success_stories' and column_name = 'user_id'
     ) then
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'success_stories' and column_name = 'tutor_name'
    ) then
      if exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'success_stories' and column_name = 'photo_url'
      ) then
        execute 'update public.success_stories set user_id = null, tutor_name = ''Conta excluída'', photo_url = null where user_id::text = $1'
          using p_user_id::text;
      else
        execute 'update public.success_stories set user_id = null, tutor_name = ''Conta excluída'' where user_id::text = $1'
          using p_user_id::text;
      end if;
    else
      if exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'success_stories' and column_name = 'photo_url'
      ) then
        execute 'update public.success_stories set user_id = null, photo_url = null where user_id::text = $1'
          using p_user_id::text;
      else
        execute 'update public.success_stories set user_id = null where user_id::text = $1'
          using p_user_id::text;
      end if;
    end if;
  end if;

  delete from public.profiles where id::text = p_user_id::text;

  insert into public.account_deletion_jobs (user_id, storage_paths)
  values (p_user_id, coalesce(p_storage_paths, '{}'::jsonb))
  on conflict (user_id) do update
    set storage_paths = excluded.storage_paths,
        created_at = now();

  return coalesce(p_storage_paths, '{}'::jsonb);
end;
$$;

create or replace function public.complete_account_deletion(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.account_deletion_jobs where user_id = p_user_id;
$$;

revoke all on function public.prepare_account_deletion(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.complete_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid, jsonb) to service_role;
grant execute on function public.complete_account_deletion(uuid) to service_role;
