import { supabase } from '../lib/supabase.js'
import { useState } from 'react'
import Marca from './Marca.jsx'
import PerfilModal from './PerfilModal.jsx'
import { useNomeDoCorretor } from '../lib/corretor.js'
import { useAvisos } from '../lib/avisosContexto.js'
import { resumoDosAvisos } from '../lib/avisos.js'
import { IconeSino } from './AvisoHoje.jsx'

const PAGINAS = [
  { id: 'leads', rotulo: 'Leads' },
  { id: 'imoveis', rotulo: 'Imóveis' },
  { id: 'agenda', rotulo: 'Agenda' },
]

// Barra superior compartilhada. As ações específicas de cada página entram como children.
export default function Topo({ usuario, pagina, onPagina, children }) {
  const { nome, cadastrado } = useNomeDoCorretor(usuario)
  const [perfil, setPerfil] = useState(false)
  const { avisos } = useAvisos()
  return (
    <>
    <header className="topo">
      <Marca />
      <nav className="menu">
        {PAGINAS.map((p) => {
          const selo = p.id === 'agenda' && avisos.total > 0
          return (
            <button
              key={p.id}
              className={pagina === p.id ? 'ativo' : ''}
              aria-current={pagina === p.id ? 'page' : undefined}
              aria-label={selo ? `${p.rotulo}. ${resumoDosAvisos(avisos)}` : undefined}
              onClick={() => onPagina(p.id)}
            >
              {p.rotulo}
              {selo && (
                // key = total: a cada mudança o selo "pulsa" uma vez
                <span key={avisos.total} className={'selo-agenda' + (avisos.urgente ? ' urgente' : '')} title={resumoDosAvisos(avisos)} aria-hidden="true">
                  <IconeSino />
                  {avisos.total}
                </span>
              )}
            </button>
          )
        })}
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
