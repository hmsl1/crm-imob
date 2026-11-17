# CRM do Corretor

CRM para corretor individual: funil kanban de leads, histórico de interações e captura de origem (base para a integração com tráfego pago).

**Stack:** React + Vite, Supabase (Postgres + Auth). Hospedagem estática (Cloudflare Pages ou Netlify).

## Como rodar

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e execute o arquivo `supabase/schema.sql` inteiro, uma vez. Ele cria tudo (leads, imóveis com fotos e captador, agenda, metas e funil do Dashboard) e pode ser repetido sem erro.

> **Já tem um banco em uso?** Não use o `schema.sql` para atualizar: rode só os arquivos novos de `supabase/migrations/`. As migrações 008 a 015 (rodar nesta ordem) ficam ali apenas para quem ainda estava na versão anterior; depois de executadas podem ser apagadas do repositório.

3. Em **Project Settings → API**, copie a URL e a chave `anon`.
4. Neste projeto:

```bash
cp .env.example .env.local   # preencha as duas variáveis
npm install
npm run dev
```

5. Abra o endereço mostrado em `/painel` (ex.: `http://localhost:5173/painel`), clique em **Primeiro acesso? Criar conta** e confirme o e-mail. O site público (sem login) começa na raiz do domínio (`/`, a **Início**); a listagem completa fica em `/imoveis`.

> Para uso de uma pessoa só, depois de criar sua conta desative novos cadastros em
> Supabase → Authentication → Providers → Email → *Allow new users to sign up*.

## Publicar (grátis)

**Cloudflare**: conecte o repositório, comando de build `npm run build`, pasta de saída `dist`, e cadastre as duas variáveis `VITE_SUPABASE_*` no painel. O arquivo `wrangler.jsonc` na raiz já configura o fallback de SPA (`not_found_handling: single-page-application`), para o site funcionar certo ao recarregar a página ou abrir um link direto (ex.: `/imoveis/CA0001`). Não use um arquivo `public/_redirects` com `/* /index.html 200` nesse tipo de deploy (Cloudflare Workers/Pages unificado) — ele entra em loop infinito com o tratamento de assets do Cloudflare e o deploy falha com "Infinite loop detected".

**Netlify**: mesmo comando de build e pasta de saída; nesse caso sim é preciso um `public/_redirects` com `/*  /index.html  200` (o `wrangler.jsonc` é ignorado fora do Cloudflare).
**Não use Vercel Hobby** para uso profissional (o plano é só para uso não comercial).

> O CRM (login) fica em `/painel`; o site público começa na raiz do domínio (`/`, a Início) e a listagem completa fica em `/imoveis`. Em Supabase → Authentication → URL Configuration, cadastre o **Site URL** como o domínio raiz (ex.: `https://crzimoveis.com.br`) — o link de "esqueci minha senha" funciona em qualquer caminho.

## O que já funciona (passo 1)

- **Dashboard** (aba "Dashboard"): funil de metas do mês — Captações, Novos clientes, Visitas, Propostas e Fechamentos, com realizado/meta, % da meta e o funil desenhado ao lado. Troca de mês nas setas e alterna entre "Imobiliária" (soma de todos os corretores) e "Só meus"
  - A setinha no título troca entre **Metas de Venda** e **Metas de Locação**, cada uma com seus números e metas. Imóvel "venda e aluguel" conta nos dois; leads sem finalidade de busca e sem tipo de fechamento contam em Venda
  - Captações = imóveis cadastrados no mês; Novos clientes = leads cadastrados; Visitas = visitas marcadas como realizadas; Propostas = leads que entraram em proposta no mês; **Fechamentos = leads cuja data de fechamento (a que você informa ao fechar) cai no mês**, não a data em que você mexeu no sistema
  - **Metas**: só o e-mail `negociosimobiliarioscrz@gmail.com` define as metas (travado no banco por RLS, não só na tela); os demais usuários só acompanham. Mantenha a confirmação de e-mail ligada no Supabase e crie essa conta primeiro
  - O funil da imobiliária usa uma função que devolve apenas contagens, sem expor leads ou imóveis de outros corretores
- **Regras de etapa**: ao mover um lead para **Perdido** o motivo é obrigatório (preço, comprou com outro, desistiu, sem retorno, sem crédito, perfil incompatível ou outro + texto); para **Fechado** são obrigatórios imóvel, valor final, data e comissão estimada (com sugestão de 6% na venda ou 1 aluguel). Vale no quadro (janela ao arrastar), no cadastro do lead e no banco (gatilho), só no momento de entrar na etapa — leads antigos continuam editáveis
- **Código do imóvel** (CRZ-0001...): gerado automaticamente, nunca muda e aparece nos cards, nos detalhes, na ficha, nas mensagens de WhatsApp, nas listas de escolha de imóvel e na busca
- **Responsável do lead** com transferência: o lead continua do criador, o responsável atual também o vê e edita, e o dono da imobiliária vê todos. Cada transferência fica no histórico do lead. O quadro mostra "Meus leads" ou "Todos"; a Agenda e o "Só meus" do Dashboard seguem o responsável atual
- **Proprietários** (menu próprio): cada proprietário é um cadastro, com vários imóveis. Ao cadastrar um imóvel, escolha um proprietário existente ou digite os dados: o sistema avisa quando o telefone já é de alguém e reaproveita o cadastro. Nome e telefones editados no proprietário (ou em qualquer imóvel dele) são atualizados em todos os imóveis; excluir o proprietário não apaga os imóveis. Só quem criou o proprietário pode excluí-lo
- **Captação rápida** (botão na página Imóveis): para o imóvel visto na rua. Foto pela câmera do celular, botão "Usar minha localização" (GPS, com precisão), telefone do proprietário e, se quiser, endereço, nome e observação. O imóvel entra com o selo **A completar** (há um filtro para listá-los) e sai dessa lista quando o cadastro completo é salvo. O botão "Ver no mapa" abre o ponto exato do GPS
- **Data de captação** (padrão: hoje; imóveis antigos receberam a data em que foram cadastrados) e **exclusividade com vencimento**: marcando "Exclusividade: Sim" aparece a data de vencimento. Faltando 30 dias ou menos (ou já vencida) o imóvel ganha um aviso no card e nos detalhes, entra no selo do menu Agenda e numa seção "Exclusividades" da Agenda, com atalho de WhatsApp para falar da renovação com o proprietário. Cada corretor vê as dos imóveis que cadastrou ou captou; o dono da imobiliária vê todas
- **Histórico de preço**: toda mudança de valor de venda ou aluguel é registrada pelo banco (gatilho), com data, valor anterior, valor novo e % de variação, e aparece em linha do tempo na aba "Proprietário e valores" do imóvel. Reduções ficam em vermelho
- **Captador** no imóvel (substitui "Corretor responsável"; os dados antigos foram mantidos). A ficha enviada ao cliente mostra o corretor logado como contato
- O Dashboard é a primeira tela ao entrar
- Login por e-mail e senha
- Funil kanban com arrastar e soltar: Novo → Em contato → Visita → Proposta → Fechado / Perdido
- Cadastro e edição de leads (origem, observações, consentimento LGPD, valor da venda)
- Histórico por lead, com mudanças de etapa registradas automaticamente
- Botão de WhatsApp (`wa.me`) em cada lead
- Busca por nome, telefone, e-mail ou observações (ignora acentos e maiúsculas)
- Botão **Quadro / Lista**: a lista mostra todos os leads em tabela, inclusive os concluídos e perdidos, com filtro por situação (em atendimento, concluídos, perdidos) e por origem, ordenação por coluna e páginas de 25. A escolha fica lembrada no navegador
- Segurança por linha (RLS): leads, visitas e lembretes são privados de cada usuário. Os imóveis são visíveis para todos os usuários logados (com o corretor responsável), mas só quem cadastrou o imóvel pode alterá-lo ou excluí-lo
- Tela de detalhes do imóvel em 4 abas (as mesmas do formulário), mostrando todos os campos, inclusive os não preenchidos
- Na tela de detalhes: botões para trocar a **disponibilidade** (Disponível, Reservado, Vendido/Alugado) com um clique, só para quem cadastrou o imóvel, e botão **Ver no mapa** que abre o Google Maps já pesquisando o endereço cadastrado (rua e número, bairro e cidade; sem rua, abre o bairro)
- Lead **fechado**: escolhe-se se foi **venda** ou **aluguel**; o campo de valor muda de acordo ("Valor da venda (R$)" ou "Valor do aluguel (R$/mês)") e a lista mostra "R$ 2.500 /mês" nos aluguéis
- **IPTU** com seletor **mensal/anual** (obrigatório quando há valor, porque 12x de diferença não dá para adivinhar); aparece como "R$ 1.200 /ano" no detalhe e na ficha. Posição do imóvel ganhou a opção **Esquina**
- **Uso no celular**: telas e janelas carregadas sob demanda (pacote inicial ~14% menor, o resto baixa em segundo plano), janelas em tela cheia com botões Salvar/Cancelar sempre à vista, alvos de toque de 44 px, campos que não dão zoom no iPhone, "Mover para…" em cada card do quadro (arrastar só existe com mouse), fotos passam com o dedo, lista de leads compacta, barra superior em 3 linhas e respeito à área segura (notch)
- **Aviso de duplicados**: ao cadastrar ou alterar um lead, avisa se já existe outro com o mesmo telefone (ignora formatação, +55 e nono dígito) ou e-mail; ao cadastrar um imóvel, avisa se já existe outro no mesmo endereço exato (rua e número, ignorando maiúsculas, acentos e abreviações como "R." e "nº"). O aviso mostra o cadastro existente e permite corrigir, abrir ou "Salvar mesmo assim". Só checa quando o contato/endereço é novo ou mudou
- **Avisos da agenda**: um selo de sino sobre o menu "Agenda" mostra quantos compromissos (visitas e retornos) estão atrasados, são de hoje ou dos próximos 2 dias (vermelho se há atrasado ou de hoje). Ao entrar, uma janelinha no canto da tela lista o que está marcado para hoje: aparece em fade suave, não bloqueia a tela nem toma o foco e só sai quando o usuário fecha (uma vez fechada, não volta ao recarregar no mesmo dia, nesta aba). Atualiza sozinha a cada 5 minutos e ao concluir itens
- Paleta da marca: fundo areia/creme com destaques em verde profundo; o tema escuro usa o verde como fundo
  - Cada campo tem um lápis: clique, altere só aquele valor e salve (Enter), ou cancele (Esc). Só as colunas daquele campo são gravadas
  - Campos que se influenciam são editados juntos (finalidade com valores, condomínio, elevador) e as características são editadas por grupo
  - Na edição de um campo só valem as obrigatoriedades relacionadas a ele, então um imóvel antigo sem proprietário continua editável nos demais campos
  - Galeria de fotos com setas e miniaturas; "Gerenciar fotos" e "Editar" abrem o formulário completo, que ao salvar volta para os detalhes
- Cadastro de imóveis em 4 abas (proprietário e valores, detalhes, características, fotos e comentários)
  - "Imóvel sem condomínio" e "Imóvel sem IPTU": desmarca a obrigatoriedade e esconde os campos de valor/período
  - **Condomínio** (nome do empreendimento, ex.: "Porto Seguro"): campo de texto opcional, separado do valor mensal do condomínio; aparece na busca e nos cards do site público
  - Fotos: arraste as miniaturas para reordenar (a primeira é a capa) ou arraste arquivos de imagem direto do computador para a área de fotos para adicioná-las, além do botão "+ Adicionar fotos"
  - Finalidade: venda, aluguel ou venda e aluguel (com os dois valores)
  - Obrigatórios: nome do proprietário, ao menos um telefone e o(s) valor(es); todo o resto é opcional
  - Captador (padrão: o usuário logado; já aceita outros captadores)
  - Condomínio, IPTU, padrão, financiamento, exclusividade, posição, áreas, dormitórios, vagas, elevador, 34 características e 20 tipos de piso
- Rascunho automático no cadastro de imóvel novo: salvo no navegador a cada alteração (válido por 14 dias, separado por usuário) e recuperado ao reabrir, mesmo após o computador desligar. "Continuar depois" fecha mantendo o rascunho; fechar ou "Descartar" pede confirmação
- Fotos dos imóveis (até 40 por imóvel, com escolha da capa), comprimidas no navegador antes do envio
  - Reordenar arrastando ou pelas setas; a primeira foto é a capa
- **Esqueci minha senha** na tela de entrada (link por e-mail) e **Alterar senha** em "Meu perfil" (pede a senha atual; nova senha com 8+ caracteres, letras e números). Para o link funcionar, no Supabase cadastre o endereço do site em Authentication → URL Configuration (Site URL e Redirect URLs)
- **Site público (vitrine)**, reformulado seguindo o modelo do site seuimoveljr.com.br (o CRM fica em `/painel`). Menu superior: **Início** (`/`), **Imóveis** (`/imoveis`) e **Contato** (`/contato`), mais o botão **Anuncie seu imóvel**, que agora é um **pop-up** (não uma página) com Nome, Telefone e "Sobre o imóvel" (opcional) — fica salvo em `anuncios_recebidos`, visível só para o time
  - **Início**: imagem de capa (grande, cheia de largura) com uma frase de efeito por baixo, a barra de busca, **Imóveis selecionados** (os mais recentes), **Imóveis por bairro** (contagem e uma foto por bairro) e, só quando preenchidos em "Meu perfil" → "Dados do site": **Vídeos** (YouTube), **O que dizem sobre nós** (depoimentos — cadastre pela tabela `depoimentos` no Supabase, ainda sem tela própria), **Sobre nós** e a faixa do Instagram. Nenhuma dessas seções mostra conteúdo inventado: elas só aparecem quando há conteúdo real
  - **Imóveis**: a listagem completa, com busca por código/título/bairro/condomínio e filtros por finalidade, tipo, cidade, bairro, condomínio e faixa de valor. Mostra os imóveis **disponíveis** marcados para aparecer no site ("Mostrar no site" no cadastro). Cada card mostra tipo, condomínio (quando houver), bairro/cidade, um resumo de dormitórios/suítes/banheiros/vagas/área e "Ver detalhes"
  - **Contato**: botão de WhatsApp, e-mail e um formulário de contato geral ("o que você procura"), salvo em `contatos_recebidos` — diferente do "Anuncie seu imóvel", que é para quem quer vender/alugar com a imobiliária
  - A página de cada imóvel (`/imoveis/CA0001`) mostra fotos, condomínio, características e um botão **Falar no WhatsApp sobre este imóvel**, que abre a conversa já com "Olá, tenho interesse no imóvel CA0001 (título)"
  - O rodapé mostra o responsável (**Wallace Cruz**, CRECI **108.111**) e o e-mail de contato (`negociosimobiliarioscrz@gmail.com`) — sem endereço físico, que a imobiliária ainda não tem
  - Tudo editável em "Meu perfil" → "Dados do site" (só o dono): WhatsApp, nome/CRECI/e-mail do responsável, imagem de capa (upload direto), frase de efeito, sobre a empresa, Instagram e vídeos do YouTube
  - Nunca mostra dados do proprietário, endereço exato, localização ou chave — só o que o cliente precisa ver. Nenhum dado passa pelo login: o visitante lê só views públicas do banco
- **Código do imóvel por tipo**: `CA0001` (casa), `AP0001` (apartamento), `LO0001` (comercial/loja), `TE0001` (terreno), `RU0001` (rural), `OU0001` (outro) — cada tipo com sua própria contagem. Nunca muda depois de criado; imóveis antigos (código `CRZ-0001`...) foram renumerados pelo tipo, na ordem de cadastro, pela migração 012
- Filtro por bairro na lista de imóveis (junta "centro", "Centro" e "CENTRO" e mostra a quantidade de cada bairro)
- Troca de página e de abas com fade suave, no mesmo estilo das janelas (respeita a preferência de reduzir movimento do sistema)
- **Meu perfil** (nome na barra superior): define o nome do corretor, usado nas mensagens de WhatsApp e na ficha dos imóveis
- Listagem em cards com busca por título/bairro/cidade e filtros por finalidade, tipo e situação

### Leads, agenda e WhatsApp

- Janela do lead em abas: **Dados**, **Perfil de busca**, **Imóveis e visitas**, **Contato** (as duas últimas liberam depois de salvar o lead; um lead novo já segue para "Imóveis e visitas")
- Origem do lead: Instagram, WhatsApp, indicação, Meta Ads, Google Ads, site, manual ou outro
- Perfil de busca: comprar/alugar, tipos de imóvel, bairros, cidade, faixa de valor e mínimo de dormitórios (resumo no topo da janela)
- Vínculo lead ↔ imóvel; agendar uma visita em um imóvel também o vincula ao lead
- Visitas ligadas ao lead e ao imóvel, com situação (agendada, realizada, cancelada, não compareceu)
- Lembretes de retorno com atalhos (amanhã, em 3 dias, em 1 semana); os cards do kanban mostram o retorno (em vermelho se atrasado) e a próxima visita
- Página **Agenda**: retornos e visitas pendentes agrupados em atrasados, hoje, próximos 7 dias e mais adiante
- Mensagens prontas de WhatsApp (apresentação, pós-visita, retorno, confirmar visita) com nome do lead, imóvel e corretor; o texto é editável antes de enviar
- **Compartilhar** a ficha do imóvel (nunca inclui dados do proprietário). Pelo celular, "Enviar com fotos anexadas" anexa as fotos de verdade; em qualquer aparelho, "Abrir no WhatsApp" envia o texto com os links das fotos (o `wa.me` não aceita anexos)

## Cuidados do plano gratuito do Supabase

- O projeto **pausa após ~7 dias sem atividade** e não tem backup automático. Faça um backup periódico (`pg_dump` ou exportação pelo painel) e considere o plano Pro quando entrarem leads reais de anúncios.
- 500 MB de banco: guarde as fotos dos imóveis em Cloudflare R2 ou Supabase Storage, não no banco.

## Próximos passos

2. Sugerir imóveis compatíveis com o perfil de busca de cada lead
3. Webhook do Meta Lead Ads (Cloudflare Worker) gravando em `leads` com UTM e campanha
4. Dashboard de custo por lead (view `campanha_resumo` já existe)
5. Envio de venda fechada ao Meta/Google (tabela `conversoes` já existe)
