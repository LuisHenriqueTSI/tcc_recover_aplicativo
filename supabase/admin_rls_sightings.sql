-- ==============================================================================
-- WeFIND - Script de Liberação de RLS para Administradores na tabela sightings
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ==============================================================================

-- 1. Habilita RLS na tabela sightings caso ainda não esteja habilitado
alter table if exists public.sightings enable row level security;

-- 2. Permite leitura pública / autenticada de todas as pistas e comentários
drop policy if exists "Qualquer pessoa pode ler avistamentos" on public.sightings;
create policy "Qualquer pessoa pode ler avistamentos" on public.sightings
  for select
  using (true);

-- 3. Permite que usuários autenticados criem novos avistamentos
drop policy if exists "Usuarios autenticados podem criar avistamentos" on public.sightings;
create policy "Usuarios autenticados podem criar avistamentos" on public.sightings
  for insert
  to authenticated
  with check (auth.uid()::text = user_id::text or user_id is null);

-- 4. Permite que o autor ou qualquer Administrador atualize um comentário / avistamento
drop policy if exists "Autor ou admin pode atualizar avistamentos" on public.sightings;
create policy "Autor ou admin pode atualizar avistamentos" on public.sightings
  for update
  to authenticated
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
        and (profiles.adm = true or profiles.adm::text = 'true' or profiles.role = 'admin')
    )
  )
  with check (
    auth.uid()::text = user_id::text
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
        and (profiles.adm = true or profiles.adm::text = 'true' or profiles.role = 'admin')
    )
  );

-- 5. Permite que o autor ou qualquer Administrador exclua um comentário / avistamento
drop policy if exists "Autor ou admin pode excluir avistamentos" on public.sightings;
create policy "Autor ou admin pode excluir avistamentos" on public.sightings
  for delete
  to authenticated
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
        and (profiles.adm = true or profiles.adm::text = 'true' or profiles.role = 'admin')
    )
  );
