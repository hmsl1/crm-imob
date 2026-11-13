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

export default defineConfig({
  plugins: [react(), copiarIndexParasRotas(['painel', 'imoveis', 'contato'])],
})
