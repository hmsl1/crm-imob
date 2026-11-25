import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Algumas rotas do site público (ex.: /painel, /imoveis, /contato) não têm arquivo físico
// correspondente — dependem do fallback de SPA do Cloudflare (not_found_handling) pra
// servir o index.html quando alguém abre o link direto ou dá F5. Esse fallback não funciona
// direito com o comando "wrangler preview" (usado nos deploys de preview). Pra essas rotas
// específicas não dependerem disso, geramos uma cópia física do index.html em cada uma logo
// depois do build — assim elas abrem mesmo se o fallback de SPA não entrar em ação.
function copiarIndexParasRotas(rotas) {
  return {
    name: 'copiar-index-para-rotas-estaticas',
    closeBundle() {
      const indexHtml = path.resolve(__dirname, 'dist/index.html')
      if (!fs.existsSync(indexHtml)) return
      const conteudo = fs.readFileSync(indexHtml, 'utf8')
      for (const rota of rotas) {
        const pasta = path.resolve(__dirname, 'dist', rota.replace(/^\//, ''))
        fs.mkdirSync(pasta, { recursive: true })
        fs.writeFileSync(path.join(pasta, 'index.html'), conteudo)
      }
    },
  }
}

const SITE_URL = 'https://crznegociosimobiliarios.com.br'

// Gera dist/sitemap.xml no build: as páginas fixas do site + um item pra cada imóvel ativo
// publicado no site (buscado direto do Supabase, com a chave pública/anon — os mesmos dados
// que já aparecem na vitrine). Isso ajuda o Google a achar e indexar as páginas de cada imóvel,
// que não têm link em nenhum lugar fácil de rastrear sem isso. Se não conseguir buscar os
// imóveis por qualquer motivo (sem internet no build, variáveis não configuradas, etc.), o
// sitemap sai só com as páginas fixas — nunca quebra o build por causa disso.
function gerarSitemap() {
  return {
    name: 'gerar-sitemap',
    async closeBundle() {
      const paginasFixas = ['/', '/imoveis', '/contato']
      let urlsImoveis = []

      const url = process.env.VITE_SUPABASE_URL
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY
      if (url && anonKey) {
        try {
          const resposta = await fetch(
            `${url}/rest/v1/vitrine_imoveis?select=codigo,created_at`,
            { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
          )
          if (resposta.ok) {
            const imoveis = await resposta.json()
            urlsImoveis = imoveis.map((i) => ({
              loc: `/imoveis/${encodeURIComponent(i.codigo)}`,
              lastmod: i.created_at,
            }))
          }
        } catch {
          // sem rede ou Supabase fora do ar no momento do build: segue só com as páginas fixas
        }
      }

      const itens = [
        ...paginasFixas.map((caminho) => ({ loc: caminho, lastmod: null })),
        ...urlsImoveis,
      ]
      const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        itens
          .map(
            (i) =>
              `  <url><loc>${SITE_URL}${i.loc}</loc>${
                i.lastmod ? `<lastmod>${new Date(i.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''
              }</url>`
          )
          .join('\n') +
        '\n</urlset>\n'

      fs.writeFileSync(path.resolve(__dirname, 'dist/sitemap.xml'), xml)
    },
  }
}

export default defineConfig({
  plugins: [react(), copiarIndexParasRotas(['painel', 'imoveis', 'contato']), gerarSitemap()],
})
