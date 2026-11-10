-- Campo "Condomínio" (nome do empreendimento) nos imóveis, seção "Imóveis por bairro" na vitrine,
-- e novos textos editáveis do site público (tagline, sobre a empresa, Instagram, vídeos, imagem de capa)
-- + formulário de contato geral ("Fale com a nossa equipe").

alter table public.imoveis add column if not exists nome_condominio text; -- nome do condomínio/empreendimento (ex.: "Porto Seguro")

-- ---------------------------------------------------------------
-- "Imóveis por bairro": contagem de imóveis disponíveis por bairro + uma foto representativa
-- ---------------------------------------------------------------
drop view if exists public.vitrine_bairros;
create view public.vitrine_bairros as
select i.bairro,
       count(*) as total,
       (array_agg(i.fotos[1] order by i.created_at desc) filter (where i.fotos[1] is not null))[1] as foto_capa
  from public.imoveis i
 where i.status = 'disponivel' and i.publicar_no_site and not i.a_completar
   and i.bairro is not null and btrim(i.bairro) <> ''
 group by i.bairro
 order by count(*) desc, i.bairro asc;

grant select on public.vitrine_bairros to anon, authenticated;

-- ---------------------------------------------------------------
-- Views públicas: acrescenta nome_condominio
-- ---------------------------------------------------------------
drop view if exists public.vitrine_imoveis;
create view public.vitrine_imoveis as
select i.id, i.codigo, i.titulo, i.tipo, i.finalidade, i.bairro, i.cidade, i.nome_condominio,
       i.valor_venda, i.valor_aluguel,
       i.dormitorios, i.suites, i.banheiros, i.vagas_cobertas, i.vagas_descobertas,
       i.area_construida, i.area_terreno,
       i.fotos[1] as foto_capa, coalesce(array_length(i.fotos, 1), 0) as total_fotos,
       i.created_at
  from public.imoveis i
 where i.status = 'disponivel' and i.publicar_no_site and not i.a_completar;

drop view if exists public.vitrine_imovel;
create view public.vitrine_imovel as
select i.id, i.codigo, i.titulo, i.tipo, i.finalidade, i.bairro, i.cidade, i.nome_condominio,
       i.valor_venda, i.valor_aluguel, i.valor_condominio, i.sem_condominio, i.valor_iptu, i.iptu_periodo, i.sem_iptu,
       i.padrao, i.aceita_financiamento, i.estado_imovel, i.posicao, i.posicao_solar, i.vista_mar,
       i.area_construida, i.area_terreno, i.dormitorios, i.suites, i.banheiros, i.salas,
       i.vagas_cobertas, i.vagas_descobertas, i.elevador, i.andares_predio, i.andar_imovel,
       i.caracteristicas, i.pisos, i.comentarios, i.fotos, i.created_at
  from public.imoveis i
 where i.status = 'disponivel' and i.publicar_no_site and not i.a_completar;

grant select on public.vitrine_imoveis, public.vitrine_imovel to anon, authenticated;

-- ---------------------------------------------------------------
-- Novos textos editáveis do site (ficam vazios até o dono preencher; a Início só mostra a seção
-- correspondente quando o texto não está vazio — nada de conteúdo inventado).
-- ---------------------------------------------------------------
insert into public.configuracoes (chave, valor) values
  ('tagline_site', 'O imóvel certo, do jeito certo.'),
  ('sobre_empresa', ''),
  ('instagram_handle', ''),
  ('videos_site', ''),
  ('hero_imagem_url', '')
on conflict (chave) do nothing;

drop view if exists public.vitrine_contato;
create view public.vitrine_contato as
select
  max(c.valor) filter (where c.chave = 'whatsapp_vitrine') as whatsapp,
  max(c.valor) filter (where c.chave = 'nome_responsavel') as nome_responsavel,
  max(c.valor) filter (where c.chave = 'creci') as creci,
  max(c.valor) filter (where c.chave = 'email_contato') as email_contato,
  max(c.valor) filter (where c.chave = 'tagline_site') as tagline_site,
  max(c.valor) filter (where c.chave = 'sobre_empresa') as sobre_empresa,
  max(c.valor) filter (where c.chave = 'instagram_handle') as instagram_handle,
  max(c.valor) filter (where c.chave = 'videos_site') as videos_site,
  max(c.valor) filter (where c.chave = 'hero_imagem_url') as hero_imagem_url
from public.configuracoes c
where c.chave in (
  'whatsapp_vitrine', 'nome_responsavel', 'creci', 'email_contato',
  'tagline_site', 'sobre_empresa', 'instagram_handle', 'videos_site', 'hero_imagem_url'
);

grant select on public.vitrine_contato to anon, authenticated;

-- ---------------------------------------------------------------
-- Depoimentos de clientes (seção "O que dizem sobre nós"): a Início só mostra a seção quando
-- existir ao menos um depoimento ativo. Sem cadastro deles ainda — cadastre pelo editor de tabelas
-- do Supabase (chave "depoimentos") quando tiver depoimentos reais para publicar.
-- ---------------------------------------------------------------
create table if not exists public.depoimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  texto text not null,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.depoimentos enable row level security;
drop policy if exists "depoimentos: leitura (time)" on public.depoimentos;
drop policy if exists "depoimentos: gerenciar (dono)" on public.depoimentos;
create policy "depoimentos: leitura (time)" on public.depoimentos for select to authenticated using (true);
create policy "depoimentos: gerenciar (dono)" on public.depoimentos for all to authenticated
  using (public.eh_dono_da_imobiliaria()) with check (public.eh_dono_da_imobiliaria());
grant select, insert, update, delete on public.depoimentos to authenticated;

drop view if exists public.vitrine_depoimentos;
create view public.vitrine_depoimentos as
select id, nome, texto from public.depoimentos where ativo order by ordem, created_at;
grant select on public.vitrine_depoimentos to anon, authenticated;

-- ---------------------------------------------------------------
-- Formulário de contato geral da página "Contato" ("Fale com a nossa equipe") — diferente do
-- "Anuncie seu imóvel" (anuncios_recebidos), que é para quem quer VENDER/ALUGAR com a imobiliária.
-- ---------------------------------------------------------------
create table if not exists public.contatos_recebidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  mensagem text,
  atendido boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contatos_recebidos enable row level security;
drop policy if exists "contatos_recebidos: enviar (qualquer visitante)" on public.contatos_recebidos;
drop policy if exists "contatos_recebidos: ver (time)" on public.contatos_recebidos;
drop policy if exists "contatos_recebidos: alterar (time)" on public.contatos_recebidos;
create policy "contatos_recebidos: enviar (qualquer visitante)" on public.contatos_recebidos
  for insert to anon, authenticated with check (true);
create policy "contatos_recebidos: ver (time)" on public.contatos_recebidos
  for select to authenticated using (true);
create policy "contatos_recebidos: alterar (time)" on public.contatos_recebidos
  for update to authenticated using (true) with check (true);

grant insert on public.contatos_recebidos to anon, authenticated;
grant select, update on public.contatos_recebidos to authenticated;
