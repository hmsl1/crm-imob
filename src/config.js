// Identidade visual do sistema. Edite aqui.
export const MARCA = {
  // Nome mostrado no topo à esquerda, na tela de login e na aba do navegador
  nome: 'CRZ Imóveis',

  // Caminho da logo dentro da pasta "public". Coloque o arquivo lá (ex.: public/logo.png).
  // Se o arquivo não existir, o sistema mostra só o nome, sem erro.
  // Use null para não ter logo.
  logo: '/logo.png',
}

// Domínio oficial e público do site (sem barra no final). Usado para montar URLs absolutas
// (ex.: no sitemap.xml, gerado no build) — não muda o que o site mostra pros visitantes.
export const SITE_URL = 'https://crznegociosimobiliarios.com.br'

// Google Tag Manager do site público (vitrine) — dentro dele fica configurado o Google Analytics
// (GA4) e, no futuro, pixels de tráfego pago (Google Ads, Meta etc.), tudo sem mexer no código.
// ID do contêiner (começa com "GTM-"), em tagmanager.google.com. Use null para desativar
// (o painel/CRM nunca é rastreado, só as páginas públicas do site).
export const GTM_CONTAINER_ID = 'GTM-T98CHSDF'

// Chaves de recursos (feature flags): mude qualquer item para `false` para desativar
// apenas aquela melhoria visual ou funcionalidade sem precisar mexer no restante do código.
export const RECURSOS = {
  // Layout & Fluidez
  tipografiaEditorial: true,     // Fontes Plus Jakarta Sans + Fraunces nos títulos da vitrine
  cardsRicos: true,              // Badges extras, destaque, favorito ♥ e zoom suave nos cards

  // Vitrine Pública
  galeriaBentoImovel: true,      // Galeria estilo mosaico + Lightbox tela cheia + layout 2 colunas
  favoritosVitrine: true,        // Botão ♥ para salvar imóveis favoritos e enviar lista no WhatsApp
  filtrosAvancadosVitrine: true, // Filtros rápidos (dormitórios, vagas e chips de características)
  simuladorCustosImovel: true,   // Calculadora de financiamento e pacote mensal na página do imóvel
  imoveisSemelhantes: true,      // Sugestão de imóveis parecidos no rodapé da página do imóvel
  destaqueManualCapa: true,      // Escolha manual de quais imóveis aparecem primeiro na capa (★)

  // Painel CRM
  kpisDashboard: true,           // Cartões de resumo (ativos, VGV, estoque, pendências) e origens no Dashboard
  alertaLeadEsfriando: true,     // Aviso e filtro para leads sem retorno há vários dias
  matchInteligente: true,        // Cruzamento automático entre perfil do lead e imóveis disponíveis
  fichaPdfEStories: true,        // Botões de gerar Ficha em PDF e Arte vertical 1080x1920 para Stories
  relatorioProprietario: true,   // Resumo de visitas e interessados pronto para enviar ao proprietário
  buscaGlobalCtrlK: true,        // Busca rápida global (Ctrl+K / botão na barra superior)
}
