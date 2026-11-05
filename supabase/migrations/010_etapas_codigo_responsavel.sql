-- Migração 010 — regras de etapa, código do imóvel e responsável do lead
-- Rode DEPOIS da 008 e da 009. Pode ser repetida sem erro.
--
--   * Perdido exige motivo; Fechado exige imóvel, valor final, data e comissão estimada
--     (valida no banco, só quando o lead MUDA de etapa: leads antigos continuam editáveis)
--   * Código de referência do imóvel (CRZ-0001), gerado automaticamente e imutável
--   * Responsável do lead, com transferência registrada no histórico. O lead continua do criador;
--     o responsável atual também o vê e edita; o dono da imobiliária vê todos.

-- ---------------------------------------------------------------
-- 1) Leads: motivo de perdido, dados do fechamento e responsável
-- ---------------------------------------------------------------
alter table public.leads
  add column if not exists perdido_motivo text,
  add column if not exists perdido_motivo_texto text,
  add column if not exists fechado_imovel_id uuid references public.imoveis(id) on delete set null,
  add column if not exists fechado_em date,
  add column if not exists comissao_estimada numeric(14,2),
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null default auth.uid();

alter table public.leads drop constraint if exists leads_perdido_motivo_check;
alter table public.leads add constraint leads_perdido_motivo_check
  check (perdido_motivo in ('preco', 'comprou_outro', 'desistiu', 'sem_retorno', 'sem_credito', 'perfil_incompativel', 'outro'));
alter table public.leads drop constraint if exists leads_comissao_estimada_check;
alter table public.leads add constraint leads_comissao_estimada_check check (comissao_estimada >= 0);

update public.leads set responsavel_id = owner_id where responsavel_id is null;

create index if not exists leads_responsavel_idx on public.leads (responsavel_id);

-- Regras da mudança de etapa (só quando a etapa muda ou o lead é criado já nela)
create or replace function public.validar_etapa_do_lead()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'perdido' then
      if new.perdido_motivo is null then
        raise exception 'Informe o motivo da perda do lead.' using errcode = '23514';
      end if;
      if new.perdido_motivo = 'outro' and nullif(btrim(coalesce(new.perdido_motivo_texto, '')), '') is null then
        raise exception 'Descreva o motivo da perda (opção "Outro").' using errcode = '23514';
      end if;
    end if;
    if new.status = 'fechado'
       and (new.fechado_imovel_id is null or new.valor_fechado is null or new.fechado_em is null or new.comissao_estimada is null) then
      raise exception 'Para fechar o lead informe o imóvel, o valor final, a data e a comissão estimada.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_validar_etapa on public.leads;
create trigger leads_validar_etapa before insert or update of status on public.leads
  for each row execute function public.validar_etapa_do_lead();

-- O criador do lead nunca muda (quem passa a cuidar dele é o "responsável")
create or replace function public.fixar_dono_do_lead()
returns trigger language plpgsql as $$
begin
  new.owner_id := old.owner_id;
  return new;
end;
$$;

drop trigger if exists leads_fixar_dono on public.leads;
create trigger leads_fixar_dono before update on public.leads
  for each row execute function public.fixar_dono_do_lead();

-- ---------------------------------------------------------------
-- 2) Todo usuário tem um "corretor próprio" (nome que aparece como responsável/captador)
-- ---------------------------------------------------------------
insert into public.corretores (owner_id, nome, email, e_proprio)
select u.id, coalesce(nullif(initcap(split_part(u.email, '@', 1)), ''), 'Corretor'), u.email, true
  from auth.users u
 where not exists (select 1 from public.corretores c where c.owner_id = u.id and c.e_proprio);

create or replace function public.criar_corretor_proprio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.corretores (owner_id, nome, email, e_proprio)
  values (new.id, coalesce(nullif(initcap(split_part(new.email, '@', 1)), ''), 'Corretor'), new.email, true)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists criar_corretor_proprio on auth.users;
create trigger criar_corretor_proprio after insert on auth.users
  for each row execute function public.criar_corretor_proprio();

-- ---------------------------------------------------------------
-- 3) Quem pode ver/editar o lead (e tudo o que está ligado a ele)
-- ---------------------------------------------------------------
create or replace function public.pode_ver_lead(p_lead uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leads l
     where l.id = p_lead
       and (l.owner_id = auth.uid() or l.responsavel_id = auth.uid() or public.eh_dono_da_imobiliaria())
  );
$$;
revoke all on function public.pode_ver_lead(uuid) from public, anon;
grant execute on function public.pode_ver_lead(uuid) to authenticated;

drop policy if exists "leads: dono" on public.leads;
drop policy if exists "leads: ver" on public.leads;
drop policy if exists "leads: criar" on public.leads;
drop policy if exists "leads: alterar" on public.leads;
drop policy if exists "leads: apagar" on public.leads;
create policy "leads: ver" on public.leads for select to authenticated
  using (owner_id = auth.uid() or responsavel_id = auth.uid() or public.eh_dono_da_imobiliaria());
create policy "leads: criar" on public.leads for insert to authenticated
  with check (owner_id = auth.uid());
create policy "leads: alterar" on public.leads for update to authenticated
  using (owner_id = auth.uid() or responsavel_id = auth.uid() or public.eh_dono_da_imobiliaria())
  with check (true);   -- ao transferir, o lead deixa de ser "dele"; o criador é protegido pelo gatilho acima
create policy "leads: apagar" on public.leads for delete to authenticated
  using (owner_id = auth.uid() or public.eh_dono_da_imobiliaria());

drop policy if exists "interacoes: dono" on public.interacoes;
drop policy if exists "interacoes: do lead" on public.interacoes;
create policy "interacoes: do lead" on public.interacoes for all to authenticated
  using (public.pode_ver_lead(lead_id)) with check (public.pode_ver_lead(lead_id));

drop policy if exists "lembretes: dono" on public.lembretes;
drop policy if exists "lembretes: do lead" on public.lembretes;
create policy "lembretes: do lead" on public.lembretes for all to authenticated
  using (public.pode_ver_lead(lead_id)) with check (public.pode_ver_lead(lead_id));

drop policy if exists "visitas: dono" on public.visitas;
drop policy if exists "visitas: do lead" on public.visitas;
create policy "visitas: do lead" on public.visitas for all to authenticated
  using (public.pode_ver_lead(lead_id)) with check (public.pode_ver_lead(lead_id));

drop policy if exists "lead_imovel: dono" on public.lead_imovel;
drop policy if exists "lead_imovel: do lead" on public.lead_imovel;
create policy "lead_imovel: do lead" on public.lead_imovel for all to authenticated
  using (public.pode_ver_lead(lead_id)) with check (public.pode_ver_lead(lead_id));

-- ---------------------------------------------------------------
-- 4) Histórico: mudança de etapa e transferência de responsável
-- ---------------------------------------------------------------
create or replace function public.nome_do_usuario(p_usuario uuid)
returns text
language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    (select c.nome from public.corretores c where c.owner_id = p_usuario and c.e_proprio limit 1),
    (select initcap(split_part(u.email, '@', 1)) from auth.users u where u.id = p_usuario),
    'Sem responsável');
$$;

create or replace function log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into interacoes (owner_id, lead_id, tipo, texto)
    values (new.owner_id, new.id, 'mudanca_status', old.status || ' → ' || new.status);
  end if;
  if new.responsavel_id is distinct from old.responsavel_id then
    insert into interacoes (owner_id, lead_id, tipo, texto)
    values (new.owner_id, new.id, 'transferencia',
            public.nome_do_usuario(old.responsavel_id) || ' → ' || public.nome_do_usuario(new.responsavel_id));
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 5) Imóveis: código de referência (CRZ-0001), automático e imutável
-- ---------------------------------------------------------------
create sequence if not exists public.imoveis_codigo_seq;

alter table public.imoveis add column if not exists codigo text;

-- imóveis antigos recebem código pela ordem de cadastro
do $$
declare
  base int;
begin
  select coalesce(max(substring(codigo from 5)::int), 0) into base from public.imoveis where codigo ~ '^CRZ-[0-9]+$';
  with ordenados as (
    select id, row_number() over (order by created_at, id) as n from public.imoveis where codigo is null
  )
  update public.imoveis i
     set codigo = 'CRZ-' || case when o.n + base < 10000 then lpad((o.n + base)::text, 4, '0') else (o.n + base)::text end
    from ordenados o where i.id = o.id;
  select coalesce(max(substring(codigo from 5)::int), 0) into base from public.imoveis where codigo ~ '^CRZ-[0-9]+$';
  perform setval('public.imoveis_codigo_seq', greatest(base, 1), base > 0);
end $$;

create unique index if not exists imoveis_codigo_unico on public.imoveis (codigo);

create or replace function public.definir_codigo_do_imovel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n bigint;
begin
  if tg_op = 'UPDATE' then
    new.codigo := old.codigo;   -- o código nunca muda
  elsif new.codigo is null then
    n := nextval('public.imoveis_codigo_seq');
    new.codigo := 'CRZ-' || case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
  end if;
  return new;
end;
$$;

drop trigger if exists imoveis_codigo on public.imoveis;
create trigger imoveis_codigo before insert or update on public.imoveis
  for each row execute function public.definir_codigo_do_imovel();

-- ---------------------------------------------------------------
-- 6) Funil do Dashboard: "só meus" passa a considerar o responsável atual do lead
-- ---------------------------------------------------------------
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
    (select count(distinct x.lead_id) from interacoes x
      join leads l on l.id = x.lead_id
      where x.tipo = 'mudanca_status' and x.texto like '% → fechado'
        and x.created_at >= p_inicio and x.created_at < p_fim
        and (not p_somente_meus or l.responsavel_id = auth.uid())
        and coalesce(l.fechado_tipo, l.busca_finalidade, 'venda') = p_tipo);
$$;
