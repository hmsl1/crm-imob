import { supabase } from '../lib/supabase.js'
import { Suspense, useEffect, useRef, useState } from 'react'
import { RECURSOS } from '../config.js'
import Marca from './Marca.jsx'
import { PerfilModal } from '../componentesPreguicosos.js'
import { useNomeDoCorretor } from '../lib/corretor.js'
import { useAvisos } from '../lib/avisosContexto.js'
import { resumoDosAvisos } from '../lib/avisos.js'
import { IconeSino } from './AvisoHoje.jsx'
import { linkVitrine } from '../lib/rota.js'

const PAGINAS = [
  { id: 'dashboard', rotulo: 'Dashboard', curto: 'Dashboard', icone: 'M4 19h4V10H4Zm6 0h4V5h-4Zm6 0h4v-8h-4Z' },
  { id: 'leads', rotulo: 'Leads', curto: 'Leads', icone: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 5v2h16v-2c0-3.3-4.7-5-8-5Z' },
  { id: 'imoveis', rotulo: 'Imóveis', curto: 'Imóveis', icone: 'M12 3 2 12h3v8h5v-6h4v6h5v-8h3Z' },
  { id: 'proprietarios', rotulo: 'Proprietários', curto: 'Donos', icone: 'M12 2 4 6v5c0 5 3.4 9 8 11 4.6-2 8-6 8-11V6Z' },
  { id: 'agenda', rotulo: 'Agenda', curto: 'Agenda', icone: 'M7 2v3M17 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z' },
]

// Barra superior compartilhada. As ações específicas de cada página entram como children.
export default function Topo({ usuario, pagina, onPagina, children }) {
  const { nome, cadastrado } = useNomeDoCorretor(usuario)
  const [perfil, setPerfil] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef(null)
  const { avisos } = useAvisos()
  const atalhoMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '')

  useEffect(() => {
    if (!menuAberto) return
    function aoClicarFora(e) {
      if (!menuRef.current?.contains(e.target)) setMenuAberto(false)
    }
    function aoTeclarEsc(e) {
      if (e.key === 'Escape') setMenuAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclarEsc)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclarEsc)
    }
  }, [menuAberto])

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
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d={p.icone} />
              </svg>
              <span>{p.rotulo}</span>
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
      {RECURSOS.buscaGlobalCtrlK && (
        <button
          type="button"
          className="btn-busca-global"
          title="Busca rápida global (Ctrl+K)"
          aria-label="Busca rápida global"
          onClick={() => window.dispatchEvent(new CustomEvent('abrir-busca-global'))}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <kbd>{atalhoMac ? '⌘K' : 'Ctrl+K'}</kbd>
        </button>
      )}
      <div className="menu-usuario" ref={menuRef}>
        <button
          className="link usuario"
          onClick={() => setMenuAberto((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          title={cadastrado ? usuario.email : 'Defina seu nome (hoje vem do e-mail)'}
        >
          {nome}
          <svg className="seta-usuario" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="14" height="14">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
        {menuAberto && (
          <div className="menu-usuario-lista" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAberto(false)
                setPerfil(true)
              }}
            >
              Editar perfil
            </button>
            <a role="menuitem" href={linkVitrine} target="_blank" rel="noreferrer" onClick={() => setMenuAberto(false)}>
              Ver site
            </a>
            <button type="button" role="menuitem" className="sair" onClick={() => supabase.auth.signOut()}>
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
    {/* Navegação principal no celular: barra fixa embaixo (padrão de app), em vez de 5 botões
        espremidos numa segunda linha do cabeçalho, que empurrava o conteúdo pra baixo toda
        vez que a página trocava. Some em telas maiores (ver CSS, min-width: 641px). */}
    <nav className="menu-inferior" aria-label="Navegação principal">
      {PAGINAS.map((p) => {
        const selo = p.id === 'agenda' && avisos.total > 0
        return (
          <button
            key={p.id}
            className={pagina === p.id ? 'ativo' : ''}
            aria-current={pagina === p.id ? 'page' : undefined}
            aria-label={selo ? `${p.rotulo}. ${resumoDosAvisos(avisos)}` : p.rotulo}
            onClick={() => onPagina(p.id)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={p.icone} />
            </svg>
            {p.curto}
            {selo && (
              <span key={avisos.total} className={'selo-agenda' + (avisos.urgente ? ' urgente' : '')} aria-hidden="true">
                {avisos.total}
              </span>
            )}
          </button>
        )
      })}
    </nav>
    <Suspense fallback={null}>
      {perfil && <PerfilModal usuario={usuario} nomeAtual={cadastrado ? nome : ''} onFechar={() => setPerfil(false)} />}
    </Suspense>
    </>
  )
}
