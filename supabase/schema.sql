-- CRM do corretor — schema inicial (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Todas as tabelas têm owner_id + Row Level Security: cada usuário só vê os próprios dados.
-- Isso vale mesmo com um único corretor, e já deixa a migração para multi-usuário simples.

create extension if not exists "pgcrypto";

-- Etapas do funil
create type lead_status as enum ('novo', 'contato', 'visita', 'proposta', 'fechado', 'perdido');

-- Atualiza updated_at automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Imóveis
-- ---------------------------------------------------------------
create table imoveis (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  tipo text,                       -- casa, apartamento, terreno...
  finalidade text default 'venda', -- venda | aluguel
  valor numeric(14,2),
  bairro text,
  cidade text,
  quartos int,
  area_m2 numeric(10,2),
  descricao text,
  fotos text[] not null default '{}',  -- URLs (Storage/R2)
  status text not null default 'disponivel', -- disponivel | reservado | vendido
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Campanhas (gasto vem dos Ads; preenchido depois pela integração)
-- ---------------------------------------------------------------
create table campanhas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plataforma text not null,        -- meta | google | outro
  id_externo text,                 -- id da campanha na plataforma
  nome text not null,
  gasto_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, plataforma, id_externo)
);

-- ---------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  status lead_status not null default 'novo',
  origem text default 'manual',    -- manual | meta | google | indicacao | site
  campanha_id uuid references campanhas(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  observacoes text,
  consentimento_lgpd boolean not null default false,
  consentimento_em timestamptz,
  valor_fechado numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_owner_status_idx on leads (owner_id, status);
create index leads_owner_created_idx on leads (owner_id, created_at desc);

-- ---------------------------------------------------------------
-- Interesse do lead em imóveis
-- ---------------------------------------------------------------
create table lead_imovel (
  lead_id uuid not null references leads(id) on delete cascade,
  imovel_id uuid not null references imoveis(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, imovel_id)
);

-- ---------------------------------------------------------------
-- Histórico de interações
-- ---------------------------------------------------------------
create table interacoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  tipo text not null default 'nota', -- nota | ligacao | whatsapp | visita | email | mudanca_status
  texto text,
  created_at timestamptz not null default now()
);

create index interacoes_lead_idx on interacoes (lead_id, created_at desc);

-- ---------------------------------------------------------------
-- Conversões (venda fechada enviada de volta ao Meta/Google — fase 2)
-- ---------------------------------------------------------------
create table conversoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  valor numeric(14,2),
  enviada_ao_ads boolean not null default false,
  enviada_em timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------
create trigger leads_updated_at before update on leads
  for each row execute function set_updated_at();
create trigger imoveis_updated_at before update on imoveis
  for each row execute function set_updated_at();

-- Registra mudança de etapa automaticamente no histórico
create or replace function log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into interacoes (owner_id, lead_id, tipo, texto)
    values (new.owner_id, new.id, 'mudanca_status', old.status || ' → ' || new.status);
  end if;
  return new;
end;
$$;

create trigger leads_status_log after update on leads
  for each row execute function log_status_change();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table leads       enable row level security;
alter table imoveis     enable row level security;
alter table campanhas   enable row level security;
alter table lead_imovel enable row level security;
alter table interacoes  enable row level security;
alter table conversoes  enable row level security;

create policy "leads: dono" on leads
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "imoveis: dono" on imoveis
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "campanhas: dono" on campanhas
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "lead_imovel: dono" on lead_imovel
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "interacoes: dono" on interacoes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "conversoes: dono" on conversoes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- Permissões da API (necessárias em projetos Supabase que não concedem
-- acesso automático às tabelas novas). O acesso real continua limitado
-- pelas políticas RLS acima; o papel "anon" (visitante) não recebe nada.
-- ---------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ---------------------------------------------------------------
-- Visão: custo por lead por campanha (usada no dashboard da fase 2)
-- ---------------------------------------------------------------
create or replace view campanha_resumo with (security_invoker = true) as
select
  c.id,
  c.owner_id,
  c.nome,
  c.plataforma,
  c.gasto_total,
  count(l.id) as total_leads,
  count(l.id) filter (where l.status = 'fechado') as vendas,
  case when count(l.id) > 0 then round(c.gasto_total / count(l.id), 2) end as custo_por_lead,
  case when count(l.id) filter (where l.status = 'fechado') > 0
       then round(c.gasto_total / count(l.id) filter (where l.status = 'fechado'), 2) end as custo_por_venda
from campanhas c
left join leads l on l.campanha_id = c.id
group by c.id;
