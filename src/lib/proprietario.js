// Proprietários: um proprietário pode ter vários imóveis. Funções puras.
import { mesmoTelefone } from './duplicados.js'

export const FORM_PROPRIETARIO_VAZIO = { nome: '', telefone1: '', telefone2: '', email: '', observacoes: '' }

const texto = (v) => String(v ?? '').replace(/\s+/g, ' ').trim() || null

export function formDoProprietario(p) {
  const f = { ...FORM_PROPRIETARIO_VAZIO }
  for (const k of Object.keys(f)) if (p?.[k] != null) f[k] = String(p[k])
  return f
}

export function payloadDoProprietario(f) {
  return {
    nome: texto(f.nome),
    telefone1: texto(f.telefone1),
    telefone2: texto(f.telefone2),
    email: texto(f.email)?.toLowerCase() ?? null,
    observacoes: String(f.observacoes ?? '').trim() || null,
  }
}

// Devolve a mensagem do primeiro problema, ou null
export function validarProprietario(f) {
  if (!texto(f.nome)) return 'Informe o nome do proprietário.'
  if (!texto(f.telefone1) && !texto(f.telefone2)) return 'Informe pelo menos um telefone.'
  const email = texto(f.email)
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'E-mail inválido.'
  return null
}

// Proprietário já cadastrado com algum dos telefones informados (ignora o próprio ao editar)
export function acharPorTelefone(proprietarios = [], telefones = [], idAtual = null) {
  const lista = telefones.filter(Boolean)
  if (lista.length === 0) return []
  return proprietarios.filter(
    (p) => p.id !== idAtual && lista.some((t) => mesmoTelefone(t, p.telefone1) || mesmoTelefone(t, p.telefone2))
  )
}

export const imoveisDoProprietario = (imoveis = [], proprietarioId) => imoveis.filter((i) => i.proprietario_id === proprietarioId)

// { [proprietario_id]: quantidade }
export function contarImoveis(imoveis = []) {
  const total = {}
  for (const i of imoveis) if (i.proprietario_id) total[i.proprietario_id] = (total[i.proprietario_id] ?? 0) + 1
  return total
}

// Busca por nome, telefone (só dígitos) ou e-mail
export function filtrarProprietarios(lista = [], busca = '') {
  const termo = String(busca).trim().toLowerCase()
  if (!termo) return lista
  const digitos = termo.replace(/\D/g, '')
  return lista.filter(
    (p) =>
      p.nome?.toLowerCase().includes(termo) ||
      p.email?.toLowerCase().includes(termo) ||
      (digitos.length >= 3 && [p.telefone1, p.telefone2].some((t) => String(t ?? '').replace(/\D/g, '').includes(digitos)))
  )
}
