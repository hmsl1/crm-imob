// Carregamento e cache da vitrine pública (lista e detalhe por código).
// Consulta primeiro a view `vitrine_imovel` (que já inclui fotos, características e filtros avançados);
// se falhar em ambientes antigos, cai automaticamente para `vitrine_imoveis`.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { lerCache, gravarCache } from './cache.js'

const CHAVE_LISTA = 'vitrine:imoveis'
let promessaLista = null

export function normalizarImovelVitrine(i) {
  if (!i) return i
  const fotos = Array.isArray(i.fotos) ? i.fotos : []
  return {
    ...i,
    foto_capa: i.foto_capa ?? fotos[0] ?? null,
    total_fotos: i.total_fotos ?? fotos.length,
  }
}

async function consultarVitrine() {
  const res = await supabase
    .from('vitrine_imovel')
    .select('*')
    .order('created_at', { ascending: false })

  if (!res.error && Array.isArray(res.data)) {
    const lista = res.data.map(normalizarImovelVitrine)
    gravarCache(CHAVE_LISTA, lista)
    for (const item of lista) {
      if (item.codigo) gravarCache(`vitrine:imovel:${item.codigo.toUpperCase()}`, item)
    }
    return { dados: lista, erro: '' }
  }

  // Fallback para ambientes onde somente vitrine_imoveis está exposta
  const fallback = await supabase
    .from('vitrine_imoveis')
    .select('*')
    .order('created_at', { ascending: false })

  if (fallback.error) {
    return { dados: lerCache(CHAVE_LISTA) ?? [], erro: 'Não foi possível carregar os imóveis agora.' }
  }
  const lista = (fallback.data ?? []).map(normalizarImovelVitrine)
  gravarCache(CHAVE_LISTA, lista)
  return { dados: lista, erro: '' }
}

export function useVitrineImoveis() {
  const inicial = lerCache(CHAVE_LISTA)
  const [imoveis, setImoveis] = useState(() => inicial ?? [])
  const [carregando, setCarregando] = useState(() => !inicial)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    if (!promessaLista) {
      promessaLista = consultarVitrine().finally(() => {
        promessaLista = null
      })
    }
    const { dados, erro: err } = await promessaLista
    setImoveis(dados)
    setErro(err)
    setCarregando(false)
  }, [])

  useEffect(() => {
    let ativo = true
    if (!promessaLista) {
      promessaLista = consultarVitrine().finally(() => {
        promessaLista = null
      })
    }
    promessaLista.then(({ dados, erro: err }) => {
      if (!ativo) return
      setImoveis(dados)
      setErro(err)
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  return { imoveis, carregando, erro, recarregar }
}

// Busca imediata do cache (se já veio da listagem) e atualização em segundo plano do banco
export function lerImovelCache(codigo) {
  const key = String(codigo ?? '').trim().toUpperCase()
  if (!key) return null
  const direto = lerCache(`vitrine:imovel:${key}`)
  if (direto && Array.isArray(direto.fotos)) return direto
  const lista = lerCache(CHAVE_LISTA)
  const achado = lista?.find((i) => String(i.codigo ?? '').toUpperCase() === key)
  return achado && Array.isArray(achado.fotos) ? achado : null
}

export async function buscarImovelVitrinePorCodigo(codigo) {
  const key = String(codigo ?? '').trim().toUpperCase()
  const { data, error } = await supabase
    .from('vitrine_imovel')
    .select('*')
    .eq('codigo', key)
    .maybeSingle()

  if (error) return lerImovelCache(key)
  if (!data) return null
  const norm = normalizarImovelVitrine(data)
  gravarCache(`vitrine:imovel:${key}`, norm)
  return norm
}
