// Configurações do sistema guardadas no banco (tabela "configuracoes"): WhatsApp e identidade do site
// (nome do responsável, CRECI, e-mail de contato); só o dono da imobiliária pode alterar
// (vale no banco, por RLS — aqui é só a regra do formulário).
import { digitosWhatsapp } from './format.js'

export const CHAVE_WHATSAPP_VITRINE = 'whatsapp_vitrine'
export const CHAVE_NOME_RESPONSAVEL = 'nome_responsavel'
export const CHAVE_CRECI = 'creci'
export const CHAVE_EMAIL_CONTATO = 'email_contato'

export function validarWhatsapp(v) {
  const d = digitosWhatsapp(v)
  if (d.length < 12 || d.length > 13) return 'Informe um número de WhatsApp válido, com DDD (ex.: (22) 99999-9999).'
  return null
}

// "5522992592683" -> "+55 (22) 99259-2683" (só para mostrar; o que é salvo são os dígitos)
export function formatarWhatsapp(digitos) {
  const d = String(digitos ?? '')
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(d)
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : d
}

export function validarNomeResponsavel(v) {
  if (!String(v ?? '').trim()) return 'Informe o nome do responsável.'
  return null
}

export function validarCreci(v) {
  if (!String(v ?? '').trim()) return 'Informe o número do CRECI.'
  return null
}

export function validarEmailContato(v) {
  const e = String(v ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Informe um e-mail válido.'
  return null
}
