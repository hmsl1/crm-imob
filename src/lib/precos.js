// Histórico de preço do imóvel: transforma as linhas da tabela imovel_precos em itens da linha do tempo.
import { moeda } from './format.js'

const ROTULO = { venda: 'Venda', aluguel: 'Aluguel' }

// % de variação entre dois valores (negativo = redução). null se não dá para calcular.
export function variacaoPercentual(anterior, novo) {
  const a = Number(anterior)
  const n = Number(novo)
  if (anterior == null || novo == null || !a) return null
  return Math.round(((n - a) / a) * 1000) / 10
}

export const textoVariacao = (pct) => (pct == null ? '' : `${pct > 0 ? '+' : ''}${String(pct).replace('.', ',')}%`)

// linhas: [{ id, tipo, valor_anterior, valor_novo, alterado_em }] -> mais recente primeiro
export function linhasDoHistorico(linhas = []) {
  return [...linhas]
    .sort((a, b) => new Date(b.alterado_em) - new Date(a.alterado_em) || (a.tipo < b.tipo ? -1 : 1))
    .map((l) => {
      const sufixo = l.tipo === 'aluguel' ? ' /mês' : ''
      const pct = variacaoPercentual(l.valor_anterior, l.valor_novo)
      let acao
      if (l.valor_anterior == null) acao = 'Valor inicial'
      else if (l.valor_novo == null) acao = 'Valor retirado'
      else acao = pct != null && pct < 0 ? 'Redução' : pct != null && pct > 0 ? 'Aumento' : 'Alteração'
      return {
        id: l.id,
        tipo: l.tipo,
        rotulo: ROTULO[l.tipo] ?? l.tipo,
        acao,
        reducao: pct != null && pct < 0,
        de: l.valor_anterior == null ? null : moeda(l.valor_anterior) + sufixo,
        para: l.valor_novo == null ? null : moeda(l.valor_novo) + sufixo,
        percentual: textoVariacao(pct),
        quando: l.alterado_em,
      }
    })
}

// Houve redução de preço nos últimos N dias? (base do alerta de "preço reduzido" do radar, bloco seguinte)
export function reduziuRecentemente(linhas = [], dias = 7, agora = new Date()) {
  const limite = agora.getTime() - dias * 86400000
  return linhas.some((l) => l.valor_anterior != null && l.valor_novo != null && Number(l.valor_novo) < Number(l.valor_anterior) && new Date(l.alterado_em).getTime() >= limite)
}
