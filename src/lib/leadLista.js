// Filtro, ordenação e paginação da lista de leads (funções puras).
import { ETAPAS } from './supabase.js'
import { rotuloOrigem } from './lead.js'

export const POR_PAGINA = 25

// Grupos de etapa do filtro: o que está em andamento, o que foi concluído e o que se perdeu
export const GRUPOS_ETAPA = [
  { id: 'todas', rotulo: 'Todas as etapas', etapas: null },
  { id: 'andamento', rotulo: 'Em atendimento', etapas: ['novo', 'contato', 'visita', 'proposta'] },
  { id: 'fechado', rotulo: 'Concluídos (fechados)', etapas: ['fechado'] },
  { id: 'perdido', rotulo: 'Perdidos', etapas: ['perdido'] },
]

const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const soDigitos = (t) => String(t ?? '').replace(/\D/g, '')

export function filtrarLeads(leads, { busca = '', grupo = 'todas', origem = '' } = {}) {
  const termo = semAcento(busca.trim())
  const digitos = soDigitos(busca)
  const etapas = GRUPOS_ETAPA.find((g) => g.id === grupo)?.etapas ?? null
  return leads.filter((l) => {
    if (etapas && !etapas.includes(l.status)) return false
    if (origem && l.origem !== origem) return false
    if (!termo) return true
    if ([l.nome, l.email, l.observacoes].some((v) => semAcento(v).includes(termo))) return true
    // telefone: compara só os dígitos, para "2299" achar "(22) 99999-1111"
    return digitos.length >= 3 && soDigitos(l.telefone).includes(digitos)
  })
}

const ORDEM_ETAPA = Object.fromEntries(ETAPAS.map((e, i) => [e.id, i]))

// chave: nome | etapa | origem | criado | valor. Vazios sempre ficam no fim.
export function ordenarLeads(leads, chave = 'criado', direcao = 'desc') {
  const valor = {
    nome: (l) => semAcento(l.nome),
    etapa: (l) => ORDEM_ETAPA[l.status] ?? 99,
    origem: (l) => semAcento(rotuloOrigem(l.origem)),
    criado: (l) => (l.created_at ? new Date(l.created_at).getTime() : null),
    valor: (l) => (l.valor_fechado == null ? null : Number(l.valor_fechado)),
  }[chave]
  if (!valor) return [...leads]
  const sinal = direcao === 'asc' ? 1 : -1
  return [...leads].sort((a, b) => {
    const x = valor(a)
    const y = valor(b)
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    return x < y ? -sinal : x > y ? sinal : 0
  })
}

export function paginar(itens, pagina = 1, porPagina = POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina))
  const atual = Math.min(Math.max(1, pagina), totalPaginas)
  return { itens: itens.slice((atual - 1) * porPagina, atual * porPagina), pagina: atual, totalPaginas, total: itens.length }
}

// Contagem por grupo (para mostrar nos filtros)
export function contarPorGrupo(leads) {
  return Object.fromEntries(
    GRUPOS_ETAPA.map((g) => [g.id, g.etapas ? leads.filter((l) => g.etapas.includes(l.status)).length : leads.length])
  )
}
