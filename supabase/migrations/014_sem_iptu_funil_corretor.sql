-- 1) "Imóvel sem IPTU" (mesmo padrão do "sem condomínio" já existente).
alter table public.imoveis add column if not exists sem_iptu boolean not null default false;

-- 2) Corrige o funil do dashboard: "Fechamentos" estava contando pela data em que o status foi
--    mudado no sistema (log de interações), não pela data real do fechamento que o usuário informa
--    (coluna "fechado_em"). Isso fazia um fechamento de outubro, lançado no sistema em novembro,
--    aparecer no funil de novembro.
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
        and (not p_somente_meus or l.responsavel_id = auth.uid())
        and coalesce(l.busca_finalidade, 'venda') = p_tipo),
    (select count(*) from visitas v
      left join imoveis i on i.id = v.imovel_id
      left join leads l on l.id = v.lead_id
      where v.status = 'realizada' and v.quando >= p_inicio and v.quando < p_fim
        and (not p_somente_meus or l.responsavel_id = auth.uid())
        and case when i.id is not null
                 then (coalesce(i.finalidade, 'venda') = p_tipo or i.finalidade = 'venda_aluguel')
                 else coalesce(l.busca_finalidade, 'venda') = p_tipo end),
    (select count(distinct x.lead_id) from interacoes x
      join leads l on l.id = x.lead_id
      where x.tipo = 'mudanca_status' and x.texto like '% → proposta'
        and x.created_at >= p_inicio and x.created_at < p_fim
        and (not p_somente_meus or l.responsavel_id = auth.uid())
        and coalesce(l.busca_finalidade, 'venda') = p_tipo),
    (select count(*) from leads l
      where l.status = 'fechado'
        and l.fechado_em >= p_inicio::date and l.fechado_em < p_fim::date
        and (not p_somente_meus or l.responsavel_id = auth.uid())
        and coalesce(l.fechado_tipo, l.busca_finalidade, 'venda') = p_tipo);
$$;
revoke all on function public.funil_do_periodo(timestamptz, timestamptz, boolean, text) from public, anon;
grant execute on function public.funil_do_periodo(timestamptz, timestamptz, boolean, text) to authenticated;

-- 3) Corretor duplicado: se existir um "corretor próprio" (e_proprio = true) e outro corretor com o
--    mesmo nome na mesma conta (criado à mão por engano, ex. "Wallace Cruz" duas vezes), desativa o
--    duplicado — ele some da lista de captador, sem apagar nada (imóveis já ligados a ele continuam).
update public.corretores c
set ativo = false
where c.ativo
  and not c.e_proprio
  and exists (
    select 1 from public.corretores c2
    where c2.owner_id = c.owner_id and c2.nome = c.nome and c2.e_proprio and c2.ativo
  );
