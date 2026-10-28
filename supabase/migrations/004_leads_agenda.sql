-- Migração 004 — perfil de busca do lead, lembretes de retorno e agenda de visitas
-- Rode DEPOIS das migrações anteriores. Pode ser repetida sem erro.
--
-- O vínculo lead <-> imóvel usa a tabela "lead_imovel", que já existe desde o schema.sql.

-- ---------------------------------------------------------------
-- 1) Perfil de busca do lead
-- ---------------------------------------------------------------
alter table leads
  add column if not exists busca_finalidade text check (busca_finalidade in ('venda', 'aluguel')), -- comprar ou alugar
  add column if not exists busca_tipos text[] not null default '{}',   -- ids de tipo de imóvel (apartamento, casa...)
  add column if not exists busca_bairros text,                         -- texto livre: "Centro, Cavaleiros"
  add column if not exists busca_cidade text,
  add column if not exists busca_valor_min numeric(14,2),
  add column if not exists busca_valor_max numeric(14,2),
  add column if not exists busca_quartos int;                          -- mínimo de dormitórios

-- ---------------------------------------------------------------
-- 2) Lembretes de retorno de contato
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- 3) Agenda de visitas (ligada ao lead e ao imóvel)
-- ---------------------------------------------------------------
create table if not exists visitas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  imovel_id uuid references imoveis(id) on delete set null,   -- se o imóvel for excluído, o histórico da visita fica
  quando timestamptz not null,
  status text not null default 'agendada'
    check (status in ('agendada', 'realizada', 'cancelada', 'nao_compareceu')),
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists visitas_agenda_idx on visitas (owner_id, status, quando);
create index if not exists visitas_lead_idx on visitas (lead_id);
create index if not exists visitas_imovel_idx on visitas (imovel_id);

-- ---------------------------------------------------------------
-- 4) Segurança: cada usuário só vê os próprios registros
-- ---------------------------------------------------------------
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
