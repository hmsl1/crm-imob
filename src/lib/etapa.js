// Regras de mudança de etapa do lead (funções puras, sem React nem Supabase):
//   * Perdido  -> motivo obrigatório (e texto quando o motivo é "Outro")
//   * Fechado  -> imóvel, valor final, data e comissão estimada obrigatórios
// O banco repete essas regras (gatilho validar_etapa_do_lead), então elas valem também fora da tela.

export const MOTIVOS_PERDIDO = [
  { id: 'preco', rotulo: 'Preço' },
  { id: 'comprou_outro', rotulo: 'Comprou com outro' },
  { id: 'desistiu', rotulo: 'Desistiu' },
  { id: 'sem_retorno', rotulo: 'Sem retorno' },
  { id: 'sem_credito', rotulo: 'Sem crédito' },
  { id: 'perfil_incompativel', rotulo: 'Perfil incompatível' },
  { id: 'outro', rotulo: 'Outro' },
]

export const rotuloMotivo = (id) => MOTIVOS_PERDIDO.find((m) => m.id === id)?.rotulo ?? ''

// Sugestão de comissão: 6% do valor na venda; um aluguel inteiro no aluguel. É só ponto de partida: o corretor edita.
export const PERCENTUAL_COMISSAO_VENDA = 6
export function comissaoSugerida(valor, tipo) {
  const v = Number(valor)
  if (!Number.isFinite(v) || v <= 0) return null
  const bruto = tipo === 'aluguel' ? v : (v * PERCENTUAL_COMISSAO_VENDA) / 100
  return Math.round(bruto * 100) / 100
}

export const CAMPOS_ETAPA_VAZIOS = {
  perdido_motivo: '',
  perdido_motivo_texto: '',
  fechado_tipo: 'venda',
  fechado_imovel_id: '',
  valor_fechado: '',
  fechado_em: '',
  comissao_estimada: '',
}

export const hojeISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Estado inicial dos campos de etapa para um lead (existente ou novo)
export function camposDaEtapa(lead) {
  const base = { ...CAMPOS_ETAPA_VAZIOS }
  for (const k of Object.keys(base)) if (lead?.[k] !== null && lead?.[k] !== undefined) base[k] = String(lead[k])
  return base
}

// As regras só valem na hora de ENTRAR na etapa; um lead antigo que já estava fechado/perdido continua editável.
// Ao escolher a etapa Fechado, a data começa em hoje (o corretor ajusta se foi outro dia)
export const aoEscolherEtapa = (f, status) =>
  status === 'fechado' && !f.fechado_em ? { ...f, status, fechado_em: hojeISO() } : { ...f, status }

export const entrandoNaEtapa = (leadOriginal, status) => !leadOriginal || leadOriginal.status !== status

const vazio = (v) => v === '' || v === null || v === undefined
const numero = (v) => (vazio(v) ? null : Number(v))

// Devolve a mensagem do primeiro problema, ou null se está tudo certo
export function validarEtapa(status, f, { hoje = hojeISO() } = {}) {
  if (status === 'perdido') {
    if (vazio(f.perdido_motivo)) return 'Escolha o motivo da perda.'
    if (!MOTIVOS_PERDIDO.some((m) => m.id === f.perdido_motivo)) return 'Motivo da perda inválido.'
    if (f.perdido_motivo === 'outro' && !String(f.perdido_motivo_texto ?? '').trim()) return 'Descreva o motivo da perda (opção "Outro").'
    if (String(f.perdido_motivo_texto ?? '').length > 300) return 'A descrição do motivo pode ter no máximo 300 caracteres.'
  }
  if (status === 'fechado') {
    if (vazio(f.fechado_imovel_id)) return 'Escolha o imóvel do negócio fechado.'
    const valor = numero(f.valor_fechado)
    if (valor === null || !Number.isFinite(valor) || valor <= 0) return 'Informe o valor final do negócio (maior que zero).'
    if (vazio(f.fechado_em) || !/^\d{4}-\d{2}-\d{2}$/.test(f.fechado_em)) return 'Informe a data do fechamento.'
    if (f.fechado_em > hoje) return 'A data do fechamento não pode estar no futuro.'
    const comissao = numero(f.comissao_estimada)
    if (comissao === null || !Number.isFinite(comissao) || comissao < 0) return 'Informe a comissão estimada (zero ou mais).'
  }
  return null
}

const NULOS = {
  perdido_motivo: null,
  perdido_motivo_texto: null,
  fechado_tipo: null,
  fechado_imovel_id: null,
  valor_fechado: null,
  fechado_em: null,
  comissao_estimada: null,
}

// Colunas a gravar para a etapa: preenche as da etapa escolhida e LIMPA as da outra
// (um lead que volta de Perdido/Fechado para outra etapa não fica com dados velhos).
export function colunasDaEtapa(status, f = {}) {
  if (status === 'perdido') {
    return {
      ...NULOS,
      perdido_motivo: f.perdido_motivo || null,
      perdido_motivo_texto: String(f.perdido_motivo_texto ?? '').trim() || null,
    }
  }
  if (status === 'fechado') {
    return {
      ...NULOS,
      fechado_tipo: f.fechado_tipo === 'aluguel' ? 'aluguel' : 'venda',
      fechado_imovel_id: f.fechado_imovel_id || null,
      valor_fechado: numero(f.valor_fechado),
      fechado_em: f.fechado_em || null,
      comissao_estimada: numero(f.comissao_estimada),
    }
  }
  return { ...NULOS }
}

// "Preço", "Outro: comprou na planta", ou '' se o lead não está perdido
export function textoDoMotivo(lead) {
  if (lead?.status !== 'perdido' || !lead.perdido_motivo) return ''
  const base = rotuloMotivo(lead.perdido_motivo)
  const extra = String(lead.perdido_motivo_texto ?? '').trim()
  return extra ? `${base}: ${extra}` : base
}
