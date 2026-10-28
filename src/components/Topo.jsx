import { supabase } from '../lib/supabase.js'
import { useState } from 'react'
import Marca from './Marca.jsx'
import PerfilModal from './PerfilModal.jsx'
import { useNomeDoCorretor } from '../lib/corretor.js'

const PAGINAS = [
  { id: 'leads', rotulo: 'Leads' },
  { id: 'imoveis', rotulo: 'Imóveis' },
  { id: 'agenda', rotulo: 'Agenda' },
]

// Barra superior compartilhada. As ações específicas de cada página entram como children.
export default function Topo({ usuario, pagina, onPagina, children }) {
  const { nome, cadastrado } = useNomeDoCorretor(usuario)
  const [perfil, setPerfil] = useState(false)
  return (
    <>
    <header className="topo">
      <Marca />
      <nav className="menu">
        {PAGINAS.map((p) => (
          <button
            key={p.id}
            className={pagina === p.id ? 'ativo' : ''}
            aria-current={pagina === p.id ? 'page' : undefined}
            onClick={() => onPagina(p.id)}
          >
            {p.rotulo}
          </button>
        ))}
      </nav>
      <div className="acoes-topo">{children}</div>
      <button
        className="link usuario"
        onClick={() => setPerfil(true)}
        title={cadastrado ? usuario.email : 'Defina seu nome (hoje vem do e-mail)'}
      >
        {nome}
      </button>
      <button className="link" onClick={() => supabase.auth.signOut()}>
        Sair
      </button>
    </header>
    {perfil && <PerfilModal usuario={usuario} nomeAtual={cadastrado ? nome : ''} onFechar={() => setPerfil(false)} />}
    </>
  )
}
