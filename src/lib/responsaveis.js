// Quem pode ser responsável por um lead: todos os usuários que têm "corretor próprio" (nome em Meu perfil).
// A tabela corretores é legível por todos; owner_id é o id do usuário.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'

export function useResponsaveis() {
  const [lista, setLista] = useState([]) // [{ id: <id do usuário>, nome }]
  useEffect(() => {
    let ativo = true
    const carregar = () =>
      supabase
        .from('corretores')
        .select('owner_id, nome')
        .eq('e_proprio', true)
        .order('nome')
        .then(({ data }) => ativo && setLista((data ?? []).map((c) => ({ id: c.owner_id, nome: c.nome }))))
    carregar()
    window.addEventListener('corretor-atualizado', carregar)
    return () => {
      ativo = false
      window.removeEventListener('corretor-atualizado', carregar)
    }
  }, [])
  const nomeDe = useMemo(() => {
    const mapa = new Map(lista.map((r) => [r.id, r.nome]))
    return (id) => mapa.get(id) ?? ''
  }, [lista])
  return { responsaveis: lista, nomeDe }
}
