// Carrega as visitas e os retornos pendentes e calcula os avisos. Atualiza sozinho a cada 5 minutos,
// ao voltar para a aba do navegador e quando uma página pede (recarregar).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { avisosDaAgenda } from './avisos.js'

const A_CADA_MS = 5 * 60 * 1000

export function useAvisosAgenda(usuarioId) {
  const [visitas, setVisitas] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [agora, setAgora] = useState(() => new Date())

  const recarregar = useCallback(async () => {
    const [v, l] = await Promise.all([
      supabase.from('visitas').select('*, leads(id, nome, telefone), imoveis(id, titulo)').eq('status', 'agendada').order('quando'),
      supabase.from('lembretes').select('*, leads(id, nome, telefone)').eq('concluido', false).order('quando'),
    ])
    // se a migração 004 ainda não rodou, simplesmente não há avisos
    setVisitas(v.error ? [] : (v.data ?? []))
    setLembretes(l.error ? [] : (l.data ?? []))
    setAgora(new Date())
    setCarregado(true)
  }, [])

  useEffect(() => {
    recarregar()
    const timer = setInterval(recarregar, A_CADA_MS)
    const aoVoltar = () => document.visibilityState === 'visible' && recarregar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [recarregar, usuarioId])

  const avisos = useMemo(() => avisosDaAgenda(visitas, lembretes, agora), [visitas, lembretes, agora])
  return { avisos, carregado, recarregar }
}
