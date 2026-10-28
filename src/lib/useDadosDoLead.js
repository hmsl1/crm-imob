// Carrega do Supabase tudo o que fica "em volta" do lead: imóveis vinculados, visitas, lembretes, histórico.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { nomeDoEmail } from './format.js'

const VAZIO = { vinculos: [], visitas: [], lembretes: [], interacoes: [], imoveis: [] }

export function useDadosDoLead(leadId) {
  const [dados, setDados] = useState(VAZIO)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    if (!leadId) return
    const respostas = await Promise.all([
      supabase.from('lead_imovel').select('imovel_id, imoveis(*)').eq('lead_id', leadId),
      supabase.from('visitas').select('*, imoveis(id, titulo)').eq('lead_id', leadId).order('quando'),
      supabase.from('lembretes').select('*').eq('lead_id', leadId).order('quando'),
      supabase.from('interacoes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('imoveis').select('*').order('titulo'),
    ])
    const falha = respostas.find((r) => r.error)
    setErro(falha ? falha.error.message : '')
    const [vinculos, visitas, lembretes, interacoes, imoveis] = respostas.map((r) => r.data ?? [])
    setDados({
      vinculos: vinculos.filter((v) => v.imoveis).map((v) => v.imoveis),
      visitas,
      lembretes,
      interacoes,
      imoveis,
    })
  }, [leadId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { ...dados, erro, recarregar }
}

// Nome que assina as mensagens: o corretor "próprio" do usuário (ou, na falta, derivado do e-mail)
export function useNomeDoCorretor(usuario) {
  const [nome, setNome] = useState(nomeDoEmail(usuario?.email))
  useEffect(() => {
    supabase
      .from('corretores')
      .select('nome')
      .eq('e_proprio', true)
      .maybeSingle()
      .then(({ data }) => data?.nome && setNome(data.nome))
  }, [])
  return nome
}
