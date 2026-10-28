-- ---------------------------------------------------------------
-- 1) Corretores
-- ---------------------------------------------------------------
create table if not exists corretores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  e_proprio boolean not null default false,   -- o corretor que representa o próprio usuário logado
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- no máximo um "corretor próprio" por conta (evita duplicar se o app abrir duas vezes ao mesmo tempo)
create unique index if not exists corretores_proprio_unico on corretores (owner_id) where e_proprio;

alter table corretores enable row level security;
drop policy if exists "corretores: dono" on corretores;
create policy "corretores: dono" on corretores
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update, delete on corretores to authenticated;

-- ---------------------------------------------------------------
-- 2) Renomear colunas antigas (só se ainda existirem com o nome antigo)
-- ---------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'imoveis' and column_name = 'area_m2') then
    alter table imoveis rename column area_m2 to area_construida;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'imoveis' and column_name = 'quartos') then
    alter table imoveis rename column quartos to dormitorios;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'imoveis' and column_name = 'descricao') then
    alter table imoveis rename column descricao to comentarios;
  end if;
end $$;

-- ---------------------------------------------------------------
-- 3) Novos campos
-- ---------------------------------------------------------------
alter table imoveis
  add column if not exists corretor_id uuid references corretores(id) on delete set null,

  -- proprietário
  add column if not exists proprietario_nome text,
  add column if not exists proprietario_telefone1 text,
  add column if not exists proprietario_telefone2 text,

  -- valores e condições
  add column if not exists valor_venda numeric(14,2),
  add column if not exists valor_aluguel numeric(14,2),
  add column if not exists valor_condominio numeric(14,2),
  add column if not exists valor_iptu numeric(14,2),
  add column if not exists sem_condominio boolean not null default false,
  add column if not exists padrao text check (padrao in ('baixo', 'medio', 'alto')),
  add column if not exists aceita_financiamento boolean,
  add column if not exists exclusividade boolean,
  add column if not exists chave_com_proprietario boolean not null default false,

  -- detalhes
  add column if not exists estado_imovel text check (estado_imovel in ('construcao', 'novo', 'usado')),
  add column if not exists posicao text check (posicao in ('frente', 'lateral', 'fundos')),
  add column if not exists posicao_solar text check (posicao_solar in ('manha', 'tarde')),
  add column if not exists vista_mar boolean,
  add column if not exists area_terreno numeric(10,2),
  add column if not exists suites int,
  add column if not exists banheiros int,
  add column if not exists salas int,
  add column if not exists vagas_cobertas int,
  add column if not exists vagas_descobertas int,
  add column if not exists elevador boolean not null default false,
  add column if not exists andares_predio int,
  add column if not exists andar_imovel int,

  -- listas de marcação (ids definidos no app: piscina, churrasqueira, porcelanato...)
  add column if not exists caracteristicas text[] not null default '{}',
  add column if not exists pisos text[] not null default '{}';

-- ---------------------------------------------------------------
-- 4) "valor" -> "valor_venda" / "valor_aluguel" (copia os dados e remove a coluna antiga)
-- ---------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'imoveis' and column_name = 'valor') then
    update imoveis set valor_venda = valor where finalidade = 'venda' and valor_venda is null;
    update imoveis set valor_aluguel = valor where finalidade = 'aluguel' and valor_aluguel is null;
    alter table imoveis drop column valor;
  end if;
end $$;

-- finalidade passa a aceitar "venda_aluguel"
alter table imoveis drop constraint if exists imoveis_finalidade_check;
alter table imoveis add constraint imoveis_finalidade_check
  check (finalidade in ('venda', 'aluguel', 'venda_aluguel'));

create index if not exists imoveis_corretor_idx on imoveis (corretor_id);
