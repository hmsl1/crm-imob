// Monta a agenda do corretor a partir de visitas e lembretes pendentes.
import { faixaDoDia } from './lead.js'

export const FAIXAS = [
  { id: 'atrasados', titulo: 'Atrasados' },
  { id: 'hoje', titulo: 'Hoje' },
  { id: 'proximos', titulo: 'Próximos 7 dias' },
  { id: 'depois', titulo: 'Mais adiante' },
]

// O Supabase devolve o registro relacionado como objeto (leads / imoveis); aqui vira { lead, imovel }.
export function itensDaAgenda(visitas = [], lembretes = []) {
  const deVisitas = visitas
    .filter((v) => v.status === 'agendada')
    .map((v) => ({
      tipo: 'visita',
      id: v.id,
      quando: v.quando,
      lead: v.leads ?? { id: v.lead_id },
      imovel: v.imoveis ?? null,
      nota: v.observacoes ?? null,
    }))
  const deLembretes = lembretes
    .filter((l) => !l.concluido)
    .map((l) => ({
      tipo: 'lembrete',
      id: l.id,
      quando: l.quando,
      lead: l.leads ?? { id: l.lead_id },
      imovel: null,
      nota: l.nota ?? null,
    }))
  return [...deVisitas, ...deLembretes].sort((a, b) => new Date(a.quando) - new Date(b.quando))
}

// Agrupa em atrasados / hoje / próximos 7 dias / mais adiante (só as faixas que têm itens)
export function agendaPorFaixa(visitas, lembretes, agora = new Date()) {
  const itens = itensDaAgenda(visitas, lembretes)
  return FAIXAS.map((f) => ({
    ...f,
    itens: itens.filter((i) => faixaDoDia(i.quando, agora) === f.id),
  })).filter((f) => f.itens.length > 0)
}

// Próximo lembrete e próxima visita de cada lead (para os selos do Kanban)
export function proximosPorLead(visitas = [], lembretes = []) {
  const mapa = {}
  const registrar = (leadId, chave, quando) => {
    const atual = mapa[leadId]?.[chave]
    if (!atual || new Date(quando) < new Date(atual)) mapa[leadId] = { ...mapa[leadId], [chave]: quando }
  }
  visitas.filter((v) => v.status === 'agendada').forEach((v) => registrar(v.lead_id, 'visita', v.quando))
  lembretes.filter((l) => !l.concluido).forEach((l) => registrar(l.lead_id, 'lembrete', l.quando))
  return mapa
}
