-- Migração 009 — metas e funil separados para Venda e Locação (aluguel)
-- Rode DEPOIS da 008. Pode ser repetida sem erro.

-- ---------------------------------------------------------------
-- 1) Metas por mês E por tipo (as metas já gravadas viram metas de venda)
-- ---------------------------------------------------------------
alter table public.metas add column if not exists tipo text not null default 'venda';
alter table public.metas drop constraint if exists metas_tipo_check;
alter table public.metas add constraint metas_tipo_check check (tipo in ('venda', 'aluguel'));

do $$
begin
  if exists (select 1 from information_schema.table_constraints
              where table_schema = 'public' and table_name = 'metas'
                and constraint_name = 'metas_pkey'
                and (select count(*) from information_schema.key_column_usage k
                      where k.constraint_name = 'metas_pkey' and k.table_name = 'metas') = 1) then
    alter table public.metas drop constraint metas_pkey;
    alter table public.metas add primary key (mes, tipo);
  end if;
end $$;

-- ---------------------------------------------------------------
-- 2) Funil por tipo. Regras (quem não informou nada conta como venda):
--      captações      = imóveis cadastrados cuja finalidade inclui o tipo (venda e aluguel entra nos dois)
--      novos clientes = leads cadastrados cuja busca (comprar/alugar) é o tipo
--      visitas        = visitas realizadas, pelo tipo do imóvel (sem imóvel: pela busca do lead)
--      propostas      = leads que entraram em Proposta, pela busca do lead
--      fechamentos    = leads que entraram em Fechado, pelo tipo do fechamento (senão pela busca)
-- ---------------------------------------------------------------
drop function if exists public.funil_do_periodo(timestamptz, timestamptz, boolean);

create or replace function public.funil_do_periodo(
  p_inicio timestamptz, p_fim timestamptz, p_somente_meus boolean default false, p_tipo text default 'venda')
returns table (captacoes bigint, novos_clientes bigint, visitas bigint, propostas bigint, fechamentos bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from imoveis i
      where i.created_at >= p_inicio and i.created_at < p_fim
        and (not p_somente_meus or i.owner_id = auth.uid())
        and (coalesce(i.finalidade, 'venda') = p_tipo or i.finalidade = 'venda_aluguel')),
    (select count(*) from leads l
      where l.created_at >= p_inicio and l.created_at < p_fim
        and (not p_somente_meus or l.owner_id = auth.uid())
        and coalesce(l.busca_finalidade, 'venda') = p_tipo),
    (select count(*) from visitas v
      left join imoveis i on i.id = v.imovel_id
      left join leads l on l.id = v.lead_id
      where v.status = 'realizada' and v.quando >= p_inicio and v.quando < p_fim
        and (not p_somente_meus or v.owner_id = auth.uid())
        and case when i.id is not null
                 then (coalesce(i.finalidade, 'venda') = p_tipo or i.finalidade = 'venda_aluguel')
                 else coalesce(l.busca_finalidade, 'venda') = p_tipo end),
    (select count(distinct x.lead_id) from interacoes x
      join leads l on l.id = x.lead_id
      where x.tipo = 'mudanca_status' and x.texto like '% → proposta'
        and x.created_at >= p_inicio and x.created_at < p_fim
        and (not p_somente_meus or x.owner_id = auth.uid())
        and coalesce(l.busca_finalidade, 'venda') = p_tipo),
    (select count(distinct x.lead_id) from interacoes x
      join leads l on l.id = x.lead_id
      where x.tipo = 'mudanca_status' and x.texto like '% → fechado'
        and x.created_at >= p_inicio and x.created_at < p_fim
        and (not p_somente_meus or x.owner_id = auth.uid())
        and coalesce(l.fechado_tipo, l.busca_finalidade, 'venda') = p_tipo);
$$;
revoke all on function public.funil_do_periodo(timestamptz, timestamptz, boolean, text) from public, anon;
grant execute on function public.funil_do_periodo(timestamptz, timestamptz, boolean, text) to authenticated;
