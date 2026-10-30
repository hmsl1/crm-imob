// Nome do corretor de cada conta: aparece na barra superior, nas mensagens de WhatsApp e na ficha do imóvel.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { nomeDoEmail } from './format.js'

const EVENTO = 'corretor-atualizado'

// Pura: devolve { nome } ou { erro }
export function validarNomeCorretor(valor) {
  const nome = String(valor ?? '').replace(/\s+/g, ' ').trim()
  if (nome.length < 2) return { erro: 'Informe o nome do corretor (mínimo 2 letras).' }
  if (nome.length > 80) return { erro: 'O nome pode ter no máximo 80 caracteres.' }
  return { nome }
}

// Grava o nome no corretor "próprio" da conta (cria se ainda não existir) e avisa as telas abertas
export async function salvarNomeDoCorretor(usuario, valor) {
  const { nome, erro } = validarNomeCorretor(valor)
  if (erro) return { erro }
  const { data: atual, error: erroLeitura } = await supabase
    .from('corretores')
    .select('id')
    .eq('owner_id', usuario.id)
    .eq('e_proprio', true)
    .maybeSingle()
  if (erroLeitura) return { erro: erroLeitura.message }
  const { error } = atual
    ? await supabase.from('corretores').update({ nome }).eq('id', atual.id)
    : await supabase.from('corretores').insert({ nome, email: usuario.email, e_proprio: true })
  if (error) return { erro: error.message }
  window.dispatchEvent(new Event(EVENTO))
  return { nome }
}

// Último nome conhecido de cada usuário. Cada página monta a barra superior de novo; sem isso, a barra
// mostrava o nome derivado do e-mail por um instante e só depois o nome cadastrado (e mudava de tamanho).
const memoria = {}
const chaveNome = (id) => `crm:nome-corretor:${id}`
function nomeConhecido(usuario) {
  if (memoria[usuario?.id]) return memoria[usuario.id]
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveNome(usuario?.id)) ?? 'null')
    if (salvo?.nome) return (memoria[usuario.id] = salvo)
  } catch {
    /* sem armazenamento: usa só a memória desta sessão */
  }
  return null
}
function lembrarNome(usuario, valor) {
  memoria[usuario.id] = valor
  try {
    localStorage.setItem(chaveNome(usuario.id), JSON.stringify(valor))
  } catch {
    /* ignora */
  }
}

// Nome do corretor da conta (na falta de um cadastrado, deriva do e-mail). Atualiza quando o nome é salvo.
export function useNomeDoCorretor(usuario) {
  const [nome, setNome] = useState(() => nomeConhecido(usuario)?.nome ?? nomeDoEmail(usuario?.email))
  const [cadastrado, setCadastrado] = useState(() => nomeConhecido(usuario)?.cadastrado ?? false)

  const carregar = useCallback(() => {
    supabase
      .from('corretores')
      .select('nome')
      .eq('owner_id', usuario?.id)
      .eq('e_proprio', true)
      .maybeSingle()
      .then(({ data }) => {
        const valor = { nome: data?.nome || nomeDoEmail(usuario?.email), cadastrado: Boolean(data?.nome) }
        lembrarNome(usuario, valor)
        setCadastrado(valor.cadastrado)
        setNome(valor.nome)
      })
  }, [usuario?.id, usuario?.email])

  useEffect(() => {
    carregar()
    window.addEventListener(EVENTO, carregar)
    return () => window.removeEventListener(EVENTO, carregar)
  }, [carregar])

  return { nome, cadastrado }
}
