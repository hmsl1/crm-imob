import { useEffect, useRef, useState } from 'react'
import { supabase, configurado } from './lib/supabase.js'
import { MARCA } from './config.js'
import Login from './components/Login.jsx'
import AreaLogada from './components/AreaLogada.jsx'
import NovaSenha from './components/NovaSenha.jsx'
import { abriuPorRecuperacao } from './lib/senha.js'
import { useRota } from './lib/useRota.js'
import Inicio from './components/Inicio.jsx'
import Vitrine from './components/Vitrine.jsx'
import VitrineImovel from './components/VitrineImovel.jsx'
import Contato from './components/Contato.jsx'

export default function App() {
  const { rota, navegar } = useRota()
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(configurado)
  const [pagina, setPagina] = useState('dashboard') // dashboard | leads | imoveis | agenda
  const [saindoPagina, setSaindoPagina] = useState(false)
  const timerPagina = useRef(null)
  const [recuperando, setRecuperando] = useState(abriuPorRecuperacao) // abriu pelo link de "esqueci a senha"

  useEffect(() => {
    if (rota.pagina === 'painel') document.title = MARCA.nome
  }, [rota.pagina])

  useEffect(() => () => clearTimeout(timerPagina.current), [])

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

  // Troca de página: o conteúdo some em fade (140 ms), troca e volta em fade (a barra superior fica parada)
  function trocarPagina(nova) {
    if (nova === pagina || saindoPagina) return
    setSaindoPagina(true)
    timerPagina.current = setTimeout(() => {
      setPagina(nova)
      setSaindoPagina(false)
    }, 140)
  }

  if (recuperando) return <NovaSenha onConcluido={() => setRecuperando(false)} />

  // Site público: aberto a qualquer visitante, sem login
  if (rota.pagina !== 'painel') {
    if (rota.pagina === 'imovel') return <VitrineImovel codigo={rota.codigo} navegar={navegar} />
    if (rota.pagina === 'contato') return <Contato navegar={navegar} />
    // a key força recriar o estado dos filtros quando a URL da busca muda (ex.: veio de "Imóveis por bairro")
    if (rota.pagina === 'vitrine') return <Vitrine key={JSON.stringify(rota.filtros)} navegar={navegar} filtrosIniciais={rota.filtros} />
    return <Inicio navegar={navegar} />
  }

  if (carregando) return <div className="centro">Carregando…</div>
  if (!sessao) return <Login />

  return <AreaLogada usuario={sessao.user} pagina={pagina} saindoPagina={saindoPagina} onPagina={trocarPagina} />
}
