// Identidade visual do sistema. Edite aqui.
export const MARCA = {
  // Nome mostrado no topo à esquerda, na tela de login e na aba do navegador
  nome: 'CRZ Imóveis',

  // Caminho da logo dentro da pasta "public". Coloque o arquivo lá (ex.: public/logo.png).
  // Se o arquivo não existir, o sistema mostra só o nome, sem erro.
  // Use null para não ter logo.
  logo: '/logo.png',
}

// Google Tag Manager do site público (vitrine) — dentro dele fica configurado o Google Analytics
// (GA4) e, no futuro, pixels de tráfego pago (Google Ads, Meta etc.), tudo sem mexer no código.
// ID do contêiner (começa com "GTM-"), em tagmanager.google.com. Use null para desativar
// (o painel/CRM nunca é rastreado, só as páginas públicas do site).
export const GTM_CONTAINER_ID = 'GTM-T98CHSDF'
