// Rota do site: painel (CRM, atrás de login) ou site público (vitrine, imóvel e "Anuncie").
// Sem biblioteca de rotas: só olha o caminho e a busca da URL (compatível com qualquer host estático).
const PREFIXO_PAINEL = '/painel'
const PREFIXO_VITRINE = '/imoveis'

export function rotaDoCaminho(pathname = '/', search = '') {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  if (p === PREFIXO_PAINEL || p.startsWith(PREFIXO_PAINEL + '/')) return { pagina: 'painel' }
  if (p === '/anuncie') return { pagina: 'anuncie' }
  // raiz do domínio: redireciona para a vitrine (a home não é a vitrine, ela mora em /imoveis)
  if (p === '/') return { pagina: 'redirecionar', destino: PREFIXO_VITRINE }

  const mImovel = /^\/imoveis\/([^/]+)$/.exec(p)
  if (mImovel) return { pagina: 'imovel', codigo: decodeURIComponent(mImovel[1]).trim().toUpperCase() }

  if (p === PREFIXO_VITRINE) {
    const finalidade = new URLSearchParams(search).get('f')
    return { pagina: 'vitrine', finalidade: finalidade === 'venda' || finalidade === 'aluguel' ? finalidade : '' }
  }

  // qualquer outro caminho: trata como a vitrine (sem filtro), em vez de dar "página não encontrada"
  return { pagina: 'vitrine', finalidade: '' }
}

export const linkPainel = PREFIXO_PAINEL
export const linkVitrine = PREFIXO_VITRINE
export const linkComprar = `${PREFIXO_VITRINE}?f=venda`
export const linkAlugar = `${PREFIXO_VITRINE}?f=aluguel`
export const linkAnuncie = '/anuncie'
export const linkImovel = (codigo) => `${PREFIXO_VITRINE}/${encodeURIComponent(codigo)}`
