// Dados públicos de contato/identidade do site (WhatsApp, nome do responsável, CRECI, e-mail),
// vindos da view "vitrine_contato". Cacheado em memória para evitar múltiplas consultas por página.
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { lerCache, gravarCache } from './cache.js'

const CHAVE = 'vitrine:contato'
let emVoo = null

function buscarContato() {
  if (!emVoo) {
    emVoo = supabase
      .from('vitrine_contato')
      .select('*')
      .maybeSingle()
      .then(({ data, error }) => {
        emVoo = null
        if (!error) gravarCache(CHAVE, data ?? null)
        return data ?? null
      })
      .catch(() => {
        emVoo = null
        return lerCache(CHAVE) ?? null
      })
  }
  return emVoo
}

export function useContatoSite() {
  const [contato, setContato] = useState(() => lerCache(CHAVE) ?? null)

  useEffect(() => {
    let ativo = true
    buscarContato().then((dados) => {
      if (ativo) setContato(dados)
    })
    return () => {
      ativo = false
    }
  }, [])

  return contato
}
