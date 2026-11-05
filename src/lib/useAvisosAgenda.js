// Carrega as visitas e os retornos pendentes e calcula os avisos. Atualiza sozinho a cada 5 minutos,
// ao voltar para a aba do navegador e quando uma página pede (recarregar).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { avisosDaAgenda } from './avisos.js'
import { alertasDeExclusividade, ehMeuImovel, DIAS_ALERTA_EXCLUSIVIDADE } from './exclusividade.js'
import { ehDono } from './dashboard.js'
import { hojeISO } from './datas.js'

const A_CADA_MS = 5 * 60 * 1000

export function useAvisosAgenda(usuario) {
  const usuarioId = usuario.id
  const [visitas, setVisitas] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [exclusivos, setExclusivos] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [agora, setAgora] = useState(() => new Date())

  const recarregar = useCallback(async () => {
    const limite = new Date()
    limite.setDate(limite.getDate() + DIAS_ALERTA_EXCLUSIVIDADE)
    const [v, l, e, c] = await Promise.all([
      supabase.from('visitas').select('*, leads!inner(id, nome, telefone), imoveis(id, titulo, codigo)').eq('leads.responsavel_id', usuarioId).eq('status', 'agendada').order('quando'),
      supabase.from('lembretes').select('*, leads!inner(id, nome, telefone)').eq('leads.responsavel_id', usuarioId).eq('concluido', false).order('quando'),
      // exclusividades que vencem em até 30 dias (ou já venceram), ainda não vendidas
      supabase.from('imoveis').select('id, titulo, codigo, status, exclusividade, exclusividade_ate, owner_id, captador_id, proprietario_nome, proprietario_telefone1').eq('exclusividade', true).not('exclusividade_ate', 'is', null).neq('status', 'vendido').lte('exclusividade_ate', hojeISO(limite)),
      supabase.from('corretores').select('id').eq('owner_id', usuarioId),
    ])
    // se a migração 004 ainda não rodou, simplesmente não há avisos
    setVisitas(v.error ? [] : (v.data ?? []))
    setLembretes(l.error ? [] : (l.data ?? []))
    const meus = { usuarioId, captadorIds: (c.data ?? []).map((x) => x.id), dono: ehDono(usuario.email) }
    setExclusivos(e.error ? [] : (e.data ?? []).filter((i) => ehMeuImovel(i, meus)))
    setAgora(new Date())
    setCarregado(true)
  }, [usuarioId, usuario.email])

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

  const avisos = useMemo(() => avisosDaAgenda(visitas, lembretes, agora, undefined, alertasDeExclusividade(exclusivos, agora)), [visitas, lembretes, exclusivos, agora])
  return { avisos, carregado, recarregar }
}
