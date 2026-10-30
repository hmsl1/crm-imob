// Avisos da agenda: o que está perto de acontecer (selo no menu) e o que é para hoje (janelinha ao entrar).
// Funções puras, sem React nem Supabase.
import { itensDaAgenda } from './agenda.js'
import { diasAte } from './lead.js'

// "Perto": hoje e os próximos 2 dias (hoje, amanhã e depois de amanhã)
export const DIAS_PROXIMOS = 2

// Separa os itens pendentes (visitas agendadas e retornos não concluídos) em atrasados, hoje e próximos
export function avisosDaAgenda(visitas = [], lembretes = [], agora = new Date(), dias = DIAS_PROXIMOS) {
  const itens = itensDaAgenda(visitas, lembretes)
  const faltam = (i) => diasAte(i.quando, agora)
  const atrasados = itens.filter((i) => faltam(i) < 0)
  const hoje = itens.filter((i) => faltam(i) === 0)
  const proximos = itens.filter((i) => faltam(i) > 0 && faltam(i) <= dias)
  return {
    atrasados,
    hoje,
    proximos,
    total: atrasados.length + hoje.length + proximos.length,
    urgente: atrasados.length + hoje.length > 0, // vira vermelho no menu
  }
}

// Texto curto para dica/leitor de tela: "3 compromissos: 1 atrasado, 1 hoje, 1 nos próximos 2 dias"
export function resumoDosAvisos(a, dias = DIAS_PROXIMOS) {
  const partes = []
  if (a.atrasados.length) partes.push(`${a.atrasados.length} ${a.atrasados.length === 1 ? 'atrasado' : 'atrasados'}`)
  if (a.hoje.length) partes.push(`${a.hoje.length} hoje`)
  if (a.proximos.length) partes.push(`${a.proximos.length} nos próximos ${dias} dias`)
  if (!partes.length) return 'Nada pendente para os próximos dias'
  return `${a.total} ${a.total === 1 ? 'compromisso' : 'compromissos'}: ${partes.join(', ')}`
}

// ---------------------------------------------------------------
// "Já fechei a janelinha de hoje": guardado só nesta aba do navegador (sessionStorage), por usuário e por dia.
// Uma aba nova, ou outro dia, mostra a janelinha de novo.
// ---------------------------------------------------------------
const dia = (agora) =>
  `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
export const chaveAvisoFechado = (usuarioId, agora = new Date()) => `crm:aviso-hoje-fechado:${usuarioId}:${dia(agora)}`

function armazenamento() {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

export function avisoJaFechado(usuarioId, { storage = armazenamento(), agora = new Date() } = {}) {
  try {
    return storage?.getItem(chaveAvisoFechado(usuarioId, agora)) === '1'
  } catch {
    return false
  }
}

export function marcarAvisoFechado(usuarioId, { storage = armazenamento(), agora = new Date() } = {}) {
  try {
    storage?.setItem(chaveAvisoFechado(usuarioId, agora), '1')
  } catch {
    /* sem armazenamento: só volta a aparecer ao recarregar */
  }
}
