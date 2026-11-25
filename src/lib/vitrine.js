// Regras puras da vitrine pública (lista, busca e mensagem de WhatsApp). Sem React nem Supabase.
import { atendeFinalidade } from './imovel.js'
import { atendeCampo } from './opcoesImoveis.js'

// Mesmo texto, em qualquer capitalização ou espaçamento, acha o imóvel pelo código ("ca0001", "CA 0001"...)
const chaveCodigo = (v) => String(v ?? '').toUpperCase().replace(/[\s-]+/g, '')

export const buscaEhCodigo = (termo) => /^[A-Z]{2}\d+$/.test(chaveCodigo(termo))

export const CHIPS_FILTRO_VITRINE = [
  { id: 'aceita_financiamento', rotulo: 'Aceita financiamento', tipo: 'campo' },
  { id: 'vista_mar', rotulo: 'Vista mar', tipo: 'campo' },
  { id: 'piscina', rotulo: 'Piscina', tipo: 'carac' },
  { id: 'churrasqueira', rotulo: 'Churrasqueira', tipo: 'carac' },
  { id: 'mobiliado', rotulo: 'Mobiliado', tipo: 'carac' },
  { id: 'area_gourmet', rotulo: 'Área gourmet', tipo: 'carac' },
]

// Filtro por bairro fica fora (é feito com atendeBairro, de bairros.js, que compara por chave normalizada)
export function filtrarVitrine(
  lista = [],
  {
    busca = '',
    finalidade = '',
    tipo = '',
    cidade = '',
    condominio = '',
    valorMin = '',
    valorMax = '',
    quartosMin = '',
    vagasMin = '',
    caracteristicas = [],
    soFavoritos = false,
  } = {},
  favoritosLista = []
) {
  const termo = busca.trim().toLowerCase()
  const codigoBuscado = buscaEhCodigo(busca) ? chaveCodigo(busca) : null
  const min = valorMin !== '' && valorMin !== null && valorMin !== undefined ? Number(valorMin) : null
  const max = valorMax !== '' && valorMax !== null && valorMax !== undefined ? Number(valorMax) : null
  const qMin = quartosMin !== '' && quartosMin !== null && quartosMin !== undefined ? Number(quartosMin) : null
  const vMin = vagasMin !== '' && vagasMin !== null && vagasMin !== undefined ? Number(vagasMin) : null
  const chips = Array.isArray(caracteristicas) ? caracteristicas : []
  const favSet = soFavoritos ? new Set(favoritosLista) : null

  return lista.filter((i) => {
    if (favSet && !favSet.has(i.codigo)) return false
    if (finalidade && !atendeFinalidade(i.finalidade, finalidade)) return false
    if (tipo && i.tipo !== tipo) return false
    if (!atendeCampo(i, 'cidade', cidade)) return false
    if (!atendeCampo(i, 'nome_condominio', condominio)) return false
    if (qMin !== null && (Number(i.dormitorios ?? 0) < qMin)) return false
    if (vMin !== null) {
      const totalVagas = Number(i.vagas_cobertas ?? 0) + Number(i.vagas_descobertas ?? 0)
      if (totalVagas < vMin) return false
    }
    for (const chip of chips) {
      if (chip === 'aceita_financiamento') {
        if (!i.aceita_financiamento) return false
      } else if (chip === 'vista_mar') {
        if (!i.vista_mar) return false
      } else if (!Array.isArray(i.caracteristicas) || !i.caracteristicas.includes(chip)) {
        return false
      }
    }
    if (min !== null || max !== null) {
      const valores = [i.valor_venda, i.valor_aluguel].filter((v) => v !== null && v !== undefined)
      if (valores.length === 0) return false
      const atende = valores.some((v) => (min === null || Number(v) >= min) && (max === null || Number(v) <= max))
      if (!atende) return false
    }
    if (!termo) return true
    if (codigoBuscado) return chaveCodigo(i.codigo) === codigoBuscado
    return [i.titulo, i.bairro, i.cidade, i.nome_condominio].some((v) => v && v.toLowerCase().includes(termo))
  })
}

// "Olá, tenho interesse no imóvel CA0001 (Casa no Centro)."
export function mensagemInteresse(imovel) {
  const nome = imovel?.titulo ? ` (${imovel.titulo})` : ''
  return `Olá, tenho interesse no imóvel ${imovel?.codigo ?? ''}${nome}.`
}
