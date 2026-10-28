import { supabase } from '../lib/supabase.js'
import Marca from './Marca.jsx'

const PAGINAS = [
  { id: 'leads', rotulo: 'Leads' },
  { id: 'imoveis', rotulo: 'Imóveis' },
  { id: 'agenda', rotulo: 'Agenda' },
]

// Barra superior compartilhada. As ações específicas de cada página entram como children.
export default function Topo({ usuario, pagina, onPagina, children }) {
  return (
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
      <span className="usuario">{usuario.email}</span>
      <button className="link" onClick={() => supabase.auth.signOut()}>
        Sair
      </button>
    </header>
  )
}
