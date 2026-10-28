# CRM Corretor

CRM para corretor individual: funil kanban de leads, histórico de interações e captura de origem (base para a integração com tráfego pago).

**Stack:** React + Vite, Supabase (Postgres + Auth). Hospedagem estática (Cloudflare Pages).

## Como rodar

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute os arquivos nesta ordem (cada um numa execução separada):
   1. `supabase/schema.sql`
   2. `supabase/migrations/002_imoveis_fotos.sql` (bucket de fotos dos imóveis; pode ser repetido sem erro)
   3. `supabase/migrations/003_imoveis_campos.sql` (corretores e novos campos do imóvel; pode ser repetido sem erro)
   4. `supabase/migrations/004_leads_agenda.sql` (perfil de busca, lembretes e visitas; pode ser repetido sem erro)
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

## Publicar

Cloudflare Pages ou Netlify: conecte o repositório, comando de build `npm run build`, pasta de saída `dist`, e cadastre as duas variáveis `VITE_SUPABASE_*` no painel.
