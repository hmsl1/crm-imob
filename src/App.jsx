import { useEffect, useState } from 'react'
import { supabase, configurado } from './lib/supabase.js'
import { MARCA } from './config.js'
import Login from './components/Login.jsx'
import Kanban from './components/Kanban.jsx'
import Imoveis from './components/Imoveis.jsx'
import Agenda from './components/Agenda.jsx'

export default function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(configurado)
  const [pagina, setPagina] = useState('leads') // leads | imoveis | agenda

  useEffect(() => {
    document.title = MARCA.nome
  }, [])

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova)
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

  if (carregando) return <div className="centro">Carregando…</div>
  if (!sessao) return <Login />

  const props = { usuario: sessao.user, pagina, onPagina: setPagina }
  if (pagina === 'imoveis') return <Imoveis {...props} />
  if (pagina === 'agenda') return <Agenda {...props} />
  return <Kanban {...props} />
}
