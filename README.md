# CRM do Corretor

CRM para corretor individual: funil kanban de leads, histórico de interações e captura de origem (base para a integração com tráfego pago).

**Stack:** React + Vite, Supabase (Postgres + Auth). Hospedagem estática (Cloudflare Pages ou Netlify).

## Como rodar

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute os arquivos nesta ordem (cada um numa execução separada):
   1. `supabase/schema.sql`
   2. `supabase/migrations/002_imoveis_fotos.sql` (bucket de fotos dos imóveis; pode ser repetido sem erro)
   3. `supabase/migrations/003_imoveis_campos.sql` (corretores e novos campos do imóvel; pode ser repetido sem erro)
   4. `supabase/migrations/004_leads_agenda.sql` (perfil de busca, lembretes e visitas; pode ser repetido sem erro)
   5. `supabase/migrations/005_imoveis_compartilhados.sql` (imóveis visíveis para todos os usuários; só quem cadastrou altera ou exclui; pode ser repetido sem erro)
   6. `supabase/migrations/006_imoveis_endereco.sql` (campo de endereço — rua e número — do imóvel, usado pelo botão "Ver no mapa"; pode ser repetido sem erro)
3. Em **Project Settings → API**, copie a URL e a chave `anon`.
4. Neste projeto:

```bash
cp .env.example .env.local   # preencha as duas variáveis
npm install
npm run dev
```

5. Abra o endereço mostrado, clique em **Primeiro acesso? Criar conta** e confirme o e-mail.

> Para uso de uma pessoa só, depois de criar sua conta desative novos cadastros em
> Supabase → Authentication → Providers → Email → *Allow new users to sign up*.

## Publicar (grátis)

Cloudflare Pages ou Netlify: conecte o repositório, comando de build `npm run build`, pasta de saída `dist`, e cadastre as duas variáveis `VITE_SUPABASE_*` no painel.
**Não use Vercel Hobby** para uso profissional (o plano é só para uso não comercial).

## O que já funciona (passo 1)

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
- **Aviso de duplicados**: ao cadastrar ou alterar um lead, avisa se já existe outro com o mesmo telefone (ignora formatação, +55 e nono dígito) ou e-mail; ao cadastrar um imóvel, avisa se já existe outro no mesmo endereço exato (rua e número, ignorando maiúsculas, acentos e abreviações como "R." e "nº"). O aviso mostra o cadastro existente e permite corrigir, abrir ou "Salvar mesmo assim". Só checa quando o contato/endereço é novo ou mudou
- **Avisos da agenda**: um selo de sino sobre o menu "Agenda" mostra quantos compromissos (visitas e retornos) estão atrasados, são de hoje ou dos próximos 2 dias (vermelho se há atrasado ou de hoje). Ao entrar, uma janelinha no canto da tela lista o que está marcado para hoje: aparece em fade suave, não bloqueia a tela nem toma o foco e só sai quando o usuário fecha (uma vez fechada, não volta ao recarregar no mesmo dia, nesta aba). Atualiza sozinha a cada 5 minutos e ao concluir itens
- Paleta da marca: fundo areia/creme com destaques em verde profundo; o tema escuro usa o verde como fundo
  - Cada campo tem um lápis: clique, altere só aquele valor e salve (Enter), ou cancele (Esc). Só as colunas daquele campo são gravadas
  - Campos que se influenciam são editados juntos (finalidade com valores, condomínio, elevador) e as características são editadas por grupo
  - Na edição de um campo só valem as obrigatoriedades relacionadas a ele, então um imóvel antigo sem proprietário continua editável nos demais campos
  - Galeria de fotos com setas e miniaturas; "Gerenciar fotos" e "Editar" abrem o formulário completo, que ao salvar volta para os detalhes
- Cadastro de imóveis em 4 abas (proprietário e valores, detalhes, características, fotos e comentários)
  - Finalidade: venda, aluguel ou venda e aluguel (com os dois valores)
  - Obrigatórios: nome do proprietário, ao menos um telefone e o(s) valor(es); todo o resto é opcional
  - Corretor responsável (padrão: o usuário logado; já aceita outros corretores)
  - Condomínio, IPTU, padrão, financiamento, exclusividade, posição, áreas, dormitórios, vagas, elevador, 34 características e 20 tipos de piso
- Rascunho automático no cadastro de imóvel novo: salvo no navegador a cada alteração (válido por 14 dias, separado por usuário) e recuperado ao reabrir, mesmo após o computador desligar. "Continuar depois" fecha mantendo o rascunho; fechar ou "Descartar" pede confirmação
- Fotos dos imóveis (até 40 por imóvel, com escolha da capa), comprimidas no navegador antes do envio
  - Reordenar arrastando ou pelas setas; a primeira foto é a capa
- **Esqueci minha senha** na tela de entrada (link por e-mail) e **Alterar senha** em "Meu perfil" (pede a senha atual; nova senha com 8+ caracteres, letras e números). Para o link funcionar, no Supabase cadastre o endereço do site em Authentication → URL Configuration (Site URL e Redirect URLs)
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
