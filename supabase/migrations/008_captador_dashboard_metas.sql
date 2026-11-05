-- Migração 008 — Captador no imóvel, metas da imobiliária e funil do Dashboard
-- Rode DEPOIS das migrações anteriores. Pode ser repetida sem erro.

-- ---------------------------------------------------------------
-- 1) "Corretor responsável" do imóvel vira "Captador"
--    (mesma coluna, só com outro nome: os dados existentes são mantidos)
-- ---------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'imoveis' and column_name = 'corretor_id')
     and not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'imoveis' and column_name = 'captador_id') then
    alter table public.imoveis rename column corretor_id to captador_id;
  end if;
end $$;

alter index if exists public.imoveis_corretor_idx rename to imoveis_captador_idx;

-- ---------------------------------------------------------------
-- 2) Quem é o dono da imobiliária (único que pode definir metas)
--    O e-mail precisa estar CONFIRMADO no Supabase Auth.
-- ---------------------------------------------------------------
create or replace function public.eh_dono_da_imobiliaria()
returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u
     where u.id = auth.uid()
       and lower(u.email) = 'negociosimobiliarioscrz@gmail.com'
       and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.eh_dono_da_imobiliaria() from public, anon;
grant execute on function public.eh_dono_da_imobiliaria() to authenticated;

-- ---------------------------------------------------------------
-- 3) Metas mensais da imobiliária: todos leem, só o dono escreve
-- ---------------------------------------------------------------
create table if not exists public.metas (
  mes date primary key check (mes = date_trunc('month', mes)::date),   -- sempre o dia 1 do mês
  captacoes int not null default 0 check (captacoes >= 0),
  novos_clientes int not null default 0 check (novos_clientes >= 0),
  visitas int not null default 0 check (visitas >= 0),
  propostas int not null default 0 check (propostas >= 0),
  fechamentos int not null default 0 check (fechamentos >= 0),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid()
);

alter table public.metas enable row level security;

drop policy if exists "metas: todos leem" on public.metas;
create policy "metas: todos leem" on public.metas
  for select to authenticated using (true);

drop policy if exists "metas: dono grava" on public.metas;
drop policy if exists "metas: dono insere" on public.metas;
drop policy if exists "metas: dono altera" on public.metas;
drop policy if exists "metas: dono apaga" on public.metas;
create policy "metas: dono insere" on public.metas
  for insert to authenticated with check (public.eh_dono_da_imobiliaria());
create policy "metas: dono altera" on public.metas
  for update to authenticated using (public.eh_dono_da_imobiliaria()) with check (public.eh_dono_da_imobiliaria());
create policy "metas: dono apaga" on public.metas
  for delete to authenticated using (public.eh_dono_da_imobiliaria());

grant select, insert, update, delete on public.metas to authenticated;

-- ---------------------------------------------------------------
-- 4) Funil do período. Devolve só CONTAGENS (nenhum dado de lead/imóvel),
--    somando todos os corretores da imobiliária ou só os do usuário logado.
--      captações    = imóveis cadastrados no período
--      novos clientes = leads cadastrados no período
--      visitas      = visitas marcadas como "realizada" no período
--      propostas    = leads que entraram na etapa Proposta no período
--      fechamentos  = leads que entraram na etapa Fechado no período
-- ---------------------------------------------------------------
create or replace function public.funil_do_periodo(p_inicio timestamptz, p_fim timestamptz, p_somente_meus boolean default false)
returns table (captacoes bigint, novos_clientes bigint, visitas bigint, propostas bigint, fechamentos bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from imoveis i
      where i.created_at >= p_inicio and i.created_at < p_fim
        and (not p_somente_meus or i.owner_id = auth.uid())),
    (select count(*) from leads l
      where l.created_at >= p_inicio and l.created_at < p_fim
        and (not p_somente_meus or l.owner_id = auth.uid())),
    (select count(*) from visitas v
      where v.status = 'realizada' and v.quando >= p_inicio and v.quando < p_fim
        and (not p_somente_meus or v.owner_id = auth.uid())),
    (select count(distinct x.lead_id) from interacoes x
      where x.tipo = 'mudanca_status' and x.texto like '% → proposta'
        and x.created_at >= p_inicio and x.created_at < p_fim
        and (not p_somente_meus or x.owner_id = auth.uid())),
    (select count(distinct x.lead_id) from interacoes x
      where x.tipo = 'mudanca_status' and x.texto like '% → fechado'
        and x.created_at >= p_inicio and x.created_at < p_fim
        and (not p_somente_meus or x.owner_id = auth.uid()));
$$;
revoke all on function public.funil_do_periodo(timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.funil_do_periodo(timestamptz, timestamptz, boolean) to authenticated;
