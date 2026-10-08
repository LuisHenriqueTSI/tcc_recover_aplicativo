-- Remove o acesso anônimo a dados potencialmente pessoais.
-- Execute esta migração no projeto Supabase antes de distribuir uma nova versão do APK.

revoke select on table public.profiles from anon;
revoke select on table public.items from anon;
revoke select on table public.sightings from anon;

alter table if exists public.sightings enable row level security;

drop policy if exists "Qualquer pessoa pode ler avistamentos" on public.sightings;
drop policy if exists "Usuarios autenticados podem ler avistamentos" on public.sightings;

create policy "Usuarios autenticados podem ler avistamentos"
  on public.sightings
  for select
  to authenticated
  using (auth.uid() is not null);
