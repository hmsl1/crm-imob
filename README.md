# CRM do Corretor

CRM para corretor individual: funil kanban de leads, histórico de interações e captura de origem (base para a integração com tráfego pago).

**Stack:** React + Vite, Supabase (Postgres + Auth). Hospedagem estática (Cloudflare Pages ou Netlify).

## Como rodar

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute os arquivos nesta ordem (cada um numa execução separada):
   1. `supabase/schema.sql`
   2. `supabase/migrations/002_imoveis_fotos.sql` (bucket de fotos dos imóveis; pode ser repetido sem erro)
   3. `supabase/migrations/003_imoveis_campos.sql` (corretores e novos campos do imóvel; pode ser repetido sem erro)
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
- Busca por nome, telefone ou e-mail
- Segurança por linha (RLS): cada usuário só enxerga os próprios dados
- Tela de detalhes do imóvel em 4 abas (as mesmas do formulário), mostrando todos os campos, inclusive os não preenchidos
  - Cada campo tem um lápis: clique, altere só aquele valor e salve (Enter), ou cancele (Esc). Só as colunas daquele campo são gravadas
  - Campos que se influenciam são editados juntos (finalidade com valores, condomínio, elevador) e as características são editadas por grupo
  - Na edição de um campo só valem as obrigatoriedades relacionadas a ele, então um imóvel antigo sem proprietário continua editável nos demais campos
  - Galeria de fotos com setas e miniaturas; "Gerenciar fotos" e "Editar" abrem o formulário completo, que ao salvar volta para os detalhes
- Cadastro de imóveis em 4 abas (proprietário e valores, detalhes, características, fotos e comentários)
  - Finalidade: venda, aluguel ou venda e aluguel (com os dois valores)
  - Obrigatórios: nome do proprietário, ao menos um telefone e o(s) valor(es); todo o resto é opcional
  - Corretor responsável (padrão: o usuário logado; já aceita outros corretores)
  - Condomínio, IPTU, padrão, financiamento, exclusividade, posição, áreas, dormitórios, vagas, elevador, 34 características e 20 tipos de piso
- Fotos dos imóveis (até 12 por imóvel, com escolha da capa), comprimidas no navegador antes do envio
- Listagem em cards com busca por título/bairro/cidade e filtros por finalidade, tipo e situação

## Cuidados do plano gratuito do Supabase

- O projeto **pausa após ~7 dias sem atividade** e não tem backup automático. Faça um backup periódico (`pg_dump` ou exportação pelo painel) e considere o plano Pro quando entrarem leads reais de anúncios.
- 500 MB de banco: guarde as fotos dos imóveis em Cloudflare R2 ou Supabase Storage, não no banco.

## Próximos passos

2. Vínculo lead ↔ imóvel (tabela `lead_imovel` já existe) e agenda de visitas
3. Webhook do Meta Lead Ads (Cloudflare Worker) gravando em `leads` com UTM e campanha
4. Dashboard de custo por lead (view `campanha_resumo` já existe)
5. Envio de venda fechada ao Meta/Google (tabela `conversoes` já existe)
