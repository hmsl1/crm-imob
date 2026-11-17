// Google Tag Manager só para as páginas públicas do site (vitrine) — o painel/CRM nunca é
// rastreado. O contêiner (GA4, e no futuro pixels de Google Ads/Meta etc.) é configurado direto em
// tagmanager.google.com, sem precisar mexer aqui. Se não houver GTM_CONTAINER_ID em config.js,
// estas funções não fazem nada (sem erro).
import { GTM_CONTAINER_ID } from '../config.js'

let carregado = false

function carregarGTM() {
  if (carregado || !GTM_CONTAINER_ID) return
  carregado = true

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`
  document.head.appendChild(script)
}

// Chame a cada navegação dentro das páginas públicas (Início, Imóveis, um imóvel, Contato).
// Manda um evento "page_view" pro dataLayer a cada troca — como é uma SPA (só a primeira página
// recarrega o navegador de verdade), sem isso o GTM só veria a primeira página da visita.
// No GTM, a tag de GA4 precisa disparar nesse evento customizado "page_view" (não em "All Pages"),
// senão as trocas de página dentro do site não são contadas.
export function registrarPageView(caminho, titulo) {
  if (!GTM_CONTAINER_ID) return
  carregarGTM()
  window.dataLayer.push({
    event: 'page_view',
    page_path: caminho,
    page_location: window.location.origin + caminho,
    page_title: titulo,
  })
}
