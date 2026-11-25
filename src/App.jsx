import { Suspense, useEffect, useState } from 'react'
import { supabase, configurado } from './lib/supabase.js'
import { MARCA, RECURSOS } from './config.js'
import { abriuPorRecuperacao } from './lib/senha.js'
import { useRota } from './lib/useRota.js'
import { ConfirmacaoProvider } from './lib/confirmacao.jsx'
import {
  Inicio,
  Vitrine,
  VitrineImovel,
  Contato,
  Login,
  AreaLogada,
  NovaSenha,
  precarregarVitrine,
} from './componentesPreguicosos.js'

export default function App() {
  const { rota, navegar } = useRota()
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(configurado)
  const [pagina, setPagina] = useState('dashboard') // dashboard | leads | imoveis | agenda
  const [recuperando, setRecuperando] = useState(abriuPorRecuperacao) // abriu pelo link de "esqueci a senha"

  useEffect(() => {
    document.documentElement.dataset.tipografia = RECURSOS.tipografiaEditorial ? 'editorial' : 'sistema'
  }, [])

  useEffect(() => {
    if (rota.pagina === 'painel') document.title = MARCA.nome
  }, [rota.pagina])

  useEffect(() => {
    if (rota.pagina !== 'painel') return precarregarVitrine()
  }, [rota.pagina])

  // Sem isso, se o usuário soltar um arquivo um pixel fora da área de upload de fotos (muito fácil
  // de acontecer na prática), o navegador abre a imagem em branco por cima do site inteiro. Isso
  // garante que um arquivo arrastado só faz algo se uma área de soltar específica (como a de fotos
  // do imóvel) realmente tratar o evento.
  useEffect(() => {
    function bloquear(e) {
      e.preventDefault()
    }
    window.addEventListener('dragover', bloquear)
    window.addEventListener('drop', bloquear)
    return () => {
      window.removeEventListener('dragover', bloquear)
      window.removeEventListener('drop', bloquear)
    }
  }, [])

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, nova) => {
      setSessao(nova)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!configurado) {
    return (
      <div className="centro">
        <div className="cartao">
          <h1>Configuração pendente</h1>
          <p>
            Copie <code>.env.example</code> para <code>.env.local</code> e preencha{' '}
            <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>. Depois
            reinicie com <code>npm run dev</code>.
          </p>
        </div>
      </div>
    )
  }

  // Troca de página imediata, sem atraso artificial de clique (usa View Transitions quando disponível)
  function trocarPagina(nova) {
    if (nova === pagina) return
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (document.startViewTransition && !reduz) {
      document.startViewTransition(() => setPagina(nova))
    } else {
      setPagina(nova)
    }
  }

  const carregandoTela = <div className="centro">Carregando…</div>

  if (recuperando) {
    return (
      <Suspense fallback={carregandoTela}>
        <NovaSenha onConcluido={() => setRecuperando(false)} />
      </Suspense>
    )
  }

  // Site público: aberto a qualquer visitante, sem login (bundle isolado do CRM)
  if (rota.pagina !== 'painel') {
    return (
      <Suspense fallback={carregandoTela}>
        {rota.pagina === 'imovel' ? (
          <VitrineImovel codigo={rota.codigo} navegar={navegar} />
        ) : rota.pagina === 'contato' ? (
          <Contato navegar={navegar} />
        ) : rota.pagina === 'vitrine' ? (
          <Vitrine navegar={navegar} filtrosIniciais={rota.filtros} />
        ) : (
          <Inicio navegar={navegar} />
        )}
      </Suspense>
    )
  }

  if (carregando) return carregandoTela
  if (!sessao) {
    return (
      <Suspense fallback={carregandoTela}>
        <Login />
      </Suspense>
    )
  }

  return (
    <ConfirmacaoProvider>
      <Suspense fallback={carregandoTela}>
        <AreaLogada usuario={sessao.user} pagina={pagina} onPagina={trocarPagina} />
      </Suspense>
    </ConfirmacaoProvider>
  )
}
