// Exclusividade com vencimento: situação do imóvel e alerta ao corretor. Funções puras.
import { dataBR, diasAteData } from './datas.js'

export const DIAS_ALERTA_EXCLUSIVIDADE = 30

// estado: 'sem' (não é exclusivo) | 'sem_data' | 'ativa' | 'vence' (dentro do prazo de alerta) | 'vencida'
export function situacaoExclusividade(imovel, agora = new Date(), alerta = DIAS_ALERTA_EXCLUSIVIDADE) {
  if (!imovel?.exclusividade) return { estado: 'sem', dias: null, texto: '' }
  if (!imovel.exclusividade_ate) return { estado: 'sem_data', dias: null, texto: 'Exclusivo, sem data de vencimento' }
  const dias = diasAteData(imovel.exclusividade_ate, agora)
  const data = dataBR(imovel.exclusividade_ate)
  if (dias === null) return { estado: 'sem_data', dias: null, texto: 'Exclusivo, sem data de vencimento' }
  if (dias < 0) return { estado: 'vencida', dias, texto: `Exclusividade venceu em ${data} (há ${-dias} ${-dias === 1 ? 'dia' : 'dias'})` }
  if (dias === 0) return { estado: 'vence', dias, texto: 'Exclusividade vence hoje' }
  if (dias <= alerta) return { estado: 'vence', dias, texto: `Exclusividade vence em ${data} (${dias} ${dias === 1 ? 'dia' : 'dias'})` }
  return { estado: 'ativa', dias, texto: `Exclusivo até ${data}` }
}

// Imóveis que merecem alerta (vencendo ou vencidos), do mais urgente para o menos.
// Imóvel já vendido/alugado não precisa mais de alerta.
export function alertasDeExclusividade(imoveis = [], agora = new Date(), alerta = DIAS_ALERTA_EXCLUSIVIDADE) {
  return imoveis
    .filter((i) => i.status !== 'vendido')
    .map((imovel) => ({ imovel, ...situacaoExclusividade(imovel, agora, alerta) }))
    .filter((a) => a.estado === 'vence' || a.estado === 'vencida')
    .sort((a, b) => a.dias - b.dias)
}

// De quem é o alerta: do usuário que cadastrou o imóvel, do captador dele, ou (visão geral) do dono da imobiliária
export function ehMeuImovel(imovel, { usuarioId, captadorIds = [], dono = false }) {
  return dono || imovel.owner_id === usuarioId || (imovel.captador_id != null && captadorIds.includes(imovel.captador_id))
}
