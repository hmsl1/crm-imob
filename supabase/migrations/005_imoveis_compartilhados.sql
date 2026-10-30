-- Migração 005 — imóveis visíveis para todos os usuários
-- Antes: cada usuário só enxergava os imóveis que ele mesmo cadastrou.
-- Agora: todos os usuários logados VEEM todos os imóveis (e o nome do corretor responsável),
--        mas só quem cadastrou pode ALTERAR ou EXCLUIR o imóvel.
-- Leads, visitas, lembretes e o restante continuam privados de cada usuário.
-- Pode ser repetida sem erro.

-- ---------------------------------------------------------------
-- Imóveis
-- ---------------------------------------------------------------
drop policy if exists "imoveis: dono" on imoveis;
drop policy if exists "imoveis: leitura geral" on imoveis;
drop policy if exists "imoveis: dono insere" on imoveis;
drop policy if exists "imoveis: dono altera" on imoveis;
drop policy if exists "imoveis: dono apaga" on imoveis;

create policy "imoveis: leitura geral" on imoveis
  for select to authenticated using (true);
create policy "imoveis: dono insere" on imoveis
  for insert to authenticated with check (owner_id = auth.uid());
create policy "imoveis: dono altera" on imoveis
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "imoveis: dono apaga" on imoveis
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- Corretores: todos leem (para mostrar o responsável de cada imóvel); cada um altera só os seus
-- ---------------------------------------------------------------
drop policy if exists "corretores: dono" on corretores;
drop policy if exists "corretores: leitura geral" on corretores;
drop policy if exists "corretores: dono insere" on corretores;
drop policy if exists "corretores: dono altera" on corretores;
drop policy if exists "corretores: dono apaga" on corretores;

create policy "corretores: leitura geral" on corretores
  for select to authenticated using (true);
create policy "corretores: dono insere" on corretores
  for insert to authenticated with check (owner_id = auth.uid());
create policy "corretores: dono altera" on corretores
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "corretores: dono apaga" on corretores
  for delete to authenticated using (owner_id = auth.uid());
