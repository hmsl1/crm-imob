// Regras puras do Dashboard (funil de metas). Sem React nem Supabase: fáceis de testar.

// Único e-mail que pode DEFINIR metas. Isto só esconde/mostra o botão; quem garante de verdade é o banco
// (função eh_dono_da_imobiliaria() na migração 008). Se o e-mail mudar, altere aqui E na migração.
export const EMAIL_DONO = 'negociosimobiliarioscrz@gmail.com'

export function ehDono(email) {
  return String(email ?? '').trim().toLowerCase() === EMAIL_DONO
}

// Tipos de funil: o título do card troca entre eles ("Metas de Venda" / "Metas de Locação").
// O id é o mesmo valor gravado no banco (aluguel).
export const TIPOS_FUNIL = [
  { id: 'venda', rotulo: 'Venda', titulo: 'Metas de Venda' },
  { id: 'aluguel', rotulo: 'Locação', titulo: 'Metas de Locação' },
]
export const tipoFunil = (id) => TIPOS_FUNIL.find((t) => t.id === id) ?? TIPOS_FUNIL[0]
export const outroTipoFunil = (id) => TIPOS_FUNIL.find((t) => t.id !== tipoFunil(id).id)

// As cinco etapas do funil, na ordem em que aparecem (de cima para baixo)
export const ETAPAS_FUNIL = [
  { id: 'captacoes', rotulo: 'Captações', ajuda: 'Imóveis cadastrados no mês' },
  { id: 'novos_clientes', rotulo: 'Novos clientes', ajuda: 'Leads cadastrados no mês' },
  { id: 'visitas', rotulo: 'Visitas', ajuda: 'Visitas marcadas como realizadas no mês' },
  { id: 'propostas', rotulo: 'Propostas', ajuda: 'Leads que chegaram à etapa Proposta no mês' },
  { id: 'fechamentos', rotulo: 'Fechamentos', ajuda: 'Leads que chegaram à etapa Fechado no mês' },
]

const dois = (n) => String(n).padStart(2, '0')

// 'AAAA-MM-01' do mês de uma data (hora local)
export function mesDaData(data = new Date()) {
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-01`
}

// Soma (ou subtrai) meses de um 'AAAA-MM-01'
export function mesVizinho(mes, delta) {
  const [a, m] = mes.split('-').map(Number)
  return mesDaData(new Date(a, m - 1 + delta, 1))
}

// Início (inclusive) e fim (exclusivo) do mês, em horário local, já em ISO para enviar ao banco
export function intervaloDoMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  return { inicio: new Date(a, m - 1, 1).toISOString(), fim: new Date(a, m, 1).toISOString() }
}

export function rotuloDoMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`
}

const inteiro = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

// Junta o realizado (contagens do banco) com as metas do mês. Sem meta, "pct" fica nulo.
export function montarFunil(contagens, metas) {
  return ETAPAS_FUNIL.map(({ id, rotulo, ajuda }) => {
    const realizado = inteiro(contagens?.[id])
    const meta = inteiro(metas?.[id])
    const pct = meta > 0 ? Math.round((realizado / meta) * 100) : null
    return { id, rotulo, ajuda, realizado, meta, pct, batida: meta > 0 && realizado >= meta }
  })
}

// Formulário de metas -> valores inteiros >= 0 (campo vazio = 0). Devolve { valores } ou { erro }.
export function validarMetas(form) {
  const valores = {}
  for (const { id, rotulo } of ETAPAS_FUNIL) {
    const bruto = String(form?.[id] ?? '').trim()
    if (bruto === '') {
      valores[id] = 0
      continue
    }
    if (!/^\d+$/.test(bruto)) return { erro: `${rotulo}: use apenas números inteiros, sem vírgula nem sinal.` }
    const n = Number(bruto)
    if (n > 100000) return { erro: `${rotulo}: o valor máximo é 100000.` }
    valores[id] = n
  }
  return { valores }
}

export const formDasMetas = (metas) =>
  Object.fromEntries(ETAPAS_FUNIL.map(({ id }) => [id, metas?.[id] ? String(metas[id]) : '']))

// Pontos (em %) dos trapézios do funil: o topo é largo e cada etapa estreita um pouco, como na imagem.
// Devolve, para cada etapa, os 4 cantos { x, y } dentro de uma caixa 100 x 100.
export function formaDoFunil(n = ETAPAS_FUNIL.length, larguraTopo = 100, larguraBase = 26, folga = 1.5) {
  const altura = (100 - folga * (n - 1)) / n
  const larguraEm = (t) => larguraTopo - (larguraTopo - larguraBase) * t // t de 0 (topo) a 1 (base)
  return Array.from({ length: n }, (_, i) => {
    const y0 = i * (altura + folga)
    const y1 = y0 + altura
    const l0 = larguraEm(y0 / 100)
    const l1 = larguraEm(y1 / 100)
    return [
      { x: 50 - l0 / 2, y: y0 },
      { x: 50 + l0 / 2, y: y0 },
      { x: 50 + l1 / 2, y: y1 },
      { x: 50 - l1 / 2, y: y1 },
    ]
  })
}
