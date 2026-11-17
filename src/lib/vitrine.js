// Regras puras da vitrine pública (lista, busca e mensagem de WhatsApp). Sem React nem Supabase.
import { atendeFinalidade } from './imovel.js'
import { atendeCampo } from './opcoesImoveis.js'

// Mesmo texto, em qualquer capitalização ou espaçamento, acha o imóvel pelo código ("ca0001", "CA 0001"...)
const chaveCodigo = (v) => String(v ?? '').toUpperCase().replace(/[\s-]+/g, '')

export const buscaEhCodigo = (termo) => /^[A-Z]{2}\d+$/.test(chaveCodigo(termo))

// Filtro por bairro fica fora (é feito com atendeBairro, de bairros.js, que compara por chave normalizada)
export function filtrarVitrine(lista = [], { busca = '', finalidade = '', tipo = '', cidade = '', condominio = '', valorMin = '', valorMax = '' } = {}) {
  const termo = busca.trim().toLowerCase()
  const codigoBuscado = buscaEhCodigo(busca) ? chaveCodigo(busca) : null
  const min = valorMin !== '' && valorMin !== null && valorMin !== undefined ? Number(valorMin) : null
  const max = valorMax !== '' && valorMax !== null && valorMax !== undefined ? Number(valorMax) : null
  return lista.filter((i) => {
    if (finalidade && !atendeFinalidade(i.finalidade, finalidade)) return false
    if (tipo && i.tipo !== tipo) return false
    if (!atendeCampo(i, 'cidade', cidade)) return false
    if (!atendeCampo(i, 'nome_condominio', condominio)) return false
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
