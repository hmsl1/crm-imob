// Navegação do site sem recarregar a página (histórico do navegador funciona normalmente: voltar/avançar).
import { useCallback, useEffect, useState } from 'react'
import { rotaDoCaminho } from './rota.js'

export function useRota() {
  const [local, setLocal] = useState(() =>
    typeof window === 'undefined'
      ? { pathname: '/', search: '' }
      : { pathname: window.location.pathname, search: window.location.search }
  )

  useEffect(() => {
    const aoNavegar = () => setLocal({ pathname: window.location.pathname, search: window.location.search })
    window.addEventListener('popstate', aoNavegar)
    return () => window.removeEventListener('popstate', aoNavegar)
  }, [])

  const navegar = useCallback((destino) => {
    const atual = window.location.pathname + window.location.search
    if (destino !== atual) window.history.pushState({}, '', destino)
    const [pathname, search = ''] = destino.split('?')
    setLocal({ pathname, search: search ? `?${search}` : '' })
    window.scrollTo(0, 0)
  }, [])

  const rota = rotaDoCaminho(local.pathname, local.search)

  // raiz do domínio: troca a URL para /imoveis sem deixar "/" no histórico (substitui, não empilha)
  useEffect(() => {
    if (rota.pagina === 'redirecionar') {
      window.history.replaceState({}, '', rota.destino)
      setLocal({ pathname: rota.destino, search: '' })
    }
  }, [rota.pagina, rota.destino])

  return { rota, navegar }
}
