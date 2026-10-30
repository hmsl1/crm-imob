// Detecção de leads duplicados (mesmo telefone ou e-mail) e de imóveis no mesmo endereço exato.
// Funções puras: recebem as listas já carregadas, sem depender do Supabase nem do React.

const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')

// ---------------------------------------------------------------
// Telefone e e-mail
// ---------------------------------------------------------------

// Separa DDD e número local. Tolera "+55", zero à esquerda e a diferença do nono dígito:
// "(22) 99999-1111", "22 9999-1111" e "99999-1111" apontam para o mesmo número.
// Devolve null quando não há dígitos suficientes para comparar (menos de 8).
export function partesTelefone(telefone) {
  let d = String(telefone ?? '').replace(/\D/g, '').replace(/^0+/, '')
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length < 8) return null
  const ddd = d.length >= 10 ? d.slice(0, 2) : ''
  let local = d.slice(ddd.length)
  if (local.length === 9 && local[0] === '9') local = local.slice(1) // nono dígito
  if (local.length < 8 || local.length > 9) return null
  return { ddd, local }
}

export function mesmoTelefone(a, b) {
  const x = partesTelefone(a)
  const y = partesTelefone(b)
  if (!x || !y || x.local !== y.local) return false
  return !x.ddd || !y.ddd || x.ddd === y.ddd // sem DDD num dos lados: compara só o número
}

export const chaveEmail = (email) => {
  const e = String(email ?? '').trim().toLowerCase()
  return e.includes('@') ? e : null
}

// Leads já cadastrados com o mesmo telefone e/ou e-mail. `idAtual` exclui o próprio lead ao editar.
// Devolve [{ lead, motivos: ['telefone' | 'email', ...] }]
export function acharLeadsDuplicados(leads = [], { telefone, email } = {}, idAtual = null) {
  const mail = chaveEmail(email)
  const achados = []
  for (const lead of leads) {
    if (idAtual && lead.id === idAtual) continue
    const motivos = []
    if (mesmoTelefone(telefone, lead.telefone)) motivos.push('telefone')
    if (mail && chaveEmail(lead.email) === mail) motivos.push('email')
    if (motivos.length) achados.push({ lead, motivos })
  }
  return achados
}

// Ao editar, só vale checar se o telefone ou o e-mail realmente mudaram (lead antigo já duplicado
// não deve avisar a cada nova observação). Lead novo (sem original) sempre checa.
export function contatoMudou(original, { telefone, email } = {}) {
  if (!original) return true
  const igualTelefone = (() => {
    const novo = partesTelefone(telefone)
    const antigo = partesTelefone(original.telefone)
    if (!novo && !antigo) return true
    return mesmoTelefone(telefone, original.telefone)
  })()
  return !igualTelefone || chaveEmail(email) !== chaveEmail(original.email)
}

// ---------------------------------------------------------------
// Endereço do imóvel
// ---------------------------------------------------------------
const ABREVIACOES = {
  r: 'rua', av: 'avenida', avda: 'avenida', rod: 'rodovia', tv: 'travessa', trav: 'travessa',
  al: 'alameda', est: 'estrada', pc: 'praca', pca: 'praca', lgo: 'largo',
}

// "R. das Flores, nº 123" e "rua das flores 123" viram a mesma chave
export function normalizarEndereco(texto) {
  const t = semAcento(texto)
    .toLowerCase()
    .replace(/\b(n|no|num|numero)\s*[.°º]?\s*(?=\d)/g, '') // "nº 123" -> "123"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  if (!t) return ''
  return t
    .split(' ')
    .map((p) => ABREVIACOES[p] ?? p)
    .join(' ')
}

// Mesmo endereço exato: mesma rua e número; bairro e cidade só são comparados quando os dois lados os informam
export function mesmoEndereco(a, b) {
  const rua = normalizarEndereco(a?.endereco)
  if (!rua || rua !== normalizarEndereco(b?.endereco)) return false
  for (const campo of ['bairro', 'cidade']) {
    const x = normalizarEndereco(a?.[campo])
    const y = normalizarEndereco(b?.[campo])
    if (x && y && x !== y) return false
  }
  return true
}

// Imóveis já cadastrados no mesmo endereço (sem contar o próprio, ao editar)
export function acharImoveisNoMesmoEndereco(imoveis = [], { endereco, bairro, cidade } = {}, idAtual = null) {
  if (!normalizarEndereco(endereco)) return []
  return imoveis.filter((i) => i.id !== idAtual && mesmoEndereco({ endereco, bairro, cidade }, i))
}

// Ao editar, só checa se o endereço mudou de verdade
export function enderecoMudou(original, novo) {
  if (!original) return true
  return !mesmoEndereco(original, novo) || normalizarEndereco(original.endereco) !== normalizarEndereco(novo?.endereco)
}
