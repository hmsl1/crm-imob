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

> O CRM (login) fica em `/painel`; o site público começa na raiz do domínio (`/`, a Início) e a listagem completa fica em `/imoveis`. Em Supabase → Authentication → URL Configuration, cadastre o **Site URL** como o domínio raiz (ex.: `https://crzimoveis.com.br`) — o link de "esqueci minha senha" funciona em qualquer caminho.

