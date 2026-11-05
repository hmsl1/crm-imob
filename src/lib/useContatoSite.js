// Dados públicos de contato/identidade do site (WhatsApp, nome do responsável, CRECI, e-mail),
// vindos da view "vitrine_contato". Usado no rodapé, na página do imóvel e no "Anuncie".
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export function useContatoSite() {
  const [contato, setContato] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase
      .from('vitrine_contato')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setContato(data ?? null)
      })
    return () => {
      ativo = false
    }
  }, [])

  return contato
}
