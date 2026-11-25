// Cruzamento inteligente entre perfil de busca do lead e estoque de imóveis disponíveis.
// Funções puras (sem React nem Supabase).
import { atendeFinalidade } from './imovel.js'

const norm = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

function tokensBairros(texto) {
  return String(texto ?? '')
    .split(/[,;/]+/)
    .map(norm)
    .filter(Boolean)
}

export function temCriteriosDeBusca(lead) {
  if (!lead) return false
  return Boolean(
    lead.busca_finalidade ||
      (Array.isArray(lead.busca_tipos) && lead.busca_tipos.length > 0) ||
      norm(lead.busca_bairros) ||
      norm(lead.busca_cidade) ||
      lead.busca_valor_min != null ||
      lead.busca_valor_max != null ||
      (lead.busca_quartos != null && Number(lead.busca_quartos) > 0)
  )
}

function avaliarMatch(lead, imovel) {
  if (!lead || !imovel || imovel.status !== 'disponivel') return null
  if (!temCriteriosDeBusca(lead)) return null

  const motivos = []
  let pontos = 0

  if (lead.busca_finalidade) {
    if (!atendeFinalidade(imovel.finalidade, lead.busca_finalidade)) return null
    pontos += 1
    motivos.push(lead.busca_finalidade === 'venda' ? 'Venda' : 'Aluguel')
  }

  if (Array.isArray(lead.busca_tipos) && lead.busca_tipos.length > 0) {
    if (!lead.busca_tipos.includes(imovel.tipo)) return null
    pontos += 2
    motivos.push('Tipo')
  }

  if (lead.busca_quartos != null && Number(lead.busca_quartos) > 0) {
    if (Number(imovel.dormitorios ?? 0) < Number(lead.busca_quartos)) return null
    pontos += 1
    motivos.push(`${imovel.dormitorios} dorms`)
  }

  const cidadeLead = norm(lead.busca_cidade)
  const cidadeImovel = norm(imovel.cidade)
  if (cidadeLead) {
    if (cidadeImovel && !cidadeImovel.includes(cidadeLead) && !cidadeLead.includes(cidadeImovel)) return null
    if (cidadeImovel) {
      pontos += 1
      motivos.push('Cidade')
    }
  }

  const bairros = tokensBairros(lead.busca_bairros)
  const bairroImovel = norm(imovel.bairro)
  if (bairros.length > 0) {
    const bateuBairro =
      Boolean(bairroImovel) && bairros.some((b) => bairroImovel.includes(b) || b.includes(bairroImovel))
    if (!bateuBairro) return null
    pontos += 3
    motivos.push('Bairro')
  }

  const min = lead.busca_valor_min != null && lead.busca_valor_min !== '' ? Number(lead.busca_valor_min) : null
  const max = lead.busca_valor_max != null && lead.busca_valor_max !== '' ? Number(lead.busca_valor_max) : null
  if (min !== null || max !== null) {
    const candidatos =
      lead.busca_finalidade === 'venda'
        ? [imovel.valor_venda]
        : lead.busca_finalidade === 'aluguel'
          ? [imovel.valor_aluguel]
          : [imovel.valor_venda, imovel.valor_aluguel]
    const valores = candidatos.filter((v) => v != null && v !== '').map(Number)
    if (valores.length === 0) return null
    const tetoComTolerancia = max !== null ? max * 1.15 : null
    const dentro = valores.some(
      (v) => (min === null || v >= min) && (tetoComTolerancia === null || v <= tetoComTolerancia)
    )
    if (!dentro) return null
    const exato = valores.some((v) => (min === null || v >= min) && (max === null || v <= max))
    pontos += exato ? 2 : 1
    motivos.push(exato ? 'Valor' : 'Valor (+15%)')
  }

  if (pontos === 0) return null
  return { pontos, motivos }
}

export function imoveisCompativeisComLead(lead, imoveis = [], vinculadosIds = [], max = 6) {
  const jaVinculados = new Set(vinculadosIds)
  return imoveis
    .filter((i) => !jaVinculados.has(i.id))
    .map((imovel) => {
      const res = avaliarMatch(lead, imovel)
      return res ? { imovel, ...res } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, max)
}

export function leadsCompativeisComImovel(imovel, leads = [], max = 6) {
  return leads
    .filter((l) => ['novo', 'contato', 'visita', 'proposta'].includes(l.status))
    .map((lead) => {
      const res = avaliarMatch(lead, imovel)
      return res ? { lead, ...res } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, max)
}
