-- UNIFICAÇÃO DAS MIGRAÇÕES 002 A 007
-- CRM DO CORRETOR
-- Execute DEPOIS do schema.sql inicial

-- ===============================================================
-- 002_imoveis_fotos.sql
-- ===============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imoveis-fotos',
  'imoveis-fotos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: dono envia"  on storage.objects;
drop policy if exists "fotos: dono lista"  on storage.objects;
drop policy if exists "fotos: dono altera" on storage.objects;
drop policy if exists "fotos: dono apaga"  on storage.objects;

create policy "fotos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: dono lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: dono altera" on storage.objects
  for update to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create index if not exists imoveis_owner_created_idx on imoveis (owner_id, created_at desc);

-- ===============================================================
-- 003_imoveis_campos.sql
-- ===============================================================
create table if not exists corretores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  e_proprio boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists corretores_proprio_unico on corretores (owner_id) where e_proprio;

alter table corretores enable row level security;
drop policy if exists "corretores: dono" on corretores;
create policy "corretores: dono" on corretores
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update, delete on corretores to authenticated;

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

alter table imoveis
  add column if not exists corretor_id uuid references corretores(id) on delete set null,
  add column if not exists proprietario_nome text,
  add column if not exists proprietario_telefone1 text,
  add column if not exists proprietario_telefone2 text,
  add column if not exists valor_venda numeric(14,2),
  add column if not exists valor_aluguel numeric(14,2),
  add column if not exists valor_condominio numeric(14,2),
  add column if not exists valor_iptu numeric(14,2),
  add column if not exists sem_condominio boolean not null default false,
  add column if not exists padrao text check (padrao in ('baixo', 'medio', 'alto')),
  add column if not exists aceita_financiamento boolean,
  add column if not exists exclusividade boolean,
  add column if not exists chave_com_proprietario boolean not null default false,
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
  add column if not exists caracteristicas text[] not null default '{}',
  add column if not exists pisos text[] not null default '{}';

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'imoveis' and column_name = 'valor') then
    update imoveis set valor_venda = valor where finalidade = 'venda' and valor_venda is null;
    update imoveis set valor_aluguel = valor where finalidade = 'aluguel' and valor_aluguel is null;
    alter table imoveis drop column valor;
  end if;
end $$;

alter table imoveis drop constraint if exists imoveis_finalidade_check;
alter table imoveis add constraint imoveis_finalidade_check
  check (finalidade in ('venda', 'aluguel', 'venda_aluguel'));

create index if not exists imoveis_corretor_idx on imoveis (corretor_id);

-- ===============================================================
-- 004_leads_agenda.sql
-- ===============================================================
alter table leads
  add column if not exists busca_finalidade text check (busca_finalidade in ('venda', 'aluguel')),
  add column if not exists busca_tipos text[] not null default '{}',
  add column if not exists busca_bairros text,
  add column if not exists busca_cidade text,
  add column if not exists busca_valor_min numeric(14,2),
  add column if not exists busca_valor_max numeric(14,2),
  add column if not exists busca_quartos int;

create table if not exists lembretes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  quando timestamptz not null,
  nota text,
  concluido boolean not null default false,
  concluido_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lembretes_pendentes_idx on lembretes (owner_id, concluido, quando);
create index if not exists lembretes_lead_idx on lembretes (lead_id);

create table if not exists visitas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  imovel_id uuid references imoveis(id) on delete set null,
  quando timestamptz not null,
  status text not null default 'agendada'
    check (status in ('agendada', 'realizada', 'cancelada', 'nao_compareceu')),
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists visitas_agenda_idx on visitas (owner_id, status, quando);
create index if not exists visitas_lead_idx on visitas (lead_id);
create index if not exists visitas_imovel_idx on visitas (imovel_id);

alter table lembretes enable row level security;
alter table visitas enable row level security;

drop policy if exists "lembretes: dono" on lembretes;
create policy "lembretes: dono" on lembretes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "visitas: dono" on visitas;
create policy "visitas: dono" on visitas
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on lembretes to authenticated;
grant select, insert, update, delete on visitas to authenticated;

-- ===============================================================
-- 005_imoveis_compartilhados.sql
-- ===============================================================
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

-- ===============================================================
-- 006_imoveis_endereco.sql
-- ===============================================================
alter table public.imoveis
  add column if not exists endereco text;

-- ===============================================================
-- 007_fechamento_iptu_esquina.sql
-- ===============================================================
alter table public.leads
  add column if not exists fechado_tipo text;

alter table public.leads drop constraint if exists leads_fechado_tipo_check;
alter table public.leads
  add constraint leads_fechado_tipo_check check (fechado_tipo in ('venda', 'aluguel'));

update public.leads
   set fechado_tipo = 'venda'
 where status = 'fechado' and fechado_tipo is null;

alter table public.imoveis
  add column if not exists iptu_periodo text;

alter table public.imoveis drop constraint if exists imoveis_iptu_periodo_check;
alter table public.imoveis
  add constraint imoveis_iptu_periodo_check check (iptu_periodo in ('mensal', 'anual'));

alter table public.imoveis drop constraint if exists imoveis_posicao_check;
alter table public.imoveis
  add constraint imoveis_posicao_check check (posicao in ('frente', 'lateral', 'fundos', 'esquina'));