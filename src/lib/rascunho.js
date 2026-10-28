// Rascunho do formulário de novo imóvel, guardado no navegador (localStorage) a cada alteração.
// Se o computador desligar ou a aba fechar no meio do preenchimento, o formulário volta como estava.
// O rascunho fica só neste navegador e é separado por usuário. As fotos já enviadas continuam no Storage.
import { formDoImovel } from './imovel.js'

export const VALIDADE_DIAS = 14
const DIA_MS = 86400000

export const chaveRascunho = (usuarioId) => `crm:rascunho-imovel:${usuarioId}`

// O localStorage pode não existir ou lançar erro (janela privada, armazenamento cheio ou bloqueado)
function armazenamento() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// Há algo digitado ou alguma foto? (o corretor sugerido automaticamente não conta)
export function temConteudo(form, fotos = []) {
  if (fotos.length > 0) return true
  const vazio = formDoImovel(null)
  return Object.keys(vazio).some((k) => k !== 'corretor_id' && JSON.stringify(form[k]) !== JSON.stringify(vazio[k]))
}

export function salvarRascunho(usuarioId, { form, fotos, novas, aba }, { storage = armazenamento(), agora = Date.now() } = {}) {
  if (!storage) return false
  try {
    if (!temConteudo(form, fotos)) {
      storage.removeItem(chaveRascunho(usuarioId))
      return false
    }
    storage.setItem(chaveRascunho(usuarioId), JSON.stringify({ form, fotos, novas, aba, salvoEm: agora }))
    return true
  } catch {
    return false
  }
}

// Devolve { form, fotos, novas, aba, salvoEm } ou null (inexistente, vencido ou corrompido)
export function lerRascunho(usuarioId, { storage = armazenamento(), agora = Date.now() } = {}) {
  if (!storage) return null
  try {
    const bruto = storage.getItem(chaveRascunho(usuarioId))
    if (!bruto) return null
    const r = JSON.parse(bruto)
    if (!r || typeof r.form !== 'object' || r.form === null || typeof r.salvoEm !== 'number') return null
    if (agora - r.salvoEm > VALIDADE_DIAS * DIA_MS) {
      storage.removeItem(chaveRascunho(usuarioId))
      return null
    }
    return {
      // campos novos que não existiam quando o rascunho foi salvo ficam com o valor padrão
      form: { ...formDoImovel(null), ...r.form },
      fotos: Array.isArray(r.fotos) ? r.fotos : [],
      novas: Array.isArray(r.novas) ? r.novas : [],
      aba: typeof r.aba === 'string' ? r.aba : 'principal',
      salvoEm: r.salvoEm,
    }
  } catch {
    return null
  }
}

export function limparRascunho(usuarioId, { storage = armazenamento() } = {}) {
  try {
    storage?.removeItem(chaveRascunho(usuarioId))
  } catch {
    /* sem armazenamento: nada a limpar */
  }
}
