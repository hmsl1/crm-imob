-- Migração 011 — captação: proprietário como cadastro próprio, imóvel visto na rua,
-- data de captação, exclusividade com vencimento e histórico de preço
-- Rode DEPOIS da 010. Pode ser repetida sem erro.

-- ---------------------------------------------------------------
-- 1) Proprietários (um proprietário, vários imóveis)
--    Cadastro compartilhado pela imobiliária: todos leem e editam; só quem criou apaga.
-- ---------------------------------------------------------------
create table if not exists public.proprietarios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone1 text,
  telefone2 text,
  email text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists proprietarios_updated_at on public.proprietarios;
create trigger proprietarios_updated_at before update on public.proprietarios
  for each row execute function set_updated_at();

alter table public.proprietarios enable row level security;
drop policy if exists "proprietarios: leitura geral" on public.proprietarios;
drop policy if exists "proprietarios: criar" on public.proprietarios;
drop policy if exists "proprietarios: alterar" on public.proprietarios;
drop policy if exists "proprietarios: apagar" on public.proprietarios;
create policy "proprietarios: leitura geral" on public.proprietarios for select to authenticated using (true);
create policy "proprietarios: criar" on public.proprietarios for insert to authenticated with check (owner_id = auth.uid());
create policy "proprietarios: alterar" on public.proprietarios for update to authenticated using (true) with check (true);
create policy "proprietarios: apagar" on public.proprietarios for delete to authenticated using (owner_id = auth.uid());
grant select, insert, update, delete on public.proprietarios to authenticated;

-- ---------------------------------------------------------------
-- 2) Imóveis: proprietário, data de captação, exclusividade com vencimento, localização e "a completar"
-- ---------------------------------------------------------------
alter table public.imoveis
  add column if not exists proprietario_id uuid references public.proprietarios(id) on delete set null,
  add column if not exists captado_em date,
  add column if not exists exclusividade_ate date,
  add column if not exists latitude numeric(9,6) check (latitude between -90 and 90),
  add column if not exists longitude numeric(9,6) check (longitude between -180 and 180),
  add column if not exists a_completar boolean not null default false;   -- captação rápida: faltam dados

-- imóveis antigos: a data de captação é o dia em que foram cadastrados
update public.imoveis set captado_em = created_at::date where captado_em is null;
alter table public.imoveis alter column captado_em set default current_date;
alter table public.imoveis alter column captado_em set not null;

create index if not exists imoveis_proprietario_idx on public.imoveis (proprietario_id);
create index if not exists imoveis_exclusividade_idx on public.imoveis (exclusividade_ate) where exclusividade_ate is not null;

-- ---------------------------------------------------------------
-- 3) Gatilhos do proprietário
--    * imóvel com nome de proprietário e sem vínculo: acha o proprietário (mesmo nome e telefone) ou cria
--    * o imóvel guarda uma cópia de nome e telefones do proprietário; editar de um lado atualiza o outro
--      e todos os imóveis dele. (pg_trigger_depth evita laços entre os gatilhos.)
-- ---------------------------------------------------------------
create or replace function public.vincular_proprietario_do_imovel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p public.proprietarios%rowtype;
  v_tel text;
  v_nome text := btrim(coalesce(new.proprietario_nome, ''));
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.proprietario_id is not null then
    select * into p from public.proprietarios pr where pr.id = new.proprietario_id;
    if found then
      if v_nome = '' then
        -- campos em branco no imóvel: assume os do proprietário
        new.proprietario_nome := p.nome;
        new.proprietario_telefone1 := p.telefone1;
        new.proprietario_telefone2 := p.telefone2;
      elsif (p.nome, p.telefone1, p.telefone2) is distinct from (v_nome, new.proprietario_telefone1, new.proprietario_telefone2) then
        -- alteração feita pelo imóvel vale para o proprietário e para os outros imóveis dele
        update public.proprietarios pr
           set nome = v_nome, telefone1 = new.proprietario_telefone1, telefone2 = new.proprietario_telefone2
         where pr.id = p.id;
        update public.imoveis i
           set proprietario_nome = v_nome, proprietario_telefone1 = new.proprietario_telefone1, proprietario_telefone2 = new.proprietario_telefone2
         where i.proprietario_id = p.id and i.id <> new.id;
        new.proprietario_nome := v_nome;
      end if;
    else
      new.proprietario_id := null;
    end if;
  end if;

  if new.proprietario_id is null and v_nome <> '' then
    v_tel := regexp_replace(coalesce(new.proprietario_telefone1, ''), '\D', '', 'g');
    select * into p from public.proprietarios pr
     where lower(btrim(pr.nome)) = lower(v_nome)
       and regexp_replace(coalesce(pr.telefone1, ''), '\D', '', 'g') = v_tel
     order by pr.created_at limit 1;
    if not found then
      insert into public.proprietarios (owner_id, nome, telefone1, telefone2)
      values (coalesce(new.owner_id, auth.uid()), v_nome, new.proprietario_telefone1, new.proprietario_telefone2)
      returning * into p;
    end if;
    new.proprietario_id := p.id;
    new.proprietario_nome := p.nome;
    new.proprietario_telefone1 := p.telefone1;
    new.proprietario_telefone2 := p.telefone2;
  end if;
  return new;
end;
$$;

drop trigger if exists imoveis_vincular_proprietario on public.imoveis;
create trigger imoveis_vincular_proprietario before insert or update on public.imoveis
  for each row execute function public.vincular_proprietario_do_imovel();

create or replace function public.espelhar_proprietario_nos_imoveis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  update public.imoveis
     set proprietario_nome = new.nome, proprietario_telefone1 = new.telefone1, proprietario_telefone2 = new.telefone2
   where proprietario_id = new.id
     and (proprietario_nome, proprietario_telefone1, proprietario_telefone2) is distinct from (new.nome, new.telefone1, new.telefone2);
  return new;
end;
$$;

drop trigger if exists proprietarios_espelhar on public.proprietarios;
create trigger proprietarios_espelhar after update on public.proprietarios
  for each row execute function public.espelhar_proprietario_nos_imoveis();

-- imóveis que já existiam passam a ter proprietário cadastrado (agrupados por nome + telefone)
alter table public.imoveis disable trigger imoveis_updated_at;   -- não mexe em "atualizado em"
update public.imoveis set proprietario_nome = proprietario_nome
 where proprietario_id is null and btrim(coalesce(proprietario_nome, '')) <> '';
alter table public.imoveis enable trigger imoveis_updated_at;

-- ---------------------------------------------------------------
-- 4) Histórico de preço (preenchido por gatilho a cada mudança de valor)
-- ---------------------------------------------------------------
create table if not exists public.imovel_precos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  tipo text not null check (tipo in ('venda', 'aluguel')),
  valor_anterior numeric(14,2),   -- vazio no primeiro registro
  valor_novo numeric(14,2),       -- vazio se o valor foi retirado
  alterado_em timestamptz not null default now(),
  alterado_por uuid default auth.uid()
);

create index if not exists imovel_precos_imovel_idx on public.imovel_precos (imovel_id, alterado_em desc);

alter table public.imovel_precos enable row level security;
drop policy if exists "precos: leitura geral" on public.imovel_precos;
create policy "precos: leitura geral" on public.imovel_precos for select to authenticated using (true);
grant select on public.imovel_precos to authenticated;   -- só o gatilho grava

create or replace function public.registrar_historico_de_preco()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.valor_venda is not null then
      insert into public.imovel_precos (imovel_id, tipo, valor_anterior, valor_novo) values (new.id, 'venda', null, new.valor_venda);
    end if;
    if new.valor_aluguel is not null then
      insert into public.imovel_precos (imovel_id, tipo, valor_anterior, valor_novo) values (new.id, 'aluguel', null, new.valor_aluguel);
    end if;
  else
    if new.valor_venda is distinct from old.valor_venda then
      insert into public.imovel_precos (imovel_id, tipo, valor_anterior, valor_novo) values (new.id, 'venda', old.valor_venda, new.valor_venda);
    end if;
    if new.valor_aluguel is distinct from old.valor_aluguel then
      insert into public.imovel_precos (imovel_id, tipo, valor_anterior, valor_novo) values (new.id, 'aluguel', old.valor_aluguel, new.valor_aluguel);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists imoveis_historico_preco on public.imoveis;
create trigger imoveis_historico_preco after insert or update of valor_venda, valor_aluguel on public.imoveis
  for each row execute function public.registrar_historico_de_preco();

-- imóveis que já existiam: primeiro registro do histórico com o valor atual, na data do cadastro
insert into public.imovel_precos (imovel_id, tipo, valor_anterior, valor_novo, alterado_em)
select i.id, 'venda', null, i.valor_venda, i.created_at from public.imoveis i
 where i.valor_venda is not null
   and not exists (select 1 from public.imovel_precos p where p.imovel_id = i.id and p.tipo = 'venda');
insert into public.imovel_precos (imovel_id, tipo, valor_anterior, valor_novo, alterado_em)
select i.id, 'aluguel', null, i.valor_aluguel, i.created_at from public.imoveis i
 where i.valor_aluguel is not null
   and not exists (select 1 from public.imovel_precos p where p.imovel_id = i.id and p.tipo = 'aluguel');
