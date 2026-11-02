-- CRZ Imóveis — schema completo (Supabase / Postgres)
-- Segurança: todas as tabelas têm Row Level Security.
--   * leads (e visitas, lembretes, histórico e imóveis vinculados): visíveis para quem criou, para o responsável atual e para o dono da imobiliária;
--   * imóveis e corretores: todos os usuários logados leem, só quem cadastrou altera;
--   * metas: todos leem, só o dono da imobiliária (e-mail confirmado abaixo) altera.

create extension if not exists "pgcrypto";

-- Etapas do funil
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum ('novo', 'contato', 'visita', 'proposta', 'fechado', 'perdido');
  end if;
end $$;

-- Atualiza updated_at automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Corretores (quem aparece como captador dos imóveis; hoje o próprio usuário, mas aceita vários)
-- ---------------------------------------------------------------
create table if not exists corretores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  e_proprio boolean not null default false,   -- o corretor que representa o próprio usuário logado
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- no máximo um "corretor próprio" por conta (evita duplicar se o app abrir duas vezes ao mesmo tempo)
create unique index if not exists corretores_proprio_unico on corretores (owner_id) where e_proprio;

-- ---------------------------------------------------------------
-- Imóveis
-- ---------------------------------------------------------------
-- Código de referência dos imóveis (CRZ-0001, CRZ-0002...), gerado automaticamente
create sequence if not exists imoveis_codigo_seq;

create table if not exists imoveis (
  id uuid primary key default gen_random_uuid(),
  codigo text,                                 -- preenchido pelo gatilho; nunca muda
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  captador_id uuid references corretores(id) on delete set null,
  titulo text not null,
  tipo text,                                   -- casa, apartamento, terreno...
  finalidade text default 'venda' check (finalidade in ('venda', 'aluguel', 'venda_aluguel')),
  status text not null default 'disponivel',   -- disponivel | reservado | vendido
  endereco text,                               -- rua e número (botão "Ver no mapa")
  bairro text,
  cidade text,
  comentarios text,
  fotos text[] not null default '{}',          -- URLs (Storage)

  -- proprietário
  proprietario_nome text,
  proprietario_telefone1 text,
  proprietario_telefone2 text,

  -- valores e condições
  valor_venda numeric(14,2),
  valor_aluguel numeric(14,2),
  valor_condominio numeric(14,2),
  valor_iptu numeric(14,2),
  iptu_periodo text check (iptu_periodo in ('mensal', 'anual')),
  sem_condominio boolean not null default false,
  padrao text check (padrao in ('baixo', 'medio', 'alto')),
  aceita_financiamento boolean,
  exclusividade boolean,
  chave_com_proprietario boolean not null default false,

  -- detalhes
  estado_imovel text check (estado_imovel in ('construcao', 'novo', 'usado')),
  posicao text check (posicao in ('frente', 'lateral', 'fundos', 'esquina')),
  posicao_solar text check (posicao_solar in ('manha', 'tarde')),
  vista_mar boolean,
  area_construida numeric(10,2),
  area_terreno numeric(10,2),
  dormitorios int,
  suites int,
  banheiros int,
  salas int,
  vagas_cobertas int,
  vagas_descobertas int,
  elevador boolean not null default false,
  andares_predio int,
  andar_imovel int,

  -- listas de marcação (ids definidos no app: piscina, churrasqueira, porcelanato...)
  caracteristicas text[] not null default '{}',
  pisos text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists imoveis_codigo_unico on imoveis (codigo);
create index if not exists imoveis_owner_created_idx on imoveis (owner_id, created_at desc);
alter index if exists imoveis_corretor_idx rename to imoveis_captador_idx;   -- nome antigo, de bancos criados antes do "captador"
create index if not exists imoveis_captador_idx on imoveis (captador_id);

-- ---------------------------------------------------------------
-- Campanhas (gasto vem dos Ads; preenchido depois pela integração)
-- ---------------------------------------------------------------
create table if not exists campanhas (
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
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  status lead_status not null default 'novo',
  origem text default 'manual',    -- manual | meta | google | indicacao | site | instagram | whatsapp
  campanha_id uuid references campanhas(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  observacoes text,
  consentimento_lgpd boolean not null default false,
  consentimento_em timestamptz,
  valor_fechado numeric(14,2),
  fechado_tipo text check (fechado_tipo in ('venda', 'aluguel')),   -- o negócio fechado foi venda ou aluguel?
  fechado_imovel_id uuid references imoveis(id) on delete set null,  -- exigidos ao fechar (ver gatilho abaixo)
  fechado_em date,
  comissao_estimada numeric(14,2) check (comissao_estimada >= 0),
  perdido_motivo text check (perdido_motivo in
    ('preco', 'comprou_outro', 'desistiu', 'sem_retorno', 'sem_credito', 'perfil_incompativel', 'outro')),
  perdido_motivo_texto text,                                           -- detalhe, obrigatório quando o motivo é "outro"
  responsavel_id uuid references auth.users(id) on delete set null default auth.uid(),  -- quem cuida do lead agora

  -- perfil de busca
  busca_finalidade text check (busca_finalidade in ('venda', 'aluguel')),   -- comprar ou alugar
  busca_tipos text[] not null default '{}',
  busca_bairros text,                                                      -- texto livre: "Centro, Cavaleiros"
  busca_cidade text,
  busca_valor_min numeric(14,2),
  busca_valor_max numeric(14,2),
  busca_quartos int,                                                       -- mínimo de dormitórios

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_owner_status_idx on leads (owner_id, status);
create index if not exists leads_owner_created_idx on leads (owner_id, created_at desc);
create index if not exists leads_responsavel_idx on leads (responsavel_id);

-- ---------------------------------------------------------------
-- Interesse do lead em imóveis
-- ---------------------------------------------------------------
create table if not exists lead_imovel (
  lead_id uuid not null references leads(id) on delete cascade,
  imovel_id uuid not null references imoveis(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, imovel_id)
);

-- ---------------------------------------------------------------
-- Histórico de interações
-- ---------------------------------------------------------------
create table if not exists interacoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  tipo text not null default 'nota', -- nota | ligacao | whatsapp | visita | email | mudanca_status
  texto text,
  created_at timestamptz not null default now()
);

create index if not exists interacoes_lead_idx on interacoes (lead_id, created_at desc);

-- ---------------------------------------------------------------
-- Conversões (venda fechada enviada de volta ao Meta/Google — fase futura)
-- ---------------------------------------------------------------
create table if not exists conversoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  valor numeric(14,2),
  enviada_ao_ads boolean not null default false,
  enviada_em timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Lembretes de retorno de contato
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
-- Agenda de visitas (ligada ao lead e ao imóvel)
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
-- Metas mensais da imobiliária, separadas por tipo (venda | aluguel)
-- ---------------------------------------------------------------
create table if not exists metas (
  mes date not null check (mes = date_trunc('month', mes)::date),   -- sempre o dia 1 do mês
  tipo text not null default 'venda' check (tipo in ('venda', 'aluguel')),
  captacoes int not null default 0 check (captacoes >= 0),
  novos_clientes int not null default 0 check (novos_clientes >= 0),
  visitas int not null default 0 check (visitas >= 0),
  propostas int not null default 0 check (propostas >= 0),
  fechamentos int not null default 0 check (fechamentos >= 0),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (mes, tipo)
);

-- ---------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------
drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at before update on leads
  for each row execute function set_updated_at();
drop trigger if exists imoveis_updated_at on imoveis;
create trigger imoveis_updated_at before update on imoveis
  for each row execute function set_updated_at();

-- Regras da mudança de etapa (só quando a etapa muda ou o lead é criado já nela)
create or replace function validar_etapa_do_lead()
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

drop trigger if exists leads_validar_etapa on leads;
create trigger leads_validar_etapa before insert or update of status on leads
  for each row execute function validar_etapa_do_lead();

-- O criador do lead nunca muda (quem passa a cuidar dele é o "responsável")
create or replace function fixar_dono_do_lead()
returns trigger language plpgsql as $$
begin
  new.owner_id := old.owner_id;
  return new;
end;
$$;

drop trigger if exists leads_fixar_dono on leads;
create trigger leads_fixar_dono before update on leads
  for each row execute function fixar_dono_do_lead();


-- Todo usuário tem um "corretor próprio" (nome que aparece como responsável/captador)
insert into corretores (owner_id, nome, email, e_proprio)
select u.id, coalesce(nullif(initcap(split_part(u.email, '@', 1)), ''), 'Corretor'), u.email, true
  from auth.users u
 where not exists (select 1 from corretores c where c.owner_id = u.id and c.e_proprio);

create or replace function criar_corretor_proprio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into corretores (owner_id, nome, email, e_proprio)
  values (new.id, coalesce(nullif(initcap(split_part(new.email, '@', 1)), ''), 'Corretor'), new.email, true)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists criar_corretor_proprio on auth.users;
create trigger criar_corretor_proprio after insert on auth.users
  for each row execute function criar_corretor_proprio();


create or replace function public.nome_do_usuario(p_usuario uuid)
returns text
language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    (select c.nome from public.corretores c where c.owner_id = p_usuario and c.e_proprio limit 1),
    (select initcap(split_part(u.email, '@', 1)) from auth.users u where u.id = p_usuario),
    'Sem responsável');
$$;

-- Registra no histórico a mudança de etapa (o Dashboard conta propostas e fechamentos daqui) e a transferência de responsável
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


drop trigger if exists leads_status_log on leads;
create trigger leads_status_log after update on leads
  for each row execute function log_status_change();

-- Código do imóvel
create or replace function definir_codigo_do_imovel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n bigint;
begin
  if tg_op = 'UPDATE' then
    new.codigo := old.codigo;   -- o código nunca muda
  elsif new.codigo is null then
    n := nextval('imoveis_codigo_seq');
    new.codigo := 'CRZ-' || case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
  end if;
  return new;
end;
$$;

drop trigger if exists imoveis_codigo on imoveis;
create trigger imoveis_codigo before insert or update on imoveis
  for each row execute function definir_codigo_do_imovel();


-- ---------------------------------------------------------------
-- Dono da imobiliária: único que define metas. O e-mail precisa estar CONFIRMADO no Supabase Auth.
-- (Se o e-mail mudar, altere aqui e em src/lib/dashboard.js.)
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
-- Funil do Dashboard. Devolve só CONTAGENS (nenhum dado de lead ou imóvel), somando todos os
-- corretores ou só os do usuário logado. Quem não informou nada conta como venda:
--   captações      = imóveis cadastrados cuja finalidade inclui o tipo (venda e aluguel entra nos dois)
--   novos clientes = leads cadastrados cuja busca (comprar/alugar) é o tipo
--   visitas        = visitas realizadas, pelo tipo do imóvel (sem imóvel: pela busca do lead)
--   propostas      = leads que entraram em Proposta, pela busca do lead
--   fechamentos    = leads que entraram em Fechado, pelo tipo do fechamento (senão pela busca)
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
revoke all on function public.funil_do_periodo(timestamptz, timestamptz, boolean, text) from public, anon;
grant execute on function public.funil_do_periodo(timestamptz, timestamptz, boolean, text) to authenticated;

-- ---------------------------------------------------------------
-- Quem pode ver/editar um lead (e tudo o que está ligado a ele): quem criou, o responsável atual e o dono da imobiliária
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

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table corretores  enable row level security;
alter table imoveis     enable row level security;
alter table campanhas   enable row level security;
alter table leads       enable row level security;
alter table lead_imovel enable row level security;
alter table interacoes  enable row level security;
alter table conversoes  enable row level security;
alter table lembretes   enable row level security;
alter table visitas     enable row level security;
alter table metas       enable row level security;

-- privado: cada usuário só vê os próprios registros (campanhas e conversões)
drop policy if exists "campanhas: dono" on campanhas;
create policy "campanhas: dono" on campanhas
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "conversoes: dono" on conversoes;
create policy "conversoes: dono" on conversoes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- leads e o que é ligado a eles: criador, responsável atual e dono da imobiliária
drop policy if exists "leads: ver" on leads;
drop policy if exists "leads: criar" on leads;
drop policy if exists "leads: alterar" on leads;
drop policy if exists "leads: apagar" on leads;
create policy "leads: ver" on leads for select to authenticated
  using (owner_id = auth.uid() or responsavel_id = auth.uid() or eh_dono_da_imobiliaria());
create policy "leads: criar" on leads for insert to authenticated
  with check (owner_id = auth.uid());
create policy "leads: alterar" on leads for update to authenticated
  using (owner_id = auth.uid() or responsavel_id = auth.uid() or eh_dono_da_imobiliaria())
  with check (true);   -- ao transferir, o lead deixa de ser "dele"; o criador é protegido pelo gatilho acima
create policy "leads: apagar" on leads for delete to authenticated
  using (owner_id = auth.uid() or eh_dono_da_imobiliaria());

drop policy if exists "interacoes: do lead" on interacoes;
create policy "interacoes: do lead" on interacoes for all to authenticated
  using (pode_ver_lead(lead_id)) with check (pode_ver_lead(lead_id));

drop policy if exists "lembretes: do lead" on lembretes;
create policy "lembretes: do lead" on lembretes for all to authenticated
  using (pode_ver_lead(lead_id)) with check (pode_ver_lead(lead_id));

drop policy if exists "visitas: do lead" on visitas;
create policy "visitas: do lead" on visitas for all to authenticated
  using (pode_ver_lead(lead_id)) with check (pode_ver_lead(lead_id));

drop policy if exists "lead_imovel: do lead" on lead_imovel;
create policy "lead_imovel: do lead" on lead_imovel for all to authenticated
  using (pode_ver_lead(lead_id)) with check (pode_ver_lead(lead_id));


-- imóveis e corretores: todos leem; só quem cadastrou altera ou apaga
drop policy if exists "imoveis: leitura geral" on imoveis;
create policy "imoveis: leitura geral" on imoveis
  for select to authenticated using (true);
drop policy if exists "imoveis: dono insere" on imoveis;
create policy "imoveis: dono insere" on imoveis
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "imoveis: dono altera" on imoveis;
create policy "imoveis: dono altera" on imoveis
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "imoveis: dono apaga" on imoveis;
create policy "imoveis: dono apaga" on imoveis
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "corretores: leitura geral" on corretores;
create policy "corretores: leitura geral" on corretores
  for select to authenticated using (true);
drop policy if exists "corretores: dono insere" on corretores;
create policy "corretores: dono insere" on corretores
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "corretores: dono altera" on corretores;
create policy "corretores: dono altera" on corretores
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "corretores: dono apaga" on corretores;
create policy "corretores: dono apaga" on corretores
  for delete to authenticated using (owner_id = auth.uid());

-- metas: todos leem; só o dono da imobiliária grava
drop policy if exists "metas: todos leem" on metas;
create policy "metas: todos leem" on metas
  for select to authenticated using (true);
drop policy if exists "metas: dono insere" on metas;
create policy "metas: dono insere" on metas
  for insert to authenticated with check (public.eh_dono_da_imobiliaria());
drop policy if exists "metas: dono altera" on metas;
create policy "metas: dono altera" on metas
  for update to authenticated using (public.eh_dono_da_imobiliaria()) with check (public.eh_dono_da_imobiliaria());
drop policy if exists "metas: dono apaga" on metas;
create policy "metas: dono apaga" on metas
  for delete to authenticated using (public.eh_dono_da_imobiliaria());

-- ---------------------------------------------------------------
-- Fotos dos imóveis (Supabase Storage)
-- O bucket é público para leitura: a foto de um imóvel à venda é feita para ser vista (e isso permite
-- usar a mesma URL numa futura vitrine pública). Enviar, alterar e apagar fica restrito ao dono,
-- dentro da própria pasta (<id do usuário>/...).
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imoveis-fotos',
  'imoveis-fotos',
  true,
  5242880,                                        -- 5 MB por arquivo (o app já comprime antes de enviar)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: dono envia"  on storage.objects;
drop policy if exists "fotos: dono lista"  on storage.objects;
drop policy if exists "fotos: dono altera" on storage.objects;
drop policy if exists "fotos: dono apaga"  on storage.objects;

create policy "fotos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: dono lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: dono altera" on storage.objects
  for update to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------
-- Visão: custo por lead por campanha (usada no dashboard de tráfego pago, fase futura)
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

-- ---------------------------------------------------------------
-- Permissões da API (necessárias em projetos Supabase que não concedem acesso automático às tabelas
-- novas). O acesso real continua limitado pelas políticas RLS acima; o papel "anon" não recebe nada.
-- ---------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
