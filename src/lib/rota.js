// Rota do site: painel (CRM, atrás de login) ou site público (Início, Imóveis, um imóvel e Contato).
// Sem biblioteca de rotas: só olha o caminho e a busca da URL (compatível com qualquer host estático).
const PREFIXO_PAINEL = '/painel'
const PREFIXO_VITRINE = '/imoveis'

const texto = (sp, chave) => sp.get(chave)?.trim() ?? ''

export function rotaDoCaminho(pathname = '/', search = '') {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  if (p === PREFIXO_PAINEL || p.startsWith(PREFIXO_PAINEL + '/')) return { pagina: 'painel' }

  const mImovel = /^\/imoveis\/([^/]+)$/.exec(p)
  if (mImovel) return { pagina: 'imovel', codigo: decodeURIComponent(mImovel[1]).trim().toUpperCase() }

  if (p === '/contato') return { pagina: 'contato' }

  if (p === PREFIXO_VITRINE) {
    const sp = new URLSearchParams(search)
    return {
      pagina: 'vitrine',
      filtros: {
        busca: texto(sp, 'busca'),
        tipo: texto(sp, 'tipo'),
        finalidade: ['venda', 'aluguel'].includes(sp.get('f')) ? sp.get('f') : '',
        cidade: texto(sp, 'cidade'),
        bairro: texto(sp, 'bairro'),
        condominio: texto(sp, 'condominio'),
        valorMin: texto(sp, 'min'),
        valorMax: texto(sp, 'max'),
      },
    }
  }

  // raiz do domínio: é a Início; qualquer outro caminho também cai aqui (em vez de "página não encontrada")
  return { pagina: 'inicio' }
}

export const linkPainel = PREFIXO_PAINEL
export const linkInicio = '/'
export const linkVitrine = PREFIXO_VITRINE
export const linkContato = '/contato'
export const linkImovel = (codigo) => `${PREFIXO_VITRINE}/${encodeURIComponent(codigo)}`

// Monta "/imoveis?tipo=casa&cidade=..." a partir de um objeto de filtros (ignora campos vazios)
export function linkBuscaImoveis(filtros = {}) {
  const sp = new URLSearchParams()
  const mapa = { busca: 'busca', tipo: 'tipo', finalidade: 'f', cidade: 'cidade', bairro: 'bairro', condominio: 'condominio', valorMin: 'min', valorMax: 'max' }
  for (const [chave, param] of Object.entries(mapa)) {
    const v = filtros[chave]
    if (v) sp.set(param, v)
  }
  const qs = sp.toString()
  return qs ? `${PREFIXO_VITRINE}?${qs}` : PREFIXO_VITRINE
}
