-- Identidade do corretor no site (nome, CRECI, e-mail) e a página "Anuncie" (proprietário entra em contato).

-- 1) Novas chaves de configuração, editáveis internamente depois (mesmo mecanismo do whatsapp_vitrine).
insert into public.configuracoes (chave, valor) values
  ('nome_responsavel', 'Wallace Cruz'),
  ('creci', '108.111'),
  ('email_contato', 'negociosimobiliarioscrz@gmail.com')
on conflict (chave) do nothing;

-- 2) A view pública de contato passa a trazer também a identidade do corretor (nenhum dado sensível).
drop view if exists public.vitrine_contato;
create view public.vitrine_contato as
select
  max(c.valor) filter (where c.chave = 'whatsapp_vitrine') as whatsapp,
  max(c.valor) filter (where c.chave = 'nome_responsavel') as nome_responsavel,
  max(c.valor) filter (where c.chave = 'creci') as creci,
  max(c.valor) filter (where c.chave = 'email_contato') as email_contato
from public.configuracoes c
where c.chave in ('whatsapp_vitrine', 'nome_responsavel', 'creci', 'email_contato');

grant select on public.vitrine_contato to anon, authenticated;

-- 3) Mensagens de quem quer anunciar um imóvel com a imobiliária (página "/anuncie").
--    Qualquer visitante pode enviar (insert); só o time (authenticated) lê e acompanha.
create table if not exists public.anuncios_recebidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  tipo_imovel text,
  cidade text,
  bairro text,
  mensagem text,
  atendido boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.anuncios_recebidos enable row level security;
drop policy if exists "anuncios_recebidos: enviar (qualquer visitante)" on public.anuncios_recebidos;
drop policy if exists "anuncios_recebidos: ver (time)" on public.anuncios_recebidos;
drop policy if exists "anuncios_recebidos: alterar (time)" on public.anuncios_recebidos;
create policy "anuncios_recebidos: enviar (qualquer visitante)" on public.anuncios_recebidos
  for insert to anon, authenticated with check (true);
create policy "anuncios_recebidos: ver (time)" on public.anuncios_recebidos
  for select to authenticated using (true);
create policy "anuncios_recebidos: alterar (time)" on public.anuncios_recebidos
  for update to authenticated using (true) with check (true);

grant insert on public.anuncios_recebidos to anon, authenticated;
grant select, update on public.anuncios_recebidos to authenticated;
