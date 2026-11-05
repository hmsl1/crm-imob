-- Migração 012 — site público (vitrine) e códigos por tipo de imóvel
-- Rode DEPOIS da 011. Pode ser repetida sem erro.

-- ---------------------------------------------------------------
-- 1) Código do imóvel por tipo: CA0001 (casa), AP0001 (apartamento), LO0001 (comercial/loja),
--    TE0001 (terreno), RU0001 (rural), OU0001 (outro). Cada prefixo tem a sua própria contagem.
--    O código é definido ao cadastrar e nunca muda (ele circula em mensagens e links).
-- ---------------------------------------------------------------
create table if not exists public.imoveis_codigo_contadores (
  prefixo text primary key,
  ultimo integer not null default 0
);
alter table public.imoveis_codigo_contadores enable row level security;   -- sem políticas: só o gatilho (security definer) mexe

create or replace function public.prefixo_do_imovel(p_tipo text)
returns text language sql immutable as $$
  select case p_tipo
    when 'apartamento' then 'AP'
    when 'casa' then 'CA'
    when 'terreno' then 'TE'
    when 'comercial' then 'LO'
    when 'rural' then 'RU'
    else 'OU'
  end
$$;

create or replace function public.definir_codigo_do_imovel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p text;
  n integer;
begin
  if tg_op = 'UPDATE' then
    new.codigo := old.codigo;   -- o código nunca muda
  elsif new.codigo is null then
    p := public.prefixo_do_imovel(new.tipo);
    insert into public.imoveis_codigo_contadores as c (prefixo, ultimo) values (p, 1)
      on conflict (prefixo) do update set ultimo = c.ultimo + 1
      returning c.ultimo into n;
    new.codigo := p || case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
  end if;
  return new;
end;
$$;

-- contadores partem do maior número já usado em cada prefixo
insert into public.imoveis_codigo_contadores as c (prefixo, ultimo)
select substr(codigo, 1, 2), max(substr(codigo, 3)::integer)
  from public.imoveis where codigo ~ '^[A-Z]{2}[0-9]+$'
 group by 1
on conflict (prefixo) do update set ultimo = greatest(c.ultimo, excluded.ultimo);

-- imóveis com o código antigo (CRZ-0001...) ganham o código do seu tipo, na ordem de cadastro
alter table public.imoveis disable trigger imoveis_codigo;
alter table public.imoveis disable trigger imoveis_updated_at;
alter table public.imoveis disable trigger imoveis_vincular_proprietario;
update public.imoveis i
   set codigo = n.prefixo || lpad((n.base + n.pos)::text, 4, '0')
  from (
    select x.id, x.prefixo,
           coalesce((select c.ultimo from public.imoveis_codigo_contadores c where c.prefixo = x.prefixo), 0) as base,
           row_number() over (partition by x.prefixo order by x.created_at, x.id) as pos
      from (select id, created_at, public.prefixo_do_imovel(tipo) as prefixo from public.imoveis where codigo like 'CRZ-%') x
  ) n
 where i.id = n.id;
alter table public.imoveis enable trigger imoveis_codigo;
alter table public.imoveis enable trigger imoveis_updated_at;
alter table public.imoveis enable trigger imoveis_vincular_proprietario;

insert into public.imoveis_codigo_contadores as c (prefixo, ultimo)
select substr(codigo, 1, 2), max(substr(codigo, 3)::integer)
  from public.imoveis where codigo ~ '^[A-Z]{2}[0-9]+$'
 group by 1
on conflict (prefixo) do update set ultimo = greatest(c.ultimo, excluded.ultimo);

drop sequence if exists public.imoveis_codigo_seq;

-- ---------------------------------------------------------------
-- 2) Imóvel: aparece no site? (imóveis "a completar" nunca aparecem)
-- ---------------------------------------------------------------
alter table public.imoveis add column if not exists publicar_no_site boolean not null default true;

-- ---------------------------------------------------------------
-- 3) Configurações do sistema (hoje: WhatsApp do site). Todos os usuários leem; só o dono da imobiliária altera.
-- ---------------------------------------------------------------
create table if not exists public.configuracoes (
  chave text primary key,
  valor text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

drop trigger if exists configuracoes_updated_at on public.configuracoes;
create trigger configuracoes_updated_at before update on public.configuracoes
  for each row execute function set_updated_at();

alter table public.configuracoes enable row level security;
drop policy if exists "configuracoes: leitura" on public.configuracoes;
drop policy if exists "configuracoes: criar (dono)" on public.configuracoes;
drop policy if exists "configuracoes: alterar (dono)" on public.configuracoes;
create policy "configuracoes: leitura" on public.configuracoes for select to authenticated using (true);
create policy "configuracoes: criar (dono)" on public.configuracoes for insert to authenticated with check (public.eh_dono_da_imobiliaria());
create policy "configuracoes: alterar (dono)" on public.configuracoes for update to authenticated using (public.eh_dono_da_imobiliaria()) with check (public.eh_dono_da_imobiliaria());
grant select, insert, update on public.configuracoes to authenticated;

insert into public.configuracoes (chave, valor) values ('whatsapp_vitrine', '5522992592683')
  on conflict (chave) do nothing;

-- ---------------------------------------------------------------
-- 4) Dados públicos do site. O visitante (papel "anon") NÃO lê as tabelas: só estas views, que mostram
--    apenas imóveis disponíveis, marcados para o site e completos, e só campos seguros
--    (sem proprietário, endereço exato, localização, chave, captador ou valores internos).
-- ---------------------------------------------------------------
drop view if exists public.vitrine_imoveis;
create view public.vitrine_imoveis as
select i.id, i.codigo, i.titulo, i.tipo, i.finalidade, i.bairro, i.cidade,
       i.valor_venda, i.valor_aluguel,
       i.dormitorios, i.suites, i.banheiros, i.vagas_cobertas, i.vagas_descobertas,
       i.area_construida, i.area_terreno,
       i.fotos[1] as foto_capa, coalesce(array_length(i.fotos, 1), 0) as total_fotos,
       i.created_at
  from public.imoveis i
 where i.status = 'disponivel' and i.publicar_no_site and not i.a_completar;

drop view if exists public.vitrine_imovel;
create view public.vitrine_imovel as
select i.id, i.codigo, i.titulo, i.tipo, i.finalidade, i.bairro, i.cidade,
       i.valor_venda, i.valor_aluguel, i.valor_condominio, i.sem_condominio, i.valor_iptu, i.iptu_periodo,
       i.padrao, i.aceita_financiamento, i.estado_imovel, i.posicao, i.posicao_solar, i.vista_mar,
       i.area_construida, i.area_terreno, i.dormitorios, i.suites, i.banheiros, i.salas,
       i.vagas_cobertas, i.vagas_descobertas, i.elevador, i.andares_predio, i.andar_imovel,
       i.caracteristicas, i.pisos, i.comentarios, i.fotos, i.created_at
  from public.imoveis i
 where i.status = 'disponivel' and i.publicar_no_site and not i.a_completar;

drop view if exists public.vitrine_contato;
create view public.vitrine_contato as
select c.valor as whatsapp from public.configuracoes c where c.chave = 'whatsapp_vitrine';

grant select on public.vitrine_imoveis, public.vitrine_imovel, public.vitrine_contato to anon, authenticated;
