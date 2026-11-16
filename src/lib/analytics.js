// Google Analytics (GA4) só para as páginas públicas do site (vitrine) — o painel/CRM nunca é
// rastreado. O script só é carregado se houver um GA_MEASUREMENT_ID configurado em config.js;
// sem ele, estas funções não fazem nada (sem erro).
import { GA_MEASUREMENT_ID } from '../config.js'

let carregado = false

function carregarScript() {
  if (carregado || !GA_MEASUREMENT_ID) return
  carregado = true

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  // send_page_view: false porque nós mesmos disparamos o evento a cada troca de página dentro do
  // site (é uma SPA: só a primeira página recarrega o navegador de verdade).
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)
}

// Chame a cada navegação dentro das páginas públicas (Início, Imóveis, um imóvel, Contato).
export function registrarPageView(caminho, titulo) {
  if (!GA_MEASUREMENT_ID) return
  carregarScript()
  window.gtag?.('event', 'page_view', {
    page_location: window.location.origin + caminho,
    page_path: caminho,
    page_title: titulo,
  })
}
