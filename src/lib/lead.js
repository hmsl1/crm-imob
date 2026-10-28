// Regras do lead: origens, perfil de busca, datas de lembretes/visitas e mensagens prontas de WhatsApp.
// Funções puras (sem React nem Supabase), fáceis de testar.
import { moeda } from './format.js'
import { TIPOS_IMOVEL } from './imovel.js'

// ---------------------------------------------------------------
// Origem
// ---------------------------------------------------------------
export const ORIGENS = [
  { id: 'manual', rotulo: 'Cadastro manual', curto: 'Manual' },
  { id: 'instagram', rotulo: 'Instagram', curto: 'Instagram' },
  { id: 'whatsapp', rotulo: 'WhatsApp', curto: 'WhatsApp' },
  { id: 'indicacao', rotulo: 'Indicação', curto: 'Indicação' },
  { id: 'meta', rotulo: 'Meta Ads (anúncio no Facebook/Instagram)', curto: 'Meta Ads' },
  { id: 'google', rotulo: 'Google Ads', curto: 'Google Ads' },
  { id: 'site', rotulo: 'Site', curto: 'Site' },
  { id: 'outro', rotulo: 'Outro', curto: 'Outro' },
]

export const rotuloOrigem = (id) => ORIGENS.find((o) => o.id === id)?.curto ?? id ?? ''

// ---------------------------------------------------------------
// Formulário do lead (dados + perfil de busca)
// ---------------------------------------------------------------
export const BUSCA_FINALIDADES = [
  { id: 'venda', rotulo: 'Comprar' },
  { id: 'aluguel', rotulo: 'Alugar' },
]

export const LEAD_FORM_VAZIO = {
  nome: '',
  telefone: '',
  email: '',
  status: 'novo',
  origem: 'manual',
  observacoes: '',
  valor_fechado: '',
  consentimento_lgpd: false,
  // perfil de busca
  busca_finalidade: '',
  busca_tipos: [],
  busca_bairros: '',
  busca_cidade: '',
  busca_valor_min: '',
  busca_valor_max: '',
  busca_quartos: '',
}

export function formDoLead(lead) {
  const form = structuredClone(LEAD_FORM_VAZIO)
  if (!lead) return form
  for (const chave of Object.keys(form)) {
    const valor = lead[chave]
    if (valor !== null && valor !== undefined) form[chave] = valor
  }
  return form
}

const texto = (v) => String(v ?? '').trim() || null
const numero = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export function payloadDoLead(f, leadOriginal = null) {
  return {
    nome: String(f.nome).trim(),
    telefone: texto(f.telefone),
    email: texto(f.email),
    status: f.status,
    origem: f.origem,
    observacoes: f.observacoes || null,
    valor_fechado: f.status === 'fechado' ? numero(f.valor_fechado) : null,
    consentimento_lgpd: f.consentimento_lgpd,
    consentimento_em: f.consentimento_lgpd ? (leadOriginal?.consentimento_em ?? new Date().toISOString()) : null,

    busca_finalidade: f.busca_finalidade || null,
    busca_tipos: f.busca_tipos,
    busca_bairros: texto(f.busca_bairros),
    busca_cidade: texto(f.busca_cidade),
    busca_valor_min: numero(f.busca_valor_min),
    busca_valor_max: numero(f.busca_valor_max),
    busca_quartos: numero(f.busca_quartos),
  }
}

export function validarLead(f) {
  if (!texto(f.nome)) return { aba: 'dados', mensagem: 'Informe o nome do lead.' }
  const min = numero(f.busca_valor_min)
  const max = numero(f.busca_valor_max)
  if (min !== null && max !== null && min > max) {
    return { aba: 'perfil', mensagem: 'O valor mínimo não pode ser maior que o máximo.' }
  }
  return null
}

// "Comprar · Apartamento, Casa · Centro, Macaé · R$ 300.000 a R$ 500.000 · 3+ dormitórios"
export function resumoDoPerfil(lead) {
  const partes = []
  if (lead.busca_finalidade) partes.push(BUSCA_FINALIDADES.find((f) => f.id === lead.busca_finalidade)?.rotulo)
  const tipos = (lead.busca_tipos ?? []).map((id) => TIPOS_IMOVEL.find((t) => t.id === id)?.rotulo ?? id)
  if (tipos.length) partes.push(tipos.join(', '))
  const onde = [lead.busca_bairros, lead.busca_cidade].filter(Boolean).join(', ')
  if (onde) partes.push(onde)
  const min = lead.busca_valor_min
  const max = lead.busca_valor_max
  if (min != null && max != null) partes.push(`${moeda(min)} a ${moeda(max)}`)
  else if (min != null) partes.push(`a partir de ${moeda(min)}`)
  else if (max != null) partes.push(`até ${moeda(max)}`)
  if (lead.busca_quartos != null) partes.push(`${lead.busca_quartos}+ dormitórios`)
  return partes.filter(Boolean).join(' · ')
}

// ---------------------------------------------------------------
// Datas (lembretes e visitas)
// ---------------------------------------------------------------
const DIA_MS = 86400000

export const inicioDoDia = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Quantos dias (de calendário) o instante está à frente de "agora": -1 = ontem, 0 = hoje, 1 = amanhã
export function diasAte(iso, agora = new Date()) {
  return Math.round((inicioDoDia(iso) - inicioDoDia(agora)) / DIA_MS)
}

// atrasados | hoje | proximos (até 7 dias) | depois
export function faixaDoDia(iso, agora = new Date()) {
  const dias = diasAte(iso, agora)
  if (dias < 0) return 'atrasados'
  if (dias === 0) return 'hoje'
  if (dias <= 7) return 'proximos'
  return 'depois'
}

const hora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function quandoCurto(iso, agora = new Date()) {
  const d = new Date(iso)
  const dias = diasAte(d, agora)
  if (dias === 0) return `hoje às ${hora(d)}`
  if (dias === 1) return `amanhã às ${hora(d)}`
  if (dias === -1) return `ontem às ${hora(d)}`
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return `${dia} às ${hora(d)}`
}

// "terça-feira, 28 de outubro às 10:00"
export function dataHoraLonga(iso) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às ${hora(d)}`
}

// ISO -> valor de <input type="datetime-local"> (horário local)
export function paraInputLocal(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// valor de <input type="datetime-local"> (horário local) -> ISO; vazio ou inválido -> null
export function deInputLocal(valor) {
  if (!valor) return null
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ISO de "daqui a N dias, às H horas" (atalhos "amanhã", "em 3 dias"...)
export function emDiasAs(dias, horas = 9, agora = new Date()) {
  const d = inicioDoDia(agora)
  d.setDate(d.getDate() + dias)
  d.setHours(horas, 0, 0, 0)
  return d.toISOString()
}

export const STATUS_VISITA = [
  { id: 'agendada', rotulo: 'Agendada' },
  { id: 'realizada', rotulo: 'Realizada' },
  { id: 'cancelada', rotulo: 'Cancelada' },
  { id: 'nao_compareceu', rotulo: 'Não compareceu' },
]

export function validarVisita({ imovel_id, quando }) {
  if (!imovel_id) return 'Escolha o imóvel da visita.'
  if (!deInputLocal(quando)) return 'Informe a data e a hora da visita.'
  return null
}

export function validarLembrete({ quando }) {
  return deInputLocal(quando) ? null : 'Informe a data e a hora do lembrete.'
}

// ---------------------------------------------------------------
// Mensagens prontas de WhatsApp
// ---------------------------------------------------------------
export const MODELOS_MENSAGEM = [
  { id: 'apresentacao', rotulo: 'Apresentação' },
  { id: 'pos_visita', rotulo: 'Pós-visita' },
  { id: 'retorno', rotulo: 'Retorno' },
  { id: 'confirmar_visita', rotulo: 'Confirmar visita' },
]

export const primeiroNome = (nome) => String(nome ?? '').trim().split(/\s+/)[0] || ''

// contexto: { lead, imovel?, corretor?, visita? }. Sem imóvel, usa uma redação genérica.
export function montarMensagem(modelo, { lead, imovel = null, corretor = '', visita = null } = {}) {
  const nome = primeiroNome(lead?.nome)
  const saudacao = nome ? `Olá, ${nome}!` : 'Olá!'
  const assinatura = corretor ? `Aqui é ${corretor}, corretor de imóveis.` : ''
  const abertura = [saudacao, assinatura].filter(Boolean).join(' ')
  const nome_imovel = imovel?.titulo ? `imóvel "${imovel.titulo}"` : null
  const casa = nome_imovel && `o ${nome_imovel}` // "o imóvel ..."
  const noImovel = nome_imovel && `no ${nome_imovel}` // "no imóvel ..."
  const aoImovel = nome_imovel && `ao ${nome_imovel}` // "ao imóvel ..."

  switch (modelo) {
    case 'apresentacao':
      return casa
        ? `${abertura} Tudo bem? Vi que você tem interesse ${noImovel}. Posso te enviar mais detalhes e fotos?`
        : `${abertura} Tudo bem? Vou te ajudar na busca pelo seu imóvel. Pode me contar o que você procura (tipo, região, valor e número de dormitórios)?`
    case 'pos_visita':
      return `${abertura} Obrigado por ter visitado ${casa ?? 'o imóvel'}. O que você achou? Se quiser, posso ajudar com os próximos passos, como simulação de financiamento ou uma proposta.`
    case 'retorno':
      return casa
        ? `${abertura} Passando para saber se você ainda tem interesse ${noImovel}. Posso ajudar com mais informações ou agendar uma visita?`
        : `${abertura} Passando para saber se você ainda está em busca de um imóvel. Posso te enviar novas opções e agendar uma visita?`
    case 'confirmar_visita': {
      const quando = visita?.quando ? ` em ${dataHoraLonga(visita.quando)}` : ''
      return `${abertura} Confirmando nossa visita ${aoImovel ?? 'a um imóvel'}${quando}. Tudo certo para você?`
    }
    default:
      return abertura
  }
}
